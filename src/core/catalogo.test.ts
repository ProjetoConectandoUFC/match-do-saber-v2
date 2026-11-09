import { describe, expect, it } from 'vitest';
import { parseCatalogo } from './catalogo';

const noticia = {
  id: 'n1', titulo: 'T', descricao: 'D', saibaMais: 'S', imagem: 'content/img/n1.webp', tema: 'saude',
  veredito: 'falsa', explicacao: 'E', tecnica: 'fonte', fonteUrl: 'https://exemplo.org',
};

describe('parseCatalogo', () => {
  it('aceita um catálogo válido', () => {
    const c = parseCatalogo({ versao: '2026-10-26T12:00:00Z', noticias: [noticia] });
    expect(c.noticias).toHaveLength(1);
    expect(c.noticias[0]?.veredito).toBe('falsa');
  });

  it('FR-4 (v9.0.0): aceita notícia sem imagem', () => {
    const { imagem: _sem, ...semImagem } = noticia;
    const c = parseCatalogo({ versao: 'x', noticias: [semImagem] });
    expect(c.noticias[0]).not.toHaveProperty('imagem');
  });

  it('aceita catálogo vazio', () => {
    expect(parseCatalogo({ versao: 'x', noticias: [] }).noticias).toEqual([]);
  });

  it.each([
    ['não-objeto', 42],
    ['sem noticias', { versao: 'x' }],
    ['veredito inválido', { versao: 'x', noticias: [{ ...noticia, veredito: 'talvez' }] }],
    ['tecnica inválida', { versao: 'x', noticias: [{ ...noticia, tecnica: 'sorte' }] }],
    ['sem tema', { versao: 'x', noticias: [{ ...noticia, tema: undefined }] }],
    ['tema inválido', { versao: 'x', noticias: [{ ...noticia, tema: 'esporte' }] }],
    ['campo faltando', { versao: 'x', noticias: [{ ...noticia, titulo: undefined }] }],
  ])('rejeita %s', (_nome, json) => {
    expect(() => parseCatalogo(json)).toThrow(/catálogo inválido/);
  });
});
