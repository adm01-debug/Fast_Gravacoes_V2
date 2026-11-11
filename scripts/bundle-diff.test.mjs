// Testes do bundle-diff — `node --test scripts/bundle-diff.test.mjs`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateReport, loadReport, buildDiffMarkdown } from './bundle-diff.mjs';

const file = (chunk, gzipKb, name = `${chunk}.js`) => ({ file: name, chunk, gzipKb });
const report = (files, totals) => ({ files, totals: totals ?? { gzipKb: files.reduce((s, f) => s + f.gzipKb, 0), fileCount: files.length } });

test('validateReport: rejeita não-object e array', () => {
  assert.throws(() => validateReport(null, 'x'), /não é um object JSON válido/);
  assert.throws(() => validateReport([], 'x'), /não é um object JSON válido/);
});

test('validateReport: exige totals e files', () => {
  assert.throws(() => validateReport({}, 'x'), /sem "totals"/);
  assert.throws(() => validateReport({ totals: {} }, 'x'), /sem "files"/);
});

test('validateReport: entrada de files sem file/chunk falha', () => {
  assert.throws(() => validateReport({ totals: {}, files: [{ gzipKb: 1 }] }, 'x'), /files\[0\]/);
});

test('validateReport: gzipKb não-numérico falha (evita concatenação de string)', () => {
  assert.throws(
    () => validateReport({ totals: {}, files: [{ file: 'a.js', chunk: 'a', gzipKb: '10' }] }, 'x'),
    /gzipKb inválido/,
  );
});

test('validateReport: totals.gzipKb/fileCount são opcionais (relatório antigo)', () => {
  const r = validateReport({ totals: {}, files: [file('a', 1)] }, 'x');
  assert.deepEqual(r.totals, {});
});

test('validateReport: totals.gzipKb inválido (não numérico) falha', () => {
  assert.throws(
    () => validateReport({ totals: { gzipKb: '1' }, files: [] }, 'x'),
    /totals.gzipKb inválido/,
  );
});

test('loadReport: arquivo ausente dá erro claro', () => {
  assert.throws(() => loadReport('/tmp/nao-existe-bundle-diff.json', 'head'), /não encontrado/);
});

test('buildDiffMarkdown: sem base mostra totais do head e aviso de comparação futura', () => {
  const head = report([file('a', 10)]);
  const md = buildDiffMarkdown(null, head);
  assert.match(md, /Total gzip:\*\* 10 KB _\(sem base para comparar\)_/);
  assert.match(md, /próximo merge/);
});

test('buildDiffMarkdown: head.totals sem gzipKb/fileCount não produz "undefined" no markdown', () => {
  const head = { files: [file('a', 1)], totals: {} };
  const md = buildDiffMarkdown(null, head);
  assert.doesNotMatch(md, /undefined/);
  assert.match(md, /Total gzip:\*\* \? KB/);
  assert.match(md, /Arquivos:\*\* \?/);
});

test('buildDiffMarkdown: sem mudança significativa (< 0.5 KB) não lista chunks', () => {
  const base = report([file('a', 10)]);
  const head = report([file('a', 10.2)]);
  const md = buildDiffMarkdown(base, head);
  assert.match(md, /Nenhum chunk com alteração significativa/);
});

test('buildDiffMarkdown: chunk alterado aparece na tabela com seta e delta', () => {
  const base = report([file('a', 10)]);
  const head = report([file('a', 15)]);
  const md = buildDiffMarkdown(base, head);
  assert.match(md, /Chunks alterados \(1\)/);
  assert.match(md, /`a`.*10\.00.*15\.00.*🔺 \+5\.00/);
});

test('buildDiffMarkdown: chunk novo e removido são listados separadamente', () => {
  const base = report([file('old', 5)]);
  const head = report([file('new', 5)]);
  const md = buildDiffMarkdown(base, head);
  assert.match(md, /Novos arquivos\/chunks \(1\)/);
  assert.match(md, /`new`/);
  assert.match(md, /Removidos \(1\)/);
  assert.match(md, /`old`/);
});

test('buildDiffMarkdown: lista de novos/removidos corta em 50 com contagem do restante', () => {
  const files = Array.from({ length: 55 }, (_, i) => file(`c${i}`, 1));
  const head = report(files);
  const md = buildDiffMarkdown(report([]), head);
  assert.match(md, /e mais 5/);
});
