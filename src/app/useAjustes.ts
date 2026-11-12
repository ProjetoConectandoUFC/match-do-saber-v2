import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  PAINEL_INICIAL, itensDoPainel, lerAjustes, salvarAjustes, teclaNoPainel, type Ajustes, type Armazenamento, type PainelAjustes,
} from '../core/ajustes';

function armazenamentoDoNavegador(): Armazenamento | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/**
 * Ajustes do estande (FR-9, v12.0.0). `podeAbrir` diz se o jogo está na tela de espera sem outro painel aberto.
 * `revisarQuestoes`: o item "Revisar questões" só aparece quando o painel Questões existe (Fase 44).
 */
export function useAjustes(podeAbrir: () => boolean, { revisarQuestoes = false, onRevisar = () => {} }: {
  revisarQuestoes?: boolean;
  onRevisar?: () => void;
} = {}) {
  const armazenamento = useMemo(armazenamentoDoNavegador, []);
  const [ajustes, setAjustes] = useState<Ajustes>(() => lerAjustes(armazenamento));
  const [aberto, setAberto] = useState(false);
  const [painel, setPainel] = useState<PainelAjustes>(PAINEL_INICIAL);
  const itens = useMemo(() => itensDoPainel(revisarQuestoes), [revisarQuestoes]);

  const fechar = useCallback(() => { setAberto(false); setPainel(PAINEL_INICIAL); }, []);
  const abrir = useCallback(() => {
    if (podeAbrir()) { setPainel(PAINEL_INICIAL); setAberto(true); }
  }, [podeAbrir]);
  const definir = useCallback((a: Ajustes) => {
    setAjustes(a);
    salvarAjustes(armazenamento, a);
  }, [armazenamento]);
  const confirmarRestauro = useCallback((confirmar: boolean) => setPainel((p) => ({ ...p, confirmarRestauro: confirmar })), []);
  const revisarRef = useRef(onRevisar);
  revisarRef.current = onRevisar;
  const revisar = useCallback(() => { fechar(); revisarRef.current(); }, [fechar]); // AC-9.31

  // Captura no window: com o painel aberto, nenhuma tecla chega ao jogo (Enter não inicia, Esc não "sai").
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (!aberto) {
        if ((e.key === 'm' || e.key === 'M') && podeAbrir()) { e.preventDefault(); abrir(); }
        return;
      }
      // Clique num botão do painel com Espaço/Enter: o teclado do painel decide, não o botão em foco.
      e.preventDefault();
      e.stopImmediatePropagation();
      const r = teclaNoPainel(painel, ajustes, e.key, itens);
      if (r.fechar) return fechar();
      if (r.revisar) return revisar();
      setPainel(r.painel);
      if (r.ajustes) definir(r.ajustes);
    };
    window.addEventListener('keydown', tecla, { capture: true });
    return () => window.removeEventListener('keydown', tecla, { capture: true });
  }, [aberto, painel, ajustes, itens, podeAbrir, abrir, fechar, definir, revisar]);

  return { ajustes, aberto, painel, itens, abrir, fechar, definir, confirmarRestauro, revisar };
}
