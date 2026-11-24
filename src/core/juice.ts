/**
 * Juice, etapa 1 (v13.4.0, Story 19, FR-21): parâmetros de cada efeito por intensidade, numa tabela pura que a tela
 * (`src/app/juice.tsx`) e o som (`sons.ts`) leem. Lógica pura, sem React. A sequência de acertos vem do reducer
 * (`partida.ts`); aqui só se decide quanto cada efeito cresce com ela.
 */

export const INTENSIDADES = ['desligada', 'baixa', 'media', 'alta'] as const;
export type Intensidade = (typeof INTENSIDADES)[number];
/** AC-19.1: Média é o padrão (decisão do responsável, 2026-11-24). */
export const INTENSIDADE_PADRAO: Intensidade = 'media';

/** AC-19.5: confete, pop, tremida e tom crescem com a sequência até N = 5. */
export const TETO_SEQUENCIA = 5;

export interface ParametrosJuice {
  // ---- Carimbo (AC-19.2) ----
  /** Congelamento só visual da carta e do fan quando o carimbo bate; o relógio do jogo não para. */
  hitStopMs: number;
  /** Escala máxima do carimbo ao cair, antes de voltar a 1 (mola); 1 = sem overshoot. */
  carimboOvershoot: number;
  /** Amplitude inicial da tremida da tela inteira, que decai até 0 em `tremidaMs` (≤ 300 ms). Cresce com a sequência. */
  tremidaPx: number;
  tremidaMs: number;
  /** Gotas do respingo de tinta em volta do carimbo, na cor dele. */
  respingoGotas: number;
  /** Som de baque na carimbada (`sons.ts`). */
  baque: boolean;
  // ---- Acerto (AC-19.3) ----
  /** Letras de "Acertou!" entram uma a uma com overshoot, `cascataPassoMs` entre elas. */
  cascata: boolean;
  cascataPassoMs: number;
  /** Partículas de confete (cor de acerto), numa camada única. Crescem com a sequência. */
  confetes: number;
  confeteAlcancePx: number;
  /** Tudo some em até 1,2 s. */
  confeteMs: number;
  /** Escala máxima do "pop" do placar ao somar o ponto. Cresce com a sequência. */
  popEscala: number;
  // ---- Erro e tempo esgotado (AC-19.4) ----
  /** Tremida horizontal da carta, "não", amortecida em até 400 ms. */
  naoPx: number;
  naoMs: number;
  /** Carta "amassa" de leve antes de sair: escala mínima e inclinação. */
  amassarEscala: number;
  amassarGraus: number;
  // ---- Sequência (AC-19.5) ----
  /** "Sequência ×N" na tela, a partir de N = 2. */
  sequenciaVisivel: boolean;
  /** Semitons que o som de acerto sobe por nível da sequência. */
  semitonsPorNivel: number;
}

/**
 * FR-21: a tabela. Limites da spec: hit-stop ~80 ms em Média (AC-19.2); tremida Baixa 0, Média ≤ 6 px, Alta ≤ 12 px,
 * ≤ 300 ms (AC-19.2); nenhum confete em Baixa e tudo some em ≤ 1,2 s (AC-19.1, AC-19.3); "não" ≤ 400 ms (AC-19.4);
 * Desligada = a tela da v13.3.0 (AC-19.8). Os demais números são o ponto de partida para o teste no jogo.
 */
export const JUICE: Record<Intensidade, ParametrosJuice> = {
  desligada: {
    hitStopMs: 0, carimboOvershoot: 1, tremidaPx: 0, tremidaMs: 0, respingoGotas: 0, baque: false,
    cascata: false, cascataPassoMs: 0, confetes: 0, confeteAlcancePx: 0, confeteMs: 0, popEscala: 1,
    naoPx: 0, naoMs: 0, amassarEscala: 1, amassarGraus: 0,
    sequenciaVisivel: false, semitonsPorNivel: 0,
  },
  baixa: {
    hitStopMs: 50, carimboOvershoot: 1.08, tremidaPx: 0, tremidaMs: 0, respingoGotas: 6, baque: true,
    cascata: true, cascataPassoMs: 30, confetes: 0, confeteAlcancePx: 0, confeteMs: 0, popEscala: 1.08,
    naoPx: 4, naoMs: 300, amassarEscala: 0.98, amassarGraus: 1.5,
    sequenciaVisivel: true, semitonsPorNivel: 1,
  },
  media: {
    hitStopMs: 80, carimboOvershoot: 1.18, tremidaPx: 6, tremidaMs: 250, respingoGotas: 10, baque: true,
    cascata: true, cascataPassoMs: 40, confetes: 28, confeteAlcancePx: 260, confeteMs: 1000, popEscala: 1.18,
    naoPx: 10, naoMs: 350, amassarEscala: 0.95, amassarGraus: 3,
    sequenciaVisivel: true, semitonsPorNivel: 1,
  },
  alta: {
    hitStopMs: 110, carimboOvershoot: 1.3, tremidaPx: 12, tremidaMs: 300, respingoGotas: 16, baque: true,
    cascata: true, cascataPassoMs: 45, confetes: 56, confeteAlcancePx: 380, confeteMs: 1200, popEscala: 1.3,
    naoPx: 16, naoMs: 400, amassarEscala: 0.92, amassarGraus: 5,
    sequenciaVisivel: true, semitonsPorNivel: 1,
  },
};

/**
 * AC-19.1: com "reduzir movimento" do sistema (`prefers-reduced-motion: reduce`), a intensidade efetiva é no máximo
 * Baixa (sem tremida de tela e sem confete), qualquer que seja a escolha.
 */
export function intensidadeEfetiva(escolhida: Intensidade, reduzirMovimento: boolean): Intensidade {
  return reduzirMovimento && INTENSIDADES.indexOf(escolhida) > INTENSIDADES.indexOf('baixa') ? 'baixa' : escolhida;
}

/** Nível da sequência (AC-19.5): 0 até o 1º acerto, +1 por acerto seguido, parado no teto (N = 5 → nível 4). */
export function nivelSequencia(sequencia: number): number {
  return Math.max(0, Math.min(sequencia, TETO_SEQUENCIA) - 1);
}

/** AC-19.5: "Sequência ×N" aparece a partir de 2, se a intensidade mostra efeitos (AC-19.8: Desligada, nada). */
export function mostrarSequencia(intensidade: Intensidade, sequencia: number): boolean {
  return JUICE[intensidade].sequenciaVisivel && sequencia >= 2;
}

/** AC-19.5: o som de acerto sobe um semitom por nível, até o teto. */
export function semitonsDoAcerto(intensidade: Intensidade, sequencia: number): number {
  return nivelSequencia(sequencia) * JUICE[intensidade].semitonsPorNivel;
}

/** Fração do máximo da intensidade sem sequência (N ≤ 1); no teto, o máximo inteiro. */
const BASE_SEQUENCIA = 0.6;

/**
 * AC-19.5: os parâmetros do resultado de agora. Confete, pop do placar e tremida crescem com a sequência, da base
 * (60% do máximo, com N ≤ 1, também no erro e no tempo esgotado, quando a sequência zera) até o máximo da intensidade
 * em N = 5; nunca passam dele (AC-19.2). O resto da tabela não muda com N.
 */
export function juiceDaSequencia(intensidade: Intensidade, sequencia: number): ParametrosJuice {
  const p = JUICE[intensidade];
  const f = BASE_SEQUENCIA + (1 - BASE_SEQUENCIA) * (nivelSequencia(sequencia) / (TETO_SEQUENCIA - 1));
  return {
    ...p,
    confetes: Math.round(p.confetes * f),
    tremidaPx: p.tremidaPx * f,
    popEscala: 1 + (p.popEscala - 1) * f,
  };
}
