---
scope: tech-stack
loaded-by: sdd-brainstorm, sdd-specify, sdd-plan, sdd-execute, sdd-review
---

# Tech Stack

## Languages
TypeScript (app e scripts), CommonJS no processo principal do Electron (`electron/*.cjs`).

## Frameworks
- React 18 + Vite 8, CSS Modules, tokens do Conectando Design System em `src/app/tema.css`, Poppins local.
- MediaPipe Tasks Vision (Pose Landmarker lite), modelo e WASM servidos pelo próprio app.
- vite-plugin-pwa (versão web offline).
- Electron 33 + @electron/packager (app de desktop Windows, `npm run package:win`).

## Infrastructure
- Desktop: servidor HTTP local no Electron serve `dist/` e `/api/noticias`; banco em `Documentos/Match do Saber/noticias.csv` com backups.
- Web: GitHub Pages via `.github/workflows/publicar.yml` (push na `main`).
- Sem servidor próprio, sem rastreamento de terceiros (LGPD).

## Package Manager
npm (versões exatas no `package.json`; `allowScripts` libera os scripts de instalação do electron e do esbuild).
