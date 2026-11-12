import { describe, expect, it } from 'vitest';
import { jogaveis } from './banco';
import {
  FILTROS_VAZIOS, alterarVisibilidade, analisarQuestoes, aprovarQuestao, contarQuestoes, filtrarQuestoes, fontesDaQuestao,
  gravarQuestao, questaoVizinha, voltarParaRascunho,
} from './questoes';
import type { NoticiaBanco } from './types';

const n = (id: string, extra: Partial<NoticiaBanco> = {}): NoticiaBanco => ({
  id, titulo: `Título ${id}`, descricao: 'Descrição', saiba_mais: 'Saiba mais', veredito: 'falsa',
  explicacao: 'Explicação', tecnica: 'fonte', tema: 'saude', fonte_url: 'https://www.exemplo.org/a',
  fontes_extras: '', imagem: '', revisado_por: 'Ana', status: 'aprovada', dificuldade: '', titulo_curto: '', fonte_nome: '', visivel: '', ...extra,
});

const BANCO: NoticiaBanco[] = [
  n('mds-0001', { titulo: 'Vacina causa ímã', veredito: 'falsa', tema: 'saude', dificuldade: 'facil' }),
  n('mds-0002', { titulo: 'Água ferve a 100 °C', veredito: 'verdadeira', tema: 'ciencia', dificuldade: 'dificil', fonte_nome: 'Aos Fatos' }),
  n('mds-0003', { titulo: 'Rascunho de história', veredito: 'verdadeira', tema: 'historia', status: 'rascunho', revisado_por: '' }),
  n('mds-0004', { titulo: 'Linha estragada', tema: 'esporte' }),
  n('mds-0005', { titulo: 'Oculta mas boa', veredito: 'verdadeira', visivel: 'nao' }),
  n('mds-0006', { titulo: 'Aprovada sem revisor', revisado_por: '' }),
  n('mds-0007', { titulo: 'Fonte quebrada', fonte_url: 'exemplo.org' }),
];

describe('analisarQuestoes (FR-17: mesma validação e mesma regra de jogável)', () => {
  it('marca como jogável exatamente as que `jogaveis` deixa entrar na partida', () => {
    const qs = analisarQuestoes(BANCO);
    const ids = new Set(jogaveis(BANCO).map((x) => x.id));
    expect(qs.filter((q) => q.jogavel).map((q) => q.noticia.id)).toEqual([...ids]);
    expect(qs.map((q) => q.situacao)).toEqual(['jogavel', 'jogavel', 'rascunho', 'invalida', 'oculta', 'invalida', 'invalida']);
    expect(qs.map((q) => q.indice)).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  it('id repetido deixa as duas linhas inválidas, como no sorteio (AC-8.4)', () => {
    const qs = analisarQuestoes([n('a'), n('A')]);
    expect(qs.every((q) => !q.jogavel && q.situacao === 'invalida')).toBe(true);
    expect(jogaveis([n('a'), n('A')])).toHaveLength(0);
  });
});

describe('AC-16.4: motivos de ficar fora do jogo, em linguagem simples', () => {
  const motivos = (x: NoticiaBanco) => analisarQuestoes([x])[0]!.motivos;

  it('jogável não tem motivo', () => {
    expect(motivos(n('ok'))).toEqual([]);
  });

  it('exemplos da spec: sem revisor, fonte_url não é um link, oculta, rascunho', () => {
    expect(motivos(n('x', { revisado_por: '' }))).toEqual(['Sem revisor']);
    expect(motivos(n('x', { fonte_url: 'exemplo.org' }))).toEqual(['fonte_url não é um link']);
    expect(motivos(n('x', { visivel: 'nao' }))).toEqual(['Oculta']);
    expect(motivos(n('x', { status: 'rascunho' }))).toEqual(['Rascunho']);
  });

  it('rascunho sem revisor diz as duas coisas; oculta e inválida também somam', () => {
    expect(motivos(n('x', { status: 'rascunho', revisado_por: '' }))).toEqual(['Rascunho', 'Sem revisor']);
    expect(motivos(n('x', { tema: 'esporte', visivel: 'nao' }))).toEqual(['Tema "esporte" não está na lista', 'Oculta']);
  });

  it('campos obrigatórios e listas', () => {
    expect(motivos(n('x', { titulo: '', fonte_url: '' }))).toEqual(['Falta o título', 'Falta o link da fonte']);
    expect(motivos(n('x', { veredito: 'talvez' }))).toEqual(['Veredito "talvez" não está na lista']);
    expect(motivos(n('x', { dificuldade: 'facilima' }))).toEqual(['Dificuldade "facilima" não está na lista']);
    expect(motivos(n('x', { visivel: 'talvez' }))).toEqual(['Visibilidade "talvez" não é sim nem nao']);
    expect(motivos(n('x', { titulo_curto: 'x'.repeat(35) }))).toEqual(['Título curto passa de 34 caracteres']);
    expect(motivos(n('x', { fontes_extras: 'https://ok.org nada' }))).toEqual(['Um link de outras fontes não é um link']);
    expect(motivos(n('x y'))).toEqual(['ID com caracteres não permitidos (use letras, números e hífen)']);
    expect(analisarQuestoes([n('a'), n('a')])[0]!.motivos).toEqual(['ID repetido (outra questão usa o mesmo)']);
  });
});

describe('AC-16.1: contagem', () => {
  it('total, jogáveis, ocultas, rascunhos, inválidas e verdadeiras/falsas entre as jogáveis', () => {
    expect(contarQuestoes(analisarQuestoes(BANCO))).toEqual({
      total: 7, jogaveis: 2, ocultas: 1, rascunhos: 1, invalidas: 3, verdadeiras: 1, falsas: 1,
    });
  });
});

describe('AC-16.3: filtros', () => {
  const qs = analisarQuestoes(BANCO);
  const ids = (f: Partial<typeof FILTROS_VAZIOS>) => filtrarQuestoes(qs, { ...FILTROS_VAZIOS, ...f }).map((q) => q.noticia.id);

  it('sem filtro, todas', () => {
    expect(ids({})).toHaveLength(7);
  });

  it('texto ignora acento e caixa e procura em id, título, descrição, fontes e revisor', () => {
    expect(ids({ texto: 'IMA' })).toEqual(['mds-0001']);
    expect(ids({ texto: 'mds-0002' })).toEqual(['mds-0002']);
    expect(ids({ texto: 'aos fatos' })).toEqual(['mds-0002']);
  });

  it('veredito, tema, dificuldade (inclusive "sem"), status e visibilidade', () => {
    expect(ids({ veredito: 'verdadeira' })).toEqual(['mds-0002', 'mds-0003', 'mds-0005']);
    expect(ids({ tema: 'ciencia' })).toEqual(['mds-0002']);
    expect(ids({ dificuldade: 'facil' })).toEqual(['mds-0001']);
    expect(ids({ dificuldade: 'sem' })).toHaveLength(5);
    expect(ids({ status: 'rascunho' })).toEqual(['mds-0003']);
    expect(ids({ visibilidade: 'oculta' })).toEqual(['mds-0005']);
    expect(ids({ visibilidade: 'visivel' })).toHaveLength(6);
  });

  it('"Só jogáveis" e "Só com problemas" (inválidas) e a combinação de todos', () => {
    expect(ids({ soJogaveis: true })).toEqual(['mds-0001', 'mds-0002']);
    expect(ids({ soProblemas: true })).toEqual(['mds-0004', 'mds-0006', 'mds-0007']);
    expect(ids({ soJogaveis: true, veredito: 'verdadeira' })).toEqual(['mds-0002']);
    expect(ids({ soJogaveis: true, soProblemas: true })).toEqual([]);
  });
});

describe('AC-16.2: fontes da questão', () => {
  it('verdadeira: "Fonte:" com fonte_nome; extras com o domínio', () => {
    expect(fontesDaQuestao(n('x', { veredito: 'verdadeira', fonte_nome: 'Aos Fatos', fontes_extras: 'https://www.g1.globo.com/a  https://lupa.uol.com.br/b' })))
      .toEqual([
        { rotulo: 'Fonte:', nome: 'Aos Fatos', url: 'https://www.exemplo.org/a' },
        { rotulo: 'Outra fonte:', nome: 'g1.globo.com', url: 'https://www.g1.globo.com/a' },
        { rotulo: 'Outra fonte:', nome: 'lupa.uol.com.br', url: 'https://lupa.uol.com.br/b' },
      ]);
  });

  it('falsa: "Desmentido por:" com o domínio quando não há fonte_nome', () => {
    expect(fontesDaQuestao(n('x'))).toEqual([{ rotulo: 'Desmentido por:', nome: 'exemplo.org', url: 'https://www.exemplo.org/a' }]);
  });

  it('sem link mostra o texto como está, sem domínio', () => {
    expect(fontesDaQuestao(n('x', { fonte_url: 'exemplo.org' }))).toEqual([{ rotulo: 'Desmentido por:', nome: '', url: 'exemplo.org' }]);
    expect(fontesDaQuestao(n('x', { fonte_url: '' }))).toEqual([]);
  });
});

describe('AC-16.5: ações (mudam só a linha escolhida, pela posição)', () => {
  it('aprovar preenche revisado_por e status = aprovada', () => {
    const r = aprovarQuestao(BANCO, 2, '  Levi ');
    expect('banco' in r && r.banco[2]).toMatchObject({ id: 'mds-0003', status: 'aprovada', revisado_por: 'Levi' });
    expect('banco' in r && r.banco.filter((_, i) => i !== 2)).toEqual(BANCO.filter((_, i) => i !== 2));
  });

  it('não aprova sem nome de revisor', () => {
    expect(aprovarQuestao(BANCO, 2, '  ')).toEqual({ erro: 'Diga quem revisou para aprovar' });
  });

  it('não aprova questão inválida (Princípio 1, AC-7.3)', () => {
    const r = aprovarQuestao(BANCO, 3, 'Levi');
    expect(r).toEqual({ erro: 'Corrija antes de aprovar: Tema "esporte" não está na lista' });
    expect(aprovarQuestao([n('a', { status: 'rascunho' }), n('a', { status: 'rascunho' })], 0, 'Levi')).toEqual({
      erro: 'Corrija antes de aprovar: ID repetido (outra questão usa o mesmo)',
    });
  });

  it('voltar para rascunho mantém o revisor', () => {
    expect(voltarParaRascunho(BANCO, 0)[0]).toMatchObject({ status: 'rascunho', revisado_por: 'Ana' });
  });

  it('ocultar grava "nao" e mostrar no jogo grava vazio (AC-7.12)', () => {
    const oculto = alterarVisibilidade(BANCO, 0, false);
    expect(oculto[0]!.visivel).toBe('nao');
    expect(analisarQuestoes(oculto)[0]!.situacao).toBe('oculta');
    expect(alterarVisibilidade(BANCO, 4, true)[4]!.visivel).toBe('');
    expect(alterarVisibilidade(BANCO, 4, true)).toHaveLength(BANCO.length);
  });
});

describe('AC-16.6: ↑/↓ andam na lista filtrada', () => {
  const lista = analisarQuestoes(BANCO).filter((q) => q.jogavel || q.situacao === 'oculta'); // índices 0, 1, 4

  it('próxima e anterior, parando nas pontas', () => {
    expect(questaoVizinha(lista, 0, 1)).toBe(1);
    expect(questaoVizinha(lista, 1, 1)).toBe(4);
    expect(questaoVizinha(lista, 4, 1)).toBe(4);
    expect(questaoVizinha(lista, 4, -1)).toBe(1);
    expect(questaoVizinha(lista, 0, -1)).toBe(0);
  });

  it('sem questão aberta (ou fora da lista filtrada), começa pela primeira', () => {
    expect(questaoVizinha(lista, null, 1)).toBe(0);
    expect(questaoVizinha(lista, 2, -1)).toBe(0);
    expect(questaoVizinha([], null, 1)).toBeNull();
  });
});

describe('AC-16.5 › Editar: grava pelo editor de AC-7.2, com a validação de AC-7.3', () => {
  it('troca só a linha editada, pela posição, mesmo com outra linha de mesmo id', () => {
    const banco = [n('a', { titulo: 'um' }), n('a', { titulo: 'dois' })];
    const r = gravarQuestao(banco, 1, n('b', { titulo: 'novo' }));
    expect('banco' in r && r.banco.map((x) => `${x.id}:${x.titulo}`)).toEqual(['a:um', 'b:novo']);
  });

  it('com problema, não grava e aponta o campo', () => {
    expect(gravarQuestao(BANCO, 0, n('mds-0002'))).toEqual({ problemas: { id: 'id repetido' } });
    expect(gravarQuestao(BANCO, 0, n('mds-0001', { status: 'aprovada', revisado_por: '' }))).toEqual({
      problemas: { revisado_por: 'notícia aprovada precisa de quem revisou' },
    });
  });
});
