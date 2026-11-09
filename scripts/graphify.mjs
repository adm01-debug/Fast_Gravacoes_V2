#!/usr/bin/env node
// Keep graph tooling outside the Vite runtime and never interpret user input as shell code.
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
let config;
try {
  config = JSON.parse(readFileSync(join(root, 'graphify.config.json'), 'utf8'));
} catch (err) {
  console.error('[graphify] graphify.config.json ausente ou inválido na raiz do repo:');
  console.error(`  ${err.message}`);
  console.error('  Verifique se o arquivo existe em:', join(root, 'graphify.config.json'));
  process.exit(1);
}
const localPython = join(root, '.venv-graphify', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python');
const args = process.argv.slice(2);

function run(command, argv) {
  // PYTHONHASHSEED fixo: a ordem de iteração de sets muda entre processos e fazia dois builds
  // do mesmo commit darem comunidades (e graph.json/GRAPH_REPORT.md) diferentes.
  const result = spawnSync(command, argv, {
    cwd: root,
    stdio: 'inherit',
    shell: false,
    env: { ...process.env, PYTHONHASHSEED: process.env.PYTHONHASHSEED ?? '0' },
  });
  if (result.error) throw result.error;
  // status null = filho morto por sinal: nunca sair 0.
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function resolveInterpreter() {
  const explicitly = process.env.GRAPHIFY_PYTHON;
  if (explicitly) {
    // Falha clara, não fallback silencioso: o usuário apontou um Python
    // que deve ter o graphify — se não, queremos saber, não tentar outro.
    const probe = spawnSync(explicitly, ['-c', 'import importlib.metadata as m; print(m.version("graphifyy"))'], { encoding: 'utf8', shell: false });
    if (probe.error) {
      throw new Error(`GRAPHIFY_PYTHON não pôde ser executado (${explicitly}): ${probe.error.message}`);
    }
    if (probe.status === 0 && probe.stdout.trim() === config.version) {
      return explicitly;
    }
    throw new Error(
      `GRAPHIFY_PYTHON (${explicitly}) não tem graphify ${config.version} instalado ` +
      `(stdout: ${probe.stdout.trim() || '(vazio)'}). Rode npm run graph:install ou aponte para outro venv.`,
    );
  }
  return null;
}

function interpreter() {
  const forced = resolveInterpreter();
  if (forced) return forced;

  // An explicitly configured interpreter must succeed; do not silently use another version.
  const candidates = [localPython];
  const which = spawnSync(process.platform === 'win32' ? 'where' : 'which', ['graphify'], { encoding: 'utf8' });
  const bin = which.status === 0 ? which.stdout.trim().split(/\r?\n/)[0] : '';
  if (bin && existsSync(bin)) {
    const shebang = readFileSync(bin, 'utf8').split(/\r?\n/)[0];
    if (/^#!\/[\w/ .@+-]+$/.test(shebang)) candidates.push(shebang.slice(2));
  }
  candidates.push('python3', 'python');
  for (const candidate of candidates) {
    const probe = spawnSync(candidate, ['-c', 'import importlib.metadata as m; print(m.version("graphifyy"))'], { encoding: 'utf8', shell: false });
    if (probe.status === 0 && probe.stdout.trim() === config.version) return candidate;
  }
  throw new Error(`Graphify ${config.version} indisponível. Rode: npm run graph:install (para criar .venv-graphify) ou defina GRAPHIFY_PYTHON apontando para um Python com graphify ${config.version}.`);
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
  } else if (args[0] === '--version' || args[0] === '-v') {
    console.log(`graphify wrapper (npm) — alvo: graphify ${config.version}`);
    console.log(`venv local: ${existsSync(localPython) ? localPython : '(não instalado — rode npm run graph:install)'}`);
  } else if (args[0] === '--help' || args[0] === '-h') {
    console.log(`Uso: node scripts/graphify.mjs <comando> [args...]
Comandos disponíveis: ${['doctor', 'detect', 'build', 'check', 'query', 'path', 'explain', 'affected', 'html', 'test', 'audit', 'ratchet', 'diff', 'benchmark'].join(', ')}
Instalação: npm run graph:install
Diagnóstico: npm run graph:doctor
Versão: node scripts/graphify.mjs --version`);
  } else {
    run(interpreter(), [join(root, 'scripts/graphify/run.py'), ...args]);
  }
} catch (error) {
  console.error(`[graphify] ${error.message}`);
  console.error('[graphify] Se o problema for ambiente, tente: npm run graph:install');
  process.exitCode = 1;
}
