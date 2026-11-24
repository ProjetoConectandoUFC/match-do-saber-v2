// @vitest-environment jsdom
// FR-20 (v13.3.0, Fase 52.5): o que não depende do tempo não re-renderiza a cada tick (a barra de tempo muda; o fan
// parado, as faces da carta e as ilustrações não).
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Noticia } from '../core/types';

const contagem = vi.hoisted(() => ({ fan: 0, ilustracao: 0 }));
vi.mock('../core/fan', async (original) => {
  const real = await original<typeof import('../core/fan')>();
  return { ...real, cartasDesenhadas: (n: number) => { contagem.fan++; return real.cartasDesenhadas(n); } };
});
vi.mock('./ilustracoes', async (original) => {
  const real = await original<typeof import('./ilustracoes')>();
  return { ...real, ilustracaoDaNoticia: (id: string) => { contagem.ilustracao++; return real.ilustracaoDaNoticia(id); } };
});
import { TelaCardClassico } from './CardClassico';
import { CameraPreview } from './CameraPreview';
import { PainelDiagnostico } from './PainelDiagnostico';
import { BotaoSair, TelaCard, TelaFeedback, TelaResumo } from './Telas';

const noticia: Noticia = {
  id: 'n1', titulo: 'Manchete', descricao: 'Descrição', saibaMais: 'Mais', tema: 'historia',
  veredito: 'falsa', explicacao: 'Explicação', tecnica: 'fonte', fonteUrl: 'https://exemplo.org',
};
const cardRef = { current: null };
const onArrastar = () => {};

describe('re-render por tick (FR-20)', () => {
  it('Cartas: a cada tick só a barra muda; fan parado, faces e ilustração não re-renderizam', () => {
    const props = { noticia, saibaMais: false, ausente: false, pontos: 0, cardRef, onArrastar, cartasNoFan: 5 };
    const { rerender, getByRole } = render(<TelaCard {...props} restanteMs={9000} />);
    const [fan, ilustracao] = [contagem.fan, contagem.ilustracao];
    for (let t = 8984; t > 8900; t -= 16) rerender(<TelaCard {...props} restanteMs={t} />);
    expect(contagem.fan).toBe(fan);
    expect(contagem.ilustracao).toBe(ilustracao);
    expect(getByRole('timer', { name: 'Tempo restante' })).toBeInTheDocument();
  });

  it('Clássica: a ilustração do card não re-renderiza a cada tick', () => {
    const props = { noticia, saibaMais: false, ausente: false, pontos: 0, cardRef, onArrastar };
    const { rerender } = render(<TelaCardClassico {...props} restanteMs={9000} />);
    const antes = contagem.ilustracao;
    for (let t = 8984; t > 8900; t -= 16) rerender(<TelaCardClassico {...props} restanteMs={t} />);
    expect(contagem.ilustracao).toBe(antes);
  });

  it('feedback, resumo, botão Sair, prévia da câmera e Diagnóstico são memorizados (props iguais, sem re-render)', () => {
    for (const c of [TelaFeedback, TelaResumo, BotaoSair, CameraPreview, PainelDiagnostico]) {
      expect((c as unknown as { $$typeof: symbol }).$$typeof).toBe(Symbol.for('react.memo'));
    }
  });
});
