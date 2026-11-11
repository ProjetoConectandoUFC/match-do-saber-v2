import type { ReactNode } from 'react';
import s from './App.module.css';

/**
 * Ícones do feedback (AC-4.9, v11.0.0), copiados da prévia `docs/visual/previa-v11.html` (seção 3): feitos com as
 * formas do design system (estrelas de 4 e 6 pontas, triângulo), sem emoji. Acerto: você (disco noite) e o fato
 * (disco creme) se encontram, com a estrela amarela no encontro. Erro: os discos separados por um triângulo partido.
 * Tempo esgotado: ampulheta de dois triângulos, com areia amarela embaixo.
 */
export type IdIcone = 'acerto' | 'erro' | 'tempo';

const NOITE = '#002036', CREME = '#fcfaf1', AMARELO = '#fde31f';

/** Marcadores do design system (os mesmos caminhos de `./svg/`), como `<symbol>` para o `<use>` da prévia. */
const SIMBOLOS = (
  <defs>
    <symbol id="ic-e4" viewBox="1 1 32 32"><path d="M17 1L21.3 12.7L33 17L21.3 21.3L17 33L12.7 21.3L1 17L12.7 12.7L17 1" fill="currentColor" /></symbol>
    <symbol id="ic-e6" viewBox="1 1 23.9 27.6"><path d="M12.9 1L15.6 10.2L24.9 7.9L18.2 14.8L24.9 21.7L15.6 19.3L12.9 28.6L10.3 19.3L1 21.7L7.7 14.8L1 7.9L10.3 10.2L12.9 1" fill="currentColor" /></symbol>
    <symbol id="ic-tri" viewBox="1 1 27.7 24"><path d="M14.9 1L20.1 13.9L28.7 25L14.9 23.1L1 25L9.6 13.9L14.9 1" fill="currentColor" /></symbol>
  </defs>
);

const DESENHO: Record<IdIcone, ReactNode> = {
  acerto: (
    <>
      <circle cx="78" cy="64" r="48" fill={NOITE} />
      <circle cx="142" cy="64" r="48" fill={CREME} stroke={NOITE} strokeWidth="5" />
      <circle cx="78" cy="52" r="13" fill={CREME} />
      <path d="M54 104 C56 86 66 80 78 80 C90 80 98 84 100 92" fill={CREME} />
      <use href="#ic-e6" x="122" y="40" width="40" height="46" style={{ color: NOITE }} />
      <use href="#ic-e4" x="88" y="0" width="44" height="44" style={{ color: AMARELO }} />
    </>
  ),
  erro: (
    <>
      <circle cx="56" cy="64" r="44" fill={NOITE} />
      <circle cx="164" cy="64" r="44" fill={CREME} stroke={NOITE} strokeWidth="5" />
      <circle cx="56" cy="52" r="12" fill={CREME} />
      <path d="M34 100 C36 84 46 78 56 78 C66 78 74 82 76 90" fill={CREME} />
      <use href="#ic-e6" x="146" y="42" width="36" height="42" style={{ color: NOITE }} />
      <path d="M106 34 L82 86 L102 86 L96 70 L106 58 Z" fill={CREME} stroke={NOITE} strokeWidth="3" strokeLinejoin="round" />
      <path d="M116 40 L110 62 L120 74 L110 90 L140 90 Z" fill={CREME} stroke={NOITE} strokeWidth="3" strokeLinejoin="round" />
    </>
  ),
  tempo: (
    <>
      <use href="#ic-tri" x="80" y="8" width="60" height="52" transform="rotate(180 110 34)" style={{ color: NOITE }} />
      <use href="#ic-tri" x="80" y="60" width="60" height="52" style={{ color: NOITE }} />
      <use href="#ic-tri" x="96" y="76" width="28" height="24" style={{ color: AMARELO }} />
      <rect x="70" y="4" width="80" height="8" rx="4" fill={NOITE} />
      <rect x="70" y="108" width="80" height="8" rx="4" fill={NOITE} />
    </>
  ),
};

/** `largura` em unidades de tela (1 = 1 px em 1366×768); a proporção da prévia é 220 × 120. */
export function IconeFeedback({ icone, largura }: { icone: IdIcone; largura: number }) {
  return (
    <svg
      className={s.iconeFeedback}
      data-icone={icone}
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 220 120"
      style={{ width: `calc(${largura} * var(--u, 1px))`, height: `calc(${(largura * 120) / 220} * var(--u, 1px))` }}
    >
      {SIMBOLOS}
      {DESENHO[icone]}
    </svg>
  );
}
