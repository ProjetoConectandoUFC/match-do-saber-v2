// @vitest-environment jsdom
import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { calcularAncoras } from '../core/ancorasRosto';
import type { Estado, Partida } from '../core/partida';
import type { Noticia } from '../core/types';
import { capturarFoto, type FotoPartida } from './foto';
import { useFotoPartida } from './useFotoPartida';

// AC-13.5/AC-13.7 (v10.2.0): a foto e as âncoras do rosto nunca vão para armazenamento nem para a rede,
// e são descartadas ao sair do resumo. Vigia todos os canais de saída do navegador durante uma partida inteira.

const noticia = (i: number): Noticia => ({
  id: `n${i}`, veredito: 'falsa', tecnica: 'fonte', titulo: `n${i}`, descricao: '', saibaMais: '', tema: 'ciencia', explicacao: '', fonteUrl: '',
});
const partida: Partida = { cards: Array.from({ length: 10 }, (_, i) => noticia(i)), resultados: [], entrada: 'corpo' };

const pose = Array.from({ length: 13 }, () => ({ x: 0.5, y: 0.5, visibility: 0 }));
Object.assign(pose, {
  2: { x: 0.55, y: 0.4, visibility: 1 }, 5: { x: 0.45, y: 0.4, visibility: 1 },
  7: { x: 0.6, y: 0.42, visibility: 1 }, 8: { x: 0.4, y: 0.42, visibility: 1 },
  11: { x: 0.7, y: 0.8, visibility: 1 }, 12: { x: 0.3, y: 0.8, visibility: 1 },
});

let saidas: { canal: string; dados: string }[];
const registrar = (canal: string) => (...args: unknown[]) => {
  saidas.push({ canal, dados: args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a) ?? String(a))).join(' ') });
};

beforeEach(() => {
  saidas = [];
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(registrar('storage'));
  vi.stubGlobal('fetch', vi.fn(registrar('fetch')));
  vi.stubGlobal('indexedDB', { open: vi.fn(registrar('indexedDB')), deleteDatabase: vi.fn() });
  vi.spyOn(XMLHttpRequest.prototype, 'open').mockImplementation(registrar('xhr.open'));
  vi.spyOn(XMLHttpRequest.prototype, 'send').mockImplementation(registrar('xhr.send'));
  Object.defineProperty(navigator, 'sendBeacon', { configurable: true, value: vi.fn(registrar('sendBeacon')) });
  vi.stubGlobal('WebSocket', vi.fn(registrar('WebSocket')));
  // Câmera e canvas falsos: a foto é uma data URL com as âncoras de uma pose com rosto.
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ translate() {}, scale() {}, drawImage() {} } as unknown as CanvasRenderingContext2D);
  vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/jpeg;base64,/9j/AAAA');
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function video() {
  const v = document.createElement('video');
  Object.defineProperty(v, 'videoWidth', { value: 1280 });
  Object.defineProperty(v, 'videoHeight', { value: 720 });
  return v;
}

describe('privacidade da foto e das âncoras (AC-13.5, AC-13.7)', () => {
  it('uma partida inteira com foto não escreve no armazenamento nem usa a rede, e sair do resumo descarta tudo', () => {
    const v = video();
    const { result, rerender } = renderHook(
      ({ estado }: { estado: Estado }) => useFotoPartida<FotoPartida>(estado, true, () => capturarFoto(v, pose)),
      { initialProps: { estado: { tela: 'espera' } as Estado } },
    );
    rerender({ estado: { tela: 'calibracao', centradoMs: 0, ausenteMs: 0 } });
    for (let i = 0; i < 10; i++) {
      rerender({ estado: { tela: 'card', partida, indice: i, restanteMs: 15000, saibaMais: false, ausenteMs: null } });
      rerender({ estado: { tela: 'feedback', partida, indice: i, restanteMs: 3250, resposta: 'verdadeira' } });
    }
    rerender({ estado: { tela: 'resumo', partida } });

    const foto = result.current!;
    expect(foto.imagem).toMatch(/^data:image\/jpeg/);
    expect(foto.ancoras).toEqual(calcularAncoras(pose, { largura: 480, altura: 270, espelhada: true }));
    expect(foto.ancoras).not.toBeNull();
    expect(saidas).toEqual([]);

    rerender({ estado: { tela: 'espera' } });
    expect(result.current).toBeNull();
    expect(saidas).toEqual([]);
  });

  it('o vigia pega uma escrita de verdade (controle do teste)', () => {
    localStorage.setItem('x', 'data:image/jpeg;base64,/9j/');
    void fetch('/x', { method: 'POST', body: 'y' });
    expect(saidas.map((s) => s.canal)).toEqual(['storage', 'fetch']);
  });
});
