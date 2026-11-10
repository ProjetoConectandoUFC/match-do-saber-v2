import { describe, expect, it } from 'vitest';
import { ESTADO_INICIAL, TEMPOS, pontos, reduzir, type Contexto, type Estado, type Evento, type Presenca } from './partida';
import type { PerfilTutorial } from './tutorial';
import type { Noticia, Veredito } from './types';

const n = (id: string, veredito: Veredito): Noticia => ({
  id, veredito, tecnica: 'fonte', titulo: id, descricao: '', saibaMais: '', tema: 'ciencia', explicacao: '', fonteUrl: '',
});
const p = (id: string, veredito: Veredito): PerfilTutorial => ({
  id, nome: id, frase: '', veredito, explicacao: '', tecnica: 'imagem', tema: 'curiosidades',
});
const noticias = [n('v1', 'verdadeira'), n('f1', 'falsa')];
const TREINO = [p('t1', 'falsa'), p('t2', 'verdadeira'), p('t3', 'falsa'), p('t4', 'verdadeira')];
const ctx = (over: Partial<Contexto> = {}): Contexto => ({
  noticias, rng: () => 0.5, cameraAtiva: true, tempoCardMs: TEMPOS.cardMs, tutorial: TREINO, ...over,
});
const centro: Presenca = { presente: true, centralizado: true };
const ninguem: Presenca = { presente: false, centralizado: false };
const tick = (dtMs: number, presenca: Presenca | null = centro): Evento => ({ tipo: 'tick', dtMs, presenca });
const enter: Evento = { tipo: 'enter' };
const escolha = (resposta: Veredito): Evento => ({ tipo: 'escolha', resposta });
const rodar = (s: Estado, eventos: Evento[], c = ctx()) => eventos.reduce((e, ev) => reduzir(e, ev, c), s);
const SAIDA_E_FEEDBACK = TEMPOS.feedbackMs + TEMPOS.saidaMs;

describe('tutorial: entrada (AC-15.1, AC-15.2)', () => {
  it('AC-15.1: desligado (sem perfis), a partida começa direto, como antes', () => {
    expect(rodar(ESTADO_INICIAL, [enter, enter], ctx({ tutorial: [] })).tela).toBe('card');
    expect(rodar(ESTADO_INICIAL, [enter], ctx({ tutorial: undefined, cameraAtiva: false })).tela).toBe('card');
  });

  it('AC-15.2: ligado, a calibração concluída leva ao treino 1 (entrada "corpo"), não ao card', () => {
    const s = rodar(ESTADO_INICIAL, [enter, tick(16), tick(1000), tick(1000)]);
    expect(s).toEqual({ tela: 'tutorial', passo: 0, entrada: 'corpo' });
  });

  it('AC-15.2: Enter na calibração, Enter na espera sem câmera e Enter no resumo sem câmera também passam pelo treino', () => {
    expect(rodar(ESTADO_INICIAL, [enter, enter])).toEqual({ tela: 'tutorial', passo: 0, entrada: 'alternativa' });
    expect(rodar(ESTADO_INICIAL, [enter], ctx({ cameraAtiva: false }))).toEqual({ tela: 'tutorial', passo: 0, entrada: 'alternativa' });
    const resumo: Estado = { tela: 'resumo', partida: { cards: [], resultados: [], entrada: 'alternativa' } };
    expect(rodar(resumo, [enter], ctx({ cameraAtiva: false })).tela).toBe('tutorial');
    expect(rodar(resumo, [enter]).tela).toBe('calibracao');
  });

  it('sem notícias, nem o treino começa (AC-6.4)', () => {
    expect(rodar(ESTADO_INICIAL, [enter], ctx({ noticias: [], cameraAtiva: false }))).toEqual(ESTADO_INICIAL);
  });
});

describe('tutorial: card e feedback de treino (AC-15.3 a AC-15.6)', () => {
  const treino = (passo = 0): Estado => ({ tela: 'tutorial', passo, entrada: 'alternativa' });

  it('AC-15.3: a escolha vai para o feedback de treino, com a saída do card + 3 s', () => {
    expect(rodar(treino(), [escolha('verdadeira')])).toEqual({
      tela: 'tutorialFeedback', passo: 0, entrada: 'alternativa', restanteMs: SAIDA_E_FEEDBACK, resposta: 'verdadeira',
    });
  });

  it('fronteira: 1 ms antes do fim o feedback continua; no fim vem o treino seguinte', () => {
    const fb = rodar(treino(), [escolha('falsa')]);
    expect(rodar(fb, [tick(SAIDA_E_FEEDBACK - 1)])).toMatchObject({ tela: 'tutorialFeedback', restanteMs: 1 });
    expect(rodar(fb, [tick(SAIDA_E_FEEDBACK)])).toEqual({ tela: 'tutorial', passo: 1, entrada: 'alternativa' });
  });

  it('AC-15.2: depois do 4º treino vem o 1º card da partida com o cronômetro cheio e o placar zerado', () => {
    const s = rodar(treino(3), [escolha('verdadeira'), tick(SAIDA_E_FEEDBACK)], ctx({ tempoCardMs: 20000 }));
    expect(s).toMatchObject({ tela: 'card', indice: 0, restanteMs: 20000, saibaMais: false, ausenteMs: null });
    if (s.tela !== 'card') throw new Error();
    expect(s.partida.resultados).toEqual([]);
    expect(pontos(s.partida)).toBe(0);
    expect(s.partida.cards.map((c) => c.id).sort()).toEqual(['f1', 'v1']); // AC-15.4: só notícias do banco
  });

  it('a entrada do treino segue para a partida (corpo pausa por ausência; alternativa não)', () => {
    const fim = (entrada: 'corpo' | 'alternativa') =>
      rodar({ tela: 'tutorial', passo: 3, entrada }, [escolha('falsa'), tick(SAIDA_E_FEEDBACK)]);
    expect(fim('corpo')).toMatchObject({ tela: 'card', partida: { entrada: 'corpo' } });
    expect(fim('alternativa')).toMatchObject({ tela: 'card', partida: { entrada: 'alternativa' } });
  });

  it('AC-15.4: o treino inteiro, certo ou errado, não deixa resultado na partida', () => {
    let s: Estado = rodar(ESTADO_INICIAL, [enter, enter]);
    for (const r of ['verdadeira', 'verdadeira', 'verdadeira', 'verdadeira'] as const) s = rodar(s, [escolha(r), tick(SAIDA_E_FEEDBACK)]);
    expect(s).toMatchObject({ tela: 'card', indice: 0, partida: { resultados: [] } });
  });

  it('AC-15.5: Enter pula o treino (no card ou no feedback) e a partida começa; Esc volta à espera', () => {
    expect(rodar(treino(1), [enter])).toMatchObject({ tela: 'card', indice: 0, partida: { entrada: 'alternativa' } });
    expect(rodar(treino(1), [escolha('falsa'), enter])).toMatchObject({ tela: 'card', indice: 0 });
    expect(rodar(treino(2), [{ tipo: 'sair' }])).toEqual(ESTADO_INICIAL);
    expect(rodar(treino(2), [escolha('falsa'), { tipo: 'sair' }])).toEqual(ESTADO_INICIAL);
  });

  it('AC-15.6: sem cronômetro, sem pausa por ausência e sem "saiba mais" no treino', () => {
    const t = treino(0);
    expect(rodar(t, [tick(60_000, centro), tick(60_000, ninguem), tick(60_000, null)], ctx())).toEqual(t);
    expect(rodar({ tela: 'tutorial', passo: 0, entrada: 'corpo' }, [tick(20_000, ninguem)])).toEqual({ tela: 'tutorial', passo: 0, entrada: 'corpo' });
    expect(rodar(t, [{ tipo: 'saibaMais' }])).toEqual(t);
  });

  it('FR-2: uma escolha só por card de treino; no feedback a escolha é ignorada', () => {
    const fb = rodar(treino(), [escolha('falsa')]);
    expect(rodar(fb, [escolha('verdadeira')])).toEqual(fb);
    expect(rodar(fb, [{ tipo: 'saibaMais' }])).toEqual(fb);
  });
});
