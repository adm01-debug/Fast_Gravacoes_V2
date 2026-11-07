#!/usr/bin/env node
/**
 * Quality Gate — Any Ratchet
 *
 * Impede regressão de tipos: conta ocorrências de `any` explícito em src/
 * (excluindo testes e tipos auto-gerados) e falha se o total exceder o baseline.
 *
 * Uso:
 *   node scripts/check-any-baseline.mjs         # valida contra baseline
 *   node scripts/check-any-baseline.mjs --update # atualiza baseline (só reduzir!)
 */
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SRC_DIR = join(ROOT, 'src');
const BASELINE_FILE = join(ROOT, '.any-baseline.json');

const PATTERN = String.raw`(:\s*any\b|:\s*any\[|<any>|\bas any\b|\(any\))`;
const IGNORES = [
  '!**/*.test.*',
  '!**/*.spec.*',
  '!src/integrations/supabase/types.ts',
];

// Contador independente de cwd: deriva src de __dirname (igual ao baseline).
// Fallback sem dependência de `rg` (runners de CI não o instalam — antes
// o `catch { return 0 }` mascarava isso e o gate nunca rodava lá).
function countAnyNode() {
  const rx = new RegExp(PATTERN, 'g');
  const isIgnored = (rel) =>
    /\.(test|spec)\.[tj]sx?$/.test(rel) ||
    rel === 'src/integrations/supabase/types.ts';
  let total = 0;
  const walk = (dir) => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) {
        if (entry !== 'node_modules') walk(full);
        continue;
      }
      const srcRel = join('src', relative(SRC_DIR, full)).replaceAll('\\', '/');
      if (!/\.tsx?$/.test(entry) || isIgnored(srcRel)) continue;
      const text = readFileSync(full, 'utf8');
      const matches = text.match(rx);
      if (matches) total += matches.length;
    }
  };
  walk(SRC_DIR);
  return total;
}

function countAny() {
  const args = [
    '--type-add', 'tsx:*.tsx',
    '-t', 'ts', '-t', 'tsx',
    ...IGNORES.flatMap((g) => ['-g', g]),
    '--count-matches',
    PATTERN,
    SRC_DIR,
  ];
  try {
    const out = execSync(`rg ${args.map((a) => `'${a}'`).join(' ')}`, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    return out
      .trim()
      .split('\n')
      .filter(Boolean)
      .reduce((sum, line) => sum + Number(line.split(':').pop()), 0);
  } catch (err) {
    // rg sai com status 1 quando não há matches — isso é o resultado
    // legítimo "0 ocorrências", não um erro do gate.
    if (err?.status === 1) return 0;
    // rg ausente (127/ENOENT) → contador Node equivalente. Outros erros
    // não podem passar o ratchet silenciosamente como se fossem 0.
    if (err?.status === 127 || err?.code === 'ENOENT') {
      return countAnyNode();
    }
    console.error('check-any-baseline: falha ao contar `any`:', err?.message ?? err);
    process.exit(2);
  }
}

const current = countAny();
const args = process.argv.slice(2);
const update = args.includes('--update');
const force = args.includes('--force');
const prevBaseline = existsSync(BASELINE_FILE)
  ? Number(JSON.parse(readFileSync(BASELINE_FILE, 'utf8')).baseline)
  : null;

if (update) {
  // Ratchet "só reduzir": rejeita aumento do baseline (a menos que --force).
  if (!force && prevBaseline !== null && current > prevBaseline) {
    console.error(
      `❌ Recusando aumentar baseline: atual ${current} > baseline ${prevBaseline}.`,
    );
    console.error(`   Primeiro remova os 'any' novos, ou use --force se a redução for impossível.`);
    process.exit(1);
  }
  writeFileSync(
    BASELINE_FILE,
    JSON.stringify({ baseline: current, updatedAt: new Date().toISOString() }, null, 2) + '\n',
  );
  console.log(`✅ Baseline atualizada: ${current} ocorrências de 'any'${force && prevBaseline !== null && current > prevBaseline ? ' (--force)' : ''}.`);
  process.exit(0);
}

if (!existsSync(BASELINE_FILE)) {
  writeFileSync(
    BASELINE_FILE,
    JSON.stringify({ baseline: current, updatedAt: new Date().toISOString() }, null, 2) + '\n',
  );
  console.log(`✅ Baseline criada: ${current} ocorrências de 'any'.`);
  process.exit(0);
}

const { baseline } = JSON.parse(readFileSync(BASELINE_FILE, 'utf8'));

console.log(`📊 Ocorrências de 'any' — baseline: ${baseline} | atual: ${current}`);

if (current > baseline) {
  console.error(
    `\n❌ QUALITY GATE FALHOU: ${current - baseline} novo(s) 'any' introduzido(s).`,
  );
  console.error(`   Substitua por 'unknown' + validação, tipos concretos ou generics.`);
  console.error(`   Se realmente inevitável, documente com // eslint-disable-next-line.`);
  process.exit(1);
}

if (current < baseline) {
  console.log(
    `\n🎉 Redução detectada (-${baseline - current}). Rode: node scripts/check-any-baseline.mjs --update`,
  );
}

process.exit(0);
