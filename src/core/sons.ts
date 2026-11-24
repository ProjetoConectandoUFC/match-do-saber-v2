import { faixaDeAcertos } from './faixas';
import { JUICE, semitonsDoAcerto, type Intensidade } from './juice';
import { cardSaindo, distribuindo, pontos, type Estado } from './partida';

/**
 * `fim1`..`fim4`: vinheta do resumo, uma por faixa de acertos (AC-11.6, v11.0.0).
 * `carta`: o "fff" de papel de uma carta saindo do fan (AC-17.8, v13.0.0).
 * `carimbo`: o baque do carimbo batendo (AC-19.2, v13.4.0), só com os efeitos ligados (`toquesATocar`).
 */
export type Som = 'deslizar' | 'acerto' | 'erro' | 'fim1' | 'fim2' | 'fim3' | 'fim4' | 'carta' | 'carimbo';

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

/** Um som a tocar e quantos semitons ele sobe (v13.4.0, AC-19.5: o acerto, pela sequência). */
export interface Toque { som: Som; semitons: number }

/**
 * Sons da transição com os efeitos (v13.4.0, FR-11, AC-19.2, AC-19.5, AC-19.8): os de `sonsATocar` e, com a intensidade
 * acima de Desligada, o baque do carimbo junto com o som do resultado (que já toca quando a carimbada começa, AC-4.9) e o
 * acerto um semitom acima por nível da sequência, até o teto. Desligada: os sons da v13.3.0. Som desligado: nada.
 * `intensidade`: a efetiva (`juice.ts`).
 */
export function toquesATocar(antes: Estado, depois: Estado, o: { somLigado: boolean; intensidade: Intensidade }): Toque[] {
  const baque = JUICE[o.intensidade].baque;
  const sequencia = depois.tela === 'feedback' ? depois.sequencia : 0;
  return sonsATocar(antes, depois, o.somLigado).flatMap((som): Toque[] => {
    if (som === 'acerto') {
      const acerto = { som, semitons: semitonsDoAcerto(o.intensidade, sequencia) };
      return baque ? [{ som: 'carimbo', semitons: 0 }, acerto] : [acerto];
    }
    if (som === 'erro' && baque) return [{ som: 'carimbo', semitons: 0 }, { som, semitons: 0 }];
    return [{ som, semitons: 0 }];
  });
}
