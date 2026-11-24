import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';
import { descreverAceleracao, type Aceleracao } from '../core/diagnostico';
import { esperaOcupada, lerDeteccaoFalsa, poseFalsa } from '../core/deteccaoFalsa';
import type { Pose } from '../core/gestos';

export interface Rastreador {
  detectar(video: HTMLVideoElement, tMs: number): Pose[];
  fechar(): void;
  /** Onde a detecção roda, para o ☰ › Diagnóstico (performance, 23/11). */
  aceleracao?: Aceleracao;
}

/** O renderizador WebGL da página (ex.: "ANGLE (AMD, ...)" ou "SwiftShader"); null se o navegador não informa. */
function renderizadorWebgl(): string | null {
  try {
    const gl = document.createElement('canvas').getContext('webgl2') ?? document.createElement('canvas').getContext('webgl');
    if (!gl) return null;
    const info = gl.getExtension('WEBGL_debug_renderer_info');
    const r = gl.getParameter(info ? info.UNMASKED_RENDERER_WEBGL : gl.RENDERER);
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return typeof r === 'string' && r ? r : null;
  } catch {
    return null;
  }
}

export async function criarRastreador(): Promise<Rastreador> {
  // Fase 52.1 (v13.3.0): só nos E2E de cadência, uma detecção falsa de duração conhecida.
  const falsa = lerDeteccaoFalsa(globalThis);
  if (falsa) {
    return {
      aceleracao: { software: false, texto: `detecção falsa (${falsa.ms} ms)` },
      detectar() { esperaOcupada(falsa.ms); return [poseFalsa()]; },
      fechar() {},
    };
  }
  const base = import.meta.env.BASE_URL;
  const vision = await FilesetResolver.forVisionTasks(`${base}mediapipe/wasm`);
  const criar = (delegate: 'GPU' | 'CPU') =>
    PoseLandmarker.createFromOptions(vision, {
      baseOptions: { modelAssetPath: `${base}mediapipe/pose_landmarker_lite.task`, delegate },
      runningMode: 'VIDEO',
      numPoses: 3,
    });
  let delegate: 'GPU' | 'CPU' = 'GPU';
  const landmarker = await criar('GPU').catch(() => {
    delegate = 'CPU';
    return criar('CPU');
  });
  const aceleracao = descreverAceleracao(delegate, renderizadorWebgl());
  let ultimo = -1;
  let fechado = false;
  return {
    aceleracao,
    detectar(video, tMs) {
      const t = Math.max(tMs, ultimo + 1);
      ultimo = t;
      return landmarker.detectForVideo(video, t).landmarks;
    },
    // Pode ser chamado mais de uma vez (erro na detecção e depois a reabertura da câmera, v12.1.0).
    fechar() {
      if (fechado) return;
      fechado = true;
      try { landmarker.close(); } catch { /* contexto gráfico já perdido */ }
    },
  };
}

export async function abrirCamera(video: HTMLVideoElement, sinal?: AbortSignal): Promise<MediaStream> {
  const stream = await navigator.mediaDevices.getUserMedia({
    // 640×360 (performance, 23/11): o modelo reduz a imagem por dentro; 1280×720 só pesava o envio de cada quadro
    // à GPU. 16:9 mantém o enquadramento da prévia e da foto do resumo.
    video: { width: { ideal: 640 }, height: { ideal: 360 }, facingMode: 'user' },
    audio: false,
  });
  const parar = () => stream.getTracks().forEach((t) => t.stop());
  // Efeito desmontado (ex.: StrictMode) enquanto a permissão estava pendente: não toca no <video>.
  if (sinal?.aborted) {
    parar();
    throw new DOMException('cancelado', 'AbortError');
  }
  try {
    video.srcObject = stream;
    await video.play();
  } catch (e) {
    parar();
    throw e;
  }
  return stream;
}
