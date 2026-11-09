import type { CSSProperties } from 'react';

/**
 * Formas do design system Conectando (FR-15), em `./svg/` sem `<metadata>`.
 * O `viewBox` de cada arquivo é a caixa real do desenho (nada vaza nem é cortado);
 * `data-viewbox-original` guarda o do design system, usado nas ilustrações por tema.
 */
const ARQUIVOS = import.meta.glob('./svg/*.svg', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

export type IdForma =
  | 'marca-estrela-4' | 'marca-estrela-5' | 'marca-estrela-6' | 'marca-triangulo'
  | 'anel-a' | 'anel-b' | 'anel-c' | 'deco-arco' | 'deco-e' | 'deco-explosao-dir' | 'conectando-assinatura';

interface Info { vb: string; vbOriginal: string; corpo: string }

const proporcao = (vb: string) => {
  const [, , w, h] = vb.split(/\s+/).map(Number);
  return h! / w!;
};

const FORMAS = Object.fromEntries(Object.entries(ARQUIVOS).map(([caminho, txt]) => {
  const id = caminho.replace(/^.*\/|\.svg$/g, '');
  const raiz = txt.match(/<svg[^>]*>/)![0];
  const info: Info = {
    vb: raiz.match(/ viewBox="([^"]+)"/)![1]!,
    vbOriginal: raiz.match(/data-viewbox-original="([^"]+)"/)![1]!,
    corpo: txt.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, ''),
  };
  return [id, info];
})) as Record<IdForma, Info>;

/**
 * Uma forma com largura `largura` (em unidades de tela: 1 = 1 px em 1366×768, `--u`) e altura pela proporção do desenho,
 * sem distorção. `quadrado`: caixa quadrada com o desenho centrado (marcadores girados). `original`: viewBox do design system
 * com o desenho vazando para fora (ilustrações por tema, recortadas pelo painel).
 */
export function Forma({ id, largura, quadrado, original, className, style }: {
  id: IdForma;
  largura: number;
  quadrado?: boolean;
  original?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  const f = FORMAS[id];
  const vb = original ? f.vbOriginal : f.vb;
  const altura = quadrado ? largura : largura * proporcao(vb);
  return (
    <svg
      className={className}
      viewBox={vb}
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
      focusable="false"
      data-forma={id}
      style={{
        display: 'block',
        flex: 'none',
        width: `calc(${largura} * var(--u, 1px))`,
        height: `calc(${Math.round(altura * 100) / 100} * var(--u, 1px))`,
        overflow: original ? 'visible' : 'hidden',
        ...style,
      }}
      dangerouslySetInnerHTML={{ __html: f.corpo }}
    />
  );
}
