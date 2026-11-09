---
name: git-flow
description: Git flow do Match do Saber no repo match-do-saber-v2 — tudo via develop com PR aprovado pelo responsável; cada agente em branch própria
metadata:
  type: feedback
---

Regras do responsável (2026-11-09):
- Repo: https://github.com/ProjetoConectandoUFC/match-do-saber-v2.
- Git flow: toda alteração entra pela `develop`; a `main` só recebe da `develop`.
- Única exceção: o "first commit" da `main` (já feito, sem histórico).
- Todo merge na `develop` é por pull request **aprovado pelo responsável**, com as revisões feitas.
- Vários agentes trabalham ao mesmo tempo: cada um commita na **sua própria branch** (padrão `NNN-slug`, ver `docs/git-convention.md`). O orquestrador (Claude) pode abrir os PRs para a `develop`, mas não faz merge sem aprovação.

**Why:** o responsável entrega ao gestor e revisa cada mudança; agentes em paralelo não podem colidir.
**How to apply:** nunca commitar direto em `develop`/`main`; PR com descrição, spec/AC afetados e saída de `npm test`, `npm run build` e E2E; esperar o "aprovado". Ver [[estado-v10]].
