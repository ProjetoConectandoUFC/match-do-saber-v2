import { expect, test, type Page } from '@playwright/test';
import { esperarCartaPousada } from './carta';

// Fase 48 (v13.0.0/v13.1.0): o fan na espera, na abertura e na distribuição (AC-17.3 a AC-17.7, FR-18).
const CAMERA_OFF = 'Câmera desativada — jogue pelas setas (Enter para começar)';

async function abrir(page: Page, ajustes: Record<string, string> = {}) {
  await page.addInitScript((a) => {
    Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia: () => Promise.reject(new Error('x')) } });
    for (const [k, v] of Object.entries(a)) localStorage.setItem(`match-do-saber:${k}`, v);
  }, ajustes);
  await page.goto('/');
  await expect(page.getByText(CAMERA_OFF)).toBeVisible();
}

const raiz = (page: Page) => page.locator('[data-tela]');
const cartasDoFan = (page: Page) => page.locator('[data-fan] [data-fan-carta]');

/**
 * Nenhum ponto da caixa de `alvo` (grade 5×5, por dentro) tem uma carta do fan: `porCima` = desenhada por cima do alvo
 * (AC-17.3, FR-18 must not); `atras` = nem mesmo atrás dele (espera, AC-17.4). O fan não recebe clique
 * (`pointer-events: none`); só no teste ele passa a ser "atingível", para o navegador dizer exatamente onde está.
 */
async function fanNaoCobre(page: Page, alvo: string, modo: 'porCima' | 'atras' = 'porCima') {
  const cobertos = await page.evaluate(([sel, m]) => {
    const estilo = document.createElement('style');
    estilo.textContent = '[data-fan], [data-fan] * { pointer-events: auto !important; }';
    document.head.append(estilo);
    const out: string[] = [];
    for (const el of document.querySelectorAll(sel)) {
      const r = el.getBoundingClientRect();
      for (let i = 0; i < 5; i++) {
        for (let j = 0; j < 5; j++) {
          const x = r.left + ((i + 0.5) / 5) * r.width;
          const y = r.top + ((j + 0.5) / 5) * r.height;
          const pilha = m === 'porCima' ? [document.elementFromPoint(x, y)] : document.elementsFromPoint(x, y);
          if (pilha.some((e) => e?.closest('[data-fan]'))) out.push(`${sel} @ ${Math.round(x)},${Math.round(y)}`);
        }
      }
    }
    estilo.remove();
    return out;
  }, [alvo, modo] as const);
  expect(cobertos).toEqual([]);
}

test('48.6: partida de 5 notícias com tutorial — o fan começa com 7 cartas e perde uma a cada carta; o cronômetro só começa com a carta pousada', async ({ page }) => {
  test.setTimeout(60_000);
  await abrir(page, { tutorial: 'ligado', noticiasPorPartida: '5' });
  await page.keyboard.press('Enter');

  // Abertura (AC-17.5): o fan com todas as cartas (2 treinos + 5 notícias), sem cronômetro nem placar.
  await expect(raiz(page)).toHaveAttribute('data-tela', 'abertura');
  await expect(cartasDoFan(page)).toHaveCount(7);
  await expect(page.getByRole('timer')).toHaveCount(0);
  await expect(page.getByText(/^Pontos:/)).toHaveCount(0);

  // Treinos: cada um sai do fan (6, depois 5).
  for (const [treino, restam] of [[1, 6], [2, 5]] as const) {
    await expect(page.getByText(`Treino ${treino} de 2`)).toBeVisible();
    await expect(cartasDoFan(page)).toHaveCount(restam);
    await esperarCartaPousada(page);
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('[data-resultado^="treino-"]')).toBeVisible();
  }

  // Notícias: 4, 3, 2, 1, 0 no fan; durante a distribuição a barra fica cheia e parada.
  for (const restam of [4, 3, 2, 1, 0]) {
    await expect(raiz(page)).toHaveAttribute('data-tela', 'card', { timeout: 10_000 });
    await expect(raiz(page)).toHaveAttribute('data-cartas-no-fan', String(restam));
    await expect(cartasDoFan(page)).toHaveCount(restam);
    if (await page.locator('article[data-distribuindo]').count()) {
      await expect(page.getByRole('timer', { name: 'Tempo restante' })).toHaveText('15 s');
    }
    await esperarCartaPousada(page);
    await page.keyboard.press('ArrowLeft');
    await expect(page.locator('[data-resultado]')).toBeVisible();
  }
  await expect(page.getByText('Fim de')).toBeVisible({ timeout: 10_000 });
  await expect(page.locator('[data-fan]')).toHaveCount(0); // FR-18: nada de fan no resumo
});

test('48.6/AC-17.5: Esc na abertura volta à espera', async ({ page }) => {
  await abrir(page);
  await page.keyboard.press('Enter');
  await expect(raiz(page)).toHaveAttribute('data-tela', 'abertura');
  await page.keyboard.press('Escape');
  await expect(raiz(page)).toHaveAttribute('data-tela', 'espera');
  await expect(page.getByText(CAMERA_OFF)).toBeVisible();
});

test('48.5/AC-17.3: o fan fica atrás da carta e não cobre a barra de tempo, os botões redondos, o "✕ Sair", a manchete nem as dicas', async ({ page }) => {
  await abrir(page);
  await page.keyboard.press('Enter');
  // Abertura com o fan aberto por inteiro (o pior caso): congelado no meio, quando está todo aberto.
  await expect(raiz(page)).toHaveAttribute('data-tela', 'abertura');
  await page.evaluate(() => document.getAnimations().forEach((a) => { a.pause(); a.currentTime = 0.5 * Number(a.effect?.getTiming().duration); }));
  await fanNaoCobre(page, '[data-botao-lado]');
  await fanNaoCobre(page, '[data-lado]');
  await fanNaoCobre(page, 'button[aria-label="Sair da partida"]');

  await esperarCartaPousada(page);
  await expect(cartasDoFan(page).first()).toBeVisible(); // o .fan é um ponto (o pivô); as cartas é que aparecem
  for (const alvo of ['[role="timer"]', '[data-botao-lado]', '[data-lado]', 'button[aria-label="Sair da partida"]', 'article h2', '[data-dica-saiba-mais]']) {
    await fanNaoCobre(page, alvo);
  }
  // O fan não muda a centralização da carta (AC-4.5): a carta continua no meio da tela.
  const carta = (await page.locator('article').boundingBox())!;
  expect(Math.abs(carta.x + carta.width / 2 - 683)).toBeLessThanOrEqual(2);
});

test('AC-17.4: a espera tem o fan respirando, sem cobrir o título, a chamada, o Iniciar nem o ☰', async ({ page }) => {
  await abrir(page);
  await expect(page.locator('[data-fan][data-fan-fase="respirando"] [data-fan-carta]')).toHaveCount(10);
  // Pior caso: o ponto mais aberto do ciclo (metade).
  await page.evaluate(() => document.getAnimations().forEach((a) => { a.pause(); a.currentTime = 0.5 * Number(a.effect?.getTiming().duration); }));
  for (const alvo of ['h1', 'main p', 'main button']) await fanNaoCobre(page, alvo, 'atras'); // "main button": Iniciar e ☰
});

test('AC-17.7: com menos movimento, nada anima e a carta aparece de frente no centro; os tempos não mudam', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await abrir(page);
  await expect(cartasDoFan(page).first()).toBeVisible(); // o .fan é um ponto (o pivô); as cartas é que aparecem
  expect(await page.evaluate(() => document.getAnimations().filter((a) => a.playState === 'running' && !(a instanceof CSSTransition)).length)).toBe(0);
  await page.keyboard.press('Enter');
  await expect(raiz(page)).toHaveAttribute('data-tela', 'abertura');
  await expect(page.locator('article')).toHaveCount(0);
  await expect(raiz(page)).toHaveAttribute('data-tela', 'card');
  await expect(page.locator('article[data-distribuindo]')).toBeVisible(); // a distribuição continua existindo no estado
  const carta = (await page.locator('article').boundingBox())!;
  expect(Math.abs(carta.x + carta.width / 2 - 683)).toBeLessThanOrEqual(2);
  await esperarCartaPousada(page);
});
