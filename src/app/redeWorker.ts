interface EscopoRede {
  fetch: typeof globalThis.fetch;
  XMLHttpRequest?: { prototype: { open(...args: unknown[]): void } };
  location: { href: string; origin: string };
}

/**
 * NFR Security (v10.2.0) dentro do Web Worker da pose (FR-20, v13.3.0): o worker não herda a CSP `connect-src 'self'`
 * da página, e o MediaPipe manda sozinho métricas de uso para odml.pa.googleapis.com a cada 60 s. Aqui, `fetch` e
 * `XMLHttpRequest` só alcançam a própria origem (e `blob:`/`data:`); o resto é recusado antes da rede.
 */
export function bloquearRedeExterna(escopo: EscopoRede): void {
  const permitida = (url: unknown): boolean => {
    try {
      const u = new URL(String(url), escopo.location.href);
      return u.origin === escopo.location.origin || u.protocol === 'blob:' || u.protocol === 'data:';
    } catch {
      return false;
    }
  };
  const recusa = () => new TypeError('Match do Saber: o worker da pose só fala com a própria origem (NFR Security)');
  const original = escopo.fetch.bind(escopo);
  escopo.fetch = (entrada: RequestInfo | URL, init?: RequestInit) => {
    const url = entrada instanceof Request ? entrada.url : entrada;
    return permitida(url) ? original(entrada, init) : Promise.reject(recusa());
  };
  const proto = escopo.XMLHttpRequest?.prototype;
  if (proto) {
    const abrir = proto.open;
    proto.open = function (this: unknown, ...args: unknown[]) {
      if (!permitida(args[1])) throw recusa();
      return abrir.apply(this, args);
    };
  }
}
