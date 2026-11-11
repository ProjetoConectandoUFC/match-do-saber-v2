// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { escreverCsv } from '../core/csv';
import type { NoticiaBanco } from '../core/types';
import { carregarPagina, desenharPagina } from './pagina';

const linha = (id: string, extra: Partial<NoticiaBanco> = {}): NoticiaBanco => ({
  id, titulo: `Título ${id}`, descricao: 'D', saiba_mais: 'S', veredito: 'verdadeira', explicacao: 'E', tecnica: 'fonte',
  tema: 'saude', fonte_url: 'https://www.correiobraziliense.com.br/x', fontes_extras: '', imagem: '', revisado_por: 'Ana',
  status: 'aprovada', dificuldade: '', titulo_curto: '', fonte_nome: '', ...extra,
});

describe('página das fontes (AC-5.10, v11.0.0)', () => {
  it('lista os ids pedidos com veredito, título e links que abrem em outra aba sem repassar a origem', () => {
    const raiz = document.createElement('main');
    desenharPagina(raiz, [
      { id: 'mds-0002', encontrada: true, titulo: 'Médico revela <b>cura</b>', veredito: 'falsa', rotuloFonte: 'Desmentido por:', links: [{ url: 'https://www.aosfatos.org/y', nome: 'Aos Fatos' }, { url: 'https://observador.pt/z', nome: 'observador.pt' }] },
      { id: 'mds-0099', encontrada: false },
    ]);
    const itens = [...raiz.querySelectorAll('li')];
    expect(itens).toHaveLength(2);
    expect(itens[0]).toHaveTextContent('Mentira');
    expect(itens[0]).toHaveTextContent('Médico revela <b>cura</b>'); // texto, nunca HTML
    expect(itens[0]!.querySelector('b')).toBeNull();
    expect(itens[0]).toHaveTextContent('Desmentido por: Aos Fatos · observador.pt');
    const links = [...itens[0]!.querySelectorAll('a')];
    expect(links.map((a) => a.getAttribute('href'))).toEqual(['https://www.aosfatos.org/y', 'https://observador.pt/z']);
    for (const a of links) {
      expect(a).toHaveAttribute('target', '_blank');
      expect(a).toHaveAttribute('rel', 'noopener noreferrer');
    }
    expect(itens[1]).toHaveTextContent('Notícia não encontrada nesta versão do jogo');
  });

  it('sem ids no endereço, explica como chegar à página', () => {
    const raiz = document.createElement('main');
    desenharPagina(raiz, []);
    expect(raiz).toHaveTextContent('Escaneie o QR code no fim de uma partida do Match do Saber');
  });

  it('carrega o banco embutido e mostra só as notícias jogáveis pedidas, na ordem do endereço', async () => {
    const csv = escreverCsv([
      linha('mds-0001', { fonte_nome: 'Correio Braziliense' }),
      linha('mds-0002', { veredito: 'falsa', status: 'rascunho', revisado_por: '' }),
      linha('mds-0003', { veredito: 'falsa' }),
    ]);
    const raiz = document.createElement('main');
    let pedido = '';
    await carregarPagina(raiz, '#3.1.2', async (url) => { pedido = url; return csv; }, 'base/');
    expect(pedido).toBe('base/content/noticias.csv');
    const itens = [...raiz.querySelectorAll('li')];
    expect(itens.map((li) => li.getAttribute('data-id'))).toEqual(['mds-0003', 'mds-0001', 'mds-0002']);
    expect(itens[1]).toHaveTextContent('Fonte: Correio Braziliense');
    expect(itens[2]).toHaveTextContent('Notícia não encontrada nesta versão do jogo'); // rascunho não aparece
  });

  it('sem conseguir ler o banco, mostra um aviso', async () => {
    const raiz = document.createElement('main');
    await carregarPagina(raiz, '#1', async () => { throw new Error('offline'); }, '/');
    expect(raiz).toHaveTextContent('Não foi possível carregar as notícias. Confira a internet e tente de novo.');
  });
});
