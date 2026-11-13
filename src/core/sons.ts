import { faixaDeAcertos } from './faixas';
import { cardSaindo, distribuindo, pontos, type Estado } from './partida';

/**
 * `fim1`..`fim4`: vinheta do resumo, uma por faixa de acertos (AC-11.6, v11.0.0).
 * `carta`: o "fff" de papel de uma carta saindo do fan (AC-17.8, v13.0.0).
 */
export type Som = 'deslizar' | 'acerto' | 'erro' | 'fim1' | 'fim2' | 'fim3' | 'fim4' | 'carta';

/** Qual carta está sendo distribuída (notícia ou treino), para saber quando uma distribuição começa. */
function cartaDistribuida(e: Estado): string | null {
  if (!distribuindo(e)) return null;
  return e.tela === 'card' ? `card-${e.indice}` : e.tela === 'tutorial' ? `treino-${e.passo}` : null;
}

/** Sons a tocar na passagem de `antes` para `depois` (FR-11). */
export function sonsDaTransicao(antes: Estado, depois: Estado): Som[] {
  // AC-17.8: uma vez quando cada carta começa a sair do fan; a abertura (AC-17.5) não toca.
  const carta = cartaDistribuida(depois);
  if (carta !== null) return carta === cartaDistribuida(antes) ? [] : ['carta'];
  // O resumo só vem do último feedback; Sair e o fim por ausência vão para a espera, sem vinheta.
  if (depois.tela === 'resumo') {
    return antes.tela === 'resumo' ? [] : [`fim${faixaDeAcertos(pontos(depois.partida), depois.partida.cards.length)}`];
  }
  if (depois.tela !== 'feedback') return [];
  const resultado: Som = depois.partida.resultados[depois.indice] === 'acerto' ? 'acerto' : 'erro';
  if (antes.tela === 'card') return depois.resposta === null ? [resultado] : ['deslizar'];
  // Depois da saída do card (TEMPOS.saidaMs), o resultado aparece com a carimbada (AC-4.9): toca uma vez, quando a
  // carimbada começa, seja qual for o tempo do feedback (AC-9.25).
  const terminouSaida =
    antes.tela === 'feedback' &&
    antes.indice === depois.indice &&
    depois.resposta !== null &&
    cardSaindo(antes) &&
    !cardSaindo(depois);
  return terminouSaida ? [resultado] : [];
}

/** Sons da transição respeitando o "Som" dos Ajustes (FR-9, AC-17.8): desligado, nada toca. */
export function sonsATocar(antes: Estado, depois: Estado, somLigado: boolean): Som[] {
  return somLigado ? sonsDaTransicao(antes, depois) : [];
}
