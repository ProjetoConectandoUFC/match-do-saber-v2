// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TEMAS, TEMA_ROTULO, type Tema } from '../core/types';
import { IlustracaoTema, corDoTema } from './IlustracaoTema';

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

describe('v12.0.0 (AC-7.2, FR-15): ilustração e cor definitivas do tema politica (Fase 42)', () => {
  it('cor própria (índigo do design system), diferente das outras, e composição com pelo menos 4 formas', () => {
    const politica: Tema = 'politica';
    const { container } = render(<IlustracaoTema tema={politica} />);
    const ilu = container.querySelector<HTMLElement>('[data-tema="politica"]')!;
    expect(ilu.style.background).toBe('var(--cn-indigo)');
    expect(ilu.querySelectorAll('svg[data-forma]').length).toBeGreaterThanOrEqual(4);
    expect(TEMAS.filter((t) => t !== politica).map(corDoTema)).not.toContain(corDoTema(politica));
  });
  it('composição própria (plenário), não a provisória de História', () => {
    const html = (tema: Tema) => render(<IlustracaoTema tema={tema} />).container.querySelector('[data-tema]')!.innerHTML;
    const semChip = (h: string) => h.replace(/<span[^>]*>.*?<\/span>/, '');
    expect(semChip(html('politica'))).not.toBe(semChip(html('historia')));
  });
});
