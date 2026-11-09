import { useEffect, useMemo, useRef, useState } from 'react';
import {
  alterarEmMassa, apagarNoticias, descreverProblemas, gravarNoticia, jogaveis, novaNoticia, prepararImportacao,
  validarBanco, type CampoEmMassa, type LinhaImportada, type Problemas,
} from '../core/banco';
import { decodificar, escreverCsv, lerCsv } from '../core/csv';
import {
  STATUS, TECNICAS, TECNICA_ROTULO, TEMAS, TEMA_ROTULO, VEREDITOS, type NoticiaBanco,
} from '../core/types';
import { baixarTexto } from './baixar';
import { EditorNoticia } from './EditorNoticia';
import type { EstadoBanco, RepositorioNoticias } from './repositorio';
import p from './PainelNoticias.module.css';

export const AVISO_WEB = 'O gerenciador de notícias está disponível no app de desktop';

const OPCOES_MASSA: Record<CampoEmMassa, { rotulo: string; valores: readonly string[]; rotulos: Record<string, string> }> = {
  status: { rotulo: 'Status', valores: STATUS, rotulos: { rascunho: 'Rascunho', aprovada: 'Aprovada' } },
  tema: { rotulo: 'Tema', valores: TEMAS, rotulos: TEMA_ROTULO },
  tecnica: { rotulo: 'Técnica', valores: TECNICAS, rotulos: TECNICA_ROTULO },
};

const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;
const normalizar = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

async function lerArquivo(f: File): Promise<ArrayBuffer> {
  if (typeof f.arrayBuffer === 'function') return f.arrayBuffer();
  return new Promise((ok, falha) => {
    const r = new FileReader();
    r.onload = () => ok(r.result as ArrayBuffer);
    r.onerror = () => falha(r.error);
    r.readAsArrayBuffer(f);
  });
}

type Editor = { original: string | null; inicial: NoticiaBanco; problemas: Problemas };
type Importacao = { nome: string; novas: NoticiaBanco[]; existentes: LinhaImportada[]; invalidas: LinhaImportada[] };
type Confirmacao = { mensagem: string; acao: string; executar: () => Promise<unknown> };
type Mensagem = { texto: string; erro: boolean };

/**
 * Painel "Notícias" (FR-7, AC-7.1 a AC-7.9), aberto pelo menu ☰ só na tela de espera.
 * Na versão web (sem `repo` de desktop) só mostra o aviso de AC-7.9.
 * Estilo mínimo: o Agente Visual estiliza por `data-painel`, `data-situacao`, `data-acao` etc.
 */
export function PainelNoticias({ repo, estado, onBancoAlterado = () => {}, onFechar }: {
  repo?: RepositorioNoticias;
  estado?: EstadoBanco;
  onBancoAlterado?: (e: EstadoBanco) => void;
  onFechar: () => void;
}) {
  const desktop = repo?.tipo === 'desktop' && !!estado;
  const banco = estado?.banco ?? [];

  const [busca, setBusca] = useState('');
  const [veredito, setVeredito] = useState('');
  const [tema, setTema] = useState('');
  const [status, setStatus] = useState('');
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [campoMassa, setCampoMassa] = useState<CampoEmMassa | ''>('');
  const [valorMassa, setValorMassa] = useState('');
  const [editor, setEditor] = useState<Editor | null>(null);
  const [importacao, setImportacao] = useState<Importacao | null>(null);
  const [confirmacao, setConfirmacao] = useState<Confirmacao | null>(null);
  const [mensagem, setMensagem] = useState<Mensagem | null>(null);
  const [salvando, setSalvando] = useState(false);
  const estadoRef = useRef(estado);
  estadoRef.current = estado;

  // Ao abrir, relê o arquivo (pode ter sido editado no Excel; AC-8.4).
  useEffect(() => {
    if (repo?.tipo !== 'desktop') return;
    let vivo = true;
    repo.carregar()
      .then((e) => { if (vivo) onBancoAlterado(e); })
      .catch((e: Error) => { if (vivo) setMensagem({ texto: e.message, erro: true }); });
    return () => { vivo = false; };
  }, [repo]); // só ao abrir (onBancoAlterado muda a cada render do App)

  // Esc fecha a camada de cima: confirmação, importação, editor e, por fim, o painel.
  const topoRef = useRef<() => void>(onFechar);
  topoRef.current = confirmacao ? () => setConfirmacao(null)
    : importacao ? () => setImportacao(null)
    : editor ? () => setEditor(null)
    : onFechar;
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); topoRef.current(); }
    };
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, []);

  const validacao = useMemo(() => validarBanco(banco), [banco]);
  const motivoPorLinha = useMemo(() => {
    const m = new Map<number, string>();
    for (const x of validacao.invalidas) m.set(x.indice, descreverProblemas(x.problemas));
    return m;
  }, [validacao]);
  const noJogo = useMemo(() => jogaveis(banco).length, [banco]);

  const visiveis = useMemo(() => {
    const q = normalizar(busca.trim());
    return banco
      .map((n, indice) => ({ n, indice, motivo: motivoPorLinha.get(indice) }))
      .filter(({ n, motivo }) =>
        (!q || normalizar(`${n.id} ${n.titulo} ${n.descricao} ${n.revisado_por}`).includes(q))
        && (!veredito || n.veredito === veredito)
        && (!tema || n.tema === tema)
        && (!status || (status === 'invalida' ? !!motivo : n.status === status)));
  }, [banco, busca, veredito, tema, status, motivoPorLinha]);

  if (!desktop) {
    return (
      <div className={p.fundo} role="dialog" aria-modal="true" aria-label="Notícias" data-painel="noticias">
        <section className={p.painel}>
          <header className={p.topo}>
            <h2>Notícias</h2>
            <button type="button" className={p.fechar} aria-label="Fechar" onClick={onFechar}><span className={p.xis} aria-hidden="true" /></button>
          </header>
          <p className={p.aviso} data-aviso="web">{AVISO_WEB}</p>
        </section>
      </div>
    );
  }

  /** Grava o banco inteiro; o app de desktop faz o backup antes (AC-7.6). */
  async function salvar(novo: NoticiaBanco[], texto: string): Promise<boolean> {
    setSalvando(true);
    try {
      const e = await repo!.salvar(novo, estadoRef.current?.versao ?? null);
      onBancoAlterado(e);
      setMensagem({ texto, erro: false });
      return true;
    } catch (e) {
      setMensagem({ texto: (e as Error).message, erro: true });
      return false;
    } finally {
      setSalvando(false);
    }
  }

  function abrirEditor(n: NoticiaBanco | null) {
    setMensagem(null);
    setEditor(n ? { original: n.id, inicial: n, problemas: {} } : { original: null, inicial: novaNoticia(banco), problemas: {} });
  }

  async function salvarEditor(n: NoticiaBanco) {
    if (!editor) return;
    const r = gravarNoticia(banco, n, editor.original);
    if ('problemas' in r) {
      setEditor({ ...editor, problemas: r.problemas });
      return;
    }
    setEditor({ ...editor, problemas: {} });
    if (await salvar(r.banco, editor.original === null ? 'Notícia adicionada.' : 'Notícia salva.')) setEditor(null);
  }

  function pedirApagar(ids: string[], depois?: () => void) {
    setConfirmacao({
      mensagem: `${ids.length === 1 ? `Apagar a notícia ${ids[0]}?` : `Apagar ${ids.length} notícias?`} Uma cópia do arquivo anterior fica na pasta de backups.`,
      acao: 'Apagar',
      executar: async () => {
        if (await salvar(apagarNoticias(banco, ids), ids.length === 1 ? 'Notícia apagada.' : `${ids.length} notícias apagadas.`)) {
          setSel(new Set());
          depois?.();
        }
      },
    });
  }

  function pedirAlterarEmMassa() {
    if (!campoMassa || !valorMassa) {
      setMensagem({ texto: 'Escolha o campo e o novo valor para alterar as selecionadas.', erro: true });
      return;
    }
    const ids = [...sel];
    const novo = alterarEmMassa(banco, ids, campoMassa, valorMassa);
    // Não deixa a alteração em massa invalidar notícias (ex.: aprovar sem revisor; Princípio 1).
    const antes = new Set(validacao.invalidas.map((x) => x.indice));
    const quebradas = validarBanco(novo).invalidas.filter((x) => !antes.has(x.indice));
    if (quebradas.length) {
      setMensagem({
        texto: `Não foi possível aplicar: ficariam inválidas ${quebradas.map((x) => `${x.noticia.id} (${descreverProblemas(x.problemas)})`).join('; ')}`,
        erro: true,
      });
      return;
    }
    const o = OPCOES_MASSA[campoMassa];
    setConfirmacao({
      mensagem: `Mudar ${o.rotulo.toLowerCase()} para "${o.rotulos[valorMassa] ?? valorMassa}" em ${plural(ids.length, 'notícia', 'notícias')}?`,
      acao: 'Aplicar',
      executar: async () => {
        if (await salvar(novo, `${plural(ids.length, 'notícia atualizada', 'notícias atualizadas')}.`)) {
          setCampoMassa('');
          setValorMassa('');
        }
      },
    });
  }

  async function lerImportacao(f: File) {
    setMensagem(null);
    try {
      const linhas = lerCsv(decodificar(await lerArquivo(f)));
      setImportacao({ nome: f.name, ...prepararImportacao(banco, linhas) });
    } catch (e) {
      setMensagem({ texto: `Não foi possível ler ${f.name}: ${(e as Error).message}`, erro: true });
    }
  }

  async function confirmarImportacao() {
    if (!importacao) return;
    const n = importacao.novas.length;
    if (await salvar([...banco, ...importacao.novas], `${plural(n, 'notícia importada', 'notícias importadas')}.`)) setImportacao(null);
  }

  const todasVisiveis = visiveis.length > 0 && visiveis.every(({ n }) => sel.has(n.id));
  const alternar = (id: string, marcar: boolean) => setSel((s) => {
    const x = new Set(s);
    if (marcar) x.add(id); else x.delete(id);
    return x;
  });
  const verdadeiras = banco.filter((n) => n.veredito === 'verdadeira').length;
  const falsas = banco.filter((n) => n.veredito === 'falsa').length;
  const hoje = new Date().toISOString().slice(0, 10);

  return (
    <div className={p.fundo} role="dialog" aria-modal="true" aria-label="Notícias" data-painel="noticias">
      <section className={p.painel}>
        <header className={p.topo}>
          <div>
            <h2>Notícias</h2>
            <p className={p.sub}>
              {`${plural(banco.length, 'notícia', 'notícias')} · ${plural(verdadeiras, 'verdadeira', 'verdadeiras')} · ${plural(falsas, 'falsa', 'falsas')} · ${noJogo} no jogo`}
            </p>
            {estado?.arquivo && <p className={p.sub} data-arquivo>{`Arquivo: ${estado.arquivo}`}</p>}
          </div>
          <button type="button" className={p.fechar} aria-label="Fechar" onClick={onFechar}><span className={p.xis} aria-hidden="true" /></button>
        </header>

        <div className={p.acoes}>
          <button type="button" data-acao="nova" onClick={() => abrirEditor(null)}>Nova notícia</button>
          <label className={p.botaoArquivo} data-acao="importar">
            Importar CSV
            <input
              type="file"
              accept=".csv,text/csv"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = '';
                if (f) void lerImportacao(f);
              }}
            />
          </label>
          <button type="button" data-acao="exportar" onClick={() => baixarTexto(escreverCsv(banco), `noticias-${hoje}.csv`, 'text/csv;charset=utf-8')}>
            Exportar CSV
          </button>
        </div>

        <div className={p.filtros}>
          <label>Buscar<input type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="id, título, descrição…" /></label>
          <label>Veredito
            <select value={veredito} onChange={(e) => setVeredito(e.target.value)}>
              <option value="">Todos</option>
              {VEREDITOS.map((v) => <option key={v} value={v}>{v === 'verdadeira' ? 'Verdadeira' : 'Falsa'}</option>)}
            </select>
          </label>
          <label>Tema
            <select value={tema} onChange={(e) => setTema(e.target.value)}>
              <option value="">Todos</option>
              {TEMAS.map((t) => <option key={t} value={t}>{TEMA_ROTULO[t]}</option>)}
            </select>
          </label>
          <label>Status
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">Todos</option>
              <option value="rascunho">Rascunho</option>
              <option value="aprovada">Aprovada</option>
              <option value="invalida">Inválida</option>
            </select>
          </label>
        </div>

        {sel.size > 0 && (
          <div className={p.massa} data-massa>
            <strong>{plural(sel.size, 'selecionada', 'selecionadas')}</strong>
            <button type="button" data-acao="apagar-selecionadas" onClick={() => pedirApagar([...sel])} disabled={salvando}>Apagar</button>
            <label>Campo
              <select value={campoMassa} onChange={(e) => { setCampoMassa(e.target.value as CampoEmMassa | ''); setValorMassa(''); }}>
                <option value="">—</option>
                {(Object.keys(OPCOES_MASSA) as CampoEmMassa[]).map((c) => <option key={c} value={c}>{OPCOES_MASSA[c].rotulo}</option>)}
              </select>
            </label>
            <label>Novo valor
              <select value={valorMassa} onChange={(e) => setValorMassa(e.target.value)} disabled={!campoMassa}>
                <option value="">—</option>
                {campoMassa && OPCOES_MASSA[campoMassa].valores.map((v) => <option key={v} value={v}>{OPCOES_MASSA[campoMassa].rotulos[v] ?? v}</option>)}
              </select>
            </label>
            <button type="button" data-acao="aplicar-massa" onClick={pedirAlterarEmMassa} disabled={salvando}>Aplicar</button>
          </div>
        )}

        {mensagem && (mensagem.erro
          ? <p className={p.erro} role="alert">{mensagem.texto}</p>
          : <p className={p.ok} role="status">{mensagem.texto}</p>)}

        <div className={p.tabela}>
          <table>
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    aria-label="Selecionar todas as visíveis"
                    checked={todasVisiveis}
                    onChange={(e) => visiveis.forEach(({ n }) => alternar(n.id, e.target.checked))}
                  />
                </th>
                <th>ID</th><th>Título</th><th>Veredito</th><th>Tema</th><th>Status</th><th>Situação</th><th />
              </tr>
            </thead>
            <tbody>
              {visiveis.map(({ n, indice, motivo }) => {
                const situacao = motivo ? 'invalida' : n.status === 'aprovada' ? 'no-jogo' : 'fora';
                return (
                  <tr key={indice} data-id={n.id} data-situacao={situacao}>
                    <td><input type="checkbox" aria-label={`Selecionar ${n.id}`} checked={sel.has(n.id)} onChange={(e) => alternar(n.id, e.target.checked)} /></td>
                    <td>{n.id}</td>
                    <td>{n.titulo}</td>
                    <td>{n.veredito}</td>
                    <td>{n.tema}</td>
                    <td>{n.status}</td>
                    <td>{motivo ? `inválida: ${motivo}` : n.status === 'aprovada' ? 'no jogo' : 'fora do jogo'}</td>
                    <td><button type="button" data-acao="editar" onClick={() => abrirEditor(n)}>Editar</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {visiveis.length === 0 && (
            <p className={p.vazio}>{banco.length ? 'Nenhuma notícia com esses filtros.' : 'Nenhuma notícia cadastrada.'}</p>
          )}
        </div>
      </section>

      {editor && (
        <EditorNoticia
          key={editor.original ?? 'nova'}
          inicial={editor.inicial}
          nova={editor.original === null}
          problemas={editor.problemas}
          salvando={salvando}
          onSalvar={(n) => void salvarEditor(n)}
          onApagar={editor.original === null ? undefined : () => pedirApagar([editor.original!], () => setEditor(null))}
          onCancelar={() => setEditor(null)}
        />
      )}

      {importacao && (
        <div className={p.camada} role="dialog" aria-modal="true" aria-label="Importar CSV" data-importacao>
          <section className={p.caixa}>
            <header className={p.topo}>
              <h3>Importar CSV</h3>
              <button type="button" aria-label="Fechar importação" onClick={() => setImportacao(null)}>✕</button>
            </header>
            <p className={p.sub}>{`${importacao.nome}: só as novas válidas entram no banco.`}</p>
            <p className={p.pilulas}>
              <span data-pilula="novas">{plural(importacao.novas.length, 'nova', 'novas')}</span>
              <span data-pilula="existentes">{plural(importacao.existentes.length, 'já existe', 'já existem')}</span>
              <span data-pilula="invalidas">{plural(importacao.invalidas.length, 'inválida', 'inválidas')}</span>
            </p>
            <div className={p.tabela}>
              <table>
                <thead><tr><th>Linha</th><th>ID</th><th>Título</th><th>Situação</th></tr></thead>
                <tbody>
                  {[
                    ...importacao.novas.map((noticia) => ({ linha: null as number | null, noticia, situacao: 'nova', texto: 'nova' })),
                    ...importacao.existentes.map((l) => ({ linha: l.linha, noticia: l.noticia, situacao: 'existente', texto: 'já existe (não entra)' })),
                    ...importacao.invalidas.map((l) => ({ linha: l.linha, noticia: l.noticia, situacao: 'invalida', texto: `inválida: ${l.motivo}` })),
                  ].map((l, i) => (
                    <tr key={i} data-situacao={l.situacao}>
                      <td>{l.linha ?? '—'}</td><td>{l.noticia.id}</td><td>{l.noticia.titulo}</td><td>{l.texto}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <footer className={p.rodape}>
              <span className={p.espaco} />
              <button type="button" onClick={() => setImportacao(null)}>Cancelar</button>
              <button type="button" data-acao="confirmar-importacao" disabled={!importacao.novas.length || salvando} onClick={() => void confirmarImportacao()}>
                {importacao.novas.length ? `Adicionar ${importacao.novas.length}` : 'Nada para adicionar'}
              </button>
            </footer>
          </section>
        </div>
      )}

      {confirmacao && (
        <div className={p.camada} role="alertdialog" aria-modal="true" aria-label="Confirmar" data-confirmacao>
          <section className={p.caixa}>
            <p>{confirmacao.mensagem}</p>
            <footer className={p.rodape}>
              <span className={p.espaco} />
              <button type="button" onClick={() => setConfirmacao(null)}>Cancelar</button>
              <button
                type="button"
                data-acao="confirmar"
                disabled={salvando}
                onClick={() => { const c = confirmacao; setConfirmacao(null); void c.executar(); }}
              >
                {confirmacao.acao}
              </button>
            </footer>
          </section>
        </div>
      )}
    </div>
  );
}
