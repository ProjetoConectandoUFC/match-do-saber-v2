// Capturas PNG da prévia v13 em docs/visual/capturas/v13-cartas/ (monte antes: node docs/visual/montar-previa-v13.mjs).
//   node docs/visual/capturar-previa-v13.mjs
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const aqui = dirname(fileURLToPath(import.meta.url));
const destino = join(aqui, 'capturas', 'v13-cartas');
mkdirSync(destino, { recursive: true });
const url = pathToFileURL(join(aqui, 'previa-v13.html')).href;

// [arquivo, quadro, largura, altura, extra na URL]
const TELAS = [
  ['01-carta-frente-1366x768', 'q-frente', 1366, 768],
  ['02-carta-verso-saiba-mais-1366x768', 'q-verso', 1366, 768],
  ['03-carta-frente-ilustracao-emas', 'q-emas', 1366, 768],
  ['04-carta-frente-titulo-70', 'q-70', 1366, 768],
  ['05-fan-fechado', 'q-fan0', 1366, 768],
  ['06-fan-meio-aberto', 'q-fan05', 1366, 768],
  ['07-fan-aberto', 'q-fan1', 1366, 768],
  ['08-fan-duas-cartas', 'q-fan-poucas', 1366, 768],
  ['09-abertura-50pc', 'q-abertura', 1366, 768, '&p=0.45'],
  ['10-distribuicao-15pc', 'q-distrib', 1366, 768, '&p=0.15'],
  ['11-distribuicao-45pc', 'q-distrib', 1366, 768, '&p=0.45'],
  ['12-distribuicao-75pc', 'q-distrib', 1366, 768, '&p=0.75'],
  ['13-espera-fan', 'q-espera', 1366, 768],
  ['14-carta-frente-1920x1080', 'q-1920', 1920, 1080],
  ['15-carta-verso-1920x1080', 'q-1920v', 1920, 1080],
];

const nav = await chromium.launch();
for (const [nome, quadro, w, h, extra = ''] of TELAS) {
  const p = await nav.newPage({ viewport: { width: w, height: h } });
  p.on('pageerror', (e) => console.log(`${nome}: erro: ${e.message}`));
  await p.goto(`${url}?so=${quadro}${extra}`);
  await p.waitForSelector('body[data-pronto]');
  await p.waitForTimeout(150);
  await p.screenshot({ path: join(destino, `${nome}.png`) });
  await p.close();
}
// Página inteira (faces, naipes e verificações).
const p = await nav.newPage({ viewport: { width: 1500, height: 900 } });
await p.goto(url);
await p.waitForSelector('body[data-pronto]');
const verif = await p.evaluate(() => window.__verificacoes);
for (const [t, ok] of verif) console.log(`${ok ? 'OK   ' : 'FALHA'} ${t}`);
await p.locator('#folhaFaces').screenshot({ path: join(destino, '16-faces.png') });
await p.locator('#naipes').screenshot({ path: join(destino, '17-naipes.png') });
await nav.close();
console.log(`capturas em ${destino}`);
