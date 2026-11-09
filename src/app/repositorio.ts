import { parseCatalogo } from '../core/catalogo';
import { decodificar, escreverCsv, lerCsv } from '../core/csv';
import type { NoticiaBanco } from '../core/types';
import { AVISO_WEB } from './PainelNoticias';

/** Banco carregado: as linhas, onde está (desktop) e a versão lida, para detectar edição fora do painel. */
export interface EstadoBanco {
  banco: NoticiaBanco[];
  arquivo?: string;
  versao: string | null;
}

/** Onde o banco de notícias mora (FR-7, FR-8): no app de desktop, um CSV em Documentos; na web, o embutido. */
export interface RepositorioNoticias {
  tipo: 'desktop' | 'web';
  carregar(): Promise<EstadoBanco>;
  /** Grava o banco inteiro (o app de desktop faz o backup antes). Falha com "Não foi possível salvar: <motivo>". */
  salvar(banco: NoticiaBanco[], versao: string | null): Promise<EstadoBanco>;
}

const base = () => import.meta.env.BASE_URL;

/** Versão web: só lê o banco embutido (AC-8.5); o gerenciador fica no app de desktop (AC-7.9). */
export function repositorioWeb(): RepositorioNoticias {
  return {
    tipo: 'web',
    async carregar() {
      const csv = await fetch(`${base()}content/noticias.csv`);
      if (csv.ok) return { banco: lerCsv(decodificar(await csv.arrayBuffer())), versao: null };
      // Fallback para o noticias.json gerado pela planilha (até a v8.2.0): só tinha notícias aprovadas e revisadas.
      const json = await fetch(`${base()}content/noticias.json`);
      if (!json.ok) throw new Error(`banco embutido indisponível (${csv.status}/${json.status})`);
      const banco = parseCatalogo(await json.json()).noticias.map((x): NoticiaBanco => ({
        id: x.id, titulo: x.titulo, descricao: x.descricao, saiba_mais: x.saibaMais, veredito: x.veredito,
        explicacao: x.explicacao, tecnica: x.tecnica, tema: x.tema, fonte_url: x.fonteUrl, fontes_extras: '',
        imagem: x.imagem ?? '', revisado_por: 'planilha', status: 'aprovada',
      }));
      return { banco, versao: null };
    },
    async salvar() {
      throw new Error(AVISO_WEB);
    },
  };
}

async function respostaJson(r: Response): Promise<Record<string, unknown>> {
  try {
    return (await r.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

/** App de desktop (Fase 35): o processo do Electron serve `/api/noticias` sobre `Documentos/Match do Saber/noticias.csv`. */
export function repositorioDesktop(): RepositorioNoticias {
  const url = () => `${base()}api/noticias`;
  return {
    tipo: 'desktop',
    async carregar() {
      const r = await fetch(url(), { cache: 'no-store' });
      const j = await respostaJson(r);
      if (!r.ok) throw new Error(`Não foi possível ler o banco: ${String(j.erro ?? r.status)}`);
      return { banco: lerCsv(String(j.csv ?? '')), arquivo: String(j.arquivo ?? ''), versao: (j.versao as string) ?? null };
    },
    async salvar(banco, versao) {
      let r: Response;
      try {
        r = await fetch(url(), {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ versao, csv: escreverCsv(banco) }),
        });
      } catch (e) {
        throw new Error(`Não foi possível salvar: ${(e as Error).message}`);
      }
      const j = await respostaJson(r);
      if (!r.ok) throw new Error(`Não foi possível salvar: ${String(j.erro ?? `erro ${r.status}`)}`);
      return { banco, arquivo: String(j.arquivo ?? ''), versao: (j.versao as string) ?? null };
    },
  };
}

/** O preload do Electron expõe `window.matchDoSaber.desktop` (Fase 35); no navegador ele não existe. */
export function criarRepositorio(janela: { matchDoSaber?: { desktop?: boolean } } = window as never): RepositorioNoticias {
  return janela.matchDoSaber?.desktop ? repositorioDesktop() : repositorioWeb();
}
