import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
// Poppins servida pelo próprio jogo (FR-15): funciona offline, inclusive no app de desktop.
import '@fontsource/poppins/latin-400.css';
import '@fontsource/poppins/latin-500.css';
import '@fontsource/poppins/latin-600.css';
import '@fontsource/poppins/latin-700.css';
import '@fontsource/poppins/latin-800.css';
import '@fontsource/poppins/latin-900.css';
import './app/tema.css';
import { App } from './app/App';

// No app de desktop (Electron) os arquivos já são locais: sem service worker, para não servir versão antiga.
if (!(window as { matchDoSaber?: { desktop?: boolean } }).matchDoSaber?.desktop) registerSW({ immediate: true });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
