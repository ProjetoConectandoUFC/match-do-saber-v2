import { afterEach, describe, expect, it, vi } from 'vitest';
import { escreverCsv } from '../core/csv';
import type { NoticiaBanco } from '../core/types';
import { criarRepositorio, repositorioDesktop, repositorioWeb } from './repositorio';

const n: NoticiaBanco = {
  id: 'mds-0001', titulo: 'T', descricao: 'D', saiba_mais: 'S', veredito: 'falsa', explicacao: 'E', tecnica: 'fonte',
  tema: 'saude', fonte_url: 'https://exemplo.org', fontes_extras: '', imagem: '', revisado_por: 'Ana', status: 'aprovada', dificuldade: '', titulo_curto: '', fonte_nome: '',
};

function respostas(mapa: Record<string, () => Response>) {
  const chamadas: { url: string; init?: RequestInit }[] = [];
  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
    chamadas.push({ url, init });
    const r = Object.entries(mapa).find(([fim]) => url.endsWith(fim));
    return r ? r[1]() : new Response('não encontrado', { status: 404 });
  }));
  return chamadas;
}

afterEach(() => vi.unstubAllGlobals());

describe('repositório web (AC-7.9, AC-8.5)', () => {
  it('lê o banco embutido em CSV', async () => {
    respostas({ 'content/noticias.csv': () => new Response(escreverCsv([n])) });
    const e = await repositorioWeb().carregar();
    expect(e.banco).toEqual([n]);
  });

  it('sem CSV, usa o noticias.json antigo como notícias aprovadas', async () => {
    respostas({
      'content/noticias.json': () => Response.json({ versao: 'x', noticias: [{
        id: 'p1', titulo: 'T', descricao: 'D', saibaMais: 'S', veredito: 'falsa', explicacao: 'E', tecnica: 'fonte',
        tema: 'saude', fonteUrl: 'https://exemplo.org',
      }] }),
    });
    const [x] = (await repositorioWeb().carregar()).banco;
    expect(x).toMatchObject({ id: 'p1', saiba_mais: 'S', fonte_url: 'https://exemplo.org', status: 'aprovada', imagem: '' });
    expect(x!.revisado_por).not.toBe('');
  });

  it('não grava: só o app de desktop gerencia', async () => {
    const repo = repositorioWeb();
    expect(repo.tipo).toBe('web');
    await expect(repo.salvar([n], null)).rejects.toThrow('O gerenciador de notícias está disponível no app de desktop');
  });
});

describe('repositório desktop (FR-7, FR-8)', () => {
  it('carregar lê /api/noticias com o arquivo e a versão', async () => {
    respostas({ 'api/noticias': () => Response.json({ arquivo: 'C:/Docs/Match do Saber/noticias.csv', versao: 'h1', csv: escreverCsv([n]) }) });
    const e = await repositorioDesktop().carregar();
    expect(e).toEqual({ banco: [n], arquivo: 'C:/Docs/Match do Saber/noticias.csv', versao: 'h1' });
  });

  it('salvar manda o CSV de FR-6 e a versão lida; devolve a versão nova', async () => {
    const chamadas = respostas({ 'api/noticias': () => Response.json({ arquivo: 'f.csv', versao: 'h2' }) });
    const e = await repositorioDesktop().salvar([n], 'h1');
    expect(chamadas[0]!.init?.method).toBe('PUT');
    expect(JSON.parse(chamadas[0]!.init!.body as string)).toEqual({ versao: 'h1', csv: escreverCsv([n]) });
    expect(e).toEqual({ banco: [n], arquivo: 'f.csv', versao: 'h2' });
  });

  it('erro na gravação vira "Não foi possível salvar: <motivo>"', async () => {
    respostas({ 'api/noticias': () => Response.json({ erro: 'arquivo aberto no Excel' }, { status: 500 }) });
    await expect(repositorioDesktop().salvar([n], 'h1')).rejects.toThrow('Não foi possível salvar: arquivo aberto no Excel');
  });
});

describe('criarRepositorio', () => {
  it('desktop quando o app de desktop se anuncia; senão, web', () => {
    expect(criarRepositorio({}).tipo).toBe('web');
    expect(criarRepositorio({ matchDoSaber: { desktop: true } }).tipo).toBe('desktop');
  });
});
