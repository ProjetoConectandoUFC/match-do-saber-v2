import { describe, expect, it } from 'vitest';
import { ESTADO_INICIAL, TEMPOS, permanenciaConta, reduzir, type Contexto, type Estado, type Evento, type Presenca } from './partida';
import type { PerfilTutorial } from './tutorial';
import type { Noticia, Veredito } from './types';

// Integração v12.1.0 + v13.0.0: AC-2.13 (a permanência só começa com o card na tela) com AC-17.5/AC-17.6
// (abertura do fan e distribuição, em que nada é aceito). A carta só está "na tela" para escolher quando pousa.
const n = (id: string, veredito: Veredito): Noticia => ({
  id, veredito, tecnica: 'fonte', titulo: id, descricao: '', saibaMais: '', tema: 'ciencia', explicacao: '', fonteUrl: '',
});
const p = (id: string, veredito: Veredito): PerfilTutorial => ({
  id, nome: id, frase: '', veredito, explicacao: '', tecnica: 'imagem', tema: 'curiosidades',
});
const ctx = (over: Partial<Contexto> = {}): Contexto => ({
  noticias: [n('v1', 'verdadeira'), n('f1', 'falsa')], rng: () => 0.5, cameraAtiva: true, ...over,
});
const centro: Presenca = { presente: true, centralizado: true };
const tick = (dtMs: number): Evento => ({ tipo: 'tick', dtMs, presenca: centro });
const rodar = (s: Estado, ev: Evento[], c = ctx()) => ev.reduce((e, x) => reduzir(e, x, c), s);
const enter: Evento = { tipo: 'enter' };

describe('AC-2.13 + AC-17.6: a permanência do gesto só conta com a carta pousada', () => {
  it('não conta na espera, na calibração, na abertura do fan nem no feedback', () => {
    expect(permanenciaConta(ESTADO_INICIAL)).toBe(false);
    expect(permanenciaConta(rodar(ESTADO_INICIAL, [enter]))).toBe(false);
    const abertura = rodar(ESTADO_INICIAL, [enter, enter]);
    expect(abertura.tela).toBe('abertura');
    expect(permanenciaConta(abertura)).toBe(false);
    const pousada = rodar(abertura, [tick(TEMPOS.aberturaFanMs), tick(TEMPOS.distribuirMs)]);
    expect(permanenciaConta(rodar(pousada, [{ tipo: 'escolha', resposta: 'falsa' }]))).toBe(false);
  });

  it('fronteira: com a carta saindo do fan (899 ms) não conta; pousada (900 ms) conta', () => {
    const d = rodar(ESTADO_INICIAL, [enter, enter, tick(TEMPOS.aberturaFanMs)]);
    expect(d.tela).toBe('card');
    expect(permanenciaConta(rodar(d, [tick(TEMPOS.distribuirMs - 1)]))).toBe(false);
    expect(permanenciaConta(rodar(d, [tick(TEMPOS.distribuirMs)]))).toBe(true);
  });

  it('o treino segue a mesma regra (FR-16)', () => {
    const c = ctx({ tutorial: [p('t1', 'falsa')] });
    const d = rodar(ESTADO_INICIAL, [enter, enter, tick(TEMPOS.aberturaFanMs)], c);
    expect(d.tela).toBe('tutorial');
    expect(permanenciaConta(d)).toBe(false);
    expect(permanenciaConta(rodar(d, [tick(TEMPOS.distribuirMs)], c))).toBe(true);
  });
});
