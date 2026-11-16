// @vitest-environment jsdom
// NFR Reliability (v12.1.0, Fase 50.3): laço de quadros que sobrevive a erro na detecção, câmera
// que se reabre na tela de espera e que é desligada quando o modelo de pose não carrega.
import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { AJUSTES_PADRAO } from '../core/ajustes';
import type { Registro } from '../core/diagnostico';
import type { Noticia } from '../core/types';
import type { Rastreador } from './rastreador';
import { useJogo } from './useJogo';

const mocks = vi.hoisted(() => ({ abrirCamera: vi.fn(), criarRastreador: vi.fn() }));
vi.mock('./rastreador', () => mocks);

let quadros: FrameRequestCallback[] = [];
let agora = 0;
function avancarQuadros(n: number, passoMs = 16) {
  for (let i = 0; i < n; i++) {
    agora += passoMs;
    const fila = quadros;
    quadros = [];
    for (const f of fila) f(agora);
  }
}
/** Deixa as promessas pendentes (câmera, modelo) andarem. */
const esvaziar = () => act(async () => { for (let i = 0; i < 10; i++) await Promise.resolve(); });

function trilha() {
  const ouvintes: Record<string, (() => void)[]> = {};
  return {
    stop: vi.fn(),
    addEventListener: (tipo: string, f: () => void) => { (ouvintes[tipo] ??= []).push(f); },
    disparar: (tipo: string) => ouvintes[tipo]?.forEach((f) => f()),
  };
}
function fluxo() {
  const t = trilha();
  return { trilha: t, stream: { getTracks: () => [t], getVideoTracks: () => [t] } as unknown as MediaStream };
}
function rastreadorFalso(detectar: Rastreador['detectar'] = () => []): { detectar: Mock<Rastreador['detectar']>; fechar: Mock<() => void> } {
  return { detectar: vi.fn(detectar), fechar: vi.fn<() => void>() };
}
const erro = (name: string) => new DOMException('falhou', name);

const NOTICIAS: Noticia[] = [{
  id: 'n1', titulo: 'Título', descricao: 'Descrição', saibaMais: '', tema: 'saude',
  veredito: 'falsa', explicacao: 'Explicação', tecnica: 'imagem', fonteUrl: 'https://exemplo.org',
}];

let jogo: ReturnType<typeof useJogo>;
function Jogo({ registro }: { registro?: Registro }) {
  jogo = useJogo(NOTICIAS, AJUSTES_PADRAO, false, registro);
  return <video ref={jogo.videoRef} />;
}

let dispositivos: EventTarget;
beforeEach(() => {
  quadros = [];
  agora = 0;
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });
  vi.stubGlobal('requestAnimationFrame', (f: FrameRequestCallback) => { quadros.push(f); return quadros.length; });
  vi.stubGlobal('cancelAnimationFrame', () => { quadros = []; });
  vi.spyOn(HTMLMediaElement.prototype, 'readyState', 'get').mockReturnValue(4);
  dispositivos = new EventTarget();
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: Object.assign(dispositivos, { getUserMedia: vi.fn() }),
  });
  mocks.abrirCamera.mockReset();
  mocks.criarRastreador.mockReset();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  delete (window as { matchDoSaber?: unknown }).matchDoSaber;
});

describe('laço de quadros (NFR Reliability v12.1.0)', () => {
  it('continua depois que a detecção lança: fecha o rastreador e a câmera fica indisponível', async () => {
    const r = rastreadorFalso(() => { throw new Error('contexto WebGL perdido'); });
    mocks.abrirCamera.mockResolvedValue(fluxo().stream);
    mocks.criarRastreador.mockResolvedValue(r);
    const adicionar = vi.fn();
    render(<Jogo registro={{ adicionar } as unknown as Registro} />);
    await esvaziar();
    expect(jogo.camera).toBe('ativa');

    act(() => avancarQuadros(1));
    expect(r.detectar).toHaveBeenCalledTimes(1);
    expect(r.fechar).toHaveBeenCalled();
    expect(jogo.camera).toBe('indisponivel');
    expect(quadros.length).toBe(1); // o próximo quadro já está agendado

    adicionar.mockClear();
    act(() => avancarQuadros(5));
    expect(adicionar).toHaveBeenCalledTimes(5); // os ticks seguem
    expect(r.detectar).toHaveBeenCalledTimes(1); // o rastreador quebrado não é usado de novo
  });

  it('reagenda o quadro antes de processar: um erro no resto do quadro não para o laço', async () => {
    mocks.abrirCamera.mockRejectedValue(erro('NotFoundError'));
    let falhas = 0;
    const adicionar = vi.fn(() => { if (falhas++ === 0) throw new Error('falha qualquer'); });
    render(<Jogo registro={{ adicionar } as unknown as Registro} />);
    await esvaziar();
    expect(() => avancarQuadros(1)).toThrow();
    expect(quadros.length).toBe(1);
    act(() => avancarQuadros(3));
    expect(adicionar).toHaveBeenCalledTimes(4);
  });
});

describe('câmera (NFR Reliability v12.1.0)', () => {
  it('modelo que não carrega: o stream é parado (luz da webcam apaga) e a câmera fica indisponível', async () => {
    const { stream, trilha: t } = fluxo();
    mocks.abrirCamera.mockResolvedValue(stream);
    mocks.criarRastreador.mockRejectedValue(new Error('sem modelo'));
    render(<Jogo />);
    await esvaziar();
    expect(t.stop).toHaveBeenCalled();
    expect(jogo.camera).toBe('indisponivel');
  });

  it('NotAllowedError vira "negada" e não é tentado de novo na web', async () => {
    mocks.abrirCamera.mockRejectedValue(erro('NotAllowedError'));
    render(<Jogo />);
    await esvaziar();
    expect(jogo.camera).toBe('negada');
    await act(async () => { vi.advanceTimersByTime(20000); });
    dispositivos.dispatchEvent(new Event('devicechange'));
    await esvaziar();
    expect(mocks.abrirCamera).toHaveBeenCalledTimes(1);
  });

  it('câmera ocupada (NotReadableError) vira "indisponivel" e é reaberta na espera depois de ~5 s', async () => {
    const { stream } = fluxo();
    mocks.abrirCamera.mockRejectedValueOnce(erro('NotReadableError')).mockResolvedValue(stream);
    mocks.criarRastreador.mockResolvedValue(rastreadorFalso());
    render(<Jogo />);
    await esvaziar();
    expect(jogo.camera).toBe('indisponivel');
    await act(async () => { vi.advanceTimersByTime(4000); });
    expect(mocks.abrirCamera).toHaveBeenCalledTimes(1);
    await act(async () => { vi.advanceTimersByTime(1500); });
    await esvaziar();
    expect(mocks.abrirCamera).toHaveBeenCalledTimes(2);
    expect(jogo.camera).toBe('ativa');
  });

  it('câmera desconectada (NotFoundError) é reaberta quando um dispositivo é conectado', async () => {
    mocks.abrirCamera.mockRejectedValueOnce(erro('NotFoundError')).mockResolvedValue(fluxo().stream);
    mocks.criarRastreador.mockResolvedValue(rastreadorFalso());
    render(<Jogo />);
    await esvaziar();
    expect(jogo.camera).toBe('indisponivel');
    dispositivos.dispatchEvent(new Event('devicechange'));
    await esvaziar();
    expect(jogo.camera).toBe('ativa');
  });

  it('no app de desktop, até NotAllowedError é reaberto (a permissão é do próprio app)', async () => {
    (window as { matchDoSaber?: unknown }).matchDoSaber = { desktop: true };
    mocks.abrirCamera.mockRejectedValueOnce(erro('NotAllowedError')).mockResolvedValue(fluxo().stream);
    mocks.criarRastreador.mockResolvedValue(rastreadorFalso());
    render(<Jogo />);
    await esvaziar();
    expect(jogo.camera).toBe('negada');
    await act(async () => { vi.advanceTimersByTime(5500); });
    await esvaziar();
    expect(jogo.camera).toBe('ativa');
  });

  it('não tenta reabrir fora da tela de espera (partida em andamento)', async () => {
    mocks.abrirCamera.mockRejectedValueOnce(erro('NotFoundError')).mockResolvedValue(fluxo().stream);
    mocks.criarRastreador.mockResolvedValue(rastreadorFalso());
    render(<Jogo />);
    await esvaziar();
    act(() => jogo.despachar({ tipo: 'enter' }));
    expect(jogo.estado.tela).not.toBe('espera');
    await act(async () => { vi.advanceTimersByTime(20000); });
    dispositivos.dispatchEvent(new Event('devicechange'));
    await esvaziar();
    expect(mocks.abrirCamera).toHaveBeenCalledTimes(1);
  });

  it('trilha encerrada (ended): fecha o rastreador, para o stream e reabre na espera', async () => {
    const primeiro = fluxo();
    const r = rastreadorFalso();
    mocks.abrirCamera.mockResolvedValueOnce(primeiro.stream).mockResolvedValue(fluxo().stream);
    mocks.criarRastreador.mockResolvedValueOnce(r).mockResolvedValue(rastreadorFalso());
    render(<Jogo />);
    await esvaziar();
    expect(jogo.camera).toBe('ativa');
    act(() => primeiro.trilha.disparar('ended'));
    expect(r.fechar).toHaveBeenCalled();
    expect(primeiro.trilha.stop).toHaveBeenCalled();
    expect(jogo.camera).toBe('indisponivel');
    await act(async () => { vi.advanceTimersByTime(5500); });
    await esvaziar();
    expect(jogo.camera).toBe('ativa');
  });

  it('depois de um erro na detecção, a câmera é reaberta na espera com um rastreador novo', async () => {
    const quebrado = rastreadorFalso(() => { throw new Error('perdido'); });
    const novo = rastreadorFalso();
    const primeiro = fluxo();
    mocks.abrirCamera.mockResolvedValueOnce(primeiro.stream).mockResolvedValue(fluxo().stream);
    mocks.criarRastreador.mockResolvedValueOnce(quebrado).mockResolvedValue(novo);
    render(<Jogo />);
    await esvaziar();
    act(() => avancarQuadros(1));
    expect(jogo.camera).toBe('indisponivel');
    await act(async () => { vi.advanceTimersByTime(5500); });
    await esvaziar();
    expect(primeiro.trilha.stop).toHaveBeenCalled();
    expect(jogo.camera).toBe('ativa');
    act(() => avancarQuadros(2));
    expect(novo.detectar).toHaveBeenCalledTimes(2);
  });

  it('desmontar para o stream, fecha o rastreador e para as tentativas', async () => {
    const { stream, trilha: t } = fluxo();
    const r = rastreadorFalso();
    mocks.abrirCamera.mockResolvedValue(stream);
    mocks.criarRastreador.mockResolvedValue(r);
    const { unmount } = render(<Jogo />);
    await esvaziar();
    unmount();
    expect(t.stop).toHaveBeenCalled();
    expect(r.fechar).toHaveBeenCalled();
    await act(async () => { vi.advanceTimersByTime(20000); });
    expect(mocks.abrirCamera).toHaveBeenCalledTimes(1);
  });
});
