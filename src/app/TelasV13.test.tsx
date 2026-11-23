// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { Noticia, NoticiaBanco } from '../core/types';
import { EditorNoticia } from './EditorNoticia';
import { PainelQuestoes } from './PainelQuestoes';
import { TelaAbertura, TelaCard, TelaEspera } from './Telas';

const noticia = (extra: Partial<Noticia> = {}): Noticia => ({
  id: 'n1', titulo: 'Manchete da carta', descricao: 'Descrição curta', saibaMais: 'Texto do saiba mais', tema: 'historia',
  veredito: 'falsa', explicacao: 'Explicação', tecnica: 'fonte', fonteUrl: 'https://exemplo.org', ...extra,
});
const carta = (n: Noticia, extra: Partial<Parameters<typeof TelaCard>[0]> = {}) =>
  render(<TelaCard noticia={n} restanteMs={9000} saibaMais={false} ausente={false} pontos={0} cardRef={{ current: null }} onArrastar={() => {}} {...extra} />);
const face = (c: HTMLElement, qual: 'frente' | 'verso') => c.querySelector<HTMLElement>(`[data-face-carta="${qual}"]`);

describe('v13.0.0: a notícia é uma carta de baralho (AC-17.1)', () => {
  it('a carta é o único article, com a frente virada para cima', () => {
    const { container } = carta(noticia());
    const art = container.querySelector('article')!;
    expect(container.querySelectorAll('article')).toHaveLength(1);
    expect(art).toHaveAttribute('data-carta');
    expect(art).toHaveAttribute('data-face', 'frente');
    expect(art.contains(face(container, 'frente'))).toBe(true);
  });

  it('a frente tem a manchete, a janela da imagem e o naipe do tema nos dois cantos; sem descrição nem dica', () => {
    const { container } = carta(noticia({ imagem: 'content/img/n1.webp' }));
    const f = face(container, 'frente')!;
    expect(within(f).getByRole('heading', { level: 2, name: 'Manchete da carta' })).toBeInTheDocument();
    expect(f.querySelector('[data-janela] img')).toHaveAttribute('src', expect.stringContaining('content/img/n1.webp'));
    const naipes = [...f.querySelectorAll('[data-naipe]')];
    expect(naipes.map((x) => [x.getAttribute('data-naipe'), x.getAttribute('data-tema')])).toEqual([
      ['superior', 'historia'], ['inferior', 'historia'],
    ]);
    expect(f).not.toHaveTextContent('Descrição curta');
    expect(f).not.toHaveTextContent(/Saiba mais/);
  });

  it('sem imagem, a janela mostra a ilustração do tema, sem o chip com o nome (o naipe faz esse papel)', () => {
    const { container } = carta(noticia({ tema: 'meio-ambiente' }));
    const janela = face(container, 'frente')!.querySelector('[data-janela]')!;
    const ilu = within(janela as HTMLElement).getByRole('img', { name: 'Tema: Meio ambiente' });
    expect(ilu).toHaveAttribute('data-tema', 'meio-ambiente');
    expect(ilu).not.toHaveTextContent('Meio ambiente');
  });

  it('a dica de "saiba mais" fica fora da carta', () => {
    const { container } = carta(noticia());
    const dica = screen.getByText('Saiba mais: levante as duas mãos (ou ↑)');
    expect(container.querySelector('article')!.contains(dica)).toBe(false);
  });

  it('AC-2.12 (v13.0.0): não há mais a pilha parada atrás da carta', () => {
    const { container } = carta(noticia());
    expect(container.querySelectorAll('[data-pilha-camada]')).toHaveLength(0);
  });
});

describe('v13.0.0: o "saiba mais" vira a carta (AC-3.1, AC-3.6, AC-17.2)', () => {
  it('fechado, o verso existe (para a virada) mas fica escondido da leitura', () => {
    const { container } = carta(noticia());
    expect(face(container, 'verso')).toHaveAttribute('aria-hidden', 'true');
    expect(face(container, 'frente')).not.toHaveAttribute('aria-hidden', 'true');
  });

  it('aberto, a carta mostra o verso: faixa "Saiba mais", manchete menor, descrição e texto do saiba mais', () => {
    const { container } = carta(noticia(), { saibaMais: true });
    const art = container.querySelector('article')!;
    expect(art).toHaveAttribute('data-face', 'verso');
    expect(art.className).toMatch(/virada/);
    const v = face(container, 'verso')!;
    expect(v).not.toHaveAttribute('aria-hidden', 'true');
    expect(face(container, 'frente')).toHaveAttribute('aria-hidden', 'true');
    expect(within(v).getByText('Saiba mais')).toBeInTheDocument();
    expect(within(v).getByRole('heading', { level: 3, name: 'Manchete da carta' })).toBeInTheDocument();
    expect(within(v).getByText('Descrição curta')).toBeInTheDocument();
    expect(within(v).getByText('Texto do saiba mais')).toBeInTheDocument();
    expect([...v.querySelectorAll('[data-naipe]')].map((x) => x.getAttribute('data-naipe'))).toEqual(['superior', 'inferior']);
  });

  it('o carimbo fica fora das faces (não vira junto) e acende na saída, com o verso aberto também', () => {
    const { container } = carta(noticia(), { saibaMais: true, saida: 'direita' });
    const rotulo = container.querySelector('[data-rotulo-lado="verdade"]')!;
    expect(rotulo.className).toMatch(/carimbado/);
    expect(face(container, 'frente')!.contains(rotulo)).toBe(false);
    expect(face(container, 'verso')!.contains(rotulo)).toBe(false);
    expect(container.querySelector('article')!.contains(rotulo)).toBe(true);
  });

  it('AC-4.7: o pulso dos últimos 5 s fica na carta', () => {
    const { container } = carta(noticia(), { restanteMs: 3000 });
    expect(container.querySelector('article')!.className).toMatch(/pulsando/);
  });
});

describe('v13.1.0: carta de treino (AC-17.1, AC-15.6)', () => {
  const perfil = noticia({ id: 'treino-abacaxi', titulo: 'Abacaxi Perfeito, 19', descricao: 'CEO de mim mesmo.', saibaMais: '', tema: 'curiosidades' });
  it('mostra na frente, abaixo do nome, a frase do perfil, e não tem verso', () => {
    const { container } = carta(perfil, { treino: { passo: 0, total: 2, ilustracao: 'perfil-falso-abacaxi' } });
    const f = face(container, 'frente')!;
    const nome = within(f).getByRole('heading', { level: 2, name: 'Abacaxi Perfeito, 19' });
    const frase = within(f).getByText('CEO de mim mesmo.');
    expect(nome.compareDocumentPosition(frase) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(face(container, 'verso')).toBeNull();
    expect(screen.queryByText(/Saiba mais/)).toBeNull();
  });
  it('mesmo com saibaMais ligado por engano, o treino nunca vira', () => {
    const { container } = carta(perfil, { saibaMais: true, treino: { passo: 0, total: 2 } });
    expect(container.querySelector('article')).toHaveAttribute('data-face', 'frente');
  });
});

describe('AC-7.13 (v13.1.0): aviso de "saiba mais" longo no editor e no painel Questões', () => {
  const banco = (saiba: string): NoticiaBanco => ({
    id: 'mds-0001', titulo: 'Título', descricao: 'Descrição', saiba_mais: saiba, veredito: 'falsa', explicacao: 'Explicação',
    tecnica: 'fonte', tema: 'saude', fonte_url: 'https://www.exemplo.org/a', fontes_extras: '', imagem: '', revisado_por: 'Ana',
    status: 'aprovada', dificuldade: '', titulo_curto: '', fonte_nome: '', visivel: '',
  });
  const AVISO = 'Saiba mais longo: 300 de 250 caracteres; no verso da carta a letra fica menor';

  it('editor: avisa sem marcar o campo como inválido e sem travar o Salvar', () => {
    const { container } = render(
      <EditorNoticia inicial={banco('x'.repeat(300))} nova={false} problemas={{}} salvando={false} onSalvar={() => {}} onCancelar={() => {}} />,
    );
    expect(screen.getByText(AVISO)).toBeInTheDocument();
    expect(container.querySelector('#ed-saiba_mais')).toHaveAttribute('aria-invalid', 'false');
    expect(container.querySelector('[data-campo="saiba_mais"]')).not.toHaveAttribute('data-erro');
    expect(screen.getByRole('button', { name: 'Salvar' })).toBeEnabled();
  });
  it('editor: com até 250 caracteres, nenhum aviso', () => {
    render(<EditorNoticia inicial={banco('x'.repeat(250))} nova={false} problemas={{}} salvando={false} onSalvar={() => {}} onCancelar={() => {}} />);
    expect(screen.queryByText(/Saiba mais longo/)).toBeNull();
  });
  it('painel Questões: a questão aberta mostra o aviso e continua jogável', () => {
    render(
      <PainelQuestoes
        estado={{ banco: [banco('x'.repeat(300))], arquivo: '', versao: 'v1' }}
        onFechar={() => {}}
        revisor=""
        onRevisor={() => {}}
      />,
    );
    const q = within(screen.getByRole('region', { name: 'Questão aberta' }));
    expect(q.getByText(AVISO)).toBeInTheDocument();
    expect(q.getByText('Entra nas partidas')).toBeInTheDocument();
  });
});

describe('Fase 48: o fan na tela (AC-17.3 a AC-17.6, FR-18)', () => {
  const fanDe = (c: HTMLElement) => c.querySelector<HTMLElement>('[data-fan]');
  const nCartas = (c: HTMLElement) => c.querySelectorAll('[data-fan-carta]').length;

  it('AC-17.3: atrás da carta pousada há um fan com as cartas que faltam, antes da mesa (a carta fica na frente)', () => {
    const { container } = carta(noticia(), { cartasNoFan: 6 });
    const fan = fanDe(container)!;
    expect(fan).toHaveAttribute('data-fan-fase', 'parado');
    expect(nCartas(container)).toBe(6);
    const mesa = container.querySelector('[data-mesa]')!;
    expect(fan.compareDocumentPosition(mesa) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(mesa.contains(fan)).toBe(false);
  });

  it('AC-17.6: distribuindo, a carta sai do fan pelo verso; sem dica de "saiba mais"; barra cheia', () => {
    const { container } = carta(noticia(), { cartasNoFan: 5, distribuindoMs: 600, restanteMs: 15000, totalMs: 15000 });
    expect(fanDe(container)).toHaveAttribute('data-fan-fase', 'distribuindo');
    expect(nCartas(container)).toBe(5);
    const art = container.querySelector('article')!;
    expect(art).toHaveAttribute('data-distribuindo');
    expect(art.querySelector('[data-face-carta="fan"] img')).toBeInTheDocument();
    expect(screen.queryByText('Saiba mais: levante as duas mãos (ou ↑)')).toBeNull();
    expect(screen.getByText('15 s')).toBeInTheDocument();
  });

  it('pousada, a carta não tem mais a face do fan', () => {
    const { container } = carta(noticia(), { cartasNoFan: 5, distribuindoMs: 0 });
    expect(container.querySelector('article')).not.toHaveAttribute('data-distribuindo');
    expect(container.querySelector('[data-face-carta="fan"]')).toBeNull();
  });

  it('o treino também sai do fan (AC-15.2, v13.0.0)', () => {
    const { container } = carta(noticia({ id: 'treino-caju' }), { treino: { passo: 0, total: 2 }, cartasNoFan: 6, distribuindoMs: 900 });
    expect(fanDe(container)).toHaveAttribute('data-fan-fase', 'distribuindo');
  });

  it('sem `cartasNoFan` (fora da partida de cartas), não há fan', () => {
    const { container } = carta(noticia());
    expect(fanDe(container)).toBeNull();
  });

  it('AC-17.5: a abertura mostra o fan com todas as cartas abrindo, sem cronômetro, sem placar e sem carta', () => {
    const { container } = render(<TelaAbertura cartas={12} restanteMs={1000} />);
    expect(fanDe(container)).toHaveAttribute('data-fan-fase', 'abrindo');
    expect(nCartas(container)).toBe(12);
    expect(screen.queryByRole('timer')).toBeNull();
    expect(screen.queryByText(/Pontos/)).toBeNull();
    expect(container.querySelector('article')).toBeNull();
    expect(screen.getByText('Mentira')).toBeInTheDocument(); // as laterais já estão no lugar
    expect(screen.getByText('Verdade')).toBeInTheDocument();
  });

  it('AC-17.4: a espera tem o fan respirando', () => {
    const { container } = render(<TelaEspera semNoticias={false} camera="ativa" />);
    expect(fanDe(container)).toHaveAttribute('data-fan-fase', 'respirando');
    expect(fanDe(container)).toHaveAttribute('data-fan-lugar', 'espera');
  });

  it('a espera da interface clássica (cartas={false}) não tem fan (teste A/B)', () => {
    const { container } = render(<TelaEspera semNoticias={false} camera="ativa" cartas={false} />);
    expect(fanDe(container)).toBeNull();
  });
});
