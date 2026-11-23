import { useEffect, useRef } from 'react';
import { Forma, type IdForma } from './Forma';
import m from './MenuOperador.module.css';

export type ItemMenu = 'questoes' | 'noticias' | 'ajustes' | 'diagnostico' | 'telaCheia';

/** Cada item tem um marcador do design system no lugar de ícone (FR-15); a dica fica no title. */
const ITENS: { id: ItemMenu; rotulo: string; dica: string; marca: IdForma }[] = [
  { id: 'questoes', rotulo: 'Questões', dica: 'ler e revisar as questões, com gabarito e fontes', marca: 'marca-estrela-5' }, // v12.0.0 (FR-17)
  { id: 'noticias', rotulo: 'Notícias', dica: 'listar, editar e importar', marca: 'marca-triangulo' },
  { id: 'ajustes', rotulo: 'Ajustes', dica: 'tecla M', marca: 'marca-estrela-4' }, // v12.0.0: era "Configurações"
  { id: 'diagnostico', rotulo: 'Diagnóstico', dica: 'liga e desliga o painel de medição', marca: 'marca-estrela-5' },
  { id: 'telaCheia', rotulo: 'Tela cheia', dica: 'F11', marca: 'marca-estrela-6' },
];

/**
 * Menu ☰ do operador (FR-14), só na tela de espera. Esc, clique fora ou escolher um item fecham.
 */
export function MenuOperador({ aberto, diagnosticoLigado = false, onAbrir, onFechar, onEscolher }: {
  aberto: boolean;
  /** AC-12.7 (v10.3.0): o item Diagnóstico mostra e alterna o estado do painel. */
  diagnosticoLigado?: boolean;
  onAbrir: () => void;
  onFechar: () => void;
  onEscolher: (item: ItemMenu) => void;
}) {
  const raiz = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberto) return;
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onFechar(); }
    };
    const clique = (e: MouseEvent) => {
      if (raiz.current && !raiz.current.contains(e.target as Node)) onFechar();
    };
    window.addEventListener('keydown', tecla);
    document.addEventListener('mousedown', clique);
    return () => {
      window.removeEventListener('keydown', tecla);
      document.removeEventListener('mousedown', clique);
    };
  }, [aberto, onFechar]);

  return (
    <div ref={raiz} className={m.raiz} data-menu-operador={aberto ? 'aberto' : 'fechado'}>
      <button
        type="button"
        className={m.botao}
        aria-label="Menu"
        aria-haspopup="menu"
        aria-expanded={aberto}
        title="Menu do operador"
        onClick={(e) => { e.currentTarget.blur(); if (aberto) onFechar(); else onAbrir(); }}
      >
        <i /><i /><i />
      </button>
      {aberto && (
        <div className={m.menu} role="menu" aria-label="Menu do operador">
          {ITENS.map((item) => {
            const alterna = item.id === 'diagnostico';
            return (
              <button
                key={item.id}
                type="button"
                role="menuitem"
                className={m.item}
                data-item={item.id}
                data-ligado={alterna ? String(diagnosticoLigado) : undefined}
                title={item.dica}
                onClick={() => { onFechar(); onEscolher(item.id); }}
              >
                <Forma id={item.marca} largura={18} className={m.marca} />
                <span>{alterna ? `${item.rotulo}: ${diagnosticoLigado ? 'ligado' : 'desligado'}` : item.rotulo}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
