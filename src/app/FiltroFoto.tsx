import type { AncorasRosto } from '../core/ancorasRosto';
import type { IdFiltro } from '../core/faixas';
import { pecasDoFiltro, type ParteFiltro } from '../core/filtrosFoto';
import s from './App.module.css';

/**
 * Filtro da faixa por cima da foto do resumo (AC-13.8, v11.0.0). Os desenhos são cópias de `docs/visual/filtros/`
 * em `./filtros/`, com as partes marcadas por `<!-- parte:… -->` (o desenho não muda); cada parte vai para a foto
 * pelo `transform` de `pecasDoFiltro`. É uma camada SVG separada: os pixels da foto não mudam (FR-13).
 */
const ARQUIVOS = import.meta.glob('./filtros/*.svg', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
const ARQUIVO: Record<IdFiltro, string> = {
  lupa: './filtros/filtro-1-lupa.svg',
  detetive: './filtros/filtro-2-detetive.svg',
  reporter: './filtros/filtro-3-reporter.svg',
  heroi: './filtros/filtro-4-heroi.svg',
};

interface Desenho { defs: string; partes: Partial<Record<ParteFiltro, string>> }

function lerDesenho(txt: string): Desenho {
  const defs = /<defs>([\s\S]*?)<\/defs>/.exec(txt)?.[1] ?? '';
  const partes: Partial<Record<ParteFiltro, string>> = {};
  for (const [, parte, corpo] of txt.matchAll(/<!-- parte:(\w+) -->([\s\S]*?)<!-- \/parte -->/g)) {
    const p = parte as ParteFiltro;
    partes[p] = (partes[p] ?? '') + corpo; // uma parte pode vir em mais de um trecho (pintura em ordem)
  }
  return { defs, partes };
}

const DESENHOS = Object.fromEntries(
  (Object.entries(ARQUIVO) as [IdFiltro, string][]).map(([id, caminho]) => [id, lerDesenho(ARQUIVOS[caminho] ?? '')]),
) as Record<IdFiltro, Desenho>;

export function FiltroFoto({ filtro, ancoras }: { filtro: IdFiltro; ancoras: AncorasRosto | null | undefined }) {
  const pecas = pecasDoFiltro(filtro, ancoras ?? null);
  if (!ancoras || pecas.length === 0) return null;
  const desenho = DESENHOS[filtro];
  return (
    <svg
      className={s.filtroFoto}
      data-filtro={filtro}
      aria-hidden="true"
      focusable="false"
      viewBox={`0 0 ${ancoras.largura} ${ancoras.altura}`}
      // Mesmo recorte da foto no quadro do polaroid (`object-fit: cover`, centrado).
      preserveAspectRatio="xMidYMid slice"
    >
      <defs dangerouslySetInnerHTML={{ __html: desenho.defs }} />
      {pecas.map((p, i) => (
        <g key={`${p.parte}-${i}`} data-parte={p.parte} transform={p.transform} dangerouslySetInnerHTML={{ __html: desenho.partes[p.parte] ?? '' }} />
      ))}
    </svg>
  );
}
