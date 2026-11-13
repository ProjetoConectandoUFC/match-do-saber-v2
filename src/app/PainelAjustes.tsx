import {
  AJUSTES_PADRAO, GRUPO_ROTULO, OPCOES, alternarTema, ehItemValor, rotuloValor,
  type Ajustes, type GrupoAjuste, type ItemPainel, type ItemValor, type PainelAjustes as EstadoPainel,
} from '../core/ajustes';
import { textoContagem, type ContagemConteudo } from '../core/contagem';
import { DICA_GESTOS } from '../core/modos';
import { TEMAS, TEMA_ROTULO } from '../core/types';
import s from './App.module.css';

const GRUPOS: readonly GrupoAjuste[] = ['partida', 'conteudo', 'deteccao', 'midia', 'questoes'];

/**
 * Painel "Ajustes" (FR-9, v12.0.0; até a v11.0.0, "Configurações"): painel lateral à direita com rolagem própria
 * (AC-9.18), itens agrupados (AC-9.1), clique nos valores (AC-9.2), temas com contagem (AC-9.27), contagem de
 * jogáveis e ocultas e "Restaurar padrão" com confirmação (AC-9.30). O teclado fica em `useAjustes`.
 * Estilo mínimo, com as classes do menu antigo; o Agente Visual estiliza por `data-painel`, `data-grupo`, `data-item`.
 */
export function PainelAjustes({ ajustes, itens, painel, contagem, onDefinir, onFechar, onConfirmarRestauro, onRevisar }: {
  ajustes: Ajustes;
  /** Itens navegáveis (`itensDoPainel`); `painel.item` indexa esta lista. */
  itens: readonly ItemPainel[];
  painel: EstadoPainel;
  contagem: ContagemConteudo;
  onDefinir: (a: Ajustes) => void;
  onFechar: () => void;
  onConfirmarRestauro: (confirmar: boolean) => void;
  onRevisar: () => void;
}) {
  const destacado = itens[painel.item]?.id;
  const props = (id: ItemPainel['id']) => ({
    'data-item': id,
    'data-destacado': id === destacado ? 'true' : undefined,
    className: id === destacado ? s.destacado : undefined,
  });

  const valor = (item: ItemValor, rotulo: string) => (
    <li key={item} {...props(item)}>
      <p className={s.rotuloItem} id={`aj-${item}`}>{rotulo}</p>
      <div className={s.opcoes} role="group" aria-labelledby={`aj-${item}`}>
        {(OPCOES[item] as readonly Ajustes[ItemValor][]).map((v) => {
          const ativo = ajustes[item] === v;
          return (
            <button key={String(v)} type="button" aria-pressed={ativo} onClick={() => onDefinir({ ...ajustes, [item]: v } as Ajustes)}>
              {`${ativo ? '◉' : '○'} ${rotuloValor(item, v)}`}
            </button>
          );
        })}
      </div>
      {item === 'modo' && <p className={s.dica}>{DICA_GESTOS[ajustes.modo]}</p>}
    </li>
  );

  const temas = (rotulo: string) => (
    <li key="temas" {...props('temas')}>
      <p className={s.rotuloItem} id="aj-temas">{rotulo}</p>
      <div className={s.opcoes} role="group" aria-labelledby="aj-temas">
        {TEMAS.map((t, i) => {
          const ligado = ajustes.temas.includes(t);
          return (
            <button
              key={t}
              type="button"
              aria-pressed={ligado}
              data-tema={t}
              data-foco={destacado === 'temas' && painel.tema === i ? 'true' : undefined}
              onClick={() => { const novo = alternarTema(ajustes, t); if (novo !== ajustes) onDefinir(novo); }}
            >
              {`${ligado ? '◉' : '○'} ${TEMA_ROTULO[t]} (${contagem.porTema[t]})`}
            </button>
          );
        })}
      </div>
      <p className={s.dica}>Pelo menos um tema fica ligado.</p>
    </li>
  );

  const item = (i: ItemPainel) => {
    if (i.id === 'temas') return temas(i.rotulo);
    if (ehItemValor(i.id)) return valor(i.id, i.rotulo);
    if (i.id === 'revisar') {
      return <li key="revisar" {...props('revisar')}><button type="button" onClick={onRevisar}>{i.rotulo}</button></li>;
    }
    return null;
  };

  return (
    <div className={s.painel} role="dialog" aria-modal="true" aria-label="Ajustes">
      <div className={s.menu} data-painel="ajustes">
        <div className={s.cabecalhoMenu}>
          <h2>Ajustes</h2>
          <button type="button" className={s.fechar} aria-label="Fechar" onClick={onFechar}><span className={s.xis} aria-hidden="true" /></button>
        </div>
        {GRUPOS.map((g) => (
          <section key={g} data-grupo={g} aria-labelledby={`aj-grupo-${g}`}>
            <h3 id={`aj-grupo-${g}`}>{GRUPO_ROTULO[g]}</h3>
            {g === 'questoes' && <p className={s.dica} data-contagem>{textoContagem(contagem)}</p>}
            <ul>{itens.filter((i) => i.grupo === g).map(item)}</ul>
          </section>
        ))}
        <ul>
          <li {...props('restaurar')}>
            <button type="button" onClick={() => onConfirmarRestauro(true)}>Restaurar padrão</button>
            {painel.confirmarRestauro && (
              <div role="alertdialog" aria-label="Restaurar padrão" data-confirmar-restauro>
                <p>Todos os ajustes voltam ao padrão. O banco de notícias não muda.</p>
                <div className={s.opcoes}>
                  <button type="button" onClick={() => onConfirmarRestauro(false)}>Cancelar</button>
                  <button type="button" onClick={() => { onDefinir({ ...AJUSTES_PADRAO, temas: [...AJUSTES_PADRAO.temas] }); onConfirmarRestauro(false); }}>Restaurar</button>
                </div>
              </div>
            )}
          </li>
        </ul>
        <p className={s.dica}>↑/↓ escolhem o item · ←/→ mudam o valor · Espaço liga/desliga um tema · Esc ou Enter fecham</p>
      </div>
    </div>
  );
}
