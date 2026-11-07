#!/usr/bin/env node
/**
 * Generates dist/bundle-report.json with per-chunk sizes (raw + gzip)
 * and enforces budgets defined in bundle-budget.json.
 *
 * Exit codes:
 *   0 = OK
 *   1 = budget exceeded (fail CI)
 */
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync, appendFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { join, relative, basename } from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const DIST = join(ROOT, 'dist');
const BUDGET_FILE = join(ROOT, 'bundle-budget.json');
const OUT_JSON = join(DIST, 'bundle-report.json');
const OUT_MD = join(DIST, 'bundle-report.md');

const toKb = (bytes) => +(bytes / 1024).toFixed(2);

/** Default budget used when bundle-budget.json is absent (kept for compat). */
export const DEFAULT_BUDGET = {
  defaults: { maxChunkKb: 500, maxAssetKb: 1000, maxTotalKb: 10000 },
  chunks: {},
  entrypoints: {},
};

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, files);
    else files.push({ path: full, size: st.size });
  }
  return files;
}

/**
 * Strip a trailing content hash from a Vite bundle filename. Vite hash length
 * is configurable with `[hash:N]` (commonly 8 or 16 chars; base64url, so `-`
 * and `_` are valid hash chars). We therefore match a trailing `-` followed by
 * exactly one of the known hash lengths — never a greedy run that would swallow
 * name segments like `lib-mermaid`, nor a short run that would keep a hash
 * containing dashes.
 */
export function chunkNameFromFile(name) {
  const base = basename(name).replace(/\.(js|css|mjs)$/i, '');
  const hash = base.match(/-[A-Za-z0-9_-]{8}$/) || base.match(/-[A-Za-z0-9_-]{16}$/)
    || base.match(/-[A-Za-z0-9_-]{20}$/) || base.match(/-[A-Za-z0-9_-]{32}$/)
    || base.match(/-[A-Za-z0-9_-]{64}$/);
  return hash ? base.slice(0, hash.index) : base;
}

/**
 * Collect enforced-budget violations for a list of measured files.
 * Pure and unit-testable; returns [{ message }] — empty means pass.
 */
export function collectViolations(files, budget) {
  const { defaults = {}, chunks = {}, entrypoints = {} } = budget || {};
  const violations = [];
  const totalGzipKb = +files.reduce((s, f) => s + (f.gzipKb ?? 0), 0).toFixed(2);

  if (defaults.maxTotalKb && totalGzipKb > defaults.maxTotalKb) {
    violations.push(`Total gzip ${totalGzipKb}KB > limite ${defaults.maxTotalKb}KB`);
  }

  for (const f of files) {
    const isCss = f.file.endsWith('.css');
    const limit = chunks[f.chunk] ?? (isCss ? defaults.maxAssetKb : defaults.maxChunkKb);
    if (limit && f.gzipKb > limit) {
      violations.push(`Chunk "${f.chunk}" (${f.file}) ${f.gzipKb}KB gzip > limite ${limit}KB`);
    }
  }

  for (const [route, limit] of Object.entries(entrypoints)) {
    // Lazy pages are chunked under the component name (AuthPage, KioskPage,
    // OperatorView...), not the route slug — so budgets allow an explicit
    // map route→chunk names. When present, match exact names only. Without
    // it, fall back to prefix-exact on the derived key ('/'→'index').
    const alias = budget?.entrypointChunks?.[route];
    let matched;
    if (Array.isArray(alias) && alias.length) {
      const names = alias.map((c) => c.toLowerCase());
      matched = files.filter((f) => names.includes((f.chunk || '').toLowerCase()));
      if (!matched.length) {
        violations.push(`Rota "${route}": nenhum chunk do build corresponde a ${JSON.stringify(alias)} — budget não avaliado`);
      }
    } else {
      const key = route === '/' ? 'index' : route.replace(/^\//, '').replace(/\//g, '-');
      // Prefix-exact match: '/'→'index' must not accidentally capture chunks like
      // 'index-page' or 'auth-index' that merely *contain* the key substring.
      matched = files.filter((f) => {
        const chunk = (f.chunk || '').toLowerCase();
        return chunk === key.toLowerCase() || chunk.startsWith(`${key.toLowerCase()}-`);
      });
      if (!matched.length) {
        violations.push(`Rota "${route}": nenhum chunk casa com "${key}" (considere declarar entrypointChunks) — budget não avaliado`);
      }
    }
    const sum = +matched.reduce((s, f) => s + f.gzipKb, 0).toFixed(2);
    if (matched.length && sum > limit) {
      violations.push(`Rota "${route}" soma ${sum}KB gzip > limite ${limit}KB`);
    }
  }

  return violations;
}

/** Walk dist and measure every JS/CSS/mjs asset (excluding .map). Pure-ish, cwd-based. */
export function measureFiles() {
  return walk(DIST)
    .filter((f) => /\.(js|css|mjs)$/i.test(f.path) && !f.path.endsWith('.map'))
    .map((f) => {
      const content = readFileSync(f.path);
      return {
        file: relative(DIST, f.path),
        chunk: chunkNameFromFile(f.path),
        sizeKb: toKb(f.size),
        gzipKb: toKb(gzipSync(content).length),
      };
    })
    .sort((a, b) => b.gzipKb - a.gzipKb);
}

export async function main() {
  if (!existsSync(DIST)) {
    console.error('❌ dist/ não encontrado. Rode `npm run build` antes.');
    process.exit(1);
  }

  const budget = existsSync(BUDGET_FILE)
    ? JSON.parse(readFileSync(BUDGET_FILE, 'utf8'))
    : DEFAULT_BUDGET;

  const files = measureFiles();

  const totalKb = +files.reduce((s, f) => s + f.sizeKb, 0).toFixed(2);
  const totalGzipKb = +files.reduce((s, f) => s + f.gzipKb, 0).toFixed(2);

  const report = {
    generatedAt: new Date().toISOString(),
    commit: process.env.GITHUB_SHA || null,
    branch: process.env.GITHUB_REF_NAME || null,
    totals: { sizeKb: totalKb, gzipKb: totalGzipKb, fileCount: files.length },
    files,
  };

  writeFileSync(OUT_JSON, JSON.stringify(report, null, 2));

  // ── Enforce budgets ───────────────────────────────────────────
  const violations = collectViolations(files, budget);

  // ── Markdown summary ──────────────────────────────────────────
  const top = files.slice(0, 15);
  const md = [
    `# 📦 Bundle Report`,
    ``,
    `**Commit:** \`${report.commit ?? 'local'}\` · **Branch:** \`${report.branch ?? 'local'}\``,
    `**Total:** ${totalKb} KB (${totalGzipKb} KB gzip) em ${files.length} arquivos`,
    ``,
    `## Top 15 chunks (gzip)`,
    ``,
    `| Chunk | Arquivo | Raw (KB) | Gzip (KB) |`,
    `| --- | --- | ---: | ---: |`,
    ...top.map((f) => `| \`${f.chunk}\` | \`${f.file}\` | ${f.sizeKb} | ${f.gzipKb} |`),
    ``,
    violations.length
      ? `## ❌ Violações de budget (${violations.length})\n\n${violations.map((v) => `- ${v}`).join('\n')}`
      : `## ✅ Todos os budgets respeitados`,
    ``,
  ].join('\n');

  writeFileSync(OUT_MD, md);

  console.log(md);

  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, md + '\n');
  }

  if (violations.length) {
    console.error(`\n❌ ${violations.length} violação(ões) de budget — falhando o build.`);
    process.exit(1);
  }

  console.log('\n✅ Bundle dentro dos limites.');
}

// Run only when executed directly (not when imported by tests).
const isDirect = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isDirect) {
  main().catch((err) => {
    console.error('❌ bundle-report falhou:', err);
    process.exit(1);
  });
}
