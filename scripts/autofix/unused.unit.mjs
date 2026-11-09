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
const aplicar = (codigo, opts = {}) => {
  const root = projeto(codigo);
  const r = runUnused({ root, apply: true, ...opts });
  return { texto: readFileSync(join(root, 'src/a.ts'), 'utf8'), r };
};

test('NÃO remove variável não usada com ++/-- (muda estado)', () => {
  const src = 'export function f() { let n = 0; const unused = ++n; return n; }\n';
  assert.equal(aplicar(src).texto, src);
});

test('NÃO remove item de desestruturação com valor padrão impuro', () => {
  const src = 'export function g() { let n = 0; const { a = ++n, b } = { a: undefined, b: 1 }; return [n, b]; }\n';
  assert.equal(aplicar(src, { desestruturacao: true }).texto, src);
});

test('NÃO remove desestruturação com chave computada impura', () => {
  const src = 'let n = 0;\nconst k = () => `x${++n}`;\nexport function h() { const { [k()]: a, b } = { x1: 1, b: 2 } as Record<string, number>; return b; }\n';
  assert.ok(aplicar(src, { desestruturacao: true }).texto.includes('[k()]: a'));
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
  const { texto } = aplicar('export function j() { const pura = 5; const { a = 1, b } = { a: undefined, b: 2 }; return b; }\n', { desestruturacao: true });
  assert.ok(!texto.includes('pura'));
  assert.ok(!/\ba = 1/.test(texto));
  assert.ok(texto.includes('b'));
});

test('por padrão NÃO remove item de desestruturação (um getter pode executar ao ler)', () => {
  const src = 'export function k() { let n = 0; const { a, b } = { get a() { n++; return 1; }, b: 1 }; return [n, b]; }\n';
  assert.equal(aplicar(src).texto, src);
});

test('NÃO remove objeto com método de chave computada impura', () => {
  const src = 'export function m() { let n = 0; const unused = { [++n]() {} }; return n; }\n';
  assert.equal(aplicar(src).texto, src);
});

test('NÃO remove +x/~x sobre objeto (coerção roda valueOf)', () => {
  const src = 'export function o() { let n = 0; const value = { valueOf() { n++; return 1; } }; const unused = +value; return n; }\n';
  assert.ok(aplicar(src).texto.includes('+value'));
});

test('REMOVE !x e -1 (sem código do usuário)', () => {
  const { texto } = aplicar('export function q(v: unknown) { const a = !v; const b = -1; return 2; }\n');
  assert.ok(!texto.includes('!v') && !texto.includes('-1'));
});

test('com --desestruturacao, chave computada por identificador (coerção) continua preservada', () => {
  const src = 'export function r(k: { toString(): string }) { const { [k as unknown as string]: a, b } = { x: 1, b: 2 } as Record<string, number>; return b; }\n';
  assert.ok(aplicar(src, { desestruturacao: true }).texto.includes('[k as unknown as string]: a'));
});

test('import que só ficou sem uso após remover uma variável é PRESERVADO (inicialização do módulo)', () => {
  const src = "import { valor } from './registro.js';\nexport function t() { const naoUsada = valor; return 1; }\n";
  const { texto } = aplicar(src);
  assert.ok(texto.includes("import { valor }"), 'o import tem de ficar');
  assert.ok(!texto.includes('naoUsada'), 'a variável pura pode sair');
});

test('NÃO remove declaração using (registra Symbol.dispose ao sair do escopo)', () => {
  const src = 'declare const recurso: { [Symbol.dispose](): void };\nexport function w() { using naoUsada = recurso; return 1; }\n';
  assert.ok(aplicar(src).texto.includes('using naoUsada'));
});

test('NÃO remove let com atribuição posterior que tem efeito colateral', () => {
  const src = 'export function y() { let n = 0; let x = 0; x = ++n; return n; }\n';
  assert.equal(aplicar(src).texto, src);
});

test('REMOVE const puro não usado', () => {
  assert.ok(!aplicar('export function z() { const pura = 7; return 1; }\n').texto.includes('pura'));
});
