import { describe, expect, it } from 'vitest';
import {
  FAN, aberturaNaAbertura, aberturaNaEspera, angulosFan, angulosNaDistribuicao, cartasDesenhadas, poseCartaDistribuida, progresso,
} from './fan';

const perto = (a: number, b: number, tol = 1e-9) => Math.abs(a - b) <= tol;

describe('Fase 48.2: geometria do fan (AC-17.3, FR-18)', () => {
  it('nunca desenha mais de 20 cartas, nem menos de 0', () => {
    expect(FAN.max).toBe(20);
    expect(cartasDesenhadas(25)).toBe(20);
    expect(cartasDesenhadas(7)).toBe(7);
    expect(cartasDesenhadas(-1)).toBe(0);
    expect(angulosFan(40, 1)).toHaveLength(20);
    expect(angulosFan(0, 1)).toEqual([]);
  });

  it('ângulos simétricos em torno de 0, da esquerda (negativo) para a direita', () => {
    for (const n of [2, 3, 7, 12, 20]) {
      const a = angulosFan(n, 0.6);
      for (let i = 0; i < n; i++) expect(perto(a[i]!, -a[n - 1 - i]!)).toBe(true);
      for (let i = 1; i < n; i++) expect(a[i]!).toBeGreaterThan(a[i - 1]!);
    }
  });

  it('abertura 0 = fechado (maço), 1 = aberto por inteiro', () => {
    const fechado = angulosFan(12, 0);
    const aberto = angulosFan(12, 1);
    expect(fechado.at(-1)! - fechado[0]!).toBeCloseTo(FAN.totalFechado);
    expect(aberto.at(-1)! - aberto[0]!).toBeCloseTo(FAN.totalAberto);
    expect(angulosFan(12, 2)).toEqual(aberto); // fora de 0..1 fica no limite
    expect(angulosFan(12, -1)).toEqual(fechado);
  });

  it('v13.1.0: o ângulo total não depende da quantidade (as cartas se espaçam pela quantidade)', () => {
    const total = (n: number) => { const a = angulosFan(n, 0.6); return a.at(-1)! - a[0]!; };
    expect(total(2)).toBeCloseTo(total(12));
    expect(total(20)).toBeCloseTo(total(3));
  });

  it('uma carta só fica no meio', () => {
    expect(angulosFan(1, 1)).toEqual([0]);
  });
});

describe('Fase 48.3/48.4: aberturas no tempo (AC-17.4, AC-17.5)', () => {
  it('progresso vem do que falta no estado: 0 no começo, 1 no fim, sempre entre 0 e 1', () => {
    expect(progresso(1500, 1500)).toBe(0);
    expect(progresso(1500, 750)).toBe(0.5);
    expect(progresso(1500, 0)).toBe(1);
    expect(progresso(900, -50)).toBe(1);
    expect(progresso(900, 1000)).toBe(0);
  });

  it('abertura da partida: começa fechado, abre por inteiro e termina na abertura de jogo', () => {
    expect(aberturaNaAbertura(0)).toBe(0);
    expect(aberturaNaAbertura(0.5)).toBe(1);
    expect(aberturaNaAbertura(1)).toBeCloseTo(FAN.aberturaJogo);
  });

  it('espera: ciclo que começa e termina no mesmo ponto, entre o mínimo e o máximo', () => {
    expect(aberturaNaEspera(0)).toBeCloseTo(FAN.esperaMin);
    expect(aberturaNaEspera(0.5)).toBeCloseTo(FAN.esperaMax);
    expect(aberturaNaEspera(1)).toBeCloseTo(aberturaNaEspera(0));
  });
});

describe('Fase 48.4: distribuição (AC-17.6, v13.1.0)', () => {
  it('a carta distribuída é a da ponta direita do fan', () => {
    const fan = angulosFan(7, FAN.aberturaJogo);
    expect(poseCartaDistribuida(7, 0).graus).toBeCloseTo(fan.at(-1)!);
    expect(poseCartaDistribuida(7, 0).x).toBeGreaterThan(0); // à direita do centro
  });

  it('começa do tamanho de uma carta do fan, virada (verso para cima), e pousa no centro, de frente e inteira', () => {
    const ini = poseCartaDistribuida(7, 0);
    expect(ini.escala).toBeCloseTo(FAN.largura / FAN.larguraCarta);
    expect(ini.giroY).toBe(180);
    expect(ini.y).toBeGreaterThan(0); // vem de baixo
    expect(poseCartaDistribuida(7, 1)).toEqual({ x: 0, y: 0, graus: 0, escala: 1, giroY: 0 });
  });

  it('sobe em arco: no meio do caminho passa acima da linha reta entre a saída e o centro', () => {
    const ini = poseCartaDistribuida(7, 0);
    const meio = poseCartaDistribuida(7, 0.5);
    const yReta = ini.y + (0 - ini.y) * ((ini.x - meio.x) / ini.x);
    expect(meio.y).toBeLessThan(yReta);
  });

  it('o fan perde a carta da direita: começa onde estava e fecha na abertura de jogo com uma a menos', () => {
    const antes = angulosFan(7, FAN.aberturaJogo);
    expect(angulosNaDistribuicao(7, 0)).toEqual(antes.slice(0, 6));
    expect(angulosNaDistribuicao(7, 1)).toEqual(angulosFan(6, FAN.aberturaJogo));
  });

  it('com mais de 20 cartas, o fan desenhado continua com 20', () => {
    expect(angulosNaDistribuicao(25, 0.5)).toHaveLength(20);
    expect(angulosNaDistribuicao(1, 0.5)).toEqual([]);
  });
});
