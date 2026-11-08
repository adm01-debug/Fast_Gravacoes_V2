#!/usr/bin/env node
/**
 * Inventario das rotas do front -> inventario/estado/rotas.json (fonte de consulta dos agentes).
 *
 * Le o codigo, nao documentacao:
 *  - URLs:  src/routes/AppRoutes.tsx (path, pagina, publica/protegida, allowedRoles, Navigate)
 *  - Para cada URL: segue os imports a partir do arquivo da pagina e lista hooks, edge functions
 *    invocadas, RPCs, tabelas (.from e /rest/v1) e buckets de storage (storage.from).
 *  - `problemas`: URL sem arquivo (o lazy nao resolve) e import local que nao resolve.
 *
 * Uso:
 *   node scripts/inventario/gerar-rotas.mjs           grava inventario/estado/rotas.json
 *   node scripts/inventario/gerar-rotas.mjs --check   exit 1 se o arquivo commitado esta desatualizado
 * Saida deterministica (sem data): o mesmo codigo gera o mesmo arquivo.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const RAIZ_PADRAO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const SAIDA_REL = 'inventario/estado/rotas.json';
const ROTAS_REL = 'src/routes/AppRoutes.tsx';
const EXTENSOES = ['.tsx', '.ts', '.jsx', '.js', '/index.tsx', '/index.ts'];

// Wrappers de rota e esqueletos de carregamento: nunca sao a pagina da rota.
const NAO_E_PAGINA = new Set([
  'Route', 'Routes', 'Navigate', 'Suspense', 'ErrorBoundary', 'AnimatePresence',
  'ProtectedRoute', 'ProtectedPage', 'PublicPage', 'PageTransition', 'ScrollRestoration',
]);

const ler = (raiz, rel) => fs.readFileSync(path.join(raiz, rel), 'utf8');
const rel = (raiz, abs) => path.relative(raiz, abs).split(path.sep).join('/');
const unico = (lista) => [...new Set(lista)].sort();

/** Resolve um especificador de import para um arquivo do repo (ou null se externo/inexistente). */
export function resolverImport(raiz, deArquivoAbs, especificador) {
  let base;
  if (especificador.startsWith('@/')) base = path.join(raiz, 'src', especificador.slice(2));
  else if (especificador.startsWith('.')) base = path.resolve(path.dirname(deArquivoAbs), especificador);
  else return null;
  if (fs.existsSync(base) && fs.statSync(base).isFile()) return base;
  for (const ext of EXTENSOES) if (fs.existsSync(base + ext)) return base + ext;
  return undefined; // local, mas nao existe
}

/** Imports de um arquivo: [{ especificador, nomes[] }] (estaticos e import() dinamico). */
export function extrairImports(texto) {
  const out = [];
  for (const m of texto.matchAll(/import\s+(type\s+)?([\s\S]*?)\s+from\s+['"]([^'"]+)['"]/g)) {
    if (m[1]) continue;
    const nomes = [...m[2].matchAll(/\b([A-Za-z_$][\w$]*)\b(?!\s*as\b)/g)].map((x) => x[1])
      .filter((n) => !['type', 'as', 'default'].includes(n));
    out.push({ especificador: m[3], nomes });
  }
  for (const m of texto.matchAll(/(?:import|export)\s*(?:\*\s*from\s*)?['"]([^'"]+)['"]/g)) out.push({ especificador: m[1], nomes: [] });
  for (const m of texto.matchAll(/import\(\s*['"]([^'"]+)['"]\s*\)/g)) out.push({ especificador: m[1], nomes: [] });
  for (const m of texto.matchAll(/export\s+(?:\{[^}]*\}|\*)\s+from\s+['"]([^'"]+)['"]/g)) out.push({ especificador: m[1], nomes: [] });
  return out;
}

/**
 * Mapa nome -> valor dos `const NOME = 'literal'` (ou `export const`) de nivel de modulo no texto.
 * So resolve o caso mais comum: identificador passado direto pra `.from`/`storage.from`/`rpc`/
 * `invoke` que e, no mesmo arquivo, uma constante de string. Nao resolve parametro de funcao nem
 * ternario. Coluna zero sozinha nao basta: um `const` dentro de funcao tambem pode estar em coluna
 * zero se o arquivo nao passou pelo formatador. Por isso conta profundidade de `{`/`}` linha a
 * linha e so aceita o `const` quando a profundidade, ANTES de processar a linha, e zero (nivel de
 * modulo de verdade). Contagem ingenua (nao ignora chave dentro de string) e de proposito: na
 * duvida, prefere nao resolver a resolver errado.
 */
function constantesDeString(texto) {
  const mapa = new Map();
  let profundidade = 0;
  for (const linha of texto.split('\n')) {
    if (profundidade === 0) {
      const m = linha.match(/^(?:export\s+)?const\s+([A-Za-z_][A-Za-z0-9_]*)\s*(?::\s*[^=]+)?=\s*['"`]([A-Za-z0-9_.-]+)['"`]\s*[;,]?\s*$/);
      if (m) mapa.set(m[1], m[2]);
    }
    for (const ch of linha) {
      if (ch === '{') profundidade++;
      else if (ch === '}') profundidade--;
    }
  }
  return mapa;
}

/**
 * Chamadas ao Supabase num texto: tabelas (`.from` do cliente e `/rest/v1/<tabela>`), buckets
 * (`storage.from`), RPCs (`.rpc`) e edges (`functions.invoke`, `/functions/v1/<edge>`).
 */
export function extrairChamadas(texto) {
  const pegar = (re) => [...texto.matchAll(re)].map((m) => m[1]);
  const consts = constantesDeString(texto);
  const tabelas = [];
  const buckets = [];
  for (const m of texto.matchAll(/(\bstorage\s*)?\.from\(\s*['"`]([A-Za-z0-9_-]+)['"`]/g)) (m[1] ? buckets : tabelas).push(m[2]);
  for (const m of texto.matchAll(/(\bstorage\s*)?\.from\(\s*([A-Za-z_][A-Za-z0-9_]*)\s*\)/g)) {
    if (consts.has(m[2])) (m[1] ? buckets : tabelas).push(consts.get(m[2]));
  }
  tabelas.push(...pegar(/\/rest\/v1\/([A-Za-z0-9_]+)/g).filter((t) => t !== 'rpc'));
  return {
    tabelas,
    buckets,
    rpcs: [...pegar(/(?:\.|\b)rpc\(\s*['"`]([A-Za-z0-9_]+)['"`]/g), ...pegar(/\/rest\/v1\/rpc\/([A-Za-z0-9_]+)/g)],
    // `functions.invoke('x')` (inclusive quebrado em linha) e a chamada direta pela URL dentro de
    // string/template (`fetch(`${URL}/functions/v1/x`)`).
    edges: [
      ...pegar(/functions\s*\.\s*invoke(?:<[^>()]*>)?\(\s*['"`]([A-Za-z0-9_-]+)(?:\/[^'"`]*)?['"`]/g),
      ...pegar(/['"`][^'"`\n]*\/functions\/v1\/([A-Za-z0-9_-]+)/g),
    ],
  };
}

const ehTeste = (p) => /(\.test\.|\.spec\.|__tests__|\.stories\.)/.test(p);

/**
 * Fecho de imports a partir do arquivo da pagina. Segue sem limite as pastas de codigo
 * compartilhado que carregam acesso a dados (hooks, features, lib, contexts, providers, schemas,
 * integrations); componentes (src/components/, menos o kit de UI) e OUTRAS paginas entram ate
 * MAX_SALTOS saltos, para o fecho nao virar o repo inteiro. Fica de fora o kit de UI e teste.
 * Import local que nao resolve vira problema.
 */
export const MAX_SALTOS = 2;
const LIVRES = ['src/hooks', 'src/features', 'src/lib', 'src/contexts', 'src/providers', 'src/schemas', 'src/integrations'];
export function fechoDaPagina(raiz, arquivoPaginaAbs) {
  const dentro = (abs, rel_) => abs.startsWith(path.join(raiz, rel_) + path.sep);
  const livre = (abs) => LIVRES.some((d) => dentro(abs, d));
  const comSalto = (abs) => (dentro(abs, 'src/components') && !dentro(abs, 'src/components/ui')) || dentro(abs, 'src/pages');
  const saltosVistos = new Map(); // arquivo -> menor numero de saltos com que foi visitado
  const hooks = new Map();
  const quebrados = new Set();
  const chamadas = { tabelas: [], buckets: [], rpcs: [], edges: [] };
  const fila = [[arquivoPaginaAbs, 0]];
  while (fila.length) {
    const [atual, saltos] = fila.shift();
    if (saltosVistos.has(atual) && saltosVistos.get(atual) <= saltos) continue;
    const primeiraVez = !saltosVistos.has(atual);
    saltosVistos.set(atual, saltos);
    const texto = fs.readFileSync(atual, 'utf8');
    if (primeiraVez) {
      const c = extrairChamadas(texto);
      for (const k of Object.keys(chamadas)) chamadas[k].push(...c[k]);
    }
    for (const imp of extrairImports(texto)) {
      const alvo = resolverImport(raiz, atual, imp.especificador);
      if (alvo === undefined && !/\.(css|scss|svg|png|jpe?g|webp|gif|json)(\?.*)?$|\?/.test(imp.especificador)) {
        quebrados.add(`${rel(raiz, atual)} -> ${imp.especificador}`);
      }
      if (!alvo || ehTeste(alvo)) continue;
      for (const nome of imp.nomes) if (/^use[A-Z]/.test(nome) && !hooks.has(nome)) hooks.set(nome, rel(raiz, alvo));
      if (livre(alvo)) fila.push([alvo, saltos]);
      else if (comSalto(alvo) && saltos < MAX_SALTOS) fila.push([alvo, saltos + 1]);
    }
  }
  return {
    arquivos_lidos: saltosVistos.size,
    hooks: [...hooks.entries()].map(([nome, arquivo]) => ({ nome, arquivo })).sort((a, b) => a.nome.localeCompare(b.nome)),
    buckets: unico(chamadas.buckets),
    edges: unico(chamadas.edges),
    rpcs: unico(chamadas.rpcs),
    tabelas: unico(chamadas.tabelas),
    imports_quebrados: [...quebrados].sort(),
  };
}

/**
 * URLs do react-router em AppRoutes.tsx. A pagina de cada rota e o primeiro componente JSX que
 * nao e wrapper de rota nem esqueleto de carregamento (`<ProtectedPage ...><Index /></...>`).
 */
export function lerUrls(raiz) {
  const texto = ler(raiz, ROTAS_REL);
  const abs = path.join(raiz, ROTAS_REL);
  // `const X = lazyWithRetry(() => import("@/pages/X"))` e tambem o React.lazy padrao.
  const lazy = Object.fromEntries([...texto.matchAll(/const\s+(\w+)\s*=\s*lazy\w*\(\s*\(\)\s*=>\s*import\(\s*['"]([^'"]+)['"]\s*\)/g)]
    .map((m) => [m[1], m[2]]));
  const corpo = texto.slice(texto.indexOf('<Routes'), texto.lastIndexOf('</Routes>'));
  return corpo.split(/<Route\b/).slice(1).map((pedaco) => {
    const caminho = (pedaco.match(/path(?:=|:\s*)["']([^"']+)["']/) || [])[1];
    const redireciona = (pedaco.match(/<Navigate\s+to=["']([^"']+)["']/) || [])[1] ?? null;
    const componente = [...pedaco.matchAll(/<([A-Z]\w*)/g)].map((m) => m[1])
      .find((n) => !NAO_E_PAGINA.has(n) && !n.endsWith('Skeleton')) ?? null;
    const papeis = ((pedaco.match(/allowedRoles=\{\[([^\]]*)\]\}/) || [])[1] || '')
      .match(/['"]([^'"]+)['"]/g)?.map((s) => s.slice(1, -1)) ?? [];
    const alvo = componente && lazy[componente] ? resolverImport(raiz, abs, lazy[componente]) : null;
    return {
      caminho,
      componente,
      arquivo: alvo ? rel(raiz, alvo) : null,
      protegida: pedaco.includes('<ProtectedPage') || pedaco.includes('<ProtectedRoute'),
      papeis,
      redireciona,
    };
  }).filter((u) => u.caminho).sort((a, b) => a.caminho.localeCompare(b.caminho));
}

/** Monta o inventario inteiro a partir de uma raiz de repo. */
export function gerarRotas(raiz = RAIZ_PADRAO) {
  const urls = lerUrls(raiz).map((u) => ({
    ...u,
    ...(u.arquivo
      ? fechoDaPagina(raiz, path.join(raiz, u.arquivo))
      : { arquivos_lidos: 0, hooks: [], buckets: [], edges: [], rpcs: [], tabelas: [], imports_quebrados: [] }),
  }));

  const hooks = {};
  for (const u of urls) for (const h of u.hooks) {
    hooks[h.nome] ??= { arquivo: h.arquivo, rotas: [] };
    hooks[h.nome].rotas.push(u.caminho);
  }

  const problemas = [
    ...urls.filter((u) => u.componente && !u.arquivo && !u.redireciona)
      .map((u) => ({ tipo: 'url_sem_arquivo', id: u.caminho, detalhe: `${u.componente} nao resolve em ${ROTAS_REL}` })),
    ...urls.filter((u) => !u.componente && !u.redireciona)
      .map((u) => ({ tipo: 'url_sem_pagina', id: u.caminho, detalhe: 'nenhum componente de pagina no element da rota' })),
    ...urls.flatMap((u) => u.imports_quebrados.map((q) => ({ tipo: 'import_quebrado', id: u.caminho, detalhe: q }))),
  ];

  return {
    format_version: 1,
    fonte: `scripts/inventario/gerar-rotas.mjs (le ${ROTAS_REL} e os imports de cada pagina)`,
    resumo: {
      urls: urls.length,
      protegidas: urls.filter((u) => u.protegida).length,
      publicas: urls.filter((u) => !u.protegida && !u.redireciona).length,
      redirecionamentos: urls.filter((u) => u.redireciona).length,
      hooks_distintos: Object.keys(hooks).length,
      problemas: problemas.length,
    },
    urls,
    hooks: Object.fromEntries(Object.keys(hooks).sort().map((k) => [k, { arquivo: hooks[k].arquivo, rotas: unico(hooks[k].rotas) }])),
    problemas,
  };
}

export const serializar = (inv) => JSON.stringify(inv, null, 2) + '\n';

function main(argv) {
  const saida = path.join(RAIZ_PADRAO, SAIDA_REL);
  const conteudo = serializar(gerarRotas(RAIZ_PADRAO));
  if (argv.includes('--check')) {
    const atual = fs.existsSync(saida) ? fs.readFileSync(saida, 'utf8') : '';
    if (atual !== conteudo) {
      console.error(`${SAIDA_REL} desatualizado: rode node scripts/inventario/gerar-rotas.mjs e commite o resultado.`);
      process.exit(1);
    }
    console.log(`${SAIDA_REL} em dia.`);
    return;
  }
  fs.mkdirSync(path.dirname(saida), { recursive: true });
  fs.writeFileSync(saida, conteudo);
  const r = JSON.parse(conteudo).resumo;
  console.log(`rotas.json: ${r.urls} URLs (${r.protegidas} protegidas, ${r.publicas} publicas, `
    + `${r.redirecionamentos} redirects), ${r.hooks_distintos} hooks, ${r.problemas} problemas.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main(process.argv.slice(2));
