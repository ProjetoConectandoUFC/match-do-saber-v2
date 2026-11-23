import { useEffect, useLayoutEffect, useRef } from 'react';
import {
  FAN, aberturaNaAbertura, aberturaNaEspera, angulosFan, angulosNaDistribuicao, cartasDesenhadas,
} from '../core/fan';
import { TEMPOS } from '../core/partida';
import versoFan from './ilustracoes/verso-fan.svg?no-inline';
import f from './FanCartas.module.css';

/** Verso único das cartas do fan (FR-18): o mesmo arquivo para todas, sem texto nem pista da notícia. */
export const VERSO_FAN = versoFan;

export type FaseFan = 'parado' | 'respirando' | 'abrindo' | 'distribuindo';

/** Quantas amostras viram quadros-chave: o movimento roda no compositor, entre amostras, sem depender do laço da pose. */
const AMOSTRAS = 24;

/** Fora do jsdom e sem "menos movimento" (AC-17.7): só então há animação. */
export function podeAnimar(el: Element | null): el is Element & { animate: Element['animate'] } {
  if (!el || typeof (el as { animate?: unknown }).animate !== 'function') return false;
  return !(typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches);
}

/** Quadros-chave amostrados de uma função pura do progresso (0 a 1); as curvas já vêm em `fan.ts`. */
export function quadrosChave(transformar: (p: number) => string): Keyframe[] {
  return Array.from({ length: AMOSTRAS + 1 }, (_, i) => ({ offset: i / AMOSTRAS, transform: transformar(i / AMOSTRAS) }));
}

/**
 * Mantém uma animação presa ao progresso do estado (Fase 48.4): ela anda sozinha no compositor, em tempo real (fluida
 * mesmo com a pose travando o laço principal a ~6–7 fps), e só é adiantada quando fica para trás do reducer por mais de
 * 100 ms. Nunca volta: o estado só anda a cada quadro da pose, então entre dois quadros ele fica atrás do tempo real (até
 * ~0,5 s num quadro lento) e a animação, que é o tempo real, está certa.
 */
export function sincronizar(animacoes: readonly Animation[], progresso: number, duracaoMs: number) {
  const alvo = progresso * duracaoMs;
  for (const a of animacoes) {
    const atual = Number(a.currentTime ?? 0);
    if (alvo - atual > 100) a.currentTime = alvo;
  }
}

/** A pose parada de cada fase: o fim da animação (sem salto) ou o repouso sem movimento. */
function angulosParados(fase: FaseFan, quantidade: number): number[] {
  return angulosFan(quantidade, fase === 'respirando' ? FAN.esperaParado : FAN.aberturaJogo);
}

const rodar = (graus: number) => `rotate(${graus.toFixed(2)}deg)`;

/**
 * Leque de versos (v13.0.0, AC-17.3 a AC-17.7, FR-18), pivô abaixo da borda da tela. `quantidade`: cartas que ficam no
 * fan (na distribuição, as que sobram depois da que está saindo). `progresso` (0 a 1) vem do estado do reducer na
 * abertura e na distribuição; a espera respira em loop de ~4 s. Só `transform` anima, e no compositor.
 */
export function FanCartas({ quantidade, fase, progresso = 0, lugar = 'mesa' }: {
  quantidade: number;
  fase: FaseFan;
  progresso?: number;
  lugar?: 'mesa' | 'espera';
}) {
  const n = cartasDesenhadas(quantidade);
  const parados = angulosParados(fase, n);
  const raiz = useRef<HTMLDivElement>(null);
  const animacoes = useRef<Animation[]>([]);
  const duracaoMs = fase === 'abrindo' ? TEMPOS.aberturaFanMs : fase === 'distribuindo' ? TEMPOS.distribuirMs : FAN.cicloEsperaMs;
  const progressoRef = useRef(progresso);
  progressoRef.current = progresso;

  useLayoutEffect(() => {
    const cartas = [...(raiz.current?.querySelectorAll<HTMLElement>('[data-fan-carta]') ?? [])];
    if (fase === 'parado' || !podeAnimar(cartas[0] ?? null)) return undefined;
    const angulo = (i: number, p: number) => {
      if (fase === 'abrindo') return angulosFan(n, aberturaNaAbertura(p))[i]!;
      if (fase === 'distribuindo') return angulosNaDistribuicao(n + 1, p)[i]!;
      return angulosFan(n, aberturaNaEspera(p))[i]!;
    };
    const lista = cartas.map((el, i) => el.animate(quadrosChave((p) => rodar(angulo(i, p))), {
      duration: duracaoMs,
      iterations: fase === 'respirando' ? Infinity : 1,
      easing: 'linear',
    }));
    if (fase !== 'respirando') for (const a of lista) a.currentTime = progressoRef.current * duracaoMs;
    animacoes.current = lista;
    return () => {
      for (const a of lista) a.cancel();
      animacoes.current = [];
    };
  }, [fase, n, duracaoMs]);

  useEffect(() => {
    if (fase === 'abrindo' || fase === 'distribuindo') sincronizar(animacoes.current, progresso, duracaoMs);
  }, [fase, progresso, duracaoMs]);

  return (
    <div ref={raiz} className={lugar === 'espera' ? `${f.fan} ${f.fanEspera}` : f.fan} data-fan data-fan-fase={fase} data-fan-lugar={lugar} aria-hidden="true">
      {parados.map((g, i) => (
        <div key={i} className={f.carta} data-fan-carta style={{ transform: rodar(g) }}>
          <img src={VERSO_FAN} alt="" draggable={false} />
        </div>
      ))}
    </div>
  );
}
