import { describe, expect, it } from 'vitest';
import { criarInterpretador, type Pose } from './gestos';
import {
  LEITURA_VALIDA_MS, LEITURAS_MAX_POR_S, criarAplicadorLeituras, criarRitmoDeteccao, criarUltimaLeitura, type LeituraPose,
} from './leituraPose';

// FR-20 (v13.3.0, Fase 52.2): a detecção roda fora do laço de desenho; o laço aplica só a leitura mais recente.

/** Mesma pose sintética de gestos.test.ts: cxJogador é o centro do tronco do ponto de vista do jogador. */
function pose(cxJogador: number, opts: { maosAcima?: boolean } = {}): Pose {
  const largura = 0.2;
  const cx = 1 - cxJogador;
  const p = Array.from({ length: 33 }, () => ({ x: cx, y: 0.6, visibility: 1 }));
  p[0] = { x: cx, y: 0.3, visibility: 1 };
  p[11] = { x: cx + largura / 2, y: 0.45, visibility: 1 };
  p[12] = { x: cx - largura / 2, y: 0.45, visibility: 1 };
  const yMao = opts.maosAcima ? 0.15 : 0.7;
  p[15] = { x: cx + 0.6 * largura, y: yMao, visibility: 1 };
  p[16] = { x: cx - 0.6 * largura, y: yMao, visibility: 1 };
  return p;
}

const leitura = (poses: Pose[], capturaMs: number, deteccaoMs = 10): LeituraPose => ({ poses, capturaMs, deteccaoMs });

describe('criarUltimaLeitura: a mais recente vence (FR-20)', () => {
  it('entrega cada leitura uma vez só', () => {
    const c = criarUltimaLeitura();
    expect(c.tomar()).toBeNull();
    const a = leitura([], 100);
    expect(c.publicar(a)).toBe(true);
    expect(c.tomar()).toBe(a);
    expect(c.tomar()).toBeNull();
  });

  it('duas leituras antes de um quadro: só a mais nova é entregue', () => {
    const c = criarUltimaLeitura();
    c.publicar(leitura([], 100));
    const b = leitura([], 150);
    c.publicar(b);
    expect(c.tomar()).toBe(b);
    expect(c.tomar()).toBeNull();
  });

  it('uma leitura atrasada (captura mais antiga que a última) é descartada, mesmo já entregue a mais nova', () => {
    const c = criarUltimaLeitura();
    c.publicar(leitura([], 200));
    c.tomar();
    expect(c.publicar(leitura([], 150))).toBe(false);
    expect(c.publicar(leitura([], 200))).toBe(false);
    expect(c.tomar()).toBeNull();
  });

  it('limpar esquece a pendente e a ordem (rastreador novo)', () => {
    const c = criarUltimaLeitura();
    c.publicar(leitura([], 500));
    c.limpar();
    expect(c.tomar()).toBeNull();
    expect(c.publicar(leitura([], 10))).toBe(true);
  });
});

describe('criarRitmoDeteccao: uma leitura por vez, no ritmo próprio (FR-20)', () => {
  it('não pede outra enquanto há uma em andamento', () => {
    const r = criarRitmoDeteccao({ alternarQuadros: false });
    expect(r.pedir(0)).toBe(true);
    expect(r.pedir(100)).toBe(false);
    r.concluir();
    expect(r.pedir(116)).toBe(true);
  });

  it(`no máximo ${LEITURAS_MAX_POR_S} leituras por segundo`, () => {
    const r = criarRitmoDeteccao({ alternarQuadros: false });
    let leituras = 0;
    for (let t = 0; t < 999; t += 1000 / 60) { // 60 quadros = 1 s
      if (r.pedir(t)) { leituras++; r.concluir(); }
    }
    expect(leituras).toBeLessThanOrEqual(LEITURAS_MAX_POR_S);
    expect(leituras).toBeGreaterThanOrEqual(LEITURAS_MAX_POR_S - 1);
  });

  it('na thread principal, nunca em dois quadros seguidos', () => {
    const r = criarRitmoDeteccao({ alternarQuadros: true });
    const quadros: boolean[] = [];
    // Quadros de 70 ms (a detecção síncrona pesou o quadro): mesmo vencido o intervalo, o seguinte fica livre.
    for (let t = 0; t < 2000; t += 70) {
      const pediu = r.pedir(t);
      quadros.push(pediu);
      if (pediu) r.concluir();
    }
    for (let i = 1; i < quadros.length; i++) expect(quadros[i - 1] && quadros[i]).toBe(false);
    expect(quadros.filter(Boolean).length).toBeGreaterThan(10);
  });

  it('uma leitura sem resposta por muito tempo conta como travada (erro no worker)', () => {
    const r = criarRitmoDeteccao({ alternarQuadros: false, travadaMs: 5000 });
    r.pedir(0);
    expect(r.travada(4999)).toBe(false);
    expect(r.travada(5001)).toBe(true);
    r.concluir();
    expect(r.travada(20_000)).toBe(false);
  });
});

/**
 * Simula a tela a 60 Hz e a detecção a `hz` leituras por segundo, cada uma pronta `latenciaMs` depois da captura.
 * `poseEm(t)` é o que a câmera vê no instante t. Devolve, por gesto, o instante do quadro em que ele foi despachado
 * e a captura da leitura que o gerou.
 */
function simular(hz: number, latenciaMs: number, poseEm: (t: number) => Pose, fimMs: number) {
  const interp = criarInterpretador('corpo');
  interp.ler(pose(0.5), 0);
  interp.calibrar();
  const caixa = criarUltimaLeitura();
  const aplicador = criarAplicadorLeituras();
  const periodo = 1000 / hz;
  const prontas: { prontaMs: number; l: LeituraPose }[] = [];
  for (let c = periodo; c <= fimMs; c += periodo) prontas.push({ prontaMs: c + latenciaMs, l: leitura([poseEm(c)], c, latenciaMs) });
  const gestos: { gesto: string; quadroMs: number; capturaMs: number }[] = [];
  let somaDt = 0;
  let anterior = 0;
  for (let agora = 1000 / 60; agora <= fimMs + latenciaMs + 50; agora += 1000 / 60) {
    while (prontas[0] && prontas[0].prontaMs <= agora) caixa.publicar(prontas.shift()!.l);
    const nova = caixa.tomar();
    const q = aplicador.quadro({ agora, dtMs: agora - anterior, nova, interp, permanenciaConta: true, pausado: false });
    anterior = agora;
    for (const e of q.eventos) {
      if (e.tipo === 'tick') somaDt += e.dtMs;
      else gestos.push({ gesto: e.tipo === 'escolha' ? e.resposta : e.tipo, quadroMs: agora, capturaMs: q.aplicada!.capturaMs });
    }
  }
  return { gestos, somaDt, anterior };
}

/** Referência "de hoje": a mesma câmera lida em sincronia, leitura a leitura, com o tempo da leitura. */
function referencia(hz: number, poseEm: (t: number) => Pose, fimMs: number) {
  const interp = criarInterpretador('corpo');
  interp.ler(pose(0.5), 0);
  interp.calibrar();
  const out: { gesto: string; capturaMs: number }[] = [];
  for (let c = 1000 / hz; c <= fimMs; c += 1000 / hz) {
    for (const g of interp.lerPoses([poseEm(c)], c).gestos) out.push({ gesto: g, capturaMs: c });
  }
  return out;
}

describe('aplicador: permanências medidas pela captura (FR-20, AC-2.1, AC-3.1, NFR Performance)', () => {
  const T0 = 1000; // o jogador chega à posição
  for (const hz of [12, 15, 30]) {
    const latencia = Math.min(60, 1000 / hz - 1);

    it(`${hz} Hz de leituras, tela a 60 Hz: "direita" confirma na mesma leitura que hoje e em até 1 s (AC-2.1)`, () => {
      const poseEm = (t: number) => pose(t >= T0 ? 0.7 : 0.5);
      const { gestos } = simular(hz, latencia, poseEm, 3000);
      const ref = referencia(hz, poseEm, 3000);
      expect(ref.map((g) => g.gesto)).toEqual(['direita']);
      expect(gestos.map((g) => g.gesto)).toEqual(['verdadeira']);
      expect(gestos[0]!.capturaMs).toBe(ref[0]!.capturaMs);
      // Despachado no primeiro quadro depois de a leitura ficar pronta.
      expect(gestos[0]!.quadroMs - (gestos[0]!.capturaMs + latencia)).toBeLessThanOrEqual(1000 / 60 + 1e-6);
      expect(gestos[0]!.quadroMs - T0).toBeLessThanOrEqual(1000);
      // Não antes dos 300 ms de permanência, medidos pela câmera.
      expect(gestos[0]!.capturaMs - T0).toBeGreaterThanOrEqual(300 - 1000 / hz);
    });

    it(`${hz} Hz: "saiba mais" (mãos acima por 500 ms) confirma na mesma leitura que hoje e em até 1 s (AC-3.1)`, () => {
      const poseEm = (t: number) => pose(0.5, { maosAcima: t >= T0 });
      const { gestos } = simular(hz, latencia, poseEm, 3000);
      const ref = referencia(hz, poseEm, 3000);
      expect(ref.map((g) => g.gesto)).toEqual(['maosParaCima']);
      expect(gestos.map((g) => g.gesto)).toEqual(['saibaMais']);
      expect(gestos[0]!.capturaMs).toBe(ref[0]!.capturaMs);
      expect(gestos[0]!.quadroMs - T0).toBeLessThanOrEqual(1000);
    });

    it(`${hz} Hz: o relógio (tick) anda a cada quadro da tela, somando o tempo real (FR-1)`, () => {
      const { somaDt, anterior } = simular(hz, latencia, () => pose(0.5), 2000);
      expect(somaDt).toBeCloseTo(anterior, 6);
    });
  }

  it('um tick por quadro; presença e inclinação da última leitura até chegar outra', () => {
    const interp = criarInterpretador('corpo');
    interp.ler(pose(0.5), 0);
    interp.calibrar();
    const a = criarAplicadorLeituras();
    const q1 = a.quadro({ agora: 16, dtMs: 16, nova: leitura([pose(0.56)], 10), interp, permanenciaConta: true, pausado: false });
    expect(q1.eventos).toEqual([{ tipo: 'tick', dtMs: 16, presenca: { presente: true, centralizado: true } }]);
    expect(q1.inclinacao).toBeCloseTo(0.5, 1);
    expect(q1.aplicada?.capturaMs).toBe(10);
    const q2 = a.quadro({ agora: 33, dtMs: 17, nova: null, interp, permanenciaConta: true, pausado: false });
    expect(q2.eventos).toEqual([{ tipo: 'tick', dtMs: 17, presenca: { presente: true, centralizado: true } }]);
    expect(q2.inclinacao).toBeCloseTo(0.5, 1);
    expect(q2.pose).not.toBeNull();
    expect(q2.aplicada).toBeNull();
  });

  it(`sem leitura nova por mais de ${LEITURA_VALIDA_MS} ms (desde a captura), não há presença nem pose`, () => {
    const interp = criarInterpretador('corpo');
    const a = criarAplicadorLeituras();
    a.quadro({ agora: 50, dtMs: 16, nova: leitura([pose(0.5)], 40), interp, permanenciaConta: true, pausado: false });
    const ok = a.quadro({ agora: 40 + LEITURA_VALIDA_MS, dtMs: 16, nova: null, interp, permanenciaConta: true, pausado: false });
    expect(ok.eventos[0]).toMatchObject({ presenca: { presente: true } });
    const velha = a.quadro({ agora: 41 + LEITURA_VALIDA_MS, dtMs: 16, nova: null, interp, permanenciaConta: true, pausado: false });
    expect(velha.eventos).toEqual([{ tipo: 'tick', dtMs: 16, presenca: null }]);
    expect(velha.pose).toBeNull();
    expect(velha.inclinacao).toBe(0);
  });

  it('sem leitura nenhuma (sem câmera), o tick vai sem presença, como hoje', () => {
    const a = criarAplicadorLeituras();
    const q = a.quadro({ agora: 16, dtMs: 16, nova: null, interp: criarInterpretador(), permanenciaConta: true, pausado: false });
    expect(q.eventos).toEqual([{ tipo: 'tick', dtMs: 16, presenca: null }]);
  });

  it('esquecer (rastreador fechado) apaga a última leitura', () => {
    const interp = criarInterpretador('corpo');
    const a = criarAplicadorLeituras();
    a.quadro({ agora: 16, dtMs: 16, nova: leitura([pose(0.5)], 10), interp, permanenciaConta: true, pausado: false });
    a.esquecer();
    const q = a.quadro({ agora: 33, dtMs: 17, nova: null, interp, permanenciaConta: true, pausado: false });
    expect(q.eventos).toEqual([{ tipo: 'tick', dtMs: 17, presenca: null }]);
  });

  it('FR-14: com menu ou painel aberto, nem presença, nem inclinação, nem gestos', () => {
    const interp = criarInterpretador('corpo');
    interp.ler(pose(0.5), 0);
    interp.calibrar();
    const a = criarAplicadorLeituras();
    let eventos: string[] = [];
    for (let i = 1; i <= 20; i++) {
      const q = a.quadro({ agora: i * 50, dtMs: 50, nova: leitura([pose(0.7)], i * 50 - 5), interp, permanenciaConta: true, pausado: true });
      eventos = eventos.concat(q.eventos.map((e) => e.tipo));
      expect(q.inclinacao).toBe(0);
      expect(q.eventos[0]).toEqual({ tipo: 'tick', dtMs: 50, presenca: null });
    }
    expect(eventos.every((t) => t === 'tick')).toBe(true);
  });

  it('AC-2.13/AC-17.6: com a carta ainda não pousada, cada leitura nova zera as permanências', () => {
    const interp = criarInterpretador('corpo');
    interp.ler(pose(0.5), 0);
    interp.calibrar();
    const a = criarAplicadorLeituras();
    const gestos: string[] = [];
    for (let t = 100; t <= 1000; t += 66) {
      const q = a.quadro({ agora: t + 30, dtMs: 66, nova: leitura([pose(0.7)], t), interp, permanenciaConta: t < 500 ? false : true, pausado: false });
      gestos.push(...q.eventos.filter((e) => e.tipo !== 'tick').map((e) => e.tipo));
    }
    // Como hoje: a leitura do quadro que ainda zera começa a permanência; uma escolha só, depois de pousada.
    expect(gestos).toEqual(['escolha']);
  });
});
