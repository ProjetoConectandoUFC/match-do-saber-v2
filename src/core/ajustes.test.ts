import { describe, expect, it } from 'vitest';
import {
  AJUSTES_PADRAO, FATOR_VOLUME, ITENS_AJUSTES, MULTIPLICADOR_SENSIBILIDADE, OPCOES, PAINEL_INICIAL,
  alternarTema, itensDoPainel, lerAjustes, mudarValor, resumoAjustes, rotuloValor, salvarAjustes, teclaNoPainel,
  type Ajustes, type Armazenamento,
} from './ajustes';
import { TEMAS } from './types';

function memoria(inicial: Record<string, string> = {}): Armazenamento & { dados: Record<string, string> } {
  const dados = { ...inicial };
  return { dados, getItem: (k) => dados[k] ?? null, setItem: (k, v) => { dados[k] = v; } };
}
const quebrado: Armazenamento = {
  getItem: () => { throw new Error('bloqueado'); },
  setItem: () => { throw new Error('bloqueado'); },
};

describe('ajustes do estande (FR-9, v12.0.0)', () => {
  it('AC-9.4: padrões', () => {
    expect(AJUSTES_PADRAO).toEqual({
      noticiasPorPartida: 10, tempoCardS: 15, feedbackS: 3, voltaResumoS: 0,
      temas: [...TEMAS], dificuldade: 'misturada',
      modo: 'corpo', sensibilidade: 'normal', toleranciaS: 10,
      som: true, volume: 'alto', foto: true, qrFontes: true, tutorial: false,
    });
    expect(lerAjustes(memoria())).toEqual(AJUSTES_PADRAO);
    expect(lerAjustes(null)).toEqual(AJUSTES_PADRAO);
  });

  it('FR-9: opções de cada item', () => {
    expect(OPCOES.noticiasPorPartida).toEqual([5, 8, 10, 12, 15, 20]);       // AC-9.23
    expect(OPCOES.tempoCardS).toEqual([10, 15, 20, 25, 30, 45, 60]);         // AC-9.17
    expect(OPCOES.feedbackS).toEqual([3, 5, 8, 10, 15]);                     // AC-9.25
    expect(OPCOES.voltaResumoS).toEqual([0, 30, 60, 120]);                   // AC-9.26
    expect(OPCOES.dificuldade).toEqual(['misturada', 'facil', 'medio', 'dificil', 'crescente']); // AC-9.27
    expect(OPCOES.modo).toEqual(['corpo', 'mao', 'cabeca']);
    expect(OPCOES.sensibilidade).toEqual(['menor', 'normal', 'maior']);      // AC-9.28
    expect(OPCOES.toleranciaS).toEqual([5, 10, 20]);
    expect(OPCOES.volume).toEqual(['baixo', 'medio', 'alto']);               // AC-9.29
    expect(MULTIPLICADOR_SENSIBILIDADE).toEqual({ menor: 1.25, normal: 1, maior: 0.8 });
    expect(FATOR_VOLUME).toEqual({ baixo: 0.3, medio: 0.6, alto: 1 });
  });

  it('AC-9.1: itens agrupados, na ordem do painel, com "Restaurar padrão" no fim', () => {
    expect(ITENS_AJUSTES.map((i) => [i.grupo, i.id])).toEqual([
      ['partida', 'noticiasPorPartida'], ['partida', 'tempoCardS'], ['partida', 'feedbackS'], ['partida', 'voltaResumoS'],
      ['conteudo', 'temas'], ['conteudo', 'dificuldade'],
      ['deteccao', 'modo'], ['deteccao', 'sensibilidade'], ['deteccao', 'toleranciaS'],
      ['midia', 'som'], ['midia', 'volume'], ['midia', 'foto'], ['midia', 'qrFontes'], ['midia', 'tutorial'],
      ['questoes', 'revisar'],
      [null, 'restaurar'],
    ]);
    expect(ITENS_AJUSTES.map((i) => i.rotulo)).toEqual([
      'Notícias por partida', 'Tempo por card', 'Tempo do feedback', 'Volta automática do resumo',
      'Temas', 'Dificuldade', 'Modo de jogo', 'Sensibilidade do gesto', 'Tolerância sem pessoa',
      'Som', 'Volume', 'Foto no resumo', 'QR das fontes', 'Tutorial', 'Revisar questões', 'Restaurar padrão',
    ]);
    // Fase 43: "Revisar questões" fica oculto até o painel Questões existir (Fase 44).
    expect(itensDoPainel(false).map((i) => i.id)).not.toContain('revisar');
    expect(itensDoPainel(true).map((i) => i.id)).toContain('revisar');
  });

  it('AC-9.5/FR-9: as cinco configurações guardadas até a v11.0.0 continuam valendo (mesmas chaves e valores)', () => {
    const a = memoria({
      'match-do-saber:modo': 'cabeca', 'match-do-saber:tempoCard': '25', 'match-do-saber:som': 'desligado',
      'match-do-saber:foto': 'desligada', 'match-do-saber:tutorial': 'ligado',
    });
    expect(lerAjustes(a)).toEqual({ ...AJUSTES_PADRAO, modo: 'cabeca', tempoCardS: 25, som: false, foto: false, tutorial: true });
  });

  it('AC-9.5: guarda e lê todos os ajustes', () => {
    const a = memoria();
    const aj: Ajustes = {
      noticiasPorPartida: 5, tempoCardS: 60, feedbackS: 8, voltaResumoS: 60, temas: ['saude', 'politica'], dificuldade: 'crescente',
      modo: 'mao', sensibilidade: 'maior', toleranciaS: 20, som: false, volume: 'baixo', foto: false, qrFontes: false, tutorial: true,
    };
    salvarAjustes(a, aj);
    expect(lerAjustes(a)).toEqual(aj);
    // As chaves antigas mantêm o formato antigo.
    expect(a.dados['match-do-saber:modo']).toBe('mao');
    expect(a.dados['match-do-saber:tempoCard']).toBe('60');
    expect(a.dados['match-do-saber:som']).toBe('desligado');
    expect(a.dados['match-do-saber:foto']).toBe('desligada');
    expect(a.dados['match-do-saber:tutorial']).toBe('ligado');
  });

  it('FR-9: tema novo (ex.: politica) nasce ligado, porque o armazenamento guarda os temas desligados', () => {
    const a = memoria({ 'match-do-saber:temasDesligados': 'saude,historia' });
    expect(lerAjustes(a).temas).toEqual(TEMAS.filter((t) => t !== 'saude' && t !== 'historia'));
    expect(lerAjustes(a).temas).toContain('politica');
  });

  it('FR-9: valor inválido usa o padrão só daquele item; armazenamento bloqueado não quebra', () => {
    const a = memoria({
      'match-do-saber:noticiasPorPartida': '7', 'match-do-saber:tempoFeedback': 'x', 'match-do-saber:voltaResumo': '45',
      'match-do-saber:dificuldade': 'impossivel', 'match-do-saber:sensibilidade': 'muita', 'match-do-saber:tolerancia': '0',
      'match-do-saber:volume': '11', 'match-do-saber:qrFontes': 'desligado', 'match-do-saber:modo': 'pe',
    });
    expect(lerAjustes(a)).toEqual({ ...AJUSTES_PADRAO, qrFontes: false });
    // Todos os temas desligados (ou só temas desconhecidos) = todos ligados: pelo menos um fica ligado.
    expect(lerAjustes(memoria({ 'match-do-saber:temasDesligados': TEMAS.join(',') })).temas).toEqual([...TEMAS]);
    expect(lerAjustes(memoria({ 'match-do-saber:temasDesligados': 'esportes' })).temas).toEqual([...TEMAS]);
    expect(lerAjustes(quebrado)).toEqual(AJUSTES_PADRAO);
    expect(() => salvarAjustes(quebrado, AJUSTES_PADRAO)).not.toThrow();
  });

  it('FR-9 Must not: guarda só chaves dos ajustes', () => {
    const a = memoria();
    salvarAjustes(a, AJUSTES_PADRAO);
    expect(Object.keys(a.dados).every((k) => k.startsWith('match-do-saber:'))).toBe(true);
    expect(Object.keys(a.dados).sort()).toEqual([
      'match-do-saber:dificuldade', 'match-do-saber:foto', 'match-do-saber:modo', 'match-do-saber:noticiasPorPartida',
      'match-do-saber:qrFontes', 'match-do-saber:sensibilidade', 'match-do-saber:som', 'match-do-saber:temasDesligados',
      'match-do-saber:tempoCard', 'match-do-saber:tempoFeedback', 'match-do-saber:tolerancia', 'match-do-saber:tutorial',
      'match-do-saber:voltaResumo', 'match-do-saber:volume',
    ]);
  });

  it('AC-9.17: ←/→ mudam o valor sem passar dos limites', () => {
    const c = { ...AJUSTES_PADRAO, tempoCardS: 10 };
    expect(mudarValor(c, 'tempoCardS', -1)).toBe(c);
    expect(mudarValor(c, 'tempoCardS', 1).tempoCardS).toBe(15);
    const max = { ...c, tempoCardS: 60 };
    expect(mudarValor(max, 'tempoCardS', 1)).toBe(max);
    expect(mudarValor(AJUSTES_PADRAO, 'modo', 1).modo).toBe('mao');
    expect(mudarValor(AJUSTES_PADRAO, 'som', 1).som).toBe(false);
    expect(mudarValor(AJUSTES_PADRAO, 'tutorial', -1).tutorial).toBe(true);
    expect(mudarValor(AJUSTES_PADRAO, 'noticiasPorPartida', 1).noticiasPorPartida).toBe(12);
    expect(mudarValor(AJUSTES_PADRAO, 'voltaResumoS', 1).voltaResumoS).toBe(30);
  });

  it('AC-9.27: alternar tema; pelo menos um fica ligado; a ordem segue a lista de temas', () => {
    const sem = alternarTema(AJUSTES_PADRAO, 'saude');
    expect(sem.temas).not.toContain('saude');
    expect(alternarTema(sem, 'saude').temas).toEqual([...TEMAS]);
    const um = { ...AJUSTES_PADRAO, temas: ['ciencia' as const] };
    expect(alternarTema(um, 'ciencia')).toBe(um);
  });

  it('rótulos dos valores', () => {
    expect(rotuloValor('noticiasPorPartida', 12)).toBe('12');
    expect(rotuloValor('tempoCardS', 45)).toBe('45 s');
    expect(rotuloValor('feedbackS', 5)).toBe('5 s');
    expect(rotuloValor('voltaResumoS', 0)).toBe('Desligada');
    expect(rotuloValor('voltaResumoS', 120)).toBe('120 s');
    expect(rotuloValor('dificuldade', 'misturada')).toBe('Misturada');
    expect(rotuloValor('dificuldade', 'facil')).toBe('Só fácil');
    expect(rotuloValor('dificuldade', 'crescente')).toBe('Crescente');
    expect(rotuloValor('modo', 'cabeca')).toBe('Cabeça');
    expect(rotuloValor('sensibilidade', 'maior')).toBe('Maior');
    expect(rotuloValor('toleranciaS', 20)).toBe('20 s');
    expect(rotuloValor('som', true)).toBe('Ligado');
    expect(rotuloValor('volume', 'medio')).toBe('Médio');
    expect(rotuloValor('foto', false)).toBe('Desligada');
    expect(rotuloValor('qrFontes', true)).toBe('Ligado');
    expect(rotuloValor('tutorial', false)).toBe('Desligado');
  });

  it('AC-9.2: resumo da espera, com "Ajustes personalizados" quando outro ajuste foge do padrão', () => {
    expect(resumoAjustes(AJUSTES_PADRAO)).toBe('Modo: Corpo · 10 notícias · 15 s por card · Som: ligado');
    const basicos = { ...AJUSTES_PADRAO, modo: 'mao' as const, noticiasPorPartida: 5, tempoCardS: 20, som: false };
    expect(resumoAjustes(basicos)).toBe('Modo: Mão · 5 notícias · 20 s por card · Som: desligado');
    expect(resumoAjustes({ ...AJUSTES_PADRAO, tutorial: true })).toBe('Modo: Corpo · 10 notícias · 15 s por card · Som: ligado · Ajustes personalizados');
    expect(resumoAjustes(alternarTema(AJUSTES_PADRAO, 'saude'))).toContain('· Ajustes personalizados');
    expect(resumoAjustes({ ...AJUSTES_PADRAO, temas: [...TEMAS].reverse() })).not.toContain('personalizados');
  });
});

describe('teclado do painel Ajustes (AC-9.2, AC-9.3, AC-9.30)', () => {
  const itens = itensDoPainel(false);
  const idx = (id: string) => itens.findIndex((i) => i.id === id);
  const em = (id: string) => ({ ...PAINEL_INICIAL, item: idx(id) });

  it('↑/↓ passam pelos itens de todos os grupos, em volta', () => {
    let p = PAINEL_INICIAL;
    for (let i = 0; i < itens.length; i++) p = teclaNoPainel(p, AJUSTES_PADRAO, 'ArrowDown', itens).painel;
    expect(p.item).toBe(0);
    expect(teclaNoPainel(PAINEL_INICIAL, AJUSTES_PADRAO, 'ArrowUp', itens).painel.item).toBe(itens.length - 1);
  });

  it('←/→ mudam o valor do item; no limite, nada muda', () => {
    const r = teclaNoPainel(em('noticiasPorPartida'), AJUSTES_PADRAO, 'ArrowRight', itens);
    expect(r.ajustes?.noticiasPorPartida).toBe(12);
    expect(teclaNoPainel(em('tempoCardS'), { ...AJUSTES_PADRAO, tempoCardS: 60 }, 'ArrowRight', itens).ajustes).toBeUndefined();
  });

  it('Temas: ←/→ escolhem o tema e Espaço liga/desliga', () => {
    let p = em('temas');
    p = teclaNoPainel(p, AJUSTES_PADRAO, 'ArrowRight', itens).painel;
    expect(p.tema).toBe(1);
    const r = teclaNoPainel(p, AJUSTES_PADRAO, ' ', itens);
    expect(r.ajustes?.temas).not.toContain(TEMAS[1]);
    expect(teclaNoPainel({ ...p, tema: 0 }, AJUSTES_PADRAO, 'ArrowLeft', itens).painel.tema).toBe(0);
    expect(teclaNoPainel({ ...p, tema: TEMAS.length - 1 }, AJUSTES_PADRAO, 'ArrowRight', itens).painel.tema).toBe(TEMAS.length - 1);
  });

  it('AC-9.3: Esc, M e Enter fecham sem mudar nada', () => {
    for (const t of ['Escape', 'm', 'M', 'Enter']) {
      const r = teclaNoPainel(em('modo'), AJUSTES_PADRAO, t, itens);
      expect(r.fechar).toBe(true);
      expect(r.ajustes).toBeUndefined();
    }
  });

  it('AC-9.30: "Restaurar padrão" pede confirmação (Espaço), e só então volta ao padrão; mudar de item cancela', () => {
    const mexido = { ...AJUSTES_PADRAO, modo: 'mao' as const, temas: ['saude' as const] };
    const r1 = teclaNoPainel(em('restaurar'), mexido, ' ', itens);
    expect(r1.ajustes).toBeUndefined();
    expect(r1.painel.confirmarRestauro).toBe(true);
    const r2 = teclaNoPainel(r1.painel, mexido, ' ', itens);
    expect(r2.ajustes).toEqual(AJUSTES_PADRAO);
    expect(r2.painel.confirmarRestauro).toBe(false);
    expect(teclaNoPainel(r1.painel, mexido, 'ArrowUp', itens).painel.confirmarRestauro).toBe(false);
  });

  it('AC-9.31: Espaço em "Revisar questões" pede para abrir o painel Questões', () => {
    const com = itensDoPainel(true);
    const p = { ...PAINEL_INICIAL, item: com.findIndex((i) => i.id === 'revisar') };
    expect(teclaNoPainel(p, AJUSTES_PADRAO, ' ', com).revisar).toBe(true);
  });
});
