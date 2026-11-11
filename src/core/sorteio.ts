import type { Dificuldade, Noticia } from './types';

function embaralhar<T>(itens: T[], rng: () => number): T[] {
  const a = [...itens];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

/**
 * AC-6.1 a AC-6.5: `total` cards (M, configurável na v12.0.0), metade verdadeiros, completando com o outro lado.
 * Com `nivel` (v12.0.0), dentro de cada lado as notícias daquele nível vêm antes das outras; o restante só completa.
 */
export function sortear(noticias: Noticia[], rng: () => number, total = 10, nivel: Dificuldade | 'todos' = 'todos'): Noticia[] {
  const lado = (veredito: Noticia['veredito']) => {
    const todas = embaralhar(noticias.filter((x) => x.veredito === veredito), rng);
    if (nivel === 'todos') return todas;
    return [...todas.filter((x) => x.dificuldade === nivel), ...todas.filter((x) => x.dificuldade !== nivel)];
  };
  const v = lado('verdadeira');
  const f = lado('falsa');
  const metade = Math.floor(total / 2);
  let nv = Math.min(v.length, metade);
  let nf = Math.min(f.length, total - metade);
  let falta = total - nv - nf;
  const extraV = Math.min(falta, v.length - nv);
  nv += extraV;
  falta -= extraV;
  nf += Math.min(falta, f.length - nf);
  return embaralhar([...v.slice(0, nv), ...f.slice(0, nf)], rng);
}
