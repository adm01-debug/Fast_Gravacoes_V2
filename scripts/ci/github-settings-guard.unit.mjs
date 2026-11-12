// Testes do guarda do perimetro do GitHub. Roda com: node --test 'scripts/ci/*.unit.mjs'
// Nao faz rede: cobre o baseline (contrato com o script) e a assinatura de causa (dedupe).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const RAIZ = path.resolve(import.meta.dirname, '..', '..');
const CAMINHO_BASELINE = path.join(RAIZ, 'scripts/ci/github-settings-baseline.json');
const CAMINHO_GUARD = path.join(RAIZ, 'scripts/ci/github-settings-guard.mjs');
const baseline = JSON.parse(fs.readFileSync(CAMINHO_BASELINE, 'utf8'));
const fonte = fs.readFileSync(CAMINHO_GUARD, 'utf8');

// O guard le o token do ambiente no topo do modulo; com GITHUB_TOKEN ausente ele so
// nao roda main() (que fica atras do guard de process.argv[1]). Importar e seguro.
const { assinaturaDe } = await import('./github-settings-guard.mjs');

test('baseline tem todas as secoes que o guard le', () => {
  for (const chave of [
    'medido_em', 'branch_protection_main', 'merge', 'actions', 'workflow_permissions',
    'security_and_analysis', 'rulesets_count', 'environments',
  ]) {
    assert.ok(chave in baseline, `baseline sem a secao ${chave}`);
  }
  assert.match(baseline.medido_em, /^\d{4}-\d{2}-\d{2}$/);
});

test('branch_protection_main declara os campos comparados pelo guard', () => {
  const bp = baseline.branch_protection_main;
  for (const campo of ['strict', 'enforce_admins', 'required_linear_history', 'allow_force_pushes']) {
    assert.equal(typeof bp[campo], 'boolean', `${campo} tem de ser booleano`);
  }
  assert.ok(Array.isArray(bp.required_status_checks));
  assert.ok(bp.required_status_checks.length > 0, 'main sem nenhum check obrigatorio e regressao, nao baseline');
  assert.equal(bp.strict, true, 'strict=false deixaria PR desatualizada entrar na main');
});

test('merge e workflow_permissions nao tem valor nulo (nulo viraria divergencia eterna)', () => {
  for (const [campo, valor] of Object.entries(baseline.merge)) {
    if (campo.startsWith('_')) continue;
    assert.notEqual(valor, null, `merge.${campo} nulo`);
  }
  for (const [campo, valor] of Object.entries(baseline.workflow_permissions)) {
    if (campo.startsWith('_')) continue;
    assert.notEqual(valor, null, `workflow_permissions.${campo} nulo`);
  }
  assert.equal(baseline.merge.allow_auto_merge, true, 'auto-merge e o que faz os PRs de automacao fecharem sozinhos');
  assert.equal(baseline.merge.delete_branch_on_merge, true);
});

test('campos de comentario (_*) ficam fora da comparacao do guard', () => {
  // O guard pula chaves que comecam com "_" em workflow_permissions e security_and_analysis.
  assert.match(fonte, /campo\.startsWith\('_'\)/, 'o guard tem de pular as chaves de comentario');
  assert.match(fonte, /chave\.startsWith\('_'\)/);
  // E as secoes que de fato usam comentario sao justamente essas.
  assert.ok('_comentario' in baseline.workflow_permissions);
  assert.ok('_comentario' in baseline.security_and_analysis);
});

test('selected-actions so e conferido quando allowed_actions === selected', () => {
  assert.match(fonte, /allowed_actions \?\? null\) !== 'selected'\) return \[\]/,
    'com allowed_actions=all o endpoint nao existe e contaria ponto cego falso');
  if (baseline.actions.allowed_actions !== 'selected') {
    assert.deepEqual(baseline.selected_actions_patterns, [],
      'sem lista restrita, a lista de padroes do baseline tem de estar vazia');
  }
});

test('o guard aponta para este repo e para um runbook que existe', () => {
  assert.match(fonte, /adm01-debug\/Fast_Gravacoes_V2/);
  assert.ok(!fonte.includes('Zapp_Web_V2'), 'sobrou referencia ao repo de origem');
  const runbook = fonte.match(/const RUNBOOK_SEGREDOS = '([^']+)'/)?.[1];
  assert.ok(runbook, 'RUNBOOK_SEGREDOS nao encontrado');
  assert.ok(fs.existsSync(path.join(RAIZ, runbook)), `${runbook} nao existe no repo`);
});

test('environments do baseline nao repetem e cobrem os gerenciados pela Vercel por prefixo', () => {
  const envs = baseline.environments;
  assert.equal(new Set(envs).size, envs.length, 'environment repetido no baseline');
  assert.ok(Array.isArray(baseline.environments_vercel_managed?.prefixos));
});

test('assinaturaDe e estavel e independente da ordem', () => {
  const a = [{ campo: 'merge.allow_auto_merge', encontrado: false }, { campo: 'actions.enabled', encontrado: false }];
  const b = [...a].reverse();
  assert.equal(assinaturaDe(a, []), assinaturaDe(b, []));
  assert.equal(assinaturaDe(a, []).length, 16);
});

test('assinaturaDe muda com o valor encontrado, com a causa e com o conjunto de campos cegos', () => {
  const base = [{ campo: 'merge.allow_auto_merge', encontrado: false }];
  assert.notEqual(
    assinaturaDe(base, []),
    assinaturaDe([{ campo: 'merge.allow_auto_merge', encontrado: 'outro' }], []),
    'valor diferente = causa diferente',
  );
  assert.notEqual(assinaturaDe(base, []), assinaturaDe([{ campo: 'actions.enabled', encontrado: false }], []));
  // Dois pontos cegos diferentes nao podem colidir: senao a mudanca de ponto cego ficaria
  // 7 dias suprimida pelo dedupe.
  assert.notEqual(
    assinaturaDe([], [{ nome: 'merge/repo (parcial)', campos: ['allow_auto_merge'] }]),
    assinaturaDe([], [{ nome: 'merge/repo (parcial)', campos: ['allow_squash_merge'] }]),
  );
  assert.notEqual(assinaturaDe(base, []), assinaturaDe(base, [{ nome: 'branch protection', campos: ['403'] }]));
});

test('assinaturaDe distingue valores que String() colapsaria (achado por auditoria adversarial)', () => {
  const de = (encontrado) => [{ campo: 'actions.enabled', encontrado }];
  // String(0) === String('0') === '0'; String(null) === String('null') === 'null';
  // String(undefined) === String('undefined') === 'undefined'. Com String() no lugar de
  // JSON.stringify(), um campo cujo `encontrado` mudasse de tipo entre duas execucoes (ex.: a
  // API passar a devolver '0' em vez de 0) nao mudaria a assinatura, e o dedupe suprimiria o
  // comentario da divergencia nova por engano.
  assert.notEqual(assinaturaDe(de(0), []), assinaturaDe(de('0'), []));
  assert.notEqual(assinaturaDe(de(null), []), assinaturaDe(de('null'), []));
  assert.notEqual(assinaturaDe(de(undefined), []), assinaturaDe(de('undefined'), []));
  // false nao e' um caso de colisao (String(false) !== String(0)), mas confirma que o fix nao
  // criou uma colisao nova entre booleano e os textos correspondentes.
  assert.notEqual(assinaturaDe(de(false), []), assinaturaDe(de('false'), []));
});

test('assinaturaDe nao depende de prosa de erro, run id nem timestamp', () => {
  const cego = (motivo) => [{ nome: 'branch protection', motivo, campos: ['403'] }];
  assert.equal(assinaturaDe([], cego('403 em /x: texto A')), assinaturaDe([], cego('403 em /x: texto B')));
});
