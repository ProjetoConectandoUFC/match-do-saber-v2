---
name: experimento-cartas
description: As cartas de baralho e o fan (spec v13) são um experimento que vive só na branch 001-v13-cartas-baralho; não vai para develop/main
metadata:
  type: project
---

Desde 2026-11-16, por decisão do responsável (Levi): o formato "cartas de baralho + fan" (spec v13.x, Story 17, FR-18, Fases 46 a 49) é uma **build de teste**. A equipe vai retrabalhar o design do jogo e o experimento provavelmente não entra na versão final.

**Why:** dá para experimentar com calma enquanto o design é refeito, sem contaminar a linha principal (develop → main publica a web).

**How to apply:**
- Todo trabalho de cartas fica na branch `001-v13-cartas-baralho` (ou em branches filhas dela). Nada de PR para a `develop`, nada de merge na `main`.
- Correções que valem para o jogo todo (ex.: PR #10, bugs gerais) vão pela `develop` normalmente; se a branch das cartas precisar delas, traga com merge da `develop` para a branch, nunca o contrário.
- A spec v13 e as Fases 46 a 49 existem só nessa branch; na `develop` a spec continua na v12.
- Ao retomar no outro computador: `git fetch` e `git switch 001-v13-cartas-baralho`. Ver [[git-flow]].
