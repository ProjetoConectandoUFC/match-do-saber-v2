# Expediente 2026-11-23 (notebook DESKTOP-PJ0NRKU)

- Memória dos dias 16 e 17 lida; nada registrado sobre o teste A/B de 18/11 até aqui. O responsável vai mandar a análise dos dados (pontuações e resultados completos).
- Sincronia de branches com a v13.2.0 (`001-v13-ab`):
  - Apagadas, todas já contidas na v13.2.0: `001-v13-cartas-baralho` e `001-release-workflow` (remoto e local); `001-lote-4-noticias`, `001-v12-correcoes` e `001-v12-robustez` (só locais, já apagadas no GitHub).
  - `001-lote-4-banco` recebeu a v13.2.0 por merge; difere dela só nas 12 linhas do lote 4 (rascunho). 877/877 e `tsc` ok.
  - Locais `develop` e `main` iguais ao GitHub.
- PRs abertos (aprovação do responsável):
  - **#14** `001-v13-ab` → develop: v13.2.0 (troca de interface Clássica × Cartas, cartas, fan, workflow de release).
  - **#13** `001-lote-4-banco` → develop: lote 4 como rascunho. Aprovar depois do #14, para o diff ficar só no CSV.
  - **#15** develop → main: publica a web (hoje v11). Por último; acompanha a develop sozinho.
