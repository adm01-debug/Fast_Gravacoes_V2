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
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASELINE_FILE = join(__dirname, '..', '.any-baseline.json');

const PATTERN = String.raw`(:\s*any\b|:\s*any\[|<any>|\bas any\b|\(any\))`;
const IGNORES = [
  '!**/*.test.*',
  '!**/*.spec.*',
  '!src/integrations/supabase/types.ts',
];

function countAny() {
  const args = [
    '--type-add', 'tsx:*.tsx',
    '-t', 'ts', '-t', 'tsx',
    ...IGNORES.flatMap((g) => ['-g', g]),
    '--count-matches',
    PATTERN,
    'src',
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
  } catch {
    return 0;
  }
}

const current = countAny();
const update = process.argv.includes('--update');

if (update || !existsSync(BASELINE_FILE)) {
  writeFileSync(
    BASELINE_FILE,
    JSON.stringify({ baseline: current, updatedAt: new Date().toISOString() }, null, 2) + '\n',
  );
  console.log(`✅ Baseline atualizada: ${current} ocorrências de 'any'.`);
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
