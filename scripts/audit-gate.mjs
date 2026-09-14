/**
 * Audit gate — falha em vulnerabilidades high/critical, com allowlist EXPLÍCITA
 * e documentada para advisories que não afetam este app.
 *
 * Por que um wrapper? `npm audit --audit-level=high` falha em advisories
 * inalcançáveis no nosso contexto (ex.: bug de hidratação SSR num SPA puro)
 * e não sabe expressar exceções. Este gate mantém o rigor E a ação: toda
 * exceção precisa de justificativa + plano de remoção abaixo.
 */
import { spawnSync } from 'node:child_process';

// ── Allowlist (pacote → justificativa) ────────────────────────────────────────
// Cada entrada PRECISA ter: por que é seguro hoje + como/quando será removida.
const ALLOWED_PACKAGES = new Map([
  [
    'react-router',
    'GHSA-337j-9hxr-rhxg (deserializeErrors) ataca apenas hidratação SSR; este app é SPA Vite sem SSR — não explorável. Remoção: upgrade react-router v7 (Sprint 2).',
  ],
  [
    'react-router-dom',
    'Idem react-router: mesmo advisory via dependência transitiva, sem patch na v6 (afetadas 6.0.0–7.17.0). Remoção: upgrade v7 (Sprint 2).',
  ],
]);

// `npm audit` sai com código != 0 quando há vulnerabilidades — spawnSync
// (em vez de execSync) para capturar o JSON independentemente do exit code.
const res = spawnSync('npm', ['audit', '--json'], {
  encoding: 'utf8',
  maxBuffer: 64 * 1024 * 1024,
});

// Um registry indisponível, uma saída truncada ou JSON inválido não é
// equivalente a "zero vulnerabilidades". O gate falha fechado para impedir CI
// verde quando a auditoria nem chegou a executar.
if (res.error) {
  console.error(`\n# Audit gate: não foi possível executar npm audit: ${res.error.message}`);
  process.exit(1);
}
if (res.signal) {
  console.error(`\n# Audit gate: npm audit terminou por sinal ${res.signal}.`);
  process.exit(1);
}
const rawAudit = res.stdout?.trim();
if (!rawAudit) {
  console.error('\n# Audit gate: npm audit não retornou JSON; bloqueando por segurança.');
  process.exit(1);
}

let audit;
try {
  audit = JSON.parse(rawAudit);
} catch (error) {
  console.error(`\n# Audit gate: JSON inválido retornado por npm audit: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
if (audit.error || !audit.vulnerabilities || typeof audit.vulnerabilities !== 'object') {
  console.error(`\n# Audit gate: resultado incompleto do npm audit: ${JSON.stringify(audit.error ?? audit)}`);
  process.exit(1);
}
const vulns = audit.vulnerabilities;

const failures = [];
const skipped = [];

for (const [pkg, v] of Object.entries(vulns)) {
  const sev = v.severity ?? 'unknown';
  if (sev !== 'high' && sev !== 'critical') continue;
  const justification = ALLOWED_PACKAGES.get(pkg);
  if (justification) {
    skipped.push(`${pkg} (${sev}) — ${justification}`);
    continue;
  }
  const via = (v.via ?? [])
    .map((x) =>
      typeof x === 'object' && x ? x.title ?? x.url ?? JSON.stringify(x) : String(x),
    )
    .join(' | ');
  failures.push(`  ✗ ${pkg} [${sev}] — ${via}`);
}

if (failures.length > 0) {
  console.error(`\n# Audit gate: ${failures.length} vulnerabilidade(s) high/critical SEM exceção:\n`);
  console.error(failures.join('\n'));
  console.error(
    '\nCorrija com `npm audit fix` ou adicione justificativa + plano de remoção no ALLOWED_PACKAGES de scripts/audit-gate.mjs.',
  );
  process.exit(1);
}

console.log('✔ Audit gate passou.');
if (skipped.length > 0) {
  console.log(`\nExceções documentadas (${skipped.length}):`);
  for (const s of skipped) console.log(`  ↷ ${s}`);
}
// Visibilidade: moderates/lows não bloqueiam, mas precisam ser visíveis no CI.
const minor = Object.entries(vulns).filter(([, v]) => ['low', 'moderate'].includes(v.severity ?? ''));
if (minor.length > 0) {
  console.log(`\nInformativo — ${minor.length} vulnerabilidade(s) abaixo do threshold (high):`);
  for (const [pkg, v] of minor) console.log(`  • ${pkg} (${v.severity})`);
}
const totals = audit.metadata?.vulnerabilities;
if (totals) console.log(`\nTotais npm audit: ${JSON.stringify(totals)}`);
