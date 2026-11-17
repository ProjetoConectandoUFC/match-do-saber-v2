import { useRef, type RefObject } from 'react';
import { DICA_GESTOS, DICA_SAIBA_MAIS, type ModoJogo } from '../core/modos';
import type { Noticia } from '../core/types';
import { Forma } from './Forma';
import { IlustracaoTema, corDoTema } from './IlustracaoTema';
import { ilustracaoDaNoticia, ilustracaoDoPerfil } from './ilustracoes';
import { BarraTempo, Lado, MarcaTreino, Placar, RotuloLado, cx, src, type PassoTreino } from './Telas';
import s from './App.module.css';
import c from './CardClassico.module.css';

/**
 * Imagem do card clássico (FR-4): a da notícia; senão, a ilustração "recorte chapado" dela; senão, a do tema (com o chip
 * do nome). Treino (AC-15.7): o desenho do próprio perfil, maior; sem ele, a do tema.
 */
function ImagemCardClassico({ noticia, treino }: { noticia: Noticia; treino?: PassoTreino }) {
  if (treino?.ilustracao) return <img className={c.imagemPerfil} src={ilustracaoDoPerfil(treino.ilustracao)} alt="" draggable={false} />;
  if (noticia.imagem) return <img src={src(noticia.imagem)} alt="" draggable={false} />;
  return <IlustracaoTema tema={noticia.tema} imagem={ilustracaoDaNoticia(noticia.id)} />;
}

/**
 * Interface Clássica (v13.2.0, AC-18.4, FR-19): o card da v12.1.0, com a pilha atrás (AC-2.12 da v11.0.0), a descrição e
 * a dica de "saiba mais" no card, e o "saiba mais" trocando o conteúdo dentro do card. Mesmas props básicas do `TelaCard`
 * das Cartas, para o `App` escolher um ou outro pela interface.
 */
export function TelaCardClassico({ noticia, restanteMs, saibaMais, ausente, saida, pontos, modo = 'corpo', totalMs = 15000, treino, cardRef, onArrastar }: {
  /** Só das Cartas (fan e distribuição, v13.0.0); a Clássica recebe e ignora, para o `App` passar as mesmas props. */
  cartasNoFan?: number;
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
  return (
    <main className={`${s.tela} ${s.sobrio}`} data-interface-card="classica">
      <div className={s.mesa} data-mesa>
        <Lado lado="mentira" escolhido={saida === 'esquerda'} />
        {/* Pilha de cards (AC-2.12, v11.0.0): duas camadas paradas atrás; a pilha tem o tamanho do card (AC-4.5). */}
        <div className={c.pilha}>
          <div className={`${c.camadaPilha} ${c.camadaPilha1}`} data-pilha-camada aria-hidden="true" />
          <div className={`${c.camadaPilha} ${c.camadaPilha2}`} data-pilha-camada aria-hidden="true" />
          <article
            ref={cardRef}
            className={cx(c.card, saida && (saida === 'direita' ? s.saiDireita : s.saiEsquerda), pulsando && s.pulsando)}
            onPointerDown={(e) => { inicioX.current = e.clientX; }}
            onPointerUp={(e) => {
              if (inicioX.current === null) return;
              const dx = e.clientX - inicioX.current;
              inicioX.current = null;
              if (dx > 100) onArrastar('direita');
              else if (dx < -100) onArrastar('esquerda');
            }}
          >
            {saibaMais && !treino ? (
              <>
                <div className={c.faixaTema} style={{ background: corDoTema(noticia.tema) }} />
                <div className={c.saibaMais}>
                  <h2>{noticia.titulo}</h2>
                  <p>{noticia.saibaMais}</p>
                </div>
              </>
            ) : (
              <>
                <ImagemCardClassico noticia={noticia} treino={treino} />
                <h2>{noticia.titulo}</h2>
                <p>{noticia.descricao}</p>
                {!treino && <p className={c.dicaCard}><Forma id="marca-estrela-5" largura={18} className={c.marcaDica} />{DICA_SAIBA_MAIS[modo]}</p>}
              </>
            )}
            <RotuloLado lado="mentira" carimbado={saida === 'esquerda'} />
            <RotuloLado lado="verdade" carimbado={saida === 'direita'} />
          </article>
        </div>
        <Lado lado="verdade" escolhido={saida === 'direita'} />
      </div>
      {/* Fora do card, para não tirar espaço do texto da notícia (FR-4). */}
      {modo !== 'corpo' && <p className={c.dicaModo}>{DICA_GESTOS[modo]}</p>}
      {treino ? <MarcaTreino treino={treino} /> : <Placar pontos={pontos} />}
      {!saida && !treino && <BarraTempo restanteMs={restanteMs} totalMs={totalMs} alerta={alerta} />}
      {ausente && <div className={s.sobreposicao}>Volte para o centro</div>}
    </main>
  );
}
