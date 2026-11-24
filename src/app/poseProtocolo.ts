import type { Pose } from '../core/gestos';

/**
 * Mensagens entre a página e o Web Worker da pose (FR-20, v13.3.0). Os quadros da câmera vão como `ImageBitmap`
 * transferido (só na memória, da thread principal ao worker; nada é gravado nem enviado) e voltam só as poses.
 */
export type PedidoWorker =
  | { tipo: 'iniciar'; base: string; falsa: { ms: number } | null; numPoses: number }
  | { tipo: 'detectar'; quadro: ImageBitmap; capturaMs: number }
  | { tipo: 'fechar' };

export type RespostaWorker =
  | { tipo: 'pronto'; delegate: 'GPU' | 'CPU'; renderizador: string | null; aquecimentoMs: number }
  | { tipo: 'leitura'; poses: Pose[]; capturaMs: number; deteccaoMs: number }
  | { tipo: 'erro'; fase: 'iniciar' | 'detectar'; mensagem: string };
