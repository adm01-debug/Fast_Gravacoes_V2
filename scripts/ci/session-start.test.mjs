// Testes do hook de início de sessão (.claude/hooks/session-start.sh) —
// `node --test scripts/ci/session-start.test.mjs`. `npm` é um stub: nada é instalado nem construído.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync, execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, copyFileSync, chmodSync, symlinkSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HOOK = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '.claude', 'hooks', 'session-start.sh');
const which = (bin) => execFileSync('sh', ['-c', `command -v ${bin}`], { encoding: 'utf8' }).trim();

function fixture({ flock = true } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'session start-')); // espaço de propósito
  const git = (...a) => execFileSync('git', a, { cwd: root, encoding: 'utf8', stdio: 'pipe' });
  mkdirSync(join(root, '.claude', 'hooks'), { recursive: true });
  mkdirSync(join(root, 'src'));
  copyFileSync(HOOK, join(root, '.claude', 'hooks', 'session-start.sh'));
  writeFileSync(join(root, 'src', 'a.ts'), 'export const a = 1;\n');
  writeFileSync(join(root, '.gitignore'), 'graphify-out/\nbin/\n');
  git('init', '-q', '-b', 'main');
  git('-c', 'user.name=t', '-c', 'user.email=t@t', 'add', '-A');
  git('-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-q', '-m', 'base');
  // PATH só com o necessário: dá para tirar o flock e trocar o npm por um stub.
  const bin = join(root, 'bin');
  mkdirSync(bin);
  for (const tool of ['bash', 'sh', 'git', 'date', 'mkdir', 'cat', 'rm', 'dirname', ...(flock ? ['flock'] : [])]) {
    symlinkSync(which(tool), join(bin, tool));
  }
  writeFileSync(join(bin, 'npm'), `#!/bin/sh
echo "npm $*" >> "$NPM_LOG"
if [ "$2" = "graph:build" ]; then
  [ -n "$BUILD_FAILS" ] && exit 1
  mkdir -p graphify-out && echo '{}' > graphify-out/graph.json && echo '# r' > graphify-out/GRAPH_REPORT.md
fi
exit 0
`);
  chmodSync(join(bin, 'npm'), 0o755);
  const npmLog = join(root, 'bin', 'npm.log');
  const run = ({ cwd = root, env = {} } = {}) => {
    const r = spawnSync(join(bin, 'bash'), [join(root, '.claude', 'hooks', 'session-start.sh')], {
      cwd, encoding: 'utf8',
      env: { PATH: bin, HOME: root, NPM_LOG: npmLog, CLAUDE_CODE_REMOTE: 'true', CLAUDE_PROJECT_DIR: root, ...env },
    });
    return { code: r.status, out: `${r.stdout}${r.stderr}` };
  };
  const calls = () => (existsSync(npmLog) ? readFileSync(npmLog, 'utf8').trim().split('\n').filter(Boolean) : []);
  const log = () => readFileSync(join(root, 'graphify-out', '.session-start.log'), 'utf8');
  const head = git('rev-parse', 'HEAD').trim();
  return { root, run, calls, log, head, done: () => rmSync(root, { recursive: true, force: true }) };
}
const com = (fn, opts) => { const f = fixture(opts); try { fn(f); } finally { f.done(); } };

test('fora da nuvem não faz nada', () => com((f) => {
  const r = f.run({ env: { CLAUDE_CODE_REMOTE: '' } });
  assert.equal(r.code, 0);
  assert.equal(r.out, '');
  assert.equal(existsSync(join(f.root, 'graphify-out')), false);
}));

test('primeira sessão: declara async, instala, constrói e carimba o commit', () => com((f) => {
  const r = f.run();
  assert.equal(r.code, 0, r.out);
  assert.deepEqual(JSON.parse(r.out.trim()), { async: true, asyncTimeout: 900000 });
  assert.deepEqual(f.calls(), ['npm run graph:install', 'npm run graph:build']);
  assert.equal(readFileSync(join(f.root, 'graphify-out', '.session-built-commit'), 'utf8').trim(), f.head);
}));

test('grafo já carimbado e árvore limpa: nada a fazer', () => com((f) => {
  f.run();
  f.run();
  assert.equal(f.calls().length, 2, 'não reinstala nem reconstrói');
  assert.match(f.log(), /nada a fazer/);
}));

test('edição não commitada invalida a marca: reconstrói', () => com((f) => {
  f.run();
  writeFileSync(join(f.root, 'src', 'a.ts'), 'export const a = 2;\n');
  f.run();
  assert.equal(f.calls().filter((c) => c === 'npm run graph:build').length, 2);
  writeFileSync(join(f.root, 'src', 'novo.ts'), 'export const n = 1;\n');
  f.run();
  assert.equal(f.calls().filter((c) => c === 'npm run graph:build').length, 3, 'arquivo novo não rastreado também conta');
}));

test('sem flock no PATH o hook segue e gera o grafo', () => com((f) => {
  const r = f.run();
  assert.equal(r.code, 0, r.out);
  assert.deepEqual(f.calls(), ['npm run graph:install', 'npm run graph:build']);
  assert.match(f.log(), /flock indisponível/);
  assert.doesNotMatch(f.log(), /outro session-start já está rodando/);
}, { flock: false }));

test('sem CLAUDE_PROJECT_DIR usa a raiz do repo do próprio hook, não o cwd', () => com((f) => {
  const r = f.run({ cwd: join(f.root, 'src'), env: { CLAUDE_PROJECT_DIR: '' } });
  assert.equal(r.code, 0, r.out);
  assert.equal(existsSync(join(f.root, 'src', 'graphify-out')), false);
  assert.equal(existsSync(join(f.root, 'graphify-out', 'graph.json')), true);
}));

test('build que falha não carimba (a próxima sessão refaz)', () => com((f) => {
  const r = f.run({ env: { BUILD_FAILS: '1' } });
  assert.notEqual(r.code, 0);
  assert.equal(existsSync(join(f.root, 'graphify-out', '.session-built-commit')), false);
  f.run();
  assert.equal(readFileSync(join(f.root, 'graphify-out', '.session-built-commit'), 'utf8').trim(), f.head);
}));
