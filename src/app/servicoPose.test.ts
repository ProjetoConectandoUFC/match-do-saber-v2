import { describe, expect, it, vi } from 'vitest';
import type { Pose } from '../core/gestos';
import type { RespostaWorker } from './poseProtocolo';
import { criarServicoPose, paraPoses, type DepsServico, type Marcador } from './servicoPose';

// FR-20 (v13.3.0, Fase 52.3): o que o Web Worker da pose faz com cada mensagem, sem MediaPipe nem worker de verdade.

const pose: Pose = [{ x: 0.5, y: 0.5, visibility: 0.9 }];

function deps(over: Partial<DepsServico> = {}) {
  const respostas: RespostaWorker[] = [];
  let t = 0;
  const marcador: Marcador = { detectar: vi.fn(() => [pose]), fechar: vi.fn() };
  const d: DepsServico = {
    criarMarcador: vi.fn(async () => marcador),
    renderizador: () => 'ANGLE (AMD Radeon)',
    quadroVazio: () => ({}) as never,
    agora: () => (t += 5),
    responder: (r) => respostas.push(r),
    ...over,
  };
  return { d, respostas, marcador };
}

const iniciar = { tipo: 'iniciar', base: '/', falsa: null, numPoses: 3 } as const;
const quadro = () => ({ close: vi.fn() }) as unknown as ImageBitmap;

describe('criarServicoPose', () => {
  it('inicia com GPU, aquece o modelo com um quadro vazio e avisa que está pronto', async () => {
    const { d, respostas, marcador } = deps();
    await criarServicoPose(d).receber(iniciar);
    expect(d.criarMarcador).toHaveBeenCalledWith('GPU', 3);
    expect(marcador.detectar).toHaveBeenCalledTimes(1); // aquecimento (a 1ª detecção é a mais lenta)
    expect(respostas).toEqual([{ tipo: 'pronto', delegate: 'GPU', renderizador: 'ANGLE (AMD Radeon)', aquecimentoMs: 5 }]);
  });

  it('a GPU falhou: cai para a CPU', async () => {
    const marcador: Marcador = { detectar: vi.fn(() => []), fechar: vi.fn() };
    const criarMarcador = vi.fn(async (delegate: 'GPU' | 'CPU') => {
      if (delegate === 'GPU') throw new Error('sem WebGL');
      return marcador;
    });
    const { d, respostas } = deps({ criarMarcador });
    await criarServicoPose(d).receber(iniciar);
    expect(criarMarcador.mock.calls.map((c) => c[0])).toEqual(['GPU', 'CPU']);
    expect(respostas[0]).toMatchObject({ tipo: 'pronto', delegate: 'CPU' });
  });

  it('nem GPU nem CPU: responde erro de início', async () => {
    const { d, respostas } = deps({ criarMarcador: async () => { throw new Error('modelo ausente'); } });
    await criarServicoPose(d).receber(iniciar);
    expect(respostas).toEqual([{ tipo: 'erro', fase: 'iniciar', mensagem: 'modelo ausente' }]);
  });

  it('detecta no quadro recebido, com o instante da captura, mede o tempo e fecha o quadro', async () => {
    const { d, respostas, marcador } = deps();
    const s = criarServicoPose(d);
    await s.receber(iniciar);
    const q = quadro();
    await s.receber({ tipo: 'detectar', quadro: q, capturaMs: 1000 });
    expect(marcador.detectar).toHaveBeenLastCalledWith(q, 1000);
    expect(q.close).toHaveBeenCalled();
    expect(respostas.at(-1)).toEqual({ tipo: 'leitura', poses: [pose], capturaMs: 1000, deteccaoMs: 5 });
  });

  it('o MediaPipe exige instantes crescentes: uma captura repetida vai 1 ms à frente; a leitura guarda a captura real', async () => {
    const { d, respostas, marcador } = deps();
    const s = criarServicoPose(d);
    await s.receber(iniciar);
    await s.receber({ tipo: 'detectar', quadro: quadro(), capturaMs: 1000 });
    await s.receber({ tipo: 'detectar', quadro: quadro(), capturaMs: 1000 });
    expect(vi.mocked(marcador.detectar).mock.calls.at(-1)![1]).toBe(1001);
    expect(respostas.at(-1)).toMatchObject({ capturaMs: 1000 });
  });

  it('erro na detecção (ex.: contexto WebGL perdido): responde erro e fecha o quadro', async () => {
    const { d, respostas, marcador } = deps();
    const s = criarServicoPose(d);
    await s.receber(iniciar);
    vi.mocked(marcador.detectar).mockImplementation(() => { throw new Error('context lost'); });
    const q = quadro();
    await s.receber({ tipo: 'detectar', quadro: q, capturaMs: 2000 });
    expect(q.close).toHaveBeenCalled();
    expect(respostas.at(-1)).toEqual({ tipo: 'erro', fase: 'detectar', mensagem: 'context lost' });
  });

  it('detectar antes de pronto é erro (e o quadro é fechado)', async () => {
    const { d, respostas } = deps();
    const q = quadro();
    await criarServicoPose(d).receber({ tipo: 'detectar', quadro: q, capturaMs: 1 });
    expect(q.close).toHaveBeenCalled();
    expect(respostas[0]).toMatchObject({ tipo: 'erro', fase: 'detectar' });
  });

  it('fechar fecha o marcador', async () => {
    const { d, marcador } = deps();
    const s = criarServicoPose(d);
    await s.receber(iniciar);
    await s.receber({ tipo: 'fechar' });
    expect(marcador.fechar).toHaveBeenCalled();
  });
});

describe('paraPoses', () => {
  it('só x, y e visibility de cada ponto (menos dados copiados entre as threads)', () => {
    expect(paraPoses([[{ x: 0.1, y: 0.2, z: -0.3, visibility: 0.9 }]])).toEqual([[{ x: 0.1, y: 0.2, visibility: 0.9 }]]);
  });
});
