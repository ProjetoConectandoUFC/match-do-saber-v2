# Proposta de dificuldade para o lote 1 (mds-0001 a mds-0010)

Proposta do Agente de Notícias, para revisão humana. Não altera o conteúdo das notícias aprovadas; só sugere o valor do novo campo `dificuldade`.

## Critério (o mesmo do lote 2)

- **facil**: o palpite de bom senso acerta. Falsa com absurdo evidente ou verdadeira muito conhecida.
- **medio**: soa estranho, mas é plausível. Precisa de uma pista do card (quem diz, quando, como é a foto) ou de uma informação que nem todo mundo tem.
- **dificil**: o palpite intuitivo tende a errar. Falsa repetida como fato por muita gente, ou verdadeira que parece invenção. Só checando fonte, data ou contexto.

## Proposta

| id | título | veredito | dificuldade | justificativa |
|---|---|---|---|---|
| mds-0001 | Exército da Austrália declarou guerra contra emas e perdeu | verdadeira | medio | Parece piada, mas é uma curiosidade bem difundida na internet; quem já ouviu acerta. |
| mds-0002 | Médico revela: água quente com limão cura o câncer | falsa | facil | Promessa de cura milagrosa com "médico" sem nome completo é o sinal de alerta mais clássico. |
| mds-0003 | Cleópatra viveu mais perto da ida à Lua do que das pirâmides | verdadeira | dificil | Contraria a intuição de "Egito Antigo = uma época só"; só fazendo a conta das datas dá para acertar. |
| mds-0004 | NASA confirma: a Terra vai ficar seis dias no escuro | falsa | facil | Absurdo evidente: o Sol não "apaga" por seis dias e o planeta inteiro não ficaria no escuro. |
| mds-0005 | Foto mostra cachoeira de "lava" descendo montanha nos EUA | verdadeira | medio | A foto parece montagem; exige pensar em luz do pôr do sol ou buscar outras imagens do lugar. |
| mds-0006 | Tubarão é flagrado nadando em rodovia alagada após furacão | falsa | medio | Foto convincente e plausível numa enchente; a pista é ela aparecer em vários desastres diferentes. |
| mds-0007 | Cientistas confirmam: a banana é uma fruta radioativa | verdadeira | medio | Soa alarmista e falso, mas a palavra "potássio" no saiba mais dá pista para quem lembra da química. |
| mds-0008 | Amazônia produz 20% do oxigênio que respiramos no planeta | falsa | dificil | Repetida por celebridades e líderes como fato; só entendendo o contexto ("20% de quê?") dá para acertar. |
| mds-0009 | Médicos brasileiros tratam queimaduras com pele de peixe | verdadeira | medio | Parece invenção, mas é pesquisa brasileira bastante noticiada; nome da universidade ajuda a checar. |
| mds-0010 | Novo recurso do iPhone permite carregar a bateria no micro-ondas | falsa | facil | Colocar celular no micro-ondas é perigoso e todo mundo sabe; absurdo evidente. |

## Contagem e alerta

- facil: 3 (mds-0002, mds-0004, mds-0010), todas **falsas**.
- medio: 5 (mds-0001, mds-0005, mds-0006, mds-0007, mds-0009), 4 V / 1 F.
- dificil: 2 (mds-0003, mds-0008), 1 V / 1 F.

O lote 1 não tem nenhuma verdadeira fácil. Se uma partida sortear só fáceis do lote 1, o jogador pode aprender "fácil = falsa". O lote 2 compensa com 2 verdadeiras fáceis (mds-0011 e mds-0012); somando os dois lotes, fácil fica com 2 V / 5 F. Sugestão para o próximo lote: incluir mais verdadeiras fáceis, ou, se o responsável preferir, rebaixar mds-0009 (pele de tilápia) para fácil, pois é um caso brasileiro muito conhecido.
