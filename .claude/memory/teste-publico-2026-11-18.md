---
name: teste-publico-2026-11-18
description: Resultado do teste com público de 18/11 (só Cartas, monitor, app desktop a 15 fps), decisões do responsável em 23/11 e o que falta fazer (performance, movimento por quadris, gestos de braço, juice)
metadata:
  type: project
---

# Teste com público de 18/11 e próximos passos (registrado em 23/11)

## O que aconteceu no teste
- **Não foi A/B:** só a interface **Cartas** foi jogada. Num **monitor**, não na TV planejada.
- Rodou o **app desktop** num notebook **Ryzen médio sem placa de vídeo dedicada**, cravado em **15 fps**. A máquina não está acessível para medir.
- **Formulário:** 15 respostas, com nome e e-mail. É dado pessoal (LGPD, público com menores), então nunca vai para arquivo, commit ou serviço externo; aqui ficam só os agregados.

  | Pergunta | Resultado |
  |---|---|
  | Como foi jogar (1–5) | 4,53 |
  | Interface agradável visualmente (1–5) | 4,87 |
  | O jogo é… (1 muito difícil – 5 muito fácil) | 3,47 |
  | Ajudou a identificar fake news | 8 sim, 5 levemente, 2 não |

  Melhorias pedidas:
  - mais tempo de rodada: 8/15;
  - mais tempo de feedback: 7/15;
  - sensor e movimento: 3, mais 3 comentários;
  - letra maior: 3;
  - mais informação antes de responder: 3;
  - música: 1.

  Comentários:
  - a calibração empurrou para a esquerda sem motivo;
  - pular o feedback;
  - saiba mais valer meio ponto;
  - "mais humilhação pública nos erros";
  - "me contorci… poderia andar";
  - a captura falhou no saiba mais.
- **O formulário não mediu diversão.** A sensação de "não divertido" era opinião do responsável, que pediu para deixar esse tema de lado.

## Decisões e direção do responsável (23/11)
- **Movimento:** a resposta deve vir dos **quadris** (dar um passo), não da inclinação dos ombros. O limiar deve ser constante: medir em larguras de ombro, não em fração da imagem. Plano B quando os quadris não aparecem: voltar aos ombros.
  - Queixa: "vai até certo ponto e precisa mover mais". Causas no código:
    - `limiar 0.12` medido em fração da imagem, que depende da distância;
    - o recentro da v12.1;
    - os 300 ms de permanência com o card já inclinado no máximo.
- **Gestos de braço, cada um uma ação:**
  - braço direito = uma ação;
  - braço esquerdo = outra;
  - os dois = uma terceira.

  Gesto para **iniciar a partida** e para **pular o feedback**; **acessar as fontes sem o operador**. Proposta discutida, ainda não aprovada:

  | Tela | Gesto | Ação |
  |---|---|---|
  | Espera | os dois braços por ~1,5 s | começar (revisita a decisão da v3.0.0 contra passantes) |
  | Card | os dois braços | saiba mais |
  | Feedback | braço direito | próxima |
  | Feedback | braço esquerdo | fontes (QR grande) |
- **Feedback:** um marcador de quando a tela VERDADE/MENTIRA termina (barra de tempo). É a mudança mais pedida e a mais barata.
- **Próxima frente: interface mais "juicy".** Referências:
  - "Juice it or lose it" (Jonasson e Purho);
  - "The art of screenshake" (Nijman);
  - Just Dance.

  Ideias por momento:
  - **Card:**
    - a carta estica para o lado do movimento;
    - o rótulo do lado acende;
    - um anel de permanência enche.
  - **Carimbo:** hit-stop de ~80 ms, overshoot, tremida leve, tinta e um baque.
  - **Acerto:** confete, "+100" que voa para o placar e um som que sobe com a sequência.
  - **Erro:** a carta amassa e soa uma buzina cômica.
  - **Cronômetro:** pulsa no fim.
  - **Espera:** o fan respira e aparece o contorno do corpo de quem chega.
  - **Resumo:** contagem que sobe e estrelas.

  Sugestão: começar por carimbo e resultado, depois o anel. Só `transform`/`opacity`, sem animar sombra, blur ou filtro. O responsável pode pedir uma prévia HTML separada, como `docs/visual/previa.html`, antes da spec.

## Performance: feito em 23/11 e o que falta
- **Feito** na branch `001-performance-rapida` (commit `a90448d`; PR para a develop depois do #14):
  - `ignore-gpu-blocklist` no Electron (`electron/gpu.cjs`);
  - câmera em 640×360;
  - ☰ › Diagnóstico mostra "aceleração" (delegate GPU/CPU e renderizador WebGL, com ⚠ se é software).

  Testes 884/884, `tsc` e build ok. **Ainda não medido** numa máquina fraca nem nos E2E.
- **Falta, o conserto estrutural (precisa de spec):** separar a detecção da tela.
  - Hoje `detectForVideo` roda síncrono dentro do `requestAnimationFrame` (`useJogo.ts`), então tudo (carta, fan, cronômetro, animações) anda no ritmo da detecção.
  - Caminho: Web Worker, ou detecção num ritmo próprio (~10–15 Hz) com a tela livre a 60 fps.
  - Vem **antes do juice**: animação de impacto a 15 fps parece travamento.
- **Outros candidatos:**
  - `numPoses: 3` (custo por quadro; existe por causa do rastreamento de passantes);
  - re-render do App a cada tick.
- **Medir:** abrir `?diagnostico` numa máquina parecida (Ryzen com gráficos integrados) e olhar `aceleração` e `detecção ms`. No Electron, `chrome://gpu` diz se o WebGL é hardware.

## PRs abertos em 23/11 (ordem de aprovação)
1. #14 `001-v13-ab` → develop (v13.2.0).
2. #13 lote 4 (rascunho).
3. PR da `001-performance-rapida`.
4. #15 develop → main (publica a web).

Relacionados: [[experimento-cartas]], expediente `expediente/2026-11-23-desktop-pj0nrku.md`.
