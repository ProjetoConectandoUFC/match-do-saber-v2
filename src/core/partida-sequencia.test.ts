import { describe, expect, it } from 'vitest';
import {
  ESTADO_INICIAL, INTERFACES_JOGO, TEMPOS, carimbando, distribuindo, maiorSequencia, pontos, reduzir, sequenciaAtual,
  type Contexto, type Estado, type Evento, type Resultado,
} from './partida';
import type { PerfilTutorial } from './tutorial';
import type { Noticia, Veredito } from './types';

// v13.4.0 (AC-19.5, AC-19.6, FR-21): sequência de acertos no reducer, sem mudar a pontuação (FR-5).
const n = (id: string, veredito: Veredito): Noticia => ({
  id, veredito, tecnica: 'fonte', titulo: id, descricao: '', saibaMais: '', tema: 'ciencia', explicacao: '', fonteUrl: '',
});
const p = (id: string, veredito: Veredito): PerfilTutorial => ({
  id, nome: id, frase: '', veredito, explicacao: '', tecnica: 'imagem', tema: 'curiosidades',
});
const noticias = [1, 2, 3, 4].flatMap((i) => [n(`v${i}`, 'verdadeira'), n(`f${i}`, 'falsa')]);
const tick = (dtMs: number): Evento => ({ tipo: 'tick', dtMs, presenca: null });
const rodar = (s: Estado, eventos: Evento[], c: Contexto) => eventos.reduce((e, ev) => reduzir(e, ev, c), s);
const FIM_FEEDBACK = TEMPOS.saidaMs + TEMPOS.carimboMs + TEMPOS.feedbackMs;

describe('AC-19.5/AC-19.6: sequenciaAtual e maiorSequencia (puras)', () => {
  const r = (t: string): Resultado[] => [...t].map((c) => (c === 'a' ? 'acerto' : c === 'e' ? 'erro' : 'tempo'));
  it.each([
    ['', 0, 0], ['a', 1, 1], ['aa', 2, 2], ['aae', 0, 2], ['aaea', 1, 2], ['aaat', 0, 3], ['eaaaaaaa', 7, 7], ['aaeaaata', 1, 3],
  ])('"%s": agora %i, maior %i', (t, agora, maior) => {
    expect(sequenciaAtual(r(t))).toBe(agora);
    expect(maiorSequencia(r(t))).toBe(maior);
  });
});

describe.each(INTERFACES_JOGO)('AC-19.5/AC-19.6: sequência na partida (%s)', (iface) => {
  const c: Contexto = { noticias, rng: () => 0.5, cameraAtiva: false, interface: iface };
  /** Até a carta pousada (Cartas: abertura e distribuição; Clássica: na hora). */
  const pousar = (s: Estado, cc: Contexto = c): Estado => {
    let e = s;
    if (e.tela === 'abertura') e = rodar(e, [tick(TEMPOS.aberturaFanMs)], cc);
    if (distribuindo(e)) e = rodar(e, [tick(TEMPOS.distribuirMs)], cc);
    return e;
  };
  const inicio = (cc: Contexto = c) => pousar(rodar(ESTADO_INICIAL, [{ tipo: 'enter' }], cc), cc);
  const veredito = (s: Estado) => (s.tela === 'card' ? s.partida.cards[s.indice]!.veredito : 'verdadeira');
  const contra = (v: Veredito): Veredito => (v === 'verdadeira' ? 'falsa' : 'verdadeira');
  /** Joga a carta pousada: 'a' acerta, 'e' erra, 't' deixa o tempo esgotar; devolve o feedback. */
  const jogar = (s: Estado, jogada: string): Estado => {
    if (jogada === 't') return rodar(s, [tick(TEMPOS.cardMs)], c);
    const v = veredito(s);
    return rodar(s, [{ tipo: 'escolha', resposta: jogada === 'a' ? v : contra(v) }], c);
  };
  const proxima = (fb: Estado) => pousar(rodar(fb, [tick(FIM_FEEDBACK)], c));
  /** Joga as jogadas em sequência e devolve o feedback de cada uma. */
  function partida(jogadas: string): Estado[] {
    const fbs: Estado[] = [];
    let s = inicio();
    for (const j of jogadas) {
      const fb = jogar(s, j);
      fbs.push(fb);
      s = proxima(fb);
    }
    return fbs;
  }
  const seq = (s: Estado) => (s.tela === 'feedback' ? s.sequencia : NaN);

  it('acerto soma 1; erro e tempo esgotado zeram; depois de zerar, recomeça em 1', () => {
    expect(partida('aaaeaata').map(seq)).toEqual([1, 2, 3, 0, 1, 2, 0, 1]);
  });

  it('a sequência não muda a pontuação: +1 por acerto, mesmo acima do teto (FR-5)', () => {
    const fbs = partida('aaaaaaa');
    expect(fbs.map(seq)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    const ultimo = fbs[6]!;
    if (ultimo.tela !== 'feedback') throw new Error('sem feedback');
    expect(pontos(ultimo.partida)).toBe(7);
  });

  it('AC-19.6: o resumo guarda a maior sequência da partida', () => {
    const fbs = partida('aaeaaata');
    const resumo = rodar(fbs[7]!, [tick(FIM_FEEDBACK)], c);
    expect(resumo).toMatchObject({ tela: 'resumo', maiorSequencia: 3 });
    if (resumo.tela !== 'resumo') throw new Error('sem resumo');
    expect(pontos(resumo.partida)).toBe(6);
  });

  it('AC-19.6: sem nenhum acerto, maior sequência 0', () => {
    const fbs = partida('eeeeeeee');
    expect(rodar(fbs[7]!, [tick(FIM_FEEDBACK)], c)).toMatchObject({ tela: 'resumo', maiorSequencia: 0 });
  });

  it('a carimbada continua somando ao feedback, com qualquer sequência (fronteira)', () => {
    const fb = partida('aaa')[2]!;
    expect(fb).toMatchObject({
      tela: 'feedback', sequencia: 3, restanteMs: FIM_FEEDBACK, resultadoMs: TEMPOS.carimboMs + TEMPOS.feedbackMs,
    });
    expect(rodar(fb, [tick(FIM_FEEDBACK - 1)], c)).toMatchObject({ tela: 'feedback', indice: 2, sequencia: 3 });
    expect(rodar(fb, [tick(FIM_FEEDBACK - 1), tick(1)], c)).toMatchObject({ tela: 'card', indice: 3 });
  });

  it('o treino do tutorial não conta: depois de acertar os treinos, o 1º acerto da partida é 1', () => {
    const ct: Contexto = { ...c, tutorial: [p('t1', 'falsa'), p('t2', 'verdadeira')] };
    let s = inicio(ct);
    expect(s).toMatchObject({ tela: 'tutorial', passo: 0 });
    const fbTreino = rodar(s, [{ tipo: 'escolha', resposta: 'falsa' }], ct);
    expect(fbTreino.tela).toBe('tutorialFeedback');
    expect('sequencia' in fbTreino).toBe(false);
    s = pousar(rodar(fbTreino, [tick(FIM_FEEDBACK)], ct), ct);
    s = pousar(rodar(s, [{ tipo: 'escolha', resposta: 'verdadeira' }, tick(FIM_FEEDBACK)], ct), ct);
    expect(s).toMatchObject({ tela: 'card', indice: 0 });
    expect(rodar(s, [{ tipo: 'escolha', resposta: veredito(s) }], ct)).toMatchObject({ tela: 'feedback', sequencia: 1 });
  });

  it('uma partida nova começa do zero', () => {
    partida('aaa');
    expect(partida('a').map(seq)).toEqual([1]);
  });
});

describe.each(INTERFACES_JOGO)('AC-19.2: carimbando (o momento em que o carimbo bate) (%s)', (iface) => {
  const c: Contexto = { noticias, rng: () => 0.5, cameraAtiva: false, interface: iface };
  const inicio = () => {
    let s = rodar(ESTADO_INICIAL, [{ tipo: 'enter' }], c);
    if (s.tela === 'abertura') s = rodar(s, [tick(TEMPOS.aberturaFanMs)], c);
    return distribuindo(s) ? rodar(s, [tick(TEMPOS.distribuirMs)], c) : s;
  };

  it('depois de uma escolha: não na saída do card; sim nos primeiros carimboMs do resultado; não depois', () => {
    const fb = rodar(inicio(), [{ tipo: 'escolha', resposta: 'verdadeira' }], c);
    expect(carimbando(fb)).toBe(false);
    expect(carimbando(rodar(fb, [tick(TEMPOS.saidaMs - 1)], c))).toBe(false);
    expect(carimbando(rodar(fb, [tick(TEMPOS.saidaMs)], c))).toBe(true);
    expect(carimbando(rodar(fb, [tick(TEMPOS.saidaMs + TEMPOS.carimboMs - 1)], c))).toBe(true);
    expect(carimbando(rodar(fb, [tick(TEMPOS.saidaMs + TEMPOS.carimboMs)], c))).toBe(false);
  });

  it('tempo esgotado: o carimbo bate na hora, sem saída do card', () => {
    const fb = rodar(inicio(), [tick(TEMPOS.cardMs)], c);
    expect(fb).toMatchObject({ tela: 'feedback', resposta: null });
    expect(carimbando(fb)).toBe(true);
    expect(carimbando(rodar(fb, [tick(TEMPOS.carimboMs - 1)], c))).toBe(true);
    expect(carimbando(rodar(fb, [tick(TEMPOS.carimboMs)], c))).toBe(false);
  });

  it('fora do feedback, nunca (o treino tem o próprio feedback, sem sequência)', () => {
    expect(carimbando(ESTADO_INICIAL)).toBe(false);
    expect(carimbando(inicio())).toBe(false);
  });
});
