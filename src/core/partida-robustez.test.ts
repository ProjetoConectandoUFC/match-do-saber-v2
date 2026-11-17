import { describe, expect, it } from 'vitest';
import { ESTADO_INICIAL, INTERFACES_JOGO, TEMPOS, reduzir, type Contexto, type Estado, type Evento, type Presenca } from './partida';
import type { Noticia, Veredito } from './types';

// v13.2.0 (FR-19): a mesma suíte nas duas interfaces.
describe.each(INTERFACES_JOGO)('interface %s', (iface) => {
  const n = (id: string, veredito: Veredito): Noticia => ({
    id, veredito, tecnica: 'fonte', titulo: id, descricao: '', saibaMais: '', imagem: '', tema: 'ciencia', explicacao: '', fonteUrl: '',
  });
  const ctx = (over: Partial<Contexto> = {}): Contexto => ({
    noticias: [n('v1', 'verdadeira'), n('f1', 'falsa')], rng: () => 0.5, cameraAtiva: true, interface: iface, ...over,
  });
  const centro: Presenca = { presente: true, centralizado: true };
  const lado: Presenca = { presente: true, centralizado: false };
  const ninguem: Presenca = { presente: false, centralizado: false };
  const tick = (dtMs: number, presenca: Presenca | null = centro): Evento => ({ tipo: 'tick', dtMs, presenca });
  const rodar = (s: Estado, ev: Evento[], c = ctx()) => ev.reduce((e, x) => reduzir(e, x, c), s);
  const calibracao = () => rodar(ESTADO_INICIAL, [{ tipo: 'enter' }]);
  /** Cartas (v13.0.0): a abertura do fan (AC-17.5) e a distribuição da carta (AC-17.6) vêm antes da carta pousada. */
  const POUSAR = iface === 'cartas' ? [tick(TEMPOS.aberturaFanMs), tick(TEMPOS.distribuirMs)] : [];
  const emCardCalibrado = (c = ctx()) => rodar(ESTADO_INICIAL, [{ tipo: 'enter' }, tick(1000), tick(1000), ...POUSAR], c);

  describe('AC-1.4 (v12.1.0): a calibração tem um tempo máximo', () => {
    it('TEMPOS.calibracaoMaxMs = 30 s', () => {
      expect(TEMPOS.calibracaoMaxMs).toBe(30000);
    });

    it('alguém fora do centro: ainda calibrando 1 ms antes; volta à espera em 30 s (fronteira)', () => {
      const passos = (total: number) => Array.from({ length: total / 500 }, () => tick(500, lado));
      const quase = rodar(calibracao(), [...passos(29500), tick(499, lado)]);
      expect(quase.tela).toBe('calibracao');
      expect(rodar(quase, [tick(1, lado)])).toEqual(ESTADO_INICIAL);
    });

    it('conta o tempo todo, mesmo alternando entre ausente, fora do centro e centrado por pouco', () => {
      const ciclo = [tick(5000, ninguem), tick(1500, centro), tick(3500, lado)]; // 10 s por ciclo, nunca completa
      const s = rodar(calibracao(), [...ciclo, ...ciclo, ...ciclo]);
      expect(s).toEqual(ESTADO_INICIAL);
    });

    it('completar antes de 30 s continua iniciando a partida (Cartas: pela abertura do fan, AC-17.5; Clássica: no card)', () => {
      const s = rodar(calibracao(), [tick(27000, lado), tick(1000), tick(1000)]);
      expect(s.tela).toBe(iface === 'cartas' ? 'abertura' : 'card');
    });
  });

  describe('AC-5.4 (v12.1.0): sair da ausência exige 500 ms contínuos de presença', () => {
    it('detecções soltas não zeram a tolerância: a partida encerra em 10 s mesmo com um quadro aqui e ali', () => {
      let s = emCardCalibrado();
      let t = 0;
      for (; t < 60000 && s.tela === 'card'; t += 150) {
        const presente = (t / 150) % 10 === 9; // 1 quadro em 10 com alguém
        s = reduzir(s, tick(150, presente ? lado : ninguem), ctx());
      }
      expect(s).toEqual(ESTADO_INICIAL);
      // Os quadros com alguém não contam como ausência, mas também não zeram: 10 s de ausência em ~11,1 s.
      expect(t).toBeLessThanOrEqual(11200);
    });

    it('fronteira: 499 ms de presença ainda é "Volte para o centro"; 500 ms retoma o mesmo card', () => {
      const s0 = rodar(emCardCalibrado(), [tick(1000), tick(4000, ninguem)]);
      expect(s0).toMatchObject({ tela: 'card', indice: 0, ausenteMs: 4000, restanteMs: 14000 });
      const quase = rodar(s0, [tick(499)]);
      expect(quase).toMatchObject({ tela: 'card', ausenteMs: 4000, restanteMs: 14000 });
      expect(rodar(quase, [tick(1)])).toMatchObject({ tela: 'card', indice: 0, ausenteMs: null, restanteMs: 14000 });
    });

    it('a presença interrompida recomeça a contagem dos 500 ms, sem zerar a ausência', () => {
      const s0 = rodar(emCardCalibrado(), [tick(4000, ninguem)]);
      const s = rodar(s0, [tick(400), tick(150, ninguem), tick(400)]);
      expect(s).toMatchObject({ tela: 'card', ausenteMs: 4150 });
      expect(rodar(s, [tick(100)])).toMatchObject({ ausenteMs: null });
    });

    it('o tempo além dos 500 ms do retorno volta a correr no cronômetro', () => {
      const s0 = rodar(emCardCalibrado(), [tick(4000, ninguem)]);
      expect(rodar(s0, [tick(1500)])).toMatchObject({ tela: 'card', ausenteMs: null, restanteMs: TEMPOS.cardMs - 1000 });
    });

    it('a tolerância conta só os quadros sem pessoa', () => {
      const s0 = rodar(emCardCalibrado(), [tick(9000, ninguem), tick(400), tick(999, ninguem)]);
      expect(s0).toMatchObject({ tela: 'card', ausenteMs: 9999 });
      expect(rodar(s0, [tick(1, ninguem)])).toEqual(ESTADO_INICIAL);
    });
  });
});
