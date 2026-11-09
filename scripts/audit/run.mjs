#!/usr/bin/env node
/**
 * Audit — detecta falhas e gaps por regra MECÂNICA, sem IA e sem custo de token.
 * Só lê; nunca altera código. Cada achado tem arquivo:linha e evidência.
 *
 * Uso:
 *   node scripts/audit/run.mjs              # relatório + compara com o baseline (se existir)
 *   node scripts/audit/run.mjs --baseline   # grava o estado atual como baseline aceito
 *   node scripts/audit/run.mjs --estrito    # exit 1 se houver achado NOVO crítico/alto vs baseline
 *
 * Saída (pasta .audit/, ignorada pelo git):
 *   relatorio.md            resumo por checagem + os achados mais graves
 *   fila-para-decisao.md    só crítico/alto, com trecho de código — é o que um humano/IA deve olhar
 *   findings.json           tudo, para outras ferramentas
 *
 * Limites honestos: checagem estática enxerga o que está ESCRITO (migrations, código), não o banco
 * ao vivo nem a intenção de negócio. Cada checagem declara seu limite em `limite`.
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, basename } from 'node:path';
import ts from 'typescript';

const args = process.argv.slice(2);
const ROOT = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
process.chdir(ROOT);
const OUT = join(ROOT, '.audit');
mkdirSync(OUT, { recursive: true });
const BASELINE = process.env.AUDIT_BASELINE || join(ROOT, 'scripts/audit/baseline.json');

// ---------- utilidades ----------
const tracked = execFileSync('git', ['ls-files'], { encoding: 'utf8', maxBuffer: 1 << 28 }).split('\n').filter(Boolean);
const cache = new Map();
const read = (f) => {
  if (!cache.has(f)) cache.set(f, existsSync(f) ? readFileSync(f, 'utf8') : '');
  return cache.get(f);
};
const isTest = (f) => /\.(test|spec)\.[tj]sx?$/.test(f) || /(^|\/)(test|tests|__tests__|__mocks__)\//.test(f);
const srcFiles = tracked.filter((f) => /^src\/.*\.(ts|tsx)$/.test(f) && !isTest(f) && !f.endsWith('.d.ts'));
const lineOf = (text, idx) => text.slice(0, idx).split('\n').length;
const lineText = (text, line) => (text.split('\n')[line - 1] || '').trim().slice(0, 160);
const redact = (s) => (s.length > 10 ? `${s.slice(0, 6)}…[${s.length} chars]` : '***');
const globRx = (g) =>
  new RegExp('^' + g.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*\*/g, '\u0000').replace(/\*/g, '[^/]*').replace(/\u0000/g, '.*') + '$');

const findings = [];
const checks = []; // {id, titulo, limite, total}
function add(check, sev, titulo, arquivo, linha, evidencia, sugestao, extra = {}) {
  findings.push({ check, sev, titulo, arquivo, linha, evidencia, sugestao, ...extra });
}
function defCheck(id, titulo, limite, fn) {
  const before = findings.length;
  try {
    fn();
  } catch (e) {
    add(id, 'baixa', `A checagem "${id}" falhou ao rodar`, '-', 0, String(e.message || e), 'Corrigir o script de auditoria');
  }
  checks.push({ id, titulo, limite, total: findings.length - before });
}

// ---------- 1. RLS: políticas de escrita permissivas (estado final das migrations) ----------
const migrations = tracked.filter((f) => /^supabase\/migrations\/.*\.sql$/.test(f)).sort();
const stripSql = (s) => s.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' ')).replace(/--[^\n]*/g, (m) => ' '.repeat(m.length));
const normTable = (t) => t.replace(/"/g, '').replace(/^public\./i, '').toLowerCase();
const normName = (n) => n.replace(/"/g, '');

function balanced(text, openIdx) {
  let d = 0;
  for (let i = openIdx; i < text.length; i++) {
    if (text[i] === '(') d++;
    else if (text[i] === ')' && --d === 0) return text.slice(openIdx + 1, i);
  }
  return null;
}

defCheck(
  'rls-escrita-permissiva',
  'Políticas RLS de escrita com USING/WITH CHECK (true)',
  'Lê só o que as migrations declaram. Políticas criadas por SQL dinâmico (EXECUTE/format) ou em loops não são vistas; a migration 20261106011000 já barra isso no banco ao vivo.',
  () => {
    const pol = new Map();
    const tables = new Set();
    for (const f of migrations) {
      const text = stripSql(read(f));
      const ev = [];
      for (const m of text.matchAll(/create\s+policy\s+("[^"]+"|\w+)\s+on\s+([\w."]+)/gi)) ev.push({ i: m.index, t: 'create', name: normName(m[1]), table: normTable(m[2]), len: m[0].length });
      for (const m of text.matchAll(/drop\s+policy\s+(?:if\s+exists\s+)?("[^"]+"|\w+)\s+on\s+([\w."]+)/gi)) ev.push({ i: m.index, t: 'drop', name: normName(m[1]), table: normTable(m[2]) });
      for (const m of text.matchAll(/drop\s+table\s+(?:if\s+exists\s+)?([\w."]+)/gi)) ev.push({ i: m.index, t: 'droptable', table: normTable(m[1]) });
      for (const m of text.matchAll(/alter\s+policy\s+("[^"]+"|\w+)\s+on\s+([\w."]+)/gi)) ev.push({ i: m.index, t: 'alter', name: normName(m[1]), table: normTable(m[2]), len: m[0].length });
      // SQL dinâmico: format('DROP POLICY IF EXISTS %I ON public.%I', 'nome', t) dentro de loop sobre ARRAY['t1','t2',…]
      for (const m of text.matchAll(/drop\s+policy\s+if\s+exists\s+%I\s+on\s+(?:public\.)?%I['"]\s*,\s*'([^']+)'/gi)) {
        const arrays = [...text.slice(0, m.index).matchAll(/array\s*\[([^\]]*)\]/gi)];
        const last = arrays[arrays.length - 1];
        if (last) for (const t of last[1].matchAll(/'([^']+)'/g)) ev.push({ i: m.index, t: 'drop', name: m[1], table: normTable(t[1]) });
      }
      ev.sort((a, b) => a.i - b.i);
      for (const e of ev) {
        const key = `${e.table}|${e.name}`;
        if (e.t === 'drop') pol.delete(key);
        else if (e.t === 'droptable') {
          for (const k of [...pol.keys()]) if (k.startsWith(e.table + '|')) pol.delete(k);
        } else {
          const end = text.indexOf(';', e.i);
          const stmt = text.slice(e.i, end < 0 ? undefined : end);
          const cmd = (/\bfor\s+(all|select|insert|update|delete)\b/i.exec(stmt)?.[1] || (e.t === 'alter' ? pol.get(key)?.cmd : 'all') || 'all').toLowerCase();
          const roles = (/\bto\s+([\w",\s]+?)(?=\s+(?:using|with)\b|$)/i.exec(stmt)?.[1] || (pol.get(key)?.roles ?? 'public')).toLowerCase();
          const u = /\busing\s*\(/i.exec(stmt);
          const c = /\bwith\s+check\s*\(/i.exec(stmt);
          const using = u ? balanced(stmt, u.index + u[0].length - 1) : e.t === 'alter' ? pol.get(key)?.using : null;
          const check = c ? balanced(stmt, c.index + c[0].length - 1) : e.t === 'alter' ? pol.get(key)?.check : null;
          pol.set(key, { table: e.table, name: e.name, cmd, roles, using, check, file: f, line: lineOf(text, e.i) });
        }
      }
    }
    const isTrue = (x) => x != null && /^\s*true\s*$/i.test(x);
    for (const p of pol.values()) {
      if (!['all', 'insert', 'update', 'delete'].includes(p.cmd)) continue;
      if (/^\s*service_role\s*$/.test(p.roles)) continue;
      const bad = p.cmd === 'insert' ? isTrue(p.check) : isTrue(p.using) || isTrue(p.check);
      if (bad)
        add('rls-escrita-permissiva', 'critica', `Política "${p.name}" em ${p.table} permite ${p.cmd.toUpperCase()} sem filtro (true)`, p.file, p.line,
          `${p.cmd.toUpperCase()} para ${p.roles}: USING(${p.using ?? '-'}) CHECK(${p.check ?? '-'})`,
          'Trocar por condição real (auth.uid(), papel via função has_role) e testar com a suíte rls-regression.');
    }
  },
);

// ---------- 2. Tabelas criadas sem RLS ----------
defCheck('tabela-sem-rls', 'Tabelas em public criadas sem ENABLE ROW LEVEL SECURITY', 'Não vê RLS ativado por SQL dinâmico/loop.', () => {
  const created = new Map();
  const rls = new Set();
  const dropped = new Set();
  for (const f of migrations) {
    const text = stripSql(read(f));
    for (const m of text.matchAll(/create\s+table\s+(?:if\s+not\s+exists\s+)?([\w."]+)/gi)) {
      const raw = m[1].replace(/"/g, '');
      if (raw.includes('.') && !/^public\./i.test(raw)) continue;
      const t = normTable(m[1]);
      if (!created.has(t)) created.set(t, { f, line: lineOf(text, m.index) });
      dropped.delete(t);
    }
    for (const m of text.matchAll(/alter\s+table\s+(?:if\s+exists\s+)?(?:only\s+)?([\w."]+)\s+enable\s+row\s+level\s+security/gi)) rls.add(normTable(m[1]));
    for (const m of text.matchAll(/drop\s+table\s+(?:if\s+exists\s+)?([\w."]+)/gi)) dropped.add(normTable(m[1]));
  }
  for (const [t, { f, line }] of created)
    if (!rls.has(t) && !dropped.has(t))
      add('tabela-sem-rls', 'alta', `Tabela ${t} sem ENABLE ROW LEVEL SECURITY nas migrations`, f, line, `create table ${t}`, `Adicionar ALTER TABLE public.${t} ENABLE ROW LEVEL SECURITY e políticas.`);
});

// ---------- 3. Edge functions ----------
const fnDir = 'supabase/functions';
const fnNames = existsSync(fnDir) ? readdirSync(fnDir).filter((n) => !n.startsWith('_') && statSync(join(fnDir, n)).isDirectory()) : [];
const fnFiles = (n) => tracked.filter((f) => f.startsWith(`${fnDir}/${n}/`) && /\.ts$/.test(f) && !isTest(f));

defCheck('edge-sem-config', 'Edge function sem entrada em supabase/config.toml', 'Só confere a presença da seção [functions.x].', () => {
  const cfg = read('supabase/config.toml');
  for (const n of fnNames)
    if (!new RegExp(`\\[functions\\.${n.replace(/[-]/g, '\\-')}\\]`).test(cfg))
      add('edge-sem-config', 'media', `Function ${n} sem [functions.${n}] no config.toml`, `${fnDir}/${n}`, 1, 'sem seção', `Declarar verify_jwt explícito para ${n}.`);
});

defCheck('edge-sem-chamador', 'Edge function sem nenhum chamador no repositório', 'Cron configurado no painel do Supabase ou webhook externo não aparece aqui — por isso é "média".', () => {
  const corpus = [...srcFiles, ...migrations, ...tracked.filter((f) => f.startsWith('.github/')), ...tracked.filter((f) => f.startsWith(fnDir + '/') && /\.ts$/.test(f))];
  for (const n of fnNames) {
    const rx = new RegExp(`['"\`/]${n}['"\`/?]`);
    const own = `${fnDir}/${n}/`;
    if (!corpus.some((f) => !f.startsWith(own) && rx.test(read(f))))
      add('edge-sem-chamador', 'media', `Function ${n} não é chamada por nada no repo`, `${fnDir}/${n}`, 1, 'nenhuma referência', 'Confirmar se é cron/webhook externo; senão é código morto.');
  }
});

defCheck('edge-cors-curinga', 'Edge function com CORS "*" fixo no código', 'Só vê literal no código; o helper _shared/cors.ts pode restringir por env.', () => {
  for (const n of fnNames)
    for (const f of fnFiles(n)) {
      const t = read(f);
      const m = /Access-Control-Allow-Origin['"]?\s*[:,]\s*['"]\*['"]/.exec(t);
      if (m) add('edge-cors-curinga', 'media', `CORS "*" fixo em ${n}`, f, lineOf(t, m.index), lineText(t, lineOf(t, m.index)), 'Usar o helper _shared/cors.ts com origem permitida.');
    }
});

defCheck('edge-sem-autenticacao', 'Edge function sem verificação de autenticação/segredo aparente', 'Heurística: procura getUser/Authorization/segredo/HMAC/helper de auth. verify_jwt=true sozinho aceita qualquer JWT (inclusive a anon key).', () => {
  const rx = /getUser\(|Authorization|authorization|requireCronSecret|requireAuth|requireRole|hmac|timingSafe|x-api-key|x-cron-secret|_shared\/(auth|cronAuth)/i;
  for (const n of fnNames) {
    const files = fnFiles(n);
    if (!files.length) continue;
    const all = files.map(read).join('\n');
    if (!rx.test(all)) add('edge-sem-autenticacao', 'media', `Function ${n} sem checagem de autenticação aparente`, files[0], 1, 'nenhum getUser/Authorization/segredo/HMAC', 'Exigir usuário/papel ou segredo de cron/webhook dentro da função.');
  }
});

// ---------- 4. Páginas órfãs ----------
defCheck('pagina-orfa', 'Página em src/pages que nada importa (sem rota)', 'Importação dinâmica montada por template string não é vista.', () => {
  const pages = tracked.filter((f) => /^src\/pages\/.*\.tsx$/.test(f) && !isTest(f));
  const corpus = srcFiles.filter((f) => !pages.includes(f) || true);
  for (const p of pages) {
    const rel = p.replace(/^src\//, '').replace(/\.tsx$/, '');
    const nm = basename(rel);
    const rx = new RegExp(`(@/${rel.replace(/\//g, '\\/')}|['"]\\./${nm}['"]|pages/${rel.replace(/^pages\//, '').replace(/\//g, '\\/')}['"])`);
    if (!corpus.some((f) => f !== p && rx.test(read(f))))
      add('pagina-orfa', 'media', `Página ${nm} não é importada por ninguém`, p, 1, 'sem import/rota', 'Registrar a rota em AppRoutes.tsx ou remover a página.');
  }
});

// ---------- 5. Tabelas/RPCs usadas no código mas inexistentes ----------
defCheck('tabela-inexistente', 'Tabela/RPC usada no código que não existe no banco (types.ts + migrations)', 'types.ts é gerado; se estiver velho, aparece como "média".', () => {
  const types = read('src/integrations/supabase/types.ts');
  const inTypes = new Set([...types.matchAll(/^\s{6}([a-z0-9_]+): \{\s*\n\s+Row:/gm)].map((m) => m[1]));
  const rpcTypes = new Set([...types.matchAll(/^\s{6}([a-z0-9_]+): \{\s*\n\s+Args:/gm)].map((m) => m[1]));
  const sql = migrations.map((f) => stripSql(read(f))).join('\n');
  const inSql = (n) => new RegExp(`(table|view)\\s+(if\\s+not\\s+exists\\s+)?(public\\.)?"?${n}"?\\b`, 'i').test(sql);
  const fnSql = (n) => new RegExp(`function\\s+(public\\.)?"?${n}"?\\s*\\(`, 'i').test(sql);
  const seen = new Set();
  for (const f of srcFiles) {
    const t = read(f);
    for (const m of t.matchAll(/([\w.]*)\.from\(\s*['"]([a-z0-9_]+)['"]\s*\)/g)) {
      if (/storage$/i.test(m[1])) continue;
      const n = m[2];
      if (inTypes.has(n) || seen.has(n)) continue;
      seen.add(n);
      const noSql = !inSql(n);
      add('tabela-inexistente', noSql ? 'alta' : 'media', noSql ? `Tabela "${n}" usada no código e inexistente no banco` : `Tabela "${n}" existe nas migrations mas não em types.ts`, f, lineOf(t, m.index), lineText(t, lineOf(t, m.index)),
        noSql ? 'Criar a migration da tabela (com RLS) ou remover o uso.' : 'Regenerar src/integrations/supabase/types.ts.');
    }
    for (const m of t.matchAll(/\.rpc\(\s*['"]([a-z0-9_]+)['"]/g)) {
      const n = m[1];
      if (rpcTypes.has(n) || seen.has('rpc:' + n)) continue;
      seen.add('rpc:' + n);
      const noSql = !fnSql(n);
      add('tabela-inexistente', noSql ? 'alta' : 'media', noSql ? `RPC "${n}" chamada e inexistente no banco` : `RPC "${n}" existe nas migrations mas não em types.ts`, f, lineOf(t, m.index), lineText(t, lineOf(t, m.index)),
        noSql ? 'Criar a função em migration ou remover a chamada.' : 'Regenerar types.ts.');
    }
  }
});

// ---------- 6. AST: botões inertes e catch vazio ----------
const BTN = new Set(['Button', 'button']);
const HANDLER_ATTRS = new Set(['onClick', 'type', 'asChild', 'onSelect', 'form', 'href', 'to', 'onPointerDown', 'onMouseDown', 'onKeyDown', 'onValueChange', 'disabled', 'onCheckedChange', 'aria-hidden']);
const PARENT_OK = /(Trigger|Close|Cancel|Action|Link|Anchor|Item|Toggle)$/;
const astHits = { botao: [], catchVazio: [] };
for (const f of srcFiles) {
  const t = read(f);
  if (!/\.tsx?$/.test(f) || (!t.includes('<Button') && !t.includes('<button') && !t.includes('catch'))) continue;
  const sf = ts.createSourceFile(f, t, ts.ScriptTarget.ES2020, true, f.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  (function walk(n) {
    if ((ts.isJsxOpeningElement(n) || ts.isJsxSelfClosingElement(n)) && BTN.has(n.tagName.getText(sf)) && !f.includes('components/ui/') && !/design-system|\/demo/i.test(f)) {
      const attrs = n.attributes.properties;
      const names = attrs.filter(ts.isJsxAttribute).map((a) => a.name.getText(sf));
      const hasSpread = attrs.some(ts.isJsxSpreadAttribute);
      let wrapped = false;
      for (let p = n.parent?.parent, d = 0; p && d < 4; p = p.parent, d++) {
        if (ts.isJsxElement(p)) {
          const o = p.openingElement;
          if (PARENT_OK.test(o.tagName.getText(sf)) || o.attributes.properties.some((a) => ts.isJsxAttribute(a) && a.name.getText(sf) === 'asChild')) wrapped = true;
          if (o.tagName.getText(sf) === 'form') wrapped = true;
        }
      }
      const onClick = attrs.find((a) => ts.isJsxAttribute(a) && a.name.getText(sf) === 'onClick');
      const emptyHandler = onClick?.initializer && ts.isJsxExpression(onClick.initializer) && onClick.initializer.expression &&
        ((ts.isArrowFunction(onClick.initializer.expression) && ts.isBlock(onClick.initializer.expression.body) && onClick.initializer.expression.body.statements.length === 0 && !/\/\/|\/\*/.test(onClick.initializer.expression.body.getText(sf))) ||
          onClick.initializer.expression.getText(sf) === 'undefined');
      const line = sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1;
      if (emptyHandler) astHits.botao.push({ f, line, why: 'onClick vazio', ev: lineText(t, line) });
      else if (!hasSpread && !wrapped && !names.some((x) => HANDLER_ATTRS.has(x))) astHits.botao.push({ f, line, why: 'sem onClick/type/asChild', ev: lineText(t, line) });
    }
    if (ts.isCatchClause(n) && n.block.statements.length === 0 && !/\/\/|\/\*/.test(n.block.getText(sf))) {
      const line = sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1;
      astHits.catchVazio.push({ f, line, ev: lineText(t, line) });
    }
    ts.forEachChild(n, walk);
  })(sf);
}
defCheck('botao-inerte', 'Botão que não faz nada (sem onClick/type/asChild ou com onClick vazio)', 'Heurística de AST: ignora botões dentro de Trigger/Close/asChild/form. Pode haver falso positivo se o handler vier por contexto.', () => {
  for (const h of astHits.botao)
    add('botao-inerte', 'media', `Botão inerte (${h.why})`, h.f, h.line, h.ev, 'Ligar um handler real ou remover o botão (AGENTS.md §4: botão sem handler = pela metade).');
});
defCheck('catch-vazio', 'catch que engole o erro sem log nem comentário', 'Só pega bloco literalmente vazio.', () => {
  for (const h of astHits.catchVazio) add('catch-vazio', 'media', 'Erro engolido em catch vazio', h.f, h.line, h.ev, 'Registrar via logger ou comentar por que é seguro ignorar.');
});

// ---------- 7. Dados fabricados / marcadores de obra inacabada ----------
defCheck('dado-fabricado', 'Dados inventados no código de produção (mock/fake/Math.random)', 'Exclui testes e design-system/demos. Math.random para id/atraso é ignorado.', () => {
  for (const f of srcFiles) {
    if (/design-system|\/demo|stories|\/mocks?\/|components\/ui\/|components\/loading\//i.test(f)) continue;
    const t = read(f);
    t.split('\n').forEach((ln, i) => {
      if (/Math\.random\(\)/.test(ln) && !/toString\(36\)|uuid|\bid\b|Id\b|jitter|backoff|delay|key|shuffle|sort|nonce|token|rotat|animat|particle|confetti|scale|opacity|duration|angle|\b[xy]:|fileName|filename|file\b|path|random(Event|Rotation)?\s*=\s*\w+\[/i.test(ln) && !/celebration|confetti|animation|Skeleton/i.test(f))
        add('dado-fabricado', 'media', 'Math.random() usado como dado', f, i + 1, ln.trim().slice(0, 160), 'Trocar por dado real do banco; se for animação/jitter, comentar.');
      if (/\b(mock|fake|dummy)\w*\s*[:=]\s*[\[{]/i.test(ln))
        add('dado-fabricado', 'alta', 'Dado fixo (mock/fake) em código de produção', f, i + 1, ln.trim().slice(0, 160), 'Substituir por consulta real ou esconder o painel até existir fonte.');
    });
  }
});
defCheck('marcador-obra', 'TODO/FIXME/"em breve"/"não implementado" no código', 'Texto de interface "em breve" conta como funcionalidade prometida e não entregue.', () => {
  const files = [...srcFiles, ...tracked.filter((f) => f.startsWith(fnDir + '/') && /\.ts$/.test(f) && !isTest(f))];
  for (const f of files) {
    read(f).split('\n').forEach((ln, i) => {
      const m = /\b(?:TODO|FIXME|XXX|HACK)\b/.exec(ln) || /em breve|coming soon|not implemented|n[ãa]o implementad/i.exec(ln);
      if (m) add('marcador-obra', /breve|coming|n[ãa]o implementad|not implemented/i.test(m[0]) ? 'media' : 'baixa', `Marcador "${m[0]}"`, f, i + 1, ln.trim().slice(0, 160), 'Implementar, ou registrar como pendência e remover do código.');
    });
  }
});
defCheck('escape-de-tipos', '@ts-ignore / @ts-nocheck em código de produção', 'Conta só os de produção.', () => {
  for (const f of srcFiles)
    read(f).split('\n').forEach((ln, i) => {
      const m = /@ts-(ignore|nocheck)/.exec(ln);
      if (m) add('escape-de-tipos', 'baixa', `@ts-${m[1]} desliga a checagem de tipos`, f, i + 1, ln.trim().slice(0, 160), 'Corrigir o tipo; use @ts-expect-error com motivo se inevitável.');
    });
});

// ---------- 8. Segredos ----------
defCheck('segredo-exposto', 'Segredos/credenciais versionados no repositório', 'Padrões conhecidos (JWT, sk_live, Resend, Twilio, chave privada, URL de banco, webhook Bitrix). O valor NUNCA é impresso.', () => {
  const skip = /(^|\/)(scripts\/ai-context|node_modules|dist|coverage|graphify-out|\.venv-graphify|playwright-report|test-results)\//;
  const files = tracked.filter((f) => !skip.test(f) && !/\.(png|jpe?g|gif|ico|webp|woff2?|ttf|lockb?|pdf|zip|svg|mp3|mp4)$/i.test(f) && !/(package-lock\.json|bun\.lock|deno\.lock)$/.test(f) && !isTest(f));
  const pats = [
    ['JWT', /\beyJ[A-Za-z0-9_-]{15,}\.eyJ[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{10,}/g],
    ['sk_live', /\bsk_live_[0-9a-zA-Z]{16,}/g],
    ['Resend', /\bre_[A-Za-z0-9]{24,}/g],
    ['Twilio SID', /\bAC[a-f0-9]{32}\b/g],
    ['chave privada', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g],
    ['URL de banco com senha', /postgres(?:ql)?:\/\/[^:\s/]+:[^@\s]{4,}@/g],
    ['webhook Bitrix com token', /https:\/\/[\w.-]+\.bitrix24\.[a-z.]+\/rest\/\d+\/[a-z0-9]{8,}/gi],
  ];
  for (const f of files) {
    const t = read(f);
    if (t.length > 2_000_000) continue;
    for (const [nome, rx] of pats)
      for (const m of t.matchAll(rx)) {
        if (nome === 'URL de banco com senha' && /:(?:<[^>]*>|\[[^\]]*\]|\$\{?\w+\}?|\*+|x{3,}|senha|password|PASSWORD|changeme)@/i.test(m[0])) continue; // placeholder
        if (/fake|test|exemplo|example|x{4,}|0{4,}|1234|abcd|a{4,}|dummy|sample/i.test(m[0])) continue; // fixture/exemplo, não credencial
        let sev = 'alta';
        let extra = '';
        if (nome === 'JWT') {
          try {
            const role = JSON.parse(Buffer.from(m[0].split('.')[1], 'base64url').toString()).role;
            extra = ` role=${role}`;
            // só `anon` é público por desenho; sessão (authenticated) ou papel desconhecido age como um usuário
            sev = role === 'service_role' ? 'critica' : role === 'anon' ? 'baixa' : 'alta';
          } catch { /* não é JWT de verdade */ continue; }
        }
        add('segredo-exposto', sev, `${nome} versionado${extra}`, f, lineOf(t, m.index), redact(m[0]), sev === 'baixa' ? 'Chave pública por desenho; preferir variável de ambiente.' : 'Rotacionar a credencial AGORA e mover para secret do serviço.');
      }
  }
  for (const f of tracked.filter((x) => /^\.env(\.|$)/.test(x) && x !== '.env.example')) {
    const privados = read(f).split('\n').filter((l) => /^[A-Z0-9_]+=\s*\S/.test(l) && !l.startsWith('VITE_')).map((l) => l.split('=')[0]);
    if (privados.length) add('segredo-exposto', 'critica', 'Arquivo .env versionado com variável NÃO-pública preenchida', f, 1, `chaves: ${privados.join(', ')}`, 'git rm --cached, rotacionar as credenciais e manter só .env.example.');
    else add('segredo-exposto', 'baixa', 'Arquivo .env versionado (só variáveis VITE_ públicas)', f, 1, `${f} está no git`, 'Aceitável se só tem chaves públicas; preferir variáveis do serviço de deploy.');
  }
});

// ---------- 9. Regras de negócio declarativas ----------
defCheck('regra-de-negocio', 'Regras declaradas em scripts/audit/regras.json', 'Só verifica texto (presença/ausência). Prova que a proteção continua escrita, não que está correta.', () => {
  const { regras } = JSON.parse(read('scripts/audit/regras.json'));
  for (const r of regras) {
    const rx = globRx(r.arquivo);
    const files = tracked.filter((f) => rx.test(f));
    if (!files.length) {
      add('regra-de-negocio', r.severidade, `[${r.id}] arquivo da regra não existe`, r.arquivo, 1, 'nenhum arquivo casa o caminho', r.por_que);
      continue;
    }
    const all = files.map(read).join('\n');
    for (const p of r.deve_conter || [])
      if (!new RegExp(p).test(all)) add('regra-de-negocio', r.severidade, `[${r.id}] ${r.titulo}: falta /${p}/`, files[0], 1, `padrão ausente: ${p}`, r.por_que);
    for (const p of r.nao_deve_conter || []) {
      const m = new RegExp(p).exec(all);
      if (m) {
        const f = files.find((x) => new RegExp(p).test(read(x)));
        add('regra-de-negocio', r.severidade, `[${r.id}] ${r.titulo}: contém /${p}/`, f, lineOf(read(f), new RegExp(p).exec(read(f)).index), `padrão proibido: ${p}`, r.por_que);
      }
    }
  }
});

// ---------- fingerprint, baseline, relatório ----------
const fp = (x) => `${x.check}|${x.arquivo}|${createHash('sha1').update(x.titulo + x.evidencia).digest('hex').slice(0, 8)}`;
for (const x of findings) x.fp = fp(x);
const ORDEM = { critica: 0, alta: 1, media: 2, baixa: 3 };
findings.sort((a, b) => ORDEM[a.sev] - ORDEM[b.sev] || a.check.localeCompare(b.check) || a.arquivo.localeCompare(b.arquivo));

if (args.includes('--baseline')) {
  writeFileSync(BASELINE, JSON.stringify({ gerado: new Date().toISOString(), total: findings.length, fps: findings.map((x) => x.fp) }, null, 1));
  console.log(`[audit] baseline gravado com ${findings.length} achados em scripts/audit/baseline.json`);
}
const base = existsSync(BASELINE) ? new Set(JSON.parse(read(BASELINE)).fps) : null;
const novos = base ? findings.filter((x) => !base.has(x.fp)) : [];

const sevCount = (sev) => findings.filter((x) => x.sev === sev).length;
const excerpt = (f, line) => {
  const ls = read(f).split('\n');
  return ls.slice(Math.max(0, line - 3), line + 2).map((l, i) => `${String(Math.max(1, line - 2) + i).padStart(4)}| ${l}`).join('\n');
};

const md = [`# Auditoria — ${new Date().toISOString()}`, '',
  `**${findings.length} achados** · crítica ${sevCount('critica')} · alta ${sevCount('alta')} · média ${sevCount('media')} · baixa ${sevCount('baixa')}`,
  base ? `Comparado ao baseline: **${novos.length} novo(s)**.` : 'Sem baseline (rode com --baseline para aceitar o estado atual e passar a ver só o que é novo).', '',
  '## Por checagem', '', '| Checagem | Achados | Limite |', '|---|---|---|',
  ...checks.map((c) => `| ${c.titulo} | ${c.total} | ${c.limite} |`), ''];
if (novos.length) md.push('## NOVOS desde o baseline', '', ...novos.slice(0, 50).map((x) => `- **${x.sev}** ${x.titulo} — \`${x.arquivo}:${x.linha}\``), '');
for (const sev of ['critica', 'alta', 'media', 'baixa']) {
  const list = findings.filter((x) => x.sev === sev);
  if (!list.length) continue;
  const lim = sev === 'media' || sev === 'baixa' ? 40 : 200;
  md.push(`## ${sev.toUpperCase()} (${list.length})`, '', ...list.slice(0, lim).map((x) => `- ${x.titulo} — \`${x.arquivo}:${x.linha}\` · \`${x.evidencia.replace(/`/g, "'")}\``));
  if (list.length > lim) md.push(`- … +${list.length - lim} em findings.json`);
  md.push('');
}
writeFileSync(join(OUT, 'relatorio.md'), md.join('\n'));
writeFileSync(join(OUT, 'findings.json'), JSON.stringify({ gerado: new Date().toISOString(), checks, findings }, null, 1));

const fila = ['# Fila para decisão (crítico e alto) — o que um humano ou IA deve olhar', '',
  'Cada item traz arquivo:linha, trecho e a sugestão. Todo o resto é mecânico ou de baixo risco.', ''];
for (const x of findings.filter((y) => y.sev === 'critica' || y.sev === 'alta').slice(0, 60)) {
  fila.push(`### [${x.sev}] ${x.titulo}`, `- Onde: \`${x.arquivo}:${x.linha}\``, `- Sugestão: ${x.sugestao}`);
  if (x.linha > 0 && x.check !== 'segredo-exposto' && /\.(ts|tsx|sql)$/.test(x.arquivo)) fila.push('```', excerpt(x.arquivo, x.linha), '```');
  fila.push('');
}
writeFileSync(join(OUT, 'fila-para-decisao.md'), fila.join('\n'));

console.log(`[audit] ${findings.length} achados (crítica ${sevCount('critica')}, alta ${sevCount('alta')}, média ${sevCount('media')}, baixa ${sevCount('baixa')})${base ? ` — ${novos.length} novo(s) vs baseline` : ''}`);
for (const c of checks) console.log(`  ${String(c.total).padStart(4)}  ${c.id}`);
console.log('[audit] relatório em .audit/relatorio.md e .audit/fila-para-decisao.md');
if (args.includes('--estrito') && novos.some((x) => x.sev === 'critica' || x.sev === 'alta')) process.exit(1);
