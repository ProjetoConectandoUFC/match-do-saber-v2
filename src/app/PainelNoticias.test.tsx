// @vitest-environment jsdom
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { escreverCsv } from '../core/csv';
import type { NoticiaBanco } from '../core/types';
import { PainelNoticias } from './PainelNoticias';
import type { EstadoBanco, RepositorioNoticias } from './repositorio';

const n = (id: string, extra: Partial<NoticiaBanco> = {}): NoticiaBanco => ({
  id, titulo: `Título ${id}`, descricao: 'Descrição', saiba_mais: 'Saiba mais', veredito: 'falsa',
  explicacao: 'Explicação', tecnica: 'fonte', tema: 'saude', fonte_url: 'https://exemplo.org/a',
  fontes_extras: '', imagem: '', revisado_por: 'Ana', status: 'aprovada', dificuldade: '', titulo_curto: '', fonte_nome: '', ...extra,
});

const BANCO = [
  n('mds-0001', { titulo: 'Vacina causa ímã', veredito: 'falsa', tema: 'saude' }),
  n('mds-0002', { titulo: 'Água ferve a 100 °C', veredito: 'verdadeira', tema: 'ciencia', dificuldade: 'dificil' }),
  n('mds-0003', { titulo: 'Rascunho de história', veredito: 'verdadeira', tema: 'historia', status: 'rascunho', revisado_por: '' }),
  n('mds-0004', { titulo: 'Linha estragada', tema: 'esporte' }),
];

function repoFalso(salvar?: RepositorioNoticias['salvar']) {
  const repo: RepositorioNoticias = {
    tipo: 'desktop',
    carregar: vi.fn(async () => ({ banco: BANCO, arquivo: 'C:/Documentos/Match do Saber/noticias.csv', versao: 'v1' })),
    salvar: vi.fn(salvar ?? (async (banco: NoticiaBanco[]) => ({ banco, arquivo: 'C:/Documentos/Match do Saber/noticias.csv', versao: 'v2' }))),
  };
  return repo;
}

function Montado({ repo, onFechar = () => {} }: { repo: RepositorioNoticias; onFechar?: () => void }) {
  const [estado, setEstado] = useState<EstadoBanco>({ banco: BANCO, arquivo: 'C:/Documentos/Match do Saber/noticias.csv', versao: 'v1' });
  return <PainelNoticias repo={repo} estado={estado} onBancoAlterado={setEstado} onFechar={onFechar} />;
}

const linhas = () => screen.getAllByRole('row').slice(1); // sem o cabeçalho
const ids = () => linhas().map((r) => r.getAttribute('data-id'));

async function montar(repo = repoFalso()) {
  render(<Montado repo={repo} />);
  await waitFor(() => expect(repo.carregar).toHaveBeenCalled());
  return repo;
}

describe('PainelNoticias na versão web', () => {
  it('AC-7.9: avisa que o gerenciador está no app de desktop', () => {
    const onFechar = vi.fn();
    render(<PainelNoticias onFechar={onFechar} />);
    const painel = screen.getByRole('dialog', { name: 'Notícias' });
    expect(painel).toHaveTextContent('O gerenciador de notícias está disponível no app de desktop');
    expect(screen.queryByRole('table')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Fechar' }));
    expect(onFechar).toHaveBeenCalledOnce();
  });

  it('Esc fecha o painel', () => {
    const onFechar = vi.fn();
    render(<PainelNoticias onFechar={onFechar} />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onFechar).toHaveBeenCalledOnce();
  });
});

describe('PainelNoticias no app de desktop', () => {
  it('AC-7.1: lista todas, com contagens, e relê o arquivo ao abrir', async () => {
    await montar();
    expect(ids()).toEqual(['mds-0001', 'mds-0002', 'mds-0003', 'mds-0004']);
    expect(screen.getByText('4 notícias · 2 verdadeiras · 2 falsas · 2 no jogo')).toBeInTheDocument();
    expect(screen.getByText(/C:\/Documentos\/Match do Saber\/noticias\.csv/)).toBeInTheDocument();
  });

  it('AC-7.1: filtros por texto, veredito, tema e status (inclusive inválidas)', async () => {
    await montar();
    fireEvent.change(screen.getByLabelText('Buscar'), { target: { value: 'vacina' } });
    expect(ids()).toEqual(['mds-0001']);
    fireEvent.change(screen.getByLabelText('Buscar'), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText('Veredito'), { target: { value: 'verdadeira' } });
    expect(ids()).toEqual(['mds-0002', 'mds-0003']);
    fireEvent.change(screen.getByLabelText('Tema'), { target: { value: 'historia' } });
    expect(ids()).toEqual(['mds-0003']);
    fireEvent.change(screen.getByLabelText('Veredito'), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText('Tema'), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'invalida' } });
    expect(ids()).toEqual(['mds-0004']);
    expect(linhas()[0]).toHaveTextContent(/tema/);                                // AC-8.4: mostra o motivo
  });

  it('AC-7.10: filtro por dificuldade, inclusive "sem dificuldade"', async () => {
    await montar();
    const filtro = screen.getByLabelText('Dificuldade');
    expect([...filtro.querySelectorAll('option')].map((o) => o.textContent))
      .toEqual(['Todas', 'Fácil', 'Médio', 'Difícil', 'Sem dificuldade']);
    fireEvent.change(filtro, { target: { value: 'dificil' } });
    expect(ids()).toEqual(['mds-0002']);
    fireEvent.change(filtro, { target: { value: 'sem' } });
    expect(ids()).toEqual(['mds-0001', 'mds-0003', 'mds-0004']);
    fireEvent.change(filtro, { target: { value: 'facil' } });
    expect(ids()).toEqual([]);
  });

  it('AC-7.10: o editor escolhe a dificuldade numa lista (ou vazia) e grava', async () => {
    const repo = await montar();
    fireEvent.click(within(linhas()[0]!).getByRole('button', { name: 'Editar' }));
    const editor = screen.getByRole('dialog', { name: 'Editar notícia' });
    const campo = within(editor).getByLabelText('Dificuldade (opcional)');
    expect(campo).toHaveValue('');
    expect([...campo.querySelectorAll('option')].map((o) => o.textContent)).toEqual(['—', 'Fácil', 'Médio', 'Difícil']);
    fireEvent.change(campo, { target: { value: 'medio' } });
    await act(async () => fireEvent.click(within(editor).getByRole('button', { name: 'Salvar' })));
    expect(repo.salvar).toHaveBeenCalledWith([{ ...BANCO[0], dificuldade: 'medio' }, BANCO[1], BANCO[2], BANCO[3]], 'v1');
  });

  it('AC-7.11 (v11.0.0): o editor tem título curto e veículo da fonte, opcionais; título curto longo é apontado', async () => {
    const repo = await montar();
    fireEvent.click(within(linhas()[0]!).getByRole('button', { name: 'Editar' }));
    const editor = screen.getByRole('dialog', { name: 'Editar notícia' });
    fireEvent.change(within(editor).getByLabelText('Título curto (opcional)'), { target: { value: 'x'.repeat(35) } });
    fireEvent.change(within(editor).getByLabelText('Veículo da fonte (opcional)'), { target: { value: 'Aos Fatos' } });
    fireEvent.click(within(editor).getByRole('button', { name: 'Salvar' }));
    expect(within(editor).getByLabelText('Título curto (opcional)')).toHaveAttribute('aria-invalid', 'true');
    expect(repo.salvar).not.toHaveBeenCalled();
    fireEvent.change(within(editor).getByLabelText('Título curto (opcional)'), { target: { value: 'Curto' } });
    await act(async () => fireEvent.click(within(editor).getByRole('button', { name: 'Salvar' })));
    expect(repo.salvar).toHaveBeenCalledWith([{ ...BANCO[0], titulo_curto: 'Curto', fonte_nome: 'Aos Fatos' }, BANCO[1], BANCO[2], BANCO[3]], 'v1');
  });

  it('AC-7.3/AC-7.10: dificuldade fora da lista (vinda do Excel) aparece e é apontada', async () => {
    const repo = repoFalso();
    repo.carregar = vi.fn(async () => ({ banco: [n('mds-0001', { dificuldade: 'extrema' })], arquivo: 'x.csv', versao: 'v1' }));
    await montar(repo);
    expect(linhas()[0]).toHaveTextContent('dificuldade: use facil, medio, dificil');
    fireEvent.click(within(linhas()[0]!).getByRole('button', { name: 'Editar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(screen.getByLabelText('Dificuldade (opcional)')).toHaveAttribute('aria-invalid', 'true');
    expect(repo.salvar).not.toHaveBeenCalled();
  });

  it('AC-7.2/AC-7.3: editor aponta o campo com problema e não salva', async () => {
    const repo = await montar();
    fireEvent.click(screen.getByRole('button', { name: 'Nova notícia' }));
    const editor = screen.getByRole('dialog', { name: 'Nova notícia' });
    expect(within(editor).getByLabelText('ID')).toHaveValue('mds-0005');           // id automático
    fireEvent.change(within(editor).getByLabelText('Título'), { target: { value: 'Nova' } });
    fireEvent.change(within(editor).getByLabelText('Fonte (link)'), { target: { value: 'exemplo.org' } });
    fireEvent.change(within(editor).getByLabelText('Status'), { target: { value: 'aprovada' } });
    fireEvent.click(within(editor).getByRole('button', { name: 'Salvar' }));
    expect(within(editor).getByLabelText('Fonte (link)')).toHaveAttribute('aria-invalid', 'true');
    expect(within(editor).getByLabelText('Revisado por')).toHaveAttribute('aria-invalid', 'true');
    expect(within(editor).getByLabelText('Descrição')).toHaveAttribute('aria-invalid', 'true');
    expect(within(editor).getByLabelText('Título')).toHaveAttribute('aria-invalid', 'false');
    expect(editor).toHaveTextContent('precisa ser um link http(s)');
    fireEvent.change(within(editor).getByLabelText('ID'), { target: { value: 'mds-0001' } });
    fireEvent.click(within(editor).getByRole('button', { name: 'Salvar' }));
    expect(editor).toHaveTextContent('id repetido');
    expect(repo.salvar).not.toHaveBeenCalled();
  });

  it('AC-7.2/AC-7.6: editar e salvar grava o banco inteiro e atualiza a lista', async () => {
    const repo = await montar();
    fireEvent.click(within(linhas()[1]!).getByRole('button', { name: 'Editar' }));
    const editor = screen.getByRole('dialog', { name: 'Editar notícia' });
    fireEvent.change(within(editor).getByLabelText('Título'), { target: { value: 'Água ferve a 100 °C ao nível do mar' } });
    await act(async () => fireEvent.click(within(editor).getByRole('button', { name: 'Salvar' })));
    expect(repo.salvar).toHaveBeenCalledWith(
      [BANCO[0], { ...BANCO[1], titulo: 'Água ferve a 100 °C ao nível do mar' }, BANCO[2], BANCO[3]], 'v1',
    );
    expect(screen.queryByRole('dialog', { name: 'Editar notícia' })).toBeNull();
    expect(screen.getByText('Água ferve a 100 °C ao nível do mar')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Notícia salva.');
  });

  it('falha ao gravar mostra o motivo e mantém o editor aberto', async () => {
    await montar(repoFalso(async () => { throw new Error('Não foi possível salvar: arquivo aberto no Excel'); }));
    fireEvent.click(within(linhas()[0]!).getByRole('button', { name: 'Editar' }));
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Salvar' })));
    expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível salvar: arquivo aberto no Excel');
    expect(screen.getByRole('dialog', { name: 'Editar notícia' })).toBeInTheDocument();
  });

  it('AC-7.4: apagar as selecionadas pede confirmação', async () => {
    const repo = await montar();
    fireEvent.click(within(linhas()[0]!).getByRole('checkbox'));
    fireEvent.click(within(linhas()[2]!).getByRole('checkbox'));
    expect(screen.getByText('2 selecionadas')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Apagar' }));
    const confirmar = screen.getByRole('alertdialog');
    expect(confirmar).toHaveTextContent('Apagar 2 notícias?');
    await act(async () => fireEvent.click(within(confirmar).getByRole('button', { name: 'Apagar' })));
    expect(repo.salvar).toHaveBeenCalledWith([BANCO[1], BANCO[3]], 'v1');
    expect(ids()).toEqual(['mds-0002', 'mds-0004']);
  });

  it('AC-7.4: alterar em massa um campo de lista nas selecionadas', async () => {
    const repo = await montar();
    fireEvent.click(within(linhas()[0]!).getByRole('checkbox'));
    fireEvent.click(within(linhas()[1]!).getByRole('checkbox'));
    fireEvent.change(screen.getByLabelText('Campo'), { target: { value: 'tema' } });
    fireEvent.change(screen.getByLabelText('Novo valor'), { target: { value: 'tecnologia' } });
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar' }));
    await act(async () => fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Aplicar' })));
    expect(repo.salvar).toHaveBeenCalledWith(
      [{ ...BANCO[0], tema: 'tecnologia' }, { ...BANCO[1], tema: 'tecnologia' }, BANCO[2], BANCO[3]], 'v1',
    );
  });

  it('alterar em massa não aprova notícia sem revisor (Princípio 1)', async () => {
    const repo = await montar();
    fireEvent.click(within(linhas()[2]!).getByRole('checkbox'));
    fireEvent.change(screen.getByLabelText('Campo'), { target: { value: 'status' } });
    fireEvent.change(screen.getByLabelText('Novo valor'), { target: { value: 'aprovada' } });
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar' }));
    expect(screen.getByRole('alert')).toHaveTextContent('mds-0003');
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(repo.salvar).not.toHaveBeenCalled();
  });

  it('AC-7.5: importar CSV mostra a prévia e "Adicionar N" grava só as novas válidas', async () => {
    const repo = await montar();
    const csv = escreverCsv([n('mds-0002'), n('nova-1'), n('', { titulo: 'Sem id' }), n('ruim-1', { veredito: 'talvez' })]);
    const arquivo = new File([csv], 'lote.csv', { type: 'text/csv' });
    await act(async () => fireEvent.change(screen.getByLabelText('Importar CSV'), { target: { files: [arquivo] } }));
    const previa = await screen.findByRole('dialog', { name: 'Importar CSV' });
    await waitFor(() => expect(within(previa).getByText('2 novas')).toBeInTheDocument());
    expect(within(previa).getByText('1 já existe')).toBeInTheDocument();
    expect(within(previa).getByText('1 inválida')).toBeInTheDocument();
    expect(previa).toHaveTextContent(/veredito/);
    await act(async () => fireEvent.click(within(previa).getByRole('button', { name: 'Adicionar 2' })));
    expect(repo.salvar).toHaveBeenCalledWith([...BANCO, n('nova-1'), n('mds-0005', { titulo: 'Sem id' })], 'v1');
  });

  it('Esc fecha primeiro o editor, depois o painel', async () => {
    const onFechar = vi.fn();
    const repo = repoFalso();
    render(<Montado repo={repo} onFechar={onFechar} />);
    await waitFor(() => expect(repo.carregar).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: 'Nova notícia' }));
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: 'Nova notícia' })).toBeNull();
    expect(onFechar).not.toHaveBeenCalled();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onFechar).toHaveBeenCalledOnce();
  });
});
