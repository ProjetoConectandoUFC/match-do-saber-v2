import { expect, test, type Locator, type Page } from '@playwright/test';
import { esperarCartaPousada } from './carta';

// FR-20 / NFR Performance (v13.3.0, Fase 52): a tela não anda no ritmo da detecção de pose.
// Câmera falsa do Chromium; a detecção é a falsa e lenta (60 ms síncronos), injetada antes de a página abrir.
test.use({
  launchOptions: { args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] },
  permissions: ['camera'],
});

/**
 * Intervalos entre quadros da tela durante `ms`, pelo relógio real (performance.now() no começo de cada callback de rAF):
 * o carimbo do rAF é o do vsync previsto e esconde parte do bloqueio da thread principal.
 */
async function medirQuadros(page: Page, ms: number): Promise<number[]> {
  return page.evaluate((duracao) => new Promise<number[]>((ok) => {
    const intervalos: number[] = [];
    let anterior = 0;
    const inicio = performance.now();
    const quadro = () => {
      const agora = performance.now();
      if (anterior) intervalos.push(agora - anterior);
      anterior = agora;
      if (agora - inicio < duracao) requestAnimationFrame(quadro);
      else ok(intervalos);
    };
    requestAnimationFrame(quadro);
  }), ms);
}

function estatisticas(intervalos: number[]) {
  const ord = [...intervalos].sort((a, b) => a - b);
  const q = (f: number) => ord[Math.min(ord.length - 1, Math.floor(f * ord.length))]!;
  return {
    quadros: intervalos.length,
    medianaMs: Number(q(0.5).toFixed(1)),
    p95Ms: Number(q(0.95).toFixed(1)),
    maxMs: Number(ord.at(-1)!.toFixed(1)),
    acimaDe100: intervalos.filter((i) => i > 100).length,
  };
}

async function abrirComDeteccao(page: Page, deteccao: { ms: number; onde?: string } | null) {
  if (deteccao) await page.addInitScript((d) => { (window as unknown as { __mdsDeteccaoFalsa: unknown }).__mdsDeteccaoFalsa = d; }, deteccao);
  await page.goto('/?diagnostico');
  await expect(page.locator('video').first()).toBeVisible({ timeout: 30_000 });
  const painel = page.getByRole('complementary', { name: 'Diagnóstico' });
  // A detecção já está rodando quando o painel mostra o tempo dela.
  await expect(painel).toContainText(/detecção: \d+ ms/, { timeout: 30_000 });
  return painel;
}

/** As três primeiras linhas do Diagnóstico: quadros e leituras por segundo, detecção, aceleração. */
async function linhasPainel(painel: Locator) {
  return (await painel.innerText()).split(/\n+/).slice(0, 3).join(' | ');
}

async function irParaCarta(page: Page) {
  await page.keyboard.press('Enter'); // abre a calibração
  await page.keyboard.press('Enter'); // pula a calibração
  await esperarCartaPousada(page);
}

test('NFR Performance (v13.3.0): com detecção de 60 ms, a tela fica a ≥ 50 fps (mediana ≤ 20 ms, nenhum > 100 ms)', async ({ page }) => {
  test.setTimeout(90_000);
  const painel = await abrirComDeteccao(page, { ms: 60 });
  const espera = estatisticas(await medirQuadros(page, 3000));
  console.log(`painel (espera): ${await linhasPainel(painel)}`);
  await irParaCarta(page);
  const carta = estatisticas(await medirQuadros(page, 4000));
  console.log(`cadência (detecção falsa 60 ms) espera: ${JSON.stringify(espera)} carta: ${JSON.stringify(carta)}`);
  console.log(`painel (carta): ${await linhasPainel(painel)}`);
  for (const e of [espera, carta]) {
    expect(e.medianaMs).toBeLessThanOrEqual(20);
    expect(e.acimaDe100).toBe(0);
  }
});

test('FR-20: na reserva (detecção na thread principal), nunca dois quadros seguidos travados pela detecção', async ({ page }) => {
  test.setTimeout(90_000);
  const painel = await abrirComDeteccao(page, { ms: 60, onde: 'principal' });
  const intervalos = await medirQuadros(page, 3000);
  const seguidos = intervalos.filter((v, i) => i > 0 && v > 50 && intervalos[i - 1]! > 50).length;
  console.log(`cadência (reserva, detecção falsa 60 ms) espera: ${JSON.stringify(estatisticas(intervalos))} seguidos>50ms: ${seguidos}`);
  console.log(`painel: ${await linhasPainel(painel)}`);
  expect(seguidos).toBe(0);
});

test('medição (sem critério): cadência com o modelo de pose real nesta máquina', async ({ page }) => {
  test.setTimeout(90_000);
  const painel = await abrirComDeteccao(page, null);
  await page.waitForTimeout(3000); // a primeira detecção do modelo real é lenta
  const espera = estatisticas(await medirQuadros(page, 3000));
  console.log(`cadência (modelo real) espera: ${JSON.stringify(espera)}`);
  console.log(`painel: ${await linhasPainel(painel)}`);
});

test('medição (sem critério, Fase 52.5): trabalho da thread principal por quadro na carta e no feedback', async ({ page }) => {
  test.setTimeout(90_000);
  await abrirComDeteccao(page, { ms: 60 });
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Performance.enable');
  const metricas = async () => Object.fromEntries(
    ((await cdp.send('Performance.getMetrics')).metrics as { name: string; value: number }[]).map((m) => [m.name, m.value]),
  );
  const medir = async (rotulo: string, ms: number) => {
    const a = await metricas();
    const quadros = (await medirQuadros(page, ms)).length;
    const b = await metricas();
    const porQuadro = (k: string) => Number((((b[k]! - a[k]!) * 1000) / quadros).toFixed(2));
    console.log(`trabalho por quadro (${rotulo}, ${quadros} quadros): script ${porQuadro('ScriptDuration')} ms · estilo ${porQuadro('RecalcStyleDuration')} ms · layout ${porQuadro('LayoutDuration')} ms · tarefas ${porQuadro('TaskDuration')} ms`);
  };
  await medir('espera', 3000);
  await irParaCarta(page);
  await medir('carta', 3000);
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(800); // saída da carta e carimbada
  await medir('feedback', 2000);
});
