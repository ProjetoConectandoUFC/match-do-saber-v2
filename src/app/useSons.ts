import { useEffect, useMemo, useRef } from 'react';
import type { Intensidade } from '../core/juice';
import type { Estado } from '../core/partida';
import { toquesATocar } from '../core/sons';
import { criarTocador } from './audio';

/**
 * Toca os sons de FR-11 a cada transição de estado, se `ligado`, no volume dos Ajustes (`fator`, AC-9.29). Com a
 * `intensidade` efetiva dos efeitos acima de Desligada (v13.4.0, AC-19.2, AC-19.5), o baque do carimbo e o acerto que
 * sobe com a sequência; sem ela, Desligada (os sons da v13.3.0).
 */
export function useSons(estado: Estado, ligado: boolean, fator = 1, intensidade: Intensidade = 'desligada') {
  const tocador = useMemo(criarTocador, []);
  const anterior = useRef(estado);

  useEffect(() => {
    const desbloquear = () => tocador.desbloquear();
    window.addEventListener('pointerdown', desbloquear, { capture: true });
    window.addEventListener('keydown', desbloquear, { capture: true });
    return () => {
      window.removeEventListener('pointerdown', desbloquear, { capture: true });
      window.removeEventListener('keydown', desbloquear, { capture: true });
    };
  }, [tocador]);

  useEffect(() => {
    const toques = toquesATocar(anterior.current, estado, { somLigado: ligado, intensidade });
    anterior.current = estado;
    for (const t of toques) tocador.tocar(t.som, fator, t.semitons);
  }, [estado, ligado, fator, intensidade, tocador]);
}
