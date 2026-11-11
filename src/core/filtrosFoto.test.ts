import { describe, expect, it } from 'vitest';
import { calcularAncoras, type AncorasRosto } from './ancorasRosto';
import { pecasDoFiltro, transformDoQuadro } from './filtrosFoto';
import type { Ponto } from './gestos';

const p = (x: number, y: number, visibility = 1): Ponto => ({ x, y, visibility });

/** Pose de frente, sem espelhar, numa foto 480×360: olhos a 48 px, orelhas e ombros vistos. */
function pose(extra: Record<number, Ponto | undefined> = {}): (Ponto | undefined)[] {
  const pts: (Ponto | undefined)[] = Array.from({ length: 33 }, () => undefined);
  pts[0] = p(0.5, 0.45);
  pts[2] = p(0.55, 0.4); pts[5] = p(0.45, 0.4);       // olho esquerdo (2) à direita da imagem sem espelhar
  pts[7] = p(0.605, 0.42); pts[8] = p(0.395, 0.42);
  pts[11] = p(0.7, 0.75); pts[12] = p(0.3, 0.75);
  for (const [i, v] of Object.entries(extra)) pts[Number(i)] = v;
  return pts;
}
const foto = { largura: 480, altura: 360, espelhada: true };
const ancoras = (extra?: Record<number, Ponto | undefined>) => calcularAncoras(pose(extra), foto)!;

describe('transformDoQuadro', () => {
  it('leva o quadro de referência dos SVGs à foto: translate, rotate, scale', () => {
    expect(transformDoQuadro({ x: 240, y: 144, escala: 0.48, graus: 0 })).toBe('translate(240 144) rotate(0) scale(0.48)');
    expect(transformDoQuadro({ x: 10.123, y: 5.456, escala: 0.33333, graus: -7.777 })).toBe('translate(10.12 5.46) rotate(-7.78) scale(0.333)');
  });
});

describe('pecasDoFiltro (AC-13.8, AC-13.9)', () => {
  it('sem âncoras: nenhuma peça, fica só o selo', () => {
    for (const f of ['lupa', 'detetive', 'reporter', 'heroi'] as const) expect(pecasDoFiltro(f, null)).toEqual([]);
  });

  it('lupa: no quadro do rosto, só com os olhos vistos', () => {
    const a = ancoras();
    expect(pecasDoFiltro('lupa', a)).toEqual([{ parte: 'rosto', transform: transformDoQuadro(a.rosto) }]);
    const soOrelhas = ancoras({ 2: p(0.55, 0.4, 0.1), 5: p(0.45, 0.4, 0.1) });
    expect(soOrelhas.rosto.fonte).toBe('orelhas');
    expect(pecasDoFiltro('lupa', soOrelhas)).toEqual([]);
  });

  it('detetive: chapéu pelo chapéu e óculos pelo rosto, nessa ordem de pintura', () => {
    const a = ancoras();
    expect(pecasDoFiltro('detetive', a)).toEqual([
      { parte: 'chapeu', transform: transformDoQuadro(a.chapeu) },
      { parte: 'rosto', transform: transformDoQuadro(a.rosto) },
    ]);
  });

  it('repórter: lápis atrás da orelha 8 (antes do chapéu); sem a orelha 8, sem lápis', () => {
    const a = ancoras();
    const [lapis, chapeu] = pecasDoFiltro('reporter', a);
    expect(chapeu).toEqual({ parte: 'chapeu', transform: transformDoQuadro(a.chapeu) });
    expect(lapis!.parte).toBe('lapis');
    // O desenho do lápis está em volta de (105, 15), a orelha no quadro; a peça leva esse ponto à orelha da foto.
    const o = a.orelhaDireita!;
    expect(lapis!.transform).toBe(`translate(${+o.x.toFixed(2)} ${+o.y.toFixed(2)}) rotate(${+a.chapeu.graus.toFixed(2)}) scale(${+a.chapeu.escala.toFixed(3)}) translate(-105 -15)`);
    expect(pecasDoFiltro('reporter', ancoras({ 8: undefined })).map((x) => x.parte)).toEqual(['chapeu']);
  });

  it('herói: capa pelos ombros (escala própria) e máscara pelo rosto; sem ombros, só a máscara', () => {
    const a: AncorasRosto = ancoras();
    expect(pecasDoFiltro('heroi', a)).toEqual([
      { parte: 'capa', transform: transformDoQuadro(a.capa!) },
      { parte: 'rosto', transform: transformDoQuadro(a.rosto) },
    ]);
    expect(pecasDoFiltro('heroi', ancoras({ 11: undefined })).map((x) => x.parte)).toEqual(['rosto']);
  });

  it('a lupa cai no olho direito (5) da foto espelhada', () => {
    const a = ancoras();
    // Olho 5 sem espelhar em x = 0,45 → espelhado 0,55 × 480 = 264 px; no quadro, o olho direito é (50, 0).
    const x = a.rosto.x + 50 * a.rosto.escala * Math.cos((a.rosto.graus * Math.PI) / 180);
    expect(x).toBeCloseTo(264, 5);
    expect(a.olhoDireito!.x).toBeCloseTo(264, 5);
  });
});
