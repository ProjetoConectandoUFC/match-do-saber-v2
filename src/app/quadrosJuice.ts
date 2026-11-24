import type { ParametrosJuice } from '../core/juice';
import { TEMPOS } from '../core/partida';

/**
 * Juice, etapa 1 (v13.4.0, Story 19, FR-21, Fases 54.3 a 54.5): os quadros-chave de cada efeito, calculados a partir dos
 * parâmetros da intensidade (`src/core/juice.ts`). Funções puras (sem React nem DOM), para testar os limites da spec sem
 * navegador: só `transform` e `opacity` (FR-21), tremida ≤ 300 ms (AC-19.2), confete some em ≤ 1,2 s (AC-19.3), "não"
 * ≤ 400 ms (AC-19.4). Os componentes (`EfeitosJuice.tsx`) só entregam estes quadros às Web Animations, que rodam no
 * compositor, fora do laço da detecção (AC-19.9).
 *
 * Coreografia do feedback (tudo a partir do instante em que a tela do feedback monta, que é quando a carimbada começa):
 * o carimbo cai (`IMPACTO_MS`), afunda no papel (`COMPRESSAO_MS`) e fica parado o hit-stop; na **liberação**
 * (`liberacaoMs`) tudo o que é consequência do golpe sai junto: a mola do carimbo, a tremida, o respingo, o confete,
 * o pop do placar e da sequência, e o "não". A explicação entra depois da tremida, e daí fica parada (AC-19.7).
 */

/** Distâncias em px na tela de referência (1366×768); os componentes multiplicam pela `--u` da tela. */
export type Quadros = Keyframe[];

export interface Efeito {
  quadros: Quadros;
  opcoes: KeyframeAnimationOptions;
}

/** O carimbo chega ao papel a 45% da carimbada (300 ms): queda rápida, acelerando, como um golpe. */
export const IMPACTO_MS = Math.round(TEMPOS.carimboMs * 0.45);
/** O carimbo afunda no papel (passa do tamanho final para baixo) antes do hit-stop. */
export const COMPRESSAO_MS = 30;
/** Mola do carimbo depois do hit-stop até assentar. */
export const MOLA_CARIMBO_MS = 420;
/** Respingo de tinta: some sozinho. */
export const RESPINGO_MS = 480;

/** Instante em que o golpe "solta" (fim do hit-stop): o começo de todas as consequências. */
export const liberacaoMs = (p: Pick<ParametrosJuice, 'hitStopMs'>) => IMPACTO_MS + COMPRESSAO_MS + p.hitStopMs;

const r = (v: number, casas = 2) => Math.round(v * 10 ** casas) / 10 ** casas;

/** Gerador pseudoaleatório com semente (mulberry32): o mesmo resultado a cada partida e nos testes. */
export function aleatorio(semente: number): () => number {
  let a = semente >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * AC-19.2: o carimbo afunda (escala 1/overshoot), fica parado o hit-stop e volta numa mola amortecida que passa do
 * tamanho final para cima e assenta em 1. Soma-se à queda da carimbada (CSS, `carimbadaQueda`), que já termina na escala 1.
 */
export function efeitoCarimbo(p: ParametrosJuice): Efeito | null {
  if (p.carimboOvershoot <= 1) return null;
  const fundo = 1 / p.carimboOvershoot;
  const total = COMPRESSAO_MS + p.hitStopMs + MOLA_CARIMBO_MS;
  const quadros: Quadros = [
    { offset: 0, transform: 'scale(1)', easing: 'cubic-bezier(0.3, 0, 0.6, 1)' },
    { offset: r(COMPRESSAO_MS / total, 4), transform: `scale(${r(fundo, 3)})` },
  ];
  const inicioMola = (COMPRESSAO_MS + p.hitStopMs) / total;
  quadros.push({ offset: r(inicioMola, 4), transform: `scale(${r(fundo, 3)})` });
  const AMOSTRAS = 16;
  for (let i = 1; i <= AMOSTRAS; i++) {
    const t = i / AMOSTRAS;
    // 1,75 oscilação, amortecida: o 1º pico passa ~40% da profundidade acima de 1 (a mola), depois quase nada.
    const s = i === AMOSTRAS ? 1 : 1 - (1 - fundo) * Math.exp(-3.2 * t) * Math.cos(2 * Math.PI * 1.75 * t);
    quadros.push({ offset: r(inicioMola + (1 - inicioMola) * t, 4), transform: `scale(${r(s, 4)})` });
  }
  return { quadros, opcoes: { duration: total, delay: IMPACTO_MS, easing: 'linear', fill: 'none' } };
}

/**
 * AC-19.2: tremida da tela com decaimento (Nijman, "The Art of Screenshake"): deslocamentos pseudoaleatórios a cada
 * ~28 ms, com a amplitude caindo ao quadrado até 0; um pouco de giro junto. Amplitude em px de referência (`u` = escala
 * da tela). Nunca passa de `tremidaPx` nem de `tremidaMs`.
 */
export function efeitoTremida(p: ParametrosJuice, u = 1, semente = 7): Efeito | null {
  if (p.tremidaPx <= 0 || p.tremidaMs <= 0) return null;
  const passos = Math.max(4, Math.round(p.tremidaMs / 28));
  const sortear = aleatorio(semente);
  const quadros: Quadros = [{ offset: 0, transform: 'translate(0px, 0px) rotate(0deg)' }];
  for (let i = 1; i < passos; i++) {
    const decai = (1 - (i - 1) / passos) ** 2; // o 1º deslocamento é o maior: o golpe
    const a = p.tremidaPx * u * decai;
    const lado = i % 2 === 0 ? 1 : -1; // alterna o lado em x: chacoalha, não deriva
    const x = lado * a * (i === 1 ? 1 : 0.6 + 0.4 * sortear());
    const y = a * (sortear() * 2 - 1) * 0.7;
    const giro = (p.tremidaPx / 12) * 0.5 * decai * (sortear() * 2 - 1);
    quadros.push({ offset: r(i / passos, 4), transform: `translate(${r(x)}px, ${r(y)}px) rotate(${r(giro, 3)}deg)` });
  }
  quadros.push({ offset: 1, transform: 'translate(0px, 0px) rotate(0deg)' });
  return { quadros, opcoes: { duration: p.tremidaMs, delay: liberacaoMs(p), easing: 'linear' } };
}

/**
 * AC-19.4: o "não" do erro e do tempo esgotado: o núcleo do resultado balança na horizontal, amortecido, 2,5 vezes
 * (como uma cabeça dizendo não), com uma leve amassada (escala e inclinação) que se desfaz. ≤ `naoMs` (≤ 400 ms).
 */
export function efeitoNao(p: ParametrosJuice, u = 1): Efeito | null {
  if (p.naoPx <= 0 || p.naoMs <= 0) return null;
  const AMOSTRAS = 18;
  const quadros: Quadros = [];
  for (let i = 0; i <= AMOSTRAS; i++) {
    const t = i / AMOSTRAS;
    const amortece = Math.exp(-3.5 * t);
    const x = i === AMOSTRAS ? 0 : p.naoPx * u * amortece * Math.sin(2 * Math.PI * 2.5 * t);
    const amassa = i === AMOSTRAS ? 1 : 1 - (1 - p.amassarEscala) * 0.6 * Math.exp(-4 * t) * Math.sin(Math.PI * Math.min(1, t * 3));
    const giro = i === AMOSTRAS ? 0 : -(x / Math.max(1, p.naoPx * u)) * p.amassarGraus * 0.4;
    quadros.push({ offset: r(t, 4), transform: `translateX(${r(x)}px) rotate(${r(giro, 3)}deg) scale(${r(amassa, 4)})` });
  }
  return { quadros, opcoes: { duration: p.naoMs, delay: liberacaoMs(p) + 40, easing: 'linear' } };
}

/**
 * AC-19.3/AC-19.5: "pop" de escala (placar, "Sequência ×N"): sobe até `escala`, passa um pouco para baixo e assenta.
 * `entrar`: nasce do zero (o selo da sequência), em vez de partir do tamanho normal (o placar).
 */
export function efeitoPop(escala: number, atrasoMs: number, entrar = false): Efeito | null {
  if (escala <= 1) return null;
  const e = escala - 1;
  const quadros: Quadros = entrar
    ? [
      { offset: 0, transform: 'scale(0) rotate(-8deg)', opacity: 0 },
      { offset: 0.15, opacity: 1 },
      { offset: 0.4, transform: `scale(${r(escala + 0.12, 3)}) rotate(3deg)`, opacity: 1 },
      { offset: 0.65, transform: `scale(${r(1 - e * 0.25, 3)}) rotate(-1deg)` },
      { offset: 0.85, transform: `scale(${r(1 + e * 0.08, 3)}) rotate(0deg)` },
      { offset: 1, transform: 'scale(1) rotate(0deg)', opacity: 1 },
    ]
    : [
      { offset: 0, transform: 'scale(1)' },
      { offset: 0.3, transform: `scale(${r(escala, 3)})` },
      { offset: 0.6, transform: `scale(${r(1 - e * 0.3, 3)})` },
      { offset: 0.82, transform: `scale(${r(1 + e * 0.1, 3)})` },
      { offset: 1, transform: 'scale(1)' },
    ];
  return { quadros, opcoes: { duration: entrar ? 460 : 380, delay: atrasoMs, easing: 'ease-out', fill: entrar ? 'backwards' : 'none' } };
}

/**
 * AC-19.3: cada letra de "Acertou!" sobe de baixo, pequena e girada, passa do tamanho (overshoot) e assenta; a cascata
 * é o atraso `i × cascataPassoMs`. Começa junto com a queda do carimbo: a palavra se forma enquanto ele bate.
 */
export function efeitoLetra(p: ParametrosJuice, i: number): Efeito | null {
  if (!p.cascata) return null;
  const quadros: Quadros = [
    { offset: 0, transform: 'translateY(0.45em) scale(0.3) rotate(-10deg)', opacity: 0 },
    { offset: 0.3, opacity: 1 },
    { offset: 0.5, transform: 'translateY(-0.08em) scale(1.22) rotate(4deg)', opacity: 1 },
    { offset: 0.75, transform: 'translateY(0.02em) scale(0.95) rotate(-1deg)' },
    { offset: 1, transform: 'translateY(0) scale(1) rotate(0deg)', opacity: 1 },
  ];
  return { quadros, opcoes: { duration: 340, delay: i * p.cascataPassoMs, easing: 'ease-out', fill: 'backwards' } };
}

export type FormaConfete = 'fita' | 'bolinha' | 'estrela' | 'triangulo';
export type CorConfete = 'amarelo' | 'creme' | 'noite';
export interface Particula extends Efeito { forma: FormaConfete; cor: CorConfete }

const FORMAS: FormaConfete[] = ['fita', 'fita', 'bolinha', 'estrela', 'triangulo'];
const CORES: CorConfete[] = ['amarelo', 'amarelo', 'creme', 'noite'];

/**
 * AC-19.3: confete do acerto, do centro do resultado para todos os lados, freado pelo ar e puxado pela gravidade,
 * girando, e sumindo antes de `confeteMs` (≤ 1,2 s) contados da saída. Uma camada só, cada partícula só com `transform`
 * e `opacity`. Nenhuma em Baixa (`confetes` = 0).
 */
export function particulasConfete(p: ParametrosJuice, u = 1, semente = 11): Particula[] {
  if (p.confetes <= 0 || p.confeteMs <= 0) return [];
  const sortear = aleatorio(semente);
  const alcance = p.confeteAlcancePx * u;
  const atraso = liberacaoMs(p);
  return Array.from({ length: p.confetes }, (_, i) => {
    const angulo = ((i + sortear() * 0.8) / p.confetes) * 2 * Math.PI;
    const forca = alcance * (0.45 + 0.55 * sortear());
    const vx = Math.cos(angulo) * forca;
    const vy = Math.sin(angulo) * forca * 0.8 - alcance * 0.25; // um pouco para cima: o confete "sobe" antes de cair
    const gravidade = alcance * 0.55;
    const giro = (sortear() < 0.5 ? -1 : 1) * (200 + sortear() * 400);
    const duracao = Math.round(p.confeteMs * (0.7 + 0.3 * sortear()));
    const OFFSETS = [0, 0.08, 0.25, 0.45, 0.65, 0.85, 1];
    const quadros: Quadros = OFFSETS.map((t) => {
      const freio = 1 - (1 - t) ** 3;
      const x = vx * freio;
      const y = vy * freio + gravidade * t * t;
      const escala = t === 0 ? 0.2 : t < 0.1 ? 1 : 1 - 0.4 * t;
      const opacidade = t === 0 ? 0 : t <= 0.65 ? 1 : t === 1 ? 0 : 1 - (t - 0.65) / 0.35;
      return { offset: t, transform: `translate(${r(x)}px, ${r(y)}px) rotate(${r(giro * t, 1)}deg) scale(${r(escala, 3)})`, opacity: r(opacidade, 3) };
    });
    return {
      forma: FORMAS[i % FORMAS.length]!,
      cor: CORES[Math.floor(sortear() * CORES.length)]!,
      quadros,
      opcoes: { duration: duracao, delay: atraso, easing: 'linear', fill: 'backwards' },
    };
  });
}

export interface Gota extends Efeito { tamanho: number; alongada: boolean }

/**
 * AC-19.2: respingo de tinta em volta do carimbo, na cor dele: gotas que saem da borda (uma elipse do tamanho do
 * carimbo), esticadas na direção do voo (squash and stretch), e somem em `RESPINGO_MS`. `largura`/`altura`: o carimbo,
 * já em px da tela.
 */
export function gotasRespingo(p: ParametrosJuice, largura: number, altura: number, u = 1, semente = 23): Gota[] {
  if (p.respingoGotas <= 0) return [];
  const sortear = aleatorio(semente);
  const n = p.respingoGotas;
  return Array.from({ length: n }, (_, i) => {
    const angulo = ((i + 0.5 + (sortear() - 0.5) * 0.6) / n) * 2 * Math.PI;
    const cx = Math.cos(angulo), cy = Math.sin(angulo);
    const x0 = (largura / 2) * 0.92 * cx, y0 = (altura / 2) * 0.92 * cy;
    const voo = (18 + sortear() * 46) * u * (0.8 + n / 40);
    const graus = r((angulo * 180) / Math.PI, 1);
    const ponto = (d: number, sx: number, sy: number) =>
      `translate(${r(x0 + cx * d)}px, ${r(y0 + cy * d)}px) rotate(${graus}deg) scale(${r(sx, 3)}, ${r(sy, 3)})`;
    const quadros: Quadros = [
      { offset: 0, transform: ponto(0, 0.2, 0.2), opacity: 0 },
      { offset: 0.06, opacity: 1 },
      { offset: 0.3, transform: ponto(voo * 0.75, 1.7, 0.7), opacity: 1 },
      { offset: 0.6, transform: ponto(voo, 1, 1), opacity: 1 },
      { offset: 1, transform: ponto(voo * 1.05, 0.55, 0.55), opacity: 0 },
    ];
    return {
      tamanho: Math.round(7 + sortear() * 9),
      alongada: sortear() < 0.4,
      quadros,
      opcoes: { duration: RESPINGO_MS, delay: liberacaoMs(p), easing: 'cubic-bezier(0.2, 0.7, 0.3, 1)', fill: 'backwards' },
    };
  });
}

/**
 * AC-19.7: a explicação e a técnica entram depois da tremida (sem overshoot: é texto de ler) e daí ficam paradas. Só
 * quando há tremida; sem ela, aparecem já no lugar, como na v13.3.0.
 */
export function efeitoEntradaTexto(p: ParametrosJuice, u = 1, ordem = 0): Efeito | null {
  if (p.tremidaPx <= 0) return null;
  return {
    quadros: [
      { offset: 0, transform: `translateY(${r(14 * u)}px)`, opacity: 0 },
      { offset: 1, transform: 'translateY(0px)', opacity: 1 },
    ],
    opcoes: {
      duration: 280,
      delay: liberacaoMs(p) + Math.round(p.tremidaMs * 0.7) + ordem * 60,
      easing: 'cubic-bezier(0.2, 0.7, 0.3, 1)',
      fill: 'backwards',
    },
  };
}

/**
 * AC-19.2/AC-19.4: a carta saindo (Cartas). Ela para no golpe do carimbo no alto da carta (hit-stop: o carimbo bate
 * nesse tempo) e só então voa, no que sobra de `TEMPOS.saidaMs`; a saída não fica mais longa (regra "animação soma").
 * No acerto, um leve inchaço; no erro, ela amassa (escala e inclinação) antes de sair.
 */
export function efeitoSaida(p: ParametrosJuice, lado: 'direita' | 'esquerda', erro: boolean): Efeito | null {
  if (p.hitStopMs <= 0) return null;
  const total = TEMPOS.saidaMs;
  const parada = Math.min(p.hitStopMs, total * 0.5);
  const sinal = lado === 'direita' ? 1 : -1;
  const pose = erro ? `scale(${p.amassarEscala}) rotate(${r(-sinal * p.amassarGraus, 2)}deg)` : 'scale(1.03) rotate(0deg)';
  const golpe = r(Math.min(0.08, (parada / total) * 0.5), 4);
  return {
    quadros: [
      { offset: 0, transform: 'translateX(0vw) rotate(0deg) scale(1) rotate(0deg)', easing: 'cubic-bezier(0.3, 0, 0.6, 1)' },
      { offset: golpe, transform: `translateX(0vw) rotate(0deg) ${pose}` },
      { offset: r(parada / total, 4), transform: `translateX(0vw) rotate(0deg) ${pose}`, easing: 'cubic-bezier(0.5, 0, 0.9, 0.6)' },
      { offset: 1, transform: `translateX(${sinal * 120}vw) rotate(${sinal * 20}deg) ${pose}` },
    ],
    opcoes: { duration: total, easing: 'linear', fill: 'forwards' },
  };
}

/** Propriedades que algum quadro-chave anima: a spec só permite `transform` e `opacity` (FR-21). */
export function propriedadesAnimadas(quadros: Quadros): Set<string> {
  const props = new Set<string>();
  for (const q of quadros) for (const k of Object.keys(q)) if (!['offset', 'easing', 'composite'].includes(k)) props.add(k);
  return props;
}
