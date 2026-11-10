export type ModoJogo = 'corpo' | 'mao' | 'cabeca';

export const MODOS: readonly ModoJogo[] = ['corpo', 'mao', 'cabeca'];
export const MODO_PADRAO: ModoJogo = 'corpo';

export const MODO_ROTULO: Record<ModoJogo, string> = { corpo: 'Corpo', mao: 'Mão', cabeca: 'Cabeça' };

export const DICA_GESTOS: Record<ModoJogo, string> = {
  corpo: 'Corpo ou braço para a direita: é verdade · Para a esquerda: é mentira · Duas mãos para cima: saiba mais',
  mao: 'É verdade: mão direita para cima, as duas mãos para a direita ou arraste para a direita · É mentira: o mesmo para a esquerda · Duas mãos para cima: saiba mais',
  cabeca: 'Cabeça para a direita: é verdade · Cabeça para a esquerda: é mentira · Queixo para cima: saiba mais',
};

export const DICA_SAIBA_MAIS: Record<ModoJogo, string> = {
  corpo: 'Saiba mais: levante as duas mãos (ou ↑)',
  mao: 'Saiba mais: levante as duas mãos (ou ↑)',
  cabeca: 'Saiba mais: levante o queixo (ou ↑)',
};

export const TEMPOS_CARD_S: readonly number[] = [10, 15, 20, 25, 30];

/** `tutorial` (v10.2.0, FR-16): treino antes da partida; desligado por padrão. */
export interface Configuracoes { modo: ModoJogo; tempoCardS: number; som: boolean; foto: boolean; tutorial: boolean }
export const CONFIG_PADRAO: Configuracoes = { modo: MODO_PADRAO, tempoCardS: 15, som: true, foto: true, tutorial: false };

export type ItemConfig = keyof Configuracoes;
export const ITENS_CONFIG: readonly ItemConfig[] = ['modo', 'tempoCardS', 'som', 'foto', 'tutorial'];
export const ROTULO_ITEM: Record<ItemConfig, string> = { modo: 'Modo de jogo', tempoCardS: 'Tempo por card', som: 'Som', foto: 'Foto no resumo', tutorial: 'Tutorial' };
export const OPCOES: { [K in ItemConfig]: readonly Configuracoes[K][] } = {
  modo: MODOS,
  tempoCardS: TEMPOS_CARD_S,
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
  const som = ler(a, CHAVES.som);
  const foto = ler(a, CHAVES.foto);
  const tutorial = ler(a, CHAVES.tutorial);
  return {
    modo: MODOS.includes(modo as ModoJogo) ? (modo as ModoJogo) : CONFIG_PADRAO.modo,
    tempoCardS: TEMPOS_CARD_S.includes(tempo) ? tempo : CONFIG_PADRAO.tempoCardS,
    som: som === 'ligado' ? true : som === 'desligado' ? false : CONFIG_PADRAO.som,
    foto: foto === 'ligada' ? true : foto === 'desligada' ? false : CONFIG_PADRAO.foto,
    tutorial: tutorial === 'ligado' ? true : tutorial === 'desligado' ? false : CONFIG_PADRAO.tutorial,
  };
}

export function salvarConfiguracoes(a: Armazenamento | null, c: Configuracoes): void {
  try {
    a?.setItem(CHAVES.modo, c.modo);
    a?.setItem(CHAVES.tempoCardS, String(c.tempoCardS));
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
  if (item === 'tempoCardS') return `${valor} s`;
  if (item === 'foto') return valor ? 'Ligada' : 'Desligada';
  return valor ? 'Ligado' : 'Desligado';
}

export function resumoConfiguracoes(c: Configuracoes): string {
  return `Modo: ${MODO_ROTULO[c.modo]} · Tempo por card: ${c.tempoCardS} s · Som: ${c.som ? 'ligado' : 'desligado'} · Foto: ${c.foto ? 'ligada' : 'desligada'} · Tutorial: ${c.tutorial ? 'ligado' : 'desligado'}`;
}
