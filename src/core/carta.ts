import type { ColunaBanco, NoticiaBanco } from './types';

/**
 * Carta de baralho (v13.0.0, Story 17): regras puras que a tela usa, sem React.
 */

/** AC-7.13 (v13.1.0): acima disso o verso da carta precisa de letra menor que ~24 px. */
export const LIMITE_SAIBA_MAIS = 250;

/** Avisos que não bloqueiam (AC-7.13): separados de `validarNoticia` (AC-7.3), não mudam `jogaveis`. */
export type Avisos = Partial<Record<ColunaBanco, string>>;

export function avisosNoticia(n: Pick<NoticiaBanco, 'saiba_mais'>): Avisos {
  const a: Avisos = {};
  const tamanho = (n.saiba_mais ?? '').trim().length;
  if (tamanho > LIMITE_SAIBA_MAIS) {
    a.saiba_mais = `Saiba mais longo: ${tamanho} de ${LIMITE_SAIBA_MAIS} caracteres; no verso da carta a letra fica menor`;
  }
  return a;
}

/** Letra da carta (AC-17.1, AC-17.2): manchete de 36 até 30; verso de 25 até 20 (unidades de tela, `--u`). */
export const LETRA_MANCHETE = { max: 36, min: 30 } as const;
export const LETRA_VERSO = { max: 25, min: 20 } as const;

/**
 * O maior tamanho entre `max` e `min` (de 1 em 1) em que `cabe` diz que o texto cabe; sem caber nem no mínimo, o mínimo.
 * `cabe` aplica o tamanho e mede (na tela, `scrollHeight <= clientHeight`).
 */
export function maiorTamanhoQueCabe(max: number, min: number, cabe: (tamanho: number) => boolean): number {
  for (let t = max; t > min; t--) if (cabe(t)) return t;
  cabe(min);
  return min;
}
