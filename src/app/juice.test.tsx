// @vitest-environment jsdom
import { act, render, renderHook, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { JUICE, juiceDaSequencia, type Intensidade } from '../core/juice';
import { ProvedorJuice, useIntensidadeEfetiva, useIntensidadeJuice, useJuice, useReduzirMovimento } from './juice';

// v13.4.0 (AC-19.1, FR-21): a intensidade efetiva chega à tela por um contexto, com o teto de prefers-reduced-motion.
type Ouvinte = (e: { matches: boolean }) => void;
let reduzir = false;
const ouvintes = new Set<Ouvinte>();

function instalarMatchMedia(inicial: boolean) {
  reduzir = inicial;
  ouvintes.clear();
  window.matchMedia = ((consulta: string) => ({
    get matches() { return consulta.includes('prefers-reduced-motion: reduce') && reduzir; },
    media: consulta,
    addEventListener: (_: string, f: Ouvinte) => ouvintes.add(f),
    removeEventListener: (_: string, f: Ouvinte) => ouvintes.delete(f),
  })) as unknown as typeof window.matchMedia;
}
function mudarSistema(valor: boolean) {
  reduzir = valor;
  act(() => { for (const f of ouvintes) f({ matches: valor }); });
}

afterEach(() => { delete (window as { matchMedia?: unknown }).matchMedia; });

/** Como o App: a efetiva vem da escolha e do sistema, e vai para o provedor. */
function Jogo({ escolhida, children }: { escolhida: Intensidade; children: ReactNode }) {
  return <ProvedorJuice intensidade={useIntensidadeEfetiva(escolhida)}>{children}</ProvedorJuice>;
}
const com = (escolhida: Intensidade) => ({ children }: { children: ReactNode }) => <Jogo escolhida={escolhida}>{children}</Jogo>;

describe('useReduzirMovimento (AC-19.1)', () => {
  it('lê o "reduzir movimento" do sistema e acompanha a mudança', () => {
    instalarMatchMedia(false);
    const { result, unmount } = renderHook(() => useReduzirMovimento());
    expect(result.current).toBe(false);
    mudarSistema(true);
    expect(result.current).toBe(true);
    unmount();
    expect(ouvintes.size).toBe(0);
  });

  it('sem matchMedia (ambiente antigo), não reduz', () => {
    const { result } = renderHook(() => useReduzirMovimento());
    expect(result.current).toBe(false);
  });
});

describe('ProvedorJuice / useIntensidadeJuice / useJuice (AC-19.1, AC-19.5)', () => {
  it('fora do provedor, Desligada (componentes isolados nos testes não ganham efeitos)', () => {
    const { result } = renderHook(() => useIntensidadeJuice());
    expect(result.current).toBe('desligada');
  });

  it('a escolhida vale; com "reduzir movimento", no máximo Baixa, e volta quando o sistema muda', () => {
    instalarMatchMedia(false);
    const { result } = renderHook(() => useIntensidadeJuice(), { wrapper: com('alta') });
    expect(result.current).toBe('alta');
    mudarSistema(true);
    expect(result.current).toBe('baixa');
    mudarSistema(false);
    expect(result.current).toBe('alta');
  });

  it('useJuice(sequencia) devolve a intensidade efetiva e os parâmetros do resultado de agora', () => {
    instalarMatchMedia(false);
    const { result } = renderHook(() => useJuice(4), { wrapper: com('media') });
    expect(result.current.intensidade).toBe('media');
    expect(result.current.parametros).toEqual(juiceDaSequencia('media', 4));
    expect(result.current.mostrarSequencia).toBe(true);
    const sem = renderHook(() => useJuice(), { wrapper: com('media') });
    expect(sem.result.current.parametros).toEqual(juiceDaSequencia('media', 0));
    expect(sem.result.current.mostrarSequencia).toBe(false);
  });

  it('o provedor pode escrever a intensidade efetiva num atributo (data-juice) para o CSS', () => {
    instalarMatchMedia(true);
    function Raiz() {
      return <div data-testid="raiz" data-juice={useIntensidadeJuice()} />;
    }
    render(<Jogo escolhida="media"><Raiz /></Jogo>);
    expect(screen.getByTestId('raiz')).toHaveAttribute('data-juice', 'baixa');
    expect(JUICE.baixa.tremidaPx).toBe(0);
  });
});
