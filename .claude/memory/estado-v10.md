---
name: estado-v10
description: Estado do Match do Saber em 2026-11-09 (spec v10.0.0, first commit no repo match-do-saber-v2) e o que falta; ponto de partida para retomar de outro dispositivo
metadata:
  type: project
---

# Estado em 2026-11-09 (spec v10.0.0)

Repositório oficial: https://github.com/ProjetoConectandoUFC/match-do-saber-v2 — `main` começa num único "first commit" (sem histórico; o histórico anterior está no repo antigo Projeto-Conectando/match-do-saber). `develop` criada a partir da `main`. Fluxo: [[git-flow]].

Entrega ao gestor: 2026-11-10 às 13h.

## Feito
- **v9.0.0** (Agente Mecânico): banco de notícias em CSV (`conteudo/noticias.csv` é o banco padrão versionado; `prepare-assets` copia para `public/content/`), campo `tema`, imagem opcional, validação do Princípio 1; menu ☰ (Notícias, Configurações, Diagnóstico, Tela cheia); painel Notícias (filtrar, editar, apagar, alterar em massa, importar/exportar CSV); app de desktop Electron (`npm run desktop`, `npm run package:win` → `out/Match do Saber-win32-x64/`), banco em `Documentos/Match do Saber/noticias.csv` com backups. Planilha Google desativada (arquivos de `scripts/sync/` mantidos).
- **v10.0.0** (Agente Visual): identidade do Conectando Design System #NEW conforme `docs/visual/previa.html` (revisão 3 aprovada): Poppins local, Verdade/Mentira, tempo só na barra da base, feedback com veredito no topo e fundo menta/coral, resumo sem câmera e polaroid +20%, câmera como overlay, anéis nas bordas da espera. Capturas reais em `docs/visual/capturas/`.
- **Conteúdo** (Agente de Notícias): lote 1 com 10 notícias (5 V / 5 F) aprovadas pelo responsável ("Produção CNTM - Levi") — `docs/noticias/lotes/2026-11-09-lote-1.json` e no banco padrão. Página de revisão: https://claude.ai/artifact/6YxiUz31KxuZQ4Zg3yiTuw (decisões na coleção `decisoes`).
- Verificação final antes do first commit: `npm test` 305/305, `npm run build` ok, `npm run e2e` 43/43.

## Pendente
- Fase 37 (hardware, no notebook do estande): câmera real dentro do Electron, abrir sem internet, editar o CSV no Excel e recarregar (Ctrl+R), importar CSV de lote. Fases antigas de hardware (7–32) seguem em [[mvp-status-fase7]].
- `npm run e2e:desktop` não foi rodado depois do visual (passou na v9, 2/2). Rodar num terminal sem `ELECTRON_RUN_AS_NODE`.
- Executável sem ícone próprio (falta um `.ico`).
- `partida.spec.ts:122` (animação de saída) é instável só sob carga na suíte inteira; isolado passa.
- ADR `docs/adr/001-content-pipeline.md` ainda descreve a planilha (superada pela v9); steering `tech-stack.md` atualizado nesta data.
- Workflow `publicar.yml` publica a web no GitHub Pages a cada push na `main`; no repo novo o Pages precisa ser ativado (Settings › Pages › GitHub Actions).
- Próximos lotes de notícias: rodar o `agente-noticias` (ids a partir de `mds-0011`), revisar numa página de revisão e importar pelo painel ou acrescentar ao `conteudo/noticias.csv`.

## Agentes
Ver [[agentes]].
