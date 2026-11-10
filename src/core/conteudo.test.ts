import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { jogaveis, validarBanco } from './banco';
import { escreverCsv, lerCsv } from './csv';
import { COLUNAS_BANCO } from './types';

// Banco padrão versionado (FR-6, FR-8): é o que a web e a 1ª abertura do desktop usam.
// O git guarda o arquivo com LF e o Windows o entrega com CRLF: a comparação ignora o fim de linha.
const semCr = (t: string) => t.replace(/\r\n/g, '\n');
const texto = readFileSync('conteudo/noticias.csv', 'utf8');
const banco = lerCsv(texto);

describe('banco padrão conteudo/noticias.csv', () => {
  it('FR-6 (v10.1.0): tem o cabeçalho completo, inclusive `dificuldade`', () => {
    expect(texto.replace(/^﻿/, '').split(/\r?\n/, 1)[0]).toBe(COLUNAS_BANCO.join(';'));
  });

  it('está no formato exportado pelo painel (ida e volta sem diferença)', () => {
    expect(semCr(escreverCsv(banco))).toBe(semCr(texto));
  });

  it('AC-7.7: as 10 notícias do lote 1 são válidas e jogáveis, 5 verdadeiras e 5 falsas', () => {
    expect(validarBanco(banco).invalidas).toEqual([]);
    const jogo = jogaveis(banco);
    expect(jogo).toHaveLength(10);
    expect(jogo.filter((n) => n.veredito === 'verdadeira')).toHaveLength(5);
  });
});
