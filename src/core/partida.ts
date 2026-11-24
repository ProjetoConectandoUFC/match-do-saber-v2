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
  /** v12.1.0 (AC-1.4): a calibração volta à espera depois deste tempo sem completar, mesmo com alguém fora do centro. */
  calibracaoMaxMs: 30000,
  ausenciaMs: 10000,
  /** v12.1.0 (AC-5.4): presença contínua que encerra o "Volte para o centro"; soma à pausa, não desconta do card. */
  retornoPresencaMs: 500,
  /** v13.0.0 (AC-17.5): o fan com todas as cartas da partida abre e fecha; soma à partida. */
  aberturaFanMs: 1500,
  /** v13.0.0 (AC-17.6): cada carta sai do fan e pousa no centro; soma ao tempo por card, não desconta. */
  distribuirMs: 900,
} as const;


export type Resultado = 'acerto' | 'erro' | 'tempo';
export interface Presenca { presente: boolean; centralizado: boolean }
export type Entrada = 'corpo' | 'alternativa';
/**
 * `interface` (v13.2.0, AC-18.7): gravada no começo da partida; uma troca nos Ajustes só vale para a próxima.
 * Sem valor (partidas montadas à mão nos testes), vale a do Contexto.
 */
export interface Partida { cards: Noticia[]; resultados: Resultado[]; entrada: Entrada; interface?: InterfaceJogo }

export type EstadoCard = {
  tela: 'card';
  partida: Partida;
  indice: number;
  restanteMs: number;
  saibaMais: boolean;
  ausenteMs: number | null;
  /** v12.1.0 (AC-5.4): presença contínua desde o último quadro sem pessoa, enquanto `ausenteMs` não é null. */
  presenteMs?: number;
  /** v13.0.0 (AC-17.6): > 0 enquanto a carta sai do fan; nesse tempo o cronômetro não corre e nada é aceito. */
  distribuindoMs: number;
};

export type Estado =
  | { tela: 'espera' }
  // `totalMs` (v12.1.0, AC-1.4): tempo desde que a calibração abriu; sem valor, 0.
  | { tela: 'calibracao'; centradoMs: number; ausenteMs: number; totalMs?: number }
  // v13.0.0 (AC-17.5): a partida já vem sorteada, para o fan saber quantas cartas tem (`treinos` + `partida.cards`).
  | { tela: 'abertura'; partida: Partida; treinos: number; restanteMs: number }
  | EstadoCard
  // `resposta` guarda o lado escolhido (para a animação de saída); null quando o tempo esgotou.
  // `resultadoMs` (v12.0.0): quanto dura o resultado, carimbada + tempo configurado (AC-4.9, AC-9.25), gravado ao entrar; enquanto `restanteMs` for maior, o card está saindo.
  // `sequencia` (v13.4.0, AC-19.5): acertos seguidos até este card, inclusive (0 no erro e no tempo esgotado); não muda os pontos.
  | { tela: 'feedback'; partida: Partida; indice: number; restanteMs: number; resposta: Veredito | null; resultadoMs: number; sequencia: number }
  // `decorridoMs`: só com a volta automática ligada (AC-5.2, AC-9.26, v12.0.0).
  // `maiorSequencia` (v13.4.0, AC-19.6): a maior sequência de acertos da partida, só na memória, como o resto do resumo.
  | { tela: 'resumo'; partida: Partida; maiorSequencia: number; decorridoMs?: number }
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

/**
 * v13.2.0 (FR-19): Cartas (v13.1.0) ou Clássica (v12.1.0: sem abertura nem distribuição). v13.4.0 (AC-18.1): Cartas
 * primeiro (padrão dos Ajustes); a Clássica fica por último, só como reserva.
 */
export const INTERFACES_JOGO = ['cartas', 'classica'] as const;
export type InterfaceJogo = (typeof INTERFACES_JOGO)[number];

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
  /**
   * v13.2.0 (FR-19, AC-18.4, AC-18.5): sem valor, Clássica. Só partidas montadas à mão nos testes chegam sem valor: o jogo
   * sempre passa a dos Ajustes (`contextoDosAjustes`), cujo padrão é Cartas desde a v13.4.0 (AC-18.1).
   */
  interface?: InterfaceJogo;
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

/** A interface da partida (AC-18.7): a gravada nela; senão, a do Contexto; senão, a Clássica (padrão, FR-19). */
const interfaceDa = (partida: Partida, ctx: Contexto): InterfaceJogo => partida.interface ?? ctx.interface ?? 'classica';

/** Cartas (AC-17.6): toda carta sai do fan em `TEMPOS.distribuirMs`; Clássica (AC-18.4): o card aparece na hora. */
const distribuicaoMs = (partida: Partida, ctx: Contexto) => (interfaceDa(partida, ctx) === 'cartas' ? TEMPOS.distribuirMs : 0);

/** Toda carta de notícia chega com o cronômetro cheio; nas Cartas, distribuída do fan (AC-17.6). */
function card(partida: Partida, indice: number, ctx: Contexto): EstadoCard {
  return {
    tela: 'card', partida, indice, restanteMs: ctx.tempoCardMs ?? TEMPOS.cardMs, saibaMais: false, ausenteMs: null,
    distribuindoMs: distribuicaoMs(partida, ctx),
  };
}

/** A carta de treino também sai do fan nas Cartas (FR-16, v13.0.0). */
function treino(partida: Partida, treinos: number, passo: number, ctx: Contexto): Estado {
  return { tela: 'tutorial', passo, treinos, partida, distribuindoMs: distribuicaoMs(partida, ctx) };
}

/**
 * Começo de uma partida (AC-1.2, AC-1.6, AC-1.8, AC-5.6): sorteia já aqui, antes do treino, para a abertura do fan
 * (AC-17.5) saber o total de cartas (treinos + notícias); nas duas interfaces, o mesmo sorteio (AC-18.6). Sem notícias
 * sorteáveis, fica na espera (AC-6.4). Cartas: abertura do fan; Clássica (AC-18.4): direto ao 1º treino ou card.
 */
function comecar(ctx: Contexto, entrada: Entrada): Estado {
  if (ctx.noticias.length === 0) return ESTADO_INICIAL;
  const cards = sortear(ctx.noticias, ctx.rng, ctx.sorteio);
  if (cards.length === 0) return ESTADO_INICIAL;
  const iface = ctx.interface ?? 'classica';
  const partida: Partida = { cards, resultados: [], entrada, interface: iface };
  const treinos = ctx.tutorial?.length ?? 0;
  if (iface === 'classica') return primeiraCarta(partida, treinos, ctx);
  return { tela: 'abertura', partida, treinos, restanteMs: TEMPOS.aberturaFanMs };
}

/** Depois da abertura (ou no começo, na Clássica): o 1º treino, com o tutorial ligado (AC-15.2), ou o 1º card. */
function primeiraCarta(partida: Partida, treinos: number, ctx: Contexto): Estado {
  return treinos > 0 ? treino(partida, treinos, 0, ctx) : card(partida, 0, ctx);
}

/** A distribuição só desconta o próprio tempo; o que sobra de um tick grande não desconta do cronômetro (AC-17.6). */
const distribuir = (distribuindoMs: number, dtMs: number) => Math.max(0, distribuindoMs - dtMs);

function registrar(e: EstadoCard, r: Resultado, resposta: Veredito | null, ctx: Contexto): Estado {
  const resultados = [...e.partida.resultados, r];
  return {
    tela: 'feedback',
    partida: { ...e.partida, resultados },
    indice: e.indice,
    // Escolha: o card sai antes (saidaMs); o resultado tem a carimbada e ainda fica o tempo configurado inteiro
    // (AC-4.1/AC-4.2/AC-4.9, AC-9.25).
    restanteMs: resposta === null ? duracaoResultadoMs(ctx) : duracaoResultadoMs(ctx) + TEMPOS.saidaMs,
    resposta,
    resultadoMs: duracaoResultadoMs(ctx),
    sequencia: sequenciaAtual(resultados),
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
      // AC-1.4 (v12.1.0): com ninguém completando a calibração em 30 s, volta à espera (alguém fora do centro não a prende).
      const totalMs = (estado.totalMs ?? 0) + evento.dtMs;
      if (!p || !p.presente) {
        const ausenteMs = estado.ausenteMs + evento.dtMs;
        return ausenteMs >= TEMPOS.ausenciaMs || totalMs >= TEMPOS.calibracaoMaxMs
          ? ESTADO_INICIAL
          : { tela: 'calibracao', centradoMs: 0, ausenteMs, totalMs };
      }
      const centradoMs = p.centralizado ? estado.centradoMs + evento.dtMs : 0;
      if (centradoMs >= TEMPOS.calibracaoMs) return comecar(ctx, 'corpo');
      return totalMs >= TEMPOS.calibracaoMaxMs ? ESTADO_INICIAL : { tela: 'calibracao', centradoMs, ausenteMs: 0, totalMs };
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
        return ausenteMs >= (ctx.toleranciaMs ?? TEMPOS.ausenciaMs) ? ESTADO_INICIAL : { ...estado, ausenteMs, presenteMs: 0 };
      }
      // AC-5.4 (v12.1.0): só sai do "Volte para o centro" com presença contínua; detecções soltas não zeram a tolerância.
      // Os 500 ms de confirmação ficam pausados (somam à pausa, não descontam do card); o que passar deles corre.
      let dtMs = evento.dtMs;
      if (p && estado.ausenteMs !== null) {
        const presenteMs = (estado.presenteMs ?? 0) + dtMs;
        if (presenteMs < TEMPOS.retornoPresencaMs) return { ...estado, presenteMs };
        dtMs = presenteMs - TEMPOS.retornoPresencaMs;
      }
      const base: EstadoCard = { ...estado, ausenteMs: null };
      delete base.presenteMs;
      const restanteMs = base.restanteMs - dtMs;
      return restanteMs <= 0 ? registrar(base, 'tempo', null, ctx) : { ...base, restanteMs };
    }
    case 'feedback': {
      if (evento.tipo !== 'tick') return estado;
      const restanteMs = estado.restanteMs - evento.dtMs;
      if (restanteMs > 0) return { ...estado, restanteMs };
      const proximo = estado.indice + 1;
      return proximo < estado.partida.cards.length
        ? card(estado.partida, proximo, ctx)
        : { tela: 'resumo', partida: estado.partida, maiorSequencia: maiorSequencia(estado.partida.resultados) };
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
      if (evento.tipo === 'enter') return card(estado.partida, 0, ctx);
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
      if (evento.tipo === 'enter') return card(estado.partida, 0, ctx);
      if (evento.tipo !== 'tick') return estado;
      const restanteMs = estado.restanteMs - evento.dtMs;
      if (restanteMs > 0) return { ...estado, restanteMs };
      const passo = estado.passo + 1;
      return passo < estado.treinos ? treino(estado.partida, estado.treinos, passo, ctx) : card(estado.partida, 0, ctx);
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

/**
 * O centro do jogador é medido ao sair da calibração (FR-2): nas Cartas, para a abertura do fan (v13.0.0); na Clássica
 * (AC-18.4), para o 1º card ou, com o tutorial, para o treino (v12.1.0).
 */
export function calibrarAoSair(antes: Estado['tela'], depois: Estado['tela']): boolean {
  return antes === 'calibracao' && (depois === 'abertura' || depois === 'card' || depois === 'tutorial');
}

/**
 * Interface que a tela usa (AC-18.4, AC-18.7): dentro da partida, a gravada nela no começo; fora dela, a dos Ajustes.
 */
export function interfaceDoEstado(estado: Estado, ajustes: InterfaceJogo): InterfaceJogo {
  return ('partida' in estado ? estado.partida.interface : undefined) ?? ajustes;
}

/** Carta (notícia ou treino) saindo do fan até o centro (AC-17.6); som, inclinação e tela usam esta regra. */
export function distribuindo(estado: Estado): boolean {
  return (estado.tela === 'card' || estado.tela === 'tutorial') && estado.distribuindoMs > 0;
}

/**
 * AC-2.13 (v12.1.0) com AC-17.6 (v13.0.0): a permanência de um gesto só conta com a carta (notícia ou treino) pousada;
 * fora disso o laço da câmera zera as permanências, para uma inclinação começada antes não responder a carta nova.
 */
export function permanenciaConta(estado: Estado): boolean {
  return (estado.tela === 'card' || estado.tela === 'tutorial') && !distribuindo(estado);
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

/**
 * AC-19.5 (v13.4.0): acertos seguidos no fim dos resultados (erro e tempo esgotado zeram). Só os cards da partida entram
 * em `resultados`; o treino do tutorial (FR-16) nunca conta. Não muda a pontuação (FR-5: +1 por acerto).
 */
export function sequenciaAtual(resultados: readonly Resultado[]): number {
  let n = 0;
  for (let i = resultados.length - 1; i >= 0 && resultados[i] === 'acerto'; i--) n++;
  return n;
}

/** AC-19.6 (v13.4.0): a maior sequência de acertos da partida, para o resumo. */
export function maiorSequencia(resultados: readonly Resultado[]): number {
  let maior = 0;
  let atual = 0;
  for (const r of resultados) {
    atual = r === 'acerto' ? atual + 1 : 0;
    maior = Math.max(maior, atual);
  }
  return maior;
}

/**
 * AC-19.2 (v13.4.0): o carimbo está batendo, nos primeiros `TEMPOS.carimboMs` do resultado (depois da saída do card, numa
 * escolha; na hora, no tempo esgotado). É o momento do hit-stop, da tremida, do respingo e do baque; o relógio do jogo
 * não para (a carimbada já soma ao feedback, AC-4.9). Só no feedback da partida.
 */
export function carimbando(estado: Estado): boolean {
  return estado.tela === 'feedback' && !cardSaindo(estado) && estado.restanteMs > estado.resultadoMs - TEMPOS.carimboMs;
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
