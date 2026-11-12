// Match do Saber: avisa a página que ela está no app de desktop (o painel Notícias usa /api/noticias) e
// abre as fontes no navegador do sistema (AC-16.2, FR-17; o processo principal só aceita http e https).
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('matchDoSaber', {
  desktop: true,
  abrirLink: (url) => ipcRenderer.invoke('abrir-link', String(url)),
});
