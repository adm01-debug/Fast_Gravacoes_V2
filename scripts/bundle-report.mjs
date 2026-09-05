#!/usr/bin/env node
/**
 * Generates dist/bundle-report.json with per-chunk sizes (raw + gzip)
 * and enforces budgets defined in bundle-budget.json.
 *
 * Exit codes:
 *   0 = OK
 *   1 = budget exceeded (fail CI)
 */
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { join, relative, basename } from 'node:path';

const ROOT = process.cwd();
const DIST = join(ROOT, 'dist');
const BUDGET_FILE = join(ROOT, 'bundle-budget.json');
const OUT_JSON = join(DIST, 'bundle-report.json');
const OUT_MD = join(DIST, 'bundle-report.md');

if (!existsSync(DIST)) {
  console.error('❌ dist/ não encontrado. Rode `npm run build` antes.');
  process.exit(1);
}

const budget = existsSync(BUDGET_FILE)
  ? JSON.parse(readFileSync(BUDGET_FILE, 'utf8'))
  : { defaults: { maxChunkKb: 500, maxAssetKb: 1000, maxTotalKb: 10000 }, chunks: {}, entrypoints: {} };

const toKb = (bytes) => +(bytes / 1024).toFixed(2);

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, files);
    else files.push({ path: full, size: st.size });
  }
  return files;
}

/** Map filename like "vendor-react-DhJk2Wq8.js" → logical chunk name "vendor-react" */
function chunkNameFromFile(name) {
  const base = basename(name).replace(/\.(js|css|mjs)$/i, '');
  // Vite hash: trailing "-" + exactly 8 base64-url chars (a-z A-Z 0-9 _ -)
  return base.replace(/-[A-Za-z0-9_-]{8}$/, '');
}

const files = walk(DIST)
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

// ── Enforce budgets ───────────────────────────────────────────────
const violations = [];
const { defaults = {}, chunks = {}, entrypoints = {} } = budget;

if (defaults.maxTotalKb && totalGzipKb > defaults.maxTotalKb) {
  violations.push(`Total gzip ${totalGzipKb}KB > limite ${defaults.maxTotalKb}KB`);
}

for (const f of files) {
  const isCss = f.file.endsWith('.css');
  const limit =
    chunks[f.chunk] ??
    (isCss ? defaults.maxAssetKb : defaults.maxChunkKb);
  if (limit && f.gzipKb > limit) {
    violations.push(`Chunk "${f.chunk}" (${f.file}) ${f.gzipKb}KB gzip > limite ${limit}KB`);
  }
}

// Entrypoint budgets: match by route → chunk name heuristic
for (const [route, limit] of Object.entries(entrypoints)) {
  const key = route === '/' ? 'index' : route.replace(/^\//, '').replace(/\//g, '-');
  const matched = files.filter((f) =>
    f.chunk.toLowerCase().includes(key.toLowerCase())
  );
  const sum = +matched.reduce((s, f) => s + f.gzipKb, 0).toFixed(2);
  if (matched.length && sum > limit) {
    violations.push(`Rota "${route}" soma ${sum}KB gzip > limite ${limit}KB`);
  }
}

// ── Markdown summary ──────────────────────────────────────────────
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
  try {
    const { appendFileSync } = await import('node:fs');
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, md + '\n');
  } catch {}
}

if (violations.length) {
  console.error(`\n❌ ${violations.length} violação(ões) de budget — falhando o build.`);
  process.exit(1);
}

console.log('\n✅ Bundle dentro dos limites.');
