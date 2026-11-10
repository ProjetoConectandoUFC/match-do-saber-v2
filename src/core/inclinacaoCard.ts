/**
 * O card mimetiza o controle em tempo real, como no Reigns (AC-2.10, v10.3.0): da inclinação lida pelo
 * interpretador de gestos (`LeituraGesto.inclinacao`, -1..1, onde ±1 é o limiar do gesto) para a fração
 * suavizada e, dela, o deslocamento, o giro (eixo na base do card) e a opacidade dos rótulos Verdade/Mentira.
 * Lógica pura: quem aplica no DOM é `src/app/useInclinacaoCard.ts`, fora do estado do React.
 */
import { TEMPOS, type Estado } from './partida';

export const CONFIG_INCLINACAO_CARD = {
  /** Deslocamento da base do card no limiar, em fração da largura do card. */
  fracaoLargura: 0.38,
  /** Giro no limiar, em torno da base do card. */
  maxGraus: 14,
  /** Só o tremor de leitura parada; fora disso, proporcional desde o centro. */
  zonaMorta: 0.03,
  /** Interpolação entre as leituras da câmera (~6–7 por segundo), a cada quadro de tela. */
  constanteTempoMs: 100,
};
export type ConfigInclinacaoCard = typeof CONFIG_INCLINACAO_CARD;

/** `dx`/`dy`: deslocamento do centro do card (px); `verdade`/`mentira`: opacidade dos rótulos (0..1). */
export interface Deslocamento { dx: number; dy: number; graus: number; verdade: number; mentira: number }
export interface TamanhoCard { largura: number; altura: number }

/**
 * `jogando`: card na tela, segue a leitura. `saindo`: card escolhido saindo, fica onde estava.
 * `centro`: sem pessoa, "Volte para o centro", feedback, menu aberto ou outra tela; volta ao zero.
 */
export type SituacaoCard = 'jogando' | 'saindo' | 'centro';

export interface PassoInclinacao { situacao: SituacaoCard; inclinacao: number; dtMs: number }

/** Fração -1..1 do controle, com a zona morta pequena e contínua na borda dela. */
export function fracaoControle(inclinacao: number, cfg: ConfigInclinacaoCard = CONFIG_INCLINACAO_CARD): number {
  if (!Number.isFinite(inclinacao)) return 0;
  const i = Math.max(-1, Math.min(1, inclinacao));
  const a = Math.abs(i);
  if (a <= cfg.zonaMorta) return 0;
  return Math.sign(i) * (a - cfg.zonaMorta) / (1 - cfg.zonaMorta);
}

/**
 * Posição do card para a fração `f` (+ = direita do jogador = direita da tela, prévia espelhada). A base anda
 * `f × fracaoLargura × largura` e o card gira `f × maxGraus` em torno dela; como o CSS gira em torno do centro,
 * o centro recebe o efeito do eixo na base: (h/2·sen θ, h/2·(1 − cos θ)). Com `reduzirMovimento`, só os rótulos.
 */
export function deslocamentoCard(
  f: number, tamanho: TamanhoCard, reduzirMovimento: boolean, cfg: ConfigInclinacaoCard = CONFIG_INCLINACAO_CARD,
): Deslocamento {
  const verdade = Math.max(0, f);
  const mentira = Math.max(0, -f);
  if (reduzirMovimento || f === 0 || !(tamanho.largura > 0)) return { dx: 0, dy: 0, graus: 0, verdade, mentira };
  const graus = f * cfg.maxGraus;
  const t = (graus * Math.PI) / 180;
  const meia = tamanho.altura / 2;
  return {
    dx: f * cfg.fracaoLargura * tamanho.largura + meia * Math.sin(t),
    dy: meia * (1 - Math.cos(t)),
    graus,
    verdade,
    mentira,
  };
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

/** Fração suavizada entre quadros, independente da taxa de quadros (usa `dtMs`). */
export function criarInclinacaoCard(cfg: ConfigInclinacaoCard = CONFIG_INCLINACAO_CARD) {
  let atual = 0;
  return {
    passo({ situacao, inclinacao, dtMs }: PassoInclinacao): number {
      if (situacao !== 'saindo' && dtMs > 0) {
        const alvo = situacao === 'jogando' ? fracaoControle(inclinacao, cfg) : 0;
        atual += (alvo - atual) * (1 - Math.exp(-dtMs / cfg.constanteTempoMs));
        if (Math.abs(alvo - atual) < 1e-4) atual = alvo;
      }
      return atual;
    },
  };
}
