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

module.exports = { escutar };
