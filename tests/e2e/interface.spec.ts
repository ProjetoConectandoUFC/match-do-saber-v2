import { expect, test, type Page } from '@playwright/test';
import { esperarCartaPousada, interfaceDoProjeto } from './carta';

// v13.2.0 (Story 18, FR-19): troca de interface Clássica × Cartas para o teste A/B. Roda nos dois projetos; cada um
// começa com a sua interface gravada no localStorage (playwright.config.ts).
const CAMERA_OFF = 'Câmera desativada — jogue pelas setas (Enter para começar)';
const ROTULO = { classica: 'Interface: Clássica', cartas: 'Interface: Cartas' } as const;
const OUTRA = { classica: 'cartas', cartas: 'classica' } as const;

async function abrir(page: Page) {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia: () => Promise.reject(new Error('x')) } });
  });
  await page.goto('/');
  await expect(page.getByText(CAMERA_OFF)).toBeVisible();
}

test('AC-18.3: a espera mostra a interface ativa; fan respirando só nas Cartas', async ({ page }) => {
  const iface = interfaceDoProjeto();
  await abrir(page);
  await expect(page.getByText(ROTULO[iface], { exact: true })).toBeVisible();
  await expect(page.locator('[data-tela="espera"] [data-fan]')).toHaveCount(iface === 'cartas' ? 1 : 0);
});

test('AC-18.2: I alterna a interface na espera, fica guardada e a espera mostra na hora', async ({ page }) => {
  const iface = interfaceDoProjeto();
  await abrir(page);
  await page.keyboard.press('i');
  await expect(page.getByText(ROTULO[OUTRA[iface]], { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText(CAMERA_OFF)).toBeVisible(); // tela pronta: o teclado já está ligado
  await expect(page.getByText(ROTULO[OUTRA[iface]], { exact: true })).toBeVisible(); // AC-9.5
  await page.keyboard.press('I');
  await expect(page.getByText(ROTULO[iface], { exact: true })).toBeVisible();
  // Com o menu ☰ aberto, I não troca nada.
  await page.getByRole('button', { name: 'Menu', exact: true }).click();
  await page.keyboard.press('i');
  await page.keyboard.press('Escape');
  await expect(page.getByText(ROTULO[iface], { exact: true })).toBeVisible();
});

test('AC-18.1: "Interface do jogo" é o primeiro item dos Ajustes e "Restaurar padrão" volta para Clássica', async ({ page }) => {
  const iface = interfaceDoProjeto();
  await abrir(page);
  await page.keyboard.press('m');
  const painel = page.getByRole('dialog', { name: 'Ajustes' });
  const primeiro = painel.getByRole('group').first();
  await expect(primeiro).toHaveAccessibleName('Interface do jogo');
  await expect(primeiro.getByRole('button', { pressed: true })).toHaveText(iface === 'cartas' ? '◉ Cartas' : '◉ Clássica');
  await painel.getByRole('button', { name: 'Restaurar padrão' }).click();
  await painel.getByRole('button', { name: 'Restaurar', exact: true }).click();
  await expect(primeiro.getByRole('button', { pressed: true })).toHaveText('◉ Clássica');
  await page.keyboard.press('Escape');
  await expect(page.getByText(ROTULO.classica, { exact: true })).toBeVisible();
});

test('AC-18.4/AC-18.5: Clássica vai direto ao card, com a pilha; Cartas passa pela abertura e distribui', async ({ page }) => {
  const iface = interfaceDoProjeto();
  await abrir(page);
  await page.keyboard.press('Enter');
  if (iface === 'classica') {
    await expect(page.locator('[data-tela="card"]')).toHaveCount(1);
    await expect(page.locator('[data-tela="abertura"], [data-distribuindo]')).toHaveCount(0);
    await expect(page.locator('[data-pilha-camada]')).toHaveCount(2);
    await expect(page.locator('[data-fan]')).toHaveCount(0);
    await expect(page.locator('article').getByText('Saiba mais:', { exact: false })).toBeVisible(); // dica no card
  } else {
    await expect(page.locator('[data-tela="abertura"]')).toHaveCount(1);
    await expect(page.locator('[data-tela="card"][data-distribuindo]')).toHaveCount(1, { timeout: 5000 });
    await expect(page.locator('[data-carta]')).toHaveCount(1);
    await expect(page.locator('[data-pilha-camada]')).toHaveCount(0);
  }
  await esperarCartaPousada(page);
  await expect(page.locator(`[data-interface-jogo="${iface}"]`)).toHaveCount(1);
});

test('AC-18.7: durante a partida a tecla I não troca a interface', async ({ page }) => {
  const iface = interfaceDoProjeto();
  await abrir(page);
  await page.keyboard.press('Enter');
  await esperarCartaPousada(page);
  await page.keyboard.press('i');
  await expect(page.locator(`[data-interface-jogo="${iface}"]`)).toHaveCount(1);
  await page.keyboard.press('Escape');
  await expect(page.getByText(ROTULO[iface], { exact: true })).toBeVisible();
});
