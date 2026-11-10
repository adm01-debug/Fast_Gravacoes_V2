import test from 'node:test';
import assert from 'node:assert/strict';
import { chmodSync, cpSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
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

test('sync preserva untracked mesmo quando upstream passa a rastrear o mesmo caminho', (t) => {
  const dir = fixture(t);
  const remote = mkdtempSync(join(tmpdir(), 'fast-remote-'));
  t.after(() => rmSync(remote, { recursive: true, force: true }));
  git(remote, 'init', '--bare');
  git(dir, 'remote', 'add', 'origin', remote);
  git(dir, 'push', '-u', 'origin', 'trabalho');
  const upstream = mkdtempSync(join(tmpdir(), 'fast-upstream-'));
  t.after(() => rmSync(upstream, { recursive: true, force: true }));
  git(upstream, 'clone', '-b', 'trabalho', remote, '.');
  git(upstream, 'config', 'user.email', 'teste@example.invalid');
  git(upstream, 'config', 'user.name', 'Teste');
  writeFileSync(join(upstream, 'colisao.txt'), 'remoto\n');
  git(upstream, 'add', 'colisao.txt'); git(upstream, 'commit', '-m', 'arquivo novo'); git(upstream, 'push');
  writeFileSync(join(dir, 'colisao.txt'), 'trabalho local nao rastreado\n');
  const head = git(dir, 'rev-parse', 'HEAD');
  const r = run('bash', [join(root, 'scripts/sync/sincronizar.sh')], dir,
    { FG_REPO: dir, FG_REPORTS: join(remote, 'relatorios') });
  assert.equal(r.status, 0, r.stderr);
  assert.equal(read(join(dir, 'colisao.txt')), 'trabalho local nao rastreado\n');
  assert.equal(git(dir, 'rev-parse', 'HEAD'), head);
  assert.match(r.stdout, /alterações locais/);
});

test('sync com árvore limpa avança até upstream', (t) => {
  const dir = fixture(t);
  const remote = mkdtempSync(join(tmpdir(), 'fast-sync-clean-'));
  t.after(() => rmSync(remote, { recursive: true, force: true }));
  git(remote, 'init', '--bare'); git(dir, 'remote', 'add', 'origin', remote); git(dir, 'push', '-u', 'origin', 'trabalho');
  const upstream = mkdtempSync(join(tmpdir(), 'fast-peer-clean-'));
  t.after(() => rmSync(upstream, { recursive: true, force: true }));
  git(upstream, 'clone', '-b', 'trabalho', remote, '.');
  git(upstream, 'config', 'user.email', 'teste@example.invalid'); git(upstream, 'config', 'user.name', 'Teste');
  writeFileSync(join(upstream, 'novo.txt'), 'remoto\n'); git(upstream, 'add', '.'); git(upstream, 'commit', '-m', 'novo'); git(upstream, 'push');
  const r = run('bash', [join(root, 'scripts/sync/sincronizar.sh')], dir,
    { FG_REPO: dir, FG_REPORTS: join(remote, 'relatorios') });
  assert.equal(r.status, 0, r.stderr);
  assert.equal(read(join(dir, 'novo.txt')), 'remoto\n');
  assert.equal(git(dir, 'rev-parse', 'HEAD'), git(upstream, 'rev-parse', 'HEAD'));
});

function routineFixture(t) {
  const dir = fixture(t);
  const home = mkdtempSync(join(tmpdir(), 'fast-routine-'));
  t.after(() => rmSync(home, { recursive: true, force: true }));
  mkdirSync(join(home, 'projetos'), { recursive: true });
  symlinkSync(dir, join(home, 'projetos/Fast_Gravacoes_V2'), 'dir');
  mkdirSync(join(dir, 'scripts/audit'));
  writeFileSync(join(dir, 'scripts/audit/run.mjs'), `
import fs from 'node:fs';
if(process.env.FAIL_AUDIT) process.exit(2);
fs.mkdirSync('.audit',{recursive:true});
fs.writeFileSync('.audit/findings.json',JSON.stringify({findings:[]}));
for(const name of ['relatorio.md','fila-para-decisao.md']) fs.writeFileSync('.audit/'+name,'audit fixture');
console.log('[audit] 0 achados');
`);
  git(dir, 'add', 'scripts/audit'); git(dir, 'commit', '-m', 'audit fixture');
  git(dir, 'branch', 'main'); git(dir, 'remote', 'add', 'origin', dir);
  return { dir, home };
}

test('rotina retorna falha de auditoria ao agendador e não cria branch de correção', (t) => {
  const { dir, home } = routineFixture(t);
  const r = run(process.execPath, [join(root, 'scripts/rotina/rotina.mjs')], dir,
    { FG_HOME: home, ROTINA_SCRIPTS: join(dir, 'scripts'), FAIL_AUDIT: '1' });
  assert.equal(r.status, 1, r.stdout + r.stderr);
  assert.match(read(join(home, 'relatorios/fast-gravacoes-v2/ULTIMO.md')), /auditoria falhou/i);
  assert.equal(git(dir, 'branch', '--list', 'autofix/auto-*'), '');
});

test('rotina retorna regressão de teste ao agendador sem commit de correção', (t) => {
  const { dir, home } = routineFixture(t);
  const head = git(dir, 'rev-parse', 'HEAD');
  const r = run(process.execPath, [join(root, 'scripts/rotina/rotina.mjs')], dir,
    { FG_HOME: home, ROTINA_SCRIPTS: join(dir, 'scripts'), FAIL_TEST_AFTER: '1' });
  assert.equal(r.status, 1, r.stdout + r.stderr);
  assert.match(read(join(home, 'relatorios/fast-gravacoes-v2/ULTIMO.md')), /FALHOU/);
  assert.equal(git(dir, 'branch', '--list', 'autofix/auto-*'), '');
  assert.equal(git(dir, 'rev-parse', 'HEAD'), head);
});

test('audit com checagem quebrada não devolve sucesso', (t) => {
  const dir = fixture(t);
  mkdirSync(join(dir, 'scripts/audit'));
  cpSync(join(root, 'scripts/audit/run.mjs'), join(dir, 'scripts/audit/run.mjs'));
  // Falta regras.json: a checagem deve registrar falha e propagá-la ao agendador.
  const r = run(process.execPath, ['scripts/audit/run.mjs'], dir);
  assert.equal(r.status, 1, r.stdout + r.stderr);
  const report = JSON.parse(read(join(dir, '.audit/findings.json')));
  assert.ok(report.checks.some((c) => c.ok === false));
});


test('apply sem commit isola antes dos gates e preserva branch e arquivos locais', (t) => {
  const dir = fixture(t);
  const head = git(dir, 'rev-parse', 'HEAD');
  writeFileSync(join(dir, 'third.txt'), 'edicao local\n');
  writeFileSync(join(dir, 'local.txt'), 'nao rastreado\n');
  writeFileSync(join(dir, '.gitignore'), read(join(dir, '.gitignore')) + 'privado.txt\n');
  writeFileSync(join(dir, 'privado.txt'), 'conteudo privado fixture\n');
  writeFileSync(join(dir, 'scripts/check-any-baseline.mjs'), `
import {execFileSync} from 'node:child_process';
if(execFileSync('git',['branch','--show-current'],{encoding:'utf8'}).trim()!=='autofix/apply-isolado') process.exit(2);
`);
  const r = cli(dir, ['--apply', '--only=unused'], { AUTOFIX_BRANCH: 'autofix/apply-isolado' });
  assert.equal(r.status, 0, r.stderr);
  assert.equal(git(dir, 'branch', '--show-current'), 'autofix/apply-isolado');
  assert.equal(git(dir, 'rev-parse', 'trabalho'), head);
  assert.match(git(dir, 'show', 'trabalho:src/app.ts'), /unused = 42/);
  assert.doesNotMatch(read(join(dir, 'src/app.ts')), /unused = 42/);
  assert.equal(read(join(dir, 'third.txt')), 'edicao local\n');
  assert.equal(read(join(dir, 'local.txt')), 'nao rastreado\n');
  assert.equal(read(join(dir, 'privado.txt')), 'conteudo privado fixture\n');
});

test('audit redige credenciais em todas as evidencias e trechos', (t) => {
  // Valores sintéticos: nunca lemos nem exportamos credenciais do clone real.
  const token = 'sk_' + 'live_' + 'Q8w9E7r6T5y4U3i2O1p0Z9x8C7v6B5n4';
  const password = 'SenhaFixtureSemUsoReal987';
  const code = `export const fakeData = { token: '${token}' };\n// postgres://fixture:${password}@localhost/db\n`;
  const dir = fixture(t, code);
  cpSync(join(root, 'scripts/audit'), join(dir, 'scripts/audit'), { recursive: true });
  git(dir, 'add', 'scripts/audit'); git(dir, 'commit', '-m', 'audit fixture');
  const r = run(process.execPath, ['scripts/audit/run.mjs'], dir);
  assert.equal(r.status, 0, 'auditoria fixture deve concluir sem erro de ferramenta');
  const report = JSON.parse(read(join(dir, '.audit/findings.json')));
  assert.ok(report.findings.some(f => f.check === 'segredo-exposto'));
  assert.ok(report.findings.some(f => f.check === 'dado-fabricado'));
  const outputs = ['findings.json', 'relatorio.md', 'fila-para-decisao.md'].map(f => read(join(dir, '.audit', f))).join('\n') + r.stdout + r.stderr;
  assert.ok(!outputs.includes(token), 'token sintetico deve estar redigido em todos os relatorios');
  assert.ok(!outputs.includes(password), 'senha sintetica em trecho adjacente deve estar redigida');
  assert.match(outputs, /SEGREDO REDIGIDO/);
});

for (const kind of ['arquivo', 'pasta local', 'pasta remota', 'nome especial']) {
  test(`sync preserva colisao ignored: ${kind}`, (t) => {
    const dir = fixture(t);
    const remote = mkdtempSync(join(tmpdir(), 'fast-sync-ignored-'));
    const upstream = mkdtempSync(join(tmpdir(), 'fast-peer-ignored-'));
    t.after(() => { rmSync(remote, { recursive: true, force: true }); rmSync(upstream, { recursive: true, force: true }); });
    const ignored = kind === 'nome especial' ? 'privado com\nlinha.txt' : 'privado';
    writeFileSync(join(dir, '.gitignore'), read(join(dir, '.gitignore')) + (kind === 'nome especial' ? 'privado*' : ignored) + '\n');
    git(dir, 'add', '.gitignore'); git(dir, 'commit', '-m', 'ignore fixture');
    git(remote, 'init', '--bare'); git(dir, 'remote', 'add', 'origin', remote); git(dir, 'push', '-u', 'origin', 'trabalho');
    git(upstream, 'clone', '-b', 'trabalho', remote, '.');
    git(upstream, 'config', 'user.email', 'teste@example.invalid'); git(upstream, 'config', 'user.name', 'Teste');
    const remotePath = kind === 'pasta remota' ? join(ignored, 'novo.txt') : ignored;
    mkdirSync(dirname(join(upstream, remotePath)), { recursive: true });
    writeFileSync(join(upstream, remotePath), 'remoto\n');
    git(upstream, 'add', '-f', '--', remotePath); git(upstream, 'commit', '-m', 'colisao'); git(upstream, 'push');
    const localPath = kind === 'pasta local' ? join(ignored, 'local.txt') : ignored;
    mkdirSync(dirname(join(dir, localPath)), { recursive: true });
    writeFileSync(join(dir, localPath), 'ignorado local preservado\n');
    const head = git(dir, 'rev-parse', 'HEAD');
    const r = run('bash', [join(root, 'scripts/sync/sincronizar.sh')], dir, { FG_REPO: dir, FG_REPORTS: join(remote, 'relatorios') });
    assert.equal(r.status, 0, r.stderr);
    assert.equal(read(join(dir, localPath)), 'ignorado local preservado\n');
    assert.equal(git(dir, 'rev-parse', 'HEAD'), head);
    assert.match(r.stdout, /ignorado colide/);
  });
}

test('rotina respeita FG_REPO fora do caminho padrao', (t) => {
  const { dir, home } = routineFixture(t);
  rmSync(join(home, 'projetos/Fast_Gravacoes_V2'));
  const r = run(process.execPath, [join(root, 'scripts/rotina/rotina.mjs')], dir,
    { FG_HOME: home, FG_REPO: dir, ROTINA_SCRIPTS: join(dir, 'scripts'), FAIL_AUDIT: '1' });
  assert.equal(r.status, 1, r.stdout + r.stderr);
  const report = read(join(home, 'relatorios/fast-gravacoes-v2/ULTIMO.md'));
  assert.match(report, /auditoria falhou/i);
  assert.doesNotMatch(report, /origin\/main não existe/);
});


test('instalador grava clone escolhido com espacos, aspas e percentuais sem iniciar servico real', (t) => {
  const original = fixture(t);
  const dir = original + ' com % e "aspas"';
  renameSync(original, dir);
  const home = mkdtempSync(join(tmpdir(), 'fast-installer-home-'));
  t.after(() => { rmSync(dir, { recursive: true, force: true }); rmSync(home, { recursive: true, force: true }); });
  cpSync(join(root, 'scripts/audit'), join(dir, 'scripts/audit'), { recursive: true });
  cpSync(join(root, 'scripts/rotina'), join(dir, 'scripts/rotina'), { recursive: true });
  mkdirSync(join(home, 'bin'));
  const systemctl = join(home, 'bin/systemctl');
  writeFileSync(systemctl, '#!/bin/sh\nexit 0\n'); chmodSync(systemctl, 0o700);
  const r = run('bash', [join(root, 'scripts/rotina/instalar.sh')], dir,
    { HOME: home, PATH: join(home, 'bin') + ':' + process.env.PATH });
  assert.equal(r.status, 0, r.stderr);
  const unit = read(join(home, '.config/systemd/user/fast-gravacoes-rotina.service'));
  const escaped = dir.replaceAll('\\', '\\\\').replaceAll('"', '\\"').replaceAll('%', '%%');
  assert.ok(unit.includes(`Environment="FG_REPO=${escaped}"`));
  assert.equal(read(join(home, '.local/share/fast-gravacoes-rotina/rotina.mjs')), read(join(root, 'scripts/rotina/rotina.mjs')));
});
