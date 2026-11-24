import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  intensidadeEfetiva, juiceDaSequencia, mostrarSequencia, type Intensidade, type ParametrosJuice,
} from '../core/juice';

/**
 * Juice (v13.4.0, Story 19, FR-21): a intensidade efetiva dos efeitos chega à tela por um contexto. O `App` envolve o
 * jogo em `ProvedorJuice` com a efetiva (`useIntensidadeEfetiva` da escolha dos Ajustes) e grava a mesma em
 * `data-juice` na raiz; os componentes leem
 * `useJuice(sequencia)` para os parâmetros (tabela pura em `src/core/juice.ts`).
 */

const CONSULTA = '(prefers-reduced-motion: reduce)';

/** AC-19.1: "reduzir movimento" do sistema, acompanhando a mudança enquanto o jogo está aberto. */
export function useReduzirMovimento(): boolean {
  const [reduzir, setReduzir] = useState(() => typeof window.matchMedia === 'function' && window.matchMedia(CONSULTA).matches);
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const m = window.matchMedia(CONSULTA);
    const mudou = (e: { matches: boolean }) => setReduzir(e.matches);
    setReduzir(m.matches);
    m.addEventListener('change', mudou);
    return () => m.removeEventListener('change', mudou);
  }, []);
  return reduzir;
}

/** Fora do provedor (componentes isolados nos testes), Desligada: nenhum efeito. */
const JuiceContexto = createContext<Intensidade>('desligada');

/** AC-19.1: a intensidade efetiva a partir do ajuste "Intensidade dos efeitos" e do "reduzir movimento" do sistema. */
export function useIntensidadeEfetiva(escolhida: Intensidade): Intensidade {
  return intensidadeEfetiva(escolhida, useReduzirMovimento());
}

/** Envolve o jogo com a intensidade **efetiva** (`useIntensidadeEfetiva`), a mesma de `data-juice` na raiz. */
export function ProvedorJuice({ intensidade, children }: { intensidade: Intensidade; children: ReactNode }) {
  return <JuiceContexto.Provider value={intensidade}>{children}</JuiceContexto.Provider>;
}

/** A intensidade efetiva (com o teto de `prefers-reduced-motion`, AC-19.1). */
export const useIntensidadeJuice = (): Intensidade => useContext(JuiceContexto);

export interface Juice {
  intensidade: Intensidade;
  /** Parâmetros do resultado de agora, já crescidos com a sequência (AC-19.5). */
  parametros: ParametrosJuice;
  /** "Sequência ×N" na tela (N ≥ 2 e intensidade acima de Desligada). */
  mostrarSequencia: boolean;
}

/** `sequencia`: a do estado do feedback (`partida.ts`); sem ela (erro, tempo esgotado, fora do feedback), 0. */
export function useJuice(sequencia = 0): Juice {
  const intensidade = useIntensidadeJuice();
  return useMemo(() => ({
    intensidade,
    parametros: juiceDaSequencia(intensidade, sequencia),
    mostrarSequencia: mostrarSequencia(intensidade, sequencia),
  }), [intensidade, sequencia]);
}
