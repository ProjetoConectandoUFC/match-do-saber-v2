import { describe, expect, it } from 'vitest';
import { CONFIG_GESTOS, criarInterpretador, type Pose } from './gestos';

/**
 * Pose sintética do modo Corpo em coordenadas cruas da câmera (L = 0,2).
 * `cxJ` = centro do tronco do ponto de vista do jogador; `d`/`e` = deslocamento lateral
 * de cada punho em L a partir do meio do corpo (+ = própria direita do jogador);
 * `maosAcima` põe os dois punhos acima do nariz.
 */
function pose(o: { cxJ?: number; d?: number; e?: number; maosAcima?: boolean } = {}): Pose {
  const cxJ = o.cxJ ?? 0.5;
  const cx = 1 - cxJ;
  const p = Array.from({ length: 33 }, () => ({ x: cx, y: 0.8, visibility: 1 }));
  p[0] = { x: cx, y: 0.33, visibility: 1 };
  p[11] = { x: cx + 0.1, y: 0.45, visibility: 1 };
  p[12] = { x: cx - 0.1, y: 0.45, visibility: 1 };
  const cruX = (desloc: number) => 1 - (cxJ + desloc * 0.2);
  const yMao = o.maosAcima ? 0.15 : 0.6;
  p[16] = { x: cruX(o.d ?? 0.6), y: yMao, visibility: 1 };
  p[15] = { x: cruX(o.e ?? -0.6), y: yMao, visibility: 1 };
  return p;
}
const seq = (i: ReturnType<typeof criarInterpretador>, passos: [Pose | null, number][]) => passos.flatMap(([p, t]) => i.ler(p, t).gestos);

function calibrado() {
  const i = criarInterpretador('corpo');
  i.ler(pose(), 0);
  i.calibrar();
  return i;
}

describe('modo Corpo v10.3.0: um único controle, o tronco (AC-2.7/AC-2.8 removidos)', () => {
  it('estender o braço para o lado, com o tronco no centro, não escolhe nem move o card', () => {
    const i = calibrado();
    expect(seq(i, [[pose({ d: 1.5 }), 0], [pose({ d: 1.5 }), 300], [pose({ d: 1.5 }), 1000]])).toEqual([]);
    expect(seq(i, [[pose({ e: -2.0 }), 1100], [pose({ e: -2.0 }), 2000]])).toEqual([]);
    expect(i.ler(pose({ d: 2.0 }), 2100).inclinacao).toBeCloseTo(0, 6);
  });
  it('sem os limites do braço em CONFIG_GESTOS', () => {
    expect(CONFIG_GESTOS).not.toHaveProperty('bracoLadoL');
    expect(CONFIG_GESTOS).not.toHaveProperty('retornoBracoL');
  });
  it('o tronco escolhe com qualquer posição dos braços', () => {
    const i = calibrado();
    expect(seq(i, [[pose({ cxJ: 0.7, e: -1.5 }), 0], [pose({ cxJ: 0.7, e: -1.5 }), 300]])).toEqual(['direita']);
  });
  it('AC-2.4: depois de escolher, o tronco no centro libera mesmo com o braço estendido', () => {
    const i = calibrado();
    expect(seq(i, [[pose({ cxJ: 0.7 }), 0], [pose({ cxJ: 0.7 }), 300]])).toEqual(['direita']);
    expect(seq(i, [[pose({ cxJ: 0.7 }), 400], [pose({ cxJ: 0.7 }), 1200]])).toEqual([]);
    expect(seq(i, [[pose({ d: 1.5 }), 1300], [pose({ cxJ: 0.7, d: 1.5 }), 1400], [pose({ cxJ: 0.7, d: 1.5 }), 1700]])).toEqual(['direita']);
  });
  it('dois punhos acima do nariz com um braço para o lado = só "saiba mais"', () => {
    const i = calibrado();
    expect(seq(i, [[pose({ maosAcima: true, d: 1.5 }), 0], [pose({ maosAcima: true, d: 1.5 }), 300], [pose({ maosAcima: true, d: 1.5 }), 600]])).toEqual(['maosParaCima']);
  });
});

describe('modo Corpo v10.3.0: a inclinação é o controle que o card mimetiza (AC-2.10)', () => {
  it('é contínua: fração do deslocamento do tronco até o limiar, limitada a ±1', () => {
    const i = calibrado();
    const l = CONFIG_GESTOS.limiar;
    expect(i.ler(pose({ cxJ: 0.5 + l / 4 }), 10).inclinacao).toBeCloseTo(0.25, 6);
    expect(i.ler(pose({ cxJ: 0.5 - l * 0.75 }), 20).inclinacao).toBeCloseTo(-0.75, 6);
    expect(i.ler(pose({ cxJ: 0.5 + 3 * l }), 30).inclinacao).toBe(1);
  });
  it('AC-2.4/AC-2.10(e): depois de uma escolha, fica 0 até o tronco voltar ao centro; depois volta a seguir', () => {
    const i = calibrado();
    expect(seq(i, [[pose({ cxJ: 0.7 }), 0], [pose({ cxJ: 0.7 }), 300]])).toEqual(['direita']);
    expect(i.ler(pose({ cxJ: 0.7 }), 400).inclinacao).toBe(0);
    expect(i.ler(pose({ cxJ: 0.3 }), 500).inclinacao).toBe(0);
    expect(i.ler(pose(), 600).inclinacao).toBeCloseTo(0, 6);                 // voltou: libera
    expect(i.ler(pose({ cxJ: 0.56 }), 700).inclinacao).toBeCloseTo(0.5, 6);
  });
});
