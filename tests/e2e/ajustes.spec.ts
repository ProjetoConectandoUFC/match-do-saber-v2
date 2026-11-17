import { expect, test, type Page } from '@playwright/test';
import { esperarCartaPousada } from './carta';

// v12.0.0: o painel "Ajustes" (FR-9) substituiu o menu "Configurações" (até a v11.0.0).
const CAMERA_OFF = 'Câmera desativada — jogue pelas setas (Enter para começar)';
const DICA_MAO = 'Arraste a mão para a direita: é verdade · Para a esquerda: é mentira · Duas mãos para cima: saiba mais';

async function abrirSemCamera(page: Page, guardado?: Record<string, string>) {
  await page.addInitScript((dados) => {
    Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia: () => Promise.reject(new Error('x')) } });
    // Só na primeira carga: um reload depois mantém o que o jogo gravou.
    if (dados && !sessionStorage.getItem('semeado')) {
      for (const [k, v] of Object.entries(dados)) localStorage.setItem(k, v);
      sessionStorage.setItem('semeado', 'sim');
    }
  }, guardado);
  await page.goto('/');
  await expect(page.getByText(CAMERA_OFF)).toBeVisible();
}

const resumo = (page: Page, t: string) => page.getByText(t, { exact: true });

/** Joga a partida inteira pelas setas e devolve os títulos da lista do resumo (AC-5.8). */
async function jogarAteOResumo(page: Page, n: number) {
  await page.keyboard.press('Enter');
  for (let i = 0; i < n; i++) {
    await expect(page.locator('article')).toBeVisible();
    await esperarCartaPousada(page);
    await page.keyboard.press(i % 2 ? 'ArrowLeft' : 'ArrowRight');
    await expect(page.locator('article')).toHaveCount(0);                                   // saiu para o feedback
  }
  await expect(page.getByText(new RegExp(`^\\d+ de ${n}$`))).toBeVisible();
  return page.getByRole('region', { name: 'Notícias da rodada' }).getByRole('listitem');
}

test('painel pelo teclado: abrir, mudar, fechar, lembrar e bloquear na partida (AC-9.1 a AC-9.6, AC-9.14, AC-9.17)', async ({ page }) => {
  await abrirSemCamera(page);
  const painel = page.getByRole('dialog', { name: 'Ajustes' });
  await expect(resumo(page, 'Modo: Corpo · 10 notícias · 15 s por card · Som: ligado')).toBeVisible();   // AC-9.4

  await page.keyboard.press('m');
  await expect(painel).toBeVisible();                                                       // AC-9.1
  await expect(painel.getByRole('heading', { level: 3 })).toHaveText(['Partida', 'Conteúdo', 'Detecção', 'Mídia', 'Questões']);
  await expect(painel.getByText(/^12 jogáveis de 15 no banco \(1 oculta\)$/)).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(painel).toBeHidden();                                                        // AC-9.3

  await page.keyboard.press('m');
  await page.keyboard.press('ArrowDown');                                                   // Tempo por card
  await page.keyboard.press('ArrowRight');                                                  // 15 → 20 s
  for (let i = 0; i < 5; i++) await page.keyboard.press('ArrowDown');                       // … Modo de jogo
  await page.keyboard.press('ArrowRight');                                                  // Corpo → Mão
  await page.keyboard.press('Enter');                                                       // fecha (AC-9.3)
  await expect(painel).toBeHidden();
  await expect(page.locator('article')).toHaveCount(0);                                     // Enter do painel não inicia
  await expect(resumo(page, 'Modo: Mão · 10 notícias · 20 s por card · Som: ligado')).toBeVisible();   // AC-9.2

  await page.keyboard.press('m');
  await page.keyboard.press('ArrowDown');
  for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowLeft');                       // 20 → 15 → 10, e fica (AC-9.17)
  await page.keyboard.press('m');                                                           // M também fecha
  await expect(resumo(page, 'Modo: Mão · 10 notícias · 10 s por card · Som: ligado')).toBeVisible();

  await page.reload();
  await expect(page.getByText(CAMERA_OFF)).toBeVisible();
  await expect(resumo(page, 'Modo: Mão · 10 notícias · 10 s por card · Som: ligado')).toBeVisible();   // AC-9.5

  await page.keyboard.press('Enter');
  const card = page.locator('article');
  await expect(card).toBeVisible();
  await expect(page.getByRole('timer', { name: 'Tempo restante' })).toHaveText(/^(10|9|8) s$/);   // AC-9.17 (relógio real)
  const dica = page.getByText(DICA_MAO);
  await expect(dica).toBeVisible();                                                         // AC-9.14
  const [a, b] = [(await dica.boundingBox())!, (await card.boundingBox())!];
  expect(a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y).toBe(true); // FR-4
  await page.keyboard.press('m');
  await expect(painel).toHaveCount(0);                                                      // AC-9.6
});

test('FR-9: as cinco configurações guardadas até a v11.0.0 continuam valendo', async ({ page }) => {
  await abrirSemCamera(page, {
    'match-do-saber:modo': 'cabeca', 'match-do-saber:tempoCard': '25', 'match-do-saber:som': 'desligado',
    'match-do-saber:foto': 'desligada', 'match-do-saber:tutorial': 'desligado',
  });
  // Foto desligada está fora do padrão e fora do resumo: "Ajustes personalizados" (AC-9.2).
  await expect(resumo(page, 'Modo: Cabeça · 10 notícias · 25 s por card · Som: desligado · Ajustes personalizados')).toBeVisible();
  await page.keyboard.press('m');
  const painel = page.getByRole('dialog', { name: 'Ajustes' });
  await expect(painel.getByRole('group', { name: 'Foto no resumo' }).getByRole('button', { name: '◉ Desligada' })).toBeVisible();
});

test('pelo mouse, via ☰ › Ajustes (AC-9.2, FR-14), e setas no modo Cabeça (AC-9.16)', async ({ page }) => {
  await abrirSemCamera(page);
  await page.getByRole('button', { name: 'Menu' }).click();
  await page.getByRole('menuitem', { name: /Ajustes/ }).click();
  const painel = page.getByRole('dialog', { name: 'Ajustes' });
  await painel.getByRole('button', { name: '○ Cabeça' }).click();
  await expect(painel.getByRole('button', { name: '◉ Cabeça' })).toBeVisible();
  await painel.getByRole('button', { name: 'Fechar' }).click();
  await expect(painel).toBeHidden();
  await page.keyboard.press('Enter');
  await expect(page.getByText('Saiba mais: levante o queixo (ou ↑)')).toBeVisible();
  await expect(painel).toHaveCount(0);
  await esperarCartaPousada(page);
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('article')).toHaveCount(0);                                     // escolheu: foi para o feedback
});

test('AC-9.18: ☰ no canto superior direito; Ajustes abre um painel lateral à direita, com rolagem', async ({ page }) => {
  await abrirSemCamera(page);
  const vp = page.viewportSize()!;
  const botao = page.getByRole('button', { name: 'Menu' });
  const b = (await botao.boundingBox())!;
  expect(b.x + b.width).toBeGreaterThan(vp.width - 48);
  expect(b.y).toBeLessThan(48);
  const iniciar = page.getByRole('button', { name: 'Iniciar', exact: true });
  // A Poppins (local) pode terminar de carregar depois da primeira pintura e mudar a largura do botão.
  await page.evaluate(() => document.fonts.ready);
  const antes = (await iniciar.boundingBox())!;

  await botao.click();
  await page.getByRole('menuitem', { name: /Ajustes/ }).click();
  const painel = page.getByRole('dialog', { name: 'Ajustes' }).locator(':scope > div');
  await expect(painel).toBeVisible();
  await page.waitForTimeout(300);                                                           // fim da animação de entrada
  const p = (await painel.boundingBox())!;
  expect(p.x + p.width).toBeCloseTo(vp.width, 0);                                           // encostado à direita
  expect(p.y).toBeCloseTo(0, 0);
  expect(p.height).toBeCloseTo(vp.height, 0);                                               // altura da tela
  expect(p.width).toBeLessThanOrEqual(26 * 16 + 1);                                         // até 26rem
  expect(await painel.evaluate((e) => getComputedStyle(e).overflowY)).toBe('auto');         // rolagem própria
  await expect(page.getByRole('button', { name: 'Restaurar padrão' })).toBeAttached();
  expect((await iniciar.boundingBox())!).toEqual(antes);                                    // Iniciar não sai do lugar
  await page.getByRole('button', { name: 'Fechar' }).click();
  await expect(page.getByRole('dialog', { name: 'Ajustes' })).toBeHidden();
});

test('AC-9.23/AC-6.1: partida com 5 notícias; a oculta nunca entra (AC-7.12)', async ({ page }) => {
  test.setTimeout(90_000);
  await abrirSemCamera(page, { 'match-do-saber:noticiasPorPartida': '5' });
  await expect(resumo(page, 'Modo: Corpo · 5 notícias · 15 s por card · Som: ligado')).toBeVisible();
  const linhas = await jogarAteOResumo(page, 5);
  await expect(linhas).toHaveCount(5);
  await expect(linhas.filter({ hasText: 'Notícia oculta' })).toHaveCount(0);
});

test('AC-9.23/AC-6.1: partida com 12 notícias usa as 12 visíveis, sem a oculta (AC-7.7, AC-7.12)', async ({ page }) => {
  test.setTimeout(150_000);
  await abrirSemCamera(page);
  await page.keyboard.press('m');
  await page.getByRole('dialog', { name: 'Ajustes' }).getByRole('group', { name: 'Notícias por partida' }).getByRole('button', { name: '○ 12' }).click();
  await page.keyboard.press('Escape');
  await expect(resumo(page, 'Modo: Corpo · 12 notícias · 15 s por card · Som: ligado')).toBeVisible();
  const linhas = await jogarAteOResumo(page, 12);
  await expect(linhas).toHaveCount(12);
  await expect(linhas.filter({ hasText: 'Notícia oculta' })).toHaveCount(0);
});

test('AC-9.27: com só o tema Saúde ligado, a partida usa só as notícias de saúde (sem a oculta); AC-6.4 com filtro vazio', async ({ page }) => {
  test.setTimeout(60_000);
  await abrirSemCamera(page);
  await page.keyboard.press('m');
  const painel = page.getByRole('dialog', { name: 'Ajustes' });
  const temas = painel.getByRole('group', { name: 'Temas' });
  await expect(temas.getByRole('button', { name: /Saúde \(2\)/ })).toBeVisible();         // a oculta não conta
  for (const t of ['Ciência', 'História', 'Tecnologia', 'Curiosidades', 'Meio ambiente', 'Política']) {
    await temas.getByRole('button', { name: new RegExp(`^◉ ${t} \\(`) }).click();
  }
  await expect(painel.getByText(/^2 jogáveis de 15 no banco/)).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(resumo(page, 'Modo: Corpo · 10 notícias · 15 s por card · Som: ligado · Ajustes personalizados')).toBeVisible();
  const linhas = await jogarAteOResumo(page, 2);
  await expect(linhas).toHaveCount(2);
  await expect(linhas.filter({ hasText: 'Notícia oculta' })).toHaveCount(0);
  await page.keyboard.press('Escape');                                                      // sai do resumo (FR-10)

  // Em Saúde, teste-1 é fácil e teste-8 é médio: com "Só difícil" não sobra nenhuma (AC-6.4).
  await page.keyboard.press('m');
  await painel.getByRole('group', { name: 'Dificuldade' }).getByRole('button', { name: '○ Só difícil' }).click();
  await page.keyboard.press('Escape');
  await expect(page.getByText('Nenhuma notícia para os ajustes atuais: revise Ajustes › Conteúdo')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Iniciar', exact: true })).toBeDisabled();
});

test('AC-9.30: "Restaurar padrão" com confirmação volta tudo ao padrão', async ({ page }) => {
  await abrirSemCamera(page, { 'match-do-saber:modo': 'mao', 'match-do-saber:volume': 'baixo', 'match-do-saber:noticiasPorPartida': '8' });
  await expect(resumo(page, 'Modo: Mão · 8 notícias · 15 s por card · Som: ligado · Ajustes personalizados')).toBeVisible();
  await page.keyboard.press('m');
  await page.keyboard.press('ArrowUp');                                                     // de Notícias por partida, em volta, até Restaurar padrão
  await page.keyboard.press(' ');
  await expect(page.getByRole('alertdialog', { name: 'Restaurar padrão' })).toBeVisible();
  await page.keyboard.press(' ');
  await page.keyboard.press('Escape');
  await expect(resumo(page, 'Modo: Corpo · 10 notícias · 15 s por card · Som: ligado')).toBeVisible();
  await page.reload();
  await expect(resumo(page, 'Modo: Corpo · 10 notícias · 15 s por card · Som: ligado')).toBeVisible();
});
