// Testes do guard de integridade do AGENTS.md — `node --test scripts/ci/check-claude-md-integrity.test.mjs`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync, execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, copyFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const SECOES = ['Postura', 'Bugs e funcionalidades', 'Comunicação', 'Nunca', 'Fluxo Git', 'Banco', 'Serviços', 'Stack e comandos', 'Grafo de código'];
const agents = (corpo = 'regra '.repeat(40)) => SECOES.map((s) => `## ${s}\n\n${corpo}\n`).join('\n');
const DOC = 'detalhe '.repeat(200);

function repo(extra = {}) {
  const root = mkdtempSync(join(tmpdir(), 'guard agentes-'));
  const git = (...a) => execFileSync('git', a, { cwd: root, stdio: 'pipe', encoding: 'utf8' });
  const write = (rel, body) => { mkdirSync(dirname(join(root, rel)), { recursive: true }); writeFileSync(join(root, rel), body); };
  mkdirSync(join(root, 'scripts', 'ci'), { recursive: true });
  copyFileSync(join(HERE, 'check-claude-md-integrity.mjs'), join(root, 'scripts', 'ci', 'check-claude-md-integrity.mjs'));
  write('AGENTS.md', agents());
  write('CLAUDE.md', '@AGENTS.md\n');
  write('docs/agentes/banco.md', DOC);
  write('docs/agentes/github-ci.md', DOC);
  for (const [rel, body] of Object.entries(extra)) write(rel, body);
  git('init', '-q', '-b', 'main');
  git('-c', 'user.name=t', '-c', 'user.email=t@t', 'add', '-A');
  git('-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-q', '-m', 'base');
  const run = (env = {}, cwd = root) => {
    const { CLAUDE_MD_BASE: _b, ...base } = process.env;
    const r = spawnSync(process.execPath, [join(root, 'scripts', 'ci', 'check-claude-md-integrity.mjs')], { cwd, encoding: 'utf8', env: { ...base, ...env } });
    return { code: r.status, out: `${r.stdout}${r.stderr}` };
  };
  return { root, write, run, rm: (rel) => rmSync(join(root, rel), { recursive: true }), done: () => rmSync(root, { recursive: true, force: true }) };
}
const com = (fn, extra) => { const r = repo(extra); try { fn(r); } finally { r.done(); } };

test('estado íntegro passa, com e sem base explícita, e de qualquer cwd', () => com((r) => {
  assert.equal(r.run().code, 0);
  assert.equal(r.run({ CLAUDE_MD_BASE: 'HEAD' }).code, 0);
  assert.equal(r.run({ CLAUDE_MD_BASE: 'main' }).code, 0);
  assert.equal(r.run({}, tmpdir()).code, 0);
  assert.equal(r.run({}, join(r.root, 'docs')).code, 0);
}));

test('AGENTS.md ausente ou sem seção obrigatória reprova', () => com((r) => {
  r.write('AGENTS.md', agents().replace('## Banco', '## Bancos de dados'));
  const semSecao = r.run();
  assert.equal(semSecao.code, 1);
  assert.match(semSecao.out, /secao obrigatoria ausente: ## Banco/);
  r.rm('AGENTS.md');
  assert.equal(r.run().code, 1);
}));

test('wipe do conjunto ou de um arquivo reprova', () => com((r) => {
  r.write('AGENTS.md', agents(''));
  assert.equal(r.run().code, 1, 'AGENTS.md reduzido a títulos');
}));

test('doc apagado ou esvaziado reprova, inclusive com espaço, acento e .MD no nome', () => {
  for (const nome of ['banco.md', 'guia de deploy.md', 'migração.md', 'LEIAME.MD']) {
    com((r) => {
      r.rm(`docs/agentes/${nome}`);
      const apagado = r.run();
      assert.equal(apagado.code, 1, `${nome} apagado: ${apagado.out}`);
      assert.match(apagado.out, /sumiu/);
    }, { [`docs/agentes/${nome}`]: DOC });
    com((r) => {
      r.write(`docs/agentes/${nome}`, 'x');
      assert.equal(r.run().code, 1, `${nome} esvaziado`);
    }, { [`docs/agentes/${nome}`]: DOC });
  }
});

test('subpasta em docs/agentes não vira falso "encolheu"', () => com((r) => {
  const ok = r.run();
  assert.equal(ok.code, 0, ok.out);
  r.rm('docs/agentes/sub/extra.md');
  assert.equal(r.run().code, 1, 'apagar doc de subpasta é pego');
}, { 'docs/agentes/sub/extra.md': DOC.repeat(6) }));

test('base explícita que não resolve reprova (antes passava verde com tudo apagado)', () => com((r) => {
  r.write('AGENTS.md', agents(''));
  r.rm('docs/agentes');
  for (const base of ['origin/mian', 'nao-existe', '--help']) {
    const res = r.run({ CLAUDE_MD_BASE: base });
    assert.equal(res.code, 1, `${base}: ${res.out}`);
    assert.match(res.out, /nao resolve para um commit/);
  }
}));

test('CLAUDE_MD_BASE não é interpretada pelo shell', () => com((r) => {
  const alvo = join(r.root, 'injetado');
  const res = r.run({ CLAUDE_MD_BASE: `HEAD; touch ${alvo}` });
  assert.equal(res.code, 1);
  assert.equal(existsSync(alvo), false);
}));

test('crescer ou criar doc novo passa', () => com((r) => {
  r.write('docs/agentes/novo.md', DOC);
  r.write('AGENTS.md', agents('regra '.repeat(80)));
  assert.equal(r.run().code, 0);
}));
