import { describe, expect, it } from 'vitest';
import {
  ESTADO_INICIAL, TEMPOS, calibrarAoSair, cardSaindo, cartasNoFan, reduzir,
  type Contexto, type Estado, type Evento, type Presenca,
} from './partida';
import type { PerfilTutorial } from './tutorial';
import type { Noticia, Veredito } from './types';

// v13.0.0 (Fase 46): abertura do fan (AC-17.5) e distribuição de cada carta (AC-17.6); FR-1, FR-18.
const n = (id: string, veredito: Veredito): Noticia => ({
  id, veredito, tecnica: 'fonte', titulo: id, descricao: '', saibaMais: '', tema: 'ciencia', explicacao: '', fonteUrl: '',
});
const p = (id: string, veredito: Veredito): PerfilTutorial => ({
  id, nome: id, frase: '', veredito, explicacao: '', tecnica: 'imagem', tema: 'curiosidades',
});
const noticias = [n('v1', 'verdadeira'), n('f1', 'falsa'), n('v2', 'verdadeira'), n('f2', 'falsa'), n('v3', 'verdadeira')];
const TREINO = [p('t1', 'falsa'), p('t2', 'verdadeira')];
const ctx = (over: Partial<Contexto> = {}): Contexto => ({
  noticias, rng: () => 0.5, cameraAtiva: true, tempoCardMs: TEMPOS.cardMs, ...over,
});
const centro: Presenca = { presente: true, centralizado: true };
const ninguem: Presenca = { presente: false, centralizado: false };
const tick = (dtMs: number, presenca: Presenca | null = centro): Evento => ({ tipo: 'tick', dtMs, presenca });
const enter: Evento = { tipo: 'enter' };
const sair: Evento = { tipo: 'sair' };
const escolha = (resposta: Veredito): Evento => ({ tipo: 'escolha', resposta });
const rodar = (s: Estado, eventos: Evento[], c = ctx()) => eventos.reduce((e, ev) => reduzir(e, ev, c), s);
const resumo: Estado = { tela: 'resumo', partida: { cards: [], resultados: [], entrada: 'alternativa' } };

describe('AC-17.5: abertura do fan em todo início de partida', () => {
  it('FR-18: os tempos novos ficam em TEMPOS', () => {
    expect(TEMPOS.aberturaFanMs).toBe(1500);
    expect(TEMPOS.distribuirMs).toBe(900);
  });

  it.each([
    ['calibração completa (AC-1.2)', () => rodar(ESTADO_INICIAL, [enter, tick(16), tick(1000), tick(1000)]), 'corpo'],
    ['Enter na espera sem câmera (AC-1.6)', () => rodar(ESTADO_INICIAL, [enter], ctx({ cameraAtiva: false })), 'alternativa'],
    ['Enter na calibração (AC-1.8)', () => rodar(ESTADO_INICIAL, [enter, enter]), 'alternativa'],
    ['Enter no resumo sem câmera (AC-5.6)', () => rodar(resumo, [enter], ctx({ cameraAtiva: false })), 'alternativa'],
  ] as const)('%s passa pela abertura, com a partida já sorteada', (_, iniciar, entrada) => {
    const s = iniciar();
    expect(s).toMatchObject({ tela: 'abertura', restanteMs: TEMPOS.aberturaFanMs, treinos: 0, partida: { resultados: [], entrada } });
    if (s.tela !== 'abertura') throw new Error(s.tela);
    expect(s.partida.cards).toHaveLength(5);
  });

  it('com o tutorial ligado, a abertura também vem antes do treino', () => {
    const c = ctx({ tutorial: TREINO });
    expect(rodar(ESTADO_INICIAL, [enter, enter], c)).toMatchObject({ tela: 'abertura', treinos: 2 });
  });

  it('fronteira: a abertura termina exatamente em 1500 ms (1499 ainda é abertura)', () => {
    const a = rodar(ESTADO_INICIAL, [enter, enter]);
    expect(rodar(a, [tick(1499)])).toMatchObject({ tela: 'abertura', restanteMs: 1 });
    expect(rodar(a, [tick(1000), tick(499)])).toMatchObject({ tela: 'abertura', restanteMs: 1 });
    expect(rodar(a, [tick(1500)])).toMatchObject({ tela: 'card', indice: 0, distribuindoMs: TEMPOS.distribuirMs, restanteMs: TEMPOS.cardMs });
    expect(rodar(a, [tick(1000), tick(500)])).toMatchObject({ tela: 'card', indice: 0 });
  });

  it('com o tutorial, depois da abertura vem a distribuição do 1º treino', () => {
    const c = ctx({ tutorial: TREINO });
    const s = rodar(ESTADO_INICIAL, [enter, enter, tick(TEMPOS.aberturaFanMs)], c);
    expect(s).toMatchObject({ tela: 'tutorial', passo: 0, treinos: 2, distribuindoMs: TEMPOS.distribuirMs, partida: { entrada: 'alternativa' } });
  });

  it('sem cronômetro, escolha, seta, arraste nem "saiba mais" na abertura; Enter não pula; ausência não conta', () => {
    const a = rodar(ESTADO_INICIAL, [enter, enter]);
    for (const ev of [escolha('verdadeira'), escolha('falsa'), { tipo: 'saibaMais' } as Evento, enter]) {
      expect(rodar(a, [ev])).toEqual(a);
    }
    const corpo = rodar(ESTADO_INICIAL, [enter, tick(1000), tick(1000)]);
    expect(rodar(corpo, [tick(1499, ninguem)])).toMatchObject({ tela: 'abertura', restanteMs: 1 });
  });

  it('AC-10.3: Esc/Sair na abertura volta à espera', () => {
    expect(rodar(ESTADO_INICIAL, [enter, enter, tick(700), sair])).toEqual(ESTADO_INICIAL);
  });

  it('sem notícias sorteáveis (filtros), nem a abertura começa (AC-6.4)', () => {
    const c = ctx({ cameraAtiva: false, sorteio: { temas: ['politica'] } });
    expect(rodar(ESTADO_INICIAL, [enter], c)).toEqual(ESTADO_INICIAL);
  });

  it('FR-2: o centro é medido ao sair da calibração para a abertura', () => {
    expect(calibrarAoSair('calibracao', 'abertura')).toBe(true);
    expect(calibrarAoSair('abertura', 'card')).toBe(false);
    expect(calibrarAoSair('abertura', 'tutorial')).toBe(false);
    expect(calibrarAoSair('calibracao', 'espera')).toBe(false);
  });
});

describe('AC-17.6: distribuição de cada carta', () => {
  const distribuindo = (c = ctx()) => rodar(ESTADO_INICIAL, [enter, enter, tick(TEMPOS.aberturaFanMs)], c);
  const corpo = (c = ctx()) => rodar(ESTADO_INICIAL, [enter, tick(1000), tick(1000), tick(TEMPOS.aberturaFanMs)], c);

  it('fronteira: o cronômetro fica cheio e parado até 899 ms; em 900 a carta pousa com o tempo inteiro', () => {
    const d = distribuindo();
    expect(rodar(d, [tick(899)])).toMatchObject({ tela: 'card', distribuindoMs: 1, restanteMs: TEMPOS.cardMs });
    expect(rodar(d, [tick(900)])).toMatchObject({ tela: 'card', distribuindoMs: 0, restanteMs: TEMPOS.cardMs });
    // Só depois de pousada o cronômetro corre: o tempo da distribuição soma, não desconta (AC-17.6).
    expect(rodar(d, [tick(900), tick(1000)])).toMatchObject({ restanteMs: TEMPOS.cardMs - 1000 });
    expect(rodar(d, [tick(900), tick(TEMPOS.cardMs - 1)])).toMatchObject({ tela: 'card', restanteMs: 1 });
    expect(rodar(d, [tick(900), tick(TEMPOS.cardMs)]).tela).toBe('feedback');
  });

  it('um tick grande não desconta do cronômetro o que sobrou da distribuição', () => {
    expect(rodar(distribuindo(), [tick(5000)])).toMatchObject({ distribuindoMs: 0, restanteMs: TEMPOS.cardMs });
  });

  it('escolha, seta, arraste e "saiba mais" são ignorados durante a distribuição; valem com a carta pousada', () => {
    const d = rodar(distribuindo(), [tick(500)]);
    expect(rodar(d, [escolha('verdadeira')])).toEqual(d);
    expect(rodar(d, [escolha('falsa')])).toEqual(d);
    expect(rodar(d, [{ tipo: 'saibaMais' }])).toEqual(d);
    expect(rodar(d, [enter])).toEqual(d);
    expect(rodar(d, [tick(400), { tipo: 'saibaMais' }])).toMatchObject({ saibaMais: true });
    expect(rodar(d, [tick(400), escolha('falsa')]).tela).toBe('feedback');
  });

  it('"Volte para o centro" só conta com a carta pousada', () => {
    const d = corpo();
    expect(rodar(d, [tick(899, ninguem)])).toMatchObject({ tela: 'card', ausenteMs: null, distribuindoMs: 1 });
    const pousada = rodar(d, [tick(900, ninguem)]);
    expect(pousada).toMatchObject({ tela: 'card', ausenteMs: null, distribuindoMs: 0, restanteMs: TEMPOS.cardMs });
    expect(rodar(pousada, [tick(4000, ninguem)])).toMatchObject({ ausenteMs: 4000 });
  });

  it('depois do feedback, a próxima carta também é distribuída (900 ms somados)', () => {
    const s = rodar(distribuindo(), [tick(900), escolha('falsa'), tick(TEMPOS.saidaMs + TEMPOS.carimboMs + TEMPOS.feedbackMs)]);
    expect(s).toMatchObject({ tela: 'card', indice: 1, distribuindoMs: TEMPOS.distribuirMs, restanteMs: TEMPOS.cardMs });
    expect(rodar(s, [tick(899)])).toMatchObject({ distribuindoMs: 1, restanteMs: TEMPOS.cardMs });
  });

  it('AC-10.3: Esc/Sair durante a distribuição volta à espera', () => {
    expect(rodar(distribuindo(), [tick(300), sair])).toEqual(ESTADO_INICIAL);
  });

  it('o treino também é distribuído: escolha ignorada até pousar (fronteira 899/900); Enter pula o treino (AC-15.5)', () => {
    const c = ctx({ tutorial: TREINO });
    const t = distribuindo(c);
    expect(t).toMatchObject({ tela: 'tutorial', passo: 0 });
    expect(rodar(t, [tick(899), escolha('falsa')], c)).toMatchObject({ tela: 'tutorial', distribuindoMs: 1 });
    expect(rodar(t, [tick(900), escolha('falsa')], c).tela).toBe('tutorialFeedback');
    expect(rodar(t, [enter], c)).toMatchObject({ tela: 'card', indice: 0, distribuindoMs: TEMPOS.distribuirMs });
    expect(rodar(t, [tick(300), sair], c)).toEqual(ESTADO_INICIAL);
  });

  it('o treino seguinte e o 1º card depois do treino também chegam distribuindo', () => {
    const c = ctx({ tutorial: TREINO });
    const fimFb = TEMPOS.saidaMs + TEMPOS.carimboMs + TEMPOS.feedbackMs;
    const t2 = rodar(distribuindo(c), [tick(900), escolha('falsa'), tick(fimFb)], c);
    expect(t2).toMatchObject({ tela: 'tutorial', passo: 1, distribuindoMs: TEMPOS.distribuirMs });
    const c0 = rodar(t2, [tick(900), escolha('verdadeira'), tick(fimFb)], c);
    expect(c0).toMatchObject({ tela: 'card', indice: 0, distribuindoMs: TEMPOS.distribuirMs, partida: { resultados: [] } });
  });
});

describe('cartasNoFan (AC-17.3): cartas ainda não distribuídas, treinos + notícias', () => {
  it('na abertura, todas; a cada carta distribuída, uma a menos', () => {
    const c = ctx({ tutorial: TREINO });
    const fimFb = TEMPOS.saidaMs + TEMPOS.carimboMs + TEMPOS.feedbackMs;
    const a = rodar(ESTADO_INICIAL, [enter, enter], c);
    expect(cartasNoFan(a)).toBe(7);
    const t1 = rodar(a, [tick(TEMPOS.aberturaFanMs)], c);
    expect(cartasNoFan(t1)).toBe(6);
    const fb1 = rodar(t1, [tick(900), escolha('falsa')], c);
    expect(cartasNoFan(fb1)).toBe(6);
    const t2 = rodar(fb1, [tick(fimFb)], c);
    expect(cartasNoFan(t2)).toBe(5);
    const c0 = rodar(t2, [enter], c);
    expect(cartasNoFan(c0)).toBe(4);
    const c1 = rodar(c0, [tick(900), escolha('falsa'), tick(fimFb)], c);
    expect(c1).toMatchObject({ tela: 'card', indice: 1 });
    expect(cartasNoFan(c1)).toBe(3);
  });

  it('sem tutorial, a abertura tem só as notícias; fora da partida, nenhuma', () => {
    expect(cartasNoFan(rodar(ESTADO_INICIAL, [enter, enter]))).toBe(5);
    expect(cartasNoFan(ESTADO_INICIAL)).toBe(0);
    expect(cartasNoFan({ tela: 'calibracao', centradoMs: 0, ausenteMs: 0 })).toBe(0);
    expect(cartasNoFan(resumo)).toBe(0);
  });

  it('a distribuição não é a saída do card (cardSaindo)', () => {
    const d = rodar(ESTADO_INICIAL, [enter, enter, tick(TEMPOS.aberturaFanMs)]);
    expect(cardSaindo(d)).toBe(false);
    expect(cardSaindo(rodar(ESTADO_INICIAL, [enter, enter]))).toBe(false);
  });
});
