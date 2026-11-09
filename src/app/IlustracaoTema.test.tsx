// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TEMAS, TEMA_ROTULO } from '../core/types';
import { IlustracaoTema } from './IlustracaoTema';

describe('FR-15: ilustração por tema do card sem imagem', () => {
  it.each(TEMAS)('%s: cor própria, composição de formas do design system e o nome do tema', (tema) => {
    render(<IlustracaoTema tema={tema} />);
    const ilu = screen.getByRole('img', { name: `Tema: ${TEMA_ROTULO[tema]}` });
    expect(ilu).toHaveAttribute('data-tema', tema);
    expect(ilu).toHaveTextContent(TEMA_ROTULO[tema]);
    expect(ilu.querySelectorAll('svg[data-forma]').length).toBeGreaterThanOrEqual(4);
  });
  it('cada tema tem uma cor diferente', () => {
    const cores = TEMAS.map((tema) => {
      const { container, unmount } = render(<IlustracaoTema tema={tema} />);
      const cor = (container.firstElementChild as HTMLElement).style.background;
      unmount();
      return cor;
    });
    expect(new Set(cores).size).toBe(TEMAS.length);
  });
});
