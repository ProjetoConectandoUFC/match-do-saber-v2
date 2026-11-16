import { useEffect } from 'react';

interface Trava { release(): Promise<void> }
type ComWakeLock = Navigator & { wakeLock?: { request(tipo: 'screen'): Promise<Trava> } };

/**
 * Mantém a tela acordada enquanto o jogo está aberto (NFR Reliability, v12.1.0), onde o navegador tiver
 * Wake Lock. O navegador solta a trava quando a página fica oculta; ela é pedida de novo quando volta.
 * Recusas são ignoradas. No app de desktop, o Electron também segura o repouso (`powerSaveBlocker`).
 */
export function useTelaAcordada() {
  useEffect(() => {
    const wakeLock = (navigator as ComWakeLock).wakeLock;
    if (!wakeLock?.request) return;
    let ativo = true;
    let trava: Trava | null = null;
    const pedir = async () => {
      try {
        const t = await wakeLock.request('screen');
        if (ativo) {
          const anterior = trava;
          trava = t;
          void anterior?.release().catch(() => {});
        }
        else void t.release().catch(() => {});
      } catch { /* sem permissão, bateria fraca ou página oculta: segue sem trava */ }
    };
    const aoMudar = () => { if (document.visibilityState === 'visible') void pedir(); };
    void pedir();
    document.addEventListener('visibilitychange', aoMudar);
    return () => {
      ativo = false;
      document.removeEventListener('visibilitychange', aoMudar);
      void trava?.release().catch(() => {});
    };
  }, []);
}
