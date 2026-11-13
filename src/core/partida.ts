import { sortear, type OpcoesSorteio } from './sorteio';
import type { PerfilTutorial } from './tutorial';
import type { Noticia, Veredito } from './types';

export const TEMPOS = {
  cardMs: 15000,
  feedbackMs: 3000,
  saidaMs: 250,
  /** v12.0.0 (AC-4.9, AC-9.25): carimbada do veredito no começo do resultado; soma ao feedback, não desconta. */
  carimboMs: 300,
  calibracaoMs: 2000,
  ausenciaMs: 10000,
  /** v13.0.0 (AC-17.5): o fan com todas as cartas da partida abre e fecha; soma à partida. */
  aberturaFanMs: 1500,
  /** v13.0.0 (AC-17.6): cada carta sai do fan e pousa no centro; soma ao tempo por card, não desconta. */
  distribuirMs: 900,
} as const;


export type Resultado = 'acerto' | 'erro' | 'tempo';
export interface Presenca { presente: boolean; centralizado: boolean }
export type Entrada = 'corpo' | 'alternativa';
export interface Partida { cards: Noticia[]; resultados: Resultado[]; entrada: Entrada }

export type EstadoCard = {
  tela: 'card';
  partida: Partida;
  indice: number;
  restanteMs: number;
  saibaMais: boolean;
  ausenteMs: number | null;
  /** v13.0.0 (AC-17.6): > 0 enquanto a carta sai do fan; nesse tempo o cronômetro não corre e nada é aceito. */
  distribuindoMs: number;
};

export type Estado =
  | { tela: 'espera' }
  | { tela: 'calibracao'; centradoMs: number; ausenteMs: number }
  // v13.0.0 (AC-17.5): a partida já vem sorteada, para o fan saber quantas cartas tem (`treinos` + `partida.cards`).
  | { tela: 'abertura'; partida: Partida; treinos: number; restanteMs: number }
  | EstadoCard
  // `resposta` guarda o lado escolhido (para a animação de saída); null quando o tempo esgotou.
  // `resultadoMs` (v12.0.0): quanto dura o resultado, carimbada + tempo configurado (AC-4.9, AC-9.25), gravado ao entrar; enquanto `restanteMs` for maior, o card está saindo.
  | { tela: 'feedback'; partida: Partida; indice: number; restanteMs: number; resposta: Veredito | null; resultadoMs: number }
  // `decorridoMs`: só com a volta automática ligada (AC-5.2, AC-9.26, v12.0.0).
  | { tela: 'resumo'; partida: Partida; decorridoMs?: number }
  // v10.2.0 (FR-16): treino antes da partida; `passo` indexa `Contexto.tutorial`. Sem cronômetro (AC-15.6).
  // v13.0.0: a partida (com a entrada) já está sorteada desde a abertura; `treinos` é o total de treinos dela.
  | { tela: 'tutorial'; passo: number; treinos: number; partida: Partida; distribuindoMs: number }
  | { tela: 'tutorialFeedback'; passo: number; treinos: number; partida: Partida; restanteMs: number; resposta: Veredito; resultadoMs: number };

export type Evento =
  | { tipo: 'tick'; dtMs: number; presenca: Presenca | null }
  | { tipo: 'escolha'; resposta: Veredito }
  | { tipo: 'saibaMais' }
  | { tipo: 'enter' }
  | { tipo: 'sair' };

/** `tempoCardMs`: tempo por card configurado (FR-9); sem valor, vale `TEMPOS.cardMs`. */
export interface Contexto {
  noticias: Noticia[];
  rng: () => number;
  cameraAtiva: boolean;
  tempoCardMs?: number;
  /** v6.0.0 (AC-9.21): nos modos Mão e Cabeça a ausência não pausa nem encerra a partida. */
  ignorarAusencia?: boolean;
  /** v10.2.0 (FR-16): perfis de treino; vazio ou ausente = tutorial desligado (AC-15.1). */
  tutorial?: readonly PerfilTutorial[];
  /** v12.0.0 (Ajustes, FR-9): tempo do feedback (AC-9.25); sem valor, `TEMPOS.feedbackMs`. */
  tempoFeedbackMs?: number;
  /** v12.0.0 (AC-9.28): tolerância sem pessoa no card (modo Corpo); sem valor, `TEMPOS.ausenciaMs`. */
  toleranciaMs?: number;
  /** v12.0.0 (AC-5.2, AC-9.26): volta automática do resumo; sem valor ou 0, desligada. */
  voltaResumoMs?: number;
  /** v12.0.0 (AC-9.23, AC-9.27): notícias por partida, temas e dificuldade. */
  sorteio?: OpcoesSorteio;
}

/** Tempo do resultado no feedback (AC-9.25); a saída do card soma a ele (AC-4.1). */
export const duracaoFeedbackMs = (ctx: Pick<Contexto, 'tempoFeedbackMs'>) => ctx.tempoFeedbackMs ?? TEMPOS.feedbackMs;

/**
 * Tela do resultado inteira, gravada em `resultadoMs`: a carimbada (AC-4.9) soma ao tempo configurado (AC-9.25),
 * nunca desconta. Com o padrão, 300 + 3000 ms.
 */
export const duracaoResultadoMs = (ctx: Pick<Contexto, 'tempoFeedbackMs'>) => TEMPOS.carimboMs + duracaoFeedbackMs(ctx);

export const ESTADO_INICIAL: Estado = { tela: 'espera' };
const CALIBRACAO: Estado = { tela: 'calibracao', centradoMs: 0, ausenteMs: 0 };

/** Toda carta de notícia chega distribuída do fan (AC-17.6), com o cronômetro cheio. */
function card(partida: Partida, indice: number, tempoCardMs: number = TEMPOS.cardMs): EstadoCard {
  return {
    tela: 'card', partida, indice, restanteMs: tempoCardMs, saibaMais: false, ausenteMs: null, distribuindoMs: TEMPOS.distribuirMs,
  };
}

/** A carta de treino também sai do fan (FR-16, v13.0.0). */
function treino(partida: Partida, treinos: number, passo: number): Estado {
  return { tela: 'tutorial', passo, treinos, partida, distribuindoMs: TEMPOS.distribuirMs };
}

/**
 * Começo de uma partida (AC-1.2, AC-1.6, AC-1.8, AC-5.6): sorteia já aqui, antes do treino, para a abertura do fan
 * (AC-17.5) saber o total de cartas (treinos + notícias). Sem notícias sorteáveis, fica na espera (AC-6.4).
 */
function comecar(ctx: Contexto, entrada: Entrada): Estado {
  if (ctx.noticias.length === 0) return ESTADO_INICIAL;
  const cards = sortear(ctx.noticias, ctx.rng, ctx.sorteio);
  if (cards.length === 0) return ESTADO_INICIAL;
  return {
    tela: 'abertura', partida: { cards, resultados: [], entrada }, treinos: ctx.tutorial?.length ?? 0, restanteMs: TEMPOS.aberturaFanMs,
  };
}

/** Depois da abertura: o 1º treino, com o tutorial ligado (AC-15.2), ou o 1º card. */
function primeiraCarta(partida: Partida, treinos: number, ctx: Contexto): Estado {
  return treinos > 0 ? treino(partida, treinos, 0) : card(partida, 0, ctx.tempoCardMs);
}

/** A distribuição só desconta o próprio tempo; o que sobra de um tick grande não desconta do cronômetro (AC-17.6). */
const distribuir = (distribuindoMs: number, dtMs: number) => Math.max(0, distribuindoMs - dtMs);

function registrar(e: EstadoCard, r: Resultado, resposta: Veredito | null, ctx: Contexto): Estado {
  return {
    tela: 'feedback',
    partida: { ...e.partida, resultados: [...e.partida.resultados, r] },
    indice: e.indice,
    // Escolha: o card sai antes (saidaMs); o resultado tem a carimbada e ainda fica o tempo configurado inteiro
    // (AC-4.1/AC-4.2/AC-4.9, AC-9.25).
    restanteMs: resposta === null ? duracaoResultadoMs(ctx) : duracaoResultadoMs(ctx) + TEMPOS.saidaMs,
    resposta,
    resultadoMs: duracaoResultadoMs(ctx),
  };
}

export function reduzir(estado: Estado, evento: Evento, ctx: Contexto): Estado {
  // "✕ Sair" / Esc (FR-10): encerra na hora, sem resumo; na espera não faz nada.
  if (evento.tipo === 'sair') return estado.tela === 'espera' ? estado : ESTADO_INICIAL;
  switch (estado.tela) {
    case 'espera': {
      if (ctx.noticias.length === 0) return estado;
      // v3.0.0: só o operador inicia (Enter ou "▶ Iniciar"); a presença na câmera nunca tira o jogo da espera (AC-1.1).
      // Com câmera ativa, Enter abre a calibração (AC-1.7); sem câmera, a partida começa direto (AC-1.6).
      if (evento.tipo === 'enter') return ctx.cameraAtiva ? CALIBRACAO : comecar(ctx, 'alternativa');
      return estado;
    }
    case 'calibracao': {
      if (evento.tipo === 'enter') return comecar(ctx, 'alternativa');
      if (evento.tipo !== 'tick') return estado;
      const p = evento.presenca;
      if (!p || !p.presente) {
        const ausenteMs = estado.ausenteMs + evento.dtMs;
        return ausenteMs >= TEMPOS.ausenciaMs ? ESTADO_INICIAL : { tela: 'calibracao', centradoMs: 0, ausenteMs };
      }
      if (!p.centralizado) return { tela: 'calibracao', centradoMs: 0, ausenteMs: 0 };
      const centradoMs = estado.centradoMs + evento.dtMs;
      return centradoMs >= TEMPOS.calibracaoMs ? comecar(ctx, 'corpo') : { tela: 'calibracao', centradoMs, ausenteMs: 0 };
    }
    case 'abertura': {
      // AC-17.5: só o tempo corre; escolha, "saiba mais", Enter e ausência são ignorados (Sair já foi tratado acima).
      if (evento.tipo !== 'tick') return estado;
      const restanteMs = estado.restanteMs - evento.dtMs;
      return restanteMs > 0 ? { ...estado, restanteMs } : primeiraCarta(estado.partida, estado.treinos, ctx);
    }
    case 'card': {
      // AC-17.6: durante a distribuição o cronômetro não corre, nada é aceito e a ausência não conta.
      if (estado.distribuindoMs > 0) {
        return evento.tipo === 'tick' ? { ...estado, distribuindoMs: distribuir(estado.distribuindoMs, evento.dtMs) } : estado;
      }
      if (evento.tipo === 'escolha') {
        const certo = evento.resposta === estado.partida.cards[estado.indice]!.veredito;
        return registrar(estado, certo ? 'acerto' : 'erro', evento.resposta, ctx);
      }
      if (evento.tipo === 'saibaMais') return { ...estado, saibaMais: !estado.saibaMais };
      if (evento.tipo !== 'tick') return estado;
      // Partida pelo teclado/mouse (AC-1.6) ou nos modos Mão/Cabeça (AC-9.21) não depende de presença.
      const p = estado.partida.entrada === 'alternativa' || ctx.ignorarAusencia ? null : evento.presenca;
      if (p && !p.presente) {
        const ausenteMs = (estado.ausenteMs ?? 0) + evento.dtMs;
        return ausenteMs >= (ctx.toleranciaMs ?? TEMPOS.ausenciaMs) ? ESTADO_INICIAL : { ...estado, ausenteMs };
      }
      const base: EstadoCard = { ...estado, ausenteMs: null };
      const restanteMs = base.restanteMs - evento.dtMs;
      return restanteMs <= 0 ? registrar(base, 'tempo', null, ctx) : { ...base, restanteMs };
    }
    case 'feedback': {
      if (evento.tipo !== 'tick') return estado;
      const restanteMs = estado.restanteMs - evento.dtMs;
      if (restanteMs > 0) return { ...estado, restanteMs };
      const proximo = estado.indice + 1;
      return proximo < estado.partida.cards.length
        ? card(estado.partida, proximo, ctx.tempoCardMs)
        : { tela: 'resumo', partida: estado.partida };
    }
    case 'resumo': {
      // AC-5.2/AC-9.26: com a volta automática ligada, o resumo fecha sozinho depois do tempo escolhido.
      if (evento.tipo === 'tick' && ctx.voltaResumoMs) {
        const decorridoMs = (estado.decorridoMs ?? 0) + evento.dtMs;
        return decorridoMs >= ctx.voltaResumoMs ? ESTADO_INICIAL : { ...estado, decorridoMs };
      }
      if (evento.tipo !== 'enter') return estado;
      return ctx.cameraAtiva ? CALIBRACAO : comecar(ctx, 'alternativa');
    }
    case 'tutorial': {
      // AC-15.5: Enter pula o treino (também durante a distribuição). AC-15.6: sem cronômetro, ausência nem "saiba mais".
      if (evento.tipo === 'enter') return card(estado.partida, 0, ctx.tempoCardMs);
      if (estado.distribuindoMs > 0) {
        return evento.tipo === 'tick' ? { ...estado, distribuindoMs: distribuir(estado.distribuindoMs, evento.dtMs) } : estado;
      }
      if (evento.tipo !== 'escolha') return estado;
      return {
        tela: 'tutorialFeedback', passo: estado.passo, treinos: estado.treinos, partida: estado.partida,
        restanteMs: duracaoResultadoMs(ctx) + TEMPOS.saidaMs, resposta: evento.resposta, resultadoMs: duracaoResultadoMs(ctx),
      };
    }
    case 'tutorialFeedback': {
      if (evento.tipo === 'enter') return card(estado.partida, 0, ctx.tempoCardMs);
      if (evento.tipo !== 'tick') return estado;
      const restanteMs = estado.restanteMs - evento.dtMs;
      if (restanteMs > 0) return { ...estado, restanteMs };
      const passo = estado.passo + 1;
      return passo < estado.treinos ? treino(estado.partida, estado.treinos, passo) : card(estado.partida, 0, ctx.tempoCardMs);
    }
  }
}

/**
 * Depois de uma escolha, os primeiros `TEMPOS.saidaMs` do feedback (e do feedback de treino) são a saída do card;
 * depois vem o resultado, que dura `resultadoMs` (AC-4.1, AC-9.25). Som, inclinação e tela usam esta mesma regra.
 */
export function cardSaindo(estado: Estado): boolean {
  if (estado.tela === 'feedback') return estado.resposta !== null && estado.restanteMs > estado.resultadoMs;
  if (estado.tela === 'tutorialFeedback') return estado.restanteMs > estado.resultadoMs;
  return false;
}

/** O centro do jogador é medido ao sair da calibração (FR-2): desde a v13.0.0, sempre para a abertura do fan. */
export function calibrarAoSair(antes: Estado['tela'], depois: Estado['tela']): boolean {
  return antes === 'calibracao' && depois === 'abertura';
}

/** Carta (notícia ou treino) saindo do fan até o centro (AC-17.6); som, inclinação e tela usam esta regra. */
export function distribuindo(estado: Estado): boolean {
  return (estado.tela === 'card' || estado.tela === 'tutorial') && estado.distribuindoMs > 0;
}

/**
 * Cartas ainda no fan (AC-17.3): as que não começaram a ser distribuídas, treinos e notícias. A carta em jogo (inclusive a
 * que está sendo distribuída) já saiu; a tela anima a saída dela com `distribuindoMs`. Fora da partida, nenhuma.
 */
export function cartasNoFan(estado: Estado): number {
  switch (estado.tela) {
    case 'abertura':
      return estado.treinos + estado.partida.cards.length;
    case 'tutorial':
    case 'tutorialFeedback':
      return estado.treinos - estado.passo - 1 + estado.partida.cards.length;
    case 'card':
    case 'feedback':
      return estado.partida.cards.length - estado.indice - 1;
    default:
      return 0;
  }
}

export function pontos(p: Partida): number {
  return p.resultados.filter((r) => r === 'acerto').length;
}

/** Mensagem do resumo pela proporção de acertos (AC-5.7). */
export function mensagemResumo(pontos: number, total: number): string {
  const p = total > 0 ? pontos / total : 0;
  if (p >= 1) return 'Imune a fake news!';
  if (p >= 0.8) return 'Parabéns! Você checa muito bem as notícias.';
  if (p >= 0.5) return 'Você consegue se proteger, mas ainda pode melhorar.';
  return 'Cuidado! Você precisa verificar melhor as manchetes.';
}
