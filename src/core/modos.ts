import { DIFICULDADES, DIFICULDADE_ROTULO, type Dificuldade } from './types';
export type ModoJogo = 'corpo' | 'mao' | 'cabeca';

export const MODOS: readonly ModoJogo[] = ['corpo', 'mao', 'cabeca'];
export const MODO_PADRAO: ModoJogo = 'corpo';

export const MODO_ROTULO: Record<ModoJogo, string> = { corpo: 'Corpo', mao: 'Mão', cabeca: 'Cabeça' };

export const DICA_GESTOS: Record<ModoJogo, string> = {
  corpo: 'Corpo para a direita: é verdade · Para a esquerda: é mentira · Duas mãos para cima: saiba mais',
  mao: 'Arraste a mão para a direita: é verdade · Para a esquerda: é mentira · Duas mãos para cima: saiba mais',
  cabeca: 'Cabeça para a direita: é verdade · Cabeça para a esquerda: é mentira · Queixo para cima: saiba mais',
};

export const DICA_SAIBA_MAIS: Record<ModoJogo, string> = {
  corpo: 'Saiba mais: levante as duas mãos (ou ↑)',
  mao: 'Saiba mais: levante as duas mãos (ou ↑)',
  cabeca: 'Saiba mais: levante o queixo (ou ↑)',
};

export const TEMPOS_CARD_S: readonly number[] = [10, 15, 20, 25, 30];
/** v12.0.0 (AC-9.23): duração do feedback, cards por partida, nível com prioridade no sorteio e tempo de ausência. */
export const TEMPOS_FEEDBACK_S: readonly number[] = [3, 5, 8, 10];
export const CARDS_PARTIDA: readonly number[] = [5, 8, 10];
export type Nivel = 'todos' | Dificuldade;
export const NIVEIS: readonly Nivel[] = ['todos', ...DIFICULDADES];
export const TEMPOS_AUSENCIA_S: readonly number[] = [5, 10, 20];

/** `tutorial` (v10.2.0, FR-16): treino antes da partida; desligado por padrão. Os padrões da v12.0.0 repetem os valores que eram fixos. */
export interface Configuracoes {
  modo: ModoJogo;
  tempoCardS: number;
  tempoFeedbackS: number;
  cardsPartida: number;
  nivel: Nivel;
  tempoAusenciaS: number;
  som: boolean;
  foto: boolean;
  tutorial: boolean;
}
export const CONFIG_PADRAO: Configuracoes = {
  modo: MODO_PADRAO, tempoCardS: 15, tempoFeedbackS: 3, cardsPartida: 10, nivel: 'todos', tempoAusenciaS: 10, som: true, foto: true, tutorial: false,
};

export type ItemConfig = keyof Configuracoes;
export const ITENS_CONFIG: readonly ItemConfig[] = ['modo', 'tempoCardS', 'tempoFeedbackS', 'cardsPartida', 'nivel', 'tempoAusenciaS', 'som', 'foto', 'tutorial'];
export const ROTULO_ITEM: Record<ItemConfig, string> = {
  modo: 'Modo de jogo',
  tempoCardS: 'Tempo por card',
  tempoFeedbackS: 'Tempo entre cards',
  cardsPartida: 'Cards por partida',
  nivel: 'Nível',
  tempoAusenciaS: 'Tempo de ausência',
  som: 'Som',
  foto: 'Foto no resumo',
  tutorial: 'Tutorial',
};
export const NIVEL_ROTULO: Record<Nivel, string> = { todos: 'Todos', ...DIFICULDADE_ROTULO };
export const OPCOES: { [K in ItemConfig]: readonly Configuracoes[K][] } = {
  modo: MODOS,
  tempoCardS: TEMPOS_CARD_S,
  tempoFeedbackS: TEMPOS_FEEDBACK_S,
  cardsPartida: CARDS_PARTIDA,
  nivel: NIVEIS,
  tempoAusenciaS: TEMPOS_AUSENCIA_S,
  som: [true, false],
  foto: [true, false],
  tutorial: [true, false],
};

export interface Armazenamento {
  getItem(chave: string): string | null;
  setItem(chave: string, valor: string): void;
}

const CHAVES: Record<ItemConfig, string> = {
  modo: 'match-do-saber:modo',
  tempoCardS: 'match-do-saber:tempoCard',
  tempoFeedbackS: 'match-do-saber:tempoFeedback',
  cardsPartida: 'match-do-saber:cardsPartida',
  nivel: 'match-do-saber:nivel',
  tempoAusenciaS: 'match-do-saber:tempoAusencia',
  som: 'match-do-saber:som',
  foto: 'match-do-saber:foto',
  tutorial: 'match-do-saber:tutorial',
};

function ler(a: Armazenamento | null, chave: string): string | null {
  try {
    return a?.getItem(chave) ?? null;
  } catch {
    return null;
  }
}

export function lerConfiguracoes(a: Armazenamento | null): Configuracoes {
  const modo = ler(a, CHAVES.modo);
  const tempo = Number(ler(a, CHAVES.tempoCardS));
  const numero = (item: 'tempoFeedbackS' | 'cardsPartida' | 'tempoAusenciaS'): number => {
    const v = Number(ler(a, CHAVES[item]));
    return OPCOES[item].includes(v) ? v : CONFIG_PADRAO[item];
  };
  const nivel = ler(a, CHAVES.nivel);
  const som = ler(a, CHAVES.som);
  const foto = ler(a, CHAVES.foto);
  const tutorial = ler(a, CHAVES.tutorial);
  return {
    modo: MODOS.includes(modo as ModoJogo) ? (modo as ModoJogo) : CONFIG_PADRAO.modo,
    tempoCardS: TEMPOS_CARD_S.includes(tempo) ? tempo : CONFIG_PADRAO.tempoCardS,
    tempoFeedbackS: numero('tempoFeedbackS'),
    cardsPartida: numero('cardsPartida'),
    nivel: NIVEIS.includes(nivel as Nivel) ? (nivel as Nivel) : CONFIG_PADRAO.nivel,
    tempoAusenciaS: numero('tempoAusenciaS'),
    som: som === 'ligado' ? true : som === 'desligado' ? false : CONFIG_PADRAO.som,
    foto: foto === 'ligada' ? true : foto === 'desligada' ? false : CONFIG_PADRAO.foto,
    tutorial: tutorial === 'ligado' ? true : tutorial === 'desligado' ? false : CONFIG_PADRAO.tutorial,
  };
}

export function salvarConfiguracoes(a: Armazenamento | null, c: Configuracoes): void {
  try {
    a?.setItem(CHAVES.modo, c.modo);
    a?.setItem(CHAVES.tempoCardS, String(c.tempoCardS));
    a?.setItem(CHAVES.tempoFeedbackS, String(c.tempoFeedbackS));
    a?.setItem(CHAVES.cardsPartida, String(c.cardsPartida));
    a?.setItem(CHAVES.nivel, c.nivel);
    a?.setItem(CHAVES.tempoAusenciaS, String(c.tempoAusenciaS));
    a?.setItem(CHAVES.som, c.som ? 'ligado' : 'desligado');
    a?.setItem(CHAVES.foto, c.foto ? 'ligada' : 'desligada');
    a?.setItem(CHAVES.tutorial, c.tutorial ? 'ligado' : 'desligado');
  } catch {
    // Armazenamento bloqueado: as escolhas valem até o jogo ser fechado.
  }
}

export function mudarValor(c: Configuracoes, item: ItemConfig, passo: -1 | 1): Configuracoes {
  const lista = OPCOES[item] as readonly unknown[];
  const i = lista.indexOf(c[item]);
  const j = Math.max(0, Math.min(lista.length - 1, i + passo));
  return { ...c, [item]: lista[j] } as Configuracoes;
}

export function rotuloValor(item: ItemConfig, valor: Configuracoes[ItemConfig]): string {
  if (item === 'modo') return MODO_ROTULO[valor as ModoJogo];
  if (item === 'tempoCardS' || item === 'tempoFeedbackS' || item === 'tempoAusenciaS') return `${valor} s`;
  if (item === 'cardsPartida') return String(valor);
  if (item === 'nivel') return NIVEL_ROTULO[valor as Nivel];
  if (item === 'foto') return valor ? 'Ligada' : 'Desligada';
  return valor ? 'Ligado' : 'Desligado';
}

export function resumoConfiguracoes(c: Configuracoes): string {
  return `Modo: ${MODO_ROTULO[c.modo]} · Card: ${c.tempoCardS} s · Entre cards: ${c.tempoFeedbackS} s · Cards: ${c.cardsPartida} · Nível: ${NIVEL_ROTULO[c.nivel]} · Ausência: ${c.tempoAusenciaS} s · Som: ${c.som ? 'ligado' : 'desligado'} · Foto: ${c.foto ? 'ligada' : 'desligada'} · Tutorial: ${c.tutorial ? 'ligado' : 'desligado'}`;
}
