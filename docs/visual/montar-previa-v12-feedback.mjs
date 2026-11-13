// Monta docs/visual/previa-v12-feedback.html (arquivo único, abre offline) a partir de previa-v12-feedback.fonte.html:
// embute a Poppins de @fontsource/poppins em base64 e expande os marcadores do design system.
//   node docs/visual/montar-previa-v12-feedback.mjs
// Macros da fonte:
//   {{fontes}}             @font-face com a Poppins embutida
//   {{e4:tamanho:cor}}     estrela de 4 pontas (marca-estrela-4.svg do design system)
//   {{tri:tamanho:cor}}    triângulo (marca-triangulo.svg do design system), girado -90° (aponta para a esquerda)
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = dirname(fileURLToPath(import.meta.url));

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

// Caminhos copiados de docs/visual/referencia/project/assets/icons/ (os mesmos de src/app/svg/).
const E4 = 'M17 1L21.3 12.7L33 17L21.3 21.3L17 33L12.7 21.3L1 17L12.7 12.7L17 1';
const TRI = 'M14.9 1L20.1 13.9L28.7 25L14.9 23.1L1 25L9.6 13.9L14.9 1';
const e4 = (t, cor) => `<svg aria-hidden="true" viewBox="1 1 32 32" style="display:block;width:${t}px;height:${t}px;color:${cor}"><path d="${E4}" fill="currentColor"/></svg>`;
const tri = (t, cor) => `<svg aria-hidden="true" viewBox="0 -1.85 29.7 29.7" style="display:block;width:${t}px;height:${t}px;color:${cor};transform:rotate(-90deg)"><path d="${TRI}" fill="currentColor"/></svg>`;

const fonte = readFileSync(join(aqui, 'previa-v12-feedback.fonte.html'), 'utf8');
const html = fonte
  .replace('{{fontes}}', fontes)
  .replace(/\{\{e4:(\d+):([^}]+)\}\}/g, (_, t, c) => e4(t, c))
  .replace(/\{\{tri:(\d+):([^}]+)\}\}/g, (_, t, c) => tri(t, c));
writeFileSync(join(aqui, 'previa-v12-feedback.html'), html);
console.log(`previa-v12-feedback.html: ${(html.length / 1024).toFixed(0)} KB`);
