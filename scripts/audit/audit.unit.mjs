// Testes de regressão do audit, em repositórios git descartáveis.
// Rodar: node --test scripts/audit/audit.unit.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = dirname(fileURLToPath(import.meta.url));
const RUN = join(AQUI, 'run.mjs');

function repo(arquivos) {
  const root = mkdtempSync(join(tmpdir(), 'audit-'));
  execFileSync('git', ['init', '-q'], { cwd: root });
  mkdirSync(join(root, 'scripts/audit'), { recursive: true });
  copyFileSync(join(AQUI, 'regras.json'), join(root, 'scripts/audit/regras.json'));
  for (const [caminho, conteudo] of Object.entries(arquivos)) {
    mkdirSync(dirname(join(root, caminho)), { recursive: true });
    writeFileSync(join(root, caminho), conteudo);
  }
  execFileSync('git', ['add', '-A'], { cwd: root });
  return root;
}
const auditar = (root, args = [], env = {}) => {
  const r = spawnSync(process.execPath, [RUN, ...args], { cwd: root, encoding: 'utf8', env: { ...process.env, ...env } });
  let findings = [];
  try { findings = JSON.parse(readFileSync(join(root, '.audit/findings.json'), 'utf8')).findings; } catch { /* sem relatório */ }
  return { status: r.status, findings, err: r.stderr };
};

test('tabela apagada e recriada sem RLS volta a ser acusada', () => {
  const root = repo({
    'supabase/migrations/001.sql': 'create table public.a (id int);\nalter table public.a enable row level security;\n',
    'supabase/migrations/002.sql': 'drop table public.a;\n',
    'supabase/migrations/003.sql': 'create table public.a (id int);\n',
  });
  assert.ok(auditar(root).findings.some((f) => f.check === 'tabela-sem-rls' && /Tabela a /.test(f.titulo)));
});

test('tabela com RLS ativado depois da criação NÃO é acusada', () => {
  const root = repo({
    'supabase/migrations/001.sql': 'create table public.b (id int);\nalter table public.b enable row level security;\n',
  });
  assert.equal(auditar(root).findings.filter((f) => f.check === 'tabela-sem-rls').length, 0);
});

test('--estrito sem baseline falha (não pode dar verde sem comparação)', () => {
  const root = repo({ 'src/x.ts': 'export const x = 1;\n' });
  assert.equal(auditar(root, ['--estrito']).status, 2);
});

test('AUDIT_BASELINE apontando para arquivo inexistente falha', () => {
  const root = repo({ 'src/x.ts': 'export const x = 1;\n' });
  assert.equal(auditar(root, [], { AUDIT_BASELINE: join(root, 'nao-existe.json') }).status, 2);
});

test('arquivo com acento no nome é analisado (git sem escapar o caminho)', () => {
  const root = repo({ 'src/ação.ts': 'export const mockDados = [1, 2, 3];\n' });
  const f = auditar(root).findings.find((x) => x.check === 'dado-fabricado');
  assert.ok(f, 'deveria achar o dado fabricado');
  assert.equal(f.arquivo, 'src/ação.ts');
});


test('DISABLE ROW LEVEL SECURITY depois do ENABLE volta a acusar a tabela', () => {
  const root = repo({
    'supabase/migrations/001.sql': 'create table public.c (id int);\nalter table public.c enable row level security;\n',
    'supabase/migrations/002.sql': 'alter table public.c disable row level security;\n',
  });
  assert.ok(auditar(root).findings.some((f) => f.check === 'tabela-sem-rls' && /Tabela c /.test(f.titulo)));
});

test('segredo na mesma linha de OUTRO achado não vaza no relatório', () => {
  const chave = 're_abcdefghijklmnopqrstuvwxyz123456';
  const root = repo({ 'src/a.ts': `export const fakeData = [{ k: '${chave}' }];\n` });
  auditar(root);
  const todo = ['.audit/findings.json', '.audit/relatorio.md', '.audit/fila-para-decisao.md'].map((f) => readFileSync(join(root, f), 'utf8')).join('\n');
  assert.ok(!todo.includes(chave), 'a credencial não pode aparecer em nenhum arquivo de saída');
});

test('--estrito reprova quando uma checagem quebra (regra com regex inválida)', () => {
  const root = repo({ 'src/x.ts': 'export const x = 1;\n' });
  writeFileSync(join(root, 'scripts/audit/regras.json'), JSON.stringify({ regras: [{ id: 'quebrada', titulo: 't', severidade: 'alta', arquivo: 'src/x.ts', deve_conter: ['['], por_que: 'x' }] }));
  auditar(root, ['--baseline']);
  const r = auditar(root, ['--estrito']);
  assert.equal(r.status, 1);
  assert.ok(r.findings.some((f) => f.check === 'regra-de-negocio' && /regra inválida/.test(f.titulo)));
});
