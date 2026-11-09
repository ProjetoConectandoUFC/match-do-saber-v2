import { expect, test } from '@playwright/test';

// AC-2.6/AC-4.5 (v10.0.0): a prévia da câmera é uma camada sobreposta no canto inferior direito;
// o card continua centralizado na área de jogo como se ela não existisse.
test.beforeEach(async ({ page }) => {
  // Câmera simulada: um canvas repintado a cada quadro, entregue como MediaStream.
  await page.addInitScript(() => {
    const getUserMedia = async () => {
      const c = document.createElement('canvas');
      c.width = 1280;
      c.height = 720;
      const g = c.getContext('2d')!;
      let n = 0;
      const pintar = () => {
        g.fillStyle = '#2a9d8f';
        g.fillRect(0, 0, c.width, c.height);
        g.fillStyle = '#ffd166';
        g.fillRect((n++ * 8) % c.width, 300, 120, 120);
        requestAnimationFrame(pintar);
      };
      pintar();
      return c.captureStream(30);
    };
    Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia } });
  });
});

for (const vp of [{ width: 1366, height: 768 }, { width: 1920, height: 1080 }]) {
  test(`AC-2.6/AC-4.5: prévia sobreposta no canto e card centralizado em ${vp.width}×${vp.height}`, async ({ page }) => {
    test.setTimeout(90_000);
    await page.setViewportSize(vp);
    await page.goto('/');
    const previa = page.locator('div:has(> video)');
    await expect(previa).toBeVisible({ timeout: 60_000 });           // câmera "ativa": modelo carregado
    expect(await previa.evaluate((el) => getComputedStyle(el).position)).toBe('fixed');

    await page.keyboard.press('Enter');
    await expect(page.getByText('Fique no centro')).toBeVisible();
    await page.keyboard.press('Enter');                               // pula a calibração (AC-1.8)
    const card = page.locator('article');
    await expect(card).toBeVisible();

    const p = (await previa.boundingBox())!;
    expect(p.x + p.width).toBeGreaterThan(vp.width * 0.95);            // canto inferior direito
    expect(p.y).toBeGreaterThan(vp.height * 0.5);
    const c = (await card.boundingBox())!;
    const barra = (await page.getByRole('timer', { name: 'Tempo restante' }).boundingBox())!;
    expect(Math.abs(c.y + c.height / 2 - barra.y / 2)).toBeLessThanOrEqual(8);   // centro vertical da área de jogo
    expect(Math.abs(c.x + c.width / 2 - vp.width / 2)).toBeLessThanOrEqual(8);   // e horizontal, ignorando a prévia
  });
}
