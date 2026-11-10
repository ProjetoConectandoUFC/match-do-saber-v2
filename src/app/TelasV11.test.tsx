// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { calcularAncoras } from '../core/ancorasRosto';
import { linhasDoResumo } from '../core/fontesRodada';
import type { Ponto } from '../core/gestos';
import type { Noticia } from '../core/types';
import { TelaCard, TelaFeedback, TelaFeedbackTutorial, TelaResumo } from './Telas';

const noticia = (id: string, extra: Partial<Noticia> = {}): Noticia => ({
  id, titulo: `Título ${id}`, descricao: 'Descrição', saibaMais: 'Mais', tema: 'ciencia', veredito: 'verdadeira',
  explicacao: 'Explicação', tecnica: 'contexto', fonteUrl: 'https://www.correiobraziliense.com.br/x', ...extra,
});
const card = (n: Noticia, extra: Partial<Parameters<typeof TelaCard>[0]> = {}) => (
  <TelaCard noticia={n} restanteMs={9000} saibaMais={false} ausente={false} pontos={0} cardRef={{ current: null }} onArrastar={() => {}} {...extra} />
);

describe('v11.0.0: card de app de namoro (FR-15)', () => {
  it('AC-2.11: botões redondos nas laterais, fora do card, na mesma mesa, sem clique', () => {
    const { container } = render(card(noticia('n1')));
    const mesa = container.querySelector('[data-mesa]')!;
    const botoes = [...mesa.querySelectorAll('[data-botao-lado]')];
    expect(botoes.map((b) => b.getAttribute('data-botao-lado'))).toEqual(['mentira', 'verdade']);
    for (const b of botoes) {
      expect(b).toHaveAttribute('aria-hidden', 'true');
      expect(b.tagName).not.toBe('BUTTON');
      expect(container.querySelector('article')!.contains(b)).toBe(false);
    }
    expect(botoes[0]!.querySelector('svg[data-forma="marca-triangulo"]')).not.toBeNull();
    expect(botoes[1]!.querySelector('svg[data-forma="marca-estrela-4"]')).not.toBeNull();
  });

  it('AC-2.12: pilha de duas camadas atrás do card, que não fazem parte dele', () => {
    const { container } = render(card(noticia('n1')));
    const art = container.querySelector('article')!;
    const camadas = [...container.querySelectorAll('[data-pilha-camada]')];
    expect(camadas).toHaveLength(2);
    for (const c of camadas) {
      expect(art.contains(c)).toBe(false);
      expect(c.compareDocumentPosition(art) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy(); // pintadas antes
    }
  });

  it.each([
    ['direita', 'verdade', 'mentira'],
    ['esquerda', 'mentira', 'verdade'],
  ] as const)('AC-2.12/AC-2.11: saindo pela %s, o carimbo e o botão de %s ficam acesos por inteiro', (saida, lado, outro) => {
    const { container } = render(card(noticia('n1'), { saida }));
    const rotulo = (l: string) => container.querySelector(`[data-rotulo-lado="${l}"]`)!;
    const botao = (l: string) => container.querySelector(`[data-botao-lado="${l}"]`)!;
    expect(rotulo(lado).className).toMatch(/carimbado/);
    expect(rotulo(outro).className).not.toMatch(/carimbado/);
    expect(botao(lado)).toHaveAttribute('data-escolhido');
    expect(botao(outro)).not.toHaveAttribute('data-escolhido');
  });

  it('AC-2.10b: o rótulo é o carimbo (só texto), apagado no centro', () => {
    const { container } = render(card(noticia('n1')));
    const v = container.querySelector<HTMLElement>('[data-rotulo-lado="verdade"]')!;
    expect(v.textContent).toBe('Verdade');
    expect(v.className).toMatch(/carimbo/);
    expect(v.className).toMatch(/carimboVerdade/);
    expect(container.querySelector('[data-rotulo-lado="mentira"]')!.className).toMatch(/carimboMentira/);
  });

  it('FR-4 (v11.0.0): notícia com ilustração "recorte chapado" própria mostra a ilustração, com o tema', () => {
    const { container } = render(card(noticia('mds-0007')));
    const ilu = screen.getByRole('img', { name: 'Tema: Ciência' });
    expect(ilu.querySelector('img')).toHaveAttribute('src', expect.stringContaining('card-ciencia-banana'));
    expect(ilu).toHaveTextContent('Ciência');
    expect(container.querySelectorAll('article img')).toHaveLength(1);
  });

  it('FR-4: outra notícia do mesmo tema fica com a composição do tema (a ilustração não vira pista)', () => {
    const { container } = render(card(noticia('mds-0004', { veredito: 'falsa' })));
    expect(container.querySelector('article img')).toBeNull();
    expect(screen.getByRole('img', { name: 'Tema: Ciência' })).toHaveAttribute('data-tema', 'ciencia');
  });

  it('a imagem da notícia vem antes da ilustração', () => {
    const { container } = render(card(noticia('mds-0007', { imagem: 'content/img/x.webp' })));
    expect(container.querySelector('article img')).toHaveAttribute('src', expect.stringContaining('content/img/x.webp'));
  });

  it.each([
    ['falsa', 'perfil-falso-abacaxi'],
    ['verdadeira', 'perfil-verdadeiro-caju'],
  ] as const)('AC-15.7 (v11.0.0): card de treino %s mostra o perfil do veredito', (veredito, arquivo) => {
    const { container } = render(card(noticia('treino-1', { veredito }), { treino: { passo: 0, total: 4 } }));
    const img = container.querySelector('article img')!;
    expect(img).toHaveAttribute('src', expect.stringContaining(arquivo));
    expect(img).toHaveAttribute('alt', '');
  });
});

describe('v11.0.0: feedback "Deu match!" com ícones do design system (AC-4.1 a AC-4.3, AC-4.9)', () => {
  it.each([
    ['acerto', 'Deu match!', 'Acertou!'],
    ['erro', 'Não deu match', 'Errou'],
  ] as const)('%s: ícone, frase do match e o selo como texto próprio', (resultado, match, selo) => {
    const { container } = render(<TelaFeedback noticia={noticia('n1')} resultado={resultado} pontos={0} />);
    expect(screen.getByText(match)).toBeInTheDocument();
    expect(screen.getByText(selo).textContent).toBe(selo);
    const icone = container.querySelector(`svg[data-icone="${resultado}"]`)!;
    expect(icone).toHaveAttribute('aria-hidden', 'true');
    const ordem = [screen.getByRole('heading', { name: 'É verdade' }), icone, screen.getByText(match), screen.getByText('Explicação')];
    for (let i = 1; i < ordem.length; i++) {
      expect(ordem[i - 1]!.compareDocumentPosition(ordem[i]!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
  });

  it('tempo esgotado: ampulheta e "Tempo esgotado", sem frase de match', () => {
    const { container } = render(<TelaFeedback noticia={noticia('n1')} resultado="tempo" pontos={0} />);
    expect(container.querySelector('svg[data-icone="tempo"]')).not.toBeNull();
    expect(screen.getByText('Tempo esgotado')).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/match/i);
  });

  it('sem emoji nem caracteres como ícone (FR-15)', () => {
    const { container } = render(<TelaFeedback noticia={noticia('n1')} resultado="acerto" pontos={0} />);
    expect(container.textContent).not.toMatch(/[✓✗✔✖❤🙌]|\p{Extended_Pictographic}/u);
  });

  it.each([
    ['verdadeira', 'Deu match!', 'Acertou!', 'acerto'],
    ['falsa', 'Não deu match', 'Quase!', 'erro'],
  ] as const)('treino (AC-15.3): resposta %s para um perfil verdadeiro', (resposta, match, selo, icone) => {
    const { container } = render(<TelaFeedbackTutorial noticia={noticia('treino-2')} resposta={resposta} modo="corpo" treino={{ passo: 1, total: 4 }} />);
    expect(screen.getByText(match)).toBeInTheDocument();
    expect(screen.getByText(selo)).toBeInTheDocument();
    expect(container.querySelector(`svg[data-icone="${icone}"]`)).not.toBeNull();
  });
});

const p = (x: number, y: number): Ponto => ({ x, y, visibility: 1 });
function pose(): Ponto[] {
  const pts = Array.from({ length: 33 }, () => p(0.5, 0.9));
  pts[2] = p(0.55, 0.4); pts[5] = p(0.45, 0.4); pts[7] = p(0.605, 0.42); pts[8] = p(0.395, 0.42);
  pts[11] = p(0.7, 0.75); pts[12] = p(0.3, 0.75);
  return pts;
}
const FOTO = 'data:image/jpeg;base64,AAA';
const ancoras = calcularAncoras(pose(), { largura: 480, altura: 360, espelhada: true });

describe('v11.0.0: resumo com lista, QR e filtro (AC-5.8, AC-5.9, AC-13.2, AC-13.8, AC-13.9)', () => {
  const cards = [
    noticia('mds-0001', { tituloCurto: 'Emas venceram', fonteNome: 'Correio Braziliense' }),
    noticia('mds-0002', { veredito: 'falsa', fonteUrl: 'https://www.aosfatos.org/y' }),
    noticia('mds-0003', { veredito: 'falsa' }),
  ];
  const linhas = linhasDoResumo(cards, ['acerto', 'erro', 'tempo']);
  const qr = 'https://exemplo.github.io/jogo/fontes.html#1.2.3';

  it('AC-5.8: "Notícias da rodada" com uma linha por notícia: resultado, título curto, veredito e fonte', () => {
    render(<TelaResumo pontos={1} total={3} linhas={linhas} enderecoQr={qr} />);
    const lista = screen.getByRole('region', { name: 'Notícias da rodada' });
    const itens = within(lista).getAllByRole('listitem');
    expect(itens).toHaveLength(3);
    expect(itens.map((li) => li.getAttribute('data-resultado'))).toEqual(['acertou', 'errou', 'errou']);
    expect(itens[0]).toHaveTextContent('Emas venceram');
    expect(itens[0]).toHaveTextContent('Verdade');
    expect(itens[0]).toHaveTextContent('Fonte: Correio Braziliense');
    expect(itens[1]).toHaveTextContent('Mentira');
    expect(itens[1]).toHaveTextContent('Desmentido por: aosfatos.org');
    expect(within(lista).getByText('acertou')).toBeInTheDocument(); // legenda
    expect(within(lista).getByText('errou')).toBeInTheDocument();
  });

  it('AC-5.9: QR único, gerado no jogo, com o endereço da página das fontes e a chamada', () => {
    render(<TelaResumo pontos={1} total={3} linhas={linhas} enderecoQr={qr} />);
    const codigo = screen.getByRole('img', { name: 'QR code das fontes da rodada' });
    expect(codigo).toHaveAttribute('data-conteudo', qr);
    expect(codigo.querySelector('path')!.getAttribute('d')!.length).toBeGreaterThan(100);
    expect(screen.getByText('Fotografe e veja todas as fontes')).toBeInTheDocument();
    expect(screen.getAllByRole('img', { name: /QR code/ })).toHaveLength(1);
  });

  it('AC-13.8: com foto e âncoras, o filtro da faixa por cima da foto, sem mudar a foto', () => {
    const { container } = render(<TelaResumo pontos={7} total={10} foto={FOTO} ancoras={ancoras} linhas={linhas} enderecoQr={qr} />);
    expect(screen.getByRole('img', { name: 'Sua foto na partida' })).toHaveAttribute('src', FOTO);
    const filtro = container.querySelector('figure svg[data-filtro="detetive"]')!;
    expect(filtro).toHaveAttribute('aria-hidden', 'true');
    expect(filtro).toHaveAttribute('viewBox', '0 0 480 360');
    expect([...filtro.querySelectorAll('g[data-parte]')].map((g) => g.getAttribute('data-parte'))).toEqual(['chapeu', 'rosto']);
    expect(filtro.querySelector('g[data-parte="rosto"]')!.innerHTML).toContain('<circle');
  });

  it.each([
    [3, 'lupa', 1, 'Aprendiz de checagem'],
    [7, 'detetive', 2, 'Detetive em treino'],
    [9, 'reporter', 3, 'Faro de repórter'],
    [10, 'heroi', 4, 'Imune a fake news!'],
  ] as const)('AC-13.2: %i de 10 = filtro %s e selo da faixa %i na moldura', (pontos, filtro, faixa, titulo) => {
    const { container } = render(<TelaResumo pontos={pontos} total={10} foto={FOTO} ancoras={ancoras} />);
    expect(container.querySelector(`svg[data-filtro="${filtro}"]`)).not.toBeNull();
    const selo = container.querySelector(`figure [data-selo-faixa="${faixa}"]`)!;
    expect(selo.textContent).toBe(titulo);
  });

  it('AC-13.9: foto sem âncoras fica só com o selo', () => {
    const { container } = render(<TelaResumo pontos={7} total={10} foto={FOTO} ancoras={null} />);
    expect(container.querySelector('svg[data-filtro]')).toBeNull();
    expect(container.querySelector('[data-selo-faixa="2"]')).not.toBeNull();
  });

  it('AC-13.3: sem foto, sem polaroid nem selo; lista e QR continuam', () => {
    const { container } = render(<TelaResumo pontos={1} total={3} linhas={linhas} enderecoQr={qr} />);
    expect(container.querySelector('figure')).toBeNull();
    expect(container.querySelector('[data-selo-faixa]')).toBeNull();
    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByRole('region', { name: 'Notícias da rodada' })).toBeInTheDocument();
  });
});
