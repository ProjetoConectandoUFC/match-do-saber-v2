import { describe, expect, it } from 'vitest';
import {
  MAX_TITULO_CURTO, codificarIds, decodificarIds, dominio, enderecoFontes, itensDaPagina, linhasDoResumo, nomeDaFonte,
  tituloCurto,
} from './fontesRodada';
import type { Noticia } from './types';

const noticia = (id: string, extra: Partial<Noticia> = {}): Noticia => ({
  id, titulo: `Título ${id}`, descricao: '', saibaMais: '', tema: 'saude', veredito: 'verdadeira', explicacao: '',
  tecnica: 'fonte', fonteUrl: 'https://www.correiobraziliense.com.br/x', ...extra,
});

describe('tituloCurto (AC-5.8, AC-7.11)', () => {
  it('usa o titulo_curto quando existe', () => {
    expect(tituloCurto({ titulo: 'Um título bem comprido demais para a lista', tituloCurto: 'Curto' })).toBe('Curto');
  });
  it('título que cabe fica inteiro', () => {
    expect(tituloCurto({ titulo: 'Banana é radioativa' })).toBe('Banana é radioativa');
    expect(tituloCurto({ titulo: 'x'.repeat(MAX_TITULO_CURTO) })).toHaveLength(MAX_TITULO_CURTO);
  });
  it('sem titulo_curto, corta numa palavra com "…", no máximo 34 caracteres', () => {
    const t = tituloCurto({ titulo: 'Exército da Austrália declarou guerra contra emas e perdeu' });
    expect(t).toBe('Exército da Austrália declarou…');
    expect(t.length).toBeLessThanOrEqual(MAX_TITULO_CURTO);
    // Sem espaço para cortar: corta no limite.
    expect(tituloCurto({ titulo: 'a'.repeat(50) })).toBe(`${'a'.repeat(33)}…`);
    // Pontuação antes do corte sai: "Médico revela:" não termina em ":…".
    expect(tituloCurto({ titulo: 'Médico revela: água quente com limão cura o câncer' })).toBe('Médico revela: água quente com…');
  });
});

describe('veículo da fonte (AC-5.8)', () => {
  it('domínio sem "www."; link inválido vira texto vazio', () => {
    expect(dominio('https://www.aosfatos.org/noticias/x')).toBe('aosfatos.org');
    expect(dominio('https://olhardigital.com.br/2026/x')).toBe('olhardigital.com.br');
    expect(dominio('não é link')).toBe('');
  });
  it('fonte_nome primeiro; sem ela, o domínio da fonte_url', () => {
    expect(nomeDaFonte(noticia('a', { fonteNome: 'Correio Braziliense' }))).toBe('Correio Braziliense');
    expect(nomeDaFonte(noticia('a'))).toBe('correiobraziliense.com.br');
  });
});

describe('linhasDoResumo (AC-5.8)', () => {
  it('uma linha por card, na ordem jogada: resultado, título curto, veredito e "Fonte:"/"Desmentido por:"', () => {
    const cards = [
      noticia('mds-0001', { tituloCurto: 'Emas venceram' }),
      noticia('mds-0002', { veredito: 'falsa', fonteUrl: 'https://www.aosfatos.org/y', fonteNome: 'Aos Fatos' }),
      noticia('mds-0003', { veredito: 'falsa', fonteUrl: 'https://dn.pt/z' }),
    ];
    expect(linhasDoResumo(cards, ['acerto', 'erro', 'tempo'])).toEqual([
      { id: 'mds-0001', titulo: 'Emas venceram', veredito: 'verdadeira', acertou: true, rotuloFonte: 'Fonte:', fonte: 'correiobraziliense.com.br' },
      { id: 'mds-0002', titulo: 'Título mds-0002', veredito: 'falsa', acertou: false, rotuloFonte: 'Desmentido por:', fonte: 'Aos Fatos' },
      { id: 'mds-0003', titulo: 'Título mds-0003', veredito: 'falsa', acertou: false, rotuloFonte: 'Desmentido por:', fonte: 'dn.pt' },
    ]);
  });
});

describe('ids no QR (AC-5.9): só os ids, depois do #', () => {
  it('mds-NNNN vira o número; outros ids vão inteiros; números puros que não são mds levam "_"', () => {
    expect(codificarIds(['mds-0001', 'mds-0010', 'mds-1234', 'teste-3', '42'])).toBe('1.10.1234.teste-3._42');
  });
  it('ida e volta', () => {
    const ids = ['mds-0001', 'mds-0022', 'teste-12', 'mds-12345', '7'];
    expect(decodificarIds(codificarIds(ids))).toEqual(ids);
  });
  it('decodificar ignora o "#", pedaços inválidos, repetidos e passa de 20 ids', () => {
    expect(decodificarIds('#1.2.<script>.2..x y')).toEqual(['mds-0001', 'mds-0002']);
    expect(decodificarIds(Array.from({ length: 30 }, (_, i) => String(i + 1)).join('.'))).toHaveLength(20);
    expect(decodificarIds('')).toEqual([]);
  });
  it('endereço da página: base com barra no fim, fontes.html e o fragmento', () => {
    expect(enderecoFontes('https://exemplo.github.io/jogo', ['mds-0001', 'mds-0002']))
      .toBe('https://exemplo.github.io/jogo/fontes.html#1.2');
    expect(enderecoFontes('https://exemplo.github.io/jogo/', ['mds-0007'])).toBe('https://exemplo.github.io/jogo/fontes.html#7');
  });
  it('o endereço não leva nada além dos ids (sem respostas, pontos ou foto)', () => {
    const url = enderecoFontes('https://exemplo.github.io/jogo/', ['mds-0001', 'mds-0002']);
    expect(url.split('#')[1]).toMatch(/^[a-z0-9._-]+$/i);
    expect(url).not.toMatch(/acert|erro|ponto|foto|data:/i);
  });
});

describe('itensDaPagina (AC-5.10)', () => {
  it('na ordem pedida, com fonte e links extras; id desconhecido aparece como não encontrado', () => {
    const banco = [
      noticia('mds-0001', { fonteNome: 'Correio Braziliense', fontesExtras: ['https://www.nationalgeographic.com/h'] }),
      noticia('mds-0002', { veredito: 'falsa', fonteUrl: 'https://www.aosfatos.org/y' }),
    ];
    expect(itensDaPagina(banco, ['mds-0002', 'mds-0099', 'mds-0001'])).toEqual([
      {
        id: 'mds-0002', encontrada: true, titulo: 'Título mds-0002', veredito: 'falsa', rotuloFonte: 'Desmentido por:',
        links: [{ url: 'https://www.aosfatos.org/y', nome: 'aosfatos.org' }],
      },
      { id: 'mds-0099', encontrada: false },
      {
        id: 'mds-0001', encontrada: true, titulo: 'Título mds-0001', veredito: 'verdadeira', rotuloFonte: 'Fonte:',
        links: [
          { url: 'https://www.correiobraziliense.com.br/x', nome: 'Correio Braziliense' },
          { url: 'https://www.nationalgeographic.com/h', nome: 'nationalgeographic.com' },
        ],
      },
    ]);
  });
});
