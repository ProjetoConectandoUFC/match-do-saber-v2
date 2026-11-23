import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@mediapipe/tasks-vision', () => ({ FilesetResolver: {}, PoseLandmarker: {} }));
import { abrirCamera } from './rastreador';

afterEach(() => vi.unstubAllGlobals());

// Performance (23/11): o modelo reduz a imagem por dentro; 1280×720 só pesava o envio de cada quadro à GPU.
describe('abrirCamera', () => {
  it('pede a câmera em 640×360 (16:9, o mesmo enquadramento da prévia e da foto)', async () => {
    const stream = { getTracks: () => [] };
    const getUserMedia = vi.fn().mockResolvedValue(stream);
    vi.stubGlobal('navigator', { mediaDevices: { getUserMedia } });
    const video = { srcObject: null, play: vi.fn().mockResolvedValue(undefined) } as unknown as HTMLVideoElement;
    await abrirCamera(video);
    const pedido = getUserMedia.mock.calls[0]?.[0];
    expect(pedido.video.width).toEqual({ ideal: 640 });
    expect(pedido.video.height).toEqual({ ideal: 360 });
  });
});
