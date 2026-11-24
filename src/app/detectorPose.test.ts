import { describe, expect, it, vi } from 'vitest';

vi.mock('@mediapipe/tasks-vision', () => ({ FilesetResolver: {}, PoseLandmarker: {} }));
import { detectorPrincipal, iniciarDetectorWorker, type WorkerPose } from './detectorPose';
import type { PedidoWorker, RespostaWorker } from './poseProtocolo';

// FR-20 (v13.3.0, Fase 52.3): o lado da página do Web Worker da pose, com um worker falso.

function workerFalso() {
  const ouvintes: Record<string, ((e: unknown) => void)[]> = {};
  const enviados: { msg: PedidoWorker; transfer?: Transferable[] }[] = [];
  const w: WorkerPose & { responder(r: RespostaWorker): void; disparar(tipo: string, e?: unknown): void } = {
    postMessage: vi.fn((msg: PedidoWorker, transfer?: Transferable[]) => { enviados.push({ msg, transfer }); }),
    terminate: vi.fn(),
    addEventListener: (tipo: string, f: (e: never) => void) => { (ouvintes[tipo] ??= []).push(f as (e: unknown) => void); },
    responder(r) { for (const f of ouvintes.message ?? []) f({ data: r }); },
    disparar(tipo, e = {}) { for (const f of ouvintes[tipo] ?? []) f(e); },
  };
  return { w, enviados };
}

const video = {} as HTMLVideoElement;
const bitmap = () => ({ close: vi.fn() }) as unknown as ImageBitmap;
const pronto: RespostaWorker = { tipo: 'pronto', delegate: 'GPU', renderizador: 'ANGLE (AMD Radeon)', aquecimentoMs: 1200 };

async function iniciado(over: Partial<Parameters<typeof iniciarDetectorWorker>[0]> = {}) {
  const { w, enviados } = workerFalso();
  const aoFalhar = vi.fn();
  const p = iniciarDetectorWorker({ worker: w, base: '/', falsa: null, numPoses: 3, aoFalhar, capturar: async () => bitmap(), ...over });
  w.responder(pronto);
  const d = await p;
  return { d, w, enviados, aoFalhar };
}

describe('iniciarDetectorWorker', () => {
  it('pede para iniciar com a base do app e fica pronto com delegate, renderizador e aquecimento', async () => {
    const { d, enviados } = await iniciado();
    expect(enviados[0]!.msg).toEqual({ tipo: 'iniciar', base: '/', falsa: null, numPoses: 3 });
    expect(d.onde).toBe('worker');
    expect(d.aceleracao).toMatchObject({ software: false, onde: 'worker', aquecimentoMs: 1200 });
    expect(d.aceleracao.texto).toContain('ANGLE (AMD Radeon)');
  });

  it('erro ao iniciar (ou worker que não carrega): rejeita e encerra o worker', async () => {
    for (const falha of ['erro', 'evento'] as const) {
      const { w } = workerFalso();
      const p = iniciarDetectorWorker({ worker: w, base: '/', falsa: null, numPoses: 3, aoFalhar: vi.fn(), capturar: async () => bitmap() });
      if (falha === 'erro') w.responder({ tipo: 'erro', fase: 'iniciar', mensagem: 'sem modelo' });
      else w.disparar('error', { message: 'script' });
      await expect(p).rejects.toThrow();
      expect(w.terminate).toHaveBeenCalled();
    }
  });

  it('sem resposta a tempo: rejeita e encerra o worker', async () => {
    vi.useFakeTimers();
    try {
      const { w } = workerFalso();
      const p = iniciarDetectorWorker({ worker: w, base: '/', falsa: null, numPoses: 3, aoFalhar: vi.fn(), capturar: async () => bitmap(), tempoMaxInicioMs: 1000 });
      const esperado = expect(p).rejects.toThrow(/tempo/);
      await vi.advanceTimersByTimeAsync(1001);
      await esperado;
      expect(w.terminate).toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('ler: transfere o quadro (sem cópia, só na memória) com o instante da captura e devolve a leitura', async () => {
    const q = bitmap();
    const { d, w, enviados } = await iniciado({ capturar: async () => q });
    const p = d.ler(video, 1234);
    await Promise.resolve();
    await Promise.resolve();
    expect(enviados[1]).toEqual({ msg: { tipo: 'detectar', quadro: q, capturaMs: 1234 }, transfer: [q] });
    w.responder({ tipo: 'leitura', poses: [], capturaMs: 1234, deteccaoMs: 40 });
    expect(await p).toEqual({ poses: [], capturaMs: 1234, deteccaoMs: 40 });
  });

  it('quadro que não pôde ser capturado (vídeo sem dados): sem leitura, sem erro', async () => {
    const { d } = await iniciado({ capturar: async () => { throw new DOMException('sem dados', 'InvalidStateError'); } });
    expect(await d.ler(video, 1)).toBeNull();
  });

  it('erro na detecção rejeita a leitura (a página fecha o detector e reabre a câmera, NFR Reliability)', async () => {
    const { d, w } = await iniciado();
    const p = d.ler(video, 1);
    await new Promise((ok) => setTimeout(ok, 0));
    w.responder({ tipo: 'erro', fase: 'detectar', mensagem: 'context lost' });
    await expect(p).rejects.toThrow('context lost');
  });

  it('worker morto depois de pronto: rejeita a leitura pendente e avisa', async () => {
    const { d, w, aoFalhar } = await iniciado();
    const p = d.ler(video, 1);
    await new Promise((ok) => setTimeout(ok, 0));
    w.disparar('error', { message: 'morreu' });
    await expect(p).rejects.toThrow();
    expect(aoFalhar).toHaveBeenCalled();
  });

  it('fechar avisa o worker, encerra e resolve a pendente sem leitura; depois, ler não manda nada', async () => {
    const { d, w, enviados } = await iniciado();
    const p = d.ler(video, 1);
    await new Promise((ok) => setTimeout(ok, 0));
    d.fechar();
    expect(await p).toBeNull();
    expect(w.terminate).toHaveBeenCalled();
    expect(enviados.some((e) => e.msg.tipo === 'fechar')).toBe(true);
    const total = enviados.length;
    expect(await d.ler(video, 2)).toBeNull();
    expect(enviados).toHaveLength(total);
    d.fechar(); // idempotente
  });
});

describe('detectorPrincipal (reserva na thread principal)', () => {
  it('detecta na hora, mede o tempo e devolve a leitura; erro vira leitura rejeitada', async () => {
    const r = { detectar: vi.fn(() => [[{ x: 0.5, y: 0.5 }]]), fechar: vi.fn(), aceleracao: { software: true, texto: 'CPU (a GPU falhou)' } };
    const d = detectorPrincipal(r);
    expect(d.onde).toBe('principal');
    expect(d.aceleracao).toMatchObject({ onde: 'principal', software: true });
    const l = await d.ler(video, 500);
    expect(r.detectar).toHaveBeenCalledWith(video, 500);
    expect(l).toMatchObject({ poses: [[{ x: 0.5, y: 0.5 }]], capturaMs: 500 });
    r.detectar.mockImplementation(() => { throw new Error('webgl'); });
    await expect(d.ler(video, 600)).rejects.toThrow('webgl');
    d.fechar();
    expect(r.fechar).toHaveBeenCalled();
  });
});
