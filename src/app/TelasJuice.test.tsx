// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TelaResumo } from './Telas';

// v13.4.0 (Story 19): a parte mecânica que aparece na tela; o acabamento visual é do Agente Visual (Fase 54.3 a 54.5).
describe('AC-19.6: "Maior sequência: N" no resumo', () => {
  it('mostra a maior sequência da partida, junto do placar', () => {
    render(<TelaResumo pontos={7} total={10} maiorSequencia={4} />);
    expect(screen.getByText('Maior sequência: 4')).toHaveAttribute('data-maior-sequencia', '4');
  });

  it('sem nenhum acerto seguido, 0', () => {
    render(<TelaResumo pontos={0} total={10} maiorSequencia={0} />);
    expect(screen.getByText('Maior sequência: 0')).toBeInTheDocument();
  });
});
