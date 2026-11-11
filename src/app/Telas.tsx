import { useRef, type ReactNode, type RefObject } from 'react';
import {
  CONFIG_PADRAO, DICA_GESTOS, DICA_SAIBA_MAIS, ITENS_CONFIG, OPCOES, ROTULO_ITEM, resumoConfiguracoes, rotuloValor,
  type Configuracoes, type ModoJogo,
} from '../core/modos';
import type { AncorasRosto } from '../core/ancorasRosto';
import { FAIXAS, faixaDeAcertos, type Faixa } from '../core/faixas';
import type { LinhaResumo } from '../core/fontesRodada';
import { mensagemResumo, type Resultado } from '../core/partida';
import { feedbackTutorial, type IlustracaoPerfil } from '../core/tutorial';
import { TECNICA_ROTULO, type Noticia, type Veredito } from '../core/types';
import { FiltroFoto } from './FiltroFoto';
import { Forma, type IdForma } from './Forma';
import { IconeFeedback, type IdIcone } from './IconesFeedback';
import { IlustracaoTema, corDoTema } from './IlustracaoTema';
import { ilustracaoDaNoticia, ilustracaoDoPerfil } from './ilustracoes';
import { QrCode } from './QrCode';
import type { StatusCamera } from './useJogo';
import s from './App.module.css';

const SELO: Record<Resultado, string> = { acerto: 'Acertou!', erro: 'Errou', tempo: 'Tempo esgotado' };
/** Frase de app de namoro antes do selo (AC-4.9, v11.0.0); o tempo esgotado não tem match. */
const MATCH: Record<Resultado, string | null> = { acerto: 'Deu match!', erro: 'Não deu match', tempo: null };
const cx = (...c: (string | false | undefined)[]) => c.filter(Boolean).join(' ');
const src = (caminho: string) => (/^(https?:|data:)/.test(caminho) ? caminho : `${import.meta.env.BASE_URL}${caminho}`);

function Placar({ pontos }: { pontos: number }) {
  return <p className={s.pontos}>{`Pontos: ${pontos}`}</p>;
}

/** Passo do tutorial (FR-16): no lugar do placar, que o treino não tem (AC-15.4). */
export interface PassoTreino { passo: number; total: number; ilustracao?: IlustracaoPerfil }
function MarcaTreino({ treino }: { treino: PassoTreino }) {
  return <p className={s.pontos} data-treino>{`Treino ${treino.passo + 1} de ${treino.total}`}</p>;
}

/** Marcadores do gesto (FR-15): Mentira = triângulo coral apontando para a esquerda; Verdade = estrela de 4 pontas menta. */
export function MarcaMentira({ largura, className }: { largura: number; className?: string }) {
  return <Forma id="marca-triangulo" largura={largura} quadrado className={className} style={{ transform: 'rotate(-90deg)' }} />;
}
export function MarcaVerdade({ largura, className }: { largura: number; className?: string }) {
  return <Forma id="marca-estrela-4" largura={largura} className={className} />;
}

/** Logotipo tipográfico: o triângulo antes de "Match" e a estrela depois de "Saber" repetem o gesto (esquerda = mentira). */
function Logo() {
  return (
    <h1 className={s.logo} aria-label="Match do Saber">
      <span className={s.logoL1}><span className={`${s.disco} ${s.discoMentira}`}><MarcaMentira largura={30} /></span>Match</span>{' '}
      <span className={s.logoL2}>do <em>Saber</em><span className={`${s.disco} ${s.discoVerdade}`}><MarcaVerdade largura={30} /></span></span>
    </h1>
  );
}

/** Desenho mudo do gesto na espera: card no meio, Mentira à esquerda, Verdade à direita. */
function EsquemaGesto() {
  return (
    <div className={s.esquema} data-esquema-gesto aria-hidden="true">
      <div className={s.esquemaLado}>
        <span className={`${s.discoP} ${s.discoMentira}`}><MarcaMentira largura={34} /></span>
        <span className={`${s.pilP} ${s.pilMentira}`} data-lado="mentira">Mentira</span>
      </div>
      <div className={s.esquemaCard}>
        <div className={s.esquemaIlu}><Forma id="marca-estrela-5" largura={40} /></div>
        <i /><i /><i className={s.curta} />
      </div>
      <div className={s.esquemaLado}>
        <span className={`${s.discoP} ${s.discoVerdade}`}><MarcaVerdade largura={34} /></span>
        <span className={`${s.pilP} ${s.pilVerdade}`} data-lado="verdade">Verdade</span>
      </div>
    </div>
  );
}

/** Anéis da espera (FR-15): as pontas cortadas de cada desenho ficam na borda da tela (anel-c: topo e esquerda; anel-b: topo e direita; anel-a: direita). */
function Aneis() {
  return (
    <>
      <span className={`${s.anel} ${s.anelC}`} data-anel="anel-c@topo-esquerda"><Forma id="anel-c" largura={250} /></span>
      <span className={`${s.anel} ${s.anelB}`} data-anel="anel-b@topo-direita"><Forma id="anel-b" largura={300} /></span>
      <span className={`${s.anel} ${s.anelA}`} data-anel="anel-a@direita"><Forma id="anel-a" largura={110} /></span>
    </>
  );
}

export function TelaEspera({ semNoticias, camera, config = CONFIG_PADRAO, menu, onIniciar = () => {} }: {
  semNoticias: boolean;
  camera: StatusCamera;
  config?: Configuracoes;
  /** Menu ☰ do operador (FR-14), no canto da tela de espera. */
  menu?: ReactNode;
  onIniciar?: () => void;
}) {
  return (
    <main className={`${s.tela} ${s.claro}`}>
      <Aneis />
      <div className={s.assinatura}><Forma id="conectando-assinatura" largura={104} /></div>
      <div className={s.espLinha}>
        <div className={s.espTexto}>
          <Logo />
          {semNoticias ? (
            <p className={s.aviso}>Nenhuma notícia publicada</p>
          ) : camera === 'negada' || camera === 'indisponivel' ? (
            <p className={s.aviso}>Câmera desativada — jogue pelas setas (Enter para começar)</p>
          ) : (
            <p className={s.chamada}>Aperte Iniciar (ou Enter) e fique de frente para a câmera</p>
          )}
          {/* Os botões perdem o foco no clique: um Enter depois não deve reativá-los. */}
          <button type="button" className={s.botaoIniciar} disabled={semNoticias} onClick={(e) => { e.currentTarget.blur(); onIniciar(); }}>
            <Forma id="marca-triangulo" largura={20} quadrado style={{ transform: 'rotate(90deg)' }} />Iniciar
          </button>
        </div>
        <EsquemaGesto />
      </div>
      <p className={s.dicaConfig}>{resumoConfiguracoes(config)}</p>
      {menu}
    </main>
  );
}

export function TelaCalibracao({ progresso, modo = 'corpo' }: { progresso: number; modo?: ModoJogo }) {
  return (
    <main className={`${s.tela} ${s.sobrio} ${s.calibracao}`}>
      <p className={s.calibracaoTitulo}>Fique no centro</p>
      <div className={s.barra}><div style={{ width: `${Math.round(progresso * 100)}%` }} /></div>
      <p className={s.calibracaoDica}>{DICA_GESTOS[modo]}</p>
    </main>
  );
}

export function MenuConfiguracoes({ config, itemDestacado, onDefinir, onFechar }: {
  config: Configuracoes;
  itemDestacado: number;
  onDefinir: (c: Configuracoes) => void;
  onFechar: () => void;
}) {
  return (
    <div className={s.painel} role="dialog" aria-modal="true" aria-label="Configurações">
      <div className={s.menu}>
        <div className={s.cabecalhoMenu}>
          <h2>Configurações</h2>
          <button type="button" className={s.fechar} aria-label="Fechar" onClick={onFechar}><span className={s.xis} aria-hidden="true" /></button>
        </div>
        <ul>
          {ITENS_CONFIG.map((item, i) => (
            <li key={item} className={i === itemDestacado ? s.destacado : undefined}>
              <p className={s.rotuloItem} id={`cfg-${item}`}>{ROTULO_ITEM[item]}</p>
              <div className={s.opcoes} role="group" aria-labelledby={`cfg-${item}`}>
                {(OPCOES[item] as readonly Configuracoes[typeof item][]).map((valor) => {
                  const ativo = config[item] === valor;
                  return (
                    <button
                      key={String(valor)}
                      type="button"
                      aria-pressed={ativo}
                      onClick={() => onDefinir({ ...config, [item]: valor } as Configuracoes)}
                    >
                      {`${ativo ? '◉' : '○'} ${rotuloValor(item, valor)}`}
                    </button>
                  );
                })}
              </div>
              {item === 'modo' && <p className={s.dica}>{DICA_GESTOS[config.modo]}</p>}
            </li>
          ))}
        </ul>
        <p className={s.dica}>↑/↓ escolhem o item · ←/→ mudam o valor · Esc ou Enter fecham</p>
      </div>
    </div>
  );
}

export function BotaoSair({ onSair }: { onSair: () => void }) {
  return (
    <button type="button" className={s.sair} aria-label="Sair da partida" onClick={(e) => { e.currentTarget.blur(); onSair(); }}>
      <span className={s.xis} aria-hidden="true" />Sair
    </button>
  );
}

/** Tempo restante do card, na base da tela (AC-4.6); coral nos últimos 5 s (AC-4.7). A barra do card saiu na v10.0.0 (AC-4.8). */
export function BarraTempo({ restanteMs, totalMs, alerta }: { restanteMs: number; totalMs: number; alerta: boolean }) {
  const fracao = Math.max(0, Math.min(1, restanteMs / totalMs));
  return (
    <div className={alerta ? `${s.barraTempo} ${s.barraAlerta}` : s.barraTempo} role="timer" aria-label="Tempo restante">
      <div className={s.barraPreenchida} style={{ width: `${fracao * 100}%` }} />
      <span className={s.barraSegundos}>{`${Math.ceil(restanteMs / 1000)} s`}</span>
    </div>
  );
}

/**
 * Rótulo do lado para onde o card está indo (AC-2.10b): o carimbo VERDADE/MENTIRA (v11.0.0), só texto, no alto
 * do card; a opacidade é escrita por `useInclinacaoCard` a cada quadro. `carimbado`: aceso por inteiro na saída
 * do card (AC-2.12), por qualquer entrada.
 */
function RotuloLado({ lado, carimbado }: { lado: 'mentira' | 'verdade'; carimbado: boolean }) {
  const verdade = lado === 'verdade';
  return (
    <span
      data-rotulo-lado={lado}
      aria-hidden="true"
      className={cx(s.carimbo, verdade ? s.carimboVerdade : s.carimboMentira, carimbado && s.carimbado)}
      style={{ opacity: 0 }}
    >
      {verdade ? 'Verdade' : 'Mentira'}
    </span>
  );
}

/**
 * Laterais do gesto (FR-15, AC-2.11, v11.0.0): botões redondos, Mentira à esquerda (disco coral, triângulo) e
 * Verdade à direita (disco menta, estrela), com a pílula do nome. Acendem pela `--acende` que `useInclinacaoCard`
 * escreve com a mesma fração do card; `escolhido` = aceso por inteiro durante a saída. Não recebem clique (FR-3).
 */
function Lado({ lado, escolhido }: { lado: 'mentira' | 'verdade'; escolhido: boolean }) {
  const mentira = lado === 'mentira';
  return (
    <div className={s.lado}>
      <span
        className={cx(s.botaoLado, mentira ? s.botaoMentira : s.botaoVerdade)}
        data-botao-lado={lado}
        data-escolhido={escolhido || undefined}
        aria-hidden="true"
      >
        {mentira ? <MarcaMentira largura={64} /> : <MarcaVerdade largura={64} />}
      </span>
      <span className={`${s.pilula} ${mentira ? s.pilulaMentira : s.pilulaVerdade}`} data-lado={lado}>
        {mentira ? 'Mentira' : 'Verdade'}
      </span>
    </div>
  );
}

/**
 * Imagem do card (FR-4): a da notícia; senão, a ilustração "recorte chapado" dela; senão, a do tema.
 * Treino (AC-15.7): o desenho do próprio perfil, maior; sem ele, a do tema.
 */
function ImagemCard({ noticia, treino }: { noticia: Noticia; treino?: PassoTreino }) {
  if (treino?.ilustracao) return <img className={s.imagemPerfil} src={ilustracaoDoPerfil(treino.ilustracao)} alt="" draggable={false} />;
  if (noticia.imagem) return <img src={src(noticia.imagem)} alt="" draggable={false} />;
  return <IlustracaoTema tema={noticia.tema} imagem={ilustracaoDaNoticia(noticia.id)} />;
}

export function TelaCard({ noticia, restanteMs, saibaMais, ausente, saida, pontos, modo = 'corpo', totalMs = 15000, treino, cardRef, onArrastar }: {
  /** Card de treino do tutorial (FR-16): sem barra de tempo, sem placar e sem "saiba mais" (AC-15.2, AC-15.6). */
  treino?: PassoTreino;
  noticia: Noticia;
  restanteMs: number;
  /** Duração do card, para a fração da barra de tempo (AC-4.6). */
  totalMs?: number;
  saibaMais: boolean;
  ausente: boolean;
  /** Card já respondido saindo pela direita/esquerda (AC-2.1/AC-2.2). */
  saida?: 'direita' | 'esquerda';
  /** Placar parcial (AC-4.1). */
  pontos: number;
  modo?: ModoJogo;
  cardRef: RefObject<HTMLElement>;
  onArrastar: (lado: 'direita' | 'esquerda') => void;
}) {
  const inicioX = useRef<number | null>(null);
  const alerta = !saida && !treino && restanteMs <= 5000;
  const pulsando = alerta && !ausente; // AC-4.7: só "Volte para o centro" pausa o cronômetro (v5.0.0)
  return (
    <main className={`${s.tela} ${s.sobrio}`}>
      <div className={s.mesa} data-mesa>
      <Lado lado="mentira" escolhido={saida === 'esquerda'} />
      {/* Pilha de cards (AC-2.12, v11.0.0): duas camadas paradas atrás; a pilha tem o tamanho do card (AC-4.5). */}
      <div className={s.pilha}>
      <div className={`${s.camadaPilha} ${s.camadaPilha1}`} data-pilha-camada aria-hidden="true" />
      <div className={`${s.camadaPilha} ${s.camadaPilha2}`} data-pilha-camada aria-hidden="true" />
      <article
        ref={cardRef}
        className={cx(s.card, saida && (saida === 'direita' ? s.saiDireita : s.saiEsquerda), pulsando && s.pulsando)}
        onPointerDown={(e) => { inicioX.current = e.clientX; }}
        onPointerUp={(e) => {
          if (inicioX.current === null) return;
          const dx = e.clientX - inicioX.current;
          inicioX.current = null;
          if (dx > 100) onArrastar('direita');
          else if (dx < -100) onArrastar('esquerda');
        }}
      >
        {saibaMais ? (
          <>
            <div className={s.faixaTema} style={{ background: corDoTema(noticia.tema) }} />
            <div className={s.saibaMais}>
              <h2>{noticia.titulo}</h2>
              <p>{noticia.saibaMais}</p>
            </div>
          </>
        ) : (
          <>
            <ImagemCard noticia={noticia} treino={treino} />
            <h2>{noticia.titulo}</h2>
            <p>{noticia.descricao}</p>
            {!treino && <p className={s.dicaCard}><Forma id="marca-estrela-5" largura={18} className={s.marcaDica} />{DICA_SAIBA_MAIS[modo]}</p>}
          </>
        )}
        <RotuloLado lado="mentira" carimbado={saida === 'esquerda'} />
        <RotuloLado lado="verdade" carimbado={saida === 'direita'} />
      </article>
      </div>
      <Lado lado="verdade" escolhido={saida === 'direita'} />
      </div>
      {/* Fora do card, para não tirar espaço do texto da notícia (FR-4). */}
      {modo !== 'corpo' && <p className={s.dicaModo}>{DICA_GESTOS[modo]}</p>}
      {treino ? <MarcaTreino treino={treino} /> : <Placar pontos={pontos} />}
      {!saida && !treino && <BarraTempo restanteMs={restanteMs} totalMs={totalMs} alerta={alerta} />}
      {ausente && <div className={s.sobreposicao}>Volte para o centro</div>}
    </main>
  );
}

/**
 * Ícone e selo do feedback (AC-4.9, v11.0.0): o ícone feito com as formas do design system e, no selo, a frase do
 * match ("Deu match!"/"Não deu match") e o resultado como texto próprio ("Acertou!", "Errou", "Tempo esgotado").
 */
function LinhaSelo({ icone, match, selo, positivo }: { icone: IdIcone; match: string | null; selo: string; positivo: boolean }) {
  return (
    <div className={s.linhaSelo}>
      <IconeFeedback icone={icone} largura={176} />
      <p className={cx(s.selo, positivo ? s.seloAcerto : s.seloErro)}>
        {match && <span className={s.seloMatch}>{match}</span>}
        <span className={s.seloResultado}>{selo}</span>
      </p>
    </div>
  );
}

/**
 * Feedback (AC-4.1 a AC-4.3, AC-4.9): o fundo da tela inteira acende na cor do veredito; no topo o veredito,
 * menor ("É verdade"/"É mentira"); abaixo o ícone e o selo, maior; depois a explicação e a técnica.
 */
export function TelaFeedback({ noticia, resultado, pontos }: { noticia: Noticia; resultado: Resultado; pontos: number }) {
  const verdade = noticia.veredito === 'verdadeira';
  return (
    <main
      className={`${s.tela} ${verdade ? s.fbVerdade : s.fbMentira}`}
      data-veredito={verdade ? 'verdade' : 'mentira'}
      data-resultado={resultado}
    >
      <div className={s.feedback}>
        <h2 className={s.veredito}>
          {verdade ? <MarcaVerdade largura={30} /> : <MarcaMentira largura={30} />}
          {verdade ? 'É verdade' : 'É mentira'}
        </h2>
        <LinhaSelo icone={resultado} match={MATCH[resultado]} selo={SELO[resultado]} positivo={resultado === 'acerto'} />
        <p className={s.explicacao}>{noticia.explicacao}</p>
        <p className={s.tecnica}>{TECNICA_ROTULO[noticia.tecnica]}</p>
      </div>
      <Placar pontos={pontos} />
    </main>
  );
}

/**
 * Feedback do treino (AC-15.3, FR-16): mesma estrutura do feedback (AC-4.1), com o selo "Acertou!"/"Quase!",
 * o gesto que o jogador fez e o que leva à resposta certa. Estilo provisório (classes do feedback), sem visual novo.
 */
export function TelaFeedbackTutorial({ noticia, resposta, modo, treino }: {
  noticia: Noticia;
  resposta: Veredito;
  modo: ModoJogo;
  treino: PassoTreino;
}) {
  const verdade = noticia.veredito === 'verdadeira';
  const t = feedbackTutorial(modo, resposta, noticia.veredito);
  return (
    <main
      className={`${s.tela} ${verdade ? s.fbVerdade : s.fbMentira}`}
      data-veredito={verdade ? 'verdade' : 'mentira'}
      data-resultado={t.acertou ? 'treino-acerto' : 'treino-erro'}
    >
      <div className={s.feedback}>
        <h2 className={s.veredito}>
          {verdade ? <MarcaVerdade largura={30} /> : <MarcaMentira largura={30} />}
          {verdade ? 'É verdade' : 'É mentira'}
        </h2>
        <LinhaSelo icone={t.acertou ? 'acerto' : 'erro'} match={MATCH[t.acertou ? 'acerto' : 'erro']} selo={t.selo} positivo={t.acertou} />
        <p className={s.explicacao}>{t.escolha}</p>
        <p className={s.explicacao}>{t.certo}</p>
        <p className={s.explicacao}>{noticia.explicacao}</p>
        <p className={s.tecnica}>{TECNICA_ROTULO[noticia.tecnica]}</p>
      </div>
      <MarcaTreino treino={treino} />
    </main>
  );
}

/** Marcador de cada faixa no selo da moldura (prévia v11, seção 2). */
const MARCA_FAIXA: Record<Faixa, IdForma> = { 1: 'marca-estrela-4', 2: 'marca-estrela-5', 3: 'marca-estrela-6', 4: 'marca-estrela-4' };
/** O título da faixa em duas linhas no selo redondo. */
const LINHAS_FAIXA: Record<Faixa, [string, string]> = {
  1: ['Aprendiz', 'de checagem'], 2: ['Detetive', 'em treino'], 3: ['Faro de', 'repórter'], 4: ['Imune a', 'fake news!'],
};

/** Polaroid (AC-13.2): foto espelhada, filtro da faixa por cima (AC-13.8) e o selo da faixa na moldura (AC-13.9). */
function Polaroid({ foto, ancoras, faixa, legenda }: { foto: string; ancoras?: AncorasRosto | null; faixa: Faixa; legenda: string }) {
  const [l1, l2] = LINHAS_FAIXA[faixa];
  return (
    <figure className={s.polaroid}>
      <div className={s.folha} aria-hidden="true" />
      <div className={s.papel}>
        <div className={s.quadroFoto}>
          <img src={foto} alt="Sua foto na partida" />
          <FiltroFoto filtro={FAIXAS[faixa].filtro} ancoras={ancoras} />
        </div>
        <figcaption>{legenda}</figcaption>
      </div>
      <div className={s.seloFaixa} data-selo-faixa={faixa}>
        <Forma id={MARCA_FAIXA[faixa]} largura={22} />
        <span><span className={s.seloFaixaLinha}>{l1}</span> <span className={s.seloFaixaLinha}>{l2}</span></span>
      </div>
    </figure>
  );
}

/** Lista "Notícias da rodada" (AC-5.8, v11.0.0): para ler de perto ou na foto do celular. */
function ListaRodada({ linhas }: { linhas: readonly LinhaResumo[] }) {
  return (
    <section className={s.listaRodada} aria-labelledby="titulo-lista-rodada">
      <div className={s.listaTopo}>
        <h2 id="titulo-lista-rodada">Notícias da rodada</h2>
        <div className={s.legenda} aria-hidden="true">
          <span><i className={cx(s.resultado, s.resultadoOk, s.resultadoMini)}><Forma id="marca-estrela-4" largura={13} /></i>acertou</span>
          <span><i className={cx(s.resultado, s.resultadoNao, s.resultadoMini)}><span className={s.xis} /></i>errou</span>
        </div>
      </div>
      <ol className={s.gradeRodada}>
        {linhas.map((l) => (
          <li key={l.id} className={s.linhaRodada} data-resultado={l.acertou ? 'acertou' : 'errou'}>
            <i className={cx(s.resultado, l.acertou ? s.resultadoOk : s.resultadoNao)} role="img" aria-label={l.acertou ? 'Acertou' : 'Errou'}>
              {l.acertou ? <Forma id="marca-estrela-4" largura={18} /> : <span className={s.xis} />}
            </i>
            <div className={s.textoRodada}>
              <b>{l.titulo}</b>
              <small>
                <span className={cx(s.veiculo, l.veredito === 'verdadeira' ? s.veiculoVerdade : s.veiculoMentira)}>
                  {l.veredito === 'verdadeira' ? 'Verdade' : 'Mentira'}
                </span>
                {l.rotuloFonte} <strong>{l.fonte}</strong>
              </small>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

/**
 * Resumo (AC-5.1, opção B da prévia v11): polaroid de 384 (AC-13.2), placar, mensagem da faixa (AC-5.7), o cartão do
 * QR das fontes (AC-5.9) e a lista da rodada (AC-5.8). `foto`: quadro da câmera do meio da partida (FR-13), com as
 * âncoras do rosto (AC-13.6); sem ela, o resumo fica sem polaroid (AC-13.3).
 */
export function TelaResumo({ pontos, total, foto, ancoras, linhas = [], enderecoQr }: {
  pontos: number;
  total: number;
  foto?: string | null;
  ancoras?: AncorasRosto | null;
  linhas?: readonly LinhaResumo[];
  enderecoQr?: string;
}) {
  const faixa = faixaDeAcertos(pontos, total);
  // Tema Claro, sem a prévia da câmera (App); polaroid com a folha amarela atrás.
  return (
    <main className={`${s.tela} ${s.claro}`}>
      <div className={s.resumoLinha}>
        {foto && <Polaroid foto={foto} ancoras={ancoras} faixa={faixa} legenda={`Match do Saber · ${pontos} de ${total}`} />}
        <div className={s.resumoDireita}>
          <div className={s.resumoTopo}>
            <div className={s.resumoTexto}>
              <h1>Fim de <em>jogo!</em></h1>
              <p className={s.placar}>{`${pontos} de ${total}`}</p>
              <p className={s.mensagemResumo} data-mensagem-resumo>{mensagemResumo(pontos, total)}</p>
            </div>
            {enderecoQr && (
              <div className={s.cartaoQr} data-cartao-qr>
                <QrCode texto={enderecoQr} largura={168} rotulo="QR code das fontes da rodada" />
                <p>Fotografe e veja todas as fontes</p>
              </div>
            )}
          </div>
          {linhas.length > 0 && <ListaRodada linhas={linhas} />}
        </div>
      </div>
      <p className={s.dicaConfig}>Operador: Enter para a próxima partida</p>
    </main>
  );
}
