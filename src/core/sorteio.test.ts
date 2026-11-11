import { describe, expect, it } from 'vitest';
import { sortear } from './sorteio';
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

describe('sortear com cards por partida e nível (v12.0.0)', () => {
  const comNivel = (id: string, veredito: Veredito, dificuldade?: Noticia['dificuldade']): Noticia => ({ ...n(id, veredito), dificuldade });
  const misto = [
    ...Array.from({ length: 6 }, (_, i) => comNivel(`vf${i}`, 'verdadeira', 'facil')),
    ...Array.from({ length: 6 }, (_, i) => comNivel(`vd${i}`, 'verdadeira', 'dificil')),
    ...Array.from({ length: 6 }, (_, i) => comNivel(`ff${i}`, 'falsa', 'facil')),
    ...Array.from({ length: 2 }, (_, i) => comNivel(`fd${i}`, 'falsa', 'dificil')),
    ...Array.from({ length: 4 }, (_, i) => comNivel(`fs${i}`, 'falsa')),
  ];
  it('AC-6.1: M = 5 dá 2 verdadeiras e 3 falsas; M = 8 dá 4 e 4', () => {
    expect(conta(sortear(lote(8, 9), rngSeed(3), 5))).toEqual({ v: 2, f: 3, unicos: 5 });
    expect(conta(sortear(lote(8, 9), rngSeed(3), 8))).toEqual({ v: 4, f: 4, unicos: 8 });
  });
  it('AC-6.5: com nível Difícil, usa primeiro as difíceis de cada lado e completa com as outras', () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const cards = sortear(misto, rngSeed(seed), 10, 'dificil');
      expect(conta(cards)).toEqual({ v: 5, f: 5, unicos: 10 });
      expect(cards.filter((c) => c.veredito === 'verdadeira').every((c) => c.dificuldade === 'dificil')).toBe(true);
      // só há 2 falsas difíceis: as duas entram e o resto vem de outros níveis
      expect(cards.filter((c) => c.veredito === 'falsa' && c.dificuldade === 'dificil')).toHaveLength(2);
    }
  });
  it('AC-6.5: com nível Todos (ou sem nível), o sorteio é o mesmo de antes', () => {
    expect(sortear(misto, rngSeed(7), 10, 'todos').map((c) => c.id)).toEqual(sortear(misto, rngSeed(7), 10).map((c) => c.id));
  });
  it('AC-6.5: um nível sem nenhuma notícia não diminui a partida', () => {
    expect(conta(sortear(lote(8, 9), rngSeed(1), 10, 'medio'))).toEqual({ v: 5, f: 5, unicos: 10 });
  });
});
