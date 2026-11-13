import { expect, test } from '@playwright/test';
import { esperarCartaPousada } from './carta';

const CAMERA_OFF = 'Câmera desativada — jogue pelas setas (Enter para começar)';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia: () => Promise.reject(new Error('x')) } });
  });
  await page.goto('/');
  await expect(page.getByText(CAMERA_OFF)).toBeVisible();
  await page.keyboard.press('Enter');
  await esperarCartaPousada(page); // v13.0.0: o cronômetro só corre com a carta pousada (AC-17.6)
});

test('AC-2.3/AC-2.10 (v10.1.0): sem pessoa detectada, o card fica no centro, sem deslocar nem girar', async ({ page }) => {
  const card = page.locator('article');
  await expect(card).toBeVisible();
  await page.waitForTimeout(500);
  await expect(card).not.toHaveAttribute('style', /transform|translate|rotate/);
  const { translate, rotate } = await card.evaluate((el) => getComputedStyle(el));
  expect(translate).toBe('none');
  expect(rotate).toBe('none');
});

test('AC-4.6: barra larga na base, diminuindo com o tempo', async ({ page }) => {
  const barra = page.getByRole('timer', { name: 'Tempo restante' });
  await expect(barra).toHaveText(/^1[345] s$/);   // começa perto de 15 s: o relógio é real e, sob carga, a primeira leitura pode atrasar
  const caixa = (await barra.boundingBox())!;
  expect(caixa.width).toBeGreaterThan(1300);
  expect(caixa.height).toBeGreaterThanOrEqual(48);
  const largura = () => barra.locator(':scope > div').evaluate((el) => el.getBoundingClientRect().width);
  const antes = await largura();
  await page.waitForTimeout(2000);
  expect(await largura()).toBeLessThan(antes);
});

test('AC-3.1/AC-4.7 (v5.0.0): com o "saiba mais" aberto a barra continua diminuindo, ele não fecha sozinho e o card pulsa nos últimos 5 s', async ({ page }) => {
  test.setTimeout(30_000);
  const card = page.locator('article');
  const barra = page.getByRole('timer', { name: 'Tempo restante' });
  const largura = () => barra.locator(':scope > div').evaluate((el) => el.getBoundingClientRect().width);
  await page.keyboard.press('ArrowUp');
  await expect(card.getByText('Texto expandido de teste.', { exact: false })).toBeVisible();
  const antes = await largura();
  await page.waitForTimeout(2000);
  expect(await largura()).toBeLessThan(antes);                       // não trava
  await page.waitForTimeout(4500);                                    // passa dos 5 s do antigo fechamento automático
  await expect(card.getByText('Texto expandido de teste.', { exact: false })).toBeVisible();
  await expect(barra).toHaveText(/^[0-9] s$/, { timeout: 10_000 });   // chegou nos últimos segundos
  await expect(page.locator('article')).toHaveClass(/pulsando/);
});

for (const vp of [{ width: 1366, height: 768 }, { width: 1920, height: 1080 }]) {
  test(`AC-4.6/AC-4.5 (v10.0.0, AC-4.8 removido): só a barra da base, card inteiro na área de jogo em ${vp.width}×${vp.height}`, async ({ page }) => {
    await page.setViewportSize(vp);
    const card = page.locator('article');
    const barraTela = page.getByRole('timer', { name: 'Tempo restante' });
    await expect(barraTela).toBeVisible();
    await expect(page.getByRole('timer')).toHaveCount(1);
    await expect(page.getByRole('timer', { name: 'Tempo do card' })).toHaveCount(0);
    const c = (await card.boundingBox())!;
    const t = (await barraTela.boundingBox())!;
    expect(c.y).toBeGreaterThanOrEqual(0);
    expect(c.y + c.height).toBeLessThanOrEqual(t.y);
    for (const el of await card.locator('[data-tema], h2, p').all()) {
      const b = (await el.boundingBox())!;
      expect(b.y + b.height).toBeLessThanOrEqual(c.y + c.height + 1);               // nada do card fica cortado
    }
    await page.keyboard.press('ArrowUp');
    await expect(card.getByText('Texto expandido de teste.', { exact: false })).toBeVisible();
    await expect(page.getByRole('timer')).toHaveCount(1);
  });
}
