// @vitest-environment jsdom
// NFR Reliability (v12.1.0, Fase 50.3): na web, a tela não entra em repouso com o jogo aberto.
import { act, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useTelaAcordada } from './useTelaAcordada';

function Tela() {
  useTelaAcordada();
  return null;
}
const esvaziar = () => act(async () => { for (let i = 0; i < 5; i++) await Promise.resolve(); });

function stubWakeLock(request: ReturnType<typeof vi.fn>) {
  Object.defineProperty(navigator, 'wakeLock', { configurable: true, value: { request } });
}
function visibilidade(v: DocumentVisibilityState) {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => v });
  document.dispatchEvent(new Event('visibilitychange'));
}

afterEach(() => {
  delete (navigator as { wakeLock?: unknown }).wakeLock;
  delete (document as { visibilityState?: unknown }).visibilityState;
  vi.restoreAllMocks();
});

describe('useTelaAcordada (NFR Reliability v12.1.0)', () => {
  it('pede o Wake Lock de tela ao abrir e de novo quando a página volta a ficar visível', async () => {
    const liberar = vi.fn().mockResolvedValue(undefined);
    const request = vi.fn().mockResolvedValue({ release: liberar, released: false });
    stubWakeLock(request);
    const { unmount } = render(<Tela />);
    await esvaziar();
    expect(request).toHaveBeenCalledWith('screen');
    visibilidade('hidden');
    await esvaziar();
    expect(request).toHaveBeenCalledTimes(1);
    visibilidade('visible');
    await esvaziar();
    expect(request).toHaveBeenCalledTimes(2);
    unmount();
    await esvaziar();
    expect(liberar).toHaveBeenCalled();
  });

  it('ignora a recusa do navegador', async () => {
    stubWakeLock(vi.fn().mockRejectedValue(new DOMException('não', 'NotAllowedError')));
    render(<Tela />);
    await esvaziar();
  });

  it('sem Wake Lock no navegador, não faz nada', () => {
    expect(() => render(<Tela />)).not.toThrow();
  });
});
