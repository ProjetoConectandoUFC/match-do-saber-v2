/**
 * Fontes da rodada (v11.0.0, opção B da prévia v11): a lista de acertos e erros do resumo (AC-5.8), os ids
 * que vão no QR (AC-5.9) e os itens da página das fontes da versão web (AC-5.10). Lógica pura.
 * O QR leva só os ids das notícias, depois do `#`: nada da pessoa, nem respostas, nem a foto (FR-13).
 */
import type { Resultado } from './partida';
import { MAX_TITULO_CURTO, type Noticia, type Veredito } from './types';

export { MAX_TITULO_CURTO };

/** `titulo_curto`, ou o título inteiro se couber, ou cortado na última palavra que cabe, com "…". */
export function tituloCurto(n: Pick<Noticia, 'titulo'> & { tituloCurto?: string }, max = MAX_TITULO_CURTO): string {
  if (n.tituloCurto?.trim()) return n.tituloCurto.trim();
  const t = n.titulo.trim();
  if (t.length <= max) return t;
  const cabe = t.slice(0, max - 1);
  const espaco = cabe.lastIndexOf(' ');
  const corte = espaco > max / 3 ? cabe.slice(0, espaco) : cabe;
  return `${corte.replace(/[\s,.;:!?–—-]+$/, '')}…`;
}

/** Domínio do link, sem "www."; link inválido vira texto vazio. */
export function dominio(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./i, '');
  } catch {
    return '';
  }
}

/** Veículo da fonte (das verdadeiras) ou de quem desmentiu (das falsas): `fonte_nome` ou o domínio. */
export const nomeDaFonte = (n: Pick<Noticia, 'fonteUrl'> & { fonteNome?: string }) => n.fonteNome?.trim() || dominio(n.fonteUrl);

export type RotuloFonte = 'Fonte:' | 'Desmentido por:';
export const rotuloFonte = (v: Veredito): RotuloFonte => (v === 'verdadeira' ? 'Fonte:' : 'Desmentido por:');

export interface LinhaResumo {
  id: string;
  titulo: string;
  veredito: Veredito;
  /** Errou e tempo esgotado contam igual: não acertou. */
  acertou: boolean;
  rotuloFonte: RotuloFonte;
  fonte: string;
}

/** Uma linha por card da partida, na ordem em que foram jogados (AC-5.8). */
export function linhasDoResumo(cards: readonly Noticia[], resultados: readonly (Resultado | undefined)[]): LinhaResumo[] {
  return cards.map((n, i) => ({
    id: n.id,
    titulo: tituloCurto(n),
    veredito: n.veredito,
    acertou: resultados[i] === 'acerto',
    rotuloFonte: rotuloFonte(n.veredito),
    fonte: nomeDaFonte(n),
  }));
}

const ID = /^[a-z0-9-]+$/i;
const MDS = /^mds-0*(\d+)$/i;
export const MAX_IDS_QR = 20;

/** Ids para o fragmento do QR: `mds-0001` vira `1` (QR menor); números que não são `mds` levam `_`. */
export function codificarIds(ids: readonly string[]): string {
  return ids.map((id) => {
    const m = MDS.exec(id);
    if (m) return m[1]!;
    return /^\d+$/.test(id) ? `_${id}` : id;
  }).join('.');
}

/** O contrário de `codificarIds`, aceitando só ids válidos, sem repetir, até 20 (AC-5.10). */
export function decodificarIds(fragmento: string): string[] {
  const vistos = new Set<string>();
  for (const parte of fragmento.replace(/^#/, '').split('.')) {
    const id = /^\d+$/.test(parte) ? `mds-${parte.padStart(4, '0')}` : parte.replace(/^_(?=\d+$)/, '');
    if (!id || !ID.test(id)) continue;
    vistos.add(id);
    if (vistos.size >= MAX_IDS_QR) break;
  }
  return [...vistos];
}

/** Endereço que o QR abre (AC-5.9): a página das fontes da versão web, com os ids depois do `#`. */
export function enderecoFontes(base: string, ids: readonly string[]): string {
  return `${base.endsWith('/') ? base : `${base}/`}fontes.html#${codificarIds(ids)}`;
}

export interface LinkFonte { url: string; nome: string }
export type ItemPagina =
  | { id: string; encontrada: true; titulo: string; veredito: Veredito; rotuloFonte: RotuloFonte; links: LinkFonte[] }
  | { id: string; encontrada: false };

/** Itens da página das fontes, na ordem pedida, só com as notícias jogáveis do banco embutido (AC-5.10). */
export function itensDaPagina(jogaveis: readonly Noticia[], ids: readonly string[]): ItemPagina[] {
  const porId = new Map(jogaveis.map((n) => [n.id.toLowerCase(), n]));
  return ids.map((id) => {
    const n = porId.get(id.toLowerCase());
    if (!n) return { id, encontrada: false };
    return {
      id: n.id,
      encontrada: true,
      titulo: n.titulo,
      veredito: n.veredito,
      rotuloFonte: rotuloFonte(n.veredito),
      links: [
        { url: n.fonteUrl, nome: nomeDaFonte(n) },
        ...(n.fontesExtras ?? []).map((url) => ({ url, nome: dominio(url) || url })),
      ],
    };
  });
}
