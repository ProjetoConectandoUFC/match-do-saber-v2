// @vitest-environment jsdom
import { render } from '@testing-library/react';
import { useRef, type MutableRefObject } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { deslocamentoCard } from '../core/inclinacaoCard';
import type { Estado } from '../core/partida';
import { useInclinacaoCard } from './useInclinacaoCard';

const partida = { cards: [], resultados: [], entrada: 'corpo' as const };
const CARD: Estado = { tela: 'card', partida, indice: 0, restanteMs: 10000, saibaMais: false, ausenteMs: null };
const TAMANHO = { largura: 600, altura: 640 };
const px = (v: number) => `${Math.round(v * 10) / 10}px`;
const NO_LIMIAR = deslocamentoCard(1, TAMANHO);

let quadros: FrameRequestCallback[] = [];
let agora = 0;
function avancar(n: number, passoMs = 16) {
  for (let i = 0; i < n; i++) {
    agora += passoMs;
    const fila = quadros;
    quadros = [];
    for (const f of fila) f(agora);
  }
}

beforeEach(() => {
  quadros = [];
  agora = 0;
  vi.stubGlobal('requestAnimationFrame', (f: FrameRequestCallback) => { quadros.push(f); return quadros.length; });
  vi.stubGlobal('cancelAnimationFrame', () => { quadros = []; });
  vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(TAMANHO.largura);
  vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(TAMANHO.altura);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

let inclinacao: MutableRefObject<number>;
function Card({ estado, pausado = false, valor = 1 }: { estado: Estado; pausado?: boolean; valor?: number }) {
  inclinacao = useRef(valor);
  inclinacao.current = valor;
  const cardRef = useRef<HTMLElement>(null);
  const saindoRef = useRef<HTMLElement>(null);
  useInclinacaoCard({ inclinacaoRef: inclinacao, estado, pausado, cardRef, cardSaindoRef: saindoRef });
  const rotulos = (<><span data-rotulo-lado="mentira" /><span data-rotulo-lado="verdade" /></>);
  return estado.tela === 'card'
    ? <article data-testid="card" ref={cardRef}>{rotulos}</article>
    : <article data-testid="saindo" ref={saindoRef}>{rotulos}</article>;
}
const rotulo = (el: HTMLElement, lado: string) => (el.querySelector(`[data-rotulo-lado="${lado}"]`) as HTMLElement).style.opacity;

describe('useInclinacaoCard (AC-2.10 v10.3.0)', () => {
  it('no limiar: desloca e gira com eixo na base (translate/rotate, sem transform) e mostra o rótulo Verdade', () => {
    const { getByTestId } = render(<Card estado={CARD} />);
    avancar(150);
    const el = getByTestId('card');
    expect(el.style.getPropertyValue('translate')).toBe(`${px(NO_LIMIAR.dx)} ${px(NO_LIMIAR.dy)}`);
    expect(el.style.getPropertyValue('rotate')).toBe('15deg');
    expect(el.style.transform).toBe(''); // não briga com as animações de saída e do pulso (AC-4.7)
    expect(rotulo(el, 'verdade')).toBe('1');
    expect(rotulo(el, 'mentira')).toBe('0');
  });

  it('segue em tempo real: a meio caminho do limiar para a esquerda, rótulo Mentira pela metade', () => {
    const { getByTestId } = render(<Card estado={CARD} valor={-0.515} />);
    avancar(150);
    const el = getByTestId('card');
    expect(Number(rotulo(el, 'mentira'))).toBeCloseTo(0.5, 2);
    expect(el.style.getPropertyValue('rotate')).toBe('-7.5deg');
  });

  it('menu aberto: card no centro, sem rótulo', () => {
    const { getByTestId } = render(<Card estado={CARD} pausado />);
    avancar(150);
    expect(getByTestId('card').style.getPropertyValue('translate')).toBe('');
    expect(rotulo(getByTestId('card'), 'verdade')).toBe('0');
  });

  it('o card que sai parte da posição em que estava', () => {
    const { getByTestId, rerender } = render(<Card estado={CARD} />);
    avancar(150);
    rerender(<Card estado={{ tela: 'feedback', partida, indice: 0, restanteMs: 3250, feedbackMs: 3000, resposta: 'verdadeira' }} />);
    expect(getByTestId('saindo').style.getPropertyValue('rotate')).toBe('15deg');
  });

  it('prefers-reduced-motion: o card continua seguindo o gesto (movimento comandado pelo jogador, AC-2.10f)', () => {
    vi.stubGlobal('matchMedia', (q: string) => ({ matches: q.includes('reduce'), media: q }));
    const { getByTestId } = render(<Card estado={CARD} />);
    avancar(150);
    const el = getByTestId('card');
    expect(el.style.getPropertyValue('rotate')).toBe('15deg');
    expect(el.style.getPropertyValue('translate')).not.toBe('');
    expect(rotulo(el, 'verdade')).toBe('1');
  });
});

/** Card dentro da mesa, com os botões redondos fora dele (AC-2.11, v11.0.0). */
function Mesa({ estado, valor }: { estado: Estado; valor: number }) {
  inclinacao = useRef(valor);
  inclinacao.current = valor;
  const cardRef = useRef<HTMLElement>(null);
  const saindoRef = useRef<HTMLElement>(null);
  useInclinacaoCard({ inclinacaoRef: inclinacao, estado, pausado: false, cardRef, cardSaindoRef: saindoRef });
  return (
    <div data-mesa>
      <span data-testid="b-mentira" data-botao-lado="mentira" />
      <div><article ref={estado.tela === 'card' ? cardRef : saindoRef}><span data-rotulo-lado="mentira" /><span data-rotulo-lado="verdade" /></article></div>
      <span data-testid="b-verdade" data-botao-lado="verdade" />
    </div>
  );
}
const acende = (el: HTMLElement) => el.style.getPropertyValue('--acende');

describe('botões redondos (AC-2.11, v11.0.0): a mesma fração dos rótulos, no mesmo quadro', () => {
  it('no limiar à direita, Verdade aceso por inteiro e Mentira apagado', () => {
    const { getByTestId } = render(<Mesa estado={CARD} valor={1} />);
    avancar(150);
    expect(acende(getByTestId('b-verdade'))).toBe('1');
    expect(acende(getByTestId('b-mentira'))).toBe('0');
  });

  it('a meio caminho para a esquerda, Mentira aceso pela metade, igual ao rótulo', () => {
    const { getByTestId, container } = render(<Mesa estado={CARD} valor={-0.515} />);
    avancar(150);
    const rotuloMentira = (container.querySelector('[data-rotulo-lado="mentira"]') as HTMLElement).style.opacity;
    expect(acende(getByTestId('b-mentira'))).toBe(rotuloMentira);
    expect(Number(acende(getByTestId('b-mentira')))).toBeCloseTo(0.5, 2);
  });

  it('durante a saída, o botão continua com a fração em que o card estava', () => {
    const { getByTestId, rerender } = render(<Mesa estado={CARD} valor={1} />);
    avancar(150);
    rerender(<Mesa estado={{ tela: 'feedback', partida, indice: 0, restanteMs: 3250, feedbackMs: 3000, resposta: 'verdadeira' }} valor={0} />);
    avancar(5);
    expect(acende(getByTestId('b-verdade'))).toBe('1');
  });
});
