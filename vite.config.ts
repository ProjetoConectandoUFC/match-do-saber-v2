import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  // v11.0.0: a página das fontes que o QR do resumo abre (AC-5.10) é uma entrada própria.
  build: {
    rolldownOptions: {
      input: { main: resolve(import.meta.dirname, 'index.html'), fontes: resolve(import.meta.dirname, 'fontes.html') },
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false,
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,webp,json,csv,wasm,task,woff2}'],
        globIgnores: ['**/vision_wasm_module_internal.*'],
        maximumFileSizeToCacheInBytes: 40 * 1024 * 1024,
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/fontes\.html/],
        cleanupOutdatedCaches: true,
      },
      manifest: {
        name: 'Match do Saber',
        short_name: 'Match do Saber',
        description: 'Jogo de checagem de notícias',
        lang: 'pt-BR',
        display: 'fullscreen',
        start_url: '.',
        scope: '.',
        background_color: '#1b1035',
        theme_color: '#1b1035',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
});
