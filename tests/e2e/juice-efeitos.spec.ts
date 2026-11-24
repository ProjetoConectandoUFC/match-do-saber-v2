import { mkdirSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { escreverCsv, lerCsv } from '../../src/core/csv';
import { juiceDaSequencia } from '../../src/core/juice';
import { esperarCartaPousada } from './carta';

// v13.4.0 (Story 19, FR-21, Fase 54.7, parte visual): os efeitos do feedback na tela de verdade, com a sequência, em
// Alta e em Desligada. CAPTURAS_JUICE=1 grava as capturas em docs/visual/capturas/v13-juice/ (1366×768).
const CAMERA_OFF = 'Câmera desativada — jogue pelas setas (Enter para começar)';
const CAPTURAS = process.env.CAPTURAS_JUICE ? 'docs/visual/capturas/v13-juice' : null;
if (CAPTURAS) mkdirSync(CAPTURAS, { recursive: true });

/** Sem câmera; todas as notícias verdadeiras (→ acerta, ← erra) e `ajustes` gravados antes de abrir. */
async function abrir(page: Page, ajustes: Record<string, string>) {
  await page.route('**/content/noticias.csv', async (route) => {
    const r = await route.fetch();
    await route.fulfill({ body: escreverCsv(lerCsv(await r.text()).map((n) => ({ ...n, veredito: 'verdadeira' }))) });
  });
  await page.addInitScript((aj) => {
    Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia: () => Promise.reject(new Error('x')) } });
    for (const [k, v] of Object.entries(aj)) localStorage.setItem(k, v);
  }, ajustes);
  await page.goto('/');
  await expect(page.getByText(CAMERA_OFF)).toBeVisible();
}

const raiz = (page: Page) => page.locator('[data-tela]').first();

/** Joga uma carta e espera o feedback dela montar (a carimbada começa aí). */
async function jogar(page: Page, tecla: 'ArrowRight' | 'ArrowLeft', sequencia: number) {
  await esperarCartaPousada(page);
  await page.keyboard.press(tecla);
  await expect(page.locator('main[data-resultado]')).toBeVisible();
  await expect(raiz(page)).toHaveAttribute('data-sequencia', String(sequencia));
}

/** Animações por script (Web Animations), sem contar as de CSS da v13.3.0. */
const animacoesScript = (page: Page) =>
  page.evaluate(() => document.getAnimations().filter((a) => !(a instanceof CSSAnimation) && !(a instanceof CSSTransition)).length);

/** Para todas as animações no instante `ms` desde que o feedback montou (para as capturas). */
async function congelar(page: Page, ms: number) {
  await page.evaluate((t) => {
    for (const a of document.getAnimations()) { a.pause(); a.currentTime = t; }
  }, ms);
}

async function capturar(page: Page, nome: string, ms: number) {
  if (!CAPTURAS) return;
  await congelar(page, ms);
  await page.screenshot({ path: `${CAPTURAS}/${nome}.png` });
  await page.evaluate(() => { for (const a of document.getAnimations()) a.finish(); });
}

test('AC-19.2 a AC-19.5: em Alta, carimbo com respingo, cascata, confete e pop; "Sequência ×N" a partir de 2; o erro diz "não"', async ({ page }) => {
  test.setTimeout(90_000);
  await abrir(page, { 'match-do-saber:efeitos': 'alta', 'match-do-saber:noticiasPorPartida': '5' });
  await page.keyboard.press('Enter');
  const main = page.locator('main[data-resultado]');

  // 1º acerto: carimbo, respingo, letras em cascata, confete e pop do placar; ainda sem "Sequência".
  await jogar(page, 'ArrowRight', 1);
  await expect(page.getByRole('heading', { level: 2, name: 'Acertou!' })).toHaveText('Acertou!');
  await expect(main.locator('[data-letra]')).toHaveCount(8);
  await expect(main.locator('[data-carimbo] [data-gota]')).toHaveCount(16);
  await expect(main.locator('[data-confete] > *')).toHaveCount(juiceDaSequencia('alta', 1).confetes);
  await expect(main.locator('[data-sequencia-tela]')).toHaveCount(0);
  await expect(main.locator('[data-carimbo]')).toHaveCSS('animation-name', /carimbadaQueda/);
  expect(await animacoesScript(page)).toBeGreaterThan(20);

  // 2º e 3º: "Sequência ×N", e o confete cresce.
  await jogar(page, 'ArrowRight', 2);
  await expect(main.getByText('Sequência ×2')).toBeVisible();
  await jogar(page, 'ArrowRight', 3);
  await expect(main.getByText('Sequência ×3')).toBeVisible();
  await expect(main.locator('[data-confete] > *')).toHaveCount(juiceDaSequencia('alta', 3).confetes);
  // AC-19.7: passado o golpe (≤ 1,2 s do confete + a liberação), nada mais anima: o texto a ler está parado.
  await page.waitForTimeout(1700);
  expect(await page.evaluate(() => document.getAnimations().filter((a) => a.playState === 'running').length)).toBe(0);
  await expect(main.locator('[data-texto-ler]').first()).toHaveCSS('opacity', '1');

  // Erro: sem cascata, sem confete, sem "Sequência"; o núcleo diz "não"; a sequência zera.
  await jogar(page, 'ArrowLeft', 0);
  await expect(page.getByRole('heading', { level: 2, name: 'Errou' })).toBeVisible();
  await expect(main.locator('[data-letra]')).toHaveCount(0);
  await expect(main.locator('[data-confete]')).toHaveCount(0);
  await expect(main.locator('[data-sequencia-tela]')).toHaveCount(0);
  expect(await page.locator('[data-nucleo-feedback]').evaluate((el) => el.getAnimations().length)).toBe(1);
});

test('AC-19.8: em Desligada, a tela da v13.3.0: carimbada de CSS e nenhum efeito, nem "Sequência"', async ({ page }) => {
  test.setTimeout(90_000);
  await abrir(page, { 'match-do-saber:efeitos': 'desligada', 'match-do-saber:noticiasPorPartida': '5' });
  await page.keyboard.press('Enter');
  const main = page.locator('main[data-resultado]');
  for (const [tecla, n] of [['ArrowRight', 1], ['ArrowRight', 2], ['ArrowRight', 3], ['ArrowLeft', 0]] as const) {
    await jogar(page, tecla, n);
    await expect(main.locator('[data-carimbo]')).toHaveCSS('animation-name', /carimbada/);
    await expect(main.locator('[data-carimbo]')).not.toHaveCSS('animation-name', /carimbadaQueda/);
    for (const sel of ['[data-letra]', '[data-gota]', '[data-confete]', '[data-sequencia-tela]', '[data-juice-nucleo]', '[data-texto-ler]']) {
      await expect(main.locator(sel)).toHaveCount(0);
    }
    expect(await animacoesScript(page)).toBe(0);
  }
});

test('capturas (CAPTURAS_JUICE=1): carimbo, acerto com confete, erro com "não", sequência ×3 e resumo, em Média', async ({ page }) => {
  test.skip(!CAPTURAS, 'só gera as capturas com CAPTURAS_JUICE=1');
  test.setTimeout(120_000);
  await abrir(page, { 'match-do-saber:noticiasPorPartida': '5' }); // Média, o padrão
  await page.keyboard.press('Enter');
  // Média: hit-stop 80 → liberação em 135 + 30 + 80 = 245 ms (quadrosJuice.ts).
  await jogar(page, 'ArrowRight', 1);
  await capturar(page, '01-carimbo-caindo', 70);
  await jogar(page, 'ArrowRight', 2);
  await capturar(page, '02-carimbo-hit-stop', 200);
  await jogar(page, 'ArrowRight', 3);
  await capturar(page, '03-acerto-confete-sequencia-x3', 520);
  await jogar(page, 'ArrowLeft', 0);
  await capturar(page, '04-erro-nao', 330);
  await jogar(page, 'ArrowRight', 1);
  await capturar(page, '05-acerto-assentado', 2000);
  await expect(page.getByText('Fim de')).toBeVisible({ timeout: 15_000 });
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${CAPTURAS}/06-resumo-maior-sequencia.png` });
});

test('captura (CAPTURAS_JUICE=1): a carta parada no golpe e amassada antes de sair, no erro', async ({ page }) => {
  test.skip(!CAPTURAS, 'só gera as capturas com CAPTURAS_JUICE=1');
  await abrir(page, { 'match-do-saber:efeitos': 'alta' });
  await page.keyboard.press('Enter');
  await esperarCartaPousada(page);
  await page.keyboard.press('ArrowLeft');
  await expect(page.locator('article[data-juice-saida]')).toHaveCount(1);
  await congelar(page, 90);
  await page.screenshot({ path: `${CAPTURAS}/07-saida-erro-amassada-alta.png` });
});
