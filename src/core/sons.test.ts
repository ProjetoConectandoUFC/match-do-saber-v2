import { describe, expect, it } from 'vitest';
import { ESTADO_INICIAL, TEMPOS, reduzir, type Contexto, type Estado, type Evento } from './partida';
import { sonsATocar, sonsDaTransicao, type Som } from './sons';
import type { PerfilTutorial } from './tutorial';
import type { Noticia } from './types';

const noticia: Noticia = {
  id: 'v1', veredito: 'verdadeira', tecnica: 'fonte', titulo: '', descricao: '', saibaMais: '', imagem: '', tema: 'ciencia', explicacao: '', fonteUrl: '',
};
const ctx: Contexto = { noticias: [noticia], rng: () => 0.5, cameraAtiva: false, tempoCardMs: TEMPOS.cardMs };
const tick = (dtMs: number): Evento => ({ tipo: 'tick', dtMs, presenca: null });

/** v13.0.0: Enter, abertura do fan (AC-17.5) e distribuição (AC-17.6); a carta pousada é o início dos testes antigos. */
const pousada = (c: Contexto = ctx) =>
  [{ tipo: 'enter' } as Evento, tick(TEMPOS.aberturaFanMs), tick(TEMPOS.distribuirMs)].reduce((s, e) => reduzir(s, e, c), ESTADO_INICIAL);

/** Aplica os eventos um a um e junta os sons de cada transição. */
function sons(eventos: Evento[], inicio: Estado = pousada(), c: Contexto = ctx): Som[] {
  let s = inicio;
  const out: Som[] = [];
  for (const e of eventos) {
    const n = reduzir(s, e, c);
    out.push(...sonsDaTransicao(s, n));
    s = n;
  }
  return out;
}

describe('AC-17.8 (v13.0.0): som de carta quando uma carta começa a sair do fan', () => {
  const dois: Contexto = { ...ctx, noticias: [noticia, { ...noticia, id: 'f1', veredito: 'falsa' }] };
  const treino: PerfilTutorial[] = [{ id: 't1', nome: 't1', frase: '', veredito: 'falsa', explicacao: '', tecnica: 'imagem', tema: 'curiosidades' }];
  const fimFeedback = tick(TEMPOS.carimboMs + TEMPOS.feedbackMs);

  it('não toca na abertura; toca uma vez quando a 1ª carta sai do fan, e não de novo ao pousar', () => {
    expect(sons([{ tipo: 'enter' }], ESTADO_INICIAL)).toEqual([]);
    expect(sons([{ tipo: 'enter' }, tick(TEMPOS.aberturaFanMs - 1)], ESTADO_INICIAL)).toEqual([]);
    expect(sons([{ tipo: 'enter' }, tick(TEMPOS.aberturaFanMs)], ESTADO_INICIAL)).toEqual(['carta']);
    expect(sons([{ tipo: 'enter' }, tick(TEMPOS.aberturaFanMs), tick(300), tick(300), tick(300), tick(1000)], ESTADO_INICIAL)).toEqual(['carta']);
  });

  it('toca de novo a cada carta seguinte, depois do feedback', () => {
    expect(sons([{ tipo: 'escolha', resposta: 'verdadeira' }, tick(TEMPOS.saidaMs), fimFeedback], pousada(dois), dois)).toEqual(['deslizar', 'acerto', 'carta']);
  });

  it('as cartas de treino também saem do fan, e o 1º card depois do treino (ou do Enter que o pula) também', () => {
    const c: Contexto = { ...dois, tutorial: treino };
    const inicio = sons([{ tipo: 'enter' }, tick(TEMPOS.aberturaFanMs)], ESTADO_INICIAL, c);
    expect(inicio).toEqual(['carta']);
    expect(sons([{ tipo: 'enter' }, tick(TEMPOS.aberturaFanMs), tick(TEMPOS.distribuirMs), { tipo: 'escolha', resposta: 'falsa' }, tick(TEMPOS.saidaMs), fimFeedback], ESTADO_INICIAL, c))
      .toEqual(['carta', 'carta']);
    expect(sons([{ tipo: 'enter' }, tick(TEMPOS.aberturaFanMs), { tipo: 'enter' }], ESTADO_INICIAL, c)).toEqual(['carta', 'carta']);
  });

  it('Sair durante a distribuição não toca nada', () => {
    expect(sons([{ tipo: 'enter' }, tick(TEMPOS.aberturaFanMs), tick(100), { tipo: 'sair' }], ESTADO_INICIAL)).toEqual(['carta']);
  });

  it('com o som desligado (FR-9), nada toca', () => {
    const antes = reduzir(ESTADO_INICIAL, { tipo: 'enter' }, ctx);
    const depois = reduzir(antes, tick(TEMPOS.aberturaFanMs), ctx);
    expect(sonsATocar(antes, depois, true)).toEqual(['carta']);
    expect(sonsATocar(antes, depois, false)).toEqual([]);
  });
});

describe('sonsDaTransicao', () => {
  it('AC-11.1/AC-11.2: escolha certa = deslizar e, depois da saída do card, acerto', () => {
    expect(sons([{ tipo: 'escolha', resposta: 'verdadeira' }])).toEqual(['deslizar']);
    expect(sons([{ tipo: 'escolha', resposta: 'verdadeira' }, tick(100), tick(100)])).toEqual(['deslizar']);
    expect(sons([{ tipo: 'escolha', resposta: 'verdadeira' }, tick(100), tick(100), tick(100)])).toEqual(['deslizar', 'acerto']);
  });
  it('AC-4.9 (v12.0.0): o resultado soa quando a carimbada começa, logo depois da saída do card', () => {
    expect(sons([{ tipo: 'escolha', resposta: 'verdadeira' }, tick(TEMPOS.saidaMs - 1)])).toEqual(['deslizar']);
    expect(sons([{ tipo: 'escolha', resposta: 'verdadeira' }, tick(TEMPOS.saidaMs - 1), tick(1), tick(TEMPOS.carimboMs)])).toEqual(['deslizar', 'acerto']);
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
    const s = pousada();
    expect(sonsDaTransicao(s, s)).toEqual([]);
  });

  // Partida de 1 card (ctx tem uma notícia): o feedback termina e vai ao resumo.
  const ateResumo = (resposta: 'verdadeira' | 'falsa'): Evento[] =>
    [{ tipo: 'escolha', resposta }, tick(TEMPOS.saidaMs), tick(TEMPOS.carimboMs + TEMPOS.feedbackMs)];

  it('AC-11.6 (v11.0.0): ao chegar ao resumo toca uma vez a vinheta da faixa (1 de 1 = faixa 4; 0 de 1 = faixa 1)', () => {
    expect(sons(ateResumo('verdadeira'))).toEqual(['deslizar', 'acerto', 'fim4']);
    expect(sons(ateResumo('falsa'))).toEqual(['deslizar', 'erro', 'fim1']);
    expect(sons([...ateResumo('verdadeira'), tick(1000), tick(60000)])).toEqual(['deslizar', 'acerto', 'fim4']);
  });

  it('AC-11.6: sair da partida não toca a vinheta', () => {
    expect(sons([{ tipo: 'escolha', resposta: 'verdadeira' }, tick(TEMPOS.saidaMs), { tipo: 'sair' }])).toEqual(['deslizar', 'acerto']);
  });
});

describe('AC-9.25/AC-11.1: com "Tempo do feedback" em 8 s, o som do resultado toca quando o resultado aparece', () => {
  const ctx8: Contexto = { ...ctx, tempoFeedbackMs: 8000 };
  const sons8 = (eventos: Evento[]) => {
    let s = pousada(ctx8);
    const out: Som[] = [];
    for (const e of eventos) {
      const n = reduzir(s, e, ctx8);
      out.push(...sonsDaTransicao(s, n));
      s = n;
    }
    return out;
  };

  it('na virada da saída do card para o resultado, não 5 s depois', () => {
    expect(sons8([{ tipo: 'escolha', resposta: 'verdadeira' }, tick(TEMPOS.saidaMs - 1)])).toEqual(['deslizar']);
    expect(sons8([{ tipo: 'escolha', resposta: 'verdadeira' }, tick(TEMPOS.saidaMs)])).toEqual(['deslizar', 'acerto']);
    expect(sons8([{ tipo: 'escolha', resposta: 'falsa' }, tick(TEMPOS.saidaMs), tick(5000), tick(2000)])).toEqual(['deslizar', 'erro']);
  });
});
