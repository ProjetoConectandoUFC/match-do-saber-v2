import { expect, test } from '@playwright/test';
import { esperarCartaPousada } from './carta';

test('AC-8.5 (web): depois de uma visita online, abre e joga offline, com banco e imagens em cache', async ({ page, context }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia: () => Promise.reject(new Error('x')) } });
  });
  await page.goto('/');
  await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.ready;
    return reg.active?.state;
  });
  await page.reload(); // garante que o SW controla a página
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByText('Câmera desativada — jogue pelas setas (Enter para começar)')).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(page.locator('article')).toBeVisible();
  // Nem toda notícia tem imagem (FR-4, v9.0.0): confere direto no cache que as imagens abrem offline.
  const tamanho = await page.evaluate(async () => {
    const b = await (await fetch('content/img/teste-1.webp')).blob();
    const img = await createImageBitmap(b);
    return img.width;
  });
  expect(tamanho).toBeGreaterThan(0);
});

test('AC-8.2: manifest instalável em tela cheia', async ({ request }) => {
  const r = await request.get('/manifest.webmanifest');
  expect(r.ok()).toBe(true);
  const m = await r.json();
  expect(m).toMatchObject({ name: 'Match do Saber', display: 'fullscreen', lang: 'pt-BR' });
  expect(m.icons.map((i: { sizes: string }) => i.sizes)).toEqual(['192x192', '512x512']);
});

test('NFR Security: nenhuma requisição sai do próprio site durante a partida', async ({ page }) => {
  const externas: string[] = [];
  const origem = new URL(test.info().project.use.baseURL!).origin;
  page.on('request', (r) => { if (!r.url().startsWith(origem)) externas.push(r.url()); });
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia: () => Promise.reject(new Error('x')) } });
  });
  await page.goto('/');
  await expect(page.getByText('Câmera desativada — jogue pelas setas (Enter para começar)')).toBeVisible(); // jogo carregado
  await page.keyboard.press('Enter');
  await esperarCartaPousada(page);
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(3500);
  expect(externas).toEqual([]);
  expect(await page.context().cookies()).toEqual([]);
});

test.describe('falha ao carregar o catálogo', () => {
  test.use({ serviceWorkers: 'block' }); // garante que page.route intercepta o fetch do catálogo

  for (const [caso, resposta] of [
    ['404', { status: 404, body: 'não encontrado' }],
    ['CSV sem o cabeçalho do banco', { status: 200, body: 'nome;idade\nAna;3\n' }],
  ] as const) {
    test(`banco ${caso} mostra "Conecte à internet uma vez para baixar o jogo"`, async ({ page }) => {
      await page.route('**/content/noticias.csv', (route) => route.fulfill(resposta));
      await page.route('**/content/noticias.json', (route) => route.fulfill({ status: 404, body: 'não encontrado' }));
      await page.addInitScript(() => {
        Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia: () => Promise.reject(new Error('x')) } });
      });
      await page.goto('/');
      await expect(page.getByText('Conecte à internet uma vez para baixar o jogo')).toBeVisible();
    });
  }
});
