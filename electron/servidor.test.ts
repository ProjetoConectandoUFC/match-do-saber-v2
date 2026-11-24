import http from 'node:http';
import { afterEach, describe, expect, it } from 'vitest';
import { escutar } from './servidor.cjs';

// NFR Reliability (v12.1.0, Fase 50.4): o app de desktop não fica sem servidor por causa da porta preferida.
const abertos: http.Server[] = [];
const criar = () => {
  const s = http.createServer((_req, res) => res.end('ok'));
  abertos.push(s);
  return s;
};
afterEach(async () => {
  await Promise.all(abertos.splice(0).map((s) => new Promise((ok) => s.close(() => ok(null)))));
});

describe('escutar', () => {
  it('usa a porta preferida quando está livre', async () => {
    const livre = await escutar(criar, 0, '127.0.0.1');
    abertos.splice(0).forEach((s) => s.close());
    await new Promise((ok) => setTimeout(ok, 20));
    expect(await escutar(criar, livre, '127.0.0.1')).toBe(livre);
  });

  it('cai para outra porta quando a preferida está ocupada (EADDRINUSE)', async () => {
    const ocupada = await escutar(criar, 0, '127.0.0.1');
    const porta = await escutar(criar, ocupada, '127.0.0.1');
    expect(porta).not.toBe(ocupada);
    expect(porta).toBeGreaterThan(0);
  });

  it('cai para outra porta em qualquer erro de listen (ex.: EACCES, porta reservada pelo Hyper-V)', async () => {
    let n = 0;
    const criarComFalha = () => {
      const s = criar();
      if (n++ === 0) {
        s.listen = (() => {
          setImmediate(() => s.emit('error', Object.assign(new Error('acesso negado'), { code: 'EACCES' })));
          return s;
        }) as typeof s.listen;
      }
      return s;
    };
    const porta = await escutar(criarComFalha, 37425, '127.0.0.1');
    expect(porta).toBeGreaterThan(0);
    expect(porta).not.toBe(37425);
  });

  it('rejeita se nem a porta de reserva abre', async () => {
    const criarSempreFalha = () => {
      const s = criar();
      s.listen = (() => {
        setImmediate(() => s.emit('error', Object.assign(new Error('sem rede'), { code: 'EACCES' })));
        return s;
      }) as typeof s.listen;
      return s;
    };
    await expect(escutar(criarSempreFalha, 37425, '127.0.0.1')).rejects.toThrow('sem rede');
  });
});

// NFR Security (v10.2.0) com o Web Worker da pose (FR-20, v13.3.0): o worker não herda a CSP da meta de index.html; o
// servidor local manda a mesma política no cabeçalho de todo arquivo, então ela vale também para o worker.
describe('cabecalhosArquivo', () => {
  it('manda o tipo e a mesma connect-src de index.html', async () => {
    const { readFileSync } = await import('node:fs');
    const { cabecalhosArquivo } = await import('./servidor.cjs');
    const meta = /<meta\s+http-equiv="Content-Security-Policy"\s+content="([^"]+)"/i.exec(readFileSync('index.html', 'utf8'))?.[1];
    const c = cabecalhosArquivo('text/javascript; charset=utf-8');
    expect(c['Content-Type']).toBe('text/javascript; charset=utf-8');
    expect(c['Content-Security-Policy']).toBe(meta);
  });
});
