// Testes do audit gate — `node --test scripts/audit-gate.test.mjs`.
// O gate roda `npm audit --json`; aqui um `npm` falso no PATH devolve o JSON do cenário.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, chmodSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const GATE = join(dirname(fileURLToPath(import.meta.url)), 'audit-gate.mjs');
const ZOD = 'https://github.com/advisories/GHSA-mrhx-c7xc-m3w5';
const BRACES = 'https://github.com/advisories/GHSA-vfj7-8cjw-p6xm';

function runGate(stdout, { exit = 1 } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'audit-gate-'));
  try {
    writeFileSync(join(dir, 'out.json'), stdout);
    const fake = join(dir, 'npm');
    writeFileSync(fake, `#!/bin/sh\ncat "${join(dir, 'out.json')}"\nexit ${exit}\n`);
    chmodSync(fake, 0o755);
    const res = spawnSync(process.execPath, [GATE], {
      encoding: 'utf8',
      env: { ...process.env, PATH: `${dir}:${process.env.PATH}` },
    });
    return { code: res.status, out: `${res.stdout}${res.stderr}` };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const audit = (vulnerabilities) => JSON.stringify({ vulnerabilities, metadata: { vulnerabilities: {} } });
const vuln = (severity, via) => ({ severity, via });
const adv = (url, source = 1) => ({ source, url, title: 't', severity: 'high' });

test('advisory isento passa', () => {
  const r = runGate(audit({ zod: vuln('high', [adv(ZOD, 1243066)]) }));
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /↷ zod/);
});

test('source renumerado pelo npm com a mesma GHSA continua isento', () => {
  const r = runGate(audit({ zod: vuln('high', [adv(ZOD, 9999999)]) }));
  assert.equal(r.code, 0, r.out);
});

test('GHSA em caixa diferente na URL continua isenta', () => {
  const r = runGate(audit({ zod: vuln('high', [adv(ZOD.toUpperCase().replace('HTTPS://GITHUB.COM/ADVISORIES/', 'https://github.com/advisories/'))]) }));
  assert.equal(r.code, 0, r.out);
});

test('GHSA nova em pacote isento reprova', () => {
  const r = runGate(audit({ zod: vuln('high', [adv(ZOD), adv('https://github.com/advisories/GHSA-aaaa-bbbb-cccc')]) }));
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, /✗ zod \[high\]/);
});

test('mesmo source antigo com outra GHSA reprova (source não é mais a chave)', () => {
  const r = runGate(audit({ zod: vuln('high', [adv('https://github.com/advisories/GHSA-aaaa-bbbb-cccc', 1243066)]) }));
  assert.equal(r.code, 1, r.out);
});

test('via sem URL ou com URL que não é GHSA reprova (falha fechada)', () => {
  for (const via of [{ source: 1243066 }, { source: 1, url: '' }, { source: 1, url: 'https://example.com/zod' }, null]) {
    const r = runGate(audit({ zod: vuln('high', [via]) }));
    assert.equal(r.code, 1, JSON.stringify(via) + r.out);
  }
});

test('GHSA de outro pacote não isenta este', () => {
  const r = runGate(audit({ zod: vuln('high', [adv(BRACES)]) }));
  assert.equal(r.code, 1, r.out);
});

test('cadeia transitiva: via string só passa se o pacote citado também é isento', () => {
  const ok = runGate(audit({ braces: vuln('high', [adv(BRACES)]), micromatch: vuln('high', ['braces']) }));
  assert.equal(ok.code, 0, ok.out);
  const bad = runGate(audit({ micromatch: vuln('high', ['pacote-desconhecido']) }));
  assert.equal(bad.code, 1, bad.out);
});

test('pacote fora da allowlist reprova em high e critical; moderate só informa', () => {
  assert.equal(runGate(audit({ lodash: vuln('high', [adv(ZOD)]) })).code, 1);
  assert.equal(runGate(audit({ lodash: vuln('critical', [adv(ZOD)]) })).code, 1);
  const r = runGate(audit({ lodash: vuln('moderate', [adv(ZOD)]) }));
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /• lodash \(moderate\)/);
});

test('via vazio ou ausente em pacote isento reprova', () => {
  assert.equal(runGate(audit({ zod: vuln('high', []) })).code, 1);
  assert.equal(runGate(audit({ zod: { severity: 'high' } })).code, 1);
});

test('auditoria que não rodou não é "zero vulnerabilidades"', () => {
  assert.equal(runGate('').code, 1);
  assert.equal(runGate('{ nao é json').code, 1);
  assert.equal(runGate(JSON.stringify({ error: { code: 'ENOAUDIT' } })).code, 1);
  assert.equal(runGate(JSON.stringify({ metadata: {} })).code, 1);
});

test('sem vulnerabilidades passa e lista exceções sem uso', () => {
  const r = runGate(audit({}), { exit: 0 });
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /exceção\(ões\) sem uso neste run .*zod/);
});
