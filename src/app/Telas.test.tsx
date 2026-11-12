// @vitest-environment jsdom
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AJUSTES_PADRAO } from '../core/ajustes';
import type { Noticia } from '../core/types';
import { BarraTempo, BotaoSair, TelaCalibracao, TelaCard, TelaEspera, TelaFeedback, TelaFeedbackTutorial, TelaResumo } from './Telas';

const noticia: Noticia = {
  id: 'n1', titulo: 'Título X', descricao: 'Descrição Y', saibaMais: 'Mais Z', imagem: 'content/img/n1.webp', tema: 'saude',
  veredito: 'falsa', explicacao: 'Explicação W', tecnica: 'imagem', fonteUrl: 'https://exemplo.org',
};

describe('telas', () => {
  it('AC-6.4: espera sem notícias', () => {
    render(<TelaEspera semNoticias camera="ativa" />);
    expect(screen.getByText('Nenhuma notícia publicada')).toBeInTheDocument();
  });
  it('espera com câmera negada orienta a usar as setas', () => {
    render(<TelaEspera semNoticias={false} camera="negada" />);
    expect(screen.getByText('Câmera desativada — jogue pelas setas (Enter para começar)')).toBeInTheDocument();
  });
  it('FR-4: card mostra imagem, título, descrição, cronômetro e dica do saiba mais', () => {
    const { container } = render(<TelaCard noticia={noticia} restanteMs={14200} saibaMais={false} ausente={false} pontos={0} cardRef={{ current: null }} onArrastar={() => {}} />);
    expect(container.querySelector('img')).toHaveAttribute('src', expect.stringContaining('content/img/n1.webp'));
    expect(screen.getByText('Título X')).toBeInTheDocument();
    expect(screen.getByText('Descrição Y')).toBeInTheDocument();
    expect(screen.getByRole('timer', { name: 'Tempo restante' })).toHaveTextContent('15 s');
    expect(container.querySelector('article')).not.toHaveTextContent(/^\d+$/m);
    expect(screen.getByText(/Saiba mais/)).toBeInTheDocument();
  });
  it('FR-4 (v9.0.0): card sem imagem mostra a ilustração do tema no lugar', () => {
    const { imagem: _sem, ...semImagem } = noticia;
    const { container } = render(<TelaCard noticia={{ ...semImagem, tema: 'meio-ambiente' }} restanteMs={14200} saibaMais={false} ausente={false} pontos={0} cardRef={{ current: null }} onArrastar={() => {}} />);
    expect(container.querySelector('img')).toBeNull();
    const ilustracao = screen.getByRole('img', { name: 'Tema: Meio ambiente' });
    expect(ilustracao).toHaveAttribute('data-tema', 'meio-ambiente');
    expect(ilustracao).toHaveTextContent('Meio ambiente');
    expect(screen.getByText('Título X')).toBeInTheDocument();
  });
  it('AC-3.1: saiba mais aberto mostra o texto expandido', () => {
    render(<TelaCard noticia={noticia} restanteMs={1000} saibaMais ausente={false} pontos={0} cardRef={{ current: null }} onArrastar={() => {}} />);
    expect(screen.getByText('Mais Z')).toBeInTheDocument();
  });
  it('AC-5.3: ausente mostra "Volte para o centro"', () => {
    render(<TelaCard noticia={noticia} restanteMs={1000} saibaMais={false} ausente pontos={0} cardRef={{ current: null }} onArrastar={() => {}} />);
    expect(screen.getByText('Volte para o centro')).toBeInTheDocument();
  });
  it.each([
    ['direita', /saiDireita/],
    ['esquerda', /saiEsquerda/],
  ] as const)('AC-2.1/AC-2.2: card respondido sai pela %s', (saida, classe) => {
    const { container } = render(<TelaCard noticia={noticia} restanteMs={1000} saibaMais={false} ausente={false} saida={saida} pontos={0} cardRef={{ current: null }} onArrastar={() => {}} />);
    expect(container.querySelector('article')!.className).toMatch(classe);
  });
  it('card sem resposta não tem classe de saída', () => {
    const { container } = render(<TelaCard noticia={noticia} restanteMs={1000} saibaMais={false} ausente={false} pontos={0} cardRef={{ current: null }} onArrastar={() => {}} />);
    expect(container.querySelector('article')!.className).not.toMatch(/sai(Direita|Esquerda)/);
  });
  // AC-4.1 a AC-4.3 e AC-4.9 (v12.0.0): feedback por resultado e carimbo em TelasV12.test.tsx.
  it('AC-4.1: card mostra o placar parcial', () => {
    render(<TelaCard noticia={noticia} restanteMs={1000} saibaMais={false} ausente={false} pontos={3} cardRef={{ current: null }} onArrastar={() => {}} />);
    expect(screen.getByText('Pontos: 3')).toBeInTheDocument();
  });
  it('AC-4.1: feedback mostra o placar já com o card respondido', () => {
    render(<TelaFeedback noticia={noticia} resultado="acerto" pontos={4} />);
    expect(screen.getByText('Pontos: 4')).toBeInTheDocument();
  });
  it('AC-5.1: resumo com "N de M" e a mensagem, sem a lista de técnicas', () => {
    const { container } = render(<TelaResumo pontos={7} total={10} />);
    expect(screen.getByText('7 de 10')).toBeInTheDocument();
    expect(screen.getByText('Você consegue se proteger, mas ainda pode melhorar.')).toBeInTheDocument();
    expect(screen.queryByText('Técnicas que você praticou')).toBeNull();
    expect(screen.queryByText('Checar a fonte')).toBeNull();
    expect(container.querySelector('ul')).toBeNull();
  });
  it('FR-15 (v10.0.0): resumo no tema Claro com "Fim de jogo!" em duas partes', () => {
    const { container } = render(<TelaResumo pontos={7} total={10} />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Fim de jogo!');
    expect(container.querySelector('main')!.className).toMatch(/claro/);
  });
  it('AC-5.7: resumo com foto mostra a mensagem da faixa', () => {
    render(<TelaResumo pontos={10} total={10} foto="data:image/jpeg;base64,AAA" />);
    expect(screen.getByText('Imune a fake news!')).toBeInTheDocument();
  });
  it('AC-13.2: resumo com foto mostra o polaroid com a faixa "Match do Saber · N de M"', () => {
    const foto = 'data:image/jpeg;base64,AAA';
    const { container } = render(<TelaResumo pontos={7} total={10} foto={foto} />);
    expect(container.querySelector('figure')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Sua foto na partida' })).toHaveAttribute('src', foto);
    expect(screen.getByText('Match do Saber · 7 de 10')).toBeInTheDocument();
    expect(screen.getByText('7 de 10')).toBeInTheDocument();
    expect(screen.queryByText('Técnicas que você praticou')).toBeNull();
  });
  it.each([
    ['sem a prop foto', undefined],
    ['com foto={null}', null],
  ])('AC-13.3: resumo %s não tem polaroid', (_, foto) => {
    const { container } = render(<TelaResumo pontos={7} total={10} foto={foto} />);
    expect(container.querySelector('figure')).toBeNull();
    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByText('7 de 10')).toBeInTheDocument();
  });
});

describe('modos de jogo (v1.1.0)', () => {
  it.each([
    ['mao', 'Arraste a mão para a direita: é verdade · Para a esquerda: é mentira · Duas mãos para cima: saiba mais'],
    ['cabeca', 'Cabeça para a direita: é verdade · Cabeça para a esquerda: é mentira · Queixo para cima: saiba mais'],
  ] as const)('AC-9.14: calibração e card mostram os gestos do modo %s', (modo, dica) => {
    const { unmount } = render(<TelaCalibracao progresso={0} modo={modo} />);
    expect(screen.getByText(dica)).toBeInTheDocument();
    unmount();
    render(<TelaCard noticia={noticia} restanteMs={1000} saibaMais={false} ausente={false} pontos={0} modo={modo} cardRef={{ current: null }} onArrastar={() => {}} />);
    expect(screen.getByText(dica)).toBeInTheDocument();
  });
  it('AC-9.14: no modo Cabeça, a dica do saiba mais fala do queixo', () => {
    render(<TelaCard noticia={noticia} restanteMs={1000} saibaMais={false} ausente={false} pontos={0} modo="cabeca" cardRef={{ current: null }} onArrastar={() => {}} />);
    expect(screen.getByText('Saiba mais: levante o queixo (ou ↑)')).toBeInTheDocument();
  });
});

describe('v10.0.0: espera com a identidade Conectando (FR-15)', () => {
  it('logotipo "Match do Saber" e Iniciar sem caractere de ícone', () => {
    render(<TelaEspera semNoticias={false} camera="ativa" />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Match do Saber');
    const iniciar = screen.getByRole('button', { name: 'Iniciar' });
    expect(iniciar.textContent).toBe('Iniciar');
    expect(iniciar.querySelector('svg[data-forma="marca-triangulo"]')).not.toBeNull();
  });
  it('desenho do gesto: Mentira à esquerda, Verdade à direita', () => {
    const { container } = render(<TelaEspera semNoticias={false} camera="ativa" />);
    const gesto = container.querySelector('[data-esquema-gesto]')!;
    expect([...gesto.querySelectorAll('[data-lado]')].map((e) => e.textContent)).toEqual(['Mentira', 'Verdade']);
  });
  it('decoração: só os três anéis, cada um preso a uma borda', () => {
    const { container } = render(<TelaEspera semNoticias={false} camera="ativa" />);
    const formas = [...container.querySelectorAll('[data-anel]')].map((e) => e.getAttribute('data-anel'));
    expect(formas).toEqual(['anel-c@topo-esquerda', 'anel-b@topo-direita', 'anel-a@direita']);
    expect(container.textContent).not.toMatch(/[▶✓✗🙌]/u);
  });
});

describe('v2.0.0: configurações, iniciar e sair', () => {
  it('AC-9.2/AC-10.1 (v9.0.0): espera mostra o resumo, Iniciar e o menu ☰ no lugar do ⚙', () => {
    const iniciar = vi.fn();
    render(<TelaEspera semNoticias={false} camera="ativa" config={{ ...AJUSTES_PADRAO, modo: 'mao', tempoCardS: 20, som: false, noticiasPorPartida: 8 }} menu={<button type="button">Menu</button>} onIniciar={iniciar} />);
    // v12.0.0: resumo de AC-9.2
    expect(screen.getByText('Modo: Mão · 8 notícias · 20 s por card · Som: desligado')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Configurações' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Menu' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar' }));
    expect(iniciar).toHaveBeenCalledOnce();
  });
  it('AC-10.2: sem notícias, Iniciar fica desativado', () => {
    render(<TelaEspera semNoticias camera="ativa" />);
    expect(screen.getByRole('button', { name: 'Iniciar' })).toBeDisabled();
    expect(screen.getByText('Nenhuma notícia publicada')).toBeInTheDocument();
  });
  it('AC-6.4 (v12.0.0): com notícias fora dos filtros, a espera manda revisar Ajustes › Conteúdo', () => {
    render(<TelaEspera semNoticias avisoSemNoticias="Nenhuma notícia para os ajustes atuais: revise Ajustes › Conteúdo" camera="ativa" />);
    expect(screen.getByText('Nenhuma notícia para os ajustes atuais: revise Ajustes › Conteúdo')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Iniciar' })).toBeDisabled();
  });
  it('AC-9.2 (v12.0.0): ajuste fora do padrão além do resumo aparece como "Ajustes personalizados"', () => {
    render(<TelaEspera semNoticias={false} camera="ativa" config={{ ...AJUSTES_PADRAO, volume: 'baixo' }} />);
    expect(screen.getByText('Modo: Corpo · 10 notícias · 15 s por card · Som: ligado · Ajustes personalizados')).toBeInTheDocument();
  });
  it('AC-9.29 (v12.0.0): com o QR das fontes desligado, o resumo fica sem o cartão do QR e mantém a lista', () => {
    const linhas = [{ id: 'mds-0001', titulo: 'Curto', veredito: 'verdadeira' as const, acertou: true, rotuloFonte: 'Fonte:' as const, fonte: 'exemplo.org' }];
    const { container } = render(<TelaResumo pontos={1} total={1} linhas={linhas} />);
    expect(container.querySelector('[data-cartao-qr]')).toBeNull();
    expect(screen.getByText('Curto')).toBeInTheDocument();
  });
  // AC-9.1 (v12.0.0): o painel "Ajustes" substituiu o menu "Configurações"; os testes estão em PainelAjustes.test.tsx.
  it('AC-10.5: botão Sair tem nome acessível "Sair da partida"', () => {
    const sair = vi.fn();
    render(<BotaoSair onSair={sair} />);
    fireEvent.click(screen.getByRole('button', { name: 'Sair da partida' }));
    expect(sair).toHaveBeenCalledOnce();
  });
  it('v3.0.0: com câmera ativa, a espera manda apertar Iniciar e não promete início sozinho', () => {
    render(<TelaEspera semNoticias={false} camera="ativa" />);
    expect(screen.getByText('Aperte Iniciar (ou Enter) e fique de frente para a câmera')).toBeInTheDocument();
    expect(screen.queryByText(/Chegue mais perto/)).not.toBeInTheDocument();
  });
});

describe('v4.0.0: barra de tempo e pulso', () => {
  const props = { noticia, saibaMais: false, ausente: false, pontos: 0, totalMs: 15000, cardRef: { current: null }, onArrastar: () => {} };
  it('AC-4.6: barra mostra os segundos e a fração restante', () => {
    render(<BarraTempo restanteMs={7500} totalMs={15000} alerta={false} />);
    const barra = screen.getByRole('timer', { name: 'Tempo restante' });
    expect(barra).toHaveTextContent('8 s');
    expect(barra.firstElementChild).toHaveStyle({ width: '50%' });
  });
  it('AC-4.7: com 5 s ou menos e cronômetro correndo, o card pulsa e a barra fica em alerta', () => {
    const { container } = render(<TelaCard {...props} restanteMs={5000} />);
    expect(container.querySelector('article')!.className).toMatch(/pulsando/);
    expect(screen.getByRole('timer', { name: 'Tempo restante' }).className).toMatch(/barraAlerta/);
  });
  it('AC-4.7: acima de 5 s não pulsa', () => {
    const { container } = render(<TelaCard {...props} restanteMs={5001} />);
    expect(container.querySelector('article')!.className).not.toMatch(/pulsando/);
    expect(screen.getByRole('timer', { name: 'Tempo restante' }).className).not.toMatch(/barraAlerta/);
  });
  it('AC-4.7 (v5.0.0): pausado por "Volte para o centro" não pulsa', () => {
    const { container } = render(<TelaCard {...props} ausente restanteMs={3000} />);
    expect(container.querySelector('article')!.className).not.toMatch(/pulsando/);
  });
  it('AC-4.7 (v5.0.0): com o saiba mais aberto o cronômetro corre, então o card pulsa nos últimos 5 s', () => {
    const { container } = render(<TelaCard {...props} saibaMais restanteMs={3000} />);
    expect(container.querySelector('article')!.className).toMatch(/pulsando/);
    expect(screen.getByRole('timer', { name: 'Tempo restante' }).className).toMatch(/barraAlerta/);
  });
  it('card saindo não mostra a barra da tela nem pulsa', () => {
    const { container } = render(<TelaCard {...props} restanteMs={3000} saida="direita" />);
    expect(container.querySelector('article')!.className).not.toMatch(/pulsando/);
    expect(screen.queryByRole('timer')).not.toBeInTheDocument();
  });
});

describe('v10.0.0: card com a identidade Conectando (FR-15)', () => {
  const props = { noticia, saibaMais: false, ausente: false, pontos: 0, totalMs: 15000, cardRef: { current: null }, onArrastar: () => {} };
  it('AC-4.6 (AC-4.8 removido): o tempo aparece só na barra da base, nenhuma barra dentro do card', () => {
    const { container } = render(<TelaCard {...props} restanteMs={12000} />);
    expect(screen.getAllByRole('timer')).toHaveLength(1);
    expect(container.querySelector('article')).not.toContainElement(screen.getByRole('timer', { name: 'Tempo restante' }));
    render(<TelaCard {...props} saibaMais restanteMs={12000} />);
    expect(screen.queryByRole('timer', { name: 'Tempo do card' })).toBeNull();
  });
  it('laterais: Mentira à esquerda e Verdade à direita, com marcadores no lugar de ✗/✓', () => {
    const { container } = render(<TelaCard {...props} restanteMs={12000} />);
    const lados = [...container.querySelectorAll('[data-lado]')];
    expect(lados.map((e) => [e.getAttribute('data-lado'), e.textContent])).toEqual([['mentira', 'Mentira'], ['verdade', 'Verdade']]);
    expect(lados[0]!.compareDocumentPosition(container.querySelector('article')!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(container.textContent).not.toMatch(/[✓✗🙌]|Falsa/u);
    expect(screen.getByText('Saiba mais: levante as duas mãos (ou ↑)')).toBeInTheDocument();
  });
});

describe('v10.3.0: rótulos que aparecem conforme o card vai para um lado (AC-2.10b)', () => {
  it('o card tem "Mentira" à esquerda e "Verdade" à direita, invisíveis no centro e só como texto', () => {
    const { container } = render(<TelaCard noticia={noticia} restanteMs={9000} saibaMais={false} ausente={false} pontos={0} cardRef={{ current: null }} onArrastar={() => {}} />);
    const card = container.querySelector('article')!;
    const verdade = card.querySelector<HTMLElement>('[data-rotulo-lado="verdade"]')!;
    const mentira = card.querySelector<HTMLElement>('[data-rotulo-lado="mentira"]')!;
    expect(verdade.textContent).toBe('Verdade');
    expect(mentira.textContent).toBe('Mentira');
    expect(verdade.style.opacity).toBe('0');
    expect(mentira.style.opacity).toBe('0');
    expect(verdade).toHaveAttribute('aria-hidden', 'true');
    // v11.0.0: visual final do rótulo é o carimbo (classes), no lugar do estilo inline provisório.
    expect(verdade.className).toMatch(/carimboVerdade/);
    expect(mentira.className).toMatch(/carimboMentira/);
    expect(verdade.getAttribute('style')).toBe('opacity: 0;');
  });
});

describe('v10.2.0: telas do tutorial (Story 15, FR-16)', () => {
  const treino: Noticia = {
    id: 'treino-1', titulo: 'Morango Influencer', descricao: 'Acordei assim!', saibaMais: '', tema: 'tecnologia',
    veredito: 'falsa', explicacao: 'Mentira! Repare na imagem.', tecnica: 'imagem', fonteUrl: '',
  };
  it('AC-15.2/AC-15.6: card de treino mostra "Treino N de 4", sem barra de tempo, sem placar e sem dica de saiba mais', () => {
    const { container } = render(<TelaCard noticia={treino} restanteMs={0} saibaMais={false} ausente={false} pontos={0} treino={{ passo: 1, total: 4 }} cardRef={{ current: null }} onArrastar={() => {}} />);
    expect(screen.getByText('Treino 2 de 4')).toBeInTheDocument();
    expect(screen.getByText('Morango Influencer')).toBeInTheDocument();
    expect(screen.queryByRole('timer')).toBeNull();
    expect(screen.queryByText(/^Pontos:/)).toBeNull();
    expect(screen.queryByText(/Saiba mais/)).toBeNull();
    expect(container.querySelector('article img')).toBeNull(); // sem desenho próprio (AC-15.7): ilustração do tema
  });
  it('AC-15.3: feedback de treino ensina o gesto, com o carimbo do veredito, a explicação e a técnica', () => {
    const { container } = render(<TelaFeedbackTutorial noticia={treino} resposta="verdadeira" modo="corpo" treino={{ passo: 0, total: 4 }} />);
    expect(container.querySelector('[data-carimbo="mentira"]')).not.toBeNull(); // v12.0.0: o veredito é o carimbo (AC-4.10)
    expect(screen.getByText('Quase!')).toBeInTheDocument();
    expect(screen.getByText('Você foi para a direita com o corpo: escolheu Verdade.')).toBeInTheDocument();
    expect(screen.getByText('Era Mentira: corpo para a esquerda.')).toBeInTheDocument();
    expect(screen.getByText('Mentira! Repare na imagem.')).toBeInTheDocument();
    expect(screen.getByText('Verificar a imagem')).toBeInTheDocument();
    expect(screen.getByText('Treino 1 de 4')).toBeInTheDocument();
    expect(screen.queryByText(/^Pontos:/)).toBeNull();
    expect(container.querySelector('main')).toHaveAttribute('data-resultado', 'treino-erro');
  });
});
