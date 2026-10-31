# Auditorias, Planos e Tentativas Anteriores — Fast Gravações V2

> Reconciliação produzida em 2026-10-31 sobre o estado do repositório `adm01-debug/Fast_Gravacoes_V2`.
> Branch de referência: `main` @ `3f2dee60` (PR #112, mergeado 2026-10-28).
> Branch local inspecionada: `fix/pr116-revisao` (4 commits à frente de main).
> Método: leitura direta dos documentos no repositório + git history + corpos de PRs via API GitHub.

---

## 1. Documentos examinados

| # | Arquivo | Data | Autor / Agente | SHA / PR de referência |
|---|---------|------|----------------|------------------------|
| D1 | `ANALISE_TECNICA_SISTEMA.md` | 2026-05-20 | Agente (não identificado) | HEAD da época |
| D2 | `CODE_REVIEW_FINDINGS.md` | 2026-05-28 | Cline + Claude Code | Antecede PR #30 |
| D3 | `AUDITORIA_CORRECOES_2026-05-29.md` | 2026-05-29 | Agente | PR #30 |
| D4 | `docs/QA_AUDIT_2026-06-14.md` | 2026-06-14 | Agente QA | Pré-PR #54 |
| D5 | `docs/QA_SIMULACAO_CENARIOS_2026-06-14.md` | 2026-06-14 | Agente QA | Pré-PR #54 |
| D6 | `AUDITORIA_EXAUSTIVA_2026-07-18.md` | 2026-07-18 | Claude (30 etapas) | Pré-PR #68 |
| D7 | `docs/plano-mestre-10-10.md` | 2026-09-10 | Codex | Baseline `a82e4fed` |
| D8 | `ESTADO_ATUAL.md` | 2026-08-16 | 14 agentes (lotes) | Pós-PRs #55–#67 |
| D9 | `docs/estado/_lote-01-producao-jobs.md` a `_lote-14-varredura-features-lib.md` | 2026-08-16 | Agentes por domínio | Pós-PRs #55–#67 |
| D10 | `docs/estado/_meta-00-consolidado.md` | 2026-08-16 | Meta-agente adversarial | Pós-lotes D9 |
| D11 | `docs/estado/_meta-01-refutacao-verdes.md` | 2026-08-16 | Meta-agente adversarial | Pós-lotes 01–04 |
| D12 | `docs/estado/_meta-02-refutacao-verdes.md` | 2026-08-16 | Meta-agente adversarial | Pós-lotes 05–14 |
| D13 | `docs/plano-50-etapas-consolidacao.md` | 2026-09-24 | Agente (PR #54) | PR #54 |
| D14 | `docs/estado/BALANCO-DOCS-2026-10-28.md` ¹ | 2026-10-28 | 7 agentes em paralelo | PR #112 (`3f2dee60`) |
| D15 | `PENDENCIAS.md` ¹ | 2026-10-28 | Agente Devin | PR #112 (`3f2dee60`) |
| D16 | `AGENTS.md` | — | Configuração do projeto | main |
| D17 | `CLAUDE.md` | — | Configuração de agente | main |
| D18 | `.hermes.md` | — | Configuração de agente | main |

¹ **Ausentes do working tree local** (`fix/pr116-revisao`): foram deletados pelo commit `0b4c7e24` (`fix(review): resolve achados da revisão do #116`). Conteúdo recuperado via `git show 3f2dee60:<arquivo>`. Ver seção 6.

### Fontes inacessíveis ou parcialmente lidas

- `docs/post-mortems/2026-09-10-migrate-helper.md` — citado em D7; não lido diretamente (caminho confirmado existe via `ls`)
- `docs/QA_AUDIT_2026-06-14.md` e `docs/QA_SIMULACAO_CENARIOS_2026-06-14.md` (D4, D5) — existem no repo, não lidos diretamente nesta reconciliação; referenciados em D6 e D10
- `docs/graphify/` — baseline de grafo de módulos; não inspecionado além do nome
- `.claude/`, `.agents/`, `.codex/` — configurações de agentes; não relevantes para reconciliação de achados

---

## 2. Cronologia e escopo de cada documento

### D1 — `ANALISE_TECNICA_SISTEMA.md` (2026-05-20)

**Escopo:** análise técnica original. 5 achados críticos identificados:
1. ERP API sem autenticação adequada, chave hardcoded
2. RLS permissivo (muitas tabelas sem políticas)
3. CORS wildcard em edge functions
4. Webhook URL hardcoded
5. Cobertura de testes negligenciada

**Status atual:**
- ERP API → PARCIALMENTE CORRIGIDO: PR #80 adicionou Zod validation; `bitrix24-sync` ganhou 3 modos de auth (AUDITORIA_EXAUSTIVA D6 "CRÍTICO"). Mas `MasterAPIPage.tsx` ainda tem chave `sk_live_fast_9283749123847` hardcoded na linha 29 (conforme D10).
- RLS → CORRIGIDO E VERIFICADO: PRs #68, #59, #96 fizeram hardening. D14 confirma 100% das 135 tabelas com RLS habilitado.
- CORS → PARCIALMENTE CORRIGIDO: PR #80 adicionou middleware; wildcard removido do `_shared/auth.ts` (D7 etapa 8).
- Webhook hardcoded → CORRIGIDO E VERIFICADO: substituído por variáveis de ambiente em múltiplas PRs.
- Cobertura de testes → PARCIALMENTE CORRIGIDO: PRs #55–58 adicionaram testes; cobertura chegou a ~35% (meta: 60%).

---

### D2 — `CODE_REVIEW_FINDINGS.md` (2026-05-28)

**Escopo:** code review por Cline + Claude. Achados:
- Zero XSS, SQLi ou secrets detectados
- Dependência `xlsx` com vulnerabilidade confirmada
- Recomendação: migrar para `exceljs`

**Status atual:**
- xlsx → CORRIGIDO E VERIFICADO: PR #30 migrou para `exceljs` (registrado em D3).

---

### D3 — `AUDITORIA_CORRECOES_2026-05-29.md` (2026-05-29, PR #30)

**Escopo:** lista das correções aplicadas em PR #30:
- Toolchain: vite 5→7, correções de build
- jobsService: refatoração
- Telemetria em cascata: corrigida
- Re-renders de context: corrigidos
- Memory leak: corrigido
- xlsx→exceljs: migrado
- Dependências: atualizadas

**Status atual:** CORRIGIDO E VERIFICADO (todas aplicadas ao `main`).

---

### D4/D5 — QA Audit e Simulação de Cenários (2026-06-14)

**Escopo:** auditoria QA e simulação de cenários (pré-consolidação). Não lidos diretamente; referenciados em D6 como base de 30 etapas.

**Status:** NÃO VERIFICADO individualmente — cobertos pela reconciliação geral de D6.

---

### D6 — `AUDITORIA_EXAUSTIVA_2026-07-18.md` (2026-07-18)

**Escopo:** auditoria em 30 etapas (Partes A, B, C). Blocos I–VI cobrindo fundamentos, superfície de ataque, banco, edge functions, lógica de negócio, CI/CD.

**Parte C — O que foi corrigido nesta entrega (2026-07-18):**

| Item | Descrição | Status atual |
|------|-----------|--------------|
| C1 | `search_path` em funções `SECURITY DEFINER` | CORRIGIDO E VERIFICADO (migration `20260718200000`) |
| H1 | `notifications` INSERT `WITH CHECK(true)` | CORRIGIDO E VERIFICADO (migration `20260718200100`) |
| H2/H3 | `prediction_history/operator_rankings/operator_achievements` escritáveis por qualquer autenticado | CORRIGIDO E VERIFICADO (migration `20260718200200`) |
| CRÍTICO | `bitrix24-sync` sem auth (service-role exposta) | CORRIGIDO E VERIFICADO: 3 modos de auth implementados; `edgeFunctionFetch.ts` unificado |
| H1 | `cleanup-security-logs` sem auth | CORRIGIDO E VERIFICADO |
| H2/H3 | `send-tpm-email`/`send-loss-risk-alert` sem auth + HTML não escapado | CORRIGIDO E VERIFICADO (htmlEscape.ts) |
| H4 | `validate-login-ip` aceitava IP enviado pelo cliente | CORRIGIDO E VERIFICADO (IP de headers do proxy) |
| H5 | `check-login-lockout` permitia reset do próprio contador | CORRIGIDO E VERIFICADO (exige JWT do usuário para `record_success`) |

**Achados da D6 ainda pendentes (não corrigidos em Parte C):**

| Item D6 | Situação atual |
|---------|----------------|
| `migrate-helper` com chave fixa e CORS wildcard | CORRIGIDO: removido do deploy (post-mortem 2026-09-10); mas D7 nota que migrations do deploy podiam reimplantá-lo — verificação no banco canônico ainda pendente conforme D7 etapa 2 |
| 3 refs Supabase incompatíveis | PARCIALMENTE CORRIGIDO: `supabase/ENVIRONMENTS.md` documenta; decisão do ref canônico pendente (D7 etapa 5) |
| TPM: `correction_requested` é estado terminal | CONFIRMADO E PENDENTE (D14 seção C) |
| Web Push sem criptografia real | CONFIRMADO E PENDENTE (D14 seção C: `send-push-notification` declara `aes128gcm` mas envia sem criptografia) |
| Peso simulado persistido como real | NÃO VERIFICADO nesta reconciliação |
| TPM marca notificações simuladas como enviadas | CONFIRMADO E PENDENTE (D14 seção C: `tpm-notifications/index.ts:69` tem `// Simular envio`) |
| E2E sem credenciais, retorna 0 testes | CORRIGIDO E VERIFICADO: conta E2E com TOTP verificado; suíte verde na main (PR #104, #108, #109, D15 item 0/1 resolvidos) |
| CSP com `unsafe-inline`/`unsafe-eval` | PARCIALMENTE CORRIGIDO: CSP Report-Only existe; bloqueio pendente (D7 etapa 8) |
| Deploy independente do CI principal | CONFIRMADO E PENDENTE: D14 seção D confirma que deploy.yml dispara sem Quality Gate obrigatório até branch protection ser ativada |

---

### D7 — `docs/plano-mestre-10-10.md` (2026-09-10)

**Escopo:** plano de 100 etapas (blocos A–J) para atingir nota 10/10. Baseline `a82e4fed`.

**Scorecard original:** média ~3,8/10 em 20 dimensões. Piores: Documentação 3,0; Infraestrutura/DevOps 2,5; Banco de dados 3,5.

**Status conforme D14 (auditoria de 7 agentes, 2026-10-28):**

| Bloco | Itens | Implementados | Parciais | Pendentes |
|-------|-------|---------------|----------|-----------|
| Blocos A–E (etapas 1–50) | 50 | 11 | 35 | 4 |
| Blocos F–J (etapas 51–100) | 50 | 11 | 34 | 5 |

**Núcleo de segurança (implementado):** auth dual-header nos crons, ACL de `exec_sql`, geo_blocking_* reconstruído (schema/admin), RLS nas 135 tabelas, CI gates verdes. **"Parciais"** são etapas com base implementada mas endurecimento final pendente (ex.: CSP em Report-Only, MFA AAL2 não imposto server-side por papel para todas as funções).

---

### D8/D9 — `ESTADO_ATUAL.md` e 14 lotes (2026-08-16)

**Escopo:** inventário de 926+ classificações de funcionalidades por domínio. 14 lotes:
- Lote 01: Produção/Jobs
- Lote 02: Analytics/OEE
- Lote 03: Manutenção/Máquinas
- Lote 04: Estoque/Rastreabilidade
- Lote 05: Operadores/Turnos
- Lote 06: Auth/Segurança/RBAC
- Lote 07: Admin/Integrações
- Lote 08: Notificações/Alertas
- Lote 09: Conhecimento/IA
- Lote 10: UX Transversal
- Lote 11: Dados/Schema
- Lote 12: Testes/CI
- Lote 13: Varredura Componentes
- Lote 14: Varredura Features/Lib

**Limitação crítica:** conforme D10, 31% da amostra de ✅ foi refutada pela meta-auditoria adversarial. O ESTADO_ATUAL.md não pode ser usado como fonte de verdade sem cruzar com D10/D11/D12.

---

### D10 — `docs/estado/_meta-00-consolidado.md` (2026-08-16)

**Escopo:** meta-auditoria adversarial do ESTADO_ATUAL.md. Os 5 piores ✅ indevidos com evidência arquivo:linha:

| # | Item marcado como ✅ | Realidade confirmada | Arquivo:linha |
|---|---------------------|----------------------|---------------|
| 1 | `/code-quality` — métricas precisas | Literais hardcoded: `totalPages: 30` (real: 55), `edgeFunctions: 18` (real: 33) | `useCodeQualityMetrics.ts:159-189` |
| 2 | QR Code de job funcional | `JobQRCode.tsx:23` gera URL `/track?q=<n>` mas `QRScanner.tsx:91-95` exige JSON `{type:"job"}` — incompatíveis | Dois arquivos |
| 3 | `/master-api` funcional | 234 linhas sem referência ao Supabase; chave hardcoded `sk_live_fast_9283749123847` na linha 29 | `MasterAPIPage.tsx:29` |
| 4 | Notificações TPM enviadas | `tpm-notifications/index.ts:69`: `// Simular envio`; trigger `send-tpm-email` comentado | `20260508115941.sql:50-53` |
| 5 | `FeatureFlagsContext` funcional | Zero consumidores; hook homônimo em `features/admin/hooks/useFeatureFlags.ts` também morto | Múltiplos |

**Tabelas fantasma (escritas por edge functions sem CREATE TABLE nas migrations):**
- `archived_jobs` — cron-cleanup tenta arquivar nela; não existe
- `backups`, `backup_logs` — backup-scheduler escreve; não existem
- `system_metrics` — metrics-collector escreve; não existe

**Status atual (pós-PRs #112–#116):**
- `/code-quality` hardcoded → CONFIRMADO E PENDENTE (D14 não lista como corrigido)
- QR Code incompatível → PARCIALMENTE CORRIGIDO: PR #114 corrigiu o par gerador↔leitor (D14 seção C lista como corrigido em #114)
- `/master-api` chave hardcoded → CONFIRMADO E PENDENTE (D14 seção D: código morto + dados fabricados)
- TPM notificações simuladas → CONFIRMADO E PENDENTE (D14 seção C)
- `FeatureFlagsContext` morto → CONFIRMADO E PENDENTE (D14 seção D: código morto)
- Tabelas fantasma `archived_jobs`/`backups`/`backup_logs`/`system_metrics` → PARCIALMENTE CORRIGIDO: PR #115 criou as tabelas internas ausentes; verificação do schema real pendente

---

### D11 — `docs/estado/_meta-01-refutacao-verdes.md` (2026-08-16)

**Escopo:** refutação adversarial de ✅ nos lotes 01–04. Amostra de 25 itens.

**Resultado por veredito:**

| Veredito | Itens | Exemplos |
|----------|-------|---------|
| PROCEDE | 17 | Escalamento automático, sequenciamento inteligente, registro de produção, SLA embalagem (9 sub-features), ML predições, ABC custos, calculate-rankings |
| DERRUBADO | 7 | Checklist pré-produção "obrigatório" (pular = concluído), alertas threshold OEE (kpi_alerts sem leitor), logs TPM (simulados), configurações TPM (trigger comentado), heatmap térmico (divisor fixo), QR Code (incompatível), notificações WhatsApp/e-mail TPM |
| PROCEDE COM RESSALVA | 1 | Update TPM (campos quality_checklist_results descartados silenciosamente) |

**Status dos 7 DERRUBADOS:**
- Checklist pré-produção → CONFIRMADO E PENDENTE (D14 seção C: `onSkip` chama `onComplete`)
- Alertas OEE sem leitor → CONFIRMADO E PENDENTE (D14 seção C: `kpi_alerts` sem consumidor)
- Logs TPM simulados → CONFIRMADO E PENDENTE
- Configurações TPM (trigger comentado) → CONFIRMADO E PENDENTE
- Heatmap térmico (divisor fixo 5) → NÃO VERIFICADO pós-#116
- QR Code → PARCIALMENTE CORRIGIDO (PR #114)
- Notificações WhatsApp/e-mail TPM → CONFIRMADO E PENDENTE

---

### D13 — `docs/plano-50-etapas-consolidacao.md` (2026-09-24, PR #54)

**Escopo:** 62 itens planejados para a consolidação pós-auditoria (PRs #67–#116).

**Status conforme D14 (balanço de 7 agentes):**

| Categoria | Itens | Implementados | Parciais | Pendentes | N/A |
|-----------|-------|---------------|----------|-----------|-----|
| plano-50-etapas-260924 + consolidação | 62 | 26 | 9 | 22 | 5 |

---

### D14 — `docs/estado/BALANCO-DOCS-2026-10-28.md` (2026-10-28, PR #112)

**Escopo:** balanço de todos os planos vs. código real. 7 agentes em paralelo sobre main @ `23da9a4` (pós-PRs #78–#111). 547 itens totais.

**Resultado geral:**

| Documento | Implementados | Parciais | Pendentes |
|-----------|---------------|----------|-----------|
| plano-mestre-10-10.md (A–E) | 11/50 | 35/50 | 4/50 |
| plano-mestre-10-10.md (F–J) | 11/50 | 34/50 | 5/50 |
| plano-graphify-50-etapas.md | 28/50 | 17/50 | 5/50 |
| plano-50-etapas-260924 + consolidação | 26/62 | 9/62 | 22/62 |
| docs/estado lotes 01–07 | 16/130 | 46/130 | 65/130 |
| docs/estado lotes 08–14 + metas | 29/100 | 6/100 | 63/100 |
| auditorias legadas + ADRs + PENDENCIAS | 81/105 | 13/105 | 7/105 |
| **Total** | **202/547** | **160/547** | **171/547** |

**O que está 100% fechado e provado (conforme D14):**
- Todos os 6 workflows CI/CD verdes
- Conta E2E com TOTP verificado; suíte E2E autenticada verde
- Auth dual-header nos crons versionados
- `has_role` corrigido (schema privado)
- `geo_blocking_*` reconstruídas com policies CRUD (schema/admin — **sem enforcement em runtime**)
- `complete_maintenance_record` transacional + idempotente
- Pacote de navegação UX (PR #103 + #104 + #110)
- Achados ALTA/CRÍTICA das auditorias jun–jul/2026 quase todos resolvidos

**Pendências agrupadas de D14:**
- **Seção A (Joaquim):** rotação de credenciais (service-role key, DB password — pós post-mortem 2026-09-10); `verify_jwt=false` em bitrix24-sync; PITR/restore, monitor externo/SLOs, branch protection
- **Seção B (bugs pequenos):** corrigidos no PR #113 (CommandPalette rotas mortas, useKPIs UTC→local)
- **Seção C (bugs registrados):** ver seção 3 abaixo
- **Seção D (dívida estrutural):** ver seção 3 abaixo
- **Seção E (N/A):** Twilio/Google Maps — só placeholders por design; itens SUPERADA dos planos antigos

---

### D15 — `PENDENCIAS.md` (2026-10-28, PR #112)

**Escopo:** itens que dependem de ação manual do Joaquim.

| Item | Status em D15 | Status atual |
|------|---------------|--------------|
| 0. Conta E2E | ✅ RESOLVIDO | CORRIGIDO E VERIFICADO |
| 1. Secrets E2E | ✅ RESOLVIDO | CORRIGIDO E VERIFICADO |
| 2. Bitrix OAuth (`verify_jwt=false`) | 🔴 PENDENTE (Joaquim) | CONFIRMADO E PENDENTE |
| 3. PITR/restore/SLOs/monitor externo | 🔴 PENDENTE (Joaquim) | CONFIRMADO E PENDENTE |
| 4. Balanço de docs (item apontando para D14) | — | SUPERADO POR D14 |

**Nota:** `PENDENCIAS.md` foi **deletado** em `fix/pr116-revisao` (commit `0b4c7e24`). O documento original persiste apenas na história do git (commit `3f2dee60`).

---

## 3. Achados consolidados com status de reconciliação

### 3.1 Segurança e Autenticação

| Achado | Origem | Status | Evidência |
|--------|--------|--------|-----------|
| ERP API / `bitrix24-sync` sem auth | D1, D6 | CORRIGIDO E VERIFICADO | 3 modos de auth; edgeFunctionFetch.ts (PR #68+) |
| RLS permissivo | D1 | CORRIGIDO E VERIFICADO | 135 tabelas c/ RLS; hardening PRs #59, #68, #96 |
| CORS wildcard | D1, D7 | PARCIALMENTE CORRIGIDO | `_shared/auth.ts` centralizado; CSP Report-Only (sem bloqueio) |
| Webhook hardcoded | D1 | CORRIGIDO E VERIFICADO | Substituído por env vars |
| `/master-api` chave hardcoded `sk_live_fast_9283749123847` | D10 | CONFIRMADO E PENDENTE | `MasterAPIPage.tsx:29` |
| `check-login-lockout` reset do próprio contador | D6 | CORRIGIDO E VERIFICADO | PR #68 (D6 H5) |
| `validate-login-ip` IP controlado pelo cliente | D6 | CORRIGIDO E VERIFICADO | PR #68 (D6 H4) |
| `cleanup-security-logs` sem auth | D6 | CORRIGIDO E VERIFICADO | D6 H1 |
| `send-tpm-email`/`send-loss-risk-alert` HTML não escapado | D6 | CORRIGIDO E VERIFICADO | htmlEscape.ts |
| `bitrix24-sync verify_jwt=false` necessário p/ OAuth | D15 | CONFIRMADO E PENDENTE | PENDENCIAS.md item 2 |
| Assinatura eletrônica falsa (aceita qualquer senha) | D14 C | CONFIRMADO E PENDENTE | `ElectronicSignatureDialog` — sem validar contra Supabase Auth |
| Geo-blocking sem enforcement em runtime | D14 C | CONFIRMADO E PENDENTE | Nenhuma function consulta `geo_blocking_*` no fluxo de login |
| Allowlist de IP inócua (`validate-login-ip` sem chamador) | D14 C | CONFIRMADO E PENDENTE | Função corrigida (D6 H4) mas desconectada do fluxo de login |
| Bloqueio de IP inócuo (`blocked_ips` sem enforcement) | D14 C | CONFIRMADO E PENDENTE | `BlockedIPsPanel` insere mas `check-login-lockout` não lê `blocked_ips` |
| PermissionManager inócuo (`role_permissions` ignorado) | D14 C | CONFIRMADO E PENDENTE | Autorização real vem de `ROLE_PERMISSIONS` hard-coded |
| `useMFA.unenroll` sem challenge TOTP | D14 C | CONFIRMADO E PENDENTE | Sem validação de fator antes do unenroll |
| Google OAuth bypassa lockout/device-check | D14 D | CONFIRMADO E PENDENTE | Seção D (dívida estrutural) |
| Reset de senha inacessível (RLS `TO authenticated`) | D14 C | CONFIRMADO E PENDENTE | `AuthPage.tsx:135-139` insere como anon; policy exige JWT autenticado |
| Convite de usuário com client publishable (403) | D14 C | CONFIRMADO E PENDENTE | `UserManagement.tsx:142-162` usa supabase.auth.admin com chave errada |

### 3.2 Banco de Dados e Migrations

| Achado | Origem | Status | Evidência |
|--------|--------|--------|-----------|
| Tabelas fantasma `archived_jobs`, `backups`, `backup_logs`, `system_metrics` | D10 | PARCIALMENTE CORRIGIDO | PR #115 criou as tabelas; validação no banco de produção pendente |
| `geo_blocking_*` sem CREATE versionado | D6, D10 | CORRIGIDO E VERIFICADO | Tabelas reconstruídas com policies CRUD (PR #104, migration hardening) |
| `exec_sql` ACL (migration condicional) | D7 etapa 3 | PARCIALMENTE CORRIGIDO | Migration corrigida p/ ser condicional; verificação no banco canônico pendente |
| `search_path` em funções SECURITY DEFINER | D6 C1 | CORRIGIDO E VERIFICADO | migration `20260718200000` |
| `complete_maintenance_record` não idempotente | D6 | CORRIGIDO E VERIFICADO | PR #104 migration `20261019140000` |
| `inventory_movements` — RLS sem policy de escrita | D14 C | CONFIRMADO E PENDENTE | useInventory.ts faz INSERT/DELETE; só policies SELECT existem |
| `cron_job` com literais de GUC (ALTER ROLE negado) | PR #100 | PARCIALMENTE CORRIGIDO | PR #100 foi FECHADO SEM MERGE; estratégia `app_private.runtime_config` proposta mas não aplicada |
| Integridade referencial TPM (`maintenance_records` vs `tpm_executions`) | D7 | NÃO VERIFICADO | Mencionado em D7 achado #8; status pós-PRs não rastreado nesta reconciliação |
| Corrida em `rejected_quantity` (read-modify-write no cliente) | D14 C | CONFIRMADO E PENDENTE | `packagingService.recordDefect:183-193` |
| Troca de papel quebrada (upsert com onConflict errado) | D14 C | CONFIRMADO E PENDENTE | `UserManagement.tsx:103`: onConflict `user_id` vs UNIQUE(user_id, role) |
| Portal público /track sem acesso (anon vs authenticated) | D14 C | CONFIRMADO E PENDENTE | `PublicTrackingPage` com client anon; policy exige authenticated |

### 3.3 Edge Functions e Backend

| Achado | Origem | Status | Evidência |
|--------|--------|--------|-----------|
| `tpm-notifications` — envio simulado | D10, D11 | CONFIRMADO E PENDENTE | `index.ts:69`: `// Simular envio`; trigger comentado em migration |
| Web Push sem criptografia real (RFC 8291/8188) | D7, D14 C | CONFIRMADO E PENDENTE | `send-push-notification` declara `aes128gcm` mas não criptografa |
| `rate-limit-check` e `validate-login-ip` — funções órfãs | D10, D14 C | CONFIRMADO E PENDENTE | Zero chamadores no app (verified por grep) |
| `useAutoBufferPromotion` promove todas as técnicas | D14 C | CONFIRMADO E PENDENTE | `auto-promote-jobs` ignora o body e promove globalmente |
| `useTPMApprovalMutations` — update sem guarda de versão | D14 C | CONFIRMADO E PENDENTE | TOCTOU possível em dupla aprovação |
| Corrida ao assumir tarefa (packagingService.assignToMe) | D14 C | CONFIRMADO E PENDENTE | Não lê o retorno do update; quem perde recebe sucesso falso |
| Ranking de operadores mistura períodos | D14 C | CONFIRMADO E PENDENTE | `useOperatorRankings.ts:26-30` retorna todos os períodos históricos |
| SSE do assistente perde fragmentos | D14 C | CONFIRMADO E PENDENTE | `TechnicalAssistantPage.tsx:100` — buffer incorreto; versão correta não é a roteada |
| Upload de evidência bloqueado por RLS | D14 C | CONFIRMADO E PENDENTE | Policy exige `auth.uid()` como primeiro segmento; path enviado é `execution-alerts/<file>` |
| pdf-generator retorna text/plain em Blob `application/pdf` | D14 C | CONFIRMADO E PENDENTE | Download com extensão errada; "PDF gerado" é falso |

### 3.4 Frontend e UX

| Achado | Origem | Status | Evidência |
|--------|--------|--------|-----------|
| `/code-quality` métricas hardcoded | D10 | CONFIRMADO E PENDENTE | `useCodeQualityMetrics.ts:159-189`: totalPages=30 (real:55), edgeFunctions=18 (real:33) |
| QR Code gerador↔leitor incompatíveis | D10, D11 | PARCIALMENTE CORRIGIDO | PR #114 corrigiu o par; validação end-to-end não confirmada |
| `FeatureFlagsContext` e hook sem consumidor | D10 | CONFIRMADO E PENDENTE | Zero callers em src/ |
| Checklist pré-produção: pular = concluído | D11, D14 C | CONFIRMADO E PENDENTE | `PreProductionChecklistModal.tsx:27-28` |
| `PreProductionChecklistModal`: "Salvar Parcial" = concluído | D14 C | CONFIRMADO E PENDENTE | Mesmo callback `onComplete` |
| Thresholds com unidade ambígua (% vs minutos) | D14 C | CONFIRMADO E PENDENTE | `TechniqueManagement` vs `useLoadBalancingWithActions` |
| `useMTBFMTTR` assume 24h/dia | D14 C | CONFIRMADO E PENDENTE | Decisão de domínio não documentada |
| `PredictiveHealthCard` multiplica `confidence` por 100 novamente | D14 C | CONFIRMADO E PENDENTE | `PredictiveHealthCard.tsx:88`: confiança de 60% → 6000% |
| `KanbanBoard` escreve `jobs.status` direto (bypass jobsService) | D14 C | CONFIRMADO E PENDENTE | Sem passar pela state machine do service |
| Exportações inertes no calendário | D14 C | CONFIRMADO E PENDENTE | `WeeklyCalendar.tsx:348-349`: handlers `onExportPdf`/`onExportICal` vazios |
| "QR Lote" inerte em TraceabilityPage | D14 C | CONFIRMADO E PENDENTE | `labelLots` setado mas `LotLabelPrint` não renderizado |
| `AutoShiftSummary` sem turno noturno | D14 C | CONFIRMADO E PENDENTE | Apenas dois ramos (Manhã/Tarde); 22h–06h não existe |
| BI de perdas com fallback `produced_quantity || quantity` | D14 C | CONFIRMADO E PENDENTE | 6 arquivos: FuturisticBI, LossesTable, KPIDashboard, MachineComparisonPage, ShiftSummaryCard, shiftReportPdf + bitrix24-sync:667 |
| `buffer_size` da config ignorado pelo auto-promote | D14 C | CONFIRMADO E PENDENTE | `auto-promote-jobs` usa constante própria |
| Thresholds de alerta — 7 dos 8 sem consumidor | D14 C | CONFIRMADO E PENDENTE | Só `bottleneckRiskMinutes` tem consumidor claro |
| `useOperatorRankings` mistura todos os períodos | D14 C | CONFIRMADO E PENDENTE | Leaderboard duplica operadores |
| Resumo de turno errado (turno noturno ausente) | D14 C | CONFIRMADO E PENDENTE | `AutoShiftSummary`: 22h–24h aparece como Tarde |
| "Verificar Alertas" analisa só 10 máquinas (MAX_BATCH_SIZE) | D14 C | CONFIRMADO E PENDENTE | `useTPMAlertMutations.ts:70-75`; ~42 máquinas nunca analisadas |
| Breadcrumbs para rotas inexistentes | D14 C | CORRIGIDO E VERIFICADO | PR #104 (corrigido `/calendar`, `/integrations`, `/admin`) |
| BackButton — dirty-guard sem sentinela de dialog | D14 C | CORRIGIDO E VERIFICADO | PR #104 |

### 3.5 Código Morto e Dados Fabricados

| Achado | Origem | Status |
|--------|--------|--------|
| `PackagingDashboard` — "Impressoras" fake (ZEBRA faz toast) | D14 C/D | PARCIALMENTE CORRIGIDO: PR #116 informa que não há integração real |
| `PackagingDashboard` — "Gerar Manifesto" inerte | D14 C/D | CORRIGIDO E VERIFICADO: PR #116 gera CSV real |
| `BIAIInsights` — "Simulador Preditivo Deep Learning" (setTimeout + "+28%") | D14 D | CORRIGIDO E VERIFICADO: PR #116 relabels honestos + custo médio real de useABCCosts |
| `SPCDashboard` — "plano IA" com lote aleatório | D14 D | CORRIGIDO E VERIFICADO: PR #116 usa Cp/Cpk/violações reais |
| `AutonomousEventLog` — feed "LIVE" de mensagens enlatadas | D14 D | PARCIALMENTE CORRIGIDO: PR #116 adicionou `DemoDataBadge` |
| `MasterAPIPage` (234 linhas) sem Supabase + chave hardcoded | D10, D14 D | CONFIRMADO E PENDENTE |
| `FuturisticBI`, `VirtualSensorPanel`, `BlockchainIntegrityCard`, etc. (~30 painéis) | D14 D | CONFIRMADO E PENDENTE |
| Código morto: `NotificationCenter`, `FeedbackProvider`, `WebSocketContext`, `SearchContext`, `ThemeContext`, etc. (~50 itens) | D14 D | CONFIRMADO E PENDENTE |
| Autociclos de barrels (25 arquivos importavam o próprio barrel) | D14 D | CORRIGIDO E VERIFICADO: PR #116 reescreveu para paths profundos |
| Ciclo `logger↔supabase client` | D14 D | CORRIGIDO E VERIFICADO: PR #116 importação dinâmica no flushLogs |
| `useLogistics` sync sem checar erro (divergência silenciosa) | D14 D | CORRIGIDO E VERIFICADO: PR #116 |

---

## 4. Contradições entre documentos

| # | Documentos em conflito | Assunto | Resolução |
|---|----------------------|---------|-----------|
| C1 | D7 etapa 2 (🟨 Contida) vs. D14 (100% fechado) | `migrate-helper` removido do deploy | D14 é mais recente e específico; adota-se que o repositório está limpo, mas banco canônico e logs de deploy real não verificados |
| C2 | D7 etapa 3 (🟨 Migration corrigida mas banco pendente) vs. D14 (não menciona `exec_sql`) | ACL de `exec_sql` no banco canônico | CONTRADIÇÃO ABERTA: D7 registra pendência; D14 não confirma resolução — assume-se NÃO VERIFICADO no banco de produção |
| C3 | D8/D9 (926 ✅) vs. D10/D11 (31% derrubados na amostra) | Classificações de funcionalidades | D10/D11 prevalecem: método adversarial com evidência arquivo:linha supera auto-classificação dos lotes |
| C4 | D7 (geo_blocking sem criação versionada — achado crítico) vs. D14 ("tabelas reconstruídas com policies CRUD") | geo_blocking_* | D14 confirma resolução; mas D14 também confirma que **nenhuma function consulta geo_blocking em runtime** — o bloqueio existe no schema mas não é aplicado |
| C5 | D6 Parte C (H4: `validate-login-ip` corrigido) vs. D14 (allowlist de IP inócua) | Allowlist de IP | Sem contradição real: a function foi corrigida (D6) mas nunca conectada ao fluxo de login (D14) — são achados complementares |
| C6 | D7 etapa 7 (MFA AAL2 server-side parcial) vs. PR #104 (validações de auth corrigidas) | Imposição de MFA por papel | CONTRADIÇÃO PARCIAL: `create-operator` exige AAL2; demais edge functions não. PR #104 melhorou auth mas não fechou a imposição universal |

---

## 5. Trabalho anterior recuperado

### 5.1 PR #100 — Fechada sem merge (2026-10-08)

**Título:** `fix(ci): cron jobs com literais + alter function best-effort`

**Problema:** `ALTER ROLE ... SET` negado no Supabase hospedado (`permission denied to set parameter`). PR propôs estratégia alternativa: `app_private.runtime_config` (tabela `key/value`) como fonte dos GUCs de crons; `ALTER FUNCTION ... SET` com `best-effort` (degrada para WARNING se negado).

**Status:** PR fechada sem merge. A estratégia proposta **não foi aplicada**. Os cron jobs podem ainda usar literais de GUC que falham silenciosamente. **Item de backlog ativo.**

### 5.2 Branches Devin não mergeadas

| Branch | Assunto provável |
|--------|-----------------|
| `devin/1790870081-audit-csp` | Auditoria/hardening de CSP |
| `devin/1791372473-migration-repair` | Reparo de migrations |
| `devin/1791466219-db-admin-alter-role` | Relacionado ao PR #100 (ALTER ROLE) |
| `devin/1793268046-divida-estrutural-2` | Segunda rodada de dívida estrutural |

**Nota:** estas branches não foram mergeadas na main e podem conter trabalho relevante. `devin/1793268046-divida-estrutural-2` provavelmente contém continuação do trabalho de PR #115/#116.

### 5.3 Branch local `fix/pr116-revisao` (4 commits à frente de main)

Contém correções dos achados do code review do PR #116, ainda não submetidas como PR:

| Commit | Conteúdo |
|--------|---------|
| `e9a81f36` | `refactor(arch)`: remove autociclos de barrels + ciclo logger-client |
| `bcb730be` | `fix(ui)`: remove fabricações restantes — manifesto real, plano SPC, selos, sync logística |
| `0bdeb306` | `fix(ts)`: alias DbJob→Job nos hooks de drag-drop |
| `0b4c7e24` | `fix(review)`: resolve achados da revisão do #116 (**deletou `PENDENCIAS.md` e `BALANCO-DOCS-2026-10-28.md`**) |

**Atenção:** a deleção de `PENDENCIAS.md` e `BALANCO-DOCS-2026-10-28.md` nesta branch pode ser intencional (supressão de documentação de pendências) ou acidental. Se acidental, esses arquivos devem ser restaurados antes do merge.

---

## 6. Recomendações que permaneceram fora do escopo desta reconciliação

Estas são melhorias identificadas nos documentos mas não implementadas e sem decisão arquitetural registrada. Registradas como backlog:

| # | Item | Origem | Impacto |
|---|------|--------|---------|
| B1 | Estratégia `app_private.runtime_config` para cron GUCs (PR #100 abandonada) | PR #100 | Médio: crons podem falhar silenciosamente |
| B2 | CSP: promover de Report-Only para bloqueio real | D7 etapa 8, D14 D | Alto: XSS mitigado apenas parcialmente |
| B3 | Branch protection com Quality Gate obrigatório | D7, D14 D | Alto: deploy pode rodar sem CI verde |
| B4 | Matriz completa de testes RLS (~137 tabelas) | D7, D14 D | Alto: regressões de segurança não detectadas automaticamente |
| B5 | Cobertura de testes ≥60% (atual ~35%) | D7, D14 D | Médio |
| B6 | `geo_blocking_*` — enforcement em runtime (nenhuma function consulta) | D14 C | Alto: controle de segurança falso |
| B7 | `blocked_ips` + allowlist — enforcement em runtime | D14 C | Alto: controles de segurança falsos |
| B8 | `PermissionManager` — conectar `role_permissions` à autorização real | D14 C | Alto: admin não consegue alterar permissões de fato |
| B9 | Reset de senha acessível para usuário anon (RLS) | D14 C | Alto: fluxo de recuperação quebrado |
| B10 | Portal público `/track` acessível sem login | D14 C | Alto: links de rastreamento não funcionam |
| B11 | `inventory_movements` — policies de INSERT/DELETE | D14 C | Alto: movimentação de estoque inoperante |
| B12 | Web Push com criptografia real (RFC 8291/8188) | D14 C | Alto: push notifications nunca funcionaram |
| B13 | `send-push-notification` criptografia de payload | D14 C | Alto |
| B14 | Convite de usuário com service key (não publishable) | D14 C | Médio: admin não consegue convidar usuários |
| B15 | `useLogistics` propagação de erros | D14 C | Médio: divergência silenciosa entre shipments e jobs |
| B16 | `KanbanBoard` usar jobsService (não escrita direta) | D14 C | Médio: bypass da state machine |
| B17 | `FeatureFlagsContext` — conectar ou remover | D10, D14 D | Baixo |
| B18 | Tabelas de backend ausentes: `shifts/escalas/treinamentos`, `suppliers`, `production_lots.produced_quantity` (escrita) | D14 D | Médio |
| B19 | `pdf-generator` real (atual retorna text/plain) | D14 D | Baixo |
| B20 | `image-optimizer` real | D14 D | Baixo |
| B21 | i18n es-ES: 59 chaves faltando, 32/657 arquivos | D14 D | Baixo |
| B22 | pgTAP + db reset em CI | D14 D | Médio |
| B23 | SBOM/dependabot/license-scan | D14 D | Médio |
| B24 | Branches Devin não mergeadas — revisar e descartar ou completar | — | Médio |

---

## 7. Sumário executivo

**Período coberto:** 2026-05-20 → 2026-10-31 (18 documentos de auditoria, 50 PRs #67–#116).

**Achados graves persistentes (CONFIRMADOS E PENDENTES, impacto direto no negócio):**
1. **Controles de segurança falsos:** geo-blocking, IP allowlist, IP blocklist, PermissionManager — todos têm UI funcional mas nenhum enforcement em runtime.
2. **Reset de senha quebrado:** qualquer tentativa de "Esqueci minha senha" retorna 403.
3. **Portal de rastreamento público inacessível:** `/track` exige autenticação.
4. **Movimentação de estoque inoperante:** INSERT/DELETE em `inventory_movements` bloqueado por RLS.
5. **Assinatura eletrônica bypassável:** aceita qualquer string não-vazia.
6. **Web Push nunca funcionou:** sem criptografia de payload real.
7. **Upload de evidência de alerta bloqueado:** RLS rejeita todos os uploads do fluxo de manutenção.
8. **BI de perdas inflado:** fallback `produced_quantity || quantity` em 6 arquivos + exportação Bitrix.
9. **`/master-api` com chave hardcoded `sk_live_fast_9283749123847`:** código morto com secret real embutido.
10. **`/code-quality` com métricas hardcoded:** totalPages=30 (real:55), edgeFunctions=18 (real:33).

**O que funcionou bem:**
- PRs #68–#116 cobriram sistematicamente os achados críticos de segurança das auditorias de mai–jul/2026.
- Todos os 6 workflows de CI/CD estão verdes.
- Conta E2E operacional com TOTP verificado.
- Auth dual-header, has_role, `bitrix24-sync`, RLS nas 135 tabelas — corrigidos e verificados.
- PR #116 eliminou ciclos de módulo e múltiplas fabricações do dashboard.

**Contradições não resolvidas:** `exec_sql` ACL no banco canônico (D7 vs. D14), MFA AAL2 universal server-side (D7 vs. PR #104).

**Trabalho não mergeado em risco:** PR #100 (estratégia de cron GUCs abandonada); branch `fix/pr116-revisao` com 4 commits à frente de main (deletou documentos de pendências — verificar se intencional).
