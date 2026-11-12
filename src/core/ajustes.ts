import { MODOS, MODO_PADRAO, MODO_ROTULO, type ModoJogo } from './modos';
import { TEMAS, type Tema } from './types';

/**
 * Ajustes do estande (FR-9, v12.0.0; até a v11.0.0, "Configurações" em `modos.ts`): itens, grupos, opções, padrões,
 * leitura e gravação no armazenamento local e o teclado do painel. Lógica pura, sem React.
 */

/** AC-9.27: "Misturada" (aleatória) e "Crescente" usam todos os níveis; os outros, só aquele nível. */
export type FiltroDificuldade = 'misturada' | 'facil' | 'medio' | 'dificil' | 'crescente';
export type Sensibilidade = 'menor' | 'normal' | 'maior';
export type Volume = 'baixo' | 'medio' | 'alto';

export interface Ajustes {
  noticiasPorPartida: number;
  tempoCardS: number;
  feedbackS: number;
  /** 0 = desligada (AC-5.2, AC-9.26). */
  voltaResumoS: number;
  /** Temas ligados, na ordem de `TEMAS`; nunca vazio (AC-9.27). */
  temas: Tema[];
  dificuldade: FiltroDificuldade;
  modo: ModoJogo;
  sensibilidade: Sensibilidade;
  toleranciaS: number;
  som: boolean;
  volume: Volume;
  foto: boolean;
  qrFontes: boolean;
  tutorial: boolean;
}

/** AC-9.4. */
export const AJUSTES_PADRAO: Ajustes = {
  noticiasPorPartida: 10, tempoCardS: 15, feedbackS: 3, voltaResumoS: 0,
  temas: [...TEMAS], dificuldade: 'misturada',
  modo: MODO_PADRAO, sensibilidade: 'normal', toleranciaS: 10,
  som: true, volume: 'alto', foto: true, qrFontes: true, tutorial: false,
};

/** AC-9.28: multiplicador dos limiares dos gestos (Menor exige gesto maior). Normal = limiares atuais. */
export const MULTIPLICADOR_SENSIBILIDADE: Record<Sensibilidade, number> = { menor: 1.25, normal: 1, maior: 0.8 };
/** AC-9.29: fração do volume atual dos sons (Alto = como antes da v12.0.0). */
export const FATOR_VOLUME: Record<Volume, number> = { baixo: 0.3, medio: 0.6, alto: 1 };

/** Itens com uma lista de valores (←/→). */
export type ItemValor = Exclude<keyof Ajustes, 'temas'>;
export type ItemAjuste = ItemValor | 'temas' | 'revisar' | 'restaurar';
export type GrupoAjuste = 'partida' | 'conteudo' | 'deteccao' | 'midia' | 'questoes';

export const GRUPO_ROTULO: Record<GrupoAjuste, string> = {
  partida: 'Partida', conteudo: 'Conteúdo', deteccao: 'Detecção', midia: 'Mídia', questoes: 'Questões',
};

export const OPCOES: { [K in ItemValor]: readonly Ajustes[K][] } = {
  noticiasPorPartida: [5, 8, 10, 12, 15, 20],
  tempoCardS: [10, 15, 20, 25, 30, 45, 60],
  feedbackS: [3, 5, 8, 10, 15],
  voltaResumoS: [0, 30, 60, 120],
  dificuldade: ['misturada', 'facil', 'medio', 'dificil', 'crescente'],
  modo: MODOS,
  sensibilidade: ['menor', 'normal', 'maior'],
  toleranciaS: [5, 10, 20],
  som: [true, false],
  volume: ['baixo', 'medio', 'alto'],
  foto: [true, false],
  qrFontes: [true, false],
  tutorial: [true, false],
};

export interface ItemPainel { id: ItemAjuste; grupo: GrupoAjuste | null; rotulo: string }

/** AC-9.1: ordem do painel. */
export const ITENS_AJUSTES: readonly ItemPainel[] = [
  { id: 'noticiasPorPartida', grupo: 'partida', rotulo: 'Notícias por partida' },
  { id: 'tempoCardS', grupo: 'partida', rotulo: 'Tempo por card' },
  { id: 'feedbackS', grupo: 'partida', rotulo: 'Tempo do feedback' },
  { id: 'voltaResumoS', grupo: 'partida', rotulo: 'Volta automática do resumo' },
  { id: 'temas', grupo: 'conteudo', rotulo: 'Temas' },
  { id: 'dificuldade', grupo: 'conteudo', rotulo: 'Dificuldade' },
  { id: 'modo', grupo: 'deteccao', rotulo: 'Modo de jogo' },
  { id: 'sensibilidade', grupo: 'deteccao', rotulo: 'Sensibilidade do gesto' },
  { id: 'toleranciaS', grupo: 'deteccao', rotulo: 'Tolerância sem pessoa' },
  { id: 'som', grupo: 'midia', rotulo: 'Som' },
  { id: 'volume', grupo: 'midia', rotulo: 'Volume' },
  { id: 'foto', grupo: 'midia', rotulo: 'Foto no resumo' },
  { id: 'qrFontes', grupo: 'midia', rotulo: 'QR das fontes' },
  { id: 'tutorial', grupo: 'midia', rotulo: 'Tutorial' },
  { id: 'revisar', grupo: 'questoes', rotulo: 'Revisar questões' },
  { id: 'restaurar', grupo: null, rotulo: 'Restaurar padrão' },
];

/** Itens mostrados: "Revisar questões" só quando o painel Questões existe (Fase 44). */
export function itensDoPainel(revisarQuestoes: boolean): ItemPainel[] {
  return ITENS_AJUSTES.filter((i) => revisarQuestoes || i.id !== 'revisar');
}

export const ehItemValor = (id: ItemAjuste): id is ItemValor => id in OPCOES;

// ---------- Armazenamento ----------

export interface Armazenamento {
  getItem(chave: string): string | null;
  setItem(chave: string, valor: string): void;
}

/** As cinco primeiras chaves e formatos são os da v1.1.0 a v11.0.0 (FR-9: continuam valendo). */
const CHAVE = {
  modo: 'match-do-saber:modo',
  tempoCardS: 'match-do-saber:tempoCard',
  som: 'match-do-saber:som',
  foto: 'match-do-saber:foto',
  tutorial: 'match-do-saber:tutorial',
  noticiasPorPartida: 'match-do-saber:noticiasPorPartida',
  feedbackS: 'match-do-saber:tempoFeedback',
  voltaResumoS: 'match-do-saber:voltaResumo',
  // Guarda os desligados: um tema novo (ex.: politica, v12.0.0) nasce ligado.
  temas: 'match-do-saber:temasDesligados',
  dificuldade: 'match-do-saber:dificuldade',
  sensibilidade: 'match-do-saber:sensibilidade',
  toleranciaS: 'match-do-saber:tolerancia',
  volume: 'match-do-saber:volume',
  qrFontes: 'match-do-saber:qrFontes',
} as const satisfies Record<keyof Ajustes, string>;

/** Liga/desliga como texto: "ligado"/"desligado" (foto: "ligada"/"desligada", como na v8.0.0). */
const FEMININO = new Set<keyof Ajustes>(['foto']);
const texto = (item: keyof Ajustes, v: boolean) => (FEMININO.has(item) ? (v ? 'ligada' : 'desligada') : (v ? 'ligado' : 'desligado'));

function ler(a: Armazenamento | null, chave: string): string | null {
  try {
    return a?.getItem(chave) ?? null;
  } catch {
    return null;
  }
}

function lerItem<K extends ItemValor>(a: Armazenamento | null, item: K): Ajustes[K] {
  const bruto = ler(a, CHAVE[item]);
  const opcoes = OPCOES[item] as readonly unknown[];
  let valor: unknown = bruto;
  if (typeof opcoes[0] === 'number') valor = bruto === null || bruto.trim() === '' ? NaN : Number(bruto);
  else if (typeof opcoes[0] === 'boolean') valor = bruto === texto(item, true) ? true : bruto === texto(item, false) ? false : null;
  return (opcoes.includes(valor) ? valor : AJUSTES_PADRAO[item]) as Ajustes[K];
}

function lerTemas(a: Armazenamento | null): Tema[] {
  const desligados = new Set((ler(a, CHAVE.temas) ?? '').split(',').map((t) => t.trim()));
  const ligados = TEMAS.filter((t) => !desligados.has(t));
  return ligados.length ? ligados : [...TEMAS];
}

export function lerAjustes(a: Armazenamento | null): Ajustes {
  const aj = { temas: lerTemas(a) } as Ajustes;
  for (const item of Object.keys(OPCOES) as ItemValor[]) (aj as unknown as Record<string, unknown>)[item] = lerItem(a, item);
  return aj;
}

export function salvarAjustes(a: Armazenamento | null, aj: Ajustes): void {
  try {
    for (const item of Object.keys(OPCOES) as ItemValor[]) {
      const v = aj[item];
      a?.setItem(CHAVE[item], typeof v === 'boolean' ? texto(item, v) : String(v));
    }
    a?.setItem(CHAVE.temas, TEMAS.filter((t) => !aj.temas.includes(t)).join(','));
  } catch {
    // Armazenamento bloqueado: as escolhas valem até o jogo ser fechado.
  }
}

// ---------- Valores ----------

/** ←/→ (AC-9.2): no limite da lista devolve o mesmo objeto (AC-9.17). */
export function mudarValor(aj: Ajustes, item: ItemValor, passo: -1 | 1): Ajustes {
  const lista = OPCOES[item] as readonly unknown[];
  const i = lista.indexOf(aj[item]);
  const j = Math.max(0, Math.min(lista.length - 1, i + passo));
  return j === i ? aj : ({ ...aj, [item]: lista[j] } as Ajustes);
}

/** AC-9.27: liga/desliga um tema; o último ligado não desliga. */
export function alternarTema(aj: Ajustes, tema: Tema): Ajustes {
  const ligado = aj.temas.includes(tema);
  if (ligado && aj.temas.length === 1) return aj;
  const temas = TEMAS.filter((t) => (t === tema ? !ligado : aj.temas.includes(t)));
  return { ...aj, temas };
}

const ROTULO_DIFICULDADE: Record<FiltroDificuldade, string> = {
  misturada: 'Misturada', facil: 'Só fácil', medio: 'Só médio', dificil: 'Só difícil', crescente: 'Crescente',
};
const ROTULO_SENSIBILIDADE: Record<Sensibilidade, string> = { menor: 'Menor', normal: 'Normal', maior: 'Maior' };
const ROTULO_VOLUME: Record<Volume, string> = { baixo: 'Baixo', medio: 'Médio', alto: 'Alto' };

export function rotuloValor<K extends ItemValor>(item: K, valor: Ajustes[K]): string {
  switch (item) {
    case 'noticiasPorPartida': return String(valor);
    case 'tempoCardS': case 'feedbackS': case 'toleranciaS': return `${valor} s`;
    case 'voltaResumoS': return valor === 0 ? 'Desligada' : `${valor} s`;
    case 'dificuldade': return ROTULO_DIFICULDADE[valor as FiltroDificuldade];
    case 'modo': return MODO_ROTULO[valor as ModoJogo];
    case 'sensibilidade': return ROTULO_SENSIBILIDADE[valor as Sensibilidade];
    case 'volume': return ROTULO_VOLUME[valor as Volume];
    case 'foto': return valor ? 'Ligada' : 'Desligada';
    default: return valor ? 'Ligado' : 'Desligado';
  }
}

const NO_RESUMO = new Set<keyof Ajustes>(['modo', 'noticiasPorPartida', 'tempoCardS', 'som']);

/** AC-9.2: algum ajuste além dos que o resumo mostra está fora do padrão. */
export function ajustesPersonalizados(aj: Ajustes): boolean {
  if (aj.temas.length !== TEMAS.length) return true;
  return (Object.keys(OPCOES) as ItemValor[]).some((k) => !NO_RESUMO.has(k) && aj[k] !== AJUSTES_PADRAO[k]);
}

/** AC-9.2: resumo da tela de espera. */
export function resumoAjustes(aj: Ajustes): string {
  const base = `Modo: ${MODO_ROTULO[aj.modo]} · ${aj.noticiasPorPartida} notícias · ${aj.tempoCardS} s por card · Som: ${aj.som ? 'ligado' : 'desligado'}`;
  return ajustesPersonalizados(aj) ? `${base} · Ajustes personalizados` : base;
}

// ---------- Teclado do painel ----------

/** `item`: índice em `itensDoPainel`; `tema`: tema destacado no item Temas; `confirmarRestauro`: AC-9.30. */
export interface PainelAjustes { item: number; tema: number; confirmarRestauro: boolean }
export const PAINEL_INICIAL: PainelAjustes = { item: 0, tema: 0, confirmarRestauro: false };

export interface RespostaTecla {
  painel: PainelAjustes;
  /** Ajustes novos, quando a tecla mudou algum valor. */
  ajustes?: Ajustes;
  fechar?: boolean;
  /** AC-9.31: abrir o painel Questões. */
  revisar?: boolean;
}

/** AC-9.2, AC-9.3, AC-9.30, AC-9.31: o que cada tecla faz com o painel aberto. */
export function teclaNoPainel(p: PainelAjustes, aj: Ajustes, tecla: string, itens: readonly ItemPainel[]): RespostaTecla {
  const n = itens.length;
  const item = itens[p.item]?.id;
  if (tecla === 'Escape' || tecla === 'Enter' || tecla === 'm' || tecla === 'M') return { painel: p, fechar: true };
  if (tecla === 'ArrowDown') return { painel: { ...p, item: (p.item + 1) % n, confirmarRestauro: false } };
  if (tecla === 'ArrowUp') return { painel: { ...p, item: (p.item + n - 1) % n, confirmarRestauro: false } };
  const lado = tecla === 'ArrowLeft' ? -1 : tecla === 'ArrowRight' ? 1 : 0;
  const espaco = tecla === ' ' || tecla === 'Spacebar';
  if (item === 'temas') {
    if (lado) return { painel: { ...p, tema: Math.max(0, Math.min(TEMAS.length - 1, p.tema + lado)) } };
    if (espaco) {
      const novo = alternarTema(aj, TEMAS[p.tema]!);
      return novo === aj ? { painel: p } : { painel: p, ajustes: novo };
    }
    return { painel: p };
  }
  if (item === 'restaurar') {
    if (espaco && !p.confirmarRestauro) return { painel: { ...p, confirmarRestauro: true } };
    if (espaco) return { painel: { ...p, confirmarRestauro: false }, ajustes: { ...AJUSTES_PADRAO, temas: [...TEMAS] } };
    if (lado) return { painel: { ...p, confirmarRestauro: false } };
    return { painel: p };
  }
  if (item === 'revisar') return espaco ? { painel: p, revisar: true } : { painel: p };
  if (item && ehItemValor(item) && lado) {
    const novo = mudarValor(aj, item, lado);
    return novo === aj ? { painel: p } : { painel: p, ajustes: novo };
  }
  return { painel: p };
}

// ---------- Ajustes → partida ----------

/** O que o reducer da partida recebe dos Ajustes (FR-1, FR-9; `Contexto` em ./partida). */
export interface ContextoAjustes {
  tempoCardMs: number;
  tempoFeedbackMs: number;
  toleranciaMs: number;
  /** 0 = desligada. */
  voltaResumoMs: number;
  /** AC-9.21: nos modos Mão e Cabeça a ausência não pausa nem encerra a partida. */
  ignorarAusencia: boolean;
  sorteio: { quantidade: number; temas: Tema[]; dificuldade: FiltroDificuldade };
}

export function contextoDosAjustes(aj: Ajustes): ContextoAjustes {
  return {
    tempoCardMs: aj.tempoCardS * 1000,
    tempoFeedbackMs: aj.feedbackS * 1000,
    toleranciaMs: aj.toleranciaS * 1000,
    voltaResumoMs: aj.voltaResumoS * 1000,
    ignorarAusencia: aj.modo !== 'corpo',
    sorteio: { quantidade: aj.noticiasPorPartida, temas: aj.temas, dificuldade: aj.dificuldade },
  };
}
