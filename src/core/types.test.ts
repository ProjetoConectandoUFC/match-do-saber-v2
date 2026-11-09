import { describe, expect, it } from 'vitest';
import { COLUNAS_BANCO, STATUS, TEMAS, TEMA_ROTULO } from './types';

describe('tipos do banco de notícias (v9.0.0)', () => {
  it('AC-7.2: temas e status só aceitam os valores das listas', () => {
    expect(TEMAS).toEqual(['saude', 'ciencia', 'historia', 'tecnologia', 'curiosidades', 'meio-ambiente']);
    expect(STATUS).toEqual(['rascunho', 'aprovada']);
    for (const t of TEMAS) expect(TEMA_ROTULO[t]).toBeTruthy();
    expect(TEMA_ROTULO['meio-ambiente']).toBe('Meio ambiente');
  });

  it('FR-6: colunas do CSV, na ordem', () => {
    expect(COLUNAS_BANCO).toEqual([
      'id', 'titulo', 'descricao', 'saiba_mais', 'veredito', 'explicacao', 'tecnica', 'tema',
      'fonte_url', 'fontes_extras', 'imagem', 'revisado_por', 'status',
    ]);
  });
});
