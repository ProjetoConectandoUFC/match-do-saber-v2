import { _electron as electron, expect, test, type ElectronApplication } from '@playwright/test';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { lerCsv } from '../../src/core/csv';

// App de desktop (FR-8) de verdade: Electron + servidor local + /api/noticias, com a pasta de dados
// numa pasta temporária (MATCH_DO_SABER_DADOS) para não mexer nos Documentos de quem roda o teste.
// Pré-requisito: `npm run fixture && npm run build` (dist/ com o banco de teste).

let dados: string;
let app: ElectronApplication;

test.beforeEach(async () => {
  dados = mkdtempSync(join(tmpdir(), 'mds-desktop-'));
  // Terminais do VS Code herdam ELECTRON_RUN_AS_NODE=1, que faz o Electron rodar como Node puro.
  const { ELECTRON_RUN_AS_NODE: _comoNode, ...env } = process.env;
  app = await electron.launch({
    args: ['.', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
    env: { ...env, MATCH_DO_SABER_DADOS: dados } as Record<string, string>,
  });
});
test.afterEach(async () => {
  await app.close();
  rmSync(dados, { recursive: true, force: true });
});

const arquivo = () => join(dados, 'noticias.csv');

test('AC-8.2/AC-8.3: abre o jogo em janela própria e cria o banco local a partir do embutido', async () => {
  const page = await app.firstWindow();
  await expect(page.getByRole('button', { name: 'Iniciar', exact: true })).toBeEnabled({ timeout: 20_000 });
  expect(page.url()).toMatch(/^http:\/\/127\.0\.0\.1:\d+\/$/);
  expect(existsSync(arquivo())).toBe(true);
  expect(readFileSync(arquivo(), 'utf8')).toBe(readFileSync('dist/content/noticias.csv', 'utf8'));
  expect(await page.evaluate(() => (window as unknown as { matchDoSaber?: { desktop?: boolean } }).matchDoSaber?.desktop)).toBe(true);
  expect(await page.evaluate(() => navigator.serviceWorker.controller)).toBeNull();     // sem service worker no desktop
});

test('AC-7.6/FR-7: gravar pelo painel faz backup antes; AC-8.4: Ctrl+R relê o arquivo editado fora', async () => {
  const page = await app.firstWindow();
  await expect(page.getByRole('button', { name: 'Iniciar', exact: true })).toBeEnabled({ timeout: 20_000 });
  const original = readFileSync(arquivo(), 'utf8');

  await page.getByRole('button', { name: 'Menu' }).click();
  await page.getByRole('menuitem', { name: /Notícias/ }).click();
  const painel = page.getByRole('dialog', { name: 'Notícias' });
  await expect(painel).toContainText(arquivo());
  await painel.getByRole('checkbox', { name: 'Selecionar teste-1', exact: true }).check();
  await painel.getByRole('button', { name: 'Apagar' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Apagar' }).click();
  await expect(painel.getByRole('status')).toHaveText('Notícia apagada.');

  expect(lerCsv(readFileSync(arquivo(), 'utf8')).map((n) => n.id)).not.toContain('teste-1');
  const backups = readdirSync(join(dados, 'backups'));
  expect(backups).toHaveLength(1);
  expect(backups[0]).toMatch(/^noticias-\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}\.csv$/);
  expect(readFileSync(join(dados, 'backups', backups[0]!), 'utf8')).toBe(original);

  // "Excel": só uma notícia, aprovada, com título novo.
  const [primeira] = lerCsv(readFileSync(arquivo(), 'utf8'));
  writeFileSync(arquivo(), `id;titulo;descricao;saiba_mais;veredito;explicacao;tecnica;tema;fonte_url;revisado_por;status\n`
    + `${primeira!.id};Editada no Excel;D;S;${primeira!.veredito};E;fonte;saude;https://exemplo.org;Ana;aprovada\n`);
  await page.keyboard.press('Escape');
  await page.reload(); // o que o Ctrl+R faz (before-input-event não recebe teclas simuladas pelo Playwright)
  await expect(page.getByRole('button', { name: 'Iniciar', exact: true })).toBeEnabled({ timeout: 20_000 });
  await page.getByRole('button', { name: 'Iniciar', exact: true }).click();
  await page.keyboard.press('Enter'); // pula a calibração (câmera falsa ligada)
  await expect(page.locator('article')).toContainText('Editada no Excel', { timeout: 10_000 });
});
