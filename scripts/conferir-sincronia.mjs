// Conferência de início de sessão para quem trabalha em dois computadores (docs/operacao.md, "Dois computadores").
// Roda no hook SessionStart do Claude Code (.claude/settings.json) e também à mão: `node scripts/conferir-sincronia.mjs`.
// Só lê: faz `git fetch` (sem mexer em branch nenhuma) e compara. Nunca falha a sessão: qualquer erro vira aviso.
// Saída: JSON do hook (systemMessage para a pessoa, additionalContext para o Claude). Com --texto, só o texto.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { homedir, hostname } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// A raiz do repositório é a pasta acima deste script, de onde quer que o hook o chame.
const raiz = dirname(dirname(fileURLToPath(import.meta.url)));
const git = (...args) => {
  try {
    return execFileSync('git', args, { cwd: raiz, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 20000 }).trim();
  } catch {
    return null;
  }
};

const avisos = [];
const ok = [];

const fetchOk = git('fetch', '--prune', '--quiet') !== null;
if (!fetchOk) avisos.push('Não consegui atualizar do GitHub (sem rede?). Os números abaixo podem estar velhos.');

const branch = git('branch', '--show-current') || '(HEAD solta)';

// Alterações não commitadas.
const sujos = (git('status', '--porcelain') || '').split('\n').filter(Boolean);
if (sujos.length) avisos.push(`${sujos.length} arquivo(s) alterado(s) sem commit em \`${branch}\`.`);

// Stash: trabalho que não vai para o outro computador.
const stashes = (git('stash', 'list') || '').split('\n').filter(Boolean);
if (stashes.length) avisos.push(`${stashes.length} stash(es) guardado(s) só aqui: ${stashes.map((s) => s.split(':')[0]).join(', ')}. Stash não vai pelo git; transforme em commit numa branch e envie.`);

// Cada branch local: à frente / atrás do remoto, ou sem remoto.
const linhas = (git('for-each-ref', '--format=%(refname:short)|%(upstream:short)|%(upstream:track)', 'refs/heads') || '').split('\n').filter(Boolean);
for (const linha of linhas) {
  const [nome, remoto, trilha] = linha.split('|');
  if (!remoto) {
    avisos.push(`Branch \`${nome}\` só existe aqui (nunca enviada). Envie com \`git push -u origin ${nome}\` ou apague se for lixo.`);
    continue;
  }
  if (trilha === '[gone]') {
    avisos.push(`Branch \`${nome}\` foi apagada no GitHub (PR aceito?). Se já foi mesclada: \`git branch -d ${nome}\`.`);
    continue;
  }
  const frente = /ahead (\d+)/.exec(trilha)?.[1];
  const atras = /behind (\d+)/.exec(trilha)?.[1];
  if (frente) avisos.push(`Branch \`${nome}\` tem ${frente} commit(s) não enviado(s). \`git push\`.`);
  if (atras) avisos.push(`Branch \`${nome}\` está ${atras} commit(s) atrás do GitHub (o outro computador mexeu). \`git pull\` antes de trabalhar nela.`);
}

// Windows: pasta aberta com a letra do drive minúscula (`c:\...`, como o VS Code às vezes abre) faz o Vitest carregar
// módulos em dobro e TODOS os testes falham com "Vitest failed to find the current suite" (visto em 2026-11-13).
const pastaSessao = process.env.CLAUDE_PROJECT_DIR || process.cwd();
if (/^[a-z]:/.test(pastaSessao)) avisos.push(`A pasta está aberta como \`${pastaSessao.slice(0, 3)}...\` (drive minúsculo): \`npm test\` falha inteiro assim. Rode os testes com o caminho em maiúscula (PowerShell: \`Set-Location 'C:\\...'\`) ou reabra a pasta pelo caminho \`C:\\...\`.`);

// Dependências: algum pacote do package-lock.json falta ou tem outra versão em node_modules. Compara o conteúdo, não a
// data (um checkout muda a data do arquivo sem mudar as dependências).
const lock = join(raiz, 'package-lock.json');
const instalado = join(raiz, 'node_modules', '.package-lock.json');
if (existsSync(lock)) {
  if (!existsSync(instalado)) avisos.push('Sem `node_modules`: rode `npm ci`.');
  else {
    try {
      const pedidos = JSON.parse(readFileSync(lock, 'utf8')).packages ?? {};
      const tem = JSON.parse(readFileSync(instalado, 'utf8')).packages ?? {};
      const faltam = Object.entries(pedidos)
        .filter(([caminho, p]) => caminho.startsWith('node_modules/') && !p.optional && tem[caminho]?.version !== p.version)
        .map(([caminho]) => caminho.slice('node_modules/'.length));
      if (faltam.length) avisos.push(`Dependências desatualizadas (${faltam.slice(0, 3).join(', ')}${faltam.length > 3 ? ` e mais ${faltam.length - 3}` : ''}): rode \`npm ci\` (foi assim que o QR quebrou em 11/11).`);
    } catch {
      avisos.push('Não consegui comparar o `package-lock.json` com `node_modules`; na dúvida, `npm ci`.');
    }
  }
}

// Banco do app de desktop deste computador (não passa pelo git).
const pastaBanco = process.env.MATCH_DO_SABER_DADOS || join(homedir(), 'Documents', 'Match do Saber');
const banco = join(pastaBanco, 'noticias.csv');
if (existsSync(banco)) {
  const texto = readFileSync(banco, 'utf8');
  if (/^teste-\d/m.test(texto)) avisos.push(`O banco do app de desktop (${banco}) é o de TESTE (ids \`teste-N\`). O app só copia o banco embutido quando o arquivo não existe; troque pelo \`conteudo/noticias.csv\` (guarde o atual em backups/).`);
}

if (!avisos.length) ok.push(`Tudo em dia com o GitHub em \`${branch}\` (${hostname()}).`);

const texto = [`Sincronia entre computadores (${hostname()}, branch \`${branch}\`):`, ...(avisos.length ? avisos.map((a) => `- ${a}`) : ok.map((a) => `- ${a}`))].join('\n');

if (process.argv.includes('--texto')) {
  console.log(texto);
} else {
  const resumo = avisos.length ? `⚠ Sincronia: ${avisos.length} aviso(s) — ${avisos[0]}${avisos.length > 1 ? ' (veja os outros no contexto)' : ''}` : ok[0];
  console.log(JSON.stringify({
    systemMessage: resumo,
    hookSpecificOutput: {
      hookEventName: 'SessionStart',
      additionalContext: `${texto}\n\nRegra do projeto (docs/operacao.md, "Dois computadores"): antes de começar, resolva estes avisos com a pessoa; no fim da sessão, tudo commitado e enviado (nada só local).`,
    },
  }));
}
