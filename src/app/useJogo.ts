import { useEffect, useReducer, useRef, useState } from 'react';
import { extrairPontos, type Registro } from '../core/diagnostico';
import { AJUSTES_PADRAO, contextoDosAjustes, type Ajustes } from '../core/ajustes';
import { configGestos, criarInterpretador, medirCabeca, medirMaos, type Gesto, type Pose } from '../core/gestos';
import { ESTADO_INICIAL, calibrarAoSair, reduzir, type Contexto, type Estado, type Evento } from '../core/partida';
import { dtDoQuadro } from '../core/relogio';
import type { Noticia } from '../core/types';
import { PERFIS_TUTORIAL } from './perfisTutorial';
import { abrirCamera, criarRastreador, type Rastreador } from './rastreador';
import { useTelaAcordada } from './useTelaAcordada';

export type StatusCamera = 'carregando' | 'ativa' | 'negada' | 'indisponivel';

/** Intervalo das tentativas de reabrir a câmera na tela de espera (NFR Reliability, v12.1.0). */
export const REABRIR_CAMERA_MS = 5000;

const EVENTO_DO_GESTO: Record<Gesto, Evento> = {
  direita: { tipo: 'escolha', resposta: 'verdadeira' },
  esquerda: { tipo: 'escolha', resposta: 'falsa' },
  maosParaCima: { tipo: 'saibaMais' },
};

const EVENTO_DA_TECLA: Record<string, Evento | undefined> = {
  ArrowRight: EVENTO_DO_GESTO.direita,
  ArrowLeft: EVENTO_DO_GESTO.esquerda,
  ArrowUp: EVENTO_DO_GESTO.maosParaCima,
  Enter: { tipo: 'enter' },
  Escape: { tipo: 'sair' }, // FR-10
};

/** `noticias`: as jogáveis dentro dos filtros de conteúdo dos Ajustes (AC-9.27, AC-6.4). */
export function useJogo(noticias: Noticia[], config: Ajustes = AJUSTES_PADRAO, pausado = false, registro?: Registro) {
  const [camera, setCamera] = useState<StatusCamera>('carregando');
  const ctx = useRef<Contexto>({ noticias, rng: Math.random, cameraAtiva: false });
  // Tempos, tolerância, volta do resumo e sorteio vêm dos Ajustes (FR-1, FR-9, v12.0.0).
  ctx.current = {
    noticias, rng: Math.random, cameraAtiva: camera === 'ativa', ...contextoDosAjustes(config),
    tutorial: config.tutorial ? PERFIS_TUTORIAL : [], // FR-16: desligado por padrão
  };
  const [estado, despachar] = useReducer((s: Estado, e: Evento) => reduzir(s, e, ctx.current), ESTADO_INICIAL);

  const videoRef = useRef<HTMLVideoElement>(null);
  const inclinacaoRef = useRef(0);
  const poseRef = useRef<Pose | null>(null);
  const interp = useRef(criarInterpretador(config.modo, configGestos(config.sensibilidade)));
  const pausadoRef = useRef(pausado);
  pausadoRef.current = pausado;
  // Só para o modo de diagnóstico (FR-12): o laço lê a tela e o modo atuais sem recriar o efeito.
  const diagRef = useRef({ registro, tela: estado.tela as string, modo: config.modo });
  diagRef.current = { registro, tela: estado.tela, modo: config.modo };
  const rastreador = useRef<Rastreador | null>(null);
  const telaAnterior = useRef(estado.tela);
  // Lidos pela reabertura da câmera (NFR Reliability, v12.1.0) sem recriar o efeito.
  const telaRef = useRef(estado.tela as string);
  telaRef.current = estado.tela;
  const cameraRef = useRef(camera);
  cameraRef.current = camera;

  useTelaAcordada(); // NFR Reliability (v12.1.0): sem repouso de tela na web

  // Modo e sensibilidade (AC-9.28) só mudam na tela de espera (FR-9): trocar o interpretador não afeta uma partida.
  useEffect(() => {
    interp.current = criarInterpretador(config.modo, configGestos(config.sensibilidade));
  }, [config.modo, config.sensibilidade]);

  // Calibra o centro ao sair da calibração para o primeiro card (ou para o treino, FR-16).
  useEffect(() => {
    if (calibrarAoSair(telaAnterior.current, estado.tela)) interp.current.calibrar();
    telaAnterior.current = estado.tela;
  }, [estado.tela]);

  // Câmera + modelo. Seguro para o duplo efeito do StrictMode: tudo que chega depois do cleanup é descartado.
  // v12.1.0 (NFR Reliability): só NotAllowedError é "negada"; o resto (ocupada, desconectada) é "indisponivel".
  // Fora da partida (tela de espera), a câmera que não está ativa é reaberta a cada ~5 s e quando um
  // dispositivo é conectado; na web, a permissão negada não é pedida de novo (no desktop a permissão é do
  // próprio app, então tudo é reabrível). Se o modelo não carrega, o stream é parado (a luz da webcam apaga).
  useEffect(() => {
    const abortar = new AbortController();
    const cancelado = () => abortar.signal.aborted;
    const desktop = !!(window as { matchDoSaber?: { desktop?: boolean } }).matchDoSaber?.desktop;
    let stream: MediaStream | null = null;
    let meu: Rastreador | null = null;
    let abrindo = false;
    // Por que a última abertura falhou: 'permissao' (web) não é tentada de novo; 'modelo' só na troca de
    // dispositivo (tentar a cada 5 s acenderia e apagaria a luz da webcam sem parar).
    let bloqueio: 'permissao' | 'modelo' | null = null;

    const liberar = () => {
      stream?.getTracks().forEach((t) => t.stop());
      stream = null;
      if (meu) {
        if (rastreador.current === meu) rastreador.current = null;
        meu.fechar();
        meu = null;
      }
    };

    const abrir = async () => {
      abrindo = true;
      try {
        liberar();
        const video = videoRef.current;
        if (!video || !navigator.mediaDevices?.getUserMedia) {
          bloqueio = desktop ? null : 'permissao';
          return setCamera('negada');
        }
        let s: MediaStream;
        try {
          s = await abrirCamera(video, abortar.signal);
        } catch (e) {
          if (cancelado()) return;
          const negada = (e as { name?: string })?.name === 'NotAllowedError';
          bloqueio = negada && !desktop ? 'permissao' : null;
          setCamera(negada ? 'negada' : 'indisponivel');
          return;
        }
        if (cancelado()) return s.getTracks().forEach((t) => t.stop());
        stream = s;
        let r: Rastreador;
        try {
          r = await criarRastreador();
        } catch {
          if (cancelado()) return;
          liberar(); // sem modelo, a câmera não serve para nada: desliga (luz apaga)
          bloqueio = 'modelo';
          setCamera('indisponivel');
          return;
        }
        if (cancelado()) return r.fechar();
        meu = r;
        rastreador.current = r;
        bloqueio = null;
        s.getVideoTracks()[0]?.addEventListener('ended', () => {
          if (cancelado() || stream !== s) return;
          liberar();
          setCamera('indisponivel');
        });
        setCamera('ativa');
      } finally {
        abrindo = false;
      }
    };

    const tentarDeNovo = (trocaDeDispositivo: boolean) => {
      if (abrindo || cancelado() || telaRef.current !== 'espera') return;
      if (cameraRef.current === 'ativa' || cameraRef.current === 'carregando') return;
      if (bloqueio === 'permissao' || (bloqueio === 'modelo' && !trocaDeDispositivo)) return;
      void abrir();
    };

    void abrir();
    const intervalo = setInterval(() => tentarDeNovo(false), REABRIR_CAMERA_MS);
    const aoTrocarDispositivo = () => tentarDeNovo(true);
    const dispositivos = navigator.mediaDevices;
    dispositivos?.addEventListener?.('devicechange', aoTrocarDispositivo);
    return () => {
      abortar.abort();
      clearInterval(intervalo);
      dispositivos?.removeEventListener?.('devicechange', aoTrocarDispositivo);
      liberar();
    };
  }, []);

  // Loop único: tick por quadro.
  useEffect(() => {
    let raf = 0;
    let anterior = performance.now();
    const quadro = (agora: number) => {
      // Reagendado antes de tudo: uma exceção no resto do quadro não congela o jogo (NFR Reliability, v12.1.0).
      raf = requestAnimationFrame(quadro);
      const dtMs = dtDoQuadro(agora, anterior);
      anterior = agora;
      const video = videoRef.current;
      const r = rastreador.current;
      let poses: Pose[] | null = null;
      const antesDeteccao = performance.now();
      if (r && video && video.readyState >= 2) {
        try {
          poses = r.detectar(video, agora);
        } catch (e) {
          // Ex.: contexto WebGL perdido depois de horas ou de um repouso. O rastreador sai; a câmera fica
          // "indisponivel" e é reaberta na tela de espera (efeito acima).
          console.error('[match-do-saber] erro na detecção de pose', e);
          if (rastreador.current === r) rastreador.current = null;
          r.fechar();
          setCamera('indisponivel');
        }
      }
      if (poses) {
        const deteccaoMs = performance.now() - antesDeteccao;
        // AC-2.13 (v12.1.0): fora de um card ou treino, nenhuma permanência conta; ela só começa com o card na tela.
        // A tela vem do último render: no quadro em que o tick troca para o card, ainda vale a anterior e zera.
        const telaAtual = diagRef.current.tela;
        if (telaAtual !== 'card' && telaAtual !== 'tutorial') interp.current.zerar();
        // AC-1.5 (v12.1.0): o interpretador acompanha o jogador entre os quadros; um passante não toma o controle.
        const leitura = interp.current.lerPoses(poses, agora);
        const pose = leitura.pose;
        poseRef.current = pose;
        // Com os Ajustes, o menu ☰ ou um painel dele abertos, a câmera não gera presença nem gestos (FR-14).
        inclinacaoRef.current = pausadoRef.current ? 0 : leitura.inclinacao;
        despachar({ tipo: 'tick', dtMs, presenca: pausadoRef.current ? null : leitura.presenca });
        if (!pausadoRef.current) for (const g of leitura.gestos) despachar(EVENTO_DO_GESTO[g]);
        const d = diagRef.current;
        d.registro?.adicionar({
          t: agora, dtMs, deteccaoMs, pessoas: poses.length, tela: d.tela, modo: d.modo,
          pontos: extrairPontos(pose),
          medidas: pose ? { maos: medirMaos(pose), cabeca: medirCabeca(pose) } : {},
          gestos: pausadoRef.current ? [] : leitura.gestos,
        });
      } else {
        poseRef.current = null;
        inclinacaoRef.current = 0;
        despachar({ tipo: 'tick', dtMs, presenca: null });
        const d = diagRef.current;
        d.registro?.adicionar({ t: agora, dtMs, deteccaoMs: null, pessoas: 0, tela: d.tela, modo: d.modo, pontos: {}, medidas: {}, gestos: [] });
      }
    };
    raf = requestAnimationFrame(quadro);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Teclado (FR-3).
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      const ev = EVENTO_DA_TECLA[e.key];
      // Com o menu ☰ ou um painel aberto, as teclas são do painel (FR-14), não do jogo.
      if (ev && !pausadoRef.current) {
        e.preventDefault();
        despachar(ev);
      }
    };
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, []);

  return { estado, despachar, camera, videoRef, inclinacaoRef, poseRef };
}
