import { useLayoutEffect, useRef, type CSSProperties, type DependencyList, type RefObject } from 'react';
import type { ParametrosJuice } from '../core/juice';
import { TETO_SEQUENCIA, nivelSequencia } from '../core/juice';
import { gotasRespingo, particulasConfete, type Efeito } from './quadrosJuice';
import { Forma } from './Forma';
import e from './EfeitosJuice.module.css';

/**
 * Juice, etapa 1 (v13.4.0, Story 19, FR-21): as peças que entregam os quadros de `./quadrosJuice` às Web Animations. Cada
 * animação é criada uma vez, quando o componente monta (o feedback monta quando a carimbada começa), e roda sozinha no
 * compositor; nada aqui re-renderiza por quadro nem lê o relógio do jogo (AC-19.9). Sem `animate` (jsdom), nada anima e
 * a tela fica no estado final, legível.
 */

/** A `--u` da tela (tema.css): 1 = 1 px em 1366×768. Os efeitos crescem com a tela, como o resto. */
export function escalaTela(): number {
  if (typeof window === 'undefined' || !window.innerWidth) return 1;
  return Math.min(window.innerWidth / 1366, window.innerHeight / 768);
}

export const suportaAnimacao = () => typeof Element !== 'undefined' && typeof (Element.prototype as { animate?: unknown }).animate === 'function';

function animar(el: Element | null | undefined, efeito: Efeito | null): Animation | null {
  if (!el || !efeito || typeof (el as { animate?: unknown }).animate !== 'function') return null;
  return el.animate(efeito.quadros, efeito.opcoes);
}

/** Uma animação num elemento, criada antes da primeira pintura (sem piscar o estado final) e cancelada ao desmontar. */
export function useEfeito<T extends Element>(ref: RefObject<T>, criar: () => Efeito | null, deps: DependencyList) {
  useLayoutEffect(() => {
    const a = animar(ref.current, criar());
    return () => a?.cancel();
  }, deps);
}

/**
 * AC-19.3: confete do acerto numa camada única (`aria-hidden`), atrás do texto do resultado e da explicação (AC-19.7):
 * cada partícula só anima `transform` e `opacity` e some sozinha. Formas e cores do design system (fita, bolinha,
 * estrela de 4 pontas, triângulo; amarelo, creme e noite: o verde do acerto é o fundo, então o confete leva as cores que
 * aparecem sobre ele).
 */
export function Confete({ parametros }: { parametros: ParametrosJuice }) {
  const raiz = useRef<HTMLDivElement>(null);
  const particulas = particulasConfete(parametros, escalaTela());
  useLayoutEffect(() => {
    const els = [...(raiz.current?.children ?? [])];
    const lista = els.map((el, i) => animar(el, particulas[i] ?? null));
    return () => { for (const a of lista) a?.cancel(); };
  }, [parametros.confetes, parametros.confeteAlcancePx, parametros.confeteMs, parametros.hitStopMs]);
  if (particulas.length === 0) return null;
  return (
    <div ref={raiz} className={e.confete} data-confete aria-hidden="true">
      {particulas.map((p, i) => <i key={i} className={`${e.particula} ${e[p.forma]} ${e[p.cor]}`} />)}
    </div>
  );
}

/**
 * AC-19.2: respingo de tinta em volta do carimbo, dentro dele (herda a cor de fundo e a da tinta): gotas que saem da
 * borda na liberação do golpe e somem. O tamanho do carimbo é medido na hora.
 */
export function Respingo({ parametros }: { parametros: ParametrosJuice }) {
  const raiz = useRef<HTMLSpanElement>(null);
  const n = parametros.respingoGotas;
  const base = gotasRespingo(parametros, 0, 0, 1);
  useLayoutEffect(() => {
    const el = raiz.current;
    const carimbo = el?.parentElement;
    if (!el || !carimbo) return undefined;
    const gotas = gotasRespingo(parametros, carimbo.offsetWidth, carimbo.offsetHeight, escalaTela());
    const lista = [...el.children].map((g, i) => animar(g, gotas[i] ?? null));
    return () => { for (const a of lista) a?.cancel(); };
  }, [n, parametros.hitStopMs]);
  if (n <= 0) return null;
  return (
    <span ref={raiz} className={e.respingo} data-respingo aria-hidden="true">
      {base.map((g, i) => (
        <i key={i} data-gota className={g.alongada ? `${e.gota} ${e.alongada}` : e.gota} style={{ '--t': g.tamanho } as CSSProperties} />
      ))}
    </span>
  );
}

/**
 * AC-19.5: "Sequência ×N" a partir de 2, com um pop; o selo fica um pouco maior a cada nível, até o teto (N = 5). No alto
 * da tela, acima do resultado, longe do texto a ler.
 */
export function SeloSequencia({ sequencia, efeito }: { sequencia: number; efeito: Efeito | null }) {
  const ref = useRef<HTMLParagraphElement>(null);
  useEfeito(ref, () => efeito, []);
  const nivel = nivelSequencia(Math.min(sequencia, TETO_SEQUENCIA));
  return (
    <p ref={ref} className={e.sequencia} data-sequencia-tela={sequencia} style={{ '--nivel': nivel } as CSSProperties}>
      <span className={e.sequenciaDisco} aria-hidden="true"><Forma id="marca-estrela-4" largura={22} /></span>
      {`Sequência ×${sequencia}`}
    </p>
  );
}

export { e as estilosEfeitos };
