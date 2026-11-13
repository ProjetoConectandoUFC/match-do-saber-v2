// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { Noticia, Veredito } from '../core/types';
import { TelaCard, TelaFeedback, TelaFeedbackTutorial } from './Telas';

// v12.0.0: feedback por resultado (verde/vermelho) e carimbo do veredito por cima do texto do resultado.
const noticia = (veredito: Veredito): Noticia => ({
  id: 'n1', titulo: 'Título', descricao: 'Descrição', saibaMais: 'Mais', tema: 'ciencia', veredito,
  explicacao: 'Explicação W', tecnica: 'imagem', fonteUrl: 'https://exemplo.org',
});

const depois = (a: Node, b: Node) => Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);

describe('v12.0.0: feedback por resultado (AC-4.1 a AC-4.3, AC-4.9, FR-4)', () => {
  it.each([
    ['acerto', 'verdadeira', 'Acertou!', /fbAcerto/],
    ['acerto', 'falsa', 'Acertou!', /fbAcerto/],
    ['erro', 'verdadeira', 'Errou', /fbErro/],
    ['erro', 'falsa', 'Errou', /fbErro/],
    ['tempo', 'verdadeira', 'Tempo esgotado', /fbErro/],
    ['tempo', 'falsa', 'Tempo esgotado', /fbErro/],
  ] as const)('%s numa notícia %s: fundo pelo resultado, "%s" em texto e o carimbo do veredito por cima', (resultado, veredito, texto, fundo) => {
    const { container } = render(<TelaFeedback noticia={noticia(veredito)} resultado={resultado} pontos={0} />);
    const main = container.querySelector('main')!;
    expect(main.className).toMatch(fundo);
    expect(main.className).not.toMatch(/fbVerdade|fbMentira/);
    expect(main).toHaveAttribute('data-resultado', resultado);

    // Texto do resultado sempre presente (daltonismo).
    const titulo = screen.getByRole('heading', { level: 2, name: texto });
    expect(titulo.textContent).toBe(texto);

    // Carimbo do veredito: mesmo componente do card (AC-2.10b), com o marcador, no mesmo núcleo do texto e depois dele
    // (pintado por cima).
    const lado = veredito === 'verdadeira' ? 'verdade' : 'mentira';
    const carimbo = container.querySelector<HTMLElement>(`[data-carimbo="${lado}"]`)!;
    expect(carimbo).not.toBeNull();
    expect(carimbo.textContent).toBe(lado === 'verdade' ? 'Verdade' : 'Mentira');
    expect(carimbo.className).toMatch(/carimbo/);
    expect(carimbo.className).toMatch(lado === 'verdade' ? /carimboVerdade/ : /carimboMentira/);
    expect(carimbo.className).toMatch(/carimboFeedback/);
    expect(carimbo.querySelector(`svg[data-forma="${lado === 'verdade' ? 'marca-estrela-4' : 'marca-triangulo'}"]`)).not.toBeNull();
    const nucleo = container.querySelector('[data-nucleo-feedback]')!;
    expect(nucleo.contains(titulo) && nucleo.contains(carimbo)).toBe(true);
    expect(depois(titulo, carimbo)).toBe(true);
    expect(container.querySelectorAll('[data-carimbo]')).toHaveLength(1);

    // Depois: explicação e técnica.
    expect(depois(carimbo, screen.getByText('Explicação W'))).toBe(true);
    expect(depois(screen.getByText('Explicação W'), screen.getByText('Verificar a imagem'))).toBe(true);
  });

  it.each(['acerto', 'erro', 'tempo'] as const)('%s: sem "match", sem os ícones de discos e ampulheta e sem "É verdade"/"É mentira"', (resultado) => {
    const { container } = render(<TelaFeedback noticia={noticia('verdadeira')} resultado={resultado} pontos={0} />);
    expect(container.textContent).not.toMatch(/match/i);
    expect(container.querySelector('svg[data-icone]')).toBeNull();
    expect(container.textContent).not.toMatch(/É verdade|É mentira/);
    expect(container.textContent).not.toMatch(/[✓✗✔✖❤🙌]|\p{Extended_Pictographic}/u);
  });

  it('o placar continua no feedback', () => {
    render(<TelaFeedback noticia={noticia('falsa')} resultado="acerto" pontos={4} />);
    expect(screen.getByText('Pontos: 4')).toBeInTheDocument();
  });
});

describe('v12.0.0: feedback de treino no mesmo layout (AC-4.10)', () => {
  it.each([
    ['verdadeira', 'Acertou!', /fbAcerto/, 'treino-acerto'],
    ['falsa', 'Quase!', /fbErro/, 'treino-erro'],
  ] as const)('resposta %s num perfil verdadeiro: "%s", fundo pelo resultado, carimbo VERDADE por cima', (resposta, selo, fundo, dado) => {
    const { container } = render(<TelaFeedbackTutorial noticia={noticia('verdadeira')} resposta={resposta} modo="corpo" treino={{ passo: 1, total: 2 }} />);
    const main = container.querySelector('main')!;
    expect(main.className).toMatch(fundo);
    expect(main).toHaveAttribute('data-resultado', dado);
    const titulo = screen.getByRole('heading', { level: 2, name: selo });
    const carimbo = container.querySelector<HTMLElement>('[data-carimbo="verdade"]')!;
    const nucleo = container.querySelector('[data-nucleo-feedback]')!;
    expect(nucleo.contains(titulo) && nucleo.contains(carimbo)).toBe(true);
    expect(carimbo.className).toMatch(/carimboFeedback/);
    expect(container.textContent).not.toMatch(/match|É verdade|É mentira/i);
    expect(container.querySelector('svg[data-icone]')).toBeNull();
    expect(screen.getByText('Treino 2 de 2')).toBeInTheDocument();
    expect(screen.getByText('Explicação W')).toBeInTheDocument();
  });
});

describe('v12.0.0: o carimbo do card é o mesmo do feedback (AC-2.10b, AC-4.9)', () => {
  it('o rótulo de cada lado do card tem o marcador do veredito e as mesmas classes de cor', () => {
    const { container } = render(
      <TelaCard noticia={noticia('falsa')} restanteMs={9000} saibaMais={false} ausente={false} pontos={0} cardRef={{ current: null }} onArrastar={() => {}} />,
    );
    const v = container.querySelector<HTMLElement>('[data-rotulo-lado="verdade"]')!;
    const m = container.querySelector<HTMLElement>('[data-rotulo-lado="mentira"]')!;
    expect(v.textContent).toBe('Verdade');
    expect(m.textContent).toBe('Mentira');
    expect(v.querySelector('svg[data-forma="marca-estrela-4"]')).not.toBeNull();
    expect(m.querySelector('svg[data-forma="marca-triangulo"]')).not.toBeNull();
    expect(v.className).toMatch(/carimboVerdade/);
    expect(m.className).toMatch(/carimboMentira/);
    expect(v.className).not.toMatch(/carimboFeedback/);
  });
});
