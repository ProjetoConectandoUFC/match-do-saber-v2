import { describe, expect, it } from 'vitest';
import { CONFIG_INCLINACAO_CARD, criarInclinacaoCard, mapearInclinacao, situacaoDoCard } from './inclinacaoCard';
import { TEMPOS } from './partida';

const { maxDeslocPx, maxGraus, zonaMorta } = CONFIG_INCLINACAO_CARD;

describe('mapearInclinacao (AC-2.10)', () => {
  it('pontos de partida da spec: 40 px, 6° e zona morta de 15%', () => {
    expect(CONFIG_INCLINACAO_CARD).toMatchObject({ maxDeslocPx: 40, maxGraus: 6, zonaMorta: 0.15 });
  });

  it('no centro e dentro da zona morta, o card não se move', () => {
    expect(mapearInclinacao(0)).toEqual({ dx: 0, graus: 0 });
    expect(mapearInclinacao(zonaMorta)).toEqual({ dx: 0, graus: 0 });
    expect(mapearInclinacao(-zonaMorta * 0.9)).toEqual({ dx: 0, graus: 0 });
  });

  it('no limiar do gesto (±1) chega ao máximo, para o mesmo lado', () => {
    expect(mapearInclinacao(1)).toEqual({ dx: maxDeslocPx, graus: maxGraus });
    expect(mapearInclinacao(-1)).toEqual({ dx: -maxDeslocPx, graus: -maxGraus });
  });

  it('é proporcional entre a zona morta e o limiar, e contínuo na borda da zona morta', () => {
    const meio = (1 + zonaMorta) / 2;
    expect(mapearInclinacao(meio).dx).toBeCloseTo(maxDeslocPx / 2, 6);
    expect(mapearInclinacao(-meio).graus).toBeCloseTo(-maxGraus / 2, 6);
    expect(mapearInclinacao(zonaMorta + 1e-6).dx).toBeLessThan(0.001);
  });

  it('limita valores fora de -1..1 e trata NaN como centro', () => {
    expect(mapearInclinacao(3)).toEqual({ dx: maxDeslocPx, graus: maxGraus });
    expect(mapearInclinacao(-7)).toEqual({ dx: -maxDeslocPx, graus: -maxGraus });
    expect(mapearInclinacao(Number.NaN)).toEqual({ dx: 0, graus: 0 });
  });
});

describe('criarInclinacaoCard: suavização (AC-2.10)', () => {
  const jogando = (inclinacao: number, dtMs: number) => ({ situacao: 'jogando' as const, inclinacao, dtMs, reduzirMovimento: false });

  it('começa no centro e segue a leitura sem saltar', () => {
    const c = criarInclinacaoCard();
    const p1 = c.passo(jogando(1, 16));
    expect(p1.dx).toBeGreaterThan(0);
    expect(p1.dx).toBeLessThan(maxDeslocPx / 4); // um quadro não leva ao máximo
    let p = p1;
    for (let i = 0; i < 120; i++) p = c.passo(jogando(1, 16)); // ~2 s
    expect(p.dx).toBeCloseTo(maxDeslocPx, 1);
    expect(p.graus).toBeCloseTo(maxGraus, 1);
  });

  it('não depende da taxa de quadros: 10 quadros de 16 ms ≈ 1 de 160 ms', () => {
    const a = criarInclinacaoCard();
    const b = criarInclinacaoCard();
    let pa = { dx: 0, graus: 0 };
    for (let i = 0; i < 10; i++) pa = a.passo(jogando(1, 16));
    const pb = b.passo(jogando(1, 160));
    expect(pa.dx).toBeCloseTo(pb.dx, 6);
  });

  it('quadro com dt 0 ou negativo não mexe', () => {
    const c = criarInclinacaoCard();
    c.passo(jogando(1, 100));
    const antes = c.passo(jogando(1, 0));
    expect(c.passo(jogando(-1, -50))).toEqual(antes);
  });

  it('"centro" (sem pessoa, Volte para o centro, feedback, menu) volta suavemente ao zero', () => {
    const c = criarInclinacaoCard();
    for (let i = 0; i < 120; i++) c.passo(jogando(-1, 16));
    const primeiro = c.passo({ situacao: 'centro', inclinacao: -1, dtMs: 16, reduzirMovimento: false });
    expect(primeiro.dx).toBeLessThan(0);
    expect(primeiro.dx).toBeGreaterThan(-maxDeslocPx);
    let p = primeiro;
    for (let i = 0; i < 200; i++) p = c.passo({ situacao: 'centro', inclinacao: -1, dtMs: 16, reduzirMovimento: false });
    expect(p).toEqual({ dx: 0, graus: 0 }); // encosta no zero, sem resto infinitesimal
  });

  it('"saindo" mantém a posição de onde o card estava ao ser escolhido', () => {
    const c = criarInclinacaoCard();
    for (let i = 0; i < 120; i++) c.passo(jogando(1, 16));
    const naEscolha = c.passo(jogando(1, 16));
    expect(c.passo({ situacao: 'saindo', inclinacao: -1, dtMs: 100, reduzirMovimento: false })).toEqual(naEscolha);
  });

  it('prefers-reduced-motion: sempre no centro, na hora', () => {
    const c = criarInclinacaoCard();
    for (let i = 0; i < 120; i++) c.passo(jogando(1, 16));
    expect(c.passo({ situacao: 'jogando', inclinacao: 1, dtMs: 16, reduzirMovimento: true })).toEqual({ dx: 0, graus: 0 });
    expect(c.passo({ situacao: 'saindo', inclinacao: 1, dtMs: 16, reduzirMovimento: true })).toEqual({ dx: 0, graus: 0 });
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
    expect(situacaoDoCard(fb(TEMPOS.feedbackMs + TEMPOS.saidaMs, 'verdadeira'), false)).toBe('saindo');
    expect(situacaoDoCard(fb(TEMPOS.feedbackMs, 'falsa'), false)).toBe('centro');
    expect(situacaoDoCard(fb(TEMPOS.feedbackMs, null), false)).toBe('centro');
  });

  it('outras telas ficam no centro', () => {
    expect(situacaoDoCard({ tela: 'espera' }, false)).toBe('centro');
    expect(situacaoDoCard({ tela: 'calibracao', centradoMs: 0, ausenteMs: 0 }, false)).toBe('centro');
    expect(situacaoDoCard({ tela: 'resumo', partida }, false)).toBe('centro');
  });
});
