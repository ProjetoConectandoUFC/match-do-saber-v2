import { memo } from 'react';
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

/** Linha tracejada ou contorno, desenhados no próprio painel (552 × 156; na carta, 406 × 374). */
function Traco({ children, viewBox = '0 0 552 156' }: { children: ReactNode; viewBox?: string }) {
  return (
    <svg viewBox={viewBox} aria-hidden="true" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible' }}>
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

/**
 * v13.0.0 (AC-17.1): composições para a janela retrato da carta (406 × 374 por dentro da moldura), com as mesmas peças
 * das composições acima, redistribuídas (prévia aprovada `docs/visual/previa-v13.html`).
 */
const TracoR = ({ children }: { children: ReactNode }) => <Traco viewBox="0 0 406 374">{children}</Traco>;
const PLENARIO = [180, 150, 120, 90, 60, 30, 0].map((a) => {
  const r = (a * Math.PI) / 180;
  return { x: Math.round(203 + 136 * Math.cos(r) - 19), y: Math.round(282 - 136 * Math.sin(r) - 19) };
});
const COMPOSICAO_RETRATO: Record<Tema, () => ReactNode> = {
  saude: () => (
    <>
      <P id="anel-b" x={-60} y={-70} w={280} cor={BRANCO} />
      <P id="marca-estrela-6" x={170} y={92} w={150} cor={CREME} />
      <P id="marca-estrela-6" x={70} y={232} w={52} cor={CREME} />
      <P id="marca-estrela-4" x={122} y={150} w={40} cor={NOITE} />
      <P id="marca-estrela-4" x={336} y={52} w={32} cor={NOITE} />
      <P id="deco-explosao-dir" x={300} y={236} w={170} cor={NOITE} />
    </>
  ),
  ciencia: () => (
    <>
      <P id="anel-c" x={170} y={-110} w={340} cor={BRANCO} />
      <TracoR><path d="M108 292 L203 140 L298 292 Z" {...tracejado} strokeDasharray="9 8" /></TracoR>
      <P id="marca-triangulo" x={84} y={268} w={50} cor={NOITE} />
      <P id="marca-triangulo" x={179} y={116} w={50} cor={NOITE} />
      <P id="marca-triangulo" x={274} y={268} w={50} cor={NOITE} />
      <P id="marca-estrela-4" x={300} y={30} w={80} cor={CREME} />
      <P id="marca-estrela-4" x={60} y={64} w={36} cor={CREME} />
    </>
  ),
  historia: () => (
    <>
      <P id="deco-arco" x={210} y={-90} w={240} cor={CREME} />
      <P id="marca-estrela-5" x={96} y={140} w={130} cor={NOITE} />
      <P id="marca-estrela-5" x={290} y={236} w={60} cor={NOITE} />
      <TracoR><line x1="0" y1="330" x2="406" y2="330" {...tracejado} strokeDasharray="11 9" /></TracoR>
      <P id="marca-estrela-4" x={50} y={56} w={34} cor={CREME} />
    </>
  ),
  tecnologia: () => (
    <>
      <P id="deco-e" x={236} y={-50} w={220} cor={CREME} />
      {[0, 1, 2].flatMap((l) => [0, 1, 2].map((c) => (
        <P key={`${l}${c}`} id="marca-triangulo" x={66 + c * 66} y={112 + l * 62} w={44} cor={(l + c) % 2 ? CELESTE : NOITE} />
      )))}
      <P id="marca-estrela-4" x={262} y={232} w={76} cor={AMARELO} />
    </>
  ),
  curiosidades: () => (
    <>
      <P id="deco-explosao-dir" x={250} y={-20} w={250} cor={ROSA} />
      <P id="marca-estrela-5" x={120} y={110} w={160} cor={AMARELO} />
      <P id="marca-estrela-4" x={46} y={70} w={40} cor={CREME} />
      <P id="marca-estrela-4" x={80} y={290} w={34} cor={CREME} />
      <P id="marca-estrela-5" x={320} y={292} w={42} cor={CREME} />
    </>
  ),
  politica: () => (
    <>
      <P id="deco-arco" x={290} y={-110} w={200} cor={AMARELO} />
      {PLENARIO.map(({ x, y }) => <P key={`${x}-${y}`} id="marca-estrela-5" x={x} y={y} w={38} cor={CREME} />)}
      <P id="marca-estrela-4" x={177} y={214} w={52} cor={AMARELO} />
      <TracoR><line x1="40" y1="326" x2="366" y2="326" {...tracejado} stroke="var(--cn-creme)" strokeDasharray="11 9" /></TracoR>
    </>
  ),
  'meio-ambiente': () => (
    <>
      <P id="anel-a" x={330} y={-70} w={150} cor={BRANCO} />
      <P id="marca-estrela-6" x={270} y={36} w={84} cor={AMARELO} />
      <P id="marca-triangulo" x={30} y={196} w={116} cor={NOITE} />
      <P id="marca-triangulo" x={124} y={136} w={156} cor={NOITE} />
      <P id="marca-triangulo" x={252} y={214} w={96} cor={NOITE} />
      <TracoR><line x1="0" y1="318" x2="406" y2="318" {...tracejado} strokeDasharray="11 9" /></TracoR>
    </>
  ),
};

/** Cor de ilustração do tema (também a faixa do "saiba mais"). */
export const corDoTema = (tema: Tema) => COR[tema];

/** Cor de texto e de forma sobre a cor do tema (v13.0.0): creme nos temas escuros, noite nos claros (≥ 4,5:1 no texto). */
const ESCUROS: readonly Tema[] = ['tecnologia', 'curiosidades', 'politica'];
export const tintaDoTema = (tema: Tema) => (ESCUROS.includes(tema) ? 'var(--cn-creme)' : 'var(--cn-noite)');

/**
 * `imagem`: ilustração "recorte chapado" própria da notícia (v11.0.0, `./ilustracoes.ts`), 552 × 260, recortada na
 * faixa central de 552 × 156; sem ela, a composição de formas do tema.
 */
function IlustracaoTemaBase({ tema, imagem, retrato }: { tema: Tema; imagem?: string; retrato?: boolean }) {
  // `retrato` (v13.0.0, AC-17.1): janela da carta, sem o chip com o nome (o naipe nos cantos faz esse papel).
  return (
    <div className={retrato ? s.ilustracaoCarta : s.ilustracaoTema} data-tema={tema} role="img" aria-label={`Tema: ${TEMA_ROTULO[tema]}`} style={{ background: COR[tema] }}>
      {imagem ? <img className={s.ilustracaoRecorte} src={imagem} alt="" draggable={false} /> : (retrato ? COMPOSICAO_RETRATO : COMPOSICAO)[tema]()}
      {!retrato && <span className={s.chipTema}>{TEMA_ROTULO[tema]}</span>}
    </div>
  );
}

// FR-20 (v13.3.0): não re-renderiza a cada tick quando as props não mudam.
export const IlustracaoTema = memo(IlustracaoTemaBase);
