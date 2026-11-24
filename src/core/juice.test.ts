import { describe, expect, it } from 'vitest';
import {
  INTENSIDADES, INTENSIDADE_PADRAO, JUICE, TETO_SEQUENCIA, intensidadeEfetiva, juiceDaSequencia, mostrarSequencia,
  nivelSequencia, semitonsDoAcerto, type Intensidade,
} from './juice';

// v13.4.0 (Story 19, FR-21): parâmetros dos efeitos por intensidade, puros, para a tela e o som.
describe('FR-21/AC-19.1: intensidades e padrão', () => {
  it('Desligada, Baixa, Média e Alta, nessa ordem; padrão Média', () => {
    expect(INTENSIDADES).toEqual(['desligada', 'baixa', 'media', 'alta']);
    expect(INTENSIDADE_PADRAO).toBe('media');
    expect(Object.keys(JUICE).sort()).toEqual([...INTENSIDADES].sort());
  });
});

describe('AC-19.1: prefers-reduced-motion limita a intensidade efetiva a Baixa', () => {
  it('sem "reduzir movimento", vale a escolhida', () => {
    for (const i of INTENSIDADES) expect(intensidadeEfetiva(i, false)).toBe(i);
  });
  it('com "reduzir movimento", Média e Alta caem para Baixa; Desligada e Baixa ficam', () => {
    expect(intensidadeEfetiva('desligada', true)).toBe('desligada');
    expect(intensidadeEfetiva('baixa', true)).toBe('baixa');
    expect(intensidadeEfetiva('media', true)).toBe('baixa');
    expect(intensidadeEfetiva('alta', true)).toBe('baixa');
  });
});

describe('AC-19.2: carimbo (hit-stop, overshoot, tremida, respingo, baque)', () => {
  it('Desligada: nada (AC-19.8)', () => {
    const d = JUICE.desligada;
    expect(d).toMatchObject({
      hitStopMs: 0, carimboOvershoot: 1, tremidaPx: 0, tremidaMs: 0, respingoGotas: 0, baque: false,
      cascata: false, confetes: 0, popEscala: 1, naoPx: 0, amassarEscala: 1, amassarGraus: 0, sequenciaVisivel: false, semitonsPorNivel: 0,
    });
  });
  it('hit-stop ~80 ms em Média e crescente com a intensidade', () => {
    expect(JUICE.media.hitStopMs).toBe(80);
    expect(JUICE.baixa.hitStopMs).toBeGreaterThan(0);
    expect(JUICE.baixa.hitStopMs).toBeLessThan(JUICE.media.hitStopMs);
    expect(JUICE.alta.hitStopMs).toBeGreaterThan(JUICE.media.hitStopMs);
  });
  it('tremida de tela: Baixa 0, Média até 6 px, Alta até 12 px, nunca mais de 300 ms', () => {
    expect(JUICE.baixa.tremidaPx).toBe(0);
    expect(JUICE.media.tremidaPx).toBeGreaterThan(0);
    expect(JUICE.media.tremidaPx).toBeLessThanOrEqual(6);
    expect(JUICE.alta.tremidaPx).toBeGreaterThan(JUICE.media.tremidaPx);
    expect(JUICE.alta.tremidaPx).toBeLessThanOrEqual(12);
    for (const i of INTENSIDADES) expect(JUICE[i].tremidaMs).toBeLessThanOrEqual(300);
  });
  it('overshoot do carimbo, respingo e baque acima de Desligada', () => {
    for (const i of ['baixa', 'media', 'alta'] as const) {
      expect(JUICE[i].carimboOvershoot).toBeGreaterThan(1);
      expect(JUICE[i].respingoGotas).toBeGreaterThan(0);
      expect(JUICE[i].baque).toBe(true);
    }
    expect(JUICE.alta.carimboOvershoot).toBeGreaterThan(JUICE.media.carimboOvershoot);
    expect(JUICE.media.carimboOvershoot).toBeGreaterThan(JUICE.baixa.carimboOvershoot);
  });
});

describe('AC-19.3: acerto (cascata, confete, pop)', () => {
  it('nenhum confete em Baixa; confete em Média e mais em Alta; tudo some em até 1,2 s', () => {
    expect(JUICE.baixa.confetes).toBe(0);
    expect(JUICE.media.confetes).toBeGreaterThan(0);
    expect(JUICE.alta.confetes).toBeGreaterThan(JUICE.media.confetes);
    expect(JUICE.alta.confeteAlcancePx).toBeGreaterThan(JUICE.media.confeteAlcancePx);
    for (const i of INTENSIDADES) expect(JUICE[i].confeteMs).toBeLessThanOrEqual(1200);
  });
  it('cascata e pop do placar acima de Desligada', () => {
    for (const i of ['baixa', 'media', 'alta'] as const) {
      expect(JUICE[i].cascata).toBe(true);
      expect(JUICE[i].popEscala).toBeGreaterThan(1);
    }
    expect(JUICE.alta.popEscala).toBeGreaterThan(JUICE.media.popEscala);
  });
});

describe('AC-19.4: erro (tremida de "não" e carta que amassa)', () => {
  it('"não" amortecido em até 400 ms; amassar de leve (escala < 1, inclinação)', () => {
    for (const i of INTENSIDADES) expect(JUICE[i].naoMs).toBeLessThanOrEqual(400);
    for (const i of ['baixa', 'media', 'alta'] as const) {
      expect(JUICE[i].naoPx).toBeGreaterThan(0);
      expect(JUICE[i].amassarEscala).toBeLessThan(1);
      expect(JUICE[i].amassarEscala).toBeGreaterThanOrEqual(0.9);
      expect(JUICE[i].amassarGraus).toBeGreaterThan(0);
    }
    expect(JUICE.alta.naoPx).toBeGreaterThan(JUICE.media.naoPx);
  });
});

describe('AC-19.5: sequência de acertos, com teto em N = 5', () => {
  it('teto 5; nível 0 até o 1º acerto, +1 por acerto seguido, parado no teto', () => {
    expect(TETO_SEQUENCIA).toBe(5);
    expect([0, 1, 2, 3, 4, 5, 6, 20].map(nivelSequencia)).toEqual([0, 0, 1, 2, 3, 4, 4, 4]);
  });

  it('"Sequência ×N" a partir de 2, e não com a intensidade Desligada (AC-19.8)', () => {
    expect(mostrarSequencia('media', 1)).toBe(false);
    expect(mostrarSequencia('media', 2)).toBe(true);
    expect(mostrarSequencia('baixa', 7)).toBe(true);
    expect(mostrarSequencia('desligada', 5)).toBe(false);
  });

  it('o som de acerto sobe um semitom por nível até o teto; Desligada não muda o tom', () => {
    expect([1, 2, 3, 4, 5, 6, 9].map((n) => semitonsDoAcerto('media', n))).toEqual([0, 1, 2, 3, 4, 4, 4]);
    expect(semitonsDoAcerto('baixa', 3)).toBe(2);
    expect(semitonsDoAcerto('desligada', 5)).toBe(0);
  });

  it('confete, pop do placar e tremida crescem com N até o teto, sem passar do máximo da intensidade', () => {
    for (const i of ['media', 'alta'] as const) {
      const n = [1, 2, 3, 4, 5, 6].map((s) => juiceDaSequencia(i, s));
      for (let k = 1; k < 5; k++) {
        expect(n[k]!.confetes).toBeGreaterThan(n[k - 1]!.confetes);
        expect(n[k]!.popEscala).toBeGreaterThan(n[k - 1]!.popEscala);
        expect(n[k]!.tremidaPx).toBeGreaterThan(n[k - 1]!.tremidaPx);
      }
      expect(n[5]).toEqual(n[4]); // N = 6 igual ao teto
      expect(n[4]).toMatchObject({ confetes: JUICE[i].confetes, popEscala: JUICE[i].popEscala, tremidaPx: JUICE[i].tremidaPx });
    }
  });

  it('sem sequência (erro, tempo, N = 0) usa a base, igual a N = 1; o resto da tabela não muda com N', () => {
    expect(juiceDaSequencia('media', 0)).toEqual(juiceDaSequencia('media', 1));
    const base = juiceDaSequencia('alta', 1);
    const teto = juiceDaSequencia('alta', 5);
    expect({ ...teto, confetes: 0, popEscala: 0, tremidaPx: 0 }).toEqual({ ...base, confetes: 0, popEscala: 0, tremidaPx: 0 });
  });

  it('Baixa e Desligada nunca ganham tremida nem confete com a sequência (AC-19.1)', () => {
    for (const i of ['desligada', 'baixa'] as Intensidade[]) {
      expect(juiceDaSequencia(i, 5)).toMatchObject({ tremidaPx: 0, confetes: 0 });
    }
    expect(juiceDaSequencia('desligada', 5).popEscala).toBe(1);
  });
});
