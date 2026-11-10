// Banco de teste dos E2E (v9.0.0): grava public/content/noticias.csv e as imagens.
// 12 notícias aprovadas, 6 verdadeiras e 6 falsas alternadas (só as ímpares com imagem; as pares mostram
// a ilustração do tema), com dificuldade fácil/médio/difícil em rodízio (v10.1.0), mais uma em rascunho
// e uma inválida, que não entram nas partidas (AC-7.7, AC-8.4).
import { mkdir, rm, writeFile } from 'node:fs/promises';
import sharp from 'sharp';
import { escreverCsv } from '../src/core/csv';
import { DIFICULDADES, TEMAS, TECNICAS, type NoticiaBanco } from '../src/core/types';

const destino = 'public/content';
const cores = ['#e63946', '#457b9d', '#2a9d8f', '#f4a261'];

await rm(destino, { recursive: true, force: true });
await mkdir(`${destino}/img`, { recursive: true });

const noticia = (i: number, extra: Partial<NoticiaBanco> = {}): NoticiaBanco => ({
  id: `teste-${i + 1}`,
  titulo: `Notícia de teste ${i + 1}: manchete bombástica que você precisa ver`,
  descricao: 'Descrição curta de teste para o card, com até duas linhas de texto.',
  saiba_mais: 'Texto expandido de teste. '.repeat(8).trim(),
  veredito: i % 2 === 0 ? 'verdadeira' : 'falsa',
  explicacao: `Explicação de teste ${i + 1}.`,
  tecnica: TECNICAS[i % 4]!,
  tema: TEMAS[i % TEMAS.length]!,
  fonte_url: 'https://exemplo.org/fonte',
  fontes_extras: '',
  imagem: i % 2 === 0 ? `content/img/teste-${i + 1}.webp` : '',
  revisado_por: 'Equipe de teste',
  status: 'aprovada',
  dificuldade: DIFICULDADES[i % DIFICULDADES.length]!, // v10.1.0 (AC-7.10)
  ...extra,
});

const banco = Array.from({ length: 12 }, (_, i) => noticia(i));
for (const n of banco.filter((x) => x.imagem)) {
  const i = Number(n.id.split('-')[1]) - 1;
  await sharp({ create: { width: 800, height: 600, channels: 3, background: cores[i % 4]! } })
    .webp({ quality: 75 })
    .toFile(`public/${n.imagem}`);
}
banco.push(
  noticia(12, { id: 'rascunho-1', status: 'rascunho', revisado_por: '', dificuldade: '', titulo: 'Rascunho que não entra na partida' }),
  noticia(13, { id: 'invalida-1', tema: 'esporte', titulo: 'Linha inválida que não entra na partida' }),
);

await writeFile(`${destino}/noticias.csv`, escreverCsv(banco));
console.log(`Fixture: ${banco.length} linhas (12 aprovadas, 6 com imagem) em ${destino}/noticias.csv`);
