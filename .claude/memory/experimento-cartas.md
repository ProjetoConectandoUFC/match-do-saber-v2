---
name: experimento-cartas
description: Cartas de baralho e fan (spec v13) — experimento de branch até 2026-11-16; desde a v13.2.0 (2026-11-17) entram na develop atrás da troca de interface (Clássica padrão × Cartas) para o teste A/B
metadata:
  type: project
---

**Atualização 2026-11-17 (spec v13.2.0, aprovada pelo responsável):** as cartas deixam de ser experimento de branch. Entram na develop pela branch `001-v13-ab`, atrás do ajuste "Interface do jogo" (Clássica = v12.1.0, padrão; Cartas = v13.1.0; tecla I na espera), para o teste A/B com público de 2026-11-18. As regras abaixo valem só como histórico da `001-v13-cartas-baralho`; o trabalho das duas interfaces segue pela `001-v13-ab` → develop com PR.

Desde 2026-11-16, por decisão do responsável (Levi): o formato "cartas de baralho + fan" (spec v13.x, Story 17, FR-18, Fases 46 a 49) é uma **build de teste**. A equipe vai retrabalhar o design do jogo e o experimento provavelmente não entra na versão final.

**Why:** dá para experimentar com calma enquanto o design é refeito, sem contaminar a linha principal (develop → main publica a web).

**How to apply:**
- Todo trabalho de cartas fica na branch `001-v13-cartas-baralho` (ou em branches filhas dela). Nada de PR para a `develop`, nada de merge na `main`.
- Correções que valem para o jogo todo (ex.: PR #10, bugs gerais) vão pela `develop` normalmente; se a branch das cartas precisar delas, traga com merge da `develop` para a branch, nunca o contrário.
- A spec v13 e as Fases 46 a 49 existem só nessa branch; na `develop` a spec continua na v12.
- Ao retomar no outro computador: `git fetch` e `git switch 001-v13-cartas-baralho`. Ver [[git-flow]].
