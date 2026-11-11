import { defineConfig } from '@playwright/test';

// E2E_PORT: outra porta, para rodar em paralelo com outro worktree (padrão 4173).
const porta = process.env.E2E_PORT ?? '4173';

// Testes que medem tempo real com a detecção de pose rodando: só valem sozinhos na máquina.
// Rodam num projeto próprio, depois de todos os outros, sem relaxar o critério de FR-1.
// Para rodar só ele: `npx playwright test --project=em-serie --no-deps`.
const EM_SERIE = /relogio-real\.spec\.ts/;

export default defineConfig({
  testDir: 'tests/e2e',
  use: { baseURL: `http://localhost:${porta}`, viewport: { width: 1366, height: 768 } },
  webServer: { command: `npx vite preview --port ${porta} --strictPort`, url: `http://localhost:${porta}`, reuseExistingServer: true },
  projects: [
    { name: 'paralelo', testIgnore: EM_SERIE },
    { name: 'em-serie', testMatch: EM_SERIE, dependencies: ['paralelo'] },
  ],
});
