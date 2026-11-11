/**
 * Ilustrações "recorte chapado" da prévia v11 (seção 5), copiadas de `docs/visual/estilo-imagens/` (FR-4, FR-15).
 * As de card ficam ligadas à notícia que ilustram, pelo `id`, e não ao tema inteiro: numa outra notícia do mesmo
 * tema virariam uma pista falsa ("ilustração não é prova"). Os desenhos de perfil vão nos cards de treino do perfil
 * que os indica (AC-15.7), nunca em outro. Arquivos servidos pelo próprio jogo, sem embutir em data URL (`?no-inline`): funcionam offline e entram no precache do PWA.
 */
import type { IlustracaoPerfil } from '../core/tutorial';
import emas from './ilustracoes/card-historia-emas.svg?no-inline';
import banana from './ilustracoes/card-ciencia-banana.svg?no-inline';
import microondas from './ilustracoes/card-tecnologia-microondas.svg?no-inline';
import perfilFalso from './ilustracoes/perfil-falso-abacaxi.svg?no-inline';
import perfilVerdadeiro from './ilustracoes/perfil-verdadeiro-caju.svg?no-inline';

/** 552 × 260, com o miolo na faixa central de 552 × 156 que o card mostra. */
const POR_NOTICIA: Record<string, string> = {
  'mds-0001': emas,
  'mds-0007': banana,
  'mds-0010': microondas,
};

export const ilustracaoDaNoticia = (id: string): string | undefined => POR_NOTICIA[id];

/** 420 × 520: Abacaxi Perfeito (perfil falso) e Seu Caju (perfil verdadeiro), pelo campo `ilustracao` do perfil. */
const POR_PERFIL: Record<IlustracaoPerfil, string> = {
  'perfil-falso-abacaxi': perfilFalso,
  'perfil-verdadeiro-caju': perfilVerdadeiro,
};
export const ilustracaoDoPerfil = (id: IlustracaoPerfil): string => POR_PERFIL[id];
