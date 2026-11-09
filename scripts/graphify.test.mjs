// Testes do wrapper Node do graphify — `node --test scripts/graphify.test.mjs`.
// Um "python" falso (GRAPHIFY_PYTHON) responde à sonda de versão e ecoa o que recebeu.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, chmodSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const WRAPPER = join(HERE, 'graphify.mjs');
const VERSION = JSON.parse(readFileSync(join(HERE, '..', 'graphify.config.json'), 'utf8')).version;

function withFake(fn, { version = VERSION } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'graphify wrapper-'));
  const fake = join(dir, 'python');
  writeFileSync(fake, `#!/bin/sh
if [ "$1" = "-c" ]; then echo "${version}"; exit 0; fi
shift
echo "SEED=$PYTHONHASHSEED"
for a in "$@"; do echo "ARG=[$a]"; done
exit "\${FAKE_EXIT:-0}"
`);
  chmodSync(fake, 0o755);
  const run = (args, env = {}) => {
    const { PYTHONHASHSEED: _s, GRAPHIFY_PYTHON: _g, ...base } = process.env;
    const r = spawnSync(process.execPath, [WRAPPER, ...args], { encoding: 'utf8', cwd: tmpdir(), env: { ...base, GRAPHIFY_PYTHON: fake, ...env } });
    return { code: r.status, out: `${r.stdout}${r.stderr}` };
  };
  try { fn(run); } finally { rmSync(dir, { recursive: true, force: true }); }
}

test('fixa PYTHONHASHSEED=0 para o build ser determinístico; respeita valor explícito', () => withFake((run) => {
  assert.match(run(['build']).out, /^SEED=0$/m);
  assert.match(run(['build'], { PYTHONHASHSEED: '42' }).out, /^SEED=42$/m);
}));

test('repassa argumentos intactos, sem shell', () => withFake((run) => {
  const r = run(['query', 'a b', '--budget', '1500', 'x"y; echo $HOME `id`']);
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /^ARG=\[query\]$/m);
  assert.match(r.out, /^ARG=\[a b\]$/m);
  assert.match(r.out, /^ARG=\[x"y; echo \$HOME `id`\]$/m);
}));

test('propaga o código de saída do Python', () => withFake((run) => {
  assert.equal(run(['check'], { FAKE_EXIT: '1' }).code, 1);
  assert.equal(run(['check'], { FAKE_EXIT: '2' }).code, 2);
  assert.equal(run(['check']).code, 0);
}));

test('interpretador apontado com versão errada ou inexistente falha com mensagem clara', () => {
  withFake((run) => {
    const r = run(['doctor']);
    assert.equal(r.code, 1, r.out);
    assert.match(r.out, /não tem graphify/);
  }, { version: '0.0.1' });
  withFake((run) => {
    const r = run(['doctor'], { GRAPHIFY_PYTHON: '/nao/existe/python' });
    assert.equal(r.code, 1, r.out);
    assert.match(r.out, /não pôde ser executado/);
  });
});

test('--version e --help não chamam o Python, e o help só cita comando que existe', () => withFake((run) => {
  const v = run(['--version']);
  assert.equal(v.code, 0, v.out);
  assert.match(v.out, new RegExp(`graphify ${VERSION.replaceAll('.', '\\.')}`));
  assert.doesNotMatch(v.out, /SEED=/);
  const h = run(['--help']);
  assert.equal(h.code, 0, h.out);
  assert.doesNotMatch(h.out, /graph:doctor -- --version/);
  assert.match(h.out, /graphify\.mjs --version/);
}));
