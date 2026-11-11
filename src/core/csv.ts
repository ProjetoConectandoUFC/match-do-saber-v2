import { COLUNAS_BANCO, type ColunaBanco, type NoticiaBanco } from './types';

/** Colunas de lista: lidas em minúsculas, para aceitar "Falsa" ou "SAUDE" vindos do Excel. */
const COLUNAS_LISTA: readonly ColunaBanco[] = ['veredito', 'tecnica', 'tema', 'status', 'dificuldade'];

/**
 * Lê um CSV em linhas e campos (FR-6): separador `,` ou `;` (o que mais aparece no cabeçalho),
 * aspas com `""`, quebra de linha dentro de campo entre aspas e BOM. Linhas vazias são ignoradas.
 */
export function lerTabela(texto: string): string[][] {
  const t = texto.replace(/^\uFEFF/, '');
  const primeira = t.split(/\r?\n/, 1)[0] ?? '';
  const sep = (primeira.match(/;/g)?.length ?? 0) > (primeira.match(/,/g)?.length ?? 0) ? ';' : ',';
  const linhas: string[][] = [];
  let linha: string[] = [];
  let campo = '';
  let aspas = false;
  const fecharLinha = () => {
    linha.push(campo);
    campo = '';
    if (linha.some((c) => c.trim() !== '')) linhas.push(linha);
    linha = [];
  };
  for (let i = 0; i < t.length; i++) {
    const c = t[i]!;
    if (aspas) {
      if (c === '"' && t[i + 1] === '"') { campo += '"'; i++; }
      else if (c === '"') aspas = false;
      else campo += c;
    } else if (c === '"') aspas = true;
    else if (c === sep) { linha.push(campo); campo = ''; }
    else if (c === '\r' || c === '\n') {
      if (c === '\r' && t[i + 1] === '\n') i++;
      fecharLinha();
    } else campo += c;
  }
  if (campo !== '' || linha.length > 0) fecharLinha();
  return linhas;
}

const normalizarCabecalho = (h: string) =>
  h.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/["']/g, '').trim().toLowerCase().replace(/[\s-]+/g, '_');

/** Lê o CSV do banco pelo cabeçalho (em qualquer ordem); coluna ausente fica vazia. */
export function lerCsv(texto: string): NoticiaBanco[] {
  const [cabecalho, ...resto] = lerTabela(texto);
  if (!cabecalho) throw new Error('O arquivo está vazio.');
  const indice = new Map(cabecalho.map((h, i) => [normalizarCabecalho(h), i]));
  if (!indice.has('titulo')) {
    throw new Error(`Cabeçalho não reconhecido: o CSV precisa ter as colunas ${COLUNAS_BANCO.join(', ')}.`);
  }
  return resto.map((campos) => {
    const n = {} as NoticiaBanco;
    for (const col of COLUNAS_BANCO) {
      const pos = indice.get(col);
      const v = (pos === undefined ? '' : campos[pos] ?? '').trim();
      n[col] = COLUNAS_LISTA.includes(col) ? v.toLowerCase() : v;
    }
    return n;
  });
}

function campoCsv(v: string): string {
  return /[";\r\n]|^\s|\s$/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

/** Exporta o banco como o Excel abre (FR-6): UTF-8 com BOM, `;`, cabeçalho e quebras CRLF. */
export function escreverCsv(banco: readonly NoticiaBanco[]): string {
  const linhas = [COLUNAS_BANCO.join(';'), ...banco.map((n) => COLUNAS_BANCO.map((c) => campoCsv(n[c] ?? '')).join(';'))];
  return `\uFEFF${linhas.join('\r\n')}\r\n`;
}

/** Texto de um arquivo: UTF-8 (com ou sem BOM) ou, se não for UTF-8 válido, Windows-1252 (Excel). */
export function decodificar(bytes: Uint8Array | ArrayBuffer): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder('windows-1252').decode(bytes);
  }
}
