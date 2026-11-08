// Teste do inventario de edge functions lido do repositorio. Roda com: node --test scripts/inventario/
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { execFileSync } from 'node:child_process';

const RAIZ = path.resolve(import.meta.dirname, '..', '..');
const SCRIPT = path.join(RAIZ, 'scripts/inventario/gerar-repo.mjs');

/**
 * Roda o gerar-repo.mjs num repo de mentira. O script resolve a raiz pelo proprio caminho, entao o
 * repo falso recebe uma copia do script na mesma posicao relativa (scripts/inventario/).
 */
function rodarEmRepoFake(arquivos) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'inv-repo-'));
  for (const [rel, conteudo] of Object.entries(arquivos)) {
    const abs = path.join(tmp, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, conteudo);
  }
  fs.mkdirSync(path.join(tmp, 'scripts/inventario'), { recursive: true });
  fs.copyFileSync(SCRIPT, path.join(tmp, 'scripts/inventario/gerar-repo.mjs'));
  execFileSync('node', [path.join(tmp, 'scripts/inventario/gerar-repo.mjs')], { stdio: ['ignore', 'ignore', 'pipe'] });
  const saida = JSON.parse(fs.readFileSync(path.join(tmp, 'inventario/estado/edges.json'), 'utf8'));
  fs.rmSync(tmp, { recursive: true, force: true });
  return saida;
}

test('lista as edges com linhas, segredos lidos e quem chama; _shared fica fora', () => {
  const saida = rodarEmRepoFake({
    'supabase/functions/_shared/cors.ts': 'export const cors = {};',
    'supabase/functions/usada/index.ts': "Deno.env.get('SUPABASE_URL');\nDeno.env.get('MINHA_CHAVE');\n",
    'supabase/functions/orfa/index.ts': 'console.log(1);',
    'src/hooks/useAlgo.ts': "supabase.functions.invoke('usada');",
    'supabase/migrations/20260101000000_x.sql': "select net.http_post(url := '.../functions/v1/usada');",
  });

  assert.deepEqual(Object.keys(saida.edge_functions).sort(), ['orfa', 'usada']);
  assert.ok(!('_shared' in saida.edge_functions), '_shared nao e edge function');
  assert.equal(saida.total, 2);

  const usada = saida.edge_functions.usada;
  assert.deepEqual(usada.segredos_lidos, ['MINHA_CHAVE', 'SUPABASE_URL']);
  assert.equal(usada.chamada_em.src, 1);
  assert.equal(usada.chamada_em.migrations, 1);
  assert.equal(usada.sem_chamador, false);

  assert.equal(saida.edge_functions.orfa.sem_chamador, true);
  assert.deepEqual(saida.sem_chamador_no_repo, ['orfa']);
});

test('pasta sem index.ts nao conta como edge function', () => {
  const saida = rodarEmRepoFake({
    'supabase/functions/completa/index.ts': 'console.log(1);',
    'supabase/functions/pela-metade/util.ts': 'export const x = 1;',
  });
  assert.deepEqual(Object.keys(saida.edge_functions), ['completa']);
});

test('no repo de verdade, edges.json cobre as pastas de supabase/functions', () => {
  const dir = path.join(RAIZ, 'supabase/functions');
  const noDisco = fs.readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith('_') && fs.existsSync(path.join(dir, d.name, 'index.ts')))
    .map((d) => d.name).sort();
  const arquivo = path.join(RAIZ, 'inventario/estado/edges.json');
  if (!fs.existsSync(arquivo)) {
    assert.ok(noDisco.length > 0, 'o repo tem edge functions; rode node scripts/inventario/gerar-repo.mjs');
    return;
  }
  const saida = JSON.parse(fs.readFileSync(arquivo, 'utf8'));
  assert.deepEqual(Object.keys(saida.edge_functions).sort(), noDisco,
    'edges.json desatualizado: rode node scripts/inventario/gerar-repo.mjs < /dev/null');
});
