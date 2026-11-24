import { describe, expect, it } from 'vitest';
import { criarInterpretador } from './gestos';
import { lerDeteccaoFalsa, poseFalsa } from './deteccaoFalsa';

// FR-20 / NFR Performance (v13.3.0, Fase 52.1): detecção falsa e lenta, só para medir a cadência da tela em E2E.
describe('detecção falsa (Fase 52.1)', () => {
  it('lê a configuração injetada pelo teste; sem ela (ou inválida), não há detecção falsa', () => {
    expect(lerDeteccaoFalsa({})).toBeNull();
    expect(lerDeteccaoFalsa({ __mdsDeteccaoFalsa: { ms: 60 } })).toEqual({ ms: 60, onde: 'worker' });
    expect(lerDeteccaoFalsa({ __mdsDeteccaoFalsa: { ms: 60, onde: 'principal' } })).toEqual({ ms: 60, onde: 'principal' });
    expect(lerDeteccaoFalsa({ __mdsDeteccaoFalsa: { ms: -1 } })).toBeNull();
    expect(lerDeteccaoFalsa({ __mdsDeteccaoFalsa: 'x' })).toBeNull();
  });

  it('a pose falsa é uma pessoa de frente, no centro, que não gera gesto', () => {
    const pose = poseFalsa();
    expect(pose).toHaveLength(33);
    const interp = criarInterpretador('corpo');
    for (let t = 0; t < 3000; t += 66) {
      const l = interp.lerPoses([poseFalsa()], t);
      expect(l.gestos).toEqual([]);
      expect(l.presenca).toEqual({ presente: true, centralizado: true });
    }
  });
});
