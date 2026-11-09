// Match do Saber: avisa a página que ela está no app de desktop (o painel Notícias usa /api/noticias).
const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('matchDoSaber', { desktop: true });
