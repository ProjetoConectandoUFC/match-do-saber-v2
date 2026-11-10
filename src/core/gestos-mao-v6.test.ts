import { describe, expect, it } from 'vitest';
import { CONFIG_GESTOS, criarInterpretador, type Pose } from './gestos';

/**
 * Modo Mão v10.3.0: swipe (AC-9.20, AC-9.22). Pose sintética em coordenadas cruas da câmera, com ombros fixos
 * (L = 0,2; centro do jogador 0,5) e cotovelos na altura 0,6. `d`/`e` = deslocamento lateral de cada punho em L
 * (+ = própria direita do jogador). Mão "ativa" = punho acima do cotovelo (`dAtiva`/`eAtiva`);
 * `dAlto`/`eAlto` = punho acima do ombro (para o "saiba mais").
 */
function pose(o: { d?: number; e?: number; dAtiva?: boolean; eAtiva?: boolean; dAlto?: boolean; eAlto?: boolean } = {}): Pose {
  const p = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.8, visibility: 1 }));
  p[0] = { x: 0.5, y: 0.33, visibility: 1 };
  p[7] = { x: 0.55, y: 0.3, visibility: 1 };
  p[8] = { x: 0.45, y: 0.3, visibility: 1 };
  p[11] = { x: 0.6, y: 0.45, visibility: 1 };
  p[12] = { x: 0.4, y: 0.45, visibility: 1 };
  p[13] = { x: 0.65, y: 0.6, visibility: 1 }; // cotovelo esquerdo
  p[14] = { x: 0.35, y: 0.6, visibility: 1 }; // cotovelo direito
  const cruX = (desloc: number) => 1 - (0.5 + desloc * 0.2);
  const y = (alto?: boolean, ativa?: boolean) => (alto ? 0.3 : ativa ? 0.5 : 0.75);
  p[16] = { x: cruX(o.d ?? 0.6), y: y(o.dAlto, o.dAtiva), visibility: 1 };
  p[15] = { x: cruX(o.e ?? -0.6), y: y(o.eAlto, o.eAtiva), visibility: 1 };
  return p;
}
const seq = (i: ReturnType<typeof criarInterpretador>, passos: [Pose | null, number][]) => passos.flatMap(([p, t]) => i.ler(p, t).gestos);
const SWIPE = CONFIG_GESTOS.arrasteMinL;

describe('modo Mão v10.3.0: o card segue a mão ativa (AC-2.10, AC-9.20)', () => {
  it('limite do swipe = 1 largura de ombro (a calibrar no hardware), sem tempo máximo', () => {
    expect(SWIPE).toBe(1);
    expect(CONFIG_GESTOS).not.toHaveProperty('arrasteMaxMs');
    expect(CONFIG_GESTOS).not.toHaveProperty('duasMaosLadoL');
  });
  it('a inclinação é a posição horizontal do punho ativo ÷ o limite, contínua', () => {
    const i = criarInterpretador('mao');
    expect(i.ler(pose({ d: 0.3, dAtiva: true }), 0).inclinacao).toBeCloseTo(0.3 / SWIPE, 6);
    expect(i.ler(pose({ d: 0.7, dAtiva: true }), 100).inclinacao).toBeCloseTo(0.7 / SWIPE, 6);
    expect(i.ler(pose({ e: -0.5, eAtiva: true }), 200).inclinacao).toBeCloseTo(-0.5 / SWIPE, 6);
  });
  it('mãos baixas (punho abaixo do cotovelo) não movem o card nem escolhem, mesmo longe do corpo', () => {
    const i = criarInterpretador('mao');
    expect(i.ler(pose({ d: 1.5, e: -1.5 }), 0)).toMatchObject({ inclinacao: 0, gestos: [] });
    expect(seq(i, [[pose({ d: 1.5 }), 500], [pose({ d: 1.5 }), 2000]])).toEqual([]);
  });
  it('com as duas mãos ativas, vale a mais longe do meio do corpo', () => {
    const i = criarInterpretador('mao');
    i.ler(pose({ d: 0.2, dAtiva: true, e: -0.2, eAtiva: true }), 0);
    expect(i.ler(pose({ d: 0.2, dAtiva: true, e: -0.6, eAtiva: true }), 100).inclinacao).toBeCloseTo(-0.6, 6);
  });
});

describe('modo Mão v10.3.0: escolha pelo swipe (AC-9.20)', () => {
  it('passar do limite para a própria direita escolhe "direita" na hora, sem permanência', () => {
    const i = criarInterpretador('mao');
    expect(seq(i, [[pose({ d: 0.1, dAtiva: true }), 0], [pose({ d: 0.6, dAtiva: true }), 150], [pose({ d: 0.95, dAtiva: true }), 300]])).toEqual([]);
    expect(seq(i, [[pose({ d: 1.05, dAtiva: true }), 450]])).toEqual(['direita']);
  });
  it('qualquer mão: a esquerda para a esquerda = "esquerda"; devagar também vale', () => {
    const i = criarInterpretador('mao');
    expect(seq(i, [[pose({ e: -0.1, eAtiva: true }), 0], [pose({ e: -0.5, eAtiva: true }), 3000], [pose({ e: -1.1, eAtiva: true }), 6000]])).toEqual(['esquerda']);
  });
  it('gestos removidos: mão levantada parada no centro e as duas mãos baixas para um lado não escolhem', () => {
    const i = criarInterpretador('mao');
    expect(seq(i, [[pose({ d: 0.3, dAlto: true }), 0], [pose({ d: 0.3, dAlto: true }), 1000]])).toEqual([]);
    expect(seq(i, [[pose({ d: 1.0, e: 0.6 }), 1100], [pose({ d: 1.0, e: 0.6 }), 2000]])).toEqual([]);
  });
});

describe('modo Mão v10.3.0: retorno entre escolhas (AC-9.9, AC-9.22)', () => {
  it('depois do swipe, trava com inclinação 0 até a mão voltar à frente do peito; depois segue e escolhe de novo', () => {
    const i = criarInterpretador('mao');
    expect(seq(i, [[pose({ d: 0.1, dAtiva: true }), 0], [pose({ d: 1.2, dAtiva: true }), 200]])).toEqual(['direita']);
    expect(i.ler(pose({ d: 1.3, dAtiva: true }), 400)).toMatchObject({ inclinacao: 0, gestos: [] });
    expect(i.ler(pose({ d: 0.6, dAtiva: true }), 500)).toMatchObject({ inclinacao: 0, gestos: [] }); // 0,6 L ainda não é o centro
    expect(i.ler(pose({ d: 0.3, dAtiva: true }), 600).inclinacao).toBeCloseTo(0.3, 6);              // < 0,5 L: libera
    expect(seq(i, [[pose({ d: 1.1, dAtiva: true }), 800]])).toEqual(['direita']);
  });
  it('a mão precisa passar pela frente do peito: levantá-la já do lado não move o card nem escolhe', () => {
    const i = criarInterpretador('mao');
    expect(i.ler(pose({ e: -1.2, eAtiva: true }), 0)).toMatchObject({ inclinacao: 0, gestos: [] });
    expect(seq(i, [[pose({ e: -0.2, eAtiva: true }), 100], [pose({ e: -1.2, eAtiva: true }), 200]])).toEqual(['esquerda']);
  });
  it('baixar a mão desarma: ao levantar de novo, ela volta a passar pela frente do peito', () => {
    const i = criarInterpretador('mao');
    expect(seq(i, [[pose({ d: 0.2, dAtiva: true }), 0], [pose({ d: 0.8, dAtiva: true }), 100]])).toEqual([]);
    expect(seq(i, [[pose({ d: 0.8 }), 200], [pose({ d: 1.2, dAtiva: true }), 300]])).toEqual([]);
    expect(seq(i, [[pose({ d: 0.1, dAtiva: true }), 400], [pose({ d: 1.2, dAtiva: true }), 500]])).toEqual(['direita']);
  });
  it('AC-9.8: duas mãos acima dos ombros por 500 ms = "maosParaCima"; ao descer em V, não escolhe até centralizar', () => {
    const i = criarInterpretador('mao');
    const ambas = pose({ d: 1.1, e: -1.1, dAlto: true, eAlto: true });
    expect(seq(i, [[ambas, 0], [ambas, 400]])).toEqual([]);
    expect(seq(i, [[ambas, 500], [ambas, 1500]])).toEqual(['maosParaCima']);
    expect(i.ler(ambas, 1600).inclinacao).toBe(0);
    expect(seq(i, [[pose({ d: 1.1, dAtiva: true, e: -0.2 }), 1700], [pose({ d: 1.2, dAtiva: true }), 1800]])).toEqual([]);
    expect(seq(i, [[pose({ d: 0.2, dAtiva: true }), 1900], [pose({ d: 1.1, dAtiva: true }), 2000]])).toEqual(['direita']);
  });
  it('perder a pessoa: inclinação 0 e nada escolhido', () => {
    const i = criarInterpretador('mao');
    expect(i.ler(null, 0)).toMatchObject({ inclinacao: 0, gestos: [] });
    expect(seq(i, [[pose({ d: 0.2, dAtiva: true }), 100], [null, 200], [pose({ d: 0.4, dAtiva: true }), 300]])).toEqual([]);
  });
});
