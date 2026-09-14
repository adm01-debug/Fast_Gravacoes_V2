#!/usr/bin/env node
// Keep graph tooling outside the Vite runtime and never interpret user input as shell code.
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const config = JSON.parse(readFileSync(join(root, 'graphify.config.json'), 'utf8'));
const localPython = join(root, '.venv-graphify', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python');
const args = process.argv.slice(2);

function run(command, argv) {
  const result = spawnSync(command, argv, { cwd: root, stdio: 'inherit', shell: false });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function interpreter() {
  // An explicitly configured interpreter must succeed; do not silently use another version.
  const candidates = process.env.GRAPHIFY_PYTHON
    ? [process.env.GRAPHIFY_PYTHON]
    : [localPython];
  if (!process.env.GRAPHIFY_PYTHON) {
    const which = spawnSync(process.platform === 'win32' ? 'where' : 'which', ['graphify'], { encoding: 'utf8' });
    const bin = which.status === 0 ? which.stdout.trim().split(/\r?\n/)[0] : '';
    if (bin && existsSync(bin)) {
      const shebang = readFileSync(bin, 'utf8').split(/\r?\n/)[0];
      if (/^#!\/[\w/ .@+-]+$/.test(shebang)) candidates.push(shebang.slice(2));
    }
    candidates.push('python3', 'python');
  }
  for (const candidate of candidates) {
    const probe = spawnSync(candidate, ['-c', 'import importlib.metadata as m; print(m.version("graphifyy"))'], { encoding: 'utf8', shell: false });
    if (probe.status === 0 && probe.stdout.trim() === config.version) return candidate;
  }
  throw new Error(`Graphify ${config.version} indisponível. Execute npm run graph:install ou configure GRAPHIFY_PYTHON.`);
}

try {
  if (args[0] === 'install') {
    const hasUv = spawnSync('uv', ['--version'], { stdio: 'ignore' }).status === 0;
    if (hasUv) {
      run('uv', ['venv', '--allow-existing', '--python', '3.11', join(root, '.venv-graphify')]);
      run('uv', ['pip', 'sync', '--python', localPython, '--require-hashes', join(root, 'scripts/graphify/requirements.lock')]);
    } else {
      if (!existsSync(localPython)) run(process.platform === 'win32' ? 'python' : 'python3', ['-m', 'venv', join(root, '.venv-graphify')]);
      run(localPython, ['-m', 'pip', 'install', '--require-hashes', '-r', join(root, 'scripts/graphify/requirements.lock')]);
    }
    run(localPython, [join(root, 'scripts/graphify/run.py'), 'doctor']);
  } else {
    run(interpreter(), [join(root, 'scripts/graphify/run.py'), ...args]);
  }
} catch (error) {
  console.error(`[graphify] ${error.message}`);
  process.exitCode = 1;
}
