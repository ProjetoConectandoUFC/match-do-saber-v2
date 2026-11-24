import type { Interpretador, Pose } from './gestos';
import type { Evento, Presenca } from './partida';

/**
 * FR-20 (v13.3.0): a detecção de pose roda fora do laço de desenho (num Web Worker ou num ritmo próprio) e entrega
 * leituras; o laço de desenho avança relógio e reducer a cada quadro da tela e aplica só a leitura mais recente.
 */

/** Uma leitura da detecção: as poses de um quadro da câmera, o instante da captura e quanto a detecção levou. */
export interface LeituraPose { poses: Pose[]; capturaMs: number; deteccaoMs: number }

/** Teto de leituras por segundo (NFR Performance: a detecção mira 12 a 30 por segundo, conforme a máquina). */
export const LEITURAS_MAX_POR_S = 30;

/**
 * Uma leitura vale para presença, pose e inclinação até este tempo depois da captura; sem leitura nova, o tick vai sem
 * presença, como quando a câmera não tem quadro (detecção travada ou parada). Bem acima do intervalo entre leituras
 * numa máquina lenta (~450 ms medidos com o modelo emulado na CPU).
 */
export const LEITURA_VALIDA_MS = 2000;

/** Uma leitura pedida sem resposta por este tempo conta como travada (worker morto, GPU perdida). */
export const LEITURA_TRAVADA_MS = 15_000;

/** Caixa de uma leitura: a mais recente vence; uma atrasada (captura anterior à última aceita) é descartada. */
export function criarUltimaLeitura() {
  let pendente: LeituraPose | null = null;
  let ultimaCaptura = -Infinity;
  return {
    /** Falso quando a leitura chegou atrasada e foi descartada. */
    publicar(l: LeituraPose): boolean {
      if (l.capturaMs <= ultimaCaptura) return false;
      ultimaCaptura = l.capturaMs;
      pendente = l;
      return true;
    },
    /** A leitura nova, uma vez só; null quando não chegou outra desde a última entregue. */
    tomar(): LeituraPose | null {
      const l = pendente;
      pendente = null;
      return l;
    },
    limpar() {
      pendente = null;
      ultimaCaptura = -Infinity;
    },
  };
}

/**
 * Quando pedir uma leitura: uma por vez, no máximo `LEITURAS_MAX_POR_S` por segundo. `alternarQuadros` (detecção na
 * thread principal, a reserva): nunca em dois quadros seguidos, para a tela não travar duas vezes em sequência.
 */
export function criarRitmoDeteccao({ alternarQuadros, travadaMs = LEITURA_TRAVADA_MS }: { alternarQuadros: boolean; travadaMs?: number }) {
  const intervaloMs = 1000 / LEITURAS_MAX_POR_S;
  let pedidaEm: number | null = null;
  let ultimoPedido = -Infinity;
  let pediuNoQuadroAnterior = false;
  return {
    /** Chamado uma vez por quadro da tela; verdadeiro quando este quadro deve pedir uma leitura. */
    pedir(agora: number): boolean {
      const pode = pedidaEm === null && agora - ultimoPedido >= intervaloMs - 1 && !(alternarQuadros && pediuNoQuadroAnterior);
      pediuNoQuadroAnterior = pode;
      if (pode) { pedidaEm = agora; ultimoPedido = agora; }
      return pode;
    },
    /** A leitura pedida terminou (com resultado ou erro). */
    concluir() { pedidaEm = null; },
    travada(agora: number): boolean { return pedidaEm !== null && agora - pedidaEm > travadaMs; },
  };
}

export interface EntradaQuadro {
  agora: number;
  dtMs: number;
  /** A leitura nova deste quadro (de `criarUltimaLeitura().tomar()`), ou null. */
  nova: LeituraPose | null;
  interp: Interpretador;
  /** AC-2.13/AC-17.6: com a carta na tela e pousada (estado do último render); senão, cada leitura zera as permanências. */
  permanenciaConta: boolean;
  /** FR-14: menu ☰, painel ou Ajustes abertos. */
  pausado: boolean;
}

export interface SaidaQuadro {
  /** Sempre um tick (com a presença da última leitura válida), seguido dos gestos da leitura nova. */
  eventos: Evento[];
  inclinacao: number;
  /** Pose do jogador acompanhado na última leitura válida (prévia da câmera, foto do resumo). */
  pose: Pose | null;
  /** A leitura aplicada neste quadro (só quando havia uma nova), para o Diagnóstico. */
  aplicada: { capturaMs: number; deteccaoMs: number; pessoas: number; pose: Pose | null; gestos: Evento[] } | null;
}

const EVENTO_DO_GESTO = {
  direita: { tipo: 'escolha', resposta: 'verdadeira' },
  esquerda: { tipo: 'escolha', resposta: 'falsa' },
  maosParaCima: { tipo: 'saibaMais' },
} as const satisfies Record<string, Evento>;

/**
 * Aplica as leituras ao jogo, uma vez por leitura nova, com o instante da captura (as permanências de gestos medem o
 * tempo da câmera, não o da tela). A cada quadro: um tick com o dt real do quadro e a presença da última leitura.
 */
export function criarAplicadorLeituras() {
  let ultima: { presenca: Presenca; inclinacao: number; pose: Pose | null; capturaMs: number } | null = null;
  return {
    quadro({ agora, dtMs, nova, interp, permanenciaConta, pausado }: EntradaQuadro): SaidaQuadro {
      let aplicada: SaidaQuadro['aplicada'] = null;
      if (nova) {
        if (!permanenciaConta) interp.zerar();
        // AC-1.5 (v12.1.0): o interpretador acompanha o jogador entre as leituras; um passante não toma o controle.
        const l = interp.lerPoses(nova.poses, nova.capturaMs);
        ultima = { presenca: l.presenca, inclinacao: l.inclinacao, pose: l.pose, capturaMs: nova.capturaMs };
        const gestos = pausado ? [] : l.gestos.map((g) => EVENTO_DO_GESTO[g] as Evento);
        aplicada = { capturaMs: nova.capturaMs, deteccaoMs: nova.deteccaoMs, pessoas: nova.poses.length, pose: l.pose, gestos };
      }
      const valida = ultima && agora - ultima.capturaMs <= LEITURA_VALIDA_MS ? ultima : null;
      const tick: Evento = { tipo: 'tick', dtMs, presenca: pausado || !valida ? null : valida.presenca };
      return {
        eventos: [tick, ...(aplicada?.gestos ?? [])],
        inclinacao: pausado || !valida ? 0 : valida.inclinacao,
        pose: valida?.pose ?? null,
        aplicada,
      };
    },
    /** O rastreador fechou (erro, câmera desligada): a última leitura deixa de valer. */
    esquecer() { ultima = null; },
  };
}
