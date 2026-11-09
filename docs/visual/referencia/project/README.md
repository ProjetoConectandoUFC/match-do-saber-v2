# Conectando — Design System

Sistema visual dos produtos digitais do **Conectando · Ciências, Tecnologias e Artes**, projeto de extensão da Universidade Federal do Ceará executado pelo Instituto UFC Virtual, com gestão da Fundação Cetrede e financiamento do MCTI (TED nº 47/2025). O projeto oferece formações online gratuitas com certificação, oficinas nos territórios, festivais, gincanas, feiras e concurso de redação.

## Fontes
- `uploads/conectando (1).html` — portal institucional (home). Origina o **Tema Claro**.
- `uploads/ia-e-conteudo-real.html` — página da Formação 01 "IA e Conteúdo Real". Origina o **Tema Sóbrio**.
Os tokens foram copiados do `:root` desses arquivos (cores "amostradas do PDF" original).

## Dois temas
| | Claro (`:root`) | Sóbrio (`[data-tema="sobrio"]`) |
|---|---|---|
| Uso | Portal, páginas institucionais | Páginas de formação/curso, conteúdo denso |
| Hero | Azul #0075c5 | Noite #002036 |
| Página | Creme #fcfaf1 (trama de pontos nas formações) | Marinho #032942 → Grafite azul #19262e |
| Texto | Tinta #0c0b0a | Creme #fcfaf1 |
| Kicker | Grafite, 300, caixa-alta | Amarelo (ou celeste), 500, caixa normal |
| Foco | Contorno coral 3px | Contorno amarelo 3px |
O rodapé é **sempre azul** nos dois temas; a fita amarela e o botão coral também são comuns.

## CONTENT FUNDAMENTALS
- **Língua**: português do Brasil, informal e próximo. Trata o leitor por **você** ("Você aprende a…", "é para você que…"); o projeto fala como **a gente** ("O que a gente faz", "Onde a gente já esteve").
- **Tom**: entusiasmado mas concreto; frases curtas, verbos de ação. Exclamação em títulos de habilidades ("Criar imagens únicas!", "Compor o som!") e no hero ("…para todos!").
- **Caixa**: frase (só a primeira maiúscula) em títulos e botões. Caixa-alta apenas em kickers do tema claro e na meta ("FORMAÇÃO 01 · 64 HORAS · 3 MÓDULOS").
- **Separadores**: ponto médio " · " para metadados; barra vertical " | " para carga horária/professor e migalha ("20h | Paulo Filho", "Home | IA e Conteúdo Real").
- **Títulos em duas partes**: afirmação + destaque colorido ("A ferramenta é nova. *O olhar continua sendo seu.*"; "*Três cursos,* um percurso").
- **Números concretos**: "64 horas", "3 cursos", "1 certificado por curso", "100% online", "Gratuito".
- Citação em itálico com aspas curvas “ ”. **Sem emoji.**
- CTAs: "Conhecer as formações", "Acesse nossa plataforma", "Inscrever-se no curso", "Ver página do curso", "Em breve".

## VISUAL FOUNDATIONS
- **Tipografia**: só **Poppins** (300–900). Display 900 no portal; 700 no título de curso; H2 800; corpo 400–500. Tudo fluido com `clamp()` (ver `--fs-*` em `components/bundle.css`). Palavras-chave dos títulos ganham **amarelo** (#fde31f) sobre fundos azuis/escuros, ou **celeste** (#62bfff) no tema sóbrio.
- **Cor**: blocos chapados de cor plena, sem gradientes. Coral #e34a39 é reservado a ações. Cores de ilustração (vermelho, rosa, laranja, teal, azul médio, roxo) também identificam pessoas (rosa/turquesa/céu nos professores).
- **Fundos**: cores sólidas por seção, separadas por **ondas** (SVG largura total) — a onda do rodapé traz um par de mãos se encontrando, motivo da "conexão". Seção de formações usa **trama de pontos** (radial 1.1px a cada 12px, oliva 16%). Formas decorativas grandes (E, arco, explosões, anéis 20% branco) ficam nos cantos, atrás do conteúdo.
- **Fita amarela**: faixa recortada irregular com sombra chapada (10px 12px 0) contendo 3–4 destaques separados por fios de 2px. No mobile vira retângulo arredondado 16px.
- **Sombras**: sempre **chapadas, sem desfoque** (FAQ: 16px 16px 0 teal). Exceção: moldura de foto do tema sóbrio (sombra suave 0 8px 24px).
- **Bordas**: 2px sólidas (botões ghost, FAQ azul); **tracejadas** 1.5–2px como linha de base das ilustrações e separadores de listas.
- **Raios**: pílula 999px em botões e chips; 24px em fotos; 16px em cartões de FAQ; círculo em avatares e números.
- **Cartões**: quase não há "cards" — conteúdo aberto sobre o fundo. Os únicos contêineres são FAQ (creme + borda azul + sombra teal) e a moldura branca girada (−1.4° / −1°) com folha deslocada atrás.
- **Layout**: container 1400px + gutter clamp(20px,4vw,64px). Grades 2 colunas (texto/ilustração, alternando lado) e 3 colunas centralizadas (ações, habilidades, professores). Títulos de seção centralizados. Nada fixo/sticky.
- **Movimento**: discreto. Botões sobem 2px no hover (.2s); links do menu ganham sublinhado amarelo de 3px que cresce da esquerda (.25s); sinal +/− do FAQ gira. `prefers-reduced-motion` desliga transições.
- **Hover/press**: coral escurece (#c63b2b); ghost-light inverte para fundo branco; ícones sociais ganham círculo branco 15%. Sem estado de press dedicado.
- **Transparência**: só em texturas (hero sóbrio 55%) e formas decorativas (20%). Sem blur.
- **Imagens**: fotos reais na galeria (cantos 24px, legenda em pílula creme) e recortes de professores sobre círculo colorido.

### Ilustrações (organização, não conteúdo)
As ilustrações autorais **não estão incluídas** a pedido da artista. O sistema registra apenas posição e proporção, via `IllustrationSlot` e os cards do grupo "Ilustrações (layout)":
- Hero do portal: coluna direita 1.15fr, vazando 12% para fora; monocromática (amarelo).
- Formações: 1fr/1fr alternando lados; uma cor por formação.
- Quem somos / Sobre: coluna esquerda, traço preto, vaza −4 a −6%.
- Grades: ilustração pousada sobre linha tracejada, altura clamp(120px,11vw,210px).
- Certificados: faixa larga centralizada 1692/533. Rodapé: faixa inferior em largura total.
Estilo geral observado: chapado, uma cor por peça, formas geométricas recortadas.

## ICONOGRAPHY
- **Não há biblioteca de ícones.** O papel de ícone é feito por **marcadores geométricos chapados** (triângulo, estrela de 4, 5 e 6 pontas) em `assets/icons/marca-*.svg` e no componente `Marker`. Em listas alternam triângulo → estrela-4 → estrela-5; a estrela-6 assina os itens de ação.
- Utilitários: ícone de link externo de traço 2.4px (estilo Lucide) em `link-externo.svg`; redes sociais (Instagram, YouTube, TikTok) chapadas em `assets/icons/`.
- Sem emoji, sem caracteres unicode como ícone. O sinal +/− do FAQ é desenhado com duas barras de 5px.

## Índice
- `styles.css` — ponto de entrada (só `@import`s) → `tokens.css` (gerado de `tokens.json`) e `components/bundle.css` (escala fluida, layout e base)
- `guidelines/` — cards de fundamentos (Cores, Tipografia, Espaçamento) e `ds-loader.js` (carrega componentes direto dos .jsx se o bundle ainda não existir)
- `assets/logo/` — Conectando (barra e assinatura), Fundação Cetrede, Instituto UFC Virtual, UFC
- `assets/icons/` — marcadores, redes sociais, link externo
- `assets/shapes/` — fitas, ondas (claras, sóbrias, rodapé), formas decorativas, anéis, traço
- `components/acoes/` Button · `components/marca/` Marker, IllustrationSlot · `components/conteudo/` SectionHeader (+Highlight), Ribbon, ModuleList, CourseCard, ActionItem, Chip, NumberBadge, FramedImage, CourseSummary, ProfessorCard, FAQItem, Gallery · `components/navegacao/` Topbar, Breadcrumb, Footer
- `ui_kits/portal/` — home (tema claro) · `ui_kits/curso/` — página de formação (tema sóbrio)
- `components/<Nome>/preview.html` e `README.md` — prévia e guia de cada componente, das peças de marca (logos, marcadores, fita, ondas, formas) e do layout das ilustrações
- `assets/notes/SKILL.from-standalone.md`

### Intentional additions
- `IllustrationSlot` — necessário porque as ilustrações não podem ser distribuídas.
- Os componentes foram derivados das seções das duas páginas (não havia biblioteca de componentes na fonte).

## Temas no código
- `tokens.css` declara o tema Claro em `:root` e o Sóbrio em `[data-theme="sobrio"]`.
- O atributo original `data-tema="sobrio"` continua valendo: `components/bundle.css` repete nele os papéis do tema Sóbrio.
- Para um trecho sóbrio dentro de uma página clara, ponha `data-theme="sobrio"` no contêiner e pinte o fundo com `var(--pagina)`.
