// Testes do ratchet de `any` — `node --test scripts/check-any-baseline.test.mjs`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, copyFileSync, symlinkSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { findAnyLines, isCounted, readBaseline, decide } from './check-any-baseline.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..');
const count = (code, file = 'x.ts') => findAnyLines(ts, code, file).length;

test('conta todo any em posição de tipo', () => {
  const casos = {
    'let a: any;': 1,
    'let a:any;': 1,
    'let a: any[];': 1,
    'let a: Array<any>;': 1,
    'type R = Record<string, any>;': 1,
    'const [s] = useState<any[]>([]);': 1,
    'type X = any;': 1,
    'let a: string | any;': 1,
    'function f<T = any>(x: T) {}': 1,
    'let m: Map<string, any>;': 1,
    'let p: Promise<any | null>;': 1,
    'const v = x as  any;': 1,
    'const v = x as any as string;': 1,
    'const v = <any>x;': 1,
    'function f(a: any, b: any): any {}': 3,
    'type K = keyof any;': 1,
    'let a:\n  any;': 1,
    'const f = (...args: any[]) => args;': 1,
    'interface I { [k: string]: any }': 1,
    'let a: unknown extends any ? 1 : 2;': 1,
  };
  for (const [code, esperado] of Object.entries(casos)) {
    assert.equal(count(code), esperado, code);
  }
});

test('não conta a palavra fora de posição de tipo', () => {
  const casos = [
    '// TODO: any follow-up',
    '/* x: any */ const a = 1;',
    'const s = "erro: any thing";',
    "const s = 'as any';",
    'const s = `x: any ${1}`;',
    'const any = 1; const b = cond ? a : any;',
    'obj.any(); arr.some((x) => x.any);',
    'const re = /: any\\b/;',
    'const company = 1; const many = 2;',
    '',
  ];
  for (const code of casos) assert.equal(count(code), 0, code);
  assert.equal(count('const a = <p>is there any: any thing</p>;', 'x.tsx'), 0);
  assert.equal(count('const a = <C<any> x={1} />;', 'x.tsx'), 1);
});

test('linhas reportadas são 1-based e na ordem do arquivo', () => {
  assert.deepEqual(findAnyLines(ts, 'let a = 1;\nlet b: any;\n\nlet c = b as any;\n'), [2, 4]);
});

test('seleção de arquivos', () => {
  for (const f of ['src/a.ts', 'src/a.tsx', 'src/x/b.mts', 'src/x/b.cts', 'src/vite-env.d.ts', 'src/integrations/supabase/client.ts']) {
    assert.equal(isCounted(f), true, f);
  }
  for (const f of ['src/a.test.ts', 'src/a.spec.tsx', 'src/foo.test.utils.ts', 'src/a.js', 'src/a.json', 'src/integrations/supabase/types.ts', 'src/a.ts.bak']) {
    assert.equal(isCounted(f), false, f);
  }
});

test('decisão do ratchet', () => {
  assert.deepEqual(decide({ current: 3, baseline: 2, ci: false }), { code: 1, verdict: 'regrediu' });
  assert.deepEqual(decide({ current: 3, baseline: 2, ci: true }), { code: 1, verdict: 'regrediu' });
  assert.deepEqual(decide({ current: 2, baseline: 2, ci: true }), { code: 0, verdict: 'igual' });
  assert.deepEqual(decide({ current: 1, baseline: 2, ci: false }), { code: 0, verdict: 'reduziu' });
  assert.deepEqual(decide({ current: 1, baseline: 9999, ci: true }), { code: 1, verdict: 'baseline-frouxo' });
});

// ── CLI ponta a ponta num repo-fixture (o script deriva a raiz da própria localização) ──
function fixture(files, baseline) {
  const root = mkdtempSync(join(tmpdir(), 'any ratchet-')); // espaço no caminho de propósito
  mkdirSync(join(root, 'scripts'));
  copyFileSync(join(HERE, 'check-any-baseline.mjs'), join(root, 'scripts', 'check-any-baseline.mjs'));
  symlinkSync(join(REPO, 'node_modules'), join(root, 'node_modules'));
  for (const [rel, body] of Object.entries(files)) {
    mkdirSync(dirname(join(root, rel)), { recursive: true });
    writeFileSync(join(root, rel), body);
  }
  if (baseline !== undefined) writeFileSync(join(root, '.any-baseline.json'), baseline);
  const run = (args = [], env = {}) => {
    const { CI: _ci, ...base } = process.env;
    const r = spawnSync(process.execPath, [join(root, 'scripts', 'check-any-baseline.mjs'), ...args], {
      encoding: 'utf8',
      cwd: tmpdir(), // cwd diferente da raiz de propósito
      env: { ...base, ...env },
    });
    return { code: r.status, out: `${r.stdout}${r.stderr}` };
  };
  return { root, run, done: () => rmSync(root, { recursive: true, force: true }) };
}
const base = (n) => JSON.stringify({ baseline: n });
const DOIS = { 'src/a.ts': 'export const a = (x: any) => x as any;\n' };

test('CLI: igual ao baseline passa; any novo reprova listando onde', () => {
  const f = fixture(DOIS, base(2));
  try {
    assert.equal(f.run().code, 0);
    writeFileSync(join(f.root, 'src', 'b.tsx'), 'export type T = Record<string, any>;\n');
    const r = f.run();
    assert.equal(r.code, 1, r.out);
    assert.match(r.out, /1 novo\(s\) 'any'/);
    assert.match(r.out, /src\/b\.tsx:1/);
  } finally { f.done(); }
});

test('CLI: testes, tipos gerados, node_modules e não-TS ficam fora', () => {
  const f = fixture({
    'src/a.test.ts': 'let a: any;',
    'src/a.spec.tsx': 'let a: any;',
    'src/integrations/supabase/types.ts': 'export type J = any;',
    'src/node_modules/p/i.ts': 'let a: any;',
    'src/a.js': 'let a /*: any */;',
    'src/c.ts': '// só comentário: any\nexport const s = "as any";\n',
  }, base(0));
  try { const r = f.run(); assert.equal(r.code, 0, r.out); assert.match(r.out, /atual: 0/); } finally { f.done(); }
});

test('CLI: baseline ausente, corrompido ou não inteiro reprova e não cria arquivo', () => {
  const semArquivo = fixture(DOIS);
  try {
    assert.equal(semArquivo.run().code, 1);
    assert.equal(existsSync(join(semArquivo.root, '.any-baseline.json')), false);
  } finally { semArquivo.done(); }
  for (const conteudo of ['{}', '{"baseline":"abc"}', '{"baseline":-1}', '{"baseline":1.5}', '{"baseline":null}', 'lixo', '[]', '']) {
    const f = fixture(DOIS, conteudo);
    try { assert.equal(f.run().code, 1, conteudo); } finally { f.done(); }
  }
});

test('CLI: baseline acima do real — local avisa, CI reprova', () => {
  const f = fixture(DOIS, base(9999));
  try {
    const local = f.run();
    assert.equal(local.code, 0, local.out);
    assert.match(local.out, /Redução detectada/);
    const ci = f.run([], { CI: 'true' });
    assert.equal(ci.code, 1, ci.out);
    assert.match(ci.out, /acima da contagem real/);
  } finally { f.done(); }
});

test('CLI: --update só reduz; --force aceita aumento; cria quando ausente', () => {
  const f = fixture(DOIS, base(1));
  try {
    assert.equal(f.run(['--update']).code, 1);
    assert.equal(readBaseline(join(f.root, '.any-baseline.json')).value, 1);
    assert.equal(f.run(['--update', '--force']).code, 0);
    assert.equal(readBaseline(join(f.root, '.any-baseline.json')).value, 2);
    writeFileSync(join(f.root, 'src', 'a.ts'), 'export const a = 1;\n');
    assert.equal(f.run(['--update']).code, 0);
    assert.equal(JSON.parse(readFileSync(join(f.root, '.any-baseline.json'), 'utf8')).baseline, 0);
  } finally { f.done(); }
  const novo = fixture(DOIS);
  try {
    assert.equal(novo.run(['--update']).code, 0);
    assert.equal(readBaseline(join(novo.root, '.any-baseline.json')).value, 2);
  } finally { novo.done(); }
});

test('CLI: sem src/ ou com argumento desconhecido sai 2 (gate não rodou)', () => {
  const f = fixture({}, base(0));
  try { assert.equal(f.run().code, 2); } finally { f.done(); }
  const g = fixture(DOIS, base(2));
  try { assert.equal(g.run(['--updat']).code, 2); } finally { g.done(); }
});

test('repo real: contagem bate com o baseline versionado', () => {
  const r = spawnSync(process.execPath, [join(HERE, 'check-any-baseline.mjs')], { encoding: 'utf8', env: { ...process.env, CI: 'true' } });
  assert.equal(r.status, 0, `${r.stdout}${r.stderr}`);
});
