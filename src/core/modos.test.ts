import { describe, expect, it } from 'vitest';
import {
  CARDS_PARTIDA, CONFIG_PADRAO, DICA_GESTOS, DICA_SAIBA_MAIS, ITENS_CONFIG, MODOS, NIVEIS, ROTULO_ITEM, TEMPOS_AUSENCIA_S, TEMPOS_CARD_S, TEMPOS_FEEDBACK_S,
  lerConfiguracoes, mudarValor, resumoConfiguracoes, rotuloValor, salvarConfiguracoes, type Armazenamento,
} from './modos';

function memoria(inicial: Record<string, string> = {}): Armazenamento & { dados: Record<string, string> } {
  const dados = { ...inicial };
  return { dados, getItem: (k) => dados[k] ?? null, setItem: (k, v) => { dados[k] = v; } };
}
const quebrado: Armazenamento = {
  getItem: () => { throw new Error('bloqueado'); },
  setItem: () => { throw new Error('bloqueado'); },
};

describe('configurações do estande', () => {
  it('itens e opções', () => {
    expect(MODOS).toEqual(['corpo', 'mao', 'cabeca']);
    expect(TEMPOS_CARD_S).toEqual([10, 15, 20, 25, 30]);
    expect(ITENS_CONFIG).toEqual(['modo', 'tempoCardS', 'tempoFeedbackS', 'cardsPartida', 'nivel', 'tempoAusenciaS', 'som', 'foto', 'tutorial']); // AC-9.1 (v12.0.0)
    expect(TEMPOS_FEEDBACK_S).toEqual([3, 5, 8, 10]);
    expect(CARDS_PARTIDA).toEqual([5, 8, 10]);
    expect(NIVEIS).toEqual(['todos', 'facil', 'medio', 'dificil']);
    expect(TEMPOS_AUSENCIA_S).toEqual([5, 10, 20]);
  });
  it('AC-9.4 (v12.0.0): sem nada guardado, usa Corpo, 15 s, 3 s entre cards, 10 cards, nível Todos, 10 s de ausência, som e foto ligados e tutorial desligado', () => {
    expect(CONFIG_PADRAO).toEqual({
      modo: 'corpo', tempoCardS: 15, tempoFeedbackS: 3, cardsPartida: 10, nivel: 'todos', tempoAusenciaS: 10, som: true, foto: true, tutorial: false,
    });
    expect(lerConfiguracoes(memoria())).toEqual(CONFIG_PADRAO);
    expect(lerConfiguracoes(null)).toEqual(CONFIG_PADRAO);
  });
  it('AC-9.5: guarda e lê as nove configurações', () => {
    const a = memoria();
    const c = { modo: 'cabeca', tempoCardS: 25, tempoFeedbackS: 8, cardsPartida: 5, nivel: 'dificil', tempoAusenciaS: 20, som: false, foto: false, tutorial: true } as const;
    salvarConfiguracoes(a, c);
    expect(lerConfiguracoes(a)).toEqual(c);
  });
  it('mantém o modo guardado pela v1.1.0 (mesma chave)', () => {
    expect(lerConfiguracoes(memoria({ 'match-do-saber:modo': 'mao' }))).toEqual({ ...CONFIG_PADRAO, modo: 'mao' });
  });
  it('valor inválido vale o padrão só daquele item; armazenamento bloqueado não quebra', () => {
    const a = memoria({ 'match-do-saber:modo': 'pe', 'match-do-saber:tempoCard': '12', 'match-do-saber:som': 'desligado', 'match-do-saber:foto': 'talvez' });
    expect(lerConfiguracoes(a)).toEqual({ ...CONFIG_PADRAO, som: false });
    expect(lerConfiguracoes(memoria({ 'match-do-saber:tutorial': 'ligado' })).tutorial).toBe(true);
    expect(lerConfiguracoes(memoria({ 'match-do-saber:tutorial': 'sim' })).tutorial).toBe(false);
    expect(lerConfiguracoes(memoria({ 'match-do-saber:foto': 'desligada' })).foto).toBe(false);
    expect(lerConfiguracoes(memoria({ 'match-do-saber:foto': 'ligada' })).foto).toBe(true);
    expect(lerConfiguracoes(memoria({ 'match-do-saber:tempoFeedback': '4', 'match-do-saber:cardsPartida': '12', 'match-do-saber:nivel': 'extremo', 'match-do-saber:tempoAusencia': '0' }))).toEqual(CONFIG_PADRAO);
    expect(lerConfiguracoes(quebrado)).toEqual(CONFIG_PADRAO);
    expect(() => salvarConfiguracoes(quebrado, CONFIG_PADRAO)).not.toThrow();
  });
  it('FR-9: guarda só as nove chaves', () => {
    const a = memoria();
    salvarConfiguracoes(a, { ...CONFIG_PADRAO, modo: 'mao', tempoCardS: 20, foto: false, nivel: 'medio' });
    expect(a.dados).toEqual({
      'match-do-saber:modo': 'mao', 'match-do-saber:tempoCard': '20', 'match-do-saber:tempoFeedback': '3', 'match-do-saber:cardsPartida': '10',
      'match-do-saber:nivel': 'medio', 'match-do-saber:tempoAusencia': '10', 'match-do-saber:som': 'ligado', 'match-do-saber:foto': 'desligada', 'match-do-saber:tutorial': 'desligado',
    });
    salvarConfiguracoes(a, CONFIG_PADRAO);
    expect(a.dados['match-do-saber:foto']).toBe('ligada');
  });
  it('AC-9.17: ←/→ mudam o valor sem passar dos limites', () => {
    const c = { ...CONFIG_PADRAO, tempoCardS: 10 };
    expect(mudarValor(c, 'tempoCardS', -1).tempoCardS).toBe(10);
    expect(mudarValor(c, 'tempoCardS', 1).tempoCardS).toBe(15);
    expect(mudarValor({ ...c, tempoCardS: 30 }, 'tempoCardS', 1).tempoCardS).toBe(30);
    expect(mudarValor(CONFIG_PADRAO, 'modo', 1).modo).toBe('mao');
    expect(mudarValor(CONFIG_PADRAO, 'modo', -1).modo).toBe('corpo');
    expect(mudarValor(CONFIG_PADRAO, 'som', 1).som).toBe(false);
    expect(mudarValor(CONFIG_PADRAO, 'foto', 1).foto).toBe(false);
    expect(mudarValor(CONFIG_PADRAO, 'tutorial', -1).tutorial).toBe(true);
    expect(mudarValor(CONFIG_PADRAO, 'tutorial', 1).tutorial).toBe(false);
  });
  it('AC-9.23: os itens novos mudam sem passar dos limites', () => {
    expect(mudarValor(CONFIG_PADRAO, 'tempoFeedbackS', -1).tempoFeedbackS).toBe(3);
    expect(mudarValor(CONFIG_PADRAO, 'tempoFeedbackS', 1).tempoFeedbackS).toBe(5);
    expect(mudarValor(CONFIG_PADRAO, 'cardsPartida', 1).cardsPartida).toBe(10);
    expect(mudarValor(CONFIG_PADRAO, 'cardsPartida', -1).cardsPartida).toBe(8);
    expect(mudarValor(CONFIG_PADRAO, 'nivel', 1).nivel).toBe('facil');
    expect(mudarValor(CONFIG_PADRAO, 'nivel', -1).nivel).toBe('todos');
    expect(mudarValor(CONFIG_PADRAO, 'tempoAusenciaS', 1).tempoAusenciaS).toBe(20);
    expect(mudarValor(CONFIG_PADRAO, 'tempoAusenciaS', -1).tempoAusenciaS).toBe(5);
  });
  it('AC-9.2: rótulos e resumo', () => {
    expect(rotuloValor('tempoCardS', 20)).toBe('20 s');
    expect(rotuloValor('som', true)).toBe('Ligado');
    expect(rotuloValor('modo', 'cabeca')).toBe('Cabeça');
    expect(rotuloValor('foto', true)).toBe('Ligada');
    expect(rotuloValor('foto', false)).toBe('Desligada');
    expect(rotuloValor('tutorial', true)).toBe('Ligado');
    expect(rotuloValor('tempoFeedbackS', 8)).toBe('8 s');
    expect(rotuloValor('cardsPartida', 5)).toBe('5');
    expect(rotuloValor('nivel', 'medio')).toBe('Médio');
    expect(rotuloValor('nivel', 'todos')).toBe('Todos');
    expect(rotuloValor('tempoAusenciaS', 20)).toBe('20 s');
    expect(ROTULO_ITEM.tempoFeedbackS).toBe('Tempo entre cards');
    expect(ROTULO_ITEM.cardsPartida).toBe('Cards por partida');
    expect(ROTULO_ITEM.nivel).toBe('Nível');
    expect(ROTULO_ITEM.tempoAusenciaS).toBe('Tempo de ausência');
    expect(resumoConfiguracoes({ modo: 'mao', tempoCardS: 20, tempoFeedbackS: 5, cardsPartida: 8, nivel: 'facil', tempoAusenciaS: 5, som: false, foto: false, tutorial: true }))
      .toBe('Modo: Mão · Card: 20 s · Entre cards: 5 s · Cards: 8 · Nível: Fácil · Ausência: 5 s · Som: desligado · Foto: desligada · Tutorial: ligado');
  });
  it('AC-9.14 (v10.0.0): dicas de cada modo dizem "mentira" no lugar de "falsa"', () => {
    expect(DICA_GESTOS.mao).toBe('Arraste a mão para a direita: é verdade · Para a esquerda: é mentira · Duas mãos para cima: saiba mais');
    expect(DICA_GESTOS.cabeca).toBe('Cabeça para a direita: é verdade · Cabeça para a esquerda: é mentira · Queixo para cima: saiba mais');
  });
  it('FR-15 (v10.0.0): dica do saiba mais sem emoji', () => {
    expect(DICA_SAIBA_MAIS).toEqual({
      corpo: 'Saiba mais: levante as duas mãos (ou ↑)',
      mao: 'Saiba mais: levante as duas mãos (ou ↑)',
      cabeca: 'Saiba mais: levante o queixo (ou ↑)',
    });
  });
  it('AC-2.9 (v10.3.0): dica do modo Corpo cita só o corpo', () => {
    expect(DICA_GESTOS.corpo).toBe('Corpo para a direita: é verdade · Para a esquerda: é mentira · Duas mãos para cima: saiba mais');
  });
});
