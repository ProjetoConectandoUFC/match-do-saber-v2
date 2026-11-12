import type { ReactNode } from 'react';
import { TEMA_ROTULO, type Tema } from '../core/types';
import { Forma, type IdForma } from './Forma';
import s from './App.module.css';

/**
 * Ilustração do card sem imagem (FR-4, FR-15): uma cor de ilustração e uma composição de formas do design system por tema,
 * com o nome do tema. Composições da prévia aprovada (`docs/visual/previa.html`), num painel de 552 × 156 unidades de tela;
 * as formas usam o viewBox original e o painel as recorta nas bordas dele.
 */
const COR: Record<Tema, string> = {
  saude: 'var(--cn-rosa)',
  ciencia: 'var(--cn-ceu)',
  historia: 'var(--cn-laranja)',
  tecnologia: 'var(--cn-azul-medio)',
  curiosidades: 'var(--cn-roxo)',
  'meio-ambiente': 'var(--cn-turquesa)',
  politica: 'var(--cn-indigo)',
};

const BRANCO = '#fff', CREME = 'var(--cn-creme)', NOITE = 'var(--cn-noite)', AMARELO = 'var(--cn-amarelo)';
const CELESTE = 'var(--cn-celeste)', ROSA = 'var(--cn-rosa)';
const u = (n: number) => `calc(${n} * var(--u, 1px))`;

/** Uma peça: forma `id` em (x, y) com largura `w`, na cor `cor`. */
function P({ id, x, y, w, cor }: { id: IdForma; x: number; y: number; w: number; cor: string }) {
  return <Forma id={id} largura={w} original style={{ position: 'absolute', left: u(x), top: u(y), color: cor }} />;
}

/** Linha tracejada ou contorno, desenhados no próprio painel (552 × 156). */
function Traco({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 552 156" aria-hidden="true" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible' }}>
      {children}
    </svg>
  );
}
const tracejado = { fill: 'none', stroke: 'var(--cn-noite)', strokeWidth: 3 } as const;

const COMPOSICAO: Record<Tema, () => ReactNode> = {
  saude: () => (
    <>
      <P id="anel-b" x={-30} y={-40} w={150} cor={BRANCO} />
      <P id="marca-estrela-6" x={372} y={22} w={112} cor={CREME} />
      <P id="marca-estrela-4" x={318} y={96} w={34} cor={NOITE} />
      <P id="marca-estrela-4" x={486} y={20} w={26} cor={NOITE} />
      <P id="marca-estrela-6" x={250} y={34} w={40} cor={CREME} />
      <P id="deco-explosao-dir" x={470} y={70} w={110} cor={NOITE} />
    </>
  ),
  ciencia: () => (
    <>
      <P id="anel-c" x={330} y={-60} w={200} cor={BRANCO} />
      <Traco><path d="M280 114 L355 44 L430 114 Z" {...tracejado} strokeDasharray="8 7" /></Traco>
      <P id="marca-triangulo" x={262} y={92} w={40} cor={NOITE} />
      <P id="marca-triangulo" x={337} y={20} w={40} cor={NOITE} />
      <P id="marca-triangulo" x={412} y={92} w={40} cor={NOITE} />
      <P id="marca-estrela-4" x={470} y={18} w={64} cor={CREME} />
      <P id="marca-estrela-4" x={196} y={30} w={28} cor={CREME} />
    </>
  ),
  historia: () => (
    <>
      <P id="deco-arco" x={330} y={-40} w={150} cor={CREME} />
      <P id="marca-estrela-5" x={250} y={50} w={70} cor={NOITE} />
      <P id="marca-estrela-5" x={470} y={22} w={40} cor={NOITE} />
      <Traco><line x1="180" y1="135" x2="552" y2="135" {...tracejado} strokeDasharray="10 8" /></Traco>
      <P id="marca-estrela-4" x={200} y={24} w={24} cor={CREME} />
    </>
  ),
  tecnologia: () => (
    <>
      <P id="deco-e" x={390} y={-30} w={150} cor={CREME} />
      {[0, 1, 2].flatMap((l) => [0, 1, 2].map((c) => (
        <P key={`${l}${c}`} id="marca-triangulo" x={236 + c * 44} y={26 + l * 38} w={28} cor={(l + c) % 2 ? CELESTE : NOITE} />
      )))}
      <P id="marca-estrela-4" x={372} y={66} w={46} cor={AMARELO} />
    </>
  ),
  // A explosão fica com o corte reto fora da borda direita do painel.
  curiosidades: () => (
    <>
      <P id="deco-explosao-dir" x={430} y={-10} w={150} cor={ROSA} />
      <P id="marca-estrela-5" x={400} y={30} w={92} cor={AMARELO} />
      <P id="marca-estrela-4" x={250} y={30} w={30} cor={CREME} />
      <P id="marca-estrela-4" x={340} y={110} w={26} cor={CREME} />
      <P id="marca-estrela-5" x={290} y={100} w={30} cor={CREME} />
    </>
  ),
  // Plenário: as cadeiras em semicírculo (estrelas de 5 pontas) e o arco amarelo; a estrela de 4 pontas no centro.
  politica: () => (
    <>
      <P id="deco-arco" x={462} y={-58} w={130} cor={AMARELO} />
      <P id="marca-estrela-5" x={222} y={115} w={26} cor={CREME} />
      <P id="marca-estrela-5" x={235} y={68} w={26} cor={CREME} />
      <P id="marca-estrela-5" x={270} y={33} w={26} cor={CREME} />
      <P id="marca-estrela-5" x={317} y={20} w={26} cor={CREME} />
      <P id="marca-estrela-5" x={365} y={33} w={26} cor={CREME} />
      <P id="marca-estrela-5" x={399} y={68} w={26} cor={CREME} />
      <P id="marca-estrela-5" x={412} y={115} w={26} cor={CREME} />
      <P id="marca-estrela-4" x={315} y={84} w={30} cor={AMARELO} />
      <Traco><line x1="190" y1="142" x2="470" y2="142" {...tracejado} stroke="var(--cn-creme)" strokeDasharray="10 8" /></Traco>
    </>
  ),
  'meio-ambiente': () => (
    <>
      <P id="anel-a" x={470} y={-40} w={100} cor={BRANCO} />
      <P id="marca-estrela-6" x={420} y={16} w={58} cor={AMARELO} />
      <P id="marca-triangulo" x={230} y={66} w={64} cor={NOITE} />
      <P id="marca-triangulo" x={286} y={44} w={88} cor={NOITE} />
      <P id="marca-triangulo" x={360} y={80} w={52} cor={NOITE} />
      <Traco><line x1="150" y1="131" x2="552" y2="131" {...tracejado} strokeDasharray="10 8" /></Traco>
    </>
  ),
};

/** Cor de ilustração do tema (também a faixa do "saiba mais"). */
export const corDoTema = (tema: Tema) => COR[tema];

/**
 * `imagem`: ilustração "recorte chapado" própria da notícia (v11.0.0, `./ilustracoes.ts`), 552 × 260, recortada na
 * faixa central de 552 × 156; sem ela, a composição de formas do tema.
 */
export function IlustracaoTema({ tema, imagem }: { tema: Tema; imagem?: string }) {
  return (
    <div className={s.ilustracaoTema} data-tema={tema} role="img" aria-label={`Tema: ${TEMA_ROTULO[tema]}`} style={{ background: COR[tema] }}>
      {imagem ? <img className={s.ilustracaoRecorte} src={imagem} alt="" draggable={false} /> : COMPOSICAO[tema]()}
      <span className={s.chipTema}>{TEMA_ROTULO[tema]}</span>
    </div>
  );
}
