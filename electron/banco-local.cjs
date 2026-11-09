// Match do Saber: banco de notícias local do app de desktop (FR-7, FR-8).
// Guarda o CSV em Documentos/Match do Saber/noticias.csv e copia o arquivo anterior
// para backups/ antes de cada gravação. Só cuida do arquivo (formato e cópias):
// as regras das notícias (AC-7.3) ficam em src/core/banco.ts, no jogo.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const MAX_BACKUPS = 100;

const hash = (buf) => crypto.createHash('sha256').update(buf).digest('hex');

// CSV salvo pelo Excel pode vir em Windows-1252 em vez de UTF-8.
function decodificar(buf) {
  try { return new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(buf); }
  catch { return new TextDecoder('windows-1252').decode(buf); }
}

// Só o formato: o cabeçalho precisa ter a coluna "titulo" (FR-6).
function pareceBanco(texto) {
  const primeira = String(texto).replace(/^\uFEFF/, '').split(/\r?\n/, 1)[0] || '';
  return primeira.split(/[;,]/).some((c) => c.replace(/["']/g, '').trim().toLowerCase() === 'titulo');
}

const dois = (n) => String(n).padStart(2, '0');
function carimbo(d) {
  return `${d.getFullYear()}-${dois(d.getMonth() + 1)}-${dois(d.getDate())}_${dois(d.getHours())}-${dois(d.getMinutes())}-${dois(d.getSeconds())}`;
}

/**
 * @param {{ pasta: string, embutido: string, agora?: () => Date }} opcoes
 *   pasta: Documentos/Match do Saber; embutido: o noticias.csv que vem com o app.
 */
function criarBancoLocal({ pasta, embutido, agora = () => new Date() }) {
  const arquivo = path.join(pasta, 'noticias.csv');
  const pastaBackups = path.join(pasta, 'backups');

  function caminhoBackup(prefixo) {
    fs.mkdirSync(pastaBackups, { recursive: true });
    const base = `${prefixo}-${carimbo(agora())}`;
    let nome = `${base}.csv`;
    for (let i = 2; fs.existsSync(path.join(pastaBackups, nome)); i++) nome = `${base}-${i}.csv`;
    return path.join(pastaBackups, nome);
  }

  function podarBackups() {
    const antigos = fs.readdirSync(pastaBackups).filter((f) => /^noticias-\d.*\.csv$/.test(f)).sort();
    for (const f of antigos.slice(0, Math.max(0, antigos.length - MAX_BACKUPS))) fs.unlinkSync(path.join(pastaBackups, f));
  }

  function recriar() {
    fs.copyFileSync(embutido, arquivo);
  }

  /** Lê o banco (AC-8.3): cria do embutido na 1ª vez; arquivo vazio ou ilegível vai para backups e é recriado. */
  function ler() {
    fs.mkdirSync(pasta, { recursive: true });
    if (!fs.existsSync(arquivo)) recriar();
    let buf;
    try {
      buf = fs.readFileSync(arquivo);
    } catch {
      buf = null;
    }
    if (!buf || !pareceBanco(decodificar(buf))) {
      if (buf) fs.renameSync(arquivo, caminhoBackup('noticias-ilegivel'));
      recriar();
      buf = fs.readFileSync(arquivo);
    }
    return { arquivo, versao: hash(buf), csv: decodificar(buf) };
  }

  /** Grava o banco: confere que ninguém mudou o arquivo desde a leitura, faz o backup e troca o arquivo. */
  function gravar({ versao, csv }) {
    if (typeof csv !== 'string' || !pareceBanco(csv)) throw new Error('o conteúdo não está no formato do banco de notícias');
    if (fs.existsSync(arquivo)) {
      if (hash(fs.readFileSync(arquivo)) !== versao) {
        const e = new Error('o arquivo foi alterado fora do painel. Feche e abra o painel Notícias para carregar a versão nova.');
        e.status = 409;
        throw e;
      }
      fs.copyFileSync(arquivo, caminhoBackup('noticias'));
      podarBackups();
    }
    const tmp = `${arquivo}.tmp`;
    const buf = Buffer.from(csv, 'utf8');
    fs.writeFileSync(tmp, buf);
    fs.renameSync(tmp, arquivo);
    return { arquivo, versao: hash(buf) };
  }

  return { arquivo, pasta, ler, gravar };
}

module.exports = { criarBancoLocal, decodificar, pareceBanco };
