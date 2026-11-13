// @vitest-environment jsdom
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AJUSTES_PADRAO, PAINEL_INICIAL, itensDoPainel, type Ajustes } from '../core/ajustes';
import type { ContagemConteudo } from '../core/contagem';
import { TEMAS } from '../core/types';
import { PainelAjustes } from './PainelAjustes';

const CONTAGEM: ContagemConteudo = {
  jogaveis: 9, jogaveisSemFiltro: 10, total: 12, ocultas: 1,
  porTema: { saude: 3, ciencia: 2, historia: 1, tecnologia: 1, curiosidades: 1, 'meio-ambiente': 1, politica: 1 },
};

function montar(o: { ajustes?: Ajustes; revisar?: boolean; confirmarRestauro?: boolean; item?: number } = {}) {
  const onDefinir = vi.fn();
  const onFechar = vi.fn();
  const onConfirmarRestauro = vi.fn();
  const onRevisar = vi.fn();
  render(
    <PainelAjustes
      ajustes={o.ajustes ?? AJUSTES_PADRAO}
      itens={itensDoPainel(o.revisar ?? false)}
      painel={{ ...PAINEL_INICIAL, item: o.item ?? 0, confirmarRestauro: o.confirmarRestauro ?? false }}
      contagem={CONTAGEM}
      onDefinir={onDefinir}
      onFechar={onFechar}
      onConfirmarRestauro={onConfirmarRestauro}
      onRevisar={onRevisar}
    />,
  );
  return { onDefinir, onFechar, onConfirmarRestauro, onRevisar };
}

describe('painel Ajustes (AC-9.1, AC-9.2, AC-9.18, AC-9.27, AC-9.30)', () => {
  it('AC-9.1/AC-9.18: painel "Ajustes" com os grupos na ordem e os valores atuais marcados', () => {
    montar();
    const painel = screen.getByRole('dialog', { name: 'Ajustes' });
    expect(within(painel).getByRole('heading', { level: 2 })).toHaveTextContent('Ajustes');
    expect(within(painel).getAllByRole('heading', { level: 3 }).map((h) => h.textContent))
      .toEqual(['Partida', 'Conteúdo', 'Detecção', 'Mídia', 'Questões']);
    for (const nome of ['Notícias por partida', 'Tempo por card', 'Tempo do feedback', 'Volta automática do resumo', 'Temas', 'Dificuldade',
      'Modo de jogo', 'Sensibilidade do gesto', 'Tolerância sem pessoa', 'Som', 'Volume', 'Foto no resumo', 'QR das fontes', 'Tutorial']) {
      expect(screen.getByRole('group', { name: nome })).toBeInTheDocument();
    }
    const marcado = (grupo: string) => within(screen.getByRole('group', { name: grupo }))
      .getAllByRole('button').filter((b) => b.getAttribute('aria-pressed') === 'true').map((b) => b.textContent);
    expect(marcado('Notícias por partida')).toEqual(['◉ 10']);
    expect(marcado('Tempo por card')).toEqual(['◉ 15 s']);
    expect(marcado('Tempo do feedback')).toEqual(['◉ 3 s']);
    expect(marcado('Volta automática do resumo')).toEqual(['◉ Desligada']);
    expect(marcado('Dificuldade')).toEqual(['◉ Misturada']);
    expect(marcado('Sensibilidade do gesto')).toEqual(['◉ Normal']);
    expect(marcado('Volume')).toEqual(['◉ Alto']);
    expect(marcado('QR das fontes')).toEqual(['◉ Ligado']);
    expect(screen.getByRole('button', { name: 'Restaurar padrão' })).toBeInTheDocument();
    // AC-9.3: o X do topo fecha (desenhado, sem o caractere "✕", FR-15)
    expect(screen.getByRole('button', { name: 'Fechar' }).textContent).toBe('');
  });

  it('AC-9.2: clicar num valor muda o ajuste', () => {
    const { onDefinir } = montar();
    fireEvent.click(within(screen.getByRole('group', { name: 'Notícias por partida' })).getByRole('button', { name: '○ 5' }));
    expect(onDefinir).toHaveBeenLastCalledWith({ ...AJUSTES_PADRAO, noticiasPorPartida: 5 });
    fireEvent.click(within(screen.getByRole('group', { name: 'Tempo por card' })).getByRole('button', { name: '○ 60 s' }));
    expect(onDefinir).toHaveBeenLastCalledWith({ ...AJUSTES_PADRAO, tempoCardS: 60 });
  });

  it('AC-9.27: temas com a contagem de jogáveis; clique liga/desliga; o último ligado não desliga', () => {
    const { onDefinir } = montar({ ajustes: { ...AJUSTES_PADRAO, temas: ['saude'] } });
    const temas = within(screen.getByRole('group', { name: 'Temas' })).getAllByRole('button');
    expect(temas).toHaveLength(TEMAS.length);
    expect(temas[0]).toHaveTextContent('Saúde (3)');
    expect(temas[6]).toHaveTextContent('Política (1)');
    expect(temas[0]).toHaveAttribute('aria-pressed', 'true');
    expect(temas[1]).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(temas[0]!);
    expect(onDefinir).not.toHaveBeenCalled();
    fireEvent.click(temas[6]!);
    expect(onDefinir).toHaveBeenLastCalledWith({ ...AJUSTES_PADRAO, temas: ['saude', 'politica'] });
  });

  it('AC-9.1: grupo Questões mostra a contagem; "Revisar questões" só quando o painel Questões existe', () => {
    montar();
    expect(screen.getByText('9 jogáveis de 12 no banco (1 oculta)')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Revisar questões' })).toBeNull();
  });

  it('AC-9.31: com o painel Questões, "Revisar questões" pede para abri-lo', () => {
    const { onRevisar } = montar({ revisar: true });
    fireEvent.click(screen.getByRole('button', { name: 'Revisar questões' }));
    expect(onRevisar).toHaveBeenCalledOnce();
  });

  it('AC-9.30: "Restaurar padrão" pede confirmação antes de voltar ao padrão', () => {
    const r1 = montar({ ajustes: { ...AJUSTES_PADRAO, modo: 'mao' } });
    fireEvent.click(screen.getByRole('button', { name: 'Restaurar padrão' }));
    expect(r1.onConfirmarRestauro).toHaveBeenCalledWith(true);
    expect(r1.onDefinir).not.toHaveBeenCalled();
  });

  it('AC-9.30: confirmando, todos os ajustes voltam ao padrão; cancelar não muda nada', () => {
    const r = montar({ ajustes: { ...AJUSTES_PADRAO, modo: 'mao' }, confirmarRestauro: true });
    const caixa = screen.getByRole('alertdialog', { name: 'Restaurar padrão' });
    expect(caixa).toHaveTextContent('O banco de notícias não muda.');
    fireEvent.click(within(caixa).getByRole('button', { name: 'Cancelar' }));
    expect(r.onConfirmarRestauro).toHaveBeenLastCalledWith(false);
    expect(r.onDefinir).not.toHaveBeenCalled();
    fireEvent.click(within(caixa).getByRole('button', { name: 'Restaurar' }));
    expect(r.onDefinir).toHaveBeenLastCalledWith(AJUSTES_PADRAO);
  });

  it('AC-9.2: o item escolhido pelo teclado fica destacado', () => {
    const itens = itensDoPainel(false);
    montar({ item: itens.findIndex((i) => i.id === 'volume') });
    const destacado = screen.getByRole('dialog', { name: 'Ajustes' }).querySelector('[data-destacado="true"]');
    expect(destacado).toHaveAttribute('data-item', 'volume');
  });
});
