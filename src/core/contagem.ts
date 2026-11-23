import type { Ajustes } from './ajustes';
import { jogaveis, oculta } from './banco';
import { filtrarConteudo } from './sorteio';
import { TEMAS, type NoticiaBanco, type Tema } from './types';

/** Contagens do painel Ajustes e da espera (AC-9.1, AC-9.27, AC-6.4, AC-7.12). */
export interface ContagemConteudo {
  /** Jogáveis dentro dos filtros de conteúdo (o que a próxima partida pode sortear). */
  jogaveis: number;
  jogaveisSemFiltro: number;
  /** Linhas do banco, inclusive rascunhos, inválidas e ocultas. */
  total: number;
  ocultas: number;
  /** Jogáveis de cada tema, com o filtro de dificuldade (ligado ou não o tema). */
  porTema: Record<Tema, number>;
}

export function contarConteudo(banco: readonly NoticiaBanco[], aj: Pick<Ajustes, 'temas' | 'dificuldade'>): ContagemConteudo {
  const todas = jogaveis(banco);
  const porNivel = filtrarConteudo(todas, { dificuldade: aj.dificuldade });
  const porTema = Object.fromEntries(TEMAS.map((t) => [t, porNivel.filter((n) => n.tema === t).length])) as Record<Tema, number>;
  return {
    jogaveis: filtrarConteudo(todas, aj).length,
    jogaveisSemFiltro: todas.length,
    total: banco.length,
    ocultas: banco.filter(oculta).length,
    porTema,
  };
}

/** AC-9.1: "N jogáveis de M no banco (K ocultas)". */
export function textoContagem(c: ContagemConteudo): string {
  const j = c.jogaveis === 1 ? 'jogável' : 'jogáveis';
  const o = c.ocultas === 1 ? 'oculta' : 'ocultas';
  return `${c.jogaveis} ${j} de ${c.total} no banco (${c.ocultas} ${o})`;
}

/** AC-6.4: aviso da espera quando nenhuma partida pode começar; null quando pode. */
export function avisoSemNoticias(c: ContagemConteudo): string | null {
  if (c.jogaveis > 0) return null;
  return c.jogaveisSemFiltro > 0 ? 'Nenhuma notícia para os ajustes atuais: revise Ajustes › Conteúdo' : 'Nenhuma notícia publicada';
}
