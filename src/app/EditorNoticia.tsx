import { useState } from 'react';
import type { Problemas } from '../core/banco';
import {
  STATUS, TECNICAS, TECNICA_ROTULO, TEMAS, TEMA_ROTULO, VEREDITOS, type ColunaBanco, type NoticiaBanco,
} from '../core/types';
import p from './PainelNoticias.module.css';

type Campo = { coluna: ColunaBanco; rotulo: string; tipo: 'texto' | 'area' | 'lista'; opcoes?: readonly string[]; rotulos?: Record<string, string>; dica?: string };

const CAMPOS: Campo[] = [
  { coluna: 'id', rotulo: 'ID', tipo: 'texto', dica: 'gerado automaticamente; letras, números e hífen' },
  { coluna: 'titulo', rotulo: 'Título', tipo: 'texto' },
  { coluna: 'descricao', rotulo: 'Descrição', tipo: 'area', dica: 'texto curto do card' },
  { coluna: 'saiba_mais', rotulo: 'Saiba mais', tipo: 'area' },
  { coluna: 'veredito', rotulo: 'Veredito', tipo: 'lista', opcoes: VEREDITOS, rotulos: { verdadeira: 'Verdadeira', falsa: 'Falsa' } },
  { coluna: 'explicacao', rotulo: 'Explicação', tipo: 'area', dica: 'aparece depois da escolha' },
  { coluna: 'tecnica', rotulo: 'Técnica', tipo: 'lista', opcoes: TECNICAS, rotulos: TECNICA_ROTULO },
  { coluna: 'tema', rotulo: 'Tema', tipo: 'lista', opcoes: TEMAS, rotulos: TEMA_ROTULO },
  { coluna: 'fonte_url', rotulo: 'Fonte (link)', tipo: 'texto', dica: 'https://…' },
  { coluna: 'fontes_extras', rotulo: 'Outras fontes (links)', tipo: 'texto', dica: 'opcional; links separados por espaço' },
  { coluna: 'imagem', rotulo: 'Imagem (opcional)', tipo: 'texto', dica: 'sem imagem, o card mostra a ilustração do tema' },
  { coluna: 'revisado_por', rotulo: 'Revisado por', tipo: 'texto', dica: 'obrigatório para aprovar' },
  { coluna: 'status', rotulo: 'Status', tipo: 'lista', opcoes: STATUS, rotulos: { rascunho: 'Rascunho', aprovada: 'Aprovada' } },
];

/** Editor de uma notícia (AC-7.2, AC-7.3): aponta cada campo com problema; quem valida e grava é o painel. */
export function EditorNoticia({ inicial, nova, problemas, salvando, onSalvar, onApagar, onCancelar }: {
  inicial: NoticiaBanco;
  nova: boolean;
  problemas: Problemas;
  salvando: boolean;
  onSalvar: (n: NoticiaBanco) => void;
  onApagar?: () => void;
  onCancelar: () => void;
}) {
  const [n, setN] = useState(inicial);
  const titulo = nova ? 'Nova notícia' : 'Editar notícia';
  return (
    <div className={p.camada} role="dialog" aria-modal="true" aria-label={titulo} data-editor={nova ? 'nova' : 'editar'}>
      <form
        className={p.caixa}
        noValidate
        onSubmit={(e) => { e.preventDefault(); onSalvar(n); }}
      >
        <header className={p.topo}>
          <h3>{titulo}</h3>
          <button type="button" aria-label="Fechar editor" onClick={onCancelar}>✕</button>
        </header>
        <div className={p.campos}>
          {CAMPOS.map((c) => {
            const id = `ed-${c.coluna}`;
            const erro = problemas[c.coluna];
            const comum = {
              id,
              value: n[c.coluna],
              'aria-invalid': erro ? ('true' as const) : ('false' as const),
              'aria-describedby': erro ? `${id}-erro` : undefined,
              onChange: (e: { target: { value: string } }) => setN({ ...n, [c.coluna]: e.target.value }),
            };
            return (
              <div key={c.coluna} className={c.tipo === 'area' ? `${p.campo} ${p.campoLargo}` : p.campo} data-campo={c.coluna} data-erro={erro ? 'sim' : undefined}>
                <label htmlFor={id}>{c.rotulo}</label>
                {c.tipo === 'area' ? (
                  <textarea rows={3} {...comum} />
                ) : c.tipo === 'lista' ? (
                  <select {...comum}>
                    <option value="">—</option>
                    {/* Valor fora da lista (ex.: vindo do Excel) continua visível para ser corrigido. */}
                    {n[c.coluna] && !c.opcoes!.includes(n[c.coluna]) && <option value={n[c.coluna]}>{n[c.coluna]}</option>}
                    {c.opcoes!.map((v) => <option key={v} value={v}>{c.rotulos?.[v] ?? v}</option>)}
                  </select>
                ) : (
                  <input type="text" {...comum} />
                )}
                {erro ? <small id={`${id}-erro`} className={p.erroCampo}>{erro}</small> : c.dica && <small>{c.dica}</small>}
              </div>
            );
          })}
        </div>
        <footer className={p.rodape}>
          {onApagar && <button type="button" data-acao="apagar" onClick={onApagar} disabled={salvando}>Apagar</button>}
          <span className={p.espaco} />
          <button type="button" onClick={onCancelar}>Cancelar</button>
          <button type="submit" data-acao="salvar" disabled={salvando}>Salvar</button>
        </footer>
      </form>
    </div>
  );
}
