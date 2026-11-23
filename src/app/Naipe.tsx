import type { ReactNode } from 'react';
import type { Tema } from '../core/types';
import { Forma } from './Forma';
import { corDoTema, tintaDoTema } from './IlustracaoTema';
import s from './App.module.css';

/**
 * Naipe da carta (v13.0.0, AC-17.1): o ícone do tema nos cantos, como valor e naipe de baralho. Disco na cor do tema, aro
 * branco e uma forma do design system dentro; nunca o triângulo nem a estrela de 4 pontas, que são Mentira e Verdade.
 * Decorativo para leitores de tela: o tema já é dito pela ilustração (`Tema: …`).
 */
function Glifo({ tema }: { tema: Tema }): ReactNode {
  switch (tema) {
    case 'saude': return <Forma id="marca-estrela-6" largura={26} />;
    case 'historia': return <Forma id="marca-estrela-5" largura={28} />;
    case 'tecnologia': return <Forma id="deco-e" largura={22} />;
    case 'curiosidades': return <Forma id="deco-explosao-dir" largura={24} />;
    case 'meio-ambiente': return <Forma id="deco-arco" largura={20} />;
    case 'ciencia':
      return (
        <svg viewBox="0 0 30 30" aria-hidden="true" focusable="false" style={{ width: 'calc(28 * var(--u))', height: 'calc(28 * var(--u))' }}>
          <circle cx="15" cy="15" r="11" fill="none" stroke="currentColor" strokeWidth="4" />
          <circle cx="15" cy="15" r="4.5" fill="currentColor" />
        </svg>
      );
    case 'politica':
      return (
        <span className={s.naipePlenario}>
          <Forma id="marca-estrela-5" largura={13} />
          <Forma id="marca-estrela-5" largura={13} style={{ marginBottom: 'calc(7 * var(--u))' }} />
          <Forma id="marca-estrela-5" largura={13} />
        </span>
      );
  }
}

export function Naipe({ tema, posicao }: { tema: Tema; posicao: 'superior' | 'inferior' }) {
  return (
    <span
      className={posicao === 'superior' ? s.naipe : `${s.naipe} ${s.naipeInferior}`}
      data-naipe={posicao}
      data-tema={tema}
      aria-hidden="true"
      style={{ background: corDoTema(tema), color: tintaDoTema(tema) }}
    >
      <Glifo tema={tema} />
    </span>
  );
}
