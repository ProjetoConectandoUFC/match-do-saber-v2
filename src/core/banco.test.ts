import { describe, expect, it } from 'vitest';
import {
  alterarEmMassa, apagarNoticias, descreverProblemas, gravarNoticia, jogaveis, novaNoticia, prepararImportacao,
  proximoId, validarBanco, validarNoticia,
} from './banco';
import type { NoticiaBanco } from './types';

const n = (id: string, extra: Partial<NoticiaBanco> = {}): NoticiaBanco => ({
  id, titulo: `Título ${id}`, descricao: 'Descrição', saiba_mais: 'Saiba mais', veredito: 'falsa',
  explicacao: 'Explicação', tecnica: 'fonte', tema: 'saude', fonte_url: 'https://exemplo.org/a',
  fontes_extras: '', imagem: '', revisado_por: 'Ana', status: 'aprovada', dificuldade: '', titulo_curto: '', fonte_nome: '', ...extra,
});

describe('título curto e veículo da fonte (AC-7.11, v11.0.0)', () => {
  it('opcionais; o título curto vale até 34 caracteres', () => {
    expect(validarNoticia(n('a'))).toEqual({});
    expect(validarNoticia(n('a', { titulo_curto: 'x'.repeat(34), fonte_nome: 'Aos Fatos' }))).toEqual({});
    expect(validarNoticia(n('a', { titulo_curto: 'x'.repeat(35) })).titulo_curto).toBe('use até 34 caracteres');
  });

  it('a notícia jogável leva o título curto, o veículo e os links extras; vazios não viram campo', () => {
    const [com, sem] = jogaveis([
      n('a', { titulo_curto: 'Curto', fonte_nome: 'Aos Fatos', fontes_extras: 'https://a.org/x  https://b.org/y' }),
      n('b'),
    ]);
    expect(com).toMatchObject({ tituloCurto: 'Curto', fonteNome: 'Aos Fatos', fontesExtras: ['https://a.org/x', 'https://b.org/y'] });
    expect(sem).not.toHaveProperty('tituloCurto');
    expect(sem).not.toHaveProperty('fonteNome');
    expect(sem).not.toHaveProperty('fontesExtras');
  });
});

describe('dificuldade (AC-7.10, v10.1.0)', () => {
  it('vazia ou da lista é válida; fora da lista invalida a notícia', () => {
    expect(validarNoticia(n('a', { dificuldade: '' }))).toEqual({});
    for (const d of ['facil', 'medio', 'dificil']) expect(validarNoticia(n('a', { dificuldade: d }))).toEqual({});
    expect(validarNoticia(n('a', { dificuldade: 'impossivel' })).dificuldade).toBe('use facil, medio, dificil');
  });

  it('notícia com dificuldade fora da lista não entra na partida; com a lista, leva a dificuldade', () => {
    const jogo = jogaveis([n('a', { dificuldade: 'dificil' }), n('b'), n('c', { dificuldade: 'extrema' })]);
    expect(jogo.map((x) => x.id)).toEqual(['a', 'b']);
    expect(jogo[0]!.dificuldade).toBe('dificil');
    expect(jogo[1]).not.toHaveProperty('dificuldade');
  });

  it('nova notícia começa sem dificuldade', () => {
    expect(novaNoticia([]).dificuldade).toBe('');
  });
});

describe('validarNoticia (AC-7.3)', () => {
  it('notícia completa não tem problemas', () => {
    expect(validarNoticia(n('mds-0001'))).toEqual({});
  });

  it.each(['id', 'titulo', 'descricao', 'saiba_mais', 'veredito', 'explicacao', 'tecnica', 'tema', 'fonte_url', 'status'] as const)(
    'aponta o campo obrigatório vazio: %s',
    (campo) => {
      expect(validarNoticia(n('mds-0001', { [campo]: '' }))[campo]).toMatch(/obrigatório/);
    },
  );

  it('imagem e fontes_extras são opcionais', () => {
    expect(validarNoticia(n('mds-0001', { imagem: '', fontes_extras: '' }))).toEqual({});
  });

  it('valores fora das listas (AC-7.2)', () => {
    const p = validarNoticia(n('mds-0001', { veredito: 'talvez', tecnica: 'sorte', tema: 'esporte', status: 'publicada' }));
    expect(Object.keys(p).sort()).toEqual(['status', 'tecnica', 'tema', 'veredito']);
  });

  it('fonte_url e fontes_extras precisam ser links http(s)', () => {
    expect(validarNoticia(n('a', { fonte_url: 'exemplo.org' })).fonte_url).toMatch(/http/);
    expect(validarNoticia(n('a', { fontes_extras: 'https://a.org ftp://b.org' })).fontes_extras).toMatch(/http/);
    expect(validarNoticia(n('a', { fontes_extras: 'https://a.org  http://b.org/x' }))).toEqual({});
  });

  it('aprovada sem revisado_por não passa; rascunho sem revisor passa', () => {
    expect(validarNoticia(n('a', { revisado_por: '' })).revisado_por).toMatch(/revis/);
    expect(validarNoticia(n('a', { revisado_por: '', status: 'rascunho' }))).toEqual({});
  });

  it('id repetido (sem diferenciar maiúsculas) e id com caracteres inválidos', () => {
    expect(validarNoticia(n('mds-0001'), ['MDS-0001']).id).toMatch(/repetido/);
    expect(validarNoticia(n('mds 1')).id).toBeTruthy();
  });

  it('descreverProblemas junta campo e motivo', () => {
    expect(descreverProblemas({ titulo: 'campo obrigatório' })).toBe('titulo: campo obrigatório');
  });
});

describe('validarBanco (AC-8.4)', () => {
  it('separa válidas de inválidas, com o motivo; ids duplicados invalidam as duas linhas', () => {
    const r = validarBanco([n('a'), n('b', { titulo: '' }), n('c'), n('C')]);
    expect(r.validas.map((x) => x.id)).toEqual(['a']);
    expect(r.invalidas.map((x) => [x.indice, x.noticia.id])).toEqual([[1, 'b'], [2, 'c'], [3, 'C']]);
    expect(r.invalidas[0]!.problemas.titulo).toMatch(/obrigatório/);
    expect(r.invalidas[1]!.problemas.id).toMatch(/repetido/);
  });
});

describe('jogaveis (AC-7.7)', () => {
  it('só aprovadas, válidas, com fonte e revisor; convertidas para o jogo', () => {
    const banco = [
      n('a', { saiba_mais: 'SM', fonte_url: 'https://f.org', imagem: 'content/img/a.webp', tema: 'historia' }),
      n('b', { status: 'rascunho' }),
      n('c', { revisado_por: '' }),
      n('d', { veredito: 'talvez' }),
      n('e'),
    ];
    const j = jogaveis(banco);
    expect(j.map((x) => x.id)).toEqual(['a', 'e']);
    expect(j[0]).toEqual({
      id: 'a', titulo: 'Título a', descricao: 'Descrição', saibaMais: 'SM', imagem: 'content/img/a.webp', tema: 'historia',
      veredito: 'falsa', explicacao: 'Explicação', tecnica: 'fonte', fonteUrl: 'https://f.org',
    });
    expect(j[1]).not.toHaveProperty('imagem');
  });
});

describe('proximoId (FR-7)', () => {
  it('mds-NNNN seguinte ao maior existente', () => {
    expect(proximoId([])).toBe('mds-0001');
    expect(proximoId([n('mds-0007'), n('teste-1'), n('MDS-0010')])).toBe('mds-0011');
  });
  it('considera ids extras (ex.: os gerados numa importação)', () => {
    expect(proximoId([n('mds-0001')], ['mds-0002'])).toBe('mds-0003');
  });
});

describe('novaNoticia', () => {
  it('começa como rascunho, com id novo e o resto vazio', () => {
    const x = novaNoticia([n('mds-0003')]);
    expect(x).toMatchObject({ id: 'mds-0004', status: 'rascunho', titulo: '', imagem: '' });
  });
});

describe('prepararImportacao (AC-7.5)', () => {
  it('separa novas, existentes (mesmo id) e inválidas com motivo; gera id para linha sem id', () => {
    const banco = [n('mds-0001'), n('mds-0002')];
    const r = prepararImportacao(banco, [
      n('mds-0002'),
      n('nova-1'),
      n(''),
      n('nova-2', { tema: 'esporte' }),
      n('nova-1'),
    ]);
    expect(r.novas.map((x) => x.id)).toEqual(['nova-1', 'mds-0003']);
    expect(r.existentes.map((x) => [x.linha, x.noticia.id])).toEqual([[2, 'mds-0002']]);
    expect(r.invalidas.map((x) => [x.linha, x.noticia.id])).toEqual([[5, 'nova-2'], [6, 'nova-1']]);
    expect(r.invalidas[0]!.motivo).toMatch(/tema/);
    expect(r.invalidas[1]!.motivo).toMatch(/repetido/);
  });
});

describe('gravar, apagar e alterar em massa (AC-7.2, AC-7.4)', () => {
  const banco = [n('a'), n('b'), n('c')];

  it('gravarNoticia acrescenta uma nova ou substitui a editada no lugar', () => {
    const nova = gravarNoticia(banco, n('d'), null);
    expect('banco' in nova && nova.banco.map((x) => x.id)).toEqual(['a', 'b', 'c', 'd']);
    const editada = gravarNoticia(banco, n('b2', { titulo: 'Novo' }), 'b');
    expect('banco' in editada && editada.banco.map((x) => x.id)).toEqual(['a', 'b2', 'c']);
  });

  it('gravarNoticia não grava com problema (ex.: id de outra notícia)', () => {
    const r = gravarNoticia(banco, n('c'), 'b');
    expect(r).toEqual({ problemas: { id: expect.stringMatching(/repetido/) } });
    expect(gravarNoticia(banco, n('b', { titulo: 'Outro' }), 'b')).toHaveProperty('banco');
  });

  it('apagarNoticias e alterarEmMassa agem só nas selecionadas', () => {
    expect(apagarNoticias(banco, ['a', 'c']).map((x) => x.id)).toEqual(['b']);
    const r = alterarEmMassa(banco, ['a', 'b'], 'status', 'rascunho');
    expect(r.map((x) => x.status)).toEqual(['rascunho', 'rascunho', 'aprovada']);
    expect(banco[0]!.status).toBe('aprovada'); // não muda o original
  });
});
