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
 */
import { createClient } from '@supabase/supabase-js';

// Conta admin mais antiga do banco canônico (uoujzvpecohinketylud), obtida
// via consulta direta em 24/09/2026. Não é segredo — é só um UUID opaco, tão
// sensível quanto qualquer FK já visível via policies de leitura existentes.
// Serve apenas como "usuário estrangeiro real" pra distinguir rejeição por
// RLS (42501) de rejeição por FK inexistente (23503) — ver comentário acima.
// Se esta conta for um dia removida do banco, o gate passa a falhar com a
// mensagem "fixture not found" abaixo (falha visível, não falso-positivo).
const FOREIGN_USER_ID = '82a51685-324b-4db1-9b27-a96590bf267a';

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

async function main() {
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: operatorEmail,
    password: operatorPassword,
  });

  if (authError || !authData.user) {
    console.error(`\n# RLS regression: login do operador E2E falhou: ${authError?.message ?? 'sem usuário retornado'}`);
    process.exit(1);
  }

  if (authData.user.id === FOREIGN_USER_ID) {
    console.error('\n# RLS regression: fixture FOREIGN_USER_ID coincide com o próprio operador E2E — atualize o UUID no script.');
    process.exit(1);
  }

  const { error: insertError } = await supabase.from('technical_conversations').insert({
    user_id: FOREIGN_USER_ID,
  });

  await supabase.auth.signOut();

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

main().catch((err) => {
  console.error('\n# RLS regression: erro inesperado', err);
  process.exit(1);
});
