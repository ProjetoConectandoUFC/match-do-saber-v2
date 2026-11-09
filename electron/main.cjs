// Match do Saber: processo principal do Electron (app de desktop offline, FR-8).
// Modelo: electron/main.cjs do Prova ou Reprova. Serve o jogo compilado (dist/, com o modelo de
// detecção em dist/mediapipe) e as rotas /api num servidor HTTP local (127.0.0.1), sem internet.

const { app, BrowserWindow, Menu, session, shell } = require('electron');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { criarBancoLocal } = require('./banco-local.cjs');

// Porta fixa para manter as configurações do jogo (localStorage é por origem); se ocupada, usa outra.
const PORTA_PREFERIDA = 37425;
const DIST = path.join(__dirname, '..', 'dist');
const BANCO_EMBUTIDO = path.join(DIST, 'content', 'noticias.csv');

let banco;
let win;

// ---------- Servidor HTTP local ----------
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.webmanifest': 'application/manifest+json',
  '.csv': 'text/csv; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.ico': 'image/x-icon', '.woff2': 'font/woff2',
  '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.wasm': 'application/wasm', '.task': 'application/octet-stream',
};

function enviar(res, status, corpo, tipo = 'application/json; charset=utf-8') {
  res.writeHead(status, { 'Content-Type': tipo, 'Cache-Control': 'no-store' });
  res.end(corpo);
}
const enviarJson = (res, status, obj) => enviar(res, status, JSON.stringify(obj));

function lerCorpo(req, limite = 20 * 1024 * 1024) {
  return new Promise((ok, falha) => {
    const partes = [];
    let tamanho = 0;
    req.on('data', (c) => {
      tamanho += c.length;
      if (tamanho > limite) { falha(new Error('arquivo grande demais')); req.destroy(); } else partes.push(c);
    });
    req.on('end', () => ok(Buffer.concat(partes)));
    req.on('error', falha);
  });
}

function atualizarTitulo() {
  if (win && !win.isDestroyed()) win.setTitle(`Match do Saber · ${banco.arquivo}`);
}

async function rotaNoticias(req, res) {
  try {
    if (req.method === 'GET') return enviarJson(res, 200, banco.ler());
    if (req.method === 'PUT') {
      const corpo = JSON.parse((await lerCorpo(req)).toString('utf8') || '{}');
      const r = banco.gravar({ versao: corpo.versao, csv: corpo.csv });
      atualizarTitulo();
      return enviarJson(res, 200, r);
    }
    return enviarJson(res, 405, { erro: 'método não permitido' });
  } catch (e) {
    // Ex.: EBUSY/EPERM quando o CSV está aberto no Excel; 409 quando mudou fora do painel.
    const motivo = e.code === 'EBUSY' || e.code === 'EPERM'
      ? 'o arquivo está aberto em outro programa (feche o Excel e tente de novo)'
      : e.message;
    console.error('[noticias]', e);
    return enviarJson(res, e.status || 500, { erro: motivo });
  }
}

function tratar(req, res) {
  const url = new URL(req.url, 'http://localhost');
  let p;
  try { p = decodeURIComponent(url.pathname); } catch { return enviar(res, 400, 'Endereço inválido', 'text/plain'); }

  if (p === '/api/noticias') return void rotaNoticias(req, res);
  if (p.startsWith('/api/')) return enviarJson(res, 404, { erro: 'rota não encontrada' });

  // Arquivos estáticos, com fallback para index.html (SPA).
  let arquivo = path.normalize(path.join(DIST, p));
  if (!arquivo.startsWith(DIST)) return enviar(res, 403, 'Proibido', 'text/plain');
  if (!fs.existsSync(arquivo) || fs.statSync(arquivo).isDirectory()) arquivo = path.join(DIST, 'index.html');
  const tipo = MIME[path.extname(arquivo).toLowerCase()] || 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': tipo });
  fs.createReadStream(arquivo).pipe(res);
}

function iniciarServidor() {
  return new Promise((ok, falha) => {
    const servidor = http.createServer(tratar);
    servidor.once('error', (e) => {
      if (e.code !== 'EADDRINUSE') return falha(e);
      const outro = http.createServer(tratar);
      outro.listen(0, '127.0.0.1', () => ok(outro.address().port));
    });
    servidor.listen(PORTA_PREFERIDA, '127.0.0.1', () => ok(PORTA_PREFERIDA));
  });
}

// ---------- Janela ----------
// Sons tocam sem exigir um clique antes (FR-11).
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

// Uma instância só.
if (!app.requestSingleInstanceLock()) app.quit();

app.on('second-instance', () => {
  if (win) { if (win.isMinimized()) win.restore(); win.focus(); }
});

app.whenReady().then(async () => {
  banco = criarBancoLocal({
    // MATCH_DO_SABER_DADOS: outra pasta, só para testes (não mexe nos Documentos do operador).
    pasta: process.env.MATCH_DO_SABER_DADOS || path.join(app.getPath('documents'), 'Match do Saber'),
    embutido: BANCO_EMBUTIDO,
  });
  try { banco.ler(); } catch (e) { console.error('[noticias] não foi possível preparar o banco local', e); }

  // Câmera liberada para o próprio jogo (a página só pede vídeo; nada é gravado nem enviado).
  const origemDoJogo = (u) => /^http:\/\/127\.0\.0\.1:\d+\//.test(u || '');
  session.defaultSession.setPermissionRequestHandler((wc, permissao, responder) => {
    responder(origemDoJogo(wc.getURL()) && (permissao === 'media' || permissao === 'fullscreen'));
  });
  session.defaultSession.setPermissionCheckHandler((wc, permissao, origem) =>
    origemDoJogo(`${origem}/`) && (permissao === 'media' || permissao === 'fullscreen'));

  const porta = await iniciarServidor();
  Menu.setApplicationMenu(null); // sem barra de menus (AC-8.2)

  win = new BrowserWindow({
    width: 1366, height: 768, show: false, backgroundColor: '#1b1035',
    title: 'Match do Saber',
    icon: path.join(DIST, 'icons', 'icon-512.png'),
    webPreferences: {
      contextIsolation: true, nodeIntegration: false, sandbox: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  });
  win.on('page-title-updated', (e) => e.preventDefault());
  win.maximize();
  win.show();
  atualizarTitulo();

  // Links externos (fontes das notícias) abrem no navegador do sistema, se houver internet.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });

  // F11 tela cheia; Ctrl+R recarrega (relê o banco, AC-8.4); Ctrl+Shift+O abre a pasta do banco; Ctrl+Shift+I ferramentas.
  win.webContents.on('before-input-event', (evento, tecla) => {
    if (tecla.type !== 'keyDown') return;
    const mod = tecla.control || tecla.meta;
    const k = tecla.key.toLowerCase();
    if (tecla.key === 'F11') { win.setFullScreen(!win.isFullScreen()); evento.preventDefault(); }
    else if (mod && !tecla.shift && k === 'r') { win.reload(); evento.preventDefault(); }
    else if (mod && tecla.shift && k === 'o') { shell.openPath(banco.pasta); evento.preventDefault(); }
    else if (mod && tecla.shift && k === 'i') { win.webContents.toggleDevTools(); evento.preventDefault(); }
  });

  win.loadURL(`http://127.0.0.1:${porta}/`);
});

app.on('window-all-closed', () => app.quit());
