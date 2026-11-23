// Match do Saber: processo principal do Electron (app de desktop offline, FR-8).
// Modelo: electron/main.cjs do Prova ou Reprova. Serve o jogo compilado (dist/, com o modelo de
// detecção em dist/mediapipe) e as rotas /api num servidor HTTP local (127.0.0.1), sem internet.

const { app, BrowserWindow, dialog, ipcMain, Menu, powerSaveBlocker, session, shell } = require('electron');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { criarBancoLocal } = require('./banco-local.cjs');
const { linkExterno } = require('./links.cjs');
const { escutar } = require('./servidor.cjs');

// Porta fixa para manter as configurações do jogo (localStorage é por origem); se ocupada, usa outra.
const PORTA_PREFERIDA = 37425;
const DIST = path.join(__dirname, '..', 'dist');
const BANCO_EMBUTIDO = path.join(DIST, 'content', 'noticias.csv');

let banco;
let win;
const INICIO = Date.now();
let iniciando = true; // até a janela existir

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

// Qualquer erro na porta preferida (ocupada, reservada pelo sistema) cai para outra (NFR Reliability, v12.1.0).
const iniciarServidor = () => escutar(() => http.createServer(tratar), PORTA_PREFERIDA, '127.0.0.1');

// ---------- Janela ----------
// Sons tocam sem exigir um clique antes (FR-11).
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

// Uma instância só.
const unica = app.requestSingleInstanceLock();
if (!unica) app.quit();

// Abriram o app de novo: traz a janela para a frente. Se esta instância está sem janela (travou ao iniciar),
// fecha, para não segurar a trava de instância única; o próximo clique abre normalmente (NFR Reliability,
// v12.1.0). Nos primeiros 15 s ela pode estar só iniciando (ex.: duplo clique no atalho): espera.
app.on('second-instance', () => {
  if (win && !win.isDestroyed()) {
    if (win.isMinimized()) win.restore();
    win.focus();
  } else if (!iniciando || Date.now() - INICIO > 15000) {
    app.quit();
  }
});

function falhaAoIniciar(e) {
  console.error('[match-do-saber] não foi possível iniciar', e);
  dialog.showErrorBox('Match do Saber não conseguiu abrir',
    `O jogo não pôde iniciar e vai fechar. Abra de novo; se repetir, reinicie o computador.\n\nDetalhe: ${e && e.message ? e.message : e}`);
  app.quit();
}

if (unica) app.whenReady().then(async () => {
  // Tela e notebook não entram em repouso com o jogo aberto (NFR Reliability, v12.1.0).
  powerSaveBlocker.start('prevent-display-sleep');

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

  // Painel Questões (AC-16.2): o preload pede para abrir uma fonte no navegador do sistema.
  ipcMain.handle('abrir-link', async (_evento, url) => {
    if (!linkExterno(url)) return false;
    await shell.openExternal(url);
    return true;
  });

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

  // Links externos (fontes das notícias) abrem no navegador do sistema, se houver internet; nunca na
  // janela do jogo (AC-16.2, FR-17). Só http e https.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (linkExterno(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (evento, url) => {
    if (url.startsWith(`http://127.0.0.1:${porta}/`)) return; // o próprio jogo (ex.: recarregar)
    evento.preventDefault();
    if (linkExterno(url)) shell.openExternal(url);
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
  iniciando = false;
}).catch(falhaAoIniciar); // sem janela, o processo não fica vivo segurando a instância única (v12.1.0)

app.on('window-all-closed', () => app.quit());
