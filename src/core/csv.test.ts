import { describe, expect, it } from 'vitest';
import { decodificar, escreverCsv, lerCsv, lerTabela } from './csv';
import { COLUNAS_BANCO, type NoticiaBanco } from './types';

const noticia = (id: string, extra: Partial<NoticiaBanco> = {}): NoticiaBanco => ({
  id, titulo: `Título ${id}`, descricao: 'Descrição', saiba_mais: 'Saiba mais', veredito: 'falsa',
  explicacao: 'Explicação', tecnica: 'fonte', tema: 'saude', fonte_url: 'https://exemplo.org',
  fontes_extras: '', imagem: '', revisado_por: 'Ana', status: 'aprovada', dificuldade: '', titulo_curto: '', fonte_nome: '', ...extra,
});

describe('lerTabela (FR-6)', () => {
  it('detecta vírgula ou ponto e vírgula pelo cabeçalho', () => {
    expect(lerTabela('a,b\n1,2\n')).toEqual([['a', 'b'], ['1', '2']]);
    expect(lerTabela('a;b\r\n1;2,5\r\n')).toEqual([['a', 'b'], ['1', '2,5']]);
  });

  it('aceita aspas, aspas duplicadas e quebra de linha dentro do campo', () => {
    expect(lerTabela('a;b\n"x;y";"diz ""oi""\nlinha 2"\n')).toEqual([['a', 'b'], ['x;y', 'diz "oi"\nlinha 2']]);
  });

  it('remove o BOM e ignora linhas vazias', () => {
    expect(lerTabela('\uFEFFa;b\n\n1;2\n;\n')).toEqual([['a', 'b'], ['1', '2']]);
  });
});

describe('lerCsv', () => {
  it('mapeia pelo cabeçalho, em qualquer ordem, sem diferenciar maiúsculas; coluna ausente fica vazia', () => {
    const [n] = lerCsv('Titulo;ID;veredito;Tema\nMeu título;mds-0001;Falsa;SAUDE\n');
    expect(n).toMatchObject({ id: 'mds-0001', titulo: 'Meu título', veredito: 'falsa', tema: 'saude', imagem: '', status: '' });
    expect(Object.keys(n!).sort()).toEqual([...COLUNAS_BANCO].sort());
  });

  it('AC-7.10: CSV antigo, sem a coluna `dificuldade`, carrega com ela vazia; a coluna é lida em minúsculas', () => {
    const antigo = 'id;titulo;descricao;saiba_mais;veredito;explicacao;tecnica;tema;fonte_url;fontes_extras;imagem;revisado_por;status\n'
      + 'mds-0001;T;D;S;falsa;E;fonte;saude;https://exemplo.org;;;Ana;aprovada\n';
    expect(lerCsv(antigo)[0]).toMatchObject({ id: 'mds-0001', status: 'aprovada', dificuldade: '' });
    expect(lerCsv('id;titulo;dificuldade\nx;T;MEDIO\n')[0]!.dificuldade).toBe('medio');
  });

  it('AC-7.11 (v11.0.0): CSV sem `titulo_curto` e `fonte_nome` carrega com elas vazias; com elas, sem mudar maiúsculas', () => {
    expect(lerCsv('id;titulo\nx;T\n')[0]).toMatchObject({ titulo_curto: '', fonte_nome: '' });
    expect(lerCsv('id;titulo;Titulo Curto;fonte_nome\nx;T;Banana radioativa;Correio Braziliense\n')[0])
      .toMatchObject({ titulo_curto: 'Banana radioativa', fonte_nome: 'Correio Braziliense' });
    expect(COLUNAS_BANCO.slice(-3)).toEqual(['dificuldade', 'titulo_curto', 'fonte_nome']);
  });

  it('apara espaços dos campos', () => {
    expect(lerCsv('id,titulo\n  x1 , T  \n')[0]).toMatchObject({ id: 'x1', titulo: 'T' });
  });

  it('rejeita arquivo sem o cabeçalho do banco', () => {
    expect(() => lerCsv('nome;idade\nAna;3\n')).toThrow(/cabeçalho/i);
    expect(() => lerCsv('')).toThrow(/vazio/i);
  });
});

describe('escreverCsv', () => {
  it('sai com BOM, ponto e vírgula e o cabeçalho de FR-6', () => {
    const t = escreverCsv([]);
    expect(t.startsWith('\uFEFF')).toBe(true);
    expect(t.slice(1).split('\r\n')[0]).toBe(COLUNAS_BANCO.join(';'));
  });

  it('ida e volta: escreverCsv → lerCsv devolve o mesmo banco', () => {
    const banco = [
      noticia('mds-0001'),
      noticia('mds-0002', { titulo: 'Com ; e "aspas"', saiba_mais: 'Linha 1\nLinha 2', fontes_extras: 'https://a.org https://b.org' }),
      noticia('mds-0003', { status: 'rascunho', revisado_por: '', imagem: 'content/img/x.webp', tema: 'meio-ambiente', dificuldade: 'dificil' }),
    ];
    expect(lerCsv(escreverCsv(banco))).toEqual(banco);
  });
});

describe('decodificar', () => {
  it('lê UTF-8 e cai para Windows-1252 (CSV salvo pelo Excel)', () => {
    expect(decodificar(new TextEncoder().encode('Saúde'))).toBe('Saúde');
    expect(decodificar(new Uint8Array([0x53, 0x61, 0xfa, 0x64, 0x65]))).toBe('Saúde');
  });
});
