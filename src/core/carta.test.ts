import { describe, expect, it } from 'vitest';
import { jogaveis, validarNoticia } from './banco';
import { LIMITE_SAIBA_MAIS, avisosNoticia, maiorTamanhoQueCabe } from './carta';
import type { NoticiaBanco } from './types';

const n = (extra: Partial<NoticiaBanco> = {}): NoticiaBanco => ({
  id: 'mds-0001', titulo: 'Título', descricao: 'Descrição', saiba_mais: 'Saiba mais', veredito: 'falsa',
  explicacao: 'Explicação', tecnica: 'fonte', tema: 'saude', fonte_url: 'https://www.exemplo.org/a',
  fontes_extras: '', imagem: '', revisado_por: 'Ana', status: 'aprovada', dificuldade: '', titulo_curto: '', fonte_nome: '', visivel: '',
  ...extra,
});

describe('AC-7.13 (v13.1.0): aviso de "saiba mais" longo, sem bloquear', () => {
  it('limite de 250 caracteres', () => expect(LIMITE_SAIBA_MAIS).toBe(250));
  it('até 250 caracteres não avisa', () => {
    expect(avisosNoticia(n({ saiba_mais: 'x'.repeat(250) }))).toEqual({});
  });
  it('acima de 250 avisa com a contagem', () => {
    expect(avisosNoticia(n({ saiba_mais: 'x'.repeat(358) }))).toEqual({
      saiba_mais: 'Saiba mais longo: 358 de 250 caracteres; no verso da carta a letra fica menor',
    });
  });
  it('conta sem os espaços das pontas', () => {
    expect(avisosNoticia(n({ saiba_mais: `  ${'x'.repeat(250)}  ` }))).toEqual({});
  });
  it('não é erro de validação nem tira a notícia das partidas', () => {
    const longa = n({ saiba_mais: 'x'.repeat(400) });
    expect(validarNoticia(longa)).toEqual({});
    expect(jogaveis([longa]).map((x) => x.id)).toEqual(['mds-0001']);
  });
});

describe('AC-17.1/AC-17.2: tamanho da letra que cabe na carta', () => {
  it('fica no máximo quando cabe', () => {
    expect(maiorTamanhoQueCabe(36, 30, () => true)).toBe(36);
  });
  it('desce de 1 em 1 até caber', () => {
    expect(maiorTamanhoQueCabe(25, 20, (t) => t <= 22)).toBe(22);
  });
  it('nunca passa do mínimo, mesmo sem caber', () => {
    expect(maiorTamanhoQueCabe(25, 20, () => false)).toBe(20);
  });
  it('mede cada tamanho uma vez, do maior para o menor', () => {
    const medidos: number[] = [];
    maiorTamanhoQueCabe(25, 20, (t) => { medidos.push(t); return t <= 23; });
    expect(medidos).toEqual([25, 24, 23]);
  });
});
