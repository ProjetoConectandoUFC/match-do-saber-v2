import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// NFR Security / AC-13.5 (v10.2.0): o MediaPipe Tasks cria sempre um registrador de uso que faz POST para
// https://odml.pa.googleapis.com/v1/log a cada 60 s (achado no E2E de foto.spec.ts). A página só pode
// abrir conexões com a própria origem; vale na web e no app de desktop, que serve o mesmo index.html.
describe('política de conexões da página (NFR Security)', () => {
  const html = readFileSync('index.html', 'utf8');
  const csp = /<meta\s+http-equiv="Content-Security-Policy"\s+content="([^"]+)"/i.exec(html)?.[1] ?? '';

  it('index.html restringe connect-src à própria origem', () => {
    const connect = csp.split(';').map((d) => d.trim()).find((d) => d.startsWith('connect-src'));
    expect(connect).toBeDefined();
    const fontes = connect!.split(/\s+/).slice(1);
    expect(fontes).toContain("'self'");
    expect(fontes.filter((f) => /^https?:|^\*$|^wss?:/.test(f))).toEqual([]);
  });
});
