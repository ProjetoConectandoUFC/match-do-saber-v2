import { mkdirSync } from 'node:fs';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { esperarCartaPousada } from './carta';

// v12.0.0: feedback por resultado (verde/vermelho) e carimbo do veredito por cima do texto (AC-4.1 a AC-4.3, AC-4.9,
// AC-4.10), sem câmera (setas). CAPTURAS_V12=1 grava as capturas em docs/visual/capturas/v12-feedback/.
const CAMERA_OFF = 'Câmera desativada — jogue pelas setas (Enter para começar)';
const CAPTURAS = process.env.CAPTURAS_V12 ? 'docs/visual/capturas/v12-feedback' : null;
if (CAPTURAS) mkdirSync(CAPTURAS, { recursive: true });

const VERDE = 'rgb(56, 188, 100)';    // --cn-acerto #38bc64
const VERMELHO = 'rgb(198, 59, 43)';  // --cn-erro = --cn-coral-hover #c63b2b
const RESULTADO = /^(Acertou!|Errou|Tempo esgotado|Quase!)$/;

async function abrir(page: Page, tutorial = false) {
  await page.addInitScript((t) => {
    Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia: () => Promise.reject(new Error('x')) } });
    if (t) localStorage.setItem('match-do-saber:tutorial', 'ligado');
  }, tutorial);
  await page.goto('/');
  await expect(page.getByText(CAMERA_OFF)).toBeVisible();
}

const caixa = async (l: Locator) => (await l.boundingBox())!;

/** Confere o feedback na tela: cor pelo resultado, sem "match", carimbo por cima de só parte do texto, nada cortado. */
async function conferirFeedback(page: Page) {
  const main = page.locator('main[data-resultado]');
  await expect(main).toBeVisible();
  const resultado = (await main.getAttribute('data-resultado'))!;
  const veredito = (await main.getAttribute('data-veredito'))!;
  const acertou = resultado === 'acerto' || resultado === 'treino-acerto';
  await expect(main).toHaveCSS('background-color', acertou ? VERDE : VERMELHO);
  await expect(main).not.toContainText(/match/i);
  await expect(main.locator('svg[data-icone]')).toHaveCount(0);

  const texto = main.getByRole('heading', { level: 2 });
  await expect(texto).toHaveText(RESULTADO);
  const carimbo = main.locator(`[data-carimbo="${veredito}"]`);
  await expect(carimbo).toHaveText(veredito === 'verdade' ? /verdade/i : /mentira/i);

  // AC-4.9: o carimbo cobre só parte do texto (sobreposição de até 35% da altura) e a metade de baixo do texto fica livre.
  const t = await caixa(texto);
  const c = await caixa(carimbo);
  const sobreposicao = c.y + c.height - t.y;
  expect(sobreposicao).toBeGreaterThan(0);
  expect(sobreposicao).toBeLessThanOrEqual(t.height * 0.35);
  const livre = await page.evaluate(([x, y]) => document.elementFromPoint(x!, y!)?.closest('h2')?.textContent ?? null, [t.x + t.width / 2, t.y + t.height * 0.75]);
  expect(livre).toMatch(RESULTADO);
  // Centro da tela na horizontal.
  const vp = page.viewportSize()!;
  expect(Math.abs(t.x + t.width / 2 - vp.width / 2)).toBeLessThanOrEqual(4);

  // Nada sai da tela nem fica atrás do placar (FR-4).
  const tecnica = await caixa(main.locator('[data-nucleo-feedback] ~ p').last());
  expect(c.y).toBeGreaterThanOrEqual(0);
  expect(tecnica.y + tecnica.height).toBeLessThanOrEqual(vp.height);
  return { resultado, veredito };
}

async function capturar(page: Page, nome: string) {
  if (!CAPTURAS) return;
  await page.waitForTimeout(450); // fim da carimbada
  await page.screenshot({ path: `${CAPTURAS}/${nome}.png` });
}

for (const vp of [{ width: 1366, height: 768 }, { width: 1920, height: 1080 }]) {
  test(`AC-4.1/AC-4.2/AC-4.9: escolhas por seta mostram o feedback por resultado em ${vp.width}×${vp.height}`, async ({ page }) => {
    test.setTimeout(CAPTURAS ? 120_000 : 60_000);
    await page.setViewportSize(vp);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await abrir(page);
    await page.keyboard.press('Enter');
    const vistos = new Set<string>();
    for (let i = 0; i < 6 && vistos.size < 4; i++) {
      await expect(page.locator('article')).toBeVisible();
      await esperarCartaPousada(page);
      await expect(page.getByRole('timer', { name: 'Tempo restante' })).toBeVisible();
      await page.keyboard.press(i % 2 === 0 ? 'ArrowRight' : 'ArrowLeft');
      await expect(page.getByRole('heading', { level: 2, name: RESULTADO })).toBeVisible();
      const { resultado, veredito } = await conferirFeedback(page);
      const chave = `${resultado}-${veredito}`;
      if (!vistos.has(chave)) await capturar(page, `${vp.width === 1366 ? '' : `${vp.width}x${vp.height}-`}${chave}`);
      vistos.add(chave);
      await expect(page.locator('article')).toBeVisible({ timeout: 6000 });
    }
    expect(vistos.size).toBeGreaterThanOrEqual(2);
  });
}

test('AC-4.3/AC-4.9: tempo esgotado fica vermelho, com o texto e o carimbo', async ({ page }) => {
  test.setTimeout(60_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await abrir(page);
  await page.keyboard.press('Enter');
  await expect(page.getByText('Tempo esgotado')).toBeVisible({ timeout: 20_000 }); // v13.0.0: + abertura e distribuição
  const { resultado, veredito } = await conferirFeedback(page);
  expect(resultado).toBe('tempo');
  await capturar(page, `tempo-${veredito}`);
});

test('AC-4.9: a carimbada anima (300 ms) e, com prefers-reduced-motion, aparece já no lugar', async ({ page }) => {
  await abrir(page);
  await page.keyboard.press('Enter');
  await expect(page.locator('article')).toBeVisible();
  await esperarCartaPousada(page);
  await page.keyboard.press('ArrowRight');
  const carimbo = page.locator('[data-carimbo]');
  await expect(carimbo).toBeVisible();
  await expect(carimbo).toHaveCSS('animation-name', /carimbada/);
  await expect(carimbo).toHaveCSS('animation-duration', '0.3s');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(carimbo).toHaveCSS('animation-name', 'none');
});

test('AC-4.10: o feedback do treino usa o mesmo layout (verde ao acertar, vermelho ao errar)', async ({ page }) => {
  test.setTimeout(60_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await abrir(page, true);
  await page.keyboard.press('Enter');
  await expect(page.getByText('Treino 1 de 2')).toBeVisible();
  await esperarCartaPousada(page);
  await page.keyboard.press('ArrowLeft'); // Abacaxi Perfeito é mentira
  await expect(page.getByRole('heading', { level: 2, name: 'Acertou!' })).toBeVisible();
  expect((await conferirFeedback(page)).resultado).toBe('treino-acerto');
  await capturar(page, 'treino-acerto-mentira');
  await expect(page.getByText('Treino 2 de 2')).toBeVisible({ timeout: 6000 });
  await esperarCartaPousada(page);
  await page.keyboard.press('ArrowLeft'); // Seu Caju é verdade
  await expect(page.getByRole('heading', { level: 2, name: 'Quase!' })).toBeVisible();
  expect((await conferirFeedback(page)).resultado).toBe('treino-erro');
  await capturar(page, 'treino-erro-verdade');
});
