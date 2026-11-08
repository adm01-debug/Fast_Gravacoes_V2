// Testes do gerador do inventario do banco. Roda com: node --test scripts/inventario/
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  LEDGER_TOLERANCIA,
  LIMIARES,
  PARECE_CREDENCIAL,
  PROJETO_OFICIAL,
  compararEdges,
  conferirOrigem,
  contarUsoNoCodigo,
  extrairInventario,
  montarInventario,
  rodaTodoDia,
  tabelasDosTypes,
  versoesDoRepo,
} from './gerar-banco.mjs';

const RAIZ = path.resolve(import.meta.dirname, '..', '..');

/** Resposta minima valida do banco.sql. */
function respostaBase(extra = {}) {
  return {
    format_version: 1,
    medido_em: '2026-11-08T12:00:00Z',
    resumo: { ledger_registros: 243, ledger_versao_max: '20261107010000' },
    tabelas: [
      { nome: 'jobs', rls: true, policies: 3, triggers: 1, linhas: 10, linhas_exatas: true, bytes: 8192, citada_no_banco: true },
      { nome: 'machines', rls: true, policies: 2, triggers: 0, linhas: 4, linhas_exatas: true, bytes: 8192, citada_no_banco: false },
    ],
    cron: {
      config: {},
      jobs: [],
      horas_paradas_7d: [],
      historico: { linhas: 10, mais_de_7_dias: 0, mais_antigo: null, bytes: 1024 },
      saude_gravada: [],
    },
    operacao: { saude_edges: [], jobs_7d: 5, jobs_por_status: { pending: 5 } },
    ...extra,
  };
}

test('projeto oficial e o do Fast_Gravacoes_V2', () => {
  assert.equal(PROJETO_OFICIAL, 'uoujzvpecohinketylud');
});

test('extrairInventario aceita o objeto direto, {rows:[...]} e o envelope do MCP', () => {
  const base = respostaBase();
  assert.equal(extrairInventario(base).format_version, 1);
  assert.equal(extrairInventario({ rows: [{ inventario: base }] }).medido_em, base.medido_em);
  assert.equal(
    extrairInventario({ result: { content: [{ type: 'text', text: JSON.stringify({ rows: [{ inventario: base }] }) }] } }).medido_em,
    base.medido_em,
  );
  assert.equal(extrairInventario(JSON.stringify(base)).medido_em, base.medido_em);
});

test('extrairInventario recusa entrada sem as chaves obrigatorias, sem tabelas ou com outro format_version', () => {
  const { operacao, ...semOperacao } = respostaBase();
  assert.throws(() => extrairInventario(semOperacao), /sem as chaves: operacao/);
  assert.throws(() => extrairInventario(respostaBase({ tabelas: [] })), /sem tabelas/);
  assert.throws(() => extrairInventario(respostaBase({ format_version: 2 })), /format_version 2/);
});

test('tabelasDosTypes le o bloco Tables de types.ts e para antes de Views/Functions/Enums', () => {
  const tabelas = tabelasDosTypes(RAIZ);
  assert.ok(tabelas.length > 50, `esperava muitas tabelas, veio ${tabelas.length}`);
  assert.ok(tabelas.includes('jobs'), 'jobs deveria estar em types.ts');
  assert.ok(tabelas.includes('machines'), 'machines deveria estar em types.ts');
  assert.equal(new Set(tabelas).size, tabelas.length, 'nomes repetidos: o recorte do bloco Tables vazou');
});

test('conferirOrigem aceita resposta do banco oficial e recusa banco irmao', () => {
  const dado = respostaBase();
  const conhecidas = ['jobs', 'machines'];
  assert.deepEqual(conferirOrigem(dado, conhecidas), { tabelas_em_comum_com_types: 2, tabelas_em_types: 2 });
  // Nenhuma tabela em comum: outro banco.
  assert.throws(() => conferirOrigem(dado, ['outra_a', 'outra_b']), /nao parece ser do banco oficial/);
});

test('conferirOrigem compara o ledger com as migrations do repo', () => {
  const versoes = Array.from({ length: 243 }, (_, i) => String(20260000000000 + i));
  const conhecidas = ['jobs', 'machines'];
  const maxRepo = versoes[versoes.length - 1];
  const ok = respostaBase({ resumo: { ledger_registros: 243, ledger_versao_max: maxRepo } });
  const origem = conferirOrigem(ok, conhecidas, versoes);
  assert.equal(origem.ledger_registros, 243);
  assert.equal(origem.migrations_no_repo, 243);

  // Ledger muito atras: banco que nao recebeu as migrations recentes.
  const atrasado = respostaBase({ resumo: { ledger_registros: 243, ledger_versao_max: '20250101000000' } });
  assert.throws(() => conferirOrigem(atrasado, conhecidas, versoes), /nao parece ser do banco oficial/);

  // Quantidade de registros fora da tolerancia.
  const poucos = respostaBase({ resumo: { ledger_registros: 10, ledger_versao_max: maxRepo } });
  assert.throws(() => conferirOrigem(poucos, conhecidas, versoes), /nao parece ser do banco oficial/);

  // Sem os campos do ledger: banco.sql antigo.
  const semLedger = respostaBase({ resumo: {} });
  assert.throws(() => conferirOrigem(semLedger, conhecidas, versoes), /ledger_versao_max/);
  assert.equal(LEDGER_TOLERANCIA.registrosPct, 10);
});

test('versoesDoRepo le as migrations deste repo', () => {
  const versoes = versoesDoRepo(RAIZ);
  assert.ok(versoes.length > 100, `esperava muitas migrations, veio ${versoes.length}`);
  assert.ok(versoes.every((v) => /^\d+$/.test(v)), 'toda versao e numerica');
});

test('montarInventario marca tabela sem RLS e RLS sem policy', () => {
  const dado = respostaBase({
    tabelas: [
      { nome: 'aberta', rls: false, policies: 0, triggers: 0, linhas: 1, linhas_exatas: true, bytes: 1, citada_no_banco: true },
      { nome: 'trancada', rls: true, policies: 0, triggers: 0, linhas: 0, linhas_exatas: true, bytes: 1, citada_no_banco: true },
    ],
  });
  const inv = montarInventario(dado, {});
  const tipos = inv.alertas.map((a) => a.tipo);
  assert.ok(tipos.includes('tabela_sem_rls'));
  assert.ok(tipos.includes('rls_sem_policy'));
  assert.deepEqual(inv.alertas.find((a) => a.tipo === 'rls_sem_policy').detalhe, ['trancada']);
});

test('montarInventario lista tabela orfa so quando vazia, nao citada e sem uso no codigo', () => {
  const dado = respostaBase({
    tabelas: [
      { nome: 'orfa', rls: true, policies: 1, triggers: 0, linhas: 0, linhas_exatas: true, bytes: 1, citada_no_banco: false },
      { nome: 'usada', rls: true, policies: 1, triggers: 0, linhas: 0, linhas_exatas: true, bytes: 1, citada_no_banco: false },
      { nome: 'cheia', rls: true, policies: 1, triggers: 0, linhas: 7, linhas_exatas: true, bytes: 1, citada_no_banco: false },
    ],
  });
  const inv = montarInventario(dado, { usada: { src: 2, edges: 0 } });
  assert.deepEqual(inv.tabelas_orfas.lista, ['orfa']);
});

test('montarInventario alerta cron falhando, mudo e marcado parado no banco', () => {
  const dado = respostaBase({
    cron: {
      config: {},
      jobs: [
        { nome: 'ruim', agenda: '*/5 * * * *', ativo: true, execucoes_24h: 10, execucoes_7d: 100, falhas_7d: 9, taxa_falha_7d_pct: 9 },
        { nome: 'mudo', agenda: '15 3 * * *', ativo: true, execucoes_24h: 0, execucoes_7d: 0, falhas_7d: 0, taxa_falha_7d_pct: 0 },
        { nome: 'ok', agenda: '15 3 * * *', ativo: true, execucoes_24h: 1, execucoes_7d: 7, falhas_7d: 0, taxa_falha_7d_pct: 0 },
        { nome: 'desligado', agenda: '*/5 * * * *', ativo: false, execucoes_24h: 0, execucoes_7d: 0, falhas_7d: 0, taxa_falha_7d_pct: 0 },
      ],
      horas_paradas_7d: [{ hora: '2026-11-07T03:00Z', execucoes: 4, falhas: 4 }],
      historico: { linhas: 60000, mais_de_7_dias: LIMIARES.historicoCronMaisDe7Dias + 1, mais_antigo: null, bytes: 1 },
      saude_gravada: [{ nome: 'travado', ativo: true, ultimo_status: 'failed', falhas_em_sequencia: 3, parado: true }],
    },
  });
  const inv = montarInventario(dado, {});
  const por = Object.fromEntries(inv.alertas.map((a) => [a.tipo, a.detalhe]));
  assert.deepEqual(por.cron_falhando, ['ruim (9% em 7d)']);
  assert.deepEqual(por.cron_sem_execucao, ['mudo']);
  assert.deepEqual(por.cron_parado, ['2026-11-07T03:00Z']);
  assert.ok(por.historico_cron_sem_limpeza);
  assert.deepEqual(por.cron_marcado_parado_no_banco, ['travado']);
});

test('montarInventario alerta health check falhando/degradado e producao parada', () => {
  const dado = respostaBase({
    operacao: {
      saude_edges: [
        { origem: 'health-monitor', status: 'fail', latencia_ms: 900, leituras_7d: 100, falhas_7d: 10, avisos_7d: 0 },
        { origem: 'manual', status: 'warn', latencia_ms: 400, leituras_7d: 5, falhas_7d: 0, avisos_7d: 2 },
        { origem: 'cron', status: 'pass', latencia_ms: 100, leituras_7d: 50, falhas_7d: 0, avisos_7d: 0 },
      ],
      jobs_7d: 0,
      jobs_por_status: {},
    },
  });
  const por = Object.fromEntries(montarInventario(dado, {}).alertas.map((a) => [a.tipo, a.detalhe]));
  assert.deepEqual(por.health_check_falhando, ['health-monitor']);
  assert.deepEqual(por.health_check_degradado, ['manual']);
  assert.ok(por.sem_producao_7d);
});

test('montarInventario nao alerta producao parada quando ha job na semana', () => {
  const tipos = montarInventario(respostaBase(), {}).alertas.map((a) => a.tipo);
  assert.ok(!tipos.includes('sem_producao_7d'));
});

test('rodaTodoDia reconhece agenda diaria e recusa semanal/mensal', () => {
  assert.equal(rodaTodoDia('*/5 * * * *'), true);
  assert.equal(rodaTodoDia('15 3 * * *'), true);
  assert.equal(rodaTodoDia('30 seconds'), true);
  assert.equal(rodaTodoDia('0 3 * * 1'), false);   // so segunda
  assert.equal(rodaTodoDia('0 3 1 * *'), false);   // so dia 1
  assert.equal(rodaTodoDia(''), false);
  assert.equal(rodaTodoDia(null), false);
});

test('compararEdges separa publicada sem codigo e codigo sem deploy', () => {
  const semConsulta = compararEdges(null, ['a', 'b']);
  assert.equal(semConsulta.publicadas, null);
  assert.equal(semConsulta.no_repo, 2);

  const comparado = compararEdges(
    [{ slug: 'a', version: 3, status: 'ACTIVE', verify_jwt: true, updated_at: '2026-11-01T10:20:30Z' },
      { slug: 'fantasma', version: 1, status: 'ACTIVE', verify_jwt: false, updated_at: null }],
    ['a', 'nova'],
  );
  assert.deepEqual(comparado.publicadas_sem_codigo_no_repo, ['fantasma']);
  assert.deepEqual(comparado.no_repo_sem_deploy, ['nova']);
  assert.equal(comparado.publicadas[0].atualizada_em, '2026-11-01T10:20Z');
});

test('montarInventario propaga os alertas de deploy das edges', () => {
  const edges = compararEdges([{ slug: 'fantasma', version: 1, status: 'ACTIVE', verify_jwt: false }], ['nova']);
  const tipos = montarInventario(respostaBase(), {}, edges).alertas.map((a) => a.tipo);
  assert.ok(tipos.includes('edge_sem_deploy'));
  assert.ok(tipos.includes('edge_publicada_sem_codigo'));
});

test('contarUsoNoCodigo conta .from e /rest/v1, ignora storage.from e teste', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'inv-uso-'));
  fs.mkdirSync(path.join(tmp, 'src'), { recursive: true });
  fs.mkdirSync(path.join(tmp, 'supabase/functions'), { recursive: true });
  fs.writeFileSync(path.join(tmp, 'src/a.ts'), "supabase.from('jobs'); storage.from('jobs'); fetch('/rest/v1/machines')");
  fs.writeFileSync(path.join(tmp, 'src/a.test.ts'), "supabase.from('jobs')");
  fs.writeFileSync(path.join(tmp, 'supabase/functions/e.ts'), "client.from('jobs')");
  const uso = contarUsoNoCodigo(tmp, ['jobs', 'machines', 'ausente']);
  assert.deepEqual(uso.jobs, { src: 1, edges: 1 });     // storage.from e o .test nao contam
  assert.deepEqual(uso.machines, { src: 1, edges: 0 });
  assert.deepEqual(uso.ausente, { src: 0, edges: 0 });
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('PARECE_CREDENCIAL pega Bearer, JWT e sb_secret_ e nao pega texto normal', () => {
  assert.ok(PARECE_CREDENCIAL.test('Authorization: Bearer abcdefghijklmnopqrstuvwxyz0123'));
  assert.ok(PARECE_CREDENCIAL.test('eyJhbGciOiJIUzI1NiIsInR5cCI6Ikp.payload.assinatura'));
  assert.ok(PARECE_CREDENCIAL.test('sb_secret_qualquercoisa'));
  assert.ok(!PARECE_CREDENCIAL.test('{"tabela":"jobs","rls":true}'));
});
