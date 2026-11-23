---
name: estado-v10
description: Estado do Match do Saber — histórico até 2026-11-11 e, na última seção, o estado em 2026-11-13 (v12.0.1 na develop, dois computadores); ponto de partida para retomar de outro dispositivo
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

## Atualização 2026-11-10 (tarde): v10.3.x e v11.0.0
- `001-v10-1-movimento-card` chegou a v10.3.1: um controle por modo (Corpo = tronco, Cabeça = inclinação, Mão = swipe; braço estendido e gestos antigos da Mão removidos), diagnóstico liga/desliga (AC-12.7), card estilo Reigns (15° no centro da base, 8% de deslocamento, rótulos com opacidade) que também se move com `prefers-reduced-motion` (o Windows do responsável está com animações desligadas; era por isso que o card ficava parado).
- `001-v11-visual-aplicado` (a partir da anterior + prévia mesclada): spec v11.0.0 aplica as recomendações da prévia v11 por ordem do responsável — pilha + botões redondos + carimbo, "Deu match!", resumo opção B (lista + polaroid 384 + QR único via `qrcode-generator` 1.4.4 para `fontes.html` na web), filtros SVG por faixa sobre a foto (`src/core/filtrosFoto.ts`), vinheta de fim de partida, colunas opcionais `titulo_curto`/`fonte_nome`, tutorial com 2 perfis da prévia (4 do agente de notícias em `perfisReserva`). Nome continua "Match do Saber". 449/449 unitários, build ok, e2e 48/48 (agente); `foto.spec.ts:29` e `camera-overlay` falham só sob carga paralela (passam em série) e o foto.spec ficou lento (~2 min).
- `vite dev` em worktree com node_modules por junction não serve a Poppins; use build + `vite preview`.
- Trello: o MCP é só leitura; escrever exige MCP com escrita ou `TRELLO_API_KEY`/`TRELLO_TOKEN` no env do Claude Code.

## Atualização 2026-11-11 (substitui o que acima diz sobre `main`/`develop`/branches)
- PRs #1 (lote 2) e #2 (develop → main) aceitos: a `main` (1a4c2d8) tem v10.3.1 + v11.0.0. As branches de trabalho foram apagadas no GitHub; a `develop` foi recriada a partir da `main`. Sobra `develop-antiga` (v8.2, 553a346, sem base comum): não apagar, é o único lugar desse histórico.
- Depois de puxar a `main`, rode `npm install`: a v11 trouxe `qrcode-generator`, e sem ele o build/dev quebram em `QrCode.tsx` (TS2307).
- `package.json` estava em 9.0.0; a branch `001-versao-11` passa para 11.0.0 (versão do exe do Electron).
- **GitHub Pages não está ativado** no repo: o workflow "Publicar jogo" passa em teste e build mas falha no deploy (404). A versão web e o `fontes.html` que o QR do resumo abre não existem até ativar em Settings › Pages › Source: GitHub Actions.
- `npm audit`: 0 vulnerabilidades em produção; 10 em devDependencies. A que importa é o Electron 33.4.11 (vai dentro do exe, sem suporte); as outras (deepmerge/glob/minimatch via vite-plugin-pwa, extract-zip via @electron/packager) são só de build. Não usar `npm audit fix --force` (rebaixa o vite-plugin-pwa para 1.1.0 e pula o Electron para 45 sem teste).

## Atualização 2026-11-13 (substitui o que acima estiver em conflito)
- **Dois computadores.** O trabalho de 11/11 foi feito no notebook (`DESKTOP-PJ0NRKU`) e nunca enviado; o outro computador o deu por perdido e refez a v12 em 12/11. Ele está arquivado na tag `arquivo/2026-11-11-notebook` (spec v12 alternativa, configurações, lote 3 com ids `mds-0023`–`mds-0032` que **colidem** com o lote 3 aprovado; não mesclar). Regras para não repetir: `docs/operacao.md`, seção "Dois computadores"; hook `SessionStart` em `.claude/settings.json` roda `scripts/conferir-sincronia.mjs`; expediente por computador (`expediente/AAAA-MM-DD-<computador>.md`).
- **Git:** `develop` (6008a5c) tem a spec v12.0.1 e as Fases 42 a 44 (PRs #5 a #8, aceitos em 13/11); a `main` (af87661) ainda está na v11.0.0. A `develop-antiga` **foi apagada** em 12/11 por ordem do responsável (o "não apagar" acima vale só até essa data). `package.json` em 12.0.0.
- **Decisões de 11/11 confrontadas com a v12.0.1 (13/11, responsável):** carimbo = status real da notícia e tempo esgotado em vermelho valem na v12; o responsável escolheu **manter o carimbo opaco da v12** (palavra + ícone), e não o ícone a 40% pedido em 11/11. Tempo entre cards, cards por partida, nível e ausência existem na v12 com outros nomes ("Tempo do feedback", "Notícias por partida" até 20, "Dificuldade" como filtro estrito e "Crescente", "Tolerância sem pessoa"). Ponto aberto: nenhum teste confere o resumo (lista e QR) com 15 ou 20 notícias por partida.
- **Notebook:** o banco do app de desktop (`Documentos/Match do Saber/noticias.csv`) era o de teste de 09/11; trocado pelo banco da `develop` (16 notícias, todas jogáveis), com o antigo em `backups/noticias-teste-2026-11-09-antes-da-v12.csv`.
- **GitHub Pages continua desativado** (404): o deploy falha e o QR do resumo abre uma página inexistente até ativar em Settings › Pages › Source: GitHub Actions.
