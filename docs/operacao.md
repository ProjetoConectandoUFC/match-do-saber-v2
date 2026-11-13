# Operação do Match do Saber

## App de desktop (v9.0.0, equipe técnica)
1. Gerar o executável num computador com o projeto: `npm install` e `npm run package:win`. O app sai em `out/Match do Saber-win32-x64/`; copiar essa pasta inteira para o notebook (pen drive) e criar um atalho para `Match do Saber.exe`.
   - `package:win` usa o banco padrão do repositório (`conteudo/noticias.csv`). Depois dele, rode `npm run fixture` antes dos testes E2E.
   - Para testar sem empacotar: `npm run desktop` (num terminal sem `ELECTRON_RUN_AS_NODE`, que o VS Code às vezes define).
2. Na primeira abertura o app cria `Documentos/Match do Saber/noticias.csv` a partir do banco embutido; nas seguintes, lê esse arquivo. Antes de cada gravação pelo painel, o arquivo anterior é copiado para `Documentos/Match do Saber/backups/` com data e hora no nome (ficam os 100 mais recentes).
3. Atalhos do app: F11 tela cheia, Ctrl+R recarrega (relê o banco), Ctrl+Shift+O abre a pasta `Documentos/Match do Saber`.
4. A versão web (GitHub Pages) continua publicada a cada push na `main` e usa o banco embutido (`conteudo/noticias.csv`). A Planilha Google e o `npm run sync` estão desativados desde a v9.0.0 (o código fica em `scripts/sync/`).

## Notícias (equipe de conteúdo, no app de desktop)
1. Na tela de espera: menu ☰ (canto superior direito) › **Notícias**.
2. "Nova notícia" ou "Editar" numa linha. Campos obrigatórios: título, descrição, saiba mais, veredito, explicação, técnica, tema, fonte (link http/https) e status. Imagem e outras fontes são opcionais; sem imagem, o card mostra a ilustração do tema.
3. Só entram nas partidas notícias com status **aprovada**, fonte e "revisado por" preenchidos. Notícias novas começam como rascunho.
4. Para várias de uma vez: marque as linhas e use "Apagar" ou mude status, tema ou técnica em massa.
5. "Importar CSV": mostra a prévia (novas, já existentes pelo id e inválidas com o motivo); "Adicionar N" grava só as novas válidas. "Exportar CSV" salva uma cópia que abre no Excel.
6. Também dá para editar `Documentos/Match do Saber/noticias.csv` no Excel (colunas `id;titulo;descricao;saiba_mais;veredito;explicacao;tecnica;tema;fonte_url;fontes_extras;imagem;revisado_por;status;dificuldade`; a `dificuldade`, da v10.1.0, é opcional — `facil`, `medio`, `dificil` ou vazia — e um CSV antigo sem ela continua valendo). Feche o Excel antes de salvar pelo painel e aperte Ctrl+R no jogo para ler o arquivo novo; linhas inválidas aparecem no painel com o motivo e não entram nas partidas.
7. Na versão web (navegador), ☰ › Notícias só avisa que o gerenciador está no app de desktop.

## Questões (revisão e depuração, v12.0.0)
1. Na tela de espera: ☰ › **Questões**, ou Ajustes (M) › **Revisar questões** (abre já filtrado por Rascunho).
2. Lista à esquerda, questão aberta à direita: o card como o jogador vê, o "saiba mais", o gabarito (Verdade/Mentira), explicação, técnica, tema, dificuldade, status, quem revisou, visibilidade e as fontes com o link inteiro ("Copiar" copia o link). No app de desktop o link abre no navegador do sistema, nunca na janela do jogo.
3. A contagem diz quantas há no banco, jogáveis, ocultas, rascunhos e inválidas; os filtros (texto, abas de tema, veredito, dificuldade, status, visibilidade, "Só jogáveis", "Só com problemas") mostram "Mostrando N de M". Uma questão fora do jogo diz por quê (ex.: "Sem revisor", "Rascunho", "Oculta").
4. ↑/↓ passam para a questão anterior/próxima; Esc ou ✕ fecham. Com o painel aberto, câmera e teclas não chegam ao jogo.
5. Só no app de desktop: "Ocultar"/"Mostrar no jogo", "Aprovar" (pede o nome de quem revisou na primeira vez; o nome fica só na memória até fechar o jogo; só aprova questão sem problemas), "Voltar para rascunho" e "Editar" (o mesmo editor do painel Notícias). Cada gravação faz backup antes, como no painel Notícias. Na versão web o painel é só leitura.

## No dia do evento (operador)
1. Abrir o app de desktop pelo atalho (funciona sem internet). Na versão web: com internet, abrir o jogo no Chrome do notebook (ou pelo ícone instalado) e aguardar a tela de espera, o que baixa a versão mais recente para uso offline; para instalar, ícone de instalar na barra de endereço › Instalar.
2. Conferir que o jogo mostra "Aperte ▶ Iniciar…" (câmera ativa); na web, permitir a câmera quando o navegador pedir.
3. Menu ☰ (canto superior direito, só na tela de espera): Notícias, Ajustes, Diagnóstico e Tela cheia. Esc ou um clique fora fecham.
4. Teclas: → verdade, ← falsa, ↑ saiba mais, Enter iniciar / próxima partida.
5. Clique uma vez na tela do jogo depois de abri-lo: o navegador só libera o som depois de uma interação.
6. Ajustes (tecla M ou ☰ › Ajustes, só na tela de espera, sem senha; abre um painel à direita, com rolagem). ↑/↓ escolhem o item, ←/→ mudam o valor, Espaço liga/desliga um tema; Esc, M ou Enter fecham. Ficam guardados no notebook.
   - Partida: notícias por partida (5 a 20; padrão 10), tempo por card (10 a 60 s; padrão 15), tempo do feedback (3 a 15 s; padrão 3), volta automática do resumo (desligada, 30, 60 ou 120 s).
   - Conteúdo: temas (cada um com quantas notícias jogáveis tem; pelo menos um fica ligado) e dificuldade (Misturada, Só fácil, Só médio, Só difícil ou Crescente).
   - Detecção: modo de jogo (Corpo, Mão, Cabeça), sensibilidade do gesto (Menor pede um gesto maior; Maior aceita um gesto menor) e tolerância sem pessoa (5, 10 ou 20 s, só no modo Corpo).
   - Mídia: som, volume (Baixo, Médio, Alto), foto no resumo, QR das fontes e tutorial.
   - Questões: quantas notícias estão jogáveis, quantas há no banco e quantas estão ocultas.
   - "Restaurar padrão" (Espaço duas vezes, ou clique e confirmação) volta tudo ao padrão; o banco de notícias não muda.
   A tela de espera resume "Modo · notícias · s por card · Som" e avisa "Ajustes personalizados" quando outro ajuste foge do padrão. Se os temas e a dificuldade escolhidos não deixam nenhuma notícia, a espera avisa "revise Ajustes › Conteúdo".
7. O jogo nunca começa sozinho: o operador aperta "▶ Iniciar" (ou Enter). Com a câmera ativa, abre a calibração ("Fique no centro", 2 s) e a partida começa; Enter na calibração a pula e joga pelas setas. Sem câmera, começa direto. "✕ Sair" (ou Esc) encerra a partida na hora e o jogo fica na espera.
8. Ocultar uma notícia sem apagá-la (app de desktop): ☰ › Notícias › Editar › desligar "Visível no jogo" (ou selecionar várias e "Alterar em massa" › Visibilidade › Oculta). Ela fica no banco, marcada "Oculta", e só volta às partidas quando for religada.

## Dois computadores (equipe técnica, desde 2026-11-13)

O projeto é desenvolvido em dois computadores (um deles é o notebook do estande). **O GitHub é a única ponte entre eles**: o que não foi enviado não existe para o outro. Em 2026-11-11 um dia inteiro de trabalho ficou só no notebook (branch nunca enviada e um stash), foi dado por perdido no outro computador e refeito do zero; está arquivado na tag `arquivo/2026-11-11-notebook`.

**Ao abrir uma sessão** (o hook `SessionStart` do Claude Code, em `.claude/settings.json`, faz isto sozinho e mostra os avisos; à mão: `node scripts/conferir-sincronia.mjs --texto`):
1. `git fetch --prune` e conferir: alterações sem commit, stash, branches à frente ou atrás do GitHub, branches que só existem aqui e branches já apagadas no GitHub.
2. Se o `package-lock.json` pede pacotes que não estão em `node_modules`: `npm ci`.
3. Ler o `.claude/memory/MEMORY.md` e o expediente mais recente **dos dois computadores** em `.claude/memory/expediente/`.

**Durante o trabalho:**
- Uma branch, um computador por vez. Antes de pegar uma branch que o outro computador estava usando, `git pull` nela.
- O expediente é um arquivo por dia **e por computador**: `expediente/AAAA-MM-DD-<computador>.md` (nome do computador em minúsculas). Assim os dois podem registrar o mesmo dia sem conflito no merge.

**Ao fechar a sessão:** tudo commitado e enviado, mesmo pela metade. Trabalho incompleto vai numa branch `wip/<computador>-<AAAA-MM-DD>` (ou na própria branch da tarefa) com `git push -u origin <branch>`. Nada de stash nem de branch só local de um dia para o outro.

**O que NÃO passa pelo git** (conferir em cada computador):

| O quê | Onde | Como acertar |
|---|---|---|
| Dependências | `node_modules/` | `npm ci` quando o `package-lock.json` mudar (o aviso do hook diz quando) |
| Binário do Electron | `node_modules/electron/dist/` | se `npm run desktop` não abrir, reinstalar (`npm ci`) ou extrair o zip do cache, como em 2026-11-12 |
| Banco do app de desktop | `Documentos/Match do Saber/noticias.csv` | o app só copia o banco embutido quando o arquivo não existe. Depois de mudar o `conteudo/noticias.csv`, copiar o novo por cima, guardando o atual em `backups/` (o hook avisa se o banco for o de teste) |
| Ajustes do jogo | `localStorage` do navegador ou do app (origem `127.0.0.1:37425`) | conferir no painel Ajustes em cada computador; "Restaurar padrão" volta aos padrões da spec |
| Memória pessoal do Claude Code | `~/.claude/` | não sincroniza; a memória do projeto que vale é `.claude/memory/`, que vai pelo git |
| Letra do drive (Windows) | como a pasta foi aberta (`c:\` ou `C:\`) | com `c:\` minúsculo, `npm test` falha inteiro ("Vitest failed to find the current suite"); abrir ou rodar pelo caminho `C:\...` |
| Arquivos gerados | `public/content/`, `public/mediapipe/`, `public/icons/*.png`, `dist/`, `out/` | `npm run dev`/`build` recriam; `npm run fixture` grava o banco de teste em `public/content/` |

## Diagnóstico do rastreio (equipe técnica)
Para medir o rastreio no notebook do estande antes de ajustar os gestos:
1. Ligar o painel por ☰ › Diagnóstico (vale até recarregar o jogo) ou abrir o jogo com `?diagnostico` no fim do endereço (por exemplo `…/match-do-saber/?diagnostico`).
2. Com a câmera ligada, ficar a ~1,5–2 m (ou sentado, nos modos Mão e Cabeça) e jogar uma partida em cada modo: deslocar o tronco (Corpo), arrastar uma mão à frente do peito para cada lado e levantar as duas (Mão), inclinar a cabeça e levantar o queixo (Cabeça).
3. Logo depois de cada tentativa, clicar em "Baixar registro (60 s)" e enviar o arquivo `.json` para a equipe técnica, dizendo o modo e o que tentou fazer.

O painel mostra quadros por segundo e tempo de detecção (meta: ≥ 15 quadros/s), e o registro não contém imagens da câmera.

Cada amostra tem `t` em ms desde a abertura da página; o horário é `inicioPaginaMs + t` (milissegundos desde 1970).
