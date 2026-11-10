#!/usr/bin/env node
/**
 * Derivado do motor local e11bc583/f331b977: correções determinísticas, sem IA.
 * Simula por padrão; --apply valida tudo antes de aceitar; --commit exige testes
 * e cria branch nova somente depois dos gates. Nunca faz push.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { isAbsolute, join, relative, resolve } from 'node:path';
import { runUnused } from './unused.mjs';

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const COMMIT = args.includes('--commit');
const TESTS = COMMIT || args.includes('--tests');
const only = args.find((a) => a.startsWith('--only='))?.slice(7).split(',');
const sh = (cmd, a, opts = {}) => spawnSync(cmd, a, {
  encoding: 'utf8', maxBuffer: 256 * 1024 * 1024, timeout: 15 * 60 * 1000, ...opts,
});
const git = (...a) => sh('git', a);
const checkedGit = (...a) => {
  const r = git(...a);
  if (r.error || r.status !== 0) throw new Error(`git ${a[0]} falhou: ${r.stderr || r.error?.message || r.status}`);
  return r.stdout;
};
const ROOT = checkedGit('rev-parse', '--show-toplevel').trim();
process.chdir(ROOT);
const bin = (p) => resolve(ROOT, 'node_modules', p);
const OUT = join(ROOT, '.autofix');
const snapshots = new Map();
const resultados = [];
let testes;
let residuoEslint = {};
let erro;
let criada;
const originalBranch = git('symbolic-ref', '--quiet', '--short', 'HEAD').stdout.trim();
const originalHead = checkedGit('rev-parse', 'HEAD').trim();

function executable(p, a) {
  const r = sh(process.execPath, [bin(p), ...a]);
  if (r.error || r.signal || r.status === null) throw new Error(`ferramenta ${p} falhou: ${r.error?.message || r.signal}`);
  return r;
}

function eslint(files, fix = false) {
  if (!files.length) return [];
  const r = executable('eslint/bin/eslint.js', [...(fix ? ['--fix-dry-run'] : []), '-f', 'json', ...files]);
  if (![0, 1].includes(r.status)) throw new Error(`ESLint indisponível (exit ${r.status}): ${r.stderr}`);
  let report;
  try { report = JSON.parse(r.stdout); } catch { throw new Error('ESLint não retornou JSON válido'); }
  if (!Array.isArray(report) || !report.length || report.some((f) =>
    !f || typeof f.filePath !== 'string' || !Array.isArray(f.messages) ||
    !Number.isInteger(f.errorCount) || f.errorCount < 0 || f.fatalErrorCount > 0)) {
    throw new Error('ESLint retornou relatório vazio, inválido ou erro fatal');
  }
  return report;
}

function typecheck() {
  for (const cfg of ['tsconfig.app.json', 'tsconfig.node.json'].filter((f) => existsSync(f))) {
    const r = executable('typescript/bin/tsc', ['-p', cfg, '--noEmit', '--incremental', 'false']);
    if (r.status !== 0) throw new Error(`typecheck falhou em ${cfg}:\n${r.stdout}${r.stderr}`);
  }
  if (!existsSync('tsconfig.app.json')) throw new Error('tsconfig.app.json ausente');
}

function baselineAny() {
  if (!existsSync('.any-baseline.json')) throw new Error('baseline any ausente; não será criada implicitamente');
  const r = sh(process.execPath, ['scripts/check-any-baseline.mjs']);
  if (r.status !== 0) throw new Error(`gate any falhou: ${r.stdout}${r.stderr}`);
}

function vitestFalhas() {
  const outputFile = join(OUT, 'vitest.json');
  rmSync(outputFile, { force: true });
  const r = executable('vitest/vitest.mjs', ['run', '--reporter=json', `--outputFile=${outputFile}`]);
  if (![0, 1].includes(r.status)) throw new Error(`Vitest indisponível (exit ${r.status})`);
  let j;
  try { j = JSON.parse(readFileSync(outputFile, 'utf8')); } catch { throw new Error('Vitest não gerou relatório válido'); }
  if (!Number.isInteger(j.numTotalTests) || j.numTotalTests <= 0 || !Array.isArray(j.testResults) ||
    !j.testResults.length || j.testResults.some((f) => !Array.isArray(f.assertionResults))) {
    throw new Error('Vitest não mediu testes');
  }
  const falhas = new Set();
  for (const f of j.testResults) {
    if (f.status === 'failed' && !f.assertionResults.some((t) => t.status === 'failed')) {
      throw new Error('Vitest falhou ao carregar uma suíte');
    }
    for (const t of f.assertionResults) if (t.status === 'failed') falhas.add(`${f.name} > ${t.fullName}`);
  }
  if ((r.status !== 0 || j.success === false) && !falhas.size) throw new Error('Vitest falhou sem teste identificado');
  return { total: j.numTotalTests, falhas };
}

function indexLimpo() {
  const r = git('diff', '--cached', '--quiet');
  if (r.status !== 0) throw new Error('índice Git contém alterações; execução não pode incorporar staging de terceiros');
}

function restaurar() {
  for (const [file, original] of snapshots) writeFileSync(file, original);
  if (criada) {
    checkedGit('restore', '--staged', '--', ...snapshots.keys());
    if (originalBranch) checkedGit('switch', originalBranch);
    else checkedGit('switch', '--detach', originalHead);
    checkedGit('branch', '-D', criada);
    criada = undefined;
  }
}

try {
  if (COMMIT && !APPLY) throw new Error('--commit exige --apply');
  if (only?.some((id) => !['unused', 'eslint'].includes(id))) throw new Error('--only aceita unused ou eslint');
  if (APPLY && ['main', 'master'].includes(originalBranch)) throw new Error('aplicação exige worktree isolada ou branch própria');
  if (COMMIT) indexLimpo();
  mkdirSync(OUT, { recursive: true });
  const dirty = new Set([
    ...checkedGit('diff', '--name-only', '-z').split('\0'),
    ...checkedGit('diff', '--name-only', '--cached', '-z').split('\0'),
    ...checkedGit('ls-files', '--others', '--exclude-standard', '-z').split('\0'),
  ].filter(Boolean));
  if (APPLY) { typecheck(); baselineAny(); }
  const base = APPLY && TESTS ? vitestFalhas() : undefined;
  const fixers = [
    { id: 'unused', titulo: 'Remover declarações inertes não usadas', run: () =>
      runUnused({ root: ROOT, skipFiles: dirty, apply: false }) },
    { id: 'eslint', titulo: 'ESLint: correções das regras configuradas', run: () => {
      const targets = checkedGit('ls-files', '-z', 'src', 'tests').split('\0')
        .filter((f) => /\.(ts|tsx)$/.test(f) && !dirty.has(f));
      const report = eslint(targets, true);
      const changes = report.filter((f) => typeof f.output === 'string')
        .map((f) => ({ file: relative(ROOT, f.filePath), text: f.output }));
      return { changes, changedFiles: changes.map((c) => c.file), fixedByKind: { arquivos: changes.length }, manual: [] };
    } },
  ].filter((f) => !only || only.includes(f.id));
  for (const fx of fixers) {
    const res = fx.run();
    const entry = { id: fx.id, titulo: fx.titulo, arquivosPropostos: res.changedFiles.length,
      porTipo: res.fixedByKind, manual: res.manual, arquivosMantidos: 0, arquivosRevertidos: [] };
    resultados.push(entry);
    if (!APPLY) continue;
    for (const change of res.changes) {
      const file = relative(ROOT, resolve(ROOT, change.file));
      if (!file || isAbsolute(file) || file.startsWith('..') || dirty.has(file)) throw new Error(`alvo não autorizado: ${change.file}`);
      checkedGit('ls-files', '--error-unmatch', '--', file);
      if (!snapshots.has(file)) snapshots.set(file, readFileSync(file));
      writeFileSync(file, change.text);
    }
    entry.arquivosMantidos = res.changes.length;
  }
  if (APPLY && snapshots.size) {
    typecheck();
    const invalid = eslint([...snapshots.keys()]).filter((f) => f.errorCount > 0);
    if (invalid.length) throw new Error(`ESLint encontrou erros em ${invalid.length} arquivo(s)`);
    baselineAny();
    if (TESTS) {
      const depois = vitestFalhas();
      const novas = [...depois.falhas].filter((f) => !base.falhas.has(f));
      testes = { ok: novas.length === 0, jaFalhavamAntes: [...base.falhas], novasFalhas: novas,
        resumo: `${depois.total} testes · ${novas.length} nova(s) falha(s)` };
      if (novas.length || depois.total !== base.total) throw new Error('testes regrediram; alterações serão revertidas');
    }
  }
  // Falha de ferramenta no relatório também impede aceitar ou commitar correções.
  for (const f of eslint(['.'])) for (const m of f.messages) {
    residuoEslint[m.ruleId || 'parse'] = (residuoEslint[m.ruleId || 'parse'] || 0) + 1;
  }
  if (COMMIT && snapshots.size) {
    indexLimpo();
    if (checkedGit('rev-parse', 'HEAD').trim() !== originalHead) throw new Error('HEAD mudou durante a execução');
    const branch = process.env.AUTOFIX_BRANCH || `autofix/auto-${new Date().toISOString().replace(/[:.]/g, '-')}`;
    checkedGit('check-ref-format', '--branch', branch);
    if (git('show-ref', '--verify', '--quiet', `refs/heads/${branch}`).status !== 1) throw new Error('branch de correção já existe; reutilização recusada');
    checkedGit('switch', '-c', branch);
    criada = branch;
    checkedGit('add', '--', ...snapshots.keys());
    checkedGit('commit', '--only', '-m', 'chore(autofix): aplica correções após validar os gates', '--', ...snapshots.keys());
    for (const entry of resultados) if (entry.arquivosMantidos) entry.commit = true;
    criada = undefined;
  }
} catch (e) {
  erro = e.message;
  try { restaurar(); } catch (rollback) { erro += `; rollback falhou: ${rollback.message}`; }
  for (const entry of resultados) {
    entry.ok = false;
    entry.arquivosRevertidos = [...snapshots.keys()];
    entry.arquivosMantidos = 0;
    entry.motivo = erro;
  }
  console.error(`[autofix] ${erro}`);
}

mkdirSync(OUT, { recursive: true });
const report = { quando: new Date().toISOString(), modo: APPLY ? 'aplicar' : 'simulacao',
  ok: !erro, erro, resultados, testes, residuoEslint };
writeFileSync(join(OUT, 'relatorio.json'), JSON.stringify(report, null, 2));
const md = [`# Relatório do autofix — ${report.quando}`, `Estado: ${erro ? 'FALHOU' : 'OK'}`,
  ...(erro ? [erro] : []), ...resultados.map((r) => `- ${r.titulo}: ${r.arquivosPropostos} propostos; ${r.arquivosMantidos} mantidos; fila manual ${r.manual.length}`),
  ...(testes ? [testes.resumo] : []), ''];
writeFileSync(join(OUT, 'relatorio.md'), md.join('\n'));
console.log('[autofix] relatório em .autofix/relatorio.md');
process.exitCode = erro ? 1 : 0;
