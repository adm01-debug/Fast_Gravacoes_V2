#!/usr/bin/env node
/**
 * Compara base/head bundle-report.json e gera um markdown de diff.
 *
 * Uso: node scripts/bundle-diff.mjs <base.json> <head.json> [out.md]
 * Saída compatível com ci.yml (job bundle-diff): markdown appendado em
 * $GITHUB_STEP_SUMMARY e upload do artifact dist/bundle-diff.md.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const [baseFile, headFile, outFile = 'dist/bundle-diff.md'] = process.argv.slice(2);

const toKb = (n) => +(Number(n) || 0).toFixed(2);

/**
 * Valida a forma mínima de um bundle-report.json com erro claro.
 * Aceita `files` ausente? Não: sem files não há diff significativo.
 */
export function validateReport(report, label) {
  if (!report || typeof report !== 'object' || Array.isArray(report)) {
    throw new Error(`❌ ${label} não é um object JSON válido (esperado bundle-report.json).`);
  }
  if (!report.totals || typeof report.totals !== 'object') {
    throw new Error(`❌ ${label} está sem "totals" (arquivo corrompido ou relatório antigo).`);
  }
  if (!Array.isArray(report.files)) {
    throw new Error(`❌ ${label} está sem "files" (arquivo corrompido ou relatório antigo).`);
  }
  for (let i = 0; i < report.files.length; i++) {
    const f = report.files[i];
    if (!f || typeof f !== 'object' || typeof f.file !== 'string' || typeof f.chunk !== 'string') {
      throw new Error(`❌ ${label} tem entrada inválida em files[${i}] (faltam "file"/"chunk").`);
    }
    if (!Number.isFinite(Number(f.gzipKb))) {
      throw new Error(`❌ ${label} tem gzipKb inválido em files[${i}] ("${f.file}").`);
    }
  }
  return report;
}

export function loadReport(path, label) {
  if (!path || !existsSync(path)) {
    throw new Error(`❌ Relatório ${label} não encontrado: ${path}`);
  }
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(path, 'utf8'));
  } catch (err) {
    throw new Error(`❌ Relatório ${label} não é JSON válido (${path}): ${err.message}`);
  }
  return validateReport(parsed, label);
}

function indexByChunk(report) {
  const map = new Map();
  for (const f of report.files) {
    const cur = map.get(f.chunk) || { chunk: f.chunk, gzipKb: 0 };
    cur.gzipKb = toKb(cur.gzipKb + f.gzipKb);
    map.set(f.chunk, cur);
  }
  return map;
}

const fmt = (n) => (n >= 0 ? `+${n.toFixed(2)}` : n.toFixed(2));
const arrow = (n) => (n > 0.5 ? '🔺' : n < -0.5 ? '🟢' : '➖');

export function buildDiffMarkdown(base, head) {
  const headIdx = indexByChunk(head);
  const baseIdx = indexByChunk(base ?? { files: [] });

  const rows = [];
  const allChunks = new Set([...headIdx.keys(), ...baseIdx.keys()]);
  for (const chunk of allChunks) {
    const h = headIdx.get(chunk) || { gzipKb: 0 };
    const b = baseIdx.get(chunk) || { gzipKb: 0 };
    rows.push({
      chunk,
      head: toKb(h.gzipKb),
      base: toKb(b.gzipKb),
      delta: +(toKb(h.gzipKb) - toKb(b.gzipKb)).toFixed(2),
    });
  }

  rows.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  const changed = rows.filter((r) => Math.abs(r.delta) >= 0.5);
  const newChunks = rows.filter((r) => r.base === 0 && r.head > 0);
  const removedChunks = rows.filter((r) => r.head === 0 && r.base > 0);
  const totalDelta = toKb(head.totals.gzipKb - (base?.totals.gzipKb ?? head.totals.gzipKb));
  const fileCountDelta = toKb(head.totals.fileCount - (base?.totals.fileCount ?? head.totals.fileCount));

  const lines = [
    `## 📦 Bundle Diff vs \`main\``,
    ``,
    base
      ? `**Total gzip:** ${head.totals.gzipKb} KB (${arrow(totalDelta)} ${fmt(totalDelta)} KB vs base)`
      : `**Total gzip:** ${head.totals.gzipKb} KB _(sem base para comparar)_`,
    base
      ? `**Arquivos:** ${head.totals.fileCount} (${arrow(fileCountDelta)} ${fileCountDelta >= 0 ? '+' : ''}${fileCountDelta} vs base)`
      : `**Arquivos:** ${head.totals.fileCount}`,
    ``,
  ];

  if (!base) {
    lines.push('_Nenhum relatório base disponível na branch principal — comparação será feita no próximo merge._');
  } else if (changed.length === 0 && newChunks.length === 0 && removedChunks.length === 0) {
    lines.push('✅ Nenhum chunk com alteração significativa (> 0.5 KB gzip).');
  } else {
    if (changed.length) {
      lines.push(`### Chunks alterados (${changed.length})`, '');
      lines.push('| Chunk | Base (KB) | PR (KB) | Δ |');
      lines.push('| --- | ---: | ---: | ---: |');
      for (const r of changed.slice(0, 20)) {
        lines.push(`| \`${r.chunk}\` | ${r.base.toFixed(2)} | ${r.head.toFixed(2)} | ${arrow(r.delta)} ${fmt(r.delta)} |`);
      }
      if (changed.length > 20) lines.push(`\n_+${changed.length - 20} outros chunks alterados._`);
    }
    if (newChunks.length) {
      lines.push(`### 🆕 Novos arquivos/chunks (${newChunks.length})`, '');
      lines.push(`- ${newChunks.map((r) => `\`${r.chunk}\``).join(', ')}`);
    }
    if (removedChunks.length) {
      lines.push(`### 🗑️ Removidos (${removedChunks.length})`, '');
      lines.push(`- ${removedChunks.map((r) => `\`${r.chunk}\``).join(', ')}`);
    }
  }

  return lines.join('\n') + '\n';
}

export function main() {
  let head;
  try {
    head = loadReport(headFile, 'head');
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }

  let base = null;
  if (baseFile && existsSync(baseFile)) {
    try {
      base = loadReport(baseFile, 'base');
    } catch (err) {
      console.error(`⚠️ ${err.message}`);
      console.error('⚠️ Continuando sem base (diff será parcial).');
    }
  }

  const md = buildDiffMarkdown(base, head);
  writeFileSync(outFile, md);
  console.log(md);
}

const isDirect = process.argv[1] && import.meta.url === new URL(`file://${process.argv[1].replace(/\\/g, '/')}`).href;
if (isDirect) main();
