import {
  COLUNAS_BANCO, STATUS, TECNICAS, TEMAS, VEREDITOS,
  type ColunaBanco, type Noticia, type NoticiaBanco, type Tecnica, type Tema, type Veredito,
} from './types';

/** Motivo de cada campo com problema (AC-7.3). Vazio = notícia válida. */
export type Problemas = Partial<Record<ColunaBanco, string>>;

const OBRIGATORIOS: readonly ColunaBanco[] = [
  'id', 'titulo', 'descricao', 'saiba_mais', 'veredito', 'explicacao', 'tecnica', 'tema', 'fonte_url', 'status',
];
const LISTAS: Partial<Record<ColunaBanco, readonly string[]>> = {
  veredito: VEREDITOS, tecnica: TECNICAS, tema: TEMAS, status: STATUS,
};
const LINK = /^https?:\/\/[^\s.]+\.\S+$/i;
const chave = (id: string) => id.trim().toLowerCase();

export function validarNoticia(n: NoticiaBanco, outrosIds: Iterable<string> = []): Problemas {
  const p: Problemas = {};
  for (const c of OBRIGATORIOS) if (!n[c]?.trim()) p[c] = 'campo obrigatório';
  if (!p.id) {
    if (!/^[a-z0-9-]+$/i.test(n.id)) p.id = 'use só letras, números e hífen';
    else if (new Set([...outrosIds].map(chave)).has(chave(n.id))) p.id = 'id repetido';
  }
  for (const [c, valores] of Object.entries(LISTAS) as [ColunaBanco, readonly string[]][]) {
    if (!p[c] && !valores.includes(n[c])) p[c] = `use ${valores.join(', ')}`;
  }
  if (!p.fonte_url && !LINK.test(n.fonte_url)) p.fonte_url = 'precisa ser um link http(s)';
  const extras = (n.fontes_extras ?? '').split(/\s+/).filter(Boolean);
  if (extras.some((l) => !LINK.test(l))) p.fontes_extras = 'cada link precisa ser http(s), separados por espaço';
  if (n.status === 'aprovada' && !n.revisado_por?.trim()) p.revisado_por = 'notícia aprovada precisa de quem revisou';
  return p;
}

export const temProblemas = (p: Problemas) => Object.keys(p).length > 0;

export function descreverProblemas(p: Problemas): string {
  return Object.entries(p).map(([c, m]) => `${c}: ${m}`).join('; ');
}

export interface LinhaInvalida { indice: number; noticia: NoticiaBanco; problemas: Problemas }

/** Valida o banco inteiro: linhas com problema ou id repetido não entram em partidas (AC-8.4). */
export function validarBanco(banco: readonly NoticiaBanco[]): { validas: NoticiaBanco[]; invalidas: LinhaInvalida[] } {
  const contagem = new Map<string, number>();
  for (const n of banco) if (n.id) contagem.set(chave(n.id), (contagem.get(chave(n.id)) ?? 0) + 1);
  const validas: NoticiaBanco[] = [];
  const invalidas: LinhaInvalida[] = [];
  banco.forEach((noticia, indice) => {
    const problemas = validarNoticia(noticia);
    if (!problemas.id && (contagem.get(chave(noticia.id)) ?? 0) > 1) problemas.id = 'id repetido';
    if (temProblemas(problemas)) invalidas.push({ indice, noticia, problemas });
    else validas.push(noticia);
  });
  return { validas, invalidas };
}

function paraNoticia(n: NoticiaBanco): Noticia {
  const x: Noticia = {
    id: n.id, titulo: n.titulo, descricao: n.descricao, saibaMais: n.saiba_mais, tema: n.tema as Tema,
    veredito: n.veredito as Veredito, explicacao: n.explicacao, tecnica: n.tecnica as Tecnica, fonteUrl: n.fonte_url,
  };
  if (n.imagem) x.imagem = n.imagem;
  return x;
}

/** Notícias que podem entrar numa partida (AC-7.7, Princípio 1): válidas, aprovadas, com fonte e revisor. */
export function jogaveis(banco: readonly NoticiaBanco[]): Noticia[] {
  return validarBanco(banco).validas
    .filter((n) => n.status === 'aprovada' && n.fonte_url && n.revisado_por)
    .map(paraNoticia);
}

/** Próximo id no formato `mds-NNNN`, sem repetir os existentes (FR-7). */
export function proximoId(banco: readonly NoticiaBanco[], extras: Iterable<string> = []): string {
  const usados = new Set([...banco.map((n) => chave(n.id)), ...[...extras].map(chave)]);
  let maior = 0;
  for (const id of usados) {
    const m = /^mds-(\d+)$/.exec(id);
    if (m) maior = Math.max(maior, Number(m[1]));
  }
  let id: string;
  do id = `mds-${String(++maior).padStart(4, '0')}`;
  while (usados.has(id));
  return id;
}

/** Notícia em branco para "Nova notícia": id gerado e status rascunho. */
export function novaNoticia(banco: readonly NoticiaBanco[]): NoticiaBanco {
  const n = Object.fromEntries(COLUNAS_BANCO.map((c) => [c, ''])) as NoticiaBanco;
  return { ...n, id: proximoId(banco), status: 'rascunho' };
}

export interface LinhaImportada { linha: number; noticia: NoticiaBanco; motivo: string }

/**
 * Prévia da importação (AC-7.5). `linha` é a linha do arquivo (o cabeçalho é a 1).
 * Linha sem id ganha um id novo; mesmo id do banco = existente (não entra); com problema = inválida.
 */
export function prepararImportacao(banco: readonly NoticiaBanco[], linhas: readonly NoticiaBanco[]) {
  const doBanco = new Set(banco.map((n) => chave(n.id)));
  const novas: NoticiaBanco[] = [];
  const existentes: LinhaImportada[] = [];
  const invalidas: LinhaImportada[] = [];
  const vistos = new Set<string>();
  linhas.forEach((original, i) => {
    const linha = i + 2;
    const noticia = original.id.trim()
      ? original
      : { ...original, id: proximoId(banco, novas.map((x) => x.id)) };
    const k = chave(noticia.id);
    if (doBanco.has(k)) {
      existentes.push({ linha, noticia, motivo: 'já existe no banco' });
      return;
    }
    if (vistos.has(k)) {
      invalidas.push({ linha, noticia, motivo: 'id repetido no arquivo' });
      return;
    }
    vistos.add(k);
    const p = validarNoticia(noticia);
    if (temProblemas(p)) invalidas.push({ linha, noticia, motivo: descreverProblemas(p) });
    else novas.push(noticia);
  });
  return { novas, existentes, invalidas };
}

/** Grava uma notícia nova (`idOriginal = null`) ou editada, no mesmo lugar; com problema, não grava (AC-7.3). */
export function gravarNoticia(
  banco: readonly NoticiaBanco[], noticia: NoticiaBanco, idOriginal: string | null,
): { banco: NoticiaBanco[] } | { problemas: Problemas } {
  const outros = banco.filter((n) => idOriginal === null || n.id !== idOriginal).map((n) => n.id);
  const problemas = validarNoticia(noticia, outros);
  if (temProblemas(problemas)) return { problemas };
  if (idOriginal === null) return { banco: [...banco, noticia] };
  return { banco: banco.map((n) => (n.id === idOriginal ? noticia : n)) };
}

export function apagarNoticias(banco: readonly NoticiaBanco[], ids: Iterable<string>): NoticiaBanco[] {
  const fora = new Set(ids);
  return banco.filter((n) => !fora.has(n.id));
}

export type CampoEmMassa = 'status' | 'tema' | 'tecnica';

export function alterarEmMassa(
  banco: readonly NoticiaBanco[], ids: Iterable<string>, campo: CampoEmMassa, valor: string,
): NoticiaBanco[] {
  const sel = new Set(ids);
  return banco.map((n) => (sel.has(n.id) ? { ...n, [campo]: valor } : n));
}
