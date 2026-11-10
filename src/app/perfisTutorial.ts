import dados from '../../conteudo/tutorial.json';
import { lerTutorial, type PerfilTutorial } from '../core/tutorial';

/**
 * Perfis do tutorial (FR-16), embutidos no build a partir de `conteudo/tutorial.json` (funciona offline).
 * Arquivo inválido: o jogo segue sem tutorial (AC-15.1), com o motivo no console.
 */
function carregar(): readonly PerfilTutorial[] {
  try {
    return lerTutorial(dados).perfis;
  } catch (e) {
    console.error(e);
    return [];
  }
}

export const PERFIS_TUTORIAL = carregar();
