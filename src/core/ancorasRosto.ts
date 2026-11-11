/**
 * Âncoras do rosto na foto do resumo (AC-13.6, v10.2.0): onde os filtros (ainda não desenhados) ficariam.
 * Quadro de referência dos SVGs de `docs/visual/filtros/` (prévia v11, a aprovar): olhos em (−50, 0) e (50, 0),
 * orelhas em (−105, 15) e (105, 15), ombros em (−200, 255) e (200, 255); 100 unidades = distância entre os olhos.
 * Um `Quadro` diz onde fica a origem desse referencial na foto (px), quantos px vale cada unidade e o giro.
 * Lógica pura; guardada só na memória, junto com a foto (FR-13, AC-13.7).
 */
import type { Ponto } from './gestos';

export const VISIBILIDADE_MINIMA = 0.5;

const OLHO_E = 2, OLHO_D = 5, ORELHA_E = 7, ORELHA_D = 8, OMBRO_E = 11, OMBRO_D = 12;

/** Posições do par no quadro de referência: (±meia, altura). */
const REFERENCIA = {
  olhos: { meia: 50, altura: 0 },
  orelhas: { meia: 105, altura: 15 },
  ombros: { meia: 200, altura: 255 },
} as const;

export interface PontoPx { x: number; y: number }
export interface Quadro { x: number; y: number; escala: number; graus: number }
export interface DimensoesFoto { largura: number; altura: number; espelhada: boolean }

export interface AncorasRosto extends DimensoesFoto {
  /** Óculos, máscara, lupa. Pelos olhos; sem eles, pelas orelhas. */
  rosto: Quadro & { fonte: 'olhos' | 'orelhas' };
  /** Chapéus. Pelas orelhas; sem elas, igual ao rosto. */
  chapeu: Quadro & { fonte: 'orelhas' | 'olhos' };
  /** Capa e emblema, com escala própria pelos ombros; sem ombros, nenhuma. */
  capa: Quadro | null;
  olhoEsquerdo: PontoPx | null;
  olhoDireito: PontoPx | null;
  /** Orelha direita (8), para o lápis do repórter. */
  orelhaDireita: PontoPx | null;
}

/**
 * `pontos`: landmarks do MediaPipe Pose (normalizados no quadro da câmera, sem espelhar) do instante da foto.
 * `espelhada`: a foto foi gravada espelhada, como a prévia (x vira 1 − x). Devolve `null` ("sem filtro")
 * sem pose, sem os dois olhos nem as duas orelhas vistos, ou com a foto sem tamanho.
 */
export function calcularAncoras(pontos: readonly (Ponto | undefined)[] | null, foto: DimensoesFoto): AncorasRosto | null {
  const { largura, altura, espelhada } = foto;
  if (!pontos || !(largura > 0) || !(altura > 0)) return null;

  const px = (i: number): PontoPx | null => {
    const p = pontos[i];
    if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y)) return null;
    if ((p.visibility ?? 1) < VISIBILIDADE_MINIMA) return null;
    return { x: (espelhada ? 1 - p.x : p.x) * largura, y: p.y * altura };
  };

  // O ponto que fica à esquerda da foto ocupa o lado negativo do quadro: na foto espelhada, o lado esquerdo do jogador.
  const par = (esq: number, dir: number, ref: { meia: number; altura: number }): Quadro | null => {
    const e = px(esq), d = px(dir);
    if (!e || !d) return null;
    const [a, b] = espelhada ? [e, d] : [d, e];
    const dx = b.x - a.x, dy = b.y - a.y;
    const dist = Math.hypot(dx, dy);
    if (dist === 0) return null;
    const escala = dist / (2 * ref.meia);
    const t = Math.atan2(dy, dx);
    const h = ref.altura * escala;
    return { x: (a.x + b.x) / 2 + h * Math.sin(t), y: (a.y + b.y) / 2 - h * Math.cos(t), escala, graus: (t * 180) / Math.PI };
  };

  const olhos = par(OLHO_E, OLHO_D, REFERENCIA.olhos);
  const orelhas = par(ORELHA_E, ORELHA_D, REFERENCIA.orelhas);
  const rosto = olhos ? { ...olhos, fonte: 'olhos' as const } : orelhas ? { ...orelhas, fonte: 'orelhas' as const } : null;
  if (!rosto) return null;

  return {
    largura, altura, espelhada,
    rosto,
    chapeu: orelhas ? { ...orelhas, fonte: 'orelhas' } : { ...rosto, fonte: 'olhos' },
    capa: par(OMBRO_E, OMBRO_D, REFERENCIA.ombros),
    olhoEsquerdo: px(OLHO_E),
    olhoDireito: px(OLHO_D),
    orelhaDireita: px(ORELHA_D),
  };
}
