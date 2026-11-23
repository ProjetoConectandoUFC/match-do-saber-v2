import { describe, expect, it } from 'vitest';
import {
  ESTADO_INICIAL, TEMPOS, calibrarAoSair, distribuindo, interfaceDoEstado, permanenciaConta, reduzir,
  type Contexto, type Estado, type Evento, type InterfaceJogo, type Presenca,
} from './partida';
import type { PerfilTutorial } from './tutorial';
import type { Noticia, Veredito } from './types';

// v13.2.0 (Story 18, FR-19): um único reducer; `Contexto.interface` decide se há abertura e distribuição.
const n = (id: string, veredito: Veredito): Noticia => ({
  id, veredito, tecnica: 'fonte', titulo: id, descricao: '', saibaMais: '', tema: 'ciencia', explicacao: '', fonteUrl: '',
});
const p = (id: string, veredito: Veredito): PerfilTutorial => ({
  id, nome: id, frase: '', veredito, explicacao: '', tecnica: 'imagem', tema: 'curiosidades',
});
const noticias = [n('v1', 'verdadeira'), n('f1', 'falsa'), n('v2', 'verdadeira')];
const ctx = (over: Partial<Contexto> = {}): Contexto => ({ noticias, rng: () => 0.5, cameraAtiva: true, ...over });
const centro: Presenca = { presente: true, centralizado: true };
const ninguem: Presenca = { presente: false, centralizado: false };
const tick = (dtMs: number, presenca: Presenca | null = centro): Evento => ({ tipo: 'tick', dtMs, presenca });
const enter: Evento = { tipo: 'enter' };
const escolha = (resposta: Veredito): Evento => ({ tipo: 'escolha', resposta });
const rodar = (s: Estado, eventos: Evento[], c: Contexto) => eventos.reduce((e, ev) => reduzir(e, ev, c), s);
const FIM_FEEDBACK = TEMPOS.saidaMs + TEMPOS.carimboMs + TEMPOS.feedbackMs;

describe('AC-18.4: Clássica = v12.1.0 (sem abertura e sem distribuição)', () => {
  const c = ctx({ interface: 'classica' });

  it('sem interface no Contexto vale a Clássica (o padrão dos Ajustes)', () => {
    expect(rodar(ESTADO_INICIAL, [enter, enter], ctx())).toMatchObject({ tela: 'card', indice: 0, distribuindoMs: 0 });
  });

  it.each([
    ['calibração completa (AC-1.2)', [enter, tick(1000), tick(1000)], c, 'corpo'],
    ['Enter na calibração (AC-1.8)', [enter, enter], c, 'alternativa'],
    ['Enter na espera sem câmera (AC-1.6)', [enter], ctx({ interface: 'classica', cameraAtiva: false }), 'alternativa'],
  ] as const)('%s vai direto ao 1º card, com o cronômetro cheio já correndo', (_, eventos, cc, entrada) => {
    const s = rodar(ESTADO_INICIAL, [...eventos], cc);
    expect(s).toMatchObject({ tela: 'card', indice: 0, restanteMs: TEMPOS.cardMs, distribuindoMs: 0, partida: { entrada } });
    expect(distribuindo(s)).toBe(false);
    expect(rodar(s, [tick(1)], cc)).toMatchObject({ tela: 'card', restanteMs: TEMPOS.cardMs - 1 });
  });

  it('com o tutorial, vai direto ao 1º treino; o treino seguinte e o 1º card também chegam sem distribuição', () => {
    const ct = ctx({ interface: 'classica', tutorial: [p('t1', 'falsa'), p('t2', 'verdadeira')] });
    const t0 = rodar(ESTADO_INICIAL, [enter, enter], ct);
    expect(t0).toMatchObject({ tela: 'tutorial', passo: 0, treinos: 2, distribuindoMs: 0 });
    const t1 = rodar(t0, [escolha('falsa'), tick(FIM_FEEDBACK)], ct);
    expect(t1).toMatchObject({ tela: 'tutorial', passo: 1, distribuindoMs: 0 });
    expect(rodar(t1, [escolha('falsa'), tick(FIM_FEEDBACK)], ct)).toMatchObject({ tela: 'card', indice: 0, distribuindoMs: 0 });
    expect(rodar(t0, [enter], ct)).toMatchObject({ tela: 'card', indice: 0, distribuindoMs: 0 }); // AC-15.5
  });

  it('depois do feedback o próximo card chega com o cronômetro correndo (fronteira do feedback como na v12.1.0)', () => {
    const s = rodar(ESTADO_INICIAL, [enter, enter, escolha('falsa')], c);
    expect(rodar(s, [tick(FIM_FEEDBACK - 1)], c).tela).toBe('feedback');
    const prox = rodar(s, [tick(FIM_FEEDBACK)], c);
    expect(prox).toMatchObject({ tela: 'card', indice: 1, distribuindoMs: 0, restanteMs: TEMPOS.cardMs });
    expect(rodar(prox, [escolha('verdadeira')], c).tela).toBe('feedback'); // escolha aceita na hora
  });

  it('AC-2.13: a permanência do gesto conta desde o 1º quadro do card (e do treino)', () => {
    const card = rodar(ESTADO_INICIAL, [enter, enter], c);
    expect(permanenciaConta(card)).toBe(true);
    const ct = ctx({ interface: 'classica', tutorial: [p('t1', 'falsa')] });
    expect(permanenciaConta(rodar(ESTADO_INICIAL, [enter, enter], ct))).toBe(true);
  });

  it('AC-5.4: a ausência conta desde o 1º quadro do card (modo Corpo)', () => {
    const card = rodar(ESTADO_INICIAL, [enter, tick(1000), tick(1000)], c);
    expect(rodar(card, [tick(TEMPOS.ausenciaMs - 1, ninguem)], c)).toMatchObject({ tela: 'card', ausenteMs: TEMPOS.ausenciaMs - 1 });
    expect(rodar(card, [tick(TEMPOS.ausenciaMs, ninguem)], c)).toEqual(ESTADO_INICIAL);
  });

  it('FR-2: o centro é medido ao sair da calibração para o card ou para o treino', () => {
    expect(calibrarAoSair('calibracao', 'card')).toBe(true);
    expect(calibrarAoSair('calibracao', 'tutorial')).toBe(true);
  });
});

describe('AC-18.5: Cartas = v13.1.0 (abertura e distribuição somam)', () => {
  const c = ctx({ interface: 'cartas' });

  it('o início passa pela abertura e o 1º card chega distribuindo', () => {
    const a = rodar(ESTADO_INICIAL, [enter, enter], c);
    expect(a.tela).toBe('abertura');
    const d = rodar(a, [tick(TEMPOS.aberturaFanMs)], c);
    expect(d).toMatchObject({ tela: 'card', distribuindoMs: TEMPOS.distribuirMs, restanteMs: TEMPOS.cardMs });
    expect(permanenciaConta(d)).toBe(false);
    expect(permanenciaConta(rodar(d, [tick(TEMPOS.distribuirMs)], c))).toBe(true);
  });

  it('FR-2: o centro é medido ao sair da calibração para a abertura', () => {
    expect(calibrarAoSair('calibracao', 'abertura')).toBe(true);
  });
});

describe('AC-18.6: com os mesmos Ajustes, as duas interfaces dão a mesma partida', () => {
  const pousada = (i: InterfaceJogo, c: Contexto) =>
    rodar(ESTADO_INICIAL, [enter, enter, ...(i === 'cartas' ? [tick(TEMPOS.aberturaFanMs), tick(TEMPOS.distribuirMs)] : [])], c);

  it('mesmo sorteio, mesmo tempo do card e do feedback; a abertura e a distribuição só somam', () => {
    const base = { tempoCardMs: 20000, tempoFeedbackMs: 5000, sorteio: { quantidade: 2 } };
    const cl = ctx({ ...base, interface: 'classica' });
    const ca = ctx({ ...base, interface: 'cartas' });
    const a = pousada('classica', cl);
    const b = pousada('cartas', ca);
    if (a.tela !== 'card' || b.tela !== 'card') throw new Error();
    expect(b.partida.cards.map((x) => x.id)).toEqual(a.partida.cards.map((x) => x.id));
    expect(a.restanteMs).toBe(20000);
    expect(b.restanteMs).toBe(20000);
    const fa = rodar(a, [escolha('falsa')], cl);
    const fb = rodar(b, [escolha('falsa')], ca);
    if (fa.tela !== 'feedback' || fb.tela !== 'feedback') throw new Error();
    expect([fb.restanteMs, fb.resultadoMs, fb.partida.resultados]).toEqual([fa.restanteMs, fa.resultadoMs, fa.partida.resultados]);
  });
});

describe('AC-18.7: a troca só vale para a próxima partida', () => {
  it('mudar a interface no Contexto no meio da partida não muda a distribuição das próximas cartas', () => {
    const cl = ctx({ interface: 'classica' });
    const ca = ctx({ interface: 'cartas' });
    // Começou Clássica; a interface muda para Cartas no meio: o próximo card continua sem distribuição.
    const fb = rodar(ESTADO_INICIAL, [enter, enter, escolha('falsa')], cl);
    expect(rodar(fb, [tick(FIM_FEEDBACK)], ca)).toMatchObject({ tela: 'card', indice: 1, distribuindoMs: 0 });
    // Começou Cartas; muda para Clássica: o próximo card continua distribuído.
    const fb2 = rodar(ESTADO_INICIAL, [enter, enter, tick(TEMPOS.aberturaFanMs), tick(TEMPOS.distribuirMs), escolha('falsa')], ca);
    expect(rodar(fb2, [tick(FIM_FEEDBACK)], cl)).toMatchObject({ tela: 'card', indice: 1, distribuindoMs: TEMPOS.distribuirMs });
    // E a abertura já começada termina como Cartas.
    const ab = rodar(ESTADO_INICIAL, [enter, enter], ca);
    expect(rodar(ab, [tick(TEMPOS.aberturaFanMs)], cl)).toMatchObject({ tela: 'card', distribuindoMs: TEMPOS.distribuirMs });
  });

  it('a partida guarda a interface com que começou', () => {
    const s = rodar(ESTADO_INICIAL, [enter, enter], ctx({ interface: 'cartas' }));
    expect(s).toMatchObject({ partida: { interface: 'cartas' } });
    expect(rodar(ESTADO_INICIAL, [enter, enter], ctx())).toMatchObject({ partida: { interface: 'classica' } });
  });
});

describe('interfaceDoEstado (AC-18.4, AC-18.7): qual tela de card a partida usa', () => {
  it('na partida, a gravada nela; fora dela (espera, calibração), a dos Ajustes', () => {
    const cartas = rodar(ESTADO_INICIAL, [enter, enter], ctx({ interface: 'cartas' }));
    expect(interfaceDoEstado(cartas, 'classica')).toBe('cartas');
    const classica = rodar(ESTADO_INICIAL, [enter, enter], ctx({ interface: 'classica' }));
    expect(interfaceDoEstado(classica, 'cartas')).toBe('classica');
    expect(interfaceDoEstado(ESTADO_INICIAL, 'cartas')).toBe('cartas');
    expect(interfaceDoEstado({ tela: 'calibracao', centradoMs: 0, ausenteMs: 0 }, 'classica')).toBe('classica');
  });
});
