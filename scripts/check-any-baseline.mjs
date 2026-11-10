#!/usr/bin/env node
/**
 * Quality Gate — Any Ratchet
 *
 * Impede regressão de tipos: conta ocorrências de `any` explícito em src/
 * (excluindo testes e tipos auto-gerados) e falha se o total exceder o baseline.
 *
 * A contagem é pela AST do TypeScript (nó `AnyKeyword`), não por regex: pega
 * todo `any` em posição de tipo (`Record<string, any>`, `any[]`, `as any`,
 * `<T = any>`, `string | any`...) e ignora a palavra em comentário, string,
 * JSX ou nome de identificador. Um único contador, igual no pre-commit e no CI.
 *
 * Uso:
 *   node scripts/check-any-baseline.mjs          # valida contra baseline
 *   node scripts/check-any-baseline.mjs --list   # idem, listando cada ocorrência
 *   node scripts/check-any-baseline.mjs --update # atualiza baseline (só reduzir!)
 *   node scripts/check-any-baseline.mjs --update --force  # aceita aumento (justifique na PR)
 *
 * Saída: 0 = ok · 1 = gate reprovou · 2 = o gate não conseguiu rodar.
 * No CI (`CI=true`) o baseline precisa ser IGUAL à contagem: baseline acima do
 * real (folga para `any` novo, ou arquivo editado à mão) também reprova.
 */
import { readFileSync, writeFileSync, existsSync, readdirSync, realpathSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join, relative, basename } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
// Independente de cwd: tudo deriva da localização deste arquivo.
const ROOT = join(__dirname, '..');
const SRC_DIR = join(ROOT, 'src');
const BASELINE_FILE = join(ROOT, '.any-baseline.json');
const KNOWN_FLAGS = new Set(['--update', '--force', '--list']);

let tsModule;
async function loadTs() {
  if (!tsModule) {
    try {
      tsModule = (await import('typescript')).default;
    } catch (err) {
      throw new Error(
        `não foi possível carregar o pacote "typescript" (rode npm ci --legacy-peer-deps): ${err?.message ?? err}`,
      );
    }
  }
  return tsModule;
}

/** Arquivo entra na contagem? `rel` é relativo à raiz do repo, com `/`. */
export function isCounted(rel) {
  if (!/\.(ts|tsx|mts|cts)$/.test(rel)) return false;
  if (/\.(test|spec)\./.test(basename(rel))) return false;
  return rel !== 'src/integrations/supabase/types.ts';
}

/** Linhas (1-based) de cada `any` em posição de tipo no código-fonte dado. */
export function findAnyLines(ts, text, fileName = 'x.ts') {
  // Sem a palavra, não há o que parsear (atalho que cobre ~todos os arquivos).
  if (!/\bany\b/.test(text)) return [];
  const kind = fileName.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const sf = ts.createSourceFile(fileName, text, ts.ScriptTarget.Latest, false, kind);
  const lines = [];
  const visit = (node) => {
    if (node.kind === ts.SyntaxKind.AnyKeyword) {
      lines.push(sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1);
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return lines;
}

/** Todas as ocorrências em `srcDir`, em ordem estável: [{ file, line }]. */
export function collectAny(ts, srcDir, root = dirname(srcDir)) {
  const hits = [];
  const walk = (dir) => {
    const entries = readdirSync(dir, { withFileTypes: true }).sort((a, b) =>
      a.name < b.name ? -1 : a.name > b.name ? 1 : 0,
    );
    for (const entry of entries) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== 'node_modules') walk(full);
        continue;
      }
      if (!entry.isFile()) continue; // symlink, socket etc. — fora do fonte versionado
      const rel = relative(root, full).replaceAll('\\', '/');
      if (!isCounted(rel)) continue;
      for (const line of findAnyLines(ts, readFileSync(full, 'utf8'), entry.name)) {
        hits.push({ file: rel, line });
      }
    }
  };
  walk(srcDir);
  return hits;
}

/** Lê o baseline: { state: 'missing' | 'invalid' | 'ok', value?, detail? }. */
export function readBaseline(file) {
  if (!existsSync(file)) return { state: 'missing' };
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(file, 'utf8'));
  } catch (err) {
    return { state: 'invalid', detail: `JSON inválido (${err.message})` };
  }
  const value = parsed?.baseline;
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    return { state: 'invalid', detail: `"baseline" precisa ser inteiro >= 0, veio ${JSON.stringify(value)}` };
  }
  return { state: 'ok', value };
}

/** Decisão do modo validação: { code, verdict }. Pura, para teste. */
export function decide({ current, baseline, ci }) {
  if (current > baseline) return { code: 1, verdict: 'regrediu' };
  if (current < baseline) return ci ? { code: 1, verdict: 'baseline-frouxo' } : { code: 0, verdict: 'reduziu' };
  return { code: 0, verdict: 'igual' };
}

const fmtHits = (hits) => hits.map((h) => `   ${h.file}:${h.line}`).join('\n');

export async function main(argv = process.argv.slice(2), env = process.env) {
  const unknown = argv.filter((a) => !KNOWN_FLAGS.has(a));
  if (unknown.length) {
    console.error(`check-any-baseline: argumento desconhecido: ${unknown.join(' ')} (aceitos: ${[...KNOWN_FLAGS].join(', ')})`);
    return 2;
  }
  const update = argv.includes('--update');
  const force = argv.includes('--force');
  const list = argv.includes('--list');

  if (!existsSync(SRC_DIR)) {
    console.error(`check-any-baseline: ${SRC_DIR} não existe — nada foi contado.`);
    return 2;
  }
  const ts = await loadTs();
  const hits = collectAny(ts, SRC_DIR, ROOT);
  const current = hits.length;
  const prev = readBaseline(BASELINE_FILE);

  if (update) {
    // Ratchet "só reduzir": rejeita aumento do baseline (a menos que --force).
    const raised = prev.state === 'ok' && current > prev.value;
    if (raised && !force) {
      console.error(`❌ Recusando aumentar baseline: atual ${current} > baseline ${prev.value}.`);
      console.error(`   Primeiro remova os 'any' novos, ou use --force se a redução for impossível.`);
      console.error(fmtHits(hits));
      return 1;
    }
    writeFileSync(
      BASELINE_FILE,
      JSON.stringify({ baseline: current, updatedAt: new Date().toISOString() }, null, 2) + '\n',
    );
    console.log(`✅ Baseline atualizada: ${current} ocorrências de 'any'${raised ? ' (--force)' : ''}.`);
    return 0;
  }

  // Baseline ausente ou corrompido NÃO é "tudo certo": antes, apagar o arquivo
  // fazia o gate recriá-lo com o valor atual e passar (inclusive no CI).
  if (prev.state !== 'ok') {
    console.error(
      prev.state === 'missing'
        ? `❌ QUALITY GATE FALHOU: ${relative(ROOT, BASELINE_FILE)} não existe.`
        : `❌ QUALITY GATE FALHOU: ${relative(ROOT, BASELINE_FILE)} inválido — ${prev.detail}.`,
    );
    console.error(`   Contagem atual: ${current}. Para (re)criar: node scripts/check-any-baseline.mjs --update`);
    return 1;
  }

  const baseline = prev.value;
  console.log(`📊 Ocorrências de 'any' — baseline: ${baseline} | atual: ${current}`);
  if (list && hits.length) console.log(fmtHits(hits));

  const { code, verdict } = decide({ current, baseline, ci: Boolean(env.CI) });
  if (verdict === 'regrediu') {
    console.error(`\n❌ QUALITY GATE FALHOU: ${current - baseline} novo(s) 'any' introduzido(s).`);
    console.error(`   Substitua por 'unknown' + validação, tipos concretos ou generics.`);
    console.error(`   Se realmente inevitável, documente com // eslint-disable-next-line.`);
    console.error(`   Ocorrências atuais (${current}):\n${fmtHits(hits)}`);
  } else if (verdict === 'baseline-frouxo') {
    console.error(`\n❌ QUALITY GATE FALHOU: baseline (${baseline}) acima da contagem real (${current}).`);
    console.error(`   O ratchet só aperta: rode node scripts/check-any-baseline.mjs --update e commite o .any-baseline.json.`);
  } else if (verdict === 'reduziu') {
    console.log(`\n🎉 Redução detectada (-${baseline - current}). Rode: node scripts/check-any-baseline.mjs --update`);
  }
  return code;
}

// Só executa quando chamado direto (realpath: funciona via symlink e com caminho exótico).
const isDirect = (() => {
  try {
    return Boolean(process.argv[1]) && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href;
  } catch {
    return false;
  }
})();
if (isDirect) {
  main().then(
    (code) => process.exit(code),
    (err) => {
      // Qualquer falha em contar não pode passar o ratchet como se fosse 0.
      console.error('check-any-baseline: falha ao contar `any`:', err?.message ?? err);
      process.exit(2);
    },
  );
}
