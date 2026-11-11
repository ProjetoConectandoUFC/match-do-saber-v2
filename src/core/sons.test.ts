import { describe, expect, it } from 'vitest';
import { ESTADO_INICIAL, TEMPOS, reduzir, type Contexto, type Estado, type Evento } from './partida';
import { sonsDaTransicao, type Som } from './sons';
import type { Noticia } from './types';

const noticia: Noticia = {
  id: 'v1', veredito: 'verdadeira', tecnica: 'fonte', titulo: '', descricao: '', saibaMais: '', imagem: '', tema: 'ciencia', explicacao: '', fonteUrl: '',
};
const ctx: Contexto = { noticias: [noticia], rng: () => 0.5, cameraAtiva: false, tempoCardMs: TEMPOS.cardMs };
const tick = (dtMs: number): Evento => ({ tipo: 'tick', dtMs, presenca: null });

/** Aplica os eventos um a um e junta os sons de cada transição. */
function sons(eventos: Evento[], inicio: Estado = reduzir(ESTADO_INICIAL, { tipo: 'enter' }, ctx), c: Contexto = ctx): Som[] {
  let s = inicio;
  const out: Som[] = [];
  for (const e of eventos) {
    const n = reduzir(s, e, c);
    out.push(...sonsDaTransicao(s, n));
    s = n;
  }
  return out;
}

describe('sonsDaTransicao', () => {
  it('AC-11.1/AC-11.2: escolha certa = deslizar e, depois da saída do card, acerto', () => {
    expect(sons([{ tipo: 'escolha', resposta: 'verdadeira' }])).toEqual(['deslizar']);
    expect(sons([{ tipo: 'escolha', resposta: 'verdadeira' }, tick(100), tick(100)])).toEqual(['deslizar']);
    expect(sons([{ tipo: 'escolha', resposta: 'verdadeira' }, tick(100), tick(100), tick(100)])).toEqual(['deslizar', 'acerto']);
  });
  it('AC-11.2 com 8 s entre cards (v12.0.0): o acerto toca logo depois da saída do card, não quando faltam 3 s', () => {
    const c8: Contexto = { ...ctx, tempoFeedbackMs: 8000 };
    const inicio = reduzir(ESTADO_INICIAL, { tipo: 'enter' }, c8);
    expect(sons([{ tipo: 'escolha', resposta: 'verdadeira' }, tick(TEMPOS.saidaMs)], inicio, c8)).toEqual(['deslizar', 'acerto']);
    expect(sons([{ tipo: 'escolha', resposta: 'verdadeira' }, tick(TEMPOS.saidaMs), tick(5000)], inicio, c8)).toEqual(['deslizar', 'acerto']);
  });
  it('AC-11.3: escolha errada = deslizar e erro', () => {
    expect(sons([{ tipo: 'escolha', resposta: 'falsa' }, tick(TEMPOS.saidaMs)])).toEqual(['deslizar', 'erro']);
  });
  it('AC-11.3: tempo esgotado = erro, sem deslizar', () => {
    expect(sons([tick(10000), tick(5000)])).toEqual(['erro']);
  });
  it('nada toca no resto do feedback nem fora dele', () => {
    expect(sons([{ tipo: 'escolha', resposta: 'verdadeira' }, tick(TEMPOS.saidaMs), tick(1000), tick(1000)])).toEqual(['deslizar', 'acerto']);
    expect(sons([tick(1000), { tipo: 'saibaMais' }, tick(1000)])).toEqual([]);
    const s = reduzir(ESTADO_INICIAL, { tipo: 'enter' }, ctx);
    expect(sonsDaTransicao(s, s)).toEqual([]);
  });

  // Partida de 1 card (ctx tem uma notícia): o feedback termina e vai ao resumo.
  const ateResumo = (resposta: 'verdadeira' | 'falsa'): Evento[] =>
    [{ tipo: 'escolha', resposta }, tick(TEMPOS.saidaMs), tick(TEMPOS.feedbackMs)];

  it('AC-11.6 (v11.0.0): ao chegar ao resumo toca uma vez a vinheta da faixa (1 de 1 = faixa 4; 0 de 1 = faixa 1)', () => {
    expect(sons(ateResumo('verdadeira'))).toEqual(['deslizar', 'acerto', 'fim4']);
    expect(sons(ateResumo('falsa'))).toEqual(['deslizar', 'erro', 'fim1']);
    expect(sons([...ateResumo('verdadeira'), tick(1000), tick(60000)])).toEqual(['deslizar', 'acerto', 'fim4']);
  });

  it('AC-11.6: sair da partida não toca a vinheta', () => {
    expect(sons([{ tipo: 'escolha', resposta: 'verdadeira' }, tick(TEMPOS.saidaMs), { tipo: 'sair' }])).toEqual(['deslizar', 'acerto']);
  });
});
