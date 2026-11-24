import { escreverCsv, lerCsv } from '../../src/core/csv';
import { expect, test, type Page } from '@playwright/test';
import { esperarCartaPousada } from './carta';

// v13.4.0 (Story 19, FR-21, Fase 54.7, parte mecânica): intensidade efetiva na raiz e sequência de acertos.
// Os efeitos visuais (Fases 54.3 a 54.5) ganham os próprios E2E com o Agente Visual.
const CAMERA_OFF = 'Câmera desativada — jogue pelas setas (Enter para começar)';

/** Sem câmera; todas as notícias verdadeiras (→ acerta, ← erra) e `ajustes` gravados antes de abrir. */
async function abrir(page: Page, ajustes: Record<string, string> = {}) {
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

test('AC-19.1: sem nada guardado, a intensidade efetiva é Média (data-juice); a escolha nos Ajustes vale na hora', async ({ page }) => {
  await abrir(page);
  await expect(raiz(page)).toHaveAttribute('data-juice', 'media');
  await page.keyboard.press('m');
  const painel = page.getByRole('dialog', { name: 'Ajustes' });
  const efeitos = painel.getByRole('group', { name: 'Intensidade dos efeitos' });
  await expect(efeitos.getByRole('button')).toHaveText(['○ Desligada', '○ Baixa', '◉ Média', '○ Alta']);
  await efeitos.getByRole('button', { name: '○ Alta' }).click();
  await expect(raiz(page)).toHaveAttribute('data-juice', 'alta');
  await painel.getByRole('button', { name: 'Restaurar padrão' }).click();
  await painel.getByRole('button', { name: 'Restaurar', exact: true }).click();
  await expect(raiz(page)).toHaveAttribute('data-juice', 'media');
});

test('AC-19.1: com "reduzir movimento" do sistema, Alta vira Baixa', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await abrir(page, { 'match-do-saber:efeitos': 'alta' });
  await expect(raiz(page)).toHaveAttribute('data-juice', 'baixa');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect(raiz(page)).toHaveAttribute('data-juice', 'alta');
});

test('AC-19.5/AC-19.6: a sequência sobe com acertos seguidos, zera no erro, e o resumo mostra a maior; pontos +1 por acerto', async ({ page }) => {
  test.setTimeout(90_000);
  await abrir(page, { 'match-do-saber:noticiasPorPartida': '5' });
  await page.keyboard.press('Enter');
  const jogadas: [string, number][] = [['ArrowRight', 1], ['ArrowRight', 2], ['ArrowLeft', 0], ['ArrowRight', 1], ['ArrowRight', 2]];
  for (const [tecla, sequencia] of jogadas) {
    await esperarCartaPousada(page);
    await page.keyboard.press(tecla);
    await expect(page.locator('main[data-resultado]')).toHaveAttribute('data-resultado', sequencia ? 'acerto' : 'erro');
    await expect(raiz(page)).toHaveAttribute('data-sequencia', String(sequencia));
  }
  await expect(page.getByText('Fim de')).toBeVisible({ timeout: 10_000 });
  await expect(raiz(page)).not.toHaveAttribute('data-sequencia');
  await expect(page.getByText('4 de 5', { exact: true })).toBeVisible();
  await expect(page.getByText('Maior sequência: 2', { exact: true })).toBeVisible();
});

test('AC-19.8: com a intensidade Desligada, o resumo ainda mostra a maior sequência', async ({ page }) => {
  test.setTimeout(60_000);
  await abrir(page, { 'match-do-saber:noticiasPorPartida': '5', 'match-do-saber:efeitos': 'desligada' });
  await expect(raiz(page)).toHaveAttribute('data-juice', 'desligada');
  await page.keyboard.press('Enter');
  for (let i = 0; i < 5; i++) {
    await esperarCartaPousada(page);
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('main[data-resultado]')).toBeVisible();
  }
  await expect(page.getByText('Maior sequência: 5', { exact: true })).toBeVisible({ timeout: 10_000 });
});
