import { describe, expect, it } from 'vitest';
import { filtrarConteudo, sortear } from './sorteio';
import type { Noticia, Veredito } from './types';

const n = (id: string, veredito: Veredito): Noticia => ({
  id, veredito, titulo: id, descricao: '', saibaMais: '', imagem: '', tema: 'ciencia', explicacao: '', tecnica: 'fonte', fonteUrl: '',
});
const lote = (v: number, f: number) => [
  ...Array.from({ length: v }, (_, i) => n(`v${i}`, 'verdadeira')),
  ...Array.from({ length: f }, (_, i) => n(`f${i}`, 'falsa')),
];
function rngSeed(seed: number) {
  return () => ((seed = (seed * 1664525 + 1013904223) % 2 ** 32) / 2 ** 32);
}
const conta = (cards: Noticia[]) => ({
  v: cards.filter((c) => c.veredito === 'verdadeira').length,
  f: cards.filter((c) => c.veredito === 'falsa').length,
  unicos: new Set(cards.map((c) => c.id)).size,
});

describe('sortear', () => {
  it('AC-6.1: 5 verdadeiras + 5 falsas sem repetição', () => {
    expect(conta(sortear(lote(8, 9), rngSeed(1)))).toEqual({ v: 5, f: 5, unicos: 10 });
  });
  it('AC-6.1: ordem aleatória (sementes diferentes geram ordens diferentes)', () => {
    const a = sortear(lote(8, 9), rngSeed(1)).map((c) => c.id).join();
    const b = sortear(lote(8, 9), rngSeed(2)).map((c) => c.id).join();
    expect(a).not.toBe(b);
  });
  it('AC-6.2: completa com o outro lado', () => {
    expect(conta(sortear(lote(3, 12), rngSeed(3)))).toEqual({ v: 3, f: 7, unicos: 10 });
  });
  it('AC-6.2 (espelhado): poucas falsas, completa com verdadeiras', () => {
    expect(conta(sortear(lote(12, 3), rngSeed(6)))).toEqual({ v: 7, f: 3, unicos: 10 });
  });
  it('AC-6.3: com menos de 10, usa todas', () => {
    expect(conta(sortear(lote(2, 4), rngSeed(4)))).toEqual({ v: 2, f: 4, unicos: 6 });
  });
  it('AC-6.4: sem notícias, partida vazia', () => {
    expect(sortear([], rngSeed(5))).toEqual([]);
  });
});

describe('sortear com os Ajustes (v12.0.0: AC-6.1 a AC-6.4, AC-9.23, AC-9.27)', () => {
  const comTema = (x: Noticia, tema: Noticia['tema']): Noticia => ({ ...x, tema });
  const comDif = (x: Noticia, dificuldade?: Noticia['dificuldade']): Noticia => {
    const { dificuldade: _, ...resto } = x;
    return dificuldade ? { ...resto, dificuldade } : resto;
  };

  it.each([5, 8, 10, 12, 15, 20])('AC-6.1/AC-9.23: N = %i, equilibrado e sem repetição', (N) => {
    for (let s = 1; s <= 20; s++) {
      const c = conta(sortear(lote(20, 20), rngSeed(s), { quantidade: N }));
      expect(c.unicos).toBe(N);
      expect([Math.floor(N / 2), Math.ceil(N / 2)]).toContain(c.v);
      expect(c.v + c.f).toBe(N);
    }
  });

  it('AC-6.1: com N ímpar, o lado com uma a mais é sorteado (os dois lados acontecem)', () => {
    const lados = new Set<number>();
    for (let s = 1; s <= 40; s++) lados.add(conta(sortear(lote(10, 10), rngSeed(s), { quantidade: 5 })).v);
    expect(lados).toEqual(new Set([2, 3]));
  });

  it('AC-6.2 (v12.0.1): lado com menos de ⌈N/2⌉ entra inteiro e o outro completa, inclusive com N ímpar', () => {
    for (let s = 1; s <= 20; s++) {
      expect(conta(sortear(lote(2, 10), rngSeed(s), { quantidade: 5 }))).toEqual({ v: 2, f: 3, unicos: 5 });
      expect(conta(sortear(lote(10, 2), rngSeed(s), { quantidade: 5 }))).toEqual({ v: 3, f: 2, unicos: 5 });
      expect(conta(sortear(lote(3, 20), rngSeed(s), { quantidade: 12 }))).toEqual({ v: 3, f: 9, unicos: 12 });
    }
  });

  it('AC-6.3: com menos de N, usa todas', () => {
    expect(conta(sortear(lote(4, 5), rngSeed(1), { quantidade: 12 }))).toEqual({ v: 4, f: 5, unicos: 9 });
  });

  it('AC-9.27: só os temas ligados', () => {
    const base = lote(6, 6).map((x, i) => comTema(x, i % 2 ? 'saude' : 'politica'));
    const r = sortear(base, rngSeed(1), { quantidade: 10, temas: ['politica'] });
    expect(r.length).toBe(6);
    expect(r.every((x) => x.tema === 'politica')).toBe(true);
    expect(sortear(base, rngSeed(1), { quantidade: 10, temas: ['historia'] })).toEqual([]); // AC-6.4
  });

  it('AC-9.27: "Só fácil/médio/difícil" usam só aquele nível; sem dificuldade só entra em Misturada e Crescente', () => {
    const niveis = [undefined, 'facil', 'medio', 'dificil'] as const;
    const base = lote(8, 8).map((x, i) => comDif(x, niveis[i % 4]));
    for (const d of ['facil', 'medio', 'dificil'] as const) {
      const r = sortear(base, rngSeed(2), { quantidade: 10, dificuldade: d });
      expect(r.length).toBe(4);
      expect(r.every((x) => x.dificuldade === d)).toBe(true);
    }
    expect(sortear(base, rngSeed(2), { quantidade: 20, dificuldade: 'misturada' })).toHaveLength(16);
    expect(sortear(base, rngSeed(2), { quantidade: 20, dificuldade: 'crescente' })).toHaveLength(16);
  });

  it('AC-9.27: "Crescente" põe fáceis, depois médias (e sem dificuldade), depois difíceis; aleatória dentro de cada nível', () => {
    const niveis = [undefined, 'facil', 'medio', 'dificil'] as const;
    const base = lote(10, 10).map((x, i) => comDif(x, niveis[i % 4]));
    const peso = (x: Noticia) => ({ facil: 0, medio: 1, dificil: 2 })[x.dificuldade ?? 'medio'];
    const ordens = new Set<string>();
    for (let s = 1; s <= 10; s++) {
      const r = sortear(base, rngSeed(s), { quantidade: 10, dificuldade: 'crescente' });
      const pesos = r.map(peso);
      expect(pesos).toEqual([...pesos].sort((a, b) => a - b));
      expect(conta(r).unicos).toBe(10);
      ordens.add(r.filter((x) => peso(x) === 1).map((x) => x.id).join());
    }
    expect(ordens.size).toBeGreaterThan(1);
  });

  it('filtrarConteudo: aplica os mesmos filtros (para as contagens do painel e da espera)', () => {
    const base = lote(2, 2).map((x, i) => comDif(comTema(x, i < 2 ? 'saude' : 'ciencia'), i % 2 ? 'facil' : undefined));
    expect(filtrarConteudo(base, { temas: ['saude'], dificuldade: 'misturada' }).map((x) => x.id)).toEqual(['v0', 'v1']);
    expect(filtrarConteudo(base, { temas: ['saude', 'ciencia'], dificuldade: 'facil' }).map((x) => x.id)).toEqual(['v1', 'f1']);
  });
});
