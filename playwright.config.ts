import { defineConfig } from '@playwright/test';

// E2E_PORT: outra porta, para rodar em paralelo com outro worktree (padrão 4173).
const porta = process.env.E2E_PORT ?? '4173';

export default defineConfig({
  testDir: 'tests/e2e',
  use: { baseURL: `http://localhost:${porta}`, viewport: { width: 1366, height: 768 } },
  webServer: { command: `npx vite preview --port ${porta} --strictPort`, url: `http://localhost:${porta}`, reuseExistingServer: true },
});
