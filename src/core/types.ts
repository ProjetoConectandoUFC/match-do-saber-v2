export type Veredito = 'verdadeira' | 'falsa';
export type Tecnica = 'fonte' | 'data' | 'imagem' | 'contexto';
export type Tema = 'saude' | 'ciencia' | 'historia' | 'tecnologia' | 'curiosidades' | 'meio-ambiente';
export type Status = 'rascunho' | 'aprovada';

export const VEREDITOS: readonly Veredito[] = ['verdadeira', 'falsa'];
export const TECNICAS: readonly Tecnica[] = ['fonte', 'data', 'imagem', 'contexto'];
export const TEMAS: readonly Tema[] = ['saude', 'ciencia', 'historia', 'tecnologia', 'curiosidades', 'meio-ambiente'];
export const STATUS: readonly Status[] = ['rascunho', 'aprovada'];

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
}

export interface Catalogo {
  versao: string;
  noticias: Noticia[];
}

/** Colunas do CSV do banco, na ordem em que são exportadas (FR-6). */
export const COLUNAS_BANCO = [
  'id', 'titulo', 'descricao', 'saiba_mais', 'veredito', 'explicacao', 'tecnica', 'tema',
  'fonte_url', 'fontes_extras', 'imagem', 'revisado_por', 'status',
] as const;
export type ColunaBanco = (typeof COLUNAS_BANCO)[number];

/**
 * Uma linha do banco como está no CSV (texto puro, com os campos de gestão).
 * Pode estar inválida (ex.: editada no Excel); só vira `Noticia` depois de validada.
 */
export type NoticiaBanco = Record<ColunaBanco, string>;
