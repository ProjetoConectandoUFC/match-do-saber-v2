// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { criarTocador } from './audio';

/** AudioContext falso: guarda o volume inicial de cada nota. */
function instalarAudioFalso() {
  const volumes: number[] = [];
  class Falso {
    currentTime = 0;
    state = 'running';
    destination = {};
    createOscillator() {
      return { type: '', frequency: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {}, start() {}, stop() {} };
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
