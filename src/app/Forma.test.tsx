// @vitest-environment jsdom
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Forma, type IdForma } from './Forma';

const IDS: IdForma[] = [
  'marca-estrela-4', 'marca-estrela-5', 'marca-estrela-6', 'marca-triangulo',
  'anel-a', 'anel-b', 'anel-c', 'deco-arco', 'deco-e', 'deco-explosao-dir', 'conectando-assinatura',
];

describe('FR-15: formas do design system', () => {
  it.each(IDS)('%s: sem <metadata>, com viewBox e altura pela proporção (sem distorção)', (id) => {
    const { container } = render(<Forma id={id} largura={100} />);
    const svg = container.querySelector('svg')!;
    expect(svg.querySelector('metadata')).toBeNull();
    expect(svg.querySelector('path')).not.toBeNull();
    const [, , w, h] = svg.getAttribute('viewBox')!.split(' ').map(Number);
    const altura = Number(svg.style.height.match(/calc\(([\d.]+) \*/)![1]);
    expect(altura).toBeCloseTo((100 * h!) / w!, 1);
    expect(svg).toHaveAttribute('aria-hidden', 'true');
  });
  it('quadrado: caixa quadrada para o marcador girado', () => {
    const { container } = render(<Forma id="marca-triangulo" largura={40} quadrado />);
    expect(container.querySelector('svg')!.style.height).toBe('calc(40 * var(--u, 1px))');
  });
  it('original: usa o viewBox do design system e deixa o desenho vazar (ilustrações)', () => {
    const { container } = render(<Forma id="anel-c" largura={200} original />);
    const svg = container.querySelector('svg')!;
    expect(svg.getAttribute('viewBox')).toBe('0 0 625 1065');
    expect(svg.style.overflow).toBe('visible');
  });
});
