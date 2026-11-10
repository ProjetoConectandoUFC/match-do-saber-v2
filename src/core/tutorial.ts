/**
 * Modo tutorial (FR-16, v10.2.0, a confirmar pelo responsável): perfis de treino lidos de
 * `conteudo/tutorial.json`, separado do banco de notícias, e os textos que ensinam o gesto.
 */
import type { ModoJogo } from './modos';
import {
  TECNICAS, TEMAS, VEREDITOS, type Noticia, type Tecnica, type Tema, type Veredito,
} from './types';

export interface PerfilTutorial {
  id: string;
  nome: string;
  frase: string;
  veredito: Veredito;
  explicacao: string;
  tecnica: Tecnica;
  tema: Tema;
  /** Desenho próprio do perfil, estilo "recorte chapado" (v11.0.0, AC-15.7); sem ele, a ilustração do tema. */
  ilustracao?: IlustracaoPerfil;
}

/** Desenhos de perfil da prévia v11 (`docs/visual/estilo-imagens/`). */
export const ILUSTRACOES_PERFIL = ['perfil-falso-abacaxi', 'perfil-verdadeiro-caju'] as const;
export type IlustracaoPerfil = (typeof ILUSTRACOES_PERFIL)[number];

export interface ArquivoTutorial { status: 'rascunho' | 'aprovado'; perfis: PerfilTutorial[] }

const TEXTOS = ['id', 'nome', 'frase', 'explicacao'] as const;
const LISTAS = { veredito: VEREDITOS, tecnica: TECNICAS, tema: TEMAS } as const;

/** Valida o arquivo de perfis (AC-15.7). Lança erro com o motivo; o jogo segue sem tutorial nesse caso. */
export function lerTutorial(dados: unknown): ArquivoTutorial {
  if (!dados || typeof dados !== 'object') throw new Error('arquivo do tutorial vazio ou ilegível');
  const { status, perfis } = dados as { status?: unknown; perfis?: unknown };
  if (status !== 'rascunho' && status !== 'aprovado') throw new Error('status do tutorial: use rascunho ou aprovado');
  if (!Array.isArray(perfis) || perfis.length === 0) throw new Error('o tutorial precisa de perfis');
  const vistos = new Set<string>();
  const lidos = perfis.map((p: Record<string, unknown>, i) => {
    for (const c of TEXTOS) {
      if (typeof p?.[c] !== 'string' || !(p[c] as string).trim()) throw new Error(`perfil ${i + 1}: ${c} obrigatório`);
    }
    for (const [c, valores] of Object.entries(LISTAS)) {
      if (!(valores as readonly string[]).includes(p[c] as string)) throw new Error(`perfil ${i + 1}: ${c} fora da lista`);
    }
    if (vistos.has(p.id as string)) throw new Error(`perfil ${i + 1}: id repetido`);
    vistos.add(p.id as string);
    if (p.ilustracao !== undefined && !(ILUSTRACOES_PERFIL as readonly unknown[]).includes(p.ilustracao)) {
      throw new Error(`perfil ${i + 1}: ilustracao fora da lista`);
    }
    const lido = {
      id: p.id, nome: p.nome, frase: p.frase, veredito: p.veredito, explicacao: p.explicacao, tecnica: p.tecnica, tema: p.tema,
    } as PerfilTutorial;
    if (p.ilustracao) lido.ilustracao = p.ilustracao as IlustracaoPerfil;
    return lido;
  });
  return { status, perfis: lidos };
}

/** O card de treino usa a mesma tela do card (FR-4): nome no título, frase na descrição, ilustração do tema. */
export function perfilComoNoticia(p: PerfilTutorial): Noticia {
  return {
    id: p.id, titulo: p.nome, descricao: p.frase, saibaMais: '', tema: p.tema, veredito: p.veredito,
    explicacao: p.explicacao, tecnica: p.tecnica, fonteUrl: '',
  };
}

const lado = (v: Veredito) => (v === 'verdadeira' ? 'direita' : 'esquerda');
const rotulo = (v: Veredito) => (v === 'verdadeira' ? 'Verdade' : 'Mentira');

/** v10.3.0: um único controle por modo (AC-2.10): tronco, swipe da mão ou inclinação da cabeça. */
const FEITO: Record<ModoJogo, (l: string) => string> = {
  corpo: (l) => `Você foi para a ${l} com o corpo`,
  mao: (l) => `Você arrastou a mão para a ${l}`,
  cabeca: (l) => `Você inclinou a cabeça para a ${l}`,
};
const COMO: Record<ModoJogo, (l: string) => string> = {
  corpo: (l) => `corpo para a ${l}`,
  mao: (l) => `arraste a mão para a ${l}`,
  cabeca: (l) => `cabeça para a ${l}`,
};

export interface TextoFeedbackTutorial { acertou: boolean; selo: string; escolha: string; certo: string }

/** Feedback didático do treino (AC-15.3): o que o jogador fez e qual gesto leva à resposta certa. */
export function feedbackTutorial(modo: ModoJogo, resposta: Veredito, veredito: Veredito): TextoFeedbackTutorial {
  const acertou = resposta === veredito;
  return {
    acertou,
    selo: acertou ? 'Acertou!' : 'Quase!',
    escolha: `${FEITO[modo](lado(resposta))}: escolheu ${rotulo(resposta)}.`,
    certo: `Era ${rotulo(veredito)}: ${COMO[modo](lado(veredito))}.`,
  };
}
