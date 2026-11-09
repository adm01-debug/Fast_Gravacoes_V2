// Teste de regressão do fixer "unused": o que ele NUNCA pode apagar e o que deve apagar.
// Rodar: node --test scripts/autofix/unused.unit.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runUnused } from './unused.mjs';

function projeto(codigo) {
  const root = mkdtempSync(join(tmpdir(), 'unused-'));
  mkdirSync(join(root, 'src'));
  writeFileSync(join(root, 'tsconfig.app.json'), JSON.stringify({ compilerOptions: { strict: true, target: 'ES2020', module: 'ESNext', moduleResolution: 'bundler', noEmit: true, skipLibCheck: true }, include: ['src'] }));
  writeFileSync(join(root, 'src/a.ts'), codigo);
  return root;
}
const aplicar = (codigo) => {
  const root = projeto(codigo);
  const r = runUnused({ root, apply: true });
  return { texto: readFileSync(join(root, 'src/a.ts'), 'utf8'), r };
};

test('NÃO remove variável não usada com ++/-- (muda estado)', () => {
  const src = 'export function f() { let n = 0; const unused = ++n; return n; }\n';
  assert.equal(aplicar(src).texto, src);
});

test('NÃO remove item de desestruturação com valor padrão impuro', () => {
  const src = 'export function g() { let n = 0; const { a = ++n, b } = { a: undefined, b: 1 }; return [n, b]; }\n';
  assert.equal(aplicar(src).texto, src);
});

test('NÃO remove desestruturação com chave computada impura', () => {
  const src = 'let n = 0;\nconst k = () => `x${++n}`;\nexport function h() { const { [k()]: a, b } = { x1: 1, b: 2 } as Record<string, number>; return b; }\n';
  assert.ok(aplicar(src).texto.includes('[k()]: a'));
});

test('NÃO remove variável cujo inicializador é chamada', () => {
  const src = 'declare function efeito(): number;\nexport function i() { const unused = efeito(); return 1; }\n';
  assert.equal(aplicar(src).texto, src);
});

test('REMOVE import não usado', () => {
  const { texto } = aplicar("import { useState } from 'react';\nexport const x = 1;\n");
  assert.ok(!texto.includes('useState'));
});

test('REMOVE variável pura e item de desestruturação com padrão puro', () => {
  const { texto } = aplicar('export function j() { const pura = 5; const { a = 1, b } = { a: undefined, b: 2 }; return b; }\n');
  assert.ok(!texto.includes('pura'));
  assert.ok(!/\ba = 1/.test(texto));
  assert.ok(texto.includes('b'));
});
