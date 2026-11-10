import { useEffect, useLayoutEffect, useRef, type RefObject } from 'react';
import { criarInclinacaoCard, deslocamentoCard, situacaoDoCard } from '../core/inclinacaoCard';
import type { Estado } from '../core/partida';
import { dtDoQuadro } from '../core/relogio';

const arredondar = (v: number, casas: number) => Math.round(v * 10 ** casas) / 10 ** casas;

function definir(el: HTMLElement, prop: string, valor: string) {
  if (el.style.getPropertyValue(prop) !== valor) el.style.setProperty(prop, valor);
}

/**
 * Escreve a posição nas propriedades `translate`/`rotate`, que se somam ao `transform` das animações de saída
 * (AC-2.1/AC-2.2) e do pulso (AC-4.7) sem brigar com elas, e a opacidade dos rótulos `[data-rotulo-lado]`
 * (AC-2.10b). Zero = sem estilo. O tamanho vem de `offsetWidth`/`offsetHeight`, que não mudam com o giro.
 */
function aplicar(el: HTMLElement | null, f: number) {
  if (!el) return;
  const d = deslocamentoCard(f, { largura: el.offsetWidth, altura: el.offsetHeight });
  const dx = arredondar(d.dx, 1), dy = arredondar(d.dy, 1), graus = arredondar(d.graus, 2);
  definir(el, 'translate', dx === 0 && dy === 0 ? '' : `${dx}px ${dy}px`);
  definir(el, 'rotate', graus === 0 ? '' : `${graus}deg`);
  for (const [lado, opacidade] of [['verdade', d.verdade], ['mentira', d.mentira]] as const) {
    const rotulo = el.querySelector<HTMLElement>(`[data-rotulo-lado="${lado}"]`);
    if (rotulo) definir(rotulo, 'opacity', String(arredondar(opacidade, 3)));
  }
}

/**
 * O card mimetiza o controle em tempo real (AC-2.10, como no Reigns): um laço `requestAnimationFrame` lê
 * `inclinacaoRef` (escrita pelo laço de detecção de `useJogo`, ~6–7 leituras por segundo), interpola a cada
 * quadro de tela e move o card direto no DOM, fora do estado do React.
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
  const ultima = useRef(0);
  const alvo = () => (situacaoRef.current === 'saindo' ? cardSaindoRef.current : cardRef.current);

  // O card que sai pode ser outro elemento: já nasce na posição em que o card estava, sem esperar o quadro.
  useLayoutEffect(() => {
    aplicar(alvo(), ultima.current);
  }, [situacao, estado.tela]);

  useEffect(() => {
    let raf = 0;
    let anterior = performance.now();
    const quadro = (agora: number) => {
      const dtMs = dtDoQuadro(agora, anterior);
      anterior = agora;
      ultima.current = motor.current.passo({ situacao: situacaoRef.current, inclinacao: inclinacaoRef.current ?? 0, dtMs });
      aplicar(alvo(), ultima.current);
      raf = requestAnimationFrame(quadro);
    };
    raf = requestAnimationFrame(quadro);
    return () => cancelAnimationFrame(raf);
  }, []);
}
