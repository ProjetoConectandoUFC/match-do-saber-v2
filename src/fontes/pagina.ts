/**
 * Página das fontes da rodada (AC-5.10, v11.0.0): aberta no celular pelo QR do resumo. Lê o banco embutido da
 * versão web, mostra só os ids pedidos depois do `#` e só notícias jogáveis (AC-7.7). Tudo como texto (nada de
 * HTML vindo do banco); os links abrem em outra aba sem repassar a origem. Não guarda nada.
 */
import { jogaveis } from '../core/banco';
import { lerCsv } from '../core/csv';
import { decodificarIds, itensDaPagina, type ItemPagina } from '../core/fontesRodada';
import s from './fontes.module.css';

function el<K extends keyof HTMLElementTagNameMap>(tag: K, classe?: string, texto?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (classe) e.className = classe;
  if (texto !== undefined) e.textContent = texto;
  return e;
}

function aviso(raiz: HTMLElement, texto: string) {
  raiz.replaceChildren(el('p', s.aviso, texto));
}

export function desenharPagina(raiz: HTMLElement, itens: readonly ItemPagina[]) {
  if (itens.length === 0) {
    aviso(raiz, 'Escaneie o QR code no fim de uma partida do Match do Saber para ver aqui as fontes das notícias da sua rodada.');
    return;
  }
  const lista = el('ol', s.lista);
  for (const item of itens) {
    const li = el('li', s.item);
    li.dataset.id = item.id;
    if (!item.encontrada) {
      li.append(el('p', s.naoEncontrada, 'Notícia não encontrada nesta versão do jogo'));
      lista.append(li);
      continue;
    }
    const verdade = item.veredito === 'verdadeira';
    li.append(el('span', `${s.veredito} ${verdade ? s.verdade : s.mentira}`, verdade ? 'Verdade' : 'Mentira'));
    li.append(el('h2', s.titulo, item.titulo));
    const fontes = el('p', s.fontes, `${item.rotuloFonte} `);
    item.links.forEach((l, i) => {
      if (i > 0) fontes.append(' · ');
      const a = el('a', undefined, l.nome);
      a.href = l.url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      fontes.append(a);
    });
    li.append(fontes);
    lista.append(li);
  }
  raiz.replaceChildren(lista);
}

/** `ler`: busca o texto do banco embutido (no navegador, `fetch`); `base`: `import.meta.env.BASE_URL`. */
export async function carregarPagina(raiz: HTMLElement, fragmento: string, ler: (url: string) => Promise<string>, base: string) {
  const ids = decodificarIds(fragmento);
  if (ids.length === 0) {
    desenharPagina(raiz, []);
    return;
  }
  try {
    const banco = lerCsv(await ler(`${base}content/noticias.csv`));
    desenharPagina(raiz, itensDaPagina(jogaveis(banco), ids));
  } catch {
    aviso(raiz, 'Não foi possível carregar as notícias. Confira a internet e tente de novo.');
  }
}
