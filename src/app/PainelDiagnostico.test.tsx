// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { criarRegistro } from '../core/diagnostico';
import { PainelDiagnostico } from './PainelDiagnostico';

describe('PainelDiagnostico', () => {
  it('AC-12.3: mostra quadros, detecção, pessoas, pontos, mãos, cabeça e gestos', () => {
    const r = criarRegistro();
    const agora = performance.now();
    r.adicionar({
      t: agora, dtMs: 140, deteccaoMs: 138, pessoas: 1, tela: 'card', modo: 'mao',
      pontos: { punhoD: { x: 0.3, y: 0.31, conf: 0.92 }, punhoE: { x: 0.7, y: 0.71, conf: 0.4 }, ombroD: { x: 0.4, y: 0.45, conf: 0.99 }, ombroE: { x: 0.6, y: 0.46, conf: 0.98 } },
      medidas: { maos: { direita: true, esquerda: false, deslocD: 0.62, deslocE: -0.58 }, cabeca: { rollGraus: 3.2, queixo: -0.28 } },
      gestos: ['direita'],
    });
    render(<PainelDiagnostico registro={r} onBaixar={() => {}} />);
    const painel = screen.getByRole('complementary', { name: 'Diagnóstico' });
    expect(painel).toHaveTextContent('quadros/s: 1');
    expect(painel).toHaveTextContent('detecção: 138 ms (máx 138 ms)');
    expect(painel).toHaveTextContent('pessoas: 1 · modo: Mão · tela: card');
    expect(painel).toHaveTextContent('punho D: y=0.31 conf 0.92 · acima do ombro');
    expect(painel).toHaveTextContent('punho E: y=0.71 conf 0.40');
    expect(painel).toHaveTextContent('mãos (L): D 0.62 · E -0.58');
    expect(painel).toHaveTextContent('ombros: y=0.45 / 0.46');
    // AC-12.3 pede também a confiança dos ombros.
    expect(painel).toHaveTextContent('ombros: y=0.45 / 0.46 conf 0.99 / 0.98');
    expect(painel).toHaveTextContent('cabeça: 3.2° · queixo -0.28');
    expect(painel).toHaveTextContent('gestos (5 s): direita');
  });
  it('sem câmera, a detecção mostra "sem câmera"', () => {
    const r = criarRegistro();
    r.adicionar({ t: performance.now(), dtMs: 16, deteccaoMs: null, pessoas: 0, tela: 'espera', modo: 'corpo', pontos: {}, medidas: {}, gestos: [] });
    render(<PainelDiagnostico registro={r} onBaixar={() => {}} />);
    expect(screen.getByRole('complementary', { name: 'Diagnóstico' })).toHaveTextContent('detecção: sem câmera');
  });
  it('mostra onde a detecção roda (GPU ou CPU) e destaca a emulação por software (performance, 23/11)', () => {
    const { rerender } = render(<PainelDiagnostico registro={criarRegistro()} onBaixar={() => {}} aceleracao={{ software: false, texto: 'GPU · AMD Radeon' }} />);
    const painel = () => screen.getByRole('complementary', { name: 'Diagnóstico' });
    expect(painel()).toHaveTextContent('aceleração: GPU · AMD Radeon');
    rerender(<PainelDiagnostico registro={criarRegistro()} onBaixar={() => {}} aceleracao={{ software: true, texto: 'CPU (a GPU falhou)' }} />);
    expect(painel()).toHaveTextContent('aceleração: ⚠ CPU (a GPU falhou)');
    rerender(<PainelDiagnostico registro={criarRegistro()} onBaixar={() => {}} />);
    expect(painel()).toHaveTextContent('aceleração: —');
  });
  it('AC-12.4: o botão chama onBaixar', () => {
    const baixar = vi.fn();
    render(<PainelDiagnostico registro={criarRegistro()} onBaixar={baixar} />);
    fireEvent.click(screen.getByRole('button', { name: 'Baixar registro (60 s)' }));
    expect(baixar).toHaveBeenCalledOnce();
  });
});

// FR-20 (v13.3.0, Fase 52.6): quadros da tela e leituras de pose separados; onde a detecção roda.
describe('PainelDiagnostico (FR-20)', () => {
  it('mostra quadros da tela e leituras de pose por segundo, separados', () => {
    const r = criarRegistro();
    const agora = performance.now();
    for (let i = 0; i < 60; i++) {
      r.adicionar({ t: agora - 990 + i * 16, dtMs: 16, deteccaoMs: i % 4 === 0 ? 60 : null, pessoas: 1, tela: 'espera', modo: 'corpo', pontos: {}, medidas: {}, gestos: [] });
    }
    render(<PainelDiagnostico registro={r} onBaixar={() => {}} />);
    expect(screen.getByRole('complementary', { name: 'Diagnóstico' })).toHaveTextContent('quadros/s: 60 (tela) · leituras/s: 15');
  });
  it('mostra se a detecção roda no worker ou na thread principal, e o aquecimento do modelo', () => {
    const { rerender } = render(<PainelDiagnostico registro={criarRegistro()} onBaixar={() => {}}
      aceleracao={{ software: false, texto: 'GPU · AMD Radeon', onde: 'worker', aquecimentoMs: 1200 }} />);
    const painel = () => screen.getByRole('complementary', { name: 'Diagnóstico' });
    expect(painel()).toHaveTextContent('aceleração: worker · GPU · AMD Radeon · aquecimento 1200 ms');
    rerender(<PainelDiagnostico registro={criarRegistro()} onBaixar={() => {}} aceleracao={{ software: true, texto: 'CPU (a GPU falhou)', onde: 'principal' }} />);
    expect(painel()).toHaveTextContent('aceleração: ⚠ thread principal · CPU (a GPU falhou)');
  });
});
