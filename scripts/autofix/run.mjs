#!/usr/bin/env node
/**
 * Autofix — corrige código de forma determinística, sem IA e sem custo de token.
 *
 * Uso:
 *   node scripts/autofix/run.mjs                # simulação: só mede e escreve o relatório
 *   node scripts/autofix/run.mjs --apply        # aplica, valida e reverte o que quebrar
 *   node scripts/autofix/run.mjs --apply --commit   # + um commit por correção (branch autofix/AAAA-MM-DD)
 *   node scripts/autofix/run.mjs --apply --tests    # + vitest completo no fim
 *   node scripts/autofix/run.mjs --only=unused      # unused | eslint
 *
 * Regras de segurança:
 *  - nunca toca arquivo com alteração local não commitada;
 *  - só aplica se o typecheck JÁ estava verde antes (senão não dá pra atribuir culpa);
 *  - depois de cada correção roda tsc + eslint; arquivo que quebrar é revertido sozinho;
 *  - nunca faz push, nunca mexe em main.
 *
 * Saída: .autofix/relatorio.md e .autofix/relatorio.json (fila manual = o que sobrou).
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { runUnused } from './unused.mjs';

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const COMMIT = args.includes('--commit');
const TESTS = args.includes('--tests');
const only = (args.find((a) => a.startsWith('--only=')) || '').split('=')[1]?.split(',');

const sh = (cmd, a, opts = {}) =>
  spawnSync(cmd, a, { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024, ...opts });
const git = (...a) => sh('git', a);

const ROOT = git('rev-parse', '--show-toplevel').stdout.trim();
process.chdir(ROOT);
const bin = (p) => resolve(ROOT, 'node_modules', p);
const OUT = join(ROOT, '.autofix');
mkdirSync(OUT, { recursive: true });

const log = (m) => console.log(`[autofix] ${m}`);
const t0 = Date.now();
const secs = () => `${Math.round((Date.now() - t0) / 1000)}s`;

// ---------- gates ----------
const motivos = {}; // arquivo -> primeira mensagem de erro do gate (vai para o relatório)

function tsc() {
  const r = sh('node', [bin('typescript/bin/tsc'), '-p', 'tsconfig.app.json', '--noEmit']);
  const out = r.stdout + r.stderr;
  const files = new Set();
  for (const m of out.matchAll(/^(.+?)\((\d+),\d+\): (error TS\d+: .+)$/gm)) {
    files.add(m[1]);
    motivos[m[1]] ??= `tsc ${m[3]} (linha ${m[2]})`;
  }
  return { ok: r.status === 0, files: [...files], out };
}

function eslintErrors(files) {
  if (!files.length) return { ok: true, files: [] };
  const r = sh('node', [bin('eslint/bin/eslint.js'), '--max-warnings', '99999', '-f', 'json', ...files]);
  let bad = [];
  try {
    const res = JSON.parse(r.stdout).filter((f) => f.errorCount > 0);
    for (const f of res) {
      const m = f.messages.find((x) => x.severity === 2);
      motivos[f.filePath.replace(ROOT + '/', '')] ??= `eslint ${m?.ruleId}: ${m?.message} (linha ${m?.line})`;
    }
    bad = res.map((f) => f.filePath.replace(ROOT + '/', ''));
  } catch {
    return { ok: false, files: [], out: r.stderr || r.stdout };
  }
  return { ok: bad.length === 0, files: bad };
}

function anyBaseline() {
  return sh('node', ['scripts/check-any-baseline.mjs']).status === 0;
}

/** Roda os gates; reverte só os arquivos que quebraram; repete até 3 vezes. */
function validateAndPrune(changed) {
  let keep = [...changed];
  const reverted = [];
  for (let round = 1; round <= 3; round++) {
    const a = tsc();
    const b = eslintErrors(keep);
    const bad = new Set(
      [...a.files, ...b.files].map((f) => f.replace(ROOT + '/', '')).filter((f) => keep.includes(f)),
    );
    if (a.ok && b.ok && anyBaseline()) return { ok: true, keep, reverted };
    if (!bad.size) {
      // quebrou mas não sei em qual arquivo → desfaz tudo desta correção
      git('checkout', '--', ...keep);
      reverted.push(...keep);
      return { ok: false, keep: [], reverted, why: 'gate falhou sem arquivo identificável' };
    }
    log(`gate falhou em ${bad.size} arquivo(s); revertendo e revalidando (rodada ${round})`);
    git('checkout', '--', ...bad);
    reverted.push(...bad);
    keep = keep.filter((f) => !bad.has(f));
    if (!keep.length) return { ok: true, keep, reverted };
  }
  git('checkout', '--', ...keep);
  return { ok: false, keep: [], reverted: [...reverted, ...keep], why: 'gate não estabilizou em 3 rodadas' };
}

function commit(files, msg) {
  if (!files.length) return false;
  const branch = git('branch', '--show-current').stdout.trim();
  if (!branch || ['main', 'master', 'dia'].includes(branch) || /^dia-/.test(branch)) {
    const name = `autofix/${new Date().toISOString().slice(0, 10)}`;
    const exists = git('rev-parse', '--verify', '--quiet', name).status === 0;
    const r = exists ? git('switch', name) : git('switch', '-c', name);
    if (r.status !== 0) throw new Error(`não consegui criar/usar a branch ${name}: ${r.stderr}`);
    log(`commits irão para a branch ${name}`);
  }
  git('add', '--', ...files);
  const r = git('commit', '-m', msg);
  if (r.status !== 0) throw new Error(`commit recusado (hook?):\n${r.stdout}${r.stderr}`);
  return true;
}

function vitestFalhas() {
  const out = join(OUT, 'vitest.json');
  sh('node', [bin('vitest/vitest.mjs'), 'run', '--reporter=json', `--outputFile=${out}`]);
  try {
    const j = JSON.parse(readFileSync(out, 'utf8'));
    const falhas = new Set();
    for (const f of j.testResults)
      for (const t of f.assertionResults) if (t.status === 'failed') falhas.add(`${f.name.replace(ROOT + '/', '')} > ${t.fullName}`);
    return { total: j.numTotalTests, falhas };
  } catch {
    return null;
  }
}

// ---------- fixers ----------
const fixers = [
  {
    id: 'unused',
    titulo: 'Remover código não usado (imports, desestruturação, variáveis puras)',
    msg: 'chore(autofix): remove imports e declarações não usados',
    run: (skip) => runUnused({ root: ROOT, skipFiles: skip, apply: APPLY }),
  },
  {
    id: 'eslint',
    titulo: 'eslint --fix (regras auto-corrigíveis)',
    msg: 'chore(autofix): aplica eslint --fix',
    run: (skip) => {
      const targets = git('ls-files', 'src', 'supabase/functions', 'tests')
        .stdout.split('\n')
        .filter((f) => /\.(ts|tsx)$/.test(f) && !skip.has(f));
      // --fix-dry-run devolve o texto corrigido por arquivo (campo `output`), sem gravar:
      // assim sei exatamente quais arquivos mudariam, mesmo que outro fixer já os tenha tocado.
      const r = sh('node', [bin('eslint/bin/eslint.js'), '--fix-dry-run', '--max-warnings', '99999', '-f', 'json', ...targets]);
      let results = [];
      try { results = JSON.parse(r.stdout); } catch { /* ignora */ }
      const changed = results.filter((f) => typeof f.output === 'string');
      if (APPLY) for (const f of changed) writeFileSync(f.filePath, f.output);
      return {
        changedFiles: changed.map((f) => f.filePath.replace(ROOT + '/', '')),
        fixedByKind: { 'arquivos com correção': changed.length },
        manual: [],
      };
    },
  },
].filter((f) => !only || only.includes(f.id));

// ---------- fila manual do eslint (só leitura) ----------
function eslintResidue() {
  const r = sh('node', [bin('eslint/bin/eslint.js'), '--max-warnings', '99999', '-f', 'json', '.']);
  const rules = {};
  try {
    for (const f of JSON.parse(r.stdout))
      for (const m of f.messages) rules[m.ruleId || 'parse'] = (rules[m.ruleId || 'parse'] || 0) + 1;
  } catch { /* ignora */ }
  return rules;
}

// ---------- main ----------
log(APPLY ? 'modo APLICAR' : 'modo SIMULAÇÃO (use --apply para gravar)');

const dirty = new Set(
  [...git('diff', '--name-only').stdout.split('\n'), ...git('diff', '--name-only', '--cached').stdout.split('\n'),
    ...git('ls-files', '--others', '--exclude-standard').stdout.split('\n')].filter(Boolean),
);
if (dirty.size) log(`${dirty.size} arquivo(s) com alteração local serão IGNORADOS`);

if (APPLY) {
  const base = tsc();
  if (!base.ok) {
    console.error('[autofix] typecheck já está vermelho antes de começar; abortando.\n' + base.out.split('\n').slice(0, 15).join('\n'));
    process.exit(2);
  }
  log(`base verde (${secs()})`);
}

let vitestBase = null;
if (APPLY && TESTS) {
  vitestBase = vitestFalhas();
  log(`vitest base: ${vitestBase ? `${vitestBase.total} testes, ${vitestBase.falhas.size} já falhando` : 'não consegui medir'} (${secs()})`);
}

const resultados = [];
for (const fx of fixers) {
  log(`→ ${fx.titulo}`);
  const res = fx.run(dirty);
  const entry = { id: fx.id, titulo: fx.titulo, arquivosPropostos: res.changedFiles.length, porTipo: res.fixedByKind, manual: res.manual };
  if (APPLY && res.changedFiles.length) {
    const v = validateAndPrune(res.changedFiles);
    entry.arquivosMantidos = v.keep.length;
    entry.arquivosRevertidos = v.reverted;
    entry.ok = v.ok;
    entry.motivo = v.why;
    if (COMMIT && v.keep.length) entry.commit = commit(v.keep, fx.msg);
    log(`  ${v.keep.length} arquivo(s) mantido(s), ${v.reverted.length} revertido(s) (${secs()})`);
  } else {
    log(`  ${res.changedFiles.length} arquivo(s) ${APPLY ? 'alterados' : 'seriam alterados'}`);
  }
  resultados.push(entry);
}

let testes;
if (APPLY && TESTS && resultados.some((r) => r.arquivosMantidos)) {
  log('rodando vitest e comparando com a base…');
  const depois = vitestFalhas();
  if (!depois || !vitestBase) {
    testes = { ok: false, resumo: 'não consegui medir o vitest (antes ou depois)' };
  } else {
    const novas = [...depois.falhas].filter((f) => !vitestBase.falhas.has(f));
    testes = {
      ok: novas.length === 0,
      jaFalhavamAntes: [...vitestBase.falhas],
      novasFalhas: novas,
      resumo: `${depois.total} testes · ${vitestBase.falhas.size} já falhavam antes · ${novas.length} NOVA(S) falha(s)`,
    };
  }
  log(`  ${testes.resumo} (${secs()})`);
}

const residuoEslint = eslintResidue();

// ---------- relatório ----------
const json = { quando: new Date().toISOString(), modo: APPLY ? 'aplicar' : 'simulacao', resultados, testes, residuoEslint };
writeFileSync(join(OUT, 'relatorio.json'), JSON.stringify(json, null, 2));

const md = [`# Relatório do autofix — ${json.quando}`, `Modo: **${json.modo}** · duração ${secs()}`, ''];
for (const r of resultados) {
  md.push(`## ${r.titulo}`);
  md.push(`- ${APPLY ? 'propostos' : 'seriam alterados'}: **${r.arquivosPropostos}** arquivo(s) — ${JSON.stringify(r.porTipo)}`);
  if (APPLY) {
    md.push(`- mantidos: **${r.arquivosMantidos ?? 0}** · revertidos pelo gate: **${r.arquivosRevertidos?.length ?? 0}**${r.motivo ? ` (${r.motivo})` : ''}`);
    for (const f of r.arquivosRevertidos || []) md.push(`  - revertido: \`${f}\` — ${motivos[f] || 'motivo não capturado'}`);
  }
  if (r.manual.length) {
    md.push('', `### Fila manual (${r.manual.length}) — exige decisão, não é seguro automatizar`);
    for (const m of r.manual) md.push(`- \`${m.file}:${m.line}\` \`${m.name}\` — ${m.kind}: ${m.why}`);
  }
  md.push('');
}
if (testes) {
  md.push('## vitest (comparado com a base)', `- ${testes.resumo}`);
  for (const f of testes.jaFalhavamAntes || []) md.push(`  - já falhava antes (não é do autofix): ${f}`);
  for (const f of testes.novasFalhas || []) md.push(`  - **NOVA falha**: ${f}`);
  md.push('');
}
md.push('## Avisos do eslint que sobraram (não auto-corrigíveis)', ...Object.entries(residuoEslint).map(([k, v]) => `- ${k}: ${v}`), '');
writeFileSync(join(OUT, 'relatorio.md'), md.join('\n'));

log(`relatório em .autofix/relatorio.md (${secs()})`);
const falhou = resultados.some((r) => r.ok === false) || (testes && !testes.ok);
process.exit(falhou ? 1 : 0);
