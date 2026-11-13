import { describe, expect, it } from 'vitest';
import {
  ESTADO_INICIAL, TEMPOS, duracaoFeedbackMs, duracaoResultadoMs, reduzir, type Contexto, type Estado, type Evento, type Presenca,
} from './partida';
import type { PerfilTutorial } from './tutorial';
import type { Noticia, Tema, Veredito } from './types';

// v12.0.0: tempos e sorteio vindos dos Ajustes (FR-1, FR-9, AC-9.23 a AC-9.28, AC-5.2, AC-15.3).
const n = (id: string, veredito: Veredito, tema: Tema = 'ciencia'): Noticia => ({
  id, veredito, tecnica: 'fonte', titulo: id, descricao: '', saibaMais: '', tema, explicacao: '', fonteUrl: '',
});
const noticias = [
  n('v1', 'verdadeira'), n('f1', 'falsa'), n('v2', 'verdadeira', 'politica'), n('f2', 'falsa', 'politica'),
  n('v3', 'verdadeira'), n('f3', 'falsa'),
];
const ctx = (over: Partial<Contexto> = {}): Contexto => ({
  noticias, rng: () => 0.5, cameraAtiva: true, tempoCardMs: TEMPOS.cardMs, ...over,
});
const centro: Presenca = { presente: true, centralizado: true };
const ninguem: Presenca = { presente: false, centralizado: false };
const tick = (dtMs: number, presenca: Presenca | null = centro): Evento => ({ tipo: 'tick', dtMs, presenca });
const enter: Evento = { tipo: 'enter' };
const escolha = (resposta: Veredito): Evento => ({ tipo: 'escolha', resposta });
const rodar = (s: Estado, eventos: Evento[], c: Contexto) => eventos.reduce((e, ev) => reduzir(e, ev, c), s);
const emCard = (c: Contexto) => rodar(ESTADO_INICIAL, [enter, enter], c);
const emCardCalibrado = (c: Contexto) => rodar(ESTADO_INICIAL, [enter, tick(16), tick(1000), tick(1000)], c);

describe('AC-9.25: tempo do feedback configurado', () => {
  it('sem ajuste, vale TEMPOS.feedbackMs', () => {
    expect(duracaoFeedbackMs({})).toBe(TEMPOS.feedbackMs);
    expect(duracaoFeedbackMs({ tempoFeedbackMs: 8000 })).toBe(8000);
  });

  it('AC-4.9: a carimbada (300 ms) soma ao tempo configurado do resultado, nunca desconta', () => {
    expect(duracaoResultadoMs({})).toBe(TEMPOS.carimboMs + TEMPOS.feedbackMs);
    expect(duracaoResultadoMs({ tempoFeedbackMs: 8000 })).toBe(8300);
  });

  it('feedback em 8 s, depois de uma escolha: saída (250) + carimbada (300) + 8 s inteiros (fronteira 8549/8550)', () => {
    const c = ctx({ tempoFeedbackMs: 8000 });
    const fb = rodar(emCard(c), [escolha('falsa')], c);
    // `resultadoMs`: quanto dura o resultado (carimbada + tempo), para som, inclinação e tela saberem quando a saída acaba.
    expect(fb).toMatchObject({ tela: 'feedback', restanteMs: 8550, resultadoMs: 8300 });
    expect(rodar(fb, [tick(8549)], c)).toMatchObject({ tela: 'feedback', indice: 0 });
    expect(rodar(fb, [tick(8550)], c)).toMatchObject({ tela: 'card', indice: 1 });
  });

  it('feedback em 8 s, tempo esgotado (sem saída do card): carimbada + 8 s (fronteira 8299/8300)', () => {
    const c = ctx({ tempoFeedbackMs: 8000 });
    const fb = rodar(emCard(c), [tick(TEMPOS.cardMs)], c);
    expect(fb).toMatchObject({ tela: 'feedback', resposta: null, restanteMs: 8300, resultadoMs: 8300 });
    expect(rodar(fb, [tick(8299)], c)).toMatchObject({ tela: 'feedback', indice: 0 });
    expect(rodar(fb, [tick(8300)], c)).toMatchObject({ tela: 'card', indice: 1 });
  });

  it('tempo esgotado com 15 s: o feedback dura a carimbada + o tempo configurado', () => {
    const c = ctx({ tempoFeedbackMs: 15000 });
    const fb = rodar(emCard(c), [tick(TEMPOS.cardMs)], c);
    expect(fb).toMatchObject({ tela: 'feedback', restanteMs: 15300 });
    expect(rodar(fb, [tick(15299)], c).tela).toBe('feedback');
    expect(rodar(fb, [tick(15300)], c).tela).toBe('card');
  });

  it('AC-15.3 (v12.0.1): o feedback do treino em 8 s também tem saída + carimbada + o tempo configurado (fronteira 8549/8550)', () => {
    const treino: PerfilTutorial[] = [{ id: 't1', nome: 't1', frase: '', veredito: 'falsa', explicacao: '', tecnica: 'imagem', tema: 'curiosidades' }];
    const c = ctx({ tempoFeedbackMs: 8000, tutorial: treino });
    const fb = rodar(ESTADO_INICIAL, [enter, enter, escolha('falsa')], c);
    expect(fb).toMatchObject({ tela: 'tutorialFeedback', restanteMs: 8550, resultadoMs: 8300 });
    expect(rodar(fb, [tick(8549)], c).tela).toBe('tutorialFeedback');
    expect(rodar(fb, [tick(8550)], c).tela).toBe('card');
  });
});

describe('AC-9.28/AC-5.4/AC-5.5: tolerância sem pessoa configurada (modo Corpo)', () => {
  it.each([5000, 10000, 20000])('com %i ms: ainda pausado 1 ms antes; encerra na tolerância', (tol) => {
    const c = ctx({ toleranciaMs: tol });
    const card = emCardCalibrado(c);
    expect(rodar(card, [tick(tol - 1, ninguem)], c)).toMatchObject({ tela: 'card', ausenteMs: tol - 1 });
    expect(rodar(card, [tick(tol - 1, ninguem), tick(1, centro)], c)).toMatchObject({ tela: 'card', ausenteMs: null }); // AC-5.4
    expect(rodar(card, [tick(tol, ninguem)], c)).toEqual(ESTADO_INICIAL);
  });

  it('sem ajuste, continua 10 s (TEMPOS.ausenciaMs)', () => {
    const c = ctx();
    expect(rodar(emCardCalibrado(c), [tick(TEMPOS.ausenciaMs - 1, ninguem)], c).tela).toBe('card');
    expect(rodar(emCardCalibrado(c), [tick(TEMPOS.ausenciaMs, ninguem)], c)).toEqual(ESTADO_INICIAL);
  });
});

describe('AC-5.2/AC-9.26: volta automática do resumo', () => {
  const resumo = (c: Contexto) => {
    let s = emCard(c);
    for (let i = 0; i < 6; i++) s = rodar(s, [escolha('falsa'), tick(TEMPOS.saidaMs + duracaoResultadoMs(c))], c);
    expect(s.tela).toBe('resumo');
    return s;
  };

  it('desligada (padrão): o resumo não expira', () => {
    const c = ctx();
    expect(rodar(resumo(c), [tick(600000, ninguem)], c).tela).toBe('resumo');
    const zero = ctx({ voltaResumoMs: 0 });
    expect(rodar(resumo(zero), [tick(600000, ninguem)], zero).tela).toBe('resumo');
  });

  it.each([30000, 60000, 120000])('em %i ms: fecha e volta à espera exatamente no tempo (fronteira)', (ms) => {
    const c = ctx({ voltaResumoMs: ms });
    const r = resumo(c);
    expect(rodar(r, [tick(ms / 2), tick(ms / 2 - 1)], c).tela).toBe('resumo');
    expect(rodar(r, [tick(ms / 2), tick(ms / 2)], c)).toEqual(ESTADO_INICIAL);
  });

  it('Enter antes do tempo inicia a nova partida, como antes (AC-5.6)', () => {
    const c = ctx({ voltaResumoMs: 30000 });
    expect(rodar(resumo(c), [tick(29000), enter], c).tela).toBe('calibracao');
  });

  // Fronteira pedida pelo gestor na revisão da Fase 43: o `decorridoMs` do resumo não pode vazar para a partida seguinte.
  it.each([true, false])('Enter aos 29 s (câmera ativa: %s): a nova partida não é cortada nem volta à espera', (cameraAtiva) => {
    const c = ctx({ voltaResumoMs: 30000, cameraAtiva });
    let s = rodar(resumo(c), [tick(29000), enter], c);
    expect(s).not.toHaveProperty('decorridoMs');
    if (cameraAtiva) {
      expect(s.tela).toBe('calibracao');
      s = rodar(s, [tick(1000), tick(1000)], c); // calibra
    }
    expect(s).toMatchObject({ tela: 'card', indice: 0 });
    // Bem mais que o 1 s que faltava ao resumo: a partida segue, card a card.
    s = rodar(s, [tick(5000), tick(5000)], c);
    expect(s).toMatchObject({ tela: 'card', indice: 0 });
    for (let i = 0; i < 6; i++) {
      expect(s).toMatchObject({ tela: 'card', indice: i });
      s = rodar(s, [escolha('falsa'), tick(TEMPOS.saidaMs + duracaoResultadoMs(c))], c);
    }
    // Chegou ao resumo de novo: o contador começa do zero.
    expect(s.tela).toBe('resumo');
    expect(s).not.toHaveProperty('decorridoMs');
    expect(rodar(s, [tick(29999)], c).tela).toBe('resumo');
    expect(rodar(s, [tick(29999), tick(1)], c)).toEqual(ESTADO_INICIAL);
  });
});

describe('AC-9.23/AC-9.27: o sorteio usa os Ajustes', () => {
  it('quantidade de notícias por partida', () => {
    const c = ctx({ sorteio: { quantidade: 4 } });
    const s = emCard(c);
    if (s.tela !== 'card') throw new Error(s.tela);
    expect(s.partida.cards).toHaveLength(4);
  });

  it('temas ligados', () => {
    const c = ctx({ sorteio: { quantidade: 10, temas: ['politica'] } });
    const s = emCard(c);
    if (s.tela !== 'card') throw new Error(s.tela);
    expect(s.partida.cards.map((x) => x.id).sort()).toEqual(['f2', 'v2']);
  });
});
