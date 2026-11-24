import { describe, expect, it, vi } from 'vitest';
import { bloquearRedeExterna } from './redeWorker';

// NFR Security (v10.2.0) no Web Worker da pose (FR-20, v13.3.0): o worker não herda a CSP da página (meta em index.html),
// e o MediaPipe manda métricas de uso para odml.pa.googleapis.com a cada 60 s. Dentro do worker, só a própria origem.
function escopo() {
  const fetch = vi.fn(async () => new Response('ok'));
  const open = vi.fn();
  class Xhr {}
  (Xhr.prototype as unknown as { open: typeof open }).open = open;
  const e = { fetch, XMLHttpRequest: Xhr, location: { href: 'http://127.0.0.1:37425/assets/poseWorker.js', origin: 'http://127.0.0.1:37425' } };
  bloquearRedeExterna(e as never);
  return { e: e as unknown as { fetch: typeof globalThis.fetch; XMLHttpRequest: new () => { open(m: string, u: string): void } }, fetch, open };
}

describe('bloquearRedeExterna', () => {
  it('recusa fetch para outra origem (o registro de uso do MediaPipe) sem tocar a rede', async () => {
    const { e, fetch } = escopo();
    await expect(e.fetch('https://odml.pa.googleapis.com/v1/log', { method: 'POST' })).rejects.toThrow(/própria origem/);
    await expect(e.fetch(new Request('https://exemplo.org/x'))).rejects.toThrow();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('deixa passar os arquivos do próprio app (modelo e WASM), relativos ou absolutos, e blob:', async () => {
    const { e, fetch } = escopo();
    await e.fetch('/mediapipe/pose_landmarker_lite.task');
    await e.fetch('http://127.0.0.1:37425/mediapipe/wasm/vision_wasm_internal.wasm');
    await e.fetch('blob:http://127.0.0.1:37425/abc');
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it('XMLHttpRequest para outra origem também é recusado', () => {
    const { e, open } = escopo();
    const x = new e.XMLHttpRequest();
    expect(() => x.open('POST', 'https://odml.pa.googleapis.com/v1/log')).toThrow(/própria origem/);
    x.open('GET', '/mediapipe/x.wasm');
    expect(open).toHaveBeenCalledTimes(1);
  });
});
