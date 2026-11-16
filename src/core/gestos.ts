import { MULTIPLICADOR_SENSIBILIDADE, type Sensibilidade } from './ajustes';
import type { ModoJogo } from './modos';
import type { Presenca } from './partida';

export interface Ponto { x: number; y: number; visibility?: number }
export type Pose = Ponto[];
/** 'maosParaCima' é o gesto de "saiba mais" do modo ativo (no modo Cabeça, queixo para cima). */
export type Gesto = 'direita' | 'esquerda' | 'maosParaCima';
export interface LeituraGesto { presenca: Presenca; inclinacao: number; gestos: Gesto[] }
/** Leitura de um quadro com várias pessoas: a pose do jogador acompanhado (AC-1.5) e o que ela gerou. */
export interface LeituraJogador extends LeituraGesto { pose: Pose | null }
export interface Interpretador {
  /** Lê a pose de um jogador já escolhido (sem acompanhamento). */
  ler(pose: Pose | null, tMs: number): LeituraGesto;
  /** v12.1.0 (AC-1.5): escolhe o jogador entre as poses do quadro, acompanhando-o entre quadros, e lê a pose dele. */
  lerPoses(poses: Pose[], tMs: number): LeituraJogador;
  calibrar(): void;
  /**
   * v12.1.0 (AC-2.13): zera as permanências em andamento (lado, mãos, queixo; no modo Mão, desarma a mão).
   * Não destrava o retorno ao centro (AC-2.4). Chamado ao entrar num card.
   */
  zerar(): void;
}

export const CONFIG_GESTOS = {
  limiar: 0.12,
  /**
   * AC-2.4 (v12.1.0), modo Corpo, frações do limiar (acompanham a sensibilidade): a escolha é liberada com o tronco
   * a menos de `retornoFracao` do centro; parado (variação < `paradoVariacao` da imagem) por `paradoMs` a menos de
   * `recentroFracao`, o centro passa a ser ali e a escolha é liberada. Antes, 0,05 do centro fixo.
   */
  retornoFracao: 0.5,
  recentroFracao: 0.75,
  paradoVariacao: 0.02,
  paradoMs: 1000,
  /**
   * AC-1.5 (v12.1.0): o jogador acompanhado é a pose mais parecida com a dele no quadro anterior
   * (|Δ centro| + |Δ largura dos ombros|, frações da imagem) até `semelhancaMax`; sumido por mais de
   * `perdaJogadorMs`, volta a valer a pessoa mais central e maior, que só escolhe depois de passar pelo centro.
   */
  semelhancaMax: 0.3,
  perdaJogadorMs: 1000,
  /**
   * Modos Mão e Cabeça (v12.1.0): de lado, a largura (ombros na Mão, orelhas na Cabeça) cai perto de zero e as
   * medidas divididas por ela explodem. Abaixo de `larguraMinFracao` da mediana dos últimos `janelaLargura`
   * quadros, o gesto é ignorado.
   */
  larguraMinFracao: 0.5,
  janelaLargura: 15,
  zonaCalibracao: 0.1,
  permanenciaLadoMs: 300,
  permanenciaMaosMs: 500,
  margemMaoOmbro: 0.05,
  limiarCabecaGraus: 15,
  retornoCabecaGraus: 6,
  limiarQueixo: 0.25,
  /**
   * Modo Mão, swipe (v10.3.0, AC-9.20): distâncias em larguras de ombro (L) a partir do meio do corpo.
   * `centroArrasteL`: frente do peito (arma e libera a mão); `arrasteMinL`: limite do swipe, a calibrar no hardware.
   */
  centroArrasteL: 0.5,
  arrasteMinL: 1,
};
export type ConfigGestos = typeof CONFIG_GESTOS;
type Config = ConfigGestos;

/**
 * Limiares com a sensibilidade dos Ajustes (AC-9.28, v12.0.0): multiplica os limites que disparam um gesto
 * (distâncias no Corpo e na Mão, ângulo e queixo na Cabeça); permanências e zonas de retorno não mudam.
 * "Normal" devolve o próprio `CONFIG_GESTOS`.
 */
export function configGestos(sensibilidade: Sensibilidade): Config {
  const k = MULTIPLICADOR_SENSIBILIDADE[sensibilidade];
  if (k === 1) return CONFIG_GESTOS;
  const c = CONFIG_GESTOS;
  return { ...c, limiar: c.limiar * k, arrasteMinL: c.arrasteMinL * k, limiarCabecaGraus: c.limiarCabecaGraus * k, limiarQueixo: c.limiarQueixo * k };
}

const NARIZ = 0, ORELHA_E = 7, ORELHA_D = 8, OMBRO_E = 11, OMBRO_D = 12, COTOVELO_E = 13, COTOVELO_D = 14, PUNHO_E = 15, PUNHO_D = 16;
const AUSENTE: LeituraGesto = { presenca: { presente: false, centralizado: false }, inclinacao: 0, gestos: [] };

/** Centro do tronco do ponto de vista do jogador (imagem espelhada) e largura dos ombros. */
function medir(p: Pose): { cx: number; largura: number } {
  const a = p[OMBRO_E]!, b = p[OMBRO_D]!;
  return { cx: 1 - (a.x + b.x) / 2, largura: Math.abs(a.x - b.x) };
}

function presenca(cx: number, cfg: Config): Presenca {
  return { presente: true, centralizado: Math.abs(cx - 0.5) < cfg.zonaCalibracao };
}

export interface MedidaMaos {
  direita: boolean;
  esquerda: boolean;
  /** Deslocamento lateral do punho a partir do meio do corpo, em larguras de ombro; + = própria direita do jogador. */
  deslocD: number;
  deslocE: number;
}

/** Medidas das mãos do modo Mão (AC-9.7, AC-9.19, AC-9.20). Lados anatômicos do jogador. */
export function medirMaos(pose: Pose, cfg: Config = CONFIG_GESTOS): MedidaMaos {
  const acima = (punho: number, ombro: number) => pose[punho]!.y < pose[ombro]!.y - cfg.margemMaoOmbro;
  const { cx, largura } = medir(pose);
  const desloc = (punho: number) => (1 - pose[punho]!.x - cx) / Math.max(largura, 1e-6);
  return { direita: acima(PUNHO_D, OMBRO_D), esquerda: acima(PUNHO_E, OMBRO_E), deslocD: desloc(PUNHO_D), deslocE: desloc(PUNHO_E) };
}

export interface MedidaCabeca { rollGraus: number; queixo: number }

/** Inclinação (graus; + = própria direita) e queixo (+ = olhando para cima) do modo Cabeça (AC-9.10, AC-9.11). */
export function medirCabeca(pose: Pose): MedidaCabeca {
  const oe = pose[ORELHA_E]!, od = pose[ORELHA_D]!, nariz = pose[NARIZ]!;
  const dist = Math.max(Math.abs(oe.x - od.x), 1e-6);
  // Orelha direita mais baixa que a esquerda = cabeça inclinada para a própria direita.
  const rollGraus = (Math.atan2(od.y - oe.y, dist) * 180) / Math.PI;
  // Nariz subindo em relação às orelhas = queixo para cima.
  const queixo = ((oe.y + od.y) / 2 - nariz.y) / dist;
  return { rollGraus, queixo };
}

const limitar = (v: number) => Math.max(-1, Math.min(1, v));

/** AC-1.5 (a): a pessoa mais central e maior no quadro, sem memória entre quadros. */
export function escolherJogador(poses: Pose[]): Pose | null {
  let melhor: Pose | null = null;
  let nota = -Infinity;
  for (const p of poses) {
    const { cx, largura } = medir(p);
    const n = largura * (1 - Math.abs(cx - 0.5));
    if (n > nota) { nota = n; melhor = p; }
  }
  return melhor;
}

export interface SeletorJogador {
  /** `novo`: a pose vem de quem foi escolhido depois de o acompanhado sumir por mais de `perdaJogadorMs`. */
  escolher(poses: Pose[], tMs: number): { pose: Pose | null; novo: boolean };
}

/**
 * AC-1.5 (v12.1.0): acompanha o jogador entre quadros. (a) Sem ninguém acompanhado, vale `escolherJogador`;
 * (b) com alguém, a pose mais parecida com a dele no quadro anterior, mesmo que outra seja maior ou mais central;
 * sem nenhuma parecida, ninguém controla naquele quadro; (c) sumido por mais de `perdaJogadorMs`, volta a (a).
 */
export function criarSeletorJogador(cfg: Config = CONFIG_GESTOS): SeletorJogador {
  let ref: { cx: number; largura: number; tMs: number } | null = null;
  let perdido = false;
  return {
    escolher(poses, tMs) {
      if (ref && tMs - ref.tMs > cfg.perdaJogadorMs) { ref = null; perdido = true; }
      if (ref) {
        let melhor: Pose | null = null;
        let menor = Infinity;
        for (const p of poses) {
          const m = medir(p);
          const dist = Math.abs(m.cx - ref.cx) + Math.abs(m.largura - ref.largura);
          if (dist < menor) { menor = dist; melhor = p; }
        }
        if (!melhor || menor > cfg.semelhancaMax) return { pose: null, novo: false };
        ref = { ...medir(melhor), tMs };
        return { pose: melhor, novo: false };
      }
      const pose = escolherJogador(poses);
      if (!pose) return { pose: null, novo: false };
      const novo = perdido;
      perdido = false;
      ref = { ...medir(pose), tMs };
      return { pose, novo };
    },
  };
}

/** Largura normal da pessoa (v12.1.0): falso quando cai abaixo de `larguraMinFracao` da mediana recente (de lado). */
function criarLarguraNormal(cfg: Config) {
  const historico: number[] = [];
  return (largura: number): boolean => {
    historico.push(largura);
    if (historico.length > cfg.janelaLargura) historico.shift();
    const ordenadas = [...historico].sort((a, b) => a - b);
    return largura >= cfg.larguraMinFracao * ordenadas[Math.floor(ordenadas.length / 2)]!;
  };
}

type Lado = 'direita' | 'esquerda';

/** Interpretador de um modo; `travar` exige a volta ao centro antes da próxima escolha (pessoa nova, AC-1.5 c). */
type InterpretadorModo = Omit<Interpretador, 'lerPoses'> & { travar(): void };

/** Escolha de um lado: a mesma postura mantida por `permanenciaLadoMs` dispara uma vez; depois trava até `livre`. */
function criarEscolha(cfg: Config) {
  let lado: { gesto: Lado; desde: number } | null = null;
  let travado = false;
  return {
    zerar() { lado = null; },
    travar() { lado = null; travado = true; },
    /** Depois de uma escolha, até `livre`: o card fica no centro (AC-2.4, AC-2.10). */
    get travado() { return travado; },
    ler(postura: Lado | null, livre: boolean, tMs: number): Gesto | null {
      if (travado) {
        if (livre) travado = false;
        return null;
      }
      if (!postura) lado = null;
      else if (lado?.gesto !== postura) lado = { gesto: postura, desde: tMs };
      else if (tMs - lado.desde >= cfg.permanenciaLadoMs) {
        travado = true;
        lado = null;
        return postura;
      }
      return null;
    },
  };
}

/** Detecta um deslocamento lateral mantido por `permanenciaLadoMs`, com retorno obrigatório ao centro. */
function criarLado(limiar: number, retorno: number, cfg: Config) {
  const escolha = criarEscolha(cfg);
  return {
    zerar: escolha.zerar,
    travar: escolha.travar,
    get travado() { return escolha.travado; },
    ler: (d: number, tMs: number): Gesto | null =>
      escolha.ler(d > limiar ? 'direita' : d < -limiar ? 'esquerda' : null, Math.abs(d) < retorno, tMs),
  };
}

/** Dispara uma vez quando `ativo` fica verdadeiro por `ms`; rearma quando `ativo` volta a falso. */
function criarGatilho(ms: number) {
  let desde: number | null = null;
  let disparado = false;
  return {
    zerar() { desde = null; },
    ler(ativo: boolean, tMs: number): boolean {
      if (!ativo) { desde = null; disparado = false; return false; }
      if (desde === null) { desde = tMs; return false; }
      if (!disparado && tMs - desde >= ms) { disparado = true; return true; }
      return false;
    },
  };
}

function interpretadorCorpo(cfg: Config): InterpretadorModo {
  let centro: number | null = null;
  let ultimoCx = 0.5;
  /** Onde e desde quando o tronco está parado (variação < `paradoVariacao`), para o recentro de AC-2.4. */
  let parado: { cx: number; desde: number } | null = null;
  const escolha = criarEscolha(cfg);
  const maos = criarGatilho(cfg.permanenciaMaosMs);
  return {
    calibrar() { centro = ultimoCx; },
    zerar() { escolha.zerar(); maos.zerar(); },
    travar() { escolha.travar(); },
    ler(pose, tMs) {
      if (!pose) { escolha.zerar(); maos.zerar(); parado = null; return AUSENTE; }
      const gestos: Gesto[] = [];
      const { cx } = medir(pose);
      ultimoCx = cx;
      if (!parado || Math.abs(cx - parado.cx) >= cfg.paradoVariacao) parado = { cx, desde: tMs };
      let d = cx - (centro ?? 0.5);
      // AC-2.4 (v12.1.0): travado e parado perto do centro por 1 s, o centro passa a ser ali (quem voltou torto não fica preso).
      if (escolha.travado && tMs - parado.desde >= cfg.paradoMs && Math.abs(d) < cfg.recentroFracao * cfg.limiar) {
        centro = cx;
        d = 0;
      }
      const nariz = pose[NARIZ]!.y;
      const maosAcima = pose[PUNHO_E]!.y < nariz && pose[PUNHO_D]!.y < nariz;

      // v10.3.0: um único controle, o tronco (AC-2.7/AC-2.8 removidos). AC-2.4: libera com o tronco na área central.
      const tronco: Lado | null = d > cfg.limiar ? 'direita' : d < -cfg.limiar ? 'esquerda' : null;
      const g = escolha.ler(tronco, Math.abs(d) < cfg.retornoFracao * cfg.limiar, tMs);
      if (g) gestos.push(g);
      if (maos.ler(maosAcima, tMs)) gestos.push('maosParaCima');
      // AC-2.10: fração do tronco até o limiar; travado depois de uma escolha, o card fica no centro.
      return { presenca: presenca(cx, cfg), inclinacao: escolha.travado ? 0 : limitar(d / cfg.limiar), gestos };
    },
  };
}

/** Mão ativa do swipe (AC-9.20): punho acima do cotovelo; com as duas, a mais longe do meio do corpo. */
function maoAtiva(pose: Pose, m: MedidaMaos): number | null {
  const ativas: number[] = [];
  if (pose[PUNHO_D]!.y < pose[COTOVELO_D]!.y) ativas.push(m.deslocD);
  if (pose[PUNHO_E]!.y < pose[COTOVELO_E]!.y) ativas.push(m.deslocE);
  if (ativas.length === 0) return null;
  return ativas.reduce((a, b) => (Math.abs(b) > Math.abs(a) ? b : a));
}

/**
 * Modo Mão v10.3.0: um único controle, o swipe (AC-9.20, AC-9.22). A mão ativa arma quando passa pela
 * frente do peito (< `centroArrasteL`); armada, o card segue o punho (fração = deslocamento ÷ `arrasteMinL`)
 * e a escolha sai na hora ao passar do limite. Depois de escolher, de abrir o "saiba mais" ou de baixar a mão,
 * desarma, com o card no centro, até a mão voltar à frente do peito.
 */
function interpretadorMao(cfg: Config): InterpretadorModo {
  let armada = false;
  const ambas = criarGatilho(cfg.permanenciaMaosMs);
  const larguraNormal = criarLarguraNormal(cfg);
  return {
    calibrar() {},
    zerar() { armada = false; ambas.zerar(); },
    travar() { armada = false; },
    ler(pose, tMs) {
      if (!pose) { armada = false; ambas.zerar(); return AUSENTE; }
      const gestos: Gesto[] = [];
      const { cx, largura } = medir(pose);
      const deFrente = larguraNormal(largura);
      const m = medirMaos(pose, cfg);
      const duasAcima = m.direita && m.esquerda;
      if (ambas.ler(duasAcima, tMs)) gestos.push('maosParaCima');

      // As duas mãos acima dos ombros são o "saiba mais" (AC-9.8): não há mão ativa nesse quadro.
      // De lado (ombros quase sobrepostos), o deslocamento em larguras de ombro explode: sem mão ativa (v12.1.0).
      const desloc = duasAcima || !deFrente ? null : maoAtiva(pose, m);
      if (desloc === null) {
        armada = false;
        return { presenca: presenca(cx, cfg), inclinacao: 0, gestos };
      }
      if (!armada && Math.abs(desloc) < cfg.centroArrasteL) armada = true;
      if (armada && Math.abs(desloc) >= cfg.arrasteMinL) {
        gestos.push(desloc > 0 ? 'direita' : 'esquerda');
        armada = false;
      }
      return { presenca: presenca(cx, cfg), inclinacao: armada ? limitar(desloc / cfg.arrasteMinL) : 0, gestos };
    },
  };
}

function interpretadorCabeca(cfg: Config): InterpretadorModo {
  let ultimoRoll = 0;
  let ultimoQueixo: number | null = null;
  let rollCentro = 0;
  let queixoCentro: number | null = null;
  const lado = criarLado(cfg.limiarCabecaGraus, cfg.retornoCabecaGraus, cfg);
  const queixo = criarGatilho(cfg.permanenciaMaosMs);
  const larguraNormal = criarLarguraNormal(cfg);
  return {
    calibrar() {
      rollCentro = ultimoRoll;
      queixoCentro = ultimoQueixo;
    },
    zerar() { lado.zerar(); queixo.zerar(); },
    travar() { lado.travar(); },
    ler(pose, tMs) {
      if (!pose) { lado.zerar(); queixo.zerar(); return AUSENTE; }
      const gestos: Gesto[] = [];
      const { cx } = medir(pose);
      // De perfil (orelhas quase sobrepostas), o ângulo e o queixo explodem: o quadro não gera gesto (v12.1.0).
      if (!larguraNormal(Math.abs(pose[ORELHA_E]!.x - pose[ORELHA_D]!.x))) {
        lado.zerar();
        queixo.zerar();
        return { presenca: presenca(cx, cfg), inclinacao: 0, gestos };
      }
      const { rollGraus: roll, queixo: q } = medirCabeca(pose);
      ultimoRoll = roll;
      ultimoQueixo = q;
      if (queixoCentro === null) queixoCentro = q;

      const d = roll - rollCentro;
      const g = lado.ler(d, tMs);
      if (g) gestos.push(g);
      if (queixo.ler(q - queixoCentro > cfg.limiarQueixo, tMs)) gestos.push('maosParaCima');
      // AC-2.10: inclinação contínua até o limiar; depois de uma escolha, 0 até a cabeça voltar (AC-9.12).
      return { presenca: presenca(cx, cfg), inclinacao: lado.travado ? 0 : limitar(d / cfg.limiarCabecaGraus), gestos };
    },
  };
}

export function criarInterpretador(modo: ModoJogo = 'corpo', cfg: Config = CONFIG_GESTOS): Interpretador {
  const base = modo === 'mao' ? interpretadorMao(cfg) : modo === 'cabeca' ? interpretadorCabeca(cfg) : interpretadorCorpo(cfg);
  const seletor = criarSeletorJogador(cfg);
  return {
    ler: (pose, tMs) => base.ler(pose, tMs),
    calibrar: () => base.calibrar(),
    zerar: () => base.zerar(),
    lerPoses(poses, tMs) {
      const { pose, novo } = seletor.escolher(poses, tMs);
      // AC-1.5 (c): a pessoa nova só escolhe depois de passar pelo centro (AC-2.4).
      if (novo) base.travar();
      return { ...base.ler(pose, tMs), pose };
    },
  };
}
