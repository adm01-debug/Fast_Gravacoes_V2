// Testes do gate de RLS — `node --test scripts/rls-regression.test.mjs`.
// signInWithRetry() é testada em processo (função pura, sem rede). O fluxo
// completo (main) é testado via subprocess com fetch mockado, como em
// seed-users.test.mjs — RLS_LOGIN_RETRY_DELAY_MS=1 encurta o backoff real.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const SCRIPT = join(HERE, 'rls-regression.mjs');

// requireEnv() roda no load do módulo — precisa das variáveis antes do
// import (dinâmico: um import estático seria içado antes deste bloco rodar).
for (const [k, v] of Object.entries({
  VITE_SUPABASE_URL: 'https://x.supabase.co',
  VITE_SUPABASE_PUBLISHABLE_KEY: 'anon-key',
  E2E_OPERATOR_EMAIL: 'op@example.com',
  E2E_OPERATOR_PASSWORD: 'secret',
})) process.env[k] = v;
const { signInWithRetry } = await import('./rls-regression.mjs');

test('signInWithRetry: sucesso de primeira não espera nem repete', async () => {
  let calls = 0;
  const data = await signInWithRetry(async () => {
    calls++;
    return { data: { user: { id: 'u1' } }, error: null };
  }, { delayMs: () => 0 });
  assert.deepEqual(data, { user: { id: 'u1' } });
  assert.equal(calls, 1);
});

test('signInWithRetry: falha transitória (ex.: "{}" sob concorrência) seguida de sucesso', async () => {
  let calls = 0;
  const waits = [];
  const data = await signInWithRetry(async () => {
    calls++;
    if (calls < 3) return { data: null, error: { message: '{}' } };
    return { data: { user: { id: 'u1' } }, error: null };
  }, { attempts: 3, delayMs: (n) => { waits.push(n); return 0; } });
  assert.deepEqual(data, { user: { id: 'u1' } });
  assert.equal(calls, 3);
  assert.deepEqual(waits, [1, 2]); // uma espera entre cada tentativa que falhou
});

test('signInWithRetry: falha em todas as tentativas retorna null (não lança)', async () => {
  let calls = 0;
  const data = await signInWithRetry(async () => {
    calls++;
    return { data: null, error: { message: 'Invalid login credentials' } };
  }, { attempts: 3, delayMs: () => 0 });
  assert.equal(data, null);
  assert.equal(calls, 3); // esgota as tentativas — não para na primeira
});

test('signInWithRetry: resposta sem user e sem error também conta como falha', async () => {
  let calls = 0;
  const data = await signInWithRetry(async () => {
    calls++;
    return { data: {}, error: null };
  }, { attempts: 2, delayMs: () => 0 });
  assert.equal(data, null);
  assert.equal(calls, 2);
});

test('signInWithRetry: corpo de erro vazio ("{}" do auth-js) expõe o status em vez de ficar mudo', async () => {
  const logs = [];
  const orig = console.error;
  console.error = (...args) => logs.push(args.join(' '));
  try {
    for (const status of [429, 503]) {
      const data = await signInWithRetry(async () => ({ data: null, error: { status, message: '{}' } }), { attempts: 2, delayMs: () => 0 });
      assert.equal(data, null);
    }
  } finally {
    console.error = orig;
  }
  const out = logs.join('\n');
  assert.match(out, /corpo de erro vazio \(status 429\)/);
  assert.match(out, /corpo de erro vazio \(status 503\)/);
});

test('signInWithRetry: mensagem real (não vazia) do auth-js passa com o status ao lado', async () => {
  const logs = [];
  const orig = console.error;
  console.error = (...args) => logs.push(args.join(' '));
  try {
    const data = await signInWithRetry(async () => ({ data: null, error: { status: 400, message: 'Invalid login credentials' } }), { attempts: 2, delayMs: () => 0 });
    assert.equal(data, null);
  } finally {
    console.error = orig;
  }
  assert.match(logs.join('\n'), /Invalid login credentials \(status 400\)/);
});

// ── subprocess: main() fim a fim com fetch mockado (GoTrue + PostgREST) ──
const ENV_BASE = {
  VITE_SUPABASE_URL: 'https://x.supabase.co',
  VITE_SUPABASE_PUBLISHABLE_KEY: 'anon-key',
  E2E_OPERATOR_EMAIL: 'op@example.com',
  E2E_OPERATOR_PASSWORD: 'secret',
  RLS_LOGIN_RETRY_DELAY_MS: '1',
};

function preload(body) {
  return `data:text/javascript,${encodeURIComponent(
    `let n=0;globalThis.fetch=async(url,init)=>{n++;const u=String(url);${body}};`,
  )}`;
}
const AUTH_OK = `return new Response(JSON.stringify({access_token:'t',token_type:'bearer',expires_in:3600,refresh_token:'r',user:{id:'00000000-0000-0000-0000-00000000000a'}}), {status:200});`;
const LOGOUT_OK = `if (u.includes('/auth/v1/logout')) return new Response(null, {status:204});`;
const RLS_REJECTS = `if (u.includes('/rest/v1/technical_conversations')) return new Response(JSON.stringify({code:'42501',message:'new row violates row-level security policy'}), {status:403});`;

function run(body, env = {}) {
  const r = spawnSync(process.execPath, ['--import', preload(body), SCRIPT], {
    encoding: 'utf8',
    env: { ...process.env, ...ENV_BASE, ...env },
  });
  return { code: r.status, out: `${r.stdout}${r.stderr}` };
}

test('main(): GoTrue falha 2x com corpo vazio e volta a passar na 3ª — gate conclui corretamente', () => {
  const r = run(`
    if (u.includes('/auth/v1/token')) { if (n <= 2) return new Response('{}', {status:500}); ${AUTH_OK} }
    ${LOGOUT_OK}
    ${RLS_REJECTS}
  `);
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /tentativa 1\/3.*nova tentativa/);
  assert.match(r.out, /tentativa 2\/3.*nova tentativa/);
  assert.match(r.out, /RLS regression: technical_conversations INSERT corretamente rejeitado/);
});

test('main(): login falha nas 3 tentativas sai 1 com mensagem clara', () => {
  const r = run(`if (u.includes('/auth/v1/token')) return new Response('{}', {status:500});`);
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, /login do operador E2E falhou após 3 tentativas/);
});

test('main(): login ok de primeira segue comportamento anterior (sem retry)', () => {
  const r = run(`
    if (u.includes('/auth/v1/token')) { ${AUTH_OK} }
    ${LOGOUT_OK}
    ${RLS_REJECTS}
  `);
  assert.equal(r.code, 0, r.out);
  assert.doesNotMatch(r.out, /tentativa 1\/3/);
});
