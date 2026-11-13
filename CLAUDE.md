# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Projeto

Match do Saber — jogo educativo de checagem de notícias para estudantes do ensino médio e jovens adultos, jogado num **estande de evento**: um notebook com webcam, um jogador por vez a ~1,5–2 m, escolhendo "verdadeira"/"falsa" por movimento do corpo. Roda como app de desktop (Electron, offline) e como PWA (versão web, GitHub Pages).
Missão e princípios: `.claude/memory/foundation.md`. Fluxo SDD: `.claude/CLAUDE.md`. Estado atual: spec **v12.0.1** (`docs/specs/001-jogo-estande/spec.md`, fases 42 a 45 no `plan.md`); o que aconteceu em cada dia está em `.claude/memory/expediente/` (índice em `.claude/memory/MEMORY.md`). Estado até a v11.0.0 e pendências antigas: `.claude/memory/estado-v10.md`; histórico até a v8.2.0 e verificações de hardware antigas: `.claude/memory/mvp-status-fase7.md`.

## Comandos

```bash
npm run dev            # Vite (roda prepare-assets antes: copia WASM do MediaPipe, baixa o modelo de pose, gera ícones PNG)
npm test               # Vitest (unitários + componentes)
npx vitest run src/core/gestos.test.ts      # um arquivo
npx vitest run -t "trecho do nome do teste" # um teste
npm run build          # tsc --noEmit + vite build (é a checagem de tipos; não há ESLint configurado)
npm run fixture        # grava public/content/noticias.csv de teste (12 aprovadas, metade com imagem, + rascunho e inválida)
npm run e2e            # fixture + build + Playwright contra `vite preview` em :4173 (E2E_PORT=4183 muda a porta)
npx playwright test tests/e2e/partida.spec.ts  # um E2E (exige fixture + build já feitos)
npm run desktop        # build + abre o app Electron (num terminal sem ELECTRON_RUN_AS_NODE)
npm run e2e:desktop    # fixture + build + Playwright no app Electron real (tests/desktop)
npm run package:win    # executável Windows em out/ (com o banco padrão; rode `npm run fixture` depois)
```

`public/content/`, `public/mediapipe/` e `public/icons/*.png` são gerados e estão no `.gitignore`. O `prepare-assets` copia o banco padrão `conteudo/noticias.csv` para `public/content/` se ainda não houver um (o fixture tem prioridade em desenvolvimento).

## Arquitetura

**Banco de notícias (v9.0.0, spec FR-6 a FR-8; colunas da v12.0.0):** um CSV (`;`, UTF-8 com BOM) com as colunas de `COLUNAS_BANCO` (`src/core/types.ts`); `imagem` é opcional (sem ela, o card mostra a ilustração do tema, `IlustracaoTema.tsx`); `visivel` (`sim`/`nao`/vazio, AC-7.12) esconde uma notícia das partidas sem apagá-la. Temas em `TEMAS`, incluindo `politica` (v12.0.0). O banco padrão embutido é `conteudo/noticias.csv` → `content/noticias.csv` no build. O jogo carrega por um `RepositorioNoticias` (`src/app/repositorio.ts`): na **web** só lê o embutido (o painel Notícias mostra o aviso de AC-7.9); no **desktop** (o preload do Electron expõe `window.matchDoSaber.desktop`) fala com `GET/PUT /api/noticias`. Só `jogaveis(banco)` (válidas, `aprovada`, com fonte e revisor, e não ocultas; princípio 1) entram nas partidas, filtradas ainda por tema, dificuldade e quantidade dos Ajustes (`sorteio.ts`). A Planilha Google e `scripts/sync/` estão desativados (o ADR 001-content-pipeline descreve o caminho antigo).

**Desktop (`electron/`):** `main.cjs` (modelo: Prova ou Reprova) serve `dist/` num HTTP local em 127.0.0.1:37425 e as rotas `/api` (porta fixa de propósito: o `localStorage` dos Ajustes é por origem; só cai para outra se estiver ocupada); `banco-local.cjs` cuida de `Documentos/Match do Saber/noticias.csv` (cria do embutido, backups com data e hora antes de gravar, recusa gravar se o arquivo mudou fora do painel). `MATCH_DO_SABER_DADOS` troca a pasta (testes).

**`src/core/` — lógica pura, sem React** (para sobreviver a uma troca de framework e ser testável sem câmera):
- `partida.ts` — reducer da partida (`reduzir(estado, evento, contexto)`); telas `espera → calibracao → [tutorial → tutorialFeedback] → card → feedback → … → resumo`; todos os tempos em `TEMPOS` e avançados por eventos `tick` com `dtMs`. Tempos configuráveis (card, feedback, tolerância, volta do resumo) chegam pelo `Contexto`. O feedback (v12.0.0, AC-4.1 a AC-4.3, AC-4.9) é por resultado: fundo verde no acerto, vermelho no erro e no tempo esgotado, com o carimbo VERDADE/MENTIRA por cima; depois de uma escolha dura `saidaMs` (saída do card) + `carimboMs` (carimbada) + o tempo configurado. O estado do feedback grava `resultadoMs` (= `duracaoResultadoMs(ctx)`, carimbada + tempo configurado) e `cardSaindo(estado)` é a regra única da saída do card, usada por tela (`App.tsx`), som (`sons.ts`, o resultado soa quando a carimbada começa) e inclinação (`inclinacaoCard.ts`); nada lê 3 s fixos.
- `ajustes.ts` — Ajustes do estande (FR-9, v12.0.0; antes "Configurações" em `modos.ts`): itens, grupos, opções, padrões, leitura/gravação no `localStorage` e o teclado do painel.
- `questoes.ts` — painel Questões (Story 16, FR-17): leitura, filtros e revisão do banco, com a mesma validação e a mesma regra de jogável do sorteio.
- `gestos.ts` — interpreta landmarks do MediaPipe Pose em gestos (`direita`/`esquerda`/`maosParaCima`) por modo (Corpo, Mão, Cabeça; `modos.ts`), com limiares em `CONFIG_GESTOS`, tempos de permanência e histerese de retorno ao centro. Escolhe o jogador mais central entre várias poses.
- `csv.ts` (ler/escrever o CSV do banco), `banco.ts` (validação AC-7.3, `jogaveis`, ids `mds-NNNN`, prévia de importação, gravar/apagar/alterar em massa).
- `relogio.ts`, `sorteio.ts`, `catalogo.ts` (JSON antigo, só fallback), `sons.ts`, `foto.ts`, `diagnostico.ts`.

**`src/app/` — React:** `useJogo.ts` é o centro: liga o reducer, o teclado (→ verdadeira, ← falsa, ↑ saiba mais, Enter, Esc) e um laço `requestAnimationFrame` que roda a detecção de pose (`rastreador.ts`) **fora do estado do React** (refs), despachando só eventos já interpretados. `App.tsx` carrega o banco e compõe as telas de `Telas.tsx`. Na tela de espera, o menu ☰ (`MenuOperador.tsx`) abre Notícias (`PainelNoticias.tsx`/`EditorNoticia.tsx`), Questões (`PainelQuestoes.tsx`), Ajustes (`PainelAjustes.tsx`, tecla M), Diagnóstico e Tela cheia; com o menu ou um painel aberto, câmera e teclas não chegam ao jogo. `?diagnostico` na URL (ou ☰ › Diagnóstico) ativa o painel de medição (`PainelDiagnostico.tsx`). Os Ajustes (partida: notícias por partida, tempos do card e do feedback, volta do resumo, temas, dificuldade; jogo: modo, sensibilidade, tolerância; som e volume, foto, QR das fontes, treino) ficam no `localStorage` via `useAjustes.ts` (lógica em `src/core/ajustes.ts`).

**PWA:** `vite-plugin-pwa` faz precache de tudo (incluindo `noticias.csv`, modelo `.task` e WASM, até 40 MB) para rodar offline. No desktop o service worker não é registrado. `.github/workflows/publicar.yml` roda `npm test` + `npm run build` e publica no GitHub Pages a cada push na `main`.

**Visual (v10.0.0):** identidade do Conectando Design System; a referência aprovada é `docs/visual/previa.html` (capturas em `docs/visual/capturas/`). Tokens em `src/app/tema.css`.

## Armadilhas já conhecidas (ver `docs/lessons/`)

- Tempos de jogo usam tempo real (`dtDoQuadro`); a detecção de pose é lenta (~6–7 fps medidos), então nunca limitar `dt` a um teto pequeno.
- Animação nova **soma** à duração definida na spec, nunca desconta (ex.: `TEMPOS.saidaMs` somado ao feedback); escreva teste de fronteira no reducer.
- Efeitos que abrem a câmera usam `AbortController` (StrictMode roda o efeito duas vezes).
- Em E2E, espere um texto de "tela pronta" antes de `keyboard.press`; não leia valores exatos de barras que correm em tempo real.
- Terminais do VS Code podem ter `ELECTRON_RUN_AS_NODE=1`, que faz o Electron rodar como Node (`app` undefined); o teste desktop remove essa variável.
- Windows: com a pasta aberta pela letra do drive minúscula (`c:\...`), `npm test` falha em todos os arquivos ("Vitest failed to find the current suite" no `tests/setup.ts`); rode com o caminho `C:\...` (o hook de sincronia avisa).
- Testes de componente declaram `// @vitest-environment jsdom` no topo (o padrão do Vitest aqui é `node`).

## Privacidade

Público inclui menores (LGPD): a imagem da câmera nunca é gravada nem enviada. A única exceção é a foto polaroid do resumo, mantida só em memória e apagada ao fechar o resumo.

## Processo

- Features seguem SDD: specs em `docs/specs/NNN-slug/` (`spec.md`, `plan.md`, `prd.md`, `data-model.md`, `contracts/`), versionadas (ex.: v8.2.0) com fases numeradas no `plan.md`. ACs/FRs (ex.: AC-4.8, FR-9) são citados em código e nomes de testes.
- Decisões de arquitetura em `docs/adr/`.
- Dois computadores: o GitHub é a única ponte; o hook `SessionStart` (`.claude/settings.json` → `scripts/conferir-sincronia.mjs`) avisa sobre trabalho não enviado, stash, branch atrasada, dependências e banco de teste no desktop. Ao fechar a sessão, tudo commitado e enviado; expediente em `expediente/AAAA-MM-DD-<computador>.md`. Regras e o que não passa pelo git: `docs/operacao.md`, "Dois computadores".
- Git: `docs/git-convention.md` (branches `NNN-slug`, Conventional Commits, prefixo ClickUp `CU-`). Tudo entra pela `develop` via PR aprovado pelo responsável (`.claude/memory/git-flow.md`); push na `main` publica a web.
- Subagentes do projeto em `.claude/agents/`: `agente-mecanico` (mecânica, gestos, reducer, Electron), `agente-visual` (identidade visual) e `agente-noticias` (redige lotes de notícias com fontes; só rascunhos, revisão humana obrigatória). Orquestração: `.claude/memory/agentes.md`.
- Operação do estande, app de desktop e gerenciador de notícias: `docs/operacao.md`.

## Idioma

Interface, conteúdo do jogo, código (identificadores), testes e documentação em português do Brasil.
