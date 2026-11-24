import { lerDeteccaoFalsa } from '../core/deteccaoFalsa';
import { descreverAceleracao, type Aceleracao } from '../core/diagnostico';
import type { LeituraPose } from '../core/leituraPose';
import type { PedidoWorker, RespostaWorker } from './poseProtocolo';
import { NUM_POSES, criarRastreador, type Rastreador } from './rastreador';

/**
 * Detecção de pose fora do laço de desenho (FR-20, v13.3.0): num Web Worker quando o ambiente permite; senão, na
 * thread principal (a reserva), que o laço chama no máximo em quadros alternados.
 */
export interface DetectorPose {
  onde: 'worker' | 'principal';
  aceleracao: Aceleracao;
  /**
   * Pede uma leitura do quadro atual do vídeo, capturado em `capturaMs`. No worker, responde quando a detecção termina;
   * na thread principal, detecta na hora. null: sem quadro (vídeo sem dados) ou detector fechado. Rejeita em erro.
   */
  ler(video: HTMLVideoElement, capturaMs: number): Promise<LeituraPose | null>;
  fechar(): void;
}

/** O que a página usa do `Worker` (permite um worker falso nos testes). */
export interface WorkerPose {
  postMessage(msg: PedidoWorker, transfer?: Transferable[]): void;
  terminate(): void;
  addEventListener(tipo: 'message' | 'error' | 'messageerror', f: (e: { data?: unknown; message?: string }) => void): void;
}

/** Carregar o modelo e aquecer pode levar uns segundos numa máquina fraca; além disto, a reserva assume. */
export const TEMPO_MAX_INICIO_MS = 60_000;

export function iniciarDetectorWorker({ worker, base, falsa, numPoses, aoFalhar, capturar, tempoMaxInicioMs = TEMPO_MAX_INICIO_MS }: {
  worker: WorkerPose;
  base: string;
  falsa: { ms: number } | null;
  numPoses: number;
  /** Erro do worker fora de uma leitura (ex.: o worker morreu). */
  aoFalhar: (e: unknown) => void;
  capturar: (video: HTMLVideoElement) => Promise<ImageBitmap>;
  tempoMaxInicioMs?: number;
}): Promise<DetectorPose> {
  return new Promise((resolver, rejeitar) => {
    let iniciado = false;
    let fechado = false;
    let pendente: { ok: (l: LeituraPose | null) => void; falha: (e: unknown) => void } | null = null;
    const encerrar = () => {
      if (fechado) return;
      fechado = true;
      try { worker.postMessage({ tipo: 'fechar' }); } catch { /* já morto */ }
      worker.terminate();
    };
    const falharInicio = (e: unknown) => {
      clearTimeout(limite);
      encerrar();
      rejeitar(e instanceof Error ? e : new Error(String((e as { message?: string })?.message ?? e)));
    };
    const limite = setTimeout(() => { if (!iniciado) falharInicio(new Error('o worker da pose não respondeu a tempo')); }, tempoMaxInicioMs);

    const morto = (e: unknown) => {
      if (fechado) return;
      if (!iniciado) return falharInicio(e);
      const erro = new Error(`worker da pose: ${(e as { message?: string })?.message ?? 'erro'}`);
      pendente?.falha(erro);
      pendente = null;
      aoFalhar(erro);
    };
    worker.addEventListener('error', morto);
    worker.addEventListener('messageerror', morto);
    worker.addEventListener('message', (e) => {
      const r = e.data as RespostaWorker;
      if (fechado) return;
      if (r.tipo === 'pronto' && !iniciado) {
        iniciado = true;
        clearTimeout(limite);
        resolver({
          onde: 'worker',
          aceleracao: { ...descreverAceleracao(r.delegate, r.renderizador), onde: 'worker', aquecimentoMs: Math.round(r.aquecimentoMs) },
          async ler(video, capturaMs) {
            if (fechado) return null;
            let quadro: ImageBitmap;
            try { quadro = await capturar(video); } catch { return null; }
            if (fechado) { quadro.close(); return null; }
            return new Promise<LeituraPose | null>((ok, falha) => {
              pendente = { ok, falha };
              worker.postMessage({ tipo: 'detectar', quadro, capturaMs }, [quadro]);
            });
          },
          fechar() {
            encerrar();
            pendente?.ok(null);
            pendente = null;
          },
        });
      } else if (r.tipo === 'erro') {
        if (!iniciado) return falharInicio(new Error(r.mensagem));
        pendente?.falha(new Error(r.mensagem));
        pendente = null;
      } else if (r.tipo === 'leitura') {
        pendente?.ok({ poses: r.poses, capturaMs: r.capturaMs, deteccaoMs: r.deteccaoMs });
        pendente = null;
      }
    });
    worker.postMessage({ tipo: 'iniciar', base, falsa, numPoses });
  });
}

/** A reserva (FR-20): o rastreador da thread principal, detectando na hora em que a leitura é pedida. */
export function detectorPrincipal(r: Rastreador): DetectorPose {
  return {
    onde: 'principal',
    aceleracao: { ...(r.aceleracao ?? { software: false, texto: 'desconhecida' }), onde: 'principal' },
    ler(video, capturaMs) {
      const inicio = performance.now();
      try {
        const poses = r.detectar(video, capturaMs);
        return Promise.resolve({ poses, capturaMs, deteccaoMs: performance.now() - inicio });
      } catch (e) {
        return Promise.reject(e);
      }
    },
    fechar: () => r.fechar(),
  };
}

/**
 * O detector do jogo: o Web Worker quando dá (Electron e navegadores atuais); se ele não puder ser criado ou não
 * iniciar, a thread principal. Os E2E de cadência podem pedir a detecção falsa (`__mdsDeteccaoFalsa`).
 */
export async function criarDetector({ aoFalhar }: { aoFalhar: (e: unknown) => void }): Promise<DetectorPose> {
  const falsa = lerDeteccaoFalsa(globalThis);
  const podeWorker = typeof Worker !== 'undefined' && typeof createImageBitmap === 'function';
  if (podeWorker && falsa?.onde !== 'principal') {
    try {
      // No build, worker clássico (IIFE): o MediaPipe carrega o mesmo WASM da thread principal com importScripts, que
      // já está no precache do PWA. No dev, o Vite só serve o worker como módulo (usa a versão ES do WASM).
      const worker = import.meta.env.DEV
        ? new Worker(new URL('./poseWorker.ts', import.meta.url), { type: 'module', name: 'pose' })
        : new Worker(new URL('./poseWorker.ts', import.meta.url), { name: 'pose' });
      return await iniciarDetectorWorker({
        worker: worker as unknown as WorkerPose,
        base: import.meta.env.BASE_URL,
        falsa: falsa ? { ms: falsa.ms } : null,
        numPoses: NUM_POSES,
        aoFalhar,
        capturar: (video) => createImageBitmap(video),
      });
    } catch (e) {
      console.warn('[match-do-saber] worker da pose indisponível; a detecção roda na thread principal', e);
    }
  }
  return detectorPrincipal(await criarRastreador());
}
