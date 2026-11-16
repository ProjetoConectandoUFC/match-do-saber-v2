# Expediente 2026-11-16 (notebook DESKTOP-PJ0NRKU)

## Manhã: experimento das cartas
- Responsável decidiu que cartas de baralho + fan (spec v13) são **build de teste**, só na branch `001-v13-cartas-baralho`, nunca na develop (memória `experimento-cartas.md`, gravada só nessa branch).
- Nessa branch: spec v13.1.0 completa; Fase 46 revisada e verificada (620/620, E2E 60/60); Fase 47 parcial do agente-visual commitada como WIP (`wip(carta)`), **não verificada**.

## Tarde: preparação para o teste com público de quarta (2026-11-18)
- Experimento pausado. Revisão de defeitos em três frentes (lógica, app/câmera, banco/desktop), achados conferidos no código.
- Escopo aprovado pelo responsável: grupos A (o jogo não morre), B (gestos com público) e C (operação). D (menores) fica para depois.
- **PR #11** (`001-v12-robustez` → develop): spec v12.1.0 + Fase 50 do plano. Inclui o PR #10. 642/642, build, E2E 62/62, desktop 3/3. Detalhes no PR.
- **Lote 4** de notícias (12 rascunhos, sem política) na branch `001-lote-4-noticias`, aguardando revisão humana. Pontos a olhar primeiro listados no relatório do agente: mds-0058 (fontes em espanhol), mds-0049 (Vênus, dia sideral × solar), mds-0054.

## Pendências do responsável
- Aprovar o PR #11 (e fechar o #10).
- Revisar a correção da mds-0036 (Tiririca, "até então") e o lote 4.
- Ensaio manual no notebook antes de quarta: duas pessoas no quadro, webcam desconectada/reconectada, plano de energia em "Nunca".
- Se o teste for pela web: levar develop → main (a publicada é a v11).
- No notebook do evento, o banco de `Documentos/Match do Saber/noticias.csv` não é atualizado sozinho: a correção da mds-0036 só chega lá se o arquivo for trocado ou a notícia editada no painel.

## Achados que ficaram para depois (grupo D)
Imagem quebrada sem fallback (`Telas.tsx`), CSV do desktop ilegível troca para o banco embutido em silêncio (`App.tsx:46-55`), foco perdido ao abrir link do painel Questões, leitura falha sobrescreve o banco sem backup (`banco-local.cjs:239-247`), PWA `autoUpdate` pode recarregar no meio da partida, precache com wasm noSIMD e modelo `latest`, `/api` sem checar Host, ids duplicados no painel Notícias, acentos do Excel em colunas de lista.
