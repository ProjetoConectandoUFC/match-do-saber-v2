import { describe, expect, it } from 'vitest';
import { alternarDiagnostico, criarRegistro, descreverAceleracao, extrairPontos, type Amostra } from './diagnostico';
import type { Pose } from './gestos';

const amostra = (t: number, over: Partial<Amostra> = {}): Amostra => ({
  t, dtMs: 33, deteccaoMs: 20, pessoas: 1, tela: 'card', modo: 'mao', pontos: {}, medidas: {}, gestos: [], ...over,
});

describe('extrairPontos', () => {
  it('pega nariz, orelhas, ombros e punhos com x, y e confiança (3 casas)', () => {
    const pose: Pose = Array.from({ length: 33 }, (_, i) => ({ x: i / 100, y: 0.123456, visibility: 0.98765 }));
    const p = extrairPontos(pose);
    expect(Object.keys(p).sort()).toEqual(['nariz', 'ombroD', 'ombroE', 'orelhaD', 'orelhaE', 'punhoD', 'punhoE']);
    expect(p.punhoD).toEqual({ x: 0.16, y: 0.123, conf: 0.988 });
    expect(extrairPontos(null)).toEqual({});
  });
  it('confiança ausente vira 0', () => {
    const pose: Pose = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5 }));
    expect(extrairPontos(pose).nariz!.conf).toBe(0);
  });
});

describe('criarRegistro', () => {
  it('AC-12.4: guarda só a janela de 60 s', () => {
    const r = criarRegistro();
    for (let t = 0; t <= 70_000; t += 1000) r.adicionar(amostra(t));
    const exp = r.exportar();
    expect(exp.amostras[0]!.t).toBe(10_000);
    expect(exp.amostras.at(-1)!.t).toBe(70_000);
  });
  it('AC-12.3: resumo do último segundo (quadros, detecção média e máxima, gestos dos últimos 5 s)', () => {
    const r = criarRegistro();
    r.adicionar(amostra(500, { gestos: ['direita'] }));
    r.adicionar(amostra(5600, { deteccaoMs: 100 }));
    r.adicionar(amostra(5800, { deteccaoMs: 140 }));
    r.adicionar(amostra(6000, { deteccaoMs: null, gestos: ['maosParaCima'] }));
    const res = r.resumo(6000);
    expect(res.fps).toBe(3);
    expect(res.deteccaoMediaMs).toBe(120);
    expect(res.deteccaoMaxMs).toBe(140);
    expect(res.gestosRecentes).toEqual(['maosParaCima']);
    expect(r.ultima()!.t).toBe(6000);
  });
  it('FR-20 (v13.3.0): quadros da tela e leituras de pose por segundo, separados (só o quadro que aplicou uma leitura tem deteccaoMs)', () => {
    const r = criarRegistro();
    for (let i = 0; i < 60; i++) r.adicionar(amostra(1000 + i * 16, { deteccaoMs: i % 4 === 0 ? 60 : null }));
    expect(r.resumo(1000 + 59 * 16)).toMatchObject({ fps: 60, leiturasPorS: 15, deteccaoMediaMs: 60 });
  });
  it('sem amostras com detecção, as médias são null', () => {
    const r = criarRegistro();
    r.adicionar(amostra(100, { deteccaoMs: null }));
    expect(r.resumo(100)).toMatchObject({ fps: 1, leiturasPorS: 0, deteccaoMediaMs: null, deteccaoMaxMs: null });
  });
  it('AC-12.4: exportar devolve versão, data e cópia das amostras', () => {
    const r = criarRegistro(60_000, () => '2026-10-28T12:00:00.000Z');
    r.adicionar(amostra(1));
    const exp = r.exportar();
    expect(exp).toMatchObject({ versao: 1, geradoEm: '2026-10-28T12:00:00.000Z' });
    exp.amostras.pop();
    expect(r.exportar().amostras).toHaveLength(1);
  });
  it('AC-12.4: exportar devolve o início da página em ms desde 1970, para o horário de cada amostra', () => {
    const r = criarRegistro(60_000, () => '2026-10-28T12:00:00.000Z', () => 1_793_188_800_000);
    r.adicionar(amostra(1500));
    const exp = r.exportar();
    expect(exp.inicioPaginaMs).toBe(1_793_188_800_000);
    expect(new Date(exp.inicioPaginaMs + exp.amostras[0]!.t).toISOString()).toBe('2026-10-28T12:00:01.500Z');
  });
});

describe('alternarDiagnostico (AC-12.7, v10.3.0)', () => {
  it('desligado liga com um registro novo; ligado desliga e descarta o registro', () => {
    const r = alternarDiagnostico(undefined);
    expect(r).toBeDefined();
    r!.adicionar(amostra(1000));
    expect(alternarDiagnostico(r)).toBeUndefined();
    const de_novo = alternarDiagnostico(undefined)!;
    expect(de_novo).not.toBe(r);
    expect(de_novo.exportar().amostras).toEqual([]);
  });
});

// Performance (23/11): saber se a detecção está na GPU ou emulada na CPU (WebGL por software).
describe('descreverAceleracao', () => {
  it('GPU com renderizador de hardware', () => {
    expect(descreverAceleracao('GPU', 'ANGLE (AMD, AMD Radeon(TM) Graphics Direct3D11 vs_5_0 ps_5_0)'))
      .toEqual({ software: false, texto: 'GPU · ANGLE (AMD, AMD Radeon(TM) Graphics Direct3D11 vs_5_0 ps_5_0)' });
  });
  it('GPU com WebGL emulado (SwiftShader, llvmpipe, Microsoft Basic Render) conta como software', () => {
    for (const r of ['ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)), SwiftShader driver)', 'llvmpipe (LLVM 15.0.7, 256 bits)', 'ANGLE (Microsoft, Microsoft Basic Render Driver Direct3D11)']) {
      const a = descreverAceleracao('GPU', r);
      expect(a.software).toBe(true);
      expect(a.texto).toContain('emulada na CPU');
    }
  });
  it('delegate CPU é software, com ou sem renderizador', () => {
    expect(descreverAceleracao('CPU', null)).toEqual({ software: true, texto: 'CPU (a GPU falhou)' });
  });
  it('sem renderizador conhecido', () => {
    expect(descreverAceleracao('GPU', null)).toEqual({ software: false, texto: 'GPU · renderizador desconhecido' });
  });
});

describe('resumo: só o último segundo até `agora` (AC-12.3)', () => {
  it('amostras depois de `agora` (o painel redesenha com o `agora` de até 500 ms atrás) não entram na conta', () => {
    const r = criarRegistro();
    for (let t = 0; t < 2000; t += 1000 / 60) r.adicionar(amostra(t, { deteccaoMs: null }));
    expect(r.resumo(1000).fps).toBe(60);
  });
});
