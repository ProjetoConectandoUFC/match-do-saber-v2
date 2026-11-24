import { expect, test } from '@playwright/test';

// FR-20 (v13.3.0, Fase 52.3): a detecção roda no Web Worker com o modelo real, inclusive offline (o worker, o WASM e o
// modelo vêm do precache do PWA). Câmera falsa do Chromium; arquivo próprio por causa de `launchOptions`.
test.use({
  launchOptions: { args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] },
  permissions: ['camera'],
});

test('FR-20/AC-8.5: com o PWA em cache, offline, a detecção roda no worker com o modelo real', async ({ page, context }) => {
  test.setTimeout(120_000);
  const externas: string[] = [];
  const origem = new URL(test.info().project.use.baseURL!).origin;
  page.on('request', (r) => { if (!r.url().startsWith(origem)) externas.push(r.url()); });
  await page.goto('/?diagnostico');
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await page.reload(); // o SW passa a controlar a página
  const painel = page.getByRole('complementary', { name: 'Diagnóstico' });
  await expect(painel).toContainText(/aceleração: (⚠ )?worker · /, { timeout: 60_000 });

  await context.setOffline(true);
  await page.reload();
  await expect(painel).toContainText(/aceleração: (⚠ )?worker · /, { timeout: 60_000 });
  await expect(painel).toContainText(/detecção: \d+ ms/, { timeout: 60_000 });
  console.log(`painel offline: ${(await painel.innerText()).split(/\n+/).slice(0, 3).join(' | ')}`);
  expect(externas).toEqual([]);
});
