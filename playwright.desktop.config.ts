import { defineConfig } from '@playwright/test';

// Testes do app de desktop (Electron, Fase 35). Rodar com `npm run e2e:desktop`.
export default defineConfig({
  testDir: 'tests/desktop',
  workers: 1,
  timeout: 90_000,
});
