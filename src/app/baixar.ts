/** Salva `dados` como arquivo JSON no computador (download local; nada vai para a rede). */
export function baixarJson(dados: unknown, nome = `match-do-saber-diagnostico-${new Date().toISOString().replace(/[:.]/g, '-')}.json`): void {
  baixarTexto(JSON.stringify(dados, null, 2), nome, 'application/json');
}

/** Salva um texto como arquivo no computador (download local; nada vai para a rede). */
export function baixarTexto(texto: string, nome: string, tipo: string): void {
  const url = URL.createObjectURL(new Blob([texto], { type: tipo }));
  const a = document.createElement('a');
  a.href = url;
  a.download = nome;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
