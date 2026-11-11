// Monta docs/visual/previa-v11.html (arquivo único, abre offline) a partir de previa-v11.fonte.html:
// embute a Poppins de @fontsource/poppins em base64, os SVGs de filtros/ e estilo-imagens/ e expande as macros.
//   node docs/visual/montar-previa-v11.mjs
// Macros da fonte:
//   {{svg:caminho}}              conteúdo do SVG (relativo a docs/visual)
//   {{m:id:tamanho:cor[:rot]}}   marcador do design system (e4, e5, e6, tri, exp) em <svg><use>
//   {{qr:semente:tamanho}}       QR code ilustrativo (padrões de posição reais, módulos de dados aleatórios)
//   {{pol:largura|faixa|legenda|selo}}  polaroid com a foto ilustrativa; faixa 0 = sem filtro; selo 0/1 = sem/com selo
//   {{fontes}}                   @font-face com a Poppins embutida
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = dirname(fileURLToPath(import.meta.url));
const ler = (p) => readFileSync(join(aqui, p), 'utf8');

function pastaFontes() {
  let d = aqui;
  for (let i = 0; i < 8; i++) {
    const p = join(d, 'node_modules', '@fontsource', 'poppins', 'files');
    if (existsSync(p)) return p;
    d = dirname(d);
  }
  throw new Error('@fontsource/poppins não encontrado (rode npm install)');
}

function fontes() {
  const pasta = pastaFontes();
  return [400, 500, 600, 700, 800, 900].map((p) => {
    const b64 = readFileSync(join(pasta, `poppins-latin-${p}-normal.woff2`)).toString('base64');
    return `@font-face{font-family:"Poppins";font-style:normal;font-weight:${p};font-display:block;src:url(data:font/woff2;base64,${b64}) format("woff2")}`;
  }).join('\n');
}

const svgLimpo = (p) => ler(p).replace(/<\?xml[^>]*>/, '').replace(/<svg /, '<svg aria-hidden="true" ').trim();

const MARCAS = {
  e4: { vb: '1 1 32 32', r: 1 },
  e5: { vb: '1 1 30.4 28.9', r: 30.9 / 32.4 },
  e6: { vb: '1 1 23.9 27.6', r: 29.6 / 25.9 },
  tri: { vb: '1 1 27.7 24', r: 26 / 29.7 },
  exp: { vb: '10 10 356 430', r: 430 / 356 },
};
function marca(id, tam, cor, rot) {
  const m = MARCAS[id];
  if (!m) throw new Error(`marca desconhecida: ${id}`);
  const w = Number(tam), h = +(w * m.r).toFixed(1);
  const estilo = `color:${cor || 'currentColor'}${rot ? `;transform:rotate(${rot}deg)` : ''}`;
  return `<svg class="u" width="${w}" height="${h}" viewBox="${m.vb}" style="${estilo}" aria-hidden="true"><use href="#${id}"/></svg>`;
}

function qr(semente, tam) {
  const n = 25;
  let s = Number(semente) * 9301 + 49297;
  const rnd = () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648);
  const m = Array.from({ length: n }, () => Array(n).fill(null));
  const quadro = (x0, y0) => {
    for (let y = -1; y <= 7; y++) for (let x = -1; x <= 7; x++) {
      const X = x0 + x, Y = y0 + y;
      if (X < 0 || Y < 0 || X >= n || Y >= n) continue;
      const borda = x === 0 || x === 6 || y === 0 || y === 6;
      const miolo = x >= 2 && x <= 4 && y >= 2 && y <= 4;
      m[Y][X] = x >= 0 && x <= 6 && y >= 0 && y <= 6 && (borda || miolo);
    }
  };
  quadro(0, 0); quadro(n - 7, 0); quadro(0, n - 7);
  for (let i = 8; i < n - 8; i++) { m[6][i] = i % 2 === 0; m[i][6] = i % 2 === 0; }
  for (let y = -2; y <= 2; y++) for (let x = -2; x <= 2; x++) m[18 + y][18 + x] = Math.max(Math.abs(x), Math.abs(y)) !== 1;
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (m[y][x] === null) m[y][x] = rnd() < 0.5;
  let d = '';
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (m[y][x]) d += `M${x + 2} ${y + 2}h1v1h-1z`;
  return `<svg class="qr" width="${tam}" height="${tam}" viewBox="0 0 ${n + 4} ${n + 4}" shape-rendering="crispEdges" role="img" aria-label="QR code ilustrativo"><rect width="${n + 4}" height="${n + 4}" fill="#fff"/><path d="${d}" fill="#0c0b0a"/></svg>`;
}

const FAIXAS = [
  null,
  { titulo: ['Aprendiz', 'de checagem'], filtro: 'filtros/filtro-1-lupa.svg', marca: 'e4' },
  { titulo: ['Detetive', 'em treino'], filtro: 'filtros/filtro-2-detetive.svg', marca: 'e5' },
  { titulo: ['Faro de', 'repórter'], filtro: 'filtros/filtro-3-reporter.svg', marca: 'e6' },
  { titulo: ['Imune a', 'fake news!'], filtro: 'filtros/filtro-4-heroi.svg', marca: 'e4' },
];
const FOTO = svgLimpo('filtros/foto-ilustrativa.svg');
function polaroid(largura, faixa, legenda, selo) {
  const f = FAIXAS[Number(faixa)];
  const camada = f ? svgLimpo(f.filtro) : '';
  const fx = FAIXAS[Number(selo)] ? FAIXAS[Number(selo)] : null;
  const s = fx
    ? `<div class="selo-f" aria-hidden="true">${marca(fx.marca, 22, '#002036')}<span>${fx.titulo[0]}<br>${fx.titulo[1]}</span></div>`
    : '';
  return `<figure class="pol" style="--w:${largura}px"><div class="folha" aria-hidden="true"></div><div class="papel"><div class="foto">${FOTO}${camada}</div><figcaption>${legenda}</figcaption></div>${s}</figure>`;
}

// Diagrama das âncoras (também salvo como SVG próprio).
const PONTOS = [
  [0, 0, 40, 'nariz', 18, 20, 'start'], [2, -50, 0, 'olho esq.', 0, -26, 'middle'], [5, 50, 0, 'olho dir.', 0, -26, 'middle'],
  [7, -105, 15, 'orelha esq.', -10, 52, 'end'], [8, 105, 15, 'orelha dir.', 10, 52, 'start'], [9, -30, 95, 'boca', -14, 34, 'end'],
  [10, 30, 95, 'boca', 14, 34, 'start'], [11, -200, 255, 'ombro esq.', 6, -18, 'start'], [12, 200, 255, 'ombro dir.', -6, -18, 'end'],
];
function ancoras() {
  const corpo = ler('filtros/foto-ilustrativa.svg').replace(/<\/svg>\s*$/, '');
  const pontos = PONTOS.map(([i, x, y, nome, dx, dy, ancora]) => {
    const tx = x + dx;
    return `<circle cx="${x}" cy="${y}" r="9" fill="#fde31f" stroke="#002036" stroke-width="4"/>` +
      `<text x="${tx}" y="${y + dy}" font-family="Poppins, system-ui, sans-serif" font-size="22" font-weight="800" fill="#002036" text-anchor="${ancora}" paint-order="stroke" stroke="#fcfaf1" stroke-width="6">${i} ${nome}</text>`;
  }).join('\n  ');
  return `${corpo.replace('<title>Foto ilustrativa (pessoa) para testar os filtros</title>', '<title>Âncoras do rosto (pontos do MediaPipe Pose) na foto espelhada</title>')}
  <path d="M-50 0 H50" stroke="#e34a39" stroke-width="4" stroke-dasharray="8 6"/>
  ${pontos}
</svg>
`;
}
const svgAncoras = ancoras();
writeFileSync(join(aqui, 'filtros', 'ancoras-rosto.svg'), svgAncoras);

let html = ler('previa-v11.fonte.html');
html = html
  .replace('{{fontes}}', () => fontes())
  .replace(/\{\{ancoras\}\}/g, () => svgAncoras.replace(/<svg /, '<svg aria-hidden="true" '))
  .replace(/\{\{svg:([^}]+)\}\}/g, (_, p) => svgLimpo(p.trim()))
  .replace(/\{\{m:([a-z0-9]+):(\d+):([^:}]*)(?::(-?\d+))?\}\}/g, (_, id, t, c, r) => marca(id, t, c, r))
  .replace(/\{\{qr:(\d+):(\d+)\}\}/g, (_, s, t) => qr(s, t))
  .replace(/\{\{pol:([^}]+)\}\}/g, (_, a) => { const [w, f, l, s] = a.split('|'); return polaroid(w, f, l, s); });
const sobra = html.match(/\{\{[^}]*\}\}/);
if (sobra) throw new Error(`macro não expandida: ${sobra[0]}`);
writeFileSync(join(aqui, 'previa-v11.html'), html);
console.log(`previa-v11.html: ${(html.length / 1024).toFixed(0)} KB`);
