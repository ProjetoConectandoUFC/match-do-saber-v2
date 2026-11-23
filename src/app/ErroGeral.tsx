import { Component, type ReactNode } from 'react';

/** Tempo até recarregar o jogo depois de um erro de tela (NFR Reliability, v12.1.0). */
export const RECARREGAR_MS = 5000;

interface Props {
  children: ReactNode;
  /** Só para teste; o padrão recarrega a página (nada da partida é guardado). */
  recarregar?: () => void;
}

/**
 * Erro de render vira uma mensagem e o jogo recarrega sozinho, em vez de tela branca
 * (NFR Reliability, v12.1.0). Erros fora do render (ex.: laço de quadros) são tratados em `useJogo`.
 */
export class ErroGeral extends Component<Props, { erro: boolean }> {
  state = { erro: false };
  private timer: ReturnType<typeof setTimeout> | undefined;

  static getDerivedStateFromError() {
    return { erro: true };
  }

  componentDidCatch(erro: unknown) {
    console.error('[match-do-saber] erro de tela; recarregando', erro);
    if (this.timer !== undefined) return;
    const recarregar = this.props.recarregar ?? (() => window.location.reload());
    this.timer = setTimeout(recarregar, RECARREGAR_MS);
  }

  componentWillUnmount() {
    clearTimeout(this.timer);
  }

  render() {
    if (!this.state.erro) return this.props.children;
    return (
      <div
        role="alert"
        style={{
          position: 'fixed', inset: 0, display: 'grid', placeItems: 'center', padding: '2rem', textAlign: 'center',
          background: 'var(--cn-noite, #002036)', color: 'var(--cn-creme, #fcfaf1)',
          font: '600 clamp(1.5rem, 3vw, 2.5rem) Poppins, system-ui, sans-serif',
        }}
      >
        <p>Algo deu errado — voltando ao início</p>
      </div>
    );
  }
}
