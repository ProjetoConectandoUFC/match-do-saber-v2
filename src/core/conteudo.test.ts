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
  it('FR-6 (v10.1.0, v11.0.0): tem o cabeçalho completo, inclusive `dificuldade`, `titulo_curto` e `fonte_nome`', () => {
    expect(texto.replace(/^﻿/, '').split(/\r?\n/, 1)[0]).toBe(COLUNAS_BANCO.join(';'));
  });

  it('está no formato exportado pelo painel (ida e volta sem diferença)', () => {
    expect(semCr(escreverCsv(banco))).toBe(semCr(texto));
  });

  it('AC-7.7 (v12.0.0): lote 1 (10) + aprovadas do lote 3 (6) são válidas e jogáveis, 9 verdadeiras e 7 falsas', () => {
    expect(validarBanco(banco).invalidas).toEqual([]);
    const jogo = jogaveis(banco);
    expect(jogo).toHaveLength(16);
    expect(jogo.filter((n) => n.veredito === 'verdadeira')).toHaveLength(9);
    expect(jogo.filter((n) => n.tema === 'politica')).toHaveLength(6);
  });

  it('AC-7.10 (v12.0.0): todas as notícias do banco padrão têm dificuldade (a do lote 1 é a proposta de 2026-11-10)', () => {
    expect(banco.filter((n) => !n.dificuldade).map((n) => n.id)).toEqual([]);
  });
});
