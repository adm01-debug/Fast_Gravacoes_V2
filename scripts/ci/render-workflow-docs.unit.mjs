// Testes do gerador da documentação dos workflows. Roda com: node --test 'scripts/ci/*.unit.mjs'
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { spawnSync } from 'node:child_process';

const RAIZ = path.resolve(import.meta.dirname, '..', '..');
const SCRIPT = path.join(RAIZ, 'scripts/ci/render-workflow-docs.mjs');
const README = path.join(RAIZ, 'docs/ci/README.md');
const DIR_WF = path.join(RAIZ, '.github/workflows');

const rodar = (args = []) => spawnSync(process.execPath, [SCRIPT, ...args], { cwd: RAIZ, encoding: 'utf8' });

test('--check passa: o README commitado bate com os blocos # docs: dos workflows', () => {
  const r = rodar(['--check']);
  assert.equal(r.status, 0, `--check falhou:\n${r.stdout}\n${r.stderr}`);
  assert.match(r.stdout, /OK: docs\/ci\/README\.md bate com os \d+ workflows/);
});

test('workflow sem bloco # docs: é aviso, não erro — e aparece no README', () => {
  const r = rodar(['--check']);
  const semBloco = [...r.stderr.matchAll(/sem bloco '# docs:' no topo: (.+)/g)]
    .flatMap((m) => m[1].split(',').map((s) => s.trim()));
  // Hoje há workflow herdado sem bloco; se um dia todos tiverem, o aviso desaparece
  // e os dois lados deste teste continuam válidos.
  if (semBloco.length === 0) return;
  assert.equal(r.status, 0, 'ausência de bloco não pode travar o gerador');
  const readme = fs.readFileSync(README, 'utf8');
  assert.match(readme, /## Workflows sem bloco `# docs:`/);
  for (const arquivo of semBloco) {
    assert.ok(readme.includes(arquivo), `${arquivo} não está listado no README`);
  }
});

test('todo workflow com bloco # docs: declara os quatro campos', () => {
  // O gerador sai 1 quando um bloco existe mas está incompleto; --check verde já garante
  // isso. Aqui a checagem é direta, para a mensagem de falha apontar o arquivo.
  const campos = ['gatilho', 'prova', 'falha', 'avisa'];
  for (const arquivo of fs.readdirSync(DIR_WF).filter((f) => f.endsWith('.yml'))) {
    const texto = fs.readFileSync(path.join(DIR_WF, arquivo), 'utf8');
    if (!/^#\s*docs:\s*$/m.test(texto)) continue;
    for (const campo of campos) {
      assert.match(texto, new RegExp(`^#\\s+${campo}:\\s*\\S`, 'm'), `${arquivo} sem o campo ${campo}`);
    }
  }
});

test('cada campo do bloco cabe em UMA linha (o extrator para na primeira continuação)', () => {
  for (const arquivo of fs.readdirSync(DIR_WF).filter((f) => f.endsWith('.yml'))) {
    const linhas = fs.readFileSync(path.join(DIR_WF, arquivo), 'utf8').split('\n');
    let dentro = false;
    for (const linha of linhas) {
      if (/^#\s*(docs|nao-e-bug):\s*$/.test(linha)) { dentro = true; continue; }
      if (!dentro) continue;
      if (/^#\s*$/.test(linha)) continue;
      if (!linha.startsWith('#')) break;
      assert.match(
        linha,
        /^#\s+(-\s+)?[^:]+:\s*\S/,
        `${arquivo}: linha de continuação no bloco encerra o extrator — junte numa linha só:\n${linha}`,
      );
    }
  }
});

test('o README avisa que é gerado e não deve ser editado à mão', () => {
  const readme = fs.readFileSync(README, 'utf8');
  assert.match(readme, /Gerado por `scripts\/ci\/render-workflow-docs\.mjs`/);
  assert.match(readme, /Não edite à mão/);
});

test('todo workflow da tabela tem link para o arquivo que existe', () => {
  const readme = fs.readFileSync(README, 'utf8');
  const links = [...readme.matchAll(/\]\(\.\.\/\.\.\/\.github\/workflows\/([\w.-]+)\)/g)].map((m) => m[1]);
  assert.ok(links.length > 0, 'README sem nenhum link de workflow');
  for (const arquivo of new Set(links)) {
    assert.ok(fs.existsSync(path.join(DIR_WF, arquivo)), `README aponta para ${arquivo}, que não existe`);
  }
});
