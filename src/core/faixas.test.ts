import { describe, expect, it } from 'vitest';
import { FAIXAS, faixaDeAcertos, type Faixa } from './faixas';
import { mensagemResumo } from './partida';

describe('faixaDeAcertos (FR-5, AC-5.7, v11.0.0)', () => {
  it.each([
    [0, 10, 1], [4, 10, 1], [5, 10, 2], [7, 10, 2], [8, 10, 3], [9, 10, 3], [10, 10, 4],
    [3, 6, 2], [0, 0, 1],
  ] as const)('%i de %i = faixa %i', (pontos, total, faixa) => {
    expect(faixaDeAcertos(pontos, total)).toBe(faixa);
  });

  it('é a mesma regra da mensagem do resumo, para qualquer N de M até 12', () => {
    const vistas = new Map<Faixa, Set<string>>();
    for (let total = 1; total <= 12; total++) {
      for (let pontos = 0; pontos <= total; pontos++) {
        const f = faixaDeAcertos(pontos, total);
        if (!vistas.has(f)) vistas.set(f, new Set());
        vistas.get(f)!.add(mensagemResumo(pontos, total));
      }
    }
    for (const mensagens of vistas.values()) expect(mensagens.size).toBe(1);
    expect(vistas.size).toBe(4);
  });

  it('cada faixa tem título e filtro (AC-13.2, AC-13.8)', () => {
    expect(FAIXAS[1]).toMatchObject({ titulo: 'Aprendiz de checagem', filtro: 'lupa' });
    expect(FAIXAS[2]).toMatchObject({ titulo: 'Detetive em treino', filtro: 'detetive' });
    expect(FAIXAS[3]).toMatchObject({ titulo: 'Faro de repórter', filtro: 'reporter' });
    expect(FAIXAS[4]).toMatchObject({ titulo: 'Imune a fake news!', filtro: 'heroi' });
  });
});
