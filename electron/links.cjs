// Match do Saber: links externos (fontes das notícias, AC-16.2, FR-17). Só http e https saem para o
// navegador do sistema; nenhum outro esquema (file:, javascript:, ms-settings: ...) é aberto.

function linkExterno(url) {
  if (typeof url !== 'string') return false;
  try {
    const u = new URL(url);
    return (u.protocol === 'http:' || u.protocol === 'https:') && !!u.hostname;
  } catch {
    return false;
  }
}

module.exports = { linkExterno };
