import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { validarBanco } from '../../src/core/banco';
import { escreverCsv, lerCsv } from '../../src/core/csv';

// AC-5.8 (v12.0.2): com "Notícias por partida" acima de 10 (até 20, AC-9.23), a lista do resumo continua em duas
// colunas, com todas as notícias inteiras, sem sobrepor e sem sair da tela em 1366×768. Até a v12.0.1 a grade tinha
// 5 linhas fixas e as notícias 11 a 20 caíam em colunas extras, amontoadas.
test.use({ serviceWorkers: 'block' });

/** Banco com `total` notícias jogáveis: as válidas, aprovadas e visíveis do fixture, repetidas com ids novos. */
function bancoCom(total: number): string {
  const fixture = lerCsv(readFileSync('public/content/noticias.csv', 'utf8').replace(/^﻿/, ''));
  const boas = validarBanco(fixture).validas.filter((n) => n.status === 'aprovada' && n.visivel !== 'nao');
  return escreverCsv(Array.from({ length: total }, (_, i) => ({ ...boas[i % boas.length]!, id: `mds-${String(900 + i).padStart(4, '0')}` })));
}

for (const total of [12, 20]) {
  test(`AC-5.8/AC-9.23: resumo de ${total} notícias em 1366×768, duas colunas, todas inteiras e na tela`, async ({ page }) => {
    test.setTimeout(240_000); // até 20 feedbacks de ~3,6 s
    const csv = bancoCom(total);
    await page.route('**/content/noticias.csv', (r) => r.fulfill({ body: csv, contentType: 'text/csv; charset=utf-8' }));
    await page.addInitScript((n) => {
      Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia: () => Promise.reject(new Error('x')) } });
      localStorage.setItem('match-do-saber:noticiasPorPartida', String(n));
    }, total);
    await page.goto('/');
    await page.getByRole('button', { name: 'Iniciar', exact: true }).waitFor();
    await page.keyboard.press('Enter');
    for (let i = 0; i < total; i++) {
      await expect(page.locator('article')).toBeVisible({ timeout: 15_000 });
      await page.keyboard.press(i % 2 ? 'ArrowLeft' : 'ArrowRight');
      await expect(page.getByRole('heading', { name: /^(Acertou!|Errou)$/ })).toBeVisible();
    }
    await expect(page.getByText(new RegExp(`^\\d+ de ${total}$`))).toBeVisible({ timeout: 15_000 });
    await page.evaluate(() => document.fonts.ready);

    const lista = page.getByRole('region', { name: 'Notícias da rodada' });
    const caixa = (await lista.boundingBox())!;
    const vp = page.viewportSize()!;
    expect(caixa.y + caixa.height).toBeLessThanOrEqual(vp.height);
    const itens = lista.getByRole('listitem');
    await expect(itens).toHaveCount(total);
    const caixas = await itens.evaluateAll((els) => els.map((e) => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; }));
    const colunas = new Set(caixas.map((c) => Math.round(c.x)));
    expect(colunas.size).toBe(2);                                                   // duas colunas
    for (const c of caixas) {
      expect(c.w).toBeGreaterThan(200);                                             // nada espremido
      expect(c.x).toBeGreaterThanOrEqual(caixa.x - 1);
      expect(c.x + c.w).toBeLessThanOrEqual(caixa.x + caixa.width + 1);
      expect(c.y + c.h).toBeLessThanOrEqual(caixa.y + caixa.height + 1);
    }
    for (let i = 0; i < caixas.length; i++) {
      for (let j = i + 1; j < caixas.length; j++) {
        const a = caixas[i]!, b = caixas[j]!;
        const sobrepoe = a.x < b.x + b.w - 1 && b.x < a.x + a.w - 1 && a.y < b.y + b.h - 1 && b.y < a.y + a.h - 1;
        expect(sobrepoe, `linhas ${i + 1} e ${j + 1} se sobrepõem`).toBe(false);
      }
    }
    // os títulos continuam legíveis: o texto de cada linha tem pelo menos 13 px
    const menorFonte = await lista.locator('li b').evaluateAll((els) => Math.min(...els.map((e) => parseFloat(getComputedStyle(e).fontSize))));
    expect(menorFonte).toBeGreaterThanOrEqual(13);
  });
}
