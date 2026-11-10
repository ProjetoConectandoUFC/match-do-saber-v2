/**
 * Faixas de acertos do resumo (FR-5, AC-5.7), numeradas de 1 a 4 (v11.0.0): a mesma regra da mensagem
 * (`mensagemResumo`) escolhe o filtro e o selo da foto (AC-13.2, AC-13.8) e a vinheta de fim (AC-11.6).
 */
export type Faixa = 1 | 2 | 3 | 4;
export type IdFiltro = 'lupa' | 'detetive' | 'reporter' | 'heroi';

export interface InfoFaixa { titulo: string; filtro: IdFiltro }

/** Títulos da prévia v11 (seção 2); a confirmar pelo responsável. */
export const FAIXAS: Record<Faixa, InfoFaixa> = {
  1: { titulo: 'Aprendiz de checagem', filtro: 'lupa' },
  2: { titulo: 'Detetive em treino', filtro: 'detetive' },
  3: { titulo: 'Faro de repórter', filtro: 'reporter' },
  4: { titulo: 'Imune a fake news!', filtro: 'heroi' },
};

/** Proporção N/M: < 0,5 → 1; até < 0,8 → 2; até < 1 → 3; todos certos → 4. Sem cards, faixa 1. */
export function faixaDeAcertos(pontos: number, total: number): Faixa {
  const p = total > 0 ? pontos / total : 0;
  if (p >= 1) return 4;
  if (p >= 0.8) return 3;
  if (p >= 0.5) return 2;
  return 1;
}
