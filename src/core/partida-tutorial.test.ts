import { describe, expect, it } from 'vitest';
import { ESTADO_INICIAL, TEMPOS, calibrarAoSair, pontos, reduzir, type Contexto, type Estado, type Evento, type Presenca } from './partida';
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
// v12.0.0 (AC-4.10, AC-9.25): o treino soma a saída do card e a carimbada, como a partida.
const SAIDA_E_FEEDBACK = TEMPOS.feedbackMs + TEMPOS.carimboMs + TEMPOS.saidaMs;
// v13.0.0: abertura do fan (AC-17.5) e distribuição de cada carta (AC-17.6).
const ABRIR = tick(TEMPOS.aberturaFanMs);
const POUSAR = tick(TEMPOS.distribuirMs);
const PARTIDA = { cards: [], resultados: [], entrada: 'alternativa' as const };

describe('tutorial: entrada (AC-15.1, AC-15.2)', () => {
  it('AC-15.1: desligado (sem perfis), a partida começa direto, como antes', () => {
    expect(rodar(ESTADO_INICIAL, [enter, enter, ABRIR], ctx({ tutorial: [] })).tela).toBe('card');
    expect(rodar(ESTADO_INICIAL, [enter, ABRIR], ctx({ tutorial: undefined, cameraAtiva: false })).tela).toBe('card');
  });

  it('AC-15.2: ligado, a calibração concluída leva ao treino 1 (entrada "corpo"), não ao card', () => {
    const s = rodar(ESTADO_INICIAL, [enter, tick(16), tick(1000), tick(1000), ABRIR]);
    expect(s).toMatchObject({ tela: 'tutorial', passo: 0, treinos: 4, partida: { entrada: 'corpo' } });
  });

  it('AC-15.2: Enter na calibração, Enter na espera sem câmera e Enter no resumo sem câmera também passam pelo treino', () => {
    expect(rodar(ESTADO_INICIAL, [enter, enter, ABRIR])).toMatchObject({ tela: 'tutorial', passo: 0, partida: { entrada: 'alternativa' } });
    expect(rodar(ESTADO_INICIAL, [enter, ABRIR], ctx({ cameraAtiva: false }))).toMatchObject({ tela: 'tutorial', passo: 0, partida: { entrada: 'alternativa' } });
    const resumo: Estado = { tela: 'resumo', partida: PARTIDA };
    expect(rodar(resumo, [enter, ABRIR], ctx({ cameraAtiva: false })).tela).toBe('tutorial');
    expect(rodar(resumo, [enter]).tela).toBe('calibracao');
  });

  it('sem notícias, nem o treino começa (AC-6.4)', () => {
    expect(rodar(ESTADO_INICIAL, [enter], ctx({ noticias: [], cameraAtiva: false }))).toEqual(ESTADO_INICIAL);
  });
});

describe('calibrarAoSair (FR-2: centro medido na calibração)', () => {
  it('calibra ao sair da calibração para a abertura (v13.0.0); nunca do treino para o card', () => {
    expect(calibrarAoSair('calibracao', 'abertura')).toBe(true);
    expect(calibrarAoSair('tutorialFeedback', 'card')).toBe(false);
    expect(calibrarAoSair('calibracao', 'espera')).toBe(false);
    expect(calibrarAoSair('feedback', 'card')).toBe(false);
  });
});

describe('tutorial: card e feedback de treino (AC-15.3 a AC-15.6)', () => {
  // Treino já pousado (a distribuição está em partida-abertura.test.ts); a partida já vem sorteada desde a abertura.
  const sorteada = (entrada: 'corpo' | 'alternativa' = 'alternativa') => ({ cards: noticias, resultados: [], entrada });
  const treino = (passo = 0, entrada: 'corpo' | 'alternativa' = 'alternativa'): Estado =>
    ({ tela: 'tutorial', passo, treinos: 4, partida: sorteada(entrada), distribuindoMs: 0 });

  it('AC-15.3: a escolha vai para o feedback de treino, com a saída do card + 3 s', () => {
    expect(rodar(treino(), [escolha('verdadeira')])).toEqual({
      tela: 'tutorialFeedback', passo: 0, treinos: 4, partida: sorteada(), restanteMs: SAIDA_E_FEEDBACK, resposta: 'verdadeira',
      resultadoMs: TEMPOS.carimboMs + TEMPOS.feedbackMs,
    });
  });

  it('fronteira: 1 ms antes do fim o feedback continua; no fim vem o treino seguinte', () => {
    const fb = rodar(treino(), [escolha('falsa')]);
    expect(rodar(fb, [tick(SAIDA_E_FEEDBACK - 1)])).toMatchObject({ tela: 'tutorialFeedback', restanteMs: 1 });
    expect(rodar(fb, [tick(SAIDA_E_FEEDBACK)])).toEqual({ tela: 'tutorial', passo: 1, treinos: 4, partida: sorteada(), distribuindoMs: TEMPOS.distribuirMs });
  });

  it('AC-15.2: depois do 4º treino vem o 1º card da partida com o cronômetro cheio e o placar zerado', () => {
    const s = rodar(treino(3), [escolha('verdadeira'), tick(SAIDA_E_FEEDBACK), POUSAR], ctx({ tempoCardMs: 20000 }));
    expect(s).toMatchObject({ tela: 'card', indice: 0, restanteMs: 20000, saibaMais: false, ausenteMs: null });
    if (s.tela !== 'card') throw new Error();
    expect(s.partida.resultados).toEqual([]);
    expect(pontos(s.partida)).toBe(0);
    expect(s.partida.cards.map((c) => c.id).sort()).toEqual(['f1', 'v1']); // AC-15.4: só notícias do banco
  });

  it('a entrada do treino segue para a partida (corpo pausa por ausência; alternativa não)', () => {
    const fim = (entrada: 'corpo' | 'alternativa') =>
      rodar(treino(3, entrada), [escolha('falsa'), tick(SAIDA_E_FEEDBACK)]);
    expect(fim('corpo')).toMatchObject({ tela: 'card', partida: { entrada: 'corpo' } });
    expect(fim('alternativa')).toMatchObject({ tela: 'card', partida: { entrada: 'alternativa' } });
  });

  it('AC-15.4: o treino inteiro, certo ou errado, não deixa resultado na partida', () => {
    let s: Estado = rodar(ESTADO_INICIAL, [enter, enter, ABRIR]);
    for (const r of ['verdadeira', 'verdadeira', 'verdadeira', 'verdadeira'] as const) s = rodar(s, [POUSAR, escolha(r), tick(SAIDA_E_FEEDBACK)]);
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
    expect(rodar(treino(0, 'corpo'), [tick(20_000, ninguem)])).toEqual(treino(0, 'corpo'));
    expect(rodar(t, [{ tipo: 'saibaMais' }])).toEqual(t);
  });

  it('FR-2: uma escolha só por card de treino; no feedback a escolha é ignorada', () => {
    const fb = rodar(treino(), [escolha('falsa')]);
    expect(rodar(fb, [escolha('verdadeira')])).toEqual(fb);
    expect(rodar(fb, [{ tipo: 'saibaMais' }])).toEqual(fb);
  });
});
