// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { capturarFoto, capturarQuadro } from './foto';

function video(w: number, h: number) {
  const v = document.createElement('video');
  Object.defineProperty(v, 'videoWidth', { value: w });
  Object.defineProperty(v, 'videoHeight', { value: h });
  return v;
}

function contextoFalso() {
  const chamadas: string[] = [];
  const g = {
    translate: vi.fn((x: number, y: number) => chamadas.push(`translate(${x}, ${y})`)),
    scale: vi.fn((x: number, y: number) => chamadas.push(`scale(${x}, ${y})`)),
    drawImage: vi.fn(() => chamadas.push('drawImage')),
  };
  return { g, chamadas };
}

afterEach(() => vi.restoreAllMocks());

describe('capturarQuadro (FR-13)', () => {
  it('vídeo sem dimensões devolve null', () => {
    expect(capturarQuadro(video(0, 0))).toBeNull();
  });

  it('AC-13.2: quadro 480×270, espelhado como a prévia, em JPEG', () => {
    const { g, chamadas } = contextoFalso();
    let canvas: HTMLCanvasElement | null = null;
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (this: HTMLCanvasElement) {
      canvas = this;
      return g as unknown as CanvasRenderingContext2D;
    });
    const toDataURL = vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/jpeg;base64,AAA');
    const v = video(1280, 720);

    expect(capturarQuadro(v)).toBe('data:image/jpeg;base64,AAA');
    expect(canvas).not.toBeNull();
    expect(canvas!.width).toBe(480);
    expect(canvas!.height).toBe(270);
    expect(chamadas).toEqual(['translate(480, 0)', 'scale(-1, 1)', 'drawImage']);
    expect(g.drawImage).toHaveBeenCalledWith(v, 0, 0, 480, 270);
    expect(toDataURL).toHaveBeenCalledWith('image/jpeg', 0.85);
  });

  it('AC-13.6: capturarFoto guarda junto com a imagem as âncoras do rosto, na foto espelhada e no tamanho dela', () => {
    const { g } = contextoFalso();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(g as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/jpeg;base64,AAA');
    const pose = Array.from({ length: 13 }, () => ({ x: 0.5, y: 0.5, visibility: 0 }));
    pose[2] = { x: 0.55, y: 0.4, visibility: 1 };
    pose[5] = { x: 0.45, y: 0.4, visibility: 1 };
    const f = capturarFoto(video(1280, 720), pose)!;
    expect(f).toMatchObject({ imagem: 'data:image/jpeg;base64,AAA', largura: 480, altura: 270 });
    expect(f.ancoras).toMatchObject({ largura: 480, altura: 270, espelhada: true, rosto: { fonte: 'olhos' } });
    expect(f.ancoras!.olhoEsquerdo!.x).toBeCloseTo(0.45 * 480, 6); // espelhada: x vira 1 − x
  });

  it('AC-13.6: sem pose ou sem rosto, a foto fica "sem filtro"; sem imagem, nada', () => {
    const { g } = contextoFalso();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(g as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/jpeg;base64,AAA');
    expect(capturarFoto(video(1280, 720), null)).toMatchObject({ imagem: 'data:image/jpeg;base64,AAA', ancoras: null });
    expect(capturarFoto(video(0, 0), null)).toBeNull();
  });

  it('AC-13.3: drawImage que lança erro devolve null', () => {
    const { g } = contextoFalso();
    g.drawImage.mockImplementation(() => { throw new Error('falhou'); });
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(g as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/jpeg;base64,AAA');
    expect(capturarQuadro(video(1280, 720))).toBeNull();
  });
});
