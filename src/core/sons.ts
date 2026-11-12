import { faixaDeAcertos } from './faixas';
import { INICIO_RESULTADO_MS, pontos, type Estado } from './partida';

/** `fim1`..`fim4`: vinheta do resumo, uma por faixa de acertos (AC-11.6, v11.0.0). */
export type Som = 'deslizar' | 'acerto' | 'erro' | 'fim1' | 'fim2' | 'fim3' | 'fim4';

/** Sons a tocar na passagem de `antes` para `depois` (FR-11). */
export function sonsDaTransicao(antes: Estado, depois: Estado): Som[] {
  // O resumo só vem do último feedback; Sair e o fim por ausência vão para a espera, sem vinheta.
  if (depois.tela === 'resumo') {
    return antes.tela === 'resumo' ? [] : [`fim${faixaDeAcertos(pontos(depois.partida), depois.partida.cards.length)}`];
  }
  if (depois.tela !== 'feedback') return [];
  const resultado: Som = depois.partida.resultados[depois.indice] === 'acerto' ? 'acerto' : 'erro';
  if (antes.tela === 'card') return depois.resposta === null ? [resultado] : ['deslizar'];
  // Depois da saída do card (TEMPOS.saidaMs), o resultado aparece: toca uma vez.
  const terminouSaida =
    antes.tela === 'feedback' &&
    antes.indice === depois.indice &&
    depois.resposta !== null &&
    antes.restanteMs > INICIO_RESULTADO_MS &&
    depois.restanteMs <= INICIO_RESULTADO_MS;
  return terminouSaida ? [resultado] : [];
}
