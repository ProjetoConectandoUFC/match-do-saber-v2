import { expect, test, type Page } from '@playwright/test';

// Story 15 / FR-16 (v10.2.0, a confirmar pelo responsável): treino antes da partida, desligado por padrão.
const CAMERA_OFF = 'Câmera desativada — jogue pelas setas (Enter para começar)';

async function abrir(page: Page, tutorial: 'ligado' | null) {
  await page.addInitScript((t) => {
    Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia: () => Promise.reject(new Error('x')) } });
    if (t) localStorage.setItem('match-do-saber:tutorial', t);
  }, tutorial);
  await page.goto('/');
  await expect(page.getByText(CAMERA_OFF)).toBeVisible();
}

test('AC-15.1: com o tutorial desligado (padrão), Enter vai direto ao primeiro card', async ({ page }) => {
  await abrir(page, null);
  await page.keyboard.press('Enter');
  await expect(page.getByRole('timer', { name: 'Tempo restante' })).toBeVisible();
  await expect(page.getByText(/^Treino \d de 4$/)).toHaveCount(0);
});

test('AC-15.2 a AC-15.5: com o tutorial ligado, 4 treinos com feedback didático e Enter pula para a partida', async ({ page }) => {
  test.setTimeout(30_000);
  await abrir(page, 'ligado');
  await expect(page.getByText(/Tutorial: ligado$/)).toBeVisible();
  await page.keyboard.press('Enter');

  // Treino 1: Morango Influencer (mentira), sem barra de tempo e sem placar.
  await expect(page.getByText('Treino 1 de 4')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Morango Influencer' })).toBeVisible();
  await expect(page.getByRole('timer')).toHaveCount(0);
  await expect(page.getByText(/^Pontos:/)).toHaveCount(0);
  await page.keyboard.press('ArrowLeft');
  await expect(page.getByText('Acertou!')).toBeVisible();
  await expect(page.getByText('Você foi para a esquerda (corpo ou braço): escolheu Mentira.')).toBeVisible();

  // Treino 2 aparece sozinho depois do feedback (3 s + saída).
  await expect(page.getByText('Treino 2 de 4')).toBeVisible({ timeout: 6000 });
  await page.keyboard.press('ArrowLeft'); // Professora Abelha é verdade: errar ensina o gesto certo
  await expect(page.getByText('Quase!')).toBeVisible();
  await expect(page.getByText('Era Verdade: corpo ou braço para a direita.')).toBeVisible();

  // AC-15.5: Enter pula o resto do treino; a partida começa com o cronômetro cheio e o placar zerado (AC-15.4).
  await page.keyboard.press('Enter');
  await expect(page.getByRole('timer', { name: 'Tempo restante' })).toHaveText(/^1[45] s$/);
  await expect(page.getByText('Pontos: 0')).toBeVisible();
  await expect(page.getByText(/^Treino \d de 4$/)).toHaveCount(0);
});

test('AC-15.5: Esc no treino volta à espera', async ({ page }) => {
  await abrir(page, 'ligado');
  await page.keyboard.press('Enter');
  await expect(page.getByText('Treino 1 de 4')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Iniciar', exact: true })).toBeVisible();
});
