---
name: agentes
description: Como o Match do Saber é desenvolvido com três agentes de projeto (notícias, visual, mecânico) orquestrados pelo Claude principal
metadata:
  type: project
---

Os agentes ficam em `.claude/agents/` e são chamados pelo nome (`agente-noticias`, `agente-visual`, `agente-mecanico`) numa sessão aberta na raiz do repositório. O Claude principal é o orquestrador: distribui tarefas, revisa, roda os testes, atualiza spec/plano (fluxo SDD, `.claude/CLAUDE.md`) e abre PRs para a `develop` ([[git-flow]]).

- **agente-noticias**: pesquisa lotes equilibrados (metade V, metade F), "sérios e absurdos" (as verdadeiras também surpreendentes), ≥ 2 fontes abertas de verdade, sem temas partidários, adequado a menores; entrega `docs/noticias/lotes/<data>-lote-<N>.json` com `status: rascunho`. O responsável aprova numa página de revisão (artifact com `db`); aprovadas viram `aprovada` com `revisadoPor` e entram no `conteudo/noticias.csv` (formato da spec FR-6). Limites: título ≤ 70, descrição ≤ 140, saiba mais ≤ 600.
- **agente-visual**: identidade do "Conectando Design System #NEW" (https://claude.ai/artifact/1rD6ycEsJKsJJJ2DUL6auj; cópia em `docs/visual/referencia/`). Interface enxuta, foco na notícia e no gesto. Sempre prévia para aprovação antes de aplicar. Regras aprovadas na spec FR-15.
- **agente-mecanico**: código e mecânica com TDD (lógica pura em `src/core/`); prioridade do modo Corpo (festival), Mão e Cabeça sem regressão (acessibilidade). Sem gravações reais do estande, não ajustar limiares de gesto por palpite.

Preferências do responsável: autonomia para o orquestrador; pedir confirmação só para mudanças caras de desfazer; trabalhar em passos testáveis.
