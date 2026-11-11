# Data Model: Match do Saber — jogo de estande

Atualizado na v10.2.0. Desde a v9.0.0 o conteúdo vem de um banco CSV gerenciado dentro do jogo; a Planilha Google, a conta de serviço e o `content/noticias.json` gerado por ela deixaram de ser o caminho do conteúdo (o JSON antigo só é lido como reserva se não houver CSV; `scripts/sync/` está desativado).

## Entities

### NoticiaBanco (linha de `noticias.csv`)

Arquivos: banco padrão versionado `conteudo/noticias.csv` (copiado para `content/noticias.csv` no build); no app de desktop, `Documentos/Match do Saber/noticias.csv`, com backups em `Documentos/Match do Saber/backups/`. Formato (FR-6): cabeçalho, UTF-8 com BOM, `;` (lê também `,` e arquivo sem BOM ou em Windows-1252), uma linha por notícia, colunas lidas pelo nome em qualquer ordem; coluna ausente fica vazia. Tipo: `NoticiaBanco` em `src/core/types.ts`; ordem de exportação: `COLUNAS_BANCO`.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | string | obrigatório, `^[a-z0-9-]+$` (sem diferenciar maiúsculas), único no banco; novos no formato `mds-NNNN` | Identificador |
| titulo | string | obrigatório | Título do card |
| descricao | string | obrigatório | Texto curto do card |
| saiba_mais | string | obrigatório | Texto expandido |
| veredito | enum | `verdadeira` \| `falsa` | Gabarito (na interface: Verdade / Mentira) |
| explicacao | string | obrigatório | Por que é verdade ou mentira (feedback) |
| tecnica | enum | `fonte` \| `data` \| `imagem` \| `contexto` | Técnica de checagem |
| tema | enum | `saude` \| `ciencia` \| `historia` \| `tecnologia` \| `curiosidades` \| `meio-ambiente` | Tema; sem imagem, o card mostra a ilustração dele (v9.0.0) |
| fonte_url | string | obrigatório, link `http(s)` | Fonte verificável |
| fontes_extras | string | opcional; links `http(s)` separados por espaço | Outras fontes |
| imagem | string | opcional; caminho relativo ao site (`content/img/…`) | Imagem do card |
| revisado_por | string | obrigatório quando `status = aprovada` | Quem revisou (não aparece no jogo) |
| status | enum | `rascunho` \| `aprovada` | Só `aprovada` entra nas partidas |
| dificuldade | enum opcional | `facil` \| `medio` \| `dificil` ou vazia; CSV sem a coluna = vazia (v10.1.0) | Dado para o gerenciador; o sorteio ainda não usa |

Colunas de lista são lidas em minúsculas (aceita "Falsa" ou "SAUDE" vindos do Excel). A validação está em `validarNoticia`/`validarBanco` (`src/core/banco.ts`): linha com problema ou `id` repetido não entra em partidas e aparece no painel Notícias com o motivo.

**Indexes:** unicidade de `id` verificada ao carregar, salvar e importar.
**Relationships:** nenhuma.
**Spec requirement:** FR-6, FR-7, AC-7.2, AC-7.3, AC-7.7, AC-7.10, AC-8.3, AC-8.4.

---

### Noticia (o que a partida recebe)

Gerada por `jogaveis(banco)`: só linhas válidas, `aprovada`, com `fonte_url` e `revisado_por` (Princípio 1).

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | string | not null | igual ao do banco |
| titulo, descricao, saibaMais, explicacao | string | not null | textos do card e do feedback |
| veredito | `'verdadeira' \| 'falsa'` | not null | — |
| tecnica | `'fonte' \| 'data' \| 'imagem' \| 'contexto'` | not null | — |
| tema | `Tema` | not null | ilustração do card sem imagem |
| fonteUrl | string | not null | — |
| imagem | string | opcional | só se o banco tiver |
| dificuldade | `'facil' \| 'medio' \| 'dificil'` | opcional | só se o banco tiver |

**Relationships:** uma partida sorteia até 10 (`sortear`, AC-6.1 a AC-6.3).
**Spec requirement:** FR-4, FR-5, AC-7.7.

---

### PerfilTutorial (`conteudo/tutorial.json`, v10.2.0)

Arquivo próprio, separado do banco, embutido no build. Raiz: `{ "status": "rascunho" | "aprovado", "origem": string, "perfis": PerfilTutorial[] }`. Validado por `lerTutorial` (`src/core/tutorial.ts`); arquivo inválido = jogo sem tutorial.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | string | obrigatório, único no arquivo | Identificador (`treino-N`) |
| nome | string | obrigatório | Título do card de treino |
| frase | string | obrigatório | Descrição do card de treino |
| veredito | `'verdadeira' \| 'falsa'` | lista | Resposta do treino |
| explicacao | string | obrigatório | Texto do feedback de treino |
| tecnica | `Tecnica` | lista | Técnica mostrada no feedback |
| tema | `Tema` | lista | Ilustração do card (sem imagem final) |

**Relationships:** nenhuma com o banco: não entra em `jogaveis`, no placar nem no sorteio (AC-15.4).
**Spec requirement:** FR-16, AC-15.2, AC-15.7.

---

### FotoPartida (só na memória, v7.0.0; âncoras na v10.2.0)

Estado React de `useFotoPartida` no `App`; nunca vai para disco, armazenamento do navegador, rede ou diagnóstico (AC-13.5). Apagada inteira, com as âncoras, ao começar nova partida, sair ou terminar sem resumo (AC-13.4, AC-13.7).

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| imagem | string | data URL JPEG, espelhada | Quadro da câmera do card ⌈M/2⌉ |
| largura, altura | number | px da foto (480 de largura) | Tamanho da foto |
| ancoras | `AncorasRosto \| null` | `null` = "sem filtro" | Ver abaixo |

`AncorasRosto` (`src/core/ancorasRosto.ts`), em px da foto espelhada, no quadro de referência dos filtros (olhos em (−50, 0) e (50, 0); 100 unidades = distância entre os olhos). Um `Quadro` é `{ x, y, escala, graus }`: origem do referencial na foto, px por unidade e giro.

| Field | Type | Description |
|-------|------|-------------|
| rosto | `Quadro & { fonte: 'olhos' \| 'orelhas' }` | Pelos olhos (2, 5); sem eles, pelas orelhas (7, 8) |
| chapeu | `Quadro & { fonte: 'orelhas' \| 'olhos' }` | Pelas orelhas; sem elas, igual ao rosto |
| capa | `Quadro \| null` | Pelos ombros (11, 12), escala própria |
| olhoEsquerdo, olhoDireito, orelhaDireita | `{ x, y } \| null` | Pontos 2, 5 e 8 |
| largura, altura, espelhada | number, number, boolean | Foto a que as âncoras se referem |

Pontos com visibilidade < 0,5 contam como ausentes.
**Spec requirement:** FR-13, AC-13.1 a AC-13.7.

---

Não existe entidade de jogador nem de partida persistida (FR-1 "Must not"; Non-Goals).

---

### Configuracoes (configuração do notebook; v1.1.0, reescrito v2.0.0, ampliado v7.0.0 e v10.2.0)

Chaves do `localStorage` (`src/core/modos.ts`); valor ausente ou inválido usa o padrão do item.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| match-do-saber:modo | `'corpo' \| 'mao' \| 'cabeca'` | padrão `corpo` | Modo de jogo |
| match-do-saber:tempoCard | `'10' \| '15' \| '20' \| '25' \| '30'` | padrão `15` | Tempo por card, em segundos |
| match-do-saber:som | `'ligado' \| 'desligado'` | padrão `ligado` | Som de escolha e resultado |
| match-do-saber:foto | `'ligada' \| 'desligada'` | padrão `ligada` | Foto no resumo (FR-13) |
| match-do-saber:tutorial | `'ligado' \| 'desligado'` | padrão `desligado` | Treino antes da partida (FR-16) |

**Indexes:** nenhum.
**Relationships:** nenhuma; é configuração do estande, não dado de jogador.
**Spec requirement:** FR-9, AC-9.4, AC-9.5, AC-9.17, FR-11, FR-13, FR-16.
