# Match do Saber

## Para revisar

- **2026-11-12 · `001-v12-spec` · spec v12.0.0 (Draft, só documentação).** Feedback por acerto/erro com carimbo VERDADE/MENTIRA e sem "match"; menu Ajustes ampliado, sem PIN; coluna `visivel`; tema `politica`; painel Questões (Story 16, FR-17); definição do agente gestor e regra 7 do agente de notícias. Como revisar: ler o changelog v12.0.0 e as seções citadas em `docs/specs/001-jogo-estande/spec.md`. O gestor apontou 15 problemas de coerência em `.claude/memory/expediente/2026-11-12.md` (os mais sérios: Out of Scope contradiz os Ajustes, AC-9.18 ainda diz "Configurações", AC-7.10 diz que o sorteio não usa a dificuldade). PR: abrir em <https://github.com/ProjetoConectandoUFC/match-do-saber-v2/compare/develop...001-v12-spec>.

Jogo educativo de checagem de notícias do projeto Conectando (UFC), feito para estandes de eventos. Um notebook com webcam mostra uma notícia por vez, no estilo de um "match": o jogador, de pé a uns 1,5–2 m, pende o corpo para a **direita** se acha que a notícia é **verdade** e para a **esquerda** se acha que é **mentira**. Depois de cada escolha o jogo mostra o veredito, a explicação e a técnica de checagem usada (fonte, data, imagem ou contexto). Uma partida tem até 10 cards, e no fim aparece o placar.

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
| `src/app/` | Interface em React: `useJogo.ts` (laço de quadros com a detecção de pose, teclado), `App.tsx`, telas (`Telas.tsx`), menu ☰, painel Notícias, Configurações, diagnóstico; tokens visuais em `tema.css` |
| `electron/` | App de desktop: `main.cjs` (servidor HTTP local + janela + permissão da câmera) e `banco-local.cjs` (banco em `Documentos/Match do Saber/` com backups) |
| `conteudo/` | Banco padrão de notícias (`noticias.csv`) e perfis do tutorial (`tutorial.json`, rascunho; v10.2.0), embutidos no build |
| `scripts/` | `preparar-assets.ts` (WASM, modelo e ícones), `fixture.ts` (notícias de teste); `sync/` está desativado (Planilha Google, até a v8) |
| `tests/e2e/`, `tests/desktop/` | Testes Playwright no navegador e no app Electron |
| `docs/specs/` | Especificação (`spec.md`, com ACs e FRs citados no código e nos testes), plano e modelo de dados |
| `docs/adr/`, `docs/lessons/` | Decisões de arquitetura e lições aprendidas |
| `docs/visual/` | Referência visual aprovada (`previa.html`) e capturas |
| `docs/noticias/` | Lotes de notícias pesquisados, para revisão |

## Banco de notícias (CSV)

O banco é um arquivo CSV, uma notícia por linha, em UTF-8 com BOM e separado por `;` (abre e salva no Excel; o jogo também aceita `,` e arquivo sem BOM). O banco padrão é `conteudo/noticias.csv`. No app de desktop, o jogo usa `Documentos/Match do Saber/noticias.csv` (criado do padrão na primeira abertura) e faz um backup em `Documentos/Match do Saber/backups/` antes de cada gravação. A equipe de conteúdo edita as notícias pelo menu ☰ › **Notícias** do app de desktop (listar, filtrar, editar, apagar, alterar em massa, importar e exportar CSV); na versão web o jogo só lê o banco embutido.

| Coluna | Obrigatória | Valores |
|--------|-------------|---------|
| `id` | sim | letras, números e hífen, único; o painel gera `mds-NNNN` |
| `titulo` | sim | título do card |
| `descricao` | sim | texto curto do card |
| `saiba_mais` | sim | texto expandido ("saiba mais") |
| `veredito` | sim | `verdadeira` ou `falsa` |
| `explicacao` | sim | por que é verdade ou mentira (aparece depois da escolha) |
| `tecnica` | sim | `fonte`, `data`, `imagem` ou `contexto` |
| `tema` | sim | `saude`, `ciencia`, `historia`, `tecnologia`, `curiosidades` ou `meio-ambiente` |
| `fonte_url` | sim | link http(s) da fonte |
| `fontes_extras` | não | outros links, separados por espaço |
| `imagem` | não | caminho da imagem; sem imagem, o card mostra a ilustração do tema |
| `revisado_por` | para aprovar | quem revisou |
| `status` | sim | `rascunho` ou `aprovada` |
| `dificuldade` | não | `facil`, `medio`, `dificil` ou vazia (v10.1.0; ainda não muda o sorteio). CSV antigo sem a coluna continua valendo |

Só entram nas partidas notícias **válidas**, com `status = aprovada`, `fonte_url` e `revisado_por` preenchidos. Linhas inválidas são ignoradas e aparecem no painel com o motivo. Cada partida sorteia até 10 notícias, metade verdadeiras e metade falsas quando possível.

## Privacidade (LGPD)

O público inclui menores de idade, então:

- A imagem da câmera **nunca é gravada nem enviada**: a detecção de pose (MediaPipe) roda no próprio notebook e só usa os pontos do corpo de cada quadro.
- A única exceção é a foto polaroid do resumo (pode ser desligada em Configurações): fica só na memória e é apagada quando o resumo fecha. Nunca vai para disco, rede ou o registro de diagnóstico.
- Junto com a foto ficam, também só na memória, os pontos do rosto onde um filtro seria posicionado (v10.2.0); são apagados com ela.
- A página só se conecta à própria origem (`connect-src 'self'` em `index.html`), o que bloqueia as métricas de uso que a biblioteca MediaPipe tentaria enviar ao Google.
- O jogo não guarda dados de jogadores, não usa cookies nem rastreadores. No notebook ficam só as configurações do estande e o banco de notícias com seus backups.
- O registro do modo de diagnóstico tem só medidas numéricas e só existe se o operador clicar em "Baixar registro".

## Desenvolvimento

- O processo segue especificação antes do código: specs em `docs/specs/001-jogo-estande/` e testes antes da implementação (TDD).
- Branches, commits e pull requests: [`docs/git-convention.md`](docs/git-convention.md). Tudo entra pela `develop` via PR aprovado; um push na `main` publica a versão web no GitHub Pages.
- Interface, conteúdo, código e documentação em português do Brasil.
