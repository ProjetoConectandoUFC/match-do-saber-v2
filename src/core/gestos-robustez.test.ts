import { describe, expect, it } from 'vitest';
import { CONFIG_GESTOS, configGestos, criarInterpretador, type Gesto, type Pose } from './gestos';

/** Pose sintética: `cx` é o centro do tronco do ponto de vista do jogador (espelhado); `w`, a largura dos ombros. */
function pose(cx: number, w = 0.12, opts: { orelhas?: number; punhoD?: { x: number; y: number } } = {}): Pose {
  const mx = 1 - cx;
  const o = opts.orelhas ?? w / 2;
  const p: Pose = Array.from({ length: 33 }, () => ({ x: mx, y: 0.5, visibility: 1 }));
  p[0] = { x: mx, y: 0.2, visibility: 1 };
  p[7] = { x: mx + o / 2, y: 0.22, visibility: 1 };
  p[8] = { x: mx - o / 2, y: 0.22, visibility: 1 };
  p[11] = { x: mx + w / 2, y: 0.35, visibility: 1 };
  p[12] = { x: mx - w / 2, y: 0.35, visibility: 1 };
  p[13] = { x: mx + w / 2, y: 0.5, visibility: 1 };
  p[14] = { x: mx - w / 2, y: 0.5, visibility: 1 };
  p[15] = { x: mx + w / 2, y: 0.65, visibility: 1 };
  p[16] = opts.punhoD ?? { x: mx - w / 2, y: 0.65, visibility: 1 };
  return p;
}

/** Calibra um interpretador do modo Corpo com o jogador parado em `cx`; devolve o tempo seguinte. */
function calibrado(cx = 0.5, w = 0.12, cfg = CONFIG_GESTOS) {
  const it = criarInterpretador('corpo', cfg);
  let t = 0;
  for (; t < 1000; t += 150) it.lerPoses([pose(cx, w)], t);
  it.calibrar();
  return { it, t };
}

describe('AC-1.5 (v12.1.0): o jogo acompanha o jogador', () => {
  it('(b) um passante maior e mais central não toma o controle nem gera escolha', () => {
    let { it: i, t } = calibrado(0.5, 0.12);
    const jogador = pose(0.5, 0.12);
    const passante = pose(0.72, 0.3);
    const gestos: Gesto[] = [];
    for (let k = 0; k < 10; k++, t += 150) {
      const l = i.lerPoses([passante, jogador], t);
      expect(l.pose).toBe(jogador);
      expect(l.inclinacao).toBeCloseTo(0, 5);
      gestos.push(...l.gestos);
    }
    expect(gestos).toEqual([]);
  });

  it('(b) acompanha o jogador que se desloca, mesmo com outra pessoa maior no quadro', () => {
    let { it: i, t } = calibrado(0.5, 0.12);
    const outra = pose(0.3, 0.25);
    const gestos: Gesto[] = [];
    for (const cx of [0.55, 0.6, 0.65, 0.65, 0.65, 0.65]) {
      const eu = pose(cx, 0.12);
      const l = i.lerPoses([outra, eu], t);
      expect(l.pose).toBe(eu);
      gestos.push(...l.gestos);
      t += 150;
    }
    expect(gestos).toEqual(['direita']);
  });

  it('(a) sem jogador acompanhado, vale a pessoa mais central e maior', () => {
    const i = criarInterpretador('corpo');
    const canto = pose(0.1, 0.3);
    const centralGrande = pose(0.55, 0.25);
    expect(i.lerPoses([canto, pose(0.5, 0.1), centralGrande], 0).pose).toBe(centralGrande);
    expect(i.lerPoses([], 100).pose).toBeNull();
  });

  it('(c) com o jogador sumido até 1 s, ninguém controla; depois de 1 s vale (a), e a pessoa nova só escolhe depois de passar pelo centro', () => {
    let { it: i, t } = calibrado(0.5, 0.12);
    const passante = pose(0.72, 0.3);
    // Jogador some; só o passante no quadro (deslocado além do limiar). Até 1 s desde a última vez visto, ninguém controla.
    const visto = t - 150;
    for (; t - visto <= 1000; t += 150) {
      const l = i.lerPoses([passante], t);
      expect(l.pose).toBeNull();
      expect(l.gestos).toEqual([]);
    }
    // Passado 1 s, o passante vira o jogador, mas fora do centro não escolhe nada.
    const gestos: Gesto[] = [];
    for (let k = 0; k < 10; k++, t += 150) {
      const l = i.lerPoses([passante], t);
      expect(l.pose).toBe(passante);
      expect(l.inclinacao).toBe(0);
      gestos.push(...l.gestos);
    }
    expect(gestos).toEqual([]);
    // Passou pelo centro: volta a escolher.
    for (const cx of [0.65, 0.58, 0.5]) { i.lerPoses([pose(cx, 0.3)], t); t += 150; }
    for (let k = 0; k < 4; k++, t += 150) gestos.push(...i.lerPoses([pose(0.7, 0.3)], t).gestos);
    expect(gestos).toEqual(['direita']);
  });

  it('o jogador que reaparece antes de 1 s continua sendo acompanhado', () => {
    let { it: i, t } = calibrado(0.5, 0.12);
    i.lerPoses([], t); t += 150;
    i.lerPoses([], t); t += 150;
    const eu = pose(0.52, 0.12);
    expect(i.lerPoses([pose(0.8, 0.3), eu], t).pose).toBe(eu);
  });

  it('virar de lado (ombros sobrepostos) não perde o jogador', () => {
    let { it: i, t } = calibrado(0.5, 0.12);
    const deLado = pose(0.5, 0.015);
    expect(i.lerPoses([pose(0.75, 0.2), deLado], t).pose).toBe(deLado);
  });

  it('vale para os modos Mão e Cabeça', () => {
    for (const modo of ['mao', 'cabeca'] as const) {
      const i = criarInterpretador(modo);
      const eu = pose(0.5, 0.12);
      i.lerPoses([eu], 0);
      expect(i.lerPoses([pose(0.7, 0.3), eu], 150).pose).toBe(eu);
    }
  });
});

describe('AC-2.4 (v12.1.0): área central e recentro no modo Corpo', () => {
  function escolheuDireita(i: ReturnType<typeof criarInterpretador>, t: number, cx = 0.7) {
    const g: Gesto[] = [];
    for (let k = 0; k < 4; k++, t += 150) g.push(...i.lerPoses([pose(cx)], t).gestos);
    return { g, t };
  }

  it('libera com o tronco a menos de metade do limiar do centro (fronteira)', () => {
    const meio = CONFIG_GESTOS.limiar / 2;
    let { it: i, t } = calibrado();
    let r = escolheuDireita(i, t); t = r.t;
    expect(r.g).toEqual(['direita']);
    // Logo acima de limiar/2: continua travado (sem ficar parado 1 s).
    i.lerPoses([pose(0.5 + meio + 0.001)], t); t += 150;
    r = escolheuDireita(i, t); t = r.t;
    expect(r.g).toEqual([]);
    // Logo abaixo de limiar/2: libera.
    i.lerPoses([pose(0.5 + meio - 0.001)], t); t += 150;
    r = escolheuDireita(i, t);
    expect(r.g).toEqual(['direita']);
  });

  it('jogador que volta torto (0,56) e fica parado 1 s é recentrado e escolhe de novo', () => {
    let { it: i, t } = calibrado();
    let r = escolheuDireita(i, t, 0.65); t = r.t;
    expect(r.g).toEqual(['direita']);
    const t0 = t;
    for (; t - t0 < 1000; t += 150) expect(i.lerPoses([pose(0.56)], t).inclinacao).toBe(0);
    i.lerPoses([pose(0.56)], t); t += 150;
    // Recentrado em 0,56: o card volta a acompanhar a partir dali.
    expect(i.lerPoses([pose(0.56)], t).inclinacao).toBeCloseTo(0, 5); t += 150;
    // Inclina de novo: 0,70 está a 0,14 do novo centro.
    r = escolheuDireita(i, t, 0.7);
    expect(r.g).toEqual(['direita']);
  });

  it('parado antes de 1 s não recentra (fronteira do tempo)', () => {
    let { it: i, t } = calibrado();
    let r = escolheuDireita(i, t, 0.65); t = r.t;
    const t0 = t;
    i.lerPoses([pose(0.56)], t0);
    i.lerPoses([pose(0.56)], t0 + 999);
    r = escolheuDireita(i, t0 + 1000, 0.7);
    expect(r.g).toEqual([]);
  });

  it('variação de 2% ou mais reinicia a contagem de parado', () => {
    let { it: i, t } = calibrado();
    let r = escolheuDireita(i, t, 0.65); t = r.t;
    const t0 = t;
    i.lerPoses([pose(0.56)], t0);
    i.lerPoses([pose(0.585)], t0 + 600);
    i.lerPoses([pose(0.585)], t0 + 1100); // só 500 ms parado em 0,585
    r = escolheuDireita(i, t0 + 1200, 0.72);
    expect(r.g).toEqual([]);
  });

  it('parado a 3/4 do limiar ou mais não recentra', () => {
    let { it: i, t } = calibrado();
    let r = escolheuDireita(i, t, 0.65); t = r.t;
    const longe = 0.5 + CONFIG_GESTOS.limiar * 0.75 + 0.001;
    const t0 = t;
    for (; t - t0 <= 2000; t += 150) i.lerPoses([pose(longe)], t);
    r = escolheuDireita(i, t, 0.7);
    expect(r.g).toEqual([]);
  });

  it('com a sensibilidade, as zonas acompanham o limiar', () => {
    const cfg = configGestos('menor'); // limiar 0,15 → libera abaixo de 0,075
    let { it: i, t } = calibrado(0.5, 0.12, cfg);
    let r = escolheuDireita(i, t, 0.7); t = r.t;
    expect(r.g).toEqual(['direita']);
    i.lerPoses([pose(0.57)], t); t += 150; // 0,07 < 0,075
    r = escolheuDireita(i, t, 0.7);
    expect(r.g).toEqual(['direita']);
  });
});

describe('AC-2.13 (v12.1.0): zerar() no começo do card', () => {
  it('Corpo: a permanência começada no feedback não responde o card novo; conta de novo desde o zerar', () => {
    let { it: i, t } = calibrado();
    // Durante o feedback, o jogador volta ao centro e já se inclina 250 ms.
    i.lerPoses([pose(0.5)], t); t += 150;
    i.lerPoses([pose(0.7)], t);
    i.lerPoses([pose(0.7)], t + 250);
    i.zerar(); // card novo
    expect(i.lerPoses([pose(0.7)], t + 300).gestos).toEqual([]);
    expect(i.lerPoses([pose(0.7)], t + 599).gestos).toEqual([]);
    expect(i.lerPoses([pose(0.7)], t + 600).gestos).toEqual(['direita']);
  });

  it('zerar não destrava o retorno ao centro', () => {
    let { it: i, t } = calibrado();
    for (let k = 0; k < 4; k++, t += 150) i.lerPoses([pose(0.7)], t);
    i.zerar();
    const g: Gesto[] = [];
    for (let k = 0; k < 6; k++, t += 150) g.push(...i.lerPoses([pose(0.7)], t).gestos);
    expect(g).toEqual([]);
  });

  it('Cabeça: inclinação começada antes não responde o card novo', () => {
    const i = criarInterpretador('cabeca');
    const reta = pose(0.5);
    i.lerPoses([reta], 0);
    i.calibrar();
    const torta = pose(0.5);
    const dy = Math.tan((25 * Math.PI) / 180) * 0.06;
    torta[7] = { ...torta[7]!, y: 0.22 - dy / 2 };
    torta[8] = { ...torta[8]!, y: 0.22 + dy / 2 };
    i.lerPoses([torta], 100);
    i.lerPoses([torta], 350);
    i.zerar();
    expect(i.lerPoses([torta], 400).gestos).toEqual([]);
    expect(i.lerPoses([torta], 700).gestos).toEqual(['direita']);
  });

  it('Mão: zerar desarma a mão (precisa passar de novo pela frente do peito)', () => {
    const i = criarInterpretador('mao');
    const mx = 0.5;
    const peito = pose(0.5, 0.12, { punhoD: { x: mx, y: 0.45 } });
    i.lerPoses([peito], 0); // arma
    i.zerar();
    const fora = pose(0.5, 0.12, { punhoD: { x: mx - 0.2, y: 0.45 } }); // 1,67 L para a direita do jogador
    expect(i.lerPoses([fora], 100).gestos).toEqual([]);
    i.lerPoses([peito], 200);
    expect(i.lerPoses([fora], 300).gestos).toEqual(['direita']);
  });
});

describe('modos Mão e Cabeça: virar de lado não gera escolha (v12.1.0)', () => {
  it('Mão: com a largura dos ombros abaixo de 50% da mediana recente, o gesto é ignorado', () => {
    const i = criarInterpretador('mao');
    let t = 0;
    for (let k = 0; k < 8; k++, t += 150) i.lerPoses([pose(0.5, 0.12, { punhoD: { x: 0.5, y: 0.45 } })], t); // armada
    const deLado = pose(0.5, 0.012, { punhoD: { x: 0.485, y: 0.45 } });
    const l = i.lerPoses([deLado], t);
    expect(l.gestos).toEqual([]);
    expect(l.inclinacao).toBe(0);
  });

  it('Cabeça: com as orelhas quase sobrepostas (de perfil), não escolhe', () => {
    const i = criarInterpretador('cabeca');
    let t = 0;
    for (let k = 0; k < 8; k++, t += 150) i.lerPoses([pose(0.5)], t);
    i.calibrar();
    const perfil = pose(0.5, 0.12, { orelhas: 0.004 });
    perfil[8] = { ...perfil[8]!, y: 0.225 };
    const g: Gesto[] = [];
    for (let k = 0; k < 4; k++, t += 150) g.push(...i.lerPoses([perfil], t).gestos);
    expect(g).toEqual([]);
  });
});
