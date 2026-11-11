import { expect, test, type Page } from '@playwright/test';

const CAMERA_OFF = 'Câmera desativada — jogue pelas setas (Enter para começar)';
const FOTO = 'Sua foto na partida';

/** Joga `n` cards pelas setas, esperando o feedback de cada um e o card seguinte. */
async function escolher(page: Page, n: number) {
  for (let i = 0; i < n; i++) {
    await expect(page.locator('article')).toBeVisible();
    await page.keyboard.press(i % 2 === 0 ? 'ArrowRight' : 'ArrowLeft');
    await expect(page.getByText(/^(Acertou!|Errou)$/)).toBeVisible();
  }
}

test('AC-13.3: sem câmera, o resumo não tem polaroid', async ({ page }) => {
  test.setTimeout(90_000); // 10 feedbacks de 3 s
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia: () => Promise.reject(new Error('x')) } });
  });
  await page.goto('/');
  await expect(page.getByText(CAMERA_OFF)).toBeVisible();
  await page.keyboard.press('Enter');
  await escolher(page, 10);
  await expect(page.getByText(/^\d+ de 10$/)).toBeVisible();
  await expect(page.locator('figure')).toHaveCount(0);
  await expect(page.locator('main img')).toHaveCount(0);
});

test('AC-13.1/AC-13.2/AC-13.4/AC-13.5: com câmera, polaroid do card do meio no resumo, só na memória', async ({ page }) => {
  test.setTimeout(150_000); // modelo de pose + 10 feedbacks de 3 s + partida seguinte
  // Câmera simulada: um canvas 1280×720 repintado a cada quadro, entregue como MediaStream.
  await page.addInitScript(() => {
    const getUserMedia = async () => {
      const c = document.createElement('canvas');
      c.width = 1280;
      c.height = 720;
      const g = c.getContext('2d')!;
      let n = 0;
      const pintar = () => {
        g.fillStyle = '#2a9d8f';
        g.fillRect(0, 0, c.width, c.height);
        g.fillStyle = '#ffd166';
        g.fillRect((n++ * 8) % c.width, 300, 120, 120); // muda a cada quadro para o stream ter quadros novos
        requestAnimationFrame(pintar);
      };
      pintar();
      return c.captureStream(30);
    };
    Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia } });
  });
  // AC-13.5 (v10.2.0): vigia todos os canais de saída da página (antes de qualquer script do jogo).
  await page.addInitScript(() => {
    const saidas: { canal: string; dados: string }[] = [];
    (window as unknown as { __saidas: typeof saidas }).__saidas = saidas;
    const texto = (v: unknown) => {
      if (typeof v === 'string') return v;
      if (v instanceof Blob) return `[blob ${v.type} ${v.size}]`;
      try { return JSON.stringify(v) ?? String(v); } catch { return String(v); }
    };
    const vigiar = <T extends object>(alvo: T, nome: keyof T, canal: string) => {
      const original = alvo[nome] as unknown as (...a: unknown[]) => unknown;
      (alvo as Record<keyof T, unknown>)[nome] = function (this: unknown, ...a: unknown[]) {
        saidas.push({ canal, dados: a.map(texto).join(' ') });
        return original.apply(this, a);
      };
    };
    vigiar(window, 'fetch', 'fetch');
    vigiar(XMLHttpRequest.prototype, 'open', 'xhr.open');
    vigiar(XMLHttpRequest.prototype, 'send', 'xhr.send');
    vigiar(Storage.prototype, 'setItem', 'storage');
    vigiar(IDBFactory.prototype, 'open', 'indexedDB');
    vigiar(WebSocket.prototype, 'send', 'websocket');
    vigiar(navigator, 'sendBeacon', 'sendBeacon');
  });
  const requisicoes: string[] = [];
  const comCorpo: string[] = [];
  page.context().on('request', (r) => {
    if (r.url().startsWith('http')) requisicoes.push(`${r.url()} ${r.postData() ?? ''}`);
    if (r.postData()) comCorpo.push(`${r.method()} ${r.url()}`);
  });
  await page.goto('/');
  await expect(page.locator('video')).toBeVisible({ timeout: 60_000 }); // câmera "ativa": modelo carregado
  await expect(page.getByText(CAMERA_OFF)).toHaveCount(0);

  await page.keyboard.press('Enter');
  await expect(page.getByText('Fique no centro')).toBeVisible();                   // AC-1.7
  await page.keyboard.press('Enter');                                               // pula a calibração (AC-1.8)
  await escolher(page, 10);

  await expect(page.getByText(/^\d+ de 10$/)).toBeVisible();
  const foto = page.getByRole('img', { name: FOTO });
  await expect(foto).toBeVisible();
  expect(await foto.getAttribute('src')).toMatch(/^data:image\/jpeg/);
  expect(await foto.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
  await expect(page.getByText(/^Match do Saber · \d+ de 10$/)).toBeVisible();

  // AC-13.2/AC-5.7: polaroid, placar e mensagem cabem em 1366×768 sem se sobrepor; sem a lista de técnicas (v8.0.0).
  await expect(page.getByText('Técnicas que você praticou')).toHaveCount(0);
  // v11.0.0: a câmera simulada não tem pessoa, então a foto fica sem âncoras: só o selo da faixa (AC-13.9).
  // O selo pode repetir o texto da mensagem na faixa 4 ("Imune a fake news!"): a mensagem é achada pelo atributo.
  await expect(page.locator('figure [data-selo-faixa]')).toBeVisible();
  await expect(page.locator('svg[data-filtro]')).toHaveCount(0);
  await expect(page.locator('[data-mensagem-resumo]')).toHaveText(/^(Cuidado!|Você consegue|Parabéns!|Imune a fake news!)/);
  const caixas = {
    polaroid: (await page.locator('figure').boundingBox())!,
    placar: (await page.getByText(/^\d+ de 10$/).boundingBox())!,
    mensagem: (await page.locator('[data-mensagem-resumo]').boundingBox())!,
    qr: (await page.locator('[data-cartao-qr]').boundingBox())!,                         // AC-5.9 (v11.0.0)
    lista: (await page.getByRole('region', { name: 'Notícias da rodada' }).boundingBox())!, // AC-5.8 (v11.0.0)
  };
  console.log(`caixas: ${JSON.stringify(caixas)}`);
  for (const [nome, b] of Object.entries(caixas)) {
    expect(b.x, nome).toBeGreaterThanOrEqual(0);
    expect(b.y, nome).toBeGreaterThanOrEqual(0);
    expect(b.x + b.width, nome).toBeLessThanOrEqual(1366);
    expect(b.y + b.height, nome).toBeLessThanOrEqual(768);
  }
  // AC-2.6/AC-13.2 (v10.0.0): o resumo não mostra a prévia da câmera; o polaroid fica 20% maior que na v9 (320 → 384 px).
  await expect(page.locator('div:has(> video)')).toBeHidden();
  expect(caixas.polaroid.width).toBeGreaterThanOrEqual(384);
  const lista = Object.entries(caixas);
  for (let i = 0; i < lista.length; i++) {
    for (let j = i + 1; j < lista.length; j++) {
      const [[na, a], [nb, b]] = [lista[i]!, lista[j]!];
      expect(a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y, `${na} × ${nb}`).toBe(true);
    }
  }

  // AC-13.5: a foto não foi para a rede nem para o armazenamento do navegador.
  expect(requisicoes.filter((r) => r.includes('data:image'))).toEqual([]);
  expect(await page.evaluate(() => Object.values(localStorage).filter((v) => v.includes('data:image')))).toEqual([]);
  expect(await page.evaluate(() => Object.values(sessionStorage).filter((v) => v.includes('data:image')))).toEqual([]);
  // AC-13.5 (v10.2.0): nenhuma requisição com corpo durante a partida; nenhum canal de saída levou imagem ou âncoras;
  // o armazenamento só recebeu as configurações; o jogo não abre IndexedDB.
  expect(comCorpo).toEqual([]);
  const saidas = await page.evaluate(() => (window as unknown as { __saidas: { canal: string; dados: string }[] }).__saidas);
  expect(saidas.filter((s) => /data:image|\/9j\/|ancoras|escala|olhoDireito/.test(s.dados))).toEqual([]);
  expect(saidas.filter((s) => s.canal === 'storage' && !s.dados.startsWith('match-do-saber:'))).toEqual([]);
  expect(saidas.filter((s) => ['indexedDB', 'xhr.open', 'xhr.send', 'websocket', 'sendBeacon'].includes(s.canal))).toEqual([]);
  // O MediaPipe tenta mandar métricas de uso (protobuf, sem imagem) para odml.pa.googleapis.com; a CSP de
  // index.html bloqueia antes da rede. Qualquer outra chamada fora dos arquivos do jogo é erro.
  expect(saidas.filter((s) => s.canal === 'fetch'
    && !/content\/noticias\.csv|mediapipe|\.task|\.wasm|^https:\/\/odml\.pa\.googleapis\.com\/v1\/log /.test(s.dados))).toEqual([]);
  const origem = new URL(page.url()).origin;
  expect(requisicoes.filter((r) => !r.startsWith(origem))).toEqual([]); // nada saiu do próprio site (NFR Security)

  // AC-13.4: Enter no resumo vai à calibração e apaga a foto; Esc volta à espera.
  await page.keyboard.press('Enter');
  await expect(page.getByText('Fique no centro')).toBeVisible();
  await expect(page.getByRole('img', { name: FOTO })).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Iniciar', exact: true })).toBeVisible();
  await expect(page.getByRole('img', { name: FOTO })).toHaveCount(0);

  // Partida seguinte encerrada por Esc antes do card do meio: nenhuma foto em lugar nenhum.
  await page.keyboard.press('Enter');
  await expect(page.getByText('Fique no centro')).toBeVisible();
  await page.keyboard.press('Enter');
  await escolher(page, 3);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Iniciar', exact: true })).toBeVisible();
  await expect(page.getByRole('img', { name: FOTO })).toHaveCount(0);
});
