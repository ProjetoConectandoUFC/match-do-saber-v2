import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { criarBancoLocal } from './banco-local.cjs';

const CABECALHO = 'id;titulo;descricao;saiba_mais;veredito;explicacao;tecnica;tema;fonte_url;fontes_extras;imagem;revisado_por;status';
const EMBUTIDO = `\uFEFF${CABECALHO}\r\nmds-0001;Embutida;D;S;falsa;E;fonte;saude;https://a.org;;;Ana;aprovada\r\n`;

let raiz: string;
let pasta: string;
let embutido: string;
let relogio: number;
const agora = () => new Date(relogio);

beforeEach(() => {
  raiz = mkdtempSync(join(tmpdir(), 'mds-'));
  pasta = join(raiz, 'Documentos', 'Match do Saber');
  embutido = join(raiz, 'embutido.csv');
  writeFileSync(embutido, EMBUTIDO);
  relogio = new Date(2026, 10, 9, 14, 3, 5).getTime(); // hora local, como no nome do backup
});
afterEach(() => rmSync(raiz, { recursive: true, force: true }));

const backups = () => (existsSync(join(pasta, 'backups')) ? readdirSync(join(pasta, 'backups')).sort() : []);

describe('banco local do app de desktop (FR-7, FR-8)', () => {
  it('AC-8.3: na 1ª abertura cria Documentos/Match do Saber/noticias.csv a partir do embutido', () => {
    const b = criarBancoLocal({ pasta, embutido, agora });
    const r = b.ler();
    expect(r.arquivo).toBe(join(pasta, 'noticias.csv'));
    expect(readFileSync(r.arquivo, 'utf8')).toBe(EMBUTIDO);
    expect(r.csv).toBe(EMBUTIDO);
    expect(r.versao).toMatch(/^[0-9a-f]{64}$/);
  });

  it('AC-8.3/AC-8.4: nas aberturas seguintes lê o arquivo local (editado fora do jogo)', () => {
    const b = criarBancoLocal({ pasta, embutido, agora });
    b.ler();
    writeFileSync(join(pasta, 'noticias.csv'), `${CABECALHO}\nmds-0009;Do Excel;D;S;falsa;E;fonte;saude;https://a.org;;;Ana;aprovada\n`);
    expect(b.ler().csv).toContain('Do Excel');
  });

  it('lê CSV salvo pelo Excel em Windows-1252', () => {
    mkdirSync(pasta, { recursive: true });
    writeFileSync(join(pasta, 'noticias.csv'), Buffer.concat([Buffer.from(`${CABECALHO}\nx;Sa`), Buffer.from([0xfa]), Buffer.from('de;D\n')]));
    expect(criarBancoLocal({ pasta, embutido, agora }).ler().csv).toContain('Saúde');
  });

  it('arquivo vazio ou ilegível vai para backups e é recriado do embutido', () => {
    mkdirSync(pasta, { recursive: true });
    writeFileSync(join(pasta, 'noticias.csv'), 'lixo sem cabeçalho');
    const r = criarBancoLocal({ pasta, embutido, agora }).ler();
    expect(r.csv).toBe(EMBUTIDO);
    expect(backups()).toEqual(['noticias-ilegivel-2026-11-09_14-03-05.csv']);
    expect(readFileSync(join(pasta, 'backups', backups()[0]!), 'utf8')).toBe('lixo sem cabeçalho');
  });

  it('AC-7.6/FR-7: antes de gravar copia o arquivo anterior para backups com data e hora', () => {
    const b = criarBancoLocal({ pasta, embutido, agora });
    const { versao } = b.ler();
    const novo = `\uFEFF${CABECALHO}\r\nmds-0002;Nova;D;S;falsa;E;fonte;saude;https://a.org;;;Ana;aprovada\r\n`;
    const r = b.gravar({ versao, csv: novo });
    expect(readFileSync(join(pasta, 'noticias.csv'), 'utf8')).toBe(novo);
    expect(r.versao).not.toBe(versao);
    expect(backups()).toEqual(['noticias-2026-11-09_14-03-05.csv']);
    expect(readFileSync(join(pasta, 'backups', backups()[0]!), 'utf8')).toBe(EMBUTIDO);
    // Duas gravações no mesmo segundo não sobrescrevem o backup.
    b.gravar({ versao: r.versao, csv: EMBUTIDO });
    expect(backups()).toEqual(['noticias-2026-11-09_14-03-05-2.csv', 'noticias-2026-11-09_14-03-05.csv']);
  });

  it('recusa gravar se o arquivo mudou desde a leitura (editado no Excel), sem tocar nele', () => {
    const b = criarBancoLocal({ pasta, embutido, agora });
    const { versao } = b.ler();
    writeFileSync(join(pasta, 'noticias.csv'), `${CABECALHO}\n`);
    expect(() => b.gravar({ versao, csv: EMBUTIDO })).toThrow(/alterado fora do painel/);
    expect(readFileSync(join(pasta, 'noticias.csv'), 'utf8')).toBe(`${CABECALHO}\n`);
    expect(backups()).toEqual([]);
  });

  it('recusa conteúdo que não é o CSV do banco', () => {
    const b = criarBancoLocal({ pasta, embutido, agora });
    const { versao } = b.ler();
    expect(() => b.gravar({ versao, csv: 'nome;idade\n' })).toThrow(/formato/);
    expect(() => b.gravar({ versao, csv: 42 as unknown as string })).toThrow(/formato/);
  });

  it('mantém só os 100 backups mais recentes', () => {
    const b = criarBancoLocal({ pasta, embutido, agora });
    let { versao } = b.ler();
    for (let i = 0; i < 102; i++) {
      relogio += 1000;
      versao = b.gravar({ versao, csv: EMBUTIDO }).versao;
    }
    expect(backups()).toHaveLength(100);
    expect(backups()[0]).toBe('noticias-2026-11-09_14-03-08.csv');
  });
});
