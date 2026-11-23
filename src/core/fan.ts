/**
 * Fan de cartas (v13.0.0/v13.1.0, AC-17.3 a AC-17.7, FR-18): geometria pura, sem React nem DOM, testável.
 * Medidas em unidades de tela (`--u`: 1 = 1 px em 1366×768), as mesmas da prévia aprovada (`docs/visual/previa-v13.html`).
 * A tela só desenha o que o estado diz: o progresso vem de `restanteMs`/`distribuindoMs` (função `progresso`).
 */
export const FAN = {
  /** No máximo 20 cartas desenhadas (AC-17.3). */
  max: 20,
  /** Ângulo total (graus) com o fan aberto por inteiro e fechado; não depende da quantidade (v13.1.0). */
  totalAberto: 150,
  totalFechado: 8,
  /** Pivô (centro do leque) na tela de 1366×768: 40 abaixo da borda, atrás da barra de tempo. */
  pivo: { x: 683, y: 808 },
  /** Centro da área de jogo (a mesa: a tela menos a barra de 64), onde a carta pousa (AC-4.5). */
  centroMesa: { x: 683, y: 352 },
  /** Cada carta do fan: 200 × 280 (5:7), com a base a `raio` do pivô. */
  raio: 110,
  largura: 200,
  altura: 280,
  /** Largura da carta em jogo (460 × 644). */
  larguraCarta: 460,
  /** Abertura do fan parado atrás da carta, e o pouco que ele abre para soltar a carta (AC-17.6). */
  aberturaJogo: 0.6,
  aberturaDistribuir: 0.75,
  /** Espera (AC-17.4): respira entre estas aberturas num ciclo de ~4 s; com menos movimento, fica meio aberto. */
  esperaMin: 0.15,
  esperaMax: 0.8,
  esperaParado: 0.5,
  cicloEsperaMs: 4000,
  /** Quantas cartas o fan da espera desenha. */
  cartasEspera: 10,
} as const;

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
/** Exata nas pontas: em t = 0 dá `a`, em t = 1 dá `b`. */
const lerp = (a: number, b: number, t: number) => a * (1 - t) + b * t;
/** Ease in-out quadrático. */
export const suave = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

/** Progresso de uma fase (0 a 1) a partir do que falta no estado do reducer. */
export function progresso(totalMs: number, restanteMs: number): number {
  return clamp01(1 - restanteMs / totalMs);
}

export function cartasDesenhadas(n: number): number {
  return Math.max(0, Math.min(FAN.max, Math.floor(n)));
}

/**
 * Ângulo (graus) de cada carta, da esquerda (atrás) para a direita (na frente). `abertura` 0 = maço fechado, 1 = aberto
 * por inteiro. O ângulo total é o mesmo para qualquer quantidade (v13.1.0): poucas cartas ficam mais espaçadas e o fan
 * continua visível dos dois lados da carta até a última.
 */
export function angulosFan(n: number, abertura: number): number[] {
  const k = cartasDesenhadas(n);
  if (k === 0) return [];
  if (k === 1) return [0];
  const total = lerp(FAN.totalFechado, FAN.totalAberto, clamp01(abertura));
  return Array.from({ length: k }, (_, i) => -total / 2 + (i * total) / (k - 1));
}

/** Abertura da partida (AC-17.5): abre por inteiro até 45%, segura até 60% e fecha até a abertura de jogo. */
export function aberturaNaAbertura(p: number): number {
  const t = clamp01(p);
  if (t < 0.45) return suave(t / 0.45);
  if (t < 0.6) return 1;
  return lerp(1, FAN.aberturaJogo, suave((t - 0.6) / 0.4));
}

/** Espera (AC-17.4): um ciclo inteiro em p de 0 a 1 (cosseno), do mínimo ao máximo e de volta. */
export function aberturaNaEspera(p: number): number {
  const meio = (FAN.esperaMin + FAN.esperaMax) / 2;
  const amplitude = (FAN.esperaMax - FAN.esperaMin) / 2;
  return meio - amplitude * Math.cos(clamp01(p) * 2 * Math.PI);
}

/** Abertura do fan com `nAntes` cartas enquanto ele solta a da direita: abre um pouco nos primeiros 30%. */
const aberturaSoltando = (p: number) => lerp(FAN.aberturaJogo, FAN.aberturaDistribuir, suave(clamp01(p / 0.3)));

/**
 * Distribuição (AC-17.6): ângulos das cartas que ficam no fan (todas menos a da direita) no progresso `p`. O fan abre um
 * pouco, solta a carta e fecha na abertura de jogo com uma a menos. Com mais de 20, continuam 20 desenhadas.
 */
export function angulosNaDistribuicao(nAntes: number, p: number): number[] {
  const ficam = cartasDesenhadas(nAntes - 1);
  if (ficam === 0) return [];
  const t = clamp01(p);
  const desenhadasAntes = cartasDesenhadas(nAntes);
  if (t < 0.3) return angulosFan(desenhadasAntes, aberturaSoltando(t)).slice(0, ficam);
  const base = angulosFan(desenhadasAntes, FAN.aberturaDistribuir).slice(0, ficam);
  const depois = angulosFan(ficam, FAN.aberturaJogo);
  const f = suave((t - 0.3) / 0.7);
  return base.map((a, i) => lerp(a, depois[i]!, f));
}

/** Posição da carta em jogo em relação ao centro da mesa (unidades de tela), giro no plano, escala e giro em Y. */
export interface PoseCarta { x: number; y: number; graus: number; escala: number; giroY: number }

/** Pivô do fan em relação ao centro da mesa, em 1366×768; a tela pode medir o real (outra proporção de tela). */
export const PIVO_NA_MESA = { x: FAN.pivo.x - FAN.centroMesa.x, y: FAN.pivo.y - FAN.centroMesa.y } as const;

/**
 * Carta distribuída (AC-17.6, v13.1.0): sai da ponta direita do fan pelo verso, do tamanho de uma carta do fan, sobe em
 * arco até o centro da mesa virando para a frente e pousa inteira. `p` = 0 no começo, 1 pousada. `pivo`: o pivô do fan
 * em relação ao centro da mesa, em unidades de tela.
 */
export function poseCartaDistribuida(nAntes: number, p: number, pivo: { x: number; y: number } = PIVO_NA_MESA): PoseCarta {
  const t = clamp01(p);
  if (t >= 1) return { x: 0, y: 0, graus: 0, escala: 1, giroY: 0 };
  const angulos = angulosFan(Math.max(1, nAntes), aberturaSoltando(t));
  const th0 = angulos[angulos.length - 1]!;
  const r = (th0 * Math.PI) / 180;
  const d = FAN.raio + FAN.altura / 2; // centro da carta do fan, a partir do pivô
  const S = [pivo.x + d * Math.sin(r), pivo.y - d * Math.cos(r)] as const;
  const L = [S[0] + 90 * Math.sin(r), S[1] - 90 * Math.cos(r)] as const; // sai do fan na direção da carta
  const C = [S[0] * 0.25, -60] as const; // passa um pouco acima do centro e cai no lugar
  const e = suave(t);
  const bezier = (i: 0 | 1) => (1 - e) ** 3 * S[i] + 3 * (1 - e) ** 2 * e * L[i] + 3 * (1 - e) * e * e * C[i];
  return {
    x: bezier(0),
    y: bezier(1),
    graus: lerp(th0, 0, suave(clamp01(t / 0.85))),
    escala: lerp(FAN.largura / FAN.larguraCarta, 1, suave(clamp01((t - 0.1) / 0.85))),
    giroY: lerp(180, 0, suave(clamp01((t - 0.2) / 0.6))),
  };
}
