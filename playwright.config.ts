import { defineConfig } from '@playwright/test';

// E2E_PORT: outra porta, para rodar em paralelo com outro worktree (padrão 4173).
const porta = process.env.E2E_PORT ?? '4173';
const origem = `http://localhost:${porta}`;

// Testes que medem tempo real com a detecção de pose rodando: só valem sozinhos na máquina.
// Rodam num projeto próprio, depois de todos os outros, sem relaxar o critério de FR-1.
// Para rodar só eles: `npx playwright test --project=em-serie --no-deps`.
const EM_SERIE = /(relogio-real|cadencia)\.spec\.ts/;

/**
 * v13.4.0 (AC-18.1, Fase 53.2): os E2E rodam só na interface Cartas, a padrão. A Clássica continua no app como reserva
 * e nos testes unitários (`describe.each` em `INTERFACES_JOGO`), mas sai dos E2E (decisão do responsável, 2026-11-24).
 * Nenhum `localStorage` é gravado antes de abrir: os testes veem o padrão de verdade.
 */
export default defineConfig({
  testDir: 'tests/e2e',
  use: { baseURL: origem, viewport: { width: 1366, height: 768 } },
  webServer: { command: `npx vite preview --port ${porta} --strictPort`, url: origem, reuseExistingServer: true },
  projects: [
    { name: 'cartas', testIgnore: EM_SERIE },
    { name: 'em-serie', testMatch: EM_SERIE, dependencies: ['cartas'] },
  ],
});
