import { TECNICAS, TEMAS, VEREDITOS, type Catalogo, type Noticia } from './types';

const CAMPOS_TEXTO = ['id', 'titulo', 'descricao', 'saibaMais', 'explicacao', 'fonteUrl'] as const;

function invalido(motivo: string): never {
  throw new Error(`catálogo inválido: ${motivo}`);
}

function parseNoticia(n: unknown, i: number): Noticia {
  if (typeof n !== 'object' || n === null) invalido(`notícia ${i} não é objeto`);
  const o = n as Record<string, unknown>;
  for (const c of CAMPOS_TEXTO) {
    if (typeof o[c] !== 'string' || o[c] === '') invalido(`notícia ${i}: campo ${c}`);
  }
  if (!VEREDITOS.includes(o.veredito as never)) invalido(`notícia ${i}: veredito`);
  if (!TECNICAS.includes(o.tecnica as never)) invalido(`notícia ${i}: tecnica`);
  if (!TEMAS.includes(o.tema as never)) invalido(`notícia ${i}: tema`);
  // FR-4 (v9.0.0): imagem é opcional; sem ela, o card mostra a ilustração do tema.
  if (o.imagem !== undefined && typeof o.imagem !== 'string') invalido(`notícia ${i}: imagem`);
  const noticia = { ...o } as unknown as Noticia;
  if (!noticia.imagem) delete noticia.imagem;
  return noticia;
}

export function parseCatalogo(json: unknown): Catalogo {
  if (typeof json !== 'object' || json === null) invalido('não é objeto');
  const o = json as Record<string, unknown>;
  if (typeof o.versao !== 'string') invalido('versao');
  if (!Array.isArray(o.noticias)) invalido('noticias');
  return { versao: o.versao, noticias: o.noticias.map(parseNoticia) };
}
