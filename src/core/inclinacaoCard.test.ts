import { describe, expect, it } from 'vitest';
import { CONFIG_INCLINACAO_CARD, criarInclinacaoCard, deslocamentoCard, fracaoControle, situacaoDoCard } from './inclinacaoCard';
import { INICIO_RESULTADO_MS, TEMPOS } from './partida';

const { fracaoLargura, maxGraus, zonaMorta, constanteTempoMs } = CONFIG_INCLINACAO_CARD;
const CARD = { largura: 600, altura: 640 };
const rad = (g: number) => (g * Math.PI) / 180;

describe('fracaoControle (AC-2.10 v10.3.0)', () => {
  it('pontos de partida da spec: 8% da largura, 15°, zona morta de 3% e 100 ms de suavização', () => {
    expect(CONFIG_INCLINACAO_CARD).toEqual({ fracaoLargura: 0.08, maxGraus: 15, zonaMorta: 0.03, constanteTempoMs: 100 });
  });

  it('proporcional desde quase o centro: só a zona morta pequena é zero; ±1 no limiar; contínua', () => {
    expect(fracaoControle(0)).toBe(0);
    expect(fracaoControle(zonaMorta)).toBe(0);
    expect(fracaoControle(0.1)).toBeCloseTo((0.1 - zonaMorta) / (1 - zonaMorta), 9);
    expect(fracaoControle(0.5)).toBeGreaterThan(0.48);
    expect(fracaoControle(1)).toBe(1);
    expect(fracaoControle(-1)).toBe(-1);
    expect(fracaoControle(zonaMorta + 1e-9)).toBeLessThan(1e-6);
  });

  it('limita fora de -1..1 e trata NaN como centro', () => {
    expect(fracaoControle(4)).toBe(1);
    expect(fracaoControle(-4)).toBe(-1);
    expect(fracaoControle(Number.NaN)).toBe(0);
  });
});

describe('deslocamentoCard: como no Reigns, eixo de giro na base (AC-2.10)', () => {
  it('no centro, parado e sem rótulos', () => {
    expect(deslocamentoCard(0, CARD)).toEqual({ dx: 0, dy: 0, graus: 0, verdade: 0, mentira: 0 });
  });

  it('no limiar (+1): girado 15° para a direita, base deslocada 8% da largura, rótulo Verdade inteiro', () => {
    const d = deslocamentoCard(1, CARD);
    const h = CARD.altura / 2;
    expect(d.graus).toBeCloseTo(maxGraus, 9);
    // o centro do card anda a base + o efeito do giro em torno da base
    expect(d.dx).toBeCloseTo(fracaoLargura * CARD.largura + h * Math.sin(rad(maxGraus)), 6);
    expect(d.dy).toBeCloseTo(h * (1 - Math.cos(rad(maxGraus))), 6);
    expect(d).toMatchObject({ verdade: 1, mentira: 0 });
  });

  it('para a esquerda é o espelho, com o rótulo Mentira; a meio caminho, rótulo pela metade', () => {
    const d = deslocamentoCard(-1, CARD);
    const e = deslocamentoCard(1, CARD);
    expect(d.dx).toBeCloseTo(-e.dx, 9);
    expect(d.dy).toBeCloseTo(e.dy, 9);
    expect(d.graus).toBeCloseTo(-maxGraus, 9);
    expect(d).toMatchObject({ verdade: 0, mentira: 1 });
    expect(deslocamentoCard(-0.5, CARD)).toMatchObject({ verdade: 0, mentira: 0.5, graus: -maxGraus / 2 });
  });

  it('a base do card anda na proporção da fração', () => {
    const f = 0.4;
    const d = deslocamentoCard(f, CARD);
    const baseX = d.dx - (CARD.altura / 2) * Math.sin(rad(d.graus));
    expect(baseX).toBeCloseTo(f * fracaoLargura * CARD.largura, 6);
  });

  it('giro em torno do centro da base: o ponto central inferior só anda o deslocamento lateral', () => {
    const f = -0.6;
    const d = deslocamentoCard(f, CARD);
    const t = rad(d.graus), h = CARD.altura / 2;
    // centro da base = centro do card + rotação de (0, h) = (−h·sen θ, h·cos θ)
    expect(d.dx - h * Math.sin(t)).toBeCloseTo(f * fracaoLargura * CARD.largura, 6);
    expect(d.dy + h * Math.cos(t)).toBeCloseTo(h, 6);
  });

  it('card sem tamanho (ainda não medido) não se move', () => {
    expect(deslocamentoCard(1, { largura: 0, altura: 0 })).toMatchObject({ dx: 0, dy: 0 });
  });
});

describe('criarInclinacaoCard: interpolação entre as leituras da câmera (AC-2.10c)', () => {
  const jogando = (inclinacao: number, dtMs: number) => ({ situacao: 'jogando' as const, inclinacao, dtMs });

  it('segue a leitura a cada quadro, sem salto e sem atraso grande: ~63% em 100 ms, ~95% em 300 ms', () => {
    const c = criarInclinacaoCard();
    const um = c.passo(jogando(1, 16));
    expect(um).toBeGreaterThan(0);
    expect(um).toBeLessThan(0.2);
    let f = um;
    for (let t = 16; t < constanteTempoMs; t += 16) f = c.passo(jogando(1, 16));
    expect(f).toBeGreaterThan(0.55);
    expect(f).toBeLessThan(0.7);
    for (let t = 0; t < 200; t += 16) f = c.passo(jogando(1, 16));
    expect(f).toBeGreaterThan(0.94);
  });

  it('não depende da taxa de quadros: 10 quadros de 16 ms = 1 de 160 ms', () => {
    const a = criarInclinacaoCard();
    const b = criarInclinacaoCard();
    let fa = 0;
    for (let i = 0; i < 10; i++) fa = a.passo(jogando(1, 16));
    expect(fa).toBeCloseTo(b.passo(jogando(1, 160)), 9);
  });

  it('quadro com dt 0 ou negativo não mexe', () => {
    const c = criarInclinacaoCard();
    const antes = c.passo(jogando(1, 100));
    expect(c.passo(jogando(-1, 0))).toBe(antes);
    expect(c.passo(jogando(-1, -50))).toBe(antes);
  });

  it('"centro" volta ao zero e encosta nele; "saindo" mantém a posição da escolha', () => {
    const c = criarInclinacaoCard();
    for (let i = 0; i < 60; i++) c.passo(jogando(1, 16));
    const naEscolha = c.passo(jogando(1, 16));
    expect(c.passo({ situacao: 'saindo', inclinacao: -1, dtMs: 100 })).toBe(naEscolha);
    let f = naEscolha;
    for (let i = 0; i < 100; i++) f = c.passo({ situacao: 'centro', inclinacao: 1, dtMs: 16 });
    expect(f).toBe(0);
  });
});

describe('situacaoDoCard (AC-2.10)', () => {
  const partida = { cards: [], resultados: [], entrada: 'corpo' as const };
  const card = (extra = {}) => ({ tela: 'card' as const, partida, indice: 0, restanteMs: 5000, saibaMais: false, ausenteMs: null, ...extra });

  it('card na tela segue a leitura, inclusive com o "saiba mais" aberto', () => {
    expect(situacaoDoCard(card(), false)).toBe('jogando');
    expect(situacaoDoCard(card({ saibaMais: true }), false)).toBe('jogando');
  });

  it('"Volte para o centro" e menu aberto levam ao centro', () => {
    expect(situacaoDoCard(card({ ausenteMs: 100 }), false)).toBe('centro');
    expect(situacaoDoCard(card(), true)).toBe('centro');
  });

  it('saída do card escolhido mantém a posição; o resultado do feedback e o tempo esgotado voltam ao centro', () => {
    const fb = (restanteMs: number, resposta: 'verdadeira' | 'falsa' | null) =>
      ({ tela: 'feedback' as const, partida, indice: 0, restanteMs, resposta });
    expect(situacaoDoCard(fb(INICIO_RESULTADO_MS + TEMPOS.saidaMs, 'verdadeira'), false)).toBe('saindo');
    expect(situacaoDoCard(fb(INICIO_RESULTADO_MS + 1, 'verdadeira'), false)).toBe('saindo'); // v12.0.0: a carimbada é do resultado
    expect(situacaoDoCard(fb(INICIO_RESULTADO_MS, 'falsa'), false)).toBe('centro');
    expect(situacaoDoCard(fb(INICIO_RESULTADO_MS, null), false)).toBe('centro');
  });

  it('v10.2.0: o card de treino segue a leitura e sai da mesma forma; o feedback de treino volta ao centro', () => {
    expect(situacaoDoCard({ tela: 'tutorial', passo: 0, entrada: 'corpo' }, false)).toBe('jogando');
    expect(situacaoDoCard({ tela: 'tutorial', passo: 0, entrada: 'corpo' }, true)).toBe('centro');
    const fb = (restanteMs: number) => ({ tela: 'tutorialFeedback' as const, passo: 0, entrada: 'corpo' as const, restanteMs, resposta: 'falsa' as const });
    expect(situacaoDoCard(fb(INICIO_RESULTADO_MS + 1), false)).toBe('saindo');
    expect(situacaoDoCard(fb(INICIO_RESULTADO_MS), false)).toBe('centro');
  });

  it('outras telas ficam no centro', () => {
    expect(situacaoDoCard({ tela: 'espera' }, false)).toBe('centro');
    expect(situacaoDoCard({ tela: 'calibracao', centradoMs: 0, ausenteMs: 0 }, false)).toBe('centro');
    expect(situacaoDoCard({ tela: 'resumo', partida }, false)).toBe('centro');
  });
});
