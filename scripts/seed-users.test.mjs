// Testes do seed de usuários — `node --test scripts/seed-users.test.mjs`.
// Nenhuma chamada real: um preload troca o fetch global por um mock.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const SEED = join(dirname(fileURLToPath(import.meta.url)), '..', 'supabase', 'seed-users.mjs');
const mock = (corpo) => `data:text/javascript,${encodeURIComponent(`let n=0;globalThis.fetch=async(url,init)=>{n++;${corpo}};`)}`;
const resp = (status, body) => `return new Response(${JSON.stringify(JSON.stringify(body))},{status:${status}});`;

function run(env, preload) {
  const limpo = Object.fromEntries(Object.entries(process.env).filter(([k]) => !/^(SUPABASE_|ALLOW_PRODUCTION_SEED)/.test(k)));
  const r = spawnSync(process.execPath, ['--import', preload ?? mock('throw new Error("fetch não devia ser chamado")'), SEED], {
    encoding: 'utf8',
    env: { ...limpo, ...env },
  });
  return { code: r.status, out: `${r.stdout}${r.stderr}` };
}
const DEV = { SUPABASE_ACCESS_TOKEN: 't', SUPABASE_PROJECT_REF: 'devref', SUPABASE_SEED_ALLOWED_REFS: 'devref,stgref' };

test('falha fechado sem token, sem ref ou com ref fora da lista', () => {
  assert.equal(run({}).code, 1);
  assert.equal(run({ SUPABASE_ACCESS_TOKEN: 't' }).code, 1);
  assert.equal(run({ ...DEV, SUPABASE_SEED_ALLOWED_REFS: '' }).code, 1);
  assert.equal(run({ ...DEV, SUPABASE_PROJECT_REF: 'outro' }).code, 1);
});

test('trava de produção vale mesmo com espaço ou maiúscula no ref', () => {
  for (const prod of ['devref', 'devref ', ' DEVREF', 'DevRef\n']) {
    const r = run({ ...DEV, SUPABASE_PRODUCTION_PROJECT_REF: prod });
    assert.equal(r.code, 1, JSON.stringify(prod) + r.out);
    assert.match(r.out, /bloqueado para o projeto de produção/);
  }
  const liberado = run({ ...DEV, SUPABASE_PRODUCTION_PROJECT_REF: 'devref', ALLOW_PRODUCTION_SEED: 'true' }, mock(resp(201, { id: 'u1' })));
  assert.equal(liberado.code, 0, liberado.out);
});

test('todos criados ou já existentes: sai 0', () => {
  const criados = run(DEV, mock(resp(201, { id: 'u1' })));
  assert.equal(criados.code, 0, criados.out);
  assert.equal((criados.out.match(/^OK /gm) ?? []).length, 6);
  const existentes = run(DEV, mock(resp(422, { msg: 'User already registered' })));
  assert.equal(existentes.code, 0, existentes.out);
  assert.equal((existentes.out.match(/^SKIP /gm) ?? []).length, 6);
});

test('qualquer usuário com erro faz o seed sair 1', () => {
  for (const [status, body] of [[500, { msg: 'boom' }], [401, { msg: 'unauthorized' }], [404, { msg: 'not found' }], [422, { msg: 'Password is too weak' }]]) {
    const r = run(DEV, mock(resp(status, body)));
    assert.equal(r.code, 1, `${status}: ${r.out}`);
    assert.match(r.out, /Seed incompleto: 6 de 6/);
  }
  const parcial = run(DEV, mock(`if(n===3){${resp(500, { msg: 'boom' })}} ${resp(201, { id: 'u' })}`));
  assert.equal(parcial.code, 1, parcial.out);
  assert.match(parcial.out, /Seed incompleto: 1 de 6/);
});

test('erro de rede em um usuário não derruba os outros e sai 1', () => {
  const r = run(DEV, mock(`if(n===2) throw new Error("ECONNRESET"); ${resp(201, { id: 'u' })}`));
  assert.equal(r.code, 1, r.out);
  assert.equal((r.out.match(/^OK /gm) ?? []).length, 5);
  assert.match(r.out, /ERR .*ECONNRESET/);
});

test('usa o ref normalizado na URL e nunca imprime o token', () => {
  const r = run({ ...DEV, SUPABASE_ACCESS_TOKEN: 'segredo-123', SUPABASE_PROJECT_REF: ' DevRef ' },
    mock(`if(!String(url).includes('/projects/devref/')) throw new Error('url errada: '+url); ${resp(201, { id: 'u' })}`));
  assert.equal(r.code, 0, r.out);
  assert.doesNotMatch(r.out, /segredo-123/);
});
