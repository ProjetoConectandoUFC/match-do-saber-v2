# Feature 001: Match do Saber — jogo de estande (MVP)

**Status:** Approved (v12.0.0 aprovada pelo responsável em 2026-11-12; v12.0.1 e v12.0.2 só corrigem coerência e layout)
**Version:** 12.0.2
**Created:** 2026-10-26
**Last Updated:** 2026-11-13
**Branch:** `001-jogo-estande`
**Origem:** [prd.md](prd.md) · ADRs: [frontend-stack](../../adr/001-frontend-stack.md), [motion-input](../../adr/001-motion-input.md), [content-pipeline](../../adr/001-content-pipeline.md)

---

## Changelog

| Version | Date | Change |
|---------|------|--------|
| 1.0.0 | 2026-10-26 | Spec inicial aprovada |
| 1.1.0 | 2026-10-27 | Adicionados Story 9 e FR-9: menu "Modo de jogo" com modos acessíveis Mão e Cabeça (Corpo continua padrão); FR-2 passa a ser o modo Corpo |
| 2.0.0 | 2026-10-27 | Reescritos Story 9 e FR-9: o menu "Modo de jogo" vira "Configurações" (modo, tempo por card de 10 a 30 s, som); o tempo por card deixa de ser fixo em 15 s (FR-1, AC-1.2, AC-4.4). Adicionados Story 10/FR-10 (botões Iniciar e Sair), Story 11/FR-11 (sons) e AC-4.5 (card centralizado na vertical) |
| 3.0.0 | 2026-10-27 | Início só manual: a câmera deixa de iniciar a partida sozinha (reescritos AC-1.1, AC-1.6, AC-10.1, FR-1 e a linha "Iluminação ruim" dos erros; ajustados AC-1.4 e AC-10.3; acrescentados AC-1.7 e AC-1.8). Causa: depois de uma partida, de Sair ou de a pessoa sair do quadro, o jogo recomeçava sozinho se alguém continuasse no quadro |
| 4.0.0 | 2026-10-27 | Card parado até a escolha: reescritos AC-2.3 e AC-9.13 (o card não inclina mais com o corpo ou a cabeça, porque tremia com a captura da câmera; rastreio e gestos não mudam). Cronômetro reescrito em FR-4: sai o número em cima do card, entra uma barra grande na base da tela, com os segundos (AC-4.6), e nos últimos 5 s o card pulsa em vermelho (AC-4.7). AC-4.5 passa a medir a área de jogo sem a barra |
| 5.0.0 | 2026-10-28 | O tempo do card não pausa mais com o "saiba mais" aberto: reescritos AC-3.1, AC-3.2, AC-4.7 e FR-1; removido AC-3.5 (o "saiba mais" não fecha mais sozinho). Só "Volte para o centro" pausa o cronômetro. Causa: a barra de tempo e sua animação ficavam paradas com o "saiba mais" aberto, porque a regra pausava o cronômetro |
| 5.1.0 | 2026-10-28 | Configurações no canto superior direito: o botão vira "⚙" fixo no canto superior direito da tela de espera (AC-9.1) e o menu abre como painel lateral à direita (novo AC-9.18); o painel fecha também pelo "✕" (AC-9.3). Itens, teclas e regras do menu não mudam |
| 5.2.0 | 2026-10-28 | Adicionados Story 12 e FR-12: modo de diagnóstico, ligado só pelo endereço com `?diagnostico`, que mostra quadros por segundo, tempo de detecção da pose, pontos e confiança de pulsos, ombros e cabeça e os gestos recentes, e permite baixar um registro dos últimos 60 s. Serve para ajustar os limites dos gestos com dados do notebook real; o jogo normal não muda |
| 6.0.0 | 2026-10-29 | Modo Mão ganha mais dois jeitos de escolher o lado, além de levantar a mão: as duas mãos para um lado (AC-9.19) e arrastar uma mão do centro do peito para o lado (AC-9.20). A pausa por ausência (AC-5.3 a AC-5.5) passa a valer só no modo Corpo; nos modos Mão e Cabeça a partida ignora a ausência (AC-9.21). Causa: no modo Mão a câmera perdia a pessoa ao levantar a mão e a barra de tempo parava |
| 6.1.0 | 2026-10-29 | A dica de gestos do modo Mão (AC-9.14) passa a citar os três jeitos de escolher o lado da v6.0.0: levantar a mão, as duas mãos para o lado e arrastar para o lado. Os gestos não mudam |
| 7.0.0 | 2026-10-29 | Adicionados Story 13 e FR-13: o resumo mostra um card polaroid com uma foto da câmera tirada no meio da partida, guardada só na memória e apagada quando o resumo fecha. Reescritos a regra "Must not" de FR-2 (a foto do resumo é a única imagem da câmera guardada, só na memória), AC-9.1, AC-9.2, AC-9.4 e FR-9 (novo item "Foto no resumo" nas Configurações, ligado por padrão) |
| 7.1.0 | 2026-11-03 | Adicionado AC-5.7: o resumo mostra, abaixo do "N de M", uma mensagem conforme a proporção de acertos (de "Cuidado!" a "Imune a fake news!"); FR-5 ganha a regra das faixas |
| 8.0.0 | 2026-11-03 | O resumo deixa de mostrar a lista "Técnicas que você praticou": reescritos AC-5.1, AC-13.2 e FR-13. A técnica de cada notícia continua no feedback de cada card (AC-4.x) |
| 8.1.0 | 2026-11-03 | Modo Corpo ganha outro jeito de escolher o lado, além de deslocar o tronco: estender um braço para o lado (AC-2.7, AC-2.8). AC-2.4 passa a exigir também os braços de volta perto do corpo entre duas escolhas; AC-2.9 fixa a dica do modo Corpo; FR-2 ganha o gesto. Causa: no teste da responsável, a pessoa escolhia com os braços e o tronco ficava no centro, então nenhum card era escolhido |
| 8.2.0 | 2026-11-06 | Adicionado AC-4.8: o card ganha uma barra de tempo própria na parte de baixo, com os segundos, além da barra da base da tela (AC-4.6), que continua; FR-4 cita as duas barras |
| 9.0.0 | 2026-11-09 | Conteúdo gerenciado dentro do jogo e app de desktop. A Planilha Google sai: Story 7, FR-6 e FR-7 reescritos como gerenciador de notícias interno (listar, filtrar, editar, apagar, alterar em massa, adicionar, importar CSV com prévia), no modelo do Prova ou Reprova. FR-8 e Story 8 reescritos: o jogo vira app de desktop (Electron), offline, com o banco num CSV em `Documentos/Match do Saber/` e backup antes de cada gravação; a versão web continua com o banco embutido. FR-4: `imagem` passa a ser opcional e entra o campo `tema`; sem imagem, o card mostra a ilustração do tema. AC-9.1 e FR-9: o botão "⚙" vira o menu ☰ (Story 14, FR-14) com Notícias, Configurações, Diagnóstico e Tela cheia. Removidos a credencial da planilha (Security) e "CMS próprio ou painel administrativo" do fora de escopo |
| 10.0.0 | 2026-11-09 | Identidade visual do projeto Conectando (FR-15, prévia aprovada em `docs/visual/previa.html`). Removido AC-4.8: o tempo aparece só na barra da base da tela. A interface diz "Verdade" e "Mentira" (AC-4.1 a AC-4.3, AC-9.14). Reescritos AC-4.1 a AC-4.3: o feedback mostra primeiro o veredito ("É verdade"/"É mentira"), menor, e abaixo o selo, com o fundo da tela na cor do veredito. AC-2.6 e AC-4.5: a prévia da câmera é uma camada sobreposta e não conta na centralização. AC-13.2: o resumo não mostra a prévia da câmera e o polaroid fica 20% maior |
| 10.1.0 | 2026-11-10 | Card acompanha o corpo e dificuldade das notícias (cartões do Trello "Match: mecânicas e movimento do card" e "Conteúdo do Match"). Adicionado AC-2.10: na tela do card, o card desloca-se e gira levemente para o lado em que o jogador pende (no máximo 40 px e 6°), suavizado, com uma zona morta perto do centro, e fica no centro com `prefers-reduced-motion`, sem pessoa, com o menu aberto e em "Volte para o centro"; reescritos AC-2.3, AC-9.13 e as regras de FR-2 e FR-9 que pediam o card parado (decisão da v4.0.0 revista: a suavização e a zona morta tratam o tremor que motivou aquela decisão). Adicionados AC-7.10 e a coluna opcional `dificuldade` (`facil`, `medio`, `dificil` ou vazia) em AC-7.1, AC-7.2, AC-7.3 e FR-6; CSV sem a coluna continua sendo lido. O sorteio ainda não usa a dificuldade |
| 10.2.0 | 2026-11-10 | Base mecânica para os filtros da foto e para o tutorial, sem nada visual novo (decisões a confirmar pelo responsável). Adicionados AC-13.6 e AC-13.7 e regras de FR-13: no instante da foto, o jogo calcula e guarda com ela, só na memória, as âncoras do rosto (centro, escala e giro pelos olhos; chapéu pelas orelhas; capa pelos ombros; com reserva quando faltam pontos) e as apaga junto com a foto; nenhum filtro é desenhado ainda. AC-13.5 passa a cobrir também os pontos, IndexedDB e o corpo das requisições. Adicionados Story 15 e FR-16: modo tutorial com 4 cards de treino (perfis cômicos, fora do banco e da pontuação), feedback que ensina o gesto, desligado por padrão; AC-9.1, AC-9.2, AC-9.4, FR-9 ganham o item "Tutorial" nas Configurações. Corrigido (NFR Security): o MediaPipe enviava métricas de uso para `odml.pa.googleapis.com` durante a partida com câmera; a página passa a só se conectar à própria origem |
| 10.3.0 | 2026-11-10 | Decisões do responsável (Levi) depois de testar o app. O card mimetiza o controle em tempo real, como no Reigns: AC-2.10 reescrito (deslocamento proporcional desde o centro, até 38% da largura e 14° com eixo embaixo no limiar, rótulo "Verdade"/"Mentira" aparecendo aos poucos, suavização de ~100 ms, saída a partir da posição; com `prefers-reduced-motion`, só os rótulos). Um único controle por modo: no Corpo, só o tronco (AC-2.7 e AC-2.8 removidos; AC-2.4 e AC-2.9 reescritos); na Cabeça, a inclinação; na Mão, o swipe da mão ativa (AC-9.7 e AC-9.19 removidos; AC-9.9, AC-9.14, AC-9.20 e AC-9.22 reescritos). FR-2 e FR-9 acompanham. Diagnóstico liga e desliga pelo menu ☰ (AC-12.7; FR-12 e FR-14 sem o "até recarregar") |
| 10.3.1 | 2026-11-10 | Decisão do responsável (Levi) depois de testar: AC-2.10 (a) o card gira 15° em torno do ponto central da base, que se desloca só um pouco (8% da largura) em direção à resposta, no lugar de 38% e 14°; AC-2.10 (f) o movimento vale também com `prefers-reduced-motion` (no teste, o Windows estava com os efeitos de animação desligados e o card ficava parado, só com os rótulos) |
| 11.0.0 | 2026-11-10 | Prévia v11 aplicada (`docs/visual/previa-v11.html`) por ordem do responsável (Levi), com as recomendações do Agente Visual; detalhes a confirmar. **FR-15 reescrito:** pilha de cards atrás do card, botões redondos nas laterais que acendem com a fração do gesto (AC-2.11), carimbo VERDADE/MENTIRA (AC-2.10b, AC-2.12) e feedback "Deu match!"/"Não deu match" com ícones feitos com as formas do design system (AC-4.1 a AC-4.3 e AC-4.9 reescritos; o selo continua "Acertou!", "Errou", "Tempo esgotado"); estilo "recorte chapado" nas imagens desenhadas (FR-4, AC-15.7). **FR-13 reescrito:** filtro por faixa de acertos (lupa, detetive, repórter, herói) desenhado por cima da foto com as âncoras de AC-13.6 e selo da faixa na moldura (AC-13.2, AC-13.6, AC-13.8, AC-13.9). **Resumo (opção B):** lista de acertos e erros por notícia, com a fonte das verdadeiras e quem desmentiu as falsas, e um QR único que abre a página das fontes na versão web, só com os ids das notícias (AC-5.1 reescrito; AC-5.8 a AC-5.10 novos; Non-Goals e Security ajustados). **FR-6:** colunas opcionais `titulo_curto` e `fonte_nome` (AC-7.2, AC-7.3, AC-7.11). **FR-11 reescrito:** som de fim de partida, que cresce com a faixa (AC-11.6); sem tique nos últimos 5 s. **Tutorial:** o treino passa a ter os 2 perfis da prévia (Abacaxi Perfeito e Seu Caju) com o próprio desenho (campo opcional `ilustracao`; AC-15.2, AC-15.7 e FR-16 reescritos); os 4 perfis do rascunho ficam guardados em `perfisReserva`. O nome do jogo não muda. O movimento do card (AC-2.10) não muda |
| 12.0.0 | 2026-11-12 | Pedido do responsável (Levi) depois do estande. **Feedback por resultado:** o fundo do feedback passa a dizer se o jogador acertou (verde) ou errou (vermelho, inclusive tempo esgotado), e não mais o veredito; o veredito vira um carimbo VERDADE/MENTIRA, com o símbolo (estrela ou triângulo), carimbado por cima do texto do resultado no centro da tela; sai "Deu match!"/"Não deu match" e saem os ícones de discos do feedback (reescritos AC-4.1 a AC-4.3, AC-4.9, FR-4; o tutorial, o logotipo e o resumo não mudam). **Ajustes:** o menu "Configurações" vira "Ajustes", com grupos Partida, Conteúdo, Detecção, Mídia e Questões e mais itens: notícias por partida, tempo por card ampliado, tempo do feedback, volta automática do resumo, temas, dificuldade, sensibilidade do gesto, tolerância sem pessoa, volume, QR das fontes e "Restaurar padrão", sem PIN (reescritos AC-9.1, AC-9.2, AC-9.4, AC-9.17, FR-9, AC-6.1, AC-6.2, FR-1; adicionados AC-9.23 a AC-9.31). **Visibilidade:** coluna opcional `visivel` (a notícia fica no banco, mas fora das partidas, até o operador religar) (AC-7.12, FR-6, AC-7.7). **Tema `politica`** (AC-7.2). **Painel "Questões"** para leitura, depuração e revisão, no estilo do Prova ou Reprova, com fontes, gabarito, problemas de validação, aprovação e visibilidade (Story 16, FR-17, FR-14). |
| 12.0.1 | 2026-11-12 | Coerência da v12.0.0, apontada pelo Agente Gestor, sem mudar o que foi pedido: Out of Scope deixa de excluir sensibilidade, volume, número de cards e tempo do feedback; AC-9.18 passa a "Ajustes"; AC-7.10 (o sorteio usa a dificuldade, AC-9.27); AC-15.3, FR-16 e FR-1 (feedback de treino com o tempo configurado; 2 treinos, um por perfil, desde a v11.0.0); AC-7.4 (alterar em massa aceita `visivel`); AC-6.2 usa ⌈N/2⌉ (cobre N ímpar); AC-9.28 vale também para o ângulo do modo Cabeça; AC-7.2 exige ilustração e cor do tema `politica`; AC-13.4 e FR-13 apagam a foto também na volta automática do resumo; FR-15 sem "ícone" no feedback; Error Scenarios com a tolerância e os padrões configuráveis; AC-2.10b cita "menta"; AC-4.9 exige que o carimbo cubra só parte do texto do resultado. Itens que a v12.0.0 também mudou e o changelog dela não listava: AC-4.10, AC-5.2, AC-5.4, AC-5.5, AC-6.3, AC-6.4, AC-7.4, FR-5, FR-7, FR-15 e FR-16. |
| 12.0.2 | 2026-11-13 | Correção de layout, sem mudar regra: AC-5.8 passa a dizer como as duas colunas se dividem com qualquer número de notícias (metade em cada coluna, de cima para baixo) e que acima de 10 as linhas ficam mais baixas para caber em 1366×768. Até aqui a grade tinha 5 linhas fixas e, com 12, 15 ou 20 notícias por partida (AC-9.23), as notícias 11 em diante caíam em colunas extras, amontoadas |

---

## Problem Statement

Estudantes do ensino médio e jovens adultos recebem o tempo todo notícias com imagens exageradas e títulos chamativos, e raramente param para checar antes de acreditar ou compartilhar. Faltam experiências curtas e divertidas que pratiquem técnicas reais de checagem (fonte, data, imagem, contexto) em vez de só dizer "isso é fake". O Match do Saber leva essa prática a estandes de eventos, num formato de "match" com notícias que qualquer pessoa entende em segundos e que o público ao redor consegue acompanhar.

## Goals

- Um jogador completa uma partida de até 10 cards usando só movimentos do corpo, sem tocar em teclado, mouse ou tela.
- Todo card jogado termina com o veredito, a explicação e a técnica de checagem da notícia, qualquer que seja o resultado.
- O app de desktop roda uma partida completa sem conexão com a internet (v9.0.0).
- O jogo é instalado no notebook como app de desktop e aberto por um ícone (v9.0.0).
- Uma pessoa não programadora cadastra, edita e importa notícias pelo próprio jogo, sem ajuda técnica, e só notícias aprovadas, com fonte e revisor, chegam às partidas (v9.0.0).
- Nenhuma imagem da câmera e nenhum dado de jogador sai do notebook ou fica salvo.
- No fim da partida, o jogador vê um card polaroid com uma foto dele tirada no meio da partida; a foto some quando o resumo fecha.
- Jogadores com baixa mobilidade completam uma partida sem tocar no notebook, usando o modo Mão (arrastar uma mão para o lado; até a v10.2.0, levantar uma mão) ou o modo Cabeça (inclinar a cabeça), escolhido pelo operador.
- O operador ajusta o tempo por card ao público (de 10 a 60 s; até a v11.0.0, de 10 a 30 s), o número de notícias, os tempos da partida, o conteúdo e a mídia pelo menu Ajustes, e inicia ou encerra uma partida com um clique (v12.0.0).
- O jogador sabe, sem ler, se acertou ou errou cada card: a tela inteira fica verde ou vermelha, e o carimbo VERDADE/MENTIRA mostra o veredito (v12.0.0).

## Non-Goals

- Ranking, apelidos, contas de usuário ou qualquer dado de jogador salvo. (Os únicos valores guardados no notebook são os ajustes do estande escolhidos pelo operador (FR-9) e o banco de notícias com seus backups. Não são dados de jogador.)
- Levar a foto da partida: baixar, imprimir, enviar ou gerar QR code da foto. (O QR do resumo, v11.0.0, leva só os ids das notícias da rodada para a página das fontes, AC-5.9; nunca a foto nem dado da pessoa.)
- Modo para celular individual ou para sala de aula.
- Multiplayer ou várias pessoas jogando ao mesmo tempo.
- Atualização do conteúdo durante uma partida em andamento.

## Users and Context

**Primary users:** jogadores, que são estudantes do ensino médio e jovens adultos (muitos menores de idade) jogando um por vez num estande de evento. Inclui jogadores com baixa mobilidade, que podem jogar sentados (por exemplo, em cadeira de rodas) e movimentar só um braço ou só a cabeça.
**Secondary users:**
- Operador do estande: liga o notebook, abre o jogo e intervém pelo teclado se a detecção de movimento falhar.
- Equipe de conteúdo (não programadora): cadastra, revisa e aprova as notícias no painel Notícias do app de desktop, ou edita o CSV do banco no Excel (v9.0.0).
**Usage context:** feira, gincana ou festival, com fila e público assistindo. O jogador fica de pé a ~1,5–2 m de um notebook com webcam, às vezes ligado a uma TV. O Wi-Fi do evento é instável.
**User mental model:** "é tipo Tinder de notícia": arrastar para a direita é dar match (acredito que é verdadeira), para a esquerda é descartar (acho que é falsa). Vocabulário: card, match, descartar, saiba mais, verdadeira, falsa, fonte.

## User Stories

### Story 1: Começar uma partida pelo movimento

**As a** jogador na fila do estande
**I want** que o jogo perceba que cheguei e me prepare para jogar
**So that** eu comece sem precisar de ajuda nem tocar no notebook

**Acceptance criteria:**

- [ ] **AC-1.1** Given o jogo está na tela de espera When uma pessoa entra no quadro, fica nele ou sai e volta Then nada acontece: o jogo continua na tela de espera, sem calibração e sem partida. A câmera nunca inicia nada sozinha.
- [ ] **AC-1.2** Given a tela de calibração When a pessoa permanece na área central por 2 s contínuos Then a partida começa e o primeiro card aparece com o cronômetro no tempo por card configurado (padrão 15 s, FR-9).
- [ ] **AC-1.3** Given a tela de calibração When a pessoa sai da área central antes de 2 s Then a contagem de calibração reinicia do zero.
- [ ] **AC-1.4** Given a tela de calibração When ninguém é detectado por 10 s Then o jogo volta à tela de espera e permanece nela, mesmo que alguém entre no quadro depois (AC-1.1).
- [ ] **AC-1.5** Given há duas ou mais pessoas no quadro When a calibração ou a partida acontece Then apenas a pessoa mais central e maior no quadro controla o jogo, e os movimentos das demais não geram escolhas.
- [ ] **AC-1.6** Given a tela de espera, há notícias publicadas e a câmera está indisponível ou não foi autorizada When o operador pressiona Enter (ou clica em "▶ Iniciar") Then a partida começa na hora, sem calibração, controlada por teclado e mouse/toque.
- [ ] **AC-1.7** Given a tela de espera, há notícias publicadas e a câmera está ativa When o operador pressiona Enter (ou clica em "▶ Iniciar") Then abre a calibração com a instrução "Fique no centro" (AC-1.2), e a partida só começa depois de 2 s contínuos na área central.
- [ ] **AC-1.8** Given a tela de calibração When o operador pressiona Enter Then a calibração é pulada e a partida começa na hora, controlada por teclado e mouse/toque (AC-1.6).

### Story 2: Escolher match ou descarte com o corpo

**As a** jogador
**I want** dar match ou descartar um card deslocando o corpo para um lado
**So that** eu jogue de forma divertida e visível para quem está assistindo

**Acceptance criteria:**

- [ ] **AC-2.1** Given um card está na tela When o jogador desloca o tronco para a **própria direita** além do limiar e se mantém por ~300 ms Then o card é registrado como "match" (resposta "verdadeira") e sai pela direita da tela.
- [ ] **AC-2.2** Given um card está na tela When o jogador desloca o tronco para a **própria esquerda** além do limiar e se mantém por ~300 ms Then o card é registrado como "descarte" (resposta "falsa") e sai pela esquerda da tela.
- [ ] **AC-2.3** Given um card está na tela When o jogador se move (inclina o tronco, mexe os braços ou a cabeça) sem completar um gesto Then nenhuma escolha é registrada; o card só acompanha levemente a inclinação, como em AC-2.10, sem tremer, e só sai da tela depois de uma escolha (AC-2.1, AC-2.2). (Reescrito v10.1.0; da v4.0.0 à v10.0.0 o card ficava parado.)
- [ ] **AC-2.4** Given o jogador acabou de fazer uma escolha When o próximo card aparece e o jogador ainda está deslocado para um lado Then nenhuma nova escolha é aceita e o card fica no centro até ele voltar à área central; só então o card volta a acompanhar o tronco (AC-2.10). (Reescrito v10.3.0: os punhos deixaram de contar com a saída do braço para o lado.)
- [ ] **AC-2.5** Given um card está na tela When o operador pressiona → ou ← (ou arrasta o card com mouse/toque para a direita ou esquerda) Then o resultado é o mesmo de AC-2.1 ou AC-2.2, respectivamente.
- [ ] **AC-2.6** Given a câmera está ativa durante a partida When o jogador olha para a tela Then ele vê uma prévia pequena e espelhada de si mesmo com o esqueleto detectado desenhado por cima, num canto inferior da tela, sobreposta ao resto (não empurra nem descentraliza nenhum outro elemento); a prévia não aparece na tela de resumo (v10.0.0).
- [ ] ~~**AC-2.7**~~ (Removido na v10.3.0 por decisão do responsável: no modo Corpo o único controle é o tronco.) Texto anterior: estender um braço para o lado, com o punho além de 1,2 largura de ombro do meio do corpo por ~300 ms, escolhia o lado.
- [ ] ~~**AC-2.8**~~ (Removido na v10.3.0, junto com AC-2.7.) Texto anterior: braços para lados opostos, ou tronco e braço para lados diferentes, não escolhiam.
- [ ] **AC-2.9** Given o modo Corpo When a tela de calibração aparece Then a instrução mostra "Corpo para a direita: é verdade · Para a esquerda: é mentira · Duas mãos para cima: saiba mais". (Reescrito v10.3.0.)
- [ ] **AC-2.10** Given um card está na tela (inclusive um card de treino, FR-16) When o controle do modo se move (Corpo: o tronco, pelo meio dos ombros; Cabeça: a inclinação da cabeça; Mão: a posição horizontal da mão ativa no swipe, AC-9.20) Then o card mimetiza o controle em tempo real, como no jogo Reigns: (a) a fração do controle vai de 0 no centro a ±1 no limiar do gesto, e o card se desloca na proporção, sem zona morta além de 3%; no limiar, o card está girado 15° para aquele lado em torno do ponto central da base, e esse ponto se desloca um pouco (8% da largura do card) em direção à resposta; (b) conforme o card se aproxima de um lado, aparece o rótulo daquele lado ("Verdade" à direita, "Mentira" à esquerda) com opacidade igual à fração; desde a v11.0.0 o rótulo tem a forma de um carimbo no alto do card (caixa alta, contorno grosso, levemente girado; coral para Mentira e menta para Verdade, AC-2.12); (c) o movimento é interpolado a cada quadro de tela entre as leituras da câmera (~6–7 por segundo), com constante de tempo de 100 ms, para não andar aos saltos sem ficar atrasado; (d) ao chegar a ±1, vale a regra de escolha do modo (Corpo e Cabeça: mantido ~300 ms, AC-2.1, AC-9.10; Mão: na hora, AC-9.20) e o card sai pelo lado a partir da posição em que está; (e) o card fica no centro, sem rótulo, sem pessoa detectada, em "Volte para o centro", com o menu aberto e depois de uma escolha até o controle voltar ao centro (AC-2.4, AC-9.12, AC-9.22); (f) o movimento é comandado pelo jogador e é o retorno visual do gesto, por isso vale também quando o sistema pede menos movimento (`prefers-reduced-motion: reduce`). O deslocamento não muda tempos, gestos, pontos nem a centralização de AC-4.5, medida com o card no centro. Os números são pontos de partida a ajustar no notebook do estande. (Reescrito v10.3.0 e ajustado v10.3.1; decidido pelo responsável. Na v11.0.0 só o visual do rótulo mudou; geometria, tempos e gestos, não.)
- [ ] **AC-2.11** Given um card está na tela (inclusive de treino) When o controle do modo se move Then as laterais são dois botões redondos, Mentira à esquerda (disco coral com o triângulo apontando para a esquerda) e Verdade à direita (disco menta com a estrela de 4 pontas), cada um com a pílula do nome embaixo; o botão do lado para onde o card vai acende na proporção da mesma fração de AC-2.10 (fonte única, escrita no mesmo quadro que move o card): cresce até 10% e ganha um anel amarelo de até 8 px; com o card no centro, os dois ficam apagados. Depois da escolha, o botão do lado escolhido fica aceso por inteiro durante a saída do card, por qualquer entrada (gesto, seta ou arraste). Os botões não recebem clique (a entrada alternativa continua a de FR-3). (Adicionado v11.0.0; a confirmar.)
- [ ] **AC-2.12** Given um card está na tela When ele aparece e quando sai Then atrás dele ficam duas camadas paradas, levemente giradas, como uma pilha de cards (no lugar da sombra chapada do card), que não se movem com o card nem contam na centralização (AC-4.5); ao sair (AC-2.1, AC-2.2), o carimbo do lado escolhido aparece por inteiro no card ("VERDADE" ou "MENTIRA") durante os mesmos `TEMPOS.saidaMs` da saída, sem somar tempo. (Adicionado v11.0.0; a confirmar.)

### Story 3: Ver "saiba mais" antes de decidir

**As a** jogador em dúvida
**I want** abrir o texto completo de uma notícia
**So that** eu tenha mais pistas antes de escolher

**Acceptance criteria:**

- [ ] **AC-3.1** Given um card está na tela When o jogador mantém os dois punhos acima da cabeça (acima do nariz) por ~500 ms Then o texto "saiba mais" do card é exibido e o cronômetro continua correndo, com a barra de tempo diminuindo normalmente (AC-4.6, AC-4.7).
- [ ] **AC-3.2** Given o "saiba mais" está aberto When o jogador repete o gesto de duas mãos para cima (ou o operador pressiona ↑) Then o "saiba mais" fecha e o cronômetro segue do ponto em que está, sem ter parado.
- [ ] **AC-3.3** Given o "saiba mais" está aberto When o jogador faz o gesto de match ou de descarte Then o "saiba mais" fecha e a escolha é registrada normalmente.
- [ ] **AC-3.4** Given um card está na tela When o operador pressiona ↑ Then o resultado é o mesmo de AC-3.1.

> AC-3.5 (o "saiba mais" fechar sozinho após 5 s) foi removido na v5.0.0 e o número não é reutilizado. O "saiba mais" só fecha por AC-3.2, AC-3.3 ou quando o tempo esgota (AC-4.3).

### Story 4: Aprender com cada resposta

**As a** jogador
**I want** saber logo depois de cada card se acertei e por quê
**So that** eu aprenda a técnica de checagem, não só o resultado

**Acceptance criteria:**

- [ ] **AC-4.1** Given o jogador escolheu um card When a escolha corresponde ao veredito da notícia Then aparece o feedback pelo tempo de feedback configurado (padrão 3 s, AC-9.25), com o fundo da tela inteira **verde** (cor de acerto); no centro da tela, o texto do resultado "Acertou!", grande, e por cima dele o carimbo do veredito (AC-4.9); abaixo, a explicação e a técnica de checagem da notícia; e o placar soma +1. Não aparece "match" no feedback. (Reescrito v10.0.0, v11.0.0 e v12.0.0: até a v11.0.0 o fundo tinha a cor do veredito e havia "Deu match!".)
- [ ] **AC-4.9** Given o feedback de qualquer resultado (AC-4.1 a AC-4.3) When ele aparece Then o veredito da notícia é mostrado só por um carimbo, carimbado por cima do texto do resultado, os dois no centro da tela, com o carimbo cobrindo só parte do texto (o texto do resultado continua legível): "VERDADE" com a estrela (menta) nas notícias verdadeiras e "MENTIRA" com o triângulo (coral) nas falsas, o mesmo carimbo do card (AC-2.10b), legível tanto sobre o verde quanto sobre o vermelho (contraste mínimo 4,5:1 do texto do carimbo com o próprio fundo do carimbo). O carimbo entra com uma animação de carimbada (cai de maior para o tamanho final com um leve giro, cerca de 300 ms), que **soma** ao tempo do feedback (não desconta); com `prefers-reduced-motion`, aparece já no lugar. A cor do fundo diz o resultado: verde = acertou; vermelho = errou ou tempo esgotado. O texto do resultado ("Acertou!", "Errou", "Tempo esgotado") continua sempre visível, para não depender só da cor (daltonismo). Sem "Deu match!"/"Não deu match" e sem os ícones de discos e da ampulheta. (Adicionado v10.0.0; reescrito v11.0.0 e v12.0.0.)
- [ ] **AC-4.2** Given o jogador escolheu um card When a escolha não corresponde ao veredito Then aparece o feedback com o fundo da tela inteira **vermelho** (cor de erro), o texto "Errou" com o carimbo do veredito por cima (AC-4.9), a explicação e a técnica, e o placar não muda. (Reescrito v12.0.0.)
- [ ] **AC-4.3** Given um card está na tela When o cronômetro chega a 0 sem escolha Then aparece o feedback com o fundo **vermelho**, o texto "Tempo esgotado" com o carimbo do veredito por cima (AC-4.9), a explicação e a técnica, e o placar não muda. (Reescrito v12.0.0.)
- [ ] **AC-4.10** Given o feedback de um card de treino do tutorial (FR-16) When ele aparece Then segue o mesmo layout de AC-4.1 a AC-4.3 e AC-4.9 (fundo verde ou vermelho pelo resultado, carimbo do veredito por cima do texto), com o texto didático do treino no lugar da explicação. (Adicionado v12.0.0.)
- [ ] **AC-4.4** Given o feedback de um card terminou When ainda há cards na partida Then o próximo card aparece com o cronômetro no tempo por card configurado.
- [ ] **AC-4.5** Given um card está na tela (parado ou saindo) When a tela tem 1366×768 ou 1920×1080 Then o card fica centralizado na vertical: o centro do card fica a no máximo 8 px do centro da área de jogo, que é a tela menos a barra de tempo (AC-4.6), sem cortar texto (FR-4) e sem ficar atrás da barra. A prévia da câmera (AC-2.6) não entra nessa conta. (Ajustado v10.0.0.)
- [ ] **AC-4.6** Given um card está na tela When o tempo passa Then uma barra de tempo grossa, com a largura da tela e colada na base, diminui da direita para a esquerda na proporção do tempo restante e mostra dentro dela os segundos restantes (por exemplo, "12 s"); não há mais número de tempo em cima do card.
- [ ] **AC-4.7** Given um card está na tela com o cronômetro correndo (inclusive com o "saiba mais" aberto) When faltam 5 s ou menos Then a barra fica vermelha e o card ganha borda e brilho vermelhos que pulsam cerca de 1 vez por segundo, crescendo levemente; com o cronômetro pausado ("Volte para o centro") o card não pulsa.
- [ ] ~~**AC-4.8**~~ (Removido na v10.0.0: o tempo aparece só na barra da base da tela, AC-4.6.) Texto anterior: Given um card está na tela (inclusive com o "saiba mais" aberto) When o tempo passa Then, além da barra da base da tela (AC-4.6), o card mostrava na parte de baixo, na largura do card, uma barra de tempo que diminui da direita para a esquerda na mesma proporção e mostra os mesmos segundos restantes (por exemplo, "12 s"); nos últimos 5 s ela fica vermelha junto com a barra da tela (AC-4.7). A barra do card não cobre título, descrição, imagem, dica nem o texto do "saiba mais", e o card continua cabendo na área de jogo (AC-4.5).

### Story 5: Ver o resumo e liberar o estande

**As a** jogador que terminou a partida
**I want** ver como fui
**So that** eu saia sabendo se preciso checar melhor as notícias, e a fila ande

**Acceptance criteria:**

- [ ] **AC-5.1** Given o último card da partida teve seu feedback concluído When a partida termina Then a tela de resumo mostra os pontos no formato "N de M", a mensagem da faixa de acertos (AC-5.7), a lista das notícias da rodada (AC-5.8), o QR das fontes (AC-5.9) e o polaroid, se houver foto (AC-13.2). (Até a v7.1.0 mostrava também a lista das técnicas da partida; removida na v8.0.0. Lista e QR entraram na v11.0.0.)
- [ ] **AC-5.8** Given a tela de resumo When ela aparece Then, abaixo do placar, um painel "Notícias da rodada" lista as notícias da partida na ordem em que foram jogadas, em duas colunas, cada uma com: o resultado (disco amarelo com a estrela = acertou; disco creme com o X = errou ou tempo esgotado), o título curto (`titulo_curto`, ou o título cortado numa palavra com "…" até 34 caracteres), a pílula do veredito ("Verdade" menta ou "Mentira" coral) e "Fonte: <veículo>" nas verdadeiras ou "Desmentido por: <veículo>" nas falsas, com o veículo de `fonte_nome` ou, sem ela, o domínio de `fonte_url` sem "www.". O texto da lista é menor que os 28 px da regra de leitura a 2 m, de propósito: é para ler de perto ou na foto do celular; placar, mensagem e QR continuam grandes. (Adicionado v11.0.0; a confirmar.) Com N notícias, cada coluna tem ⌈N/2⌉ linhas, preenchidas de cima para baixo; acima de 10 notícias as linhas ficam mais baixas (título com pelo menos 13 px em 1366×768) para a lista inteira caber na tela sem sobrepor nada. (Esclarecido v12.0.2.)
- [ ] **AC-5.9** Given a tela de resumo When ela aparece Then um cartão com um QR code único e a chamada "Fotografe e veja todas as fontes" fica ao lado do placar, com pelo menos 160 px em 1366×768; o QR é gerado no próprio jogo, sem rede, e abre a página das fontes da versão web (AC-5.10) com só os ids das notícias da rodada, depois do `#` do endereço (um `mds-NNNN` vira só o número). O QR não leva foto, âncoras, pontos, respostas nem qualquer dado da pessoa. (Adicionado v11.0.0; a confirmar.)
- [ ] **AC-5.10** Given alguém abre no celular o endereço do QR When a página das fontes carrega Then ela mostra, para cada id pedido que está no banco embutido da versão web e é jogável (AC-7.7), a pílula do veredito, o título completo e os links: "Fonte:" nas verdadeiras ou "Desmentido por:" nas falsas, com `fonte_url` (nome do veículo) e cada link de `fontes_extras` (domínio); ids desconhecidos aparecem como "Notícia não encontrada nesta versão do jogo". Notícias criadas ou editadas só no banco local do app de desktop (FR-7) não aparecem, ou aparecem como estão no banco embutido: limite aceito na v11.0.0. A página não guarda nada e só se conecta à própria origem. (Adicionado v11.0.0; a confirmar.)
- [ ] **AC-5.7** Given a tela de resumo de uma partida com N acertos em M cards When ela aparece Then, logo abaixo do "N de M", aparece uma mensagem conforme a proporção N/M: menos de 0,5 (0 a 4 de 10) — "Cuidado! Você precisa verificar melhor as manchetes."; de 0,5 até menos de 0,8 (5 a 7 de 10) — "Você consegue se proteger, mas ainda pode melhorar."; de 0,8 até menos de 1 (8 e 9 de 10) — "Parabéns! Você checa muito bem as notícias."; todos certos (10 de 10) — "Imune a fake news!". A mensagem aparece com ou sem a foto (AC-13.2), sem cortar nada em 1366×768 (FR-4).
- [ ] **AC-5.2** Given a tela de resumo está aberta e o ajuste "Volta automática do resumo" está Desligado (padrão, AC-9.26) When o tempo passa sem ação do operador Then o resumo continua na tela, sem limite de tempo, mesmo que o jogador saia do quadro. Com a volta automática em N s, o resumo fecha depois de N s sem ação, nada da partida é guardado (a foto é apagada, FR-13) e o jogo volta à tela de espera. (Reescrito v12.0.0.)
- [ ] **AC-5.6** Given a tela de resumo está aberta When o operador pressiona Enter (iniciar nova partida) Then o resumo fecha, nada da partida anterior é guardado e o jogo vai para a calibração da nova partida (ou inicia direto pela entrada alternativa, se a câmera estiver indisponível).
- [ ] **AC-5.3** Given uma partida no modo Corpo, iniciada pela calibração, está em andamento When ninguém é detectado na câmera Then o cronômetro pausa e aparece a mensagem "Volte para o centro".
- [ ] **AC-5.4** Given a mensagem "Volte para o centro" está na tela (só no modo Corpo, AC-5.3) When a pessoa volta ao quadro antes da tolerância sem pessoa (padrão 10 s, AC-9.28) Then a partida continua do mesmo card, com o cronômetro retomando de onde parou.
- [ ] **AC-5.5** Given a mensagem "Volte para o centro" está na tela (só no modo Corpo, AC-5.3) When passa a tolerância sem pessoa (padrão 10 s, AC-9.28) sem ninguém no quadro Then a partida é encerrada sem resumo e o jogo volta à tela de espera e permanece nela, mesmo que a pessoa volte ao quadro depois (AC-1.1).

### Story 6: Montar uma partida equilibrada

**As a** equipe de conteúdo
**I want** que cada partida tenha uma mistura justa de notícias verdadeiras e falsas
**So that** o jogador não ganhe chutando sempre o mesmo lado

**Acceptance criteria:**

- [ ] **AC-6.1** Given o ajuste "Notícias por partida" vale N (padrão 10, AC-9.23) e há pelo menos ⌈N/2⌉ notícias verdadeiras e ⌈N/2⌉ falsas jogáveis dentro dos filtros de conteúdo (AC-9.27) When uma partida começa Then ela tem N cards, ⌊N/2⌋ de um lado e ⌈N/2⌉ do outro (o lado com uma a mais é sorteado quando N é ímpar), sem repetição, na ordem da dificuldade escolhida (AC-9.27; padrão: aleatória). (Reescrito v12.0.0: era sempre 10, 5 e 5.)
- [ ] **AC-6.2** Given há menos de ⌈N/2⌉ notícias jogáveis de um dos lados (ou seja, AC-6.1 não se aplica) e pelo menos N no total (dentro dos filtros) When uma partida começa Then ela tem N cards, com todas as notícias do lado menor e o restante completado com o outro lado. (Reescrito v12.0.0.)
- [ ] **AC-6.3** Given há entre 1 e N−1 notícias jogáveis dentro dos filtros When uma partida começa Then ela usa todas as notícias disponíveis, na ordem da dificuldade escolhida. (Reescrito v12.0.0.)
- [ ] **AC-6.4** Given não há nenhuma notícia jogável dentro dos filtros de conteúdo When o jogo está na tela de espera Then ela mostra "Nenhuma notícia publicada" (ou, se o banco tem notícias jogáveis fora dos filtros, "Nenhuma notícia para os ajustes atuais: revise Ajustes › Conteúdo") e nenhuma partida pode começar. (Reescrito v12.0.0.)

### Story 7: Gerenciar as notícias dentro do jogo (reescrito v9.0.0)

**As a** pessoa da equipe (conteúdo ou operação), não programadora
**I want** cadastrar, editar e importar notícias pelo próprio jogo
**So that** o banco mude sem depender de programador, de planilha on-line ou de internet

**Acceptance criteria:**

- [ ] **AC-7.1** Given o app de desktop na tela de espera When o operador abre ☰ › Notícias Then abre o painel "Notícias" com a lista de todas as notícias do banco (id, título, veredito, tema, status), a contagem total e por veredito, e filtros por texto, veredito, tema, dificuldade (v10.1.0) e status.
- [ ] **AC-7.2** Given o painel Notícias When o operador escolhe "Nova notícia" ou edita uma existente e salva Then a notícia é gravada no banco com os campos `id` (gerado automaticamente na nova), `titulo`, `descricao`, `saiba_mais`, `veredito`, `explicacao`, `tecnica`, `tema`, `fonte_url`, `fontes_extras`, `imagem` (opcional), `revisado_por`, `status`, `dificuldade` (opcional, v10.1.0), `titulo_curto` e `fonte_nome` (opcionais, v11.0.0, AC-7.11), `visivel` (opcional, v12.0.0, AC-7.12); `veredito`, `tecnica`, `tema` e `status` só aceitam os valores das listas (`verdadeira`/`falsa`; `fonte`/`data`/`imagem`/`contexto`; `saude`/`ciencia`/`historia`/`tecnologia`/`curiosidades`/`meio-ambiente`/`politica` (v12.0.0, com ilustração e cor de tema próprias, como os demais temas, FR-4 e FR-15); `rascunho`/`aprovada`), e `dificuldade` aceita `facil`/`medio`/`dificil` ou vazio.
- [ ] **AC-7.3** Given o editor de uma notícia When falta um campo obrigatório, o `id` é repetido, `fonte_url` não é um link http(s), `status = aprovada` sem `revisado_por`, um campo de lista (inclusive `dificuldade`, quando preenchida) tem valor fora da lista, ou `titulo_curto` passa de 34 caracteres (v11.0.0) Then o editor aponta o campo com o problema e não salva.
- [ ] **AC-7.4** Given o painel Notícias com notícias selecionadas When o operador escolhe "Apagar" e confirma, ou "Alterar em massa" um campo de lista (`status`, `tema`, `tecnica`, `dificuldade` e, desde a v12.0.0, `visivel`) e aplica Then todas as selecionadas são apagadas ou alteradas de uma vez.
- [ ] **AC-7.5** Given o painel Notícias When o operador escolhe "Importar CSV" e um arquivo no formato de FR-6 Then aparece uma prévia com as linhas novas, as que já existem (mesmo `id`) e as inválidas com o motivo; ao confirmar "Adicionar N", só as novas válidas entram no banco.
- [ ] **AC-7.6** Given qualquer gravação do banco (salvar, apagar, alterar em massa, importar) When ela termina Then o arquivo anterior foi copiado antes para a pasta de backups (FR-7) e a próxima partida já usa o banco novo, sem reabrir o jogo.
- [ ] **AC-7.7** Given o banco tem notícias com `status = rascunho` ou `visivel = nao` When uma partida é sorteada Then só entram notícias com `status = aprovada`, `fonte_url` e `revisado_por` preenchidos (Princípio 1) e `visivel` diferente de `nao` (AC-7.12).
- [ ] **AC-7.8** Given o painel Notícias When o operador escolhe "Exportar CSV" Then o jogo salva uma cópia do banco no formato de FR-6, que abre no Excel.
- [ ] **AC-7.9** Given o jogo aberto no navegador (versão web) When o operador abre ☰ › Notícias Then aparece o aviso "O gerenciador de notícias está disponível no app de desktop", e o jogo usa o banco embutido.
- [ ] **AC-7.10** Given o banco de notícias When uma notícia tem a coluna `dificuldade` vazia, ou o CSV (inclusive um arquivo de antes da v10.1.0) não tem essa coluna Then a notícia continua válida e jogável, com a dificuldade vazia; com um valor fora de `facil`/`medio`/`dificil` ela fica inválida (AC-7.3, AC-8.4). No painel Notícias, o editor mostra a dificuldade como lista (Fácil, Médio, Difícil ou vazia) e o filtro "Dificuldade" mostra só as notícias daquela dificuldade (ou só as sem dificuldade). A partir da v10.1.0 o CSV exportado sempre tem a coluna. Desde a v12.0.0 o sorteio usa a dificuldade conforme o ajuste "Dificuldade" (AC-9.27). (Adicionado v10.1.0.)
- [ ] **AC-7.11** Given o banco de notícias When uma notícia tem `titulo_curto` (até 34 caracteres) ou `fonte_nome` vazios, ou o CSV (inclusive de antes da v11.0.0) não tem essas colunas Then a notícia continua válida e jogável, e o resumo usa o título cortado e o domínio da fonte (AC-5.8). O editor mostra os dois campos como opcionais; o CSV exportado sempre tem as duas colunas, depois de `dificuldade`. (Adicionado v11.0.0.)
- [ ] **AC-7.12** Given o banco de notícias When uma notícia tem `visivel = nao` Then ela continua no banco, válida, aparece no painel Notícias e no painel Questões (FR-17) com a marca "Oculta", mas não entra em nenhuma partida (AC-7.7) nem na página das fontes (AC-5.10), até o operador religá-la; `visivel` vazio, `sim` ou a coluna ausente (CSV de antes da v12.0.0) valem como visível. O operador liga e desliga a visibilidade por um interruptor no painel Questões e no editor, e em massa no painel Notícias ("Alterar em massa" passa a aceitar `visivel`). Um valor fora de `sim`/`nao`/vazio deixa a notícia inválida (AC-7.3). O CSV exportado sempre tem a coluna, depois de `fonte_nome`. Só no app de desktop: na versão web o interruptor aparece desabilitado com o aviso de AC-7.9. (Adicionado v12.0.0.)

### Story 8: Jogar offline no estande (reescrito v9.0.0)

**As a** operador do estande
**I want** um app de desktop que funcione sem internet
**So that** a queda do Wi-Fi do evento não pare o estande e o banco de notícias fique no notebook

**Acceptance criteria:**

- [ ] **AC-8.1** Given o app de desktop instalado no notebook When o notebook está sem internet e o operador abre o app Then uma partida completa roda, com as notícias do banco local e a detecção de movimento funcionando.
- [ ] **AC-8.2** Given o executável do app When o operador o abre Then o jogo abre em janela própria, sem barra de endereço, e F11 alterna a tela cheia; a câmera funciona depois da permissão.
- [ ] **AC-8.3** Given a primeira abertura do app num notebook When não existe `Documentos/Match do Saber/noticias.csv` Then o app cria esse arquivo a partir do banco embutido; nas aberturas seguintes, lê esse arquivo.
- [ ] **AC-8.4** Given o arquivo do banco foi editado fora do jogo (por exemplo, no Excel) When o operador recarrega o app (Ctrl+R) Then o jogo passa a usar o conteúdo novo; linhas inválidas são ignoradas e listadas no painel Notícias com o motivo.
- [ ] **AC-8.5** Given a versão web (navegador) When o operador abre o endereço do jogo Then o jogo funciona com o banco embutido, como antes da v9.0.0.

### Story 9: Configurar o jogo — modo acessível, tempo e som (reescrito v2.0.0)

**As a** operador do estande
**I want** um menu de configurações com o modo de jogo (Corpo, Mão, Cabeça), o tempo por card e o som
**So that** jogadores com baixa mobilidade ou leitura mais lenta também consigam jogar, e o estande se adapte ao ambiente

**Acceptance criteria:**

- [ ] **AC-9.1** Given o jogo está na tela de espera When o operador pressiona M (ou escolhe ☰ › Ajustes, FR-14) Then abre o painel "Ajustes" com os itens agrupados e os valores atuais marcados: **Partida** — "Notícias por partida", "Tempo por card", "Tempo do feedback", "Volta automática do resumo"; **Conteúdo** — "Temas", "Dificuldade"; **Detecção** — "Modo de jogo", "Sensibilidade do gesto", "Tolerância sem pessoa"; **Mídia** — "Som", "Volume", "Foto no resumo", "QR das fontes", "Tutorial"; **Questões** — "Revisar questões" (abre o painel de FR-17) e a contagem "N jogáveis de M no banco (K ocultas)"; e, no fim, "Restaurar padrão". (Reescrito v12.0.0: até a v11.0.0 era o menu "Configurações" com cinco itens.)
- [ ] **AC-9.2** Given o painel "Ajustes" está aberto When o operador muda um valor (↑/↓ escolhem o item, passando pelos grupos; ←/→ mudam o valor; Espaço liga/desliga um tema; ou clique no valor) Then o valor muda na hora, fica guardado, e a tela de espera passa a mostrar o resumo "Modo: <modo> · <N> notícias · <T> s por card · Som: <ligado|desligado>" e, quando algum ajuste está fora do padrão além desses, "· Ajustes personalizados". (Reescrito v12.0.0.)
- [ ] **AC-9.3** Given o menu está aberto When o operador pressiona Esc, M ou Enter, ou clica no "✕" do painel (nome acessível "Fechar") Then o menu fecha mantendo os valores escolhidos, e nenhuma partida começa.
- [ ] **AC-9.4** Given nada foi ajustado antes neste notebook (ou o operador escolheu "Restaurar padrão", AC-9.30) When o jogo é aberto Then os ajustes são: 10 notícias por partida, 15 s por card, 3 s de feedback, volta automática do resumo desligada, todos os temas, dificuldade "Misturada", modo Corpo, sensibilidade Normal, 10 s de tolerância sem pessoa, som ligado, volume Alto, foto no resumo ligada, QR das fontes ligado e tutorial desligado. (Reescrito v12.0.0.)
- [ ] **AC-9.5** Given o operador mudou as configurações When o jogo é fechado e reaberto, inclusive sem internet Then as mesmas configurações continuam ativas.
- [ ] **AC-9.6** Given o jogo não está na tela de espera When o operador pressiona M Then nada acontece: as configurações só mudam entre partidas.
- [ ] ~~**AC-9.7**~~ (Removido na v10.3.0 por decisão do responsável: no modo Mão o único controle é o swipe, AC-9.20.) Texto anterior: mão direita acima do ombro por ~300 ms = match; mão esquerda = descarte.
- [ ] **AC-9.8** Given o modo Mão e um card na tela When o jogador mantém as duas mãos acima dos ombros por ~500 ms Then o "saiba mais" abre (ou fecha, se já estiver aberto) e nenhuma escolha é registrada.
- [ ] **AC-9.9** Given o modo Mão e o jogador acabou de fazer uma escolha When o próximo card aparece com a mão ainda longe do centro Then nenhuma nova escolha é aceita e o card fica no centro até ele trazer a mão de volta para a frente do peito (a menos de 0,5 largura de ombro do meio do corpo) ou baixá-la. (Reescrito v10.3.0.)
- [ ] **AC-9.10** Given o modo Cabeça e um card na tela When o jogador inclina a cabeça para o **próprio lado direito** (~15° em relação à posição registrada na calibração) e mantém por ~300 ms Then o card é registrado como "match" e sai pela direita; para o lado esquerdo, como "descarte" e sai pela esquerda.
- [ ] **AC-9.11** Given o modo Cabeça e um card na tela When o jogador levanta o queixo (olha para cima) e mantém por ~500 ms Then o "saiba mais" abre (ou fecha, se já estiver aberto) e nenhuma escolha é registrada.
- [ ] **AC-9.12** Given o modo Cabeça e o jogador acabou de fazer uma escolha When o próximo card aparece com a cabeça ainda inclinada Then nenhuma nova escolha é aceita até ele voltar a cabeça ao centro.
- [ ] **AC-9.13** Given o modo Cabeça e um card na tela When o jogador inclina a cabeça sem atingir o limiar Then nenhuma escolha é registrada e o card só acompanha levemente a inclinação (AC-2.3, AC-2.10). (Reescrito v10.1.0.)
- [ ] **AC-9.14** Given o modo Mão ou Cabeça When a tela de calibração ou um card aparece Then as instruções mostram os gestos do modo ativo: Mão — "Arraste a mão para a direita: é verdade · Para a esquerda: é mentira · Duas mãos para cima: saiba mais" (v10.3.0); Cabeça — "Cabeça para a direita: é verdade · Cabeça para a esquerda: é mentira · Queixo para cima: saiba mais". ("falsa" virou "mentira" na v10.0.0.)
- [ ] **AC-9.15** Given o modo Mão ou Cabeça e um jogador sentado diante da câmera, com ombros e rosto visíveis When ele fica no centro por 2 s Then a calibração conclui e a partida começa.
- [ ] **AC-9.16** Given qualquer modo de jogo When o operador usa as setas, Enter ou o mouse/toque Then a entrada alternativa funciona exatamente como em FR-3.
- [ ] **AC-9.17** Given o tempo por card configurado em N s When um card aparece Then o cronômetro começa em N s e o tempo esgota depois de N s; o tempo por card vai de 10 a 60 s (10, 15, 20, 25, 30, 45, 60); no painel, ← no menor valor e → no maior não mudam nenhum item. (Reescrito v12.0.0: ia até 30 s.)
- [ ] **AC-9.18** Given a tela de espera When o painel "Ajustes" abre (até a v11.0.0, "Configurações") Then ele aparece como um painel encostado na borda direita, com a altura da tela inteira e largura de até 26rem, sobre o restante da tela escurecido; o título "Ajustes" e o "✕" ficam no topo do painel, os itens rolam quando não cabem na altura, e o botão "▶ Iniciar" continua no mesmo lugar.
- [ ] ~~**AC-9.19**~~ (Removido na v10.3.0, junto com AC-9.7.) Texto anterior: as duas mãos juntas, abaixo dos ombros, além da linha de um ombro por ~300 ms escolhiam o lado.
- [ ] **AC-9.20** Given o modo Mão e um card na tela When o jogador levanta uma mão à frente do corpo (punho acima do cotovelo; essa é a mão ativa; com as duas, vale a que está mais longe do meio do corpo) e a arrasta para o **próprio lado direito** Then o card segue a mão (AC-2.10), com a fração = deslocamento do punho a partir do meio do corpo ÷ 1 largura de ombro, e, quando o punho passa de 1 largura de ombro, o card é registrado como "match" na hora e sai pela direita; para o lado esquerdo, como "descarte". O limite de 1 largura de ombro é um ponto de partida, a calibrar no hardware. (Reescrito v10.3.0: era o arraste em até ~0,8 s, um de três jeitos de escolher.)
- [ ] **AC-9.21** Given o modo Mão ou Cabeça e uma partida iniciada pela calibração When a câmera deixa de detectar a pessoa por qualquer tempo durante o card Then o cronômetro continua correndo, "Volte para o centro" não aparece e a partida não é encerrada por ausência.
- [ ] **AC-9.22** Given o modo Mão When o jogador acabou de escolher pelo swipe ou de abrir o "saiba mais" com as duas mãos Then nenhuma nova escolha é aceita até a mão ativa voltar para a frente do peito (a menos de 0,5 largura de ombro do meio do corpo) ou não haver mão ativa. (Reescrito v10.3.0.)
- [ ] **AC-9.23** Given o painel Ajustes When o operador muda "Notícias por partida" (5, 8, 10, 12, 15 ou 20) Then a próxima partida tem esse número de cards, com o equilíbrio de AC-6.1 a AC-6.3. (Adicionado v12.0.0.)
- [ ] **AC-9.24** Given o painel Ajustes When o operador muda o "Tempo por card" Then vale AC-9.17. (Adicionado v12.0.0.)
- [ ] **AC-9.25** Given o painel Ajustes When o operador muda o "Tempo do feedback" (3, 5, 8, 10 ou 15 s) Then cada feedback da partida (e do treino) fica na tela por esse tempo, mais a saída do card e a animação do carimbo, que somam (AC-4.9). (Adicionado v12.0.0.)
- [ ] **AC-9.26** Given o painel Ajustes When o operador muda a "Volta automática do resumo" (Desligada, 30, 60 ou 120 s) Then o resumo se comporta como em AC-5.2. (Adicionado v12.0.0.)
- [ ] **AC-9.27** Given o painel Ajustes, grupo Conteúdo When o operador desliga ou liga temas (lista dos temas de AC-7.2, cada um com a contagem de notícias jogáveis; pelo menos um fica ligado) ou escolhe a "Dificuldade" — Misturada (aleatória, padrão), Só fácil, Só médio, Só difícil ou Crescente (fáceis primeiro, depois médias, depois difíceis, aleatória dentro de cada nível; sem dificuldade conta como médio) Then o sorteio da próxima partida usa só as notícias jogáveis desses temas e níveis (as sem dificuldade só entram em Misturada e Crescente); a contagem "N jogáveis" do painel e a tela de espera (AC-6.4) refletem os filtros. (Adicionado v12.0.0.)
- [ ] **AC-9.28** Given o painel Ajustes, grupo Detecção When o operador muda a "Sensibilidade do gesto" (Menor, Normal, Maior) ou a "Tolerância sem pessoa" (5, 10 ou 20 s; só modo Corpo) Then os limiares dos gestos de todos os modos (distâncias nos modos Corpo e Mão, ângulo no modo Cabeça) são multiplicados por 1,25 (Menor: exige gesto maior), 1 (Normal) ou 0,8 (Maior), sem mudar os tempos de permanência; e a pausa "Volte para o centro" encerra a partida depois da tolerância escolhida (AC-5.4, AC-5.5). O valor Normal mantém exatamente os limiares atuais. (Adicionado v12.0.0.)
- [ ] **AC-9.29** Given o painel Ajustes, grupo Mídia When o operador muda "Volume" (Baixo, Médio, Alto) ou desliga o "QR das fontes" Then os sons tocam a 30%, 60% ou 100% do volume atual (Alto = como hoje), e o resumo deixa de mostrar o cartão do QR (AC-5.9), mantendo a lista das notícias (AC-5.8). (Adicionado v12.0.0.)
- [ ] **AC-9.30** Given o painel Ajustes When o operador escolhe "Restaurar padrão" e confirma Then todos os ajustes voltam aos valores de AC-9.4; o banco de notícias não muda. (Adicionado v12.0.0.)
- [ ] **AC-9.31** Given o painel Ajustes When o operador escolhe "Revisar questões" Then o painel Ajustes fecha e abre o painel Questões (FR-17) já filtrado por "Rascunho". (Adicionado v12.0.0.)

### Story 10: Iniciar e sair com um clique (adicionado v2.0.0)

**As a** operador do estande
**I want** botões para iniciar e para encerrar uma partida
**So that** eu controle a fila sem depender do teclado ou de esperar o fim da partida

**Acceptance criteria:**

- [ ] **AC-10.1** Given o jogo está na tela de espera e há notícias publicadas When o operador clica em "▶ Iniciar" Then acontece o mesmo que com Enter na espera (AC-1.6 sem câmera, AC-1.7 com câmera ativa).
- [ ] **AC-10.2** Given não há notícias publicadas When a tela de espera aparece Then o botão "▶ Iniciar" está desativado.
- [ ] **AC-10.3** Given o jogo está na calibração, num card (com ou sem "saiba mais"), no feedback ou no resumo When o operador clica em "✕ Sair" ou pressiona Esc Then a partida termina na hora, sem resumo, nada dela é guardado e o jogo volta à tela de espera e permanece nela, mesmo que o jogador continue no quadro (AC-1.1).
- [ ] **AC-10.4** Given a tela de espera, sem menu aberto When o operador pressiona Esc Then nada acontece.
- [ ] **AC-10.5** Given uma partida em andamento When o botão "✕ Sair" aparece Then ele fica num canto da tela, não cobre o card nem o texto da notícia (FR-4) e tem o nome acessível "Sair da partida".

### Story 11: Ouvir a escolha e o resultado (adicionado v2.0.0)

**As a** jogador
**I want** sons curtos quando escolho e quando vejo o resultado
**So that** o jogo fique mais divertido e o resultado chame a atenção do público

**Acceptance criteria:**

- [ ] **AC-11.1** Given o som está ligado When uma escolha é registrada (por gesto, tecla ou arraste) Then toca um som curto de "deslizar" enquanto o card sai.
- [ ] **AC-11.2** Given o som está ligado When o feedback "Acertou!" aparece Then toca um som positivo.
- [ ] **AC-11.3** Given o som está ligado When o feedback "Errou" ou "Tempo esgotado" aparece Then toca um som de erro, diferente do som positivo.
- [ ] **AC-11.4** Given o som está desligado nas configurações When qualquer escolha ou feedback acontece Then nenhum som toca.
- [ ] **AC-11.5** Given o jogo está sem internet When um som deve tocar Then ele toca normalmente: os sons não dependem de rede.
- [ ] **AC-11.6** Given o som está ligado When a tela de resumo aparece depois do último feedback Then toca uma vez uma vinheta curta (de 1 a 1,5 s), sempre alegre, que cresce com a faixa de acertos (AC-5.7): faixa 1, duas notas de "quase lá"; faixa 2, um arpejo de três notas; faixa 3, quatro notas; faixa 4, uma fanfarra curta com brilho no final. Sair da partida (FR-10) ou terminar sem resumo não toca a vinheta. Não há tique nos últimos 5 s. (Adicionado v11.0.0; a confirmar.)


### Story 12: Medir o rastreio no notebook real (adicionado v5.2.0)

**As a** equipe técnica
**I want** ver e registrar, no notebook do estande, o desempenho da detecção de pose e o que ela enxerga das mãos e da cabeça
**So that** os limites dos gestos sejam ajustados com dados reais, e não por tentativa

**Acceptance criteria:**

- [ ] **AC-12.1** Given o jogo é aberto sem `?diagnostico` no endereço When qualquer tela aparece Then nenhum painel de diagnóstico é mostrado e nada é registrado.
- [ ] **AC-12.2** Given o jogo é aberto com `?diagnostico` no endereço When qualquer tela aparece Then um painel "Diagnóstico" aparece no canto superior esquerdo, abaixo do lugar do "✕ Sair", sem cobrir o card (FR-4), e se atualiza pelo menos 2 vezes por segundo.
- [ ] **AC-12.3** Given o painel de diagnóstico está na tela When a câmera está ativa Then ele mostra: quadros por segundo do último segundo; tempo médio e máximo da detecção de pose no último segundo, em ms; número de pessoas detectadas; modo de jogo e tela atuais; para punho direito, punho esquerdo, ombro direito e ombro esquerdo, a altura (y) e a confiança; se cada mão está acima do ombro pela regra do modo Mão e o deslocamento lateral de cada punho, em larguras de ombro; a inclinação da cabeça em graus e a medida do queixo; e os gestos reconhecidos nos últimos 5 s. Sem câmera, a linha da detecção mostra "sem câmera".
- [ ] **AC-12.4** Given o painel de diagnóstico está na tela When o operador clica em "Baixar registro (60 s)" Then o navegador salva no notebook um arquivo `match-do-saber-diagnostico-<data e hora>.json` com as medições, quadro a quadro, dos últimos 60 s: horário, intervalo do quadro, tempo de detecção, pessoas, modo, tela, os pontos nariz, orelhas, ombros e punhos (x, y, confiança), as medidas das mãos e da cabeça e os gestos reconhecidos.
- [ ] **AC-12.5** Given o modo de diagnóstico está ligado When o jogo roda Then nenhuma medição sai do notebook nem fica guardada no navegador; o arquivo só existe se o operador clicar em "Baixar registro", e nenhuma imagem da câmera entra no registro.
- [ ] **AC-12.6** Given o modo de diagnóstico está ligado When uma partida acontece Then o jogo se comporta exatamente como sem ele: mesmos tempos, gestos, pontos e telas.
- [ ] **AC-12.7** Given a tela de espera When o operador escolhe ☰ › Diagnóstico Then o painel de diagnóstico liga se estava desligado e desliga se estava ligado (o registro em memória é descartado ao desligar); o item mostra "Diagnóstico: ligado" ou "Diagnóstico: desligado". Aberto com `?diagnostico`, o jogo começa com ele ligado e também pode desligá-lo pelo menu. (Adicionado v10.3.0; decidido pelo responsável: até a v10.2.0 o item só ligava, até recarregar.)

### Story 13: Ver minha foto no fim da partida (adicionado v7.0.0)

**As a** jogador
**I want** ver no resumo uma foto minha jogando, no estilo de um card polaroid
**So that** o fim da partida fique mais divertido e dê vontade de jogar de novo

**Acceptance criteria:**

- [ ] **AC-13.1** Given a câmera está ativa e "Foto no resumo" está Ligada When a escolha (ou o tempo esgotado) do card do meio da partida é registrada (o card ⌈M/2⌉, ou seja, o 5º numa partida de 10) Then o jogo guarda na memória um quadro da câmera daquele instante, sem som, aviso ou pausa.
- [ ] **AC-13.2** Given uma foto foi guardada na partida When a tela de resumo aparece Then, junto com os pontos e a mensagem (AC-5.1, AC-5.7), aparece um card no estilo polaroid com a foto, espelhada como a prévia (AC-2.6) e sem o esqueleto, e a faixa "Match do Saber · N de M"; nada do resumo fica cortado ou coberto em 1366×768 nem em 1920×1080 (FR-4). Na v10.0.0 o polaroid fica 20% maior que na v9.0.0 (384 px em 1366×768) e o resumo não mostra a prévia da câmera. Desde a v11.0.0, a foto recebe o filtro da faixa por cima (AC-13.8) e a moldura ganha o selo redondo da faixa, com o título dela ("Aprendiz de checagem", "Detetive em treino", "Faro de repórter" ou "Imune a fake news!"), girado, no canto superior direito.
- [ ] **AC-13.3** Given a câmera estava indisponível ou não autorizada no card do meio, "Foto no resumo" está Desligada, ou a captura falhou When a tela de resumo aparece Then ela fica como sem a foto (AC-5.1): sem polaroid e sem espaço vazio no lugar dele.
- [ ] **AC-13.4** Given há uma foto guardada When o operador inicia uma nova partida pelo resumo (Enter), usa "✕ Sair" ou Esc, a partida termina sem resumo ou o resumo fecha pela volta automática (AC-5.2, v12.0.0) Then a foto é apagada da memória e não aparece em nenhuma partida seguinte.
- [ ] **AC-13.5** Given "Foto no resumo" está Ligada When uma partida acontece, com ou sem `?diagnostico` Then nem a foto nem as âncoras do rosto (AC-13.6) aparecem em nenhuma requisição de rede (URL ou corpo, por `fetch`, XHR, `sendBeacon` ou WebSocket), no armazenamento do navegador (`localStorage`, `sessionStorage`, IndexedDB) nem no registro do diagnóstico. (Ampliado v10.2.0.)
- [ ] **AC-13.6** Given a foto do resumo é tirada (AC-13.1) When a câmera detecta a pessoa naquele quadro Then o jogo guarda com a foto, só na memória, as âncoras do rosto na foto espelhada, em pixels da foto, no quadro de referência dos filtros (olhos em (−50, 0) e (50, 0), 100 unidades = distância entre os olhos): (a) rosto: origem no meio dos olhos (pontos 2 e 5), escala = distância entre os olhos ÷ 100 e giro = ângulo da linha dos olhos; sem os dois olhos com visibilidade ≥ 0,5, a reserva é pelas orelhas (7 e 8, que no quadro ficam em (−105, 15) e (105, 15)); (b) chapéu: pelas orelhas quando as duas são vistas, senão igual ao rosto; (c) capa: pelos ombros (11 e 12, em (−200, 255) e (200, 255)), ou nenhuma; (d) cada olho e a orelha direita (8), ou nenhum. Sem olhos nem orelhas vistos (ou sem pessoa), fica registrado "sem filtro" e a foto aparece só com o selo (AC-13.9). Os filtros que usam essas âncoras estão em AC-13.8 (v11.0.0). (Adicionado v10.2.0; a confirmar pelo responsável.)
- [ ] **AC-13.7** Given há uma foto com âncoras guardada When ela seria apagada (AC-13.4) Then as âncoras são apagadas junto, no mesmo instante, e não aparecem em nenhuma partida seguinte. (Adicionado v10.2.0.)
- [ ] **AC-13.8** Given há uma foto com âncoras (AC-13.6) When a tela de resumo aparece Then o jogo desenha por cima da foto, numa camada SVG, o filtro da faixa de acertos (AC-5.7), com os desenhos de `docs/visual/filtros/` no quadro de referência das âncoras: faixa 1, lupa no olho direito (ponto 5), só quando o rosto veio dos olhos; faixa 2, óculos de detetive pelo rosto e chapéu pelo chapéu; faixa 3, chapéu "CHECADO" pelo chapéu e lápis atrás da orelha direita, só quando a orelha 8 foi vista; faixa 4, máscara pelo rosto e capa com emblema pelos ombros, só quando a capa existe. A camada acompanha o recorte quadrado da foto no polaroid e não sai dele. Nariz e boca ficam livres. Os pixels da foto não mudam, e a camada é apagada junto com a foto (AC-13.4, AC-13.7). (Adicionado v11.0.0; a confirmar.)
- [ ] **AC-13.9** Given há uma foto sem âncoras ("sem filtro", AC-13.6), ou o filtro da faixa não tem as âncoras que pede When a tela de resumo aparece Then a foto aparece sem o desenho que faltou, e o selo da faixa na moldura aparece sempre (AC-13.2). (Adicionado v11.0.0.)

### Story 15: Treinar o gesto antes de valer (adicionado v10.2.0, a confirmar pelo responsável)

**As a** jogador que nunca jogou
**I want** treinar o gesto com alguns cards fáceis antes da partida
**So that** eu entenda para que lado vai cada resposta sem perder pontos

**Acceptance criteria:**

- [ ] **AC-15.1** Given "Tutorial" está Desligado (padrão) When uma partida começa por qualquer caminho (AC-1.2, AC-1.6, AC-1.8, AC-5.6) Then o jogo vai direto ao primeiro card da partida, como antes da v10.2.0.
- [ ] **AC-15.2** Given "Tutorial" está Ligado When a partida começaria (fim da calibração, Enter na calibração, Enter na espera sem câmera ou Enter no resumo sem câmera) Then aparecem antes os cards de treino do arquivo de perfis (`conteudo/tutorial.json`), na ordem dele (2 na v11.0.0; 4 da v10.2.0 à v10.3.1), com a indicação "Treino N de M", sem barra de tempo e sem placar; depois do último começa a partida, sorteada como em AC-6.1 a AC-6.3, com o cronômetro cheio.
- [ ] **AC-15.3** Given um card de treino When o jogador escolhe por gesto, seta ou arraste Then o card sai pelo lado escolhido e aparece, pelo tempo do feedback configurado (padrão 3 s, AC-9.25), um feedback de treino que ensina o gesto: o selo ("Acertou!" ou "Quase!"), qual lado ele escolheu e com que gesto do modo ativo, a resposta certa com o gesto que leva a ela, e a explicação do perfil.
- [ ] **AC-15.4** Given o tutorial When ele termina Then nenhum resultado dele entra no placar, nos "N de M" do resumo, na foto (AC-13.1) nem no sorteio; os perfis nunca aparecem como notícias e não entram em `jogaveis` (AC-7.7).
- [ ] **AC-15.5** Given um card ou feedback de treino When o operador pressiona Enter Then o tutorial é pulado e a partida começa na hora; com Esc ou "✕ Sair", o jogo volta à espera (AC-10.3).
- [ ] **AC-15.6** Given um card de treino When ninguém é detectado, ou o jogador faz o gesto de "saiba mais" Then nada muda: o treino não pausa, não encerra por ausência e não tem "saiba mais".
- [ ] **AC-15.7** Given o arquivo de perfis When ele é carregado Then cada perfil tem `id`, `nome`, `frase`, `veredito`, `explicacao`, `tecnica` e `tema` válidos e o arquivo diz se é rascunho; um perfil pode ter `ilustracao` (opcional, v11.0.0: `perfil-falso-abacaxi` ou `perfil-verdadeiro-caju`, os desenhos "recorte chapado" da prévia v11), e então o card de treino mostra esse desenho numa imagem maior que a do card de notícia; sem ela, a ilustração do `tema`. Um desenho nunca aparece no perfil de outro (o de Seu Caju tem a placa "Banca 14"). Na v11.0.0 o treino tem os 2 perfis da prévia, Abacaxi Perfeito (falso) e Seu Caju (verdadeiro); os 4 perfis do rascunho do agente de notícias ficam no mesmo arquivo, em `perfisReserva`, fora do treino, até a revisão. (Reescrito v11.0.0; a confirmar.)

### Story 16: Ler e revisar as questões disponíveis (adicionado v12.0.0)

**As a** responsável pelo conteúdo e pela depuração do jogo
**I want** um painel dentro do jogo para ler cada questão como ela aparece, com gabarito e fontes, e revisá-la
**So that** eu confira o banco, ache problemas e aprove ou oculte questões sem abrir o CSV

**Acceptance criteria:**

- [ ] **AC-16.1** Given a tela de espera When o operador escolhe ☰ › Questões (ou Ajustes › Revisar questões, AC-9.31) Then abre, em tela cheia, o painel "Questões" no estilo do gerenciador do Prova ou Reprova (lista à esquerda, questão aberta à direita), com a contagem: total no banco, jogáveis, ocultas, rascunhos, inválidas, e verdadeiras/falsas entre as jogáveis.
- [ ] **AC-16.2** Given o painel Questões When o operador escolhe uma questão da lista Then a área da direita mostra a questão como o jogador a vê (imagem ou ilustração, título, descrição; e o "saiba mais"), e abaixo: o gabarito (pílula "Verdade"/"Mentira"), a explicação, a técnica, o tema, a dificuldade, o status, quem revisou, a visibilidade e as fontes: "Fonte:" (verdadeiras) ou "Desmentido por:" (falsas) com `fonte_nome` (ou o domínio) e o link de `fonte_url`, e cada link de `fontes_extras` com o domínio. No app de desktop, os links abrem no navegador do sistema, nunca dentro da janela do jogo.
- [ ] **AC-16.3** Given o painel Questões When o operador usa os filtros (texto, veredito, tema, dificuldade, status, visibilidade, "Só jogáveis", "Só com problemas") Then a lista mostra só as questões que passam em todos, e a contagem indica quantas estão filtradas.
- [ ] **AC-16.4** Given uma questão inválida ou não jogável (AC-7.3, AC-7.7) When ela é aberta no painel Then o painel diz por que ela não entra nas partidas (ex.: "Sem revisor", "fonte_url não é um link", "Oculta", "Rascunho"), em linguagem simples.
- [ ] **AC-16.5** Given o app de desktop e uma questão aberta When o operador usa "Ocultar"/"Mostrar no jogo" (interruptor de visibilidade, AC-7.12), "Aprovar" (pede o nome de quem revisou na primeira vez da sessão e preenche `revisado_por` e `status = aprovada`; só se a questão for válida), "Voltar para rascunho" ou "Editar" (abre o editor de AC-7.2) Then o banco é gravado como em AC-7.6 (com backup) e a lista e as contagens se atualizam. Na versão web, essas ações aparecem desabilitadas com o aviso de AC-7.9 e o painel é só leitura.
- [ ] **AC-16.6** Given o painel Questões aberto When o operador usa ↑/↓ (questão anterior/próxima na lista), Esc ou o "✕" (fecha e volta à tela de espera) Then o painel responde, e a câmera e as teclas do jogo não chegam à partida enquanto ele estiver aberto (FR-14).

## Functional Requirements

### FR-1: Fluxo de estados da partida

O jogo passa por estes estados: espera → calibração → card → (saiba mais) → feedback → … → resumo → espera, além do estado "Volte para o centro" durante a partida. Com o tutorial ligado (FR-16, v10.2.0), entre a calibração (ou o início sem câmera) e o primeiro card vêm card de treino → feedback de treino, uma vez por perfil do tutorial (2 desde a v11.0.0).

**Must:**
- Começar a partida só por ação do operador: Enter ou "▶ Iniciar" na espera (AC-1.6, AC-1.7), ou Enter na calibração (AC-1.8). Com a câmera ativa, a partida só começa depois de 2 s contínuos de calibração, a menos que o operador pule a calibração.
- Ter o tempo por card, o tempo do feedback e a tolerância sem pessoa no quadro configurados em Ajustes (padrões 15 s, 3 s e 10 s, FR-9; até a v11.0.0, fixos 3 s de feedback e 10 s de tolerância).
- Encerrar a partida a qualquer momento pelo botão "✕ Sair" ou por Esc (FR-10).
- Manter o resumo na tela até o operador iniciar uma nova partida (Enter) ou, com a volta automática ligada, até o tempo escolhido (AC-5.2, AC-9.26).
- Pausar o cronômetro do card só durante "Volte para o centro", e só no modo Corpo (AC-5.3, AC-9.21); com o "saiba mais" aberto o cronômetro continua correndo.
- Manter o "saiba mais" aberto até o jogador fechá-lo (gesto ou ↑), fazer uma escolha ou o tempo esgotar; ele não fecha sozinho.

**Must not:**
- Iniciar a calibração ou a partida por causa da câmera: a presença de uma pessoa no quadro nunca tira o jogo da tela de espera.
- Guardar qualquer informação da partida depois de uma nova partida começar ou de o jogo voltar à tela de espera.
- Aceitar uma escolha durante o feedback, o resumo ou a calibração.

### FR-2: Entrada por movimento do corpo (modo Corpo)

Este é o modo padrão (FR-9). Os modos Mão e Cabeça estão em FR-9.

**Must:**
- Reconhecer três gestos: tronco deslocado para a própria direita (match), para a própria esquerda (descarte) e dois punhos acima do nariz (saiba mais), com os tempos de permanência de AC-2.1, AC-2.2 e AC-3.1.
- Usar um único controle: o tronco inteiro (meio dos ombros), medido em relação à calibração; estender um braço não escolhe (AC-2.7 e AC-2.8 removidos na v10.3.0).
- Tomar "direita" e "esquerda" do ponto de vista do jogador, coerentes com a prévia espelhada e com as setas do teclado.
- Medir o deslocamento em relação à posição central registrada na calibração da partida.
- Exigir retorno do tronco à área central entre duas escolhas (AC-2.4).
- Seguir só a pessoa mais central e maior no quadro.
- Mostrar a prévia espelhada com esqueleto. O card acompanha levemente a inclinação do jogador, suavizado e limitado (AC-2.10, v10.1.0); até a v10.0.0 ficava parado.
- Calcular o deslocamento e o giro do card fora do estado do React (no laço de quadros), para não refazer a tela a cada leitura da câmera, com a regra de mapeamento e suavização em lógica pura testável.

**Must not:**
- Gravar ou transmitir imagens ou vídeo da câmera, ou guardá-los em disco ou no navegador. A única imagem da câmera guardada é a foto do resumo (FR-13), só na memória e só até o resumo fechar.
- Registrar duas escolhas para um mesmo card.

### FR-3: Entrada alternativa

**Must:**
- Aceitar, a qualquer momento: → (match), ← (descarte), ↑ (abrir/fechar saiba mais), Enter (iniciar partida, inclusive a partir do resumo), e arrastar o card com mouse ou toque para a direita ou a esquerda.
- Permitir jogar uma partida inteira só com a entrada alternativa, inclusive quando a câmera não está disponível ou não foi autorizada.

### FR-4: Conteúdo do card e do feedback

**Must:**
- Mostrar no card: imagem (se a notícia tiver; senão, a ilustração "recorte chapado" desenhada para aquela notícia, se houver (v11.0.0); senão, a ilustração do `tema` da notícia, feita com as formas do design system do projeto Conectando), título e descrição curta da notícia, e uma indicação de como abrir o "saiba mais". As ilustrações "recorte chapado" da prévia v11 (emas, banana, micro-ondas) ficam ligadas à notícia que ilustram, pelo `id`, e não ao tema inteiro: numa outra notícia do mesmo tema virariam uma pista falsa (regra "ilustração não é prova" da prévia).
- Mostrar o tempo restante só numa barra grande na base da tela, com os segundos dentro (AC-4.6); destacar os últimos 5 s com a barra e o card pulsando na cor de alerta (coral, FR-15) (AC-4.7). (A barra do card saiu na v10.0.0.)
- Chamar os dois lados de "Verdade" e "Mentira" em toda a interface (os valores do banco continuam `verdadeira`/`falsa`).
- Mostrar no "saiba mais" o texto expandido da notícia.
- Mostrar no feedback, para todo resultado: o fundo na cor do resultado (verde = acertou; vermelho = errou ou tempo esgotado), o texto do resultado ("Acertou!", "Errou", "Tempo esgotado") no centro com o carimbo do veredito (VERDADE com a estrela, MENTIRA com o triângulo) carimbado por cima (AC-4.9), a explicação e a técnica de checagem. Sem "match" no feedback (v12.0.0).
- Mostrar todos os textos em português do Brasil.
- Centralizar o card na vertical da área de jogo (a tela menos a barra de tempo), parado ou saindo (AC-4.5).

**Must not:**
- Cortar título ou descrição do card: todo o texto cadastrado aparece por inteiro numa tela de 1366×768 ou maior.

### FR-5: Pontuação e sorteio

**Must:**
- Somar +1 por acerto e 0 por erro ou tempo esgotado.
- Escolher a mensagem do resumo pela proporção de acertos N/M (AC-5.7): < 0,5, de 0,5 a < 0,8, de 0,8 a < 1, e 1. Assim uma partida com menos de 10 cards usa as mesmas faixas, e "Imune a fake news!" só aparece com todos certos. As mesmas faixas, numeradas de 1 a 4, escolhem o filtro e o selo da foto (AC-13.2, AC-13.8) e a vinheta de fim de partida (AC-11.6), numa única regra em lógica pura (v11.0.0).
- Sortear os cards conforme AC-6.1 a AC-6.4, sem repetição dentro da partida, com o número de notícias, os temas e a dificuldade dos Ajustes (AC-9.23, AC-9.27), numa única função de lógica pura.

### FR-6: Formato do banco de notícias (reescrito v9.0.0)

Um arquivo CSV, uma linha por notícia, com cabeçalho e as colunas: `id`, `titulo`, `descricao`, `saiba_mais`, `veredito`, `explicacao`, `tecnica`, `tema`, `fonte_url`, `fontes_extras` (links separados por espaço, opcional), `imagem` (opcional), `revisado_por`, `status`, `dificuldade` (opcional: `facil`, `medio`, `dificil` ou vazia; v10.1.0), `titulo_curto` (opcional, até 34 caracteres; v11.0.0), `fonte_nome` (opcional: nome do veículo de `fonte_url`, a fonte nas verdadeiras e quem desmentiu nas falsas; v11.0.0) e `visivel` (opcional: `sim`, `nao` ou vazia = sim; v12.0.0, AC-7.12).

**Must:**
- Aceitar separador vírgula ou ponto e vírgula e codificação UTF-8 (com ou sem BOM), para abrir e salvar no Excel.
- Restringir `veredito`, `tecnica`, `tema` e `status` às listas de AC-7.2, e `dificuldade`, quando preenchida, a `facil`/`medio`/`dificil`.
- Ler um CSV sem a coluna `dificuldade` (arquivos de antes da v10.1.0) como se ela estivesse vazia (AC-7.10), sem `titulo_curto` e `fonte_nome` (antes da v11.0.0) do mesmo jeito (AC-7.11), e sem `visivel` (antes da v12.0.0) como visível (AC-7.12).
- Exportar sempre com cabeçalho, UTF-8 com BOM e ponto e vírgula.

### FR-7: Gerenciador de notícias (reescrito v9.0.0)

**Must:**
- Oferecer o painel "Notícias" pelo menu ☰ (FR-14), só na tela de espera, com as ações de AC-7.1 a AC-7.8.
- Validar cada notícia (AC-7.3) ao salvar, importar e carregar o banco; uma notícia inválida nunca entra numa partida.
- Sortear para as partidas só notícias `aprovada` com `fonte_url` e `revisado_por` e não ocultas (`visivel` diferente de `nao`) (AC-7.7, AC-7.12).
- No app de desktop, gravar o banco em `Documentos/Match do Saber/noticias.csv` e, antes de cada gravação, copiar o arquivo anterior para `Documentos/Match do Saber/backups/` com data e hora no nome.
- Gerar `id` novo no formato `mds-NNNN`, sem repetir os existentes.

**Must not:**
- Gravar o banco durante uma partida.
- Exigir que a pessoa edite código ou arquivos do jogo (editar o CSV no Excel é opcional).
- Enviar o banco pela rede.

### FR-8: App de desktop e funcionamento offline (reescrito v9.0.0)

**Must:**
- Ser distribuído como app de desktop para Windows (Electron), que abre o jogo em janela própria, funciona sem internet e libera a câmera depois da permissão.
- Servir o jogo e o modelo de detecção a partir dos arquivos do próprio app, sem depender de rede.
- Criar o banco local a partir do banco embutido na primeira abertura (AC-8.3) e lê-lo nas seguintes.
- Manter a versão web (navegador) funcionando com o banco embutido (AC-8.5, AC-7.9).

### FR-9: Ajustes do estande (reescrito v2.0.0 e v12.0.0; até a v11.0.0, "Configurações")

**Must:**
- Oferecer, na tela de espera, o painel "Ajustes" (tecla M ou ☰ › Ajustes, FR-14), aberto como painel lateral à direita (AC-9.18, com o título "Ajustes" e rolagem própria quando os itens não cabem na altura), com os itens agrupados (AC-9.1):
  - Partida: "Notícias por partida" 5, 8, 10 (padrão), 12, 15 ou 20; "Tempo por card" 10, 15 (padrão), 20, 25, 30, 45 ou 60 s; "Tempo do feedback" 3 (padrão), 5, 8, 10 ou 15 s; "Volta automática do resumo" Desligada (padrão), 30, 60 ou 120 s.
  - Conteúdo: "Temas" (todos ligados por padrão; pelo menos um ligado); "Dificuldade" Misturada (padrão), Só fácil, Só médio, Só difícil ou Crescente (AC-9.27).
  - Detecção: "Modo de jogo" Corpo (padrão, FR-2), Mão ou Cabeça; "Sensibilidade do gesto" Menor, Normal (padrão) ou Maior; "Tolerância sem pessoa" 5, 10 (padrão) ou 20 s (AC-9.28).
  - Mídia: "Som" Ligado (padrão) ou Desligado; "Volume" Baixo, Médio ou Alto (padrão); "Foto no resumo" Ligada (padrão) ou Desligada (FR-13); "QR das fontes" Ligado (padrão) ou Desligado (AC-9.29); "Tutorial" Desligado (padrão) ou Ligado (FR-16).
  - Questões: "Revisar questões" (AC-9.31) e a contagem de jogáveis e ocultas.
  - "Restaurar padrão", com confirmação (AC-9.30).
- Navegar no menu com ↑/↓ (item) e ←/→ (valor), ou com clique; fechar com Esc, M, Enter ou o "✕" do painel ("Fechar"), sem iniciar partida.
- Mostrar na tela de espera o resumo de AC-9.2.
- Aplicar o tempo por card a todos os cards da partida (AC-1.2, AC-4.4, AC-9.17).
- Guardar os ajustes no próprio notebook (armazenamento local do jogo) e reaplicá-los ao reabrir o jogo, inclusive offline; valor ausente ou inválido usa o padrão daquele item; as cinco configurações já guardadas até a v11.0.0 continuam valendo depois da atualização.
- Manter os valores e a lógica dos ajustes (opções, padrões, leitura e gravação, filtros do sorteio, multiplicador de sensibilidade) em `src/core/`, testáveis sem React.
- Modo Mão: um único controle, o swipe da mão ativa (punho acima do cotovelo): o card segue a posição horizontal do punho e a escolha acontece quando ele passa de 1 largura de ombro do meio do corpo, a calibrar no hardware (AC-9.20); as duas mãos acima dos ombros (~500 ms) = saiba mais; entre duas escolhas, a mão volta à frente do peito ou baixa (AC-9.22). Medir as distâncias em larguras de ombro, para valer perto ou longe da câmera. (Reescrito v10.3.0.)
- Nos modos Mão e Cabeça, ignorar a ausência da pessoa durante o card (AC-9.21); a calibração continua exigindo a pessoa no centro.
- Modo Cabeça: inclinar a cabeça para o próprio lado direito (~15°, medido em relação à calibração, ~300 ms) = match; para o esquerdo = descarte; levantar o queixo (~500 ms) = saiba mais; exigir voltar a cabeça ao centro entre duas escolhas; o card só acompanha levemente a inclinação até a escolha (AC-2.3, AC-2.10, AC-9.13).
- Nos modos Mão e Cabeça, detectar presença e centralização pela parte de cima do corpo (ombros e rosto), para que um jogador sentado consiga calibrar.
- Mostrar nas instruções da calibração e do card os gestos do modo ativo (AC-9.14).
- Manter, em todos os modos, a entrada alternativa (FR-3), os demais tempos (FR-1), a pontuação e o sorteio (FR-5) e a seleção da pessoa mais central e maior no quadro (FR-2).
- Ignorar a câmera (presença e gestos) enquanto o menu estiver aberto.

**Must not:**
- Mudar qualquer configuração durante uma partida.
- Guardar no notebook qualquer coisa além dos ajustes de FR-9 e do banco de notícias com seus backups (FR-7).
- Pedir senha ou PIN para abrir os Ajustes (decisão do responsável, v12.0.0).
- Usar outra fonte de imagem além da câmera já autorizada, nem enviar imagens para fora do notebook.

### FR-10: Iniciar e sair (adicionado v2.0.0)

**Must:**
- Mostrar na tela de espera o botão "▶ Iniciar", com o mesmo efeito de Enter na espera (AC-1.6, AC-1.7), desativado quando não há notícias.
- Mostrar durante a calibração, o card, o feedback e o resumo o botão "✕ Sair" (nome acessível "Sair da partida"), num canto da tela, sem cobrir o card.
- Encerrar a partida na hora com "✕ Sair" ou Esc, sem resumo, e voltar à tela de espera.

**Must not:**
- Guardar qualquer informação da partida encerrada.
- Pedir confirmação para sair.

### FR-11: Sons (adicionado v2.0.0, reescrito v11.0.0)

**Must:**
- Tocar um som curto de "deslizar" quando uma escolha é registrada, por qualquer entrada.
- Tocar um som positivo quando o feedback "Acertou!" aparece, e um som de erro, diferente, quando aparece "Errou" ou "Tempo esgotado".
- Tocar uma vez a vinheta de fim de partida, conforme a faixa de acertos, quando o resumo aparece (AC-11.6, v11.0.0).
- Decidir que som toca em cada transição de estado em lógica pura testável (`src/core/sons.ts`).
- Gerar os sons no próprio jogo, sem baixar arquivos nem depender de rede.
- Respeitar a configuração "Som: Desligado" (FR-9).

**Must not:**
- Tocar sons fora desses quatro momentos (sem música de fundo e sem tique nos últimos 5 s).
- Atrasar a troca de tela por causa de um som.


### FR-12: Modo de diagnóstico (adicionado v5.2.0)

**Must:**
- Ligar o modo quando o endereço tiver `?diagnostico` ou pelo menu ☰ › Diagnóstico, que também o desliga (AC-12.1, AC-12.7).
- Mostrar o painel com as medidas de AC-12.3, atualizado ao menos 2 vezes por segundo, sem cobrir o card.
- Guardar em memória só os últimos 60 s de medições e oferecer "Baixar registro (60 s)" em JSON (AC-12.4).
- Calcular as medidas das mãos e da cabeça com as mesmas regras que o jogo usa para reconhecer os gestos.

**Must not:**
- Enviar medições pela rede, gravá-las no navegador ou incluir imagens da câmera.
- Mudar o comportamento do jogo (AC-12.6).

### FR-13: Foto polaroid no resumo (adicionado v7.0.0, reescrito v11.0.0)

**Must:**
- Com a câmera ativa e "Foto no resumo" Ligada, guardar na memória um quadro da câmera no instante em que a escolha (ou o tempo esgotado) do card ⌈M/2⌉ é registrada (AC-13.1).
- Mostrar no resumo um card polaroid com a foto espelhada, sem esqueleto, e a faixa "Match do Saber · N de M", ao lado dos pontos e da mensagem, sem cortar nada em 1366×768 (AC-13.2).
- Mostrar o resumo sem polaroid quando não houver foto (AC-13.3).
- Apagar a foto ao iniciar nova partida, ao sair (Sair ou Esc), em qualquer fim de partida sem resumo e quando o resumo fecha pela volta automática (AC-13.4, AC-5.2).
- Calcular, com os pontos da pose do mesmo instante da foto, as âncoras do rosto de AC-13.6, em lógica pura testável, e guardá-las no mesmo objeto da foto, que é apagado inteiro (AC-13.7). (v10.2.0)
- Desenhar por cima da foto, numa camada SVG separada, o filtro da faixa de acertos, posicionado pelas âncoras (AC-13.8), e o selo da faixa na moldura (AC-13.2); decidir quais partes do filtro entram e onde, em lógica pura testável; mostrar só o selo quando faltam as âncoras (AC-13.9). (v11.0.0)

**Must not:**
- Salvar a foto ou as âncoras em disco ou no navegador, enviá-las pela rede ou incluí-las no registro do diagnóstico (AC-13.5).
- Alterar os pixels da foto para desenhar o filtro, ou juntar foto e filtro numa imagem nova. (v11.0.0)
- Oferecer download, impressão, envio ou QR code da foto (o QR do resumo leva só os ids das notícias, AC-5.9).
- Atrasar ou pausar a partida para tirar a foto.

### FR-14: Menu ☰ do operador (adicionado v9.0.0)

**Must:**
- Mostrar na tela de espera um botão ☰ discreto num canto (nome acessível "Menu"), que abre uma lista com: "Questões" (FR-17, v12.0.0), "Notícias" (FR-7), "Ajustes" (FR-9; até a v11.0.0, "Configurações"), "Diagnóstico" (liga e desliga o painel de FR-12, AC-12.7) e "Tela cheia".
- Fechar o menu com Esc, com um clique fora dele ou ao escolher um item.
- Ignorar a câmera (presença e gestos) enquanto o menu ou um painel aberto por ele estiver aberto.

**Must not:**
- Mostrar o ☰ durante calibração, card, feedback ou resumo.
- Pedir senha.

### FR-15: Identidade visual Conectando (adicionado v10.0.0, reescrito v11.0.0)

Referências: `docs/visual/previa.html` (revisão 3, aprovada na v10.0.0) e `docs/visual/previa-v11.html` (seções 1, 2, 3 e 5, aplicadas na v11.0.0 por ordem do responsável, com as recomendações do Agente Visual; detalhes a confirmar), derivadas do "Conectando Design System #NEW".

**Must:**
- Usar só a fonte Poppins, servida pelo próprio jogo (funciona offline), e as cores dos tokens do design system: tema Claro (azul e amarelo) na espera e no resumo; tema Sóbrio (fundo noite) no card e no feedback.
- Marcar "Verdade" com menta e estrela, e "Mentira" com coral e triângulo; o coral também é a cor de alerta dos últimos 5 s; o botão "Iniciar" é amarelo.
- No feedback (v12.0.0), o fundo usa uma cor de acerto (verde) e uma de erro (vermelho), lidas sem ambiguidade como verde e vermelho por quem está a 2 m; se a menta e o coral dos tokens não forem lidos assim, o Agente Visual propõe dois tokens novos (`--cn-acerto`, `--cn-erro`) derivados do design system. O carimbo do veredito (AC-4.9) mantém menta/estrela e coral/triângulo e precisa ficar legível sobre os dois fundos.
- Mostrar, no card sem imagem, a ilustração da notícia ou do tema (FR-4): as imagens desenhadas pelo projeto seguem o estilo "recorte chapado" da prévia v11 (cor chapada, fundo na cor do tema, uma forma do design system cortada na borda, personagem de formas simples com contorno noite, sombra chapada, acentos só com os marcadores, sem pessoas reais, sem texto nas imagens de card, ilustração nunca imita prova); notícias com foto real continuam permitidas.
- Decorar a tela de espera só com os anéis do design system, posicionados de modo que os cortes de cada desenho fiquem nas bordas da tela.
- Manter o foco na notícia e no gesto, usando a linguagem de app de namoro só onde ela ajuda a ler o gesto e o resultado (v11.0.0; até a v10.3.1 não havia nenhuma forma decorativa no card, no feedback e no resumo): no card, a pilha de cards atrás (AC-2.12), os botões redondos que acendem com a fração do gesto (AC-2.11) e o carimbo (AC-2.10b); no feedback, só o carimbo do veredito (AC-4.9; os ícones de acerto, erro e tempo esgotado saíram na v12.0.0); no resumo, a folha amarela atrás do polaroid, o filtro e o selo da faixa (AC-13.2, AC-13.8) e os marcadores de acerto e erro da lista (AC-5.8). Nenhuma outra forma decorativa entra no card, no feedback e no resumo.
- Manter o card e o texto da notícia nos tamanhos da v10.0.0 (o card cabe em 1366×768 com o texto máximo, FR-4); as camadas da pilha, o carimbo e os botões não empurram o card nem mudam a centralização (AC-4.5).
- Desligar com `prefers-reduced-motion` as transições e animações decorativas (a entrada do carimbo; os ícones do feedback saíram na v12.0.0); o movimento do card comandado pelo jogador continua (AC-2.10f).

**Must not:**
- Usar emoji ou caracteres unicode como ícone (✓, ✗, ▶, 🙌): viram formas do design system.
- Usar as ondas com mãos como divisor.
- Distorcer ou cortar SVG fora das bordas da tela.

### FR-16: Modo tutorial (adicionado v10.2.0, a confirmar pelo responsável)

**Must:**
- Oferecer "Tutorial" nas Configurações (FR-9), desligado por padrão. Ligado, toda partida começa pelos cards de treino do arquivo (AC-15.2; 2 na v11.0.0); quando e para quem ele entra (sempre, só na primeira partida, escolha do operador) é decisão do responsável.
- Ler os perfis de treino de um arquivo de dados próprio (`conteudo/tutorial.json`), separado do banco de notícias, validado ao carregar (AC-15.7).
- Tratar o treino como telas do fluxo da partida (FR-1): card de treino → feedback de treino → … → primeiro card da partida, com o tempo do feedback configurado (AC-9.25) mais a saída do card e o carimbo, como em AC-4.1 e AC-4.10.
- Ensinar o gesto no feedback de treino, com o texto do modo ativo (AC-15.3).

**Must not:**
- Contar o treino no placar, no resumo, na foto ou no sorteio (AC-15.4).
- Usar cronômetro, pausa por ausência ou "saiba mais" no treino (AC-15.6).

### FR-17: Painel Questões (adicionado v12.0.0)

Referência de estilo: gerenciador de questões do Prova ou Reprova (https://github.com/ProjetoConectandoUFC/prova-ou-reprova, branch `develop`, `dist/editor-questoes.js` e `dist/menu-apresentador.js`), com a identidade do Conectando (FR-15).

**Must:**
- Abrir pelo ☰ (FR-14) ou por Ajustes › Revisar questões, só na tela de espera, em tela cheia, com as funções de AC-16.1 a AC-16.6.
- Ler do mesmo banco das partidas (`RepositorioNoticias`) e usar a mesma validação e a mesma regra de jogável (`jogaveis`), para que o painel nunca diga que uma questão entra no jogo quando ela não entra.
- Mostrar todas as fontes de cada questão com o link inteiro acessível (copiar ou abrir fora do jogo).
- Gravar só pelo mesmo caminho do gerenciador (FR-7), com backup.

**Must not:**
- Aparecer durante calibração, partida, feedback ou resumo.
- Abrir sites dentro da janela do jogo.
- Mudar o conteúdo da questão sem passar pelo editor (AC-7.2) e sua validação (AC-7.3).

## Non-Functional Requirements

### Performance

- O gesto é confirmado em até 1 s depois de o jogador atingir a posição (já contando o tempo de permanência), num notebook comum com webcam de 720p, em qualquer modo de jogo.
- A prévia da câmera e a barra de tempo atualizam a pelo menos 15 quadros por segundo nesse notebook.
- Com o conteúdo já em cache, o jogo vai do clique no ícone à tela de espera em até 5 s.
- A transição de um card para o próximo (depois do feedback) leva menos de 300 ms, sem imagem carregando visivelmente.

### Security

- Nenhuma requisição de rede contém imagem ou vídeo da câmera ou dados do jogador, o que é verificável pelo registro de rede do navegador durante uma partida.
- A foto do resumo (FR-13) existe só na memória da página, enquanto o resumo daquela partida não fecha.
- O jogo não usa cookies, rastreadores nem scripts de análise de terceiros.
- A página só abre conexões com a própria origem (`connect-src 'self'` em `index.html`, v10.2.0). Motivo: a biblioteca MediaPipe Tasks envia sozinha, a cada 60 s, métricas de uso (versão, tipo de tarefa e tempos; sem imagem) para `https://odml.pa.googleapis.com/v1/log`, e não há opção para desligar; a política bloqueia esse envio na web e no app de desktop.
- O jogo e o app de desktop não contêm nenhuma credencial.
- O QR do resumo (AC-5.9) é gerado no próprio jogo, sem rede, e leva só os ids das notícias, depois do `#` (que não chega ao servidor); a página das fontes (AC-5.10) só lê o banco embutido da própria origem e abre os links das fontes em outra aba, sem repassar a origem (`noopener noreferrer`). (v11.0.0)
- A câmera só é ativada depois de o navegador pedir e o operador autorizar.

### Reliability

- Uma queda de internet durante a partida não interrompe nem altera a partida.
- Se a câmera ficar indisponível durante a partida, o jogo mostra o aviso "Câmera indisponível — use as setas" e continua aceitando a entrada alternativa.
- O jogo roda 8 h seguidas de evento, com partidas consecutivas, sem precisar ser reaberto.

## Error Scenarios

| Scenario | Expected Behavior |
|----------|-------------------|
| Operador nega a permissão da câmera | A tela de espera mostra "Câmera desativada — jogue pelas setas (Enter para começar)"; o jogo funciona só com a entrada alternativa. |
| Nenhuma webcam no notebook | Mesmo comportamento da permissão negada. |
| Câmera desconectada no meio da partida | Aviso "Câmera indisponível — use as setas"; a partida continua e o cronômetro não pausa. |
| Jogador sai do quadro durante a partida | No modo Corpo: pausa com "Volte para o centro"; retoma se ele voltar dentro da tolerância sem pessoa (padrão 10 s, AC-9.28); senão encerra sem resumo e volta à espera (AC-5.3 a AC-5.5). Nos modos Mão e Cabeça: o tempo continua e nada aparece (AC-9.21). |
| Iluminação ruim impede a detecção | A calibração não conclui e a mensagem "Fique no centro" continua; o operador pressiona Enter para pular a calibração e joga pelas setas (AC-1.8). |
| Jogador sai do quadro, partida termina ou operador usa Sair, e alguém continua no quadro | O jogo fica na tela de espera até o operador iniciar de novo (AC-1.1, AC-10.3). |
| Várias pessoas no quadro | Só a pessoa mais central e maior controla (AC-1.5). |
| Nenhuma notícia publicada | Tela de espera com "Nenhuma notícia publicada"; não inicia partida (AC-6.4). |
| Linha do banco incompleta, com `id` duplicado ou valor fora das listas | A linha não entra em partidas e aparece no painel Notícias com o motivo (AC-7.3, AC-8.4). |
| Arquivo do banco ausente, ilegível ou vazio no app de desktop | O app recria o arquivo a partir do banco embutido, guardando o arquivo ilegível na pasta de backups. |
| Falha ao gravar o banco (disco cheio, arquivo aberto no Excel) | O painel mostra "Não foi possível salvar: <motivo>" e o banco anterior continua valendo. |
| Versão web aberta offline antes de qualquer abertura online | Tela "Conecte à internet uma vez para baixar o jogo". |
| Configuração guardada ausente, inválida ou armazenamento do navegador indisponível | O jogo abre com o padrão daquele item (AC-9.4); o menu continua funcionando, e a escolha vale até o jogo ser fechado. |
| Navegador bloqueia o som até a primeira interação com a página | O jogo funciona normalmente, sem som, até o primeiro clique ou tecla; a partir daí os sons tocam (o operador clica uma vez ao abrir o jogo). |
| Câmera indisponível no card do meio, ou a captura da foto falha | O resumo aparece sem polaroid (AC-13.3); a partida não é afetada. |
| No modo Mão ou Cabeça, o jogador não consegue fazer o gesto | O operador troca o modo entre partidas, ou joga pelas setas (FR-3). |

## Open Questions

Nenhuma pendente. Decisões que o PRD não fixava, confirmadas pela responsável pelo projeto em 2026-10-26:
- (Substituída na v5.0.0) O "saiba mais" fechava sozinho após 5 s sem gesto nem tecla; deixou de existir.
- O resumo fica na tela até o operador iniciar uma nova partida com Enter (AC-5.2, AC-5.6).
- A partida pode começar por Enter, sem câmera (AC-1.6).
- A tela de referência é 1366×768 (FR-4).
- Linhas com `id` duplicado são descartadas (FR-7).
- A meta de 8 h de operação contínua (Reliability).

Decisões da v1.1.0, confirmadas pela responsável pelo projeto em 2026-10-27:
- Mão e Cabeça são dois modos separados, além de Corpo (padrão).
- Modo Mão: mão direita = match, esquerda = descarte, as duas = saiba mais.
- Modo Cabeça: inclinar para direita/esquerda; levantar o queixo = saiba mais.
- O operador escolhe o modo, e a escolha vale até ser trocada.
- Os limiares (~15° de inclinação, "acima do ombro") e os tempos de permanência são pontos de partida, ajustados no teste com pessoas reais (Fase 7).

Decisões da v2.0.0, confirmadas pela responsável pelo projeto em 2026-10-27:
- O menu passa a se chamar "Configurações" e reúne modo de jogo, tempo por card (10–30 s, de 5 em 5, padrão 15 s) e som (ligado/desligado, padrão ligado).
- "▶ Iniciar" faz o mesmo que Enter; "✕ Sair" (ou Esc) encerra a partida na hora, sem confirmação e sem resumo.
- Sons: deslizar na escolha; positivo no acerto; erro no erro e no tempo esgotado.
- O card fica centralizado na vertical.

Decisões da v3.0.0, confirmadas pela responsável pelo projeto em 2026-10-27:
- A câmera nunca inicia a partida: só "▶ Iniciar" ou Enter (AC-1.1).
- Com câmera ativa, Iniciar/Enter leva à calibração de 2 s e depois à partida (AC-1.7); sem câmera, começa direto (AC-1.6).
- Enter na calibração pula a calibração e joga pelas setas (AC-1.8): mantém o caminho para iluminação ruim.
- Depois de Sair, do fim por ausência de 10 s ou da calibração sem ninguém, o jogo fica na espera.

Decisões da v4.0.0, confirmadas pela responsável pelo projeto em 2026-10-27:
- O card fica parado até a escolha: não inclina com o corpo nem com a cabeça. O rastreio da câmera e os gestos não mudam.
- O cronômetro vira uma barra grossa na base da tela, com os segundos dentro; o número em cima do card sai.
- Nos últimos 5 s: barra vermelha e card com borda e brilho vermelhos pulsando (~1 vez/s, crescendo levemente); pausado, não pulsa.

Decisões da v5.0.0, confirmadas pela responsável pelo projeto em 2026-10-28:
- O tempo do card continua correndo com o "saiba mais" aberto: ler mais informação custa tempo.
- O "saiba mais" não fecha mais sozinho: fecha por gesto, ↑, escolha ou tempo esgotado.
- Só "Volte para o centro" pausa o cronômetro.

Decisões da v5.1.0, confirmadas pela responsável pelo projeto em 2026-10-28:
- O botão das configurações fica no canto superior direito da tela de espera, só com o ícone "⚙".
- O menu abre como painel lateral à direita, com a altura da tela; o resto da tela fica escurecido atrás.

Decisões da v5.2.0, confirmadas em 2026-10-28 (a responsável pediu para preparar o diagnóstico e deixou a variante a critério da equipe):
- O diagnóstico inclui o painel na tela e o botão "Baixar registro (60 s)", porque um arquivo com dados do notebook real é o que permite ajustar os limites dos gestos sem tentativa.
- Ele só liga com `?diagnostico` no endereço; o operador do evento usa o endereço normal.

Decisões da v6.0.0, confirmadas pela responsável pelo projeto em 2026-10-29:
- No modo Mão valem três gestos para escolher o lado: levantar a mão, as duas mãos para um lado e arrastar do centro para o lado.
- Regras de partida: punhos abaixo do ombro e além da linha do ombro (> 0,5 largura de ombro do meio do corpo) por ~300 ms; arraste a partir de < 0,5 largura de ombro do meio, andando ≥ 1 largura de ombro em até ~0,8 s. Ajustáveis com o registro do diagnóstico.
- Nos modos Mão e Cabeça a partida nunca pausa nem termina por ausência; no modo Corpo continua como antes.

Decisões da v6.1.0, confirmadas pela responsável pelo projeto em 2026-10-29:
- A dica do modo Mão agrupa os gestos por resultado: "É verdade: mão direita para cima, as duas mãos para a direita ou arraste para a direita · É falsa: o mesmo para a esquerda · Duas mãos para cima: saiba mais".
- A dica continua nos mesmos lugares (calibração, ao lado do card e no menu Configurações) e não pode cobrir o card nem o painel de diagnóstico.

Decisões da v7.0.0, confirmadas pela responsável pelo projeto em 2026-10-29:
- O resumo ganha um card polaroid com uma foto da câmera tirada no meio da partida (card ⌈M/2⌉), com a faixa "Match do Saber · N de M".
- A foto fica só na tela: guardada na memória e apagada quando o resumo fecha; nada é salvo, baixado ou enviado. Por isso o Princípio 3 (privacidade por padrão) não precisa de emenda: nenhum dado de jogador é coletado.
- O operador pode desligar a foto no menu Configurações ("Foto no resumo", ligada por padrão), por exemplo quando uma escola ou um responsável pedir.

Decisões da v7.1.0, confirmadas pela responsável pelo projeto em 2026-11-03:
- O resumo ganha uma mensagem por faixa de acertos, abaixo do "N de M": 0–4 "Cuidado! Você precisa verificar melhor as manchetes."; 5–7 "Você consegue se proteger, mas ainda pode melhorar."; 8–9 "Parabéns! Você checa muito bem as notícias."; 10 "Imune a fake news!". Os textos evitam marcar gênero.
- Em partidas com menos de 10 cards, a faixa sai da proporção de acertos (por exemplo, 3 de 6 vale como 5 de 10).

Decisões da v8.0.0, confirmadas pela responsável pelo projeto em 2026-11-03:
- O resumo não mostra mais "Técnicas que você praticou" nem a lista, com ou sem foto. O resumo fica: "Fim de jogo!", "N de M", a mensagem da faixa, o polaroid (se houver) e a dica do operador.
- O Princípio 2 (ensinar o método) continua atendido: a técnica de checagem aparece no feedback de cada card (AC-4.1 a AC-4.3).

Decisões da v8.1.0, confirmadas pela responsável pelo projeto em 2026-11-03:
- No modo Corpo, estender um braço para o lado também escolhe, além de deslocar o tronco. O limite é 1,2 largura de ombro do punho ao meio do corpo, com ~300 ms de permanência. A liberação entre escolhas pede os dois punhos a menos de 0,9 largura de ombro.
- Os limites saíram de uma estimativa a olho nos quadros do vídeo de teste da responsável (braços soltos ~0,8; braço estendido de 1,7 a 2,6 larguras de ombro) e podem ser ajustados com a linha "mãos (L)" do diagnóstico (FR-12).
- O deslocamento do tronco, o "saiba mais", os modos Mão e Cabeça, o cronômetro e a pausa por ausência não mudam.

Decisões da v8.2.0, confirmadas pela responsável pelo projeto em 2026-11-06:
- O card ganha uma barra de tempo na parte de baixo, com os segundos, para o tempo ficar perto de onde o jogador olha. A barra grande da base da tela continua.
- As duas barras mostram o mesmo cronômetro: mesma proporção, mesmos segundos, vermelhas juntas nos últimos 5 s e paradas juntas em "Volte para o centro".

Decisões da v9.0.0, confirmadas pelo responsável pelo projeto em 2026-11-09:
- A Planilha Google deixa de ser o caminho do conteúdo: o banco é gerenciado dentro do jogo, no modelo do Prova ou Reprova (branch `develop`), irmão do Match do Saber no projeto Conectando.
- O jogo vira app de desktop (Electron), como o Prova ou Reprova, com o banco num CSV em `Documentos/Match do Saber/`. A versão web continua, com o banco embutido.
- Sem senha no menu ☰.
- O Princípio 1 é garantido no próprio gerenciador: só `aprovada` com fonte e revisor entra na partida. Notícias pesquisadas por agente chegam como `rascunho` e viram `aprovada` quando o responsável aprova.
- Por ora as notícias não têm imagem; o card mostra a ilustração do tema.

Decisões da v10.0.0, confirmadas pelo responsável pelo projeto em 2026-11-09 (prévia visual, 3 revisões):
- Interface enxuta, com atenção máxima à mecânica e à notícia.
- "Verdade" e "Mentira" no lugar de verdadeira/falsa na interface.
- O tempo aparece só na barra da base da tela.
- Feedback: veredito primeiro e menor, selo depois e maior (menor que na v9), fundo na cor do veredito, sem ícones no selo.
- Resumo sem a prévia da câmera e com polaroid 20% maior.
- A prévia da câmera é uma camada sobreposta e não conta na centralização.
- "Iniciar" amarelo; alerta dos 5 s em coral; rosa e turquesa mantidos nos temas Saúde e Meio ambiente.

Decisões da v10.1.0, pedidas nos cartões do Trello "Match: mecânicas e movimento do card" e "Conteúdo do Match" (2026-11-10), a confirmar pelo responsável na revisão do PR:
- O card volta a acompanhar o corpo, mas pouco (40 px e 6° no máximo), suavizado e com zona morta, para não repetir o tremor que levou à decisão da v4.0.0. Os números são pontos de partida, ajustáveis no notebook do estande.
- No modo Mão o card não se move: esse modo não produz uma medida contínua de inclinação (só gestos).
- A coluna `dificuldade` entra só como dado (gerenciador e CSV). Usá-la no sorteio fica para outra versão.

Decisões da v10.2.0, pedidas nos cartões "Tela final: posicionar o filtro no rosto e congelar a imagem", "Garantir que a imagem não seja salva nem enviada" e "Modo tutorial" (2026-11-10), todas a confirmar pelo responsável:
- As âncoras seguem a tabela da prévia `docs/visual/previa-v11.html` (ainda não aprovada); só a parte mecânica entra agora, sem desenhar filtros. A reserva pelas orelhas usa as posições do quadro de referência (orelhas a 2,1 vezes a distância entre os olhos), um ponto de partida a conferir com fotos reais.
- O tutorial fica desligado por padrão e usa os 4 perfis do rascunho do agente de notícias, marcados como rascunho até a revisão; sem imagens finais (ilustração do tema).
- No treino não há cronômetro, pausa por ausência nem "saiba mais"; Enter pula o treino.

Decisões da v10.3.0, tomadas pelo responsável (Levi) em 2026-11-10, depois de testar o app:
- O card é o feedback contínuo do gesto e segue o controle em tempo real, como no Reigns; ao passar do limiar, a escolha acontece com o card saindo para aquele lado.
- Um único controle por modo: tronco (Corpo), inclinação da cabeça (Cabeça) e swipe da mão (Mão). Saem o braço para o lado (Corpo) e a mão levantada e as duas mãos para o lado (Mão). O "saiba mais" de cada modo continua.
- O diagnóstico liga e desliga pelo menu.
- Escolhas da implementação, a conferir no teste: limiares do tronco e da cabeça e os ~300 ms de permanência mantidos (sem gravações do estande); swipe com limite de 1 largura de ombro, sem tempo máximo e sem permanência; mão ativa = punho acima do cotovelo; 38% e 14° no limiar, zona morta de 3% e 100 ms de suavização; com `prefers-reduced-motion`, só os rótulos.

Decisões da v11.0.0 (2026-11-10): **aplicado por ordem do responsável (Levi); detalhes a confirmar.** O responsável mandou aplicar a prévia v11 sem responder às 10 perguntas uma a uma; valem as recomendações do Agente Visual:
- Tela final, opção B: lista + um QR único; a página das fontes fica na versão web (GitHub Pages), lê o banco embutido e mostra só os ids pedidos. No desktop, notícias editadas só no banco local não aparecem na página: limite aceito. O QR é gerado com `qrcode-generator` 1.4.4 (MIT, sem dependências), com correção de erro M; os ids vão depois do `#`, e um `mds-NNNN` vira só o número, para o QR ficar menor. O endereço público padrão é `https://projetoconectandoufc.github.io/match-do-saber-v2/` (troca com `VITE_URL_PUBLICA` no build); a confirmar.
- Colunas novas `titulo_curto` e `fonte_nome`, opcionais; o banco padrão ganhou as colunas vazias (o agente de notícias pode preenchê-las depois). Sem elas: título cortado numa palavra, até 34 caracteres, com "…", e o domínio da `fonte_url`.
- Faixas e filtros, opção C: as quatro mensagens de AC-5.7 não mudam; títulos das faixas "Aprendiz de checagem", "Detetive em treino", "Faro de repórter" e "Imune a fake news!" (na faixa 4 título e mensagem coincidem; a prévia sugeria trocar a mensagem, o que não foi feito). Na lupa, sem os dois olhos, fica só o selo.
- Interface, opção A com o feedback da C: pilha, botões redondos que leem a mesma fração do card, carimbo na saída, "Deu match!"/"Não deu match" e os três ícones da prévia. O carimbo é o próprio rótulo de AC-2.10b com o visual final. A geometria, os tempos e os gestos de AC-2.10 não mudam.
- Sons: entra só a vinheta de fim de partida; sem o tique dos últimos 5 s e sem estéreo no "deslizar".
- Nome: continua "Match do Saber"; o responsável ainda não escolheu.
- Estilo "recorte chapado": as três ilustrações de card ficam ligadas à notícia que ilustram (`mds-0001` emas, `mds-0007` banana, `mds-0010` micro-ondas), não ao tema inteiro, porque numa notícia diferente do mesmo tema virariam pista falsa; as outras notícias sem imagem continuam com a composição do tema. O treino passa a ter os 2 perfis da prévia, Abacaxi Perfeito e Seu Caju, cada um com o próprio desenho (campo `ilustracao`), como a recomendação da prévia ("o tutorial com dois perfis"); ligar o desenho só pelo veredito punha o Seu Caju, com a placa "Banca 14", sob o nome "Professora Abelha". Os 4 perfis do rascunho do agente de notícias ficam em `perfisReserva`, no mesmo arquivo, para o responsável decidir. Os textos dos 2 perfis vêm da prévia e são rascunho. O tutorial continua desligado por padrão.

## Out of Scope (Future Considerations)

- Ranking (do dia ou on-line), apelidos e contas.
- Modo celular individual e modo sala de aula.
- Gestos de dedo (por exemplo, joinha ou mão aberta).
- Modos além de Corpo, Mão e Cabeça. (A sensibilidade dos gestos entrou nos Ajustes na v12.0.0, AC-9.28.)
- Música de fundo ou sons escolhidos pelo operador. (O volume entrou nos Ajustes na v12.0.0, AC-9.29.)
- Configuração de número de cards e tempos pelo gerenciador de notícias (eles ficam nos Ajustes, FR-9, v12.0.0).
- Telemetria e estatísticas de uso.
- Senha ou perfis de acesso ao gerenciador de notícias.
- Instalador para macOS ou Linux.
