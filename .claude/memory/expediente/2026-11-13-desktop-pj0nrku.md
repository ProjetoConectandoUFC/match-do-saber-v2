---
name: expediente-2026-11-13-desktop-pj0nrku
description: Log de 2026-11-13 no notebook DESKTOP-PJ0NRKU (Match do Saber) — incongruências entre os dois computadores, trabalho de 11/11 arquivado em tag, banco de teste do desktop trocado, hook de sincronia e expediente por computador
metadata:
  type: project
---

# Expediente 2026-11-13 · desktop-pj0nrku (notebook)

Primeiro arquivo no formato por computador (`AAAA-MM-DD-<computador>.md`, `docs/operacao.md`, "Dois computadores").

## Manhã — branch `001-fluxo-dois-computadores`, orquestrador

**Pedido:** "Estou trabalhando em dois computadores ao mesmo tempo": buscar incongruências entre as sessões da semana, aplicar à versão atual as perguntas respondidas em 11/11 e organizar o fluxo entre os computadores.

**Incongruências encontradas:**
1. O expediente de 12/11 diz que o trabalho de 11/11 "foi perdido". Estava neste notebook: branch local `001-v12-feedback-definicoes` (spec v12 alternativa, configurações, lote 3 com 10 notícias) e um stash com o feedback (fundo por resultado e carimbo a 40%). Nunca foi enviado.
2. O lote 3 local usava `mds-0023`–`mds-0032`, que colidem com o lote 3 aprovado na `develop` (`mds-0023`–`mds-0042`).
3. `MEMORY.md` com três linhas do mesmo expediente (sobra do merge "add/add" de 12/11).
4. `estado-v10.md` parado em 11/11 ("não apagar a `develop-antiga`", que foi apagada em 12/11; versão 11; menu "Configurações").
5. O banco do app de desktop deste notebook era o de **teste** de 09/11 (`teste-1`…): o app só copia o banco embutido quando o arquivo não existe.
6. GitHub Pages desativado (404): os deploys de 09/11 e 11/11 falharam; o QR do resumo abre página inexistente.
7. A `develop` (v12.0.1) ainda não foi para a `main` (v11.0.0).
8. O "Para revisar" do README ainda lista as entradas de 12/11 como pendentes, mas os PRs #5 a #8 foram aceitos em 13/11.

**Perguntas de 11/11 confrontadas com a v12.0.1:** carimbo = status real da notícia ✅; tempo esgotado vermelho ✅; tempo entre cards ✅ ("Tempo do feedback"); tolerância sem pessoa ✅; cards por partida existe, mas vai até 20 (sem teste do resumo com 15 ou 20); nível virou filtro estrito + "Crescente"; o ícone a 40% não entrou.

**Decisões do responsável (13/11):**
- Manter o carimbo opaco da v12 (não voltar aos 40%).
- Arquivar o trabalho de 11/11 e limpar: tag `arquivo/2026-11-11-notebook` enviada ao GitHub (commit `afe41cf` = branch + stash commitado; conferido que a tag tem exatamente o conteúdo do stash), depois branch e stash locais apagados.
- Trocar o banco do desktop deste notebook pelo da `develop`, com backup: `Documentos/Match do Saber/backups/noticias-teste-2026-11-09-antes-da-v12.csv`. Conferido com o parser do jogo: 16 notícias, 16 válidas, 16 jogáveis.
- Aplicar a organização entre computadores (esta branch).

**O que foi feito nesta branch:**
- `scripts/conferir-sincronia.mjs` (novo): conferência só de leitura (faz `git fetch --prune`): alterações sem commit, stash, branches à frente/atrás/sem remoto/apagadas no GitHub, dependências do `package-lock.json` que faltam em `node_modules` (compara conteúdo, não data) e banco de teste no app de desktop. Saída JSON para o hook ou `--texto`.
- `.claude/settings.json` (novo): hook `SessionStart` (`startup|resume`) que roda o script.
- `docs/operacao.md`: seção "Dois computadores" (rotina de abertura e fechamento, uma branch por computador, expediente por computador, tabela do que não passa pelo git).
- `.claude/agents/agente-gestor.md`: expediente passa a ser `AAAA-MM-DD-<computador>.md`.
- `MEMORY.md` sem as linhas duplicadas; `estado-v10.md` com a seção de 13/11; `CLAUDE.md` com a regra dos dois computadores.

**Testes do script (manuais):** os avisos reais apareceram (branch não enviada, `001-versao-11` apagada no GitHub, alterações sem commit); simulando o `qrcode-generator` fora de `node_modules`, o aviso de dependências aparece (o caso de 11/11) e some ao restaurar; com o banco de teste numa pasta temporária (`MATCH_DO_SABER_DADOS`), o aviso do banco aparece; chamado de outra pasta, acha o repositório pelo próprio caminho. O disparo do hook numa sessão nova ainda não foi visto (só acontece ao abrir o Claude Code).

**Achado durante a verificação:** nesta sessão a pasta abriu como `c:\...` (drive minúsculo) e `npm test` falhou em todos os 51 arquivos ("Vitest failed to find the current suite" no `tests/setup.ts`). Pelo caminho `C:\...`: 587/587. O script de sincronia passou a avisar; registrado no `CLAUDE.md` (armadilhas) e no `docs/operacao.md`.

**Pendências do responsável:**
- Aprovar o PR desta branch.
- Ativar o GitHub Pages; levar a `develop` (v12.0.1) para a `main`.
- Decidir se o resumo precisa de teste/ajuste para 15 e 20 notícias por partida.
- No outro computador: puxar a `develop` depois do merge para ganhar o hook; conferir lá o banco do desktop e o `npm ci`.
- Limpar o "Para revisar" do README (entradas de 12/11 já aceitas).

## Tarde: v13.0.0, cartas de baralho e fan (branch `001-v13-cartas-baralho`, saiu da `develop`)

**Pedido do responsável:** o card vira carta de baralho (retrato, só a manchete na frente, imagem grande com moldura), com um fan de cartas na base que abre e fecha; referências: leque de baralho na mão e cartas ilustradas (Bicycle Royal).

**Feito:**
- Spec v13.0.0 (commit `421c217`): Story 17, FR-18, AC-2.12/AC-3.x/FR-1/FR-4/FR-11/FR-15/FR-16 reescritos; abertura do fan 1,5 s e distribuição 0,9 s, **somadas** ao fluxo. Plano: Fases 46 a 49.
- Fase 46 (reducer, agente-mecanico) **em andamento, parada no meio**: estado `abertura`, `distribuindoMs`, som `carta`, inclinação centrada na distribuição, E2E ajustados para esperar a carta pousar (`tests/e2e/carta.ts`). No fechamento: `npm test` 620/620 e `npm run build` verdes; **os E2E não foram rodados** (o agente foi parado quando ia rodar o `relogio-real`). Revisar o diff antes de seguir.
- Fase 47.1 (prévia, agente-visual) **pronta**: `docs/visual/previa-v13.html` + capturas em `docs/visual/capturas/v13-cartas/`. Carta 460×644 em 1366×768; manchete Poppins 700 36 px (mínimo 30); verso de saiba mais 25→20 px.

**Decisões do responsável sobre a prévia (13/11):** treino mantém a frase do perfil na frente (sem verso); o fan abre sempre no mesmo ângulo (espaça pela quantidade); a carta distribuída é a da ponta direita, em arco; limite de 250 caracteres no `saiba_mais` só como **aviso** no editor/painel Questões (AC-7.13, não bloqueia; 15 das 16 notícias passam do limite e não serão reescritas).

**Pendente ao retomar:**
- A spec está **pela metade na v13.1.0**: cabeçalho e linha do changelog já dizem 13.1.0, mas o corpo ainda não recebeu as edições (exceção do treino em AC-17.1, mínimo de 20 px em AC-17.2, ângulo fixo em AC-17.3, ponta direita em AC-17.6, AC-7.13 novo). Aplicar antes de qualquer código da Fase 47.
- Fechar a Fase 46: revisar o diff, rodar `npm run e2e`.
- Fases 47.2 em diante (aplicar a carta), 48 (fan), 49 (verificação e galeria de telas).
- Pendências da prévia sem decisão: redesenhar em 412×380 as três ilustrações "recorte chapado" (hoje paisagem, cortadas na janela); naipes de Saúde e História parecidos de longe; o texto visível novo "Saiba mais" na faixa do verso.
- PR #10 (`001-v12-correcoes`) continua aberto; a v13 saiu da `develop` sem ele.
