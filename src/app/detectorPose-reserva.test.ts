// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@mediapipe/tasks-vision', () => ({ FilesetResolver: {}, PoseLandmarker: {} }));
vi.mock('./rastreador', () => ({
  NUM_POSES: 3,
  criarRastreador: vi.fn(async () => ({ detectar: () => [], fechar: () => {}, aceleracao: { software: false, texto: 'teste' } })),
}));
import { criarDetector, reiniciarFalhaWorker } from './detectorPose';

// FR-20 (v13.3.1): se o Web Worker da pose falha (ao iniciar ou durante o uso), a reabertura da câmera não pode tentar o
// worker para sempre (câmera "indisponível" em loop): usa a reserva (thread principal) até o app ser reaberto.

type Ouvinte = (e: { data?: unknown; message?: string }) => void;
class WorkerFalso {
  static criados: WorkerFalso[] = [];
  /** false: o worker nunca fica pronto (falha ao iniciar). */
  static responde = true;
  ouvintes: Record<string, Ouvinte[]> = {};
  constructor() { WorkerFalso.criados.push(this); }
  addEventListener(tipo: string, f: Ouvinte) { (this.ouvintes[tipo] ??= []).push(f); }
  postMessage(msg: { tipo: string }) {
    if (msg.tipo !== 'iniciar') return;
    queueMicrotask(() => {
      const r = WorkerFalso.responde
        ? { tipo: 'pronto', delegate: 'GPU', renderizador: 'x', aquecimentoMs: 0 }
        : { tipo: 'erro', mensagem: 'sem modelo' };
      for (const f of this.ouvintes.message ?? []) f({ data: r });
    });
  }
  terminate() {}
  morrer() { for (const f of this.ouvintes.error ?? []) f({ message: 'morreu' }); }
}

beforeEach(() => {
  reiniciarFalhaWorker();
  WorkerFalso.criados = [];
  WorkerFalso.responde = true;
  vi.stubGlobal('Worker', WorkerFalso);
  vi.stubGlobal('createImageBitmap', vi.fn());
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe('FR-20 (v13.3.1): depois de uma falha do worker, a reserva até o app ser reaberto', () => {
  it('o worker morre durante o uso: a próxima abertura usa a thread principal, e as seguintes também', async () => {
    const aoFalhar = vi.fn();
    const d1 = await criarDetector({ aoFalhar });
    expect(d1.onde).toBe('worker');
    WorkerFalso.criados[0]!.morrer();
    WorkerFalso.criados[0]!.morrer(); // mais de um evento de erro do mesmo worker
    expect(aoFalhar).toHaveBeenCalled();
    expect((await criarDetector({ aoFalhar })).onde).toBe('principal');
    expect((await criarDetector({ aoFalhar })).onde).toBe('principal');
    expect(WorkerFalso.criados).toHaveLength(1); // nem cria outro worker
  });

  it('o worker falha ao iniciar: aquela abertura e as seguintes usam a thread principal', async () => {
    WorkerFalso.responde = false;
    const aoFalhar = vi.fn();
    expect((await criarDetector({ aoFalhar })).onde).toBe('principal');
    WorkerFalso.responde = true;
    expect((await criarDetector({ aoFalhar })).onde).toBe('principal');
    expect(WorkerFalso.criados).toHaveLength(1);
    expect(aoFalhar).not.toHaveBeenCalled();
  });

  it('sem falha, toda abertura usa o worker; um app reaberto volta a tentar o worker', async () => {
    const aoFalhar = vi.fn();
    expect((await criarDetector({ aoFalhar })).onde).toBe('worker');
    expect((await criarDetector({ aoFalhar })).onde).toBe('worker');
    WorkerFalso.criados[1]!.morrer();
    expect((await criarDetector({ aoFalhar })).onde).toBe('principal');
    reiniciarFalhaWorker();
    expect((await criarDetector({ aoFalhar })).onde).toBe('worker');
  });
});
