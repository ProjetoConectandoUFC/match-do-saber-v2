import { useRef, type ReactNode, type RefObject } from 'react';
import {
  CONFIG_PADRAO, DICA_GESTOS, DICA_SAIBA_MAIS, ITENS_CONFIG, OPCOES, ROTULO_ITEM, resumoConfiguracoes, rotuloValor,
  type Configuracoes, type ModoJogo,
} from '../core/modos';
import { mensagemResumo, type Resultado } from '../core/partida';
import { feedbackTutorial } from '../core/tutorial';
import { TECNICA_ROTULO, type Noticia, type Veredito } from '../core/types';
import { Forma } from './Forma';
import { IlustracaoTema, corDoTema } from './IlustracaoTema';
import type { StatusCamera } from './useJogo';
import s from './App.module.css';

const SELO: Record<Resultado, string> = { acerto: 'Acertou!', erro: 'Errou', tempo: 'Tempo esgotado' };
const src = (caminho: string) => (/^(https?:|data:)/.test(caminho) ? caminho : `${import.meta.env.BASE_URL}${caminho}`);

function Placar({ pontos }: { pontos: number }) {
  return <p className={s.pontos}>{`Pontos: ${pontos}`}</p>;
}

/** Passo do tutorial (FR-16): no lugar do placar, que o treino não tem (AC-15.4). */
export interface PassoTreino { passo: number; total: number }
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

/** Laterais do gesto (FR-15): Mentira à esquerda (triângulo coral), Verdade à direita (estrela menta). */
/**
 * Rótulo do lado para onde o card está indo (AC-2.10b, v10.3.0): só texto e tokens; a opacidade é escrita
 * por `useInclinacaoCard` a cada quadro. Estilo provisório, inline, até o Agente Visual definir o final.
 */
function RotuloLado({ lado }: { lado: 'mentira' | 'verdade' }) {
  const verdade = lado === 'verdade';
  return (
    <span
      data-rotulo-lado={lado}
      aria-hidden="true"
      style={{
        position: 'absolute', top: 'calc(18 * var(--u))', [verdade ? 'right' : 'left']: 'calc(18 * var(--u))',
        padding: 'calc(4 * var(--u)) calc(14 * var(--u))', borderRadius: 'var(--raio-pilula)',
        background: verdade ? 'var(--verdade)' : 'var(--mentira)', color: 'var(--cn-tinta)',
        font: '800 calc(26 * var(--u)) / 1.2 var(--fonte)', opacity: 0, pointerEvents: 'none', zIndex: 1,
      }}
    >
      {verdade ? 'Verdade' : 'Mentira'}
    </span>
  );
}

function Lado({ lado }: { lado: 'mentira' | 'verdade' }) {
  return (
    <div className={s.lado}>
      {lado === 'mentira'
        ? <MarcaMentira largura={64} className={s.marcaMentira} />
        : <MarcaVerdade largura={64} className={s.marcaVerdade} />}
      <span className={`${s.pilula} ${lado === 'mentira' ? s.pilulaMentira : s.pilulaVerdade}`} data-lado={lado}>
        {lado === 'mentira' ? 'Mentira' : 'Verdade'}
      </span>
    </div>
  );
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
      <div className={s.mesa}>
      <Lado lado="mentira" />
      <article
        ref={cardRef}
        className={[s.card, saida && (saida === 'direita' ? s.saiDireita : s.saiEsquerda), pulsando && s.pulsando].filter(Boolean).join(' ')}
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
            {noticia.imagem ? <img src={src(noticia.imagem)} alt="" draggable={false} /> : <IlustracaoTema tema={noticia.tema} />}
            <h2>{noticia.titulo}</h2>
            <p>{noticia.descricao}</p>
            {!treino && <p className={s.dicaCard}><Forma id="marca-estrela-5" largura={18} className={s.marcaDica} />{DICA_SAIBA_MAIS[modo]}</p>}
          </>
        )}
        <RotuloLado lado="mentira" />
        <RotuloLado lado="verdade" />
      </article>
      <Lado lado="verdade" />
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
 * Feedback (AC-4.1 a AC-4.3, AC-4.9, v10.0.0): o fundo da tela inteira acende na cor do veredito; no topo o veredito,
 * menor ("É verdade"/"É mentira"); abaixo o selo, maior e sem ícones; depois a explicação e a técnica.
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
        <p className={`${s.selo} ${resultado === 'acerto' ? s.seloAcerto : s.seloErro}`}>{SELO[resultado]}</p>
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
        <p className={`${s.selo} ${t.acertou ? s.seloAcerto : s.seloErro}`}>{t.selo}</p>
        <p className={s.explicacao}>{t.escolha}</p>
        <p className={s.explicacao}>{t.certo}</p>
        <p className={s.explicacao}>{noticia.explicacao}</p>
        <p className={s.tecnica}>{TECNICA_ROTULO[noticia.tecnica]}</p>
      </div>
      <MarcaTreino treino={treino} />
    </main>
  );
}

/** `foto`: quadro da câmera do meio da partida (FR-13); sem ela, o resumo fica como em AC-5.1 (AC-13.3). */
export function TelaResumo({ pontos, total, foto }: { pontos: number; total: number; foto?: string | null }) {
  const texto = (
    <div className={s.resumoTexto}>
      <h1>Fim de <em>jogo!</em></h1>
      <p className={s.placar}>{`${pontos} de ${total}`}</p>
      <p className={s.mensagemResumo}>{mensagemResumo(pontos, total)}</p>
    </div>
  );
  // Tema Claro, sem a prévia da câmera (App); polaroid 20% maior que na v9.0.0 (AC-13.2), com a folha amarela atrás.
  return (
    <main className={`${s.tela} ${s.claro}`}>
      <div className={s.resumoLinha}>
        {foto && (
          <figure className={s.polaroid}>
            <div className={s.folha} aria-hidden="true" />
            <div className={s.papel}>
              <img src={foto} alt="Sua foto na partida" />
              <figcaption>{`Match do Saber · ${pontos} de ${total}`}</figcaption>
            </div>
          </figure>
        )}
        {texto}
      </div>
      <p className={s.dicaConfig}>Operador: Enter para a próxima partida</p>
    </main>
  );
}
