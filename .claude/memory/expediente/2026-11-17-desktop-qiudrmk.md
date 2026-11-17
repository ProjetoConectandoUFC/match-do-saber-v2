---
name: expediente-2026-11-17-desktop-qiudrmk
description: Log de 2026-11-17 no computador DESKTOP-QIUDRMK (Match do Saber) — limpeza de branches e worktrees, release v12.1.0 (plano B), integração das cartas, Fases 47/48/51, spec v13.2.0 e release v13.2.0 para o teste A/B de 18/11
metadata:
  type: project
---

# Expediente 2026-11-17 · desktop-qiudrmk

Contexto do dia: o responsável decidiu fazer amanhã (2026-11-18, curso de Sistemas e Mídias Digitais, 13h30 às 18h30) um **teste A/B com público**: A = interface **Clássica** (a da v12.1.0), B = **Cartas** (a da v13.1.0), no mesmo app, trocadas por um ajuste ("Interface do jogo") e pela tecla I na espera, "com o funcionamento igualmente refinado em ambos". Sem registro de dados de partida (comparação por observação). Entrega como release para baixar em outro computador (app de desktop).

## O que foi feito hoje (orquestrador e agentes)

- **Limpeza deste computador:** branches e worktrees locais antigas removidas; ficaram `develop` (checkout principal), `001-v13-ab` (worktree `.claude/worktrees/ab`), `001-v13-cartas-baralho` (worktree `.claude/worktrees/cartas`), `001-release-workflow` e `main`.
- **Release v12.1.0 (plano B):** workflow `.github/workflows/release.yml` criado na branch `001-release-workflow` (`256f6bc`, `2ba6584`: `npm ci` sem baixar o binário do Electron). A tag `v12.1.0` aponta para `2ba6584` e gerou a release com o executável Windows da v12.1.0 (a develop de hoje). Se a v13.2.0 der problema no notebook, esta é a versão de reserva (só Clássica).
- **Integração das cartas** sobre a develop v12.1.0 (agente-mecanico, `2e2af20`, `953fac6`): 700/700, E2E 63/63, desktop 3/3; ponto novo `permanenciaConta` (AC-2.13 conta a partir da carta pousada).
- **Spec v13.2.0** aprovada hoje (Story 18, AC-18.1 a AC-18.7, FR-19, Fase 51) e workflow de release na branch (`170de2b`, orquestrador).
- **Fases 47 e 48** (agente-visual): carta de duas faces, naipes, fan (`src/core/fan.ts`, `FanCartas.tsx`), capturas em `docs/visual/capturas/v13-cartas/`; mescladas em `2157a12`.
- **Fase 51** (agente-mecanico): `d8fd36e` (Ajustes e reducer), `68892e9` (card clássico como componente próprio, interface na espera), `8112768` (App escolhe a interface), `0b4de40` (E2E nas duas interfaces), `889c7f1` (status no plano). Merge da `001-release-workflow` em `1a30e39`; lock em 13.2.0 em `0b44cb6`.
- **Tag `v13.2.0`** em `0b44cb6`, enviada; o workflow de release estava gerando a release no GitHub (acompanhado pelo orquestrador; o gestor não mexeu na tag nem na release).

## 12:10 · `001-v13-ab` · agente-gestor · conferência da v13.2.0 (teste A/B)

Pedido: conferir de verdade a branch antes do teste, revisar contra AC-18.1 a AC-18.7 e FR-19, registrar e organizar.

### Testes (rodados pelo gestor no worktree `.claude/worktrees/ab`, ponta `0b44cb6`)

- `npx vitest run`: **877/877** (67 arquivos).
- `npm run fixture` + `npm run build` (com o prebuild, que refez `public/content/` e `public/mediapipe/` apagados por engano): ok.
- `E2E_PORT=4195 npx playwright test --workers=1` (as duas interfaces, 143 testes): **132 passaram, 6 falharam, 3 pulados de propósito**, em 31,2 min. As 6 falhas foram todas no projeto `classica` e todas de espera de tela (a espera ou o card seguinte não apareceram em 5 s; um teste estourou 30 s só ao abrir a página): `ajustes.spec.ts:138` e `:147`, `foto.spec.ts:17`, `menu-operador.spec.ts:13`, `partida.spec.ts:5` e `:38`. Na hora, o OneDrive sincronizava o worktree (que fica dentro da pasta do OneDrive) e era o processo com mais CPU. **Rodados de novo** os quatro arquivos no projeto `classica` (`--project=classica --workers=1`): **21 passaram, 2 pulados, 0 falhas**. Conclusão: lentidão da máquina, não defeito; a suíte inteira não foi repetida limpa de ponta a ponta.
- `env -u ELECTRON_RUN_AS_NODE npm run e2e:desktop`: **3/3** (só na interface padrão, Clássica; ver achado 2).
- Números do agente-mecanico (não refeitos pelo gestor nessa forma): E2E web 140 passaram + 3 pulados.

### Revisão contra a spec

- **AC-18.1** feito: `interface` é o primeiro item de `ITENS_AJUSTES` (`src/core/ajustes.ts`), grupo "Interface", padrão `classica` em `AJUSTES_PADRAO`, chave `match-do-saber:interface`; "Restaurar padrão" volta para Clássica (E2E `interface.spec.ts`).
- **AC-18.2** feito: tecla I em `src/app/useAjustes.ts` (`alternarInterface`), só quando `podeAbrirMenu()` (tela de espera e menu/painéis fechados, `App.tsx:84`).
- **AC-18.3** feito: linha "Interface: Clássica/Cartas" acima do resumo (`Telas.tsx`, `.dicaInterface` 22 px, peso 800); fan só com Cartas.
- **AC-18.4** feito: com Clássica, `comecar` vai direto ao treino ou card (`partida.ts`, `iface === 'classica'`), `distribuindoMs` = 0; `CardClassico.tsx` é o `TelaCard` da develop linha por linha (pilha, imagem, título, descrição, dica de "saiba mais", "saiba mais" dentro do card, rótulos, dica do modo, placar, barra, "Volte para o centro"). O CSS foi movido de `App.module.css` para `CardClassico.module.css` com os mesmos valores; a única troca é `.card img.ilustracaoRecorte` por `.card [data-tema] img` (mesmo efeito: `display: block; border-radius: 0` na ilustração recortada). Diferenças mínimas e sem efeito visível: `saibaMais && !treino` (treino nunca abre "saiba mais"), `data-interface-card="classica"` no `main`. Sem som de carta (só toca com `distribuindo`).
- **AC-18.5** feito: Cartas com abertura (1,5 s), distribuição (0,9 s por carta), som da carta e permanências a partir da carta pousada (`permanenciaConta` no laço de `useJogo.ts`).
- **AC-18.6** feito no reducer: mesmo sorteio (feito em `comecar`, antes do treino, nas duas), mesmo `tempoCardMs`, `duracaoResultadoMs`, tolerância e robustez; abertura e distribuição só somam (`distribuir` não desconta do cronômetro o que sobra do tick). Feedback, resumo, foto, QR e tutorial são os mesmos componentes. Testes do reducer, relógio e sons com `describe.each(INTERFACES_JOGO)`.
- **AC-18.7** feito: `Partida.interface` gravada em `comecar`; `interfaceDoEstado` usa a da partida; I e Ajustes só abrem na espera (E2E "durante a partida a tecla I não troca a interface").
- **FR-19 Must not "guardar dado de partida"**: nenhum `localStorage`, `fetch` ou escrita nova em `src/` ou `electron/` além da chave do ajuste.

### Achados (nenhum bloqueia o teste)

1. **Release sem E2E** — FR-19 diz "a release só sai com as duas verdes", mas `.github/workflows/release.yml` roda só `npm test` antes de `package:win` (sem E2E web nem desktop). A garantia hoje é a verificação local (esta). Sugestão: anotar no plano ou acrescentar E2E ao workflow depois do teste.
2. **`e2e:desktop` roda só na interface padrão (Clássica)**: `playwright.desktop.config.ts` não foi parametrizado; as Cartas não são exercitadas no app Electron. Conferir as Cartas à mão no notebook.
3. **Tecla I sem filtro de repetição nem de modificadores** (`src/app/useAjustes.ts:47`): segurar I alterna várias vezes; Ctrl+I também alterna. Mesmo padrão da tecla M; inofensivo, mas o operador deve tocar I uma vez e conferir a linha "Interface: …".
4. **Diferença de fluxo na Clássica, sem efeito visível**: na v12.1.0 o sorteio acontecia depois do treino; agora acontece antes (as duas interfaces). Se os filtros de conteúdo deixassem zero notícias, a v12.1.0 ainda mostrava o treino e voltava à espera; agora fica direto na espera (o aviso AC-6.4 já cobre esse caso).
5. **Commit fora do padrão já enviado:** `1da3664 wip(carta): ...` (tipo `wip` não existe em `docs/git-convention.md`). Não reescrito (já enviado).
6. **Memória `experimento-cartas.md` desatualizada:** dizia "nunca vai para develop/main"; a spec v13.2.0 diz que as cartas entram na develop atrás da troca. Atualizada nesta chamada com a nota da v13.2.0.

### Git

- Branch `001-v13-ab` (padrão `NNN-slug`), enviada; commits no padrão, exceto o `wip` acima. Nada gerado no commit.
- PR para a develop: `gh` não autenticado; abrir em <https://github.com/ProjetoConectandoUFC/match-do-saber-v2/compare/develop...001-v13-ab>. Não fazer merge antes do teste: a release `v13.2.0` já foi gerada da ponta `0b44cb6`.

### Trello

- "Teste 18/11: Match do Saber (Levi)": marcado **"Subir e atualizar no GitHub"** (branch e tag `v13.2.0` enviadas); comentário com o teste A/B, os testes e o link do PR. **Não** marcado "Fazer os ajustes finos e fechar as versões A e B" (falta o ensaio no notebook).
- "Interface do jogo de notícias (nome provisório: Match)": comentário sobre as duas interfaces; nenhum item marcado.
- O card "Interfaces dos três produtos" não está entre os cards abertos do quadro; nada feito nele.
- Nenhum card movido nem criado.

### Lista para o notebook antes do teste

1. Baixar o `.zip` da release `v13.2.0`, extrair numa pasta e abrir `Match do Saber.exe`. Conferir na espera a linha "Interface: Clássica".
2. Banco: se o notebook já tem `Documentos\Match do Saber\noticias.csv` de antes, o app usa esse arquivo (não o embutido). Abrir ☰ › Questões e conferir quantas aprovadas aparecem.
3. Apertar I uma vez: a linha vira "Interface: Cartas" e o fan aparece. Apertar de novo: volta a Clássica. Fechar e reabrir o app: a escolha continua.
4. Uma partida inteira pela webcam em cada interface (modo Corpo, a 1,5–2 m): nas Cartas, a inclinação só responde depois de a carta pousar.
5. "Saiba mais" (punhos acima do nariz ou ↑) nas duas: na Clássica troca o texto dentro do card; nas Cartas, a carta vira.
6. Som ligado e volume: nas Cartas, o "fff" de cada carta saindo; nas duas, acerto/erro e vinheta do fim.
7. Ajustes iguais para A e B durante todo o teste (só trocar a interface).
8. Esc no meio da partida volta à espera; trocar a interface ali vale para a próxima.
9. Plano de energia em "Nunca" e webcam do Cenpe testada; se algo falhar, a release `v12.1.0` é a reserva (só Clássica).

### Pendências do responsável (antes do teste)

- Baixar a release `v13.2.0` no notebook do teste e fazer a lista de conferência do resumo (abaixo, no README).
- Decidir quem anota a observação de cada sessão (A ou B) no formulário: o app não guarda nada.
- Depois do teste: aprovar (ou não) o PR da `001-v13-ab` para a develop e decidir se a web (main) recebe a troca.
