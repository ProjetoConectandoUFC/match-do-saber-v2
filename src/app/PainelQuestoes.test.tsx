// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { NoticiaBanco } from '../core/types';
import { PainelQuestoes } from './PainelQuestoes';
import type { EstadoBanco, RepositorioNoticias } from './repositorio';

const n = (id: string, extra: Partial<NoticiaBanco> = {}): NoticiaBanco => ({
  id, titulo: `Título ${id}`, descricao: `Descrição ${id}`, saiba_mais: `Saiba mais ${id}`, veredito: 'falsa',
  explicacao: `Explicação ${id}`, tecnica: 'fonte', tema: 'saude', fonte_url: 'https://www.exemplo.org/a',
  fontes_extras: '', imagem: '', revisado_por: 'Ana', status: 'aprovada', dificuldade: '', titulo_curto: '', fonte_nome: '', visivel: '', ...extra,
});

const BANCO = [
  n('mds-0001', { titulo: 'Vacina causa ímã', veredito: 'falsa', tema: 'saude', fontes_extras: 'https://lupa.uol.com.br/x' }),
  n('mds-0002', { titulo: 'Água ferve a 100 °C', veredito: 'verdadeira', tema: 'ciencia', dificuldade: 'dificil', fonte_nome: 'Aos Fatos' }),
  n('mds-0003', { titulo: 'Rascunho de história', veredito: 'verdadeira', tema: 'historia', status: 'rascunho', revisado_por: '' }),
  n('mds-0004', { titulo: 'Linha estragada', tema: 'esporte' }),
  n('mds-0005', { titulo: 'Oculta mas boa', veredito: 'verdadeira', visivel: 'nao' }),
];
const ARQUIVO = 'C:/Documentos/Match do Saber/noticias.csv';

function repoFalso(tipo: 'desktop' | 'web' = 'desktop') {
  const repo: RepositorioNoticias = {
    tipo,
    carregar: vi.fn(async () => ({ banco: BANCO, arquivo: ARQUIVO, versao: 'v1' })),
    salvar: vi.fn(async (banco: NoticiaBanco[]) => ({ banco, arquivo: ARQUIVO, versao: 'v2' })),
  };
  return repo;
}

function Montado({ repo, onFechar = () => {}, filtroInicial, abrirLink }: {
  repo: RepositorioNoticias;
  onFechar?: () => void;
  filtroInicial?: { status?: string };
  abrirLink?: (url: string) => void;
}) {
  const [estado, setEstado] = useState<EstadoBanco>({ banco: BANCO, arquivo: ARQUIVO, versao: 'v1' });
  const [revisor, setRevisor] = useState('');
  return (
    <PainelQuestoes
      repo={repo}
      estado={estado}
      onBancoAlterado={setEstado}
      onFechar={onFechar}
      filtroInicial={filtroInicial}
      revisor={revisor}
      onRevisor={setRevisor}
      abrirLink={abrirLink}
    />
  );
}

const painel = () => screen.getByRole('dialog', { name: 'Questões' });
const lista = () => within(screen.getByRole('list', { name: 'Lista de questões' }));
const itens = () => lista().getAllByRole('button').map((b) => b.getAttribute('data-id'));
const aberta = () => within(screen.getByRole('region', { name: 'Questão aberta' }));

async function montar(repo = repoFalso(), props: Partial<Parameters<typeof Montado>[0]> = {}) {
  render(<Montado repo={repo} {...props} />);
  if (repo.tipo === 'desktop') await waitFor(() => expect(repo.carregar).toHaveBeenCalled());
  return repo;
}

afterEach(() => vi.restoreAllMocks());

describe('AC-16.1: abre com a lista e a contagem', () => {
  it('lista todas, abre a primeira e mostra a contagem do banco', async () => {
    await montar();
    expect(itens()).toEqual(['mds-0001', 'mds-0002', 'mds-0003', 'mds-0004', 'mds-0005']);
    expect(painel()).toHaveTextContent('5 no banco · 2 jogáveis · 1 oculta · 1 rascunho · 1 inválida · 1 verdadeira e 1 falsa entre as jogáveis');
    expect(aberta().getByRole('heading', { name: 'Vacina causa ímã' })).toBeInTheDocument();
    expect(lista().getByRole('button', { name: /Vacina causa ímã/ })).toHaveAttribute('aria-current', 'true');
  });

  it('desktop: relê o arquivo ao abrir (pode ter sido editado no Excel)', async () => {
    const repo = await montar();
    expect(repo.carregar).toHaveBeenCalledOnce();
  });
});

describe('AC-16.2: a questão aberta', () => {
  it('mostra o card, o saiba mais, o gabarito e os dados de revisão', async () => {
    await montar();
    fireEvent.click(lista().getByRole('button', { name: /Água ferve/ }));
    const q = aberta();
    expect(q.getByRole('heading', { name: 'Água ferve a 100 °C' })).toBeInTheDocument();
    expect(q.getByText('Descrição mds-0002')).toBeInTheDocument();
    expect(q.getByText('Saiba mais mds-0002')).toBeInTheDocument();
    expect(q.getByText('Verdade')).toHaveAttribute('data-gabarito', 'verdadeira');
    expect(q.getByText('Explicação mds-0002')).toBeInTheDocument();
    const dados = q.getByRole('list', { name: 'Dados da questão' });
    expect(dados).toHaveTextContent('Técnica: Checar a fonte');
    expect(dados).toHaveTextContent('Tema: Ciência');
    expect(dados).toHaveTextContent('Dificuldade: Difícil');
    expect(dados).toHaveTextContent('Status: Aprovada');
    expect(dados).toHaveTextContent('Revisado por: Ana');
    expect(dados).toHaveTextContent('Visibilidade: Visível no jogo');
    expect(q.getByText('Entra nas partidas')).toBeInTheDocument();
  });

  it('falsa: "Mentira" e "Desmentido por:" com o domínio; extras com o domínio e o link inteiro', async () => {
    await montar();
    const q = aberta();
    expect(q.getByText('Mentira')).toHaveAttribute('data-gabarito', 'falsa');
    const fontes = q.getByRole('list', { name: 'Fontes' });
    expect(fontes).toHaveTextContent('Desmentido por: exemplo.org');
    expect(fontes).toHaveTextContent('Outra fonte: lupa.uol.com.br');
    const link = within(fontes).getByRole('link', { name: 'https://www.exemplo.org/a' });
    expect(link).toHaveAttribute('href', 'https://www.exemplo.org/a');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
    expect(within(fontes).getByRole('link', { name: 'https://lupa.uol.com.br/x' })).toBeInTheDocument();
  });

  it('verdadeira: "Fonte:" com fonte_nome', async () => {
    await montar();
    fireEvent.click(lista().getByRole('button', { name: /Água ferve/ }));
    expect(aberta().getByRole('list', { name: 'Fontes' })).toHaveTextContent('Fonte: Aos Fatos');
  });

  it('desktop: o link abre fora do jogo (navegador do sistema), sem navegar a janela', async () => {
    const abrirLink = vi.fn();
    await montar(repoFalso(), { abrirLink });
    const link = aberta().getByRole('link', { name: 'https://www.exemplo.org/a' });
    const evento = new MouseEvent('click', { bubbles: true, cancelable: true });
    link.dispatchEvent(evento);
    expect(abrirLink).toHaveBeenCalledWith('https://www.exemplo.org/a');
    expect(evento.defaultPrevented).toBe(true);
  });

  it('fonte que não é link aparece como texto, sem link', async () => {
    const repo = repoFalso();
    repo.carregar = vi.fn(async () => ({ banco: [n('x', { fonte_url: 'exemplo.org' })], arquivo: ARQUIVO, versao: 'v1' }));
    render(<PainelQuestoes repo={repo} estado={{ banco: [n('x', { fonte_url: 'exemplo.org' })], versao: 'v1' }} onFechar={() => {}} revisor="" onRevisor={() => {}} />);
    const fontes = aberta().getByRole('list', { name: 'Fontes' });
    expect(fontes).toHaveTextContent('exemplo.org');
    expect(within(fontes).queryByRole('link')).toBeNull();
  });
});

describe('AC-16.3: filtros', () => {
  it('combina os filtros e mostra quantas estão filtradas', async () => {
    await montar();
    fireEvent.change(screen.getByLabelText('Veredito'), { target: { value: 'verdadeira' } });
    expect(itens()).toEqual(['mds-0002', 'mds-0003', 'mds-0005']);
    expect(painel()).toHaveTextContent('Mostrando 3 de 5');
    fireEvent.click(screen.getByLabelText('Só jogáveis'));
    expect(itens()).toEqual(['mds-0002']);
    expect(painel()).toHaveTextContent('Mostrando 1 de 5');
  });

  it('texto, tema, dificuldade, status, visibilidade e "Só com problemas"', async () => {
    await montar();
    const trocar = (rotulo: string, valor: string) => fireEvent.change(screen.getByLabelText(rotulo), { target: { value: valor } });
    trocar('Buscar', 'agua');
    expect(itens()).toEqual(['mds-0002']);
    trocar('Buscar', '');
    trocar('Tema', 'historia');
    expect(itens()).toEqual(['mds-0003']);
    trocar('Tema', '');
    trocar('Dificuldade', 'dificil');
    expect(itens()).toEqual(['mds-0002']);
    trocar('Dificuldade', '');
    trocar('Status', 'rascunho');
    expect(itens()).toEqual(['mds-0003']);
    trocar('Status', '');
    trocar('Visibilidade', 'oculta');
    expect(itens()).toEqual(['mds-0005']);
    trocar('Visibilidade', '');
    fireEvent.click(screen.getByLabelText('Só com problemas'));
    expect(itens()).toEqual(['mds-0004']);
  });

  it('sem resultado, diz e não abre nenhuma questão', async () => {
    await montar();
    fireEvent.change(screen.getByLabelText('Buscar'), { target: { value: 'nada disso' } });
    expect(painel()).toHaveTextContent('Nenhuma questão com esses filtros.');
    expect(screen.queryByRole('region', { name: 'Questão aberta' })).toBeNull();
  });

  it('AC-9.31: o filtro inicial (Revisar questões) abre já em Rascunho', async () => {
    await montar(repoFalso(), { filtroInicial: { status: 'rascunho' } });
    expect(screen.getByLabelText('Status')).toHaveValue('rascunho');
    expect(itens()).toEqual(['mds-0003']);
  });
});

describe('AC-16.4: por que não entra nas partidas', () => {
  it('inválida, rascunho e oculta dizem o motivo em linguagem simples', async () => {
    await montar();
    fireEvent.click(lista().getByRole('button', { name: /Linha estragada/ }));
    expect(aberta().getByRole('list', { name: 'Fora do jogo' })).toHaveTextContent('Tema "esporte" não está na lista');
    fireEvent.click(lista().getByRole('button', { name: /Rascunho de história/ }));
    expect(aberta().getByRole('list', { name: 'Fora do jogo' })).toHaveTextContent(/Rascunho.*Sem revisor/);
    fireEvent.click(lista().getByRole('button', { name: /Oculta mas boa/ }));
    expect(aberta().getByRole('list', { name: 'Fora do jogo' })).toHaveTextContent('Oculta');
  });

  it('a lista marca a situação de cada questão (inclusive "Oculta", AC-7.12)', async () => {
    await montar();
    expect(lista().getByRole('button', { name: /Oculta mas boa/ })).toHaveAttribute('data-situacao', 'oculta');
    expect(lista().getByRole('button', { name: /Oculta mas boa/ })).toHaveTextContent('Oculta');
    expect(lista().getByRole('button', { name: /Linha estragada/ })).toHaveTextContent('Inválida');
  });
});

describe('AC-16.5: ações no desktop', () => {
  it('Ocultar grava visivel = nao e atualiza a lista e a contagem; Mostrar no jogo volta', async () => {
    const repo = await montar();
    fireEvent.click(aberta().getByRole('button', { name: 'Ocultar' }));
    await waitFor(() => expect(repo.salvar).toHaveBeenCalledOnce());
    const [banco, versao] = vi.mocked(repo.salvar).mock.calls[0]!;
    expect(banco[0]!.visivel).toBe('nao');
    expect(versao).toBe('v1');
    expect(banco.slice(1)).toEqual(BANCO.slice(1));
    await waitFor(() => expect(painel()).toHaveTextContent('1 jogável · 2 ocultas'));
    expect(lista().getByRole('button', { name: /Vacina/ })).toHaveAttribute('data-situacao', 'oculta');
    fireEvent.click(aberta().getByRole('button', { name: 'Mostrar no jogo' }));
    await waitFor(() => expect(repo.salvar).toHaveBeenCalledTimes(2));
    expect(vi.mocked(repo.salvar).mock.calls[1]![0][0]!.visivel).toBe('');
  });

  it('Aprovar pede o nome uma vez por sessão e grava status e revisado_por', async () => {
    const repo = await montar();
    fireEvent.click(lista().getByRole('button', { name: /Rascunho de história/ }));
    fireEvent.click(aberta().getByRole('button', { name: 'Aprovar' }));
    const pedido = screen.getByRole('dialog', { name: 'Quem revisou?' });
    fireEvent.change(within(pedido).getByLabelText('Nome de quem revisou'), { target: { value: 'Levi' } });
    fireEvent.click(within(pedido).getByRole('button', { name: 'Aprovar' }));
    await waitFor(() => expect(repo.salvar).toHaveBeenCalledOnce());
    expect(vi.mocked(repo.salvar).mock.calls[0]![0][2]).toMatchObject({ status: 'aprovada', revisado_por: 'Levi' });
    await waitFor(() => expect(painel()).toHaveTextContent('3 jogáveis'));

    // Segunda aprovação na mesma sessão: não pergunta de novo.
    fireEvent.click(aberta().getByRole('button', { name: 'Voltar para rascunho' }));
    await waitFor(() => expect(repo.salvar).toHaveBeenCalledTimes(2));
    expect(vi.mocked(repo.salvar).mock.calls[1]![0][2]).toMatchObject({ status: 'rascunho', revisado_por: 'Levi' });
    fireEvent.click(aberta().getByRole('button', { name: 'Aprovar' }));
    expect(screen.queryByRole('dialog', { name: 'Quem revisou?' })).toBeNull();
    await waitFor(() => expect(repo.salvar).toHaveBeenCalledTimes(3));
  });

  it('não aprova questão inválida: avisa e não grava', async () => {
    const repo = await montar();
    fireEvent.click(lista().getByRole('button', { name: /Linha estragada/ }));
    fireEvent.click(aberta().getByRole('button', { name: 'Voltar para rascunho' }));
    await waitFor(() => expect(repo.salvar).toHaveBeenCalledOnce());
    fireEvent.click(aberta().getByRole('button', { name: 'Aprovar' }));
    fireEvent.change(screen.getByLabelText('Nome de quem revisou'), { target: { value: 'Levi' } });
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Quem revisou?' })).getByRole('button', { name: 'Aprovar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Corrija antes de aprovar: Tema "esporte" não está na lista');
    expect(repo.salvar).toHaveBeenCalledOnce();
  });

  it('Editar abre o editor de AC-7.2; salvar grava na mesma posição', async () => {
    const repo = await montar();
    fireEvent.click(aberta().getByRole('button', { name: 'Editar' }));
    const editor = screen.getByRole('dialog', { name: 'Editar notícia' });
    fireEvent.change(within(editor).getByLabelText('Título'), { target: { value: 'Vacina não causa ímã' } });
    fireEvent.click(within(editor).getByRole('button', { name: 'Salvar' }));
    await waitFor(() => expect(repo.salvar).toHaveBeenCalledOnce());
    expect(vi.mocked(repo.salvar).mock.calls[0]![0][0]!.titulo).toBe('Vacina não causa ímã');
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Editar notícia' })).toBeNull());
    expect(aberta().getByRole('heading', { name: 'Vacina não causa ímã' })).toBeInTheDocument();
  });

  it('falha ao gravar mostra o motivo', async () => {
    const repo = repoFalso();
    repo.salvar = vi.fn(async () => { throw new Error('Não foi possível salvar: o arquivo mudou fora do painel'); });
    await montar(repo);
    fireEvent.click(aberta().getByRole('button', { name: 'Ocultar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('o arquivo mudou fora do painel');
  });

  it('AC-16.5/AC-7.6: aprovação recusada na gravação não guarda o nome do revisor (a próxima aprovação pergunta de novo)', async () => {
    const repo = repoFalso();
    repo.salvar = vi.fn(async () => { throw new Error('Não foi possível salvar: o arquivo mudou fora do painel'); });
    const onRevisor = vi.fn();
    render(<PainelQuestoes repo={repo} estado={{ banco: BANCO, arquivo: ARQUIVO, versao: 'v1' }} onFechar={() => {}} revisor="" onRevisor={onRevisor} />);
    fireEvent.click(lista().getByRole('button', { name: /Rascunho de história/ }));
    fireEvent.click(aberta().getByRole('button', { name: 'Aprovar' }));
    const pedido = screen.getByRole('dialog', { name: 'Quem revisou?' });
    fireEvent.change(within(pedido).getByLabelText('Nome de quem revisou'), { target: { value: 'Levi' } });
    fireEvent.click(within(pedido).getByRole('button', { name: 'Aprovar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('o arquivo mudou fora do painel');
    expect(repo.salvar).toHaveBeenCalledOnce();
    expect(onRevisor).not.toHaveBeenCalled();
  });

  it('aprovação gravada guarda o nome do revisor (sem espaços nas pontas)', async () => {
    const repo = repoFalso();
    const onRevisor = vi.fn();
    render(<PainelQuestoes repo={repo} estado={{ banco: BANCO, arquivo: ARQUIVO, versao: 'v1' }} onBancoAlterado={() => {}} onFechar={() => {}} revisor="" onRevisor={onRevisor} />);
    fireEvent.click(lista().getByRole('button', { name: /Rascunho de história/ }));
    fireEvent.click(aberta().getByRole('button', { name: 'Aprovar' }));
    const pedido = screen.getByRole('dialog', { name: 'Quem revisou?' });
    fireEvent.change(within(pedido).getByLabelText('Nome de quem revisou'), { target: { value: '  Levi ' } });
    fireEvent.click(within(pedido).getByRole('button', { name: 'Aprovar' }));
    await waitFor(() => expect(onRevisor).toHaveBeenCalledWith('Levi'));
    expect(repo.salvar).toHaveBeenCalledOnce();
  });
});

describe('AC-16.5: versão web só leitura', () => {
  it('ações desabilitadas, com o aviso de AC-7.9; não grava', async () => {
    const repo = repoFalso('web');
    render(<PainelQuestoes repo={repo} estado={{ banco: BANCO, versao: null }} onFechar={() => {}} revisor="" onRevisor={() => {}} />);
    expect(painel()).toHaveTextContent('O gerenciador de notícias está disponível no app de desktop');
    for (const nome of ['Ocultar', 'Aprovar', 'Voltar para rascunho', 'Editar']) {
      const b = aberta().queryByRole('button', { name: nome });
      if (b) expect(b).toBeDisabled();
    }
    expect(aberta().getByRole('button', { name: 'Ocultar' })).toBeDisabled();
    expect(aberta().getByRole('button', { name: 'Editar' })).toBeDisabled();
    expect(repo.carregar).not.toHaveBeenCalled();
  });
});

describe('AC-16.6: teclado', () => {
  it('↓/↑ andam na lista filtrada; Esc fecha', async () => {
    const onFechar = vi.fn();
    await montar(repoFalso(), { onFechar });
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    expect(aberta().getByRole('heading', { name: 'Água ferve a 100 °C' })).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    fireEvent.keyDown(window, { key: 'ArrowUp' });
    expect(aberta().getByRole('heading', { name: 'Água ferve a 100 °C' })).toBeInTheDocument();
    expect(aberta().getByText('2 de 5')).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onFechar).toHaveBeenCalledOnce();
  });

  it('↓/↑ dentro do campo "Buscar" movem o cursor do campo e não trocam a questão aberta (v12.0.2)', async () => {
    await montar(repoFalso());
    const antes = aberta().getByRole('heading', { level: 3 }).textContent;
    const busca = screen.getByLabelText('Buscar');
    busca.focus();
    const evento = fireEvent.keyDown(busca, { key: 'ArrowDown' });
    expect(evento).toBe(true);                                             // sem preventDefault: o campo trata a tecla
    expect(aberta().getByRole('heading', { level: 3 }).textContent).toBe(antes);
  });

  it('as teclas não chegam ao jogo enquanto o painel está aberto', async () => {
    await montar();
    const jogo = vi.fn();
    window.addEventListener('keydown', jogo);
    fireEvent.keyDown(window, { key: 'Enter' });
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    window.removeEventListener('keydown', jogo);
    expect(jogo).not.toHaveBeenCalled();
  });

  it('Esc fecha primeiro o pedido do nome, depois o painel', async () => {
    const onFechar = vi.fn();
    await montar(repoFalso(), { onFechar });
    fireEvent.click(lista().getByRole('button', { name: /Rascunho de história/ }));
    fireEvent.click(aberta().getByRole('button', { name: 'Aprovar' }));
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: 'Quem revisou?' })).toBeNull();
    expect(onFechar).not.toHaveBeenCalled();
  });

  it('o ✕ fecha', async () => {
    const onFechar = vi.fn();
    await montar(repoFalso(), { onFechar });
    fireEvent.click(screen.getByRole('button', { name: 'Fechar' }));
    expect(onFechar).toHaveBeenCalledOnce();
  });
});
