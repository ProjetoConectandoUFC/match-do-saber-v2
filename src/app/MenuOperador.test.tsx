// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { MenuOperador, type ItemMenu } from './MenuOperador';

function Montado({ onEscolher }: { onEscolher: (i: ItemMenu) => void }) {
  const [aberto, setAberto] = useState(false);
  return (
    <>
      <p>fora</p>
      <MenuOperador aberto={aberto} onAbrir={() => setAberto(true)} onFechar={() => setAberto(false)} onEscolher={onEscolher} />
    </>
  );
}

describe('MenuOperador (FR-14)', () => {
  it('botão "Menu" abre a lista com Notícias, Configurações, Diagnóstico e Tela cheia', () => {
    render(<Montado onEscolher={() => {}} />);
    const botao = screen.getByRole('button', { name: 'Menu' });
    expect(botao).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('menu')).toBeNull();
    fireEvent.click(botao);
    expect(botao).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getAllByRole('menuitem').map((b) => b.textContent)).toEqual(
      [expect.stringContaining('Notícias'), expect.stringContaining('Configurações'), expect.stringContaining('Diagnóstico'), expect.stringContaining('Tela cheia')],
    );
  });

  it('escolher um item avisa qual e fecha o menu', () => {
    const onEscolher = vi.fn();
    render(<Montado onEscolher={onEscolher} />);
    fireEvent.click(screen.getByRole('button', { name: 'Menu' }));
    fireEvent.click(screen.getByRole('menuitem', { name: /Notícias/ }));
    expect(onEscolher).toHaveBeenCalledWith('noticias');
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('Esc e clique fora fecham', () => {
    render(<Montado onEscolher={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Menu' }));
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('menu')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Menu' }));
    fireEvent.mouseDown(screen.getByText('fora'));
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('AC-12.7 (v10.3.0): o item Diagnóstico mostra se está ligado e alterna a cada escolha', () => {
    function ComDiagnostico() {
      const [aberto, setAberto] = useState(false);
      const [ligado, setLigado] = useState(false);
      return (
        <MenuOperador
          aberto={aberto}
          diagnosticoLigado={ligado}
          onAbrir={() => setAberto(true)}
          onFechar={() => setAberto(false)}
          onEscolher={(i) => { if (i === 'diagnostico') setLigado((l) => !l); }}
        />
      );
    }
    render(<ComDiagnostico />);
    const abrirE = () => { fireEvent.click(screen.getByRole('button', { name: 'Menu' })); return screen.getByRole('menuitem', { name: /Diagnóstico/ }); };
    let item = abrirE();
    expect(item).toHaveTextContent('Diagnóstico: desligado');
    expect(item).toHaveAttribute('title', 'liga e desliga o painel de medição');
    fireEvent.click(item);
    item = abrirE();
    expect(item).toHaveTextContent('Diagnóstico: ligado');
    expect(item).toHaveAttribute('data-ligado', 'true');
    fireEvent.click(item);
    expect(abrirE()).toHaveTextContent('Diagnóstico: desligado');
  });

  it('clicar no botão com o menu aberto fecha', () => {
    render(<Montado onEscolher={() => {}} />);
    const botao = screen.getByRole('button', { name: 'Menu' });
    fireEvent.click(botao);
    fireEvent.mouseDown(botao);
    fireEvent.click(botao);
    expect(screen.queryByRole('menu')).toBeNull();
  });
});
