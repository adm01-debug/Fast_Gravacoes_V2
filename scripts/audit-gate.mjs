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
// Exceções são escopadas por advisory: um pacote listado aqui só é
// tolerado se TODOS os `via` do npm audit forem (a) um advisory já
// conhecido (GHSA abaixo) ou (b) outro pacote também isento —
// qualquer advisory NOVO nesses pacotes volta a quebrar o gate.
// A chave é o GHSA (último segmento de `via[].url`), NÃO o `source` numérico:
// o npm renumera o `source` quando o GitHub edita o advisory (o da
// GHSA-rj75-hqrm-r3gf passou de 1241232 para 1243379) e o gate ficava
// vermelho sem nenhuma mudança de código.
// GHSA-vfj7-8cjw-p6xm = braces stack-exhaustion.
const BRACES_ADVISORY = 'GHSA-vfj7-8cjw-p6xm';
// GHSA-rj75-hqrm-r3gf = postcss-selector-parser complexidade quadrática no
// parsing de seletores.
const POSTCSS_PARSER_ADVISORY = 'GHSA-rj75-hqrm-r3gf';
// GHSA-mrhx-c7xc-m3w5 = zod: DoS por bound astronômico em schemas
// .min()/.max() declarados pelo próprio código.
const ZOD_ADVISORY = 'GHSA-mrhx-c7xc-m3w5';

/** GHSA de um `via` do npm audit (último segmento da URL), ou null se ausente/malformado. */
const ghsaOf = (via) => {
  const id = String(via?.url ?? '').split('/').pop() ?? '';
  return /^GHSA(-[0-9a-z]{4}){3}$/i.test(id) ? `GHSA${id.slice(4).toLowerCase()}` : null;
};

const ALLOWED_PACKAGES = new Map([
  // Cadeia braces (GHSA-vfj7-8cjw-p6xm: stack-exhaustion DoS em padrões
  // aninhados): atinge apenas dependências de build/dev (tailwindcss,
  // lovable-tagger → chokidar/fast-glob/micromatch → braces 3.0.3). Não
  // existe release de braces corrigida (3.0.3 é a mais recente) e os
  // padrões de glob que o braces expande vêm do nosso próprio
  // tailwind.config/vite.config — input controlado, não explorável em
  // runtime. Remoção: migração tailwindcss v4 (replanejada; remove
  // chokidar/fast-glob/micromatch do grafo) + remoção do lovable-tagger
  // quando o tooling Lovable for desativado de vez.
  [
    'braces',
    {
      reason:
        'DoS por padrão aninhado afeta só build/dev (via tailwind/micromatch); sem release corrigida; input de glob é config própria. Remoção: migração tailwindcss v4.',
      advisories: new Set([BRACES_ADVISORY]),
    },
  ],
  [
    'micromatch',
    {
      reason:
        'Idem braces: vuln transitiva via braces, só build/dev. Remoção: migração tailwindcss v4.',
      advisories: new Set([BRACES_ADVISORY]),
    },
  ],
  [
    'fast-glob',
    {
      reason:
        'Idem braces: vuln transitiva via micromatch→braces, só build/dev. Remoção: migração tailwindcss v4.',
      advisories: new Set([BRACES_ADVISORY]),
    },
  ],
  [
    'chokidar',
    {
      reason:
        'Idem braces: vuln transitiva via braces no watcher de build/dev. Remoção: migração tailwindcss v4.',
      advisories: new Set([BRACES_ADVISORY]),
    },
  ],
  [
    'tailwindcss',
    {
      reason:
        'Raiz da cadeia braces em build-time; sem patch na linha 3.x e a v4 é migração breaking de config/plugins. Remoção: migração tailwindcss v4.',
      advisories: new Set([BRACES_ADVISORY]),
    },
  ],
  [
    'lovable-tagger',
    {
      reason:
        'Reusa a cadeia tailwind→braces; só roda em mode=development (vite.config.ts). Remoção: desligar o tagger quando o tooling Lovable for desativado.',
      advisories: new Set([BRACES_ADVISORY]),
    },
  ],
  // Cadeia postcss-selector-parser (GHSA-rj75-hqrm-r3gf: complexidade
  // quadrática no parsing de seletores — CPU exhaustion): só roda em
  // build-time sobre o CSS gerado dos NOSSOS arquivos (tailwind.config +
  // classes do repo) — input controlado, não explorável em runtime.
  // Remoção: migração tailwindcss v4 (troca a cadeia postcss-selector-parser
  // pela da v4) ou bump de postcss-selector-parser >=7.1.6 quando o
  // tailwindcss 3.x declarar range compatível.
  [
    'postcss-selector-parser',
    {
      reason:
        'CPU exhaustion só em build-time sobre CSS próprio; versão fix 7.1.6 não coberta pelo range do tailwindcss 3.x. Remoção: migração tailwindcss v4.',
      advisories: new Set([POSTCSS_PARSER_ADVISORY]),
    },
  ],
  [
    'postcss-nested',
    {
      reason:
        'Vuln transitiva via postcss-selector-parser, só build-time sobre CSS próprio. Remoção: migração tailwindcss v4.',
      advisories: new Set([POSTCSS_PARSER_ADVISORY]),
    },
  ],
  // zod (GHSA-mrhx-c7xc-m3w5: DoS por bound astronômico em coleções):
  // para ser explorada, um schema NOSSO precisaria declarar .max() com
  // valor irreal — os bounds vêm do próprio código, não de input externo.
  // Não existe backport para a linha 3.x; o fix só está na v4, que é
  // major breaking (API de schemas, zod-validation-error compat).
  // Remoção: migração zod v4 com revisão do zod-validation-error.
  [
    'zod',
    {
      reason:
        'DoS por bound astronômico em coleções exige schema nosso declarar .max() irreal; fix só existe na v4 (major breaking). Remoção: migração zod v4 com revisão do zod-validation-error.',
      advisories: new Set([ZOD_ADVISORY]),
    },
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
const usedExemptions = new Set();

for (const [pkg, v] of Object.entries(vulns)) {
  const sev = v.severity ?? 'unknown';
  if (sev !== 'high' && sev !== 'critical') continue;
  const exemption = ALLOWED_PACKAGES.get(pkg);
  // A exceção só vale quando TODO `via` é um advisory conhecido (objeto com
  // source id permitido) ou uma dependência também isenta — assim um
  // advisory novo no MESMO pacote continua quebrando o gate.
  const viaCovered =
    exemption &&
    // `via` vazio/nulo não isenta — sem rastreabilidade do advisory a
    // exceção não pode ser verificada (falha fechada). O mesmo vale para
    // um `via` sem URL de GHSA reconhecível.
    Array.isArray(v.via) &&
    v.via.length > 0 &&
    v.via.every((x) =>
      typeof x === 'object' && x !== null
        ? exemption.advisories.has(ghsaOf(x))
        : ALLOWED_PACKAGES.has(String(x)),
    );
  if (viaCovered) {
    skipped.push(`${pkg} (${sev}) — ${exemption.reason}`);
    usedExemptions.add(pkg);
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
// Exceção que não isentou nada neste run: ou o advisory foi corrigido/rebaixado
// (remova a entrada — ela é dívida morta), ou só é alcançada por cadeia.
const idle = [...ALLOWED_PACKAGES.keys()].filter((pkg) => !usedExemptions.has(pkg));
if (idle.length > 0) {
  console.log(`\nInformativo — ${idle.length} exceção(ões) sem uso neste run (candidatas a remoção): ${idle.join(', ')}`);
}
const totals = audit.metadata?.vulnerabilities;
if (totals) console.log(`\nTotais npm audit: ${JSON.stringify(totals)}`);
