// Monta docs/visual/previa-v13.html (arquivo único, abre offline) a partir de previa-v13.fonte.html:
// embute a Poppins de @fontsource/poppins em base64, as formas do design system (src/app/svg/, as mesmas do jogo) como
// <symbol>, as ilustrações "recorte chapado" (src/app/ilustracoes/) em data URL e as notícias do banco padrão
// (conteudo/noticias.csv), para a prévia usar os textos mais longos de verdade.
//   node docs/visual/montar-previa-v13.mjs
// Macros da fonte:
//   {{fontes}}      @font-face com a Poppins embutida
//   {{simbolos}}    <svg> oculto com um <symbol id="s-NOME"> (viewBox justo) e um <symbol id="o-NOME"> (viewBox original) por forma
//   {{formas}}      JSON { nome: { vb, vbo } } com os viewBox, para as composições por tema
//   {{ilustracoes}} JSON { nome: dataURL } das ilustrações
//   {{noticias}}    JSON com id, titulo, descricao, saiba_mais e tema de cada notícia do banco padrão
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = dirname(fileURLToPath(import.meta.url));
const raiz = join(aqui, '..', '..');

function pastaFontes() {
  let d = aqui;
  for (let i = 0; i < 8; i++) {
    const p = join(d, 'node_modules', '@fontsource', 'poppins', 'files');
    if (existsSync(p)) return p;
    d = dirname(d);
  }
  throw new Error('@fontsource/poppins não encontrado (rode npm install)');
}

const fontes = () => [400, 500, 600, 700, 800, 900].map((p) => {
  const b64 = readFileSync(join(pastaFontes(), `poppins-latin-${p}-normal.woff2`)).toString('base64');
  return `@font-face{font-family:"Poppins";font-style:normal;font-weight:${p};font-display:block;src:url(data:font/woff2;base64,${b64}) format("woff2")}`;
}).join('\n');

// Formas: as mesmas de src/app/svg/ (cópias do design system sem <metadata>).
const pastaSvg = join(raiz, 'src', 'app', 'svg');
const formas = {};
let simbolos = '';
for (const arq of readdirSync(pastaSvg).filter((a) => a.endsWith('.svg'))) {
  const nome = arq.replace(/\.svg$/, '');
  const txt = readFileSync(join(pastaSvg, arq), 'utf8');
  const tag = txt.match(/<svg[^>]*>/)[0];
  const vb = tag.match(/ viewBox="([^"]+)"/)[1];
  const vbo = tag.match(/data-viewbox-original="([^"]+)"/)[1];
  const corpo = txt.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
  formas[nome] = { vb, vbo };
  simbolos += `<symbol id="s-${nome}" viewBox="${vb}">${corpo}</symbol><symbol id="o-${nome}" viewBox="${vbo}" overflow="visible">${corpo}</symbol>`;
}

const pastaIlu = join(raiz, 'src', 'app', 'ilustracoes');
const ilustracoes = Object.fromEntries(readdirSync(pastaIlu).filter((a) => a.endsWith('.svg')).map((a) => [
  a.replace(/\.svg$/, ''),
  `data:image/svg+xml;base64,${readFileSync(join(pastaIlu, a)).toString('base64')}`,
]));

// CSV do banco (; e aspas, UTF-8 com BOM).
function lerCsv(t) {
  t = t.replace(/^﻿/, '');
  const linhas = [];
  let r = [], f = '', q = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (q) {
      if (c === '"') { if (t[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c;
    } else if (c === '"') q = true;
    else if (c === ';') { r.push(f); f = ''; }
    else if (c === '\n') { r.push(f.replace(/\r$/, '')); linhas.push(r); r = []; f = ''; }
    else f += c;
  }
  if (f || r.length) { r.push(f); linhas.push(r); }
  const [cab, ...resto] = linhas;
  return resto.filter((l) => l.length > 3).map((l) => Object.fromEntries(cab.map((k, i) => [k, l[i] ?? ''])));
}
const noticias = lerCsv(readFileSync(join(raiz, 'conteudo', 'noticias.csv'), 'utf8'))
  .map(({ id, titulo, descricao, saiba_mais, tema }) => ({ id, titulo, descricao, saiba_mais, tema }));

const fonte = readFileSync(join(aqui, 'previa-v13.fonte.html'), 'utf8');
const html = fonte
  .replace('{{fontes}}', fontes)
  .replace('{{simbolos}}', `<svg width="0" height="0" style="position:absolute" aria-hidden="true">${simbolos}</svg>`)
  .replace('{{formas}}', JSON.stringify(formas))
  .replace('{{ilustracoes}}', JSON.stringify(ilustracoes))
  .replace('{{noticias}}', JSON.stringify(noticias).replace(/</g, '\\u003c'));
writeFileSync(join(aqui, 'previa-v13.html'), html);
console.log(`previa-v13.html: ${(html.length / 1024).toFixed(0)} KB, ${noticias.length} notícias, ${Object.keys(formas).length} formas`);
