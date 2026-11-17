// @vitest-environment jsdom
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FAN, angulosFan } from '../core/fan';
import { FanCartas } from './FanCartas';

const cartas = (c: HTMLElement) => [...c.querySelectorAll<HTMLElement>('[data-fan-carta]')];
const graus = (el: HTMLElement) => Number(/rotate\((-?[\d.e-]+)deg\)/.exec(el.style.transform)?.[1]);

describe('Fase 48.1: FanCartas (AC-17.3, FR-18)', () => {
  it('uma carta por carta ainda não distribuída, no máximo 20', () => {
    expect(cartas(render(<FanCartas quantidade={7} fase="parado" />).container)).toHaveLength(7);
    expect(cartas(render(<FanCartas quantidade={33} fase="parado" />).container)).toHaveLength(20);
    expect(cartas(render(<FanCartas quantidade={0} fase="parado" />).container)).toHaveLength(0);
  });

  it('é decorativo e não revela nada da próxima notícia: sem texto, todas com o mesmo verso', () => {
    const { container } = render(<FanCartas quantidade={5} fase="parado" />);
    const fan = container.querySelector('[data-fan]')!;
    expect(fan).toHaveAttribute('aria-hidden', 'true');
    expect(fan.textContent).toBe('');
    const versos = new Set(cartas(container).map((c) => c.querySelector('img')!.getAttribute('src')));
    expect(versos.size).toBe(1);
  });

  it('parado atrás da carta: os ângulos da abertura de jogo, da esquerda para a direita', () => {
    const { container } = render(<FanCartas quantidade={6} fase="parado" />);
    const esperado = angulosFan(6, FAN.aberturaJogo);
    cartas(container).forEach((c, i) => expect(graus(c)).toBeCloseTo(esperado[i]!, 2));
  });

  it('a pose parada de cada fase é o fim da animação (sem salto quando a animação acaba ou quando não há movimento)', () => {
    const fim = (fase: 'abrindo' | 'distribuindo') => cartas(render(<FanCartas quantidade={6} fase={fase} progresso={0.3} />).container).map(graus);
    expect(fim('abrindo').map((g) => g.toFixed(2))).toEqual(angulosFan(6, FAN.aberturaJogo).map((g) => g.toFixed(2)));
    expect(fim('distribuindo').map((g) => g.toFixed(2))).toEqual(angulosFan(6, FAN.aberturaJogo).map((g) => g.toFixed(2)));
  });

  it('espera: respira; sem animação (menos movimento), fica meio aberto', () => {
    const { container } = render(<FanCartas quantidade={FAN.cartasEspera} fase="respirando" lugar="espera" />);
    expect(container.querySelector('[data-fan]')).toHaveAttribute('data-fan-fase', 'respirando');
    expect(container.querySelector('[data-fan]')).toHaveAttribute('data-fan-lugar', 'espera');
    const esperado = angulosFan(FAN.cartasEspera, FAN.esperaParado);
    cartas(container).forEach((c, i) => expect(graus(c)).toBeCloseTo(esperado[i]!, 2));
  });
});
