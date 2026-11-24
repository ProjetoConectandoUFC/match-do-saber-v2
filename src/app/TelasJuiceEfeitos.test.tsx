// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { JUICE, juiceDaSequencia, type Intensidade } from '../core/juice';
import type { Resultado } from '../core/partida';
import type { Noticia, Veredito } from '../core/types';
import { ProvedorJuice, useIntensidadeEfetiva } from './juice';
import { TelaCard, TelaFeedback, TelaFeedbackTutorial, TelaResumo } from './Telas';

// v13.4.0 (Story 19, Fases 54.3 a 54.5, 54.7): os efeitos de cada intensidade aparecem (ou não) na tela. O jsdom não tem
// Web Animations: `animate` é trocado por um registro, para conferir o que foi animado e com quais quadros.
const noticia = (veredito: Veredito = 'verdadeira'): Noticia => ({
  id: 'n1', titulo: 'Título', descricao: 'Descrição', saibaMais: 'Mais', tema: 'ciencia', veredito,
  explicacao: 'Explicação W', tecnica: 'imagem', fonteUrl: 'https://exemplo.org',
});

interface Chamada { el: Element; quadros: Keyframe[]; opcoes: KeyframeAnimationOptions }
let chamadas: Chamada[] = [];
const animadas = (seletor: string) => chamadas.filter((c) => c.el.matches(seletor));

beforeEach(() => {
  chamadas = [];
  (Element.prototype as { animate?: unknown }).animate = vi.fn(function (this: Element, quadros: Keyframe[], opcoes: KeyframeAnimationOptions) {
    chamadas.push({ el: this, quadros, opcoes });
    return { cancel: vi.fn(), finish: vi.fn() } as unknown as Animation;
  });
});
afterEach(() => {
  delete (Element.prototype as { animate?: unknown }).animate;
  delete (window as { matchMedia?: unknown }).matchMedia;
});

const com = (intensidade: Intensidade, filho: ReactNode) => render(<ProvedorJuice intensidade={intensidade}>{filho}</ProvedorJuice>);
const feedback = (intensidade: Intensidade, resultado: Resultado, sequencia = resultado === 'acerto' ? 1 : 0, veredito: Veredito = 'verdadeira') =>
  com(intensidade, <TelaFeedback noticia={noticia(veredito)} resultado={resultado} pontos={3} sequencia={sequencia} />);

describe('AC-19.8: Desligada é a tela da v13.3.0', () => {
  it.each(['acerto', 'erro', 'tempo'] as const)('%s: nenhum efeito, nada animado por script, o texto do resultado inteiro', (resultado) => {
    const { container } = feedback('desligada', resultado, 4);
    for (const sel of ['[data-confete]', '[data-respingo]', '[data-cascata]', '[data-sequencia-tela]', '[data-juice-nucleo]']) {
      expect(container.querySelector(sel)).toBeNull();
    }
    expect(chamadas).toHaveLength(0);
    const h2 = container.querySelector('h2')!;
    expect(h2.children).toHaveLength(0);
  });

  it('a carta sai pela animação de CSS de antes, sem hit-stop', () => {
    const { container } = com('desligada', <TelaCard noticia={noticia()} restanteMs={0} saibaMais={false} ausente={false} pontos={0} saida="direita" resultado="erro" cardRef={{ current: null }} onArrastar={() => {}} />);
    expect(container.querySelector('article')).not.toHaveAttribute('data-juice-saida');
    expect(chamadas).toHaveLength(0);
  });
});

describe('AC-19.2: o carimbo bate', () => {
  it.each(['baixa', 'media', 'alta'] as const)('%s: mola do carimbo e respingo com as gotas da intensidade, na cor dele', (i) => {
    const { container } = feedback(i, 'erro', 0, 'falsa');
    const carimbo = container.querySelector('[data-carimbo="mentira"]')!;
    expect(animadas('[data-carimbo]')).toHaveLength(1);
    const respingo = carimbo.querySelector('[data-respingo]')!;
    expect(respingo).toHaveAttribute('aria-hidden', 'true');
    expect(respingo.querySelectorAll('[data-gota]')).toHaveLength(JUICE[i].respingoGotas);
    expect(animadas('[data-gota]')).toHaveLength(JUICE[i].respingoGotas);
  });

  it('tremida da tela só a partir de Média, com a amplitude da sequência', () => {
    feedback('baixa', 'acerto');
    expect(animadas('main')).toHaveLength(0);
    chamadas = [];
    feedback('media', 'acerto', 5);
    const [tremida] = animadas('main');
    expect(tremida).toBeDefined();
    const maior = Math.max(...tremida!.quadros.map((q) => Math.abs(parseFloat(String(q.transform).split('(')[1]!))));
    const u = Math.min(window.innerWidth / 1366, window.innerHeight / 768); // a --u da tela
    expect(maior).toBeCloseTo(JUICE.media.tremidaPx * u, 1); // no teto da sequência, a amplitude inteira da intensidade
  });
});

describe('AC-19.3: acerto', () => {
  it('Média: letras de "Acertou!" em cascata, confete da sequência e pop do placar', () => {
    const { container } = feedback('media', 'acerto', 1);
    const h2 = screen.getByRole('heading', { level: 2, name: 'Acertou!' });
    expect(h2.textContent).toBe('Acertou!');
    const letras = h2.querySelectorAll('[data-letra]');
    expect(letras).toHaveLength('Acertou!'.length);
    expect(animadas('[data-letra]').map((c) => c.opcoes.delay)).toEqual([...'Acertou!'].map((_, i) => i * JUICE.media.cascataPassoMs));
    const confete = container.querySelector('[data-confete]')!;
    expect(confete).toHaveAttribute('aria-hidden', 'true');
    expect(confete.children).toHaveLength(juiceDaSequencia('media', 1).confetes);
    expect(animadas('[data-pontos]')).toHaveLength(1);
  });

  it('Baixa: cascata e pop, sem confete', () => {
    const { container } = feedback('baixa', 'acerto');
    expect(container.querySelectorAll('[data-letra]')).toHaveLength(8);
    expect(container.querySelector('[data-confete]')).toBeNull();
    expect(animadas('[data-pontos]')).toHaveLength(1);
  });

  it('o confete cresce com a sequência até o teto', () => {
    const conta = (n: number) => {
      const { container, unmount } = feedback('alta', 'acerto', n);
      const total = container.querySelector('[data-confete]')!.children.length;
      unmount();
      return total;
    };
    expect(conta(1)).toBeLessThan(conta(3));
    expect(conta(5)).toBe(JUICE.alta.confetes);
    expect(conta(7)).toBe(JUICE.alta.confetes);
  });
});

describe('AC-19.4: erro e tempo esgotado', () => {
  it.each(['erro', 'tempo'] as const)('%s: o núcleo diz "não", sem cascata nem confete; nem pop do placar', (resultado) => {
    const { container } = feedback('media', resultado);
    expect(container.querySelector('[data-letra]')).toBeNull();
    expect(container.querySelector('[data-confete]')).toBeNull();
    const [nao] = animadas('[data-nucleo-feedback]');
    expect(nao!.quadros.some((q) => /translateX\(-?[1-9]/.test(String(q.transform)))).toBe(true);
    expect(Number(nao!.opcoes.duration)).toBeLessThanOrEqual(400);
    expect(animadas('[data-pontos]')).toHaveLength(0);
  });

  it('a carta que sai depois de um erro para no golpe e amassa antes de voar', () => {
    const { container } = com('media', <TelaCard noticia={noticia()} restanteMs={0} saibaMais={false} ausente={false} pontos={0} saida="esquerda" resultado="erro" cardRef={{ current: null }} onArrastar={() => {}} />);
    expect(container.querySelector('article')).toHaveAttribute('data-juice-saida');
    const [saida] = animadas('article');
    expect(String(saida!.quadros[2]!.transform)).toContain(`scale(${JUICE.media.amassarEscala})`);
    expect(String(saida!.quadros.at(-1)!.transform)).toContain('translateX(-120vw)');
  });
});

describe('AC-19.5: "Sequência ×N"', () => {
  it('a partir de 2, com pop; no 1º acerto, não', () => {
    feedback('alta', 'acerto', 3);
    expect(screen.getByText('Sequência ×3')).toHaveAttribute('data-sequencia-tela', '3');
    expect(animadas('[data-sequencia-tela]')).toHaveLength(1);
  });

  it.each([['alta', 1], ['desligada', 4]] as const)('%s com sequência %i: não aparece', (i, n) => {
    feedback(i, 'acerto', n);
    expect(screen.queryByText(/Sequência ×/)).toBeNull();
  });
});

describe('AC-19.7: o texto a ler entra parado', () => {
  it('com tremida, a explicação e a técnica entram depois dela, sem overshoot; sem tremida, nada as anima', () => {
    feedback('alta', 'acerto');
    const textos = animadas('[data-texto-ler]');
    expect(textos).toHaveLength(2);
    for (const t of textos) expect(t.quadros).toHaveLength(2);
    chamadas = [];
    feedback('baixa', 'acerto');
    expect(animadas('[data-texto-ler]')).toHaveLength(0);
  });
});

describe('AC-19.1: com "reduzir movimento", no máximo Baixa', () => {
  function Jogo({ children }: { children: ReactNode }) {
    return <ProvedorJuice intensidade={useIntensidadeEfetiva('alta')}>{children}</ProvedorJuice>;
  }
  it('Alta escolhida: sem tremida e sem confete; respingo e cascata de Baixa', () => {
    window.matchMedia = ((q: string) => ({
      matches: q.includes('reduce'), media: q, addEventListener() {}, removeEventListener() {},
    })) as unknown as typeof window.matchMedia;
    const { container } = render(<Jogo><TelaFeedback noticia={noticia()} resultado="acerto" pontos={1} sequencia={5} /></Jogo>);
    expect(animadas('main')).toHaveLength(0);
    expect(container.querySelector('[data-confete]')).toBeNull();
    expect(container.querySelectorAll('[data-gota]')).toHaveLength(JUICE.baixa.respingoGotas);
    expect(container.querySelectorAll('[data-letra]')).toHaveLength(8);
  });
});

describe('treino (AC-4.10): os mesmos efeitos do resultado, sem sequência', () => {
  it('acerto do treino com cascata e carimbo; sem placar', () => {
    const { container } = com('media', <TelaFeedbackTutorial noticia={noticia()} resposta="verdadeira" modo="corpo" treino={{ passo: 0, total: 2 }} />);
    expect(container.querySelectorAll('[data-letra]').length).toBeGreaterThan(0);
    expect(animadas('[data-carimbo]')).toHaveLength(1);
    expect(container.querySelector('[data-sequencia-tela]')).toBeNull();
  });
});

describe('AC-19.6: "Maior sequência" no resumo, com acabamento', () => {
  it('o texto inteiro num só lugar e o marcador do design system ao lado', () => {
    render(<TelaResumo pontos={7} total={10} maiorSequencia={4} />);
    const p = screen.getByText('Maior sequência: 4');
    expect(p.querySelector('svg')).not.toBeNull();
    expect(p.className).toMatch(/maiorSequencia/);
  });
});
