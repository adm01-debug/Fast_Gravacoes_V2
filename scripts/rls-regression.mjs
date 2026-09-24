/**
 * RLS regression gate — verifica, contra o Supabase de produção, que a
 * policy de INSERT de `packaging_waste` ainda rejeita um operador tentando
 * gravar refugo em nome de outro usuário.
 *
 * Por que isto e não `test_rls_policies()` (função já existente no banco)?
 * Essa função só chama `has_table_privilege(role, table, op)` — checa GRANT
 * de tabela do role Postgres, não a policy em si, e nem usa o parâmetro
 * `p_test_user_id`. No Supabase o role `authenticated` tem GRANT amplo por
 * padrão, então ela retorna `true` independente da RLS estar correta ou não
 * — não pega a regressão que corrigimos em
 * supabase/migrations/20260924174928_fix_packaging_waste_insert_check.sql
 * (`with_check = true` deixava qualquer autenticado inserir em nome de
 * qualquer `operator_id`). Este script testa a policy de verdade: loga como
 * um operador real (via supabase-js, o mesmo caminho que o app usa) e tenta
 * a operação que deveria ser negada.
 *
 * Por que só teste negativo (sem inserir uma linha "válida" pra comparar)?
 * `packaging_waste` não tem policy de UPDATE/DELETE pra `authenticated` —
 * qualquer INSERT que tivesse sucesso ficaria pra sempre no banco de
 * produção, sem como limpar a partir de um client anon/authenticated. Uma
 * tentativa negada não escreve nada (INSERT + RLS é atômico), então este
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

  const { error: insertError } = await supabase.from('packaging_waste').insert({
    material_type: 'other',
    weight_kg: 0.01,
    operator_id: FOREIGN_USER_ID,
  });

  await supabase.auth.signOut();

  if (!insertError) {
    console.error('\n# ❌ RLS regression: FALHOU — operador conseguiu inserir packaging_waste em nome de outro usuário.');
    console.error('# A policy "Users can insert waste records" (packaging_waste, INSERT) não está mais restringindo operator_id.');
    console.error('# Ver supabase/migrations/20260924174928_fix_packaging_waste_insert_check.sql — a correção regrediu.');
    process.exit(1);
  }

  if (insertError.code !== '42501') {
    console.error(`\n# RLS regression: inconclusivo — esperava rejeição por RLS (42501), recebi "${insertError.code}": ${insertError.message}`);
    console.error('# Se for 23503 (FK violation), a fixture FOREIGN_USER_ID não existe mais em auth.users — atualize o UUID no script.');
    process.exit(1);
  }

  console.log('✅ RLS regression: packaging_waste INSERT corretamente rejeitado para operator_id de outro usuário (42501).');
}

main().catch((err) => {
  console.error('\n# RLS regression: erro inesperado', err);
  process.exit(1);
});
