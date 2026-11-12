#!/usr/bin/env node
/**
 * Rotina diária (sem IA): audita o origin/main, corrige o que é mecânico e escreve o relatório.
 *
 * Isolamento — nada aqui toca o seu working tree:
 *  - trabalha num worktree temporário do origin/main;
 *  - correções vão para uma branch LOCAL `autofix/auto-AAAA-MM-DD` (nunca push, nunca main);
 *  - os scripts vêm de uma cópia estável em ~/.local/share/fast-gravacoes-rotina (não do repo),
 *    então trocar de branch no repo não quebra o timer.
 *
 * Saída: ~/relatorios/fast-gravacoes-v2/ULTIMO.md (+ uma pasta por dia, retém 30).
 */
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { availableParallelism, homedir, loadavg, cpus } from 'node:os';
import { join, resolve } from 'node:path';

const HOME = process.env.FG_HOME || homedir();
const REPO = resolve(process.env.FG_REPO || join(HOME, 'projetos/Fast_Gravacoes_V2'));
const STORE = join(HOME, '.local/share/fast-gravacoes-rotina');
// ROTINA_SCRIPTS permite testar com os scripts do repo, sem instalar nada (ex.: ROTINA_SCRIPTS=$PWD/scripts)
const SCRIPTS = process.env.ROTINA_SCRIPTS || join(STORE, 'scripts');
const REPORTS = join(HOME, 'relatorios/fast-gravacoes-v2');
const WT = join(HOME, '.cache/fast-gravacoes-rotina/wt');
// data LOCAL (sv-SE = AAAA-MM-DD): em UTC, uma rodada de recuperação após 21h gerava a branch com a data de amanhã (QA 11/11)
const HOJE = new Date().toLocaleDateString('sv-SE');
const DIA = join(REPORTS, HOJE);
const NODE = process.execPath;

const run = (cmd, a, o = {}) => spawnSync(cmd, a, { encoding: 'utf8', maxBuffer: 1 << 28, ...o });
// Hooks do repositório nunca rodam aqui (worktree add/commit disparariam testes/grafo da automação local).
const NO_HOOKS = { GIT_CONFIG_COUNT: '1', GIT_CONFIG_KEY_0: 'core.hooksPath', GIT_CONFIG_VALUE_0: '/dev/null' };
const git = (...a) => run('git', ['-c', 'core.hooksPath=/dev/null', '-C', REPO, ...a]);
const out = [];
const nota = (m) => { console.log(`[rotina] ${m}`); out.push(m); };

mkdirSync(DIA, { recursive: true });

function finalizar(md, codigo = 0) {
  writeFileSync(join(DIA, 'RELATORIO.md'), md);
  writeFileSync(join(REPORTS, 'ULTIMO.md'), md);
  // retenção: 30 dias
  const dias = readdirSync(REPORTS).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort();
  for (const d of dias.slice(0, Math.max(0, dias.length - 30))) rmSync(join(REPORTS, d), { recursive: true, force: true });
  process.exit(codigo);
}

// ---------- 0. não competir com o resto da máquina (o WSL já travou por memória) ----------
const memLivreGB = Number(/MemAvailable:\s+(\d+)/.exec(readFileSync('/proc/meminfo', 'utf8'))?.[1] || 0) / 1048576;
// Limite de carga proporcional aos núcleos (antes: 6 fixos numa máquina de 24 núcleos => pulava à toa).
// valores inválidos/negativos caem no padrão (antes: 'abc' desligava a proteção de memória; '-1' pulava sempre)
const num = (v, padrao) => { const n = Number(v); return Number.isFinite(n) && n > 0 ? n : padrao; };
const MAX_CARGA = num(process.env.FG_MAX_LOAD, (cpus().length || availableParallelism()));
const MIN_MEM_GB = num(process.env.FG_MIN_MEM_GB, 3);
if (loadavg()[0] > MAX_CARGA || memLivreGB < MIN_MEM_GB) {
  finalizar(`# Rotina ${HOJE}\n\nPULADA: máquina ocupada (carga ${loadavg()[0].toFixed(1)}, ${memLivreGB.toFixed(1)} GB livres). Roda amanhã.\n`, 0);
}

// ---------- 1. atualiza e prepara o worktree do origin/main ----------
const fetch = git('fetch', 'origin', 'main', '--quiet');
if (fetch.status !== 0) nota(`fetch falhou (${(fetch.stderr || '').trim().slice(0, 120)}); usando a última cópia local de origin/main`);
const sha = git('rev-parse', '--short', 'origin/main').stdout.trim();
if (!sha) finalizar(`# Rotina ${HOJE}\n\nFALHOU: origin/main não existe neste clone.\n`, 1);

git('worktree', 'remove', '--force', WT);
rmSync(WT, { recursive: true, force: true });
git('worktree', 'prune');
mkdirSync(join(WT, '..'), { recursive: true });
const add = git('worktree', 'add', '--detach', WT, 'origin/main');
if (add.status !== 0) finalizar(`# Rotina ${HOJE}\n\nFALHOU ao criar worktree: ${add.stderr}\n`, 1);

symlinkSync(join(REPO, 'node_modules'), join(WT, 'node_modules'));
const lockHash = (d) => (existsSync(join(d, 'package-lock.json')) ? createHash('sha1').update(readFileSync(join(d, 'package-lock.json'))).digest('hex') : '');
// O que importa é o que ESTÁ instalado em node_modules (lockfile oculto do npm), não o lockfile do checkout principal,
// que pode estar em outra branch. Sem lockfile oculto, mantém a comparação antiga (mais conservadora).
function dependenciasCompativeis() {
  const oculto = join(REPO, 'node_modules/.package-lock.json'), base = join(WT, 'package-lock.json');
  if (!existsSync(oculto) || !existsSync(base)) return lockHash(REPO) === lockHash(WT);
  try {
    const inst = JSON.parse(readFileSync(oculto, 'utf8')).packages || {}, esp = JSON.parse(readFileSync(base, 'utf8')).packages || {};
    for (const [k, v] of Object.entries(esp)) {
      if (!k || v.link) continue;
      if (!inst[k]) { if (v.optional || v.devOptional && v.optional) continue; return false; }
      if (inst[k].version !== v.version) return false;
    }
    for (const [k, v] of Object.entries(inst)) if (k && !v.link && !esp[k]) return false;
    return true;
  } catch { return false; }
}
if (!dependenciasCompativeis() ||
    !['typescript/bin/tsc', 'eslint/bin/eslint.js', 'vitest/vitest.mjs'].every((f) => existsSync(join(WT, 'node_modules', f)))) {
  git('worktree', 'remove', '--force', WT);
  finalizar(`# Rotina ${HOJE}\n\nFALHOU: dependências ausentes ou lockfile diferente da base; correção não executada.\n`, 1);
}

for (const d of ['autofix', 'audit']) cpSync(join(SCRIPTS, d), join(WT, 'scripts', d), { recursive: true });

// baseline do audit = achados de ontem (só os NOVOS aparecem)
const anterior = join(REPORTS, 'ULTIMO-findings.json');
const baseFile = join(DIA, 'baseline-ontem.json');
let temBase = false;
if (existsSync(anterior)) {
  const fps = JSON.parse(readFileSync(anterior, 'utf8')).findings.map((f) => f.fp);
  writeFileSync(baseFile, JSON.stringify({ fps }));
  temBase = true;
}

// ---------- 2. auditoria (só leitura) ----------
const env = { ...process.env, ...(temBase ? { AUDIT_BASELINE: baseFile } : {}) };
const au = run(NODE, ['scripts/audit/run.mjs'], { cwd: WT, env });
let codigo = au.status === 0 ? 0 : 1;
if (codigo) nota(`auditoria falhou (exit ${au.status ?? 'indisponível'})`);
const auditResumo = ((au.stdout || '').match(/\[audit\] \d+ achados.*/) || ['(sem resumo)'])[0];
let findings = [];
try {
  const j = JSON.parse(readFileSync(join(WT, '.audit/findings.json'), 'utf8'));
  if (!Array.isArray(j.findings)) throw new Error('findings inválido');
  findings = j.findings;
  mkdirSync(join(DIA, 'audit'), { recursive: true });
  for (const f of ['relatorio.md', 'fila-para-decisao.md', 'findings.json']) cpSync(join(WT, '.audit', f), join(DIA, 'audit', f));
  cpSync(join(WT, '.audit/findings.json'), anterior);
} catch { codigo = 1; nota('audit não gerou findings.json válido'); }

// ---------- 3. correção automática (só se não houver branch automática pendente) ----------
// Branch automática conta como pendente só se ainda traz mudança para a main: merge por squash não aparece em
// --merged, então a prova é o merge-tree (aplicar a branch sobre a main não muda nada => já integrada).
// Branch com mais de 14 dias deixa de travar a rotina (fica guardada, só não bloqueia).
const arvoreMain = git('rev-parse', 'origin/main^{tree}').stdout.trim();
const pendentes = git('for-each-ref', '--format=%(refname:short) %(committerdate:unix)', 'refs/heads/autofix/auto-*').stdout.split('\n').filter(Boolean)
  .map((l) => l.split(' ')).filter(([b, quando]) => {
    if (git('merge-base', '--is-ancestor', b, 'origin/main').status === 0) return false;
    const m = git('merge-tree', '--write-tree', 'origin/main', b);
    if (m.status === 0 && m.stdout.split('\n')[0].trim() === arvoreMain) return false;
    // integrada por squash e depois alterada na main (merge-tree conflita): `git cherry` marca com '-' os commits
    // cujo patch já está na main
    const cherry = git('cherry', 'origin/main', b).stdout.split('\n').filter(Boolean);
    if (cherry.length && cherry.every((l) => l.startsWith('-'))) return false;
    if (Date.now() / 1000 - Number(quando) > 14 * 86400) { nota(`branch automática antiga ignorada (mais de 14 dias): ${b}`); return false; }
    return true;
  }).map(([b]) => b);
let autofixResumo;
if (codigo) {
  autofixResumo = 'NÃO executado: auditoria falhou; corrija a ferramenta antes de aplicar alterações.';
} else if (pendentes.length) {
  autofixResumo = `NÃO aplicado: já existe branch automática sem merge (${pendentes.join(', ')}). Revise/mescle ou apague para a rotina voltar a corrigir.`;
} else {
  const fx = run(NODE, ['scripts/autofix/run.mjs', '--apply', '--commit', '--tests', '--only=unused'], {
    cwd: WT, env: { ...process.env, ...NO_HOOKS, AUTOFIX_BRANCH: `autofix/auto-${HOJE}` },
  });
  let rel = null;
  try { rel = JSON.parse(readFileSync(join(WT, '.autofix/relatorio.json'), 'utf8')); } catch { /* sem relatório */ }
  if (rel) {
    mkdirSync(join(DIA, 'autofix'), { recursive: true });
    for (const f of ['relatorio.md', 'relatorio.json']) cpSync(join(WT, '.autofix', f), join(DIA, 'autofix', f));
    const r = rel.resultados[0] || {};
    const branch = git('branch', '--list', `autofix/auto-${HOJE}`).stdout.trim() ? `autofix/auto-${HOJE}` : null;
    autofixResumo = branch
      ? `**${r.arquivosMantidos ?? 0} arquivo(s) corrigidos** na branch local \`${branch}\` (${(r.arquivosRevertidos || []).length} revertidos pelo gate). Testes: ${rel.testes?.resumo ?? 'não medidos'}. Fila manual: ${r.manual?.length ?? 0}.`
      : `Nada a corrigir automaticamente. Fila manual: ${r.manual?.length ?? 0}.`;
    if (fx.status !== 0 || rel.ok !== true) {
      codigo = 1;
      autofixResumo = `FALHOU: ${rel.erro || 'gate/testes recusaram a correção'}; nenhuma correção aceita.`;
    }
  } else {
    codigo = 1;
    autofixResumo = `FALHOU/abortou (exit ${fx.status}): ${(fx.stderr || fx.stdout).split('\n').filter(Boolean).slice(-3).join(' | ').slice(0, 300)}`;
  }
}

// ---------- 4. limpeza e relatório ----------
git('worktree', 'remove', '--force', WT);
git('worktree', 'prune');

const sev = (s) => findings.filter((f) => f.sev === s).length;
const md = [
  `# Rotina diária — ${HOJE}`, '',
  `Base analisada: \`origin/main\` @ ${sha} (nada do seu working tree foi tocado).`, '',
  '## Auditoria', `- ${auditResumo}`,
  `- crítica ${sev('critica')} · alta ${sev('alta')} · média ${sev('media')} · baixa ${sev('baixa')}`,
  temBase ? '- comparado com o dia anterior (só o que é novo aparece em `audit/relatorio.md`)' : '- primeiro dia: sem comparação',
  `- Fila de decisão (crítico/alto): \`${join(DIA, 'audit/fila-para-decisao.md')}\``, '',
  '## Correção automática', `- ${autofixResumo}`,
  ...(out.length ? ['', '## Avisos', ...out.map((o) => `- ${o}`)] : []), '',
  'Para revisar e aceitar uma branch automática: `git -C ~/projetos/Fast_Gravacoes_V2 diff origin/main...autofix/auto-AAAA-MM-DD` e abrir PR. Nada é enviado ao GitHub sozinho.', '',
].join('\n');
finalizar(md, codigo);
