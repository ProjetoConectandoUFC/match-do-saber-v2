import { calcularAncoras, type AncorasRosto } from '../core/ancorasRosto';
import type { Pose } from '../core/gestos';

/** Foto do resumo com as âncoras do rosto do mesmo instante (AC-13.6). Só na memória; apagada inteira (AC-13.7). */
export interface FotoPartida {
  imagem: string;
  largura: number;
  altura: number;
  ancoras: AncorasRosto | null;
}

function tamanho(video: HTMLVideoElement, largura: number): { largura: number; altura: number } | null {
  const { videoWidth: w, videoHeight: h } = video;
  if (!w || !h) return null;
  return { largura, altura: Math.round((largura * h) / w) };
}

/** Um quadro da câmera, espelhado como a prévia (AC-13.2). Fica só na memória (FR-13). */
export function capturarQuadro(video: HTMLVideoElement, largura = 480): string | null {
  try {
    const t = tamanho(video, largura);
    if (!t) return null;
    const c = document.createElement('canvas');
    c.width = t.largura;
    c.height = t.altura;
    const g = c.getContext('2d');
    if (!g) return null;
    g.translate(c.width, 0);
    g.scale(-1, 1);
    g.drawImage(video, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', 0.85);
  } catch {
    return null;
  }
}

/** Foto espelhada + âncoras calculadas com a pose do mesmo quadro (`poseRef` de `useJogo`). */
export function capturarFoto(video: HTMLVideoElement, pose: Pose | null, largura = 480): FotoPartida | null {
  const imagem = capturarQuadro(video, largura);
  const t = tamanho(video, largura);
  if (!imagem || !t) return null;
  return { imagem, ...t, ancoras: calcularAncoras(pose, { ...t, espelhada: true }) };
}
