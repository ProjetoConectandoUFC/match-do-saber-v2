import type { FiltroDificuldade } from './ajustes';
import type { Noticia, Tema } from './types';

/** Filtros de conteúdo dos Ajustes (AC-9.27). Sem `temas`, todos; sem `dificuldade`, "Misturada". */
export interface FiltrosConteudo { temas?: readonly Tema[]; dificuldade?: FiltroDificuldade }
/** `quantidade`: notícias por partida (AC-9.23; padrão 10). */
export interface OpcoesSorteio extends FiltrosConteudo { quantidade?: number }

function embaralhar<T>(itens: T[], rng: () => number): T[] {
  const a = [...itens];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

/** AC-9.27: só os temas ligados e, em "Só fácil/médio/difícil", só aquele nível (sem dificuldade fica de fora). */
export function filtrarConteudo(noticias: readonly Noticia[], f: FiltrosConteudo = {}): Noticia[] {
  const temas = f.temas ? new Set(f.temas) : null;
  const nivel = f.dificuldade && f.dificuldade !== 'misturada' && f.dificuldade !== 'crescente' ? f.dificuldade : null;
  return noticias.filter((n) => (!temas || temas.has(n.tema)) && (!nivel || n.dificuldade === nivel));
}

/** "Crescente": sem dificuldade conta como médio (AC-9.27). */
const PESO = { facil: 0, medio: 1, dificil: 2 } as const;

/**
 * Cards de uma partida (FR-5, AC-6.1 a AC-6.4): N cards, ⌊N/2⌋ de um lado e ⌈N/2⌉ do outro (com N ímpar, o lado
 * com uma a mais é sorteado); um lado com menos de ⌈N/2⌉ entra inteiro e o outro completa (AC-6.2, v12.0.1); com
 * menos de N, todas. Ordem aleatória ou, em "Crescente", por nível (aleatória dentro de cada nível).
 */
export function sortear(noticias: readonly Noticia[], rng: () => number, opcoes: OpcoesSorteio = {}): Noticia[] {
  const total = opcoes.quantidade ?? 10;
  const base = filtrarConteudo(noticias, opcoes);
  const v = embaralhar(base.filter((x) => x.veredito === 'verdadeira'), rng);
  const f = embaralhar(base.filter((x) => x.veredito === 'falsa'), rng);
  const menor = Math.floor(total / 2);
  // N par: metade e metade. N ímpar: sorteia qual lado leva a uma a mais.
  const alvoV = total % 2 === 0 || rng() < 0.5 ? menor : total - menor;
  let nv = Math.min(v.length, alvoV);
  let nf = Math.min(f.length, total - alvoV);
  let falta = total - nv - nf;
  const extraV = Math.min(falta, v.length - nv);
  nv += extraV;
  falta -= extraV;
  nf += Math.min(falta, f.length - nf);
  const cards = embaralhar([...v.slice(0, nv), ...f.slice(0, nf)], rng);
  if (opcoes.dificuldade !== 'crescente') return cards;
  // Ordenação estável sobre a ordem já embaralhada = aleatória dentro de cada nível.
  return cards
    .map((n, i) => ({ n, i }))
    .sort((a, b) => PESO[a.n.dificuldade ?? 'medio'] - PESO[b.n.dificuldade ?? 'medio'] || a.i - b.i)
    .map((x) => x.n);
}
