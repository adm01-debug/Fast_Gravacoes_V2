## Respostas às 3 threads do Devin Review

### 1. `PRRT_kwDOSaWszM66jXj1` — Catálogo não lista `inventory:adjust` e vocabulário divergente
**Corrigido no commit `5dc10ce5`** (presente nesta PR, após o SHA do review `86211133`).

- O catálogo deixou de ser a lista hard-coded `auth.types.ts:37-49` (que usava vocabulário fantasma: `jobs:view`, `jobs:edit`, `production:*`, `operators:manage`, `settings:manage` — nenhum existe no runtime).
- Novo módulo-fonte-única `src/features/auth/permissions.ts`: `ROLE_PERMISSIONS` mora lá e `AVAILABLE_PERMISSIONS` é **derivado da união real das 4 roles** com `Array.from(new Set(Object.values(ROLE_PERMISSIONS).flat()))`. `inventory:adjust` agora aparece no gerenciador (gerente tem no mapa). Não existe mais como catálogo divergir do runtime.
- Teste novo em `useRBAC.test.tsx` (6 testes verdes): invariante `AVAILABLE_PERMISSIONS` == união de `ROLE_PERMISSIONS`; asserção explícita de que `jobs:view`, `jobs:edit`, `production:view`, `operators:manage`, `settings:manage` **não existem** no catálogo.

### 2. `PRRT_kwDOSaWszM66jXkU` — Histórico de migração não registrado
**Registrado e verificado** antes do merge:

```sql
insert into supabase_migrations.schema_migrations (version, name, statements)
values ('20261122010000', 'seed_role_permissions', '{}')
on conflict (version) do nothing;
```

Confirmação via query na produção: a versão consta em `schema_migrations` e a tabela `role_permissions` tem os counts exatos (admin=62, coordinator=57, manager=37, operator=12). Seed é idempotente (`ON CONFLICT DO NOTHING`), então um `supabase db push` futuro não diverge.

### 3. `PRRT_kwDOSaWszM66jXlg` — Saída de estoque bypassa revogação
**Corrigido no commit `5dc10ce5`**:

- `InventoryCard.tsx`: opção "Saída (Consumo)" só renderiza no Select quando `hasPermission('inventory:adjust')` (`canAdjustStock`).
- `handleRecord` valida `movementType === 'OUT' && !canAdjustStock` → `toast.error` e aborta antes de qualquer INSERT (linha 38-43 do código atual).
- O botão "Saída" já era protegido por `PermissionGate permission="inventory:adjust"`; agora o Dialog compartilhado (aberto a partir de "Entrada") também não permite trocar para OUT.

Validação local: `tsc --noEmit` ✅, `eslint` nos arquivos tocados ✅, `vitest` 6/6 ✅ (useRBAC) e 16/16 ✅ (useInventory).
