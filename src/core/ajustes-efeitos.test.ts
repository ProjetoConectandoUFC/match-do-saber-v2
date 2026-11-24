import { describe, expect, it } from 'vitest';
import {
  AJUSTES_PADRAO, OPCOES, PAINEL_INICIAL, itensDoPainel, lerAjustes, resumoAjustes, rotuloValor, salvarAjustes, teclaNoPainel,
  type Armazenamento,
} from './ajustes';
import { INTENSIDADES } from './juice';

// v13.4.0 (AC-19.1, FR-21): "Intensidade dos efeitos" nos Ajustes, logo abaixo de "Interface do jogo".
function memoria(inicial: Record<string, string> = {}): Armazenamento & { dados: Record<string, string> } {
  const dados = { ...inicial };
  return { dados, getItem: (k) => dados[k] ?? null, setItem: (k, v) => { dados[k] = v; } };
}

describe('AC-19.1: item "Intensidade dos efeitos"', () => {
  it('logo abaixo de "Interface do jogo", no grupo Interface', () => {
    const itens = itensDoPainel(true);
    expect(itens[1]).toEqual({ id: 'efeitos', grupo: 'interface', rotulo: 'Intensidade dos efeitos' });
  });

  it('opções Desligada, Baixa, Média e Alta; padrão Média', () => {
    expect(OPCOES.efeitos).toEqual([...INTENSIDADES]);
    expect(AJUSTES_PADRAO.efeitos).toBe('media');
    expect(OPCOES.efeitos.map((v) => rotuloValor('efeitos', v))).toEqual(['Desligada', 'Baixa', 'Média', 'Alta']);
  });

  it('fica guardada numa chave própria (AC-9.5); sem valor ou com valor desconhecido, Média', () => {
    const a = memoria();
    salvarAjustes(a, { ...AJUSTES_PADRAO, efeitos: 'desligada' });
    expect(a.dados['match-do-saber:efeitos']).toBe('desligada');
    expect(lerAjustes(a).efeitos).toBe('desligada');
    expect(lerAjustes(memoria({ 'match-do-saber:efeitos': 'maxima' })).efeitos).toBe('media');
    expect(lerAjustes(memoria()).efeitos).toBe('media');
  });

  it('←/→ no item mudam a intensidade; "Restaurar padrão" volta para Média', () => {
    const itens = itensDoPainel(true);
    const p = { ...PAINEL_INICIAL, item: 1 };
    expect(teclaNoPainel(p, AJUSTES_PADRAO, 'ArrowRight', itens).ajustes?.efeitos).toBe('alta');
    expect(teclaNoPainel(p, AJUSTES_PADRAO, 'ArrowLeft', itens).ajustes?.efeitos).toBe('baixa');
    expect(teclaNoPainel(p, { ...AJUSTES_PADRAO, efeitos: 'alta' }, 'ArrowRight', itens).ajustes).toBeUndefined();
    const restaurar = { ...PAINEL_INICIAL, item: itens.findIndex((i) => i.id === 'restaurar'), confirmarRestauro: true };
    expect(teclaNoPainel(restaurar, { ...AJUSTES_PADRAO, efeitos: 'desligada' }, ' ', itens).ajustes?.efeitos).toBe('media');
  });

  it('fora do padrão, conta como "Ajustes personalizados" na espera (AC-9.2)', () => {
    expect(resumoAjustes(AJUSTES_PADRAO)).not.toContain('personalizados');
    expect(resumoAjustes({ ...AJUSTES_PADRAO, efeitos: 'alta' })).toContain('· Ajustes personalizados');
  });
});
