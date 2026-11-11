/**
 * RLS regression gate — verifica, contra o Supabase de produção, que a
 * policy de INSERT de `technical_conversations` ainda rejeita um operador
 * tentando criar uma conversa em nome de outro usuário.
 *
 * Nota de fixture: a tabela original era `packaging_waste`, mas ela foi
 * dropada na consolidação de tabelas mortas
 * (supabase/migrations/20261001150000_drop_dead_tables_and_functions.sql).
 * `technical_conversations` tem a mesma forma de policy
 * (`WITH CHECK (auth.uid() = user_id)`, migration
 * 20251213121106) e, ao contrário de `qr_scan_history`, `user_id` não tem
 * FK extra — a rejeição vem da RLS (42501), não de constraint.
 *
 * Por que isto e não `test_rls_policies()` (função já existente no banco)?
 * Essa função só chama `has_table_privilege(role, table, op)` — checa GRANT
 * de tabela do role Postgres, não a policy em si, e nem usa o parâmetro
 * `p_test_user_id`. No Supabase o role `authenticated` tem GRANT amplo por
 * padrão, então ela retorna `true` independente da RLS estar correta ou não
 * — não pega a regressão que corrigimos em
 * supabase/migrations/20260924174928_fix_packaging_waste_insert_check.sql
 * (`with_check = true` deixava qualquer autenticado inserir em nome de
 * qualquer usuário). Este script testa a policy de verdade: loga como
 * um operador real (via supabase-js, o mesmo caminho que o app usa) e tenta
 * a operação que deveria ser negada.
 *
 * Por que só teste negativo (sem inserir uma linha "válida" pra comparar)?
 * `technical_conversations` tem DELETE por dono, mas a linha criada aqui
 * pertenceria a FOREIGN_USER_ID — a conta do operador não poderia removê-la.
 * Uma tentativa negada não escreve nada (INSERT + RLS é atômico), então este
 * gate roda em todo push/PR sem deixar lixo.
 *
 * Requer, como secrets de CI: VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY,
 * E2E_OPERATOR_EMAIL, E2E_OPERATOR_PASSWORD (mesmas credenciais já usadas
 * pelo teste de negação de acesso em tests/e2e/auth.spec.ts).
 *
 * O UUID do "usuário estrangeiro" pode ser sobrescrito por env
 * RLS_FOREIGN_USER_ID (útil se a conta for recriada); o default abaixo é o da
 * conta admin mais antiga do banco canônico.
 *
 * Por que não há um segundo teste negativo determinístico sem escrever lixo?
 * Um teste negativo tem que provar que a RLS bloqueia "usar a conta de
 * outro" — para isso: (a) INSERT precisa de uma tabela sem FK em user_id
 * (senão 23503 mascararia o 42501) — só technical_conversations atende hoje;
 * (b) SELECT-leak e UPDATE de outro usuário dependem de o FOREIGN_USER_ID ter
 * linhas nas tabelas, o que nenhuma migration garante (resultado seria
 * falso-positivo: "0 linhas" p'assar mesmo com a policy removida).
 * Adicionar um segundo teste só seria correto com fixture real → escreveria
 * linha em produção, o que o gate evita por design.
 */
import { createClient } from '@supabase/supabase-js';
import { realpathSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

// Conta admin mais antiga do banco canônico (uoujzvpecohinketylud), obtida
// via consulta direta em 24/09/2026. Não é segredo — é só um UUID opaco, tão
// sensível quanto qualquer FK já visível via policies de leitura existentes.
// Serve apenas como "usuário estrangeiro real" pra distinguir rejeição por
// RLS (42501) de rejeição por FK inexistente (23503) — ver comentário acima.
// Pode ser sobrescrito por RLS_FOREIGN_USER_ID (obs.: segue numérico/hex para
// não masquerar 23503 como 42501 em caso de typo).
const FOREIGN_USER_ID_DEFAULT = '82a51685-324b-4db1-9b27-a96590bf267a';

const FOREIGN_USER_ID = process.env.RLS_FOREIGN_USER_ID || FOREIGN_USER_ID_DEFAULT;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function assertValidUuid(value) {
  const trimmed = value.trim();
  if (!UUID_RE.test(trimmed)) {
    console.error(`\n# RLS regression: RLS_FOREIGN_USER_ID (ou default) não é um UUID válido: "${value}"`);
    console.error('# A regressão só é detectável se o user_id estrangeiro for real — UUID inválido quebraria o gate.');
    process.exit(1);
  }
  // Supabase normaliza UUIDs para minúsculas; comparar case-sensitive com
  // uppercase enganaria a proteção de "não usar a própria conta".
  return trimmed.toLowerCase();
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`\n# RLS regression: variável obrigatória ausente: ${name}`);
    process.exit(1);
  }
  return value;
}

const supabaseUrl = requireEnv('VITE_SUPABASE_URL');
const supabaseKey = requireEnv('VITE_SUPABASE_PUBLISHABLE_KEY');
const operatorEmail = requireEnv('E2E_OPERATOR_EMAIL');
const operatorPassword = requireEnv('E2E_OPERATOR_PASSWORD');

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// CI roda este gate em várias PRs ao mesmo tempo, todas logando com a MESMA
// conta de operador E2E contra o Supabase real — sob concorrência, o login
// já respondeu com falha transitória sem motivo claro. Um retry curto
// absorve isso sem mascarar credencial errada: cada tentativa loga o motivo,
// e só desiste de vez depois de `attempts` tentativas.
const RETRY_DELAY_MS = Number(process.env.RLS_LOGIN_RETRY_DELAY_MS) || 5000; // ms por tentativa; só testes encurtam via env.

// @supabase/auth-js (handleError em lib/fetch.js) monta a mensagem com
// JSON.stringify(corpo) quando a resposta não tem campo error/msg/
// error_description reconhecido — por isso "login falhou: {}" (corpo JSON
// vazio, sem texto nenhum). Isso acontece tanto para um 429 cujo corpo vem
// vazio (bloqueio de rate limit na borda — Kong/gateway, não o GoTrue, que
// sempre inclui error_description) quanto para os status "de rede"
// (502/503/504/520-524/530 — AuthRetryableFetchError), onde o auth-js
// serializa o próprio objeto de resposta, igualmente sem campos. A única
// pista que resta é error.status (AuthApiError/AuthRetryableFetchError
// sempre o define) — expõe ele sempre que a mensagem vier vazia, em vez de
// deixar "{}" nu sem dizer pra qual status.
function describe(error) {
  const msg = error?.message;
  if (msg && msg !== '{}') return error.status ? `${msg} (status ${error.status})` : msg;
  return error?.status ? `corpo de erro vazio (status ${error.status})` : 'sem usuário retornado';
}

export async function signInWithRetry(signIn, { attempts = 3, delayMs = (n) => n * RETRY_DELAY_MS } = {}) {
  let last;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    const { data, error } = await signIn();
    if (!error && data?.user) return data;
    last = error;
    if (attempt < attempts) {
      const wait = delayMs(attempt);
      console.error(`# RLS regression: login do operador E2E falhou (tentativa ${attempt}/${attempts}): ${describe(error)} — nova tentativa em ${wait / 1000}s`);
      await new Promise((resolve) => setTimeout(resolve, wait));
    }
  }
  console.error(`\n# RLS regression: login do operador E2E falhou após ${attempts} tentativas: ${describe(last)}`);
  return null;
}

async function main() {
  const foreignUserId = assertValidUuid(FOREIGN_USER_ID);

  const authData = await signInWithRetry(() => supabase.auth.signInWithPassword({
    email: operatorEmail,
    password: operatorPassword,
  }));

  if (!authData) {
    process.exit(1);
  }

  if (authData.user.id === foreignUserId) {
    console.error('\n# RLS regression: fixture FOREIGN_USER_ID coincide com o próprio operador E2E — atualize RLS_FOREIGN_USER_ID no secret/CI.');
    process.exit(1);
  }

  const { error: insertError } = await supabase.from('technical_conversations').insert({
    user_id: foreignUserId,
  });

  // scope 'local': encerra só esta sessão. O default ('global') derruba TODAS as sessões
  // da conta, que é a mesma do job e2e e de runs paralelos de outras PRs.
  await supabase.auth.signOut({ scope: 'local' });

  if (!insertError) {
    console.error('\n# ❌ RLS regression: FALHOU — operador conseguiu inserir technical_conversations em nome de outro usuário.');
    console.error('# A policy "Users can create their own conversations" (technical_conversations, INSERT) não está mais restringindo user_id.');
    process.exit(1);
  }

  if (insertError.code !== '42501') {
    console.error(`\n# RLS regression: inconclusivo — esperava rejeição por RLS (42501), recebi "${insertError.code}": ${insertError.message}`);
    console.error('# 23503 (FK violation) não se aplica aqui: user_id não tem FK — códigos diferentes de 42501 indicam outra falha (policy removida, schema cache, rede).');
    process.exit(1);
  }

  console.log('✅ RLS regression: technical_conversations INSERT corretamente rejeitado para user_id de outro usuário (42501).');
}

// Só executa quando chamado direto — importar o módulo (p.ex. para testar
// signInWithRetry) não pode disparar um login real de verdade. Mesma
// checagem de scripts/check-any-baseline.mjs (funciona via symlink também).
const isDirect = (() => {
  try {
    return Boolean(process.argv[1]) && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href;
  } catch {
    return false;
  }
})();
if (isDirect) {
  main().catch((err) => {
    console.error('\n# RLS regression: erro inesperado', err);
    process.exit(1);
  });
}

