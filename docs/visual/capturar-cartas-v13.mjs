// Capturas do JOGO (não da prévia) com as cartas e o fan (v13, Fases 47 e 48), em 1366×768 e 1920×1080:
// espera com o fan, abertura, distribuição, frente, verso, feedback e treino, com o banco padrão (conteudo/noticias.csv).
//   npm run build && npx vite preview --port 4194 --strictPort   (noutro terminal)
//   node docs/visual/capturar-cartas-v13.mjs [http://localhost:4194]
// O relógio da página é o do Playwright (page.clock): o reducer só anda quando o script manda; as animações (Web
// Animations, no compositor) são pausadas no mesmo progresso do estado antes de cada foto.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const aqui = dirname(fileURLToPath(import.meta.url));
const raiz = join(aqui, '..', '..');
const base = process.argv[2] ?? 'http://localhost:4194';
const saida = process.env.CAPTURAS_DIR ?? join(aqui, 'capturas', 'v13-cartas');
const banco = readFileSync(join(raiz, 'conteudo', 'noticias.csv'));

/**
 * Pausa todas as animações no progresso `fracao` (0 a 1) da duração de cada uma (a do estado na hora da foto). Antes,
 * espera o React montar a tela nova: o relógio falso anda na hora, mas a renderização vem logo depois.
 */
const congelar = async (page, fracao) => {
  await page.waitForTimeout(150);
  await congelarJa(page, fracao);
};
const congelarJa = (page, fracao) => page.evaluate((f) => {
  for (const a of document.getAnimations()) {
    const d = Number(a.effect?.getTiming().duration) || 0;
    a.pause();
    if (d) a.currentTime = f * d;
  }
}, fracao);

/** Leva ao fim as animações de uma vez só (carimbada, virada, voo): a foto mostra a tela parada. */
const assentar = (page) => page.evaluate(() => {
  for (const a of document.getAnimations()) if (a.effect?.getTiming().iterations !== Infinity) a.finish();
});

async function abrir(browser, viewport, { reduzir = false } = {}) {
  const page = await browser.newPage({ viewport, reducedMotion: reduzir ? 'reduce' : 'no-preference' });
  await page.route('**/content/noticias.csv', (r) => r.fulfill({ body: banco, contentType: 'text/csv; charset=utf-8' }));
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia: () => Promise.reject(new Error('sem câmera')) } });
    localStorage.setItem('match-do-saber:tutorial', 'ligado'); // o treino entra nas capturas
    // Sorteio repetível: a mesma partida em toda captura.
    let x = 7;
    Math.random = () => { x = (x * 1103515245 + 12345) % 2147483648; return x / 2147483648; };
  });
  await page.clock.install();
  // O relógio do Playwright não para a linha do tempo das animações (compositor): taxa 0 para ela só andar quando o
  // script mandar, no mesmo progresso do estado.
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Animation.enable');
  await cdp.send('Animation.setPlaybackRate', { playbackRate: 0 });
  await page.goto(base);
  await page.getByText('Câmera desativada — jogue pelas setas (Enter para começar)').waitFor();
  await page.evaluate(() => document.fonts.ready);
  // Relógio parado: o jogo só anda com runFor (sem isso, o tempo das fotos também passaria para o reducer).
  await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 100);
  return page;
}

const foto = (page, nome) => page.screenshot({ path: join(saida, nome) });
const tela = (page) => page.locator('[data-tela]').getAttribute('data-tela');

async function serie(browser, viewport, sufixo) {
  const grande = sufixo === '1366x768';
  const page = await abrir(browser, viewport);
  if (grande) {
    await congelar(page, 0.3);
    await foto(page, `20-espera-fan-${sufixo}.png`);
  }
  await page.keyboard.press('Enter');
  await page.clock.runFor(700); // abertura (1500 ms): no meio, aberta por inteiro
  await congelar(page, 700 / 1500);
  if (grande) await foto(page, `21-abertura-${sufixo}.png`);
  await page.clock.runFor(800 + 400); // fim da abertura + 400 ms da distribuição do 1º treino
  await congelar(page, 400 / 900);
  if (grande) await foto(page, `22-distribuicao-treino-${sufixo}.png`);
  await page.clock.runFor(600);
  if (await tela(page) !== 'tutorial') throw new Error(`esperava o treino, veio ${await tela(page)}`);
  await assentar(page);
  await foto(page, `23-treino-${sufixo}.png`);
  // Pula o treino (Enter, AC-15.5) e espera a 1ª notícia pousar.
  await page.keyboard.press('Enter');
  await page.clock.runFor(1000);
  await assentar(page);
  await foto(page, `24-carta-frente-${sufixo}.png`);
  await page.keyboard.press('ArrowUp');
  await page.clock.runFor(50);
  await assentar(page);
  await foto(page, `25-carta-verso-${sufixo}.png`);
  await page.keyboard.press('ArrowRight');
  await page.clock.runFor(700);
  await assentar(page);
  await foto(page, `26-feedback-${sufixo}.png`);
  await page.clock.runFor(3000 + 300); // fim do feedback + 300 ms da próxima carta saindo do fan
  await congelar(page, 300 / 900);
  if (grande) await foto(page, `27-distribuicao-noticia-${sufixo}.png`);
  await page.close();
}

const browser = await chromium.launch();
await serie(browser, { width: 1366, height: 768 }, '1366x768');
await serie(browser, { width: 1920, height: 1080 }, '1920x1080');
await browser.close();
console.log(`capturas em ${saida}`);
