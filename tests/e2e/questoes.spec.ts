import { expect, test, type Page } from '@playwright/test';

// Painel Questões (Story 16, FR-17) na versão web: só leitura, com o banco do fixture
// (12 aprovadas visíveis, 6 verdadeiras e 6 falsas; rascunho-1, invalida-1 e oculta-1).
const CAMERA_OFF = 'Câmera desativada — jogue pelas setas (Enter para começar)';

async function abrirSemCamera(page: Page) {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia: () => Promise.reject(new Error('x')) } });
  });
  await page.goto('/');
  await expect(page.getByText(CAMERA_OFF)).toBeVisible();
}

test('AC-16.1/AC-16.2/AC-16.6: ☰ › Questões abre lista, questão aberta e contagem; ↑/↓ andam; Esc fecha sem iniciar a partida', async ({ page }) => {
  await abrirSemCamera(page);
  await page.getByRole('button', { name: 'Menu' }).click();
  await page.getByRole('menuitem', { name: /Questões/ }).click();
  const painel = page.getByRole('dialog', { name: 'Questões' });
  await expect(painel).toContainText('15 no banco · 12 jogáveis · 1 oculta · 1 rascunho · 1 inválida · 6 verdadeiras e 6 falsas entre as jogáveis');

  const aberta = painel.getByRole('region', { name: 'Questão aberta' });
  await expect(aberta).toHaveAttribute('data-id', 'teste-1');
  await expect(aberta.getByText('Verdade', { exact: true })).toBeVisible();
  await expect(aberta.getByRole('list', { name: 'Fontes' })).toContainText('Fonte: Agência de Teste');
  const link = aberta.getByRole('link', { name: 'https://exemplo.org/fonte' });
  await expect(link).toHaveAttribute('target', '_blank');
  await expect(aberta).toContainText('Entra nas partidas');

  // AC-16.5: na web, só leitura.
  await expect(painel).toContainText('O gerenciador de notícias está disponível no app de desktop');
  await expect(aberta.getByRole('button', { name: 'Ocultar' })).toBeDisabled();
  await expect(aberta.getByRole('button', { name: 'Editar' })).toBeDisabled();

  await page.keyboard.press('ArrowDown');
  await expect(aberta).toHaveAttribute('data-id', 'teste-2');
  await expect(aberta.getByText('Mentira', { exact: true })).toBeVisible();
  await expect(aberta.getByRole('list', { name: 'Fontes' })).toContainText('Desmentido por: exemplo.org');
  await page.keyboard.press('ArrowUp');
  await expect(aberta).toHaveAttribute('data-id', 'teste-1');

  // AC-16.4: a inválida e a oculta dizem por que não entram.
  await painel.getByRole('button', { name: /Linha inválida/ }).click();
  await expect(aberta.getByRole('list', { name: 'Fora do jogo' })).toContainText('Tema "esporte" não está na lista');
  await painel.getByRole('button', { name: /Notícia oculta/ }).click();
  await expect(aberta.getByRole('list', { name: 'Fora do jogo' })).toContainText('Oculta');

  // AC-16.3: filtros.
  await painel.getByLabel('Só jogáveis').check();
  await expect(painel).toContainText('Mostrando 12 de 15');

  await page.keyboard.press('Enter');                 // FR-14: com o painel aberto, Enter não inicia a partida
  await page.keyboard.press('Escape');
  await expect(painel).toBeHidden();
  await expect(page.getByRole('button', { name: 'Iniciar', exact: true })).toBeVisible();
  await expect(page.locator('article')).toHaveCount(0);
});

test('AC-9.31: Ajustes › Revisar questões fecha os Ajustes e abre Questões já em Rascunho', async ({ page }) => {
  await abrirSemCamera(page);
  await page.keyboard.press('m');
  const ajustes = page.getByRole('dialog', { name: 'Ajustes' });
  await expect(ajustes).toBeVisible();
  await ajustes.getByRole('button', { name: 'Revisar questões' }).click();
  await expect(ajustes).toBeHidden();
  const painel = page.getByRole('dialog', { name: 'Questões' });
  await expect(painel.getByLabel('Status')).toHaveValue('rascunho');
  await expect(painel.getByRole('list', { name: 'Lista de questões' }).getByRole('button')).toHaveCount(1);
  await expect(painel.getByRole('region', { name: 'Questão aberta' })).toHaveAttribute('data-id', 'rascunho-1');
  await expect(painel.getByRole('list', { name: 'Fora do jogo' })).toContainText('Rascunho');
});
