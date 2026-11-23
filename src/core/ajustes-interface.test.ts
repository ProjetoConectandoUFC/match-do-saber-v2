import { describe, expect, it } from 'vitest';
import {
  AJUSTES_PADRAO, PAINEL_INICIAL, alternarInterface, contextoDosAjustes, itensDoPainel, lerAjustes, resumoAjustes, rotuloInterface,
  rotuloValor, salvarAjustes, teclaNoPainel, type Armazenamento,
} from './ajustes';

// v13.2.0 (Story 18, FR-19): Interface do jogo para o teste A/B, Clássica (padrão) ou Cartas.
function memoria(inicial: Record<string, string> = {}): Armazenamento & { dados: Record<string, string> } {
  const dados = { ...inicial };
  return { dados, getItem: (k) => dados[k] ?? null, setItem: (k, v) => { dados[k] = v; } };
}

describe('AC-18.1: item "Interface do jogo" nos Ajustes', () => {
  it('é o primeiro item do painel, com ou sem "Revisar questões"', () => {
    expect(itensDoPainel(false)[0]).toMatchObject({ id: 'interface', rotulo: 'Interface do jogo' });
    expect(itensDoPainel(true)[0]!.id).toBe('interface');
  });

  it('padrão Clássica; rótulos Clássica e Cartas', () => {
    expect(AJUSTES_PADRAO.interface).toBe('classica');
    expect(rotuloValor('interface', 'classica')).toBe('Clássica');
    expect(rotuloValor('interface', 'cartas')).toBe('Cartas');
  });

  it('fica guardada numa chave própria (AC-9.5); valor desconhecido volta para Clássica', () => {
    const a = memoria();
    salvarAjustes(a, { ...AJUSTES_PADRAO, interface: 'cartas' });
    expect(a.dados['match-do-saber:interface']).toBe('cartas');
    expect(lerAjustes(a).interface).toBe('cartas');
    expect(lerAjustes(memoria({ 'match-do-saber:interface': 'fan' })).interface).toBe('classica');
  });

  it('←/→ no primeiro item troca a interface; "Restaurar padrão" volta para Clássica', () => {
    const itens = itensDoPainel(true);
    expect(teclaNoPainel(PAINEL_INICIAL, AJUSTES_PADRAO, 'ArrowRight', itens).ajustes?.interface).toBe('cartas');
    const restaurar = { ...PAINEL_INICIAL, item: itens.findIndex((i) => i.id === 'restaurar'), confirmarRestauro: true };
    expect(teclaNoPainel(restaurar, { ...AJUSTES_PADRAO, interface: 'cartas' }, ' ', itens).ajustes?.interface).toBe('classica');
  });
});

describe('AC-18.2: tecla I alterna a interface', () => {
  it('Clássica ↔ Cartas, sem mexer em mais nada', () => {
    const cartas = alternarInterface(AJUSTES_PADRAO);
    expect(cartas).toEqual({ ...AJUSTES_PADRAO, interface: 'cartas' });
    expect(alternarInterface(cartas)).toEqual(AJUSTES_PADRAO);
  });
});

describe('AC-18.3: a espera mostra a interface ativa', () => {
  it('"Interface: Clássica" ou "Interface: Cartas"', () => {
    expect(rotuloInterface(AJUSTES_PADRAO)).toBe('Interface: Clássica');
    expect(rotuloInterface({ ...AJUSTES_PADRAO, interface: 'cartas' })).toBe('Interface: Cartas');
  });

  it('a interface aparece à parte, então não conta como "Ajustes personalizados" no resumo (AC-9.2)', () => {
    expect(resumoAjustes({ ...AJUSTES_PADRAO, interface: 'cartas' })).toBe(resumoAjustes(AJUSTES_PADRAO));
  });
});

describe('FR-19: a interface chega à partida pelo Contexto', () => {
  it('contextoDosAjustes leva a interface escolhida', () => {
    expect(contextoDosAjustes(AJUSTES_PADRAO).interface).toBe('classica');
    expect(contextoDosAjustes({ ...AJUSTES_PADRAO, interface: 'cartas' }).interface).toBe('cartas');
  });
});
