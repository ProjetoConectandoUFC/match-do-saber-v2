import type { Pose } from './gestos';

/**
 * Detecção falsa e lenta (FR-20, NFR Performance, v13.3.0, Fase 52.1): só para os E2E de cadência, que medem a tela
 * com uma detecção de duração conhecida. O teste injeta `window.__mdsDeteccaoFalsa = { ms, onde? }` antes de a página
 * abrir; sem isso, o jogo usa o MediaPipe. `onde`: no worker (padrão) ou na thread principal (a reserva).
 */
export interface DeteccaoFalsa { ms: number; onde: 'worker' | 'principal' }

export function lerDeteccaoFalsa(escopo: object): DeteccaoFalsa | null {
  const v = (escopo as { __mdsDeteccaoFalsa?: unknown }).__mdsDeteccaoFalsa;
  if (!v || typeof v !== 'object') return null;
  const { ms, onde } = v as { ms?: unknown; onde?: unknown };
  if (typeof ms !== 'number' || !(ms >= 0)) return null;
  return { ms, onde: onde === 'principal' ? 'principal' : 'worker' };
}

/** Uma pessoa de frente, parada no centro (33 pontos do MediaPipe Pose, coordenadas da imagem). */
export function poseFalsa(): Pose {
  const pose: Pose = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, visibility: 0.99 }));
  const pontos: Record<number, [number, number]> = {
    0: [0.5, 0.3], 7: [0.54, 0.3], 8: [0.46, 0.3], 11: [0.6, 0.45], 12: [0.4, 0.45],
    13: [0.63, 0.6], 14: [0.37, 0.6], 15: [0.62, 0.72], 16: [0.38, 0.72], 23: [0.56, 0.75], 24: [0.44, 0.75],
  };
  for (const [i, [x, y]] of Object.entries(pontos)) pose[Number(i)] = { x, y, visibility: 0.99 };
  return pose;
}

/** Ocupa a thread pelo tempo pedido, como uma detecção síncrona. */
export function esperaOcupada(ms: number, agora: () => number = () => performance.now()): void {
  const fim = agora() + ms;
  while (agora() < fim) { /* ocupa */ }
}
