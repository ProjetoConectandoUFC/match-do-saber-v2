/**
 * Painel "Questões" (Story 16, FR-17, v12.0.0): leitura, depuração e revisão do banco. Lógica pura.
 * Usa a mesma validação (`validarBanco`, AC-7.3) e a mesma regra de jogável (`jogaveis`, AC-7.7) do sorteio,
 * para o painel nunca dizer que uma questão entra no jogo quando ela não entra.
 * As questões são identificadas pela posição no banco (`indice`): um id repetido ou vazio não confunde as ações.
 */
import { jogaveis, oculta, validarBanco, type Problemas } from './banco';
import { dominio, rotuloFonte, type RotuloFonte } from './fontesRodada';
import { MAX_TITULO_CURTO, type ColunaBanco, type NoticiaBanco } from './types';

export type SituacaoQuestao = 'jogavel' | 'oculta' | 'rascunho' | 'invalida';

export interface Questao {
  /** Posição no banco (linha do CSV menos o cabeçalho). */
  indice: number;
  noticia: NoticiaBanco;
  problemas: Problemas;
  /** Entra nas partidas (mesma regra de `jogaveis`). */
  jogavel: boolean;
  /** Inválida (AC-7.3) > oculta (AC-7.12) > rascunho; senão, jogável. */
  situacao: SituacaoQuestao;
  /** AC-16.4: por que não entra nas partidas, em linguagem simples; vazio quando entra. */
  motivos: string[];
}

const FALTA: Partial<Record<ColunaBanco, string>> = {
  id: 'Falta o ID', titulo: 'Falta o título', descricao: 'Falta a descrição', saiba_mais: 'Falta o "saiba mais"',
  veredito: 'Falta o veredito', explicacao: 'Falta a explicação', tecnica: 'Falta a técnica', tema: 'Falta o tema',
  fonte_url: 'Falta o link da fonte', status: 'Falta o status',
};
const ROTULO_LISTA: Partial<Record<ColunaBanco, string>> = {
  veredito: 'Veredito', tecnica: 'Técnica', tema: 'Tema', status: 'Status', dificuldade: 'Dificuldade',
};

/** Traduz o problema de um campo (mensagens de `validarNoticia`) para a frase do painel. */
function motivoDoCampo(c: ColunaBanco, problema: string, n: NoticiaBanco): string {
  if (problema === 'campo obrigatório') return FALTA[c] ?? `Falta ${c}`;
  switch (c) {
    case 'id': return problema === 'id repetido' ? 'ID repetido (outra questão usa o mesmo)' : 'ID com caracteres não permitidos (use letras, números e hífen)';
    case 'fonte_url': return 'fonte_url não é um link';
    case 'fontes_extras': return 'Um link de outras fontes não é um link';
    case 'revisado_por': return 'Sem revisor';
    case 'visivel': return `Visibilidade "${n.visivel}" não é sim nem nao`;
    case 'titulo_curto': return `Título curto passa de ${MAX_TITULO_CURTO} caracteres`;
    default: return ROTULO_LISTA[c] ? `${ROTULO_LISTA[c]} "${n[c]}" não está na lista` : `${c}: ${problema}`;
  }
}

export function analisarQuestoes(banco: readonly NoticiaBanco[]): Questao[] {
  const problemasPorIndice = new Map(validarBanco(banco).invalidas.map((x) => [x.indice, x.problemas]));
  const noJogo = new Set(jogaveis(banco).map((x) => x.id)); // ids repetidos já ficaram de fora (inválidos)
  return banco.map((noticia, indice) => {
    const problemas = problemasPorIndice.get(indice) ?? {};
    const invalida = problemasPorIndice.has(indice);
    const jogavel = !invalida && noJogo.has(noticia.id);
    const motivos = (Object.entries(problemas) as [ColunaBanco, string][]).map(([c, p]) => motivoDoCampo(c, p, noticia));
    if (!jogavel) {
      if (noticia.status === 'rascunho') motivos.push('Rascunho');
      if (oculta(noticia)) motivos.push('Oculta');
      if (!(noticia.revisado_por ?? '').trim() && !problemas.revisado_por) motivos.push('Sem revisor');
    }
    const situacao: SituacaoQuestao = invalida ? 'invalida' : jogavel ? 'jogavel' : oculta(noticia) ? 'oculta' : 'rascunho';
    return { indice, noticia, problemas, jogavel, situacao, motivos };
  });
}

export interface ContagemQuestoes {
  total: number;
  jogaveis: number;
  ocultas: number;
  rascunhos: number;
  invalidas: number;
  /** Entre as jogáveis. */
  verdadeiras: number;
  falsas: number;
}

/** AC-16.1. Ocultas e rascunhos contam pela coluna, como no painel Ajustes (AC-9.1); podem também ser inválidas. */
export function contarQuestoes(qs: readonly Questao[]): ContagemQuestoes {
  const jog = qs.filter((q) => q.jogavel);
  return {
    total: qs.length,
    jogaveis: jog.length,
    ocultas: qs.filter((q) => oculta(q.noticia)).length,
    rascunhos: qs.filter((q) => q.noticia.status === 'rascunho').length,
    invalidas: qs.filter((q) => q.situacao === 'invalida').length,
    verdadeiras: jog.filter((q) => q.noticia.veredito === 'verdadeira').length,
    falsas: jog.filter((q) => q.noticia.veredito === 'falsa').length,
  };
}

export interface FiltrosQuestoes {
  texto: string;
  /** '' = todos. */
  veredito: string;
  tema: string;
  /** '' = todas; 'sem' = sem dificuldade. */
  dificuldade: string;
  status: string;
  visibilidade: '' | 'visivel' | 'oculta';
  soJogaveis: boolean;
  /** Só as inválidas (com problema de validação, AC-7.3). */
  soProblemas: boolean;
}

export const FILTROS_VAZIOS: FiltrosQuestoes = {
  texto: '', veredito: '', tema: '', dificuldade: '', status: '', visibilidade: '', soJogaveis: false, soProblemas: false,
};

const normalizar = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** AC-16.3: a questão passa em todos os filtros. */
export function filtrarQuestoes(qs: readonly Questao[], f: FiltrosQuestoes): Questao[] {
  const t = normalizar(f.texto.trim());
  return qs.filter(({ noticia: n, jogavel, situacao }) =>
    (!t || normalizar([n.id, n.titulo, n.descricao, n.saiba_mais, n.fonte_nome, n.fonte_url, n.fontes_extras, n.revisado_por].join(' ')).includes(t))
    && (!f.veredito || n.veredito === f.veredito)
    && (!f.tema || n.tema === f.tema)
    && (!f.dificuldade || (f.dificuldade === 'sem' ? !n.dificuldade : n.dificuldade === f.dificuldade))
    && (!f.status || n.status === f.status)
    && (!f.visibilidade || (f.visibilidade === 'oculta') === oculta(n))
    && (!f.soJogaveis || jogavel)
    && (!f.soProblemas || situacao === 'invalida'));
}

export interface FonteQuestao {
  rotulo: RotuloFonte | 'Outra fonte:';
  /** `fonte_nome` ou o domínio; vazio quando o texto não é um link. */
  nome: string;
  url: string;
}

/** AC-16.2: "Fonte:" (verdadeira) ou "Desmentido por:" (falsa), depois cada link de `fontes_extras` com o domínio. */
export function fontesDaQuestao(n: NoticiaBanco): FonteQuestao[] {
  const fontes: FonteQuestao[] = [];
  const url = (n.fonte_url ?? '').trim();
  if (url) {
    const rotulo = n.veredito === 'verdadeira' || n.veredito === 'falsa' ? rotuloFonte(n.veredito) : 'Fonte:';
    fontes.push({ rotulo, nome: dominio(url) ? (n.fonte_nome ?? '').trim() || dominio(url) : '', url });
  }
  for (const extra of (n.fontes_extras ?? '').split(/\s+/).filter(Boolean)) fontes.push({ rotulo: 'Outra fonte:', nome: dominio(extra), url: extra });
  return fontes;
}

const trocar = (banco: readonly NoticiaBanco[], indice: number, mudanca: Partial<NoticiaBanco>) =>
  banco.map((n, i) => (i === indice ? { ...n, ...mudanca } : n));

/**
 * AC-16.5: aprova com o nome de quem revisou (preenche `revisado_por` e `status = aprovada`), só se a questão
 * ficar válida (Princípio 1; mesma validação do editor, AC-7.3).
 */
export function aprovarQuestao(banco: readonly NoticiaBanco[], indice: number, revisor: string): { banco: NoticiaBanco[] } | { erro: string } {
  const nome = revisor.trim();
  if (!nome) return { erro: 'Diga quem revisou para aprovar' };
  const novo = trocar(banco, indice, { status: 'aprovada', revisado_por: nome });
  const q = analisarQuestoes(novo)[indice];
  if (!q) return { erro: 'Questão não encontrada' };
  if (q.situacao === 'invalida') return { erro: `Corrija antes de aprovar: ${q.motivos.filter((m) => m !== 'Oculta').join('; ')}` };
  return { banco: novo };
}

export const voltarParaRascunho = (banco: readonly NoticiaBanco[], indice: number) => trocar(banco, indice, { status: 'rascunho' });

/** AC-7.12: oculta grava `nao`; mostrar no jogo grava vazio (= visível), como o interruptor do editor. */
export const alterarVisibilidade = (banco: readonly NoticiaBanco[], indice: number, visivel: boolean) =>
  trocar(banco, indice, { visivel: visivel ? '' : 'nao' });

/** AC-16.6: índice da questão anterior (-1) ou próxima (+1) na lista filtrada, parando nas pontas. */
export function questaoVizinha(lista: readonly Questao[], atual: number | null, delta: 1 | -1): number | null {
  if (!lista.length) return null;
  const pos = lista.findIndex((q) => q.indice === atual);
  if (pos === -1) return lista[0]!.indice;
  return lista[Math.min(lista.length - 1, Math.max(0, pos + delta))]!.indice;
}
