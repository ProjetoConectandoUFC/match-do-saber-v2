import type { Pose } from '../core/gestos';
import type { PedidoWorker, RespostaWorker } from './poseProtocolo';

/** O que o worker usa do MediaPipe (ou da detecção falsa dos E2E). */
export interface Marcador {
  detectar(quadro: TexImageSource, tMs: number): Pose[];
  fechar(): void;
}

export interface DepsServico {
  criarMarcador(delegate: 'GPU' | 'CPU', numPoses: number): Promise<Marcador>;
  /** Renderizador WebGL do worker (para o Diagnóstico); null se desconhecido. */
  renderizador(): string | null;
  /** Um quadro vazio do tamanho da câmera, para aquecer o modelo antes do primeiro quadro de verdade. */
  quadroVazio(): TexImageSource | null;
  agora(): number;
  responder(r: RespostaWorker): void;
}

const mensagem = (e: unknown) => (e instanceof Error ? e.message : String(e));

/** Só x, y e visibility: o resto (z, mundo) não é usado e só pesaria a cópia entre as threads. */
export function paraPoses(landmarks: { x: number; y: number; z?: number; visibility?: number }[][]): Pose[] {
  return landmarks.map((p) => p.map(({ x, y, visibility }) => ({ x, y, visibility })));
}

/**
 * O trabalho do Web Worker da pose (FR-20, v13.3.0): cria o detector (GPU, com queda para CPU), aquece o modelo
 * (a primeira detecção é a mais lenta; acontece aqui, na tela de espera, sem travar a tela) e responde cada quadro
 * com as poses e o instante da captura. Um quadro por vez: a página só manda outro depois da resposta.
 */
export function criarServicoPose(deps: DepsServico) {
  let marcador: Marcador | null = null;
  let ultimoT = -Infinity;
  return {
    async receber(p: PedidoWorker): Promise<void> {
      if (p.tipo === 'iniciar') {
        try {
          let delegate: 'GPU' | 'CPU' = 'GPU';
          const m = await deps.criarMarcador('GPU', p.numPoses).catch(() => {
            delegate = 'CPU';
            return deps.criarMarcador('CPU', p.numPoses);
          });
          const inicio = deps.agora();
          const vazio = deps.quadroVazio();
          if (vazio) { m.detectar(vazio, 0); ultimoT = 0; }
          const aquecimentoMs = deps.agora() - inicio;
          marcador = m;
          deps.responder({ tipo: 'pronto', delegate, renderizador: deps.renderizador(), aquecimentoMs });
        } catch (e) {
          deps.responder({ tipo: 'erro', fase: 'iniciar', mensagem: mensagem(e) });
        }
        return;
      }
      if (p.tipo === 'detectar') {
        try {
          if (!marcador) throw new Error('detector não iniciado');
          const t = Math.max(p.capturaMs, ultimoT + 1);
          ultimoT = t;
          const inicio = deps.agora();
          const poses = marcador.detectar(p.quadro, t);
          deps.responder({ tipo: 'leitura', poses, capturaMs: p.capturaMs, deteccaoMs: deps.agora() - inicio });
        } catch (e) {
          deps.responder({ tipo: 'erro', fase: 'detectar', mensagem: mensagem(e) });
        } finally {
          p.quadro.close();
        }
        return;
      }
      try { marcador?.fechar(); } catch { /* contexto gráfico já perdido */ }
      marcador = null;
    },
  };
}
