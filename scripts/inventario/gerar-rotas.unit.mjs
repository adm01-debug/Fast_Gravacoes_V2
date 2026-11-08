// Testes do gerador do inventario de rotas. Roda com: node --test scripts/inventario/
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  MAX_SALTOS,
  extrairChamadas,
  extrairImports,
  fechoDaPagina,
  gerarRotas,
  lerUrls,
  resolverImport,
  serializar,
} from './gerar-rotas.mjs';

const RAIZ = path.resolve(import.meta.dirname, '..', '..');

/** Repo de mentira com AppRoutes.tsx e as paginas que ele cita. */
function repoFake(arquivos) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'inv-rotas-'));
  for (const [rel, conteudo] of Object.entries(arquivos)) {
    const abs = path.join(tmp, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, conteudo);
  }
  return tmp;
}

test('lerUrls pega caminho, pagina, arquivo, protecao, papeis e redirect', () => {
  const tmp = repoFake({
    'src/routes/AppRoutes.tsx': `
const Index = lazyWithRetry(() => import("@/pages/Index"));
const Kanban = lazyWithRetry(() => import("@/pages/Kanban"));
export function AnimatedRoutes() {
  return (<Routes location={location}>
    <Route path="/auth" element={<PublicPage fallback={<AuthPageSkeleton />}><Index /></PublicPage>} />
    <Route path="/kanban" element={<ProtectedPage fallback={<KanbanPageSkeleton />} allowedRoles={['coordinator', 'manager']}><Kanban /></ProtectedPage>} />
    <Route path="/abc" element={<Navigate to="/abc-costing" replace />} />
  </Routes>);
}`,
    'src/pages/Index.tsx': 'export default function Index() { return null; }',
    'src/pages/Kanban.tsx': 'export default function Kanban() { return null; }',
  });
  const urls = lerUrls(tmp);
  assert.deepEqual(urls.map((u) => u.caminho), ['/abc', '/auth', '/kanban']);

  const auth = urls.find((u) => u.caminho === '/auth');
  assert.equal(auth.componente, 'Index');            // o Skeleton nao e a pagina
  assert.equal(auth.arquivo, 'src/pages/Index.tsx');
  assert.equal(auth.protegida, false);
  assert.deepEqual(auth.papeis, []);

  const kanban = urls.find((u) => u.caminho === '/kanban');
  assert.equal(kanban.componente, 'Kanban');
  assert.equal(kanban.protegida, true);
  assert.deepEqual(kanban.papeis, ['coordinator', 'manager']);

  const abc = urls.find((u) => u.caminho === '/abc');
  assert.equal(abc.redireciona, '/abc-costing');
  assert.equal(abc.componente, null);                 // Navigate nao e pagina
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('gerarRotas acusa URL cujo lazy nao resolve e import quebrado', () => {
  const tmp = repoFake({
    'src/routes/AppRoutes.tsx': `
const Existe = lazyWithRetry(() => import("@/pages/Existe"));
const Fantasma = lazyWithRetry(() => import("@/pages/Fantasma"));
export function AnimatedRoutes() {
  return (<Routes>
    <Route path="/existe" element={<ProtectedPage fallback={<ListPageSkeleton />}><Existe /></ProtectedPage>} />
    <Route path="/fantasma" element={<ProtectedPage fallback={<ListPageSkeleton />}><Fantasma /></ProtectedPage>} />
  </Routes>);
}`,
    'src/pages/Existe.tsx': "import { useX } from '@/hooks/useX';\nimport { nada } from '@/lib/naoExiste';\n",
    'src/hooks/useX.ts': "export const useX = () => supabase.from('jobs');",
  });
  const inv = gerarRotas(tmp);
  const tipos = inv.problemas.map((p) => p.tipo);
  assert.ok(tipos.includes('url_sem_arquivo'), 'pagina sem arquivo deveria virar problema');
  assert.ok(tipos.includes('import_quebrado'), 'import local inexistente deveria virar problema');
  assert.equal(inv.resumo.problemas, inv.problemas.length);
  assert.ok(inv.hooks.useX, 'o hook alcancado pela pagina entra no indice');
  assert.deepEqual(inv.hooks.useX.rotas, ['/existe']);
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('extrairChamadas separa tabela, bucket, rpc e edge', () => {
  const c = extrairChamadas(`
    supabase.from('jobs').select('*');
    supabase.storage.from('production-photos').upload(f);
    supabase.rpc('calcular_oee', {});
    supabase.functions.invoke('calculate-rankings', { body });
    await fetch(\`\${SUPABASE_URL}/functions/v1/pdf-generator\`);
    await fetch('/rest/v1/machines');
  `);
  assert.deepEqual(c.tabelas.sort(), ['jobs', 'machines']);
  assert.deepEqual(c.buckets, ['production-photos']);
  assert.deepEqual(c.rpcs, ['calcular_oee']);
  assert.deepEqual(c.edges.sort(), ['calculate-rankings', 'pdf-generator']);
});

test('extrairChamadas resolve constante de string de nivel de modulo e ignora const dentro de funcao', () => {
  const c = extrairChamadas(`
const BUCKET = 'production-photos';
const TABELA = 'jobs';
export function f() {
  const OUTRA = 'nao_resolve';
  return supabase.from(OUTRA);
}
supabase.storage.from(BUCKET);
supabase.from(TABELA);
  `);
  assert.deepEqual(c.buckets, ['production-photos']);
  assert.deepEqual(c.tabelas, ['jobs']);           // OUTRA, de dentro da funcao, nao e resolvida
});

test('extrairImports pega estatico, dinamico e re-export, e descarta import type', () => {
  const imps = extrairImports(`
import React from 'react';
import type { AppRole } from '@/features/auth';
import { useJobs, helper } from '@/hooks/useJobs';
export { algo } from './outro';
const X = () => import('@/pages/Tarde');
  `);
  const especs = imps.map((i) => i.especificador);
  assert.ok(especs.includes('@/hooks/useJobs'));
  assert.ok(especs.includes('./outro'));
  assert.ok(especs.includes('@/pages/Tarde'));
  assert.ok(!especs.includes('@/features/auth'), 'import type nao conta como dependencia de runtime');
  assert.deepEqual(imps.find((i) => i.especificador === '@/hooks/useJobs').nomes, ['useJobs', 'helper']);
});

test('resolverImport entende @/, relativo, extensao implicita, index e externo', () => {
  const tmp = repoFake({
    'src/lib/util.ts': 'export const x = 1;',
    'src/features/pack/index.tsx': 'export const P = 1;',
    'src/pages/A.tsx': '',
  });
  const de = path.join(tmp, 'src/pages/A.tsx');
  assert.equal(resolverImport(tmp, de, '@/lib/util'), path.join(tmp, 'src/lib/util.ts'));
  assert.equal(resolverImport(tmp, de, '../lib/util'), path.join(tmp, 'src/lib/util.ts'));
  assert.equal(resolverImport(tmp, de, '@/features/pack'), path.join(tmp, 'src/features/pack/index.tsx'));
  assert.equal(resolverImport(tmp, de, 'react'), null, 'pacote externo e null');
  assert.equal(resolverImport(tmp, de, '@/lib/sumiu'), undefined, 'local inexistente e undefined');
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('fechoDaPagina segue hooks sem limite e limita componentes a MAX_SALTOS', () => {
  const tmp = repoFake({
    'src/pages/A.tsx': "import { useUm } from '@/hooks/useUm';\nimport { C1 } from '@/components/C1';\n",
    'src/hooks/useUm.ts': "import { useDois } from '@/hooks/useDois';\nexport const useUm = () => supabase.from('jobs');",
    'src/hooks/useDois.ts': "export const useDois = () => supabase.rpc('fundo');",
    'src/components/C1.tsx': "import { C2 } from '@/components/C2';\nexport const C1 = () => supabase.from('machines');",
    'src/components/C2.tsx': "import { C3 } from '@/components/C3';\nexport const C2 = () => supabase.from('materials');",
    'src/components/C3.tsx': "export const C3 = () => supabase.from('longe_demais');",
    'src/components/ui/button.tsx': "export const Button = () => supabase.from('nunca');",
  });
  const f = fechoDaPagina(tmp, path.join(tmp, 'src/pages/A.tsx'));
  assert.ok(f.tabelas.includes('jobs'), 'hook direto entra');
  assert.ok(f.rpcs.includes('fundo'), 'hook de hook entra (pasta livre, sem limite)');
  assert.ok(f.tabelas.includes('machines'), 'componente a 1 salto entra');
  assert.ok(f.tabelas.includes('materials'), 'componente a 2 saltos entra');
  assert.ok(!f.tabelas.includes('longe_demais'), `componente alem de ${MAX_SALTOS} saltos fica fora`);
  assert.ok(!f.tabelas.includes('nunca'), 'kit de UI nunca entra');
  assert.deepEqual(f.hooks.map((h) => h.nome), ['useDois', 'useUm']);
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('fechoDaPagina ignora arquivo de teste', () => {
  const tmp = repoFake({
    'src/pages/A.tsx': "import { useUm } from '@/hooks/useUm';\nimport { h } from '@/hooks/useUm.test';\n",
    'src/hooks/useUm.ts': "export const useUm = () => supabase.from('jobs');",
    'src/hooks/useUm.test.ts': "export const h = () => supabase.from('so_no_teste');",
  });
  const f = fechoDaPagina(tmp, path.join(tmp, 'src/pages/A.tsx'));
  assert.ok(f.tabelas.includes('jobs'));
  assert.ok(!f.tabelas.includes('so_no_teste'));
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('gerarRotas e deterministico e serializa com quebra de linha final', () => {
  const a = serializar(gerarRotas(RAIZ));
  const b = serializar(gerarRotas(RAIZ));
  assert.equal(a, b, 'duas execucoes seguidas tem de dar o mesmo arquivo (sem data na saida)');
  assert.ok(a.endsWith('}\n'));
  assert.ok(!a.includes('gerado_em'), 'rotas.json nao tem carimbo de data de proposito');
});

test('gerarRotas no repo de verdade acha as rotas conhecidas', () => {
  const inv = gerarRotas(RAIZ);
  assert.ok(inv.resumo.urls > 20, `esperava muitas rotas, veio ${inv.resumo.urls}`);
  const caminhos = inv.urls.map((u) => u.caminho);
  for (const esperado of ['/', '/auth', '/kanban', '/packaging', '/settings']) {
    assert.ok(caminhos.includes(esperado), `rota ${esperado} deveria estar no inventario`);
  }
  const auth = inv.urls.find((u) => u.caminho === '/auth');
  assert.equal(auth.protegida, false, '/auth e publica');
  const settings = inv.urls.find((u) => u.caminho === '/settings');
  assert.equal(settings.protegida, true, '/settings e protegida');
  assert.ok(settings.papeis.length > 0, '/settings declara allowedRoles');
  assert.ok(inv.urls.every((u) => u.arquivo || u.redireciona || !u.componente),
    'toda rota com pagina resolve o arquivo da pagina');
});
