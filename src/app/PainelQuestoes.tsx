import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import type { Problemas } from '../core/banco';
import {
  FILTROS_VAZIOS, alterarVisibilidade, analisarQuestoes, aprovarQuestao, contarQuestoes, filtrarQuestoes, fontesDaQuestao,
  gravarQuestao, questaoVizinha, voltarParaRascunho, type ContagemQuestoes, type FiltrosQuestoes, type Questao,
  type SituacaoQuestao,
} from '../core/questoes';
import {
  DIFICULDADES, DIFICULDADE_ROTULO, TECNICA_ROTULO, TEMAS, TEMA_ROTULO, VEREDITOS,
  type Dificuldade, type NoticiaBanco, type Tecnica, type Tema,
} from '../core/types';
import { EditorNoticia } from './EditorNoticia';
import { IlustracaoTema } from './IlustracaoTema';
import { ilustracaoDaNoticia } from './ilustracoes';
import { AVISO_WEB } from './PainelNoticias';
import type { EstadoBanco, RepositorioNoticias } from './repositorio';
import { MarcaMentira, MarcaVerdade } from './Telas';
import q from './PainelQuestoes.module.css';

const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;
const src = (caminho: string) => (/^(https?:|data:)/.test(caminho) ? caminho : `${import.meta.env.BASE_URL}${caminho}`);
const ehLink = (url: string) => /^https?:\/\/\S+$/i.test(url);

const SITUACAO_ROTULO: Record<SituacaoQuestao, string> = { jogavel: 'Jogável', oculta: 'Oculta', rascunho: 'Rascunho', invalida: 'Inválida' };
const STATUS_ROTULO: Record<string, string> = { rascunho: 'Rascunho', aprovada: 'Aprovada' };

/** AC-16.1: "N no banco · J jogáveis · O ocultas · R rascunhos · I inválidas · V verdadeiras e F falsas entre as jogáveis". */
export function textoContagemQuestoes(c: ContagemQuestoes): string {
  return [
    `${c.total} no banco`,
    plural(c.jogaveis, 'jogável', 'jogáveis'),
    plural(c.ocultas, 'oculta', 'ocultas'),
    plural(c.rascunhos, 'rascunho', 'rascunhos'),
    plural(c.invalidas, 'inválida', 'inválidas'),
    `${plural(c.verdadeiras, 'verdadeira', 'verdadeiras')} e ${plural(c.falsas, 'falsa', 'falsas')} entre as jogáveis`,
  ].join(' · ');
}

type Mensagem = { texto: string; erro: boolean };
type Editor = { indice: number; inicial: NoticiaBanco; problemas: Problemas };

/** Imagem do card como o jogador vê (FR-4): a foto, ou a ilustração da notícia ou do tema. */
function ImagemQuestao({ n }: { n: NoticiaBanco }) {
  if (n.imagem) return <img src={src(n.imagem)} alt="" />;
  if (TEMAS.includes(n.tema as Tema)) return <IlustracaoTema tema={n.tema as Tema} imagem={ilustracaoDaNoticia(n.id)} />;
  return <div className={q.semImagem}>Sem imagem (tema fora da lista)</div>;
}

function Gabarito({ veredito }: { veredito: string }) {
  if (veredito === 'verdadeira') {
    return <span className={`${q.pilula} ${q.verdade}`} data-gabarito="verdadeira"><MarcaVerdade largura={16} />Verdade</span>;
  }
  if (veredito === 'falsa') {
    return <span className={`${q.pilula} ${q.mentira}`} data-gabarito="falsa"><MarcaMentira largura={16} />Mentira</span>;
  }
  return <span className={q.pilula} data-gabarito="">{veredito ? `Veredito "${veredito}"` : 'Sem veredito'}</span>;
}

/**
 * Painel "Questões" (Story 16, FR-17), aberto pelo ☰ ou por Ajustes › Revisar questões, só na tela de espera.
 * No estilo do gerenciador do Prova ou Reprova: lista à esquerda, questão aberta à direita, navegação "N de M".
 * Lê o mesmo banco das partidas e usa a mesma validação e regra de jogável (`src/core/questoes.ts`).
 * No app de desktop grava pelo mesmo caminho do painel Notícias (com backup, AC-7.6); na web é só leitura.
 */
export function PainelQuestoes({
  repo, estado, onBancoAlterado = () => {}, onFechar, filtroInicial, revisor, onRevisor, abrirLink,
}: {
  repo?: RepositorioNoticias;
  estado: EstadoBanco;
  onBancoAlterado?: (e: EstadoBanco) => void;
  onFechar: () => void;
  /** AC-9.31: "Revisar questões" abre já filtrado por Rascunho. */
  filtroInicial?: Partial<FiltrosQuestoes>;
  /** Nome de quem revisa, guardado só na memória durante a sessão (AC-16.5). */
  revisor: string;
  onRevisor: (nome: string) => void;
  /** App de desktop: abre o link no navegador do sistema (preload, `shell.openExternal`). */
  abrirLink?: (url: string) => void;
}) {
  const desktop = repo?.tipo === 'desktop';
  const banco = estado.banco;
  const [filtros, setFiltros] = useState<FiltrosQuestoes>(() => ({ ...FILTROS_VAZIOS, ...filtroInicial }));
  const [escolhida, setEscolhida] = useState<number | null>(null);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [pedirNome, setPedirNome] = useState<{ indice: number; nome: string } | null>(null);
  const [mensagem, setMensagem] = useState<Mensagem | null>(null);
  const [salvando, setSalvando] = useState(false);
  const estadoRef = useRef(estado);
  estadoRef.current = estado;

  // Ao abrir no desktop, relê o arquivo (pode ter sido editado no Excel; AC-8.4).
  useEffect(() => {
    if (repo?.tipo !== 'desktop') return;
    let vivo = true;
    repo.carregar()
      .then((e) => { if (vivo) onBancoAlterado(e); })
      .catch((e: Error) => { if (vivo) setMensagem({ texto: e.message, erro: true }); });
    return () => { vivo = false; };
  }, [repo]); // só ao abrir (onBancoAlterado muda a cada render do App)

  const questoes = useMemo(() => analisarQuestoes(banco), [banco]);
  const contagem = useMemo(() => contarQuestoes(questoes), [questoes]);
  const lista = useMemo(() => filtrarQuestoes(questoes, filtros), [questoes, filtros]);
  // A questão aberta é a escolhida, se ela passa nos filtros; senão, a primeira da lista.
  const aberta: Questao | undefined = lista.find((x) => x.indice === escolhida) ?? lista[0];
  const posicao = aberta ? lista.indexOf(aberta) : -1;

  // Teclado (AC-16.6): captura no window, para nenhuma tecla chegar ao jogo (FR-14); Esc fecha a camada de cima.
  const tecladoRef = useRef<(e: KeyboardEvent) => void>(() => {});
  tecladoRef.current = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      if (pedirNome) setPedirNome(null);
      else if (editor) setEditor(null);
      else onFechar();
      return;
    }
    if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && !pedirNome && !editor) {
      const alvo = e.target as HTMLElement | null;
      const tag = alvo?.tagName;
      if (tag === 'SELECT' || tag === 'TEXTAREA' || (tag === 'INPUT' && (alvo as HTMLInputElement).type === 'text')) return;
      e.preventDefault();
      const prox = questaoVizinha(lista, aberta?.indice ?? null, e.key === 'ArrowDown' ? 1 : -1);
      if (prox !== null) setEscolhida(prox);
    }
  };
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      e.stopImmediatePropagation();
      tecladoRef.current(e);
    };
    window.addEventListener('keydown', tecla, { capture: true });
    return () => window.removeEventListener('keydown', tecla, { capture: true });
  }, []);

  // A questão aberta fica visível na lista ao andar com ↑/↓.
  const listaRef = useRef<HTMLUListElement>(null);
  useEffect(() => {
    const el = listaRef.current?.querySelector('[aria-current="true"]') as HTMLElement | null;
    el?.scrollIntoView?.({ block: 'nearest' });
  }, [aberta?.indice]);

  /** Grava o banco inteiro pelo mesmo caminho do gerenciador; o app de desktop faz o backup antes (AC-7.6, FR-17). */
  async function salvar(novo: NoticiaBanco[], texto: string): Promise<boolean> {
    if (!desktop || !repo) return false;
    setSalvando(true);
    try {
      const e = await repo.salvar(novo, estadoRef.current.versao);
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

  async function aprovar(indice: number, nome: string) {
    const r = aprovarQuestao(banco, indice, nome);
    if ('erro' in r) {
      setMensagem({ texto: r.erro, erro: true });
      return;
    }
    onRevisor(nome.trim());
    await salvar(r.banco, `Questão ${banco[indice]!.id} aprovada.`);
  }

  function pedirAprovar(indice: number) {
    setMensagem(null);
    if (revisor.trim()) void aprovar(indice, revisor);
    else setPedirNome({ indice, nome: '' });
  }

  async function salvarEditor(n: NoticiaBanco) {
    if (!editor) return;
    const r = gravarQuestao(banco, editor.indice, n);
    if ('problemas' in r) {
      setEditor({ ...editor, problemas: r.problemas });
      return;
    }
    setEditor({ ...editor, problemas: {} });
    if (await salvar(r.banco, 'Questão salva.')) setEditor(null);
  }

  const filtro = <K extends keyof FiltrosQuestoes>(k: K, v: FiltrosQuestoes[K]) => setFiltros((f) => ({ ...f, [k]: v }));
  const clicarLink = (url: string) => (e: MouseEvent) => {
    if (!abrirLink) return; // navegador: o link abre noutra aba (target=_blank)
    e.preventDefault();
    abrirLink(url);
  };
  const copiar = (url: string) => {
    void navigator.clipboard?.writeText(url).then(
      () => setMensagem({ texto: 'Link copiado.', erro: false }),
      () => setMensagem({ texto: 'Não foi possível copiar; selecione o link e copie.', erro: true }),
    );
  };
  const filtradas = lista.length !== questoes.length;

  const n = aberta?.noticia;
  const oculta = n?.visivel === 'nao';
  const podeAprovar = !!n && (n.status !== 'aprovada' || !n.revisado_por.trim());
  const bloqueado = !desktop || salvando;

  return (
    <div className={q.fundo} role="dialog" aria-modal="true" aria-label="Questões" data-painel="questoes">
      <section className={q.painel}>
        <header className={q.topo}>
          <div>
            <h2>Questões</h2>
            <p className={q.sub} data-contagem>{textoContagemQuestoes(contagem)}</p>
            {desktop && estado.arquivo && <p className={q.sub} data-arquivo>{`Arquivo: ${estado.arquivo}`}</p>}
          </div>
          <button type="button" className={q.fechar} aria-label="Fechar" title="Fechar (Esc)" onClick={onFechar}>
            <span className={q.xis} aria-hidden="true" />
          </button>
        </header>

        {!desktop && <p className={q.aviso} data-aviso="web">{`${AVISO_WEB}. Aqui o painel é só leitura.`}</p>}

        {/* Abas por tema, como no Prova ou Reprova, com a quantidade de cada uma. */}
        <div className={q.abas} role="group" aria-label="Temas">
          <button type="button" aria-pressed={!filtros.tema} onClick={() => filtro('tema', '')}>
            Todos os temas <b>{questoes.length}</b>
          </button>
          {TEMAS.map((t) => (
            <button key={t} type="button" aria-pressed={filtros.tema === t} onClick={() => filtro('tema', t)}>
              {TEMA_ROTULO[t]} <b>{questoes.filter((x) => x.noticia.tema === t).length}</b>
            </button>
          ))}
        </div>

        <div className={q.filtros}>
          <label>Buscar
            <input type="search" value={filtros.texto} onChange={(e) => filtro('texto', e.target.value)} placeholder="id, título, fonte, revisor…" />
          </label>
          <label>Veredito
            <select value={filtros.veredito} onChange={(e) => filtro('veredito', e.target.value)}>
              <option value="">Todos</option>
              {VEREDITOS.map((v) => <option key={v} value={v}>{v === 'verdadeira' ? 'Verdade' : 'Mentira'}</option>)}
            </select>
          </label>
          <label>Tema
            <select value={filtros.tema} onChange={(e) => filtro('tema', e.target.value)}>
              <option value="">Todos</option>
              {TEMAS.map((t) => <option key={t} value={t}>{TEMA_ROTULO[t]}</option>)}
            </select>
          </label>
          <label>Dificuldade
            <select value={filtros.dificuldade} onChange={(e) => filtro('dificuldade', e.target.value)}>
              <option value="">Todas</option>
              {DIFICULDADES.map((d) => <option key={d} value={d}>{DIFICULDADE_ROTULO[d]}</option>)}
              <option value="sem">Sem dificuldade</option>
            </select>
          </label>
          <label>Status
            <select value={filtros.status} onChange={(e) => filtro('status', e.target.value)}>
              <option value="">Todos</option>
              <option value="rascunho">Rascunho</option>
              <option value="aprovada">Aprovada</option>
            </select>
          </label>
          <label>Visibilidade
            <select value={filtros.visibilidade} onChange={(e) => filtro('visibilidade', e.target.value as FiltrosQuestoes['visibilidade'])}>
              <option value="">Todas</option>
              <option value="visivel">Visíveis</option>
              <option value="oculta">Ocultas</option>
            </select>
          </label>
          <label className={q.marcar}>
            <input type="checkbox" checked={filtros.soJogaveis} onChange={(e) => filtro('soJogaveis', e.target.checked)} />Só jogáveis
          </label>
          <label className={q.marcar}>
            <input type="checkbox" checked={filtros.soProblemas} onChange={(e) => filtro('soProblemas', e.target.checked)} />Só com problemas
          </label>
          {filtradas && <span className={q.sub} data-filtradas>{`Mostrando ${lista.length} de ${questoes.length}`}</span>}
        </div>

        {mensagem && (mensagem.erro
          ? <p className={q.erro} role="alert">{mensagem.texto}</p>
          : <p className={q.ok} role="status">{mensagem.texto}</p>)}

        <div className={q.corpo}>
          <ul ref={listaRef} className={q.lista} aria-label="Lista de questões">
            {lista.map((x) => (
              <li key={x.indice}>
                <button
                  type="button"
                  data-id={x.noticia.id}
                  data-situacao={x.situacao}
                  aria-current={x === aberta ? 'true' : undefined}
                  onClick={() => setEscolhida(x.indice)}
                >
                  <span className={q.linha1}>
                    <span className={q.id}>{x.noticia.id || '(sem id)'}</span>
                    <span className={q.situacao} data-situacao={x.situacao}>{SITUACAO_ROTULO[x.situacao]}</span>
                  </span>
                  <span className={q.titulo}>{x.noticia.titulo || '(sem título)'}</span>
                </button>
              </li>
            ))}
          </ul>
          {lista.length === 0 && (
            <p className={q.vazio}>{questoes.length ? 'Nenhuma questão com esses filtros.' : 'Nenhuma questão no banco.'}</p>
          )}

          {aberta && n && (
            <section className={q.aberta} aria-label="Questão aberta" data-id={n.id} data-situacao={aberta.situacao}>
              <div className={q.nav}>
                <button type="button" aria-label="Questão anterior" title="Questão anterior (↑)" disabled={posicao <= 0} onClick={() => setEscolhida(lista[posicao - 1]!.indice)}>‹</button>
                <span>{`${posicao + 1} de ${lista.length}`}</span>
                <button type="button" aria-label="Próxima questão" title="Próxima questão (↓)" disabled={posicao >= lista.length - 1} onClick={() => setEscolhida(lista[posicao + 1]!.indice)}>›</button>
                <span className={q.id}>{n.id}</span>
              </div>

              {/* Como o jogador vê (FR-4): imagem ou ilustração, título e descrição; depois o "saiba mais". */}
              <div className={q.cards}>
                <div className={q.card} role="group" aria-label="Card">
                  <div className={q.imagem}><ImagemQuestao n={n} /></div>
                  <h3>{n.titulo}</h3>
                  <p>{n.descricao}</p>
                </div>
                <div className={q.card} role="group" aria-label="Saiba mais">
                  <h4>Saiba mais</h4>
                  <p>{n.saiba_mais}</p>
                </div>
              </div>

              <div className={q.revisao}>
                <p className={q.gabarito}><Gabarito veredito={n.veredito} /></p>
                <p className={q.explicacao}>{n.explicacao}</p>
                <ul className={q.dados} aria-label="Dados da questão">
                  <li><b>Técnica:</b> {TECNICA_ROTULO[n.tecnica as Tecnica] ?? (n.tecnica || '—')}</li>
                  <li><b>Tema:</b> {TEMA_ROTULO[n.tema as Tema] ?? (n.tema || '—')}</li>
                  <li><b>Dificuldade:</b> {DIFICULDADE_ROTULO[n.dificuldade as Dificuldade] ?? (n.dificuldade || '—')}</li>
                  <li><b>Status:</b> {STATUS_ROTULO[n.status] ?? (n.status || '—')}</li>
                  <li><b>Revisado por:</b> {n.revisado_por || '—'}</li>
                  <li><b>Visibilidade:</b> {oculta ? 'Oculta (fora do jogo)' : n.visivel && n.visivel !== 'sim' ? `"${n.visivel}"` : 'Visível no jogo'}</li>
                </ul>

                <h4>Fontes</h4>
                <ul className={q.fontes} aria-label="Fontes">
                  {fontesDaQuestao(n).map((f, i) => (
                    <li key={i}>
                      <b>{f.rotulo}</b> {f.nome && <span>{f.nome}</span>}
                      <br />
                      {ehLink(f.url)
                        ? <a href={f.url} target="_blank" rel="noopener noreferrer" onClick={clicarLink(f.url)}>{f.url}</a>
                        : <code>{f.url}</code>}
                      {' '}
                      <button type="button" className={q.copiar} aria-label={`Copiar ${f.url}`} onClick={() => copiar(f.url)}>Copiar</button>
                    </li>
                  ))}
                </ul>

                {aberta.jogavel ? (
                  <p className={q.noJogo} data-no-jogo>Entra nas partidas</p>
                ) : (
                  <div className={q.foraDoJogo}>
                    <h4>Não entra nas partidas porque:</h4>
                    <ul aria-label="Fora do jogo">{aberta.motivos.map((m) => <li key={m}>{m}</li>)}</ul>
                  </div>
                )}

                <div className={q.acoes}>
                  <button
                    type="button"
                    data-acao="visibilidade"
                    disabled={bloqueado}
                    onClick={() => void salvar(alterarVisibilidade(banco, aberta.indice, oculta), oculta ? 'Questão de volta ao jogo.' : 'Questão oculta.')}
                  >
                    {oculta ? 'Mostrar no jogo' : 'Ocultar'}
                  </button>
                  {podeAprovar && (
                    <button type="button" data-acao="aprovar" disabled={bloqueado} onClick={() => pedirAprovar(aberta.indice)}>Aprovar</button>
                  )}
                  {n.status === 'aprovada' && (
                    <button type="button" data-acao="rascunho" disabled={bloqueado} onClick={() => void salvar(voltarParaRascunho(banco, aberta.indice), 'Questão de volta para rascunho.')}>
                      Voltar para rascunho
                    </button>
                  )}
                  <button
                    type="button"
                    data-acao="editar"
                    disabled={bloqueado}
                    onClick={() => { setMensagem(null); setEditor({ indice: aberta.indice, inicial: n, problemas: {} }); }}
                  >
                    Editar
                  </button>
                </div>
              </div>
            </section>
          )}
        </div>
        <p className={q.sub}>↑/↓ questão anterior/próxima · Esc fecha</p>
      </section>

      {pedirNome && (
        <div className={q.camada} role="dialog" aria-modal="true" aria-label="Quem revisou?" data-revisor>
          <form
            className={q.caixa}
            onSubmit={(e) => {
              e.preventDefault();
              const { indice, nome } = pedirNome;
              if (!nome.trim()) return;
              setPedirNome(null);
              void aprovar(indice, nome);
            }}
          >
            <h3>Quem revisou?</h3>
            <p className={q.sub}>O nome vai para "revisado por" e é pedido uma vez nesta sessão (não fica guardado).</p>
            <label>Nome de quem revisou
              <input
                type="text"
                autoFocus
                value={pedirNome.nome}
                onChange={(e) => setPedirNome({ ...pedirNome, nome: e.target.value })}
              />
            </label>
            <footer className={q.rodape}>
              <button type="button" onClick={() => setPedirNome(null)}>Cancelar</button>
              <button type="submit" disabled={!pedirNome.nome.trim()}>Aprovar</button>
            </footer>
          </form>
        </div>
      )}

      {editor && (
        <EditorNoticia
          key={editor.indice}
          inicial={editor.inicial}
          nova={false}
          problemas={editor.problemas}
          salvando={salvando}
          onSalvar={(x) => void salvarEditor(x)}
          onCancelar={() => setEditor(null)}
        />
      )}
    </div>
  );
}
