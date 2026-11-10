import test from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { runUnused } from './autofix/unused.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const tsRoot = resolve(root, 'node_modules/typescript');
const read = (p) => readFileSync(p, 'utf8');
const run = (cmd, args, cwd, env = {}) => spawnSync(cmd, args, {
  cwd, env: { ...process.env, ...env }, encoding: 'utf8', timeout: 60000,
});
const git = (cwd, ...args) => {
  const r = run('git', args, cwd);
  assert.equal(r.status, 0, r.stderr);
  return r.stdout.trim();
};
function fixture(t, source = 'const unused = 42;\nexport const kept = 1;\n') {
  const dir = mkdtempSync(join(tmpdir(), 'fast-autofix-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  for (const p of ['src', 'scripts/autofix', 'node_modules/eslint/bin', 'node_modules/vitest']) mkdirSync(join(dir, p), { recursive: true });
  cpSync(join(root, 'scripts/autofix'), join(dir, 'scripts/autofix'), { recursive: true });
  symlinkSync(tsRoot, join(dir, 'node_modules/typescript'), 'dir');
  writeFileSync(join(dir, 'package.json'), '{"type":"module"}\n');
  writeFileSync(join(dir, '.gitignore'), 'node_modules/\n.autofix/\n');
  writeFileSync(join(dir, '.any-baseline.json'), '{"baseline":0}');
  writeFileSync(join(dir, 'scripts/check-any-baseline.mjs'), 'process.exit(0);');
  writeFileSync(join(dir, 'tsconfig.app.json'), JSON.stringify({ compilerOptions: {
    target: 'ES2022', module: 'ESNext', moduleResolution: 'Bundler', noEmit: true,
    noUnusedLocals: false, noUnusedParameters: false, types: [], skipLibCheck: true,
  }, include: ['src'] }));
  writeFileSync(join(dir, 'src/app.ts'), source);
  writeFileSync(join(dir, 'third.txt'), 'original\n');
  writeFileSync(join(dir, 'node_modules/eslint/bin/eslint.js'), `
const fs = require('node:fs'); const path = require('node:path');
const source = fs.readFileSync('src/app.ts','utf8');
if (process.env.FAIL_ESLINT || (process.env.FAIL_ESLINT_AFTER && !source.includes('unused = 42'))) process.exit(2);
if (process.env.INVALID_ESLINT) { console.log('[]'); process.exit(0); }
const fix = process.argv.includes('--fix-dry-run');
console.log(JSON.stringify([{filePath:path.resolve('src/app.ts'),messages:[],errorCount:0,warningCount:0,
  ...(fix && source.includes('unused = 42') ? {output:source.replace('const unused = 42;','')} : {})}]));
`);
  writeFileSync(join(dir, 'node_modules/vitest/vitest.mjs'), `
import fs from 'node:fs';
const file=process.argv.find(a=>a.startsWith('--outputFile=')).slice(13);
const fail=!!process.env.FAIL_TEST_AFTER && !fs.readFileSync('src/app.ts','utf8').includes('unused = 42');
fs.writeFileSync(file,JSON.stringify({success:!fail,numTotalTests:1,
 testResults:[{name:'regressao.test.ts',status:fail?'failed':'passed',assertionResults:[{fullName:'regressao',status:fail?'failed':'passed'}]}]}));
process.exit(fail?1:0);
`);
  git(dir, 'init', '-b', 'trabalho');
  git(dir, 'config', 'user.email', 'autofix@example.invalid');
  git(dir, 'config', 'user.name', 'Teste autofix');
  git(dir, 'config', 'core.hooksPath', '/dev/null');
  git(dir, 'add', '.'); git(dir, 'commit', '-m', 'base');
  return dir;
}
const cli = (dir, args = [], env = {}) => run(process.execPath, ['scripts/autofix/run.mjs', ...args], dir, env);

test('getter na desestruturação permanece avaliado e entra na fila manual', (t) => {
  const code = 'const obj = { get unused(){ console.log("efeito"); return 1; }, kept: 1 };\nconst { unused, kept } = obj;\nconsole.log(kept);\nexport {};\n';
  const dir = fixture(t, code);
  const result = runUnused({ root: dir, apply: true });
  assert.equal(read(join(dir, 'src/app.ts')), code);
  assert.ok(result.manual.some((m) => m.kind === 'destructure'));
});

test('iterador e valor padrão de desestruturação ficam na fila manual', (t) => {
  const code = 'function* source(){ console.log("efeito"); yield 1; yield 2; }\nconst [unused, kept] = source();\nconst { ignored = console.log("padrao"), used } = { used: 2 };\nconsole.log(kept, used); export {};\n';
  const dir = fixture(t, code);
  const result = runUnused({ root: dir, apply: true });
  assert.equal(read(join(dir, 'src/app.ts')), code);
  assert.ok(result.manual.some((m) => m.kind === 'destructure'));
});

test('incremento, coerção e nome computado não são tratados como puros', (t) => {
  const code = 'let count = 0;\nconst increment = ++count;\nconst key = { toString(){ console.log("efeito"); return "key"; } };\nconst coerced = +key;\nconst method = { [String(key)](){} };\nconsole.log(count); export {};\n';
  const dir = fixture(t, code);
  const result = runUnused({ root: dir, apply: true });
  assert.equal(read(join(dir, 'src/app.ts')), code);
  assert.ok(result.manual.filter((m) => m.kind === 'var').length >= 3);
});

test('import de valor preserva execução do módulo', (t) => {
  const dir = fixture(t, 'import { value } from "./side";\nexport const kept = 1;\n');
  writeFileSync(join(dir, 'src/side.ts'), 'console.log("efeito"); export const value = 1;');
  const result = runUnused({ root: dir, apply: true });
  assert.match(read(join(dir, 'src/app.ts')), /import \{ value \}/);
  assert.ok(result.manual.some((m) => m.kind === 'import'));
});

test('regressão de testes restaura arquivos e não cria commit nem branch', (t) => {
  const dir = fixture(t); const before = read(join(dir, 'src/app.ts'));
  const head = git(dir, 'rev-parse', 'HEAD');
  const r = cli(dir, ['--apply', '--commit', '--only=unused'], { FAIL_TEST_AFTER: '1' });
  assert.equal(r.status, 1, r.stderr);
  assert.equal(read(join(dir, 'src/app.ts')), before);
  assert.equal(git(dir, 'rev-parse', 'HEAD'), head);
  assert.equal(git(dir, 'branch', '--show-current'), 'trabalho');
  assert.equal(git(dir, 'status', '--porcelain'), '');
  assert.equal(JSON.parse(read(join(dir, '.autofix/relatorio.json'))).testes.ok, false);
});

test('falha do ESLint durante os gates desfaz a proposta e falha', (t) => {
  const dir = fixture(t); const before = read(join(dir, 'src/app.ts'));
  const r = cli(dir, ['--apply', '--only=unused'], { FAIL_ESLINT_AFTER: '1' });
  assert.equal(r.status, 1, r.stderr);
  assert.equal(read(join(dir, 'src/app.ts')), before);
  assert.equal(git(dir, 'status', '--porcelain'), '');
});

test('ESLint indisponível ou relatório vazio não vira nenhuma correção', (t) => {
  const dir = fixture(t);
  for (const env of [{ FAIL_ESLINT: '1' }, { INVALID_ESLINT: '1' }]) {
    const r = cli(dir, ['--only=eslint'], env);
    assert.equal(r.status, 1, r.stderr);
    assert.equal(JSON.parse(read(join(dir, '.autofix/relatorio.json'))).ok, false);
  }
});

test('staging de terceiros é recusado e preservado integralmente', (t) => {
  const dir = fixture(t);
  writeFileSync(join(dir, 'third.txt'), 'trabalho de terceiro\n'); git(dir, 'add', 'third.txt');
  const staged = git(dir, 'diff', '--cached'); const head = git(dir, 'rev-parse', 'HEAD');
  const r = cli(dir, ['--apply', '--commit', '--only=unused']);
  assert.equal(r.status, 1, r.stderr);
  assert.equal(git(dir, 'diff', '--cached'), staged);
  assert.equal(git(dir, 'rev-parse', 'HEAD'), head);
  assert.match(read(join(dir, 'src/app.ts')), /unused = 42/);
});

test('arquivo dirty é preservado ao reverter outra correção', (t) => {
  const dir = fixture(t);
  writeFileSync(join(dir, 'src/dirty.ts'), 'export const local = 1;'); git(dir, 'add', 'src/dirty.ts'); git(dir, 'commit', '-m', 'dirty base');
  writeFileSync(join(dir, 'src/dirty.ts'), 'export const local = 2;');
  const r = cli(dir, ['--apply', '--only=unused'], { FAIL_ESLINT_AFTER: '1' });
  assert.equal(r.status, 1, r.stderr);
  assert.equal(read(join(dir, 'src/dirty.ts')), 'export const local = 2;');
  assert.match(read(join(dir, 'src/app.ts')), /unused = 42/);
});

test('sucesso valida testes e cria commit próprio em branch nova', (t) => {
  const dir = fixture(t);
  const r = cli(dir, ['--apply', '--commit', '--only=unused'], { AUTOFIX_BRANCH: 'autofix/teste-seguro' });
  assert.equal(r.status, 0, r.stderr);
  assert.equal(git(dir, 'branch', '--show-current'), 'autofix/teste-seguro');
  assert.equal(git(dir, 'rev-list', '--count', 'HEAD'), '2');
  assert.equal(git(dir, 'show', '--format=', '--name-only', 'HEAD'), 'src/app.ts');
  assert.doesNotMatch(read(join(dir, 'src/app.ts')), /unused = 42/);
});

test('branch automática existente nunca é reutilizada', (t) => {
  const dir = fixture(t); git(dir, 'branch', 'autofix/existente');
  const head = git(dir, 'rev-parse', 'HEAD');
  const r = cli(dir, ['--apply', '--commit', '--only=unused'], { AUTOFIX_BRANCH: 'autofix/existente' });
  assert.equal(r.status, 1, r.stderr);
  assert.equal(git(dir, 'rev-parse', 'HEAD'), head);
  assert.equal(git(dir, 'branch', '--show-current'), 'trabalho');
  assert.match(read(join(dir, 'src/app.ts')), /unused = 42/);
});
