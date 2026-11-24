import { describe, expect, it } from 'vitest';
import {
  AJUSTES_PADRAO, OPCOES, PAINEL_INICIAL, alternarInterface, contextoDosAjustes, itensDoPainel, lerAjustes, resumoAjustes,
  rotuloInterface, rotuloValor, salvarAjustes, teclaNoPainel, type Armazenamento,
} from './ajustes';

// v13.2.0 (Story 18, FR-19): Interface do jogo, Cartas ou Clássica. v13.4.0 (AC-18.1): Cartas é o padrão e a Clássica
// fica por último, só como reserva.
function memoria(inicial: Record<string, string> = {}): Armazenamento & { dados: Record<string, string> } {
  const dados = { ...inicial };
  return { dados, getItem: (k) => dados[k] ?? null, setItem: (k, v) => { dados[k] = v; } };
}

describe('AC-18.1: item "Interface do jogo" nos Ajustes', () => {
  it('é o primeiro item do painel, com ou sem "Revisar questões"', () => {
    expect(itensDoPainel(false)[0]).toMatchObject({ id: 'interface', rotulo: 'Interface do jogo' });
    expect(itensDoPainel(true)[0]!.id).toBe('interface');
  });

  it('padrão Cartas (v13.4.0); Clássica por último na lista; rótulos Cartas e Clássica', () => {
    expect(AJUSTES_PADRAO.interface).toBe('cartas');
    expect(OPCOES.interface).toEqual(['cartas', 'classica']);
    expect(rotuloValor('interface', 'classica')).toBe('Clássica');
    expect(rotuloValor('interface', 'cartas')).toBe('Cartas');
  });

  it('fica guardada numa chave própria (AC-9.5); sem valor ou com valor desconhecido, Cartas', () => {
    const a = memoria();
    salvarAjustes(a, { ...AJUSTES_PADRAO, interface: 'classica' });
    expect(a.dados['match-do-saber:interface']).toBe('classica');
    expect(lerAjustes(a).interface).toBe('classica');
    expect(lerAjustes(memoria({ 'match-do-saber:interface': 'fan' })).interface).toBe('cartas');
    expect(lerAjustes(memoria()).interface).toBe('cartas');
  });

  it('←/→ no primeiro item troca a interface; "Restaurar padrão" volta para Cartas', () => {
    const itens = itensDoPainel(true);
    expect(teclaNoPainel(PAINEL_INICIAL, AJUSTES_PADRAO, 'ArrowRight', itens).ajustes?.interface).toBe('classica');
    expect(teclaNoPainel(PAINEL_INICIAL, AJUSTES_PADRAO, 'ArrowLeft', itens).ajustes).toBeUndefined(); // Cartas é a 1ª
    const restaurar = { ...PAINEL_INICIAL, item: itens.findIndex((i) => i.id === 'restaurar'), confirmarRestauro: true };
    expect(teclaNoPainel(restaurar, { ...AJUSTES_PADRAO, interface: 'classica' }, ' ', itens).ajustes?.interface).toBe('cartas');
  });
});

describe('AC-18.2: tecla I alterna a interface', () => {
  it('Cartas ↔ Clássica, sem mexer em mais nada', () => {
    const classica = alternarInterface(AJUSTES_PADRAO);
    expect(classica).toEqual({ ...AJUSTES_PADRAO, interface: 'classica' });
    expect(alternarInterface(classica)).toEqual(AJUSTES_PADRAO);
  });
});

describe('AC-18.3: a espera mostra a interface ativa', () => {
  it('"Interface: Cartas" ou "Interface: Clássica"', () => {
    expect(rotuloInterface(AJUSTES_PADRAO)).toBe('Interface: Cartas');
    expect(rotuloInterface({ ...AJUSTES_PADRAO, interface: 'classica' })).toBe('Interface: Clássica');
  });

  it('a interface aparece à parte, então não conta como "Ajustes personalizados" no resumo (AC-9.2)', () => {
    expect(resumoAjustes({ ...AJUSTES_PADRAO, interface: 'classica' })).toBe(resumoAjustes(AJUSTES_PADRAO));
  });
});

describe('FR-19: a interface chega à partida pelo Contexto', () => {
  it('contextoDosAjustes leva a interface escolhida', () => {
    expect(contextoDosAjustes(AJUSTES_PADRAO).interface).toBe('cartas');
    expect(contextoDosAjustes({ ...AJUSTES_PADRAO, interface: 'classica' }).interface).toBe('classica');
  });
});
