import { expect, test, type Locator, type Page } from '@playwright/test';

// v11.0.0: resumo da opção B (lista + QR, AC-5.8, AC-5.9), página das fontes (AC-5.10), botões redondos e
// carimbo (AC-2.11, AC-2.12), sem câmera (setas).
const CAMERA_OFF = 'Câmera desativada — jogue pelas setas (Enter para começar)';

async function semCamera(page: Page) {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia: () => Promise.reject(new Error('x')) } });
  });
  await page.goto('/');
  await expect(page.getByText(CAMERA_OFF)).toBeVisible();
}

async function jogarAteOResumo(page: Page) {
  await page.keyboard.press('Enter');
  for (let i = 0; i < 10; i++) {
    await expect(page.locator('article')).toBeVisible();
    await page.keyboard.press(i % 3 === 0 ? 'ArrowLeft' : 'ArrowRight');
    await expect(page.getByText(/^(Acertou!|Errou)$/)).toBeVisible();
  }
  await expect(page.getByText(/^\d+ de 10$/)).toBeVisible();
}

const caixa = async (l: Locator) => (await l.boundingBox())!;
const separadas = (a: { x: number; y: number; width: number; height: number }, b: typeof a) =>
  a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y;

test('AC-5.8/AC-5.9/AC-5.10: resumo com lista e QR em 1366×768 e 1920×1080; o QR abre a página das fontes', async ({ page }) => {
  test.setTimeout(120_000);
  await semCamera(page);
  await jogarAteOResumo(page);

  const lista = page.getByRole('region', { name: 'Notícias da rodada' });
  await expect(lista.getByRole('listitem')).toHaveCount(10);
  await expect(lista.getByText(/(Fonte|Desmentido por): /).first()).toBeVisible();
  // Fixture: as pares têm título curto e veículo; as ímpares usam o título cortado e o domínio (AC-7.11).
  await expect(lista.getByText(/^Teste \d+: manchete$/).first()).toBeVisible();
  await expect(lista.getByText('exemplo.org').first()).toBeVisible();
  await expect(lista.getByText('Agência de Teste').first()).toBeVisible();

  const qr = page.getByRole('img', { name: 'QR code das fontes da rodada' });
  await expect(qr).toBeVisible();
  await expect(page.getByText('Fotografe e veja todas as fontes')).toBeVisible();
  const endereco = (await qr.getAttribute('data-conteudo'))!;
  expect(endereco).toMatch(/^https:\/\/.+\/fontes\.html#[a-z0-9._-]+$/i); // só os ids, depois do #
  const ids = endereco.split('#')[1]!.split('.');
  expect(ids).toHaveLength(10);

  for (const vp of [{ width: 1366, height: 768 }, { width: 1920, height: 1080 }]) {
    await page.setViewportSize(vp);
    const escala = vp.width / 1366;
    const partes = {
      placar: await caixa(page.getByText(/^\d+ de 10$/)),
      mensagem: await caixa(page.locator('[data-mensagem-resumo]')),
      qr: await caixa(page.locator('[data-cartao-qr]')),
      lista: await caixa(lista),
    };
    for (const [nome, b] of Object.entries(partes)) {
      expect(b.x, `${nome} ${vp.width}`).toBeGreaterThanOrEqual(0);
      expect(b.y, `${nome} ${vp.width}`).toBeGreaterThanOrEqual(0);
      expect(b.x + b.width, `${nome} ${vp.width}`).toBeLessThanOrEqual(vp.width);
      expect(b.y + b.height, `${nome} ${vp.width}`).toBeLessThanOrEqual(vp.height);
    }
    const nomes = Object.keys(partes) as (keyof typeof partes)[];
    for (let i = 0; i < nomes.length; i++) {
      for (let j = i + 1; j < nomes.length; j++) {
        if (nomes[i] === 'placar' && nomes[j] === 'mensagem') continue; // mesma coluna, um embaixo do outro
        expect(separadas(partes[nomes[i]!], partes[nomes[j]!]), `${nomes[i]} × ${nomes[j]} ${vp.width}`).toBe(true);
      }
    }
    expect((await caixa(qr)).width).toBeGreaterThanOrEqual(160 * escala); // AC-5.9: QR grande
    // Nenhuma linha da lista sai do painel (texto longo termina em "…").
    for (const li of await lista.getByRole('listitem').all()) {
      const b = await caixa(li);
      expect(b.x + b.width).toBeLessThanOrEqual(partes.lista.x + partes.lista.width + 1);
      expect(b.y + b.height).toBeLessThanOrEqual(partes.lista.y + partes.lista.height + 1);
    }
  }

  // AC-5.10: a página das fontes desta versão (a da preview, no lugar do endereço público) com os mesmos ids.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/fontes.html#${endereco.split('#')[1]}`);
  await expect(page.getByRole('heading', { name: 'Fontes da sua rodada' })).toBeVisible();
  const itens = page.locator('ol > li');
  await expect(itens).toHaveCount(10);
  await expect(itens.first().getByRole('link').first()).toHaveAttribute('rel', 'noopener noreferrer');
  await expect(page.getByText(/^(Fonte:|Desmentido por:)/).first()).toBeVisible();
  await expect(page.getByText('Notícia não encontrada nesta versão do jogo')).toHaveCount(0);
  // Id que não está no banco embutido (ex.: editado só no desktop): aparece como não encontrado.
  await page.goto('/fontes.html#9999.teste-1');
  await expect(page.locator('ol > li')).toHaveCount(2);
  await expect(page.getByText('Notícia não encontrada nesta versão do jogo')).toHaveCount(1);
});

test('AC-2.11/AC-2.12: botões redondos fora do card, pilha atrás e carimbo na saída, sem tirar o card do centro', async ({ page }) => {
  await semCamera(page);
  await page.keyboard.press('Enter');
  const card = page.locator('article');
  await expect(card).toBeVisible();
  const c = await caixa(card);
  const barra = await caixa(page.getByRole('timer', { name: 'Tempo restante' }));
  expect(Math.abs(c.y + c.height / 2 - barra.y / 2)).toBeLessThanOrEqual(8); // AC-4.5 com a pilha
  const mentira = page.locator('[data-botao-lado="mentira"]');
  const verdade = page.locator('[data-botao-lado="verdade"]');
  for (const b of [await caixa(mentira), await caixa(verdade)]) {
    expect(separadas(b, c)).toBe(true);
    expect(b.width).toBeGreaterThanOrEqual(130);
  }
  expect((await caixa(mentira)).x).toBeLessThan(c.x);
  expect((await caixa(verdade)).x).toBeGreaterThan(c.x + c.width);
  await expect(page.locator('[data-pilha-camada]')).toHaveCount(2);

  await page.keyboard.press('ArrowRight');
  await expect(page.locator('[data-rotulo-lado="verdade"]')).toHaveClass(/carimbado/);
  await expect(verdade).toHaveAttribute('data-escolhido', 'true');
  await expect(page.getByText(/^(Acertou!|Errou)$/)).toBeVisible();
  await expect(page.locator('svg[data-icone]')).toHaveCount(1);
  await expect(page.getByText(/^(Deu match!|Não deu match)$/)).toBeVisible();
});
