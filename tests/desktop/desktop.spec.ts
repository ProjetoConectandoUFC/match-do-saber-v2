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

test('AC-16.5/AC-7.6: no painel Questões, ocultar e aprovar gravam o arquivo com backup antes; AC-16.2: fonte abre fora', async () => {
  const page = await app.firstWindow();
  await expect(page.getByRole('button', { name: 'Iniciar', exact: true })).toBeEnabled({ timeout: 20_000 });
  const original = readFileSync(arquivo(), 'utf8');

  await page.getByRole('button', { name: 'Menu' }).click();
  await page.getByRole('menuitem', { name: /Questões/ }).click();
  const painel = page.getByRole('dialog', { name: 'Questões' });
  await expect(painel).toContainText('15 no banco · 12 jogáveis · 1 oculta · 1 rascunho');
  const aberta = painel.getByRole('region', { name: 'Questão aberta' });
  await expect(aberta).toHaveAttribute('data-id', 'teste-1');

  // AC-16.2: o link vai para o processo principal (shell.openExternal), não navega a janela do jogo.
  const pedidos = await app.evaluate(({ shell }) => {
    const g = globalThis as unknown as { links: string[] };
    g.links = [];
    shell.openExternal = async (url: string) => { g.links.push(url); };
    return g.links.length;
  });
  expect(pedidos).toBe(0);
  await aberta.getByRole('link', { name: 'https://exemplo.org/fonte' }).click();
  await expect.poll(() => app.evaluate(() => (globalThis as unknown as { links: string[] }).links)).toEqual(['https://exemplo.org/fonte']);
  expect(page.url()).toMatch(/^http:\/\/127\.0\.0\.1:\d+\/$/);
  expect(app.windows()).toHaveLength(1);

  // Ocultar.
  await aberta.getByRole('button', { name: 'Ocultar' }).click();
  await expect(painel.getByRole('status')).toHaveText('Questão oculta.');
  await expect(painel).toContainText('15 no banco · 11 jogáveis · 2 ocultas');
  const depoisDeOcultar = readFileSync(arquivo(), 'utf8');
  expect(lerCsv(depoisDeOcultar).find((n) => n.id === 'teste-1')!.visivel).toBe('nao');

  // Aprovar o rascunho: pede o nome (uma vez na sessão).
  await painel.getByLabel('Status').selectOption('rascunho');
  await expect(aberta).toHaveAttribute('data-id', 'rascunho-1');
  await aberta.getByRole('button', { name: 'Aprovar' }).click();
  const pedido = page.getByRole('dialog', { name: 'Quem revisou?' });
  await pedido.getByLabel('Nome de quem revisou').fill('Revisora de Teste');
  await pedido.getByRole('button', { name: 'Aprovar' }).click();
  await expect(painel.getByRole('status')).toHaveText('Questão rascunho-1 aprovada.');
  const aprovada = lerCsv(readFileSync(arquivo(), 'utf8')).find((n) => n.id === 'rascunho-1')!;
  expect(aprovada).toMatchObject({ status: 'aprovada', revisado_por: 'Revisora de Teste' });

  // Dois backups: o original e o arquivo depois de ocultar, cada um copiado antes da gravação seguinte.
  const backups = readdirSync(join(dados, 'backups')).sort();
  expect(backups).toHaveLength(2);
  const conteudos = backups.map((b) => readFileSync(join(dados, 'backups', b), 'utf8'));
  expect(conteudos).toContain(original);
  expect(conteudos).toContain(depoisDeOcultar);

  // O jogo usa o banco novo sem reabrir (AC-7.6): 11 depois de ocultar teste-1, mais o rascunho aprovado.
  await page.keyboard.press('Escape');
  await expect(painel).toBeHidden();
  await page.keyboard.press('m');
  await expect(page.getByRole('dialog', { name: 'Ajustes' })).toContainText('12 jogáveis de 15 no banco (2 ocultas)');
});
