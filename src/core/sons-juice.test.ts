import { describe, expect, it } from 'vitest';
import { INTENSIDADES, type Intensidade } from './juice';
import { ESTADO_INICIAL, INTERFACES_JOGO, TEMPOS, distribuindo, reduzir, type Contexto, type Estado, type Evento } from './partida';
import { toquesATocar, type Toque } from './sons';
import type { PerfilTutorial } from './tutorial';
import type { Noticia, Veredito } from './types';

// v13.4.0 (AC-19.2, AC-19.5, FR-11): baque na carimbada e acerto que sobe um semitom por nível da sequência.
const n = (id: string, veredito: Veredito): Noticia => ({
  id, veredito, tecnica: 'fonte', titulo: id, descricao: '', saibaMais: '', tema: 'ciencia', explicacao: '', fonteUrl: '',
});
const noticias = [1, 2, 3, 4].flatMap((i) => [n(`v${i}`, 'verdadeira'), n(`f${i}`, 'falsa')]);
const tick = (dtMs: number): Evento => ({ tipo: 'tick', dtMs, presenca: null });
const FIM = TEMPOS.saidaMs + TEMPOS.carimboMs + TEMPOS.feedbackMs;

describe.each(INTERFACES_JOGO)('toquesATocar (%s)', (iface) => {
  const c: Contexto = { noticias, rng: () => 0.5, cameraAtiva: false, interface: iface };

  /** Joga a partida ('a' acerta, 'e' erra, 't' tempo esgotado) e junta os toques de cada transição. */
  function toques(jogadas: string, intensidade: Intensidade = 'media', somLigado = true, cc: Contexto = c): Toque[] {
    const out: Toque[] = [];
    let s: Estado = ESTADO_INICIAL;
    const passo = (e: Evento) => {
      const novo = reduzir(s, e, cc);
      out.push(...toquesATocar(s, novo, { somLigado, intensidade }));
      s = novo;
    };
    const pousar = () => {
      if (s.tela === 'abertura') passo(tick(TEMPOS.aberturaFanMs));
      if (distribuindo(s)) passo(tick(TEMPOS.distribuirMs));
    };
    passo({ tipo: 'enter' });
    pousar();
    for (const j of jogadas) {
      if (s.tela !== 'card') throw new Error(`sem carta: ${s.tela}`);
      const v = s.partida.cards[s.indice]!.veredito;
      if (j === 't') passo(tick(TEMPOS.cardMs));
      else {
        passo({ tipo: 'escolha', resposta: j === 'a' ? v : v === 'verdadeira' ? 'falsa' : 'verdadeira' });
        passo(tick(TEMPOS.saidaMs));
      }
      passo(tick(FIM));
      pousar();
    }
    return out.filter((t) => t.som !== 'carta' && !t.som.startsWith('fim'));
  }
  const t = (som: Toque['som'], semitons = 0): Toque => ({ som, semitons });

  it('AC-19.2: o baque soa junto com o resultado, quando a carimbada começa (acerto, erro e tempo esgotado)', () => {
    expect(toques('a')).toEqual([t('deslizar'), t('carimbo'), t('acerto')]);
    expect(toques('e')).toEqual([t('deslizar'), t('carimbo'), t('erro')]);
    expect(toques('t')).toEqual([t('carimbo'), t('erro')]);
  });

  it('AC-19.5: o acerto sobe um semitom por acerto seguido, até o teto (N = 5); erro e tempo voltam ao tom base', () => {
    const acertos = (ts: Toque[]) => ts.filter((x) => x.som === 'acerto').map((x) => x.semitons);
    expect(acertos(toques('aaaaaaa'))).toEqual([0, 1, 2, 3, 4, 4, 4]);
    expect(acertos(toques('aaeaata'))).toEqual([0, 1, 0, 1, 0]);
    expect(toques('aae').filter((x) => x.som === 'erro')).toEqual([t('erro')]);
  });

  it('com qualquer intensidade acima de Desligada, o mesmo (Baixa também tem baque e tom)', () => {
    for (const i of ['baixa', 'alta'] as const) expect(toques('aa', i)).toEqual(toques('aa', 'media'));
  });

  it('AC-19.8: Desligada = os sons da v13.3.0, sem baque e sem mudar o tom', () => {
    expect(toques('aae', 'desligada')).toEqual([t('deslizar'), t('acerto'), t('deslizar'), t('acerto'), t('deslizar'), t('erro')]);
  });

  it('FR-9: som desligado, nada toca, em qualquer intensidade', () => {
    for (const i of INTENSIDADES) expect(toques('aat', i, false)).toEqual([]);
  });

  it('o treino do tutorial continua sem som de resultado e sem baque', () => {
    const treino: PerfilTutorial[] = [{ id: 't1', nome: 't1', frase: '', veredito: 'falsa', explicacao: '', tecnica: 'imagem', tema: 'curiosidades' }];
    const ct: Contexto = { ...c, tutorial: treino };
    const out: Toque[] = [];
    let s: Estado = ESTADO_INICIAL;
    for (const e of [{ tipo: 'enter' } as Evento, tick(TEMPOS.aberturaFanMs), tick(TEMPOS.distribuirMs), { tipo: 'escolha', resposta: 'falsa' } as Evento, tick(TEMPOS.saidaMs), tick(1000)]) {
      const novo = reduzir(s, e, ct);
      out.push(...toquesATocar(s, novo, { somLigado: true, intensidade: 'alta' }));
      s = novo;
    }
    expect(out.filter((x) => x.som !== 'carta')).toEqual([]);
  });
});
