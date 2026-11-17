import type { Som } from '../core/sons';

interface Nota { freq: number; ate?: number; duracao: number; tipo: OscillatorType; volume: number; atraso?: number }

/** Sons de notas; a `carta` (ruído) é sintetizada à parte, em `tocarPapel`. */
const SONS: Record<Exclude<Som, 'carta'>, Nota[]> = {
  deslizar: [{ freq: 900, ate: 300, duracao: 0.18, tipo: 'sine', volume: 0.15 }],
  acerto: [
    { freq: 660, duracao: 0.12, tipo: 'triangle', volume: 0.2 },
    { freq: 990, duracao: 0.2, tipo: 'triangle', volume: 0.2, atraso: 0.1 },
  ],
  erro: [{ freq: 220, ate: 140, duracao: 0.35, tipo: 'sawtooth', volume: 0.12 }],
  // Vinheta do resumo (AC-11.6, v11.0.0): sempre em dó maior, crescendo com a faixa; de 1 a 1,5 s, nunca triste.
  fim1: [
    { freq: 392, duracao: 0.32, tipo: 'triangle', volume: 0.18 }, // sol: "quase…"
    { freq: 523.25, duracao: 0.7, tipo: 'triangle', volume: 0.18, atraso: 0.3 }, // dó: "…lá"
  ],
  fim2: [
    { freq: 523.25, duracao: 0.3, tipo: 'triangle', volume: 0.17 },
    { freq: 659.25, duracao: 0.3, tipo: 'triangle', volume: 0.17, atraso: 0.18 },
    { freq: 783.99, duracao: 0.75, tipo: 'triangle', volume: 0.17, atraso: 0.36 },
  ],
  fim3: [
    { freq: 523.25, duracao: 0.25, tipo: 'triangle', volume: 0.16 },
    { freq: 659.25, duracao: 0.25, tipo: 'triangle', volume: 0.16, atraso: 0.15 },
    { freq: 783.99, duracao: 0.25, tipo: 'triangle', volume: 0.16, atraso: 0.3 },
    { freq: 1046.5, duracao: 0.8, tipo: 'triangle', volume: 0.16, atraso: 0.45 },
  ],
  // "Tcharam": subida rápida, acorde final e um brilho agudo por cima.
  fim4: [
    { freq: 392, duracao: 0.13, tipo: 'square', volume: 0.07 },
    { freq: 523.25, duracao: 0.13, tipo: 'square', volume: 0.07, atraso: 0.12 },
    { freq: 659.25, duracao: 0.13, tipo: 'square', volume: 0.07, atraso: 0.24 },
    { freq: 783.99, duracao: 0.2, tipo: 'square', volume: 0.07, atraso: 0.36 },
    { freq: 523.25, duracao: 0.85, tipo: 'triangle', volume: 0.12, atraso: 0.55 },
    { freq: 659.25, duracao: 0.85, tipo: 'triangle', volume: 0.12, atraso: 0.55 },
    { freq: 783.99, duracao: 0.85, tipo: 'triangle', volume: 0.12, atraso: 0.55 },
    { freq: 1046.5, duracao: 0.85, tipo: 'triangle', volume: 0.12, atraso: 0.55 },
    { freq: 1318.5, duracao: 0.18, tipo: 'sine', volume: 0.1, atraso: 1.0 },
    { freq: 1568, duracao: 0.35, tipo: 'sine', volume: 0.1, atraso: 1.12 },
  ],
};

/**
 * "Fff" de papel de uma carta saindo do fan (AC-17.8, v13.0.0): ruído branco curto num passa-faixa que sobe de 2,5 a
 * 5 kHz, com ataque rápido e queda exponencial. Gerado no próprio jogo, sem arquivo de áudio.
 */
const PAPEL = { duracao: 0.14, volume: 0.22, de: 2500, ate: 5000, q: 0.9 };

function tocarPapel(c: AudioContext, fator: number) {
  const quadros = Math.max(1, Math.floor(c.sampleRate * PAPEL.duracao));
  const buffer = c.createBuffer(1, quadros, c.sampleRate);
  const dados = buffer.getChannelData(0);
  for (let i = 0; i < quadros; i++) dados[i] = Math.random() * 2 - 1;
  const inicio = c.currentTime;
  const fonte = c.createBufferSource();
  fonte.buffer = buffer;
  const filtro = c.createBiquadFilter();
  filtro.type = 'bandpass';
  filtro.Q.value = PAPEL.q;
  filtro.frequency.setValueAtTime(PAPEL.de, inicio);
  filtro.frequency.exponentialRampToValueAtTime(PAPEL.ate, inicio + PAPEL.duracao);
  const ganho = c.createGain();
  ganho.gain.setValueAtTime(PAPEL.volume * fator, inicio);
  ganho.gain.exponentialRampToValueAtTime(0.001, inicio + PAPEL.duracao);
  fonte.connect(filtro);
  filtro.connect(ganho);
  ganho.connect(c.destination);
  fonte.start(inicio);
  fonte.stop(inicio + PAPEL.duracao);
}

/** `fator`: volume dos Ajustes (AC-9.29): 1 = Alto (como antes), 0,6 = Médio, 0,3 = Baixo. */
export interface Tocador { tocar(som: Som, fator?: number): void; desbloquear(): void }

export function criarTocador(): Tocador {
  let ctx: AudioContext | null = null;
  const obter = (): AudioContext | null => {
    if (ctx) return ctx;
    const C = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!C) return null;
    try {
      ctx = new C();
    } catch {
      return null;
    }
    return ctx;
  };
  return {
    // O navegador só libera o áudio depois de uma interação (clique ou tecla).
    desbloquear() {
      const c = obter();
      if (c?.state === 'suspended') c.resume().catch(() => {});
    },
    tocar(som, fator = 1) {
      const c = obter();
      if (!c) return;
      if (som === 'carta') {
        // O som é enfeite: um navegador sem algum nó de áudio não pode derrubar a partida (FR-11).
        try {
          tocarPapel(c, fator);
        } catch {
          /* sem som de carta */
        }
        return;
      }
      for (const n of SONS[som]) {
        const inicio = c.currentTime + (n.atraso ?? 0);
        const osc = c.createOscillator();
        const ganho = c.createGain();
        osc.type = n.tipo;
        osc.frequency.setValueAtTime(n.freq, inicio);
        if (n.ate) osc.frequency.exponentialRampToValueAtTime(n.ate, inicio + n.duracao);
        ganho.gain.setValueAtTime(n.volume * fator, inicio);
        ganho.gain.exponentialRampToValueAtTime(0.001, inicio + n.duracao);
        osc.connect(ganho);
        ganho.connect(c.destination);
        osc.start(inicio);
        osc.stop(inicio + n.duracao);
      }
    },
  };
}
