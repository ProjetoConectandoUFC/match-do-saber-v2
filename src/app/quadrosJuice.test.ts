import { describe, expect, it } from 'vitest';
import { INTENSIDADES, JUICE, TETO_SEQUENCIA, juiceDaSequencia } from '../core/juice';
import { TEMPOS } from '../core/partida';
import {
  IMPACTO_MS, efeitoCarimbo, efeitoEntradaTexto, efeitoLetra, efeitoNao, efeitoPop, efeitoSaida, efeitoTremida,
  gotasRespingo, liberacaoMs, particulasConfete, propriedadesAnimadas, type Quadros,
} from './quadrosJuice';

// v13.4.0 (Story 19, FR-21, Fases 54.3 a 54.5): os limites da spec conferidos nos quadros-chave, sem navegador.
const numeros = (t: string, nome: string) =>
  [...t.matchAll(new RegExp(`${nome}\\(([^)]*)\\)`, 'g'))].flatMap((m) => m[1]!.split(',').map((v) => parseFloat(v)));
const maxAbs = (quadros: Quadros, nome: string, i = 0) =>
  Math.max(0, ...quadros.map((q) => Math.abs(numeros(String(q.transform ?? ''), nome)[i] ?? 0)));
const todos = (p = juiceDaSequencia('alta', TETO_SEQUENCIA)) => [
  efeitoCarimbo(p), efeitoTremida(p), efeitoNao(p), efeitoPop(p.popEscala, 0), efeitoPop(p.popEscala, 0, true), efeitoLetra(p, 3),
  efeitoEntradaTexto(p), efeitoSaida(p, 'direita', true), efeitoSaida(p, 'esquerda', false),
  ...particulasConfete(p), ...gotasRespingo(p, 300, 70),
];

describe('FR-21: só transform e opacity, em todas as intensidades', () => {
  it.each(INTENSIDADES)('%s', (i) => {
    for (const e of todos(juiceDaSequencia(i, TETO_SEQUENCIA))) {
      if (!e) continue;
      for (const prop of propriedadesAnimadas(e.quadros)) expect(['transform', 'opacity']).toContain(prop);
    }
  });
});

describe('AC-19.8: Desligada não gera nenhum efeito', () => {
  it('nenhum quadro', () => {
    expect(todos(juiceDaSequencia('desligada', TETO_SEQUENCIA)).filter(Boolean)).toEqual([]);
  });
});

describe('AC-19.2: carimbo, hit-stop e tremida', () => {
  it('o carimbo afunda (passa do tamanho para baixo), fica parado o hit-stop, passa para cima na mola e assenta em 1', () => {
    const p = JUICE.media;
    const e = efeitoCarimbo(p)!;
    const escalas = e.quadros.map((q) => numeros(String(q.transform), 'scale')[0]!);
    expect(Math.min(...escalas)).toBeCloseTo(1 / p.carimboOvershoot, 2);
    expect(Math.max(...escalas)).toBeGreaterThan(1.02);
    expect(escalas.at(-1)).toBe(1);
    expect(e.quadros[1]!.transform).toBe(e.quadros[2]!.transform); // parado durante o hit-stop
    const parado = (Number(e.quadros[2]!.offset) - Number(e.quadros[1]!.offset)) * Number(e.opcoes.duration);
    expect(parado).toBeCloseTo(p.hitStopMs, 0);
    expect(e.opcoes.delay).toBe(IMPACTO_MS); // começa quando a queda (CSS) chega ao papel
    expect(IMPACTO_MS).toBeLessThan(TEMPOS.carimboMs);
  });

  it('a tremida decai, termina em 0 e respeita os tetos: Baixa 0, Média ≤ 6 px, Alta ≤ 12 px, ≤ 300 ms', () => {
    expect(efeitoTremida(juiceDaSequencia('baixa', TETO_SEQUENCIA))).toBeNull();
    for (const [i, teto] of [['media', 6], ['alta', 12]] as const) {
      for (let n = 0; n <= 8; n++) {
        const e = efeitoTremida(juiceDaSequencia(i, n))!;
        expect(maxAbs(e.quadros, 'translate', 0)).toBeLessThanOrEqual(teto);
        expect(maxAbs(e.quadros, 'translate', 1)).toBeLessThanOrEqual(teto);
        expect(Number(e.opcoes.duration)).toBeLessThanOrEqual(300);
        expect(e.quadros.at(-1)!.transform).toBe('translate(0px, 0px) rotate(0deg)');
        // decai: a segunda metade nunca passa da maior amplitude da primeira
        const metade = Math.floor(e.quadros.length / 2);
        expect(maxAbs(e.quadros.slice(metade), 'translate')).toBeLessThan(maxAbs(e.quadros.slice(0, metade), 'translate'));
      }
    }
  });

  it('a tremida cresce com a sequência até o teto em N = 5', () => {
    const amp = (n: number) => maxAbs(efeitoTremida(juiceDaSequencia('alta', n))!.quadros, 'translate');
    expect(amp(3)).toBeGreaterThan(amp(1));
    expect(amp(5)).toBeGreaterThan(amp(3));
    expect(amp(9)).toBe(amp(5));
  });

  it('tudo o que é consequência do golpe sai na liberação (fim do hit-stop)', () => {
    const p = JUICE.media;
    const lib = liberacaoMs(p);
    expect(efeitoTremida(p)!.opcoes.delay).toBe(lib);
    expect(particulasConfete(p)[0]!.opcoes.delay).toBe(lib);
    expect(gotasRespingo(p, 300, 70)[0]!.opcoes.delay).toBe(lib);
  });

  it('o respingo tem as gotas da intensidade e some sozinho', () => {
    expect(gotasRespingo(JUICE.baixa, 300, 70)).toHaveLength(JUICE.baixa.respingoGotas);
    expect(gotasRespingo(JUICE.alta, 300, 70)).toHaveLength(JUICE.alta.respingoGotas);
    for (const g of gotasRespingo(JUICE.alta, 300, 70)) expect(g.quadros.at(-1)!.opacity).toBe(0);
  });

  it('a carta para no golpe (hit-stop) e voa no que sobra da saída: a saída não fica mais longa; no erro, amassa', () => {
    for (const i of ['baixa', 'media', 'alta'] as const) {
      const p = JUICE[i];
      const e = efeitoSaida(p, 'direita', false)!;
      expect(e.opcoes.duration).toBe(TEMPOS.saidaMs);
      expect(Number(e.quadros[2]!.offset) * TEMPOS.saidaMs).toBeCloseTo(p.hitStopMs, 0);
      expect(e.quadros[1]!.transform).toBe(e.quadros[2]!.transform);
      expect(String(e.quadros.at(-1)!.transform)).toContain('translateX(120vw)');
      const erro = efeitoSaida(p, 'esquerda', true)!;
      expect(String(erro.quadros[2]!.transform)).toContain(`scale(${p.amassarEscala})`);
      expect(String(erro.quadros.at(-1)!.transform)).toContain('translateX(-120vw)');
    }
  });
});

describe('AC-19.3: acerto', () => {
  it('confete: nenhum em Baixa; some em ≤ 1,2 s; cresce com a sequência até o teto', () => {
    expect(particulasConfete(JUICE.baixa)).toEqual([]);
    for (const i of ['media', 'alta'] as const) {
      for (const c of particulasConfete(juiceDaSequencia(i, TETO_SEQUENCIA))) {
        expect(Number(c.opcoes.duration)).toBeLessThanOrEqual(1200);
        expect(c.quadros.at(-1)!.opacity).toBe(0);
      }
    }
    const n = (s: number) => particulasConfete(juiceDaSequencia('alta', s)).length;
    expect(n(1)).toBeLessThan(n(3));
    expect(n(3)).toBeLessThan(n(5));
    expect(n(5)).toBe(JUICE.alta.confetes);
    expect(n(8)).toBe(n(5));
  });

  it('letras em cascata com overshoot (passam do tamanho e voltam); a cascata é o atraso por letra', () => {
    const p = JUICE.media;
    const e = efeitoLetra(p, 4)!;
    expect(e.opcoes.delay).toBe(4 * p.cascataPassoMs);
    expect(Math.max(...e.quadros.map((q) => numeros(String(q.transform ?? ''), 'scale')[0] ?? 0))).toBeGreaterThan(1.1);
    expect(e.quadros.at(-1)!.transform).toContain('scale(1)');
  });

  it('pop: passa da escala e volta a 1; sem pop quando a escala é 1', () => {
    const e = efeitoPop(1.3, 100)!;
    expect(Math.max(...e.quadros.map((q) => numeros(String(q.transform), 'scale')[0]!))).toBe(1.3);
    expect(e.quadros.at(-1)!.transform).toBe('scale(1)');
    expect(efeitoPop(1, 0)).toBeNull();
  });
});

describe('AC-19.4: erro e tempo esgotado', () => {
  it('o "não" balança na horizontal, amortecido, ≤ 400 ms, sem passar da amplitude, e termina parado', () => {
    for (const i of ['baixa', 'media', 'alta'] as const) {
      const p = JUICE[i];
      const e = efeitoNao(p)!;
      expect(Number(e.opcoes.duration)).toBeLessThanOrEqual(400);
      expect(maxAbs(e.quadros, 'translateX')).toBeLessThanOrEqual(p.naoPx);
      expect(e.quadros.at(-1)!.transform).toBe('translateX(0px) rotate(0deg) scale(1)');
      const xs = e.quadros.map((q) => numeros(String(q.transform), 'translateX')[0]!);
      expect(xs.some((x) => x > 0) && xs.some((x) => x < 0)).toBe(true); // vai e volta
    }
  });
});

describe('AC-19.7: o texto a ler entra depois da tremida e fica parado', () => {
  it('a entrada da explicação começa depois de 70% da tremida e não tem overshoot', () => {
    const p = JUICE.alta;
    const e = efeitoEntradaTexto(p)!;
    expect(Number(e.opcoes.delay)).toBeGreaterThanOrEqual(liberacaoMs(p) + p.tremidaMs * 0.7);
    expect(e.quadros).toHaveLength(2);
    expect(e.quadros.at(-1)).toMatchObject({ transform: 'translateY(0px)', opacity: 1 });
  });

  it('sem tremida (Baixa), a explicação aparece já no lugar', () => {
    expect(efeitoEntradaTexto(JUICE.baixa)).toBeNull();
  });
});
