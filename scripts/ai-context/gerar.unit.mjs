// Teste do gerador de contexto (scripts/ai-context/gerar.mjs).
// Monta um repositório sintético em pasta temporária cobrindo os casos que o gerador precisa
// entender (rotas aninhadas, lazy, menu, hooks, edge functions, migrations em ordem,
// barrel re-export, backend HTTP, Python, nested tsconfig) e confere a saída.
// Rodar: node --test scripts/ai-context/gerar.unit.mjs

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const GERADOR = path.resolve(path.dirname(new URL(import.meta.url).pathname), 'gerar.mjs');
const w = (root, rel, text) => { const p = path.join(root, rel); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, text); };

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ctx-ia-'));
  w(root, 'package.json', JSON.stringify({ name: 'fixture', version: '1.0.0', scripts: { dev: 'vite', test: 'vitest run', audit: 'node scripts/audit.mjs' }, dependencies: { react: '18', 'react-router-dom': '6', '@supabase/supabase-js': '2', express: '4', stripe: '14' }, devDependencies: { vitest: '1', typescript: '5', vite: '5' } }));
  w(root, 'tsconfig.json', JSON.stringify({ compilerOptions: { strict: true, paths: { '@/*': ['./src/*'] } } }));
  w(root, '.env.example', 'VITE_SUPABASE_URL=\nVITE_API_KEY=\n');
  w(root, 'README.md', '# Fixture\n');
  w(root, 'src/main.tsx', `import { QueryClientProvider } from '@tanstack/react-query';\nimport { AppRoutes } from '@/routes/AppRoutes';\nexport const Root = () => <QueryClientProvider><AppRoutes/></QueryClientProvider>;`);
  w(root, 'src/routes/AppRoutes.tsx', `import { Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import Login from '@/pages/Login';
import { lazy } from 'react';
const Admin = lazy(() => import('@/pages/admin/Admin'));
export function AppRoutes() {
  return (<Routes>
    <Route path="/login" element={<Login />} />
    <Route path="/app" element={<ProtectedRoute><Shell /></ProtectedRoute>}>
      <Route index element={<Home />} />
      <Route path="contacts/:id" element={<ContactPage />} />
    </Route>
    <Route path="/admin" element={<Admin />} />
    <Route {...{ path: '/access-denied' }} element={<Login />} />
    <Route path="/old" element={<Navigate to="/app" />} />
  </Routes>);
}
import { Shell } from '@/components/layout/Shell';
import { Home } from '@/components/home/Home';
import { ContactPage } from '@/components/contacts/ContactPage';`);
  w(root, 'src/components/auth/ProtectedRoute.tsx', `export const ProtectedRoute = ({ children }) => <>{children}</>;`);
  w(root, 'src/components/layout/Shell.tsx', `import { Outlet } from 'react-router-dom';\nexport const Shell = () => <div><Outlet/></div>;`);
  w(root, 'src/pages/ViewRouter.tsx', `import * as Views from '@/pages/lazyViews';\nconst VIEW_MAP = { home: Views.HomeLazy };\nconst SPECIAL_VIEWS = {\n  'achievements': (props) => (\n    <Boundary><Views.AchievementsLazy userId={props.userId} /></Boundary>\n  ),\n};\nexport const ViewRouter = ({ v }) => SPECIAL_VIEWS[v] ? SPECIAL_VIEWS[v]({}) : null;`);
  w(root, 'src/pages/lazyViews.ts', `import { lazy } from 'react';\nexport const HomeLazy = lazy(() => import('@/components/home/Home').then(m => ({ default: m.Home })));\nexport const AchievementsLazy = lazy(() => import('@/components/achievements/Achievements'));`);
  w(root, 'src/components/achievements/Achievements.tsx', `export default function Achievements() { return <ol/>; }`);
  w(root, 'src/components/layout/sidebarNav.ts', `const STAFF: string[] = ['admin', 'supervisor'];\nexport const sidebarGroups = [{ title: 'Principal', items: [{ id: 'home', label: 'Início', path: '/app' }, { id: 'contacts', label: 'Contatos', path: '/app/contacts/:id', roles: ['admin'] }, { id: 'staff', label: 'Equipe', path: '/admin', roles: STAFF }, { id: 'x', label: 'Externo', path: '/login', roles: EXTERNAL }, { id: 'ghost', label: 'Fantasma', path: '/nada' }] }];`);
  w(root, 'src/components/home/Home.tsx', `import { useContacts } from '@/hooks/useContacts';\nexport const Home = () => { const c = useContacts(); return <div>{c.length}</div>; };`);
  w(root, 'src/components/contacts/ContactPage.tsx', `import { Card } from '@/components/ui';\nimport { useContacts } from '@/hooks/useContacts';\nexport const ContactPage = () => { useContacts(); return <Card/>; };`);
  w(root, 'src/components/ui/index.ts', `export { Card } from './Card';\nexport * from './Button';`);
  w(root, 'src/components/ui/Card.tsx', `export const Card = () => <div/>;`);
  w(root, 'src/components/ui/Button.tsx', `export const Button = () => <button/>;`);
  w(root, 'src/components/ui/Unused.tsx', `export const Unused = () => <i/>;`);
  w(root, 'src/pages/Login.tsx', `export default function Login() { return <form/>; }`);
  w(root, 'src/pages/admin/Admin.tsx', `import { supabase } from '@/lib/supabase';\nexport const Admin = () => { const role = 'admin'; if (role === 'admin') supabase.rpc('is_admin'); return <div/>; };`);
  w(root, 'src/hooks/useContacts.ts', `import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';
export function useContacts() { return useQuery(['c'], async () => { const { data } = await supabase.from('contacts').select('*'); await supabase.functions.invoke('send-email', { body: {} }); return data; }); }`);
  w(root, 'src/lib/supabase.ts', `import { createClient } from '@supabase/supabase-js';\nexport const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_ANON);\nconst flag = isFeatureEnabled('novo-inbox');`);
  w(root, 'src/hooks/__tests__/useContacts.test.ts', `import { useContacts } from '../useContacts';\nit('x', () => {}); test('y', () => {});`);
  w(root, 'server/api.ts', `import express from 'express';\nconst app = express();\napp.get('/health', (req, res) => res.send('ok'));\napp.post('/webhook/stripe', handler);`);
  w(root, 'backend/app.py', `from fastapi import FastAPI\nimport os\nfrom . import models\napp = FastAPI()\n@app.get('/items')\ndef items():\n    return os.environ.get('DB_URL')\n`);
  w(root, 'backend/models.py', `from sqlalchemy.orm import DeclarativeBase\nclass Base(DeclarativeBase):\n    pass\nclass Item(Base):\n    pass\n`);
  w(root, 'supabase/config.toml', `project_id = "x"\n\n[functions.stripe-webhook]\nverify_jwt = false\n`);
  w(root, 'supabase/functions/send-email/index.ts', `const key = Deno.env.get('RESEND_API_KEY');\nDeno.serve(async (req) => { if (req.method === 'POST') { await supabase.from('emails').insert({}); } return fetch('https://api.resend.com/x'); });`);
  w(root, 'supabase/functions/stripe-webhook/index.ts', `Deno.serve(async (req) => { await supabase.from('payments').insert({}); return new Response('ok'); });`);
  w(root, 'supabase/functions/orphan-fn/index.ts', `Deno.serve(() => new Response('x'));`);
  w(root, 'supabase/migrations/001_init.sql', `create table public.contacts (id uuid primary key default gen_random_uuid(), name text not null, email text, "createdAt" timestamptz default now(), lat double precision, created2 timestamp with time zone);
alter table public.contacts enable row level security;
create policy "contacts_select" on public.contacts for select to authenticated using (true);
create index contacts_email_idx on public.contacts (email);
create table public.legacy (id int);
create table public.emails (id uuid primary key, contact_id uuid references public.contacts(id));
create or replace function public.is_admin(uid uuid) returns boolean language sql as $$ select true; $$;
create type public.app_role as enum ('admin', 'agent');
insert into storage.buckets (id, name) values ('avatars', 'avatars');
select cron.schedule('nightly', '0 3 * * *', $$ select net.http_post('https://x.supabase.co/functions/v1/send-email') $$);`);
  w(root, 'supabase/migrations/002_evolve.sql', `alter table public.contacts add column phone text, drop column email;
drop policy if exists "contacts_select" on public.contacts;
create policy "contacts_select" on public.contacts for select to authenticated using (auth.uid() = id);
create policy "contacts_insert" on public.contacts for insert to authenticated with check (true);
drop table public.legacy;
create table public.payments (id uuid primary key, amount numeric);
create trigger trg_pay after insert on public.payments for each row execute function public.is_admin();
alter table public.contacts alter column phone set not null, alter column phone set default 'n/a';
do $$ begin
  drop policy if exists "contacts_insert" on public.contacts;
  create policy "contacts_insert" on public.contacts for insert to service_role with check (true);
  execute format('create policy %I on public.payments for select using (true)', 'dyn');
end $$;`);
  w(root, 'src/integrations/supabase/types.ts', `export type Database = {\n  public: {\n    Tables: {\n      contacts: {\n        Row: {\n          id: string\n          name: string\n          phone: string | null\n          extra_col: string\n        }\n        Insert: { id?: string }\n      }\n    }\n  }\n}`);
  w(root, 'scripts/audit.mjs', `// Audita o banco.\nconsole.log(process.env.DB_URL);`);
  w(root, 'scripts/orphan.sh', `#!/bin/sh\necho x`);
  w(root, '.github/workflows/ci.yml', `name: CI\non:\n  push:\n    branches: [main]\n  pull_request:\npermissions:\n  contents: read\njobs:\n  test:\n    runs-on: ubuntu-latest\n    steps:\n      - run: npm run test\n      - run: node scripts/audit.mjs\n        env:\n          T: \${{ secrets.DB_TOKEN }}\n`);
  execFileSync('git', ['init', '-q'], { cwd: root });
  execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', 'add', '-A'], { cwd: root });
  execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-q', '-m', 'feat: fixture'], { cwd: root });
  return root;
}

const root = fixture();
const out = path.join(root, 'inventario/ia');
execFileSync(process.execPath, [GERADOR, '--quiet'], { cwd: root });
const J = (f) => JSON.parse(fs.readFileSync(path.join(out, f), 'utf8'));

test('gera todos os arquivos e sem erros de seção', () => {
  for (const f of ['INDEX.md', 'manifest.json', 'rotas.json', 'modulos.json', 'componentes.json', 'hooks.json', 'edge-functions.json', 'banco.json', 'ferramentas.json', 'scripts.json', 'testes.json', 'logica.json', 'grafo.json', 'grafo-arestas.json', 'convencoes.json', 'baseline.json', 'grafo-graphify.json']) assert.ok(fs.existsSync(path.join(out, f)), f);
  assert.deepEqual(J('manifest.json').erros, []);
  assert.equal(J('manifest.json').commit.length, 40);
});

test('rotas: aninhamento, index, lazy, proteção herdada e fecho transitivo', () => {
  const r = J('rotas.json'); const by = Object.fromEntries(r.urls.filter((u) => !u.indice).map((u) => [u.caminho, u]));
  assert.equal(by['/login'].arquivo, 'src/pages/Login.tsx');
  assert.equal(by['/app'].arquivo, 'src/components/layout/Shell.tsx');
  assert.equal(by['/app'].protegida, true);
  assert.equal(by['/app/contacts/:id'].arquivo, 'src/components/contacts/ContactPage.tsx');
  assert.equal(by['/app/contacts/:id'].pai, '/app');
  assert.equal(by['/app/contacts/:id'].protegida, true, 'filha herda proteção do pai');
  assert.ok(r.urls.some((u) => u.indice && u.caminho === '/app' && u.arquivo === 'src/components/home/Home.tsx'), 'rota index');
  assert.equal(by['/admin'].lazy, true);
  assert.equal(by['/admin'].arquivo, 'src/pages/admin/Admin.tsx');
  assert.deepEqual(by['/app/contacts/:id'].tabelas, ['contacts']);
  assert.deepEqual(by['/app/contacts/:id'].edges, ['send-email']);
  assert.deepEqual(by['/app/contacts/:id'].hooks_locais, ['useContacts']);
  assert.deepEqual(by['/admin'].papeis, ['admin']);
  assert.equal(by['/access-denied'].arquivo, 'src/pages/Login.tsx', 'path via spread');
  assert.equal(by['/old'].tipo, 'redirect'); assert.equal(by['/old'].redireciona, '/app');
  const vistas = Object.fromEntries(r.vistas.map((v) => [v.id, v]));
  assert.equal(vistas.home.arquivo, 'src/components/home/Home.tsx');
  assert.equal(vistas.achievements.arquivo, 'src/components/achievements/Achievements.tsx', 'SPECIAL_VIEWS com função');
});

test('rotas HTTP de backend (express) e Python (FastAPI)', () => {
  const r = J('rotas.json');
  assert.ok(r.rotas_http_backend.some((x) => x.metodo === 'GET' && x.caminho === '/health' && x.arquivo === 'server/api.ts'));
  assert.ok(r.rotas_http_backend.some((x) => x.metodo === 'GET' && x.caminho === '/items' && x.arquivo === 'backend/app.py'));
});

test('menu: resolve destino, grupo, papéis e aponta item sem destino', () => {
  const r = J('rotas.json'); const m = Object.fromEntries(r.menu.map((x) => [x.rotulo, x]));
  assert.equal(m['Início'].resolve_para, 'src/components/layout/Shell.tsx');
  assert.equal(m['Início'].grupo, 'Principal');
  assert.deepEqual(m['Contatos'].papeis, ['admin']);
  assert.deepEqual(J('baseline.json').alertas.menu_sem_destino, ['Fantasma -> /nada']);
  assert.deepEqual(m['Equipe'].papeis, ['admin', 'supervisor'], 'roles por constante');
  assert.equal(m['Externo'].papeis_nao_resolvidos, 'EXTERNAL');
});

test('módulos: menu → módulo → hooks → edges → tabelas', () => {
  const mod = J('modulos.json').modulos.find((x) => x.modulo === 'components/contacts');
  assert.deepEqual(mod.itens_menu, ['Contatos']);
  assert.deepEqual(mod.hooks_locais, ['useContacts']);
  assert.deepEqual(mod.edges, ['send-email']);
  assert.deepEqual(mod.tabelas, ['contacts']);
  assert.ok(mod.depende_de_modulos.includes('hooks/useContacts.ts') || mod.depende_de_modulos.includes('hooks'));
  assert.ok(mod.depende_de_modulos.includes('components/ui'));
});

test('barrel re-export não gera órfão; componente sem uso é órfão', () => {
  const co = J('componentes.json'); const by = Object.fromEntries(co.componentes.map((x) => [x.arquivo, x]));
  assert.equal(by['src/components/ui/Card.tsx'].orfao, false, 'reexportado pelo index.ts');
  assert.equal(by['src/components/ui/Button.tsx'].orfao, false, 'export * from');
  assert.equal(by['src/components/ui/Unused.tsx'].orfao, true);
  assert.ok(J('componentes.json').componentes.some((x) => x.arquivo === 'src/pages/Login.tsx' && x.export_default === 'Login'));
});

test('hooks: tabelas/edges e cobertura por teste', () => {
  const h = J('hooks.json').hooks.find((x) => x.arquivo === 'src/hooks/useContacts.ts');
  assert.deepEqual(h.hooks_exportados, ['useContacts']);
  assert.deepEqual(h.tabelas, ['contacts']);
  assert.equal(h.usado_por, 2);
  assert.equal(h.coberto_por_testes, 1);
  assert.equal(J('testes.json').arquivos[0].casos, 2);
});

test('edge functions: verify_jwt, env, quem chama, cron e órfãs', () => {
  const e = J('edge-functions.json'); const by = Object.fromEntries(e.edges.map((x) => [x.nome, x]));
  assert.equal(by['send-email'].verify_jwt, true);
  assert.deepEqual(by['send-email'].env, ['RESEND_API_KEY']);
  assert.deepEqual(by['send-email'].metodos, ['POST']);
  assert.deepEqual(by['send-email'].chamada_pelo_front, ['src/hooks/useContacts.ts']);
  assert.equal(by['send-email'].chamada_por_sql_ou_cron, true);
  assert.deepEqual(by['send-email'].hosts_externos, ['api.resend.com']);
  assert.equal(by['stripe-webhook'].verify_jwt, false);
  assert.equal(by['stripe-webhook'].orfa, false, 'webhook sem jwt não é órfã');
  assert.equal(by['orphan-fn'].orfa, true);
});

test('banco: migrations em ordem (add/drop coluna, drop+create policy, drop table), cron, buckets, drift', () => {
  const b = J('banco.json'); const t = b.tabelas.contacts;
  assert.deepEqual(Object.keys(t.colunas), ['created2', 'createdAt', 'id', 'lat', 'name', 'phone'], 'email removida, phone adicionada');
  assert.equal(t.colunas.lat.tipo, 'double precision');
  assert.equal(t.colunas.created2.tipo, 'timestamp with time zone');
  assert.equal(t.colunas.phone.nn, true, 'SET NOT NULL aplicado');
  assert.equal(t.colunas.phone.default, "'n/a'");
  assert.equal(t.policies.find((p) => p.nome === 'contacts_insert').para, 'service_role', 'policy recriada dentro de DO $$');
  assert.equal(b.avisos.length, 1, 'DDL dinâmico sinalizado');
  assert.equal(t.colunas.name.nn, true);
  assert.equal(t.rls, true);
  assert.deepEqual(t.policies.map((p) => p.nome + ':' + p.comando), ['contacts_insert:insert', 'contacts_select:select']);
  assert.deepEqual(t.indices.map((i) => i.nome), ['contacts_email_idx']);
  assert.equal(b.tabelas.legacy, undefined, 'drop table');
  assert.deepEqual(b.tabelas.emails.fks, ['contact_id->contacts']);
  assert.deepEqual(b.tabelas.payments.triggers, ['trg_pay']);
  assert.equal(b.tabelas.payments.sem_rls, true);
  assert.deepEqual(b.funcoes, ['is_admin']);
  assert.deepEqual(b.enums.app_role, ['admin', 'agent']);
  assert.deepEqual(b.cron_jobs, [{ nome: 'nightly', agenda: '0 3 * * *', migration: '001_init.sql', chama_edge: 'send-email' }]);
  assert.ok(b.buckets.some((x) => x.nome === 'avatars' && x.criado_em_sql));
  assert.deepEqual(t.drift, { so_na_migration: ['createdAt', 'lat', 'created2'], so_no_types: ['extra_col'] });
  assert.deepEqual(b.rpcs_usadas_no_codigo, [{ nome: 'is_admin', definida: true, usada_em: 1 }]);
});

test('ferramentas: env, workflows, scripts, integrações, permissões, flags, providers', () => {
  const f = J('ferramentas.json');
  assert.deepEqual(f.env.usadas_mas_nao_declaradas, ['VITE_ANON']);
  assert.equal(f.workflows[0].nome, 'CI');
  assert.deepEqual(f.workflows[0].gatilhos, ['pull_request', 'push']);
  assert.deepEqual(f.workflows[0].secrets, ['DB_TOKEN']);
  assert.deepEqual(f.workflows[0].scripts_usados, ['scripts/audit.mjs']);
  const s = Object.fromEntries(J('scripts.json').scripts.map((x) => [x.arquivo, x]));
  assert.deepEqual(s['scripts/audit.mjs'].npm_scripts, ['audit']);
  assert.equal(s['scripts/audit.mjs'].orfao, false);
  assert.equal(s['scripts/orphan.sh'].orfao, true);
  assert.ok(f.integracoes.sdks.some((x) => x.servico === 'Stripe'));
  assert.ok(f.integracoes.webhooks_recebidos.includes('stripe-webhook'));
  assert.ok(f.integracoes.webhooks_recebidos.includes('POST /webhook/stripe'));
  assert.deepEqual(f.permissoes.papeis_no_codigo, [{ papel: 'admin', ocorrencias: 2 }]);
  assert.deepEqual(f.feature_flags.flags, [{ flag: 'novo-inbox', arquivos: 1 }]);
  assert.ok(f.providers.providers.includes('QueryClientProvider'));
  assert.equal(f.stack.framework, 'React');
  assert.deepEqual(f.stack.backend_http, ['express', 'fastapi']);
});

test('grafo, convenções e determinismo', () => {
  const g = J('grafo.json');
  assert.ok(g.hubs[0].arquivo === 'src/lib/supabase.ts' || g.hubs[0].arquivo === 'src/hooks/useContacts.ts');
  assert.equal(g.ciclos.total, 0);
  const c = J('convencoes.json');
  assert.equal(c.alias_imports['(raiz)']['@/'], 'src/');
  assert.equal(c.typescript.strict, true);
  assert.match(c.nomenclatura.componentes, /^PascalCase/);
  const antes = fs.readFileSync(path.join(out, 'rotas.json'), 'utf8');
  execFileSync(process.execPath, [GERADOR, '--quiet'], { cwd: root });
  assert.equal(fs.readFileSync(path.join(out, 'rotas.json'), 'utf8'), antes, 'saída determinística');
  const l = J('logica.json'); assert.ok(l.arquivos.some((x) => x.arquivo === 'backend/models.py' && x.exports.includes('Item')));
});

test('INDEX.md: rodapé de publicação é genérico por padrão e segue ai-context.config.json → publicacao', () => {
  const idx = fs.readFileSync(path.join(out, 'INDEX.md'), 'utf8');
  assert.match(idx, /Publicado pelo workflow de contexto do repositório/);
  assert.doesNotMatch(idx, /contexto-ia/, 'nome de branch/workflow de um repo específico não pode estar fixo no gerador');
  w(root, 'ai-context.config.json', JSON.stringify({ publicacao: 'Publicado na branch `xyz` pelo workflow `xyz.yml`.' }));
  execFileSync(process.execPath, [GERADOR, '--quiet'], { cwd: root });
  assert.match(fs.readFileSync(path.join(out, 'INDEX.md'), 'utf8'), /Publicado na branch `xyz` pelo workflow `xyz.yml`\./);
  fs.rmSync(path.join(root, 'ai-context.config.json'));
});

function isolatedFixture(t, prepare) {
  const fixtureRoot = fixture();
  t.after(() => fs.rmSync(fixtureRoot, { recursive: true, force: true }));
  prepare(fixtureRoot);
  execFileSync(process.execPath, [GERADOR, '--quiet'], { cwd: fixtureRoot });
  return (name) => JSON.parse(fs.readFileSync(path.join(fixtureRoot, 'inventario/ia', name), 'utf8'));
}

test('git: histórico preserva data, assunto e barras verticais sem executar shell', (t) => {
  const read = isolatedFixture(t, (dir) => {
    execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '--allow-empty', '-q', '-m', 'fix: assunto | literal'], { cwd: dir });
  });
  const commits = read('baseline.json').git.ultimos_commits;
  assert.equal(commits.length, 2);
  assert.equal(commits[0].assunto, 'fix: assunto | literal');
  assert.match(commits[0].sha, /^[a-f0-9]{7,40}$/);
  assert.match(commits[0].data, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(commits[1].assunto, 'feat: fixture');
});

test('banco: arquivos _foreign e _superseded não alteram a reconstrução vigente', (t) => {
  const read = isolatedFixture(t, (dir) => {
    w(dir, 'supabase/migrations/_foreign/singu/001_foreign.sql', `create table public.foreign_only (id int);
select cron.schedule('archived-job', '* * * * *', $$ select net.http_post('https://x.supabase.co/functions/v1/orphan-fn') $$);`);
    w(dir, 'supabase/migrations/_superseded/000_old.sql', `alter table public.contacts add column archived_only text;
create table public.legacy (id int);
create or replace function public.archived_fn() returns boolean language sql as $$ select true $$;
create policy "archived_policy" on public.contacts for select using (true);`);
  });
  const banco = read('banco.json');
  assert.equal(banco.migrations, 2);
  assert.equal(banco.tabelas.foreign_only, undefined);
  assert.equal(banco.tabelas.legacy, undefined);
  assert.equal(banco.tabelas.contacts.colunas.archived_only, undefined);
  assert.ok(!banco.tabelas.contacts.policies.some((p) => p.nome === 'archived_policy'));
  assert.deepEqual(banco.funcoes, ['is_admin']);
  assert.deepEqual(banco.cron_jobs.map((c) => c.nome), ['nightly']);
  const orphan = read('edge-functions.json').edges.find((e) => e.nome === 'orphan-fn');
  assert.equal(orphan.chamada_por_sql_ou_cron, false);
  assert.equal(orphan.orfa, true);
});

test('alertas de aplicação ignoram testes, stories e tooling, preservando seus inventários', (t) => {
  const read = isolatedFixture(t, (dir) => {
    const sample = `supabase.from('ghost_table').select('*'); supabase.rpc('ghost_rpc');
supabase.functions.invoke('ghost-edge'); supabase.functions.invoke('orphan-fn');`;
    for (const file of ['src/__tests__/calls.test.ts', 'src/components/Demo.stories.tsx', 'supabase/functions/send-email/sample.test.ts',
      'scripts/check.mjs', 'tools/check.mjs', '.github/scripts/check.mjs', 'docs/example.ts', 'packages/demo/scripts/check.mjs']) w(dir, file, sample);
    w(dir, 'worker/job.ts', `supabase.from('runtime_table').select('*'); supabase.rpc('runtime_rpc');
supabase.functions.invoke('runtime-missing'); supabase.functions.invoke('runtime-fn');`);
    w(dir, 'supabase/functions/runtime-fn/index.ts', `Deno.serve(() => new Response('ok'));`);
  });
  const baseline = read('baseline.json');
  assert.deepEqual(baseline.alertas.tabelas_usadas_sem_definicao, ['runtime_table']);
  assert.deepEqual(baseline.alertas.rpcs_sem_definicao, ['runtime_rpc']);
  assert.deepEqual(baseline.alertas.edges_chamadas_sem_pasta, ['runtime-missing']);
  const edges = Object.fromEntries(read('edge-functions.json').edges.map((e) => [e.nome, e]));
  assert.equal(edges['orphan-fn'].orfa, true);
  assert.deepEqual(edges['orphan-fn'].chamada_pelo_front, []);
  assert.deepEqual(edges['orphan-fn'].chamada_por_edges, []);
  assert.equal(edges['runtime-fn'].orfa, false);
  assert.deepEqual(edges['runtime-fn'].chamada_pelo_front, ['worker/job.ts']);
  assert.ok(read('scripts.json').scripts.some((s) => s.arquivo === 'scripts/check.mjs'));
  assert.ok(read('testes.json').arquivos.some((s) => s.arquivo === 'src/__tests__/calls.test.ts'));
});

test('alertas respeitam srcDirs explícito quando uma pasta de ferramentas contém a aplicação', (t) => {
  const read = isolatedFixture(t, (dir) => {
    w(dir, 'ai-context.config.json', JSON.stringify({ srcDirs: ['tools'] }));
    w(dir, 'tools/app.ts', `supabase.from('tools_runtime').select('*'); supabase.rpc('tools_rpc'); supabase.functions.invoke('tools-edge');`);
  });
  const alerts = read('baseline.json').alertas;
  assert.ok(alerts.tabelas_usadas_sem_definicao.includes('tools_runtime'));
  assert.ok(alerts.rpcs_sem_definicao.includes('tools_rpc'));
  assert.ok(alerts.edges_chamadas_sem_pasta.includes('tools-edge'));
});

test('diretórios de fixtures permanecem no inventário de testes sem criar alertas de aplicação', (t) => {
  const fixtureFiles = ['src/fixtures/calls.ts', 'src/components/__fixtures__/calls.ts',
    'supabase/functions/send-email/fixtures/calls.ts', 'packages/demo/src/__fixtures__/calls.ts'];
  const read = isolatedFixture(t, (dir) => {
    const sample = `supabase.from('fixture_table').select('*'); supabase.rpc('fixture_rpc');
supabase.functions.invoke('fixture-edge'); supabase.functions.invoke('orphan-fn');`;
    for (const file of fixtureFiles) w(dir, file, sample);
    w(dir, 'src/fixtures-dashboard.ts', `supabase.from('dashboard_table').select('*');
supabase.rpc('dashboard_rpc'); supabase.functions.invoke('dashboard-edge');`);
  });
  const alerts = read('baseline.json').alertas;
  assert.deepEqual(alerts.tabelas_usadas_sem_definicao, ['dashboard_table']);
  assert.deepEqual(alerts.rpcs_sem_definicao, ['dashboard_rpc']);
  assert.deepEqual(alerts.edges_chamadas_sem_pasta, ['dashboard-edge']);
  const files = new Set(read('testes.json').arquivos.map((entry) => entry.arquivo));
  for (const file of fixtureFiles) assert.ok(files.has(file), file);
  assert.ok(!files.has('src/fixtures-dashboard.ts'));
  const orphan = read('edge-functions.json').edges.find((edge) => edge.nome === 'orphan-fn');
  assert.equal(orphan.orfa, true);
  assert.deepEqual(orphan.chamada_pelo_front, []);
  assert.deepEqual(orphan.chamada_por_edges, []);
});

// ---------------------------------------------------------------------------------------------
// Regressões da auditoria: cada teste abaixo trava um valor que já saiu errado no contexto publicado
// ou um mutante que sobrevivia às duas suítes. Asserts de VALOR — "não quebrou" não basta.
// ---------------------------------------------------------------------------------------------
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
const sha16 = (s) => crypto.createHash('sha256').update(s).digest('hex').slice(0, 16);
const cli = (args, opts = {}) => spawnSync(process.execPath, [GERADOR, ...args], { encoding: 'utf8', ...opts });

test('fixture base: contagens, rotas públicas, lista do INDEX, hashes do manifest, sem_teste, telas do módulo, nao_usada', () => {
  const r = J('rotas.json'); const b = J('baseline.json'); const m = J('manifest.json'); const f = J('ferramentas.json');
  const idx = fs.readFileSync(path.join(out, 'INDEX.md'), 'utf8');
  assert.equal(r.urls.length, 7);
  assert.equal(b.contagens.rotas, 7); assert.equal(m.contagens.rotas, 7); assert.match(idx, /\| rotas \| 7 \|/);
  assert.equal(r.resumo.urls, 7);
  const prot = Object.fromEntries(r.urls.map((u) => [u.caminho + (u.indice ? '#index' : ''), u.protegida]));
  assert.deepEqual(prot, { '/access-denied': false, '/admin': false, '/app': true, '/app#index': true, '/app/contacts/:id': true, '/login': false, '/old': false });
  assert.deepEqual(f.permissoes.rotas_publicas, ['/access-denied', '/admin', '/login']);
  assert.equal(f.permissoes.rotas_protegidas, 3);
  assert.ok(idx.includes('- `/login` [tela] → src/pages/Login.tsx\n'), 'INDEX lista a rota pública sem "(protegida)"');
  assert.ok(idx.includes('- `/app/contacts/:id` [tela] → src/components/contacts/ContactPage.tsx (protegida)\n'), 'INDEX lista a rota protegida');
  assert.match(idx, /públicas: \/access-denied, \/admin, \/login/);
  assert.deepEqual(Object.keys(m.arquivos).sort(), fs.readdirSync(out).filter((x) => x !== 'manifest.json').sort());
  for (const [nome, hash] of Object.entries(m.arquivos)) assert.equal(hash, sha16(fs.readFileSync(path.join(out, nome), 'utf8')), `hash de ${nome}`);
  const e = Object.fromEntries(J('edge-functions.json').edges.map((x) => [x.nome, x]));
  assert.deepEqual(e['send-email'].tabelas, ['emails']); assert.deepEqual(e['stripe-webhook'].tabelas, ['payments']);
  const t = J('testes.json');
  assert.deepEqual(t.sem_teste.edges, ['orphan-fn', 'send-email', 'stripe-webhook']);
  assert.deepEqual(t.sem_teste.hooks, []);
  assert.ok(t.sem_teste.telas.includes('src/pages/Login.tsx') && t.sem_teste.telas.includes('src/components/contacts/ContactPage.tsx'));
  assert.deepEqual(t.cobertura_por_arquivo, { 'src/hooks/useContacts.ts': 1 });
  assert.equal(t.total, 1); assert.equal(t.suporte_total, 0);
  const mod = Object.fromEntries(J('modulos.json').modulos.map((x) => [x.modulo, x]));
  assert.deepEqual(mod['components/contacts'].telas, ['/app/contacts/:id']);
  assert.deepEqual(mod['components/layout'].telas, ['/app']);
  const tb = J('banco.json').tabelas;
  assert.equal(tb.contacts.nao_usada, false, 'usada no front'); assert.equal(tb.contacts.usada_no_front, 1);
  assert.equal(tb.payments.nao_usada, false, 'usada só em edge'); assert.deepEqual(tb.payments.usada_em_edges, ['stripe-webhook']);
  assert.deepEqual(m.avisos, []); assert.deepEqual(b.avisos_do_gerador, []);
  assert.deepEqual(b.alertas.rotas_nao_interpretadas, []); assert.deepEqual(b.alertas.tabelas_so_no_types, []);
});

test('determinismo: todos os arquivos idênticos entre duas execuções (só manifest.gerado_em muda)', () => {
  const ler = () => Object.fromEntries(fs.readdirSync(out).sort().map((n) => [n, fs.readFileSync(path.join(out, n), 'utf8')]));
  execFileSync(process.execPath, [GERADOR, '--quiet'], { cwd: root }); const a = ler();
  execFileSync(process.execPath, [GERADOR, '--quiet'], { cwd: root }); const b = ler();
  assert.deepEqual(Object.keys(a), Object.keys(b)); assert.equal(Object.keys(a).length, 17);
  for (const n of Object.keys(a)) {
    if (n !== 'manifest.json') { assert.equal(b[n], a[n], `${n} mudou entre execuções`); continue; }
    const ma = JSON.parse(a[n]), mb = JSON.parse(b[n]); delete ma.gerado_em; delete mb.gerado_em; assert.deepEqual(mb, ma);
  }
});

test('determinismo: janelas de git contam a partir do commit HEAD, não do relógio', (t) => {
  const read = isolatedFixture(t, (dir) => {
    const env = { ...process.env, GIT_COMMITTER_DATE: '2020-01-01T12:00:00Z', GIT_AUTHOR_DATE: '2020-01-01T12:00:00Z' };
    execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-q', '--amend', '--no-edit', '--date=2020-01-01T12:00:00Z'], { cwd: dir, env });
  });
  const g = read('baseline.json').git;
  assert.match(g.data_commit, /^2020-01-01/);
  assert.ok(g.arquivos_mudados_7d >= 30, `commit de 2020 continua dentro da janela de 7 dias do próprio HEAD (obtido ${g.arquivos_mudados_7d})`);
  assert.ok(g.arquivos_mais_mudados_90d.some((x) => x.arquivo === 'src/main.tsx'));
  assert.deepEqual(g.autores_30d, [{ autor: 't', commits: 1 }]);
});

test('erro de seção é registrado no manifest, no baseline e avisado no INDEX', (t) => {
  let dirFx;
  const read = isolatedFixture(t, (dir) => { dirFx = dir; w(dir, 'graphify-out/graph.json', '{ nope'); });
  assert.deepEqual(read('manifest.json').erros.map((e) => e.secao), ['graphify']);
  assert.deepEqual(read('baseline.json').erros_do_gerador.map((e) => e.secao), ['graphify']);
  assert.match(read('manifest.json').erros[0].erro, /SyntaxError|JSON/);
  assert.match(fs.readFileSync(path.join(dirFx, 'inventario/ia/INDEX.md'), 'utf8'), /⚠️ 1 seção\(ões\) falharam/);
  assert.equal(read('rotas.json').urls.length, 7, 'as outras seções continuam saindo');
});

test('A1 rotas: proteção vem dos wrappers e do layout pai, não do nome da página nem de props; M1 rotas não somem', (t) => {
  const read = isolatedFixture(t, (dir) => {
    w(dir, 'src/routes/paths.ts', `export const PATHS = { dinamica: '/dinamica' };`);
    w(dir, 'src/routes/Publicas.tsx', `import { Routes, Route, Navigate } from 'react-router-dom';
import { lazy } from 'react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { AuthPageSkeleton } from '@/components/loading';
import { PATHS } from './paths';
const AuthPage = lazy(() => import('@/pages/AuthPage'));
const AdminDocs = lazy(() => import('@/pages/AdminDocs'));
const Painel = lazy(() => import('@/pages/Painel'));
const Docs = lazy(() => import('@/pages/Docs'));
const NotFound = lazy(() => import('@/pages/NotFound'));
export const Publicas = () => (<Routes>
  <Route path="/auth" element={<PublicPage fallback={<AuthPageSkeleton />}><AuthPage /></PublicPage>} />
  <Route path="/admin-docs" element={<AdminDocs />} />
  <Route path="*" element={<PublicPage fallback={<AuthPageSkeleton />}><NotFound /></PublicPage>} />
  <Route element={<ProtectedRoute />}>
    <Route path="/painel" element={<Painel />} />
    <Route path="/painel/config" element={<Painel aba="config" />} />
  </Route>
  <Route path="/docs/*" element={<Docs accept="image/*" />} />
  {/* comentário logo depois do splat */}
  <Route path="/com-state" element={<Navigate to="/auth" state={{ de: { origem: 'x' } }} replace />} />
  <Route path="/depois" element={<Docs estilo={{ a: { b: 1 } }} render={() => <b>x</b>} />} />
  <Route path={PATHS.dinamica} element={<Docs />} />
  <Route path={\`/u/\${id}\`} element={<Docs />} />
  <Route path="/guard" element={<ProtectedPage fallback={<AuthPageSkeleton />} allowedRoles={['manager']}><Docs /></ProtectedPage>} />
  <Route path="/erro" element={<Docs />} errorElement={<AuthPageSkeleton />} />
</Routes>);`);
    for (const p of ['AuthPage', 'AdminDocs', 'Painel', 'Docs', 'NotFound']) w(dir, `src/pages/${p}.tsx`, `export default function ${p}() { return <div/>; }`);
    w(dir, 'src/components/loading/index.tsx', `export const AuthPageSkeleton = () => <i/>;`);
    w(dir, 'src/router.tsx', `import { createBrowserRouter } from 'react-router-dom';
import { Shell } from '@/components/layout/Shell';
import { Home } from '@/components/home/Home';
import Login from '@/pages/Login';
export const router = createBrowserRouter([
  { path: '/o', element: <Shell/>, children: [
    { index: true, element: <Home/> },
    { path: 'u', element: <Login/>, children: [ { path: ':id', element: <Login/> } ] },
    { path: ROTA_VAR, element: <Login/> },
  ] },
]);`);
  });
  const urls = read('rotas.json').urls; const by = Object.fromEntries(urls.filter((u) => !u.indice && u.definida_em !== 'src/router.tsx').map((u) => [u.caminho, u]));
  assert.equal(by['/auth'].protegida, false, 'AuthPage + fallback AuthPageSkeleton não protegem');
  assert.equal(by['/auth'].arquivo, 'src/pages/AuthPage.tsx'); assert.deepEqual(by['/auth'].wrappers, ['PublicPage']);
  assert.equal(by['/admin-docs'].protegida, false, 'nome da página com Admin não protege');
  assert.equal(by['/*'].protegida, false); assert.equal(by['/*'].arquivo, 'src/pages/NotFound.tsx');
  assert.equal(by['/painel'].protegida, true, 'filha de rota-layout sem path com guard');
  assert.equal(by['/painel/config'].protegida, true);
  assert.equal(by['/guard'].protegida, true); assert.deepEqual(by['/guard'].wrappers, ['ProtectedPage']);
  assert.equal(by['/docs/*'].arquivo, 'src/pages/Docs.tsx', 'splat seguido de comentário JSX');
  assert.equal(by['/com-state'].tipo, 'redirect'); assert.equal(by['/com-state'].redireciona, '/auth');
  assert.equal(by['/depois'].arquivo, 'src/pages/Docs.tsx', 'três níveis de chaves e arrow function no element');
  assert.equal(by['/erro'].arquivo, 'src/pages/Docs.tsx', 'errorElement não vira o componente da rota');
  assert.equal(by['/erro'].protegida, false);
  const obj = urls.filter((u) => u.definida_em === 'src/router.tsx').map((u) => `${u.caminho}${u.indice ? '#index' : ''}→${u.arquivo}`);
  assert.deepEqual(obj, ['/o→src/components/layout/Shell.tsx', '/o#index→src/components/home/Home.tsx', '/o/u→src/pages/Login.tsx', '/o/u/:id→src/pages/Login.tsx']);
  const pub = read('ferramentas.json').permissoes.rotas_publicas;
  for (const c of ['/auth', '/admin-docs', '/*', '/docs/*', '/depois', '/erro']) assert.ok(pub.includes(c), `${c} é pública`);
  for (const c of ['/painel', '/painel/config', '/guard', '/app']) assert.ok(!pub.includes(c), `${c} é protegida`);
  const al = read('baseline.json').alertas.rotas_nao_interpretadas;
  assert.equal(al.length, 2);
  assert.match(al.find((x) => x.startsWith('src/routes/Publicas.tsx')), /^src\/routes\/Publicas\.tsx: 2 de 13 rota\(s\) não interpretada\(s\) — ex\.: .*path=\{PATHS\.dinamica\}/);
  assert.match(al.find((x) => x.startsWith('src/router.tsx')), /^src\/router\.tsx: 1 de 5 rota\(s\) não interpretada\(s\) — ex\.: path: ROTA_VAR/);
  assert.deepEqual(read('manifest.json').erros, []);
});

test('A2: fixtures em scripts/ (tooling) não viram rota HTTP, hook, tabela, flag, papel, host, bucket, canal nem segredo', (t) => {
  const read = isolatedFixture(t, (dir) => {
    w(dir, 'scripts/cenarios-falsos.mjs', `const fx = "app.get('/falsa', h); export function useFalso() {} isFeatureEnabled('flag-falsa'); if (role === 'papel_falso') {}";
export function useDeFerramenta() {}
const d = "pgTable('tabela_falsa', { id: int('id') })"; const e = "@Entity('entidade_falsa')\\nexport class X {}";
fetch('https://evil-host.io/x'); supabase.storage.from('bucket-falso'); supabase.channel('canal-falso');
const k = 'sk_live_abcdefghijklmnopqrstuv';
const L = lazy(() => import('../src/pages/Login'));`);
    w(dir, 'scripts/ferramenta.unit.mjs', `import './cenarios-falsos.mjs';\nconst fx = "import Login from '@/pages/Login'; import { supabase } from '@/lib/supabase';";\ntest('x', () => {});`);
    w(dir, 'scripts/modelo.py', `from sqlalchemy.orm import DeclarativeBase\nclass Base(DeclarativeBase):\n    pass\nclass Falsa(Base):\n    pass\n@app.get('/py-falsa')\ndef f():\n    pass\n`);
  });
  assert.deepEqual(read('rotas.json').rotas_http_backend.map((x) => `${x.metodo} ${x.caminho} ${x.arquivo}`), ['GET /health server/api.ts', 'GET /items backend/app.py', 'POST /webhook/stripe server/api.ts']);
  assert.equal(read('baseline.json').contagens.rotas_http_backend, 3);
  assert.deepEqual(read('hooks.json').hooks.map((h) => h.arquivo), ['src/hooks/useContacts.ts']);
  const b = read('banco.json');
  assert.deepEqual(b.fonte, ['python-models', 'src/integrations/supabase/types.ts', 'supabase/migrations']);
  for (const tb of ['tabela_falsa', 'entidade_falsa', 'Falsa']) assert.equal(b.tabelas[tb], undefined, tb);
  assert.ok(b.tabelas.Item, 'modelo Python da aplicação continua');
  assert.deepEqual(b.buckets.map((x) => x.nome), ['avatars']);
  const f = read('ferramentas.json');
  assert.deepEqual(f.feature_flags.flags, [{ flag: 'novo-inbox', arquivos: 1 }]);
  assert.deepEqual(f.permissoes.papeis_no_codigo, [{ papel: 'admin', ocorrencias: 2 }]);
  assert.deepEqual(f.integracoes.hosts_externos, [{ host: 'api.resend.com', arquivos: 1 }]);
  assert.deepEqual(f.integracoes.realtime, []);
  assert.deepEqual(read('baseline.json').alertas.possiveis_segredos_no_codigo, []);
  assert.deepEqual(Object.keys(read('rotas.json').lazy), ['AchievementsLazy', 'Admin', 'HomeLazy'], 'lazy de tooling não entra no mapa');
  assert.ok(read('scripts.json').scripts.some((s) => s.arquivo === 'scripts/cenarios-falsos.mjs'), 'o script continua no inventário de scripts');
  const tst = read('testes.json');
  assert.deepEqual(tst.cobertura_por_arquivo, { 'scripts/cenarios-falsos.mjs': 1, 'src/hooks/useContacts.ts': 1 }, 'teste de ferramenta não "cobre" src/ por fixture em string');
  assert.deepEqual(tst.arquivos.find((a) => a.arquivo === 'scripts/ferramenta.unit.mjs').testa, ['scripts/cenarios-falsos.mjs']);
  assert.ok(tst.sem_teste.telas.includes('src/pages/Login.tsx'));
});

test('A3 edges: wrapper, constante, quebra de linha e generic contam como chamada; literal solto não', (t) => {
  const read = isolatedFixture(t, (dir) => {
    w(dir, 'src/lib/edgeFetch.ts', 'export const edgeFetch = (p: string, init?: RequestInit) => fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${p}`, init);');
    w(dir, 'src/uso.ts', `import { edgeFetch } from '@/lib/edgeFetch';
export const a = () => edgeFetch("orphan-fn?acao=x", { method: 'POST' });
const FN = 'fn-const';
export const b = () => supabase.functions.invoke(FN, { body: {} });
export const c = () => supabase.functions
  .invoke('fn-multi');
export const d = () => supabase.functions.invoke<Resposta>('fn-generic');
export const rotulos = { 'fn-literal': 'só um rótulo', tag: 'fn-literal' };`);
    w(dir, 'src/semImport.ts', `export const z = () => edgeFetch('fn-literal');`);
    for (const n of ['fn-const', 'fn-multi', 'fn-generic', 'fn-literal']) w(dir, `supabase/functions/${n}/index.ts`, `Deno.serve(() => new Response('x'));`);
  });
  const e = Object.fromEntries(read('edge-functions.json').edges.map((x) => [x.nome, x]));
  for (const n of ['orphan-fn', 'fn-const', 'fn-multi', 'fn-generic']) { assert.deepEqual(e[n].chamada_pelo_front, ['src/uso.ts'], n); assert.equal(e[n].orfa, false, n); }
  assert.deepEqual(e['fn-literal'].chamada_pelo_front, [], 'chave/valor de objeto e chamada sem importar o wrapper não contam');
  assert.equal(e['fn-literal'].orfa, true);
  assert.deepEqual(read('baseline.json').alertas.edges_orfas, ['fn-literal']);
  assert.deepEqual(read('baseline.json').alertas.edges_chamadas_sem_pasta, []);
  assert.doesNotMatch(fs.readFileSync(GERADOR, 'utf8'), /technical-assistant/, 'nenhum nome de função deste repo fixo no gerador');
});

test('A4 rotas: fecho só por import estático e campo `diretos` (tela + imports de 1º nível, barrel resolvido)', (t) => {
  const read = isolatedFixture(t, (dir) => {
    w(dir, 'src/routes/Leve.tsx', `import { Routes, Route } from 'react-router-dom';\nimport { lazy } from 'react';\nconst Leve = lazy(() => import('@/pages/Leve'));\nexport const R = () => <Routes><Route path="/leve" element={<Leve />} /></Routes>;`);
    w(dir, 'src/pages/Leve.tsx', `import { prefetch } from '@/lib/prefetch';\nimport { useLeve } from '@/hooks2';\nexport default function Leve() { prefetch(); useLeve(); supabase.functions.invoke('send-email'); return <p/>; }`);
    w(dir, 'src/lib/prefetch.ts', `export const prefetch = () => import('@/pages/Pesada');`);
    w(dir, 'src/pages/Pesada.tsx', `export default function Pesada() { supabase.from('payments'); supabase.rpc('is_admin'); return <p/>; }`);
    w(dir, 'src/hooks2/index.ts', `export * from './useLeve';\nexport * from './useOutro';`);
    w(dir, 'src/hooks2/useLeve.ts', `import { fundo } from '@/lib/fundo';\nexport const useLeve = () => { fundo(); return supabase.from('emails'); };`);
    w(dir, 'src/hooks2/useOutro.ts', `export const useOutro = () => supabase.from('contacts');`);
    w(dir, 'src/lib/fundo.ts', `export const fundo = () => supabase.from('tabela_do_fundo');`);
  });
  const u = read('rotas.json').urls.find((x) => x.caminho === '/leve');
  assert.equal(u.arquivo, 'src/pages/Leve.tsx');
  assert.deepEqual(u.tabelas, ['emails', 'tabela_do_fundo'], 'payments só é alcançada por import() e contacts (useOutro) não é importado do barrel');
  assert.deepEqual(u.rpcs, []);
  assert.deepEqual(u.diretos, { tabelas: ['emails'], rpcs: [], edges: ['send-email'] }, 'barrel conta só pelo hook importado');
  assert.equal(u.arquivos_puxados, 4);
  assert.deepEqual(read('grafo-arestas.json').arestas['src/lib/prefetch.ts'], ['src/pages/Pesada.tsx'], 'import() continua no grafo (não vira órfão)');
  assert.equal(read('componentes.json').componentes.find((x) => x.arquivo === 'src/pages/Pesada.tsx').orfao, false);
  assert.match(read('rotas.json').descricao, /diretos/);
});

test('M2 Python: import de módulo irmão/ancestral, importlib por caminho e def test_ dentro de classe', (t) => {
  const read = isolatedFixture(t, (dir) => {
    w(dir, 'scripts/gx/run.py', 'from corpus import x\nimport pipeline, json\n');
    w(dir, 'scripts/gx/corpus.py', 'x = 1\n'); w(dir, 'scripts/gx/pipeline.py', 'y = 1\n'); w(dir, 'scripts/gx/solto.py', 'z = 1\n');
    w(dir, 'scripts/gx/tests/test_corpus.py', 'import unittest\nfrom corpus import x\nclass T(unittest.TestCase):\n    def test_a(self):\n        pass\n    async def test_b(self):\n        pass\ndef test_topo():\n    pass\ndef helper():\n    pass\n');
    w(dir, 'scripts/rn/gerar.py', 'def main():\n    pass\n');
    w(dir, 'scripts/rn/test_gerar.py', 'import importlib.util\nfrom pathlib import Path\nSCRIPT = Path(__file__).with_name("gerar.py")\nclass T:\n    def test_x(self):\n        pass\n');
    w(dir, '.github/workflows/py.yml', 'name: PY\non: [push]\njobs:\n  j:\n    runs-on: x\n    steps:\n      - run: python3 scripts/gx/run.py\n');
  });
  const l = Object.fromEntries(read('logica.json').arquivos.map((a) => [a.arquivo, a]));
  assert.equal(l['scripts/gx/corpus.py'].usado_por, 1); assert.equal(l['scripts/gx/corpus.py'].orfao, false); assert.equal(l['scripts/gx/corpus.py'].coberto_por_testes, 1);
  assert.equal(l['scripts/gx/pipeline.py'].orfao, false);
  assert.equal(l['scripts/gx/run.py'].orfao, false, 'ponto de entrada chamado por workflow');
  assert.equal(l['scripts/gx/solto.py'].orfao, true, 'quem ninguém importa nem chama continua órfão');
  assert.deepEqual(l['scripts/gx/run.py'].externos, ['json']);
  assert.equal(l['scripts/rn/gerar.py'].coberto_por_testes, 1, 'teste carrega o script por caminho');
  assert.equal(l['backend/models.py'].usado_por, 1, 'from . import models');
  assert.deepEqual(read('grafo-arestas.json').arestas['scripts/gx/run.py'], ['scripts/gx/corpus.py', 'scripts/gx/pipeline.py']);
  const tst = Object.fromEntries(read('testes.json').arquivos.map((a) => [a.arquivo, a]));
  assert.equal(tst['scripts/gx/tests/test_corpus.py'].casos, 3); assert.deepEqual(tst['scripts/gx/tests/test_corpus.py'].testa, ['scripts/gx/corpus.py']);
  assert.equal(tst['scripts/rn/test_gerar.py'].casos, 1);
  assert.deepEqual(read('scripts.json').scripts.filter((s) => s.orfao).map((s) => s.arquivo), ['scripts/gx/solto.py', 'scripts/orphan.sh']);
});

test('M3 banco: drop de lista, drop policy/alter não ressuscitam, types.ts antigo vira alerta, nomes de protótipo não derrubam a seção', (t) => {
  const read = isolatedFixture(t, (dir) => {
    w(dir, 'supabase/migrations/003_cria.sql', `create table public.morta (id int);\ncreate table public.a1 (id int);\ncreate table "public"."b1" (id int);\ncreate table public.volta (id int);\ncreate table public.sozinha (id int);`);
    w(dir, 'supabase/migrations/004_drop.sql', `DROP TABLE IF EXISTS public.morta;\ndrop policy if exists "p" on public.morta;\nalter table if exists public.morta enable row level security;\ncreate index morta_idx on public.morta (id);\ndrop table if exists public.a1, "public"."b1" cascade;\ndrop policy if exists "x" on public.nunca_existiu;\ndrop table public.volta;\ncreate table public.volta (id int, novo text);\ncreate table public.constructor (id int);\ncreate table public.__proto__ (id int);\ncreate type public.constructor as enum ('x');\nalter type public.tostring add value 'y';`);
    w(dir, 'src/integrations/supabase/types.ts', `export type Database = {\n  public: {\n    Tables: {\n      contacts: {\n        Row: {\n          id: string\n        }\n      }\n      morta: {\n        Row: {\n          id: number\n        }\n      }\n      so_types: {\n        Row: {\n          id: number\n        }\n      }\n    }\n  }\n}`);
    w(dir, 'src/protos.ts', `supabase.from('constructor'); isFeatureEnabled('toString'); isFeatureEnabled('toString'); if (role === 'valueOf') {}`);
  });
  const b = read('banco.json'); const nomes = Object.keys(b.tabelas);
  assert.deepEqual(read('manifest.json').erros, []);
  for (const tb of ['morta', 'a1', 'b1', 'legacy', 'nunca_existiu']) assert.ok(!nomes.includes(tb), `${tb} não existe mais`);
  assert.deepEqual(Object.keys(b.tabelas.volta.colunas), ['id', 'novo'], 'recriada depois do drop');
  assert.deepEqual(nomes, ['Base', 'Item', '__proto__', 'constructor', 'contacts', 'emails', 'payments', 'so_types', 'sozinha', 'volta']);
  assert.equal(read('baseline.json').contagens.tabelas, 10);
  assert.equal(b.tabelas.constructor.criada_em, '004_drop.sql'); assert.equal(b.tabelas.constructor.nao_usada, false);
  assert.equal(b.tabelas.sozinha.nao_usada, true); assert.equal(b.tabelas.sozinha.sem_rls, true);
  assert.deepEqual(b.enums.constructor, ['x']); assert.deepEqual(b.enums.tostring, ['y']);
  assert.deepEqual(b.tabelas_so_no_types, [{ tabela: 'morta', motivo: 'dropada em 004_drop.sql' }, { tabela: 'so_types', motivo: 'sem create table nas migrations' }]);
  assert.deepEqual(read('baseline.json').alertas.tabelas_so_no_types, ['morta', 'so_types']);
  assert.equal(b.tabelas.so_types.criada_em, null); assert.deepEqual(b.tabelas.so_types.colunas_types, { id: 'number' });
  const f = read('ferramentas.json');
  assert.deepEqual(f.feature_flags.flags, [{ flag: 'toString', arquivos: 1 }, { flag: 'novo-inbox', arquivos: 1 }].sort((x, y) => y.arquivos - x.arquivos || (x.flag < y.flag ? -1 : 1)));
  assert.ok(f.permissoes.papeis_no_codigo.some((p) => p.papel === 'valueOf' && p.ocorrencias === 1));
});

test('M4 testes: helpers são suporte (fora do total), src/features/qa|spec é aplicação, *_test.ts (Deno) é teste', (t) => {
  const read = isolatedFixture(t, (dir) => {
    w(dir, 'src/test/setup.ts', `import '@testing-library/jest-dom';`);
    w(dir, 'src/test/realtimeMock.ts', `import { supabase } from '@/lib/supabase';\nexport const mock = () => supabase;`);
    w(dir, 'tests/e2e/helpers/login.ts', `export const login = async () => {};`);
    w(dir, 'tests/e2e/fluxo.spec.ts', `import { login } from './helpers/login';\ntest('fluxo', async () => { await login(); });`);
    w(dir, 'src/features/qa/PainelQa.tsx', `export const PainelQa = () => <div/>;`);
    w(dir, 'src/features/spec/FichaSpec.tsx', `export const FichaSpec = () => <div/>;`);
    w(dir, 'supabase/functions/send-email/index_test.ts', `Deno.test('envia', () => {});\nDeno.test('falha', () => {});`);
    w(dir, 'qa/roteiro.test.ts', `it('roteiro', () => {});`);
  });
  const t2 = read('testes.json'); const arq = Object.fromEntries(t2.arquivos.map((a) => [a.arquivo, a]));
  assert.equal(t2.total, 4, 'useContacts.test + fluxo.spec + index_test + qa/roteiro.test');
  assert.equal(t2.suporte_total, 3);
  assert.deepEqual(t2.arquivos.filter((a) => a.suporte).map((a) => a.arquivo), ['src/test/realtimeMock.ts', 'src/test/setup.ts', 'tests/e2e/helpers/login.ts']);
  assert.deepEqual(t2.por_tipo, { e2e: 1, qa: 1, unit: 2 });
  assert.equal(read('baseline.json').contagens.testes, 4);
  assert.equal(arq['supabase/functions/send-email/index_test.ts'].casos, 2); assert.equal(arq['supabase/functions/send-email/index_test.ts'].suporte, false);
  assert.equal(arq['src/features/qa/PainelQa.tsx'], undefined);
  const comps = read('componentes.json').componentes.map((x) => x.arquivo);
  assert.ok(comps.includes('src/features/qa/PainelQa.tsx') && comps.includes('src/features/spec/FichaSpec.tsx'));
  assert.equal(t2.cobertura_por_arquivo['src/lib/supabase.ts'], undefined, 'import feito por arquivo de suporte não é cobertura');
  assert.equal(read('edge-functions.json').edges.find((e) => e.nome === 'send-email').testes, 1);
  assert.deepEqual(t2.sem_teste.edges, ['orphan-fn', 'stripe-webhook']);
});

test('M5 papéis: role de ARIA/JSX não é papel de usuário', (t) => {
  const read = isolatedFixture(t, (dir) => {
    w(dir, 'src/components/ui/Botao.tsx', `export const Botao = () => <div role="button" aria-label="x"><span role='alert'/><Tabs role={"tablist"} {...{ role: 'dialog' }}/></div>;`);
    w(dir, 'src/lib/perm.ts', `export const pode = (u) => u.role === 'gerente' || hasRole('supervisor');\nexport const G = <Portao role="gerente"/>;`);
  });
  assert.deepEqual(read('ferramentas.json').permissoes.papeis_no_codigo, [{ papel: 'admin', ocorrencias: 2 }, { papel: 'gerente', ocorrencias: 1 }, { papel: 'supervisor', ocorrencias: 1 }]);
});

test('M6 gerenciador de pacotes: packageManager > workflows > lockfile', (t) => {
  const wf = 'name: B\non: [push]\njobs:\n  j:\n    runs-on: x\n    steps:\n      - run: npm ci --legacy-peer-deps\n';
  const pm = (prep) => isolatedFixture(t, prep)('ferramentas.json').stack.gerenciador_pacotes;
  assert.equal(J('ferramentas.json').stack.gerenciador_pacotes, 'não detectado');
  assert.equal(pm((dir) => { w(dir, 'bun.lockb', ''); w(dir, 'package-lock.json', '{}'); }), 'bun', 'só lockfile: ordem antiga');
  assert.equal(pm((dir) => { w(dir, 'bun.lockb', ''); w(dir, 'package-lock.json', '{}'); w(dir, '.github/workflows/b.yml', wf); }), 'npm', 'CI instala com npm ci');
  assert.equal(pm((dir) => { w(dir, 'bun.lockb', ''); w(dir, '.github/workflows/b.yml', wf); const p = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8')); p.packageManager = 'pnpm@9.1.0'; w(dir, 'package.json', JSON.stringify(p)); }), 'pnpm', 'packageManager vence');
});

test('M7 verify_jwt: comentário no config.toml não conta e a chave vale para a seção certa', (t) => {
  const read = isolatedFixture(t, (dir) => {
    w(dir, 'supabase/config.toml', `project_id = "x"\n\n[functions.send-email]\n# antes era verify_jwt = false\nverify_jwt = true\n\n[functions.orphan-fn]\n# ver [docs] sobre jwt\nverify_jwt = false # público\n\n[functions.stripe-webhook]\nstatic_files = ["./a"]\nverify_jwt=false\n\n[auth]\n# verify_jwt = false\n`);
  });
  const e = Object.fromEntries(read('edge-functions.json').edges.map((x) => [x.nome, x]));
  assert.equal(e['send-email'].verify_jwt, true); assert.equal(e['orphan-fn'].verify_jwt, false); assert.equal(e['stripe-webhook'].verify_jwt, false);
  assert.deepEqual(read('edge-functions.json').verify_jwt_false, ['orphan-fn', 'stripe-webhook']);
  assert.equal(e['orphan-fn'].orfa, false);
});

test('menu: item de command palette usa o caminho de navigate*(), ação sem navegação não é menu', (t) => {
  const read = isolatedFixture(t, (dir) => {
    w(dir, 'src/components/navigation/Comandos.tsx', `export const cmds = ({ navigateTo }) => [\n  { id: "nav-admin", name: "Administração", icon: <i/>, action: () => navigateTo("/admin", "nav-admin"), category: "navigation" },\n  { id: "action-refresh", name: "Atualizar", action: () => reload() },\n];`);
  });
  const m = Object.fromEntries(read('rotas.json').menu.map((x) => [x.rotulo, x]));
  assert.equal(m['Administração'].destino, '/admin'); assert.equal(m['Administração'].resolve_para, 'src/pages/admin/Admin.tsx');
  assert.equal(m['Atualizar'], undefined);
  assert.deepEqual(read('baseline.json').alertas.menu_sem_destino, ['Fantasma -> /nada']);
});

test('grafo: arquivo de public/ registrado por caminho (service worker) não é órfão; ciclo de import é contado', (t) => {
  const read = isolatedFixture(t, (dir) => {
    w(dir, 'public/sw.js', `self.addEventListener('push', () => {});`); w(dir, 'public/solto.js', `console.log(1);`);
    w(dir, 'src/ciclo/a.ts', `import { b } from './b';\nexport const a = () => b;`); w(dir, 'src/ciclo/b.ts', `import { a } from './a';\nexport const b = () => a;`);
    fs.appendFileSync(path.join(dir, 'src/main.tsx'), `\nnavigator.serviceWorker\n  .register('/sw.js', { scope: '/' });\n`);
  });
  const o = read('grafo.json').orfaos;
  assert.ok(!o.includes('public/sw.js')); assert.ok(o.includes('public/solto.js'));
  assert.deepEqual(read('grafo.json').ciclos, { total: 1, maiores: [{ tamanho: 2, arquivos: ['src/ciclo/a.ts', 'src/ciclo/b.ts'] }] });
  assert.equal(read('baseline.json').alertas.ciclos_de_import, 1);
});

test('avisos: config inválida, JSON que não parseia e arquivo acima de maxFileMB ficam no manifest; tsconfig com comentário vale', (t) => {
  const r1 = isolatedFixture(t, (dir) => {
    w(dir, 'ai-context.config.json', '{ nope');
    w(dir, 'tsconfig.json', '{\n  // comentário\n  "compilerOptions": { "strict": true, /* bloco */ "paths": { "@app/*": ["./src/*"], }, },\n}');
    w(dir, 'tsconfig.quebrado.json', '{ "compilerOptions": ');
    w(dir, 'src/usaAlias.ts', `import { supabase } from '@app/lib/supabase';\nexport const u = supabase;`);
  });
  assert.deepEqual(r1('manifest.json').avisos.map((a) => `${a.tipo}:${a.arquivo}`), ['config_invalida:ai-context.config.json', 'json_invalido:tsconfig.quebrado.json']);
  assert.deepEqual(r1('baseline.json').avisos_do_gerador, r1('manifest.json').avisos);
  assert.deepEqual(r1('manifest.json').erros, []);
  assert.equal(r1('convencoes.json').alias_imports['(raiz)']['@app/'], 'src/');
  assert.deepEqual(r1('grafo-arestas.json').arestas['src/usaAlias.ts'], ['src/lib/supabase.ts']);
  assert.equal(r1('convencoes.json').typescript.strict, true);
  const r2 = isolatedFixture(t, (dir) => { w(dir, 'ai-context.config.json', JSON.stringify({ maxFileMB: 0.004 })); w(dir, 'src/grande.ts', `export const g = '${'x'.repeat(6000)}';`); });
  assert.deepEqual(r2('manifest.json').avisos, [{ tipo: 'arquivo_ignorado_por_tamanho', arquivo: 'src/grande.ts', detalhe: 'maior que 0.004 MB (maxFileMB) — conteúdo não foi lido' }]);
  assert.deepEqual(r2('manifest.json').erros, []);
});

test('CLI: --root inexistente falha, --help não grava, flag desconhecida ou sem valor sai 2, --out relativo parte de --root', (t) => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ctx-cli-')); t.after(() => fs.rmSync(tmp, { recursive: true, force: true }));
  const vazio = path.join(tmp, 'vazio'); fs.mkdirSync(vazio);
  let r = cli(['--root', path.join(tmp, 'nao-existe')], { cwd: vazio });
  assert.equal(r.status, 1); assert.match(r.stderr, /raiz não existe/); assert.ok(!fs.existsSync(path.join(tmp, 'nao-existe')), 'não cria a raiz');
  r = cli(['--help'], { cwd: vazio });
  assert.equal(r.status, 0); assert.match(r.stdout, /^Uso: /); assert.match(r.stdout, /--out <dir>.*relativo é resolvido a partir de --root/);
  for (const args of [['--out'], ['--root'], ['--bogus'], ['--out', '--quiet'], ['solto']]) { r = cli(args, { cwd: vazio }); assert.equal(r.status, 2, args.join(' ')); assert.match(r.stderr, /argumento desconhecido ou sem valor/); }
  assert.deepEqual(fs.readdirSync(vazio), [], 'nenhuma dessas chamadas grava saída');
  const proj = path.join(tmp, 'proj'); w(proj, 'src/a.ts', 'export const a = 1;');
  r = cli(['--quiet', '--root', proj, '--out', 'saida/ctx'], { cwd: vazio });
  assert.equal(r.status, 0); assert.ok(fs.existsSync(path.join(proj, 'saida/ctx/INDEX.md'))); assert.deepEqual(fs.readdirSync(vazio), []);
  assert.equal(JSON.parse(fs.readFileSync(path.join(proj, 'saida/ctx/baseline.json'), 'utf8')).contagens.arquivos_total, 1, 'a própria saída não entra na contagem');
});

test('rotas-objeto (createBrowserRouter): guard no element, layout sem path e herança para as filhas; pai só com path mantém o prefixo', (t) => {
  const read = isolatedFixture(t, (dir) => {
    w(dir, 'src/pages/Painel.tsx', 'export default function Painel() { return null; }\n');
    w(dir, 'src/pages/Login.tsx', 'export default function Login() { return null; }\n');
    w(dir, 'src/pages/Doc.tsx', 'export default function Doc() { return null; }\n');
    w(dir, 'src/pages/Sub.tsx', 'export default function Sub() { return null; }\n');
    w(dir, 'src/routes/objetos.tsx', `import { createBrowserRouter } from 'react-router-dom';
import Painel from '@/pages/Painel';
import Login from '@/pages/Login';
import Doc from '@/pages/Doc';
import Sub from '@/pages/Sub';
export const router = createBrowserRouter([
  { path: '/login', element: <Login /> },
  { path: '/painel', element: <ProtectedRoute><Painel /></ProtectedRoute>, children: [
    { path: 'sub', element: <Sub /> },
  ] },
  { element: <RequireAuth />, children: [
    { path: '/privada', element: <Doc /> },
    { index: true, element: <Painel /> },
  ] },
  { path: '/pai', children: [
    { path: 'filho', element: <Doc /> },
  ] },
  { path: '/aberta', element: <AuthPageSkeleton><Doc /></AuthPageSkeleton> },
]);
`);
  });
  const prot = Object.fromEntries(read('rotas.json').urls.filter((u) => u.definida_em === 'src/routes/objetos.tsx').map((u) => [u.caminho + (u.indice ? '#index' : ''), u.protegida]));
  assert.equal(prot['/login'], false, 'página sem guard continua pública');
  assert.equal(prot['/painel'], true, 'wrapper <ProtectedRoute> em volta da página');
  assert.equal(prot['/painel/sub'], true, 'filha herda o guard do pai');
  assert.equal(prot['/privada'], true, 'layout sem path com guard protege as filhas');
  assert.equal(prot['/#index'], true, 'índice dentro do layout protegido');
  assert.equal(prot['/pai/filho'], false, 'pai só com path mantém o prefixo e não inventa proteção');
  assert.equal(prot['/aberta'], false, 'AuthPageSkeleton não é guard');
  assert.ok(!('/filho' in prot), 'o filho de um pai sem element não perde o prefixo');
});

test('package.json atípico (workspaces com arquivo, item não-string ou fora de array) não derruba o gerador', (t) => {
  for (const workspaces of [['README.md'], [1, null, 'packages/*'], { packages: 'x' }, 'packages/*']) {
    const read = isolatedFixture(t, (dir) => {
      const pj = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'));
      w(dir, 'package.json', JSON.stringify({ ...pj, workspaces }));
      w(dir, 'packages/app/package.json', JSON.stringify({ name: 'app' }));
    });
    assert.deepEqual(read('manifest.json').erros, [], JSON.stringify(workspaces));
  }
});

test('pastas env/build/out dentro de src/ entram no inventário; na raiz (e node_modules/dist em qualquer nível) continuam de fora', (t) => {
  const read = isolatedFixture(t, (dir) => {
    w(dir, 'src/env/config.ts', 'export const cfg = 1;\n');
    w(dir, 'src/features/build/Builder.tsx', 'export const Builder = () => null;\n');
    w(dir, 'src/out/saida.ts', 'export const saida = 1;\n');
    w(dir, 'build/gerado.ts', 'export const lixo = 1;\n');
    w(dir, 'env/lixo.ts', 'export const lixo = 1;\n');
    w(dir, 'src/node_modules/x/index.ts', 'export const lixo = 1;\n');
    w(dir, 'src/dist/gerado.ts', 'export const lixo = 1;\n');
  });
  const arquivos = JSON.stringify(read('componentes.json')) + JSON.stringify(read('grafo.json'));
  for (const ok of ['src/env/config.ts', 'src/features/build/Builder.tsx', 'src/out/saida.ts']) assert.ok(arquivos.includes(ok), `${ok} deveria aparecer`);
  for (const lixo of ['build/gerado.ts', 'env/lixo.ts', 'src/node_modules/x/index.ts', 'src/dist/gerado.ts']) assert.ok(!arquivos.includes(lixo), `${lixo} não deveria aparecer`);
});

test('fecho por barrel: importa só o que o barrel expõe para os nomes pedidos; namespace, default, export *, renomes e barrel aninhado não perdem dependência', (t) => {
  const read = isolatedFixture(t, (dir) => {
    const pagina = (nome, imports, corpo = 'null') => w(dir, `src/pages/${nome}.tsx`, `${imports}\nexport default function ${nome}() { return ${corpo}; }\n`);
    w(dir, 'src/routes/Barrel.tsx', `import { Routes, Route } from 'react-router-dom';\nimport P1 from '@/pages/P1';\nimport P2 from '@/pages/P2';\nimport P3 from '@/pages/P3';\nimport P4 from '@/pages/P4';\nimport P5 from '@/pages/P5';\nimport P6 from '@/pages/P6';\nimport P7 from '@/pages/P7';\nexport const R = () => <Routes><Route path="/p1" element={<P1 />} /><Route path="/p2" element={<P2 />} /><Route path="/p3" element={<P3 />} /><Route path="/p4" element={<P4 />} /><Route path="/p5" element={<P5 />} /><Route path="/p6" element={<P6 />} /><Route path="/p7" element={<P7 />} /></Routes>;\n`);
    // feature com barrel: a, b (nomeados), c (default re-exportado com outro nome), sub (barrel aninhado com d)
    w(dir, 'src/features/f/index.ts', `export { useA } from './useA';\nexport * from './useB';\nexport { default as useC } from './useC';\nexport { useD as useDD } from './sub';\nexport * from './sub';\n`);
    w(dir, 'src/features/f/useA.ts', `export const useA = () => supabase.from('tab_a');`);
    w(dir, 'src/features/f/useB.ts', `export const useB = () => supabase.from('tab_b');`);
    w(dir, 'src/features/f/useC.ts', `export default () => supabase.from('tab_c');`);
    w(dir, 'src/features/f/sub/index.ts', `export { useD } from './useD';\nexport { useE } from './useE';\n`);
    w(dir, 'src/features/f/sub/useD.ts', `export const useD = () => supabase.from('tab_d');`);
    w(dir, 'src/features/f/sub/useE.ts', `export const useE = () => supabase.from('tab_e');`);
    pagina('P1', `import { useA } from '@/features/f';`, 'useA()');                      // nomeado: só tab_a
    pagina('P2', `import { useB } from '@/features/f';`, 'useB()');                      // export * : tab_b
    pagina('P3', `import { useC } from '@/features/f';`, 'useC()');                      // default re-exportado: tab_c
    pagina('P4', `import { useDD } from '@/features/f';`, 'useDD()');                    // renome + barrel aninhado: tab_d
    pagina('P5', `import * as F from '@/features/f';`, 'F.useA()');                      // namespace: o barrel inteiro
    pagina('P6', `import F from '@/features/f';\nimport type { Algo } from '@/features/f';`, 'F');   // default/tipo: o barrel inteiro
    w(dir, 'src/features/g/index.ts', `export * as ns from './useG';\nexport { useH } from './useH';\n`);
    w(dir, 'src/features/g/useG.ts', `export const g = () => supabase.from('tab_g');`);
    w(dir, 'src/features/g/useH.ts', `export const useH = () => supabase.from('tab_h');`);
    pagina('P7', `import { ns } from '@/features/g';`, 'ns.g()');                          // export * as ns: o módulo inteiro, não só o nome
  });
  const tab = Object.fromEntries(read('rotas.json').urls.map((u) => [u.caminho, u.tabelas]));
  assert.deepEqual(tab['/p1'], ['tab_a'], 'nomeado puxa só o arquivo que exporta');
  assert.deepEqual(tab['/p2'], ['tab_b'], 'export * resolve pelo nome');
  assert.deepEqual(tab['/p3'], ['tab_c'], 'export { default as X } resolve pelo nome exposto');
  assert.deepEqual(tab['/p4'], ['tab_d'], 'renome (as) dentro de barrel aninhado');
  assert.deepEqual(tab['/p5'], ['tab_a', 'tab_b', 'tab_c', 'tab_d', 'tab_e'], 'namespace volta a puxar o barrel inteiro (sem sub-relato)');
  assert.ok(['tab_a', 'tab_b', 'tab_c', 'tab_d', 'tab_e'].every((x) => tab['/p6'].includes(x)), 'default sem nome conhecido também puxa tudo');
  assert.deepEqual(tab['/p7'], ['tab_g'], 'export * as ns puxa o módulo do namespace e não o resto do barrel');
});
