import { expect, test, type Page } from '@playwright/test';
import { esperarCartaPousada } from './carta';

// v13.2.0 (Story 18, FR-19): troca de interface. v13.4.0 (AC-18.1, Fase 53.3): Cartas é o padrão e os E2E rodam só nela;
// a Clássica fica no app como reserva (aqui só se confere que a troca ainda existe).
const CAMERA_OFF = 'Câmera desativada — jogue pelas setas (Enter para começar)';
const ROTULO = { classica: 'Interface: Clássica', cartas: 'Interface: Cartas' } as const;

async function abrir(page: Page) {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia: () => Promise.reject(new Error('x')) } });
  });
  await page.goto('/');
  await expect(page.getByText(CAMERA_OFF)).toBeVisible();
}

test('AC-18.3 (v13.4.0): sem nada guardado, a espera abre em "Interface: Cartas", com o fan respirando', async ({ page }) => {
  await abrir(page);
  await expect(page.getByText(ROTULO.cartas, { exact: true })).toBeVisible();
  await expect(page.locator('[data-tela="espera"] [data-fan]')).toHaveCount(1);
});

test('AC-18.2: I ainda alterna a interface na espera, fica guardada e a espera mostra na hora', async ({ page }) => {
  await abrir(page);
  await page.keyboard.press('i');
  await expect(page.getByText(ROTULO.classica, { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText(CAMERA_OFF)).toBeVisible(); // tela pronta: o teclado já está ligado
  await expect(page.getByText(ROTULO.classica, { exact: true })).toBeVisible(); // AC-9.5
  await page.keyboard.press('I');
  await expect(page.getByText(ROTULO.cartas, { exact: true })).toBeVisible();
  // Com o menu ☰ aberto, I não troca nada.
  await page.getByRole('button', { name: 'Menu', exact: true }).click();
  await page.keyboard.press('i');
  await page.keyboard.press('Escape');
  await expect(page.getByText(ROTULO.cartas, { exact: true })).toBeVisible();
});

test('AC-18.1 (v13.4.0): "Interface do jogo" é o primeiro item, Cartas marcada e primeiro, Clássica por último; "Restaurar padrão" volta para Cartas', async ({ page }) => {
  await abrir(page);
  await page.keyboard.press('m');
  const painel = page.getByRole('dialog', { name: 'Ajustes' });
  const primeiro = painel.getByRole('group').first();
  await expect(primeiro).toHaveAccessibleName('Interface do jogo');
  await expect(primeiro.getByRole('button')).toHaveText(['◉ Cartas', '○ Clássica']);
  await primeiro.getByRole('button', { name: '○ Clássica' }).click();
  await expect(primeiro.getByRole('button', { pressed: true })).toHaveText('◉ Clássica');
  await painel.getByRole('button', { name: 'Restaurar padrão' }).click();
  await painel.getByRole('button', { name: 'Restaurar', exact: true }).click();
  await expect(primeiro.getByRole('button', { pressed: true })).toHaveText('◉ Cartas');
  await page.keyboard.press('Escape');
  await expect(page.getByText(ROTULO.cartas, { exact: true })).toBeVisible();
});

test('AC-18.5: nas Cartas a partida passa pela abertura e distribui, sem a pilha da Clássica', async ({ page }) => {
  await abrir(page);
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-tela="abertura"]')).toHaveCount(1);
  await expect(page.locator('[data-tela="card"][data-distribuindo]')).toHaveCount(1, { timeout: 5000 });
  await expect(page.locator('[data-carta]')).toHaveCount(1);
  await expect(page.locator('[data-pilha-camada]')).toHaveCount(0);
  await esperarCartaPousada(page);
  await expect(page.locator('[data-interface-jogo="cartas"]')).toHaveCount(1);
});

test('AC-18.7: durante a partida a tecla I não troca a interface', async ({ page }) => {
  await abrir(page);
  await page.keyboard.press('Enter');
  await esperarCartaPousada(page);
  await page.keyboard.press('i');
  await expect(page.locator('[data-interface-jogo="cartas"]')).toHaveCount(1);
  await page.keyboard.press('Escape');
  await expect(page.getByText(ROTULO.cartas, { exact: true })).toBeVisible();
});
