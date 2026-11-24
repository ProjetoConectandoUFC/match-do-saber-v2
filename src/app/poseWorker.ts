// Web Worker da pose (FR-20, v13.3.0): o MediaPipe roda aqui, fora do laço de desenho da página. Os quadros chegam
// como ImageBitmap transferido (só na memória); voltam só as poses. Nada é gravado nem enviado.
import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';
import { esperaOcupada, poseFalsa } from '../core/deteccaoFalsa';
import type { PedidoWorker, RespostaWorker } from './poseProtocolo';
import { bloquearRedeExterna } from './redeWorker';
import { renderizadorWebgl } from './renderizador';
import { criarServicoPose, paraPoses, type Marcador } from './servicoPose';

interface EscopoWorker {
  postMessage(r: RespostaWorker): void;
  addEventListener(tipo: 'message', f: (e: MessageEvent<PedidoWorker>) => void): void;
  close(): void;
  importScripts?: (...urls: string[]) => void;
}
const escopo = self as unknown as EscopoWorker & Parameters<typeof bloquearRedeExterna>[0];

// NFR Security: o worker não herda a CSP da página; o registro de uso do MediaPipe não sai daqui.
bloquearRedeExterna(escopo);

/** No build o worker é clássico e o MediaPipe carrega o WASM com importScripts; no dev é de módulo e usa a versão ES. */
function workerClassico(): boolean {
  try {
    escopo.importScripts?.();
    return typeof escopo.importScripts === 'function';
  } catch {
    return false;
  }
}

let inicio: Extract<PedidoWorker, { tipo: 'iniciar' }> | null = null;

const servico = criarServicoPose({
  async criarMarcador(delegate, numPoses): Promise<Marcador> {
    const falsa = inicio?.falsa;
    if (falsa) return { detectar: () => { esperaOcupada(falsa.ms); return [poseFalsa()]; }, fechar() {} };
    const vision = await FilesetResolver.forVisionTasks(`${inicio?.base ?? '/'}mediapipe/wasm`, !workerClassico());
    const marcador = await PoseLandmarker.createFromOptions(vision, {
      baseOptions: { modelAssetPath: `${inicio?.base ?? '/'}mediapipe/pose_landmarker_lite.task`, delegate },
      runningMode: 'VIDEO',
      numPoses,
    });
    return {
      detectar: (quadro, t) => paraPoses(marcador.detectForVideo(quadro, t).landmarks),
      fechar: () => marcador.close(),
    };
  },
  renderizador: () => renderizadorWebgl(() => new OffscreenCanvas(1, 1)),
  // Aquece com um quadro vazio do tamanho da câmera (640×360): a primeira detecção é a mais lenta.
  quadroVazio: () => (inicio?.falsa ? null : new ImageData(640, 360)),
  agora: () => performance.now(),
  responder: (r) => escopo.postMessage(r),
});

escopo.addEventListener('message', (e) => {
  const pedido = e.data;
  if (pedido.tipo === 'iniciar') inicio = pedido;
  void servico.receber(pedido).then(() => { if (pedido.tipo === 'fechar') escopo.close(); });
});
