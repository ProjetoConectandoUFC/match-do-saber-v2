/**
 * Card acompanha o corpo (AC-2.10, v10.1.0): da inclinação lida pelo interpretador de gestos
 * (`LeituraGesto.inclinacao`, -1..1, onde ±1 é o limiar do gesto) para o deslocamento e o giro do card.
 * Lógica pura: quem aplica no DOM é `src/app/useInclinacaoCard.ts`, fora do estado do React.
 */
import { TEMPOS, type Estado } from './partida';

export const CONFIG_INCLINACAO_CARD = {
  maxDeslocPx: 40,
  maxGraus: 6,
  /** Fração do limiar em que o card ainda não se move: evita o tremor com o jogador parado (motivo da v4.0.0). */
  zonaMorta: 0.15,
  /** Constante de tempo da suavização exponencial; a detecção roda a ~6–7 fps, o card anda a cada quadro. */
  constanteTempoMs: 200,
};
export type ConfigInclinacaoCard = typeof CONFIG_INCLINACAO_CARD;

export interface Deslocamento { dx: number; graus: number }

/**
 * `jogando`: card na tela, segue a leitura. `saindo`: card escolhido saindo, fica onde estava.
 * `centro`: sem pessoa, "Volte para o centro", feedback, menu aberto ou outra tela; volta ao zero.
 */
export type SituacaoCard = 'jogando' | 'saindo' | 'centro';

export interface PassoInclinacao {
  situacao: SituacaoCard;
  inclinacao: number;
  dtMs: number;
  /** `prefers-reduced-motion: reduce`: o card não se desloca nem gira. */
  reduzirMovimento: boolean;
}

const CENTRO: Deslocamento = { dx: 0, graus: 0 };

/** Fração -1..1 depois da zona morta, contínua na borda dela. */
function fracao(inclinacao: number, cfg: ConfigInclinacaoCard): number {
  if (!Number.isFinite(inclinacao)) return 0;
  const i = Math.max(-1, Math.min(1, inclinacao));
  const a = Math.abs(i);
  if (a <= cfg.zonaMorta) return 0;
  return Math.sign(i) * (a - cfg.zonaMorta) / (1 - cfg.zonaMorta);
}

const deslocamento = (f: number, cfg: ConfigInclinacaoCard): Deslocamento =>
  (f === 0 ? CENTRO : { dx: f * cfg.maxDeslocPx, graus: f * cfg.maxGraus });

/** Mapeamento direto (sem suavizar): + = lado direito do jogador, que é a direita da tela (prévia espelhada). */
export function mapearInclinacao(inclinacao: number, cfg: ConfigInclinacaoCard = CONFIG_INCLINACAO_CARD): Deslocamento {
  return deslocamento(fracao(inclinacao, cfg), cfg);
}

/** Em que situação o card está, pela tela da partida e pelo menu/painel aberto (`pausado`, FR-14). */
export function situacaoDoCard(estado: Estado, pausado: boolean): SituacaoCard {
  if (pausado) return 'centro';
  if (estado.tela === 'card') return estado.ausenteMs === null ? 'jogando' : 'centro';
  // Mesma regra do App: depois de uma escolha, os primeiros `saidaMs` do feedback são a saída do card.
  if (estado.tela === 'feedback' && estado.resposta !== null && estado.restanteMs > TEMPOS.feedbackMs) return 'saindo';
  // Treino (FR-16): o card de treino acompanha o corpo como o card, e sai do mesmo jeito.
  if (estado.tela === 'tutorial') return 'jogando';
  if (estado.tela === 'tutorialFeedback' && estado.restanteMs > TEMPOS.feedbackMs) return 'saindo';
  return 'centro';
}

/** Estado da suavização entre quadros; independente da taxa de quadros (usa `dtMs`). */
export function criarInclinacaoCard(cfg: ConfigInclinacaoCard = CONFIG_INCLINACAO_CARD) {
  let atual = 0;
  return {
    passo({ situacao, inclinacao, dtMs, reduzirMovimento }: PassoInclinacao): Deslocamento {
      if (reduzirMovimento) {
        atual = 0;
        return CENTRO;
      }
      if (situacao !== 'saindo' && dtMs > 0) {
        const alvo = situacao === 'jogando' ? fracao(inclinacao, cfg) : 0;
        atual += (alvo - atual) * (1 - Math.exp(-dtMs / cfg.constanteTempoMs));
        if (Math.abs(alvo - atual) < 1e-4) atual = alvo;
      }
      return deslocamento(atual, cfg);
    },
  };
}
