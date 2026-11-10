import { useEffect, useLayoutEffect, useRef, type RefObject } from 'react';
import { criarInclinacaoCard, situacaoDoCard, type Deslocamento } from '../core/inclinacaoCard';
import type { Estado } from '../core/partida';
import { dtDoQuadro } from '../core/relogio';

const arredondar = (v: number, casas: number) => Math.round(v * 10 ** casas) / 10 ** casas;

/**
 * Escreve o deslocamento nas propriedades `translate`/`rotate`, que se somam ao `transform` das animações
 * de saída (AC-2.1/AC-2.2) e do pulso (AC-4.7) sem brigar com elas. Zero = sem estilo.
 */
function aplicar(el: HTMLElement | null, d: Deslocamento) {
  if (!el) return;
  const dx = arredondar(d.dx, 1);
  const graus = arredondar(d.graus, 2);
  const translate = dx === 0 ? '' : `${dx}px`;
  const rotate = graus === 0 ? '' : `${graus}deg`;
  if (el.style.getPropertyValue('translate') !== translate) el.style.setProperty('translate', translate);
  if (el.style.getPropertyValue('rotate') !== rotate) el.style.setProperty('rotate', rotate);
}

/** Consulta criada uma vez; `matches` acompanha a preferência do sistema ao vivo. */
function consultarMovimentoReduzido(): { matches: boolean } {
  return typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
}

/**
 * Card acompanha o corpo (AC-2.10): um laço `requestAnimationFrame` lê `inclinacaoRef` (escrita pelo laço
 * de detecção de `useJogo`), suaviza e move o card direto no DOM, fora do estado do React. A detecção
 * roda a ~6–7 fps; a suavização anda a cada quadro, então o card não salta entre as leituras.
 */
export function useInclinacaoCard({ inclinacaoRef, estado, pausado, cardRef, cardSaindoRef }: {
  inclinacaoRef: RefObject<number>;
  estado: Estado;
  pausado: boolean;
  cardRef: RefObject<HTMLElement>;
  cardSaindoRef: RefObject<HTMLElement>;
}) {
  const situacao = situacaoDoCard(estado, pausado);
  const situacaoRef = useRef(situacao);
  situacaoRef.current = situacao;
  const motor = useRef(criarInclinacaoCard());
  const ultimo = useRef<Deslocamento>({ dx: 0, graus: 0 });
  const alvo = () => (situacaoRef.current === 'saindo' ? cardSaindoRef.current : cardRef.current);

  // O card que sai é outro elemento: já nasce na posição em que o card estava, sem esperar o próximo quadro.
  useLayoutEffect(() => {
    aplicar(alvo(), ultimo.current);
  }, [situacao, estado.tela]);

  useEffect(() => {
    let raf = 0;
    let anterior = performance.now();
    const movimentoReduzido = consultarMovimentoReduzido();
    const quadro = (agora: number) => {
      const dtMs = dtDoQuadro(agora, anterior);
      anterior = agora;
      ultimo.current = motor.current.passo({
        situacao: situacaoRef.current,
        inclinacao: inclinacaoRef.current ?? 0,
        dtMs,
        reduzirMovimento: movimentoReduzido.matches,
      });
      aplicar(alvo(), ultimo.current);
      raf = requestAnimationFrame(quadro);
    };
    raf = requestAnimationFrame(quadro);
    return () => cancelAnimationFrame(raf);
  }, []);
}
