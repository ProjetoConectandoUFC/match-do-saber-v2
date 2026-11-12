# Match do Saber

## Para revisar

- **2026-11-12 · `001-v12-integracao` · banco padrão com 16 notícias e versão 12.0.0 (orquestrador, conferido pelo gestor; mesmo PR da integração).** O lote 3 de política entrou na integração (merge `42fd0d2`). O banco padrão `conteudo/noticias.csv` ganhou as 6 notícias do lote 3 aprovadas por "Produção CNTM" (`mds-0025`, `0032`, `0035`, `0036`, `0040`, `0042`) e passou a ter 16 jogáveis: 9 verdadeiras, 7 falsas, 6 de política. As 10 do lote 1 receberam a dificuldade da proposta `docs/noticias/lotes/2026-11-10-classificacao-lote-1.md` (3 fáceis, 5 médias, 2 difíceis). O lote 2 e as 14 em rascunho do lote 3 continuam fora (nunca revisadas). `package.json` passou de 11.0.0 para 12.0.0. Testes conferidos pelo gestor: 587/587 unitários e `tsc --noEmit` ok (build e E2E não rodados para não mexer no app em uso). Como testar: `npm run desktop` (quando o app não estiver em uso); ☰ › Questões deve mostrar 16 aprovadas, 6 de `politica`; em Ajustes › Conteúdo, deixar só Política e jogar uma partida. Atenção: o banco do app de desktop em `Documentos/Match do Saber/noticias.csv` era o de teste; o orquestrador guardou-o em `backups/` e pôs o banco real no lugar. PR: o mesmo da integração, <https://github.com/ProjetoConectandoUFC/match-do-saber-v2/compare/develop...001-v12-integracao>.
- **2026-11-12 · `001-v12-integracao` · Fases 42, 43 e 44 da spec v12.0.1 num PR só (integração pelo agente-mecanico, conferida pelo gestor). Este PR substitui os quatro PRs separados (`001-v12-spec`, `001-v12-feedback-carimbo`, `001-v12-ajustes` e `001-v12-painel-questoes`): aprove só este; os quatro itens abaixo ficam como descrição do que ele traz e das decisões pendentes. Desde 12:45, o mesmo PR traz também o lote 3 de notícias de política (`001-v12-lote-3-politica`, sem PR separado), o banco padrão com 16 notícias e a versão 12.0.0 (ver item acima).** Traz: spec v12.0.1; feedback verde/vermelho pelo resultado com o carimbo VERDADE/MENTIRA por cima do texto, também no treino; painel Ajustes (tecla M); coluna `visivel`; tema `politica` com a ilustração definitiva (índigo, plenário); painel Questões. Na integração, a carimbada (300 ms) passou a somar ao "Tempo do feedback" configurado, e som, tela e inclinação do card leem a duração gravada no estado (antes havia 3 s fixos). O nome de quem revisa no painel Questões só fica guardado se a gravação der certo. Testes conferidos pelo gestor: 586/586 unitários, build ok, E2E web 60/60 em série e desktop 3/3. Como testar: `npm run fixture` e `npm run desktop`; jogar uma partida pelas setas e ver o fundo verde/vermelho com o carimbo; em Ajustes (M), pôr o feedback em 8 s e conferir que o som do resultado toca quando o carimbo cai e que a tela fica 8 s; ☰ › Questões, aprovar `rascunho-1` e abrir um link de fonte; ver um card de `politica` sem imagem. PR: abrir em <https://github.com/ProjetoConectandoUFC/match-do-saber-v2/compare/develop...001-v12-integracao>.
- Incluída no PR da `001-v12-integracao` (não abrir PR separado). **2026-11-12 · `001-v12-painel-questoes` · Fase 44 da spec v12.0.1 (agente-mecanico): painel Questões.** Na tela de espera, ☰ › **Questões** (ou Ajustes › Revisar questões, já filtrado por Rascunho) abre um painel no estilo do gerenciador do Prova ou Reprova: lista à esquerda, questão aberta à direita (o card como o jogador vê, o "saiba mais", o gabarito Verdade/Mentira, explicação, técnica, tema, dificuldade, status, revisor, visibilidade e fontes com o link inteiro e botão Copiar), contagens, filtros, ↑/↓ e Esc, e o motivo de uma questão não entrar no jogo. No app de desktop: Ocultar/Mostrar no jogo, Aprovar (pede o nome de quem revisou uma vez por sessão, só na memória), Voltar para rascunho e Editar, sempre com backup; links abrem no navegador do sistema, nunca na janela do jogo. Na web, só leitura. Junto: som, card e tela do feedback seguem o "Tempo do feedback" configurado (antes usavam 3 s fixos). Testes conferidos pelo gestor: 575/575 unitários, build ok, E2E web 55/55 em série e desktop 3/3. Como testar: `npm run fixture` e `npm run desktop`; ☰ › Questões, andar com ↑/↓, abrir "Linha inválida" e "Notícia oculta", ocultar uma questão e conferir a contagem, aprovar `rascunho-1` e clicar num link de fonte. O CSS do painel ainda é provisório (acabamento com o agente-visual). Branch: <https://github.com/ProjetoConectandoUFC/match-do-saber-v2/compare/develop...001-v12-painel-questoes> (só para consulta).
- Incluída no PR da `001-v12-integracao` (não abrir PR separado). **2026-11-12 · `001-v12-ajustes` · Fase 43 da spec v12.0.1 (agente-mecanico): painel Ajustes, notícia oculta e tema política.** O menu Configurações virou o painel **Ajustes** (tecla M ou ☰ › Ajustes, sem senha), com os grupos Partida, Conteúdo, Detecção, Mídia e Questões e "Restaurar padrão": notícias por partida (5 a 20), tempo por card até 60 s, tempo do feedback, volta automática do resumo, filtro de temas e de dificuldade, sensibilidade do gesto, tolerância sem pessoa, volume e QR das fontes desligável. Coluna nova `visivel` no banco (oculta sem apagar) e tema `politica` (ilustração provisória, falta o agente-visual). Os ajustes já guardados no notebook continuam valendo. Testes conferidos pelo gestor: 523/523 unitários, build ok, E2E 53/53 em série e desktop 2/2. Como testar: `npm run fixture` e `npm run dev`; na tela de espera, M, mudar "Notícias por partida" para 5 e jogar pelas setas (a partida tem 5 cards); desligar todos os temas menos Saúde e conferir o aviso; no app de desktop, ☰ › Notícias › Editar › desligar "Visível no jogo". Branch: <https://github.com/ProjetoConectandoUFC/match-do-saber-v2/compare/develop...001-v12-ajustes> (só para consulta).
- Incluída no PR da `001-v12-integracao` (não abrir PR separado). **2026-11-12 · `001-v12-feedback-carimbo` · feedback por resultado e carimbo do veredito (Fase 42, agente visual).** O fundo do feedback agora diz o resultado (verde no acerto, vermelho no erro e no tempo esgotado); o veredito aparece num carimbo VERDADE/MENTIRA por cima de "Acertou!"/"Errou"/"Tempo esgotado"; sai o "Deu match!"; o treino usa o mesmo layout; a carimbada soma 300 ms ao feedback. O carimbo do card também mudou (agora cheio). Extra: cor índigo e ilustração de plenário do tema `politica`. Como testar: `npm run dev`, jogar uma partida pelas setas e ver as capturas em `docs/visual/capturas/v12-feedback/`. Decidir: tokens de verde/vermelho, tamanhos, carimbo coral sobre vermelho e se a ilustração de `politica` lembra a bandeira da UE. Os conflitos com a `001-v12-ajustes` foram resolvidos na integração. Branch: <https://github.com/ProjetoConectandoUFC/match-do-saber-v2/compare/develop...001-v12-feedback-carimbo> (só para consulta).
- Incluída no PR da `001-v12-integracao` (não abrir PR separado). **2026-11-12 · `001-v12-spec` · spec v12.0.0 (aprovada em `06e2126`, plano com fases 42 a 45; só documentação).** Feedback por acerto/erro com carimbo VERDADE/MENTIRA e sem "match"; menu Ajustes ampliado, sem PIN; coluna `visivel`; tema `politica`; painel Questões (Story 16, FR-17); definição do agente gestor e regra 7 do agente de notícias. Como revisar: ler o changelog v12.0.0 e as seções citadas em `docs/specs/001-jogo-estande/spec.md`. Os 15 problemas de coerência apontados pelo gestor foram corrigidos na v12.0.1 (`c3a76b0`). Branch: <https://github.com/ProjetoConectandoUFC/match-do-saber-v2/compare/develop...001-v12-spec> (só para consulta).
- Incluída no PR da `001-v12-integracao` desde o merge `42fd0d2` (o PR separado deixou de ser necessário). **2026-11-12 · `001-v12-lote-3-politica` · lote 3 de notícias de política, rodada 2 (só conteúdo).** A rodada 1 do responsável foi aplicada: 6 aprovadas (`revisadoPor` "Produção CNTM"), 4 reprovadas (em `descartadasNaRevisao`, com o motivo), 10 corrigidas de volta a `rascunho` e 4 falsas novas (`mds-0043` a `mds-0046`). Ficam 20 notícias, 10 V / 10 F. Como revisar: as 14 em `rascunho` na página da rodada 2 (<https://claude.ai/artifact/45aGCTJjasv7VmrXGyDQwP>) ou em `docs/noticias/lotes/2026-11-12-lote-3.json`, com os 5 pontos do gestor em `.claude/memory/expediente/2026-11-12.md` (entrada das 11:27; o principal: ano do boato em `mds-0043`). As 6 aprovadas já estão no banco padrão (item do topo). Branch: <https://github.com/ProjetoConectandoUFC/match-do-saber-v2/compare/develop...001-v12-lote-3-politica> (só para consulta).

Jogo educativo de checagem de notícias do projeto Conectando (UFC), feito para estandes de eventos. Um notebook com webcam mostra uma notícia por vez, no estilo de um "match": o jogador, de pé a uns 1,5–2 m, pende o corpo para a **direita** se acha que a notícia é **verdade** e para a **esquerda** se acha que é **mentira**. Depois de cada escolha a tela fica verde (acertou) ou vermelha (errou ou tempo esgotado), com o veredito num carimbo VERDADE/MENTIRA, a explicação e a técnica de checagem usada (fonte, data, imagem ou contexto). Uma partida tem 10 cards (o operador escolhe de 5 a 20 em Ajustes), e no fim aparece o placar.

- Público: estudantes do ensino médio e jovens adultos (muitos menores de idade).
- Modos de jogo: **Corpo** (padrão), **Mão** e **Cabeça** (acessíveis, inclusive para quem joga sentado). O operador pode jogar tudo pelo teclado ou mouse.
- Roda como **app de desktop** (Electron, sem internet) e como **versão web** (PWA no GitHub Pages).

Repositório: <https://github.com/ProjetoConectandoUFC/match-do-saber-v2>

## Como rodar

Requer Node.js 24 (a mesma versão do workflow de publicação).

```bash
npm ci                 # instala as dependências
npm run dev            # servidor de desenvolvimento (Vite); prepara WASM, modelo de pose e ícones antes
npm test               # testes unitários e de componentes (Vitest)
npm run build          # checagem de tipos (tsc) + build de produção em dist/
npm run e2e            # notícias de teste + build + testes E2E (Playwright) no navegador
```

Um teste só: `npx vitest run src/core/partida.test.ts` ou `npx vitest run -t "trecho do nome"`. Um E2E só (depois de `npm run fixture` e `npm run build`): `npx playwright test tests/e2e/partida.spec.ts`. O `relogio-real.spec.ts` mede tempo real com a detecção rodando e por isso roda sozinho, depois dos outros (projeto `em-serie`); para rodar só ele: `npx playwright test --project=em-serie --no-deps`.

### App de desktop (Windows)

```bash
npm run desktop        # build + abre o app Electron
npm run e2e:desktop    # testes E2E no app Electron real
npm run package:win    # gera o executável em out/Match do Saber-win32-x64/ (com o banco padrão)
```

Rode `npm run desktop` e `npm run e2e:desktop` num terminal **sem** a variável `ELECTRON_RUN_AS_NODE` (o terminal do VS Code às vezes a define, e aí o Electron roda como Node). Para levar ao estande, copie a pasta `out/Match do Saber-win32-x64/` inteira para o notebook e crie um atalho para `Match do Saber.exe`. O passo a passo da operação está em [`docs/operacao.md`](docs/operacao.md).

### Notícias de teste

`npm run fixture` grava em `public/content/noticias.csv` (pasta ignorada pelo git) um banco de teste com 12 notícias aprovadas — 6 verdadeiras e 6 falsas, alternadas, metade com imagem e com dificuldade fácil/médio/difícil em rodízio —, mais um rascunho e uma linha inválida, que não entram nas partidas. Assim dá para jogar e testar sem mexer no banco real:

```bash
npm run fixture        # cria o banco de teste
npm run dev            # o jogo usa o banco de teste enquanto ele existir
```

Para voltar ao banco padrão, apague `public/content/` (o `npm run dev`/`build` copia `conteudo/noticias.csv` de novo). O `npm run package:win` sempre empacota o banco padrão; rode `npm run fixture` depois dele se for rodar os E2E.

## Estrutura de pastas

| Pasta | Conteúdo |
|-------|----------|
| `src/core/` | Lógica pura, sem React e testável sem câmera: reducer da partida (`partida.ts`), gestos (`gestos.ts`, `modos.ts`), card que acompanha o corpo (`inclinacaoCard.ts`), CSV e validação do banco (`csv.ts`, `banco.ts`), sorteio, sons, diagnóstico |
| `src/app/` | Interface em React: `useJogo.ts` (laço de quadros com a detecção de pose, teclado), `App.tsx`, telas (`Telas.tsx`), menu ☰, painel Notícias, painel Questões (`PainelQuestoes.tsx`; lógica em `src/core/questoes.ts`), painel Ajustes (`PainelAjustes.tsx`, `useAjustes.ts`; lógica em `src/core/ajustes.ts`), diagnóstico; tokens visuais em `tema.css` |
| `electron/` | App de desktop: `main.cjs` (servidor HTTP local + janela + permissão da câmera; links externos só http/https e sempre no navegador do sistema, `links.cjs`), `preload.cjs` e `banco-local.cjs` (banco em `Documentos/Match do Saber/` com backups) |
| `conteudo/` | Banco padrão de notícias (`noticias.csv`) e perfis do tutorial (`tutorial.json`, rascunho; v10.2.0), embutidos no build |
| `scripts/` | `preparar-assets.ts` (WASM, modelo e ícones), `fixture.ts` (notícias de teste); `sync/` está desativado (Planilha Google, até a v8) |
| `tests/e2e/`, `tests/desktop/` | Testes Playwright no navegador e no app Electron |
| `docs/specs/` | Especificação (`spec.md`, com ACs e FRs citados no código e nos testes), plano e modelo de dados |
| `docs/adr/`, `docs/lessons/` | Decisões de arquitetura e lições aprendidas |
| `docs/visual/` | Referência visual aprovada (`previa.html`) e capturas |
| `docs/noticias/` | Lotes de notícias pesquisados, para revisão |

## Banco de notícias (CSV)

O banco é um arquivo CSV, uma notícia por linha, em UTF-8 com BOM e separado por `;` (abre e salva no Excel; o jogo também aceita `,` e arquivo sem BOM). O banco padrão é `conteudo/noticias.csv` (v12.0.0: 16 notícias aprovadas, as 10 do lote 1 e 6 de política do lote 3, todas com dificuldade). No app de desktop, o jogo usa `Documentos/Match do Saber/noticias.csv` (criado do padrão na primeira abertura) e faz um backup em `Documentos/Match do Saber/backups/` antes de cada gravação. A equipe de conteúdo edita as notícias pelo menu ☰ › **Notícias** do app de desktop (listar, filtrar, editar, apagar, alterar em massa, importar e exportar CSV); na versão web o jogo só lê o banco embutido.

| Coluna | Obrigatória | Valores |
|--------|-------------|---------|
| `id` | sim | letras, números e hífen, único; o painel gera `mds-NNNN` |
| `titulo` | sim | título do card |
| `descricao` | sim | texto curto do card |
| `saiba_mais` | sim | texto expandido ("saiba mais") |
| `veredito` | sim | `verdadeira` ou `falsa` |
| `explicacao` | sim | por que é verdade ou mentira (aparece depois da escolha) |
| `tecnica` | sim | `fonte`, `data`, `imagem` ou `contexto` |
| `tema` | sim | `saude`, `ciencia`, `historia`, `tecnologia`, `curiosidades`, `meio-ambiente` ou `politica` (v12.0.0) |
| `fonte_url` | sim | link http(s) da fonte |
| `fontes_extras` | não | outros links, separados por espaço |
| `imagem` | não | caminho da imagem; sem imagem, o card mostra a ilustração do tema |
| `revisado_por` | para aprovar | quem revisou |
| `status` | sim | `rascunho` ou `aprovada` |
| `dificuldade` | não | `facil`, `medio`, `dificil` ou vazia (v10.1.0). Desde a v12.0.0, o filtro e a ordem "Crescente" de Ajustes › Conteúdo usam a dificuldade. CSV antigo sem a coluna continua valendo |
| `titulo_curto` | não | até 34 caracteres, para a lista do resumo (v11.0.0) |
| `fonte_nome` | não | nome do veículo da fonte, para o resumo (v11.0.0) |
| `visivel` | não | `sim`, `nao` ou vazia (vazia = visível; v12.0.0). Com `nao`, a notícia fica no banco, marcada "Oculta" nos painéis Notícias e Questões (onde se liga e desliga), mas não entra nas partidas nem na página das fontes. CSV antigo sem a coluna continua valendo |

Só entram nas partidas notícias **válidas**, com `status = aprovada`, `fonte_url` e `revisado_por` preenchidos e que não estejam ocultas (`visivel = nao`). Linhas inválidas são ignoradas e aparecem no painel com o motivo. O painel Questões (☰ › Questões) mostra cada questão como o jogador a vê, com gabarito e fontes, e diz por que uma questão não entra no jogo; no app de desktop, aprova, oculta e edita. Cada partida sorteia o número de notícias escolhido em Ajustes (padrão 10), metade verdadeiras e metade falsas quando possível (com número ímpar, o lado com uma a mais é sorteado), só dos temas e da dificuldade escolhidos em Ajustes › Conteúdo.

## Privacidade (LGPD)

O público inclui menores de idade, então:

- A imagem da câmera **nunca é gravada nem enviada**: a detecção de pose (MediaPipe) roda no próprio notebook e só usa os pontos do corpo de cada quadro.
- A única exceção é a foto polaroid do resumo (pode ser desligada em Ajustes): fica só na memória e é apagada quando o resumo fecha. Nunca vai para disco, rede ou o registro de diagnóstico.
- Junto com a foto ficam, também só na memória, os pontos do rosto onde um filtro seria posicionado (v10.2.0); são apagados com ela.
- A página só se conecta à própria origem (`connect-src 'self'` em `index.html`), o que bloqueia as métricas de uso que a biblioteca MediaPipe tentaria enviar ao Google.
- O jogo não guarda dados de jogadores, não usa cookies nem rastreadores. No notebook ficam só os ajustes do estande e o banco de notícias com seus backups.
- O nome de quem revisa no painel Questões só é gravado no banco, na coluna `revisado_por` da questão aprovada; durante a sessão fica só na memória (não vai para o `localStorage`) e some ao fechar o jogo.
- O registro do modo de diagnóstico tem só medidas numéricas e só existe se o operador clicar em "Baixar registro".

## Desenvolvimento

- O processo segue especificação antes do código: specs em `docs/specs/001-jogo-estande/` e testes antes da implementação (TDD).
- Branches, commits e pull requests: [`docs/git-convention.md`](docs/git-convention.md). Tudo entra pela `develop` via PR aprovado; um push na `main` publica a versão web no GitHub Pages.
- Interface, conteúdo, código e documentação em português do Brasil.
