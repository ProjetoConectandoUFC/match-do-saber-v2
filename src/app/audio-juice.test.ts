// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { criarTocador } from './audio';

// v13.4.0 (AC-19.2, AC-19.5, FR-11): baque do carimbo e acerto deslocado em semitons, no volume dos Ajustes.
interface Nota { freq: number; volume: number }

function instalarAudioFalso() {
  const notas: Nota[] = [];
  class Falso {
    currentTime = 0;
    state = 'running';
    destination = {};
    sampleRate = 48000;
    createOscillator() {
      const nota: Nota = { freq: NaN, volume: NaN };
      notas.push(nota);
      return {
        type: '', connect() {}, start() {}, stop() {},
        frequency: { setValueAtTime(v: number) { if (Number.isNaN(nota.freq)) nota.freq = v; }, exponentialRampToValueAtTime() {} },
        nota,
      };
    }
    createGain() {
      const nota = notas[notas.length - 1];
      return {
        gain: { setValueAtTime(v: number) { if (nota && Number.isNaN(nota.volume)) nota.volume = v; }, exponentialRampToValueAtTime() {} },
        connect() {},
      };
    }
    createBuffer(_c: number, quadros: number) { const d = new Float32Array(quadros); return { getChannelData: () => d }; }
    createBufferSource() { return { buffer: null, connect() {}, start() {}, stop() {} }; }
    createBiquadFilter() {
      return { type: '', Q: { value: 0 }, frequency: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} };
    }
  }
  (window as unknown as { AudioContext: unknown }).AudioContext = Falso;
  return notas;
}

afterEach(() => { delete (window as unknown as { AudioContext?: unknown }).AudioContext; });

describe('AC-19.5: acerto deslocado em semitons', () => {
  it('sem deslocamento, as notas de sempre; com N semitons, cada nota × 2^(N/12)', () => {
    const base = instalarAudioFalso();
    criarTocador().tocar('acerto');
    const subida = instalarAudioFalso();
    criarTocador().tocar('acerto', 1, 4);
    expect(base.map((x) => x.freq)).toEqual([660, 990]);
    subida.forEach((x, i) => expect(x.freq).toBeCloseTo(base[i]!.freq * 2 ** (4 / 12), 6));
    expect(subida.map((x) => x.volume)).toEqual(base.map((x) => x.volume));
  });

  it('o volume dos Ajustes continua valendo com o deslocamento (AC-9.29)', () => {
    const notas = instalarAudioFalso();
    criarTocador().tocar('acerto', 0.3, 2);
    expect(notas.map((x) => x.volume)).toEqual([0.2 * 0.3, 0.2 * 0.3].map((v) => expect.closeTo(v, 6)));
  });
});

describe('AC-19.2: baque do carimbo', () => {
  it('é um som grave e curto, no volume dos Ajustes', () => {
    const cheio = instalarAudioFalso();
    criarTocador().tocar('carimbo');
    expect(cheio.length).toBeGreaterThan(0);
    for (const x of cheio) expect(x.freq).toBeLessThanOrEqual(200);
    const baixo = instalarAudioFalso();
    criarTocador().tocar('carimbo', 0.3);
    baixo.forEach((x, i) => expect(x.volume).toBeCloseTo(cheio[i]!.volume * 0.3, 6));
  });
});
