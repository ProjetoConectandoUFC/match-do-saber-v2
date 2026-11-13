import { expect, type Page } from '@playwright/test';

/**
 * v13.0.0 (AC-17.5, AC-17.6): toda partida começa pela abertura do fan (1,5 s) e cada carta é distribuída (0,9 s);
 * só com a carta pousada setas, arraste e "saiba mais" valem. Esta é a "tela pronta" das cartas: o reducer diz,
 * pelos `data-*` da raiz do App, que há uma carta (notícia ou treino) na tela e que ela não está mais saindo do fan.
 */
export async function esperarCartaPousada(page: Page, timeout = 10_000) {
  await expect(
    page.locator('[data-tela="card"]:not([data-distribuindo]), [data-tela="tutorial"]:not([data-distribuindo])'),
  ).toHaveCount(1, { timeout });
}
