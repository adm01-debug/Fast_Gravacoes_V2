# Lote 06 — Autenticação, RBAC e Segurança

## Cobertura

Auditoria feita **exclusivamente por leitura de código** no commit atual do repo `/home/user/fast-grava-es-v2`.
**Não houve acesso a runtime, banco de produção, painel Supabase ou logs.** Toda afirmação sobre comportamento
em execução (policies realmente aplicadas no banco, `verify_jwt` por função, secrets configurados, cron externo,
provider Google habilitado) é **NAO_VERIFICADO**.

Arquivos efetivamente lidos (linha a linha) neste lote:

- `src/features/auth/**` — `components/AuthProvider.tsx`, `components/AuthProvider.test.tsx`, `hooks/useAuth.ts`,
  `hooks/useAuthenticatorAssuranceLevel.ts`, `hooks/useMFA.ts`, `hooks/useRBAC.tsx`, `hooks/useRolePermissions.ts`,
  `hooks/useSessionManager.tsx`, `hooks/useSessionTimeout.tsx`, `services/authService.ts`, `types/auth.types.ts`,
  `types/admin_bypass.test.ts`, `index.ts`
- `src/components/auth/**` — `ProtectedRoute.tsx`, `AuthErrorBoundary.tsx`, `AuthLoginForm.tsx`, `AuthSignupForm.tsx`,
  `MFALoginVerification.tsx`, `PasswordStrengthIndicator.tsx`
- `src/pages/AuthPage.tsx`, `src/pages/ResetPasswordPage.tsx`, `src/pages/SecurityDashboard.tsx`, `src/pages/SettingsPage.tsx`
- `src/contexts/ReauthContext.tsx`, `src/contexts/PermissionsContext.tsx`
- `src/components/settings/` — `TwoFactorSetup.tsx`, `IPAllowlist.tsx`, `LoginAuditLog.tsx`, `PasswordResetRequests.tsx`, `UserManagement.tsx`
- `src/features/admin/components/security/**` e `src/features/admin/hooks/useSecurityEvents.ts`, `useRateLimitLogs.ts`, `useGeoBlocking.ts`
- `src/hooks/useDeviceDetection.ts`, `src/hooks/useUserDevices.ts`, `src/lib/rateLimiter.ts`
- `supabase/functions/` — `check-login-lockout`, `validate-login-ip`, `approve-password-reset`, `new-device-alert`,
  `security-alert`, `cleanup-security-logs`, `rate-limit-check`, `create-operator`, `update-operator`,
  `_shared/cors.ts`, `_shared/rateLimit.ts`, `_shared/cronAuth.ts`
- `supabase/migrations/` — 216 arquivos varridos por script para extrair `CREATE POLICY` das tabelas de segurança,
  definição de `has_role`/`app_private.has_role`, enum `app_role`, `cron.schedule`.
- `supabase/config.toml` (contém **apenas** `project_id` — nenhuma configuração de `verify_jwt` versionada).

Fora de escopo deste lote: notificações, jobs, inventário, produção, telemetria.

---

## Inventário de funcionalidades

| Funcionalidade | Classificação | Evidência (arquivo:linha) | O que falta / observação |
|---|---|---|---|
| **Login e-mail/senha** | ✅ IMPLEMENTADO_TOTAL | UI `src/components/auth/AuthLoginForm.tsx:27` → `src/pages/AuthPage.tsx:100` (`signIn`) → `src/features/auth/components/AuthProvider.tsx:214-282` → `src/features/auth/services/authService.ts:13-17` (`supabase.auth.signInWithPassword`). Persistência: `auth.users`/`auth.sessions` (Supabase Auth) | Fio completo. Guard de duplo-submit em `AuthPage.tsx:95`. |
| **Logout + limpeza de estado** | ✅ IMPLEMENTADO_TOTAL | `AuthProvider.tsx:288-301` (`AuthService.signOut` + `queryClient.clear()` + `offlineStorage.clearAll()`); serviço em `authService.ts:19-22` | Limpa cache React Query e IndexedDB — evita vazamento entre usuários. |
| **Boot de sessão / fonte única de verdade** | ✅ IMPLEMENTADO_TOTAL | `AuthProvider.tsx:177-212` (`onAuthStateChange` como única fonte, sem `await` interno, seq-guard `authRequestSeqRef` em :187) + safety-net de 8 s em :203 | Comentário em :175-176 documenta o padrão. |
| **Carregamento de profile + role** | ✅ IMPLEMENTADO_TOTAL | `AuthProvider.tsx:65-107` — consulta `profiles` (:70) e `user_roles` filtrando `is_active=true` (:75-79); tabelas em `supabase/migrations/20251213011430_...sql:18-24` e coluna `is_active` em `20251214122305_...sql:2-3` | `.limit(1)` em :79 — usuário com múltiplos papéis ativos recebe um papel **arbitrário** (sem `ORDER BY`). |
| **Refresh automático de sessão** | ✅ IMPLEMENTADO_TOTAL | `AuthProvider.tsx:120-136` (`refreshSession`), agendamento a cada 30 min em :148-150, revalidação em `visibilitychange` em :152-166 | Constantes `ACTIVITY_TIMEOUT_MINUTES=60` / `REFRESH_INTERVAL_MINUTES=30` em :62-63. |
| **Timeout de inatividade com diálogo** | ✅ IMPLEMENTADO_TOTAL | Hook `src/features/auth/hooks/useSessionTimeout.tsx:54-222`; diálogo :232-280; provider :292-309; montado em `src/components/layout/MainLayout.tsx:79` | **Divergência de política**: aqui 25 min + 5 min de contagem (`useSessionTimeout.tsx:55-56`), mas `AuthProvider.tsx:62` usa 60 min. Duas noções de "inatividade" coexistem. |
| **"Lembrar e-mail"** | ✅ IMPLEMENTADO_TOTAL | `AuthPage.tsx:54` (leitura) e `:97` (escrita) em `localStorage` | Persistência local apenas (não é DB) — por design. |
| **MFA/TOTP — cadastro (enroll)** | ✅ IMPLEMENTADO_TOTAL | UI `src/components/settings/TwoFactorSetup.tsx:49-113` (`mfa.enroll` :52, `mfa.challenge` :82, `mfa.verify` :88) montada em `src/pages/SettingsPage.tsx:117`; persistência em `auth.mfa_factors` + upsert em `user_mfa_settings` (`TwoFactorSetup.tsx:97-101`) | Existe um **segundo** caminho paralelo (`useMFA`) — ver linha abaixo. |
| **MFA/TOTP — desativação** | ✅ IMPLEMENTADO_TOTAL | `TwoFactorSetup.tsx:115-162` — exige código válido antes do `mfa.unenroll` (:140) e atualiza `user_mfa_settings` (:147-151) | Boa prática: challenge+verify antes de desinscrever. |
| **MFA — challenge no login** | ✅ IMPLEMENTADO_TOTAL | `AuthPage.tsx:65-86` (checa AAL e busca fator TOTP verificado) → `src/components/auth/MFALoginVerification.tsx:20-50` (`mfa.challenge` + `mfa.verify`) montado em `AuthPage.tsx:240` | Cancelar dispara `signOut()` (`AuthPage.tsx:240`) — não deixa sessão AAL1 pendurada. |
| **Correção do bypass de MFA (guarda em rota protegida)** | ✅ IMPLEMENTADO_TOTAL | **Verificado**: `src/components/auth/ProtectedRoute.tsx:47` consome `useAuthenticatorAssuranceLevel` e :84-87 redireciona para `/auth` quando `needsMfaChallenge`; hook em `src/features/auth/hooks/useAuthenticatorAssuranceLevel.ts:23-64` (`mfa.getAuthenticatorAssuranceLevel` :37, reavalia em `MFA_CHALLENGE_VERIFIED`/`SIGNED_IN`/`TOKEN_REFRESHED` :51-55) | A afirmação da auditoria anterior **confere**. Ressalva: o hook **falha aberto** (`useAuthenticatorAssuranceLevel.ts:45` — `needsMfaChallenge:false` em erro), assumido explicitamente em :41-44. Continua sendo guarda de cliente. |
| **RLS exigindo AAL2** | 🟦 SUGERIDO_OU_INICIADO | `grep -rni "aal2\|assurance" supabase/migrations/` → **zero ocorrências**. Nenhuma policy referencia `auth.jwt()->>'aal'` | Confirma a pendência apontada pela auditoria anterior: MFA **não** é exigido em nenhuma camada de banco; a sessão AAL1 tem os mesmos privilégios de RLS que a AAL2. |
| **Hook `useMFA` (caminho paralelo de MFA)** | 🟨 IMPLEMENTADO_PARCIAL | `src/features/auth/hooks/useMFA.ts:37-142`; consumido em `src/features/admin/components/security/MFASettings.tsx:22`, `MFAEnroll.tsx:11`, `SecurityOverviewCard.tsx:39`, `src/pages/SecurityDashboard.tsx:53` | Duplica `TwoFactorSetup.tsx`. **Não** grava em `user_mfa_settings` (só `TwoFactorSetup` grava) → os dois caminhos deixam essa tabela dessincronizada. `unenroll` em `useMFA.ts:113-124` **não** exige código TOTP (o de `TwoFactorSetup.tsx:115` exige) — desativação mais fraca por esse caminho. |
| **RBAC estático (`useRBAC` / `ROLE_PERMISSIONS`)** | 🟨 IMPLEMENTADO_PARCIAL | `src/features/auth/hooks/useRBAC.tsx:6-88` (mapa), `:134-197` (hook), `PermissionGate` `:208-230` | Permissões vivem **só no cliente**, hard-coded; não há objeto de banco correspondente consultado por `useRBAC`. Consumidor único da aplicação: `src/pages/InventoryPage.tsx:72` e `:423`. Todas as outras ~40 páginas dependem só de `allowedRoles` da rota. |
| **`RoleGate`** | ⬛ MORTO_OU_ABANDONADO | Definido em `src/features/auth/hooks/useRBAC.tsx:239-247`. Prova: `grep -rn "RoleGate" src/ tests/` retorna **apenas** as 3 linhas do próprio arquivo (`:233`, `:239`, `:244`) | Componente sem nenhum consumidor. |
| **RBAC por rota (`ProtectedRoute` + `allowedRoles`)** | ✅ IMPLEMENTADO_TOTAL | `ProtectedRoute.tsx:45-119`; rotas em `src/routes/AppRoutes.tsx:240-241` (`/settings` e `/security` = `['coordinator','manager']`); papel vem de `user_roles` via `AuthProvider.tsx:75-79` | Bypass de `admin` em `ProtectedRoute.tsx:91-93` — ocorre **depois** da checagem de MFA (:84), o que está correto. Teste unitário do bypass em `src/features/auth/types/admin_bypass.test.ts:11-24` (testa uma **cópia** da lógica, não o componente). |
| **`ROUTE_PERMISSIONS` / `canAccessRoute`** | ⬛ MORTO_OU_ABANDONADO | Mapa em `useRBAC.tsx:91-109`, função em `:171-182`, exposta em `:184`. Prova: `grep -rn "canAccessRoute" src/` só retorna `useRBAC.tsx:118`, `:171`, `:184` | Nenhuma rota é filtrada por esse mapa; o roteamento real usa `allowedRoles` em `AppRoutes.tsx`. |
| **RBAC dinâmico via tabela `role_permissions`** | 🟨 IMPLEMENTADO_PARCIAL | Hook `src/features/auth/hooks/useRolePermissions.ts:19-41` (SELECT em `role_permissions` :24) e `:49-79` (toggle: DELETE :55 / INSERT :62); UI `src/features/admin/components/security/PermissionManager.tsx:75` e `:93-98`; tabela com RLS em `supabase/migrations/20260317221345_...sql:85` | **Fio quebrado na aplicação**: nada consome essas permissões para autorizar. `useRBAC` (`useRBAC.tsx:140`) usa o mapa estático, não a tabela. Alternar um toggle grava no banco mas **não muda o acesso de ninguém**. |
| **`PermissionsProvider` / `usePermissionsContext`** | ⬛ MORTO_OU_ABANDONADO | Provider em `src/contexts/PermissionsContext.tsx:8-17`, montado em `src/providers/AppProviders.tsx` (árvore de providers). Prova: `grep -rn "usePermissionsContext" src/` retorna **apenas** `PermissionsContext.tsx:19` e `:20` | Contexto montado e alimentado a cada login, mas **zero consumidores**. Custa uma query em `role_permissions` por sessão sem uso. |
| **Catálogo `AVAILABLE_PERMISSIONS`** | 🟨 IMPLEMENTADO_PARCIAL | `src/features/auth/types/auth.types.ts:37-49`; usado em `PermissionManager.tsx:84` e `:170` | **Vocabulário incompatível** com `ROLE_PERMISSIONS`: declara `jobs:view`, `jobs:edit`, `operators:manage`, `settings:manage`, `telemetry:view`, `production:register` — nenhuma dessas strings existe em `useRBAC.tsx:6-88` (que usa `jobs:read`, `jobs:update`, `operators:read`, `settings:update`…). Permissões declaradas na UI de administração que nenhuma checagem reconhece. |
| **`PermissionMatrix` (visualização da matriz)** | 🟨 IMPLEMENTADO_PARCIAL | `src/features/admin/components/security/PermissionMatrix.tsx:5` (importa `ROLE_PERMISSIONS`), categorias em `:8-39`, checagem em `:57-60`; montado em `src/pages/SecurityDashboard.tsx:262` | Lista `production:register`, `reports:create`, `security:read`, `security:manage`, `users:manage` (`PermissionMatrix.tsx:13,29,36-38`) — nenhuma existe em `ROLE_PERMISSIONS`, então a matriz exibe "não" para **todos** os papéis nessas linhas, inclusive admin. Informação enganosa. |
| **Gestão de usuários / troca de papel** | 🟨 IMPLEMENTADO_PARCIAL | `src/components/settings/UserManagement.tsx:98-105` — `.upsert({ user_id, role }, { onConflict: 'user_id' })`; montado em `src/pages/SettingsPage.tsx:120` | **Fio provavelmente quebrado**: a única restrição única de `user_roles` é `UNIQUE(user_id, role)` (`supabase/migrations/20251213011430_...sql:23`); `grep` por `CREATE UNIQUE`/`ADD CONSTRAINT` em `user_roles` não encontra índice único só em `user_id`. Um `onConflict:'user_id'` sem constraint correspondente resulta em erro PostgREST 42P10. Além disso o upsert **não** define `is_active`, e o erro é engolido por um toast genérico (`UserManagement.tsx:117`). Confirmação de runtime = NAO_VERIFICADO. |
| **RLS de `user_roles` (anti-escalada de privilégio)** | ✅ IMPLEMENTADO_TOTAL | `supabase/migrations/20260712231523_...sql:5-40` (manager não concede admin/manager; admin total) e revisão em `20260713122454_...sql:3-22` (coordinator/manager não tocam linhas admin/manager); leitura própria em `20260412114527_...sql:114` | Camada de banco cobre a escalada mesmo que o cliente falhe. |
| **`has_role()` (SECURITY DEFINER)** | 🟨 IMPLEMENTADO_PARCIAL | Definição com `is_active` em `supabase/migrations/20260317221345_...sql:4-18`; variante endurecida `app_private.has_role` em `20260619160053_...sql:5-22`; `search_path` fixado em `20260515134557_...sql:21` | **Conflito de grants**: `20260619160053_...sql:119-120` faz `REVOKE EXECUTE ... FROM public, anon, authenticated` e concede só a `service_role`, mas a migration **posterior** `20260713122454_...sql:4-22` volta a escrever policies chamando `public.has_role(...)` avaliadas sob o papel `authenticated`. Se o REVOKE valer no banco atual, essas policies falham/negam. Efeito real = NAO_VERIFICADO (precisa de `pg_proc`/`information_schema` em runtime). |
| **Lockout por tentativas falhas (brute-force)** | ✅ IMPLEMENTADO_TOTAL | Chamador `src/features/auth/services/authService.ts:46-79` (`invoke('check-login-lockout')`) ← `AuthProvider.tsx:215` e `:227`/`:263`; função `supabase/functions/check-login-lockout/index.ts:40-357`; tabela `login_lockouts` em `supabase/migrations/20251231132402_...sql:2-13`, RLS `USING (false)` (service-role only) em `:19` | Backoff exponencial `:34-38`; IP derivado de header em `:16-21`; `record_success` exige JWT do próprio e-mail `:81-94`; evita enumeração ao omitir contadores `:128-131`. **Falha aberto** por design (`:348-355` e `authService.ts:52-59`): se a função cair, o login passa sem proteção. |
| **Alerta de novo dispositivo** | ✅ IMPLEMENTADO_TOTAL | Chamador `src/hooks/useDeviceDetection.ts:104` ← `AuthProvider.tsx:243` (background, não bloqueia login); função `supabase/functions/new-device-alert/index.ts:18-...` (JWT obrigatório :30-47, identidade do token :60-62, IP do header :64-66); persistência em `user_devices` (`index.ts:106+`), RLS em `supabase/migrations/20260317221345_...sql:233-236` | Fingerprint fraco (hash de UA/tela/timezone) em `useDeviceDetection.ts:14-37` — colisões prováveis entre máquinas iguais. `getClientIP` chama `api.ipify.org` (`:87-95`), mas o IP do corpo é **descartado** pela função — chamada externa inútil e vazamento de tráfego para terceiro. |
| **Gestão de dispositivos ativos (UI)** | ✅ IMPLEMENTADO_TOTAL | `src/features/admin/components/security/ActiveDevicesPanel.tsx` montado em `src/pages/SecurityDashboard.tsx:223`; dados via `src/hooks/useUserDevices.ts:33-86` (SELECT/UPDATE/DELETE em `user_devices`); RLS por dono em `20260317221345_...sql:233-236` e `20251231122707_...sql:29,44` | — |
| **Fluxo de reset de senha com aprovação (solicitação)** | 🟨 IMPLEMENTADO_PARCIAL | UI `src/pages/AuthPage.tsx:263-272`, insert em `:135-139` (`password_reset_requests`), cooldown de 60 s em `:153-160` | **Fio quebrado**: o insert acontece com o usuário **deslogado**, mas a única policy de INSERT vigente é `TO authenticated` com `lower(user_email) = lower(auth.jwt()->>'email')` (`supabase/migrations/20260712231426_...sql:36-41`), e a policy anterior aberta foi derrubada em `:35`. Não há nenhuma policy `TO anon` (`grep -rn "TO anon" supabase/migrations/` = 0 resultados). O cliente só trata o código `23505` (`AuthPage.tsx:144`); um 42501 cai no toast genérico `:147`. Efeito em produção = NAO_VERIFICADO. |
| **Fluxo de reset de senha — aprovação pelo gestor** | ✅ IMPLEMENTADO_TOTAL | UI `src/components/settings/PasswordResetRequests.tsx:56-68` (lista) e `:70-81`/`:91-103` (`invoke('approve-password-reset')`), montada em `src/pages/SettingsPage.tsx:120`; função `supabase/functions/approve-password-reset/index.ts:10-197` — JWT obrigatório :23-41, papel via `user_roles` com `is_active` :52-70, rate-limit :73-84, expiração :122-127, anti open-redirect :152-163, envio via `resetPasswordForEmail` :165-168 | **`approve-password-reset` TEM chamador** (contradiz a expectativa de "sem chamador"). Observação: `:65` aceita só `coordinator`/`manager` — **`admin` recebe 403**, embora a UI use `has_role` de coordenador na RLS de UPDATE (`20260712232418_...sql:68`). |
| **Página de redefinição de senha** | ✅ IMPLEMENTADO_TOTAL | `src/pages/ResetPasswordPage.tsx:38-72` (valida sessão de recovery / `setSession` a partir do hash), schema Zod `:27-35`, rota pública em `src/routes/AppRoutes.tsx:171` | — |
| **Indicador de força de senha** | 🟨 IMPLEMENTADO_PARCIAL | `src/components/auth/PasswordStrengthIndicator.tsx:67`; consumidores: `src/components/auth/AuthSignupForm.tsx:44` (form morto) e `src/components/operators/CreateOperatorModal.tsx:169` | Único consumidor vivo é o modal de criação de operador. **Não** é usado em `ResetPasswordPage.tsx`, que valida só via Zod (`:28-31`). |
| **`AuthSignupForm` (cadastro público)** | ⬛ MORTO_OU_ABANDONADO | `src/components/auth/AuthSignupForm.tsx:23`. Prova: `grep -rn "AuthSignupForm" src/ tests/` retorna **apenas** as 3 linhas do próprio arquivo (`:9`, `:23`, `:26`) — `AuthPage.tsx` importa só `AuthLoginForm` (`AuthPage.tsx:23`) | Formulário completo sem ponto de montagem. |
| **`signUp` no contexto de auth** | 🟦 SUGERIDO_OU_INICIADO | `AuthProvider.tsx:284-286` — retorna sempre `new Error('Cadastro público desabilitado…')`; assinatura em `src/features/auth/types/auth.types.ts:20` | Stub intencional; nenhum consumidor (`grep -rn "signUp" src/` só acha a definição e o tipo). Cadastro real é via `create-operator`. |
| **`AuthService.resetPassword` / `AuthService.getUser`** | ⬛ MORTO_OU_ABANDONADO | `src/features/auth/services/authService.ts:24-27` e `:35-39`. Prova: `grep -rn "AuthService\." src/` (excluindo o próprio arquivo) retorna só `getSession`, `checkLockout`, `signIn`, `recordLoginAttempt`, `signOut` — todos em `AuthProvider.tsx:154,215,226,227,263,290` | Dois métodos sem nenhum chamador. |
| **Login social Google (OAuth)** | 🟨 IMPLEMENTADO_PARCIAL | UI `AuthLoginForm.tsx` (`onGoogleLogin`) → `src/pages/AuthPage.tsx:120` → `src/integrations/lovable/index.ts:14-35` (`lovableAuth.signInWithOAuth` + `supabase.auth.setSession`) | O caminho existe no código, mas **contorna todo o pipeline de segurança do login por senha**: não passa por `AuthService.checkLockout`, não chama `recordLoginAttempt` e não dispara `checkDevice` (comparar com `AuthProvider.tsx:215-258`). Habilitação do provider = NAO_VERIFICADO (config fora do repo). |
| **Reautenticação para ações sensíveis (`ReauthProvider`)** | ⬛ MORTO_OU_ABANDONADO | Provider completo em `src/contexts/ReauthContext.tsx:43-209`, montado em `src/providers/AppProviders.tsx:9` e `:69`. Prova: `grep -rn "useReauth\|requireReauth\|withReauth" src/` retorna **apenas** linhas do próprio `ReauthContext.tsx` (`:23`, `:59`, `:211`, `:220`, `:225`, `:228`) | Diálogo montado na árvore mas **nunca acionado**: nenhuma ação sensível (trocar papel, desativar MFA, gerenciar usuários) chama `requireReauth`. Observação extra: `:88-91` reautentica via `signInWithPassword`, o que **substitui a sessão corrente** (efeito colateral indesejado se algum dia for ligado). |
| **`validate-login-ip` (IP allowlist na autenticação)** | ⬛ MORTO_OU_ABANDONADO | Função íntegra em `supabase/functions/validate-login-ip/index.ts:44-179` (match CIDR :22-32, IP do header :36-42, rate-limit :62-69, grava `login_audit` :141-150). Prova de ausência de chamador: `grep -rn "validate-login-ip" src/ tests/ supabase/ --exclude-dir=validate-login-ip` → **0 resultados**; também ausente de `cron.schedule` (só existem 2 agendamentos, em `20260512110942_...sql:43` para `auto-promote-jobs` e `20260726161334_...sql:77` para `rollup_cron_p95_daily`) | **A afirmação da auditoria anterior confere: continua sem chamador.** Consequência: a UI de allowlist é gravada mas nunca aplicada (ver linha seguinte). |
| **IP allowlist (CRUD na UI)** | 🟨 IMPLEMENTADO_PARCIAL | `src/components/settings/IPAllowlist.tsx:31-120` (SELECT :44, INSERT :72, UPDATE :99, DELETE :116 em `ip_allowlist`); montado em `src/pages/SettingsPage.tsx:117` e `src/pages/SecurityDashboard.tsx:247`; RLS em `supabase/migrations/20251231024918_...sql:23-28` | **Guarda declarada e nunca aplicada**: o único código que lê `ip_allowlist` é `validate-login-ip/index.ts:79-107`, que não tem chamador. Administrar a lista não bloqueia login algum. |
| **`rate-limit-check` (edge function)** | ⬛ MORTO_OU_ABANDONADO | Função completa em `supabase/functions/rate-limit-check/index.ts:18-238` (identidade via JWT :29-42, bloqueio de IP :94-125, config por `rate_limit_settings` :129-151, insere em `rate_limit_logs` :170-179, bloqueia em `blocked_ips` :186-192, fail-closed :231-236). Prova: `grep -rn "rate-limit-check" src/ tests/ supabase/ --exclude-dir=rate-limit-check` → **0 resultados** | **Confirmado sem chamador.** O rate limiting realmente ativo é o helper interno `supabase/functions/_shared/rateLimit.ts:52+`, usado por `check-login-lockout/index.ts:57`, `validate-login-ip/index.ts:62` e `approve-password-reset/index.ts:73`. |
| **Rate limiting em edge functions (`_shared/rateLimit.ts`)** | ✅ IMPLEMENTADO_TOTAL | Helper `supabase/functions/_shared/rateLimit.ts:52+` (janela fixa sobre `rate_limit_logs`, identidade `userId > email > ip` :44-49); consumido em `check-login-lockout/index.ts:57-64`, `validate-login-ip/index.ts:62-69`, `approve-password-reset/index.ts:73-84` | **Falha aberto** em erro de infra (documentado em `rateLimit.ts:11-13`). |
| **Rate limiter de cliente (`src/lib/rateLimiter.ts`)** | ⬛ MORTO_OU_ABANDONADO | Classe `src/lib/rateLimiter.ts:13-62`, instâncias `apiLimiter`/`searchLimiter`/`authLimiter` em `:67-73`, reexportadas em `src/lib/index.ts:15`. Prova: `grep -rn "apiLimiter\|searchLimiter\|authLimiter" src/` excluindo `rateLimiter.ts`, `lib/index.ts` e `src/test/` → **0 resultados** | Código testado (`src/test/rateLimiter.test.ts`, `src/test/loadStress.test.ts`) porém **nenhuma chamada da aplicação** — nem em `AuthProvider.signIn`, nem no cliente Supabase. |
| **UI de configuração de rate limit** | 🟨 IMPLEMENTADO_PARCIAL | `src/features/admin/components/security/RateLimitSettings.tsx` montado em `src/pages/SecurityDashboard.tsx:256`; hook `src/features/admin/hooks/useRateLimitLogs.ts:105-110` e `:211,238,265` (CRUD em `rate_limit_settings`); RLS em `20251231115823_...sql:93-98` | Só `rate-limit-check/index.ts:129-151` lê `rate_limit_settings` — e essa função não tem chamador. Ou seja: a configuração é editável e **não afeta nada**. |
| **Painel de IPs bloqueados** | 🟨 IMPLEMENTADO_PARCIAL | `src/features/admin/components/security/BlockedIPsPanel.tsx:53` + `src/features/admin/hooks/useRateLimitLogs.ts:78,94,152,183` (CRUD em `blocked_ips`); realtime em `src/features/admin/hooks/useSecurityEvents.ts:36-47`; RLS em `20251231115823_...sql:83-88`; montado em `SecurityDashboard.tsx:246` | Leitura/gestão manual funcionam. O **preenchimento automático** viria de `rate-limit-check/index.ts:186-192` (sem chamador) e a **aplicação** do bloqueio também (`:94-125`) — bloquear um IP pela UI não impede acesso. |
| **`security-alert` (edge function)** | 🟦 SUGERIDO_OU_INICIADO | `supabase/functions/security-alert/index.ts:6-78` — exige `CRON_SECRET` fail-closed (`:15-16` + `_shared/cronAuth.ts:20-50`), valida `event_type`/`severity` (:31-49), insere em `security_events` (:51-63). Prova: `grep -rn "security-alert" src/ supabase/ --exclude-dir=security-alert` → só ocorrências de *query keys* homônimas (`src/lib/queryConfig.ts:36`, `SecurityAlertsPanel.tsx:40`), nenhum `functions.invoke` | Sem invocador no repo e sem `cron.schedule`. Pode ser chamada por scheduler externo — NAO_VERIFICADO. |
| **`cleanup-security-logs` (retenção de logs)** | 🟦 SUGERIDO_OU_INICIADO | `supabase/functions/cleanup-security-logs/index.ts:6-74` — fail-closed via `CRON_SECRET` (:13-14), purga `rate_limit_logs` >7d (:28-31), `security_events` e `login_audit` >30d (:36-49), desbloqueia IPs expirados (:52-57). Prova: `grep -rn "cleanup-security-logs" src/ supabase/` → só o próprio diretório; nenhum `cron.schedule` correspondente nas migrations | Rotina de retenção pronta mas sem agendamento versionado. Agendamento externo = NAO_VERIFICADO. |
| **Registro de eventos de segurança (servidor)** | ✅ IMPLEMENTADO_TOTAL | `check-login-lockout/index.ts:226-236` insere `account_locked` em `security_events` com service-role; tabela em `20251231115823_...sql:44-54` | Caminho vivo (a função tem chamador). |
| **Registro de eventos de segurança (cliente — `logSecurityEvent`)** | ⬛ MORTO_OU_ABANDONADO | `src/features/admin/hooks/useSecurityEvents.ts:49-60`. Prova: `grep -rn "logSecurityEvent" src/` → **0 resultados** fora da própria definição | Além de morto, quebraria: não define `user_id`, e a policy de INSERT vigente exige `user_id = auth.uid() OR has_role(...)` (`20260712232418_...sql:21`). |
| **Log de eventos de segurança (visualização + realtime)** | ✅ IMPLEMENTADO_TOTAL | `src/features/admin/components/security/SecurityEventsLog.tsx:61-62` ← `useSecurityEvents` (`useRateLimitLogs.ts:120-125`, SELECT em `security_events`) + `useRealtimeSecurityEvents` (`useSecurityEvents.ts:8-30`); montado em `SecurityDashboard.tsx:241`; RLS de leitura em `20251231115823_...sql:103` | — |
| **Auditoria de login (visualização)** | 🟨 IMPLEMENTADO_PARCIAL | `src/components/settings/LoginAuditLog.tsx:38` (SELECT em `login_audit`), montado em `SettingsPage.tsx:117` e `SecurityDashboard.tsx:267`; RLS em `20251231024918_...sql:90-102` | **Sem produtor**: o único código que escreve em `login_audit` é `validate-login-ip/index.ts:141-150` — função sem chamador. O painel tende a exibir tabela vazia. |
| **Painel de alertas de segurança** | ✅ IMPLEMENTADO_TOTAL | `src/features/admin/components/security/SecurityAlertsPanel.tsx:40` (query key `['security-alerts', user?.id]`); montado em `SecurityDashboard.tsx:212` e `:237` | — |
| **`SecurityOverviewCard` (score pessoal)** | 🟨 IMPLEMENTADO_PARCIAL | `src/features/admin/components/security/SecurityOverviewCard.tsx:38-39` usa dados reais de `useMFA` e `useUserDevices` | O check "Senha Forte" é **hard-coded** como aprovado e soma 20 pontos incondicionalmente (`:51-57`) — o score não reflete a senha real. |
| **`CyberResilienceScore`** | 🟦 SUGERIDO_OU_INICIADO | `src/features/admin/components/security/CyberResilienceScore.tsx:6-50` — valor `98.5` e barra `"258, 264" // 98%` totalmente literais (`:33`, `:39`), sem hook, sem query, sem props; montado em `SecurityDashboard.tsx:209` | Widget decorativo: nenhuma métrica real alimenta o número exibido. |
| **`AICyberAdvisor`** | 🟦 SUGERIDO_OU_INICIADO | `src/features/admin/components/security/AICyberAdvisor.tsx:7-31` — array `insights` literal ("bloqueou 43 tentativas de brute-force", "Validação de Blockchain confirmou 100%"); montado em `SecurityDashboard.tsx:217` | Texto fixo apresentado como telemetria de segurança. Risco de leitura enganosa por um gestor. |
| **Geo-blocking (config)** | 🟨 IMPLEMENTADO_PARCIAL | `src/features/admin/hooks/useGeoBlocking.ts:68-140` (CRUD em `geo_blocking_settings`, `geo_blocking_rules`, `geo_blocking_logs` — tipos gerados em `src/integrations/supabase/types.ts:1056,1092,1128`); UI `GeoBlockingSettings.tsx` montada em `SecurityDashboard.tsx:252` | **Sem nenhum ponto de aplicação**: `grep -rn "geo_blocking" src/ supabase/functions/` (excluindo hook/UI) retorna apenas as definições de tipo. Nenhuma edge function ou policy consulta as regras. |
| **`AuthErrorBoundary`** | 🟨 IMPLEMENTADO_PARCIAL | `src/components/auth/AuthErrorBoundary.tsx:16-55`, envolve toda a `AuthPage` (`AuthPage.tsx:170` e `:273`); persiste em `error_logs` (`:35-46`) | A persistência falha justamente no caso principal: a policy de INSERT vigente é `WITH CHECK (auth.uid() IS NOT NULL)` (`supabase/migrations/20260514211713_...sql:3`) e a `AuthPage` roda **deslogado**. O erro é engolido em `:47-49`. |
| **CORS das edge functions de segurança** | ✅ IMPLEMENTADO_TOTAL | `supabase/functions/_shared/cors.ts:16-51` — allowlist explícita (`APP_URL` + domínio de preview + `EXTRA_ALLOWED_ORIGINS`), `pickAllowedOrigin` :35-38, `Vary: Origin` :49. `grep -rn "Allow-Origin" supabase/functions/*/index.ts \| grep "\*"` → **0 resultados** | Contraria o achado de "CORS wildcard" de `ANALISE_TECNICA_SISTEMA.md`: **já corrigido** nas funções deste escopo. |
| **Policies RLS permissivas `USING (true)`** | 🟨 IMPLEMENTADO_PARCIAL | Ainda presentes: `grep -rn "USING (true)" supabase/migrations/` → **170 ocorrências em 56 arquivos**. Exemplos recentes: `20260522195454_...sql:4` (`profiles`), `:62` (`machines`), `20260802113515_...sql:107`, `20260802113601_...sql:6`. Em segurança: `role_permissions` em `20260317221345_...sql:85` | O achado do `ANALISE_TECNICA_SISTEMA.md` **persiste**, porém **mitigado**: as versões recentes usam `FOR SELECT TO authenticated USING (true)` (leitura ampla só para logados) em vez de acesso anônimo. Nenhuma tabela de segurança sensível (`login_lockouts`, `ip_allowlist`, `blocked_ips`, `rate_limit_settings`) tem `USING (true)`. |
| **Policy morta em `error_logs`** | ⬛ MORTO_OU_ABANDONADO | `supabase/migrations/20260508180707_...sql:29` — `"Admins can view all error logs" FOR SELECT USING (auth.jwt() ->> 'role' = 'admin')` | O claim `role` do JWT do Supabase vale `authenticated`/`anon`, **nunca** `'admin'` (papéis do app vivem em `user_roles`). Condição jamais verdadeira. |
| **Testes de autenticação** | 🟨 IMPLEMENTADO_PARCIAL | Unitário `src/features/auth/components/AuthProvider.test.tsx:1-40` (mock completo do client); `src/features/auth/types/admin_bypass.test.ts:5-24`; E2E `tests/e2e/auth.spec.ts:4-47` (login, credenciais inválidas, logout, rotas protegidas) | **Zero cobertura** de MFA/AAL, lockout, RBAC dinâmico, reset com aprovação e `ProtectedRoute`. `admin_bypass.test.ts:5-9` testa uma reimplementação local da regra, não `ProtectedRoute.tsx:91`. |
| **`useSessionManager`** | ⬛ MORTO_OU_ABANDONADO | `src/features/auth/hooks/useSessionManager.tsx:1-2` — arquivo com `export {}` e comentário "consolidated into AuthProvider"; ainda reexportado em `src/features/auth/index.ts:6` | Arquivo vazio mantido no barrel; nome ainda listado em `src/features/admin/hooks/useCodeQualityMetrics.ts:102`. |
| **`verify_jwt` por edge function** | 🟦 SUGERIDO_OU_INICIADO | `supabase/config.toml` contém **apenas** `project_id = "xxroejpvloldkmqdydar"`. As únicas menções a `verify_jwt` são comentários: `check-login-lockout/index.ts:55` e `validate-login-ip/index.ts:60` | Postura de JWT das funções públicas **não é versionada** — vive só no painel Supabase. Estado real = NAO_VERIFICADO. |

---

## Integrações e automações do domínio

| Integração | Estado no repo | Evidência |
|---|---|---|
| **Supabase Auth** (senha, sessão, TOTP/MFA, recovery) | Ativo, é o backbone | `authService.ts:13-39`, `useMFA.ts:48,65,84,105,115`, `TwoFactorSetup.tsx:39,52,82,88,140`, `ResetPasswordPage.tsx:40,49` |
| **Resend** (e-mail de novo dispositivo) | Configurado no código, chave via env | `supabase/functions/new-device-alert/index.ts:2` e `:25` (`RESEND_API_KEY`) |
| **`@lovable.dev/cloud-auth-js`** (OAuth Google) | Wire presente; provider fora do repo | `src/integrations/lovable/index.ts:2,14-35`; consumidor `AuthPage.tsx:120` |
| **api.ipify.org** (IP do cliente) | Chamada externa **inútil** | `src/hooks/useDeviceDetection.ts:89`; o valor é sobrescrito pelo servidor em `new-device-alert/index.ts:64-66` |
| **pg_cron** | Só 2 agendamentos, **nenhum** de segurança | `20260512110942_...sql:43` (`auto-promote-jobs`), `20260726161334_...sql:77` (`rollup_cron_p95_daily`) |
| **`CRON_SECRET`** (guarda de funções internas) | Implementado, fail-closed nas destrutivas | `_shared/cronAuth.ts:20-50`; usado em `cleanup-security-logs/index.ts:13` e `security-alert/index.ts:15` |
| **Sentry** | Fora deste lote (inicializado em `main.tsx`) | — |

**Edge functions do domínio — resumo de invocação (busca por `functions.invoke` em todo o repo):**

| Função | Chamador encontrado |
|---|---|
| `check-login-lockout` | ✅ `src/features/auth/services/authService.ts:48` e `:64` |
| `approve-password-reset` | ✅ `src/components/settings/PasswordResetRequests.tsx:72` e `:95` |
| `new-device-alert` | ✅ `src/hooks/useDeviceDetection.ts:104` |
| `validate-login-ip` | ❌ nenhum (nem app, nem cron) |
| `rate-limit-check` | ❌ nenhum (nem app, nem cron) |
| `cleanup-security-logs` | ❌ nenhum no repo (só chamável externamente com `CRON_SECRET`) |
| `security-alert` | ❌ nenhum no repo (só chamável externamente com `CRON_SECRET`) |

---

## Achados relevantes

1. **Correção do bypass de MFA: confirmada.** `ProtectedRoute.tsx:84-87` + `useAuthenticatorAssuranceLevel.ts:38` fecham
   o buraco no cliente. **Porém** o hook falha aberto (`:45`) e **não há nenhuma policy RLS exigindo `aal2`**
   (`grep` por `aal2` nas 216 migrations = 0). Uma sessão AAL1 continua tendo, no banco, exatamente os mesmos
   privilégios de uma AAL2. A pendência de AAL2 apontada pela auditoria anterior **segue aberta**.

2. **`validate-login-ip` e `rate-limit-check` continuam sem nenhum chamador** (greps em `src/`, `tests/`, `supabase/`
   e nas `cron.schedule` das migrations). Consequência prática: **três telas administrativas gravam configuração
   que nada aplica** — IP allowlist (`IPAllowlist.tsx`), configurações de rate limit (`RateLimitSettings.tsx`) e
   bloqueio de IP (`BlockedIPsPanel.tsx`). É a categoria "guarda que existe mas nunca é invocada", em triplicata.
   Já `approve-password-reset` **tem** chamador (`PasswordResetRequests.tsx:72,95`).

3. **`login_audit` não tem produtor.** Único `INSERT` está em `validate-login-ip/index.ts:141-150`, função órfã.
   `LoginAuditLog.tsx:38` lê uma tabela que ninguém alimenta.

4. **Fluxo "esqueci minha senha" provavelmente quebrado por RLS.** `AuthPage.tsx:135` insere em
   `password_reset_requests` com o usuário **deslogado**, mas a policy vigente é `TO authenticated` com
   `lower(user_email) = lower(auth.jwt()->>'email')` (`20260712231426_...sql:36-41`) e não existe policy `TO anon`.
   O cliente só trata `23505`, então um 42501 vira "Erro ao enviar solicitação". Verificação em runtime pendente.

5. **Troca de papel de usuário com `onConflict` inválido.** `UserManagement.tsx:98-105` usa `onConflict:'user_id'`,
   mas a única unicidade de `user_roles` é `UNIQUE(user_id, role)` (`20251213011430_...sql:23`). Sem índice único em
   `user_id` isolado, o PostgREST devolve 42P10. O erro é mascarado por toast genérico (`:117`).

6. **RBAC tem três vocabulários incompatíveis**: `ROLE_PERMISSIONS` (`useRBAC.tsx:6-88`, `jobs:read`…),
   `AVAILABLE_PERMISSIONS` (`auth.types.ts:37-49`, `jobs:view`/`jobs:edit`…) e as categorias de
   `PermissionMatrix.tsx:8-39` (`security:manage`, `users:manage`…). Só o primeiro é consultado por
   `hasPermission`. A UI de administração de permissões exibe e permite alternar strings que **nenhuma
   checagem reconhece**, e a matriz mostra "negado" para permissões que simplesmente não existem no modelo.

7. **RBAC dinâmico é escrita sem leitura.** `useRolePermissions.ts:49-79` grava em `role_permissions`, mas
   `useRBAC.tsx:140` autoriza pelo mapa estático. `PermissionsProvider` (`PermissionsContext.tsx:8`) está montado na
   árvore global e **não tem um único consumidor** (`usePermissionsContext` = 0 ocorrências externas).

8. **`ReauthProvider` está montado e nunca acionado.** `AppProviders.tsx:69` monta o diálogo; `requireReauth`
   (`ReauthContext.tsx:59`) tem zero chamadores. Ações genuinamente sensíveis — desativar MFA (`useMFA.ts:113`),
   trocar papel (`UserManagement.tsx:89`), gerenciar allowlist (`IPAllowlist.tsx:72`) — passam sem step-up.

9. **Dois caminhos concorrentes de MFA.** `TwoFactorSetup.tsx` (exige TOTP para desativar, grava
   `user_mfa_settings`) e `useMFA.ts` (**não** exige código no `unenroll` `:113-124`, **não** grava
   `user_mfa_settings`). Ambos estão montados em telas diferentes (`SettingsPage.tsx:117` vs
   `SecurityDashboard.tsx:229`), o que permite desativar 2FA pelo caminho mais fraco.

10. **Rate limiter de cliente é código morto.** `src/lib/rateLimiter.ts:67-73` expõe `apiLimiter`/`searchLimiter`/
    `authLimiter`, todos com testes dedicados, e **nenhuma** chamada de aplicação. O limitador real e vivo é
    `_shared/rateLimit.ts` nas edge functions.

11. **Widgets de segurança com dados fabricados.** `CyberResilienceScore.tsx:33,39` (98,5 literal) e
    `AICyberAdvisor.tsx:7-31` (insights fixos: "43 tentativas de brute-force", "Blockchain confirmou 100%")
    aparecem no topo do `SecurityDashboard` (`:209`, `:217`) como se fossem telemetria. `SecurityOverviewCard.tsx:51-57`
    concede 20 pontos de "Senha Forte" incondicionalmente.

12. **Conflito de grants em `has_role`.** `20260619160053_...sql:119-120` revoga EXECUTE de `authenticated` e
    concede só a `service_role`; a migration posterior `20260713122454_...sql:4-22` recria policies chamando
    `public.has_role(...)` no contexto `authenticated`. Se o REVOKE estiver vigente no banco, essas policies podem
    falhar. Estado real = **NAO_VERIFICADO** (exige inspeção de `pg_proc`/`information_schema`).

13. **Achados do `ANALISE_TECNICA_SISTEMA.md` re-testados**: (a) **CORS wildcard — corrigido** neste escopo
    (`_shared/cors.ts:16-38`, zero `*` nas funções); (b) **RLS `USING (true)` — persiste** (170 ocorrências em 56
    migrations), porém mitigado por `TO authenticated` nas versões recentes e ausente nas tabelas de segurança
    críticas; (c) **baixa cobertura de testes — persiste** (nenhum teste de MFA, lockout, RBAC ou reset).

14. **Outros pontos menores, todos com evidência:** `AuthProvider.tsx:79` escolhe o papel com `.limit(1)` sem
    ordenação (não-determinístico com múltiplos papéis ativos); `approve-password-reset/index.ts:65` **nega
    `admin`** (403), aceitando apenas coordinator/manager; política de inatividade divergente entre
    `useSessionTimeout.tsx:55-56` (25+5 min) e `AuthProvider.tsx:62` (60 min); `AuthErrorBoundary.tsx:35` não
    consegue gravar em `error_logs` no cenário anônimo por causa de `20260514211713_...sql:3`;
    `useSessionManager.tsx:1-2` é arquivo vazio ainda exportado pelo barrel (`index.ts:6`);
    login social ignora lockout/device-check (`AuthPage.tsx:120` vs `AuthProvider.tsx:215-258`);
    `useDeviceDetection.ts:89` chama `api.ipify.org` cujo resultado é descartado pelo servidor;
    `grep -rn "TODO\|FIXME\|XXX\|HACK"` em todo o escopo → **0 ocorrências**.

---

## Limitações

- **Sem runtime, sem banco, sem produção.** Nada foi executado: nem `npm run test`, nem `npx supabase`, nem query SQL.
  Nenhuma linha deste documento afirma que algo "está em uso real".
- **O estado real do banco é NAO_VERIFICADO.** As migrations são o histórico *pretendido*; policies podem ter sido
  alteradas pelo painel Supabase, e não foi possível inspecionar `pg_policies`/`pg_proc`. Isso afeta especialmente
  os achados 4, 5 e 12.
- **Configuração fora do repo é NAO_VERIFICADO**: `verify_jwt` por função (`config.toml` só tem `project_id`),
  secrets (`CRON_SECRET`, `RESEND_API_KEY`, `APP_URL`, `EXTRA_ALLOWED_ORIGINS`), agendamentos externos que possam
  invocar `cleanup-security-logs`/`security-alert`, e a habilitação do provider Google.
- **"Sem chamador" significa "sem chamador estático no repositório"** — greps literais por nome de função e símbolo.
  Invocação dinâmica (nome montado em runtime), chamada por sistema externo ou por workflow de CI não seria detectada.
  Nos casos relevantes o grep executado está transcrito na coluna de evidência.
- Não foram auditados os subdomínios de outros lotes (notificações, jobs, inventário, produção), mesmo quando
  tocam `user_roles` (ex.: `src/features/production/hooks/useOperators.ts:36`).
