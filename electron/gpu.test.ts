import { describe, expect, it } from 'vitest';
import { aplicarSwitchesGpu } from './gpu.cjs';

// Performance (23/11): no teste de 18/11 (Ryzen sem placa de vídeo dedicada) o jogo ficou em 15 fps. Driver de
// vídeo integrado na lista de bloqueio do Chromium faz o WebGL (e a detecção de pose) rodar emulado na CPU.
describe('aplicarSwitchesGpu', () => {
  it('ignora a lista de bloqueio de GPU do Chromium', () => {
    const chamadas: string[] = [];
    aplicarSwitchesGpu({ appendSwitch: (s: string) => { chamadas.push(s); } });
    expect(chamadas).toContain('ignore-gpu-blocklist');
  });
});
