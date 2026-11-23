// @vitest-environment jsdom
// NFR Reliability (v12.1.0, Fase 50.3): um erro de tela não deixa a tela branca.
import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ErroGeral } from './ErroGeral';

function Quebra(): never {
  throw new Error('erro de render');
}

// Em desenvolvimento, o React relança o erro de render como evento `error` da janela (o jsdom imprime).
const silenciar = (e: ErrorEvent) => e.preventDefault();
beforeEach(() => {
  vi.useFakeTimers();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  window.addEventListener('error', silenciar);
});
afterEach(() => {
  window.removeEventListener('error', silenciar);
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('ErroGeral (NFR Reliability v12.1.0)', () => {
  it('sem erro, mostra o jogo', () => {
    render(<ErroGeral recarregar={vi.fn()}><p>jogo</p></ErroGeral>);
    expect(screen.getByText('jogo')).toBeInTheDocument();
  });

  it('com erro de render, mostra "Algo deu errado — voltando ao início" e recarrega em ~5 s', () => {
    const recarregar = vi.fn();
    render(<ErroGeral recarregar={recarregar}><Quebra /></ErroGeral>);
    expect(screen.getByText('Algo deu errado — voltando ao início')).toBeInTheDocument();
    vi.advanceTimersByTime(4900);
    expect(recarregar).not.toHaveBeenCalled();
    vi.advanceTimersByTime(200);
    expect(recarregar).toHaveBeenCalledTimes(1);
  });
});
