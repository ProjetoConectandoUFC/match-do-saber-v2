// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useAjustes } from './useAjustes';

// v13.2.0 (AC-18.2): a tecla I alterna a interface do jogo, só na espera com menu e painéis fechados.
const tecla = (key: string) => act(() => { window.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true })); });

describe('AC-18.2: tecla I na espera', () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(() => window.localStorage.clear());

  it('I e i alternam Clássica ↔ Cartas e a escolha fica guardada (AC-9.5)', () => {
    const { result } = renderHook(() => useAjustes(() => true));
    expect(result.current.ajustes.interface).toBe('classica');
    tecla('i');
    expect(result.current.ajustes.interface).toBe('cartas');
    expect(window.localStorage.getItem('match-do-saber:interface')).toBe('cartas');
    tecla('I');
    expect(result.current.ajustes.interface).toBe('classica');
  });

  it('fora da espera, ou com menu/painel aberto, a tecla I não faz nada (AC-18.7)', () => {
    const { result } = renderHook(() => useAjustes(() => false));
    tecla('i');
    expect(result.current.ajustes.interface).toBe('classica');
    expect(window.localStorage.getItem('match-do-saber:interface')).toBeNull();
  });

  it('com o painel Ajustes aberto, I não troca a interface', () => {
    const { result } = renderHook(() => useAjustes(() => true));
    act(() => result.current.abrir());
    tecla('i');
    expect(result.current.ajustes.interface).toBe('classica');
  });
});
