import { describe, expect, it } from 'vitest';
import { CONFIG_GESTOS, configGestos, criarInterpretador, type Pose } from './gestos';

// AC-9.28 (v12.0.0, v12.0.1): a sensibilidade multiplica os limiares dos gestos de todos os modos
// (distâncias no Corpo e na Mão, ângulo na Cabeça), sem mudar permanências nem zonas de retorno.

/** Pose sintética (coordenadas cruas, espelhadas): tronco em `cxJogador`, punho direito deslocado `deslocD` larguras de ombro. */
function pose(cxJogador = 0.5, o: { rollGraus?: number; deslocD?: number } = {}): Pose {
  const cx = 1 - cxJogador;
  const p = Array.from({ length: 33 }, () => ({ x: cx, y: 0.8, visibility: 1 }));
  const dy = Math.tan(((o.rollGraus ?? 0) * Math.PI) / 180) * 0.1;
  p[0] = { x: cx, y: 0.33, visibility: 1 };
  p[7] = { x: cx + 0.05, y: 0.3 - dy / 2, visibility: 1 };
  p[8] = { x: cx - 0.05, y: 0.3 + dy / 2, visibility: 1 };
  p[11] = { x: cx + 0.1, y: 0.45, visibility: 1 };
  p[12] = { x: cx - 0.1, y: 0.45, visibility: 1 };
  p[13] = { x: cx + 0.15, y: 0.6, visibility: 1 };
  p[14] = { x: cx - 0.15, y: 0.6, visibility: 1 };
  p[15] = { x: cx + 0.15, y: 0.75, visibility: 1 };
  // Mão direita levantada à frente (punho acima do cotovelo), deslocada para a própria direita do jogador.
  p[16] = o.deslocD === undefined ? { x: cx - 0.15, y: 0.75, visibility: 1 } : { x: cx - o.deslocD * 0.2, y: 0.5, visibility: 1 };
  return p;
}
const gestos = (i: ReturnType<typeof criarInterpretador>, passos: [Pose, number][]) => passos.flatMap(([p, t]) => i.ler(p, t).gestos);

describe('configGestos (AC-9.28)', () => {
  it('Normal devolve exatamente os limiares atuais', () => {
    expect(configGestos('normal')).toBe(CONFIG_GESTOS);
  });

  it.each([['menor', 1.25], ['maior', 0.8]] as const)('%s multiplica só os limiares por %f', (s, k) => {
    const c = configGestos(s);
    expect(c.limiar).toBeCloseTo(CONFIG_GESTOS.limiar * k);
    expect(c.arrasteMinL).toBeCloseTo(CONFIG_GESTOS.arrasteMinL * k);
    expect(c.limiarCabecaGraus).toBeCloseTo(CONFIG_GESTOS.limiarCabecaGraus * k);
    expect(c.limiarQueixo).toBeCloseTo(CONFIG_GESTOS.limiarQueixo * k);
    // Permanências e zonas de retorno/calibração não mudam.
    for (const chave of ['permanenciaLadoMs', 'permanenciaMaosMs', 'zonaRetorno', 'zonaCalibracao', 'retornoCabecaGraus', 'centroArrasteL', 'margemMaoOmbro'] as const) {
      expect(c[chave]).toBe(CONFIG_GESTOS[chave]);
    }
    // O limite continua maior que a zona de retorno (a trava depois da escolha segue funcionando).
    expect(c.limiar).toBeGreaterThan(c.zonaRetorno);
    expect(c.limiarCabecaGraus).toBeGreaterThan(c.retornoCabecaGraus);
    expect(c.arrasteMinL).toBeGreaterThan(c.centroArrasteL);
  });
});

describe('efeito nos modos (AC-9.28)', () => {
  it('Corpo: 0,11 de deslocamento só escolhe com "Maior"; 0,14 escolhe no Normal e não no "Menor"', () => {
    const passos = (d: number): [Pose, number][] => [[pose(0.5), 0], [pose(0.5 + d), 10], [pose(0.5 + d), 400]];
    const corpo = (s: 'menor' | 'normal' | 'maior') => {
      const i = criarInterpretador('corpo', configGestos(s));
      i.ler(pose(0.5), 0);
      i.calibrar();
      return i;
    };
    expect(gestos(corpo('maior'), passos(0.11))).toEqual(['direita']);
    expect(gestos(corpo('normal'), passos(0.11))).toEqual([]);
    expect(gestos(corpo('normal'), passos(0.14))).toEqual(['direita']);
    expect(gestos(corpo('menor'), passos(0.14))).toEqual([]);
  });

  it('Cabeça: 13° só escolhe com "Maior"; 17° escolhe no Normal e não no "Menor"', () => {
    const cabeca = (s: 'menor' | 'normal' | 'maior') => {
      const i = criarInterpretador('cabeca', configGestos(s));
      i.ler(pose(), 0);
      i.calibrar();
      return i;
    };
    const passos = (g: number): [Pose, number][] => [[pose(0.5, { rollGraus: g }), 10], [pose(0.5, { rollGraus: g }), 400]];
    expect(gestos(cabeca('maior'), passos(13))).toEqual(['direita']);
    expect(gestos(cabeca('normal'), passos(13))).toEqual([]);
    expect(gestos(cabeca('normal'), passos(17))).toEqual(['direita']);
    expect(gestos(cabeca('menor'), passos(17))).toEqual([]);
  });

  it('Mão: o swipe de 0,9 L só escolhe com "Maior"; 1,1 L escolhe no Normal e não no "Menor"', () => {
    const passos = (l: number): [Pose, number][] => [[pose(0.5, { deslocD: 0.2 }), 0], [pose(0.5, { deslocD: l }), 50]];
    expect(gestos(criarInterpretador('mao', configGestos('maior')), passos(0.9))).toEqual(['direita']);
    expect(gestos(criarInterpretador('mao', configGestos('normal')), passos(0.9))).toEqual([]);
    expect(gestos(criarInterpretador('mao', configGestos('normal')), passos(1.1))).toEqual(['direita']);
    expect(gestos(criarInterpretador('mao', configGestos('menor')), passos(1.1))).toEqual([]);
  });
});
