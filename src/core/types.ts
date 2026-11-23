export type Veredito = 'verdadeira' | 'falsa';
export type Tecnica = 'fonte' | 'data' | 'imagem' | 'contexto';
export type Tema = 'saude' | 'ciencia' | 'historia' | 'tecnologia' | 'curiosidades' | 'meio-ambiente' | 'politica';
export type Status = 'rascunho' | 'aprovada';
/** v10.1.0 (AC-7.10): opcional; desde a v12.0.0 filtra e ordena o sorteio (AC-9.27). */
export type Dificuldade = 'facil' | 'medio' | 'dificil';

export const VEREDITOS: readonly Veredito[] = ['verdadeira', 'falsa'];
export const TECNICAS: readonly Tecnica[] = ['fonte', 'data', 'imagem', 'contexto'];
/** `politica`: v12.0.0 (AC-7.2). */
export const TEMAS: readonly Tema[] = ['saude', 'ciencia', 'historia', 'tecnologia', 'curiosidades', 'meio-ambiente', 'politica'];
export const STATUS: readonly Status[] = ['rascunho', 'aprovada'];
export const DIFICULDADES: readonly Dificuldade[] = ['facil', 'medio', 'dificil'];

export const DIFICULDADE_ROTULO: Record<Dificuldade, string> = { facil: 'Fácil', medio: 'Médio', dificil: 'Difícil' };

export const TECNICA_ROTULO: Record<Tecnica, string> = {
  fonte: 'Checar a fonte',
  data: 'Conferir a data',
  imagem: 'Verificar a imagem',
  contexto: 'Analisar o contexto',
};

export const TEMA_ROTULO: Record<Tema, string> = {
  saude: 'Saúde',
  ciencia: 'Ciência',
  historia: 'História',
  tecnologia: 'Tecnologia',
  curiosidades: 'Curiosidades',
  'meio-ambiente': 'Meio ambiente',
  politica: 'Política',
};

/** O que o jogo recebe de cada notícia (FR-4). Sem `imagem`, o card mostra a ilustração do `tema`. */
export interface Noticia {
  id: string;
  titulo: string;
  descricao: string;
  saibaMais: string;
  imagem?: string;
  tema: Tema;
  veredito: Veredito;
  explicacao: string;
  tecnica: Tecnica;
  fonteUrl: string;
  dificuldade?: Dificuldade;
  /** v11.0.0 (AC-7.11): opcionais, para a lista do resumo e a página das fontes (AC-5.8, AC-5.10). */
  tituloCurto?: string;
  fonteNome?: string;
  fontesExtras?: string[];
}

export interface Catalogo {
  versao: string;
  noticias: Noticia[];
}

/**
 * Colunas do CSV do banco, na ordem em que são exportadas (FR-6). `dificuldade` (v10.1.0), `titulo_curto` e
 * `fonte_nome` (v11.0.0) e `visivel` (v12.0.0) são opcionais e vêm por último: um CSV antigo, sem elas, é lido com elas
 * vazias (AC-7.10, AC-7.11, AC-7.12; `visivel` vazia = visível).
 */
export const COLUNAS_BANCO = [
  'id', 'titulo', 'descricao', 'saiba_mais', 'veredito', 'explicacao', 'tecnica', 'tema',
  'fonte_url', 'fontes_extras', 'imagem', 'revisado_por', 'status', 'dificuldade',
  'titulo_curto', 'fonte_nome', 'visivel',
] as const;

/** Limite de `titulo_curto` (AC-7.3, AC-7.11): cabe numa linha da lista do resumo. */
export const MAX_TITULO_CURTO = 34;
export type ColunaBanco = (typeof COLUNAS_BANCO)[number];

/**
 * Uma linha do banco como está no CSV (texto puro, com os campos de gestão).
 * Pode estar inválida (ex.: editada no Excel); só vira `Noticia` depois de validada.
 */
export type NoticiaBanco = Record<ColunaBanco, string>;
