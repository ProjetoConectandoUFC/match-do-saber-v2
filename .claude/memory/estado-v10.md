---
name: estado-v10
description: Estado do Match do Saber em 2026-11-10 (spec v10.2.0 em branches, aguardando aprovação) e o que falta; ponto de partida para retomar de outro dispositivo
metadata:
  type: project
---

# Estado em 2026-11-10 (spec v10.2.0, ainda não integrada)

Repositório oficial: https://github.com/ProjetoConectandoUFC/match-do-saber-v2. `main` = "first commit" (v10.0.0). **Atenção:** `origin/develop` tem o histórico ANTIGO (v8.2, topo 553a346, de 2026-11-06) sem base comum com a `main`; PRs para a `develop` não funcionam até o responsável decidir recriá-la a partir da `main`. Fluxo: [[git-flow]].

Tarefas vêm do Trello, quadro "Produtos" (https://trello.com/b/weBotV4G), cartões com etiqueta Match atribuídos a levi ribeiro; o MCP do Trello é só leitura (não marca checklists).

## Feito antes (v9–v10.0)
Banco CSV + painel Notícias + app Electron (v9); identidade Conectando (v10.0, `docs/visual/previa.html`); lote 1 (10 notícias aprovadas).

## Rodada de 2026-11-10 (três branches, todas a partir de 9a4cf9b, sem PR)
- `001-v10-1-movimento-card` (agente-mecanico): spec v10.1.0 + v10.2.0. Card acompanha a inclinação (AC-2.10, `src/core/inclinacaoCard.ts`); coluna opcional `dificuldade` (AC-7.10); README; âncoras do rosto guardadas com a foto (AC-13.6/13.7, `src/core/ancorasRosto.ts`), sem desenhar filtro; testes de privacidade; CSP `connect-src 'self'` no `index.html` (o MediaPipe mandava métricas para odml.pa.googleapis.com a cada 60 s); modo tutorial (Story 15/FR-16, desligado por padrão, perfis rascunho em `conteudo/tutorial.json`); `relogio-real` no projeto Playwright `em-serie`; `data-model.md` reescrito. Verificado: 377/377 unitários, build ok, e2e 46/46 (agente, 2×). `camera-overlay.spec.ts:29` falha sob carga paralela e passa em série (4/4).
- `001-visual-propostas-v11` (agente-visual): `docs/visual/previa-v11.html` com 5 seções (tela final, faixas+filtros, interface tipo app de namoro, nomes, estilo de imagens) e 10 perguntas para o responsável. Recomendações: tela final B (QR único), filtros C, interface A + feedback "Deu match!", nome "Match ou Mico".
- `001-lote-2-noticias-niveis` (agente-noticias): lote 2 `mds-0011`..`mds-0022` (rascunho, 4 por nível, 6 V/6 F), classificação proposta do lote 1, perfis do tutorial.

## Pendente (depende do responsável)
- Recriar a `develop` remota; aprovar PRs.
- Aprovar prévia v11 (10 perguntas), lote 2, níveis do lote 1, perfis do tutorial, AC-2.10 (desfaz decisão da v4.0.0 de card parado).
- Depois da aprovação: desenhar filtros com as âncoras, tela final com fontes/QR, interface nova, som de fim de partida, imagens dos cards, dificuldade no sorteio.
- Hardware (notebook do estande): AC-2.10 (tremor), CSP no Electron, `npm run e2e:desktop` sem `ELECTRON_RUN_AS_NODE`, Fase 37; testar tutorial com quem nunca jogou.
- Executável sem `.ico`.

## Agentes
Ver [[agentes]].
