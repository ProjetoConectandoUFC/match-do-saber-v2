---
branch_pattern: "^[0-9]+-[a-z0-9-]+$"
ticket_prefix: "CU-"
commit_format: "<type>(<scope>): <message>"
allowed_types:
  - feat
  - fix
  - docs
  - chore
  - refactor
  - test
  - style
  - build
  - content
---

# Git Convention

This file is read by SDD skills to enforce branch naming and commit message standards.
To change these settings, edit this file directly.

## Fluxo (git flow)

Repositório: https://github.com/ProjetoConectandoUFC/match-do-saber-v2

- `main`: versão entregue. Só recebe merge da `develop`.
- `develop`: integração. Só recebe por **pull request aprovado pelo responsável**, com as revisões feitas.
- Branches de trabalho saem da `develop`, no padrão `NNN-slug` (ex.: `001-v11-lote-2-noticias`). Cada agente (notícias, visual, mecânico) commita na **sua própria branch**; nunca dois agentes na mesma.
- O orquestrador pode abrir o PR para a `develop`, com descrição, spec/AC afetados e a saída de `npm test`, `npm run build` e do E2E. O merge só acontece depois da aprovação.
- Nada é commitado direto na `develop` ou na `main`.

Tipos extras: `style` (só visual), `build` (empacotamento/CI), `content` (notícias do banco).

## Examples

### Branch names
- `001-tela-de-partida`
- `002-banco-de-noticias`

### Commit messages
- `feat(partida): adiciona cronômetro por rodada`
- `fix(gabarito): corrige explicação da técnica de busca reversa de imagem (CU-86a1b2c3)`
- `content(noticias): lote 2 com 20 notícias aprovadas (10 V / 10 F)`
