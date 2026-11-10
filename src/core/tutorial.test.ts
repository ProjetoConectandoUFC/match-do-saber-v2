import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { jogaveis } from './banco';
import { lerCsv } from './csv';
import { feedbackTutorial, lerTutorial, perfilComoNoticia } from './tutorial';

const arquivo = JSON.parse(readFileSync('conteudo/tutorial.json', 'utf8')) as unknown;
const perfil = {
  id: 'treino-1', nome: 'Morango Influencer', frase: 'Acordei assim!', veredito: 'falsa',
  explicacao: 'Mentira!', tecnica: 'imagem', tema: 'tecnologia',
};

describe('arquivo de perfis do tutorial (AC-15.7, FR-16)', () => {
  it('tem os 4 perfis do rascunho, na ordem sugerida (falso, verdadeiro, falso, verdadeiro), marcado como rascunho', () => {
    const t = lerTutorial(arquivo);
    expect(t.status).toBe('rascunho');
    expect(t.perfis.map((p) => p.nome)).toEqual(['Morango Influencer', 'Professora Abelha', 'Gato Astronauta', 'Dona Chaleira']);
    expect(t.perfis.map((p) => p.veredito)).toEqual(['falsa', 'verdadeira', 'falsa', 'verdadeira']);
  });

  it('AC-15.4: os perfis não estão no banco de notícias nem entram em jogaveis', () => {
    const banco = jogaveis(lerCsv(readFileSync('conteudo/noticias.csv', 'utf8')));
    const ids = new Set(banco.map((n) => n.id));
    for (const p of lerTutorial(arquivo).perfis) expect(ids.has(p.id)).toBe(false);
  });

  it('recusa perfil com campo faltando ou fora das listas, id repetido e status desconhecido', () => {
    expect(() => lerTutorial({ status: 'rascunho', perfis: [{ ...perfil, nome: '' }] })).toThrow(/nome/);
    expect(() => lerTutorial({ status: 'rascunho', perfis: [{ ...perfil, veredito: 'talvez' }] })).toThrow(/veredito/);
    expect(() => lerTutorial({ status: 'rascunho', perfis: [{ ...perfil, tema: 'esporte' }] })).toThrow(/tema/);
    expect(() => lerTutorial({ status: 'rascunho', perfis: [{ ...perfil, tecnica: 'sorte' }] })).toThrow(/tecnica/);
    expect(() => lerTutorial({ status: 'rascunho', perfis: [perfil, perfil] })).toThrow(/repetido/);
    expect(() => lerTutorial({ status: 'publicado', perfis: [perfil] })).toThrow(/status/);
    expect(() => lerTutorial(null)).toThrow();
    expect(lerTutorial({ status: 'aprovado', perfis: [perfil] }).perfis).toHaveLength(1);
  });

  it('o card de treino usa o nome como título, a frase como descrição e a ilustração do tema (sem imagem)', () => {
    const n = perfilComoNoticia(lerTutorial({ status: 'rascunho', perfis: [perfil] }).perfis[0]!);
    expect(n).toMatchObject({ id: 'treino-1', titulo: 'Morango Influencer', descricao: 'Acordei assim!', veredito: 'falsa', tema: 'tecnologia', tecnica: 'imagem' });
    expect(n.imagem).toBeUndefined();
  });
});

describe('feedbackTutorial: ensina o gesto (AC-15.3)', () => {
  it('modo Corpo, acertou "Mentira"', () => {
    expect(feedbackTutorial('corpo', 'falsa', 'falsa')).toEqual({
      acertou: true,
      selo: 'Acertou!',
      escolha: 'Você foi para a esquerda com o corpo: escolheu Mentira.',
      certo: 'Era Mentira: corpo para a esquerda.',
    });
  });

  it('modo Corpo, errou: diz o gesto que levaria à resposta certa', () => {
    expect(feedbackTutorial('corpo', 'verdadeira', 'falsa')).toEqual({
      acertou: false,
      selo: 'Quase!',
      escolha: 'Você foi para a direita com o corpo: escolheu Verdade.',
      certo: 'Era Mentira: corpo para a esquerda.',
    });
  });

  it('modos Mão e Cabeça usam o gesto do modo', () => {
    expect(feedbackTutorial('mao', 'verdadeira', 'verdadeira').escolha)
      .toBe('Você arrastou a mão para a direita: escolheu Verdade.');
    expect(feedbackTutorial('mao', 'verdadeira', 'falsa').certo).toBe('Era Mentira: arraste a mão para a esquerda.');
    expect(feedbackTutorial('cabeca', 'falsa', 'falsa').escolha).toBe('Você inclinou a cabeça para a esquerda: escolheu Mentira.');
    expect(feedbackTutorial('cabeca', 'verdadeira', 'falsa').certo).toBe('Era Mentira: cabeça para a esquerda.');
  });
});
