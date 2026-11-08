// Testes do detector de mudanca real no inventario. Roda com: node --test scripts/inventario/
import assert from 'node:assert/strict';
import test from 'node:test';

import { PADRAO, mudou, semCarimbos } from './mudou-conteudo.mjs';

const j = (o) => JSON.stringify(o);
const antesDepois = (antes, depois) => mudou(['x.json'], () => j(antes), () => j(depois));

test('PADRAO cobre os tres arquivos versionados do inventario', () => {
  assert.deepEqual(PADRAO, [
    'inventario/estado/banco.json',
    'inventario/estado/rotas.json',
    'inventario/estado/edges.json',
  ]);
});

test('semCarimbos tira medido_em/gerado_em em qualquer nivel e ordena as chaves', () => {
  const a = semCarimbos(j({ b: 1, a: 2, medido_em: 'x', dentro: { gerado_em: 'y', v: 3 } }));
  const b = semCarimbos(j({ a: 2, b: 1, medido_em: 'OUTRO', dentro: { v: 3, gerado_em: 'OUTRO' } }));
  assert.equal(a, b);
});

test('semCarimbos devolve o texto cru quando nao e JSON, e null continua null', () => {
  assert.equal(semCarimbos('isto nao e json'), 'isto nao e json');
  assert.equal(semCarimbos(null), null);
});

test('so o carimbo de data mudar nao conta como mudanca', () => {
  assert.equal(antesDepois({ medido_em: '2026-11-01T00:00:00Z', tabelas: 10 },
    { medido_em: '2026-11-08T00:00:00Z', tabelas: 10 }), false);
});

test('telemetria do cron rolando sozinha nao conta como mudanca', () => {
  const base = (pct, exec) => ({
    cron: { jobs: [{ nome: 'j', ativo: true, taxa_falha_7d_pct: pct, execucoes_7d: exec, falhas_7d: 1, execucoes_24h: 3 }] },
  });
  assert.equal(antesDepois(base(9, 100), base(9.3, 140)), false);
});

test('historico do cron (linhas/bytes) nao conta, mas linhas de tabela conta', () => {
  const comHistorico = (n) => ({ cron: { historico: { linhas: n, bytes: n * 10, mais_de_7_dias: 0 } } });
  assert.equal(antesDepois(comHistorico(1000), comHistorico(9000)), false);

  const comTabela = (n) => ({ tabelas: [{ nome: 'jobs', linhas: n, bytes: 100 }] });
  assert.equal(antesDepois(comTabela(10), comTabela(11)), true, 'contagem real de tabela e mudanca de verdade');
});

test('telemetria da operacao (jobs_7d, latencia, leituras) nao conta; status conta', () => {
  const op = (jobs, lat, status) => ({
    operacao: {
      jobs_7d: jobs,
      jobs_por_status: { pending: jobs },
      saude_edges: [{ origem: 'health-monitor', status, latencia_ms: lat, leituras_7d: jobs, falhas_7d: 0, avisos_7d: 0 }],
    },
  });
  assert.equal(antesDepois(op(5, 100, 'pass'), op(90, 800, 'pass')), false);
  assert.equal(antesDepois(op(5, 100, 'pass'), op(5, 100, 'fail')), true, 'health check virando fail e mudanca de verdade');
});

test('porcentagem dentro do texto do alerta cron_falhando e normalizada', () => {
  const alerta = (txt) => ({ alertas: [{ tipo: 'cron_falhando', detalhe: [txt] }] });
  assert.equal(antesDepois(alerta('job-a (9.0% em 7d)'), alerta('job-a (12.5% em 7d)')), false);
  assert.equal(antesDepois(alerta('job-a (9.0% em 7d)'), alerta('job-b (9.0% em 7d)')), true,
    'outro job na lista e mudanca de verdade');
});

test('horas de cron_parado nao contam, mas o alerta aparecer/desaparecer conta', () => {
  const comHoras = (horas) => ({ alertas: [{ tipo: 'cron_parado', detalhe: horas }] });
  assert.equal(antesDepois(comHoras(['2026-11-01T03:00Z']), comHoras(['2026-11-08T04:00Z'])), false);
  assert.equal(antesDepois({ alertas: [] }, comHoras(['2026-11-08T04:00Z'])), true);
});

test('alerta estrutural novo conta como mudanca', () => {
  assert.equal(antesDepois(
    { alertas: [] },
    { alertas: [{ tipo: 'tabela_sem_rls', detalhe: ['nova'] }] },
  ), true);
});

test('arquivo novo ou apagado conta como mudanca', () => {
  assert.equal(mudou(['x.json'], () => null, () => j({ a: 1 })), true);
  assert.equal(mudou(['x.json'], () => j({ a: 1 }), () => null), true);
  assert.equal(mudou(['x.json'], () => null, () => null), false);
});

test('mudou olha todos os arquivos da lista', () => {
  const antes = { 'a.json': j({ v: 1 }), 'b.json': j({ v: 1 }) };
  const depois = { 'a.json': j({ v: 1 }), 'b.json': j({ v: 2 }) };
  assert.equal(mudou(['a.json', 'b.json'], (f) => antes[f], (f) => depois[f]), true);
  assert.equal(mudou(['a.json'], (f) => antes[f], (f) => depois[f]), false);
});
