#!/usr/bin/env node
/**
 * Compara dist/bundle-report.json (PR atual) com um relatório base
 * (artifact da branch main) e gera um comentário markdown.
 *
 * Uso: node scripts/bundle-diff.mjs <base.json> <head.json> [out.md]
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const [baseFile, headFile, outFile = 'dist/bundle-diff.md'] = process.argv.slice(2);

if (!headFile || !existsSync(headFile)) {
  console.error('❌ Relatório head não encontrado:', headFile);
  process.exit(1);
}

const head = JSON.parse(readFileSync(headFile, 'utf8'));
const base = baseFile && existsSync(baseFile) ? JSON.parse(readFileSync(baseFile, 'utf8')) : null;

const fmt = (n) => (n >= 0 ? `+${n.toFixed(2)}` : n.toFixed(2));
const arrow = (n) => (n > 0.5 ? '🔺' : n < -0.5 ? '🟢' : '➖');

function indexByChunk(report) {
  const map = new Map();
  for (const f of report.files) {
    const cur = map.get(f.chunk) || { chunk: f.chunk, sizeKb: 0, gzipKb: 0 };
    cur.sizeKb += f.sizeKb;
    cur.gzipKb += f.gzipKb;
    map.set(f.chunk, cur);
  }
  return map;
}

const headIdx = indexByChunk(head);
const baseIdx = base ? indexByChunk(base) : new Map();

const rows = [];
const allChunks = new Set([...headIdx.keys(), ...baseIdx.keys()]);
for (const chunk of allChunks) {
  const h = headIdx.get(chunk) || { gzipKb: 0 };
  const b = baseIdx.get(chunk) || { gzipKb: 0 };
  rows.push({
    chunk,
    head: h.gzipKb,
    base: b.gzipKb,
    delta: +(h.gzipKb - b.gzipKb).toFixed(2),
  });
}

rows.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
const changed = rows.filter((r) => Math.abs(r.delta) >= 0.5);
const totalDelta = +(head.totals.gzipKb - (base?.totals.gzipKb ?? head.totals.gzipKb)).toFixed(2);

const lines = [
  `## 📦 Bundle Diff vs \`main\``,
  ``,
  base
    ? `**Total gzip:** ${head.totals.gzipKb} KB (${arrow(totalDelta)} ${fmt(totalDelta)} KB vs base)`
    : `**Total gzip:** ${head.totals.gzipKb} KB _(sem base para comparar)_`,
  ``,
];

if (!base) {
  lines.push('_Nenhum relatório base disponível na branch principal — comparação será feita no próximo merge._');
} else if (changed.length === 0) {
  lines.push('✅ Nenhum chunk com alteração significativa (> 0.5 KB gzip).');
} else {
  lines.push(`### Chunks alterados (${changed.length})`, '');
  lines.push('| Chunk | Base (KB) | PR (KB) | Δ |');
  lines.push('| --- | ---: | ---: | ---: |');
  for (const r of changed.slice(0, 20)) {
    lines.push(`| \`${r.chunk}\` | ${r.base.toFixed(2)} | ${r.head.toFixed(2)} | ${arrow(r.delta)} ${fmt(r.delta)} |`);
  }
  if (changed.length > 20) lines.push(`\n_+${changed.length - 20} outros chunks alterados._`);
}

const md = lines.join('\n') + '\n';
writeFileSync(outFile, md);
console.log(md);
