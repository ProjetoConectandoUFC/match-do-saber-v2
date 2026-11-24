---
name: expediente-2026-11-24-desktop-qiudrmk
description: Expediente de 2026-11-24 no DESKTOP-QIUDRMK — performance v13.3.0 (detecção num Web Worker, FR-20, Fase 52) conferida pelo gestor; Clássica escondida; decisões do juice e spec v13.4.0; lote 5 em produção
metadata:
  type: project
---

# Expediente 2026-11-24 (DESKTOP-QIUDRMK)

## Antes da conferência (orquestrador com o responsável)

- **Peso da interface Clássica:** cerca de 4,6 KB no build. O responsável decidiu **manter o código da Clássica, mas escondê-la**. **Cartas passa a ser o padrão**, e a Clássica sai do E2E. A decisão está registrada, mas ainda não foi aplicada no código desta branch.
- **Juice (conversa e decisões):**
  - intensidade **Média** por padrão, com um seletor nos Ajustes;
  - começar pelo **carimbo e pelo resultado**;
  - **sequência de acertos com escalada** visual e sonora, **sem mudar os pontos**;
  - testar **direto no jogo** (sem prévia HTML separada).
- **Spec v13.4.0 (juice)** escrita na branch `001-v13-4-juice`. Ela sai da `001-v13-3-performance`, e outro agente trabalha nela no worktree `mds-worktrees/juice`.
- **Lote 5** de 25 notícias em produção pelo agente-noticias, no worktree `lote-5`. São só rascunhos, e a revisão humana é obrigatória.

## 10:30 · `001-v13-3-performance` · agente-mecanico · conferência do gestor

**Pedido (24/11):** "faça todas as alterações de performance". No teste de 18/11, o app desktop ficou em 15 fps num Ryzen sem placa de vídeo, porque a detecção de pose rodava síncrona dentro do `requestAnimationFrame`. A base é a spec v13.3.0 (FR-20, NFR Performance, Fase 52), do commit `faa24fd`, que também devolveu os títulos "Non-Functional Requirements" e "Quickstart Validation". A branch parte da `001-performance-rapida` (PR #16) e **substitui o PR #16**.

**O que foi feito (11 commits do agente, de `07f4d27` a `020533c`):**
- 52.1: detecção falsa injetável (`src/core/deteccaoFalsa.ts`, `window.__mdsDeteccaoFalsa`) e E2E de cadência (`tests/e2e/cadencia.spec.ts`).
- 52.2: `src/core/leituraPose.ts`:
  - fica só a leitura mais recente, e uma leitura atrasada é descartada;
  - ritmo dos pedidos: um por vez, até 30 por segundo, e na reserva nunca em dois quadros seguidos;
  - um aplicador que interpreta cada leitura uma vez, com o instante da captura.
- 52.3: detecção num Web Worker (`poseWorker.ts`, `servicoPose.ts`, `poseProtocolo.ts`, `detectorPose.ts`):
  - os quadros vão como `ImageBitmap` transferido;
  - `redeWorker.ts` bloqueia `fetch` e XHR para fora da origem dentro do worker;
  - se o worker não sobe, a detecção roda na thread principal (a reserva).
- 52.4: o laço de desenho dá um tick a cada quadro e usa a última leitura.
- 52.5: `memo` em carta, fan, ilustração, feedback, resumo, prévia da câmera, Diagnóstico e botão Sair.
- 52.6: o Diagnóstico mostra quadros/s da tela, leituras/s, ms por leitura e "aceleração" (worker ou thread principal, GPU ou CPU, renderizador e aquecimento).
- 52.8: versão 13.3.0. A CSP `connect-src 'self' blob: data:` passa a ir também no cabeçalho do servidor do Electron (`electron/servidor.cjs`), para valer no worker.
- Herdado do PR #16: `ignore-gpu-blocklist` no Electron e câmera em 640×360.

**Testes rodados pelo gestor (worktree `C:\Users\levir_hrbrq\mds-worktrees\perf`):**
- `npx vitest run`: **948/948** (76 arquivos).
- `npm run build`: ok. O `poseWorker-*.js` (157 KB) sai como worker clássico (IIFE) e está no precache do `sw.js`, junto com o WASM.
- `npm run fixture` + build + `E2E_PORT=4197 npx playwright test --workers=1`: **150 passaram, 3 pulados, 0 falhas** (25 min, Clássica e Cartas).
  - Cadência com detecção falsa de 60 ms no worker: mediana de **16,6 ms** entre quadros, p95 de 18,5 a 19 ms e máximo de 20,3 ms. Nenhum intervalo passou de 100 ms, na espera e na carta, nas duas interfaces. O critério da NFR é mediana ≤ 20 ms.
  - Reserva (thread principal, 60 ms): mediana de 16,5 ms e p95 de 77 ms, com **0 pares de quadros seguidos acima de 50 ms**, 8 leituras/s e 44 quadros/s.
  - Modelo real no Chromium headless (WebGL emulado, SwiftShader): cada leitura leva de 480 a 550 ms (2 ou 3 por segundo), e a tela fica a 60 quadros/s. Antes, a tela andaria nesse ritmo.
  - Offline, com o PWA em cache: a detecção sobe no worker com o modelo real, e a página não fez nenhuma requisição fora da origem.
  - Trabalho da thread principal por quadro: de 1 a 3 ms na espera, na carta e no feedback.
- `env -u ELECTRON_RUN_AS_NODE npm run e2e:desktop`: **4/4**. No Electron desta máquina (GTX 1650): detecção no worker com GPU, **14 ms por leitura (máx. 25), 25 leituras/s, tela a 75 quadros/s**, aquecimento de 3,5 s.
- Depois dos testes, o fixture foi regravado em `public/content/`.

**Revisão:**
- **(a) Regras de jogo.** Nada mudou em `partida.ts`, `gestos.ts`, `ajustes.ts`, `relogio.ts`, `modos.ts` nem `sons.ts`. Limiares, tempos e `numPoses` (3) estão iguais. A permanência dos gestos usa o instante da captura, que vem do mesmo relógio do rAF.
  - Mudança de comportamento: a presença da última leitura vale por até 2 s em todos os quadros. Depois disso, o tick vai com presença `null`, que o reducer trata como neutra (`partida.ts:209`; não conta como ausência).
  - Nada novo é guardado.
- **(b) Privacidade.** Os quadros vão como `ImageBitmap` transferido, só da página ao worker, e o worker fecha cada um depois da detecção (`servicoPose.ts:185`). Voltam só x, y e visibilidade.
  - No worker, `fetch` e XHR para fora da origem são recusados antes da rede (`redeWorker.ts`).
  - Conferi no bundle que o MediaPipe chama o `fetch` global na hora de enviar o registro de uso. Por isso a troca feita no topo do worker pega esse envio.
  - No Electron, a CSP vai também no cabeçalho, que vale para o worker.
  - Lacuna: nenhum teste espera os 60 s que o MediaPipe leva para enviar o registro. O bloqueio está comprovado por teste unitário (`redeWorker.test.ts`) e pela leitura do código.
- **(c) Reserva.** `criarRitmoDeteccao` (`leituraPose.ts:210-231`) nunca pede em dois quadros seguidos e pausa por min(D, 100 ms) depois de cada leitura. O E2E confirma: 0 pares seguidos acima de 50 ms.
- **(d) Recuperação.** Erro do worker, mensagem de erro, leitura travada há 15 s ou WebGL perdido caem em `falhou` (`useJogo.ts:82`). O detector é fechado, a câmera fica "indisponível" e é reaberta na espera, como na v12.1.0.
- **(e) Offline.** Comprovado pelo build e pelo E2E `worker-offline.spec.ts`.
- **Defeitos e divergências (não corrigidos; para o agente-mecanico):**
  1. **Divergência com a FR-20.** A spec diz "se o worker não puder ser criado **ou falhar**, cair para a thread principal". Hoje só a falha ao **iniciar** leva à reserva (`detectorPose.ts:132-150`).
     - Se o worker morre durante o jogo, a reabertura (`useJogo.ts:159`) tenta o worker de novo.
     - Se ele morrer sempre (por exemplo, por problema de GPU no worker), cada reabertura volta para "câmera indisponível" e a reserva nunca é usada.
     - Sugestão: depois de N falhas do worker durante o jogo, usar a reserva.
  2. **Comentário fora do lugar (cosmético).** Em `Telas.tsx:178-180`, o comentário de `BarraTempo` ("Tempo restante do card…") ficou acima de `export const BotaoSair = memo(...)`. Há também dois JSDoc seguidos em `PainelDiagnostico.tsx:17-18` e em `diagnostico.ts:37-38`.
  3. **Risco de desempenho a medir.** Com WebGL emulado (SwiftShader), cada leitura leva cerca de 500 ms.
     - Com permanência de 300 ou 500 ms, um gesto precisa de duas leituras ou mais e pode passar de 1 s, o limite da NFR Performance.
     - Isso já acontecia antes da mudança. A diferença é que agora a tela fica fluida e o atraso não aparece nela.
     - Medir no Ryzen do teste: em `?diagnostico`, olhar as leituras/s e a aceleração.

**Git:** o nome da branch segue o padrão, e os 11 commits do agente seguem o formato `<tipo>(<escopo>): …`. A branch já estava enviada, e nenhum arquivo gerado entrou nos commits. O `gh` está sem login, então o PR fica para abrir em <https://github.com/ProjetoConectandoUFC/match-do-saber-v2/compare/develop...001-v13-3-performance>. **Este PR substitui o #16**, que deve ser fechado sem merge.

**Trello:**
- No card "Match do Saber: aplicar os resultados do teste" (Em andamento), marquei "Ler a análise dos resultados do Match do Saber" e "Listar e priorizar os ajustes". Os dois estão comprovados em `.claude/memory/teste-publico-2026-11-18.md`, com a análise de 23/11 e as prioridades (performance antes do juice).
- No mesmo card, comentei o resumo desta conferência.
- Continuam abertos "Aplicar os ajustes…", "Testar novamente" e "Subir no GitHub/README", porque faltam o merge e o juice.
- A performance (FR-20) e a Clássica escondida não têm card próprio e ficam registradas no card acima.
- O lote 5 pertence ao card "Match do Saber: ampliar o banco de notícias", que não mudou hoje porque o lote ainda está em produção.

**Decisões pendentes do responsável:**
- **AC-12.4.** No arquivo baixado do Diagnóstico, `deteccaoMs` agora só aparece no quadro que aplicou uma leitura nova (nos outros fica `null`), e pontos e medidas repetem a última leitura. O texto atual da spec fala de "tempo de detecção" quadro a quadro. Decidir se a spec passa a registrar o novo comportamento.
- **Constantes que a spec não cita** (aprovar ou pôr na spec):
  - a leitura vale por 2 s (`LEITURA_VALIDA_MS`);
  - a leitura conta como travada aos 15 s;
  - o worker tem 60 s para iniciar, e nesse tempo a câmera fica aberta sem detecção;
  - a reserva pausa até 100 ms entre leituras;
  - o teto é de 30 leituras/s.
- **Defeito 1** (falha do worker durante o jogo sem passar à reserva): corrigir agora ou registrar como limitação.
- Fechar o PR #16 sem merge e abrir o PR desta branch.
- Medir no notebook Ryzen do teste antes do próximo evento.
