// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { criarTocador } from './audio';

interface Usados { osciladores: number; ruidos: number[]; filtros: string[] }
/** O que o último AudioContext falso criou (osciladores, buffers de ruído e filtros). */
let ultimosUsados: Usados = { osciladores: 0, ruidos: [], filtros: [] };

/** AudioContext falso: guarda o volume inicial de cada nota. */
function instalarAudioFalso() {
  const volumes: number[] = [];
  const usados: Usados = { osciladores: 0, ruidos: [], filtros: [] };
  class Falso {
    currentTime = 0;
    state = 'running';
    destination = {};
    sampleRate = 48000;
    createOscillator() {
      usados.osciladores++;
      return { type: '', frequency: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {}, start() {}, stop() {} };
    }
    createBuffer(_canais: number, quadros: number) {
      usados.ruidos.push(quadros);
      const dados = new Float32Array(quadros);
      return { getChannelData: () => dados };
    }
    createBufferSource() {
      return { buffer: null, connect() {}, start() {}, stop() {} };
    }
    createBiquadFilter() {
      const f = {
        type: '', Q: { value: 0 },
        frequency: { setValueAtTime() {}, exponentialRampToValueAtTime() {} },
        connect() { usados.filtros.push(f.type); },
      };
      return f;
    }
    createGain() {
      let primeiro = true;
      return {
        gain: {
          setValueAtTime(v: number) { if (primeiro) { volumes.push(v); primeiro = false; } },
          exponentialRampToValueAtTime() {},
        },
        connect() {},
      };
    }
  }
  (window as unknown as { AudioContext: unknown }).AudioContext = Falso;
  ultimosUsados = usados;
  return volumes;
}

afterEach(() => { delete (window as unknown as { AudioContext?: unknown }).AudioContext; });

describe('volume dos sons (AC-9.29, v12.0.0)', () => {
  it('sem fator (Alto), os sons tocam como antes', () => {
    const volumes = instalarAudioFalso();
    criarTocador().tocar('acerto');
    expect(volumes).toEqual([0.2, 0.2]);
  });

  it('o fator do volume multiplica cada nota (Baixo 30%, Médio 60%)', () => {
    const volumes = instalarAudioFalso();
    const t = criarTocador();
    t.tocar('acerto', 0.3);
    t.tocar('erro', 0.6);
    expect(volumes.map((v) => Number(v.toFixed(4)))).toEqual([0.06, 0.06, 0.072]);
  });
});

describe('som de carta (AC-17.8, v13.0.0)', () => {
  it('é um ruído curto filtrado (o "fff" de papel), gerado no jogo, sem oscilador', () => {
    instalarAudioFalso();
    criarTocador().tocar('carta');
    expect(ultimosUsados.osciladores).toBe(0);
    expect(ultimosUsados.filtros).toEqual(['bandpass']);
    // Curto: menos de 0,3 s de ruído a 48 kHz.
    expect(ultimosUsados.ruidos).toHaveLength(1);
    expect(ultimosUsados.ruidos[0]!).toBeGreaterThan(0);
    expect(ultimosUsados.ruidos[0]!).toBeLessThan(0.3 * 48000);
  });

  it('segue o volume dos Ajustes (AC-9.29)', () => {
    const v = instalarAudioFalso();
    const t = criarTocador();
    t.tocar('carta');
    t.tocar('carta', 0.3);
    expect(v[1]!).toBeCloseTo(v[0]! * 0.3, 6);
    expect(v[0]!).toBeGreaterThan(0);
  });
});

describe('falha de áudio não derruba o jogo (FR-11)', () => {
  it('um AudioContext sem ruído (createBuffer) não lança ao tocar a carta', () => {
    class SoOscilador {
      currentTime = 0; state = 'running'; destination = {};
      createOscillator() { return { type: '', frequency: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {}, start() {}, stop() {} }; }
      createGain() { return { gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} }; }
    }
    (window as unknown as { AudioContext: unknown }).AudioContext = SoOscilador;
    expect(() => criarTocador().tocar('carta')).not.toThrow();
  });
});
