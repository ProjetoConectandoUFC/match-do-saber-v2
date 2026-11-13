import { useEffect, useRef, useState } from 'react';
import { indiceFoto } from '../core/foto';
import type { Estado } from '../core/partida';

/**
 * Foto do resumo (FR-13): um quadro tirado no feedback do card do meio (AC-13.1), guardado só em estado React
 * e apagado na espera, na calibração, na abertura do fan (v13.0.0), no treino (v10.2.0) e no card 0 de uma nova partida (AC-13.4).
 * `T` é a foto com as âncoras do rosto (AC-13.6): um objeto só, apagado inteiro (AC-13.7).
 */
export function useFotoPartida<T = string>(estado: Estado, ligada: boolean, capturar: () => T | null): T | null {
  const [foto, setFoto] = useState<T | null>(null);
  const capturarRef = useRef(capturar);
  capturarRef.current = capturar;
  const indice = 'indice' in estado ? estado.indice : -1;
  // Reage só à troca de tela/card, não a cada tick do mesmo estado.
  useEffect(() => {
    const novaPartida = estado.tela === 'espera' || estado.tela === 'calibracao' || estado.tela === 'abertura' || estado.tela === 'tutorial'
      || (estado.tela === 'card' && estado.indice === 0);
    if (novaPartida) setFoto(null);
    else if (estado.tela === 'feedback' && ligada && estado.indice === indiceFoto(estado.partida.cards.length)) setFoto(capturarRef.current());
  }, [estado.tela, indice]);
  return foto;
}
