import { describe, expect, it } from 'vitest';
import { calcularAncoras, VISIBILIDADE_MINIMA } from './ancorasRosto';
import type { Ponto } from './gestos';

// Pontos do MediaPipe Pose usados: 2 olho esq., 5 olho dir., 7 orelha esq., 8 orelha dir., 11 ombro esq., 12 ombro dir.
// Coordenadas normalizadas da câmera (sem espelhar): o lado esquerdo do jogador fica no x maior.
type Pontos = Record<number, Ponto>;
function pose(p: Pontos): Ponto[] {
  return Array.from({ length: 13 }, (_, i) => p[i] ?? { x: 0.5, y: 0.5, visibility: 0 });
}
const ROSTO: Pontos = {
  2: { x: 0.55, y: 0.4, visibility: 0.99 }, 5: { x: 0.45, y: 0.4, visibility: 0.99 },
  7: { x: 0.605, y: 0.42, visibility: 0.9 }, 8: { x: 0.395, y: 0.42, visibility: 0.9 },
  11: { x: 0.7, y: 0.8, visibility: 0.95 }, 12: { x: 0.3, y: 0.8, visibility: 0.95 },
};
const FOTO = { largura: 480, altura: 360, espelhada: true };
const fora = { visibility: 0.2 };

describe('calcularAncoras (AC-13.6)', () => {
  it('visibilidade mínima de 0,5 (tabela da prévia v11)', () => {
    expect(VISIBILIDADE_MINIMA).toBe(0.5);
  });

  it('rosto pelos olhos, na foto espelhada: origem no meio dos olhos, escala = distância ÷ 100, giro 0 com o rosto reto', () => {
    const a = calcularAncoras(pose(ROSTO), FOTO)!;
    expect(a.rosto.fonte).toBe('olhos');
    expect(a.rosto.x).toBeCloseTo(240, 6);
    expect(a.rosto.y).toBeCloseTo(144, 6);
    expect(a.rosto.escala).toBeCloseTo(0.48, 6); // 0,1 × 480 px = 48 px entre os olhos
    expect(a.rosto.graus).toBeCloseTo(0, 6);
    // espelhada: x vira 1 − x; o olho esquerdo (2) aparece à esquerda da foto, em (−50, 0) do quadro
    expect(a.olhoEsquerdo).toEqual({ x: expect.closeTo(216, 6), y: expect.closeTo(144, 6) });
    expect(a.olhoDireito).toEqual({ x: expect.closeTo(264, 6), y: expect.closeTo(144, 6) });
    expect(a).toMatchObject({ largura: 480, altura: 360, espelhada: true });
  });

  it('foto não espelhada: os mesmos pontos sem trocar x, e o giro continua 0 com o rosto reto', () => {
    const a = calcularAncoras(pose(ROSTO), { ...FOTO, espelhada: false })!;
    expect(a.rosto.x).toBeCloseTo(240, 6);
    expect(a.rosto.graus).toBeCloseTo(0, 6);
    expect(a.olhoDireito!.x).toBeCloseTo(216, 6);
    expect(a.olhoEsquerdo!.x).toBeCloseTo(264, 6);
  });

  it('giro pela linha dos olhos, na foto: o olho da direita da foto mais alto dá giro negativo', () => {
    // espelhada: o olho 5 vai para a direita da foto; subir 0,1 da altura (36 px) com 48 px de distância horizontal
    const a = calcularAncoras(pose({ ...ROSTO, 5: { x: 0.45, y: 0.3, visibility: 0.99 } }), FOTO)!;
    expect(a.rosto.graus).toBeCloseTo((Math.atan2(-36, 48) * 180) / Math.PI, 6);
    expect(a.rosto.escala).toBeCloseTo(Math.hypot(48, 36) / 100, 6);
  });

  it('a escala usa pixels da foto (largura e altura diferentes)', () => {
    const a = calcularAncoras(pose({ ...ROSTO, 2: { x: 0.5, y: 0.3, visibility: 1 }, 5: { x: 0.5, y: 0.5, visibility: 1 } }), FOTO)!;
    expect(a.rosto.escala).toBeCloseTo(0.72, 6); // 0,2 × 360 px
  });

  it('sem os dois olhos visíveis, o rosto vem das orelhas (em (−105, 15) e (105, 15) do quadro)', () => {
    const a = calcularAncoras(pose({ ...ROSTO, 2: { ...ROSTO[2]!, ...fora } }), FOTO)!;
    expect(a.rosto.fonte).toBe('orelhas');
    const s = (0.21 * 480) / 210;
    expect(a.rosto.escala).toBeCloseTo(s, 6);
    expect(a.rosto.x).toBeCloseTo(240, 6);
    expect(a.rosto.y).toBeCloseTo(0.42 * 360 - 15 * s, 6);
    expect(a.olhoEsquerdo).toBeNull();
    expect(a.olhoDireito).not.toBeNull();
  });

  it('chapéu pelas orelhas quando as duas são vistas; sem elas, igual ao rosto pelos olhos', () => {
    const com = calcularAncoras(pose(ROSTO), FOTO)!;
    expect(com.chapeu.fonte).toBe('orelhas');
    expect(com.chapeu.escala).toBeCloseTo((0.21 * 480) / 210, 6);
    const sem = calcularAncoras(pose({ ...ROSTO, 7: { ...ROSTO[7]!, ...fora } }), FOTO)!;
    expect(sem.chapeu).toEqual({ ...sem.rosto, fonte: 'olhos' });
    expect(sem.orelhaDireita).not.toBeNull();
  });

  it('capa pelos ombros (em (−200, 255) e (200, 255) do quadro), com escala própria; sem ombros, nenhuma', () => {
    const a = calcularAncoras(pose(ROSTO), FOTO)!;
    const s = (0.4 * 480) / 400;
    expect(a.capa).toEqual({ x: expect.closeTo(240, 6), y: expect.closeTo(0.8 * 360 - 255 * s, 6), escala: expect.closeTo(s, 6), graus: expect.closeTo(0, 6) });
    expect(calcularAncoras(pose({ ...ROSTO, 12: { ...ROSTO[12]!, ...fora } }), FOTO)!.capa).toBeNull();
  });

  it('origem do quadro girado: o meio dos pontos desloca-se perpendicular à linha', () => {
    // ombros girados 90°: na foto espelhada, 11 em cima e 12 embaixo
    const a = calcularAncoras(pose({ ...ROSTO, 11: { x: 0.5, y: 0.2, visibility: 1 }, 12: { x: 0.5, y: 0.6, visibility: 1 } }), FOTO)!;
    const s = (0.4 * 360) / 400;
    expect(a.capa!.graus).toBeCloseTo(90, 6);
    expect(a.capa!.x).toBeCloseTo(240 + 255 * s, 6);
    expect(a.capa!.y).toBeCloseTo(0.4 * 360, 6);
  });

  it('orelha direita (8) para o lápis, ou nenhuma', () => {
    expect(calcularAncoras(pose(ROSTO), FOTO)!.orelhaDireita).toEqual({ x: expect.closeTo(0.605 * 480, 6), y: expect.closeTo(0.42 * 360, 6) });
    expect(calcularAncoras(pose({ ...ROSTO, 8: { ...ROSTO[8]!, ...fora } }), FOTO)!.orelhaDireita).toBeNull();
  });

  it('"sem filtro" (null): sem pose, sem olhos nem orelhas, ou só um olho e uma orelha', () => {
    expect(calcularAncoras(null, FOTO)).toBeNull();
    expect(calcularAncoras([], FOTO)).toBeNull();
    const semRosto = { ...ROSTO, 2: { ...ROSTO[2]!, ...fora }, 5: { ...ROSTO[5]!, ...fora }, 7: { ...ROSTO[7]!, ...fora }, 8: { ...ROSTO[8]!, ...fora } };
    expect(calcularAncoras(pose(semRosto), FOTO)).toBeNull();
    expect(calcularAncoras(pose({ ...semRosto, 2: ROSTO[2]!, 8: ROSTO[8]! }), FOTO)).toBeNull();
  });

  it('visibilidade ausente vale como vista; coordenada inválida vale como ausente; foto sem tamanho não tem filtro', () => {
    const semVis = Object.fromEntries(Object.entries(ROSTO).map(([k, p]) => [k, { x: p.x, y: p.y }]));
    expect(calcularAncoras(pose(semVis), FOTO)!.rosto.fonte).toBe('olhos');
    expect(calcularAncoras(pose({ ...ROSTO, 2: { x: Number.NaN, y: 0.4, visibility: 1 } }), FOTO)!.rosto.fonte).toBe('orelhas');
    expect(calcularAncoras(pose(ROSTO), { ...FOTO, largura: 0 })).toBeNull();
  });
});
