/**
 * O renderizador WebGL (ex.: "ANGLE (AMD, ...)" ou "SwiftShader"), para o ☰ › Diagnóstico (performance, 23/11);
 * null se o ambiente não informa. `criarCanvas`: um `<canvas>` na página ou um `OffscreenCanvas` no worker.
 */
export function renderizadorWebgl(criarCanvas: () => HTMLCanvasElement | OffscreenCanvas): string | null {
  try {
    const gl = (criarCanvas().getContext('webgl2') ?? criarCanvas().getContext('webgl')) as WebGLRenderingContext | null;
    if (!gl) return null;
    const info = gl.getExtension('WEBGL_debug_renderer_info');
    const r = gl.getParameter(info ? info.UNMASKED_RENDERER_WEBGL : gl.RENDERER);
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return typeof r === 'string' && r ? r : null;
  } catch {
    return null;
  }
}
