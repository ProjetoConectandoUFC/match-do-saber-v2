// @vitest-environment jsdom
// FR-20 (v13.3.0, Fase 52.4): o laço de desenho avança o jogo a cada quadro; a detecção corre no ritmo dela.
import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AJUSTES_PADRAO } from '../core/ajustes';
import { criarRegistro, type Registro } from '../core/diagnostico';
import type { Pose } from '../core/gestos';
import type { LeituraPose } from '../core/leituraPose';
import type { Noticia } from '../core/types';
import type { DetectorPose } from './detectorPose';
import { useJogo } from './useJogo';

const mocks = vi.hoisted(() => ({ abrirCamera: vi.fn(), criarDetector: vi.fn() }));
vi.mock('./rastreador', () => ({ abrirCamera: mocks.abrirCamera }));
vi.mock('./detectorPose', () => ({ criarDetector: mocks.criarDetector }));

let quadros: FrameRequestCallback[] = [];
let agora = 0;
function avancarQuadros(n: number, passoMs = 1000 / 60) {
  for (let i = 0; i < n; i++) {
    agora += passoMs;
    const fila = quadros;
    quadros = [];
    for (const f of fila) f(agora);
  }
}
const esvaziar = () => act(async () => { for (let i = 0; i < 10; i++) await Promise.resolve(); });

function fluxo() {
  const t = { stop: vi.fn(), addEventListener: vi.fn() };
  return { getTracks: () => [t], getVideoTracks: () => [t] } as unknown as MediaStream;
}

/** Detector controlado pelo teste: cada `ler` fica pendente até `responder`. */
function detectorControlado(onde: 'worker' | 'principal' = 'worker') {
  const pedidos: { capturaMs: number; ok: (l: LeituraPose | null) => void; falha: (e: unknown) => void }[] = [];
  let aoFalhar: (e: unknown) => void = () => {};
  const d: DetectorPose = {
    onde,
    aceleracao: { software: false, texto: 'GPU · teste', onde },
    ler: vi.fn((_v, capturaMs) => new Promise<LeituraPose | null>((ok, falha) => { pedidos.push({ capturaMs, ok, falha }); })),
    fechar: vi.fn(),
  };
  mocks.criarDetector.mockImplementationOnce(async (o: { aoFalhar: (e: unknown) => void }) => { aoFalhar = o.aoFalhar; return d; });
  return { d, pedidos, falhar: (e: unknown) => aoFalhar(e) };
}

/** Pose sintética (gestos.test.ts): cxJogador = centro do tronco do ponto de vista do jogador. */
function pose(cxJogador: number): Pose {
  const cx = 1 - cxJogador;
  const p = Array.from({ length: 33 }, () => ({ x: cx, y: 0.6, visibility: 1 }));
  p[0] = { x: cx, y: 0.3, visibility: 1 };
  p[11] = { x: cx + 0.1, y: 0.45, visibility: 1 };
  p[12] = { x: cx - 0.1, y: 0.45, visibility: 1 };
  p[15] = { x: cx + 0.12, y: 0.7, visibility: 1 };
  p[16] = { x: cx - 0.12, y: 0.7, visibility: 1 };
  return p;
}

const NOTICIAS: Noticia[] = [{
  id: 'n1', titulo: 'Título', descricao: 'Descrição', saibaMais: '', tema: 'saude',
  veredito: 'falsa', explicacao: 'Explicação', tecnica: 'imagem', fonteUrl: 'https://exemplo.org',
}];

let jogo: ReturnType<typeof useJogo>;
function Jogo({ registro }: { registro?: Registro }) {
  jogo = useJogo(NOTICIAS, AJUSTES_PADRAO, false, registro);
  return <video ref={jogo.videoRef} />;
}

beforeEach(() => {
  quadros = [];
  agora = 0;
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });
  vi.stubGlobal('requestAnimationFrame', (f: FrameRequestCallback) => { quadros.push(f); return quadros.length; });
  vi.stubGlobal('cancelAnimationFrame', () => { quadros = []; });
  vi.spyOn(HTMLMediaElement.prototype, 'readyState', 'get').mockReturnValue(4);
  Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: Object.assign(new EventTarget(), { getUserMedia: vi.fn() }) });
  mocks.abrirCamera.mockReset().mockResolvedValue(fluxo());
  mocks.criarDetector.mockReset();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('laço de desenho com a detecção fora dele (FR-20)', () => {
  it('com uma leitura em andamento, a tela segue: um tick por quadro e nenhum pedido novo', async () => {
    const { d } = detectorControlado();
    const registro = criarRegistro();
    render(<Jogo registro={registro} />);
    await esvaziar();
    expect(jogo.camera).toBe('ativa');
    act(() => jogo.despachar({ tipo: 'enter' })); // calibração: o tick conta o tempo
    act(() => avancarQuadros(30));
    expect(d.ler).toHaveBeenCalledTimes(1);
    expect(registro.resumo(agora).fps).toBe(30);
    expect(jogo.estado.tela).toBe('calibracao');
  });

  it('a leitura chega: aplicada uma vez (presença da calibração) e o próximo pedido sai no ritmo', async () => {
    const { d, pedidos } = detectorControlado();
    const registro = criarRegistro();
    render(<Jogo registro={registro} />);
    await esvaziar();
    act(() => jogo.despachar({ tipo: 'enter' }));
    act(() => avancarQuadros(1));
    const captura = pedidos[0]!.capturaMs;
    await act(async () => { pedidos[0]!.ok({ poses: [pose(0.5)], capturaMs: captura, deteccaoMs: 60 }); });
    act(() => avancarQuadros(4));
    expect(d.ler).toHaveBeenCalledTimes(2);
    // Presença centralizada da última leitura conta a calibração em todos os quadros (não só no da leitura).
    expect(jogo.estado.tela === 'calibracao' && jogo.estado.centradoMs).toBeGreaterThan(60);
    expect(jogo.poseRef.current).not.toBeNull();
    const amostras = registro.exportar().amostras;
    expect(amostras.filter((a) => a.deteccaoMs !== null).map((a) => a.deteccaoMs)).toEqual([60]);
    expect(registro.resumo(agora).leiturasPorS).toBe(1);
  });

  it('uma leitura atrasada (captura anterior à já aplicada) não é aplicada', async () => {
    const { pedidos } = detectorControlado();
    const registro = criarRegistro();
    render(<Jogo registro={registro} />);
    await esvaziar();
    act(() => avancarQuadros(1));
    await act(async () => { pedidos[0]!.ok({ poses: [], capturaMs: 500, deteccaoMs: 10 }); });
    act(() => avancarQuadros(3));
    await act(async () => { pedidos[1]!.ok({ poses: [], capturaMs: 400, deteccaoMs: 10 }); });
    act(() => avancarQuadros(3));
    expect(registro.exportar().amostras.filter((a) => a.deteccaoMs !== null)).toHaveLength(1);
  });

  it('worker morto: fecha o detector, a câmera fica indisponível e é reaberta na espera (NFR Reliability)', async () => {
    const primeiro = detectorControlado();
    render(<Jogo />);
    await esvaziar();
    act(() => avancarQuadros(1));
    act(() => primeiro.falhar(new Error('worker morreu')));
    expect(primeiro.d.fechar).toHaveBeenCalled();
    expect(jogo.camera).toBe('indisponivel');
    const segundo = detectorControlado();
    await act(async () => { vi.advanceTimersByTime(5500); });
    await esvaziar();
    expect(jogo.camera).toBe('ativa');
    act(() => avancarQuadros(1));
    expect(segundo.d.ler).toHaveBeenCalledTimes(1);
  });

  it('leitura rejeitada (ex.: WebGL perdido no worker): mesmo caminho, e os ticks seguem', async () => {
    const { d, pedidos } = detectorControlado();
    const registro = criarRegistro();
    render(<Jogo registro={registro} />);
    await esvaziar();
    act(() => avancarQuadros(1));
    await act(async () => { pedidos[0]!.falha(new Error('context lost')); });
    expect(d.fechar).toHaveBeenCalled();
    expect(jogo.camera).toBe('indisponivel');
    act(() => avancarQuadros(5));
    expect(registro.resumo(agora).fps).toBe(6);
    expect(d.ler).toHaveBeenCalledTimes(1);
  });

  it('leitura sem resposta por muito tempo conta como travada: fecha e marca indisponível', async () => {
    const { d } = detectorControlado();
    render(<Jogo />);
    await esvaziar();
    act(() => avancarQuadros(1));
    act(() => avancarQuadros(1, 16_000));
    expect(d.fechar).toHaveBeenCalled();
    expect(jogo.camera).toBe('indisponivel');
  });

  it('desmontar fecha o detector', async () => {
    const { d } = detectorControlado();
    const { unmount } = render(<Jogo />);
    await esvaziar();
    unmount();
    expect(d.fechar).toHaveBeenCalled();
  });

  it('o Diagnóstico recebe onde a detecção roda', async () => {
    detectorControlado('principal');
    render(<Jogo />);
    await esvaziar();
    expect(jogo.aceleracao).toMatchObject({ onde: 'principal' });
  });
});
