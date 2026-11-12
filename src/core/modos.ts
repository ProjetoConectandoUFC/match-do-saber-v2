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


// v12.0.0: as configurações (tempo por card, som, foto, tutorial e os itens novos) estão em ./ajustes.ts (FR-9).
