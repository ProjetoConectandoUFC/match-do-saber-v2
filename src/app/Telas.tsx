import { memo, useEffect, useLayoutEffect, useRef, type CSSProperties, type ReactNode, type RefObject } from 'react';
import { AJUSTES_PADRAO, resumoAjustes, rotuloInterface, type Ajustes } from '../core/ajustes';
import { DICA_GESTOS, DICA_SAIBA_MAIS, type ModoJogo } from '../core/modos';
import type { AncorasRosto } from '../core/ancorasRosto';
import { FAIXAS, faixaDeAcertos, type Faixa } from '../core/faixas';
import type { LinhaResumo } from '../core/fontesRodada';
import { LETRA_MANCHETE, LETRA_VERSO, maiorTamanhoQueCabe } from '../core/carta';
import { FAN, PIVO_NA_MESA, poseCartaDistribuida, progresso as progressoDe } from '../core/fan';
import { TEMPOS, mensagemResumo, type Resultado } from '../core/partida';
import { feedbackTutorial, type IlustracaoPerfil } from '../core/tutorial';
import { TECNICA_ROTULO, type Noticia, type Veredito } from '../core/types';
import { FiltroFoto } from './FiltroFoto';
import { Forma, type IdForma } from './Forma';
import { IlustracaoTema, corDoTema, tintaDoTema } from './IlustracaoTema';
import { Naipe } from './Naipe';
import { FanCartas, VERSO_FAN, podeAnimar, quadrosChave, sincronizar } from './FanCartas';
import { ilustracaoDaNoticia, ilustracaoDoPerfil } from './ilustracoes';
import { QrCode } from './QrCode';
import type { StatusCamera } from './useJogo';
import s from './App.module.css';

/** Texto do resultado (AC-4.1 a AC-4.3): sempre na tela, para não depender só da cor (AC-4.9). */
const TEXTO_RESULTADO: Record<Resultado, string> = { acerto: 'Acertou!', erro: 'Errou', tempo: 'Tempo esgotado' };
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
function EsquemaGesto({ cartas }: { cartas: boolean }) {
  return (
    <div className={s.esquema} data-esquema-gesto aria-hidden="true">
      <div className={s.esquemaLado}>
        <span className={`${s.discoP} ${s.discoMentira}`}><MarcaMentira largura={34} /></span>
        <span className={`${s.pilP} ${s.pilMentira}`} data-lado="mentira">Mentira</span>
      </div>
      {cartas ? (
        // v13.0.0 (prévia v13): a carta em miniatura, com o naipe nos cantos.
        <div className={s.esquemaCarta}>
          <span className={cx(s.esquemaNaipe, s.esquemaNaipeA)} />
          <span className={cx(s.esquemaNaipe, s.esquemaNaipeB)} />
          <div className={s.esquemaIlu}><Forma id="marca-estrela-5" largura={40} /></div>
          <i /><i /><i className={s.curta} />
        </div>
      ) : (
        <div className={s.esquemaCard}>
          <div className={s.esquemaIlu}><Forma id="marca-estrela-5" largura={40} /></div>
          <i /><i /><i className={s.curta} />
        </div>
      )}
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

export function TelaEspera({
  semNoticias, avisoSemNoticias = 'Nenhuma notícia publicada', camera, config = AJUSTES_PADRAO, menu, onIniciar = () => {}, cartas = true,
}: {
  semNoticias: boolean;
  /** v13.0.0: interface de cartas (fan respirando e o desenho do gesto com uma carta); `false` = a espera da v12. */
  cartas?: boolean;
  /** AC-6.4 (v12.0.0): o aviso muda quando há notícias jogáveis só fora dos filtros de conteúdo. */
  avisoSemNoticias?: string;
  camera: StatusCamera;
  config?: Ajustes;
  /** Menu ☰ do operador (FR-14), no canto da tela de espera. */
  menu?: ReactNode;
  onIniciar?: () => void;
}) {
  return (
    <main className={`${s.tela} ${s.claro}`}>
      <Aneis />
      {/* AC-17.4: o fan respira sob o desenho do gesto (atrás do texto e do Iniciar). */}
      {cartas && <FanCartas quantidade={FAN.cartasEspera} fase="respirando" lugar="espera" />}
      <div className={s.assinatura}><Forma id="conectando-assinatura" largura={104} /></div>
      <div className={cx(s.espLinha, cartas && s.espLinhaCartas)}>
        <div className={s.espTexto}>
          <Logo />
          {semNoticias ? (
            <p className={s.aviso}>{avisoSemNoticias}</p>
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
        <EsquemaGesto cartas={cartas} />
      </div>
      {/* AC-18.3 (v13.2.0): a interface ativa, numa linha própria logo acima do resumo, legível a 1 m. */}
      <p className={s.dicaInterface} data-interface={config.interface}>{rotuloInterface(config)}</p>
      <p className={s.dicaConfig}>{resumoAjustes(config)}</p>
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

/**
 * Abertura da partida (AC-17.5, v13.0.0): o fan com todas as cartas (treinos e notícias) abre por inteiro e fecha até a
 * posição de jogo em `TEMPOS.aberturaFanMs`, pelo `restanteMs` do estado. As laterais já ficam no lugar e a barra fica
 * vazia (sem cronômetro nem placar), para nada mudar de lugar quando a primeira carta chegar. "✕ Sair" vem do App.
 */
export function TelaAbertura({ cartas, restanteMs }: { cartas: number; restanteMs: number }) {
  return (
    <main className={`${s.tela} ${s.sobrio}`} aria-label="Abrindo as cartas">
      <FanCartas quantidade={cartas} fase="abrindo" progresso={progressoDe(TEMPOS.aberturaFanMs, restanteMs)} />
      <div className={s.mesa} data-mesa>
        <Lado lado="mentira" escolhido={false} />
        <div className={s.lugarCarta} aria-hidden="true" />
        <Lado lado="verdade" escolhido={false} />
      </div>
      <div className={s.barraTempo} aria-hidden="true" />
    </main>
  );
}

function BotaoSairBase({ onSair }: { onSair: () => void }) {
  return (
    <button type="button" className={s.sair} aria-label="Sair da partida" onClick={(e) => { e.currentTarget.blur(); onSair(); }}>
      <span className={s.xis} aria-hidden="true" />Sair
    </button>
  );
}

// FR-20 (v13.3.0): não re-renderiza a cada tick quando as props não mudam.
export const BotaoSair = memo(BotaoSairBase);

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
 * Carimbo VERDADE/MENTIRA (AC-2.10b, AC-4.9; v12.0.0: o mesmo no card e no feedback): cheio, menta com a estrela ou coral
 * com o triângulo, o marcador num disco noite; a caixa alta vem do CSS.
 */
function Carimbo({ lado, className, style, ...dados }: {
  lado: 'mentira' | 'verdade';
  className?: string;
  style?: CSSProperties;
  'data-rotulo-lado'?: string;
  'data-carimbo'?: string;
  'aria-hidden'?: 'true';
}) {
  const verdade = lado === 'verdade';
  return (
    <span {...dados} className={cx(s.carimbo, verdade ? s.carimboVerdade : s.carimboMentira, className)} style={style}>
      <span className={s.carimboDisco} aria-hidden="true">{verdade ? <MarcaVerdade largura={20} /> : <MarcaMentira largura={20} />}</span>
      {verdade ? 'Verdade' : 'Mentira'}
    </span>
  );
}

/**
 * Rótulo do lado para onde o card está indo (AC-2.10b): o carimbo, no alto do card; a opacidade é escrita por
 * `useInclinacaoCard` a cada quadro. `carimbado`: aceso por inteiro na saída do card (AC-2.12), por qualquer entrada.
 */
function RotuloLado({ lado, carimbado }: { lado: 'mentira' | 'verdade'; carimbado: boolean }) {
  return (
    <Carimbo lado={lado} data-rotulo-lado={lado} aria-hidden="true" className={cx(s.carimboCard, carimbado && s.carimbado)} style={{ opacity: 0 }} />
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
 * Imagem da carta (FR-4): a da notícia; senão, a ilustração "recorte chapado" dela; senão, a do tema (na versão retrato,
 * v13.0.0). Treino (AC-15.7): o desenho do próprio perfil; sem ele, a do tema.
 */
function ImagemCard({ noticia, treino }: { noticia: Noticia; treino?: PassoTreino }) {
  if (treino?.ilustracao) return <img className={s.imagemPerfil} src={ilustracaoDoPerfil(treino.ilustracao)} alt="" draggable={false} />;
  if (noticia.imagem) return <img src={src(noticia.imagem)} alt="" draggable={false} />;
  return <IlustracaoTema tema={noticia.tema} imagem={ilustracaoDaNoticia(noticia.id)} retrato />;
}

/**
 * Letra que cabe (AC-17.1, AC-17.2): mede o texto na carta e desce o tamanho (em `--u`) até caber; escreve `--letra`.
 * Mede de novo quando a fonte termina de carregar. Proporcional à tela, então vale em 1366×768 e em 1920×1080.
 */
function useLetraQueCabe<T extends HTMLElement>(faixa: { max: number; min: number }, chave: string) {
  const ref = useRef<T>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ajustar = () => {
      maiorTamanhoQueCabe(faixa.max, faixa.min, (t) => {
        el.style.setProperty('--letra', String(t));
        return el.scrollHeight <= el.clientHeight + 1;
      });
    };
    ajustar();
    let vivo = true;
    void document.fonts?.ready.then(() => { if (vivo) ajustar(); });
    return () => { vivo = false; };
  }, [chave, faixa.max, faixa.min]);
  return ref;
}

/** Reserva do canto inferior direito para o naipe girado: a última linha do texto contorna o disco. */
const ReservaNaipe = () => (
  <>
    <i className={s.reserva} aria-hidden="true" />
    <i className={s.reservaNaipe} aria-hidden="true" />
  </>
);

function FrenteCartaBase({ noticia, treino, oculta }: { noticia: Noticia; treino?: PassoTreino; oculta: boolean }) {
  const manchete = useLetraQueCabe<HTMLHeadingElement>(LETRA_MANCHETE, noticia.id + noticia.titulo);
  const frase = useLetraQueCabe<HTMLParagraphElement>({ max: 26, min: 20 }, noticia.id + noticia.descricao);
  return (
    <div className={cx(s.face, s.faceFrente, treino && s.faceTreino)} data-face-carta="frente" aria-hidden={oculta || undefined}>
      <div className={s.moldura}>
        <div className={s.janela} data-janela><ImagemCard noticia={noticia} treino={treino} /></div>
        {treino ? (
          <>
            {/* AC-17.1 (v13.1.0): o treino não tem verso, então a frase do perfil fica na frente, abaixo do nome. */}
            <h2 className={s.manchete}>{noticia.titulo}</h2>
            <p className={s.frase} ref={frase}><ReservaNaipe />{noticia.descricao}</p>
          </>
        ) : (
          <h2 className={s.manchete} ref={manchete}><ReservaNaipe />{noticia.titulo}</h2>
        )}
      </div>
      <Naipe tema={noticia.tema} posicao="superior" />
      <Naipe tema={noticia.tema} posicao="inferior" />
    </div>
  );
}

// FR-20 (v13.3.0): não re-renderiza a cada tick quando as props não mudam.
const FrenteCarta = memo(FrenteCartaBase);

/** Verso de "saiba mais" (AC-17.2): mesma moldura e naipes, faixa da cor do tema, manchete menor, descrição e texto. */
function VersoCartaBase({ noticia, oculta }: { noticia: Noticia; oculta: boolean }) {
  const texto = useLetraQueCabe<HTMLDivElement>(LETRA_VERSO, noticia.id + noticia.descricao + noticia.saibaMais);
  return (
    <div className={cx(s.face, s.faceVerso)} data-face-carta="verso" aria-hidden={oculta || undefined}>
      <div className={s.moldura}>
        <div className={s.faixaVerso} style={{ background: corDoTema(noticia.tema), color: tintaDoTema(noticia.tema) }}>Saiba mais</div>
        <div className={s.textoVerso} ref={texto} data-texto-verso>
          <ReservaNaipe />
          <h3>{noticia.titulo}</h3>
          <p className={s.descricaoVerso}>{noticia.descricao}</p>
          <p className={s.saibaMaisVerso}>{noticia.saibaMais}</p>
        </div>
      </div>
      <Naipe tema={noticia.tema} posicao="superior" />
      <Naipe tema={noticia.tema} posicao="inferior" />
    </div>
  );
}

// FR-20 (v13.3.0): não re-renderiza a cada tick quando as props não mudam.
const VersoCarta = memo(VersoCartaBase);

/** Face de baixo da carta enquanto ela sai do fan (AC-17.6, FR-18): o verso único do fan, que não diz nada da notícia. */
function FaceFan() {
  return (
    <div className={cx(s.face, s.faceFan)} data-face-carta="fan" aria-hidden="true">
      <img src={VERSO_FAN} alt="" draggable={false} />
    </div>
  );
}

/**
 * Distribuição (AC-17.6, v13.1.0, Fase 48.4): a carta sai da ponta direita do fan pelo verso, sobe em arco até o centro
 * da mesa virando para a frente. O caminho vem de `poseCartaDistribuida` (fan.ts) e roda no compositor (Web Animations,
 * só `transform`), preso ao `distribuindoMs` do estado: começa no ponto em que o reducer está e é corrigido se se afastar.
 * Com "menos movimento" (AC-17.7), não há animação: a carta já aparece de frente no centro; os tempos não mudam.
 */
function useVooDaCarta(voo: RefObject<HTMLDivElement>, giro: RefObject<HTMLDivElement>, nAntes: number, distribuindoMs: number) {
  const ativo = distribuindoMs > 0;
  const p = progressoDe(TEMPOS.distribuirMs, distribuindoMs);
  const pRef = useRef(p);
  pRef.current = p;
  const animacoes = useRef<Animation[]>([]);
  useLayoutEffect(() => {
    const el = voo.current;
    const g = giro.current;
    if (!ativo || !podeAnimar(el) || !g) return undefined;
    const u = el.offsetWidth / FAN.larguraCarta;
    // O pivô real do fan (outra proporção de tela muda a distância até o centro da mesa); 1366×768 = PIVO_NA_MESA.
    let pivo: { x: number; y: number } = PIVO_NA_MESA;
    const fan = el.closest('main')?.querySelector('[data-fan]');
    if (fan && u > 0) {
      const a = fan.getBoundingClientRect();
      const b = el.getBoundingClientRect();
      pivo = { x: (a.left - (b.left + b.width / 2)) / u, y: (a.top - (b.top + b.height / 2)) / u };
    }
    const pose = (t: number) => poseCartaDistribuida(nAntes, t, pivo);
    const opcoes = { duration: TEMPOS.distribuirMs, easing: 'linear' };
    const lista = [
      el.animate(quadrosChave((t) => {
        const q = pose(t);
        return `translate(${(q.x * u).toFixed(1)}px, ${(q.y * u).toFixed(1)}px) rotate(${q.graus.toFixed(2)}deg) scale(${q.escala.toFixed(4)})`;
      }), opcoes),
      g.animate(quadrosChave((t) => `rotateY(${pose(t).giroY.toFixed(1)}deg)`), opcoes),
    ];
    for (const a of lista) a.currentTime = pRef.current * TEMPOS.distribuirMs;
    animacoes.current = lista;
    return () => {
      for (const a of lista) a.cancel();
      animacoes.current = [];
    };
  }, [ativo, nAntes]);
  useEffect(() => {
    if (ativo) sincronizar(animacoes.current, p, TEMPOS.distribuirMs);
  }, [ativo, p]);
}

export function TelaCard({
  noticia, restanteMs, saibaMais, ausente, saida, pontos, modo = 'corpo', totalMs = 15000, treino, cardRef, onArrastar,
  cartasNoFan, distribuindoMs = 0,
}: {
  /** v13.0.0 (AC-17.3): cartas ainda no fan, do estado (`cartasNoFan`); sem valor, a tela não tem fan. */
  cartasNoFan?: number;
  /** v13.0.0 (AC-17.6): > 0 enquanto a carta sai do fan (`distribuindoMs` do estado). */
  distribuindoMs?: number;
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
  const distribuindo = distribuindoMs > 0;
  const verso = saibaMais && !treino && !distribuindo; // AC-15.6: o treino nunca vira; AC-17.6: nem a carta saindo do fan
  const voo = useRef<HTMLDivElement>(null);
  const giro = useRef<HTMLDivElement>(null);
  useVooDaCarta(voo, giro, (cartasNoFan ?? 0) + 1, distribuindoMs);
  return (
    <main className={`${s.tela} ${s.sobrio}`}>
      {/* AC-17.3: o fan fica atrás de tudo (primeiro na tela); a carta, os botões, as dicas e a barra vêm por cima. */}
      {cartasNoFan !== undefined && (
        <FanCartas
          quantidade={cartasNoFan}
          fase={distribuindo ? 'distribuindo' : 'parado'}
          progresso={progressoDe(TEMPOS.distribuirMs, distribuindoMs)}
        />
      )}
      <div className={s.mesa} data-mesa>
      <Lado lado="mentira" escolhido={saida === 'esquerda'} />
      {/*
        Carta de baralho (v13.0.0, AC-17.1, AC-17.2, AC-3.6): o article recebe o movimento com o corpo (useInclinacaoCard),
        a saída e o pulso; dentro, o giro vira as duas faces em ~400 ms (CSS, sem tempo no reducer). O carimbo fica fora
        das faces, para não virar junto. Atrás da carta, a pilha parada saiu (AC-2.12): o que fica atrás é o fan.
        O .voo leva a carta do fan até a mesa (AC-17.6) sem brigar com o movimento do corpo, que fica no article.
      */}
      <div className={s.voo} ref={voo}>
      <article
        ref={cardRef}
        data-carta
        data-face={verso ? 'verso' : 'frente'}
        data-distribuindo={distribuindo || undefined}
        className={cx(s.carta, verso && s.virada, saida && (saida === 'direita' ? s.saiDireita : s.saiEsquerda), pulsando && s.pulsando)}
        onPointerDown={(e) => { inicioX.current = e.clientX; }}
        onPointerUp={(e) => {
          if (inicioX.current === null) return;
          const dx = e.clientX - inicioX.current;
          inicioX.current = null;
          if (dx > 100) onArrastar('direita');
          else if (dx < -100) onArrastar('esquerda');
        }}
      >
        <div className={s.giro} ref={giro}>
          <FrenteCarta noticia={noticia} treino={treino} oculta={verso} />
          {!treino && <VersoCarta noticia={noticia} oculta={!verso} />}
          {distribuindo && <FaceFan />}
        </div>
        <RotuloLado lado="mentira" carimbado={saida === 'esquerda'} />
        <RotuloLado lado="verdade" carimbado={saida === 'direita'} />
      </article>
      </div>
      <Lado lado="verdade" escolhido={saida === 'direita'} />
      </div>
      {/* Fora da carta, para não tirar espaço da notícia (FR-4); a dica de "saiba mais" saiu da carta (AC-17.1). */}
      <div className={s.dicas}>
        {modo !== 'corpo' && <p className={s.dicaModo}>{DICA_GESTOS[modo]}</p>}
        {!treino && !saida && !distribuindo && (
          <p className={s.dicaModo} data-dica-saiba-mais>
            <Forma id="marca-estrela-5" largura={18} className={s.marcaDica} />
            {DICA_SAIBA_MAIS[modo]}
          </p>
        )}
      </div>
      {treino ? <MarcaTreino treino={treino} /> : <Placar pontos={pontos} />}
      {!saida && !treino && <BarraTempo restanteMs={restanteMs} totalMs={totalMs} alerta={alerta} />}
      {ausente && <div className={s.sobreposicao}>Volte para o centro</div>}
    </main>
  );
}

/**
 * Núcleo do feedback (AC-4.9, v12.0.0): o texto do resultado, grande, e o carimbo do veredito carimbado por cima dele,
 * cobrindo só o alto do texto; os dois no centro da tela. A carimbada dura `TEMPOS.carimboMs`, somada ao feedback.
 */
function NucleoFeedback({ texto, verdade }: { texto: string; verdade: boolean }) {
  return (
    <div className={s.nucleo} data-nucleo-feedback>
      <h2 className={s.textoResultado}>{texto}</h2>
      <Carimbo
        lado={verdade ? 'verdade' : 'mentira'}
        data-carimbo={verdade ? 'verdade' : 'mentira'}
        className={s.carimboFeedback}
        style={{ '--carimbo-ms': `${TEMPOS.carimboMs}ms` } as CSSProperties}
      />
    </div>
  );
}

/**
 * Feedback (AC-4.1 a AC-4.3, AC-4.9, v12.0.0): o fundo da tela inteira diz o resultado (verde = acertou; vermelho = errou
 * ou tempo esgotado); no centro, o texto do resultado com o carimbo do veredito por cima; depois a explicação e a técnica.
 */
function TelaFeedbackBase({ noticia, resultado, pontos }: { noticia: Noticia; resultado: Resultado; pontos: number }) {
  const verdade = noticia.veredito === 'verdadeira';
  return (
    <main
      className={cx(s.tela, resultado === 'acerto' ? s.fbAcerto : s.fbErro)}
      data-veredito={verdade ? 'verdade' : 'mentira'}
      data-resultado={resultado}
    >
      <div className={s.feedback}>
        <NucleoFeedback texto={TEXTO_RESULTADO[resultado]} verdade={verdade} />
        <p className={s.explicacao}>{noticia.explicacao}</p>
        <p className={s.tecnica}>{TECNICA_ROTULO[noticia.tecnica]}</p>
      </div>
      <Placar pontos={pontos} />
    </main>
  );
}

// FR-20 (v13.3.0): não re-renderiza a cada tick quando as props não mudam.
export const TelaFeedback = memo(TelaFeedbackBase);

/**
 * Feedback do treino (AC-15.3, FR-16; AC-4.10, v12.0.0): o mesmo layout do feedback, com o selo do treino
 * ("Acertou!"/"Quase!"), o gesto que o jogador fez e o que leva à resposta certa no lugar da explicação.
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
      className={cx(s.tela, t.acertou ? s.fbAcerto : s.fbErro)}
      data-veredito={verdade ? 'verdade' : 'mentira'}
      data-resultado={t.acertou ? 'treino-acerto' : 'treino-erro'}
    >
      <div className={s.feedback}>
        <NucleoFeedback texto={t.selo} verdade={verdade} />
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

/**
 * Lista "Notícias da rodada" (AC-5.8, v11.0.0): para ler de perto ou na foto do celular. Duas colunas preenchidas de
 * cima para baixo, com metade das notícias em cada uma (v12.0.2: eram 5 linhas fixas, e com mais de 10 notícias as
 * restantes caíam em colunas extras). Acima de 10 notícias (AC-9.23) as linhas ficam mais baixas, para caber em 1366×768.
 */
function ListaRodada({ linhas }: { linhas: readonly LinhaResumo[] }) {
  const porColuna = Math.max(1, Math.ceil(linhas.length / 2));
  return (
    <section className={s.listaRodada} aria-labelledby="titulo-lista-rodada">
      <div className={s.listaTopo}>
        <h2 id="titulo-lista-rodada">Notícias da rodada</h2>
        <div className={s.legenda} aria-hidden="true">
          <span><i className={cx(s.resultado, s.resultadoOk, s.resultadoMini)}><Forma id="marca-estrela-4" largura={13} /></i>acertou</span>
          <span><i className={cx(s.resultado, s.resultadoNao, s.resultadoMini)}><span className={s.xis} /></i>errou</span>
        </div>
      </div>
      <ol className={s.gradeRodada} style={{ '--linhas': porColuna } as CSSProperties} data-densa={linhas.length > 10 || undefined}>
        {linhas.map((l, i) => (
          <li
            key={l.id}
            className={s.linhaRodada}
            data-resultado={l.acertou ? 'acertou' : 'errou'}
            data-fim-coluna={(i + 1) % porColuna === 0 || i === linhas.length - 1 || undefined}
          >
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
 * âncoras do rosto (AC-13.6); sem ela, o resumo fica sem polaroid (AC-13.3). `maiorSequencia` (v13.4.0, AC-19.6): a
 * maior sequência de acertos, em qualquer intensidade dos efeitos (AC-19.8); por enquanto só o texto, sem acabamento.
 */
function TelaResumoBase({ pontos, total, maiorSequencia, foto, ancoras, linhas = [], enderecoQr }: {
  pontos: number;
  total: number;
  maiorSequencia?: number;
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
              {maiorSequencia !== undefined && (
                <p data-maior-sequencia={maiorSequencia}>{`Maior sequência: ${maiorSequencia}`}</p>
              )}
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

// FR-20 (v13.3.0): não re-renderiza a cada tick quando as props não mudam.
export const TelaResumo = memo(TelaResumoBase);

// v13.2.0 (FR-19): peças comuns, usadas também pelo card da interface Clássica (CardClassico.tsx).
export { Lado, MarcaTreino, Placar, RotuloLado, cx, src };
