/**
 * Testes de unidade dos scripts de bundle (bundle-report.mjs/bundle-diff.mjs)
 * usando node:test (stdlib, sem devDependency nova).
 *
 * Cenários cobertos (gaps 1-3):
 *  - hashes Vite de 8/16/20 chars, hash com '-' interno, sem hash
 *  - entrypoints com prefixo exato ('/' nao casa 'index-page'/'auth-index')
 *  - validacao de schema com erro claro e diff com novos/removidos/fileCount
 *
 * Uso: node scripts/bundle.test.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, copyFileSync, symlinkSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chunkNameFromFile, collectViolations, collectStaleBudgets, validateBudget, DEFAULT_BUDGET } from './bundle-report.mjs';
import { validateReport, buildDiffMarkdown } from './bundle-diff.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));

// --- bundle-report chunkNameFromFile ---

test('remove hash Vite de 8 chars', () => {
  assert.equal(chunkNameFromFile('assets/index-DOFT_EvZ.js'), 'index');
  assert.equal(chunkNameFromFile('assets/DesignSystemPage-DOFT_EvZ.js'), 'DesignSystemPage');
});

test('remove hash Vite de 16 chars (configuravel)', () => {
  assert.equal(chunkNameFromFile('assets/auth-page-0123456789abcdef.js'), 'auth-page');
  assert.equal(chunkNameFromFile('assets/lib-excel-abcdefABCDEF1234.js'), 'lib-excel');
});

test('nao come o nome quando o chunk tem multiplos dash segments', () => {
  assert.equal(chunkNameFromFile('assets/lib-mermaid-DaoJtfZi.js'), 'lib-mermaid');
  assert.equal(chunkNameFromFile('assets/lib-html2canvas-n554ndwg.js'), 'lib-html2canvas');
  assert.equal(chunkNameFromFile('assets/vendor-utils-BIKpVrZC.js'), 'vendor-utils');
});

test('aceita hash com "-" interno (base64url) e tamanho 20', () => {
  assert.equal(chunkNameFromFile('assets/vendor-sentry-BEJV-VmE.js'), 'vendor-sentry');
  assert.equal(chunkNameFromFile('assets/app-abcdefghijklmnopqrst.js'), 'app'); // 20
});

test('devolve o nome inteiro quando nao ha hash (segmento curto nao e hash)', () => {
  assert.equal(chunkNameFromFile('assets/index.css'), 'index');
  assert.equal(chunkNameFromFile('assets/lib-excel-BCDEFG.js'), 'lib-excel-BCDEFG'); // 6 chars
});

// --- bundle-report collectViolations ---

const budget = {
  defaults: { maxChunkKb: 350, maxAssetKb: 500, maxTotalKb: 6000 },
  chunks: { 'lib-mermaid': 900, 'vendor-react': 180 },
  entrypoints: { '/': 800 },
};

test('violacao de chunk por nome agrupado', () => {
  const files = [
    { file: 'assets/lib-mermaid-DaoJtfZi.js', chunk: 'lib-mermaid', gzipKb: 901 },
    { file: 'assets/index-x.js', chunk: 'index', gzipKb: 1 }, // entrypoint real do build
  ];
  const v = collectViolations(files, budget);
  assert.equal(v.length, 1);
  assert.match(v[0], /lib-mermaid/);
});

test('sem violacao quando dentro do limite', () => {
  const files = [
    { file: 'assets/vendor-react-x.js', chunk: 'vendor-react', gzipKb: 100 },
    { file: 'assets/index-x.js', chunk: 'index', gzipKb: 1 },
  ];
  assert.deepEqual(collectViolations(files, budget), []);
});

test('usa limite default (maxChunkKb) para chunk nao listado', () => {
  const files = [
    { file: 'assets/foo-bar.js', chunk: 'foo', gzipKb: 400 },
    { file: 'assets/index-x.js', chunk: 'index', gzipKb: 1 },
  ];
  const v = collectViolations(files, budget);
  assert.equal(v.length, 1);
  assert.match(v[0], /350/);
});

test('funciona sem bundle-budget.json (DEFAULT_BUDGET)', () => {
  const files = [{ file: 'assets/app-x.js', chunk: 'app', gzipKb: 100 }];
  assert.deepEqual(collectViolations(files, DEFAULT_BUDGET), []);
});

// --- bundle-report entrypoints (prefixo exato) ---

test("rota '/' nao captura index-page/auth-index (prefixo exato)", () => {
  const files = [
    { file: 'assets/index-x.js', chunk: 'index', gzipKb: 100 },
    { file: 'assets/index-page.js', chunk: 'index-page', gzipKb: 100 },
    { file: 'assets/auth-index.js', chunk: 'auth-index', gzipKb: 100 },
  ];
  assert.deepEqual(
    collectViolations(files, { defaults: {}, chunks: {}, entrypoints: { '/': 800 } }),
    [],
  );
});

test('entrypoint soma os chunks do prefixo e viola se exceder', () => {
  const files = [
    { file: 'assets/index-x.js', chunk: 'index', gzipKb: 500 },
    { file: 'assets/index-extra.js', chunk: 'index-extra', gzipKb: 400 },
  ];
  const v = collectViolations(files, { defaults: {}, chunks: {}, entrypoints: { '/': 800 } });
  assert.equal(v.length, 1);
  assert.match(v[0], /900/);
});

test('entrypointChunks explicito casa nomes exatos (nao prefixo)', () => {
  const files = [
    { file: 'assets/AuthPage-x.js', chunk: 'AuthPage', gzipKb: 200 },
    { file: 'assets/auth-index.js', chunk: 'auth-index', gzipKb: 300 },
  ];
  // /auth declara explicitamente AuthPage; auth-index deve ser ignorado
  const v = collectViolations(files, {
    defaults: {},
    chunks: {},
    entrypoints: { '/auth': 350 },
    entrypointChunks: { '/auth': ['AuthPage'] },
  });
  assert.deepEqual(v, []);
  // estourando o limite do mapa explicito
  const v2 = collectViolations(
    [{ file: 'assets/AuthPage-x.js', chunk: 'AuthPage', gzipKb: 400 }],
    { defaults: {}, chunks: {}, entrypoints: { '/auth': 350 }, entrypointChunks: { '/auth': ['AuthPage'] } },
  );
  assert.equal(v2.length, 1);
  assert.match(v2[0], /soma 400KB/);
});

test('alerta quando entrypointChunks nao casa nenhum chunk do build', () => {
  const files = [{ file: 'assets/foo-x.js', chunk: 'foo', gzipKb: 10 }];
  const v = collectViolations(files, {
    defaults: {},
    chunks: {},
    entrypoints: { '/auth': 350 },
    entrypointChunks: { '/auth': ['AuthPage'] },
  });
  assert.equal(v.length, 1);
  assert.match(v[0], /nenhum chunk do build corresponde a \["AuthPage"\]/);
});

test('alerta quando fallback prefixo nao casa nenhum chunk (budget de rota inativo)', () => {
  const files = [{ file: 'assets/foo-x.js', chunk: 'foo', gzipKb: 10 }];
  const v = collectViolations(files, { defaults: {}, chunks: {}, entrypoints: { '/auth': 350 } });
  assert.equal(v.length, 1);
  assert.match(v[0], /nenhum chunk casa com "auth"/);
});

test('case-insensitive: uppercase no mapa casa chunk lowercase', () => {
  const files = [{ file: 'assets/authpage-x.js', chunk: 'authpage', gzipKb: 10 }];
  const v = collectViolations(files, {
    defaults: {},
    chunks: {},
    entrypoints: { '/auth': 350 },
    entrypointChunks: { '/auth': ['AuthPage'] },
  });
  assert.deepEqual(v, []);
});

// --- bundle-diff validateReport ---

test('aceita relatorio valido', () => {
  const valid = { totals: { gzipKb: 100 }, files: [{ file: 'a.js', chunk: 'a', gzipKb: 10 }] };
  assert.doesNotThrow(() => validateReport(valid, 'head'));
});

test('rejeita null/array com erro claro', () => {
  assert.throws(() => validateReport(null, 'head'), /object JSON válido/);
  assert.throws(() => validateReport([], 'head'), /object JSON válido/);
});

test('rejeita falta de totals/files', () => {
  assert.throws(() => validateReport({ files: [] }, 'head'), /sem "totals"/);
  assert.throws(() => validateReport({ totals: {} }, 'head'), /sem "files"/);
});

test('rejeita entrada invalida em files', () => {
  assert.throws(() => validateReport({ totals: {}, files: [{ file: 'x', chunk: 'x' }] }, 'head'), /gzipKb inválido/);
  assert.throws(() => validateReport({ totals: {}, files: [null] }, 'head'), /entrada inválida/);
});

// --- bundle-diff buildDiffMarkdown ---

const mk = (gzipKb, fileCount, files) => ({ totals: { gzipKb, fileCount }, files });

test('gera diff com arquivos novos/removidos e delta fileCount', () => {
  const base = mk(100, 2, [
    { file: 'a.js', chunk: 'a', gzipKb: 60 },
    { file: 'b.js', chunk: 'b', gzipKb: 40 },
  ]);
  const head = mk(150, 3, [
    { file: 'a.js', chunk: 'a', gzipKb: 70 },
    { file: 'c.js', chunk: 'c', gzipKb: 80 },
  ]);
  const md = buildDiffMarkdown(base, head);
  assert.match(md, /Novos arquivos\/chunks/);
  assert.match(md, /`c`/);
  assert.match(md, /Removidos/);
  assert.match(md, /`b`/);
  assert.match(md, /\*\*Arquivos:\*\* 3/);
  assert.match(md, /\+1 vs base/);
});

test('aceita base ausente (primeiro merge)', () => {
  const head = mk(100, 2, [{ file: 'a.js', chunk: 'a', gzipKb: 60 }]);
  const md = buildDiffMarkdown(null, head);
  assert.match(md, /Nenhum relatório base dispon/);
});

test('totals.gzipKb/fileCount ausentes (relatorio antigo, aceito por validateReport) nao viram "undefined" no markdown', () => {
  const head = { files: [{ file: 'a.js', chunk: 'a', gzipKb: 1 }], totals: {} };
  const md = buildDiffMarkdown(null, head);
  assert.doesNotMatch(md, /undefined/);
  assert.match(md, /Total gzip:\*\* \? KB/);
  assert.match(md, /Arquivos:\*\* \?/);
});

// --- regressões da auditoria de scripts (budgets mortos, protótipo, validação, CLI) ---

test('chunk com nome de propriedade do protótipo usa o default, não o protótipo', () => {
  const budget = { defaults: { maxChunkKb: 100 }, chunks: {}, entrypoints: {} };
  for (const chunk of ['constructor', 'toString', '__proto__', 'hasOwnProperty']) {
    const v = collectViolations([{ file: `assets/${chunk}-ABCDEFGH.js`, chunk, gzipKb: 500 }], budget);
    assert.equal(v.length, 1, chunk);
    assert.match(v[0], /> limite 100KB/);
  }
});

test('budget de chunk sem chunk no build é listado como morto (aviso, não violação)', () => {
  const budget = { defaults: {}, chunks: { 'vendor-react': 180, 'lib-sumiu': 30, 'a-sumiu': 10 }, entrypoints: {} };
  const files = [{ file: 'assets/vendor-react-ABCDEFGH.js', chunk: 'vendor-react', gzipKb: 50 }];
  assert.deepEqual(collectStaleBudgets(files, budget), ['a-sumiu', 'lib-sumiu']);
  assert.deepEqual(collectViolations(files, budget), []);
  assert.deepEqual(collectStaleBudgets(files, DEFAULT_BUDGET), []);
  assert.deepEqual(collectStaleBudgets(files, null), []);
});

test('validateBudget recusa formas que desligariam os limites em silêncio', () => {
  assert.equal(validateBudget(DEFAULT_BUDGET), DEFAULT_BUDGET);
  for (const ruim of [null, [], 'x', 1, { chunks: [] }, { defaults: null }, { chunks: { a: '180' } },
    { chunks: { a: 0 } }, { defaults: { maxChunkKb: -1 } }, { entrypoints: { '/': null } }, { chunks: { a: NaN } }]) {
    assert.throws(() => validateBudget(ruim), /bundle-budget\.json/, JSON.stringify(ruim));
  }
});

test('o bundle-budget.json versionado é válido', () => {
  const real = JSON.parse(readFileSync(join(HERE, '..', 'bundle-budget.json'), 'utf8'));
  assert.equal(validateBudget(real), real);
});

test('validateReport exige números de verdade (string concatenaria na soma)', () => {
  const ok = { totals: { gzipKb: 1, fileCount: 1 }, files: [{ file: 'a.js', chunk: 'a', gzipKb: 1 }] };
  assert.equal(validateReport(ok, 'x'), ok);
  for (const gz of ['10', null, true, NaN, Infinity, undefined]) {
    assert.throws(() => validateReport({ ...ok, files: [{ file: 'a.js', chunk: 'a', gzipKb: gz }] }, 'x'), /gzipKb inválido/, String(gz));
  }
  assert.throws(() => validateReport({ ...ok, totals: { gzipKb: '1', fileCount: 1 } }, 'x'), /totals\.gzipKb/);
  assert.throws(() => validateReport({ ...ok, totals: { gzipKb: 1, fileCount: null } }, 'x'), /totals\.fileCount/);
});

test('diff limita as listas de novos/removidos e ordena de forma estável', () => {
  const mk = (n, prefix) => ({
    totals: { gzipKb: n, fileCount: n },
    files: Array.from({ length: n }, (_, i) => ({ file: `${prefix}${i}.js`, chunk: `${prefix}${String(i).padStart(4, '0')}`, gzipKb: 1 })),
  });
  const md = buildDiffMarkdown(mk(300, 'old'), mk(300, 'new'));
  assert.match(md, /Novos arquivos\/chunks \(300\)/);
  assert.match(md, /_e mais 250_/);
  assert.ok(md.length < 20000, `markdown com ${md.length} bytes`);
  assert.equal(md, buildDiffMarkdown(mk(300, 'old'), mk(300, 'new')));
  assert.ok(md.indexOf('`new0000`') < md.indexOf('`new0001`'));
});

// CLI: caminho com `#`/`%`/espaço e chamada via symlink não podem "não rodar" e sair 0.
function cliFixture() {
  const root = mkdtempSync(join(tmpdir(), 'bundle #50% cli-'));
  mkdirSync(join(root, 'scripts'));
  for (const f of ['bundle-report.mjs', 'bundle-diff.mjs']) copyFileSync(join(HERE, f), join(root, 'scripts', f));
  mkdirSync(join(root, 'dist', 'assets'), { recursive: true });
  writeFileSync(join(root, 'dist', 'assets', 'index-ABCDEFGH.js'), 'console.log(1);\n');
  const run = (script, args = []) => {
    const r = spawnSync(process.execPath, [script, ...args], { cwd: root, encoding: 'utf8', env: { ...process.env, GITHUB_STEP_SUMMARY: '' } });
    return { code: r.status, out: `${r.stdout}${r.stderr}` };
  };
  return { root, run, done: () => rmSync(root, { recursive: true, force: true }) };
}

test('CLI bundle-report: mede, grava relatório e reprova budget estourado (inclusive via symlink)', () => {
  const f = cliFixture();
  try {
    const ok = f.run(join(f.root, 'scripts', 'bundle-report.mjs'));
    assert.equal(ok.code, 0, ok.out);
    const rep = JSON.parse(readFileSync(join(f.root, 'dist', 'bundle-report.json'), 'utf8'));
    assert.equal(rep.totals.fileCount, 1);
    assert.equal(rep.files[0].chunk, 'index');

    writeFileSync(join(f.root, 'bundle-budget.json'), JSON.stringify({ defaults: { maxChunkKb: 0.001 } }));
    symlinkSync(join(f.root, 'scripts', 'bundle-report.mjs'), join(f.root, 'link.mjs'));
    const viaLink = f.run(join(f.root, 'link.mjs'));
    assert.equal(viaLink.code, 1, viaLink.out);
    assert.match(viaLink.out, /violação\(ões\) de budget/);

    for (const ruim of ['null', '[]', '{"chunks":{"a":"1"}}', '{ quebrado']) {
      writeFileSync(join(f.root, 'bundle-budget.json'), ruim);
      assert.equal(f.run(join(f.root, 'scripts', 'bundle-report.mjs')).code, 1, ruim);
    }
    rmSync(join(f.root, 'dist'), { recursive: true });
    assert.equal(f.run(join(f.root, 'scripts', 'bundle-report.mjs')).code, 1);
  } finally { f.done(); }
});

test('CLI bundle-diff: gera o markdown em caminho com #, % e espaço; head ausente sai 1', () => {
  const f = cliFixture();
  try {
    const rep = (kb) => JSON.stringify({ totals: { gzipKb: kb, fileCount: 1 }, files: [{ file: 'a-ABCDEFGH.js', chunk: 'a', gzipKb: kb }] });
    writeFileSync(join(f.root, 'base.json'), rep(10));
    writeFileSync(join(f.root, 'head.json'), rep(25));
    const r = f.run(join(f.root, 'scripts', 'bundle-diff.mjs'), ['base.json', 'head.json', 'out.md']);
    assert.equal(r.code, 0, r.out);
    assert.match(readFileSync(join(f.root, 'out.md'), 'utf8'), /`a` \| 10\.00 \| 25\.00 \| 🔺 \+15\.00/);
    const semBase = f.run(join(f.root, 'scripts', 'bundle-diff.mjs'), ['nao-existe.json', 'head.json', 'out2.md']);
    assert.equal(semBase.code, 0, semBase.out);
    assert.match(readFileSync(join(f.root, 'out2.md'), 'utf8'), /sem base para comparar/);
    assert.equal(f.run(join(f.root, 'scripts', 'bundle-diff.mjs'), ['base.json', 'nao-existe.json', 'out3.md']).code, 1);
    assert.equal(f.run(join(f.root, 'scripts', 'bundle-diff.mjs')).code, 1);
  } finally { f.done(); }
});
