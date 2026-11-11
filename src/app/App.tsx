import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { jogaveis } from '../core/banco';
import { alternarDiagnostico, criarRegistro } from '../core/diagnostico';
import { enderecoFontes, linhasDoResumo } from '../core/fontesRodada';
import { URL_PUBLICA } from './enderecoPublico';
import { TEMPOS, pontos, type Estado } from '../core/partida';
import { baixarJson } from './baixar';
import { CameraPreview } from './CameraPreview';
import { capturarFoto, type FotoPartida } from './foto';
import { MenuOperador, type ItemMenu } from './MenuOperador';
import { PainelNoticias } from './PainelNoticias';
import { PainelDiagnostico } from './PainelDiagnostico';
import { criarRepositorio, repositorioWeb, type EstadoBanco, type RepositorioNoticias } from './repositorio';
import { BotaoSair, MenuConfiguracoes, TelaCalibracao, TelaCard, TelaEspera, TelaFeedback, TelaFeedbackTutorial, TelaResumo } from './Telas';
import { perfilComoNoticia } from '../core/tutorial';
import { PERFIS_TUTORIAL } from './perfisTutorial';
import { useConfiguracoes } from './useConfiguracoes';
import { useFotoPartida } from './useFotoPartida';
import { useInclinacaoCard } from './useInclinacaoCard';
import { useJogo } from './useJogo';
import { useSons } from './useSons';
import s from './App.module.css';

function alternarTelaCheia() {
  const pedido = document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen();
  pedido?.catch(() => {});
}

export function App() {
  const [repo, setRepo] = useState<RepositorioNoticias>(() => criarRepositorio());
  const [estadoBanco, setEstadoBanco] = useState<EstadoBanco | null>(null);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    repo.carregar()
      .catch((e) => {
        if (repo.tipo === 'web') throw e;
        // App de desktop sem o banco local: joga com o embutido, sem gerenciador.
        console.error(e);
        const web = repositorioWeb();
        setRepo(web);
        return web.carregar();
      })
      .then(setEstadoBanco)
      .catch((e) => {
        console.error(e);
        setErro(true);
      });
  }, []);

  if (erro) return <main className={s.centro}><p className={s.aviso}>Conecte à internet uma vez para baixar o jogo</p></main>;
  if (!estadoBanco) return <main className={s.centro}><p>Carregando…</p></main>;
  return <Jogo repo={repo} estadoBanco={estadoBanco} onBancoAlterado={setEstadoBanco} />;
}

function Jogo({ repo, estadoBanco, onBancoAlterado }: {
  repo: RepositorioNoticias;
  estadoBanco: EstadoBanco;
  onBancoAlterado: (e: EstadoBanco) => void;
}) {
  // Só notícias válidas e aprovadas entram nas partidas (AC-7.7). Ao gravar, a próxima partida já usa o banco novo (AC-7.6).
  const noticias = useMemo(() => jogaveis(estadoBanco.banco), [estadoBanco.banco]);
  const telaRef = useRef<Estado['tela']>('espera');
  // Menu ☰ do operador (FR-14) e o painel que ele abriu.
  const [operador, setOperador] = useState<'fechado' | 'menu' | 'noticias'>('fechado');
  const operadorRef = useRef(operador);
  operadorRef.current = operador;
  const podeAbrirMenu = useCallback(() => telaRef.current === 'espera' && operadorRef.current === 'fechado', []);
  const cfg = useConfiguracoes(podeAbrirMenu);
  // Modo de diagnóstico (FR-12): começa ligado com ?diagnostico; o menu ☰ liga e desliga (AC-12.7).
  const [diagnostico, setDiagnostico] = useState(() =>
    (new URLSearchParams(window.location.search).has('diagnostico') ? criarRegistro() : undefined));
  // Com o menu ☰, um painel dele ou as Configurações abertos, câmera e teclas não chegam ao jogo (FR-14).
  const pausado = cfg.menuAberto || operador !== 'fechado';
  const { estado, despachar, camera, videoRef, poseRef, inclinacaoRef } = useJogo(noticias, cfg.config, pausado, diagnostico);
  const fecharOperador = useCallback(() => setOperador('fechado'), []);
  const escolherNoMenu = useCallback((item: ItemMenu) => {
    if (item === 'configuracoes') {
      operadorRef.current = 'fechado'; // o menu ☰ acabou de fechar; o setState ainda não chegou ao ref
      cfg.abrir();
    }
    else if (item === 'diagnostico') setDiagnostico(alternarDiagnostico);
    else if (item === 'telaCheia') alternarTelaCheia();
    else if (item === 'noticias') setOperador('noticias');
  }, [cfg.abrir]);
  telaRef.current = estado.tela;
  useSons(estado, cfg.config.som);
  // Foto do resumo (FR-13): só com a câmera ativa; fica só neste estado React, com as âncoras do rosto
  // calculadas pela pose do mesmo quadro (AC-13.6), que posicionam o filtro da faixa no resumo (AC-13.8, v11.0.0).
  const foto = useFotoPartida<FotoPartida>(estado, cfg.config.foto, () =>
    camera === 'ativa' && videoRef.current ? capturarFoto(videoRef.current, poseRef.current) : null);
  const cardRef = useRef<HTMLElement>(null);
  const cardSaindoRef = useRef<HTMLElement>(null); // card que está saindo (AC-2.1/AC-2.2)
  // AC-2.10: o card acompanha levemente a inclinação, direto no DOM (sem re-renderizar a cada leitura).
  useInclinacaoCard({ inclinacaoRef, estado, pausado, cardRef, cardSaindoRef });

  let tela;
  switch (estado.tela) {
    case 'espera':
      tela = (
        <TelaEspera
          semNoticias={noticias.length === 0}
          camera={camera}
          config={cfg.config}
          menu={(
            <MenuOperador
              aberto={operador === 'menu'}
              onAbrir={() => setOperador('menu')}
              onFechar={fecharOperador}
              diagnosticoLigado={!!diagnostico}
              onEscolher={escolherNoMenu}
            />
          )}
          onIniciar={() => despachar({ tipo: 'enter' })}
        />
      );
      break;
    case 'calibracao':
      tela = <TelaCalibracao progresso={estado.centradoMs / TEMPOS.calibracaoMs} modo={cfg.config.modo} />;
      break;
    case 'card':
      tela = (
        <TelaCard
          key={estado.indice}
          noticia={estado.partida.cards[estado.indice]!}
          restanteMs={estado.restanteMs}
          saibaMais={estado.saibaMais}
          ausente={estado.ausenteMs !== null}
          pontos={pontos(estado.partida)}
          modo={cfg.config.modo}
          totalMs={cfg.config.tempoCardS * 1000}
          cardRef={cardRef}
          onArrastar={(lado) => despachar({ tipo: 'escolha', resposta: lado === 'direita' ? 'verdadeira' : 'falsa' })}
        />
      );
      break;
    case 'feedback': {
      const noticia = estado.partida.cards[estado.indice]!;
      // Após uma escolha, os primeiros TEMPOS.saidaMs do feedback são a saída do card; depois, o tempo entre cards (v12.0.0).
      const saindo = estado.resposta !== null && estado.restanteMs > estado.feedbackMs;
      tela = saindo ? (
        <TelaCard
          key={estado.indice}
          noticia={noticia}
          restanteMs={0}
          saibaMais={false}
          ausente={false}
          pontos={pontos(estado.partida)}
          modo={cfg.config.modo}
          totalMs={cfg.config.tempoCardS * 1000}
          saida={estado.resposta === 'verdadeira' ? 'direita' : 'esquerda'}
          cardRef={cardSaindoRef}
          onArrastar={() => {}}
        />
      ) : (
        <TelaFeedback noticia={noticia} resultado={estado.partida.resultados[estado.indice]!} pontos={pontos(estado.partida)} />
      );
      break;
    }
    case 'tutorial':
    case 'tutorialFeedback': {
      // Treino (FR-16): mesmas telas do card e do feedback, sem tempo nem placar; depois da escolha, o card sai.
      const perfil = PERFIS_TUTORIAL[estado.passo]!;
      const noticia = perfilComoNoticia(perfil);
      const treino = { passo: estado.passo, total: PERFIS_TUTORIAL.length, ilustracao: perfil.ilustracao };
      const saindo = estado.tela === 'tutorialFeedback' && estado.restanteMs > estado.feedbackMs;
      tela = estado.tela === 'tutorialFeedback' && !saindo ? (
        <TelaFeedbackTutorial noticia={noticia} resposta={estado.resposta} modo={cfg.config.modo} treino={treino} />
      ) : (
        <TelaCard
          key={`treino-${estado.passo}`}
          noticia={noticia}
          restanteMs={0}
          saibaMais={false}
          ausente={false}
          pontos={0}
          modo={cfg.config.modo}
          treino={treino}
          saida={estado.tela === 'tutorialFeedback' ? (estado.resposta === 'verdadeira' ? 'direita' : 'esquerda') : undefined}
          cardRef={saindo ? cardSaindoRef : cardRef}
          onArrastar={saindo ? () => {} : (lado) => despachar({ tipo: 'escolha', resposta: lado === 'direita' ? 'verdadeira' : 'falsa' })}
        />
      );
      break;
    }
    case 'resumo': {
      // v11.0.0: filtro da faixa sobre a foto (AC-13.8), lista da rodada (AC-5.8) e QR só com os ids (AC-5.9).
      const { cards, resultados } = estado.partida;
      tela = (
        <TelaResumo
          pontos={pontos(estado.partida)}
          total={cards.length}
          foto={foto?.imagem}
          ancoras={foto?.ancoras}
          linhas={linhasDoResumo(cards, resultados)}
          enderecoQr={enderecoFontes(URL_PUBLICA, cards.map((c) => c.id))}
        />
      );
      break;
    }
  }

  return (
    <div className={s.app}>
      {tela}
      {camera === 'indisponivel' && estado.tela !== 'espera' && (
        <p className={s.faixa}>Câmera indisponível — use as setas</p>
      )}
      {estado.tela !== 'espera' && <BotaoSair onSair={() => despachar({ tipo: 'sair' })} />}
      {operador === 'noticias' && (
        <PainelNoticias repo={repo} estado={estadoBanco} onBancoAlterado={onBancoAlterado} onFechar={fecharOperador} />
      )}
      {cfg.menuAberto && (
        <MenuConfiguracoes config={cfg.config} itemDestacado={cfg.itemDestacado} onDefinir={cfg.definir} onFechar={cfg.fechar} />
      )}
      {diagnostico && <PainelDiagnostico registro={diagnostico} onBaixar={() => baixarJson(diagnostico.exportar())} />}
      {/* A prévia da câmera não aparece no resumo (AC-2.6, v10.0.0); o vídeo continua ligado para a foto. */}
      <CameraPreview videoRef={videoRef} poseRef={poseRef} visivel={camera === 'ativa' && estado.tela !== 'resumo'} />
    </div>
  );
}
