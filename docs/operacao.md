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

## No dia do evento (operador)
1. Abrir o app de desktop pelo atalho (funciona sem internet). Na versão web: com internet, abrir o jogo no Chrome do notebook (ou pelo ícone instalado) e aguardar a tela de espera, o que baixa a versão mais recente para uso offline; para instalar, ícone de instalar na barra de endereço › Instalar.
2. Conferir que o jogo mostra "Aperte ▶ Iniciar…" (câmera ativa); na web, permitir a câmera quando o navegador pedir.
3. Menu ☰ (canto superior direito, só na tela de espera): Notícias, Configurações, Diagnóstico e Tela cheia. Esc ou um clique fora fecham.
4. Teclas: → verdade, ← falsa, ↑ saiba mais, Enter iniciar / próxima partida.
5. Clique uma vez na tela do jogo depois de abri-lo: o navegador só libera o som depois de uma interação.
6. Configurações (tecla M ou ☰ › Configurações, só na tela de espera; abre um painel à direita): modo de jogo (Corpo, Mão, Cabeça), tempo por card (10–30 s) e som. Ficam guardadas no notebook.
7. O jogo nunca começa sozinho: o operador aperta "▶ Iniciar" (ou Enter). Com a câmera ativa, abre a calibração ("Fique no centro", 2 s) e a partida começa; Enter na calibração a pula e joga pelas setas. Sem câmera, começa direto. "✕ Sair" (ou Esc) encerra a partida na hora e o jogo fica na espera.

## Diagnóstico do rastreio (equipe técnica)
Para medir o rastreio no notebook do estande antes de ajustar os gestos:
1. Ligar o painel por ☰ › Diagnóstico (vale até recarregar o jogo) ou abrir o jogo com `?diagnostico` no fim do endereço (por exemplo `…/match-do-saber/?diagnostico`).
2. Com a câmera ligada, ficar a ~1,5–2 m (ou sentado, nos modos Mão e Cabeça) e jogar uma partida em cada modo: deslocar o tronco (Corpo), arrastar uma mão à frente do peito para cada lado e levantar as duas (Mão), inclinar a cabeça e levantar o queixo (Cabeça).
3. Logo depois de cada tentativa, clicar em "Baixar registro (60 s)" e enviar o arquivo `.json` para a equipe técnica, dizendo o modo e o que tentou fazer.

O painel mostra quadros por segundo e tempo de detecção (meta: ≥ 15 quadros/s), e o registro não contém imagens da câmera.

Cada amostra tem `t` em ms desde a abertura da página; o horário é `inicioPaginaMs + t` (milissegundos desde 1970).
