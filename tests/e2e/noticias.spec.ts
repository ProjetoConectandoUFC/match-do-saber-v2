import { expect, test, type Page } from '@playwright/test';
import { escreverCsv, lerCsv } from '../../src/core/csv';
import type { NoticiaBanco } from '../../src/core/types';

// O painel Notícias completo só existe no app de desktop (FR-7). Aqui o navegador finge ser o app:
// `window.matchDoSaber.desktop` (o que o preload do Electron expõe) e um /api/noticias em memória.
test.use({ serviceWorkers: 'block' });

const n = (i: number, extra: Partial<NoticiaBanco> = {}): NoticiaBanco => ({
  id: `mds-${String(i).padStart(4, '0')}`, titulo: `Notícia ${i}`, descricao: 'Descrição', saiba_mais: 'Saiba mais',
  veredito: i % 2 ? 'falsa' : 'verdadeira', explicacao: 'Explicação', tecnica: 'fonte', tema: 'ciencia',
  fonte_url: 'https://exemplo.org', fontes_extras: '', imagem: '', revisado_por: 'Ana', status: 'aprovada', dificuldade: '', titulo_curto: '', fonte_nome: '', visivel: '', ...extra,
});

async function abrirDesktop(page: Page, banco: NoticiaBanco[]) {
  const disco = { csv: escreverCsv(banco), versao: 1, gravacoes: 0 };
  await page.route('**/api/noticias', async (route) => {
    const r = route.request();
    if (r.method() === 'PUT') {
      const corpo = r.postDataJSON() as { versao: string; csv: string };
      if (corpo.versao !== String(disco.versao)) return route.fulfill({ status: 409, json: { erro: 'o arquivo mudou fora do painel' } });
      disco.csv = corpo.csv;
      disco.versao += 1;
      disco.gravacoes += 1;
    }
    return route.fulfill({ json: { arquivo: 'C:/Documentos/Match do Saber/noticias.csv', versao: String(disco.versao), csv: disco.csv } });
  });
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia: () => Promise.reject(new Error('x')) } });
    (window as unknown as { matchDoSaber: unknown }).matchDoSaber = { desktop: true };
  });
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Iniciar', exact: true })).toBeVisible();          // jogo carregado
  return disco;
}

async function abrirPainel(page: Page) {
  await page.getByRole('button', { name: 'Menu' }).click();
  await page.getByRole('menuitem', { name: /Notícias/ }).click();
  return page.getByRole('dialog', { name: 'Notícias' });
}

test('AC-7.1/AC-7.2/AC-7.6: nova notícia aprovada entra na próxima partida, sem recarregar', async ({ page }) => {
  // Só rascunhos: nenhuma notícia publicada, Iniciar desativado (AC-7.7).
  const disco = await abrirDesktop(page, [n(1, { status: 'rascunho', revisado_por: '' })]);
  await expect(page.getByRole('button', { name: 'Iniciar', exact: true })).toBeDisabled();
  await expect(page.getByText('Nenhuma notícia publicada')).toBeVisible();

  const painel = await abrirPainel(page);
  await expect(painel).toContainText('1 notícia · 0 verdadeiras · 1 falsa · 0 no jogo');
  await painel.getByRole('button', { name: 'Nova notícia' }).click();
  const editor = page.getByRole('dialog', { name: 'Nova notícia' });
  await expect(editor.getByLabel('ID')).toHaveValue('mds-0002');
  await editor.getByLabel('Título', { exact: true }).fill('Beber água ajuda o cérebro'); // v11.0.0: há também "Título curto (opcional)"
  await editor.getByLabel('Descrição').fill('Desidratação leve afeta a atenção.');
  await editor.getByLabel('Saiba mais').fill('Estudos mostram que…');
  await editor.getByLabel('Veredito').selectOption('verdadeira');
  await editor.getByLabel('Explicação').fill('É verdade, segundo estudos.');
  await editor.getByLabel('Técnica').selectOption('fonte');
  await editor.getByLabel('Tema').selectOption('saude');
  await editor.getByLabel('Fonte (link)').fill('https://exemplo.org/agua');
  await editor.getByLabel('Status').selectOption('aprovada');
  await editor.getByRole('button', { name: 'Salvar' }).click();
  await expect(editor.getByLabel('Revisado por')).toHaveAttribute('aria-invalid', 'true');   // AC-7.3
  expect(disco.gravacoes).toBe(0);
  await editor.getByLabel('Revisado por').fill('Equipe Conectando');
  await editor.getByRole('button', { name: 'Salvar' }).click();
  await expect(editor).toBeHidden();
  await expect(painel.getByRole('status')).toHaveText('Notícia adicionada.');
  expect(disco.gravacoes).toBe(1);
  expect(lerCsv(disco.csv).map((x) => x.id)).toEqual(['mds-0001', 'mds-0002']);

  await page.keyboard.press('Escape');
  await expect(painel).toBeHidden();
  await expect(page.getByText('Câmera desativada — jogue pelas setas (Enter para começar)')).toBeVisible();
  await page.keyboard.press('Enter');                                                       // AC-7.6
  await expect(page.locator('article')).toContainText('Beber água ajuda o cérebro');
});

test('AC-7.5: importar CSV com prévia; AC-7.4: apagar selecionadas', async ({ page }) => {
  const disco = await abrirDesktop(page, [n(1), n(2)]);
  const painel = await abrirPainel(page);
  const csv = escreverCsv([n(2), n(3), n(4, { tema: 'esporte' })]);
  await painel.getByLabel('Importar CSV').setInputFiles({ name: 'lote.csv', mimeType: 'text/csv', buffer: Buffer.from(csv) });
  const previa = page.getByRole('dialog', { name: 'Importar CSV' });
  await expect(previa).toContainText('1 nova');
  await expect(previa).toContainText('1 já existe');
  await expect(previa).toContainText('1 inválida');
  await previa.getByRole('button', { name: 'Adicionar 1' }).click();
  await expect(previa).toBeHidden();
  expect(lerCsv(disco.csv).map((x) => x.id)).toEqual(['mds-0001', 'mds-0002', 'mds-0003']);

  await painel.getByRole('checkbox', { name: 'Selecionar mds-0001' }).check();
  await painel.getByRole('checkbox', { name: 'Selecionar mds-0003' }).check();
  await painel.getByRole('button', { name: 'Apagar' }).click();
  const confirmar = page.getByRole('alertdialog');
  await expect(confirmar).toContainText('Apagar 2 notícias?');
  await confirmar.getByRole('button', { name: 'Apagar' }).click();
  await expect(painel.getByRole('status')).toHaveText('2 notícias apagadas.');
  expect(lerCsv(disco.csv).map((x) => x.id)).toEqual(['mds-0002']);
});

test('arquivo alterado fora do painel: gravação recusada com o motivo', async ({ page }) => {
  const disco = await abrirDesktop(page, [n(1), n(2)]);
  const painel = await abrirPainel(page);
  await expect(painel).toContainText('2 notícias');
  disco.versao += 1;                                                                         // "Excel" gravou
  await painel.getByRole('checkbox', { name: 'Selecionar mds-0001' }).check();
  await painel.getByRole('button', { name: 'Apagar' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Apagar' }).click();
  await expect(painel.getByRole('alert')).toHaveText('Não foi possível salvar: o arquivo mudou fora do painel');
  expect(disco.gravacoes).toBe(0);
});
