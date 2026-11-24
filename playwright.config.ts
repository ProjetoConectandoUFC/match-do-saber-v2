import { defineConfig } from '@playwright/test';

// E2E_PORT: outra porta, para rodar em paralelo com outro worktree (padrão 4173).
const porta = process.env.E2E_PORT ?? '4173';
const origem = `http://localhost:${porta}`;

// Testes que medem tempo real com a detecção de pose rodando: só valem sozinhos na máquina.
// Rodam num projeto próprio, depois de todos os outros, sem relaxar o critério de FR-1.
// Para rodar só eles: `npx playwright test --project=em-serie-classica --project=em-serie-cartas --no-deps`.
const EM_SERIE = /(relogio-real|cadencia)\.spec\.ts/;
// Só existem na interface Cartas (Story 17, FR-18): o fan.
const SO_CARTAS = /fan\.spec\.ts/;

/**
 * v13.2.0 (FR-19, Fase 51.5): a mesma suíte nas duas interfaces. A interface vai gravada no `localStorage` antes de abrir
 * (a mesma chave dos Ajustes, AC-18.1); `metadata.interface` diz aos testes em qual projeto estão (`tests/e2e/carta.ts`).
 */
const naInterface = (iface: 'classica' | 'cartas') => ({
  metadata: { interface: iface },
  use: {
    storageState: { cookies: [], origins: [{ origin: origem, localStorage: [{ name: 'match-do-saber:interface', value: iface }] }] },
  },
});

export default defineConfig({
  testDir: 'tests/e2e',
  use: { baseURL: origem, viewport: { width: 1366, height: 768 } },
  webServer: { command: `npx vite preview --port ${porta} --strictPort`, url: origem, reuseExistingServer: true },
  projects: [
    { name: 'classica', testIgnore: [EM_SERIE, SO_CARTAS], ...naInterface('classica') },
    { name: 'cartas', testIgnore: EM_SERIE, ...naInterface('cartas') },
    { name: 'em-serie-classica', testMatch: EM_SERIE, dependencies: ['classica', 'cartas'], ...naInterface('classica') },
    { name: 'em-serie-cartas', testMatch: EM_SERIE, dependencies: ['em-serie-classica'], ...naInterface('cartas') },
  ],
});
