import { expect, test, type Page } from '@playwright/test';

const CAMERA_OFF = 'Câmera desativada — jogue pelas setas (Enter para começar)';

async function abrirSemCamera(page: Page, url = '/') {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia: () => Promise.reject(new Error('x')) } });
  });
  await page.goto(url);
  await expect(page.getByText(CAMERA_OFF)).toBeVisible();
}

test('FR-14: ☰ abre Notícias, Configurações, Diagnóstico e Tela cheia; Esc e clique fora fecham', async ({ page }) => {
  await abrirSemCamera(page);
  const botao = page.getByRole('button', { name: 'Menu' });
  const menu = page.getByRole('menu');
  await botao.click();
  await expect(menu.getByRole('menuitem')).toHaveText([/Notícias/, /Configurações/, /Diagnóstico/, /Tela cheia/]);

  await page.keyboard.press('Enter');                                   // Enter com o menu aberto não inicia
  await page.keyboard.press('Escape');
  await expect(menu).toBeHidden();
  await expect(page.locator('article')).toHaveCount(0);

  await botao.click();
  await page.mouse.click(300, 400);                                     // clique fora
  await expect(menu).toBeHidden();
  await page.keyboard.press('m');                                       // M continua abrindo Configurações
  await expect(page.getByRole('dialog', { name: 'Configurações' })).toBeVisible();
});

test('FR-14: Diagnóstico liga o painel de FR-12 até recarregar', async ({ page }) => {
  await abrirSemCamera(page);
  const diag = page.getByRole('complementary', { name: 'Diagnóstico' });
  await expect(diag).toHaveCount(0);
  await page.getByRole('button', { name: 'Menu' }).click();
  await page.getByRole('menuitem', { name: /Diagnóstico/ }).click();
  await expect(diag).toBeVisible();
  await page.reload();
  await expect(page.getByText(CAMERA_OFF)).toBeVisible();
  await expect(diag).toHaveCount(0);
});

test('FR-14: ☰ some fora da tela de espera', async ({ page }) => {
  await abrirSemCamera(page);
  await page.keyboard.press('Enter');
  await expect(page.locator('article')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Menu' })).toHaveCount(0);
});

test('AC-7.9: na versão web, ☰ › Notícias avisa que o gerenciador está no app de desktop', async ({ page }) => {
  await abrirSemCamera(page);
  await page.getByRole('button', { name: 'Menu' }).click();
  await page.getByRole('menuitem', { name: /Notícias/ }).click();
  const painel = page.getByRole('dialog', { name: 'Notícias' });
  await expect(painel).toContainText('O gerenciador de notícias está disponível no app de desktop');
  await page.keyboard.press('Enter');                                   // painel aberto: Enter não inicia
  await expect(page.locator('article')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(painel).toBeHidden();
  await page.keyboard.press('Enter');                                   // o jogo usa o banco embutido
  await expect(page.locator('article')).toBeVisible();
});
