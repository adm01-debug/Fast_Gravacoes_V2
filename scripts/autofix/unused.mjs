/**
 * Fixer "unused" — remove código não usado SEM mudar comportamento, usando o
 * language service do próprio TypeScript (mesmos code-fixes do VS Code).
 *
 * O que remove (só o que é seguro por construção):
 *  - imports não usados (o bundler já os elimina, então zero efeito em runtime);
 *  - elementos de desestruturação não usados (`const { a, b } = x()` → o `x()` continua);
 *  - `const/let` não usados cujo inicializador é puro (literal, identificador, função…);
 *  - funções / types / interfaces locais não usados.
 *
 * O que NÃO toca (vai para a fila manual do relatório):
 *  - parâmetros (mudar assinatura pode quebrar chamadores posicionais);
 *  - variável com inicializador que pode ter efeito colateral (chamada, hook, new…);
 *  - desestruturação em que TODOS os elementos são não usados (apagaria a chamada);
 *  - desestruturação com `...rest` (remover o irmão mudaria o conteúdo do rest).
 */
import ts from 'typescript';
import { writeFileSync } from 'node:fs';
import { resolve, relative } from 'node:path';

const UNUSED_CODES = new Set([6133, 6192, 6196, 6198]);
// Correções individuais vêm com fixId indefinido; só queremos as de REMOVER (não prefixar com _ nem inferir tipo).
const isRemoveFix = (f) =>
  f.fixName === 'unusedIdentifier' &&
  f.fixId !== 'unusedIdentifier_prefix' &&
  f.fixId !== 'unusedIdentifier_infer' &&
  /^Remove /.test(f.description);
const MAX_PASSES = 8;

const K = ts.SyntaxKind;
const LITERAL_KINDS = new Set([
  K.StringLiteral, K.NumericLiteral, K.BigIntLiteral, K.TrueKeyword, K.FalseKeyword,
  K.NullKeyword, K.NoSubstitutionTemplateLiteral, K.RegularExpressionLiteral,
  K.Identifier, K.ThisKeyword, K.ArrowFunction, K.FunctionExpression,
]);

function isPure(n) {
  if (!n) return true;
  if (LITERAL_KINDS.has(n.kind)) return true;
  if (
    ts.isParenthesizedExpression(n) || ts.isAsExpression(n) || ts.isNonNullExpression(n) ||
    ts.isSatisfiesExpression(n) || ts.isTypeAssertionExpression(n)
  ) return isPure(n.expression);
  if (ts.isPrefixUnaryExpression(n)) {
    // ++x e --x ALTERAM estado: nunca são puros
    const ok = [K.ExclamationToken, K.MinusToken, K.PlusToken, K.TildeToken];
    return ok.includes(n.operator) && isPure(n.operand);
  }
  if (ts.isArrayLiteralExpression(n)) return n.elements.every(isPure);
  if (ts.isObjectLiteralExpression(n)) {
    return n.properties.every(
      (p) =>
        ts.isShorthandPropertyAssignment(p) ||
        (ts.isPropertyAssignment(p) && !ts.isComputedPropertyName(p.name) && isPure(p.initializer)) ||
        ts.isMethodDeclaration(p),
    );
  }
  return false;
}

function nodeAt(sf, pos) {
  let found = sf;
  (function walk(n) {
    if (pos >= n.getStart(sf) && pos < n.getEnd()) {
      found = n;
      ts.forEachChild(n, walk);
    }
  })(sf);
  return found;
}

/** Decide se a diagnóstico pode ser corrigido sozinho. Retorna {ok, kind, why}. */
function decide(sf, d) {
  const node = nodeAt(sf, d.start);
  for (let p = node; p; p = p.parent) {
    if (ts.isImportDeclaration(p)) return { ok: true, kind: 'import' };
    if (ts.isParameter(p)) return { ok: false, kind: 'param', why: 'parâmetro: mudar assinatura exige revisão' };
    if (ts.isBindingElement(p)) {
      if (d.code === 6198) return { ok: false, kind: 'destructure', why: 'todos os itens não usados: apagar removeria a chamada' };
      // valor padrão (`a = f()`) e chave computada (`[k()]: a`) podem ter efeito colateral
      if (p.initializer && !isPure(p.initializer)) return { ok: false, kind: 'destructure', why: 'valor padrão pode ter efeito colateral' };
      if (p.propertyName && ts.isComputedPropertyName(p.propertyName) && !isPure(p.propertyName.expression)) return { ok: false, kind: 'destructure', why: 'chave computada pode ter efeito colateral' };
      const pattern = p.parent;
      const hasRest = pattern.elements.some((e) => e.dotDotDotToken);
      if (hasRest) return { ok: false, kind: 'destructure', why: 'tem ...rest: remover irmão muda o rest' };
      return { ok: true, kind: 'destructure' };
    }
    if (ts.isVariableDeclaration(p)) {
      const list = p.parent;
      const stmt = list?.parent;
      if (!stmt || !ts.isVariableStatement(stmt)) return { ok: false, kind: 'var', why: 'declaração em for/catch' };
      if (!ts.isIdentifier(p.name)) return { ok: false, kind: 'var', why: 'padrão de desestruturação' };
      if (!isPure(p.initializer)) return { ok: false, kind: 'var', why: 'inicializador pode ter efeito colateral (chamada/hook/new)' };
      return { ok: true, kind: 'var' };
    }
    if (ts.isFunctionDeclaration(p)) return { ok: true, kind: 'function' };
    if (ts.isTypeAliasDeclaration(p) || ts.isInterfaceDeclaration(p)) return { ok: true, kind: 'type' };
  }
  return { ok: false, kind: 'other', why: 'forma não reconhecida' };
}

/**
 * @param {{ root: string, tsconfig?: string, skipFiles?: Set<string>, apply: boolean }} opts
 * @returns resultado com arquivos alterados, contagem por tipo e a fila manual.
 */
export function runUnused({ root, tsconfig = 'tsconfig.app.json', skipFiles = new Set(), apply }) {
  const cfgPath = resolve(root, tsconfig);
  const cfg = ts.getParsedCommandLineOfConfigFile(
    cfgPath,
    { noUnusedLocals: true, noUnusedParameters: true },
    { ...ts.sys, onUnRecoverableConfigFileDiagnostic: (d) => { throw new Error(ts.flattenDiagnosticMessageText(d.messageText, '\n')); } },
  );

  const original = new Map(); // fileName -> texto do disco
  const text = new Map(); // fileName -> texto atual (overlay)
  const versions = new Map();
  const read = (f) => {
    if (!text.has(f)) {
      const t = ts.sys.readFile(f);
      if (t === undefined) return undefined;
      original.set(f, t);
      text.set(f, t);
      versions.set(f, 0);
    }
    return text.get(f);
  };

  const host = {
    getScriptFileNames: () => cfg.fileNames,
    getScriptVersion: (f) => String(versions.get(f) ?? 0),
    getScriptSnapshot: (f) => {
      const t = read(f);
      return t === undefined ? undefined : ts.ScriptSnapshot.fromString(t);
    },
    getCurrentDirectory: () => root,
    getCompilationSettings: () => cfg.options,
    getDefaultLibFileName: (o) => ts.getDefaultLibFilePath(o),
    fileExists: ts.sys.fileExists,
    readFile: ts.sys.readFile,
    readDirectory: ts.sys.readDirectory,
    directoryExists: ts.sys.directoryExists,
    getDirectories: ts.sys.getDirectories,
  };
  const ls = ts.createLanguageService(host, ts.createDocumentRegistry());
  const fmt = ts.getDefaultFormatCodeSettings('\n');

  const targets = cfg.fileNames.filter(
    (f) => !f.endsWith('.d.ts') && !f.includes('/node_modules/') && !skipFiles.has(relative(root, f)),
  );

  const fixedByKind = {};
  let manual = [];

  for (let pass = 1; pass <= MAX_PASSES; pass++) {
    let changedThisPass = 0;
    manual = [];
    for (const file of targets) {
      const sf = ls.getProgram()?.getSourceFile(file);
      if (!sf) continue;
      const diags = ls
        .getSemanticDiagnostics(file)
        .filter((d) => UNUSED_CODES.has(d.code) && d.start !== undefined);
      if (!diags.length) continue;

      const edits = []; // {start, end, newText, kind}
      for (const d of diags) {
        const dec = decide(sf, d);
        const { line } = sf.getLineAndCharacterOfPosition(d.start);
        const name = text.get(file).slice(d.start, d.start + d.length).slice(0, 60);
        if (!dec.ok) {
          manual.push({ file: relative(root, file), line: line + 1, code: d.code, kind: dec.kind, name, why: dec.why });
          continue;
        }
        const fixes = ls
          .getCodeFixesAtPosition(file, d.start, d.start + d.length, [d.code], fmt, {})
          .filter(isRemoveFix);
        const fix = fixes[0];
        if (!fix || fix.changes.some((c) => c.fileName !== file)) {
          manual.push({ file: relative(root, file), line: line + 1, code: d.code, kind: dec.kind, name, why: 'TypeScript não ofereceu correção segura' });
          continue;
        }
        for (const c of fix.changes) {
          for (const tc of c.textChanges) {
            edits.push({ start: tc.span.start, end: tc.span.start + tc.span.length, newText: tc.newText, kind: dec.kind });
          }
        }
      }
      if (!edits.length) continue;

      // aplica de trás pra frente; descarta edição sobreposta (entra na próxima passada)
      edits.sort((a, b) => b.start - a.start || b.end - a.end);
      let out = text.get(file);
      let lastStart = Infinity;
      for (const e of edits) {
        if (e.end > lastStart) continue;
        out = out.slice(0, e.start) + e.newText + out.slice(e.end);
        lastStart = e.start;
        fixedByKind[e.kind] = (fixedByKind[e.kind] || 0) + 1;
        changedThisPass++;
      }
      text.set(file, out);
      versions.set(file, (versions.get(file) ?? 0) + 1);
    }
    if (!changedThisPass) break;
  }

  // dedupe da fila manual (última passada vale)
  const seen = new Set();
  manual = manual.filter((m) => {
    const k = `${m.file}:${m.line}:${m.name}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  const changedFiles = [...text.keys()].filter((f) => text.get(f) !== original.get(f));
  if (apply) {
    for (const f of changedFiles) writeFileSync(f, text.get(f));
  }
  return {
    changedFiles: changedFiles.map((f) => relative(root, f)),
    fixedByKind,
    manual,
  };
}

// Execução direta: node scripts/autofix/unused.mjs [--apply]
if (import.meta.url === `file://${process.argv[1]}`) {
  const apply = process.argv.includes('--apply');
  const r = runUnused({ root: process.cwd(), apply });
  console.log(JSON.stringify({ apply, arquivos: r.changedFiles.length, porTipo: r.fixedByKind, manual: r.manual.length }, null, 2));
}
