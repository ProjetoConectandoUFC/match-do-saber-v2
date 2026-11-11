/**
 * Endereço público da versão web (GitHub Pages), onde fica a página das fontes que o QR do resumo abre (AC-5.9,
 * AC-5.10, v11.0.0). É o mesmo na web e no app de desktop (que serve o jogo em 127.0.0.1, inacessível ao celular).
 * Troca no build com `VITE_URL_PUBLICA`. A confirmar pelo responsável.
 */
export const URL_PUBLICA: string = import.meta.env.VITE_URL_PUBLICA || 'https://projetoconectandoufc.github.io/match-do-saber-v2/';
