import { escreverCsv, lerCsv } from '../../src/core/csv';
import { expect, test } from '@playwright/test';
import { esperarCartaPousada } from './carta';

test('partida completa pelo teclado, sem câmera (AC-1.6, AC-2.5, AC-3.4, AC-4.x, AC-5.1, AC-5.6)', async ({ page }) => {
  test.setTimeout(120_000); // 10 feedbacks de 3 s + 16 s de resumo
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'mediaDevices', {
      value: { getUserMedia: () => Promise.reject(new DOMException('negada', 'NotAllowedError')) },
    });
  });
  await page.goto('/');
  await expect(page.getByText('Câmera desativada — jogue pelas setas (Enter para começar)')).toBeVisible();
  await page.keyboard.press('Enter');

  for (let i = 0; i < 10; i++) {
    const card = page.locator('article');
    await expect(card).toBeVisible();
    await esperarCartaPousada(page); // v13.0.0: setas só valem com a carta pousada (AC-17.6)
    if (i === 0) {
      await page.keyboard.press('ArrowUp');
      await expect(card.getByText('Texto expandido de teste.', { exact: false })).toBeVisible();
      await page.keyboard.press('ArrowUp');
    }
    await page.keyboard.press(i % 2 === 0 ? 'ArrowRight' : 'ArrowLeft');
    await expect(page.getByText(/^(Acertou!|Errou)$/)).toBeVisible();
    await expect(page.locator('[data-carimbo]')).toHaveText(/^(Verdade|Mentira)$/); // v12.0.0: o veredito é o carimbo (AC-4.9)
  }

  await expect(page.getByText(/^\d+ de 10$/)).toBeVisible({ timeout: 10_000 }); // o último feedback: saída + carimbada + 3 s (v12.0.0)
  await expect(page.getByText(/^(Cuidado!|Você consegue|Parabéns!|Imune a fake news!)/)).toBeVisible(); // AC-5.7
  await page.waitForTimeout(16000);
  await expect(page.getByText(/^\d+ de 10$/)).toBeVisible(); // AC-5.2: não expira
  await page.keyboard.press('Enter');
  await expect(page.locator('article')).toBeVisible(); // AC-5.6 sem câmera: nova partida direto
});

test('arrastar o card com o mouse escolhe (AC-2.5)', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia: () => Promise.reject(new Error('x')) } });
  });
  await page.goto('/');
  await expect(page.getByText('Câmera desativada — jogue pelas setas (Enter para começar)')).toBeVisible(); // jogo carregado
  await page.keyboard.press('Enter');
  await esperarCartaPousada(page);
  const box = (await page.locator('article').boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 200, box.y + box.height / 2);
  await page.mouse.up();
  await expect(page.getByText(/^(Acertou!|Errou)$/)).toBeVisible();
});

test('tempo esgotado mostra feedback (AC-4.3)', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia: () => Promise.reject(new Error('x')) } });
  });
  await page.goto('/');
  await expect(page.getByText('Câmera desativada — jogue pelas setas (Enter para começar)')).toBeVisible(); // jogo carregado
  await page.keyboard.press('Enter');
  await expect(page.getByText('Tempo esgotado')).toBeVisible({ timeout: 20_000 }); // v13.0.0: + abertura (1,5 s) + distribuição (0,9 s)
});

// v13.0.0 (AC-17.1, AC-17.2): a carta 5:7 com a manchete de 70 caracteres na frente e o verso mais longo do banco
// (mds-0001: 58 + 125 + 358 caracteres), sem corte; a letra desce por medida (manchete até 30, verso até 20).
const MANCHETE_70 = 'Pesquisadores desmentem: superinterpretações sobre desmatamento ilegal';
const DESCRICAO_LONGA = 'Em 1932, soldados com metralhadoras foram enviados para combater milhares de emas que destruíam plantações. As aves venceram.';
const SAIBA_MAIS_LONGO = 'A história se passa no oeste da Austrália, logo após a Primeira Guerra Mundial. Agricultores, muitos deles ex-soldados, plantavam trigo numa região atingida pela seca e pela crise econômica de 1929. Grandes bandos de emas, aves enormes que não voam, invadiam as lavouras em busca de água e comida. Os agricultores pediram ajuda ao ministro da Defesa do país.';
for (const vp of [{ width: 1366, height: 768 }, { width: 1920, height: 1080 }]) {
  test(`FR-4/AC-17.1/AC-17.2: carta 5:7 sem corte, frente e verso, com os textos mais longos em ${vp.width}×${vp.height}`, async ({ page }) => {
    await page.setViewportSize(vp);
    await page.route('**/content/noticias.csv', async (route) => {
      const r = await route.fetch();
      const banco = lerCsv(await r.text()).map((n) => ({
        ...n, imagem: '', titulo: MANCHETE_70, descricao: DESCRICAO_LONGA, saiba_mais: SAIBA_MAIS_LONGO,
      }));
      await route.fulfill({ body: escreverCsv(banco) });
    });
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia: () => Promise.reject(new Error('x')) } });
    });
    await page.goto('/');
    await expect(page.getByText('Câmera desativada — jogue pelas setas (Enter para começar)')).toBeVisible(); // jogo carregado
    await page.keyboard.press('Enter');
    await esperarCartaPousada(page);
    const card = page.locator('article');
    const caixa = (await card.boundingBox())!;
    const barra = (await page.getByRole('timer', { name: 'Tempo restante' }).boundingBox())!;
    expect(caixa.y).toBeGreaterThanOrEqual(0);
    expect(caixa.y + caixa.height).toBeLessThanOrEqual(barra.y);
    expect(Math.abs(caixa.width / caixa.height - 5 / 7)).toBeLessThanOrEqual((5 / 7) * 0.02);
    const janela = (await card.locator('[data-janela]').boundingBox())!;
    expect(janela.height / caixa.height).toBeGreaterThanOrEqual(0.55);
    expect(janela.height / caixa.height).toBeLessThanOrEqual(0.65);
    const corta = (sel: string) => card.locator(sel).evaluate((el) => el.scrollHeight > el.clientHeight + 1);
    await expect(card.getByRole('heading', { level: 2, name: MANCHETE_70 })).toBeVisible();
    expect(await corta('h2')).toBe(false);

    await page.keyboard.press('ArrowUp');
    await expect(card).toHaveAttribute('data-face', 'verso');
    await expect(card.getByText(SAIBA_MAIS_LONGO)).toBeVisible();
    await expect(card.getByText(DESCRICAO_LONGA)).toBeVisible();
    expect(await corta('[data-texto-verso]')).toBe(false);
    const letra = await card.locator('[data-face-carta="verso"] h3').evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
    expect(letra).toBeGreaterThanOrEqual(20 * Math.min(vp.width / 1366, vp.height / 768) - 0.5); // AC-17.2: mínimo de 20
  });
}

async function iniciarSemCamera(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia: () => Promise.reject(new Error('x')) } });
  });
  await page.goto('/');
  await expect(page.getByText('Câmera desativada — jogue pelas setas (Enter para começar)')).toBeVisible(); // jogo carregado
  await page.keyboard.press('Enter');
  await expect(page.locator('article')).toBeVisible();
  await esperarCartaPousada(page);
}

// No próprio navegador: espera o card ganhar a classe de saída, deixa a animação correr ~100 ms
// e lê o deslocamento horizontal (matriz do transform calculado) e se o feedback já apareceu.
function saidaAntesDoFeedback(page: import('@playwright/test').Page) {
  return page.evaluate(() => new Promise<{ classe: string; visivelFeedback: boolean; tx: number }>((resolve, reject) => {
    const t0 = performance.now();
    let visto: number | null = null;
    const passo = () => {
      const agora = performance.now();
      if (agora - t0 > 2000) return reject(new Error('o card não saiu'));
      const el = document.querySelector('article');
      if (el && /sai(Direita|Esquerda)/.test(el.className)) {
        visto ??= agora;
        if (agora - visto >= 100) {
          resolve({
            classe: el.className,
            visivelFeedback: /Acertou!|Errou/.test(document.body.innerText),
            tx: new DOMMatrix(getComputedStyle(el).transform).m41,
          });
          return;
        }
      }
      requestAnimationFrame(passo);
    };
    passo();
  }));
}

for (const [tecla, lado, classe, sinal] of [
  ['ArrowRight', 'direita', /saiDireita/, 1],
  ['ArrowLeft', 'esquerda', /saiEsquerda/, -1],
] as const) {
  test(`AC-2.5 + AC-${lado === 'direita' ? '2.1' : '2.2'}: ${tecla} faz o card sair pela ${lado} antes do feedback`, async ({ page }) => {
    await iniciarSemCamera(page);
    await page.keyboard.press(tecla);
    const r = await saidaAntesDoFeedback(page);
    expect(r.classe).toMatch(classe);
    expect(r.visivelFeedback).toBe(false);
    expect(Math.sign(r.tx)).toBe(sinal);
    await expect(page.getByText(/^(Acertou!|Errou)$/)).toBeVisible();
  });
}

test('arrastar o card para a esquerda escolhe "falsa" e o card sai pela esquerda (AC-2.5, AC-2.2)', async ({ page }) => {
  await iniciarSemCamera(page);
  const box = (await page.locator('article').boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 - 200, box.y + box.height / 2);
  await page.mouse.up();
  const r = await saidaAntesDoFeedback(page);
  expect(r.classe).toMatch(/saiEsquerda/);
  expect(r.visivelFeedback).toBe(false);
  expect(r.tx).toBeLessThan(0);
  await expect(page.getByText(/^(Acertou!|Errou)$/)).toBeVisible();
});
