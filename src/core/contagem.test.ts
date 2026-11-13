import { describe, expect, it } from 'vitest';
import { AJUSTES_PADRAO } from './ajustes';
import { avisoSemNoticias, contarConteudo, textoContagem } from './contagem';
import type { NoticiaBanco } from './types';

const n = (id: string, extra: Partial<NoticiaBanco> = {}): NoticiaBanco => ({
  id, titulo: `Título ${id}`, descricao: 'D', saiba_mais: 'S', veredito: 'falsa', explicacao: 'E', tecnica: 'fonte',
  tema: 'saude', fonte_url: 'https://exemplo.org/a', fontes_extras: '', imagem: '', revisado_por: 'Ana', status: 'aprovada',
  dificuldade: '', titulo_curto: '', fonte_nome: '', visivel: '', ...extra,
});

const BANCO = [
  n('a'), n('b', { tema: 'politica', dificuldade: 'facil' }), n('c', { visivel: 'nao' }),
  n('d', { status: 'rascunho', revisado_por: '' }), n('e', { tema: 'esporte' }),
];

describe('contagens do painel Ajustes (AC-9.1, AC-9.27, AC-7.12)', () => {
  it('jogáveis dentro dos filtros, total do banco, ocultas e jogáveis por tema', () => {
    const c = contarConteudo(BANCO, AJUSTES_PADRAO);
    expect(c).toMatchObject({ jogaveis: 2, jogaveisSemFiltro: 2, total: 5, ocultas: 1 });
    expect(c.porTema.saude).toBe(1);
    expect(c.porTema.politica).toBe(1);
    expect(c.porTema.historia).toBe(0);
    expect(textoContagem(c)).toBe('2 jogáveis de 5 no banco (1 oculta)');
  });

  it('os filtros de tema e dificuldade mudam a contagem de jogáveis; por tema respeita a dificuldade', () => {
    const c = contarConteudo(BANCO, { ...AJUSTES_PADRAO, temas: ['politica'] });
    expect(c.jogaveis).toBe(1);
    expect(c.porTema.saude).toBe(1); // a contagem do tema não depende de ele estar ligado
    const f = contarConteudo(BANCO, { ...AJUSTES_PADRAO, dificuldade: 'facil' });
    expect(f.jogaveis).toBe(1);
    expect(f.porTema.saude).toBe(0);
    expect(textoContagem({ ...c, ocultas: 3, jogaveis: 1, total: 9 })).toBe('1 jogável de 9 no banco (3 ocultas)');
  });

  it('AC-6.4: aviso da espera', () => {
    expect(avisoSemNoticias(contarConteudo(BANCO, AJUSTES_PADRAO))).toBeNull();
    expect(avisoSemNoticias(contarConteudo([], AJUSTES_PADRAO))).toBe('Nenhuma notícia publicada');
    expect(avisoSemNoticias(contarConteudo(BANCO, { ...AJUSTES_PADRAO, temas: ['historia'] })))
      .toBe('Nenhuma notícia para os ajustes atuais: revise Ajustes › Conteúdo');
  });
});
