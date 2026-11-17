// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { Noticia } from '../core/types';
import { TelaCardClassico } from './CardClassico';

// v13.2.0 (AC-18.4, FR-19): a interface Clássica é o card da v12.1.0; estes são os testes do card da v12.1.0
// (Telas.test.tsx, TelasV11.test.tsx e TelasV12.test.tsx da develop), apontados para o componente próprio.
const noticia: Noticia = {
  id: 'n1', titulo: 'Título X', descricao: 'Descrição Y', saibaMais: 'Mais Z', imagem: 'content/img/n1.webp', tema: 'saude',
  veredito: 'falsa', explicacao: 'Explicação W', tecnica: 'imagem', fonteUrl: 'https://exemplo.org',
};
const outra = (id: string, extra: Partial<Noticia> = {}): Noticia => ({
  id, titulo: `Título ${id}`, descricao: 'Descrição', saibaMais: 'Mais', tema: 'ciencia', veredito: 'verdadeira',
  explicacao: 'Explicação', tecnica: 'contexto', fonteUrl: 'https://www.correiobraziliense.com.br/x', ...extra,
});
type Props = Parameters<typeof TelaCardClassico>[0];
const card = (n: Noticia = noticia, extra: Partial<Props> = {}) => render(
  <TelaCardClassico noticia={n} restanteMs={9000} saibaMais={false} ausente={false} pontos={0} cardRef={{ current: null }} onArrastar={() => {}} {...extra} />,
);

describe('AC-18.4: card clássico (v12.1.0)', () => {
  it('FR-4: imagem, título, descrição e dica do saiba mais dentro do card; cronômetro fora', () => {
    const { container } = card(noticia, { restanteMs: 14200 });
    const art = container.querySelector('article')!;
    expect(art.querySelector('img')).toHaveAttribute('src', expect.stringContaining('content/img/n1.webp'));
    expect(art).toContainElement(screen.getByText('Título X'));
    expect(art).toContainElement(screen.getByText('Descrição Y'));
    expect(art).toContainElement(screen.getByText('Saiba mais: levante as duas mãos (ou ↑)'));
    expect(screen.getByRole('timer', { name: 'Tempo restante' })).toHaveTextContent('15 s');
    expect(art).not.toContainElement(screen.getByRole('timer'));
    expect(container.querySelectorAll('[data-carta], [data-face-carta]')).toHaveLength(0); // nada da carta (v13)
  });

  it('FR-4 (v9.0.0): sem imagem, a ilustração do tema com o chip do nome', () => {
    const { imagem: _sem, ...semImagem } = noticia;
    const { container } = card({ ...semImagem, tema: 'meio-ambiente' });
    expect(container.querySelector('img')).toBeNull();
    const ilustracao = screen.getByRole('img', { name: 'Tema: Meio ambiente' });
    expect(ilustracao).toHaveAttribute('data-tema', 'meio-ambiente');
    expect(ilustracao).toHaveTextContent('Meio ambiente');
  });

  it('AC-3.1: "saiba mais" troca o conteúdo dentro do card (título e texto), sem virar', () => {
    const { container } = card(noticia, { saibaMais: true });
    const art = container.querySelector('article')!;
    expect(art).toContainElement(screen.getByText('Mais Z'));
    expect(art).toContainElement(screen.getByText('Título X'));
    expect(screen.queryByText('Descrição Y')).toBeNull();
    expect(art.querySelector('img')).toBeNull();
  });

  it('AC-2.12 (v11.0.0): pilha de duas camadas atrás do card, que não fazem parte dele', () => {
    const { container } = card();
    const art = container.querySelector('article')!;
    const camadas = [...container.querySelectorAll('[data-pilha-camada]')];
    expect(camadas).toHaveLength(2);
    for (const c of camadas) {
      expect(art.contains(c)).toBe(false);
      expect(c.compareDocumentPosition(art) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy(); // pintadas antes
    }
  });

  it('AC-5.3: ausente mostra "Volte para o centro"', () => {
    card(noticia, { ausente: true });
    expect(screen.getByText('Volte para o centro')).toBeInTheDocument();
  });

  it.each([
    ['direita', 'verdade', 'mentira', /saiDireita/],
    ['esquerda', 'mentira', 'verdade', /saiEsquerda/],
  ] as const)('AC-2.1/AC-2.12: saindo pela %s, sai com o carimbo e o botão de %s acesos', (saida, lado, outro, classe) => {
    const { container } = card(noticia, { saida });
    expect(container.querySelector('article')!.className).toMatch(classe);
    const rotulo = (l: string) => container.querySelector(`[data-rotulo-lado="${l}"]`)!;
    const botao = (l: string) => container.querySelector(`[data-botao-lado="${l}"]`)!;
    expect(rotulo(lado).className).toMatch(/carimbado/);
    expect(rotulo(outro).className).not.toMatch(/carimbado/);
    expect(botao(lado)).toHaveAttribute('data-escolhido');
    expect(screen.queryByRole('timer')).toBeNull();
  });

  it('AC-2.10b: os carimbos Verdade/Mentira ficam dentro do card, apagados no centro', () => {
    const { container } = card();
    const art = container.querySelector('article')!;
    const v = art.querySelector<HTMLElement>('[data-rotulo-lado="verdade"]')!;
    const m = art.querySelector<HTMLElement>('[data-rotulo-lado="mentira"]')!;
    expect([v.textContent, m.textContent]).toEqual(['Verdade', 'Mentira']);
    expect(v.style.opacity).toBe('0');
    expect(v.className).toMatch(/carimboVerdade/);
    expect(m.className).toMatch(/carimboMentira/);
  });

  it('AC-2.11: botões redondos nas laterais, fora do card, na mesma mesa', () => {
    const { container } = card();
    const botoes = [...container.querySelector('[data-mesa]')!.querySelectorAll('[data-botao-lado]')];
    expect(botoes.map((b) => b.getAttribute('data-botao-lado'))).toEqual(['mentira', 'verdade']);
    for (const b of botoes) expect(container.querySelector('article')!.contains(b)).toBe(false);
  });

  it('AC-4.1/AC-4.7: placar parcial; pulso nos últimos 5 s, não com "Volte para o centro"', () => {
    const { container, unmount } = card(noticia, { pontos: 3, restanteMs: 5000 });
    expect(screen.getByText('Pontos: 3')).toBeInTheDocument();
    expect(container.querySelector('article')!.className).toMatch(/pulsando/);
    unmount();
    const r = card(noticia, { ausente: true, restanteMs: 3000 });
    expect(r.container.querySelector('article')!.className).not.toMatch(/pulsando/);
  });

  it('AC-9.14: no modo Cabeça, a dica do saiba mais fala do queixo e a dica do modo fica fora do card', () => {
    const { container } = card(noticia, { modo: 'cabeca' });
    expect(container.querySelector('article')).toContainElement(screen.getByText('Saiba mais: levante o queixo (ou ↑)'));
    const dicaModo = screen.getByText('Cabeça para a direita: é verdade · Cabeça para a esquerda: é mentira · Queixo para cima: saiba mais');
    expect(container.querySelector('article')).not.toContainElement(dicaModo);
  });

  it('FR-4 (v11.0.0): ilustração "recorte chapado" própria da notícia, com o chip do tema', () => {
    const { container } = card(outra('mds-0007'));
    const ilu = screen.getByRole('img', { name: 'Tema: Ciência' });
    expect(ilu.querySelector('img')).toHaveAttribute('src', expect.stringContaining('card-ciencia-banana'));
    expect(ilu).toHaveTextContent('Ciência');
    expect(container.querySelectorAll('article img')).toHaveLength(1);
  });
});

describe('AC-18.4: card de treino clássico (v12.1.0)', () => {
  const treino: Noticia = {
    id: 'treino-1', titulo: 'Morango Influencer', descricao: 'Acordei assim!', saibaMais: '', tema: 'tecnologia',
    veredito: 'falsa', explicacao: 'Mentira! Repare na imagem.', tecnica: 'imagem', fonteUrl: '',
  };

  it('AC-15.2/AC-15.6: "Treino N de M", com a frase no card, sem barra, placar nem dica de saiba mais', () => {
    const { container } = card(treino, { treino: { passo: 1, total: 2 } });
    expect(screen.getByText('Treino 2 de 2')).toBeInTheDocument();
    expect(container.querySelector('article')).toContainElement(screen.getByText('Acordei assim!'));
    expect(screen.queryByRole('timer')).toBeNull();
    expect(screen.queryByText(/^Pontos:/)).toBeNull();
    expect(screen.queryByText(/Saiba mais/)).toBeNull();
  });

  it('AC-15.7: o desenho do perfil, maior', () => {
    const { container } = card(treino, { treino: { passo: 0, total: 2, ilustracao: 'perfil-falso-abacaxi' } });
    const img = container.querySelector('article img')!;
    expect(img).toHaveAttribute('src', expect.stringContaining('perfil-falso-abacaxi'));
    expect(img.className).toMatch(/imagemPerfil/);
  });
});

describe('AC-18.4: a Clássica não tem fan', () => {
  it('mesmo recebendo as props das Cartas (cartasNoFan, distribuindoMs), o card clássico não desenha fan nem voo', () => {
    const { container } = card(noticia, { cartasNoFan: 9, distribuindoMs: 500 });
    expect(container.querySelector('[data-fan]')).toBeNull();
    expect(screen.getByRole('timer', { name: 'Tempo restante' })).toBeInTheDocument();
    expect(container.querySelectorAll('[data-pilha-camada]')).toHaveLength(2);
  });
});
