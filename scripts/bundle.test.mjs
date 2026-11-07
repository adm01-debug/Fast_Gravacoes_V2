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
import { chunkNameFromFile, collectViolations, DEFAULT_BUDGET } from './bundle-report.mjs';
import { validateReport, buildDiffMarkdown } from './bundle-diff.mjs';

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
  assert.throws(() => validateReport(null, 'head'), /object JSON v\u00e1lido/);
  assert.throws(() => validateReport([], 'head'), /object JSON v\u00e1lido/);
});

test('rejeita falta de totals/files', () => {
  assert.throws(() => validateReport({ files: [] }, 'head'), /sem "totals"/);
  assert.throws(() => validateReport({ totals: {} }, 'head'), /sem "files"/);
});

test('rejeita entrada invalida em files', () => {
  assert.throws(() => validateReport({ totals: {}, files: [{ file: 'x', chunk: 'x' }] }, 'head'), /gzipKb inv\u00e1lido/);
  assert.throws(() => validateReport({ totals: {}, files: [null] }, 'head'), /entrada inv\u00e1lida/);
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
  assert.match(md, /Nenhum relat\u00f3rio base dispon/);
});
