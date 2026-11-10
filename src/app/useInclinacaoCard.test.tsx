// @vitest-environment jsdom
import { render } from '@testing-library/react';
import { useRef, type MutableRefObject } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Estado } from '../core/partida';
import { useInclinacaoCard } from './useInclinacaoCard';

const partida = { cards: [], resultados: [], entrada: 'corpo' as const };
const CARD: Estado = { tela: 'card', partida, indice: 0, restanteMs: 10000, saibaMais: false, ausenteMs: null };

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
});
afterEach(() => vi.unstubAllGlobals());

let inclinacao: MutableRefObject<number>;
function Card({ estado, pausado = false }: { estado: Estado; pausado?: boolean }) {
  inclinacao = useRef(1);
  const cardRef = useRef<HTMLElement>(null);
  const saindoRef = useRef<HTMLElement>(null);
  useInclinacaoCard({ inclinacaoRef: inclinacao, estado, pausado, cardRef, cardSaindoRef: saindoRef });
  return estado.tela === 'card' ? <article data-testid="card" ref={cardRef} /> : <article data-testid="saindo" ref={saindoRef} />;
}

describe('useInclinacaoCard (AC-2.10)', () => {
  it('desloca e gira o card para o lado da inclinação, sem re-renderizar, pelas propriedades translate/rotate', () => {
    const { getByTestId } = render(<Card estado={CARD} />);
    avancar(150);
    const el = getByTestId('card');
    expect(el.style.getPropertyValue('translate')).toBe('40px');
    expect(el.style.getPropertyValue('rotate')).toBe('6deg');
    expect(el.style.transform).toBe(''); // não briga com as animações de saída e do pulso (AC-4.7)
  });

  it('menu aberto: card no centro', () => {
    const { getByTestId } = render(<Card estado={CARD} pausado />);
    avancar(150);
    expect(getByTestId('card').style.getPropertyValue('translate')).toBe('');
  });

  it('o card que sai parte da posição em que estava', () => {
    const { getByTestId, rerender } = render(<Card estado={CARD} />);
    avancar(150);
    rerender(<Card estado={{ tela: 'feedback', partida, indice: 0, restanteMs: 3250, resposta: 'verdadeira' }} />);
    expect(getByTestId('saindo').style.getPropertyValue('translate')).toBe('40px');
  });

  it('prefers-reduced-motion: o card não se move', () => {
    vi.stubGlobal('matchMedia', (q: string) => ({ matches: q.includes('reduce'), media: q }));
    const { getByTestId } = render(<Card estado={CARD} />);
    avancar(150);
    expect(getByTestId('card').style.getPropertyValue('translate')).toBe('');
    expect(getByTestId('card').style.getPropertyValue('rotate')).toBe('');
  });
});
