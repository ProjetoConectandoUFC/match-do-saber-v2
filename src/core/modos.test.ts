import { describe, expect, it } from 'vitest';
import { DICA_GESTOS, DICA_SAIBA_MAIS, MODOS, MODO_PADRAO, MODO_ROTULO } from './modos';

// v12.0.0: os testes das configurações (itens, padrões, armazenamento, ←/→, resumo) estão em ajustes.test.ts.
describe('modos de jogo', () => {
  it('modos, padrão e rótulos', () => {
    expect(MODOS).toEqual(['corpo', 'mao', 'cabeca']);
    expect(MODO_PADRAO).toBe('corpo');
    expect(MODO_ROTULO).toEqual({ corpo: 'Corpo', mao: 'Mão', cabeca: 'Cabeça' });
  });
  it('AC-9.14 (v10.0.0): dicas de cada modo dizem "mentira" no lugar de "falsa"', () => {
    expect(DICA_GESTOS.mao).toBe('Arraste a mão para a direita: é verdade · Para a esquerda: é mentira · Duas mãos para cima: saiba mais');
    expect(DICA_GESTOS.cabeca).toBe('Cabeça para a direita: é verdade · Cabeça para a esquerda: é mentira · Queixo para cima: saiba mais');
  });
  it('FR-15 (v10.0.0): dica do saiba mais sem emoji', () => {
    expect(DICA_SAIBA_MAIS).toEqual({
      corpo: 'Saiba mais: levante as duas mãos (ou ↑)',
      mao: 'Saiba mais: levante as duas mãos (ou ↑)',
      cabeca: 'Saiba mais: levante o queixo (ou ↑)',
    });
  });
  it('AC-2.9 (v10.3.0): dica do modo Corpo cita só o corpo', () => {
    expect(DICA_GESTOS.corpo).toBe('Corpo para a direita: é verdade · Para a esquerda: é mentira · Duas mãos para cima: saiba mais');
  });
});
