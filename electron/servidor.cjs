// Servidor HTTP local do app de desktop: escuta na porta preferida (fixa, para manter o localStorage dos
// Ajustes, que é por origem) e, em qualquer erro (EADDRINUSE, EACCES de porta reservada pelo Hyper-V/WSL,
// ...), cai para uma porta livre escolhida pelo sistema (NFR Reliability, v12.1.0).

/**
 * @param {() => import('http').Server} criar cria um servidor novo (um por tentativa)
 * @param {number} portaPreferida
 * @param {string} host
 * @returns {Promise<number>} a porta em uso
 */
function escutar(criar, portaPreferida, host) {
  const tentar = (porta) => new Promise((ok, falha) => {
    const servidor = criar();
    servidor.once('error', falha);
    servidor.listen(porta, host, () => {
      servidor.removeListener('error', falha);
      ok(servidor.address().port);
    });
  });
  return tentar(portaPreferida).catch((e) => {
    console.warn(`[servidor] porta ${portaPreferida} indisponível (${e.code || e.message}); usando outra`);
    return tentar(0);
  });
}

// NFR Security (v10.2.0): a mesma política da meta de index.html, também no cabeçalho, para valer no Web Worker da
// pose (FR-20, v13.3.0), que não herda a meta da página. Bloqueia o registro de uso do MediaPipe (odml.pa.googleapis.com).
const CSP = "connect-src 'self' blob: data:";

/** Cabeçalhos de um arquivo estático do jogo. */
function cabecalhosArquivo(tipo) {
  return { 'Content-Type': tipo, 'Content-Security-Policy': CSP };
}

module.exports = { escutar, cabecalhosArquivo };
