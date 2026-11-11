/**
 * Filtros da foto do resumo (AC-13.8, AC-13.9, v11.0.0): que partes de cada filtro entram e onde, a partir
 * das âncoras do rosto (AC-13.6). Os desenhos estão no quadro de referência de `docs/visual/filtros/`
 * (olhos em (−50, 0) e (50, 0), 100 unidades = distância entre os olhos); cada parte recebe o `transform`
 * SVG que leva esse quadro à foto, em pixels da foto. Lógica pura: quem desenha é `src/app/FiltroFoto.tsx`,
 * numa camada por cima da foto, sem mudar os pixels dela (FR-13).
 */
import type { AncorasRosto, Quadro } from './ancorasRosto';
import type { IdFiltro } from './faixas';

/** `rosto`: óculos, máscara, lupa. `chapeu`: chapéus. `capa`: capa e emblema. `lapis`: atrás da orelha 8. */
export type ParteFiltro = 'rosto' | 'chapeu' | 'capa' | 'lapis';
export interface PecaFiltro { parte: ParteFiltro; transform: string }

/** Orelha direita (8) no quadro de referência: o lápis do repórter está desenhado em volta dela. */
const ORELHA_DIREITA_REF = { x: 105, y: 15 };

const n = (v: number, casas: number) => +v.toFixed(casas);

export function transformDoQuadro(q: Quadro): string {
  return `translate(${n(q.x, 2)} ${n(q.y, 2)}) rotate(${n(q.graus, 2)}) scale(${n(q.escala, 3)})`;
}

/** Peças a desenhar, na ordem de pintura (a de trás primeiro). Sem âncoras, nenhuma: fica só o selo. */
export function pecasDoFiltro(filtro: IdFiltro, a: AncorasRosto | null): PecaFiltro[] {
  if (!a) return [];
  const rosto: PecaFiltro = { parte: 'rosto', transform: transformDoQuadro(a.rosto) };
  const chapeu: PecaFiltro = { parte: 'chapeu', transform: transformDoQuadro(a.chapeu) };
  switch (filtro) {
    case 'lupa':
      // A lente é o olho direito (5): só com os olhos vistos, sem a reserva pelas orelhas.
      return a.rosto.fonte === 'olhos' && a.olhoDireito ? [rosto] : [];
    case 'detetive':
      return [chapeu, rosto];
    case 'reporter': {
      const o = a.orelhaDireita;
      if (!o) return [chapeu];
      const lapis = `translate(${n(o.x, 2)} ${n(o.y, 2)}) rotate(${n(a.chapeu.graus, 2)}) scale(${n(a.chapeu.escala, 3)}) `
        + `translate(${-ORELHA_DIREITA_REF.x} ${-ORELHA_DIREITA_REF.y})`;
      return [{ parte: 'lapis', transform: lapis }, chapeu];
    }
    case 'heroi':
      return a.capa ? [{ parte: 'capa', transform: transformDoQuadro(a.capa) }, rosto] : [rosto];
  }
}
