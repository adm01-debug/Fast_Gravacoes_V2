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
import { execFileSync, spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { homedir, loadavg } from 'node:os';
import { join } from 'node:path';

const HOME = homedir();
// o instalador grava o caminho real do clone em FG_REPO (serviço systemd); o default só vale para o caminho padrão
const REPO = process.env.FG_REPO || join(HOME, 'projetos/Fast_Gravacoes_V2');
const STORE = join(HOME, '.local/share/fast-gravacoes-rotina');
// ROTINA_SCRIPTS permite testar com os scripts do repo, sem instalar nada (ex.: ROTINA_SCRIPTS=$PWD/scripts)
const SCRIPTS = process.env.ROTINA_SCRIPTS || join(STORE, 'scripts');
const REPORTS = join(HOME, 'relatorios/fast-gravacoes-v2');
const WT = join(HOME, '.cache/fast-gravacoes-rotina/wt');
const HOJE = new Date().toISOString().slice(0, 10);
const DIA = join(REPORTS, HOJE);
const NODE = process.execPath;

const run = (cmd, a, o = {}) => spawnSync(cmd, a, { encoding: 'utf8', maxBuffer: 1 << 28, ...o });
const git = (...a) => run('git', ['-C', REPO, ...a]);
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
if (loadavg()[0] > 6 || memLivreGB < 3) {
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
if (lockHash(REPO) !== lockHash(WT)) nota('AVISO: package-lock do origin/main difere do clone local; node_modules pode estar defasado (rode npm ci no clone).');

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
const auditResumo = (au.stdout.match(/\[audit\] \d+ achados.*/) || ['(sem resumo)'])[0];
let findings = [];
try {
  const j = JSON.parse(readFileSync(join(WT, '.audit/findings.json'), 'utf8'));
  findings = j.findings;
  mkdirSync(join(DIA, 'audit'), { recursive: true });
  for (const f of ['relatorio.md', 'fila-para-decisao.md', 'findings.json']) cpSync(join(WT, '.audit', f), join(DIA, 'audit', f));
  cpSync(join(WT, '.audit/findings.json'), anterior);
} catch { nota('audit não gerou findings.json'); }

// ---------- 3. correção automática (só se não houver branch automática pendente) ----------
const pendentes = git('branch', '--list', 'autofix/auto-*', '--no-merged', 'origin/main').stdout.split('\n').map((s) => s.replace(/^[*+\s]+/, '')).filter(Boolean);
let autofixResumo;
if (pendentes.length) {
  autofixResumo = `NÃO aplicado: já existe branch automática sem merge (${pendentes.join(', ')}). Revise/mescle ou apague para a rotina voltar a corrigir.`;
} else {
  const fx = run(NODE, ['scripts/autofix/run.mjs', '--apply', '--commit', '--tests', '--only=unused'], {
    cwd: WT, env: { ...process.env, AUTOFIX_BRANCH: `autofix/auto-${HOJE}` },
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
    if (fx.status === 1) autofixResumo += ' ⚠ gate/testes acusaram falha — branch pode ter sido descartada.';
  } else {
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
finalizar(md, 0);
