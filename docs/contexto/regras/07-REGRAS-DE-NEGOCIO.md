# 07 · REGRAS DE NEGÓCIO

> Gerado automaticamente por AI Context Sync v1.3.2 · commit `dfdb331315` · branch `main` · 2026-11-10 22:54 UTC
> Não edite à mão — regras humanas vão em `manual/`.

> ⚠️ Seções B, C, D e E.1 (RLS, restrições, triggers e colunas de status): **derivado de migrations — pode divergir do banco** (snapshot `docs/contexto/supabase/` não existe nesta execução). Migration é histórico, não estado: antes de confiar numa policy, constraint ou trigger daqui, confirme no banco real (`docs/contexto/supabase/`).

## A. Regras escritas por humanos (`manual/` — prioridade máxima, nunca sobrescrito)

### regras-implementadas-2026-11.md

# Regras de Negócio Implementadas — Nov 2026

Fonte: decisão do dono, implementadas na sessão claude_05/nifty-carson-jdgnem.

---

## Grupo R1 — Ciclo de vida do job

**R1.1 — Bloquear exclusão de job com peças produzidas ou perdidas**
Job não pode ser excluído se `produced_quantity > 0` ou `lost_pieces > 0`, ou se `status` não for `queue`, `scheduled` ou `cancelled`.
Impl: `src/components/jobs/JobDetailsModal.tsx` — botão Excluir desabilitado via `canDelete`.

**R1.2 — Cancelamento exige motivo (DDL pendente)**
Cancelar um job requer preenchimento de `cancel_reason` (texto obrigatório). Requer migration: coluna `cancel_reason TEXT` em `jobs`.
Status: **aguardando dono (DDL)**.

**R1.3 — finished só avança para packaging**
Transição `finished → cancelled` não existe na state machine; job no estado `finished` só avança para `packaging`.
Impl: já enforçado em `src/features/jobs/utils/stateMachine.ts` — sem alteração de código.

**R1.4 — Cancelar job muda packaging para on_hold (DDL pendente)**
Ao cancelar um job, qualquer `packaging_task` associada deve ter status atualizado para `on_hold`.
Status: **aguardando dono (DDL)** — trigger ou lógica de serviço.

**R1.5 — Checklist pré-produção obrigatório**
Botão "Pular checklist" removido de `PreProductionChecklistModal`. Operador deve completar todos os itens.
Impl: `src/components/operator/PreProductionChecklistModal.tsx` — prop `onSkip` removida.

---

## Grupo R2 — SLA

**R2.1–R2.3 — Valores padrão de SLA e auto-reatribuição**
Padrões mantidos: triagem 4h, embalagem 8h, total 24h, warning 75%.
Breach de SLA exige razão mas não bloqueia o fluxo (UI valida mas deixa continuar).
Auto-reatribuição de tarefas ociosas >30 min: **DDL pendente** (pg_cron job).

**R2.4 — Override de SLA restrito a coordenador/gerente**
Criar, editar e excluir overrides de SLA só permite roles `coordinator`, `manager` ou `admin`.
Impl: `src/features/packaging/components/PackagingSlaOverridesManager.tsx` — botões Salvar e Excluir desabilitados via `canManageSla`.

---

## Grupo R3 — Privacidade do cliente

**R3.1 — Operador vê cliente e pedido**
Mantido como está; operador autenticado tem acesso a `client` e `order`.

**R3.2 — Página pública oculta nome do cliente**
Bloco com `{job.client}` removido da rota pública `/tracking`.
Impl: `src/pages/PublicTrackingPage.tsx` — div `tracking.client` removida.

**R3.3 — Caller anônimo nunca vê nome do cliente (DDL pendente)**
RPC functions que retornam dados de job devem ter REVOKE EXECUTE de `anon`.
Status: **aguardando dono (DDL)**.

---

## Grupo R4 — Triagem de defeitos

**R4.1 — Decisão minor/major é do operador**
Mantido como está; operador escolhe livremente entre minor e major.

**R4.2 — Defeito crítico → tarefa on_hold + notificar coordenador**
Ao submeter triagem com `severity === 'critical'`, `packagingService.updateStatus(taskId, 'on_hold')` é chamado antes de registrar o defeito. Toast informa que o coordenador deve ser notificado.
Impl: `src/features/packaging/components/DefectTriageForm.tsx` — `handleFormSubmit`.

**R4.3 — Sem decisão padrão no formulário de defeito**
`defaultValues.decision = 'discard'` removido; campo mostra placeholder "Selecione uma decisão" e é obrigatório.
Impl: `src/features/packaging/components/DefectTriageForm.tsx`.

**R4.4 — accept_with_note exige observação**
Validação Zod adicionada: se `decision === 'accept_with_note'` e `notes` vazio → erro "Observação obrigatória ao aceitar com nota".
Impl: `src/features/packaging/types/packaging.schema.ts` — `superRefine`.

---

## Grupo R5 — Embalagem

**R5.1 — Máximo 30 kg por pacote (DDL pendente)**
CHECK constraint em `packaging_tasks.total_weight_kg / packages_count <= 30`.
Status: **aguardando dono (DDL)**.

**R5.2 — Máximo 500 pacotes por tarefa (DDL pendente)**
CHECK constraint em `packaging_tasks.packages_count <= 500`.
Status: **aguardando dono (DDL)**.

**R5.3 — Perda >5% exige razão (DDL pendente)**
Coluna `loss_reason TEXT` em `packaging_tasks`; validação de negócio quando `rejected_quantity / received_quantity > 0.05`.
Status: **aguardando dono (DDL)**.

**R5.4 — Cadeia de retrabalho limitada a 2 níveis (DDL pendente)**
Trigger DB impede criação de rework job se a cadeia já tem 2 níveis de profundidade.
Status: **aguardando dono (DDL)**.

**R5.5 — Sem lógica de preço na embalagem**
Nenhuma coluna de preço adicionada; regra confirmada como não-escopo.

## B. Quem pode ver/alterar o quê (RLS — derivado de migrations — pode divergir do banco)

> Como ler: políticas **permissive** da mesma tabela e comando somam-se com **OU**; cada **RESTRICTIVE** é um **E** obrigatório por cima delas (sozinha não libera nada). `USING` filtra a linha existente (SELECT/UPDATE/DELETE); `WITH CHECK` valida a linha nova (INSERT/UPDATE). Em `ALL`/`UPDATE` sem `WITH CHECK` o Postgres usa o `USING` também como `WITH CHECK`.

341 política(s) em 131 tabela(s), agrupadas por tabela — lista completa, sem cortes.

| Tabela | Política | Comando | Roles | Modo | USING | WITH CHECK |
|---|---|---|---|---|---|---|
| `abc_activities` | Coordinators can manage activities | ALL | public | permissive | `has_role((select auth.uid()), 'coordinator')` | `has_role((select auth.uid()), 'coordinator')` |
| `abc_activities` | Authenticated users can view activities | SELECT | authenticated | permissive | `true` |  |
| `abc_activity_rates` | Coordinators can manage activity rates | ALL | public | permissive | `has_role((select auth.uid()), 'coordinator')` | `has_role((select auth.uid()), 'coordinator')` |
| `abc_activity_rates` | Active users can view activity rates | SELECT | authenticated | permissive | `EXISTS ( SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND is_active = true )` |  |
| `abc_cost_pools` | Coordinators can manage cost pools | ALL | public | permissive | `has_role((select auth.uid()), 'coordinator')` | `has_role((select auth.uid()), 'coordinator')` |
| `abc_cost_pools` | Active users can view cost pools | SELECT | authenticated | permissive | `EXISTS ( SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND is_active = true )` |  |
| `abc_job_costs` | Coordinators can manage job costs | ALL | public | permissive | `has_role((select auth.uid()), 'coordinator')` | `has_role((select auth.uid()), 'coordinator')` |
| `abc_job_costs` | Active users can view job costs | SELECT | authenticated | permissive | `EXISTS ( SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND is_active = true )` |  |
| `archived_jobs` | Managers and admins can read archived jobs | SELECT | public | permissive | `app_private.has_role(auth.uid(), 'manager'::public.app_role) OR app_private.has_role(auth.uid(), 'admin'::public.app_role)` |  |
| `audit_log` | Deny all changes to audit logs | ALL | public | permissive | `false` | `false` |
| `audit_log` | Coordinators and managers can view audit log | SELECT | authenticated | permissive | `app_private.has_role((SELECT auth.uid()), 'coordinator'::app_role) OR app_private.has_role((SELECT auth.uid()), 'manager'::app_role)` |  |
| `backup_logs` | Managers and admins can read backup logs | SELECT | public | permissive | `app_private.has_role(auth.uid(), 'manager'::public.app_role) OR app_private.has_role(auth.uid(), 'admin'::public.app_role)` |  |
| `bitrix24_field_mappings` | Coordinators can manage mappings | ALL | authenticated | permissive | `has_role(auth.uid(), 'coordinator'::app_role)` | `has_role(auth.uid(), 'coordinator'::app_role)` |
| `bitrix24_field_mappings` | Authenticated users can view field mappings | SELECT | authenticated | permissive | `true` |  |
| `bitrix24_oauth_states` | Service role only access | ALL | public | permissive | `false` | `false` |
| `bitrix24_oauth_tokens` | Service role only access | ALL | public | permissive | `false` | `false` |
| `bitrix24_sync_history` | Coordinators and managers can view sync history | SELECT | public | permissive | `has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'manager'::app_role)` |  |
| `bitrix24_sync_history` | Elevated can insert sync records | INSERT | authenticated | permissive |  | `public.has_role(auth.uid(),'coordinator') OR public.has_role(auth.uid(),'manager') OR public.has_role(auth.uid(),'admin')` |
| `bitrix24_sync_history` | Elevated can update sync records | UPDATE | authenticated | permissive | `public.has_role(auth.uid(),'coordinator') OR public.has_role(auth.uid(),'manager') OR public.has_role(auth.uid(),'admin')` | `public.has_role(auth.uid(),'coordinator') OR public.has_role(auth.uid(),'manager') OR public.has_role(auth.uid(),'admin')` |
| `blocked_ips` | Coordinators can manage blocked IPs | ALL | public | permissive | `has_role((select auth.uid()), 'coordinator')` | `has_role((select auth.uid()), 'coordinator')` |
| `blocked_ips` | Managers can view blocked IPs | SELECT | public | permissive | `has_role((select auth.uid()), 'manager')` |  |
| `business_config` | Configs são visíveis por todos autenticados | SELECT | authenticated | permissive | `true` |  |
| `business_config` | Gestores podem inserir configs | INSERT | authenticated | permissive |  | `app_private.has_role(auth.uid(), 'manager')` |
| `business_config` | Apenas gestores podem atualizar configs | UPDATE | authenticated | permissive | `public.has_role((select auth.uid()), 'manager')` | `public.has_role((select auth.uid()), 'manager')` |
| `chat_messages` | Authenticated users can view chat messages | SELECT | authenticated | permissive | `true` |  |
| `chat_messages` | Authenticated users can send chat messages | INSERT | authenticated | permissive |  | `(select auth.uid()) = sender_id` |
| `chat_messages` | Users can update own messages | UPDATE | authenticated | permissive | `(select auth.uid()) = sender_id` | _= USING_ |
| `cron_health_history` | Coordenadores e gestores leem historico de cron | SELECT | authenticated | permissive | `public.has_role(auth.uid(), 'coordinator') OR public.has_role(auth.uid(), 'manager')` |  |
| `cron_p95_daily` | Coordenadores e gestores leem tendencia p95 | SELECT | authenticated | permissive | `public.has_role(auth.uid(), 'coordinator') OR public.has_role(auth.uid(), 'manager')` |  |
| `csp_violation_reports` | Coordinators and managers can view csp reports | SELECT | public | permissive | `app_private.has_role(auth.uid(), 'coordinator'::app_role) OR app_private.has_role(auth.uid(), 'manager'::app_role) OR app_private.has_role(auth.uid(), 'admin'::app_role)` |  |
| `daily_summaries` | Coordinators can manage summaries | ALL | authenticated | permissive | `has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'manager'::app_role)` | `has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'manager'::app_role)` |
| `daily_summaries` | Active role users can view summaries | SELECT | authenticated | permissive | `EXISTS ( SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND is_active = true )` |  |
| `dashboard_layouts` | Users can view their own dashboard layout | SELECT | public | permissive | `(select auth.uid()) = user_id` |  |
| `dashboard_layouts` | Users can view their own layouts | SELECT | authenticated | permissive | `(select auth.uid()) = user_id` |  |
| `dashboard_layouts` | Users can insert their own dashboard layout | INSERT | public | permissive |  | `(select auth.uid()) = user_id` |
| `dashboard_layouts` | Users can update their own dashboard layout | UPDATE | public | permissive | `(select auth.uid()) = user_id` | _= USING_ |
| `dashboard_presets` | Users can view their own presets | SELECT | public | permissive | `(select auth.uid()) = user_id` |  |
| `dashboard_presets` | Users can create their own presets | INSERT | public | permissive |  | `(select auth.uid()) = user_id` |
| `dashboard_presets` | Users can update their own presets | UPDATE | public | permissive | `(select auth.uid()) = user_id` | _= USING_ |
| `dashboard_presets` | Users can delete their own presets | DELETE | public | permissive | `(select auth.uid()) = user_id` |  |
| `document_versions` | Coordinators can manage versions | ALL | public | permissive | `has_role((select auth.uid()), 'coordinator'::app_role)` | `has_role((select auth.uid()), 'coordinator'::app_role)` |
| `document_versions` | Active roles can view approved document versions | SELECT | authenticated | permissive | `public.has_any_active_role() AND EXISTS ( SELECT 1 FROM public.technical_documents td WHERE td.id = document_versions.document_id AND ( td.status = 'approved' OR app_private.has_role((SELECT auth.uid()), 'coordinator'::app_role) OR app_private.has_role((SELECT auth.uid()), 'manager'::app_role) ) )` |  |
| `edge_health_history` | Coordinators and managers can view edge health | SELECT | authenticated | permissive | `public.has_role(auth.uid(), 'coordinator') OR public.has_role(auth.uid(), 'manager')` |  |
| `efficiency_alert_history` | Active role users can view efficiency alerts | SELECT | authenticated | permissive | `EXISTS ( SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND is_active = true )` |  |
| `efficiency_alert_history` | Elevated can insert efficiency alerts | INSERT | authenticated | permissive |  | `public.has_role(auth.uid(),'coordinator') OR public.has_role(auth.uid(),'manager') OR public.has_role(auth.uid(),'admin')` |
| `efficiency_alert_history` | Elevated can update efficiency alerts | UPDATE | authenticated | permissive | `public.has_role(auth.uid(),'coordinator') OR public.has_role(auth.uid(),'manager') OR public.has_role(auth.uid(),'admin')` | `public.has_role(auth.uid(),'coordinator') OR public.has_role(auth.uid(),'manager') OR public.has_role(auth.uid(),'admin')` |
| `energy_alerts` | Active roles can manage energy alerts | ALL | authenticated | permissive | `public.has_any_active_role()` | `public.has_any_active_role()` |
| `energy_alerts` | Active users can view energy alerts | SELECT | authenticated | permissive | `EXISTS ( SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND is_active = true )` |  |
| `energy_consumption` | Coordinators can manage energy consumption | ALL | public | permissive | `has_role((select auth.uid()), 'coordinator'::app_role)` | `has_role((select auth.uid()), 'coordinator'::app_role)` |
| `energy_consumption` | Active users can view energy consumption | SELECT | authenticated | permissive | `EXISTS ( SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND is_active = true )` |  |
| `energy_targets` | Coordinators can manage energy targets | ALL | public | permissive | `has_role((select auth.uid()), 'coordinator'::app_role)` | `has_role((select auth.uid()), 'coordinator'::app_role)` |
| `energy_targets` | Active users can view energy targets | SELECT | authenticated | permissive | `EXISTS ( SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND is_active = true )` |  |
| `error_logs` | Users can view their own error logs | SELECT | public | permissive | `(select auth.uid()) = user_id` |  |
| `error_logs` | Users can insert error logs | INSERT | public | permissive |  | `(select auth.uid()) IS NOT NULL` |
| `feature_flags` | Apenas administradores gerenciam flags | ALL | authenticated | permissive | `public.has_role((select auth.uid()), 'manager')` | `public.has_role((select auth.uid()), 'manager')` |
| `feature_flags` | Flags visíveis por todos autenticados | SELECT | authenticated | permissive | `true` |  |
| `gamification_rewards` | Active roles can view active rewards | SELECT | authenticated | permissive | `is_active = true AND public.has_any_active_role()` |  |
| `geo_blocking_logs` | Coordinators and managers can view geo logs | SELECT | authenticated | permissive | `app_private.has_role(auth.uid(), 'coordinator'::app_role) OR app_private.has_role(auth.uid(), 'manager'::app_role) OR app_private.has_role(auth.uid(), 'admin'::app_role)` |  |
| `geo_blocking_logs` | Users can insert own log entries | INSERT | authenticated | permissive |  | `user_id = auth.uid() OR user_id IS NULL OR app_private.has_role(auth.uid(),'coordinator'::app_role) OR app_private.has_role(auth.uid(),'manager'::app_role) OR app_private.has_role(auth.uid(),'admin'::app_role)` |
| `geo_blocking_rules` | Coordinators and managers can manage geo rules | ALL | authenticated | permissive | `app_private.has_role(auth.uid(), 'coordinator'::app_role) OR app_private.has_role(auth.uid(), 'manager'::app_role) OR app_private.has_role(auth.uid(), 'admin'::app_role)` | `app_private.has_role(auth.uid(), 'coordinator'::app_role) OR app_private.has_role(auth.uid(), 'manager'::app_role) OR app_private.has_role(auth.uid(), 'admin'::app_role)` |
| `geo_blocking_rules` | Coordinators and managers can view geo blocking rules | SELECT | authenticated | permissive | `has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'manager'::app_role)` |  |
| `geo_blocking_settings` | Coordinators and managers can manage geo settings | ALL | authenticated | permissive | `app_private.has_role(auth.uid(), 'coordinator'::app_role) OR app_private.has_role(auth.uid(), 'manager'::app_role) OR app_private.has_role(auth.uid(), 'admin'::app_role)` | `app_private.has_role(auth.uid(), 'coordinator'::app_role) OR app_private.has_role(auth.uid(), 'manager'::app_role) OR app_private.has_role(auth.uid(), 'admin'::app_role)` |
| `geo_blocking_settings` | Coordinators and managers can view geo settings | SELECT | authenticated | permissive | `has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'manager'::app_role)` |  |
| `inventory_items` | Inventory items managed by managers/coordinators | ALL | authenticated | permissive | `public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'manager'::app_role) OR public.has_role(auth.uid(), 'coordinator'::app_role)` | `public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'manager'::app_role) OR public.has_role(auth.uid(), 'coordinator'::app_role)` |
| `inventory_items` | Active roles can view inventory items | SELECT | authenticated | permissive | `public.has_any_active_role()` |  |
| `inventory_movements` | Active roles can view inventory movements | SELECT | authenticated | permissive | `public.has_any_active_role()` |  |
| `ip_allowlist` | Coordinators can manage IP allowlist | ALL | public | permissive | `has_role((select auth.uid()), 'coordinator')` | `has_role((select auth.uid()), 'coordinator')` |
| `ip_allowlist` | Coordinators can view IP allowlist | SELECT | public | permissive | `has_role((select auth.uid()), 'coordinator') OR has_role((select auth.uid()), 'manager')` |  |
| `job_status_audit` | Deny direct client writes to job_status_audit | ALL | authenticated, anon | permissive | `false` | `false` |
| `job_status_audit` | Staff can view job status audit | SELECT | authenticated | permissive | `public.has_role((SELECT auth.uid()), 'coordinator'::app_role) OR public.has_role((SELECT auth.uid()), 'manager'::app_role)` |  |
| `job_status_history` | Authenticated users can view job status history | SELECT | authenticated | permissive | `true` |  |
| `jobs` | Authenticated users can view jobs | SELECT | authenticated | permissive | `true` |  |
| `jobs` | Authenticated users can insert jobs | INSERT | public | permissive |  | `(select auth.uid()) IS NOT NULL` |
| `jobs` | Coordinators and managers can insert jobs | INSERT | public | permissive |  | `has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'manager'::app_role)` |
| `jobs` | Coordinators and managers can update jobs | UPDATE | public | permissive | `has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'manager'::app_role)` | _= USING_ |
| `jobs` | Operators can update jobs on assigned machines | UPDATE | authenticated | permissive | `has_role(auth.uid(), 'operator'::app_role) AND machine_id IN ( SELECT machine_id FROM public.operator_machines WHERE operator_id = auth.uid() )` | _= USING_ |
| `jobs` | Coordinators and managers can delete jobs | DELETE | public | permissive | `has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'manager'::app_role)` |  |
| `kpi_alerts` | Admins can view all alerts | SELECT | authenticated | permissive | `public.has_role((select auth.uid()), 'admin') OR public.has_role((select auth.uid()), 'manager')` |  |
| `login_audit` | Coordinators can view all login audit | SELECT | public | permissive | `has_role(auth.uid(), 'coordinator') OR has_role(auth.uid(), 'manager')` |  |
| `login_audit` | Users can view own login audit | SELECT | public | permissive | `(select auth.uid()) = user_id` |  |
| `login_audit` | Authenticated can insert audit records | INSERT | authenticated | permissive |  | `auth.uid() IS NOT NULL` |
| `login_audit` | Users can insert own log entries | INSERT | authenticated | permissive |  | `user_id = auth.uid() OR public.has_role(auth.uid(),'coordinator') OR public.has_role(auth.uid(),'manager') OR public.has_role(auth.uid(),'admin')` |
| `login_lockouts` | Service role only | ALL | public | permissive | `false` | _= USING_ |
| `lot_components` | Coordinators can manage lot components | ALL | public | permissive | `has_role((select auth.uid()), 'coordinator'::app_role) OR has_role((select auth.uid()), 'manager'::app_role)` | `has_role((select auth.uid()), 'coordinator'::app_role) OR has_role((select auth.uid()), 'manager'::app_role)` |
| `lot_components` | Active users can view lot components | SELECT | authenticated | permissive | `EXISTS ( SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND is_active = true )` |  |
| `lot_movements` | Active users can view lot movements | SELECT | authenticated | permissive | `EXISTS ( SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND is_active = true )` |  |
| `lot_movements` | Active roles can insert movements | INSERT | authenticated | permissive |  | `public.has_any_active_role()` |
| `lot_quality_inspections` | Active roles can manage inspections | ALL | authenticated | permissive | `public.has_any_active_role()` | `public.has_any_active_role()` |
| `lot_quality_inspections` | Coordinators can manage quality inspections | ALL | authenticated | permissive | `public.has_role(auth.uid(), 'coordinator')` | `public.has_role(auth.uid(), 'coordinator')` |
| `lot_quality_inspections` | Active users can view quality inspections | SELECT | authenticated | permissive | `EXISTS ( SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND is_active = true )` |  |
| `machine_downtime` | Active roles can manage machine downtime | ALL | authenticated | permissive | `public.has_any_active_role()` | `public.has_any_active_role()` |
| `machine_downtime` | Authenticated users can view machine downtime | SELECT | authenticated | permissive | `true` |  |
| `machine_event_audit` | Staff can view machine event audit | SELECT | authenticated | permissive | `public.has_role((SELECT auth.uid()), 'coordinator'::app_role) OR public.has_role((SELECT auth.uid()), 'manager'::app_role)` |  |
| `machine_health_metrics` | Only coordinators can manage health metrics | ALL | public | permissive | `public.has_role(auth.uid(), 'coordinator') OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'admin')` | `public.has_role(auth.uid(), 'coordinator') OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'admin')` |
| `machine_health_metrics` | Active users can view health metrics | SELECT | authenticated | permissive | `EXISTS ( SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND is_active = true )` |  |
| `machine_predictions` | Only coordinators can manage predictions | ALL | public | permissive | `public.has_role(auth.uid(), 'coordinator') OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'admin')` | `public.has_role(auth.uid(), 'coordinator') OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'admin')` |
| `machine_predictions` | Active users can view predictions | SELECT | authenticated | permissive | `EXISTS ( SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND is_active = true )` |  |
| `machine_predictions` | Authenticated users can insert machine_predictions | INSERT | public | permissive |  | `(select auth.uid()) IS NOT NULL` |
| `machines` | Coordinators can manage machines | ALL | authenticated | permissive | `has_role(auth.uid(), 'coordinator'::app_role)` | `has_role(auth.uid(), 'coordinator'::app_role)` |
| `machines` | Authenticated users can view machines | SELECT | authenticated | permissive | `true` |  |
| `maintenance_alerts` | Active users can view maintenance alerts | SELECT | authenticated | permissive | `EXISTS ( SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND is_active = true )` |  |
| `maintenance_alerts` | Elevated can insert maintenance alerts | INSERT | authenticated | permissive |  | `public.has_role(auth.uid(),'coordinator') OR public.has_role(auth.uid(),'manager') OR public.has_role(auth.uid(),'admin')` |
| `maintenance_alerts` | Elevated can update maintenance alerts | UPDATE | authenticated | permissive | `public.has_role(auth.uid(),'coordinator') OR public.has_role(auth.uid(),'manager') OR public.has_role(auth.uid(),'admin')` | `public.has_role(auth.uid(),'coordinator') OR public.has_role(auth.uid(),'manager') OR public.has_role(auth.uid(),'admin')` |
| `maintenance_checklist_items` | Coordinators can manage checklist items | ALL | public | permissive | `has_role((select auth.uid()), 'coordinator')` | `has_role((select auth.uid()), 'coordinator')` |
| `maintenance_checklist_items` | Authenticated users can view maintenance checklist items | SELECT | authenticated | permissive | `true` |  |
| `maintenance_checklists` | Coordinators can manage maintenance checklists | ALL | public | permissive | `has_role((select auth.uid()), 'coordinator')` | `has_role((select auth.uid()), 'coordinator')` |
| `maintenance_checklists` | Authenticated users can view maintenance checklists | SELECT | authenticated | permissive | `true` |  |
| `maintenance_item_responses` | Active roles can manage item responses | ALL | authenticated | permissive | `public.has_any_active_role()` | `public.has_any_active_role()` |
| `maintenance_item_responses` | Active users can view item responses | SELECT | authenticated | permissive | `EXISTS ( SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND is_active = true )` |  |
| `maintenance_records` | Active users can view maintenance records | SELECT | authenticated | permissive | `EXISTS ( SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND is_active = true )` |  |
| `maintenance_records` | Active roles can insert maintenance records | INSERT | authenticated | permissive |  | `public.has_any_active_role()` |
| `maintenance_records` | Owner or elevated can update maintenance records | UPDATE | authenticated | permissive | `performed_by = auth.uid() OR approver_id = auth.uid() OR public.has_role(auth.uid(),'coordinator') OR public.has_role(auth.uid(),'manager') OR public.has_role(auth.uid(),'admin')` | `performed_by = auth.uid() OR approver_id = auth.uid() OR public.has_role(auth.uid(),'coordinator') OR public.has_role(auth.uid(),'manager') OR public.has_role(auth.uid(),'admin')` |
| `maintenance_schedules` | Admins can manage maintenance schedules | ALL | public | permissive | `app_private.has_role(auth.uid(), 'admin'::public.app_role)` | `app_private.has_role(auth.uid(), 'admin'::public.app_role)` |
| `maintenance_schedules` | Coordinators can manage maintenance schedules | ALL | public | permissive | `has_role((select auth.uid()), 'coordinator')` | `has_role((select auth.uid()), 'coordinator')` |
| `maintenance_schedules` | Managers can manage maintenance schedules | ALL | public | permissive | `app_private.has_role(auth.uid(), 'manager'::public.app_role)` | `app_private.has_role(auth.uid(), 'manager'::public.app_role)` |
| `maintenance_schedules` | Authenticated users can view maintenance schedules | SELECT | authenticated | permissive | `true` |  |
| `maintenance_types` | Coordinators can manage maintenance types | ALL | public | permissive | `has_role((select auth.uid()), 'coordinator')` | `has_role((select auth.uid()), 'coordinator')` |
| `maintenance_types` | Authenticated users can view maintenance types | SELECT | authenticated | permissive | `true` |  |
| `materials` | Coordinators can manage materials | ALL | public | permissive | `has_role((select auth.uid()), 'coordinator')` | `has_role((select auth.uid()), 'coordinator')` |
| `materials` | Authenticated users can view materials | SELECT | authenticated | permissive | `true` |  |
| `new_device_alerts` | Users can view their own alerts | SELECT | public | permissive | `(select auth.uid()) = user_id` |  |
| `new_device_alerts` | Authenticated can insert device alerts | INSERT | authenticated | permissive |  | `auth.uid() = user_id` |
| `new_device_alerts` | Authenticated can update device alerts | UPDATE | authenticated | permissive | `auth.uid() = user_id` | _= USING_ |
| `operator_achievements` | Coordinators can manage achievements | ALL | authenticated | permissive | `public.has_role(auth.uid(), 'coordinator')` | `public.has_role(auth.uid(), 'coordinator')` |
| `operator_achievements` | Only coordinators can manage achievements | ALL | public | permissive | `public.has_role(auth.uid(), 'coordinator') OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'admin')` | `public.has_role(auth.uid(), 'coordinator') OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'admin')` |
| `operator_achievements` | Active users can view operator achievements | SELECT | authenticated | permissive | `EXISTS ( SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND is_active = true )` |  |
| `operator_goals` | Coordinators can manage operator goals | ALL | public | permissive | `has_role(auth.uid(), 'coordinator'::app_role)` | `has_role(auth.uid(), 'coordinator'::app_role)` |
| `operator_goals` | Active users can view operator goals | SELECT | authenticated | permissive | `EXISTS ( SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND is_active = true )` |  |
| `operator_machines` | Coordinators can manage operator machines | ALL | public | permissive | `has_role(auth.uid(), 'coordinator'::app_role)` | `has_role(auth.uid(), 'coordinator'::app_role)` |
| `operator_machines` | Active users can view operator machines | SELECT | authenticated | permissive | `EXISTS ( SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND is_active = true )` |  |
| `operator_rankings` | Coordinators can manage rankings | ALL | authenticated | permissive | `public.has_role(auth.uid(), 'coordinator')` | `public.has_role(auth.uid(), 'coordinator')` |
| `operator_rankings` | Only coordinators can manage rankings | ALL | public | permissive | `public.has_role(auth.uid(), 'coordinator') OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'admin')` | `public.has_role(auth.uid(), 'coordinator') OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'admin')` |
| `operator_rankings` | Active users can view operator rankings | SELECT | authenticated | permissive | `EXISTS ( SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND is_active = true )` |  |
| `operator_skills` | Coordinators can manage operator skills | ALL | public | permissive | `public.has_role((select auth.uid()), 'coordinator')` | _= USING_ |
| `operator_skills` | Authenticated users can view operator skills | SELECT | authenticated | permissive | `true` |  |
| `operator_skills` | Authenticated users can insert operator_skills | INSERT | public | permissive |  | `(select auth.uid()) IS NOT NULL` |
| `operator_status_audit` | Coordinators can view operator audit logs | SELECT | public | permissive | `has_role(auth.uid(), 'coordinator') OR has_role(auth.uid(), 'manager')` |  |
| `operator_status_audit` | Coordinators can insert operator audit logs | INSERT | public | permissive |  | `has_role(auth.uid(), 'coordinator')` |
| `packaging_checklist_items` | checklist_items_manage | ALL | authenticated | permissive | `public.has_role(auth.uid(), 'coordinator') OR public.has_role(auth.uid(), 'manager')` | `public.has_role(auth.uid(), 'coordinator') OR public.has_role(auth.uid(), 'manager')` |
| `packaging_checklist_items` | checklist_items_read | SELECT | authenticated | permissive | `public.has_any_active_role()` |  |
| `packaging_defects` | Authorized defect management | ALL | authenticated | permissive | `EXISTS ( SELECT 1 FROM public.packaging_tasks WHERE id = packaging_task_id AND (assigned_to = auth.uid() OR public.has_role(auth.uid(), 'coordinator')) )` | _= USING_ |
| `packaging_defects` | Staff manage all defects | ALL | authenticated | permissive | `public.has_role(auth.uid(), 'coordinator') OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'admin')` | `public.has_role(auth.uid(), 'coordinator') OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'admin')` |
| `packaging_defects` | Anyone can see defects | SELECT | authenticated | permissive | `true` |  |
| `packaging_defects` | Operators view defects of accessible tasks | SELECT | authenticated | permissive | `public.has_any_active_role() AND EXISTS ( SELECT 1 FROM public.packaging_tasks t WHERE t.id = packaging_defects.packaging_task_id AND (t.assigned_to IS NULL OR t.assigned_to = auth.uid()) )` |  |
| `packaging_defects` | Operators insert defects on their tasks | INSERT | authenticated | permissive |  | `public.has_role(auth.uid(), 'operator') AND reported_by = auth.uid() AND EXISTS ( SELECT 1 FROM public.packaging_tasks t WHERE t.id = packaging_task_id AND (t.assigned_to IS NULL OR t.assigned_to = auth.uid()) )` |
| `packaging_settings` | Staff manage settings | ALL | authenticated | permissive | `public.has_role(auth.uid(), 'coordinator') OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'admin')` | `public.has_role(auth.uid(), 'coordinator') OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'admin')` |
| `packaging_settings` | All active users read settings | SELECT | authenticated | permissive | `public.has_any_active_role()` |  |
| `packaging_sla_overrides` | packaging_sla_overrides_select_authenticated | SELECT | authenticated | permissive | `public.has_any_active_role()` |  |
| `packaging_sla_overrides` | packaging_sla_overrides_insert_coord | INSERT | authenticated | permissive |  | `public.has_role(auth.uid(), 'coordinator') OR public.has_role(auth.uid(), 'manager')` |
| `packaging_sla_overrides` | packaging_sla_overrides_update_coord | UPDATE | authenticated | permissive | `public.has_role(auth.uid(), 'coordinator') OR public.has_role(auth.uid(), 'manager')` | `public.has_role(auth.uid(), 'coordinator') OR public.has_role(auth.uid(), 'manager')` |
| `packaging_sla_overrides` | packaging_sla_overrides_delete_coord | DELETE | authenticated | permissive | `public.has_role(auth.uid(), 'coordinator') OR public.has_role(auth.uid(), 'manager')` |  |
| `packaging_task_checklist` | pkg_task_checklist_write | ALL | authenticated | permissive | `public.has_role(auth.uid(), 'coordinator') OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'operator')` | `public.has_role(auth.uid(), 'coordinator') OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'operator')` |
| `packaging_task_checklist` | pkg_task_checklist_read | SELECT | authenticated | permissive | `public.has_any_active_role()` |  |
| `packaging_tasks` | Staff manage all packaging tasks | ALL | authenticated | permissive | `public.has_role(auth.uid(), 'coordinator') OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'admin')` | `public.has_role(auth.uid(), 'coordinator') OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'admin')` |
| `packaging_tasks` | Operators view unassigned or own packaging tasks | SELECT | authenticated | permissive | `public.has_any_active_role() AND (assigned_to IS NULL OR assigned_to = auth.uid())` |  |
| `packaging_tasks` | Operators update their own packaging tasks | UPDATE | authenticated | permissive | `public.has_role(auth.uid(), 'operator') AND (assigned_to IS NULL OR assigned_to = auth.uid())` | `public.has_role(auth.uid(), 'operator') AND (assigned_to IS NULL OR assigned_to = auth.uid())` |
| `password_reset_requests` | Coordinators and managers can view all requests | SELECT | public | permissive | `has_role((select auth.uid()), 'coordinator') OR has_role((select auth.uid()), 'manager')` |  |
| `password_reset_requests` | Anyone can request password reset | INSERT | anon, authenticated | permissive |  | `status = 'pending'` |
| `password_reset_requests` | Coordinators and managers can update requests | UPDATE | authenticated | permissive | `app_private.has_role(auth.uid(),'coordinator') OR app_private.has_role(auth.uid(),'manager')` | `app_private.has_role(auth.uid(),'coordinator') OR app_private.has_role(auth.uid(),'manager')` |
| `password_reset_requests` | Coordinators can update password reset requests | UPDATE | authenticated | permissive | `public.has_role((select auth.uid()), 'coordinator')` | `public.has_role((select auth.uid()), 'coordinator')` |
| `pre_production_checklists` | Anyone can view checklists | SELECT | authenticated | permissive | `true` |  |
| `pre_production_checklists` | Active roles can insert pre-prod checklists | INSERT | authenticated | permissive |  | `public.has_any_active_role()` |
| `pre_production_checklists` | Active roles can update pre-prod checklists | UPDATE | authenticated | permissive | `public.has_any_active_role()` | `public.has_any_active_role()` |
| `prediction_history` | Coordinators can manage prediction history | ALL | authenticated | permissive | `public.has_role(auth.uid(), 'coordinator')` | `public.has_role(auth.uid(), 'coordinator')` |
| `prediction_history` | Only coordinators can manage prediction history | ALL | public | permissive | `public.has_role(auth.uid(), 'coordinator') OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'admin')` | `public.has_role(auth.uid(), 'coordinator') OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'admin')` |
| `prediction_history` | Active users can view prediction history | SELECT | authenticated | permissive | `EXISTS ( SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND is_active = true )` |  |
| `product_categories` | Coordinators can manage product categories | ALL | public | permissive | `has_role((select auth.uid()), 'coordinator')` | `has_role((select auth.uid()), 'coordinator')` |
| `product_categories` | Authenticated users can view product categories | SELECT | authenticated | permissive | `true` |  |
| `production_losses` | Authenticated users can view production losses | SELECT | authenticated | permissive | `true` |  |
| `production_losses` | Active roles can insert losses | INSERT | authenticated | permissive |  | `public.has_any_active_role()` |
| `production_losses` | Authenticated users can insert production_losses | INSERT | public | permissive |  | `(select auth.uid()) IS NOT NULL` |
| `production_lots` | Coordinators can manage production lots | ALL | public | permissive | `has_role((select auth.uid()), 'coordinator'::app_role) OR has_role((select auth.uid()), 'manager'::app_role)` | `has_role((select auth.uid()), 'coordinator'::app_role) OR has_role((select auth.uid()), 'manager'::app_role)` |
| `production_lots` | Active users can view production lots | SELECT | authenticated | permissive | `EXISTS ( SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND is_active = true )` |  |
| `profiles` | Coordinators can view all profiles | SELECT | public | permissive | `has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'manager'::app_role)` |  |
| `profiles` | Users can view own profile | SELECT | public | permissive | `(select auth.uid()) = id` |  |
| `profiles` | Users view own profile or staff view all | SELECT | authenticated | permissive | `id = (SELECT auth.uid()) OR public.has_role((SELECT auth.uid()), 'coordinator'::app_role) OR public.has_role((SELECT auth.uid()), 'manager'::app_role) OR public.has_role((SELECT auth.uid()), 'admin'::app_role)` |  |
| `profiles` | Users can insert own profile | INSERT | public | permissive |  | `(select auth.uid()) = id` |
| `profiles` | Users can update own profile | UPDATE | public | permissive | `(select auth.uid()) = id` | _= USING_ |
| `profiles` | Users can update their own profile | UPDATE | public | permissive | `(select auth.uid()) = id` | _= USING_ |
| `push_notifications` | Users can view their own notifications | SELECT | public | permissive | `auth.uid() = user_id` |  |
| `push_notifications` | Users can insert own notifications | INSERT | authenticated | permissive |  | `user_id = auth.uid() OR public.has_role(auth.uid(),'coordinator') OR public.has_role(auth.uid(),'manager') OR public.has_role(auth.uid(),'admin')` |
| `push_notifications` | Users can update their own notifications | UPDATE | public | permissive | `(select auth.uid()) = user_id` | `(select auth.uid()) = user_id` |
| `push_notifications` | Users can delete their own notifications | DELETE | public | permissive | `(select auth.uid()) = user_id` |  |
| `push_subscriptions` | Users can manage their own subscriptions | ALL | public | permissive | `auth.uid() = user_id` | `auth.uid() = user_id` |
| `qr_scan_history` | Authenticated users can view scan history | SELECT | authenticated | permissive | `true` |  |
| `qr_scan_history` | Users can insert their own scans | INSERT | authenticated | permissive |  | `auth.uid() = operator_id` |
| `query_telemetry` | Coordinators and managers can view telemetry | SELECT | authenticated | permissive | `has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'manager'::app_role)` |  |
| `query_telemetry` | Authenticated can insert telemetry | INSERT | authenticated | permissive |  | `auth.uid() IS NOT NULL` |
| `query_telemetry` | Users can insert own log entries | INSERT | authenticated | permissive |  | `user_id = auth.uid() OR user_id IS NULL OR public.has_role(auth.uid(),'coordinator') OR public.has_role(auth.uid(),'manager') OR public.has_role(auth.uid(),'admin')` |
| `query_telemetry` | Coordinators can delete telemetry | DELETE | authenticated | permissive | `has_role(auth.uid(), 'coordinator'::app_role)` |  |
| `rate_limit_logs` | Coordinators and managers can view rate limit logs | SELECT | public | permissive | `has_role((select auth.uid()), 'coordinator') OR has_role((select auth.uid()), 'manager')` |  |
| `rate_limit_logs` | Authenticated can insert rate limit logs | INSERT | authenticated | permissive |  | `auth.uid() IS NOT NULL` |
| `rate_limit_logs` | Users can insert own log entries | INSERT | authenticated | permissive |  | `user_id = auth.uid() OR user_id IS NULL OR public.has_role(auth.uid(),'coordinator') OR public.has_role(auth.uid(),'manager') OR public.has_role(auth.uid(),'admin')` |
| `rate_limit_settings` | Coordinators can manage rate limit settings | ALL | public | permissive | `has_role((select auth.uid()), 'coordinator')` | `has_role((select auth.uid()), 'coordinator')` |
| `rate_limit_settings` | Managers can view rate limit settings | SELECT | public | permissive | `has_role((select auth.uid()), 'manager')` |  |
| `report_templates` | Users can view their own templates | SELECT | public | permissive | `(select auth.uid()) = user_id OR is_public = true` |  |
| `report_templates` | Users can create their own templates | INSERT | public | permissive |  | `(select auth.uid()) = user_id` |
| `report_templates` | Users can update their own templates | UPDATE | public | permissive | `(select auth.uid()) = user_id` | _= USING_ |
| `report_templates` | Users can delete their own templates | DELETE | public | permissive | `(select auth.uid()) = user_id` |  |
| `reward_redemptions` | Users can view their redemptions | SELECT | public | permissive | `(select auth.uid()) = user_id` |  |
| `reward_redemptions` | Users can create redemptions | INSERT | public | permissive |  | `(select auth.uid()) = user_id` |
| `rls_test_results` | Allow authenticated to view test results | SELECT | authenticated | permissive | `true` |  |
| `role_permissions` | Coordinators can manage permissions | ALL | public | permissive | `has_role(auth.uid(), 'coordinator')` | `has_role(auth.uid(), 'coordinator')` |
| `role_permissions` | Authenticated users can view permissions | SELECT | authenticated | permissive | `true` |  |
| `security_events` | Coordinators and managers can view security events | SELECT | public | permissive | `has_role((select auth.uid()), 'coordinator') OR has_role((select auth.uid()), 'manager')` |  |
| `security_events` | Authenticated can insert security events | INSERT | authenticated | permissive |  | `auth.uid() IS NOT NULL` |
| `security_events` | Users can insert own log entries | INSERT | authenticated | permissive |  | `user_id = auth.uid() OR public.has_role(auth.uid(),'coordinator') OR public.has_role(auth.uid(),'manager') OR public.has_role(auth.uid(),'admin')` |
| `shift_checklist_templates` | Coordinators can manage templates | ALL | public | permissive | `has_role((select auth.uid()), 'coordinator'::app_role)` | `has_role((select auth.uid()), 'coordinator'::app_role)` |
| `shift_checklist_templates` | Active users can view shift templates | SELECT | authenticated | permissive | `EXISTS ( SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND is_active = true )` |  |
| `shift_checklist_templates` | Authenticated users can view shift checklist templates | SELECT | authenticated | permissive | `true` |  |
| `shift_handover_checklist` | Active roles can manage handover checklist | ALL | authenticated | permissive | `public.has_any_active_role()` | `public.has_any_active_role()` |
| `shift_handover_checklist` | Coordinators can manage shift handover checklist | ALL | authenticated | permissive | `public.has_role(auth.uid(), 'coordinator')` | `public.has_role(auth.uid(), 'coordinator')` |
| `shift_handover_checklist` | Active users can view shift handover checklist | SELECT | authenticated | permissive | `EXISTS ( SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND is_active = true )` |  |
| `shift_handovers` | Active users can view shift handovers | SELECT | authenticated | permissive | `EXISTS ( SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND is_active = true )` |  |
| `shift_handovers` | Authenticated users can create handovers | INSERT | public | permissive |  | `(select auth.uid()) IS NOT NULL` |
| `shift_handovers` | Operators can update their handovers | UPDATE | public | permissive | `outgoing_operator_id = auth.uid() OR incoming_operator_id = auth.uid() OR has_role(auth.uid(), 'coordinator'::app_role)` | _= USING_ |
| `shift_occurrences` | Active roles can manage occurrences | ALL | authenticated | permissive | `public.has_any_active_role()` | `public.has_any_active_role()` |
| `shift_occurrences` | Active roles can view shift occurrences | SELECT | authenticated | permissive | `public.has_any_active_role()` |  |
| `shift_occurrences` | Active users can view shift occurrences | SELECT | authenticated | permissive | `EXISTS ( SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND is_active = true )` |  |
| `shift_occurrences` | Handover participants can insert occurrences | INSERT | authenticated | permissive |  | `EXISTS (SELECT 1 FROM public.shift_handovers h WHERE h.id = handover_id AND (h.outgoing_operator_id = auth.uid() OR h.incoming_operator_id = auth.uid())) OR public.has_role(auth.uid(),'coordinator') OR public.has_role(auth.uid(),'manager') OR public.has_role(auth.uid(),'admin')` |
| `shift_occurrences` | Handover participants can update occurrences | UPDATE | authenticated | permissive | `EXISTS (SELECT 1 FROM public.shift_handovers h WHERE h.id = handover_id AND (h.outgoing_operator_id = auth.uid() OR h.incoming_operator_id = auth.uid())) OR public.has_role(auth.uid(),'coordinator') OR public.has_role(auth.uid(),'manager') OR public.has_role(auth.uid(),'admin')` | `EXISTS (SELECT 1 FROM public.shift_handovers h WHERE h.id = handover_id AND (h.outgoing_operator_id = auth.uid() OR h.incoming_operator_id = auth.uid())) OR public.has_role(auth.uid(),'coordinator') OR public.has_role(auth.uid(),'manager') OR public.has_role(auth.uid(),'admin')` |
| `shift_occurrences` | Elevated can delete occurrences | DELETE | authenticated | permissive | `public.has_role(auth.uid(),'coordinator') OR public.has_role(auth.uid(),'manager') OR public.has_role(auth.uid(),'admin')` |  |
| `shift_pending_tasks` | Active roles can manage pending tasks | ALL | authenticated | permissive | `public.has_any_active_role()` | `public.has_any_active_role()` |
| `shift_pending_tasks` | Coordinators can manage shift pending tasks | ALL | authenticated | permissive | `public.has_role(auth.uid(), 'coordinator')` | `public.has_role(auth.uid(), 'coordinator')` |
| `shift_pending_tasks` | Active roles can view shift pending tasks | SELECT | authenticated | permissive | `public.has_any_active_role()` |  |
| `shift_pending_tasks` | Active users can view pending tasks | SELECT | authenticated | permissive | `EXISTS ( SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND is_active = true )` |  |
| `shift_pending_tasks` | Handover participants can insert tasks | INSERT | authenticated | permissive |  | `EXISTS (SELECT 1 FROM public.shift_handovers h WHERE h.id = handover_id AND (h.outgoing_operator_id = auth.uid() OR h.incoming_operator_id = auth.uid())) OR public.has_role(auth.uid(),'coordinator') OR public.has_role(auth.uid(),'manager') OR public.has_role(auth.uid(),'admin')` |
| `shift_pending_tasks` | Handover participants can update tasks | UPDATE | authenticated | permissive | `EXISTS (SELECT 1 FROM public.shift_handovers h WHERE h.id = handover_id AND (h.outgoing_operator_id = auth.uid() OR h.incoming_operator_id = auth.uid())) OR completed_by = auth.uid() OR public.has_role(auth.uid(),'coordinator') OR public.has_role(auth.uid(),'manager') OR public.has_role(auth.uid(),'admin')` | `EXISTS (SELECT 1 FROM public.shift_handovers h WHERE h.id = handover_id AND (h.outgoing_operator_id = auth.uid() OR h.incoming_operator_id = auth.uid())) OR completed_by = auth.uid() OR public.has_role(auth.uid(),'coordinator') OR public.has_role(auth.uid(),'manager') OR public.has_role(auth.uid(),'admin')` |
| `shift_pending_tasks` | Elevated can delete tasks | DELETE | authenticated | permissive | `public.has_role(auth.uid(),'coordinator') OR public.has_role(auth.uid(),'manager') OR public.has_role(auth.uid(),'admin')` |  |
| `shipments` | Coordinators and above can manage shipments | ALL | authenticated | permissive | `public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'manager'::app_role) OR public.has_role(auth.uid(), 'coordinator'::app_role)` | `public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'manager'::app_role) OR public.has_role(auth.uid(), 'coordinator'::app_role)` |
| `shipments` | Active roles can view shipments | SELECT | authenticated | permissive | `public.has_any_active_role()` |  |
| `shipping_providers` | Managers and admins can manage shipping providers | ALL | authenticated | permissive | `public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'manager'::app_role)` | `public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'manager'::app_role)` |
| `shipping_providers` | Active roles can view shipping providers | SELECT | authenticated | permissive | `public.has_any_active_role()` |  |
| `spc_alerts` | Coordinators can manage SPC alerts | ALL | authenticated | permissive | `public.has_role((select auth.uid()), 'coordinator')` | `public.has_role((select auth.uid()), 'coordinator')` |
| `spc_alerts` | Active users can view SPC alerts | SELECT | authenticated | permissive | `EXISTS ( SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND is_active = true )` |  |
| `spc_capability_history` | Only coordinators can manage capability history | ALL | public | permissive | `public.has_role(auth.uid(), 'coordinator') OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'admin')` | `public.has_role(auth.uid(), 'coordinator') OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'admin')` |
| `spc_capability_history` | Active role users can view capability history | SELECT | authenticated | permissive | `EXISTS ( SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND is_active = true )` |  |
| `spc_control_parameters` | Coordinators can manage SPC parameters | ALL | public | permissive | `has_role((select auth.uid()), 'coordinator'::app_role) OR has_role((select auth.uid()), 'manager'::app_role)` | `has_role((select auth.uid()), 'coordinator'::app_role) OR has_role((select auth.uid()), 'manager'::app_role)` |
| `spc_control_parameters` | Active users can view SPC parameters | SELECT | authenticated | permissive | `EXISTS ( SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND is_active = true )` |  |
| `spc_measurements` | Active users can view SPC measurements | SELECT | authenticated | permissive | `EXISTS ( SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND is_active = true )` |  |
| `spc_measurements` | Authenticated users can view SPC measurements | SELECT | authenticated | permissive | `true` |  |
| `spc_measurements` | Active roles can insert measurements | INSERT | authenticated | permissive |  | `public.has_any_active_role()` |
| `spc_measurements` | Operators insert own spc measurements | INSERT | authenticated | permissive |  | `operator_id = auth.uid() OR public.has_role(auth.uid(),'coordinator') OR public.has_role(auth.uid(),'manager') OR public.has_role(auth.uid(),'admin')` |
| `storage.objects` | Anyone can view production photos | SELECT | public | permissive | `bucket_id = 'production-photos'` |  |
| `storage.objects` | Anyone can view technical documents | SELECT | public | permissive | `bucket_id = 'technical-documents'` |  |
| `storage.objects` | Evidências públicas | SELECT | public | permissive | `bucket_id = 'tpm-evidences'` |  |
| `storage.objects` | Owner or staff can view production photos | SELECT | authenticated | permissive | `bucket_id = 'production-photos' AND public.has_any_active_role() AND ( owner = (SELECT auth.uid()) OR public.has_role((SELECT auth.uid()), 'coordinator'::app_role) OR public.has_role((SELECT auth.uid()), 'manager'::app_role) OR public.has_role((SELECT auth.uid()), 'admin'::app_role) )` |  |
| `storage.objects` | Owner or staff view execution evidence | SELECT | authenticated | permissive | `bucket_id = 'execution-evidence' AND public.has_any_active_role() AND ( owner = (SELECT auth.uid()) OR (storage.foldername(name))[1] = (SELECT auth.uid())::text OR public.has_role((SELECT auth.uid()), 'coordinator'::app_role) OR public.has_role((SELECT auth.uid()), 'manager'::app_role) OR public.has_role((SELECT auth.uid()), 'admin'::app_role) )` |  |
| `storage.objects` | Owner or staff view tpm evidences | SELECT | authenticated | permissive | `bucket_id = 'tpm-evidences' AND public.has_any_active_role() AND ( owner = (SELECT auth.uid()) OR (storage.foldername(name))[1] = (SELECT auth.uid())::text OR public.has_role((SELECT auth.uid()), 'coordinator'::app_role) OR public.has_role((SELECT auth.uid()), 'manager'::app_role) OR public.has_role((SELECT auth.uid()), 'admin'::app_role) )` |  |
| `storage.objects` | Owner or staff view tpm signatures | SELECT | authenticated | permissive | `bucket_id = 'tpm_signatures' AND public.has_any_active_role() AND ( owner = (SELECT auth.uid()) OR (storage.foldername(name))[1] = (SELECT auth.uid())::text OR public.has_role((SELECT auth.uid()), 'coordinator'::app_role) OR public.has_role((SELECT auth.uid()), 'manager'::app_role) OR public.has_role((SELECT auth.uid()), 'admin'::app_role) )` |  |
| `storage.objects` | Staff or approved-only view technical documents | SELECT | authenticated | permissive | `bucket_id = 'technical-documents' AND public.has_any_active_role() AND ( owner = (SELECT auth.uid()) OR public.has_role((SELECT auth.uid()), 'coordinator'::app_role) OR public.has_role((SELECT auth.uid()), 'manager'::app_role) OR public.has_role((SELECT auth.uid()), 'admin'::app_role) )` |  |
| `storage.objects` | Active roles can upload own execution evidence | INSERT | authenticated | permissive |  | `bucket_id = 'execution-evidence' AND public.has_any_active_role() AND (storage.foldername(name))[1] = (SELECT auth.uid())::text` |
| `storage.objects` | Active roles can upload own production photos | INSERT | authenticated | permissive |  | `bucket_id = 'production-photos' AND public.has_any_active_role() AND (storage.foldername(name))[1] = (SELECT auth.uid())::text` |
| `storage.objects` | Active roles can upload own technical documents | INSERT | authenticated | permissive |  | `bucket_id = 'technical-documents' AND public.has_any_active_role() AND (storage.foldername(name))[1] = (SELECT auth.uid())::text` |
| `storage.objects` | Active roles can upload own tpm evidences | INSERT | authenticated | permissive |  | `bucket_id = 'tpm-evidences' AND public.has_any_active_role() AND (storage.foldername(name))[1] = (SELECT auth.uid())::text` |
| `storage.objects` | Active roles can upload own tpm signatures | INSERT | authenticated | permissive |  | `bucket_id = 'tpm_signatures' AND public.has_any_active_role() AND (storage.foldername(name))[1] = (SELECT auth.uid())::text` |
| `storage.objects` | Upload de evidências TPM | INSERT | public | permissive |  | `bucket_id = 'tpm-evidences'` |
| `storage.objects` | Coordinators can update technical documents | UPDATE | authenticated | permissive | `bucket_id = 'technical-documents' AND (public.has_role((select auth.uid()), 'coordinator') OR public.has_role((select auth.uid()), 'manager'))` | _= USING_ |
| `storage.objects` | Owners and staff can update execution-evidence | UPDATE | authenticated | permissive | `bucket_id = 'execution-evidence' AND (owner = auth.uid() OR public.has_role(auth.uid(),'coordinator'::app_role) OR public.has_role(auth.uid(),'manager'::app_role))` | _= USING_ |
| `storage.objects` | Owners and staff can update tpm-evidences | UPDATE | authenticated | permissive | `bucket_id = 'tpm-evidences' AND (owner = auth.uid() OR public.has_role(auth.uid(),'coordinator'::app_role) OR public.has_role(auth.uid(),'manager'::app_role))` | _= USING_ |
| `storage.objects` | Owners and staff can update tpm_signatures | UPDATE | authenticated | permissive | `bucket_id = 'tpm_signatures' AND (owner = auth.uid() OR public.has_role(auth.uid(),'coordinator'::app_role) OR public.has_role(auth.uid(),'manager'::app_role))` | _= USING_ |
| `storage.objects` | Coordinators can delete production photos | DELETE | authenticated | permissive | `bucket_id = 'production-photos' AND public.has_role(auth.uid(), 'coordinator')` |  |
| `storage.objects` | Coordinators can delete technical documents | DELETE | authenticated | permissive | `bucket_id = 'technical-documents' AND has_role((select auth.uid()), 'coordinator')` |  |
| `storage.objects` | Owners and staff can delete execution-evidence | DELETE | authenticated | permissive | `bucket_id = 'execution-evidence' AND (owner = auth.uid() OR public.has_role(auth.uid(),'coordinator'::app_role) OR public.has_role(auth.uid(),'manager'::app_role))` |  |
| `storage.objects` | Owners and staff can delete tpm-evidences | DELETE | authenticated | permissive | `bucket_id = 'tpm-evidences' AND (owner = auth.uid() OR public.has_role(auth.uid(),'coordinator'::app_role) OR public.has_role(auth.uid(),'manager'::app_role))` |  |
| `storage.objects` | Owners and staff can delete tpm_signatures | DELETE | authenticated | permissive | `bucket_id = 'tpm_signatures' AND (owner = auth.uid() OR public.has_role(auth.uid(),'coordinator'::app_role) OR public.has_role(auth.uid(),'manager'::app_role))` |  |
| `system_metrics` | Managers and admins can read system metrics | SELECT | public | permissive | `app_private.has_role(auth.uid(), 'manager'::public.app_role) OR app_private.has_role(auth.uid(), 'admin'::public.app_role)` |  |
| `technical_conversations` | Users can view their own conversations | SELECT | public | permissive | `auth.uid() = user_id` |  |
| `technical_conversations` | Users can create their own conversations | INSERT | public | permissive |  | `auth.uid() = user_id` |
| `technical_conversations` | Users can update their own conversations | UPDATE | public | permissive | `auth.uid() = user_id` | _= USING_ |
| `technical_conversations` | Users can delete their own conversations | DELETE | public | permissive | `auth.uid() = user_id` |  |
| `technical_documents` | Coordinators can manage documents | ALL | public | permissive | `has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'manager'::app_role)` | `has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'manager'::app_role)` |
| `technical_documents` | Active roles can view approved documents | SELECT | authenticated | permissive | `public.has_any_active_role() AND ( status = 'approved' OR app_private.has_role((SELECT auth.uid()), 'coordinator'::app_role) OR app_private.has_role((SELECT auth.uid()), 'manager'::app_role) )` |  |
| `technical_messages` | Users can view messages from their conversations | SELECT | public | permissive | `EXISTS ( SELECT 1 FROM public.technical_conversations WHERE id = conversation_id AND user_id = auth.uid() )` |  |
| `technical_messages` | Users can insert messages to their conversations | INSERT | public | permissive |  | `EXISTS ( SELECT 1 FROM public.technical_conversations WHERE id = conversation_id AND user_id = auth.uid() )` |
| `technical_sheet_audit` | Technical sheet audit visible to active roles | SELECT | authenticated | permissive | `public.has_any_active_role()` |  |
| `technical_sheet_audit_logs` | Elevated or published sheets audit visibility | SELECT | authenticated | permissive | `public.has_role(auth.uid(),'coordinator') OR public.has_role(auth.uid(),'manager') OR public.has_role(auth.uid(),'admin') OR EXISTS ( SELECT 1 FROM public.technical_sheets ts WHERE ts.id = technical_sheet_id AND ts.status = 'published' )` |  |
| `technical_sheet_favorites` | Users can manage their own favorites | ALL | public | permissive | `(select auth.uid()) = user_id` | _= USING_ |
| `technical_sheet_materials` | Coordinators can manage sheet materials | ALL | public | permissive | `has_role((select auth.uid()), 'coordinator')` | `has_role((select auth.uid()), 'coordinator')` |
| `technical_sheet_materials` | Authenticated users can view technical sheet materials | SELECT | authenticated | permissive | `true` |  |
| `technical_sheet_steps` | Coordinators can manage sheet steps | ALL | public | permissive | `has_role((select auth.uid()), 'coordinator')` | `has_role((select auth.uid()), 'coordinator')` |
| `technical_sheet_steps` | Authenticated users can view technical sheet steps | SELECT | authenticated | permissive | `true` |  |
| `technical_sheet_tips` | Coordinators can manage sheet tips | ALL | public | permissive | `has_role((select auth.uid()), 'coordinator')` | `has_role((select auth.uid()), 'coordinator')` |
| `technical_sheet_tips` | Authenticated users can view technical sheet tips | SELECT | authenticated | permissive | `true` |  |
| `technical_sheet_versions` | Role-based technical sheet versions visibility | SELECT | authenticated | permissive | `public.has_role((SELECT auth.uid()), 'coordinator'::app_role) OR public.has_role((SELECT auth.uid()), 'manager'::app_role) OR public.has_role((SELECT auth.uid()), 'admin'::app_role) OR ( public.has_role((SELECT auth.uid()), 'operator'::app_role) AND EXISTS ( SELECT 1 FROM public.technical_sheets ts WHERE ts.id = technical_sheet_versions.sheet_id AND ts.status = 'published'::sheet_status ) )` |  |
| `technical_sheet_versions` | Versions can be inserted by coordinators | INSERT | public | permissive |  | `public.has_role((select auth.uid()), 'coordinator')` |
| `technical_sheets` | Coordinators can manage technical sheets | ALL | public | permissive | `has_role((select auth.uid()), 'coordinator')` | `has_role((select auth.uid()), 'coordinator')` |
| `technical_sheets` | Authenticated users can view technical sheets | SELECT | authenticated | permissive | `true` |  |
| `technical_sheets` | Role-based technical sheets visibility | SELECT | authenticated | permissive | `(public.has_role((SELECT auth.uid()), 'operator'::app_role) AND status = 'published'::sheet_status) OR public.has_role((SELECT auth.uid()), 'coordinator'::app_role) OR public.has_role((SELECT auth.uid()), 'manager'::app_role) OR public.has_role((SELECT auth.uid()), 'admin'::app_role)` |  |
| `techniques` | Coordinators can manage techniques | ALL | authenticated | permissive | `has_role(auth.uid(), 'coordinator'::app_role)` | `has_role(auth.uid(), 'coordinator'::app_role)` |
| `techniques` | Authenticated users can view techniques | SELECT | authenticated | permissive | `true` |  |
| `telemetry_traces` | Apenas administradores veem traces | SELECT | authenticated | permissive | `public.has_role((select auth.uid()), 'manager')` |  |
| `telemetry_traces` | Authenticated users can insert traces | INSERT | authenticated | permissive |  | `(select auth.uid()) IS NOT NULL` |
| `tpm_execution_alerts` | Active roles can manage tpm execution alerts | ALL | authenticated | permissive | `public.has_any_active_role()` | `public.has_any_active_role()` |
| `tpm_execution_alerts` | Authenticated users can view tpm execution alerts | SELECT | authenticated | permissive | `true` |  |
| `tpm_execution_audit_logs` | Active roles can view tpm execution audit logs | SELECT | authenticated | permissive | `public.has_any_active_role()` |  |
| `tpm_execution_parts` | Active roles can manage tpm parts | ALL | authenticated | permissive | `public.has_any_active_role()` | `public.has_any_active_role()` |
| `tpm_execution_parts` | Active roles can view tpm parts | SELECT | authenticated | permissive | `public.has_any_active_role()` |  |
| `tpm_execution_supplies` | Active roles can manage execution supplies | ALL | authenticated | permissive | `public.has_any_active_role()` | `public.has_any_active_role()` |
| `tpm_execution_supplies` | Authenticated users can view tpm execution supplies | SELECT | authenticated | permissive | `true` |  |
| `tpm_execution_supplies` | Active roles can insert execution supplies | INSERT | authenticated | permissive |  | `public.has_any_active_role()` |
| `tpm_executions` | Active roles can view tpm executions | SELECT | authenticated | permissive | `public.has_any_active_role()` |  |
| `tpm_executions` | Technicians can insert own tpm executions | INSERT | authenticated | permissive |  | `technician_id = auth.uid() OR public.has_role(auth.uid(),'coordinator') OR public.has_role(auth.uid(),'manager') OR public.has_role(auth.uid(),'admin')` |
| `tpm_executions` | Technician or elevated can update tpm executions | UPDATE | authenticated | permissive | `technician_id = auth.uid() OR public.has_role(auth.uid(),'coordinator') OR public.has_role(auth.uid(),'manager') OR public.has_role(auth.uid(),'admin')` | `technician_id = auth.uid() OR public.has_role(auth.uid(),'coordinator') OR public.has_role(auth.uid(),'manager') OR public.has_role(auth.uid(),'admin')` |
| `tpm_executions` | Elevated can delete tpm executions | DELETE | authenticated | permissive | `public.has_role(auth.uid(),'coordinator') OR public.has_role(auth.uid(),'manager') OR public.has_role(auth.uid(),'admin')` |  |
| `tpm_notification_logs` | Logs viewable by authenticated users | SELECT | authenticated | permissive | `true` |  |
| `tpm_notification_logs` | Logs insertable by system | INSERT | authenticated | permissive |  | `true` |
| `tpm_notification_logs` | Users can insert own log entries | INSERT | authenticated | permissive |  | `user_id = auth.uid() OR user_id IS NULL OR public.has_role(auth.uid(),'coordinator') OR public.has_role(auth.uid(),'manager') OR public.has_role(auth.uid(),'admin')` |
| `tpm_notification_queue` | Active roles can access tpm notification queue | ALL | authenticated | permissive | `public.has_any_active_role()` | `public.has_any_active_role()` |
| `tpm_notification_templates` | tpm_notification_templates_write | ALL | authenticated | permissive | `public.has_role(auth.uid(), 'coordinator') OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'admin')` | `public.has_role(auth.uid(), 'coordinator') OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'admin')` |
| `tpm_notification_templates` | Templates viewable by authenticated users | SELECT | authenticated | permissive | `true` |  |
| `tpm_notification_templates_published` | Published templates viewable by everyone | SELECT | authenticated | permissive | `true` |  |
| `tpm_parameter_alerts` | Coordinators and admins can manage alerts | ALL | authenticated | permissive | `public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'coordinator'::app_role)` | `public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'coordinator'::app_role)` |
| `tpm_parameter_alerts` | Authenticated users can view parameter alerts | SELECT | authenticated | permissive | `true` |  |
| `tpm_parameter_alerts` | Managers can create parameter alerts | INSERT | authenticated | permissive |  | `app_private.has_role(auth.uid(), 'manager'::app_role)` |
| `tpm_severity_configs` | Active roles can manage severity configs | ALL | authenticated | permissive | `public.has_any_active_role()` | `public.has_any_active_role()` |
| `tpm_severity_configs` | Severity configs viewable by authenticated users | SELECT | authenticated | permissive | `true` |  |
| `user_devices` | Users can view their own devices | SELECT | public | permissive | `(select auth.uid()) = user_id` |  |
| `user_devices` | Authenticated can insert own devices | INSERT | authenticated | permissive |  | `auth.uid() = user_id` |
| `user_devices` | Authenticated can update own devices | UPDATE | authenticated | permissive | `auth.uid() = user_id` | _= USING_ |
| `user_devices` | Users can delete their own devices | DELETE | public | permissive | `(select auth.uid()) = user_id` |  |
| `user_favorites` | Users can view own favorites | SELECT | public | permissive | `(select auth.uid()) = user_id` |  |
| `user_favorites` | Users can insert own favorites | INSERT | public | permissive |  | `(select auth.uid()) = user_id` |
| `user_favorites` | Users can update own favorites | UPDATE | public | permissive | `(select auth.uid()) = user_id` | _= USING_ |
| `user_mfa_settings` | Coordinators can view all MFA settings | SELECT | public | permissive | `has_role((select auth.uid()), 'coordinator') OR has_role((select auth.uid()), 'manager')` |  |
| `user_mfa_settings` | Users can view own MFA settings | SELECT | public | permissive | `(select auth.uid()) = user_id` |  |
| `user_mfa_settings` | Users can insert own MFA settings | INSERT | public | permissive |  | `(select auth.uid()) = user_id` |
| `user_mfa_settings` | Users can update own MFA settings | UPDATE | public | permissive | `(select auth.uid()) = user_id` | _= USING_ |
| `user_notification_settings` | Users can view their own settings | SELECT | public | permissive | `(select auth.uid()) = user_id` |  |
| `user_notification_settings` | Users can insert their own settings | INSERT | public | permissive |  | `(select auth.uid()) = user_id` |
| `user_notification_settings` | Users can update their own settings | UPDATE | public | permissive | `(select auth.uid()) = user_id` | _= USING_ |
| `user_roles` | Admins can manage all user roles | ALL | authenticated | permissive | `app_private.has_role((SELECT auth.uid()), 'admin'::app_role)` | `app_private.has_role((SELECT auth.uid()), 'admin'::app_role)` |
| `user_roles` | Coordinators can manage operator roles | ALL | authenticated | permissive | `public.has_role(auth.uid(), 'coordinator'::app_role) AND role = 'operator'::app_role` | `public.has_role(auth.uid(), 'coordinator'::app_role) AND role = 'operator'::app_role` |
| `user_roles` | Managers can manage non-privileged roles | ALL | authenticated | permissive | `app_private.has_role((SELECT auth.uid()), 'manager'::app_role) AND role NOT IN ('admin'::app_role, 'manager'::app_role)` | `app_private.has_role((SELECT auth.uid()), 'manager'::app_role) AND role NOT IN ('admin'::app_role, 'manager'::app_role)` |
| `user_roles` | Coordinators can view all roles | SELECT | public | permissive | `public.has_role((select auth.uid()), 'coordinator')` |  |
| `user_roles` | Users can view their own roles | SELECT | authenticated | permissive | `(select auth.uid()) = user_id` |  |
| `user_roles` | AAL2 required for user_roles inserts | INSERT | authenticated | **RESTRICTIVE (E obrigatório)** |  | `coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2'` |
| `user_roles` | Staff can update non-privileged roles | UPDATE | authenticated | permissive | `public.has_role(auth.uid(), 'admin'::app_role) OR ( (public.has_role(auth.uid(), 'coordinator'::app_role) OR public.has_role(auth.uid(), 'manager'::app_role)) AND role NOT IN ('admin'::app_role, 'manager'::app_role) )` | `public.has_role(auth.uid(), 'admin'::app_role) OR ( (public.has_role(auth.uid(), 'coordinator'::app_role) OR public.has_role(auth.uid(), 'manager'::app_role)) AND role NOT IN ('admin'::app_role, 'manager'::app_role) )` |
| `user_roles` | AAL2 required for user_roles updates | UPDATE | authenticated | **RESTRICTIVE (E obrigatório)** | `coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2'` | `coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2'` |
| `user_roles` | AAL2 required for user_roles deletes | DELETE | authenticated | **RESTRICTIVE (E obrigatório)** | `coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2'` |  |
| `webhook_logs` | Managers can view webhook logs | SELECT | authenticated | permissive | `public.has_role((select auth.uid()), 'manager')` |  |

## C. Restrições de dados (obrigatório / único / default / CHECK / FK / calculada — derivado de migrations — pode divergir do banco)

| Tabela | Coluna | Regra |
|---|---|---|
| `techniques` | `id` | PK |
| `techniques` | `name` | obrigatório |
| `techniques` | `short_name` | obrigatório |
| `techniques` | `color` | default '#3b82f6' |
| `techniques` | `setup_time` | default 10 |
| `techniques` | `created_at` | default now() |
| `techniques` | `low_threshold` | default 30 |
| `techniques` | `medium_threshold` | default 70 |
| `techniques` | `high_threshold` | default 90 |
| `machines` | `id` | PK; default gen_random_uuid() |
| `machines` | `code` | obrigatório; único |
| `machines` | `name` | obrigatório |
| `machines` | `technique_id` | obrigatório; FK → techniques.id |
| `machines` | `is_active` | default true |
| `machines` | `created_at` | default now() |
| `jobs` | `id` | PK; default gen_random_uuid() |
| `jobs` | `order_number` | obrigatório |
| `jobs` | `client` | obrigatório |
| `jobs` | `product` | obrigatório |
| `jobs` | `quantity` | obrigatório |
| `jobs` | `technique_id` | obrigatório; FK → techniques.id |
| `jobs` | `machine_id` | FK → machines.id |
| `jobs` | `estimated_duration` | default 60 |
| `jobs` | `status` | default 'queue'; CHECK status IN ('queue', 'ready', 'scheduled', 'production', 'finished', 'paused', 'cancelled', 'delayed', 'rework') |
| `jobs` | `lost_pieces` | default 0 |
| `jobs` | `priority` | default 'medium'; CHECK priority IN ('low', 'medium', 'high', 'urgent') |
| `jobs` | `created_at` | default now() |
| `jobs` | `updated_at` | default now() |
| `jobs` | `production_photos` | default '{}' |
| `jobs` | `produced_quantity` | default 0 |
| `jobs` | `sort_order` | default 0 |
| `jobs` | `operator_id` | FK → users.id |
| `jobs` | `shipment_id` | FK → shipments.id |
| `jobs` | `parent_job_id` | FK → jobs.id ON DELETE SET NULL |
| `jobs` | `(tabela)` | constraint quantity_non_negative CHECK (quantity >= 0) |
| `jobs` | `(tabela)` | constraint produced_quantity_non_negative CHECK (produced_quantity >= 0) |
| `jobs` | `(tabela)` | constraint lost_pieces_non_negative CHECK (lost_pieces >= 0) |
| `jobs` | `(tabela)` | constraint check_job_times CHECK (end_time >= start_time) |
| `jobs` | `(tabela)` | constraint jobs_quantity_positive CHECK (quantity >= 0) |
| `jobs` | `(tabela)` | constraint jobs_status_check CHECK (status IN ('queue','ready','scheduled','production','finished','paused','cancelled','delayed','rework','buffer','packaging')) |
| `profiles` | `id` | PK; FK → users.id ON DELETE CASCADE |
| `profiles` | `created_at` | default now() |
| `profiles` | `updated_at` | default now() |
| `user_roles` | `id` | PK; default gen_random_uuid() |
| `user_roles` | `user_id` | obrigatório; FK → users.id ON DELETE CASCADE |
| `user_roles` | `role` | default 'operator' |
| `user_roles` | `created_at` | default now() |
| `user_roles` | `is_active` | default true |
| `user_roles` | `(tabela)` | UNIQUE(user_id, role) |
| `user_roles` | `(tabela)` | constraint user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE |
| `efficiency_alert_history` | `id` | PK; default gen_random_uuid() |
| `efficiency_alert_history` | `alert_type` | obrigatório |
| `efficiency_alert_history` | `severity` | obrigatório |
| `efficiency_alert_history` | `title` | obrigatório |
| `efficiency_alert_history` | `description` | obrigatório |
| `efficiency_alert_history` | `machine_id` | FK → machines.id |
| `efficiency_alert_history` | `detected_at` | default now() |
| `efficiency_alert_history` | `metadata` | default '{}'::jsonb |
| `efficiency_alert_history` | `created_at` | default now() |
| `technical_conversations` | `id` | PK; default gen_random_uuid() |
| `technical_conversations` | `user_id` | obrigatório |
| `technical_conversations` | `title` | default 'Nova |
| `technical_conversations` | `created_at` | default now() |
| `technical_conversations` | `updated_at` | default now() |
| `technical_messages` | `id` | PK; default gen_random_uuid() |
| `technical_messages` | `conversation_id` | obrigatório; FK → technical_conversations.id ON DELETE CASCADE |
| `technical_messages` | `role` | obrigatório; CHECK role IN ('user', 'assistant') |
| `technical_messages` | `content` | obrigatório |
| `technical_messages` | `created_at` | default now() |
| `qr_scan_history` | `id` | PK; default gen_random_uuid() |
| `qr_scan_history` | `job_id` | obrigatório; FK → jobs.id ON DELETE CASCADE |
| `qr_scan_history` | `operator_id` | obrigatório; FK → users.id ON DELETE CASCADE |
| `qr_scan_history` | `action` | obrigatório |
| `qr_scan_history` | `scanned_at` | default now() |
| `bitrix24_sync_history` | `id` | PK; default gen_random_uuid() |
| `bitrix24_sync_history` | `sync_type` | obrigatório; CHECK sync_type IN ('pull', 'push', 'webhook') |
| `bitrix24_sync_history` | `status` | obrigatório; CHECK status IN ('success', 'partial', 'error') |
| `bitrix24_sync_history` | `jobs_synced` | default 0 |
| `bitrix24_sync_history` | `jobs_failed` | default 0 |
| `bitrix24_sync_history` | `details` | default '{}' |
| `bitrix24_sync_history` | `started_at` | default now() |
| `bitrix24_sync_history` | `triggered_by` | default 'manual' |
| `bitrix24_oauth_tokens` | `id` | PK; default gen_random_uuid() |
| `bitrix24_oauth_tokens` | `access_token` | obrigatório |
| `bitrix24_oauth_tokens` | `refresh_token` | obrigatório |
| `bitrix24_oauth_tokens` | `expires_at` | obrigatório |
| `bitrix24_oauth_tokens` | `created_at` | default now() |
| `bitrix24_oauth_tokens` | `updated_at` | default now() |
| `bitrix24_field_mappings` | `id` | PK; default gen_random_uuid() |
| `bitrix24_field_mappings` | `mapping_type` | obrigatório |
| `bitrix24_field_mappings` | `source_key` | obrigatório |
| `bitrix24_field_mappings` | `target_key` | obrigatório |
| `bitrix24_field_mappings` | `priority` | default 0 |
| `bitrix24_field_mappings` | `is_active` | default true |
| `bitrix24_field_mappings` | `created_at` | default now() |
| `bitrix24_field_mappings` | `updated_at` | default now() |
| `bitrix24_field_mappings` | `(tabela)` | UNIQUE(mapping_type, source_key, target_key) |
| `product_categories` | `id` | PK; default gen_random_uuid() |
| `product_categories` | `name` | obrigatório |
| `product_categories` | `created_at` | default now() |
| `product_categories` | `updated_at` | default now() |
| `materials` | `id` | PK; default gen_random_uuid() |
| `materials` | `name` | obrigatório |
| `materials` | `created_at` | default now() |
| `materials` | `updated_at` | default now() |
| `technical_sheets` | `id` | PK; default gen_random_uuid() |
| `technical_sheets` | `technique_id` | obrigatório; FK → techniques.id |
| `technical_sheets` | `product_category_id` | FK → product_categories.id |
| `technical_sheets` | `material_id` | FK → materials.id |
| `technical_sheets` | `title` | obrigatório |
| `technical_sheets` | `recommended_machine_id` | FK → machines.id |
| `technical_sheets` | `is_active` | default true |
| `technical_sheets` | `created_by` | FK → users.id |
| `technical_sheets` | `updated_by` | FK → users.id |
| `technical_sheets` | `created_at` | default now() |
| `technical_sheets` | `updated_at` | default now() |
| `technical_sheets` | `machine_settings` | default '{}'::jsonb |
| `technical_sheets` | `version` | default 1 |
| `technical_sheets` | `settings_ranges` | default '{}'::jsonb |
| `technical_sheets` | `quality_checklist` | default '[]'::jsonb |
| `technical_sheets` | `status` | default 'draft' |
| `technical_sheets` | `view_count` | default 0 |
| `technical_sheet_steps` | `id` | PK; default gen_random_uuid() |
| `technical_sheet_steps` | `technical_sheet_id` | obrigatório; FK → technical_sheets.id ON DELETE CASCADE |
| `technical_sheet_steps` | `step_number` | obrigatório |
| `technical_sheet_steps` | `title` | obrigatório |
| `technical_sheet_steps` | `description` | obrigatório |
| `technical_sheet_steps` | `created_at` | default now() |
| `technical_sheet_materials` | `id` | PK; default gen_random_uuid() |
| `technical_sheet_materials` | `technical_sheet_id` | obrigatório; FK → technical_sheets.id ON DELETE CASCADE |
| `technical_sheet_materials` | `name` | obrigatório |
| `technical_sheet_materials` | `created_at` | default now() |
| `technical_sheet_materials` | `inventory_item_id` | FK → inventory_items.id ON DELETE SET NULL |
| `technical_sheet_tips` | `id` | PK; default gen_random_uuid() |
| `technical_sheet_tips` | `technical_sheet_id` | obrigatório; FK → technical_sheets.id ON DELETE CASCADE |
| `technical_sheet_tips` | `tip_type` | default 'tip' |
| `technical_sheet_tips` | `content` | obrigatório |
| `technical_sheet_tips` | `created_at` | default now() |
| `operator_machines` | `id` | PK; default gen_random_uuid() |
| `operator_machines` | `operator_id` | obrigatório; FK → users.id ON DELETE CASCADE |
| `operator_machines` | `machine_id` | obrigatório; FK → machines.id ON DELETE CASCADE |
| `operator_machines` | `assigned_at` | default now() |
| `operator_machines` | `assigned_by` | FK → users.id |
| `operator_machines` | `(tabela)` | UNIQUE (operator_id, machine_id) |
| `operator_status_audit` | `id` | PK; default gen_random_uuid() |
| `operator_status_audit` | `operator_id` | obrigatório |
| `operator_status_audit` | `action` | obrigatório; CHECK action IN ('activated', 'deactivated', 'removed') |
| `operator_status_audit` | `performed_by` | obrigatório |
| `operator_status_audit` | `created_at` | default now() |
| `user_favorites` | `id` | PK; default gen_random_uuid() |
| `user_favorites` | `user_id` | obrigatório; FK → users.id ON DELETE CASCADE |
| `user_favorites` | `favorites` | default '[]'::jsonb |
| `user_favorites` | `created_at` | default now() |
| `user_favorites` | `updated_at` | default now() |
| `user_favorites` | `(tabela)` | UNIQUE (user_id) |
| `operator_goals` | `id` | PK; default gen_random_uuid() |
| `operator_goals` | `operator_id` | obrigatório |
| `operator_goals` | `goal_type` | obrigatório |
| `operator_goals` | `target_value` | obrigatório |
| `operator_goals` | `period_start` | obrigatório |
| `operator_goals` | `period_end` | obrigatório |
| `operator_goals` | `created_at` | default now() |
| `operator_goals` | `updated_at` | default now() |
| `operator_goals` | `(tabela)` | CONSTRAINT valid_period CHECK (period_end >= period_start) |
| `operator_goals` | `(tabela)` | CONSTRAINT valid_goal_type CHECK (goal_type IN ('efficiency', 'jobs_completed', 'pieces_produced', 'loss_rate')) |
| `abc_activities` | `id` | PK; default gen_random_uuid() |
| `abc_activities` | `name` | obrigatório |
| `abc_activities` | `cost_driver` | obrigatório |
| `abc_activities` | `technique_id` | FK → techniques.id |
| `abc_activities` | `is_active` | default true |
| `abc_activities` | `created_at` | default now() |
| `abc_activities` | `updated_at` | default now() |
| `abc_cost_pools` | `id` | PK; default gen_random_uuid() |
| `abc_cost_pools` | `name` | obrigatório |
| `abc_cost_pools` | `pool_type` | obrigatório |
| `abc_cost_pools` | `monthly_budget` | default 0 |
| `abc_cost_pools` | `is_active` | default true |
| `abc_cost_pools` | `created_at` | default now() |
| `abc_cost_pools` | `updated_at` | default now() |
| `abc_activity_rates` | `id` | PK; default gen_random_uuid() |
| `abc_activity_rates` | `activity_id` | obrigatório; FK → abc_activities.id ON DELETE CASCADE |
| `abc_activity_rates` | `cost_pool_id` | obrigatório; FK → abc_cost_pools.id ON DELETE CASCADE |
| `abc_activity_rates` | `rate_per_unit` | default 0 |
| `abc_activity_rates` | `period_start` | obrigatório |
| `abc_activity_rates` | `period_end` | obrigatório |
| `abc_activity_rates` | `created_at` | default now() |
| `abc_activity_rates` | `updated_at` | default now() |
| `abc_activity_rates` | `(tabela)` | UNIQUE(activity_id, cost_pool_id, period_start) |
| `abc_job_costs` | `id` | PK; default gen_random_uuid() |
| `abc_job_costs` | `job_id` | obrigatório; FK → jobs.id ON DELETE CASCADE |
| `abc_job_costs` | `activity_id` | obrigatório; FK → abc_activities.id |
| `abc_job_costs` | `cost_pool_id` | obrigatório; FK → abc_cost_pools.id |
| `abc_job_costs` | `driver_quantity` | default 0 |
| `abc_job_costs` | `unit_rate` | default 0 |
| `abc_job_costs` | `total_cost` | default 0 |
| `abc_job_costs` | `calculated_at` | default now() |
| `abc_job_costs` | `created_at` | default now() |
| `abc_job_costs` | `(tabela)` | constraint abc_job_costs_job_activity_pool_unique UNIQUE (job_id, activity_id, cost_pool_id) |
| `maintenance_types` | `id` | PK |
| `maintenance_types` | `name` | obrigatório |
| `maintenance_types` | `default_interval_days` | default 30 |
| `maintenance_types` | `color` | default '#3b82f6' |
| `maintenance_types` | `created_at` | default now() |
| `maintenance_schedules` | `id` | PK; default gen_random_uuid() |
| `maintenance_schedules` | `machine_id` | obrigatório; FK → machines.id ON DELETE CASCADE |
| `maintenance_schedules` | `maintenance_type_id` | obrigatório; FK → maintenance_types.id |
| `maintenance_schedules` | `name` | obrigatório |
| `maintenance_schedules` | `interval_days` | default 30 |
| `maintenance_schedules` | `next_due_at` | obrigatório |
| `maintenance_schedules` | `estimated_duration_minutes` | default 60 |
| `maintenance_schedules` | `is_active` | default true |
| `maintenance_schedules` | `created_at` | default now() |
| `maintenance_schedules` | `updated_at` | default now() |
| `maintenance_schedules` | `(tabela)` | constraint maintenance_schedule_dates_valid CHECK (next_due_at >= created_at) |
| `maintenance_checklists` | `id` | PK; default gen_random_uuid() |
| `maintenance_checklists` | `maintenance_type_id` | obrigatório; FK → maintenance_types.id |
| `maintenance_checklists` | `name` | obrigatório |
| `maintenance_checklists` | `is_active` | default true |
| `maintenance_checklists` | `created_at` | default now() |
| `maintenance_checklists` | `updated_at` | default now() |
| `maintenance_checklists` | `version` | default 1 |
| `maintenance_checklists` | `technique_id` | FK → techniques.id |
| `maintenance_checklist_items` | `id` | PK; default gen_random_uuid() |
| `maintenance_checklist_items` | `item_order` | default 0 |
| `maintenance_checklist_items` | `description` | obrigatório |
| `maintenance_checklist_items` | `is_critical` | default false |
| `maintenance_checklist_items` | `requires_photo` | default false |
| `maintenance_checklist_items` | `requires_measurement` | default false |
| `maintenance_checklist_items` | `created_at` | default now() |
| `maintenance_checklist_items` | `checklist_id` | obrigatório |
| `maintenance_checklist_items` | `(tabela)` | checklist_id UUID NOT NULL REFERENCES public.maintenance_checklists(id) ON DELETE CASCADE |
| `maintenance_records` | `id` | PK; default gen_random_uuid() |
| `maintenance_records` | `schedule_id` | obrigatório; FK → maintenance_schedules.id ON DELETE CASCADE |
| `maintenance_records` | `machine_id` | obrigatório; FK → machines.id |
| `maintenance_records` | `maintenance_type_id` | obrigatório; FK → maintenance_types.id |
| `maintenance_records` | `started_at` | default now() |
| `maintenance_records` | `status` | default 'in_progress' |
| `maintenance_records` | `photos` | default '{}' |
| `maintenance_records` | `total_cost` | default 0 |
| `maintenance_records` | `downtime_minutes` | default 0 |
| `maintenance_records` | `created_at` | default now() |
| `maintenance_records` | `approver_id` | FK → users.id |
| `maintenance_records` | `technical_sheet_id` | FK → technical_sheets.id |
| `maintenance_records` | `adjustment_parameters` | default '{}'::jsonb |
| `maintenance_records` | `quality_responses` | default '[]'::jsonb |
| `maintenance_records` | `override_by` | FK → users.id |
| `maintenance_item_responses` | `id` | PK; default gen_random_uuid() |
| `maintenance_item_responses` | `record_id` | obrigatório; FK → maintenance_records.id ON DELETE CASCADE |
| `maintenance_item_responses` | `is_checked` | default false |
| `maintenance_item_responses` | `responded_at` | default now() |
| `maintenance_item_responses` | `checklist_item_id` | obrigatório |
| `maintenance_item_responses` | `(tabela)` | checklist_item_id UUID NOT NULL REFERENCES public.maintenance_checklist_items(id) |
| `maintenance_alerts` | `id` | PK; default gen_random_uuid() |
| `maintenance_alerts` | `schedule_id` | obrigatório; FK → maintenance_schedules.id ON DELETE CASCADE |
| `maintenance_alerts` | `machine_id` | obrigatório; FK → machines.id |
| `maintenance_alerts` | `alert_type` | obrigatório |
| `maintenance_alerts` | `message` | obrigatório |
| `maintenance_alerts` | `is_read` | default false |
| `maintenance_alerts` | `is_resolved` | default false |
| `maintenance_alerts` | `created_at` | default now() |
| `machine_predictions` | `id` | PK; default gen_random_uuid() |
| `machine_predictions` | `machine_id` | obrigatório; FK → machines.id ON DELETE CASCADE |
| `machine_predictions` | `prediction_type` | obrigatório |
| `machine_predictions` | `risk_score` | obrigatório |
| `machine_predictions` | `confidence` | obrigatório |
| `machine_predictions` | `factors` | default '[]' |
| `machine_predictions` | `model_version` | default 'v1.0' |
| `machine_predictions` | `is_active` | default true |
| `machine_predictions` | `created_at` | default now() |
| `machine_predictions` | `expires_at` | default (now() |
| `prediction_history` | `id` | PK; default gen_random_uuid() |
| `prediction_history` | `prediction_id` | obrigatório; FK → machine_predictions.id ON DELETE CASCADE |
| `prediction_history` | `machine_id` | obrigatório; FK → machines.id |
| `prediction_history` | `predicted_risk_score` | obrigatório |
| `prediction_history` | `created_at` | default now() |
| `machine_health_metrics` | `id` | PK; default gen_random_uuid() |
| `machine_health_metrics` | `machine_id` | obrigatório; FK → machines.id ON DELETE CASCADE |
| `machine_health_metrics` | `period_start` | obrigatório |
| `machine_health_metrics` | `period_end` | obrigatório |
| `machine_health_metrics` | `total_jobs` | default 0 |
| `machine_health_metrics` | `total_produced` | default 0 |
| `machine_health_metrics` | `total_losses` | default 0 |
| `machine_health_metrics` | `total_production_hours` | default 0 |
| `machine_health_metrics` | `maintenance_count` | default 0 |
| `machine_health_metrics` | `corrective_maintenance_count` | default 0 |
| `machine_health_metrics` | `calculated_at` | default now() |
| `machine_health_metrics` | `(tabela)` | UNIQUE(machine_id, period_start, period_end) |
| `daily_summaries` | `id` | PK; default gen_random_uuid() |
| `daily_summaries` | `date` | obrigatório |
| `daily_summaries` | `summary_type` | obrigatório |
| `daily_summaries` | `data` | default '{}'::jsonb |
| `daily_summaries` | `created_at` | default now() |
| `shift_handovers` | `id` | PK; default gen_random_uuid() |
| `shift_handovers` | `shift_date` | default CURRENT_DATE |
| `shift_handovers` | `shift_type` | obrigatório; CHECK shift_type IN ('morning', 'afternoon', 'night') |
| `shift_handovers` | `outgoing_operator_id` | obrigatório |
| `shift_handovers` | `machine_id` | FK → machines.id |
| `shift_handovers` | `status` | default 'open'; CHECK status IN ('open', 'pending_acceptance', 'completed', 'cancelled') |
| `shift_handovers` | `started_at` | default now() |
| `shift_handovers` | `created_at` | default now() |
| `shift_handovers` | `updated_at` | default now() |
| `shift_handover_checklist` | `id` | PK; default gen_random_uuid() |
| `shift_handover_checklist` | `handover_id` | obrigatório; FK → shift_handovers.id ON DELETE CASCADE |
| `shift_handover_checklist` | `item_description` | obrigatório |
| `shift_handover_checklist` | `is_checked` | default false |
| `shift_handover_checklist` | `item_order` | default 0 |
| `shift_handover_checklist` | `created_at` | default now() |
| `shift_handover_checklist` | `(tabela)` | checked_at TIMESTAMP WITH TIME ZONE |
| `shift_pending_tasks` | `id` | PK; default gen_random_uuid() |
| `shift_pending_tasks` | `handover_id` | obrigatório; FK → shift_handovers.id ON DELETE CASCADE |
| `shift_pending_tasks` | `title` | obrigatório |
| `shift_pending_tasks` | `priority` | default 'medium'; CHECK priority IN ('low', 'medium', 'high', 'critical') |
| `shift_pending_tasks` | `status` | default 'pending'; CHECK status IN ('pending', 'in_progress', 'completed', 'cancelled') |
| `shift_pending_tasks` | `machine_id` | FK → machines.id |
| `shift_pending_tasks` | `job_id` | FK → jobs.id |
| `shift_pending_tasks` | `created_at` | default now() |
| `shift_pending_tasks` | `updated_at` | default now() |
| `shift_occurrences` | `id` | PK; default gen_random_uuid() |
| `shift_occurrences` | `handover_id` | obrigatório; FK → shift_handovers.id ON DELETE CASCADE |
| `shift_occurrences` | `occurrence_type` | obrigatório; CHECK occurrence_type IN ('incident', 'maintenance', 'quality', 'safety', 'production', 'other') |
| `shift_occurrences` | `severity` | default 'info'; CHECK severity IN ('info', 'warning', 'error', 'critical') |
| `shift_occurrences` | `title` | obrigatório |
| `shift_occurrences` | `description` | obrigatório |
| `shift_occurrences` | `machine_id` | FK → machines.id |
| `shift_occurrences` | `job_id` | FK → jobs.id |
| `shift_occurrences` | `occurred_at` | default now() |
| `shift_occurrences` | `photos` | default '{}' |
| `shift_occurrences` | `created_at` | default now() |
| `shift_checklist_templates` | `id` | PK; default gen_random_uuid() |
| `shift_checklist_templates` | `name` | obrigatório |
| `shift_checklist_templates` | `items` | default '[]' |
| `shift_checklist_templates` | `machine_id` | FK → machines.id |
| `shift_checklist_templates` | `is_active` | default true |
| `shift_checklist_templates` | `created_at` | default now() |
| `shift_checklist_templates` | `updated_at` | default now() |
| `production_lots` | `id` | PK; default gen_random_uuid() |
| `production_lots` | `lot_number` | obrigatório; único |
| `production_lots` | `job_id` | FK → jobs.id ON DELETE SET NULL |
| `production_lots` | `product_name` | obrigatório |
| `production_lots` | `quantity` | default 0 |
| `production_lots` | `produced_quantity` | default 0 |
| `production_lots` | `status` | default 'active' |
| `production_lots` | `production_date` | default CURRENT_DATE |
| `production_lots` | `created_at` | default now() |
| `production_lots` | `updated_at` | default now() |
| `lot_components` | `id` | PK; default gen_random_uuid() |
| `lot_components` | `lot_id` | obrigatório; FK → production_lots.id ON DELETE CASCADE |
| `lot_components` | `component_lot_id` | FK → production_lots.id ON DELETE SET NULL |
| `lot_components` | `material_id` | FK → materials.id ON DELETE SET NULL |
| `lot_components` | `component_name` | obrigatório |
| `lot_components` | `quantity_used` | default 0 |
| `lot_components` | `unit` | default 'un' |
| `lot_components` | `created_at` | default now() |
| `lot_movements` | `id` | PK; default gen_random_uuid() |
| `lot_movements` | `lot_id` | obrigatório; FK → production_lots.id ON DELETE CASCADE |
| `lot_movements` | `movement_type` | obrigatório |
| `lot_movements` | `quantity` | obrigatório |
| `lot_movements` | `job_id` | FK → jobs.id ON DELETE SET NULL |
| `lot_movements` | `created_at` | default now() |
| `lot_quality_inspections` | `id` | PK; default gen_random_uuid() |
| `lot_quality_inspections` | `lot_id` | obrigatório; FK → production_lots.id ON DELETE CASCADE |
| `lot_quality_inspections` | `inspection_type` | obrigatório |
| `lot_quality_inspections` | `result` | obrigatório |
| `lot_quality_inspections` | `defects_found` | default 0 |
| `lot_quality_inspections` | `photos` | default '{}' |
| `lot_quality_inspections` | `inspected_at` | default now() |
| `lot_quality_inspections` | `created_at` | default now() |
| `spc_control_parameters` | `id` | PK; default gen_random_uuid() |
| `spc_control_parameters` | `name` | obrigatório |
| `spc_control_parameters` | `machine_id` | FK → machines.id ON DELETE SET NULL |
| `spc_control_parameters` | `measurement_type` | obrigatório |
| `spc_control_parameters` | `unit` | default 'mm' |
| `spc_control_parameters` | `target_value` | obrigatório |
| `spc_control_parameters` | `upper_spec_limit` | obrigatório |
| `spc_control_parameters` | `lower_spec_limit` | obrigatório |
| `spc_control_parameters` | `sample_size` | default 5 |
| `spc_control_parameters` | `frequency_minutes` | default 60 |
| `spc_control_parameters` | `is_active` | default true |
| `spc_control_parameters` | `created_at` | default now() |
| `spc_control_parameters` | `updated_at` | default now() |
| `spc_measurements` | `id` | PK; default gen_random_uuid() |
| `spc_measurements` | `parameter_id` | obrigatório; FK → spc_control_parameters.id ON DELETE CASCADE |
| `spc_measurements` | `job_id` | FK → jobs.id ON DELETE SET NULL |
| `spc_measurements` | `lot_id` | FK → production_lots.id ON DELETE SET NULL |
| `spc_measurements` | `sample_number` | obrigatório |
| `spc_measurements` | `values` | obrigatório |
| `spc_measurements` | `mean_value` | obrigatório |
| `spc_measurements` | `range_value` | obrigatório |
| `spc_measurements` | `is_in_control` | default true |
| `spc_measurements` | `measured_at` | default now() |
| `spc_measurements` | `created_at` | default now() |
| `spc_alerts` | `id` | PK; default gen_random_uuid() |
| `spc_alerts` | `parameter_id` | obrigatório; FK → spc_control_parameters.id ON DELETE CASCADE |
| `spc_alerts` | `measurement_id` | FK → spc_measurements.id ON DELETE SET NULL |
| `spc_alerts` | `alert_type` | obrigatório |
| `spc_alerts` | `severity` | default 'warning' |
| `spc_alerts` | `title` | obrigatório |
| `spc_alerts` | `description` | obrigatório |
| `spc_alerts` | `is_acknowledged` | default false |
| `spc_alerts` | `created_at` | default now() |
| `spc_capability_history` | `id` | PK; default gen_random_uuid() |
| `spc_capability_history` | `parameter_id` | obrigatório; FK → spc_control_parameters.id ON DELETE CASCADE |
| `spc_capability_history` | `period_start` | obrigatório |
| `spc_capability_history` | `period_end` | obrigatório |
| `spc_capability_history` | `sample_count` | obrigatório |
| `spc_capability_history` | `mean` | obrigatório |
| `spc_capability_history` | `std_deviation` | obrigatório |
| `spc_capability_history` | `calculated_at` | default now() |
| `operator_achievements` | `id` | PK; default gen_random_uuid() |
| `operator_achievements` | `operator_id` | obrigatório |
| `operator_achievements` | `achievement_type` | obrigatório |
| `operator_achievements` | `achievement_name` | obrigatório |
| `operator_achievements` | `icon` | default 'trophy' |
| `operator_achievements` | `points` | default 0 |
| `operator_achievements` | `achieved_at` | default now() |
| `operator_achievements` | `metadata` | default '{}'::jsonb |
| `operator_achievements` | `created_at` | default now() |
| `operator_rankings` | `id` | PK; default gen_random_uuid() |
| `operator_rankings` | `operator_id` | obrigatório |
| `operator_rankings` | `ranking_type` | obrigatório |
| `operator_rankings` | `period_start` | obrigatório |
| `operator_rankings` | `period_end` | obrigatório |
| `operator_rankings` | `position` | obrigatório |
| `operator_rankings` | `total_points` | default 0 |
| `operator_rankings` | `total_produced` | default 0 |
| `operator_rankings` | `efficiency_rate` | default 0 |
| `operator_rankings` | `quality_rate` | default 0 |
| `operator_rankings` | `calculated_at` | default now() |
| `operator_rankings` | `(tabela)` | UNIQUE(operator_id, ranking_type, period_start, period_end) |
| `operator_rankings` | `(tabela)` | constraint operator_rankings_operator_type_period_unique UNIQUE (operator_id, ranking_type, period_start) NOT VALID |
| `energy_consumption` | `id` | PK; default gen_random_uuid() |
| `energy_consumption` | `machine_id` | FK → machines.id |
| `energy_consumption` | `recorded_at` | default now() |
| `energy_consumption` | `consumption_kwh` | default 0 |
| `energy_consumption` | `cost_per_kwh` | default 0.65 |
| `energy_consumption` | `total_cost` | CALCULADA = consumption_kwh * cost_per_kwh |
| `energy_consumption` | `reading_type` | default 'automatic' |
| `energy_consumption` | `created_at` | default now() |
| `energy_alerts` | `id` | PK; default gen_random_uuid() |
| `energy_alerts` | `machine_id` | FK → machines.id |
| `energy_alerts` | `alert_type` | obrigatório |
| `energy_alerts` | `threshold_value` | obrigatório |
| `energy_alerts` | `current_value` | obrigatório |
| `energy_alerts` | `severity` | default 'warning' |
| `energy_alerts` | `message` | obrigatório |
| `energy_alerts` | `is_resolved` | default false |
| `energy_alerts` | `created_at` | default now() |
| `energy_targets` | `id` | PK; default gen_random_uuid() |
| `energy_targets` | `machine_id` | FK → machines.id |
| `energy_targets` | `target_type` | obrigatório |
| `energy_targets` | `target_value` | obrigatório |
| `energy_targets` | `period_start` | obrigatório |
| `energy_targets` | `period_end` | obrigatório |
| `energy_targets` | `is_active` | default true |
| `energy_targets` | `created_at` | default now() |
| `energy_targets` | `updated_at` | default now() |
| `technical_documents` | `id` | PK; default gen_random_uuid() |
| `technical_documents` | `technical_sheet_id` | FK → technical_sheets.id ON DELETE CASCADE |
| `technical_documents` | `title` | obrigatório |
| `technical_documents` | `file_url` | obrigatório |
| `technical_documents` | `file_name` | obrigatório |
| `technical_documents` | `file_size` | default 0 |
| `technical_documents` | `file_type` | default 'application/pdf' |
| `technical_documents` | `version` | default 1 |
| `technical_documents` | `is_current` | default true |
| `technical_documents` | `status` | default 'pending'; CHECK status IN ('pending', 'approved', 'rejected') |
| `technical_documents` | `created_at` | default now() |
| `technical_documents` | `updated_at` | default now() |
| `document_versions` | `id` | PK; default gen_random_uuid() |
| `document_versions` | `document_id` | obrigatório; FK → technical_documents.id ON DELETE CASCADE |
| `document_versions` | `version` | obrigatório |
| `document_versions` | `file_url` | obrigatório |
| `document_versions` | `file_name` | obrigatório |
| `document_versions` | `file_size` | default 0 |
| `document_versions` | `created_at` | default now() |
| `push_subscriptions` | `id` | PK; default gen_random_uuid() |
| `push_subscriptions` | `user_id` | obrigatório; FK → users.id ON DELETE CASCADE |
| `push_subscriptions` | `endpoint` | obrigatório |
| `push_subscriptions` | `p256dh` | obrigatório |
| `push_subscriptions` | `auth` | obrigatório |
| `push_subscriptions` | `created_at` | default now() |
| `push_subscriptions` | `updated_at` | default now() |
| `push_subscriptions` | `(tabela)` | UNIQUE(user_id, endpoint) |
| `push_notifications` | `id` | PK; default gen_random_uuid() |
| `push_notifications` | `user_id` | FK → users.id ON DELETE CASCADE |
| `push_notifications` | `title` | obrigatório |
| `push_notifications` | `body` | obrigatório |
| `push_notifications` | `data` | default '{}' |
| `push_notifications` | `status` | default 'pending' |
| `push_notifications` | `created_at` | default now() |
| `password_reset_requests` | `id` | PK; default gen_random_uuid() |
| `password_reset_requests` | `user_email` | obrigatório |
| `password_reset_requests` | `status` | default 'pending'; CHECK status IN ('pending', 'approved', 'rejected') |
| `password_reset_requests` | `reviewed_by` | FK → users.id |
| `password_reset_requests` | `created_at` | default now() |
| `password_reset_requests` | `expires_at` | default (now() |
| `ip_allowlist` | `id` | PK; default gen_random_uuid() |
| `ip_allowlist` | `ip_address` | obrigatório |
| `ip_allowlist` | `is_global` | default false |
| `ip_allowlist` | `user_id` | FK → users.id ON DELETE CASCADE |
| `ip_allowlist` | `created_at` | default now() |
| `ip_allowlist` | `is_active` | default true |
| `ip_allowlist` | `(tabela)` | CONSTRAINT ip_or_global CHECK (is_global = true OR user_id IS NOT NULL) |
| `user_mfa_settings` | `id` | PK; default gen_random_uuid() |
| `user_mfa_settings` | `user_id` | obrigatório; único; FK → users.id ON DELETE CASCADE |
| `user_mfa_settings` | `totp_enabled` | default false |
| `user_mfa_settings` | `created_at` | default now() |
| `user_mfa_settings` | `updated_at` | default now() |
| `login_audit` | `id` | PK; default gen_random_uuid() |
| `login_audit` | `user_id` | FK → users.id ON DELETE CASCADE |
| `login_audit` | `user_email` | obrigatório |
| `login_audit` | `login_status` | obrigatório |
| `login_audit` | `created_at` | default now() |
| `rate_limit_logs` | `id` | PK; default gen_random_uuid() |
| `rate_limit_logs` | `ip_address` | obrigatório |
| `rate_limit_logs` | `endpoint` | obrigatório |
| `rate_limit_logs` | `user_id` | FK → users.id ON DELETE SET NULL |
| `rate_limit_logs` | `request_count` | default 1 |
| `rate_limit_logs` | `window_start` | default now() |
| `rate_limit_logs` | `window_end` | default (now() |
| `rate_limit_logs` | `is_blocked` | default false |
| `rate_limit_logs` | `created_at` | default now() |
| `blocked_ips` | `id` | PK; default gen_random_uuid() |
| `blocked_ips` | `ip_address` | obrigatório |
| `blocked_ips` | `reason` | obrigatório |
| `blocked_ips` | `blocked_at` | default now() |
| `blocked_ips` | `is_permanent` | default false |
| `blocked_ips` | `blocked_by` | FK → users.id ON DELETE SET NULL |
| `blocked_ips` | `unblocked_by` | FK → users.id ON DELETE SET NULL |
| `blocked_ips` | `created_at` | default now() |
| `rate_limit_settings` | `id` | PK; default gen_random_uuid() |
| `rate_limit_settings` | `endpoint_pattern` | obrigatório |
| `rate_limit_settings` | `max_requests` | default 100 |
| `rate_limit_settings` | `window_seconds` | default 60 |
| `rate_limit_settings` | `block_duration_minutes` | default 15 |
| `rate_limit_settings` | `is_active` | default true |
| `rate_limit_settings` | `created_by` | FK → users.id ON DELETE SET NULL |
| `rate_limit_settings` | `created_at` | default now() |
| `rate_limit_settings` | `updated_at` | default now() |
| `security_events` | `id` | PK; default gen_random_uuid() |
| `security_events` | `event_type` | obrigatório |
| `security_events` | `severity` | default 'info' |
| `security_events` | `user_id` | FK → users.id ON DELETE SET NULL |
| `security_events` | `details` | default '{}'::jsonb |
| `security_events` | `created_at` | default now() |
| `user_devices` | `id` | PK; default gen_random_uuid() |
| `user_devices` | `user_id` | obrigatório |
| `user_devices` | `device_fingerprint` | obrigatório |
| `user_devices` | `device_type` | default 'desktop' |
| `user_devices` | `is_trusted` | default false |
| `user_devices` | `first_seen_at` | default now() |
| `user_devices` | `last_seen_at` | default now() |
| `user_devices` | `created_at` | default now() |
| `new_device_alerts` | `id` | PK; default gen_random_uuid() |
| `new_device_alerts` | `user_id` | obrigatório |
| `new_device_alerts` | `device_id` | FK → user_devices.id |
| `new_device_alerts` | `email_sent` | default false |
| `new_device_alerts` | `acknowledged` | default false |
| `new_device_alerts` | `created_at` | default now() |
| `role_permissions` | `id` | PK; default gen_random_uuid() |
| `role_permissions` | `role` | obrigatório |
| `role_permissions` | `permission` | obrigatório |
| `role_permissions` | `resource` | obrigatório |
| `role_permissions` | `action` | obrigatório |
| `role_permissions` | `is_granted` | default true |
| `role_permissions` | `created_at` | default now() |
| `role_permissions` | `updated_at` | default now() |
| `role_permissions` | `created_by` | FK → users.id |
| `role_permissions` | `(tabela)` | UNIQUE(role, permission) |
| `login_lockouts` | `id` | PK; default gen_random_uuid() |
| `login_lockouts` | `identifier` | obrigatório |
| `login_lockouts` | `identifier_type` | obrigatório; CHECK identifier_type IN ('email', 'ip') |
| `login_lockouts` | `failed_attempts` | default 0 |
| `login_lockouts` | `lockout_count` | default 0 |
| `login_lockouts` | `created_at` | default now() |
| `login_lockouts` | `updated_at` | default now() |
| `login_lockouts` | `(tabela)` | UNIQUE(identifier, identifier_type) |
| `chat_messages` | `id` | PK; default gen_random_uuid() |
| `chat_messages` | `sender_id` | obrigatório |
| `chat_messages` | `sender_name` | obrigatório |
| `chat_messages` | `message` | obrigatório |
| `chat_messages` | `channel` | default 'general' |
| `chat_messages` | `is_read` | default false |
| `chat_messages` | `created_at` | default now() |
| `pre_production_checklists` | `id` | PK; default gen_random_uuid() |
| `pre_production_checklists` | `job_id` | obrigatório; FK → jobs.id ON DELETE CASCADE |
| `pre_production_checklists` | `material_verified` | default false |
| `pre_production_checklists` | `color_verified` | default false |
| `pre_production_checklists` | `machine_clean` | default false |
| `pre_production_checklists` | `tools_ready` | default false |
| `pre_production_checklists` | `created_at` | default now() |
| `pre_production_checklists` | `(tabela)` | checked_by UUID |
| `pre_production_checklists` | `(tabela)` | checked_by_name TEXT |
| `query_telemetry` | `id` | PK; default gen_random_uuid() |
| `query_telemetry` | `operation` | obrigatório |
| `query_telemetry` | `duration_ms` | default 0 |
| `query_telemetry` | `severity` | default 'normal' |
| `query_telemetry` | `created_at` | default now() |
| `audit_log` | `id` | PK; default gen_random_uuid() |
| `audit_log` | `entity_type` | obrigatório |
| `audit_log` | `entity_id` | obrigatório |
| `audit_log` | `action` | obrigatório; CHECK action IN ('INSERT','UPDATE','DELETE') |
| `audit_log` | `hash` | obrigatório |
| `audit_log` | `metadata` | default '{}'::jsonb |
| `audit_log` | `created_at` | default now() |
| `audit_log` | `(tabela)` | constraint audit_log_action_check CHECK (action = ANY (ARRAY['INSERT'::text, 'UPDATE'::text, 'DELETE'::text, 'CREATE'::text])) |
| `user_notification_settings` | `id` | PK; default gen_random_uuid() |
| `user_notification_settings` | `user_id` | obrigatório; FK → users.id ON DELETE CASCADE |
| `user_notification_settings` | `email_enabled` | default true |
| `user_notification_settings` | `push_enabled` | default true |
| `user_notification_settings` | `whatsapp_enabled` | default false |
| `user_notification_settings` | `notification_types` | default ARRAY['upcoming' |
| `user_notification_settings` | `machine_filters` | default ARRAY[]::UUID[] |
| `user_notification_settings` | `created_at` | default now() |
| `user_notification_settings` | `updated_at` | default now() |
| `user_notification_settings` | `event_configs` | default '{ |
| `user_notification_settings` | `(tabela)` | UNIQUE(user_id) |
| `tpm_notification_templates` | `id` | PK; default gen_random_uuid() |
| `tpm_notification_templates` | `channel` | obrigatório; CHECK channel IN ('email', 'whatsapp', 'push') |
| `tpm_notification_templates` | `severity` | obrigatório; CHECK severity IN ('upcoming', 'due', 'overdue', 'critical') |
| `tpm_notification_templates` | `template_body` | obrigatório |
| `tpm_notification_templates` | `is_active` | default true |
| `tpm_notification_templates` | `created_at` | default now() |
| `tpm_notification_templates` | `updated_at` | default now() |
| `tpm_notification_templates` | `status` | default 'published'; CHECK status IN ('draft', 'published') |
| `tpm_notification_logs` | `id` | PK; default gen_random_uuid() |
| `tpm_notification_logs` | `machine_id` | FK → machines.id ON DELETE SET NULL |
| `tpm_notification_logs` | `user_id` | FK → users.id ON DELETE SET NULL |
| `tpm_notification_logs` | `channel` | obrigatório |
| `tpm_notification_logs` | `severity` | obrigatório |
| `tpm_notification_logs` | `status` | obrigatório; CHECK status IN ('success', 'failure') |
| `tpm_notification_logs` | `sent_at` | default now() |
| `tpm_notification_logs` | `retry_attempts` | default 0 |
| `tpm_severity_configs` | `id` | PK; default gen_random_uuid() |
| `tpm_severity_configs` | `machine_id` | FK → machines.id ON DELETE CASCADE |
| `tpm_severity_configs` | `severity` | obrigatório; CHECK severity IN ('upcoming', 'due', 'overdue', 'critical') |
| `tpm_severity_configs` | `days_threshold` | default 0 |
| `tpm_severity_configs` | `is_enabled` | default true |
| `tpm_severity_configs` | `created_at` | default now() |
| `tpm_severity_configs` | `updated_at` | default now() |
| `tpm_severity_configs` | `(tabela)` | UNIQUE(machine_id, severity) |
| `tpm_notification_templates_published` | `id` | PK; default gen_random_uuid() |
| `tpm_notification_templates_published` | `template_id` | FK → tpm_notification_templates.id ON DELETE CASCADE |
| `tpm_notification_templates_published` | `channel` | obrigatório |
| `tpm_notification_templates_published` | `severity` | obrigatório |
| `tpm_notification_templates_published` | `template_body` | obrigatório |
| `tpm_notification_templates_published` | `published_at` | default now() |
| `tpm_notification_queue` | `id` | PK; default gen_random_uuid() |
| `tpm_notification_queue` | `machine_id` | FK → machines.id ON DELETE CASCADE |
| `tpm_notification_queue` | `template_id` | FK → tpm_notification_templates_published.id |
| `tpm_notification_queue` | `channel` | obrigatório |
| `tpm_notification_queue` | `severity` | obrigatório |
| `tpm_notification_queue` | `recipient` | obrigatório |
| `tpm_notification_queue` | `payload` | default '{}' |
| `tpm_notification_queue` | `status` | default 'pending' |
| `tpm_notification_queue` | `retry_count` | default 0 |
| `tpm_notification_queue` | `max_retries` | default 3 |
| `tpm_notification_queue` | `next_retry_at` | default now() |
| `tpm_notification_queue` | `created_at` | default now() |
| `tpm_executions` | `id` | PK; default gen_random_uuid() |
| `tpm_executions` | `schedule_id` | FK → maintenance_schedules.id ON DELETE CASCADE |
| `tpm_executions` | `machine_id` | FK → machines.id ON DELETE CASCADE |
| `tpm_executions` | `technician_id` | FK → users.id |
| `tpm_executions` | `started_at` | default now() |
| `tpm_executions` | `status` | default 'in_progress' |
| `tpm_executions` | `created_at` | default now() |
| `tpm_executions` | `updated_at` | default now() |
| `tpm_executions` | `technical_sheet_id` | FK → technical_sheets.id |
| `tpm_executions` | `adjustment_parameters` | default '{}'::jsonb |
| `tpm_executions` | `quality_checklist_results` | default '[]'::jsonb |
| `tpm_executions` | `failure_risk_detected` | default false |
| `tpm_execution_parts` | `id` | PK; default gen_random_uuid() |
| `tpm_execution_parts` | `execution_id` | FK → tpm_executions.id ON DELETE CASCADE |
| `tpm_execution_parts` | `part_name` | obrigatório |
| `tpm_execution_parts` | `quantity` | default 1 |
| `tpm_execution_parts` | `unit` | default 'un' |
| `tpm_execution_parts` | `created_at` | default now() |
| `tpm_execution_audit_logs` | `id` | PK; default gen_random_uuid() |
| `tpm_execution_audit_logs` | `execution_id` | obrigatório; FK → maintenance_records.id ON DELETE CASCADE |
| `tpm_execution_audit_logs` | `changed_by` | FK → users.id |
| `tpm_execution_audit_logs` | `field_name` | obrigatório |
| `tpm_execution_audit_logs` | `created_at` | default now() |
| `tpm_parameter_alerts` | `id` | PK; default gen_random_uuid() |
| `tpm_parameter_alerts` | `execution_id` | FK → tpm_executions.id ON DELETE CASCADE |
| `tpm_parameter_alerts` | `parameter_name` | obrigatório |
| `tpm_parameter_alerts` | `severity` | default 'warning' |
| `tpm_parameter_alerts` | `is_resolved` | default false |
| `tpm_parameter_alerts` | `created_at` | default now() |
| `tpm_parameter_alerts` | `risk_level` | default 'medium' |
| `tpm_parameter_alerts` | `is_critical` | default false |
| `tpm_execution_supplies` | `id` | PK; default gen_random_uuid() |
| `tpm_execution_supplies` | `execution_id` | obrigatório; FK → tpm_executions.id ON DELETE CASCADE |
| `tpm_execution_supplies` | `name` | obrigatório |
| `tpm_execution_supplies` | `quantity` | obrigatório |
| `tpm_execution_supplies` | `alternative_used` | default false |
| `tpm_execution_supplies` | `created_at` | default now() |
| `tpm_execution_alerts` | `id` | PK; default gen_random_uuid() |
| `tpm_execution_alerts` | `execution_id` | obrigatório; FK → tpm_executions.id ON DELETE CASCADE |
| `tpm_execution_alerts` | `alert_type` | obrigatório |
| `tpm_execution_alerts` | `severity` | default 'warning' |
| `tpm_execution_alerts` | `evidence_urls` | default '{}' |
| `tpm_execution_alerts` | `resolved` | default false |
| `tpm_execution_alerts` | `created_at` | default now() |
| `tpm_execution_alerts` | `is_critical` | default false |
| `error_logs` | `id` | PK; default gen_random_uuid() |
| `error_logs` | `message` | obrigatório |
| `error_logs` | `metadata` | default '{}'::jsonb |
| `error_logs` | `created_at` | default timezone('utc'::text |
| `technical_sheet_audit_logs` | `id` | PK; default gen_random_uuid() |
| `technical_sheet_audit_logs` | `technical_sheet_id` | FK → technical_sheets.id ON DELETE CASCADE |
| `technical_sheet_audit_logs` | `user_id` | FK → users.id |
| `technical_sheet_audit_logs` | `action` | obrigatório |
| `technical_sheet_audit_logs` | `created_at` | default now() |
| `technical_sheet_audit` | `id` | PK; default gen_random_uuid() |
| `technical_sheet_audit` | `technical_sheet_id` | FK → technical_sheets.id ON DELETE CASCADE |
| `technical_sheet_audit` | `user_id` | FK → users.id |
| `technical_sheet_audit` | `action` | obrigatório |
| `technical_sheet_audit` | `created_at` | default now() |
| `technical_sheet_favorites` | `id` | PK; default gen_random_uuid() |
| `technical_sheet_favorites` | `user_id` | FK → users.id ON DELETE CASCADE |
| `technical_sheet_favorites` | `technical_sheet_id` | FK → technical_sheets.id ON DELETE CASCADE |
| `technical_sheet_favorites` | `created_at` | default now() |
| `technical_sheet_favorites` | `(tabela)` | UNIQUE(user_id, technical_sheet_id) |
| `inventory_items` | `id` | PK; default gen_random_uuid() |
| `inventory_items` | `name` | obrigatório |
| `inventory_items` | `category` | obrigatório |
| `inventory_items` | `current_stock` | default 0 |
| `inventory_items` | `unit` | obrigatório |
| `inventory_items` | `min_stock_level` | default 0 |
| `inventory_items` | `created_at` | default now() |
| `inventory_items` | `updated_at` | default now() |
| `inventory_items` | `price_per_unit` | default 0 |
| `inventory_items` | `daily_usage_avg` | default 0 |
| `inventory_items` | `days_of_supply` | default 0 |
| `inventory_items` | `(tabela)` | constraint stock_non_negative CHECK (current_stock >= 0) |
| `inventory_items` | `(tabela)` | constraint check_positive_stock CHECK (current_stock >= 0) |
| `inventory_items` | `(tabela)` | constraint inventory_stock_positive CHECK (current_stock >= 0) |
| `inventory_movements` | `id` | PK; default gen_random_uuid() |
| `inventory_movements` | `item_id` | FK → inventory_items.id ON DELETE CASCADE |
| `inventory_movements` | `user_id` | FK → users.id |
| `inventory_movements` | `type` | obrigatório |
| `inventory_movements` | `quantity` | obrigatório |
| `inventory_movements` | `job_id` | FK → jobs.id ON DELETE SET NULL |
| `inventory_movements` | `created_at` | default now() |
| `inventory_movements` | `(tabela)` | constraint inventory_movements_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL |
| `dashboard_layouts` | `id` | PK; default gen_random_uuid() |
| `dashboard_layouts` | `user_id` | obrigatório; único; FK → users.id ON DELETE CASCADE |
| `dashboard_layouts` | `layout` | obrigatório |
| `dashboard_layouts` | `created_at` | default now() |
| `dashboard_layouts` | `updated_at` | default now() |
| `gamification_rewards` | `id` | PK; default gen_random_uuid() |
| `gamification_rewards` | `name` | obrigatório |
| `gamification_rewards` | `cost_points` | obrigatório |
| `gamification_rewards` | `icon` | default 'star' |
| `gamification_rewards` | `stock` | default -1 |
| `gamification_rewards` | `is_active` | default true |
| `gamification_rewards` | `created_at` | default now() |
| `reward_redemptions` | `id` | PK; default gen_random_uuid() |
| `reward_redemptions` | `user_id` | obrigatório; FK → users.id |
| `reward_redemptions` | `reward_id` | obrigatório; FK → gamification_rewards.id |
| `reward_redemptions` | `points_spent` | obrigatório |
| `reward_redemptions` | `status` | default 'pending' |
| `reward_redemptions` | `created_at` | default now() |
| `report_templates` | `id` | PK; default gen_random_uuid() |
| `report_templates` | `user_id` | obrigatório; FK → users.id ON DELETE CASCADE |
| `report_templates` | `name` | obrigatório |
| `report_templates` | `table_name` | obrigatório |
| `report_templates` | `columns` | obrigatório |
| `report_templates` | `filters` | default '{}'::jsonb |
| `report_templates` | `format_type` | default 'pdf' |
| `report_templates` | `is_public` | default false |
| `report_templates` | `created_at` | default now() |
| `report_templates` | `updated_at` | default now() |
| `technical_sheet_versions` | `id` | PK; default gen_random_uuid() |
| `technical_sheet_versions` | `sheet_id` | obrigatório; FK → technical_sheets.id ON DELETE CASCADE |
| `technical_sheet_versions` | `version_number` | obrigatório |
| `technical_sheet_versions` | `data` | obrigatório |
| `technical_sheet_versions` | `created_by` | FK → users.id |
| `technical_sheet_versions` | `created_at` | default now() |
| `operator_skills` | `id` | PK; default gen_random_uuid() |
| `operator_skills` | `operator_id` | obrigatório; FK → users.id ON DELETE CASCADE |
| `operator_skills` | `technique_id` | obrigatório |
| `operator_skills` | `skill_level` | default 'basic' |
| `operator_skills` | `certified_at` | default now() |
| `operator_skills` | `created_at` | default now() |
| `operator_skills` | `updated_at` | default now() |
| `operator_skills` | `(tabela)` | UNIQUE(operator_id, technique_id) |
| `shipping_providers` | `id` | PK; default gen_random_uuid() |
| `shipping_providers` | `name` | obrigatório |
| `shipping_providers` | `is_active` | default true |
| `shipping_providers` | `created_at` | default now() |
| `shipping_providers` | `updated_at` | default now() |
| `shipments` | `id` | PK; default gen_random_uuid() |
| `shipments` | `job_id` | FK → jobs.id ON DELETE CASCADE |
| `shipments` | `provider_id` | FK → shipping_providers.id |
| `shipments` | `status` | default 'pending' |
| `shipments` | `created_at` | default now() |
| `shipments` | `updated_at` | default now() |
| `shipments` | `freight_cost` | default 0 |
| `shipments` | `insurance_cost` | default 0 |
| `shipments` | `tax_cost` | default 0 |
| `shipments` | `cost_currency` | default 'BRL' |
| `production_losses` | `id` | PK; default gen_random_uuid() |
| `production_losses` | `job_id` | obrigatório; FK → jobs.id ON DELETE CASCADE |
| `production_losses` | `quantity` | default 1 |
| `production_losses` | `operator_id` | FK → users.id |
| `production_losses` | `created_at` | default now() |
| `production_losses` | `loss_type` | default 'availability'; CHECK loss_type IN ('availability', 'performance', 'quality') |
| `production_losses` | `(tabela)` | constraint production_losses_quantity_positive CHECK (quantity >= 0) |
| `production_losses` | `(tabela)` | constraint production_losses_operator_id_fkey FOREIGN KEY (operator_id) REFERENCES auth.users(id) ON DELETE SET NULL |
| `machine_downtime` | `id` | PK; default gen_random_uuid() |
| `machine_downtime` | `machine_id` | obrigatório; FK → machines.id ON DELETE CASCADE |
| `machine_downtime` | `job_id` | FK → jobs.id |
| `machine_downtime` | `downtime_type` | obrigatório; CHECK downtime_type IN ('setup', 'maintenance', 'breakdown', 'idle', 'other') |
| `machine_downtime` | `start_time` | default now() |
| `machine_downtime` | `operator_id` | FK → users.id |
| `machine_downtime` | `created_at` | default now() |
| `job_status_history` | `id` | PK; default gen_random_uuid() |
| `job_status_history` | `job_id` | obrigatório; FK → jobs.id ON DELETE CASCADE |
| `job_status_history` | `new_status` | obrigatório |
| `job_status_history` | `changed_by` | FK → users.id |
| `job_status_history` | `created_at` | default now() |
| `rls_test_results` | `id` | PK; default gen_random_uuid() |
| `rls_test_results` | `test_name` | obrigatório |
| `rls_test_results` | `table_name` | obrigatório |
| `rls_test_results` | `role` | obrigatório |
| `rls_test_results` | `operation` | obrigatório |
| `rls_test_results` | `passed` | obrigatório |
| `rls_test_results` | `created_at` | default now() |
| `business_config` | `key` | PK |
| `business_config` | `value` | obrigatório |
| `business_config` | `updated_at` | default now() |
| `business_config` | `updated_by` | FK → users.id |
| `feature_flags` | `id` | PK; default gen_random_uuid() |
| `feature_flags` | `name` | obrigatório; único |
| `feature_flags` | `is_enabled` | default false |
| `feature_flags` | `rules` | default '{}' |
| `feature_flags` | `created_at` | default now() |
| `feature_flags` | `updated_at` | default now() |
| `telemetry_traces` | `id` | PK; default gen_random_uuid() |
| `telemetry_traces` | `trace_id` | obrigatório |
| `telemetry_traces` | `span_id` | obrigatório |
| `telemetry_traces` | `name` | obrigatório |
| `telemetry_traces` | `service_name` | obrigatório |
| `telemetry_traces` | `created_at` | default now() |
| `webhook_logs` | `id` | PK; default gen_random_uuid() |
| `webhook_logs` | `source` | obrigatório |
| `webhook_logs` | `event` | obrigatório |
| `webhook_logs` | `created_at` | default now() |
| `kpi_alerts` | `id` | PK; default gen_random_uuid() |
| `kpi_alerts` | `machine_id` | FK → machines.id ON DELETE CASCADE |
| `kpi_alerts` | `metric_name` | obrigatório |
| `kpi_alerts` | `metric_value` | obrigatório |
| `kpi_alerts` | `threshold` | obrigatório |
| `kpi_alerts` | `severity` | CHECK severity IN ('WARNING', 'CRITICAL') |
| `kpi_alerts` | `is_resolved` | default FALSE |
| `kpi_alerts` | `created_at` | default now() |
| `job_status_audit` | `id` | PK; default gen_random_uuid() |
| `job_status_audit` | `job_id` | obrigatório; FK → jobs.id ON DELETE CASCADE |
| `job_status_audit` | `changed_by` | FK → users.id |
| `job_status_audit` | `changed_at` | default now() |
| `machine_event_audit` | `id` | PK; default gen_random_uuid() |
| `machine_event_audit` | `machine_id` | obrigatório; FK → machines.id ON DELETE CASCADE |
| `machine_event_audit` | `event_type` | obrigatório |
| `machine_event_audit` | `performed_by` | FK → users.id |
| `machine_event_audit` | `performed_at` | default now() |
| `dashboard_presets` | `id` | PK; default gen_random_uuid() |
| `dashboard_presets` | `user_id` | obrigatório; FK → users.id ON DELETE CASCADE |
| `dashboard_presets` | `name` | obrigatório |
| `dashboard_presets` | `dashboard_id` | obrigatório |
| `dashboard_presets` | `filters` | default '{}'::jsonb |
| `dashboard_presets` | `is_default` | default false |
| `dashboard_presets` | `created_at` | default now() |
| `dashboard_presets` | `updated_at` | default now() |
| `erp_api_keys` | `id` | PK; default gen_random_uuid() |
| `erp_api_keys` | `name` | obrigatório |
| `erp_api_keys` | `key_hash` | obrigatório; único |
| `erp_api_keys` | `is_active` | default true |
| `erp_api_keys` | `created_by` | FK → users.id |
| `erp_api_keys` | `created_at` | default now() |
| `packaging_tasks` | `id` | PK; default gen_random_uuid() |
| `packaging_tasks` | `job_id` | obrigatório; único; FK → jobs.id ON DELETE CASCADE |
| `packaging_tasks` | `status` | default 'pending'; CHECK status IN ('pending','in_triage','packaging','ready_to_ship','on_hold') |
| `packaging_tasks` | `assigned_to` | FK → users.id ON DELETE SET NULL |
| `packaging_tasks` | `received_quantity` | default 0; CHECK received_quantity >= 0 |
| `packaging_tasks` | `approved_quantity` | default 0; CHECK approved_quantity >= 0 |
| `packaging_tasks` | `rejected_quantity` | default 0; CHECK rejected_quantity >= 0 |
| `packaging_tasks` | `packages_count` | CHECK packages_count IS NULL OR packages_count >= 0 |
| `packaging_tasks` | `total_weight_kg` | CHECK total_weight_kg IS NULL OR total_weight_kg >= 0 |
| `packaging_tasks` | `created_at` | default now() |
| `packaging_tasks` | `updated_at` | default now() |
| `packaging_tasks` | `was_overdue_on_complete` | default false |
| `packaging_tasks` | `(tabela)` | CONSTRAINT packaging_tasks_qty_sum CHECK (approved_quantity + rejected_quantity <= received_quantity) |
| `packaging_tasks` | `(tabela)` | constraint packaging_tasks_weight_per_package_check CHECK ( total_weight_kg IS NULL OR packages_count IS NULL OR packages_count = 0 OR (total_weight_kg / packages_count) <= 30 ) |
| `packaging_tasks` | `(tabela)` | constraint packaging_tasks_packages_count_check CHECK (packages_count IS NULL OR (packages_count >= 0 AND packages_count <= 500)) |
| `packaging_defects` | `id` | PK; default gen_random_uuid() |
| `packaging_defects` | `packaging_task_id` | obrigatório; FK → packaging_tasks.id ON DELETE CASCADE |
| `packaging_defects` | `quantity` | obrigatório; CHECK quantity > 0 |
| `packaging_defects` | `defect_type` | obrigatório; CHECK defect_type IN ('print_misalignment','color_deviation','scratch','contamination','wrong_material','dimensional','other') |
| `packaging_defects` | `severity` | default 'minor'; CHECK severity IN ('minor','major','critical') |
| `packaging_defects` | `decision` | default 'discard'; CHECK decision IN ('rework','discard','accept_with_note') |
| `packaging_defects` | `reported_by` | FK → users.id ON DELETE SET NULL |
| `packaging_defects` | `created_at` | default now() |
| `packaging_defects` | `updated_at` | default now() |
| `packaging_settings` | `id` | PK; default gen_random_uuid() |
| `packaging_settings` | `package_types` | default ARRAY['caixa' |
| `packaging_settings` | `defect_reasons` | default ARRAY['print_misalignment' |
| `packaging_settings` | `weight_unit` | default 'kg'; CHECK weight_unit IN ('kg','g','lb') |
| `packaging_settings` | `created_at` | default now() |
| `packaging_settings` | `updated_at` | default now() |
| `packaging_settings` | `sla_triage_hours` | default 4 |
| `packaging_settings` | `sla_packaging_hours` | default 8 |
| `packaging_settings` | `sla_total_hours` | default 24 |
| `packaging_settings` | `warning_threshold_pct` | default 75 |
| `packaging_checklist_items` | `id` | PK; default gen_random_uuid() |
| `packaging_checklist_items` | `label` | obrigatório |
| `packaging_checklist_items` | `is_required` | default true |
| `packaging_checklist_items` | `item_order` | default 0 |
| `packaging_checklist_items` | `is_active` | default true |
| `packaging_checklist_items` | `created_at` | default now() |
| `packaging_checklist_items` | `updated_at` | default now() |
| `packaging_task_checklist` | `id` | PK; default gen_random_uuid() |
| `packaging_task_checklist` | `packaging_task_id` | obrigatório; FK → packaging_tasks.id ON DELETE CASCADE |
| `packaging_task_checklist` | `item_id` | obrigatório; FK → packaging_checklist_items.id ON DELETE CASCADE |
| `packaging_task_checklist` | `is_checked` | default false |
| `packaging_task_checklist` | `created_at` | default now() |
| `packaging_task_checklist` | `updated_at` | default now() |
| `packaging_task_checklist` | `(tabela)` | checked_by UUID REFERENCES auth.users(id) ON DELETE SET NULL |
| `packaging_task_checklist` | `(tabela)` | checked_at TIMESTAMPTZ |
| `packaging_task_checklist` | `(tabela)` | UNIQUE (packaging_task_id, item_id) |
| `packaging_sla_overrides` | `id` | PK; default gen_random_uuid() |
| `packaging_sla_overrides` | `technique_id` | FK → techniques.id ON DELETE CASCADE |
| `packaging_sla_overrides` | `sla_triage_hours` | default 4 |
| `packaging_sla_overrides` | `sla_packaging_hours` | default 8 |
| `packaging_sla_overrides` | `sla_total_hours` | default 24 |
| `packaging_sla_overrides` | `warning_threshold_pct` | default 75 |
| `packaging_sla_overrides` | `is_active` | default true |
| `packaging_sla_overrides` | `created_at` | default now() |
| `packaging_sla_overrides` | `updated_at` | default now() |
| `packaging_sla_overrides` | `(tabela)` | CONSTRAINT packaging_sla_overrides_scope_check CHECK (technique_id IS NOT NULL OR client IS NOT NULL) |
| `cron_health_history` | `id` | PK; default gen_random_uuid() |
| `cron_health_history` | `jobid` | obrigatório |
| `cron_health_history` | `consecutive_failures` | default 0 |
| `cron_health_history` | `captured_at` | default now() |
| `cron_health_history` | `created_at` | default now() |
| `cron_health_history` | `is_stale` | default false |
| `cron_p95_daily` | `id` | PK; default gen_random_uuid() |
| `cron_p95_daily` | `day` | obrigatório |
| `cron_p95_daily` | `jobid` | obrigatório |
| `cron_p95_daily` | `samples` | default 0 |
| `cron_p95_daily` | `failure_rate_pct` | default 0 |
| `cron_p95_daily` | `created_at` | default now() |
| `cron_p95_daily` | `updated_at` | default now() |
| `cron_p95_daily` | `(tabela)` | UNIQUE (jobid, day) |
| `edge_health_history` | `id` | PK; default gen_random_uuid() |
| `edge_health_history` | `status` | obrigatório; CHECK status IN ('pass','warn','fail') |
| `edge_health_history` | `source` | default 'health-monitor' |
| `edge_health_history` | `captured_at` | default now() |
| `edge_health_history` | `created_at` | default now() |
| `edge_health_history` | `checks` | obrigatório |
| `edge_health_history` | `(tabela)` | checks JSONB NOT NULL DEFAULT '{}'::jsonb |
| `geo_blocking_settings` | `id` | PK; default gen_random_uuid() |
| `geo_blocking_settings` | `is_enabled` | default false |
| `geo_blocking_settings` | `mode` | default 'blocklist' |
| `geo_blocking_settings` | `block_unknown_countries` | default false |
| `geo_blocking_settings` | `log_blocked_attempts` | default true |
| `geo_blocking_settings` | `updated_at` | default now() |
| `geo_blocking_settings` | `(tabela)` | constraint geo_blocking_settings_mode_chk CHECK (mode IN ('blocklist', 'allowlist')) |
| `geo_blocking_rules` | `id` | PK; default gen_random_uuid() |
| `geo_blocking_rules` | `country_code` | obrigatório |
| `geo_blocking_rules` | `country_name` | obrigatório |
| `geo_blocking_rules` | `is_blocked` | default true |
| `geo_blocking_rules` | `block_type` | default 'country' |
| `geo_blocking_rules` | `created_at` | default now() |
| `geo_blocking_rules` | `updated_at` | default now() |
| `geo_blocking_rules` | `(tabela)` | UNIQUE (country_code) |
| `geo_blocking_logs` | `id` | PK; default gen_random_uuid() |
| `geo_blocking_logs` | `ip_address` | obrigatório |
| `geo_blocking_logs` | `action` | obrigatório |
| `geo_blocking_logs` | `created_at` | default now() |
| `csp_violation_reports` | `id` | PK; default gen_random_uuid() |
| `csp_violation_reports` | `raw` | default '{}'::jsonb |
| `csp_violation_reports` | `created_at` | default now() |
| `app_private.runtime_config` | `key` | PK |
| `app_private.runtime_config` | `value` | obrigatório |
| `bitrix24_oauth_states` | `state` | PK |
| `bitrix24_oauth_states` | `created_at` | default now() |
| `archived_jobs` | `archived_at` | default now() |
| `archived_jobs` | `children` | default '{}'::jsonb |
| `archived_jobs` | `(tabela)` | LIKE public.jobs INCLUDING ALL |
| `backup_logs` | `id` | PK; default gen_random_uuid() |
| `backup_logs` | `backup_id` | obrigatório |
| `backup_logs` | `tables_backed_up` | default '{}'::jsonb |
| `backup_logs` | `created_at` | default now() |
| `system_metrics` | `id` | PK; default gen_random_uuid() |
| `system_metrics` | `collected_at` | default now() |
| `system_metrics` | `metrics` | default '{}'::jsonb |

## D. Automações no banco (triggers e funções — regras que rodam sozinhas; derivado de migrations — pode divergir do banco)

| Trigger | Quando | Tabela | Executa | Condição |
|---|---|---|---|---|
| update_jobs_updated_at | BEFORE UPDATE | `jobs` | `update_updated_at_column` |  |
| on_auth_user_created | AFTER INSERT | `auth.users` | `handle_new_user` |  |
| update_profiles_updated_at | BEFORE UPDATE | `profiles` | `update_updated_at_column` |  |
| update_technical_conversations_updated_at | BEFORE UPDATE | `technical_conversations` | `update_updated_at_column` |  |
| update_bitrix24_oauth_tokens_updated_at | BEFORE UPDATE | `bitrix24_oauth_tokens` | `update_updated_at_column` |  |
| update_bitrix24_field_mappings_updated_at | BEFORE UPDATE | `bitrix24_field_mappings` | `update_updated_at_column` |  |
| update_product_categories_updated_at | BEFORE UPDATE | `product_categories` | `update_updated_at_column` |  |
| update_materials_updated_at | BEFORE UPDATE | `materials` | `update_updated_at_column` |  |
| update_technical_sheets_updated_at | BEFORE UPDATE | `technical_sheets` | `update_updated_at_column` |  |
| update_user_favorites_updated_at | BEFORE UPDATE | `user_favorites` | `update_updated_at_column` |  |
| update_operator_goals_updated_at | BEFORE UPDATE | `operator_goals` | `update_updated_at_column` |  |
| update_abc_activities_updated_at | BEFORE UPDATE | `abc_activities` | `update_updated_at_column` |  |
| update_abc_cost_pools_updated_at | BEFORE UPDATE | `abc_cost_pools` | `update_updated_at_column` |  |
| update_abc_activity_rates_updated_at | BEFORE UPDATE | `abc_activity_rates` | `update_updated_at_column` |  |
| update_maintenance_schedules_updated_at | BEFORE UPDATE | `maintenance_schedules` | `update_updated_at_column` |  |
| update_maintenance_checklists_updated_at | BEFORE UPDATE | `maintenance_checklists` | `update_updated_at_column` |  |
| update_shift_handovers_updated_at | BEFORE UPDATE | `shift_handovers` | `update_updated_at_column` |  |
| update_shift_pending_tasks_updated_at | BEFORE UPDATE | `shift_pending_tasks` | `update_updated_at_column` |  |
| update_shift_checklist_templates_updated_at | BEFORE UPDATE | `shift_checklist_templates` | `update_updated_at_column` |  |
| update_production_lots_updated_at | BEFORE UPDATE | `production_lots` | `update_updated_at_column` |  |
| update_spc_control_parameters_updated_at | BEFORE UPDATE | `spc_control_parameters` | `update_updated_at_column` |  |
| update_energy_targets_updated_at | BEFORE UPDATE | `energy_targets` | `update_updated_at_column` |  |
| update_technical_documents_updated_at | BEFORE UPDATE | `technical_documents` | `update_updated_at_column` |  |
| update_push_subscriptions_updated_at | BEFORE UPDATE | `push_subscriptions` | `update_updated_at_column` |  |
| update_role_permissions_updated_at | BEFORE UPDATE | `role_permissions` | `update_updated_at_column` |  |
| update_login_lockouts_updated_at | BEFORE UPDATE | `login_lockouts` | `update_updated_at_column` |  |
| audit_log_no_update | BEFORE UPDATE | `audit_log` | `audit_log_immutable` |  |
| audit_log_no_delete | BEFORE DELETE | `audit_log` | `audit_log_immutable` |  |
| audit_jobs | AFTER INSERT OR UPDATE OR DELETE | `jobs` | `audit_trigger_func` |  |
| audit_lot_components | AFTER INSERT OR UPDATE OR DELETE | `lot_components` | `audit_trigger_func` |  |
| audit_lot_quality_inspections | AFTER INSERT OR UPDATE OR DELETE | `lot_quality_inspections` | `audit_trigger_func` |  |
| update_user_notification_settings_updated_at | BEFORE UPDATE | `user_notification_settings` | `update_updated_at_column` |  |
| on_maintenance_alert_insert | AFTER INSERT | `maintenance_alerts` | `trigger_send_tpm_email` |  |
| set_tpm_executions_updated_at | BEFORE UPDATE | `tpm_executions` | `handle_tpm_updated_at` |  |
| trigger_audit_tpm_execution | AFTER UPDATE | `maintenance_records` | `audit_tpm_execution_changes` |  |
| trigger_save_checklist_snapshot | BEFORE UPDATE | `maintenance_records` | `save_tpm_checklist_snapshot` | `OLD.status = 'in_progress' AND NEW.status IN ('completed', 'approved')` |
| tr_increment_tech_sheet_version | BEFORE UPDATE | `technical_sheets` | `increment_technical_sheet_version` |  |
| tr_parameter_alert_notification | AFTER INSERT | `tpm_parameter_alerts` | `handle_parameter_alert_notification` |  |
| tr_maintenance_correction_notification | AFTER UPDATE | `maintenance_records` | `handle_maintenance_correction_notification` |  |
| on_tpm_execution_alert | AFTER INSERT | `tpm_execution_alerts` | `notify_loss_risk` |  |
| tr_log_technical_sheet_changes | AFTER INSERT OR UPDATE OR DELETE | `technical_sheets` | `log_technical_sheet_change` |  |
| tr_audit_technical_sheets | AFTER INSERT OR UPDATE OR DELETE | `technical_sheets` | `audit_technical_sheet_changes` |  |
| tr_update_inventory_stock | AFTER INSERT | `inventory_movements` | `update_inventory_stock` |  |
| update_dashboard_layouts_updated_at | BEFORE UPDATE | `dashboard_layouts` | `update_updated_at_column` |  |
| trigger_check_job_overlap | BEFORE INSERT OR UPDATE | `jobs` | `check_job_overlap` |  |
| on_job_finished_promote | AFTER UPDATE OF STATUS | `jobs` | `trigger_auto_promotion` | `NEW.status = 'finished' AND OLD.status != 'finished'` |
| update_report_templates_updated_at | BEFORE UPDATE | `report_templates` | `update_updated_at_column` |  |
| on_technical_sheet_save | AFTER INSERT OR UPDATE | `technical_sheets` | `create_technical_sheet_version` |  |
| update_operator_skills_updated_at | BEFORE UPDATE | `operator_skills` | `update_updated_at_column` |  |
| update_shipping_providers_updated_at | BEFORE UPDATE | `shipping_providers` | `update_updated_at_column` |  |
| update_shipments_updated_at | BEFORE UPDATE | `shipments` | `update_updated_at_column` |  |
| audit_shipments_trigger | AFTER INSERT OR UPDATE OR DELETE | `shipments` | `audit_logistics_changes` |  |
| audit_shipping_providers_trigger | AFTER INSERT OR UPDATE OR DELETE | `shipping_providers` | `audit_logistics_changes` |  |
| tr_audit_profile_change | AFTER UPDATE | `profiles` | `audit_profile_change` |  |
| tr_calculate_days_of_supply | BEFORE INSERT OR UPDATE | `inventory_items` | `calculate_days_of_supply` |  |
| tr_audit_log_hashing | BEFORE INSERT | `audit_log` | `process_audit_log_hashing` |  |
| tr_rollback_inventory_stock | BEFORE DELETE | `inventory_movements` | `rollback_inventory_stock` |  |
| tr_validate_inventory_stock | BEFORE INSERT | `inventory_movements` | `validate_inventory_stock` |  |
| tr_update_business_config_timestamp | BEFORE UPDATE | `business_config` | `update_updated_at_column` |  |
| trigger_validate_stock_movement | BEFORE INSERT | `inventory_movements` | `validate_stock_before_movement` |  |
| trigger_log_job_status_change | AFTER UPDATE | `jobs` | `log_job_status_change` |  |
| tr_audit_job_status | AFTER UPDATE | `jobs` | `audit_job_status_change` |  |
| tr_audit_job_changes | AFTER UPDATE | `jobs` | `audit_job_changes` |  |
| tr_audit_machine_changes | AFTER UPDATE | `machines` | `audit_machine_changes` |  |
| update_dashboard_presets_updated_at | BEFORE UPDATE | `dashboard_presets` | `update_updated_at_column` |  |
| trg_packaging_tasks_updated_at | BEFORE UPDATE | `packaging_tasks` | `update_updated_at_column` |  |
| trg_packaging_defects_updated_at | BEFORE UPDATE | `packaging_defects` | `update_updated_at_column` |  |
| trg_packaging_settings_updated_at | BEFORE UPDATE | `packaging_settings` | `update_updated_at_column` |  |
| trg_on_job_finished_create_packaging_task | AFTER UPDATE | `jobs` | `on_job_finished_create_packaging_task` |  |
| trg_packaging_ready_create_shipment | AFTER UPDATE | `packaging_tasks` | `on_packaging_ready_create_shipment` |  |
| trg_packaging_defect_create_rework | AFTER INSERT | `packaging_defects` | `on_packaging_defect_create_rework_job` |  |
| trg_pkg_checklist_items_updated_at | BEFORE UPDATE | `packaging_checklist_items` | `update_updated_at_column` |  |
| trg_pkg_task_checklist_updated_at | BEFORE UPDATE | `packaging_task_checklist` | `update_updated_at_column` |  |
| trg_enforce_pkg_checklist | BEFORE UPDATE | `packaging_tasks` | `enforce_packaging_checklist_before_ship` |  |
| trg_notify_packaging_task_created | AFTER INSERT | `packaging_tasks` | `notify_packaging_task_created` |  |
| trg_notify_packaging_defect_critical | AFTER INSERT | `packaging_defects` | `notify_packaging_defect_critical` |  |
| trg_audit_packaging_tasks | AFTER INSERT OR UPDATE OR DELETE | `packaging_tasks` | `audit_trigger_func` |  |
| trg_audit_packaging_defects | AFTER INSERT OR UPDATE OR DELETE | `packaging_defects` | `audit_trigger_func` |  |
| trg_audit_packaging_task_checklist | AFTER INSERT OR UPDATE OR DELETE | `packaging_task_checklist` | `audit_trigger_func` |  |
| trg_packaging_sla_overrides_updated_at | BEFORE UPDATE | `packaging_sla_overrides` | `update_updated_at_column` |  |
| update_cron_p95_daily_updated_at | BEFORE UPDATE | `cron_p95_daily` | `update_updated_at_column` |  |
| trg_validate_job_cancel_reason | BEFORE INSERT OR UPDATE OF STATUS, CANCEL_REASON | `jobs` | `validate_job_cancel_reason` |  |
| trg_job_cancelled_hold_packaging | AFTER UPDATE OF STATUS | `jobs` | `on_job_cancelled_hold_packaging` |  |
| trg_validate_packaging_loss_reason | BEFORE INSERT OR UPDATE OF REJECTED_QUANTITY, RECEIVED_QUANTITY, LOSS_REASON | `packaging_tasks` | `validate_packaging_loss_reason` |  |
| trg_validate_job_rework_depth | BEFORE INSERT OR UPDATE OF PARENT_JOB_ID | `jobs` | `validate_job_rework_depth` |  |

Erros lançados por funções SQL (`RAISE EXCEPTION` = regra de negócio no banco):

| Função | Mensagem | Origem |
|---|---|---|
| `audit_log_immutable` | audit_log is append-only and cannot be modified or deleted (record %) | `supabase/migrations/20260421004937_5207cda2-0f4b-42d5-92fd-f81b9f873ab3.sql` |
| `check_job_overlap` | Conflito de agendamento: A máquina % já possui um job agendado entre % e % nesta data. | `supabase/migrations/20260511192402_c6c4fbcf-9983-4e89-9e99-ea48b6af942d.sql` |
| `validate_inventory_stock` | Estoque insuficiente para o item %: solicitado %, disponível % | `supabase/migrations/20260513191015_060e8cb0-85d2-4700-91be-8e25b86ac040.sql` |
| `validate_stock_before_movement` | Saldo insuficiente em estoque para o item % | `supabase/migrations/20260514211903_477568e2-65ad-42f1-ba19-c4d35bc22e9f.sql` |
| `verify_audit_chain` | Access denied | `supabase/migrations/20260619160053_f360994f-c4a8-4301-b10f-b32c6cc8edd4.sql` |
| `enforce_packaging_checklist_before_ship` | Existem % item(ns) obrigatório(s) do checklist de conferência ainda não marcados. Conclua o checklist antes de liberar para envio. | `supabase/migrations/20260723150514_21fd854c-ed0c-4ee1-8b29-52977bc475fa.sql` |
| `get_cron_health` | Access denied | `supabase/migrations/20260726150724_ee3d2224-0878-43f3-8186-b76c4c61dc9a.sql` |
| `get_system_status_summary` | Access denied | `supabase/migrations/20260726165835_441f51a4-fda0-44bd-9395-849d58bcdb2b.sql` |
| `complete_maintenance_record` | record_id ausente no payload | `supabase/migrations/20261019140000_validation_hardening.sql` |
| `complete_maintenance_record` | Registro de manutenção não encontrado, já concluído ou já aprovado. | `supabase/migrations/20261019140000_validation_hardening.sql` |
| `approve_maintenance_record` | Registro já foi processado por outra aprovação/correção | `supabase/migrations/20261028233000_approve_maintenance_atomic.sql` |
| `validate_job_cancel_reason` | cancel_reason é obrigatório ao cancelar um job | `supabase/migrations/20261108000001_business_rules_ddl.sql` |
| `validate_packaging_loss_reason` | loss_reason é obrigatório quando rejeição supera 5%% da quantidade recebida | `supabase/migrations/20261108000001_business_rules_ddl.sql` |
| `validate_job_rework_depth` | Cadeia de rework não pode ter mais de 2 níveis (pai já tem pai) | `supabase/migrations/20261108000001_business_rules_ddl.sql` |

## E. Estados, máquinas de estado e transições

### E.1 Colunas de status no banco (derivado de migrations — pode divergir do banco)

| Tabela | Coluna | Valores permitidos (enum/CHECK) | Default |
|---|---|---|---|
| `jobs` | `status` | `buffer`, `cancelled`, `delayed`, `finished`, `packaging`, `paused`, `production`, `queue`, `ready`, `rework`, `scheduled` | `queue` |
| `jobs` | `shipping_status` | **livre (sem enum/CHECK)** |  |
| `bitrix24_sync_history` | `status` | `error`, `partial`, `success` |  |
| `technical_sheets` | `status` | `draft`, `published`, `review_needed` | `draft` |
| `technical_sheet_steps` | `step_number` | **livre (sem enum/CHECK)** |  |
| `maintenance_records` | `status` | **livre (sem enum/CHECK)** | `in_progress` |
| `shift_handovers` | `status` | `cancelled`, `completed`, `open`, `pending_acceptance` | `open` |
| `shift_pending_tasks` | `status` | `cancelled`, `completed`, `in_progress`, `pending` | `pending` |
| `production_lots` | `status` | **livre (sem enum/CHECK)** | `active` |
| `technical_documents` | `status` | `approved`, `pending`, `rejected` | `pending` |
| `push_notifications` | `status` | **livre (sem enum/CHECK)** | `pending` |
| `password_reset_requests` | `status` | `approved`, `pending`, `rejected` | `pending` |
| `login_audit` | `login_status` | **livre (sem enum/CHECK)** |  |
| `tpm_notification_templates` | `status` | `draft`, `published` | `published` |
| `tpm_notification_logs` | `status` | `failure`, `success` |  |
| `tpm_notification_queue` | `status` | **livre (sem enum/CHECK)** | `pending` |
| `tpm_executions` | `status` | **livre (sem enum/CHECK)** | `in_progress` |
| `reward_redemptions` | `status` | **livre (sem enum/CHECK)** | `pending` |
| `shipments` | `status` | **livre (sem enum/CHECK)** | `pending` |
| `job_status_history` | `previous_status` | **livre (sem enum/CHECK)** |  |
| `job_status_history` | `new_status` | **livre (sem enum/CHECK)** |  |
| `telemetry_traces` | `status` | **livre (sem enum/CHECK)** |  |
| `job_status_audit` | `old_status` | **livre (sem enum/CHECK)** |  |
| `job_status_audit` | `new_status` | **livre (sem enum/CHECK)** |  |
| `packaging_tasks` | `status` | `in_triage`, `on_hold`, `packaging`, `pending`, `ready_to_ship` | `pending` |
| `cron_health_history` | `last_status` | **livre (sem enum/CHECK)** |  |
| `edge_health_history` | `status` | `fail`, `pass`, `warn` |  |
| `bitrix24_oauth_states` | `state` | **livre (sem enum/CHECK)** |  |

### E.2 Mapas de transição declarados no código

- **TRANSITIONS** (`src/features/jobs/services/jobStateMachine.ts`):
  ```ts
  queue: ['scheduled', 'ready', 'cancelled'], scheduled: ['ready', 'production', 'queue', 'cancelled'], ready: ['production', 'scheduled', 'queue', 'cancelled'], production: ['paused', 'delayed', 'finished', 'rework', 'cancelled'], paused: ['production', 'cancelled'], delayed: ['production', 'cancelled'], rework: ['production', 'finished', 'cancelled'], buffer: ['ready', 'scheduled', 'cancelled'], packaging: ['finished', 'rework', 'cancelled'], finished: ['packaging'], cancelled: ['queue'],
  ```
- **DEFAULT_TRANSITION_CONFIG** (`src/lib/transitions/index.ts`):
  ```ts
  preset: 'blur-slide', duration: 350, ease: 'easeOut', distance: 30, enabled: true,
  ```
- **VALID_TRANSITIONS** (`src/pages/TraceabilityPage.tsx`):
  ```ts
  active: ['consumed', 'quarantine', 'blocked', 'expired'], quarantine: ['active', 'blocked'], blocked: ['quarantine', 'active'], consumed: [], expired: ['blocked'],
  ```
- **ROUTE_TRANSITIONS** (`src/routes/AppRoutes.tsx`):
  ```ts
  '/kiosk': 'fade', '/track': 'fade', '/auth': 'fade', '/reset-password': 'fade',
  ```

### E.3 Valores de status usados no código (escreve / compara / filtra)

| Campo | Valor | Uso | Onde |
|---|---|---|---|
| `type` | `ADD_TOAST` | compara, escreve | `src/hooks/use-toast.ts` |
| `type` | `CRITICAL_ERROR` | escreve | `src/lib/logger.ts` |
| `type` | `Calibração` | escreve | `src/components/design-system/hooks/MaintenanceOperatorDemos.tsx` |
| `type` | `DISMISS_TOAST` | compara, escreve | `src/hooks/use-toast.ts` |
| `type` | `IN` | compara, escreve | `src/features/inventory/components/inventory-page/InventoryHistoryTable.tsx`<br>`src/features/inventory/hooks/useInventory.ts`<br>`src/hooks/utils/inventoryExport.ts` |
| `type` | `LOT` | escreve | `src/components/traceability/LotQRCode.tsx` |
| `type` | `Lubrificação` | escreve | `src/components/design-system/hooks/MaintenanceOperatorDemos.tsx` |
| `type` | `OUT` | compara, filtra | `src/features/inventory/components/inventory-page/InventoryHistoryTable.tsx`<br>`src/features/inventory/hooks/useInventory.ts`<br>`src/hooks/utils/inventoryExport.ts`<br>`supabase/functions/calculate-inventory-intelligence/index.ts` |
| `type` | `Preventiva` | escreve | `src/components/design-system/hooks/MaintenanceOperatorDemos.tsx` |
| `type` | `REMOVE_TOAST` | compara, escreve | `src/hooks/use-toast.ts` |
| `type` | `SYNC_PENDING_ACTIONS` | compara, escreve | `public/sw.js`<br>`src/hooks/useOfflineSync.ts` |
| `type` | `TRANSFER` | compara, escreve | `src/features/inventory/components/inventory-page/InventoryHistoryTable.tsx`<br>`src/features/inventory/hooks/useInventory.ts`<br>`src/hooks/utils/inventoryExport.ts` |
| `type` | `UPDATE_TOAST` | compara, escreve | `src/hooks/use-toast.ts` |
| `type` | `availability` | compara, escreve | `src/features/analytics/components/oee/OEERecommendations.tsx` |
| `type` | `balancing` | escreve | `src/components/planning/AISuggestionDetails.tsx`<br>`src/components/planning/pending-queue/SmartSuggestionsSection.tsx`<br>`src/pages/PendingQueue.tsx` |
| `type` | `basic` | compara | `public/sw.js` |
| `type` | `blob` | escreve | `src/features/maintenance/components/ExecutionDetailsModal.tsx`<br>`src/features/maintenance/components/TPMReports.tsx` |
| `type` | `bottleneck` | compara, escreve | `src/features/notifications/hooks/usePushNotifications.ts`<br>`src/pages/AlertsDashboard.tsx` |
| `type` | `buffer` | escreve | `src/features/notifications/hooks/usePushNotifications.ts` |
| `type` | `category` | compara, escreve | `src/features/analytics/components/oee/OEELossDrilldown.tsx` |
| `type` | `celebration` | escreve | `src/components/feedback/FeedbackProvider.tsx` |
| `type` | `column` | compara, escreve | `src/components/kanban/DroppableColumn.tsx`<br>`src/features/jobs/hooks/useKanbanDragDrop.ts` |
| `type` | `complete` | escreve | `src/features/notifications/hooks/usePushNotifications.ts` |
| `type` | `compliance` | escreve | `src/features/admin/components/audit/AuditAIAdvisor.tsx` |
| `type` | `conflict` | escreve | `src/components/dashboard/AlertsWidget.tsx` |
| `type` | `cost` | escreve | `src/components/abc/AIFinancialAdvisor.tsx` |
| `type` | `critical` | escreve | `src/features/notifications/hooks/useTPMNotifications.ts` |
| `type` | `critical_failure` | escreve | `src/features/notifications/hooks/useMLPredictionNotifications.ts` |
| `type` | `cron_email_sent` | escreve | `supabase/functions/cron-alert-email/index.ts` |
| `type` | `danger` | compara, escreve | `src/features/analytics/components/bi/BIAIInsights.tsx` |
| `type` | `degradation` | escreve | `src/components/design-system/hooks/PredictionHooksDemos.tsx` |
| `type` | `delay` | compara, escreve | `src/features/analytics/components/bi/executive/KPIAlertsTab.tsx`<br>`src/features/analytics/hooks/useKPIs.ts` |
| `type` | `delayed` | escreve | `src/components/dashboard/AlertsWidget.tsx`<br>`src/features/notifications/hooks/usePushNotifications.ts` |
| `type` | `dragenter` | compara | `src/components/documents/DocumentUploadModal.tsx` |
| `type` | `dragleave` | compara | `src/components/documents/DocumentUploadModal.tsx` |
| `type` | `dragover` | compara | `src/components/documents/DocumentUploadModal.tsx` |
| `type` | `due` | escreve | `src/features/notifications/hooks/useTPMNotifications.ts` |
| `type` | `eco` | escreve | `src/features/analytics/components/energy/AIEnergyAdvisor.tsx` |
| `type` | `efficiency` | compara, escreve | `src/components/operators/CreateGoalModal.tsx`<br>`src/components/operators/GoalAlertsWidget.tsx`<br>`src/components/operators/GoalsHistoryCard.tsx`<br>`src/components/operators/OperatorGoalsCard.tsx`<br>`src/components/operators/OperatorGoalsTab.tsx`<br>… +2 |
| `type` | `error` | compara, escreve | `src/components/feedback/FeedbackProvider.tsx`<br>`src/features/notifications/components/ToastWithUndo.tsx`<br>`src/features/packaging/hooks/useSoundFeedback.ts`<br>`src/hooks/useSmartDelayAlerts.ts`<br>`src/hooks/useTechniqueCapacityAlerts.ts` |
| `type` | `failure` | escreve | `src/components/design-system/hooks/PredictionHooksDemos.tsx` |
| `type` | `failure_risk` | compara | `src/features/analytics/hooks/useMLPredictions.ts`<br>`src/features/notifications/hooks/useMLPredictionNotifications.ts` |
| `type` | `fetch` | escreve | `src/features/production/hooks/usePerformanceMetrics.ts` |
| `type` | `fixed` | compara, escreve | `src/components/design-system/sections/ChangelogSection.tsx` |
| `type` | `forecast` | escreve | `src/components/abc/AIFinancialAdvisor.tsx` |
| `type` | `forensics` | escreve | `src/features/admin/components/audit/AuditAIAdvisor.tsx` |
| `type` | `general` | escreve | `src/features/analytics/components/oee/OEERecommendations.tsx` |
| `type` | `high_risk` | escreve | `src/features/notifications/hooks/useMLPredictionNotifications.ts` |
| `type` | `important` | compara | `src/components/knowledge/TechnicalSheetTab.tsx` |
| `type` | `improved` | compara, escreve | `src/components/design-system/sections/ChangelogSection.tsx` |
| `type` | `info` | escreve | `src/components/abc/AIFinancialAdvisor.tsx`<br>`src/components/feedback/FeedbackProvider.tsx`<br>`src/components/operators/AIWorkforceAdvisor.tsx`<br>`src/contexts/NotificationsContext.tsx`<br>`src/features/analytics/components/bi/AIInsights.tsx`<br>… +6 |
| `type` | `integrity` | escreve | `src/features/admin/components/audit/AuditAIAdvisor.tsx` |
| `type` | `inventory` | escreve | `src/components/inventory/QRLabelModal.tsx`<br>`src/features/inventory/components/inventory-page/BatchQRLabelModal.tsx` |
| `type` | `job` | compara, escreve | `src/components/kanban/DraggableJobCard.tsx`<br>`src/components/qrcode/QRScanner.tsx`<br>`src/features/analytics/components/oee/OEELossDrilldown.tsx`<br>`src/features/jobs/hooks/useKanbanDragDrop.ts` |
| `type` | `jobs` | compara, escreve | `src/pages/AlertsDashboard.tsx` |
| `type` | `jobs_completed` | compara | `src/components/operators/CreateGoalModal.tsx`<br>`src/components/operators/GoalAlertsWidget.tsx`<br>`src/components/operators/OperatorGoalsCard.tsx`<br>`src/components/operators/OperatorGoalsTab.tsx` |
| `type` | `loadBalancing` | compara, escreve | `src/pages/AlertsDashboard.tsx` |
| `type` | `loading` | compara, escreve | `src/components/feedback/FeedbackProvider.tsx`<br>`src/features/notifications/components/ToastWithUndo.tsx` |
| `type` | `logistics` | escreve | `src/components/autonomous/AutonomousEventLog.tsx` |
| `type` | `loss` | compara, escreve | `src/features/analytics/components/bi/executive/KPIAlertsTab.tsx`<br>`src/features/analytics/hooks/useKPIs.ts` |
| `type` | `loss_rate` | compara | `src/components/operators/CreateGoalModal.tsx`<br>`src/components/operators/GoalAlertsWidget.tsx`<br>`src/components/operators/GoalsHistoryCard.tsx`<br>`src/components/operators/OperatorGoalsCard.tsx`<br>`src/components/operators/OperatorGoalsTab.tsx`<br>… +1 |
| `type` | `machine` | escreve | `src/components/calendar/CalendarTimeline.tsx`<br>`src/components/machines/MachineQRDialog.tsx`<br>`src/features/analytics/components/oee/OEERankingGap.tsx` |
| `type` | `maintenance` | compara, escreve | `src/components/autonomous/AutonomousEventLog.tsx`<br>`src/components/design-system/hooks/PredictionHooksDemos.tsx`<br>`src/features/notifications/components/NotificationCard.tsx`<br>`src/features/notifications/components/NotificationsList.tsx`<br>`src/features/notifications/hooks/useTPMNotifications.ts`<br>… +1 |
| `type` | `maintenance-report` | escreve | `src/features/maintenance/components/ExecutionDetailsModal.tsx` |
| `type` | `maintenance_needed` | compara | `src/features/analytics/hooks/useMLPredictions.ts`<br>`src/features/notifications/hooks/useMLPredictionNotifications.ts` |
| `type` | `maintenance_recommendation` | escreve | `src/features/notifications/hooks/useMLPredictionNotifications.ts` |
| `type` | `major` | compara, escreve | `src/components/design-system/sections/ChangelogSection.tsx` |
| `type` | `minor` | compara, escreve | `src/components/design-system/sections/ChangelogSection.tsx` |
| `type` | `ml_prediction` | escreve | `src/features/notifications/hooks/useMLPredictionNotifications.ts` |
| `type` | `new` | compara, escreve | `src/components/design-system/sections/ChangelogSection.tsx` |
| `type` | `new_device` | escreve | `supabase/functions/new-device-alert/index.ts` |
| `type` | `occupancy` | escreve | `src/features/analytics/hooks/useKPIs.ts` |
| `type` | `oee-alert` | escreve | `src/features/production/hooks/useOEEAlerts.ts` |
| `type` | `operator_badge` | escreve | `src/components/operators/OperatorQRBadgeDialog.tsx` |
| `type` | `opportunity` | escreve | `src/components/abc/AIFinancialAdvisor.tsx` |
| `type` | `optimization` | escreve | `src/components/autonomous/AutonomousEventLog.tsx` |
| `type` | `orchestration` | escreve | `src/components/autonomous/AutonomousEventLog.tsx` |
| `type` | `orphaned_technique` | escreve | `src/features/admin/hooks/useOrphanedDataDetection.ts` |
| `type` | `overdue` | escreve | `src/features/notifications/hooks/useTPMNotifications.ts` |
| `type` | `patch` | compara | `src/components/design-system/sections/ChangelogSection.tsx` |
| `type` | `performance` | compara, escreve | `src/features/analytics/components/oee/OEERecommendations.tsx`<br>`src/features/analytics/components/oee/PredictiveAlerts.tsx`<br>`src/features/production/hooks/useOEE.ts` |
| `type` | `performance_degradation` | compara | `src/features/analytics/hooks/useMLPredictions.ts`<br>`src/features/notifications/hooks/useMLPredictionNotifications.ts` |
| `type` | `pie` | compara | `src/components/loading/SkeletonLibrary.tsx` |
| `type` | `pieces_produced` | compara | `src/components/operators/CreateGoalModal.tsx`<br>`src/components/operators/GoalAlertsWidget.tsx`<br>`src/components/operators/OperatorGoalsCard.tsx`<br>`src/components/operators/OperatorGoalsTab.tsx` |
| `type` | `prediction` | compara, escreve | `src/features/notifications/components/NotificationCard.tsx`<br>`src/features/notifications/components/NotificationsList.tsx`<br>`src/pages/NotificationsPage.tsx` |
| `type` | `priority` | compara, escreve | `src/pages/Bitrix24ConfigPage.tsx` |
| `type` | `production_without_machine` | escreve | `src/features/admin/hooks/useOrphanedDataDetection.ts` |
| `type` | `profit` | escreve | `src/components/abc/AIFinancialAdvisor.tsx` |
| `type` | `promise` | compara | `src/features/notifications/components/ToastWithUndo.tsx` |
| `type` | `pull` | compara | `src/components/integrations/Bitrix24SyncHistory.tsx` |
| `type` | `push` | compara | `src/components/integrations/Bitrix24SyncHistory.tsx` |
| `type` | `qr_scan` | compara | `src/lib/offline/replayPendingAction.ts` |
| `type` | `quality` | compara, escreve | `src/components/autonomous/AutonomousEventLog.tsx`<br>`src/features/analytics/components/oee/HyperInsights.tsx`<br>`src/features/analytics/components/oee/OEERecommendations.tsx` |
| `type` | `quantum` | escreve | `src/components/autonomous/AutonomousEventLog.tsx` |
| `type` | `reason` | compara, escreve | `src/features/analytics/components/oee/OEELossDrilldown.tsx` |
| `type` | `recovery` | compara | `src/pages/ResetPasswordPage.tsx` |
| `type` | `register_production` | compara | `src/lib/offline/replayPendingAction.ts` |
| `type` | `removed` | compara | `src/components/design-system/sections/ChangelogSection.tsx` |
| `type` | `render` | escreve | `src/features/production/hooks/usePerformanceMetrics.ts` |
| `type` | `root` | escreve | `src/features/analytics/components/oee/OEELossDrilldown.tsx` |
| `type` | `sawtooth` | escreve | `src/features/notifications/hooks/useNotificationSounds.ts` |
| `type` | `scan` | compara | `src/features/packaging/hooks/useSoundFeedback.ts` |
| `type` | `scheduled` | escreve | `src/components/dashboard/ActivityFeedWidget.tsx` |
| `type` | `security` | escreve | `src/features/admin/components/audit/AuditAIAdvisor.tsx` |
| `type` | `setup` | compara, escreve | `src/components/planning/AISuggestionDetails.tsx`<br>`src/components/planning/pending-queue/SmartSuggestionsSection.tsx`<br>`src/pages/PendingQueue.tsx` |
| `type` | `sine` | escreve | `src/components/qrcode/scanHistorySounds.ts`<br>`src/features/notifications/hooks/useNotificationSounds.ts` |
| `type` | `spring` | escreve | `src/components/digital-twin/CostSimulationCard.tsx`<br>`src/components/feedback/CelebrationMoment.tsx`<br>`src/components/layout/AppSidebar.tsx`<br>`src/components/mobile/PullToRefresh.tsx`<br>`src/components/navigation/MobileNavigation.tsx`<br>… +9 |
| `type` | `square` | escreve | `src/features/notifications/hooks/useNotificationSounds.ts` |
| `type` | `started` | escreve | `src/components/dashboard/ActivityFeedWidget.tsx` |
| `type` | `status` | escreve | `src/features/notifications/hooks/usePushNotifications.ts` |
| `type` | `stuckJobs` | compara, escreve | `src/pages/AlertsDashboard.tsx` |
| `type` | `success` | compara, escreve | `src/components/feedback/FeedbackProvider.tsx`<br>`src/components/operators/AIWorkforceAdvisor.tsx`<br>`src/features/analytics/components/bi/AIInsights.tsx`<br>`src/features/analytics/components/bi/BIAIInsights.tsx`<br>`src/features/analytics/components/energy/AIEnergyAdvisor.tsx`<br>… +3 |
| `type` | `summary` | compara, escreve | `src/features/notifications/components/NotificationCard.tsx`<br>`src/features/notifications/components/NotificationsList.tsx`<br>`src/pages/NotificationsPage.tsx` |
| `type` | `sync` | escreve | `src/components/autonomous/AutonomousEventLog.tsx` |
| `type` | `technique` | compara, escreve | `src/components/calendar/CalendarTimeline.tsx`<br>`src/features/analytics/components/oee/OEERankingGap.tsx`<br>`src/pages/Bitrix24ConfigPage.tsx` |
| `type` | `tip` | escreve | `src/components/operators/AIWorkforceAdvisor.tsx`<br>`src/features/analytics/components/energy/AIEnergyAdvisor.tsx` |
| `type` | `totp` | escreve | `src/features/auth/hooks/useMFA.ts` |
| `type` | `triangle` | escreve | `src/components/qrcode/scanHistorySounds.ts` |
| `type` | `upcoming` | escreve | `src/features/notifications/hooks/useTPMNotifications.ts` |
| `type` | `update_job` | compara, escreve | `src/lib/offline/offlineQueue.ts`<br>`src/lib/offline/replayPendingAction.ts`<br>`src/lib/offlineStorage.ts` |
| `type` | `warning` | compara, escreve | `src/components/dashboard/AlertsWidget.tsx`<br>`src/components/feedback/FeedbackProvider.tsx`<br>`src/components/knowledge/TechnicalSheetTab.tsx`<br>`src/components/operators/AIWorkforceAdvisor.tsx`<br>`src/features/analytics/components/bi/AIInsights.tsx`<br>… +8 |
| `type` | `webhook` | compara | `src/components/integrations/Bitrix24SyncHistory.tsx` |
| `type` | `window` | escreve | `public/sw.js` |
| `role` | `admin` | compara, filtra | `src/components/auth/ProtectedRoute.tsx`<br>`src/components/layout/AppSidebar.tsx`<br>`src/components/navigation/MobileNavigation.tsx`<br>`src/features/auth/components/AuthProvider.tsx`<br>`src/features/auth/hooks/useRBAC.tsx`<br>… +3 |
| `role` | `assistant` | compara, escreve | `src/components/assistant/TechnicalAssistant.tsx`<br>`src/components/technical-assistant/ChatArea.tsx`<br>`src/components/technical-assistant/ChatMessage.tsx`<br>`src/pages/TechnicalAssistantPage.tsx` |
| `role` | `coordinator` | compara, escreve, filtra | `src/components/auth/ProtectedRoute.tsx`<br>`src/components/documents/DocumentsList.tsx`<br>`src/components/layout/AppSidebar.tsx`<br>`src/components/navigation/MobileNavigation.tsx`<br>`src/features/auth/components/AuthProvider.tsx`<br>… +5 |
| `role` | `manager` | compara | `src/components/auth/ProtectedRoute.tsx`<br>`src/components/layout/AppSidebar.tsx`<br>`src/components/navigation/MobileNavigation.tsx`<br>`src/components/navigation/MobileQuickActions.tsx`<br>`src/features/auth/components/AuthProvider.tsx` |
| `role` | `operator` | compara, escreve, filtra | `src/components/auth/ProtectedRoute.tsx`<br>`src/components/layout/AppSidebar.tsx`<br>`src/components/layout/OperatorMachinesIndicator.tsx`<br>`src/components/navigation/MobileNavigation.tsx`<br>`src/components/navigation/MobileQuickActions.tsx`<br>… +6 |
| `role` | `system` | escreve | `supabase/functions/ml-predictions/index.ts`<br>`supabase/functions/technical-assistant/index.ts` |
| `role` | `user` | compara, escreve | `src/components/assistant/TechnicalAssistant.tsx`<br>`src/components/technical-assistant/ChatArea.tsx`<br>`src/components/technical-assistant/ChatMessage.tsx`<br>`src/hooks/useTechnicalConversations.ts`<br>`src/pages/TechnicalAssistantPage.tsx`<br>… +2 |
| `status` | `Bom` | escreve | `src/components/design-system/sections/code-quality/CodeQualityPerformanceTab.tsx` |
| `status` | `Cancelado` | escreve | `src/components/design-system/sections/tables/BasicAndStripedTables.tsx`<br>`src/components/design-system/sections/tables/InteractiveTables.tsx` |
| `status` | `Conectado` | escreve | `src/components/settings/SettingsBackupTab.tsx` |
| `status` | `Configurar` | escreve | `src/components/settings/SettingsBackupTab.tsx` |
| `status` | `Equilibrado` | escreve | `src/features/analytics/components/bi/FuturisticBI.tsx` |
| `status` | `Pago` | compara, escreve | `src/components/design-system/sections/tables/BasicAndStripedTables.tsx`<br>`src/components/design-system/sections/tables/InteractiveTables.tsx` |
| `status` | `Pendente` | compara, escreve | `src/components/design-system/sections/tables/BasicAndStripedTables.tsx`<br>`src/components/design-system/sections/tables/InteractiveTables.tsx` |
| `status` | `SUBSCRIBED` | compara | `src/pages/NotificationsPage.tsx` |
| `status` | `active` | compara | `src/components/traceability/TraceabilityStatsCards.tsx`<br>`src/pages/TraceabilityPage.tsx` |
| `status` | `approved` | compara, escreve | `src/components/documents/DocumentViewer.tsx`<br>`src/components/documents/DocumentsList.tsx`<br>`src/components/settings/PasswordResetRequests.tsx`<br>`src/features/maintenance/components/ExecutionDetailsModal.tsx`<br>`src/features/maintenance/components/ExecutionRecordView.tsx`<br>… +5 |
| `status` | `blocked` | compara | `src/components/traceability/TraceabilityStatsCards.tsx` |
| `status` | `buffer` | compara | `src/features/jobs/hooks/useSchedulingData.ts`<br>`src/features/production/hooks/useOperatorDashboardData.ts` |
| `status` | `cancelled` | compara, filtra | `src/components/jobs/JobQuickActions.tsx`<br>`src/components/shift/PendingTasksPanel.tsx`<br>`src/features/jobs/hooks/useDailyDragDrop.ts`<br>`src/features/jobs/hooks/useWeeklyDragDrop.ts`<br>`src/features/maintenance/components/TPMExecutionHistory.tsx`<br>… +3 |
| `status` | `completed` | compara, escreve, filtra | `src/components/shift/PendingTasksPanel.tsx`<br>`src/features/maintenance/components/ExecutionDetailsModal.tsx`<br>`src/features/maintenance/components/ExecutionRecordView.tsx`<br>`src/features/maintenance/components/MachineTPMPanel.tsx`<br>`src/features/maintenance/components/MachineTPMTimeline.tsx`<br>… +7 |
| `status` | `concluido` | compara, escreve | `src/pages/CodeQualityDashboard.tsx` |
| `status` | `connected` | compara, escreve | `src/components/integrations/IntegrationHub.tsx`<br>`src/features/analytics/hooks/useRealtimeConnection.ts` |
| `status` | `connecting` | compara | `src/components/dashboard/RealtimeIndicator.tsx` |
| `status` | `correction_requested` | compara, escreve | `src/features/maintenance/components/ExecutionDetailsModal.tsx`<br>`src/features/maintenance/components/ExecutionRecordView.tsx`<br>`src/features/maintenance/hooks/useTPMApprovalMutations.ts` |
| `status` | `critical` | compara | `src/components/operator/ProductionTimer.tsx`<br>`src/components/scheduling/CapacityHealthPanel.tsx`<br>`src/hooks/useTechniqueCapacityAlerts.ts` |
| `status` | `delayed` | compara, escreve | `src/components/calendar/AgendaView.tsx`<br>`src/components/dashboard/AlertsWidget.tsx`<br>`src/components/design-system/sections/tables/InteractiveTables.tsx`<br>`src/components/jobs/JobQuickActions.tsx`<br>`src/components/kanban/KanbanMetricsBar.tsx`<br>… +21 |
| `status` | `delivered` | compara | `src/components/logistics/EditShipmentModal.tsx`<br>`src/pages/LogisticsPage.tsx` |
| `status` | `disconnected` | escreve | `src/components/integrations/IntegrationHub.tsx` |
| `status` | `draft` | compara, escreve | `src/features/maintenance/components/TPMNotificationTemplates.tsx`<br>`src/hooks/technical-sheets/technicalSheetsTypes.ts` |
| `status` | `error` | compara | `src/components/integrations/Bitrix24SyncHistory.tsx` |
| `status` | `fail` | compara, escreve | `src/features/admin/components/security/SecurityOverviewCard.tsx`<br>`src/features/maintenance/hooks/useTPMLifecycleMutations.ts`<br>`src/lib/simulation.ts`<br>`src/pages/SimulationDashboard.tsx`<br>`supabase/functions/health-monitor/index.ts` |
| `status` | `failed` | compara, escreve | `src/features/maintenance/components/TPMNotificationQueue.tsx`<br>`supabase/functions/tpm-notifications/index.ts` |
| `status` | `finished` | compara, escreve, filtra | `src/components/calendar/JobQuickActions.tsx`<br>`src/components/design-system/sections/tables/InteractiveTables.tsx`<br>`src/components/jobs/JobQuickActions.tsx`<br>`src/components/jobs/JobTraceabilityTab.tsx`<br>`src/components/kanban/DraggableJobCard.tsx`<br>… +41 |
| `status` | `fulfilled` | compara | `src/features/auth/components/AuthProvider.tsx`<br>`src/hooks/abc/useABCMutations.ts`<br>`src/pages/KanbanBoard.tsx`<br>`supabase/functions/send-email-report/index.ts` |
| `status` | `good` | escreve | `src/components/operator/ProductionTimer.tsx` |
| `status` | `idle` | compara, escreve | `src/components/dashboard/LiveMachineStatusPanel.tsx`<br>`src/features/production/hooks/useMachineStatusHub.ts` |
| `status` | `in_progress` | compara, escreve, filtra | `src/features/maintenance/components/ExecutionDetailsModal.tsx`<br>`src/features/maintenance/components/MachineTPMTimeline.tsx`<br>`src/features/maintenance/components/TPMExecutionHistory.tsx`<br>`src/features/maintenance/hooks/types.ts`<br>`src/features/maintenance/hooks/useTPMLifecycleMutations.ts`<br>… +1 |
| `status` | `in_transit` | compara | `src/pages/LogisticsPage.tsx` |
| `status` | `in_triage` | compara, escreve | `src/features/packaging/components/PackagingStatsCards.tsx`<br>`src/features/packaging/hooks/usePackagingSettings.ts`<br>`src/features/packaging/services/packagingService.ts`<br>`src/pages/PackagingDashboard.tsx`<br>`src/pages/PackagingKioskPage.tsx` |
| `status` | `logged_only` | escreve | `supabase/functions/webhook-handler/index.ts` |
| `status` | `normal` | escreve | `src/hooks/useTechniqueCapacityAlerts.ts` |
| `status` | `not_implemented` | escreve | `supabase/functions/image-optimizer/index.ts` |
| `status` | `on_hold` | compara | `src/features/packaging/hooks/usePackagingSettings.ts`<br>`src/pages/PackagingDashboard.tsx` |
| `status` | `open` | compara, escreve, filtra | `src/components/shift/HandoverDetailsModal.tsx`<br>`src/components/shift/OccurrencesPanel.tsx`<br>`src/hooks/shift-handover/shiftHandoverTypes.ts`<br>`src/pages/ShiftHandoverPage.tsx` |
| `status` | `overdue` | compara, escreve | `src/components/design-system/hooks/MaintenanceOperatorDemos.tsx` |
| `status` | `packaging` | compara, escreve | `src/features/jobs/services/jobsService.ts`<br>`src/features/packaging/components/PackagingStatsCards.tsx`<br>`src/features/packaging/components/PackagingTaskDetail.tsx`<br>`src/features/packaging/hooks/usePackagingSettings.ts`<br>`src/features/packaging/services/packagingService.ts`<br>… +2 |
| `status` | `partial` | compara, escreve | `src/components/integrations/Bitrix24SyncHistory.tsx`<br>`supabase/functions/webhook-handler/index.ts` |
| `status` | `pass` | compara, escreve | `src/features/admin/components/security/SecurityOverviewCard.tsx`<br>`src/features/maintenance/components/MaintenanceExecutionModal.tsx`<br>`src/features/maintenance/hooks/types.ts`<br>`src/lib/simulation.ts`<br>`src/pages/SimulationDashboard.tsx`<br>… +2 |
| `status` | `paused` | compara, escreve | `src/components/calendar/JobQuickActions.tsx`<br>`src/components/dashboard/LiveMachineStatusPanel.tsx`<br>`src/components/jobs/JobQuickActions.tsx`<br>`src/components/kanban/DraggableJobCard.tsx`<br>`src/components/kiosk/KioskMode.tsx`<br>… +8 |
| `status` | `pending` | compara, escreve, filtra | `src/components/dashboard/ShiftHandoverWidget.tsx`<br>`src/components/documents/DocumentViewer.tsx`<br>`src/components/logistics/CreateShipmentModal.tsx`<br>`src/components/settings/PasswordResetRequests.tsx`<br>`src/components/shift/HandoverDetailsModal.tsx`<br>… +17 |
| `status` | `pending_acceptance` | compara, escreve | `src/components/shift/HandoverDetailsModal.tsx`<br>`src/hooks/shift-handover/useShiftHandoverMutations.ts`<br>`src/pages/ShiftHandoverPage.tsx` |
| `status` | `processing` | compara | `src/features/maintenance/components/TPMNotificationQueue.tsx` |
| `status` | `producing` | compara | `src/components/dashboard/LiveMachineStatusPanel.tsx` |
| `status` | `production` | compara, escreve, filtra | `src/components/calendar/AgendaView.tsx`<br>`src/components/calendar/JobQuickActions.tsx`<br>`src/components/dashboard/LiveMachineStatusPanel.tsx`<br>`src/components/design-system/sections/tables/InteractiveTables.tsx`<br>`src/components/digital-twin/FactoryFloorMap.tsx`<br>… +37 |
| `status` | `published` | compara, escreve, filtra | `src/components/knowledge/KnowledgeStatusBadge.tsx`<br>`src/features/jobs/hooks/useJobInventoryCheck.ts`<br>`src/features/maintenance/components/TPMNotificationTemplates.tsx` |
| `status` | `quarantine` | compara | `src/components/traceability/TraceabilityStatsCards.tsx` |
| `status` | `queue` | compara, escreve, filtra | `src/components/design-system/sections/tables/InteractiveTables.tsx`<br>`src/components/jobs/JobQuickActions.tsx`<br>`src/features/admin/hooks/useBIExport.ts`<br>`src/features/analytics/components/bi/FuturisticBI.tsx`<br>`src/features/jobs/hooks/useDuplicateJob.ts`<br>… +10 |
| `status` | `read` | compara, escreve, filtra | `src/features/notifications/hooks/useNotifications.ts` |
| `status` | `ready` | compara, escreve, filtra | `src/components/dashboard/AlertsWidget.tsx`<br>`src/components/dashboard/BufferPromotionStatus.tsx`<br>`src/components/design-system/sections/tables/InteractiveTables.tsx`<br>`src/components/jobs/JobQuickActions.tsx`<br>`src/components/kiosk/KioskMode.tsx`<br>… +8 |
| `status` | `ready_to_ship` | compara, escreve | `src/features/packaging/components/PackagingStatsCards.tsx`<br>`src/features/packaging/components/PackagingTaskDetail.tsx`<br>`src/features/packaging/hooks/usePackagingQuality.ts`<br>`src/features/packaging/hooks/usePackagingSettings.ts`<br>`src/features/packaging/hooks/usePackagingThroughput.ts`<br>… +3 |
| `status` | `rejected` | compara, escreve | `src/components/documents/DocumentsList.tsx`<br>`src/components/settings/PasswordResetRequests.tsx`<br>`src/hooks/abc/useABCMutations.ts`<br>`src/hooks/useDocuments.ts`<br>`supabase/functions/send-email-report/index.ts` |
| `status` | `returned` | compara | `src/pages/LogisticsPage.tsx` |
| `status` | `review_needed` | compara | `src/components/knowledge/KnowledgeStatusBadge.tsx` |
| `status` | `rework` | compara, escreve | `src/components/jobs/JobQuickActions.tsx`<br>`src/features/jobs/hooks/useSchedulingData.ts`<br>`src/features/production/hooks/useOperatorDashboardData.ts`<br>`src/hooks/useAlertCount.ts`<br>`src/pages/AlertsDashboard.tsx`<br>… +3 |
| `status` | `scheduled` | compara, escreve | `src/components/calendar/QuickJobDrawer.tsx`<br>`src/components/dashboard/AlertScheduleModal.tsx`<br>`src/components/design-system/hooks/MaintenanceOperatorDemos.tsx`<br>`src/components/jobs/JobQuickActions.tsx`<br>`src/components/kanban/DraggableJobCard.tsx`<br>… +8 |
| `status` | `sending` | escreve | `supabase/functions/send-push-notification/index.ts` |
| `status` | `sent` | compara, escreve | `src/features/maintenance/components/TPMNotificationQueue.tsx`<br>`supabase/functions/cron-alert-email/index.ts`<br>`supabase/functions/send-email-report/index.ts`<br>`supabase/functions/tpm-notifications/index.ts` |
| `status` | `string` | compara | `src/features/analytics/hooks/useBottleneckPrediction.ts`<br>`src/features/analytics/hooks/useKPIs.ts`<br>`src/features/analytics/hooks/useLoadBalancing.ts`<br>`src/features/jobs/hooks/useSmartSequencing.ts` |
| `status` | `success` | compara, escreve | `src/components/integrations/Bitrix24SyncHistory.tsx`<br>`src/features/maintenance/components/TPMNotificationLogs.tsx`<br>`src/features/notifications/hooks/useTPMNotifications.ts`<br>`supabase/functions/bitrix24-sync/index.ts`<br>`supabase/functions/tpm-notifications/index.ts` |
| `status` | `syncing` | escreve | `src/components/traceability/BlockchainIntegrityCard.tsx` |
| `status` | `upcoming` | compara, escreve | `src/components/design-system/hooks/MaintenanceOperatorDemos.tsx` |
| `status` | `verified` | compara, escreve | `src/components/settings/TwoFactorSetup.tsx`<br>`src/components/traceability/BlockchainIntegrityCard.tsx`<br>`src/features/admin/components/security/MFASettings.tsx`<br>`src/features/auth/hooks/useAuthenticatorAssuranceLevel.ts`<br>`src/features/auth/hooks/useMFA.ts`<br>… +1 |
| `status` | `warn` | compara | `src/features/admin/components/security/SecurityOverviewCard.tsx` |
| `status` | `warning` | compara | `src/components/operator/ProductionTimer.tsx`<br>`src/components/scheduling/CapacityHealthPanel.tsx`<br>`src/hooks/useTechniqueCapacityAlerts.ts` |
| `state` | `closed` | escreve | `src/lib/circuitBreaker.ts` |
| `state` | `collapsed` | compara | `src/components/ui/sidebar.tsx` |
| `state` | `error` | compara | `src/components/design-system/hooks/PredictionHooksDemos.tsx` |
| `state` | `expanded` | escreve | `src/components/ui/sidebar.tsx` |
| `state` | `half_open` | compara | `src/lib/circuitBreaker.ts` |
| `state` | `idle` | compara | `src/components/design-system/hooks/PredictionHooksDemos.tsx` |
| `state` | `loading` | compara | `src/components/design-system/hooks/PredictionHooksDemos.tsx` |
| `state` | `open` | compara | `src/lib/circuitBreaker.ts` |
| `state` | `retrying` | compara | `src/components/design-system/hooks/PredictionHooksDemos.tsx` |
| `state` | `success` | compara | `src/components/design-system/hooks/PredictionHooksDemos.tsx` |
| `state` | `suspended` | compara | `src/components/layout/QuickFavoritesBar.tsx`<br>`src/features/notifications/hooks/useNotificationSounds.ts`<br>`src/hooks/useThemeSound.ts`<br>`src/lib/soundFeedback.ts` |
| `login_status` | `failed` | filtra | `src/features/admin/hooks/useMonitoringData.ts` |
| `sheet_status` | `draft` | escreve | `src/integrations/supabase/types.ts` |

### E.4 Enums e listas de valores

| Nome | Valores | Onde |
|---|---|---|
| app_role | `coordinator`, `operator`, `manager`, `admin` | banco |
| sheet_status | `draft`, `published`, `review_needed` | banco |
| skill_level | `basic`, `advanced`, `expert` | banco |
| CalendarGroupBy | machine \| technique | `src/components/calendar/types.ts` |
| ViewMode | expanded \| compact | `src/components/kanban/KanbanFiltersBar.tsx` |
| SwimlanesMode | none \| technique \| machine | `src/components/kanban/KanbanFiltersBar.tsx` |
| CommandCategory | navigation \| actions \| settings \| recent \| contextual \| jobs \| search | `src/components/navigation/CommandPaletteCommands.tsx` |
| HistoryPeriodPreset | today \| 7d \| 30d \| all \| custom | `src/features/admin/components/audit/HistoryPeriodFilter.tsx` |
| ActivityType | create \| update \| delete \| view \| login \| logout \| settings \| error \| success \| warning | `src/features/admin/hooks/useActivityLog.ts` |
| ExportFormat | csv \| json | `src/features/admin/hooks/useDataExport.ts` |
| MonitoringWindow | 1h \| 24h \| 7d | `src/features/admin/hooks/useMonitoringData.ts` |
| KPIPeriod | day \| week \| month \| year \| all | `src/features/analytics/hooks/useKPIs.ts` |
| ConnectionStatus | connecting \| connected \| disconnected \| error | `src/features/analytics/hooks/useRealtimeConnection.ts` |
| AppRole | coordinator \| operator \| manager \| admin | `src/features/auth/types/auth.types.ts` |
| InventoryCategory | ink \| screen \| solvent \| consumable \| other | `src/features/inventory/hooks/useInventory.ts` |
| SortField | orderNumber \| client \| scheduledDate \| priority \| quantity \| created_at | `src/features/jobs/lib/pending-queue.ts` |
| SortDirection | asc \| desc | `src/features/jobs/lib/pending-queue.ts` |
| SlaLevel | ok \| warning \| overdue | `src/features/packaging/hooks/usePackagingSettings.ts` |
| DELAY_CATEGORIES | { value: 'atraso_producao', label: 'Atraso vindo da produção' }, { value: 'fila_manuseio', label: 'Fila no setor de manuseio' }, { value: 'retrabalho', label: 'Retrabalho / defeito' }, { value: 'falta_material', label: 'Falta de material de embalagem' }, { value: 'falta_operador', label: 'Falta de o … | `src/features/packaging/types/packaging.schema.ts` |
| DowntimeType | setup \| maintenance \| breakdown \| idle \| other | `src/features/production/hooks/useMachineDowntime.ts` |
| GoalType | efficiency \| jobs_completed \| pieces_produced \| loss_rate | `src/features/production/hooks/useOperatorGoals.ts` |
| SkillLevel | basic \| advanced \| expert | `src/features/production/hooks/useOperatorSkills.ts` |
| HapticPattern | light \| medium \| heavy \| selection \| success \| warning \| error | `src/hooks/use-haptic-feedback.tsx` |
| SwipeDirection | left \| right \| up \| down | `src/hooks/use-swipe-gesture.tsx` |
| CircuitState | closed \| open \| half_open | `src/lib/circuitBreaker.ts` |
| ErrorSeverity | info \| warning \| error \| critical | `src/lib/errorHandling.ts` |
| LogLevel | debug \| info \| warn \| error \| critical | `src/lib/logger.ts` |
| NavBackVia | button \| swipe \| hotkey \| breadcrumb \| mobile-header | `src/lib/navTelemetry.ts` |
| SimulationSource | bitrix24 \| stripe \| system \| unknown \| iot \| energy | `src/lib/simulation.ts` |
| ReplayResult | success \| retry \| conflict | `src/lib/offline/offlineQueue.ts` |
| TransitionPreset | fade \| slide \| zoom \| flip \| parallax \| blur-slide \| none | `src/lib/transitions/index.ts` |
| TransitionEase | linear \| easeIn \| easeOut \| easeInOut \| spring | `src/lib/transitions/index.ts` |
| NavDirection | forward \| backward \| up \| down | `src/lib/transitions/index.ts` |
| JobStatus | queue \| ready \| scheduled \| production \| finished \| paused \| cancelled \| delayed \| rework \| buffer \| packaging | `src/types/job.ts` |
| JobPriority | low \| medium \| high \| urgent | `src/types/job.ts` |
| JobStatus | queue \| ready \| scheduled \| production \| finished \| paused \| cancelled \| delayed \| rework \| buffer \| packaging | `src/types/scheduling.ts` |
| UserRole | coordinator \| operator \| manager | `src/types/scheduling.ts` |
| TechniqueId | silk-textile \| silk-vinyl-flat \| silk-vinyl-rotative \| silk-decal \| fiber-laser \| laser-co2 \| laser-uv \| tampo \| hot-stamp \| thermal-press \| sublimation-mug \| decal-oven \| dtf-uv-application \| dtf-textile \| dtf-uv \| cut-media | `src/types/scheduling.ts` |
| ViewMode | daily \| weekly \| kanban \| list \| occupancy \| alerts | `src/types/scheduling.ts` |
| AppRole | admin \| manager \| coordinator \| operator | `supabase/functions/_shared/auth.ts` |
| Aal | aal1 \| aal2 | `supabase/functions/_shared/auth.ts` |
| LogLevel | debug \| info \| warn \| error | `supabase/functions/_shared/logger.ts` |

## F. Validações de entrada

### F.1 Schemas Zod

- **quickJobSchema** (`src/components/calendar/QuickJobDrawer.tsx`, z.object):
  ```ts
  { order_number: z.string().min(1, 'OS obrigatória'), client: z.string().min(1, 'Cliente obrigatório'), product: z.string().min(1, 'Produto obrigatório'), quantity: z.string().min(1, 'Qtd obrigatória'), technique_id: z.string().min(1, 'Técnica obrigatória'), machine_id: z.string().min(1, 'Máquina obrigatória'), start_time: z.string().min(1, 'Início obrigatório'), end_time: z.string().min(1, 'Fim obrigatório'), }
  ```
- **jobEditSchema** (`src/components/jobs/JobDetailsModal.tsx`, z.object):
  ```ts
  { order_number: z.string().min(1, 'Número da OS é obrigatório'), client: z.string().min(1, 'Cliente é obrigatório'), product: z.string().min(1, 'Produto é obrigatório'), quantity: z.number().min(1, 'Quantidade é obrigatória'), gravure_color: z.string().optional(), notes: z.string().optional(), priority: z.enum(['low', 'medium', 'high', 'urgent']), }
  ```
- **formSchema** (`src/components/shift/CreateHandoverModal.tsx`, z.object):
  ```ts
  { shift_type: z.enum(['morning', 'afternoon', 'night']), machine_id: z.string().optional(), general_notes: z.string().optional(), }
  ```
- **cronHealthRowSchema** (`src/features/admin/hooks/useCronHealth.ts`, z.object):
  ```ts
  { jobid: z.number(), jobname: z.string().nullable(), schedule: z.string().nullable(), active: z.boolean().nullable(), last_status: z.string().nullable(), last_run: z.string().nullable(), last_duration_ms: z.number().nullable(), consecutive_failures: z.number().nullable(), last_error: z.string().nullable(), }
  ```
- **parsed** (`src/features/admin/hooks/useCronHealth.ts`, z.array):
  ```ts
  cronHealthRowSchema
  ```
- **cronHealthHistoryRowSchema** (`src/features/admin/hooks/useCronHealthHistory.ts`, z.object):
  ```ts
  { id: z.string(), jobid: z.number(), jobname: z.string().nullable(), consecutive_failures: z.number().nullable(), last_status: z.string().nullable(), last_duration_ms: z.number().nullable(), captured_at: z.string(), is_stale: z.boolean().nullable().optional(), expected_interval_minutes: z.number().nullable().optional(), }
  ```
- **parsed** (`src/features/admin/hooks/useCronHealthHistory.ts`, z.array):
  ```ts
  cronHealthHistoryRowSchema
  ```
- **cronP95DailyRowSchema** (`src/features/admin/hooks/useCronP95Daily.ts`, z.object):
  ```ts
  { day: z.string(), jobid: z.number(), jobname: z.string().nullable(), samples: z.number(), p95_ms: z.number().nullable(), avg_ms: z.number().nullable(), max_ms: z.number().nullable(), failure_rate_pct: z.coerce.number(), }
  ```
- **parsed** (`src/features/admin/hooks/useCronP95Daily.ts`, z.array):
  ```ts
  cronP95DailyRowSchema
  ```
- **overallStatusSchema** (`src/features/admin/hooks/useSystemStatusSummary.ts`, z.enum):
  ```ts
  ["operational", "degraded", "outage", "unknown"]
  ```
- **systemStatusSummarySchema** (`src/features/admin/hooks/useSystemStatusSummary.ts`, z.object):
  ```ts
  { total_jobs: z.number(), healthy_jobs: z.number(), failing_jobs: z.number(), stale_jobs: z.number(), last_capture: z.string().nullable(), edge_status: overallStatusSchema.nullable().default("unknown"), edge_last_check: z.string().nullable().default(null), }
  ```
- **parsed** (`src/features/admin/hooks/useSystemStatusSummary.ts`, z.array):
  ```ts
  systemStatusSummarySchema
  ```
- **jobStatusSchema** (`src/features/jobs/types/job.schema.ts`, z.enum):
  ```ts
  ['queue', 'ready', 'scheduled', 'production', 'finished', 'paused', 'cancelled', 'delayed', 'rework', 'buffer', 'packaging']
  ```
- **jobPrioritySchema** (`src/features/jobs/types/job.schema.ts`, z.enum):
  ```ts
  ['low', 'medium', 'high', 'urgent']
  ```
- **jobSchema** (`src/features/jobs/types/job.schema.ts`, z.object):
  ```ts
  { id: z.string().uuid(), order_number: z.string().min(1, 'Número do pedido é obrigatório').max(100, 'Número do pedido muito longo'), client: z.string().min(1, 'Cliente é obrigatório').max(200, 'Nome do cliente muito longo'), product: z.string().min(1, 'Produto é obrigatório').max(200, 'Nome do produto muito longo'), quantity: z.number().int().positive('Quantidade deve ser positiva').max(1_000_000, 'Quantidade muito alta'), technique_id: z.string().uuid('Técnica é obrigatória'), machine_id: z.string().uuid().nullable().optional(), priority: jobPrioritySchema.catch('medium'), status: jobStatusSchema.catch('queue'), estimated_duration: z.number().positive().max(43_200, 'Duração estimada não pode exceder 30 dias').default(60), scheduled_date: z.string().nullable().optional(), start_time: z.string().nullable().optional(), end_time: z.string().nullable().optional(), notes: z.string().max(2000, 'Observações muito longas').nullable().optional(), gravure_color: z.string().max(50, 'Cor muito longa').nullable().optional(), }
  ```
- **jobFormSchema** (`src/features/jobs/types/job.schema.ts`, derivado de `jobSchema`, encadeia extend, omit):
  ```ts
  jobSchema.omit({ id: true, status: true }).extend({ quantity: z.coerce.number().int().positive('Quantidade deve ser positiva').max(1_000_000, 'Quantidade muito alta'), estimated_duration: z.coerce.number().positive('Duração estimada deve ser positiva').max(43_200, 'Duração estimada não pode exceder 30 dias').default(60), })
  ```
- **lotSchema** (`src/features/jobs/types/lot.schema.ts`, z.object):
  ```ts
  { id: z.string().uuid(), lot_number: z.string().min(1, 'Número do lote é obrigatório').max(100, 'Número do lote muito longo'), job_id: z.string().uuid('Job é obrigatório'), quantity: z.number().int().positive('Quantidade deve ser positiva').max(1_000_000, 'Quantidade muito alta'), status: z.enum(['in_production', 'completed', 'quarantine', 'approved', 'rejected']).default('in_production'), notes: z.string().max(2000, 'Observações muito longas').nullable().optional(), }
  ```
- **lotFormSchema** (`src/features/jobs/types/lot.schema.ts`, derivado de `lotSchema`, encadeia omit):
  ```ts
  lotSchema.omit({ id: true, status: true })
  ```
- **packagingTaskStatusSchema** (`src/features/packaging/types/packaging.schema.ts`, z.enum):
  ```ts
  [ 'pending', 'in_triage', 'packaging', 'ready_to_ship', 'on_hold', ]
  ```
- **packagingDefectTypeSchema** (`src/features/packaging/types/packaging.schema.ts`, z.enum):
  ```ts
  [ 'print_misalignment', 'color_deviation', 'scratch', 'contamination', 'wrong_material', 'dimensional', 'other', ]
  ```
- **packagingDefectSeveritySchema** (`src/features/packaging/types/packaging.schema.ts`, z.enum):
  ```ts
  ['minor', 'major', 'critical']
  ```
- **packagingDefectDecisionSchema** (`src/features/packaging/types/packaging.schema.ts`, z.enum):
  ```ts
  ['rework', 'discard', 'accept_with_note']
  ```
- **packagingTaskSchema** (`src/features/packaging/types/packaging.schema.ts`, z.object):
  ```ts
  { id: z.string().uuid(), job_id: z.string().uuid(), status: packagingTaskStatusSchema, assigned_to: z.string().uuid().nullable(), received_quantity: z.number().int().nonnegative(), approved_quantity: z.number().int().nonnegative(), rejected_quantity: z.number().int().nonnegative(), package_type: z.string().nullable(), packages_count: z.number().int().nonnegative().nullable(), total_weight_kg: z.number().nonnegative().nullable(), started_at: z.string().nullable(), completed_at: z.string().nullable(), notes: z.string().max(2000).nullable(), created_at: z.string(), updated_at: z.string(), }
  ```
- **packagingRegisterFormSchema** (`src/features/packaging/types/packaging.schema.ts`, z.object):
  ```ts
  { package_type: z.string().min(1, 'Selecione o tipo de embalagem'), packages_count: z.coerce.number().int().positive('Informe o número de pacotes'), total_weight_kg: z.coerce.number().nonnegative('Peso deve ser positivo').optional(), approved_quantity: z.coerce.number().int().nonnegative(), notes: z.string().max(2000).optional(), }
  ```
- **defectTriageFormSchema** (`src/features/packaging/types/packaging.schema.ts`, z.object, encadeia superRefine):
  ```ts
  { quantity: z.coerce.number().int().positive('Quantidade deve ser positiva'), defect_type: packagingDefectTypeSchema, severity: packagingDefectSeveritySchema, decision: packagingDefectDecisionSchema, photo_url: z.string().url().optional().or(z.literal('')), notes: z.string().max(1000).optional(), }
  ```
  - Regras cruzadas (refine): “Observação obrigatória ao aceitar com nota”
- **delayReasonSchema** (`src/features/packaging/types/packaging.schema.ts`, z.object):
  ```ts
  { delay_category: z.enum(DELAY_CATEGORIES.map(c => c.value) as [DelayCategory, ...DelayCategory[]]), delay_reason: z.string().min(3, 'Descreva o motivo com pelo menos 3 caracteres').max(500), }
  ```
- **machineSchema** (`src/features/production/types/machine.schema.ts`, z.object):
  ```ts
  { id: z.string().uuid(), name: z.string().min(1, 'Nome é obrigatório').max(100, 'Nome muito longo'), code: z.string().min(1, 'Código é obrigatório').max(20, 'Código muito longo'), technique_id: z.string().uuid('Técnica é obrigatória'), is_active: z.boolean().default(true), }
  ```
- **machineFormSchema** (`src/features/production/types/machine.schema.ts`, derivado de `machineSchema`, encadeia omit):
  ```ts
  machineSchema.omit({ id: true })
  ```
- **maintenanceSchema** (`src/features/production/types/maintenance.schema.ts`, z.object):
  ```ts
  { id: z.string().uuid(), machine_id: z.string().uuid('Máquina é obrigatória'), maintenance_type_id: z.string().uuid('Tipo de manutenção é obrigatório'), schedule_id: z.string().uuid(), status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']).default('pending'), notes: z.string().max(5000, 'Observações muito longas').nullable().optional(), performed_by_name: z.string().max(150, 'Nome muito longo').nullable().optional(), downtime_minutes: z.number().int().nonnegative().max(43_200, 'Tempo de parada não pode exceder 30 dias').nullable().optional(), total_cost: z.number().nonnegative().max(1_000_000, 'Custo inválido').nullable().optional(), }
  ```
- **maintenanceFormSchema** (`src/features/production/types/maintenance.schema.ts`, derivado de `maintenanceSchema`, encadeia omit):
  ```ts
  maintenanceSchema.omit({ id: true, status: true })
  ```
- **operatorSchema** (`src/features/production/types/operator.schema.ts`, z.object):
  ```ts
  { id: z.string().uuid(), name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(100, 'Nome muito longo'), email: z.string().email('Email inválido').max(254, 'Email muito longo'), role: z.enum(['operator', 'coordinator', 'manager']), is_active: z.boolean().default(true), phone: z.string().regex(/^[\d\s\-\(\)\+]{0,20}$/, 'Telefone inválido').nullable().optional(), badge_number: z.string().max(20, 'Número de crachá muito longo').nullable().optional(), }
  ```
- **operatorFormSchema** (`src/features/production/types/operator.schema.ts`, derivado de `operatorSchema`, encadeia omit):
  ```ts
  operatorSchema.omit({ id: true })
  ```
- **widgetConfigSchema** (`src/hooks/useDashboardLayout.ts`, z.object):
  ```ts
  { id: z.string(), title: z.string(), section: z.enum(['main', 'sidebar', 'efficiency', 'bottom']), visible: z.boolean(), order: z.number(), }
  ```
- **layoutSchema** (`src/hooks/useDashboardLayout.ts`, z.array):
  ```ts
  widgetConfigSchema
  ```
- **uuidSchema** (`src/lib/validation.ts`, z.string):
  ```ts
  
  ```
- **paginationSchema** (`src/lib/validation.ts`, z.object):
  ```ts
  { page: z.number().int().min(1).default(1), pageSize: z.number().int().min(1).max(100).default(20), }
  ```
- **dateRangeSchema** (`src/lib/validation.ts`, z.object, encadeia refine):
  ```ts
  { start: z.string().datetime(), end: z.string().datetime(), }
  ```
  - Regras cruzadas (refine): “Data inicial deve ser anterior à data final”
- **auditActionSchema** (`src/lib/schemas/auditLog.ts`, z.union):
  ```ts
  [ z.enum(['INSERT', 'UPDATE', 'DELETE']), z.literal('status_change'), z.string() ]
  ```
- **auditLogEntrySchema** (`src/lib/schemas/auditLog.ts`, z.object):
  ```ts
  { id: z.string().uuid(), entity_type: z.string(), entity_id: z.string(), action: auditActionSchema, actor_id: z.string().uuid().nullable(), actor_email: z.string().nullable(), old_values: z.unknown().nullable(), new_values: z.unknown().nullable(), changed_fields: z.array(z.string()).nullable(), hash: z.string(), previous_hash: z.string().nullable(), metadata: z.unknown().nullable(), created_at: z.string(), }
  ```
- **auditChainVerificationSchema** (`src/lib/schemas/auditLog.ts`, z.object):
  ```ts
  { total_records: z.coerce.number(), verified: z.coerce.number(), broken: z.coerce.number(), first_broken_id: z.string().uuid().nullable(), }
  ```
- **auditFiltersSchema** (`src/lib/schemas/auditLog.ts`, z.object):
  ```ts
  { entityType: z.string().optional(), entityId: z.string().optional(), actorId: z.string().uuid().optional(), action: auditActionSchema.optional(), fromDate: z.string().optional(), toDate: z.string().optional(), limit: z.number().int().positive().max(500).default(100), }
  ```
- **loginSchema** (`src/pages/AuthPage.tsx`, z.object):
  ```ts
  { email: z.string().email(t('auth.invalidEmail')), password: z.string().min(6, t('auth.passwordMinLength', { min: 6 })) }
  ```
- **jobSchema** (`src/pages/NewJobPage.tsx`, z.object):
  ```ts
  { order_number: z.string().min(1, 'Número da OS é obrigatório').trim(), client: z.string().min(1, 'Cliente é obrigatório').trim(), product: z.string().min(1, 'Produto é obrigatório').trim(), quantity: z.string().refine(v => !isNaN(parseInt(v, 10)) && parseInt(v, 10) > 0, { message: 'Quantidade deve ser um número maior que zero' }), technique_id: z.string().min(1, 'Técnica é obrigatória'), machine_id: z.string().optional(), start_time: z.string().optional(), end_time: z.string().optional(), notes: z.string().optional(), priority: z.string().default('medium'), gravure_color: z.string().optional(), }
  ```
  - Regras cruzadas (refine): “Quantidade deve ser um número maior que zero”
- **passwordSchema** (`src/pages/ResetPasswordPage.tsx`, z.object, encadeia refine):
  ```ts
  { password: newPasswordSchema(t), confirmPassword: z.string(), }
  ```
- **settingsSchema** (`src/schemas/settingsSchema.ts`, z.object):
  ```ts
  { language: z.enum(['pt-BR', 'en-US', 'es-ES']).default('pt-BR'), dateFormat: z.string().default('dd/MM/yyyy'), timeFormat: z.enum(['12h', '24h']).default('24h'), notificationsEnabled: z.boolean().default(true), soundEnabled: z.boolean().default(true), compactMode: z.boolean().default(false), autoTheme: z.boolean().default(false), sessionTimeout: z.number().int().min(5).max(120).default(30), }
  ```
- **ErrorResponseSchema** (`supabase/functions/_shared/contracts.ts`, z.object):
  ```ts
  { error: z.string(), message: z.string().optional(), details: z.any().optional(), }
  ```
- **WebhookSourceSchema** (`supabase/functions/_shared/contracts.ts`, z.enum):
  ```ts
  ["bitrix24", "stripe", "external_system"]
  ```
- **WebhookPayloadSchema** (`supabase/functions/_shared/contracts.ts`, z.object):
  ```ts
  { source: WebhookSourceSchema, event: z.string(), data: z.record(z.any()), timestamp: z.string().datetime().optional(), }
  ```
- **WebhookResponseSchema** (`supabase/functions/_shared/contracts.ts`, z.object):
  ```ts
  { processed: z.boolean(), source: WebhookSourceSchema.optional(), event: z.string().optional(), timestamp: z.string().datetime(), details: z.any().optional(), }
  ```
- **ERPJobRequestSchema** (`supabase/functions/_shared/contracts.ts`, z.object):
  ```ts
  { order_number: z.string().min(1), client: z.string().min(1), product: z.string().min(1), quantity: z.number().positive(), technique_id: z.string().uuid(), priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"), scheduled_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), machine_id: z.string().uuid().optional(), notes: z.string().optional(), }
  ```
- **ERPJobResponseSchema** (`supabase/functions/_shared/contracts.ts`, z.object):
  ```ts
  { id: z.string().uuid(), order_number: z.string(), client: z.string(), product: z.string(), quantity: z.number().nonnegative(), status: z.string(), created_at: z.string(), }
  ```
- **ERPJobPatchSchema** (`supabase/functions/_shared/contracts.ts`, z.object):
  ```ts
  { status: z.enum(["queue", "ready", "scheduled", "production", "finished", "paused", "cancelled", "delayed", "rework"]).optional(), machine_id: z.string().uuid().optional(), scheduled_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), notes: z.string().optional(), priority: z.enum(["low", "medium", "high", "urgent"]).optional(), produced_quantity: z.number().nonnegative().finite().optional(), lost_pieces: z.number().nonnegative().finite().optional(), }
  ```
- **ERPLotRequestSchema** (`supabase/functions/_shared/contracts.ts`, z.object):
  ```ts
  { job_id: z.string().uuid(), lot_number: z.string().min(1), quantity: z.number().positive(), operator_id: z.string().uuid().optional(), notes: z.string().optional(), }
  ```
- **ERPListResponseSchema** (`supabase/functions/_shared/contracts.ts`, z.object):
  ```ts
  { data: z.array(z.any()), total: z.number().nonnegative(), limit: z.number().positive(), offset: z.number().nonnegative(), }
  ```
- **ContractTestResultSchema** (`supabase/functions/_shared/test-utils.ts`, z.object):
  ```ts
  { status: z.number(), isValid: z.boolean(), body: z.any(), }
  ```
- **webhookPayloadSchema** (`supabase/functions/_shared/validation.ts`, z.object):
  ```ts
  { source: z.string().min(1, "Source is required"), event: z.string().min(1, "Event is required"), data: z.record(z.any()).optional().default({}), }
  ```
- **bitrix24DataSchema** (`supabase/functions/_shared/validation.ts`, z.object):
  ```ts
  { id: z.union([z.string(), z.number()]), title: z.string().optional(), status: z.string().optional(), }
  ```
- **stripeDataSchema** (`supabase/functions/_shared/validation.ts`, z.object):
  ```ts
  { id: z.string(), object: z.string().optional(), }
  ```
- **mlPredictionPayloadSchema** (`supabase/functions/_shared/validation.ts`, z.object):
  ```ts
  { action: z.enum(["batch_analyze", "single_machine"]).default("batch_analyze"), machine_id: z.string().uuid().optional(), }
  ```
- **approvePasswordResetSchema** (`supabase/functions/_shared/validation.ts`, z.object):
  ```ts
  { requestId: z.string().uuid("ID da solicitação inválido"), action: z.enum(["approve", "reject"]), rejectionReason: z.string().optional(), redirectUrl: z.string().url().optional(), }
  ```
- **lockoutRequestSchema** (`supabase/functions/_shared/validation.ts`, z.object):
  ```ts
  { email: z.string().email("E-mail inválido"), action: z.enum(["check", "record_failure", "record_success"]), }
  ```
- **validateIPRequestSchema** (`supabase/functions/_shared/validation.ts`, z.object):
  ```ts
  { user_id: z.string().uuid().optional(), user_email: z.string().email("E-mail inválido"), user_agent: z.string().optional(), action: z.enum([ "login_attempt", "login_success", "login_failed", "mfa_required", "mfa_failed", "mfa_success", ]), failure_reason: z.string().optional(), }
  ```
- **tpmAlertWebhookSchema** (`supabase/functions/_shared/validation.ts`, z.object):
  ```ts
  { event_type: z.string().optional(), schema: z.string().optional(), table: z.string().optional(), record: z.object({ machine_id: z.string().optional().nullable(), alert_type: z.string().optional().nullable(), message: z.string().optional().nullable(), severity: z.string().optional().nullable(), created_at: z.string().optional().nullable(), }).passthrough().optional().nullable(), old_record: z.record(z.string(), z.unknown()).optional().nullable(), }
  ```
- **tpmExecutionAlertWebhookSchema** (`supabase/functions/_shared/validation.ts`, z.object):
  ```ts
  { event_type: z.string().optional(), schema: z.string().optional(), table: z.string().optional(), record: z.object({ execution_id: z.string().optional().nullable(), parameter_name: z.string().optional().nullable(), actual_value: z.string().optional().nullable(), expected_range: z.string().optional().nullable(), description: z.string().optional().nullable(), severity: z.string().optional().nullable(), created_at: z.string().optional().nullable(), evidence_urls: z.array(z.string()).optional().nullable(), }).passthrough().optional().nullable(), old_record: z.record(z.string(), z.unknown()).optional().nullable(), }
  ```
- **cspReportSchema** (`supabase/functions/csp-report/index.ts`, z.object):
  ```ts
  { "csp-report": z.object({ "document-uri": z.string().max(2048).optional(), referrer: z.string().max(2048).optional(), "violated-directive": z.string().max(512).optional(), "effective-directive": z.string().max(512).optional(), "original-policy": z.string().max(4096).optional(), "blocked-uri": z.union([z.string().max(2048), z.number()]).optional(), "source-file": z.string().max(2048).optional(), "line-number": z.number().optional(), "column-number": z.number().optional(), "status-code": z.number().optional(), disposition: z.enum(["enforce", "report", "reporting"]).optional(), "script-sample": z.string().max(1024).optional(), }), }
  ```

### F.2 react-hook-form (register/rules)

_nenhum item encontrado_

### F.3 Restrições em inputs HTML (required/min/max/pattern)

| Campo | Restrições | Arquivo |
|---|---|---|
| `login-email` | type=email | `src/components/auth/AuthLoginForm.tsx` |
| `signup-email` | type=email | `src/components/auth/AuthSignupForm.tsx` |
| `mfa-code` | pattern=[0-9]*, max | `src/components/auth/MFALoginVerification.tsx` |
| `form-email` | type=email | `src/components/design-system/sections/forms/FormsCompleteExample.tsx` |
| `form-phone` | type=tel | `src/components/design-system/sections/forms/FormsCompleteExample.tsx` |
| `input-disabled` | disabled, disabled | `src/components/design-system/sections/forms/FormsTextInputs.tsx` |
| `input-email` | type=email | `src/components/design-system/sections/forms/FormsTextInputs.tsx` |
| `input-password` | type=password | `src/components/design-system/sections/forms/FormsTextInputs.tsx` |
| `input-number` | type=number | `src/components/design-system/sections/forms/FormsTextInputs.tsx` |
| `input-date` | type=date | `src/components/design-system/sections/forms/FormsTextInputs.tsx` |
| `textarea-disabled` | disabled, disabled | `src/components/design-system/sections/forms/FormsTextInputs.tsx` |
| `modal-email` | type=email | `src/components/design-system/sections/modals/DialogExamples.tsx` |
| `sheet-email` | type=email | `src/components/design-system/sections/modals/SheetExamples.tsx` |
| `high` | type=number | `src/components/kanban/KanbanAIAdvisor.tsx` |
| `medium` | type=number | `src/components/kanban/KanbanAIAdvisor.tsx` |
| `freight` | type=number, step=0.01 | `src/components/logistics/CreateShipmentModal.tsx` |
| `delivery-date` | type=date | `src/components/logistics/EditShipmentModal.tsx` |
| `freight-edit` | type=number, step=0.01 | `src/components/logistics/EditShipmentModal.tsx` |
| `produced` | type=number, min=0, max=job.quantity * 3 | `src/components/operator/ProductionRegistrationModal.tsx` |
| `lost` | type=number, min=0, max=job.quantity | `src/components/operator/ProductionRegistrationModal.tsx` |
| `email` | type=email | `src/components/operators/CreateOperatorModal.tsx` |
| `name` | required | `src/components/settings/TechniqueManagement.tsx` |
| `short_name` | required | `src/components/settings/TechniqueManagement.tsx` |
| `color` | required | `src/components/settings/TechniqueManagement.tsx` |
| `setup_time` | type=number, required | `src/components/settings/TechniqueManagement.tsx` |
| `low_threshold` | type=number | `src/components/settings/TechniqueManagement.tsx` |
| `medium_threshold` | type=number | `src/components/settings/TechniqueManagement.tsx` |
| `high_threshold` | type=number | `src/components/settings/TechniqueManagement.tsx` |
| `verify-code` | pattern=[0-9]*, max | `src/components/settings/TwoFactorSetup.tsx` |
| `disable-code` | pattern=[0-9]*, max | `src/components/settings/TwoFactorSetup.tsx` |
| `password` | type=password | `src/components/traceability/ElectronicSignatureDialog.tsx` |
| `from-date` | type=datetime-local | `src/features/admin/components/audit/AuditFilters.tsx` |
| `to-date` | type=datetime-local | `src/features/admin/components/audit/AuditFilters.tsx` |
| `expires` | type=number, min=1 | `src/features/admin/components/security/BlockedIPsPanel.tsx` |
| `max_requests` | max, type=number, min=1, max | `src/features/admin/components/security/RateLimitSettings.tsx` |
| `window` | type=number, min=1 | `src/features/admin/components/security/RateLimitSettings.tsx` |
| `block` | type=number, min=1 | `src/features/admin/components/security/RateLimitSettings.tsx` |
| `quantity` | type=number, min=1 | `src/features/packaging/components/DefectTriageForm.tsx` |
| `defect-photo` | accept=image/*, disabled=uploading | `src/features/packaging/components/DefectTriageForm.tsx` |
| `packages_count` | type=number, min=1 | `src/features/packaging/components/PackagingRegisterForm.tsx` |
| `total_weight_kg` | type=number, step=0.01, min=0 | `src/features/packaging/components/PackagingRegisterForm.tsx` |
| `approved_quantity` | type=number, min=0, max=received | `src/features/packaging/components/PackagingRegisterForm.tsx` |
| `ovr-triage` | type=number, min=0.1, step=0.5 | `src/features/packaging/components/PackagingSlaOverridesManager.tsx` |
| `ovr-pack` | type=number, min=0.1, step=0.5 | `src/features/packaging/components/PackagingSlaOverridesManager.tsx` |
| `ovr-total` | type=number, min=0.1, step=1 | `src/features/packaging/components/PackagingSlaOverridesManager.tsx` |
| `ovr-warn` | type=number, min=10, max=99, step=5 | `src/features/packaging/components/PackagingSlaOverridesManager.tsx` |
| `forgot-email` | type=email | `src/pages/AuthPage.tsx` |
| `kpi-target-completion` | type=number | `src/pages/KPIDashboard.tsx` |
| `kpi-target-occupancy` | type=number | `src/pages/KPIDashboard.tsx` |
| `kpi-target-loss` | type=number | `src/pages/KPIDashboard.tsx` |
| `quantity` | type=number, min=1 | `src/pages/NewJobPage.tsx` |

## G. Fórmulas e derivações (como valores são calculados)

### G.1 Colunas calculadas no banco

| Tabela | Coluna | Expressão |
|---|---|---|
| `energy_consumption` | `total_cost` | `consumption_kwh * cost_per_kwh` |

### G.2 Views (consultas derivadas)

_nenhum item encontrado_

### G.3 Funções de cálculo/decisão no código

- **applySuggestion()** — `src/components/dashboard/AlertScheduleModal.tsx`
  ```
  if (suggestion) { setSelectedMachineId(suggestion.machineId); setStartTime(suggestion.time); toast.success('Sugestão aplicada!'); }
  ```
- **apply(job: string)** — `src/components/design-system/hooks/EfficiencyHooksDemos.tsx`
  ```
  setApplying(job); setTimeout(() => { setApplying(null); setApplied(prev => [...prev, job]); }, 800);
  ```
- **FeedbackSection()** — `src/components/design-system/sections/FeedbackSection.tsx`
  ```
  return ( <div className="space-y-6"> { } <Card className="card-interactive card-shine"> <CardHeader> <CardTitle className="flex items-center gap-2"> <AlertCircle className="h-5 w-5 text-primary" /> Alert </CardTitle> <CardDescription>Componentes de alerta para mensagens importantes</CardDescription> </CardHeader> <CardContent className="space-y-4"> { } <div className="space-y-2"> <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Variante Default</h4> <Alert> <I …
  ```
- **FeedbackToast({ type, title, message, isVisible, onClose, duration = 4000, action }: FeedbackToastProps)** — `src/components/feedback/FeedbackProvider.tsx`
  ```
  const Icon = iconMap[type]; useEffect(() => { if (isVisible && type !== 'loading') { const timer = setTimeout(onClose, duration); return () => clearTimeout(timer); } }, [isVisible, duration, onClose, type]); return ( <AnimatePresence> {isVisible && ( <motion.div initial={{ opacity: 0, y: 50, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.95 }} transition={{ duration: 0.2 }} className="fixed bottom-6 right-6 z-[100] max-w-sm" > <div className="bg-card …
  ```
- **FeedbackProvider({ children }: FeedbackProviderProps)** — `src/components/feedback/FeedbackProvider.tsx`
  ```
  const [feedback, setFeedback] = useState<FeedbackOptions | null>(null); const [isVisible, setIsVisible] = useState(false); const showFeedback = useCallback((options: FeedbackOptions) => { setFeedback(options); setIsVisible(true); }, []); const hideFeedback = useCallback(() => { setIsVisible(false); setTimeout(() => setFeedback(null), 300); }, []); const showSuccess = useCallback((title: string, message?: string) => { showFeedback({ type: 'success', title, message }); }, [showFeedback]); const sh …
  ```
- **validateLocation(loc: string)** — `src/components/inventory/WarehouseMap.tsx`
  ```
  const pattern = /^[A-D][1-4]$/; return pattern.test(loc);
  ```
- **validateForm()** — `src/components/operators/CreateOperatorModal.tsx`
  ```
  const newErrors: FormErrors = {}; if (!formData.full_name.trim()) { newErrors.full_name = 'Nome é obrigatório'; } else if (formData.full_name.trim().length < 3) { newErrors.full_name = 'Nome deve ter pelo menos 3 caracteres'; } if (!formData.email.trim()) { newErrors.email = 'Email é obrigatório'; } else if (!EMAIL_REGEX.test(formData.email)) { newErrors.email = 'Formato de email inválido'; } if (!formData.password) { newErrors.[REDACTED]; } else { const parsed = newPasswordSchema().safeParse(fo …
  ```
- **validateForm()** — `src/components/operators/EditOperatorModal.tsx`
  ```
  const newErrors: FormErrors = {}; if (!formData.full_name.trim()) { newErrors.full_name = 'Nome é obrigatório'; } else if (formData.full_name.trim().length < 3) { newErrors.full_name = 'Nome deve ter pelo menos 3 caracteres'; } if (formData.phone && !PHONE_REGEX.test(formData.phone.replace(/\s/g, ''))) { newErrors.phone = 'Formato inválido. Use: (11) 99999-9999'; } setErrors(newErrors); return Object.keys(newErrors).length === 0;
  ```
- **calculateLinearRegression(data: { x: number; y: number }[])** — `src/components/operators/EvolutionChart.tsx`
  ```
  const n = data.length; if (n < 2) return { slope: 0, intercept: 0 }; const sumX = data.reduce((sum, d) => sum + d.x, 0); const sumY = data.reduce((sum, d) => sum + d.y, 0); const sumXY = data.reduce((sum, d) => sum + d.x * d.y, 0); const sumXX = data.reduce((sum, d) => sum + d.x * d.x, 0); const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX); const intercept = (sumY - slope * sumX) / n; return { slope, intercept };
  ```
- **invalidate()** — `src/components/shift/ChecklistTemplatesManager.tsx`
  ```
  queryClient.invalidateQueries({ queryKey: ['checklist-templates'] }); queryClient.invalidateQueries({ queryKey: ['checklist-templates-all'] });
  ```
- **generateMockData()** — `src/components/technical-assistant/TechnicalTelemetryPanel.tsx`
  ```
  return Array.from({ length: 20 }, (_, i) => ({ time: `${10 + Math.floor(i / 12)}:${(i * 5) % 60}`, temp: 180 + Math.random() * 10, pressure: 5.0 + Math.random() * 0.8, speed: 40 + Math.random() * 15, efficiency: 90 + Math.random() * 8, }));
  ```
- **generateLotNumber()** — `src/components/traceability/CreateLotModal.tsx`
  ```
  const date = format(new Date(), 'yyyyMMdd'); const random = Math.random().toString(36).substring(2, 6).toUpperCase(); return `LOT-${date}-${random}`;
  ```
- **generateQrValue(lot: ProductionLot)** — `src/components/traceability/LotLabelPrint.tsx`
  ```
  return `LOT:${lot.lot_number}`;
  ```
- **computePeriodRange(preset: HistoryPeriodPreset, range?: DateRange)** — `src/features/admin/components/audit/HistoryPeriodFilter.tsx`
  ```
  fromDate?: string; toDate?: string
  ```
- **computeDrift(p95Series: Array<number | null>)** — `src/features/admin/hooks/useCronP95Daily.ts`
  ```
  const valid = p95Series.filter((v): v is number => typeof v === "number"); if (valid.length < 4) return null; const latest = valid[valid.length - 1]; const baseline = median(valid.slice(0, -1)); if (baseline === null || baseline <= 0) return null; return Math.round(((latest - baseline) / baseline) * 100);
  ```
- **convertToCSV(data: Record<string, unknown>[], columns?: string[])** — `src/features/admin/hooks/useDataExport.ts`
  ```
  if (data.length === 0) return ''; const keys = columns ?? Object.keys(data[0]); const header = keys.join(','); const rows = data.map(row => keys.map(key => { const value = row[key]; if (value === null || value === undefined) return ''; const str = sanitizeCsvCell(String(value)); if (str.includes(',') || str.includes('"') || str.includes('\n')) { return `"${str.replace(/"/g, '""')}"`; } return str; }).join(',') ); return [header, ...rows].join('\n');
  ```
- **calculateChange(current: number, previous: number)** — `src/features/analytics/hooks/useExecutiveDashboard.ts`
  ```
  if (previous === 0) return current > 0 ? 100 : 0; return ((current - previous) / previous) * 100;
  ```
- **calculateDailyTrend(jobs: Job[], prevJobs: Job[], dateRange: DateRange)** — `src/features/analytics/hooks/useExecutiveDashboard.ts`
  ```
  const days: Record<string, { produced: number; target: number; prevProduced: number }> = {}; const duration = differenceInDays(dateRange.end, dateRange.start) + 1; let current = new Date(dateRange.start); while (current <= dateRange.end) { const dateStr = format(current, 'dd/MM'); days[dateStr] = { produced: 0, target: 0, prevProduced: 0 }; current = subDays(current, -1); } jobs.forEach(job => { const date = format(new Date(job.created_at), 'dd/MM'); if (days[date]) { days[date].produced += job. …
  ```
- **calculateEfficiencyTrend(jobs: Job[], prevJobs: Job[], dateRange: DateRange)** — `src/features/analytics/hooks/useExecutiveDashboard.ts`
  ```
  const days: Record<string, { produced: number; target: number; prevProduced: number; prevTarget: number }> = {}; const duration = differenceInDays(dateRange.end, dateRange.start) + 1; let current = new Date(dateRange.start); while (current <= dateRange.end) { const dateStr = format(current, 'dd/MM'); days[dateStr] = { produced: 0, target: 0, prevProduced: 0, prevTarget: 0 }; current = subDays(current, -1); } jobs.forEach(job => { const date = format(new Date(job.created_at), 'dd/MM'); if (days[d …
  ```
- **calculateTopOperators(completedJobs: Job[], profiles: Profile[])** — `src/features/analytics/hooks/useExecutiveDashboard.ts`
  ```
  const operatorStats: Record<string, { produced: number; jobs: number }> = {}; completedJobs.forEach(job => { const key = job.operator_id; if (!key) return; if (!operatorStats[key]) operatorStats[key] = { produced: 0, jobs: 0 }; operatorStats[key].produced += job.produced_quantity || 0; operatorStats[key].jobs += 1; }); return Object.entries(operatorStats) .sort(([, a], [, b]) => b.produced - a.produced) .slice(0, 5) .map(([userId, stats], index) => { const profile = profiles.find(p => p.id === u …
  ```
- **pricePerPiece(()** — `src/features/analytics/hooks/useKPIs.ts`
  ```
  const n = Number(getConfig('price_per_piece', 2.5)); return Number.isFinite(n) && n > 0 ? n : 2.5;
  ```
- **calculateStats(jobList: DbJob[])** — `src/features/analytics/hooks/useKPIs.ts`
  ```
  const total = jobList.length; const completed = jobList.filter(j => j.status === 'finished').length; const rate = total > 0 ? (completed / total) * 100 : 0; const totalPcs = jobList.reduce((sum: number, j: DbJob) => sum + sanitizeNumber(j.quantity), 0); const lostPcs = jobList.reduce((sum: number, j: DbJob) => sum + sanitizeNumber(j.lost_pieces), 0); const prodPcs = jobList.reduce((sum: number, j: DbJob) => sum + sanitizeNumber(j.produced_quantity ?? 0), 0); const lRate = (prodPcs + lostPcs) > 0 …
  ```
- **calculateEstimatedTime(params: { quantity: number; techniqueSetupTime: number; baseTimePerPiece?: number; colorCount?: number; complexityFactor)** — `src/features/analytics/hooks/useKPIs.ts`
  ```
  const { quantity, techniqueSetupTime, baseTimePerPiece = 30, colorCount = 1, complexityFactor = 1, sizeMultiplier = 1 } = params; const productionTimeSeconds = quantity * baseTimePerPiece * complexityFactor * sizeMultiplier; const colorAdjustment = 1 + (colorCount - 1) * 0.15; const totalMinutes = techniqueSetupTime + (productionTimeSeconds * colorAdjustment / 60); return Math.ceil(totalMinutes);
  ```
- **calculateCapabilityIndices(measurements: SPCMeasurement[], usl: number, lsl: number)** — `src/features/analytics/hooks/useSPC.ts`
  ```
  cp: number; cpk: number; mean: number; stdDev: number; performance: string
  ```
- **calculateSetupSavings(currentSequence: DbJob[], optimizedSequence: DbJob[], setupTime: number)** — `src/features/jobs/hooks/useSmartSequencing.ts`
  ```
  const countColorChanges = (jobs: DbJob[]): number => { let changes = 0; for (let i = 1; i < jobs.length; i++) { if (normalizeColor(jobs[i].gravure_color) !== normalizeColor(jobs[i - 1].gravure_color)) { changes++; } } return changes; }; const currentChanges = countColorChanges(currentSequence); const optimizedChanges = countColorChanges(optimizedSequence); return (currentChanges - optimizedChanges) * setupTime;
  ```
- **calculateSetupSavings(currentChanges: number, optimizedChanges: number, setupTime: number)** — `src/features/jobs/hooks/useSmartSequencingWithActions.ts`
  ```
  return (currentChanges - optimizedChanges) * setupTime;
  ```
- **generateTimeSlots(startHour: number, jobs: DbJob[])** — `src/features/jobs/hooks/useSmartSequencingWithActions.ts`
  ```
  jobId: string; startTime: string; endTime: string
  ```
- **canTransition(from: JobStatus, to: JobStatus)** — `src/features/jobs/services/jobStateMachine.ts`
  ```
  return TRANSITIONS[from]?.includes(to) ?? false;
  ```
- **generatePDF()** — `src/features/maintenance/components/TPMReports.tsx`
  ```
  setIsGenerating(true); try { const filteredRecords = getFilteredRecords(); const doc = new jsPDF(); const machineName = selectedMachineId === 'all' ? 'Todas as Máquinas' : machines.find(m => m.id === selectedMachineId)?.name; doc.setFontSize(18); doc.text('Relatório de Manutenção TPM', 14, 22); doc.setFontSize(11); doc.setTextColor(100); doc.text(`Máquina: ${machineName}`, 14, 30); doc.text(`Período: Últimos ${period} dias`, 14, 35); doc.text(`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm')} …
  ```
- **generateExcel()** — `src/features/maintenance/components/TPMReports.tsx`
  ```
  setIsGenerating(true); try { const filteredRecords = getFilteredRecords(); let performanceData = []; if (selectedMachineId !== 'all') { const m = metrics.find(metric => metric.machineId === selectedMachineId); if (m) { performanceData.push({ 'Máquina': m.machineName, 'MTBF (h)': m.mtbf, 'MTTR (min)': m.mttr, 'Disponibilidade (%)': m.availability, 'Total Falhas': m.totalFailures }); } } else { performanceData = metrics.map(m => ({ 'Máquina': m.machineName, 'MTBF (h)': m.mtbf, 'MTTR (min)': m.mttr …
  ```
- **generateZIP()** — `src/features/maintenance/components/TPMReports.tsx`
  ```
  setIsGenerating(true); try { const filteredRecords = getFilteredRecords(); const zip = new JSZip(); const photosFolder = zip.folder("evidencias_fotograficas"); const headers = ['Data', 'Máquina', 'Tipo', 'Técnico', 'Status', 'Downtime', 'Custo', 'Notas']; const rows = filteredRecords.map(r => [ format(new Date(r.started_at), 'dd/MM/yyyy HH:mm'), r.machine?.name || 'N/A', r.maintenance_type_id, r.performed_by_name || 'N/A', r.status, r.downtime_minutes, r.total_cost, r.notes || '' ]); const csvCo …
  ```
- **invalidate()** — `src/features/packaging/hooks/usePackagingTask.ts`
  ```
  queryClient.invalidateQueries({ queryKey: ['packaging-tasks'] }); queryClient.invalidateQueries({ queryKey: ['packaging-task', taskId] }); queryClient.invalidateQueries({ queryKey: ['packaging-task-defects', taskId] });
  ```
- **calculateReliabilityScore(mtbf: number | null, mttr: number | null, availability: number)** — `src/features/production/hooks/useMTBFMTTR.ts`
  ```
  if (mtbf === null || mttr === null) return 'moderate'; if (availability >= 98 && mtbf >= 500 && mttr <= 60) return 'excellent'; if (availability >= 95 && mtbf >= 300 && mttr <= 90) return 'good'; if (availability >= 90 && mtbf >= 150 && mttr <= 120) return 'moderate'; if (availability >= 80 && mtbf >= 50 && mttr <= 180) return 'poor'; return 'critical';
  ```
- **calculateMetrics(jobList: typeof jobs, machineDays: number = 1, plannedMinPerDay: number)** — `src/features/production/hooks/useOEE.ts`
  ```
  let actual = 0, estimated = 0, produced = 0, lost = 0; for (const job of jobList) { if (isValidDate(job.actual_start_time) && isValidDate(job.actual_end_time)) { try { const start = parseISO(asStr(job.actual_start_time)); const end = parseISO(asStr(job.actual_end_time)); actual += differenceInMinutes(end, start); } catch { } } estimated += sanitizeNumber(job.estimated_duration || 60); produced += sanitizeNumber(job.produced_quantity ?? 0); lost += sanitizeNumber(job.lost_pieces); } const planned …
  ```
- **calculateGoalProgress(goal: OperatorGoal, currentValue: number)** — `src/features/production/hooks/useOperatorGoals.ts`
  ```
  let progress_percentage: number; let is_achieved: boolean; if (goal.goal_type === 'loss_rate') { if (goal.target_value > 0) { if (currentValue <= goal.target_value) { const bonusRange = 25; progress_percentage = 75 + bonusRange * (1 - currentValue / goal.target_value); } else { progress_percentage = Math.max(0, 75 * (1 - (currentValue - goal.target_value) / goal.target_value)); } } else { progress_percentage = currentValue === 0 ? 100 : 0; } is_achieved = currentValue <= goal.target_value; } els …
  ```
- **calculateRealOEE(jobs: DbJob[])** — `src/features/production/services/oeeCalculations.ts`
  ```
  let totalActualMinutes = 0; let totalEstimatedMinutes = 0; let totalProducedPieces = 0; let totalLostPieces = 0; const finishedJobs = jobs.filter(j => j.status === 'finished'); for (const job of finishedJobs) { if (isValidDate(job.actual_start_time) && isValidDate(job.actual_end_time)) { try { const start = parseISO((job.actual_start_time ?? "")); const end = parseISO((job.actual_end_time ?? "")); totalActualMinutes += sanitizeNumber(differenceInMinutes(end, start)); } catch { } } totalEstimated …
  ```
- **generateFingerprint()** — `src/hooks/useDeviceDetection.ts`
  ```
  const components = [ navigator.userAgent, navigator.language, screen.width, screen.height, screen.colorDepth, new Date().getTimezoneOffset(), navigator.hardwareConcurrency || 'unknown', navigator.platform || 'unknown', ]; const str = components.join('|'); let hash = 0; for (let i = 0; i < str.length; i++) { const char = str.charCodeAt(i); hash = ((hash << 5) - hash) + char; hash = hash & hash; } return Math.abs(hash).toString(36);
  ```
- **calculateRankingsLocally(periodStart: Date, periodEnd: Date, period: string)** — `src/hooks/useGamification.ts`
  ```
  const jobsQuery = supabase .from('jobs') .select('*') .eq('status', 'finished') .gte('actual_end_time', periodStart.toISOString()) .lte('actual_end_time', periodEnd.toISOString()) .order('id'); const jobs = await fetchAllRows((o, l) => jobsQuery.range(o, o + l - 1)); const { data: assignments } = await supabase .from('operator_machines') .select('operator_id, machine_id'); const { data: profiles } = await supabase.from('profiles').select('id, full_name, avatar_url'); const machineToOperator: Rec …
  ```
- **calculateLevelInfo(points: number)** — `src/hooks/useGamification.ts`
  ```
  const level = Math.floor(points / 1000) + 1; const xp_progress = points % 1000; const xp_target = 1000; return { level, xp_progress, xp_target };
  ```
- **validateFileMagicBytes(file: File, allowedMimeTypes: string[] = ['image/jpeg', 'image/png', 'image/webp'])** — `src/lib/file-validation.ts`
  ```
  isValid: boolean, error?: string
  ```
- **generateProductivityReport(data: ProductivityReportData)** — `src/lib/productivityReport.ts`
  ```
  const doc = new jsPDF(); const pageWidth = doc.internal.pageSize.getWidth(); const pageHeight = doc.internal.pageSize.getHeight(); const margin = 20; let yPosition = margin; const checkPageBreak = (requiredSpace: number) => { if (yPosition + requiredSpace > pageHeight - margin) { doc.addPage(); yPosition = margin; return true; } return false; }; doc.setFillColor(30, 30, 30); doc.rect(0, 0, pageWidth, 40, 'F'); doc.setTextColor(255, 255, 255); doc.setFontSize(22); doc.setFont('helvetica', 'bold') …
  ```
- **calculateRetryDelay(attemptIndex: number)** — `src/lib/queryConfig.ts`
  ```
  const delay = Math.min( RETRY_CONFIG.baseDelay * Math.pow(2, attemptIndex), RETRY_CONFIG.maxDelay ); const jitter = delay * 0.25 * (Math.random() * 2 - 1); return Math.round(delay + jitter);
  ```
- **shouldRetry(error: unknown)** — `src/lib/queryConfig.ts`
  ```
  if (error instanceof Error) { const code = (error as Error & { code?: string }).code; if (code && NO_RETRY_POSTGREST_CODES.has(code)) { return false; } const message = error.message.toLowerCase(); if (message.includes('network') || message.includes('fetch')) { return true; } if (message.includes('timeout') || message.includes('408')) { return true; } if (message.includes('rate limit') || message.includes('429') || message.includes('too many')) { return true; } if (message.includes('500') || mess …
  ```
- **calculateRange(page: number, pageSize: number)** — `src/lib/queryConfig.ts`
  ```
  from: number; to: number
  ```
- **computeDelay(attempt: number, options: Required<RetryOptions>)** — `src/lib/retryWithBackoff.ts`
  ```
  const exponentialDelay = options.baseDelay * Math.pow(options.factor, attempt); const cappedDelay = Math.min(exponentialDelay, options.maxDelay); if (options.jitter) { return Math.floor(Math.random() * cappedDelay); } return cappedDelay;
  ```
- **generateFuzzPayload(basePayload: MutablePayload)** — `src/lib/simulation.ts`
  ```
  const mutations: Array<(p: MutablePayload) => SimulationPayload> = [ (p) => { delete p.source; return p; }, (p) => { p.source = 123; return p; }, (p) => { p.event = null; return p; }, (p) => { p.data = { invalid: "structure" }; return p; }, (p) => { p.injection = "'; DROP TABLE machines; --"; return p; }, (p) => { p.overflow = "X".repeat(50000); return p; }, () => "{ malformed_json: true ", (p) => { p.nested_loop = { a: { b: { c: { d: { e: "deep" } } } } }; return p; }, ]; const mutation = mutat …
  ```
- **generateScenarios(count: number = 10)** — `src/lib/simulation.ts`
  ```
  const baseScenarios = SCENARIOS; const scenarios: SimulationScenario[] = []; for (let i = 0; i < count; i++) { const base = baseScenarios[i % baseScenarios.length]; const isFuzz = Math.random() > 0.3; if (isFuzz) { const basePayload: MutablePayload = { source: base.source, event: base.event, data: { id: i, ts: new Date().toISOString() }, meta: { iteration: i, correlation_id: crypto.randomUUID() }, }; scenarios.push({ ...base, id: `fuzz-${i}-${Date.now()}`, name: `Stress Attack Vector ${i}`, desc …
  ```
- **applyPreset(preset: DashboardPreset)** — `src/pages/OEEDashboard.tsx`
  ```
  const p = preset as unknown as OEEPreset; if (p.filters.period) setPeriod(p.filters.period); if (p.filters.machineId) setMachineId(p.filters.machineId); if (p.filters.techniqueId) setTechniqueId(p.filters.techniqueId); if (p.filters.shift) setShift(p.filters.shift); toast.success(`Filtro "${p.name}" aplicado`);
  ```
- **generateLotNumber()** — `src/pages/TraceabilityPage.tsx`
  ```
  const date = format(new Date(), 'yyyyMMdd'); const random = Math.random().toString(36).substring(2, 6).toUpperCase(); return `LOT-${date}-${random}`;
  ```
- **generateOAuthState(supabase: any)** — `supabase/functions/bitrix24-sync/index.ts`
  ```
  const ts = Date.now().toString(); const nonce = crypto.randomUUID(); const keyMat = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'); if (!keyMat) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set'); const enc = new TextEncoder(); const key = await crypto.subtle.importKey('raw', enc.encode(keyMat), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']); const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(`${ts}.${nonce}`))); const sigHex = Array.from(sig).map(b => b.toString(16 …
  ```
- **calculateLockoutMinutes(lockoutCount: number)** — `supabase/functions/check-login-lockout/index.ts`
  ```
  const minutes = BASE_LOCKOUT_MINUTES * Math.pow(2, lockoutCount); return Math.min(minutes, 24 * 60);
  ```
- **validateApiKey(req: Request, supabase: any)** — `supabase/functions/erp-api/index.ts`
  ```
  const authHeader = req.headers.get('authorization'); const apiKey = req.headers.get('x-api-key'); if (authHeader?.startsWith('Bearer ')) { const token = authHeader.slice(7); const { data: { user }, error } = await supabase.auth.getUser(token); if (!error && user) { const { data: roleRows } = await supabase .from('user_roles') .select('role') .eq('user_id', user.id) .eq('is_active', true); const roles = (roleRows ?? []).map((r: { role: string }) => r.role); if (roles.some((role: string) => ['coor …
  ```
- **validateColumns(columns: unknown)** — `supabase/functions/external-db-bridge/index.ts`
  ```
  if (!columns || columns === "*") return "*"; if (typeof columns !== "string") return null; const trimmed = columns.trim(); if (!COLUMNS_PATTERN.test(trimmed)) return null; return trimmed;
  ```
- **validateBridgeRequest(body: any)** — `supabase/functions/external-db-bridge/index.ts`
  ```
  valid: boolean; error?: string; data?: { action: string; table?: string; rpc?: string; params?: Record<string, unknown>; };
  ```
- **generateJobReport(data: any, options: any)** — `supabase/functions/pdf-generator/index.ts`
  ```
  const content = `Job Report\n\nGenerated: ${new Date().toISOString()}\n\nData: ${JSON.stringify(data, null, 2)}`; return new TextEncoder().encode(content);
  ```
- **generateQualityReport(data: any, options: any)** — `supabase/functions/pdf-generator/index.ts`
  ```
  const content = `Quality Report\n\nGenerated: ${new Date().toISOString()}\n\nData: ${JSON.stringify(data, null, 2)}`; return new TextEncoder().encode(content);
  ```
- **generateMaintenanceReport(data: any, _options: any)** — `supabase/functions/pdf-generator/index.ts`
  ```
  const { execution, machine, technical_sheet, supplies, alerts } = data; let content = `ORDEM DE SERVIÇO TÉCNICA - TPM\n`; content += `====================================\n\n`; content += `ID Execução: ${sanitizeText(execution?.id) || 'N/A'}\n`; content += `Data: ${new Date(execution?.completed_at || execution?.started_at).toLocaleString('pt-BR')}\n`; content += `Operador: ${sanitizeText(execution?.performed_by_name) || 'N/A'}\n\n`; content += `DADOS DA MÁQUINA E SERVIÇO\n`; content += `-------- …
  ```

### G.4 Percentuais e multiplicadores no código

| Trecho | Arquivo |
|---|---|
| `const radius = innerRadius + (outerRadius - innerRadius) * 0.5;` | `src/components/abc/ABCCostBreakdownChart.tsx` |
| `transition={{ delay: idx * 0.1 }}` | `src/components/abc/AIFinancialAdvisor.tsx` |
| `transition={{ delay: index * 0.03 }}` | `src/components/activity/ActivityLog.tsx` |
| `transition={{ delay: index * 0.05, duration: 0.2 }}` | `src/components/calendar/AgendaView.tsx` |
| `{bottlenecks.length} máquina(s) operando acima de 85% de capacidade. Risco de atraso em cascata.` | `src/components/calendar/OptimizationAssistant.tsx` |
| `O horário sugerido ({suggestion.time}) reduz o tempo de ociosidade entre turnos em 20%.` | `src/components/dashboard/AlertScheduleModal.tsx` |
| `} else if (data.totalTime > data.limit * 0.7) {` | `src/components/dashboard/AlertsWidget.tsx` |
| `<TableCell>10-20%</TableCell>` | `src/components/design-system/sections/ColorsSection.tsx` |
| `<TableCell>100%</TableCell>` | `src/components/design-system/sections/ColorsSection.tsx` |
| `<TableCell>120%</TableCell>` | `src/components/design-system/sections/ColorsSection.tsx` |
| `<TableCell>150%</TableCell>` | `src/components/design-system/sections/ColorsSection.tsx` |
| `hsl(var(--primary) / 0.1) 0%,` | `src/components/design-system/sections/ColorsSection.tsx` |
| `hsl(var(--primary) / 0.2) 100%` | `src/components/design-system/sections/ColorsSection.tsx` |
| `hsl(var(--primary)) 0%,` | `src/components/design-system/sections/ColorsSection.tsx` |
| `hsl(var(--primary)) 100%` | `src/components/design-system/sections/ColorsSection.tsx` |
| `hsl(var(--primary-glow)) 100%` | `src/components/design-system/sections/ColorsSection.tsx` |
| `animationDelay: `${i * 0.2}s`,` | `src/components/design-system/sections/OverviewSection.tsx` |
| `const bounceProgress = progress >= 0.8 ? 1 + Math.sin((progress - 0.8) * 5 * Math.PI) * 0.1 * (1 - progress) * 5 : eased;` | `src/components/design-system/sections/OverviewSection.tsx` |
| `<span>100%</span>` | `src/components/design-system/sections/ProgressSection.tsx` |
| `<span>65%</span>` | `src/components/design-system/sections/ProgressSection.tsx` |
| `<span>75%</span>` | `src/components/design-system/sections/ProgressSection.tsx` |
| `<span>95%</span>` | `src/components/design-system/sections/ProgressSection.tsx` |
| `--background: 220 20% 97%; /* Fundo light mode */` | `src/components/design-system/sections/ThemeToggleSection.tsx` |
| `--background: 222 47% 8%; /* Fundo dark mode */` | `src/components/design-system/sections/ThemeToggleSection.tsx` |
| `--foreground: 220 20% 95%; /* Texto dark mode */` | `src/components/design-system/sections/ThemeToggleSection.tsx` |
| `--foreground: 222 47% 12%; /* Texto light mode */` | `src/components/design-system/sections/ThemeToggleSection.tsx` |
| `--primary: 222 47% 50%; /* Cor primária (lua) */` | `src/components/design-system/sections/ThemeToggleSection.tsx` |
| `--warning: 38 92% 50%; /* Cor de warning (sol) */` | `src/components/design-system/sections/ThemeToggleSection.tsx` |
| `0% { clip-path: circle(0% at center); }` | `src/components/design-system/sections/ThemeToggleSection.tsx` |
| `0%, 100% { filter: drop-shadow(0 0 4px hsl(var(--warning) / 0.4)); }` | `src/components/design-system/sections/ThemeToggleSection.tsx` |
| `100% { clip-path: circle(150% at center); }` | `src/components/design-system/sections/ThemeToggleSection.tsx` |
| `50% { filter: drop-shadow(0 0 12px hsl(var(--warning) / 0.8)); }` | `src/components/design-system/sections/ThemeToggleSection.tsx` |
| `51% { transform-origin: right; }` | `src/components/design-system/sections/ThemeToggleSection.tsx` |
| `hsl(220 20% 97% / 0.5) 100%` | `src/components/design-system/sections/ThemeToggleSection.tsx` |
| `hsl(222 47% 8% / 0.4) 100%` | `src/components/design-system/sections/ThemeToggleSection.tsx` |
| `hsl(var(--primary) / 0.15) 0%,` | `src/components/design-system/sections/ThemeToggleSection.tsx` |
| `hsl(var(--warning) / 0.2) 0%,` | `src/components/design-system/sections/ThemeToggleSection.tsx` |
| `angle: (Math.PI * 2 / 40) * i + (Math.random() - 0.5) * 0.8,` | `src/components/design-system/sections/overview/OverviewStatCard.tsx` |
| `duration: 0.8 + Math.random() * 0.8,` | `src/components/design-system/sections/overview/OverviewStatCard.tsx` |
| `gainNode.gain.exponentialRampToValueAtTime(0.001, now + i * 0.04 + 0.2);` | `src/components/design-system/sections/overview/OverviewStatCard.tsx` |
| `gainNode.gain.linearRampToValueAtTime(0.15, now + i * 0.04 + 0.02);` | `src/components/design-system/sections/overview/OverviewStatCard.tsx` |
| `gainNode.gain.setValueAtTime(0, now + i * 0.04);` | `src/components/design-system/sections/overview/OverviewStatCard.tsx` |
| `oscillator.frequency.setValueAtTime(freq, now + i * 0.04);` | `src/components/design-system/sections/overview/OverviewStatCard.tsx` |
| `oscillator.start(now + i * 0.04);` | `src/components/design-system/sections/overview/OverviewStatCard.tsx` |
| `oscillator.stop(now + i * 0.04 + 0.25);` | `src/components/design-system/sections/overview/OverviewStatCard.tsx` |
| `sparkle.frequency.setValueAtTime(2000 + Math.random() * 2000, now + i * 0.05);` | `src/components/design-system/sections/overview/OverviewStatCard.tsx` |
| `sparkle.start(now + i * 0.05);` | `src/components/design-system/sections/overview/OverviewStatCard.tsx` |
| `sparkle.stop(now + i * 0.05 + 0.2);` | `src/components/design-system/sections/overview/OverviewStatCard.tsx` |
| `sparkleGain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.05 + 0.15);` | `src/components/design-system/sections/overview/OverviewStatCard.tsx` |
| `sparkleGain.gain.linearRampToValueAtTime(0.05, now + i * 0.05 + 0.01);` | `src/components/design-system/sections/overview/OverviewStatCard.tsx` |
| `sparkleGain.gain.setValueAtTime(0, now + i * 0.05);` | `src/components/design-system/sections/overview/OverviewStatCard.tsx` |
| `// Simulation: IA optimization reduces losses by 35% and increases revenue by 10%` | `src/components/digital-twin/CostSimulationCard.tsx` |
| `const optimizedCost = currentCost * 0.65;` | `src/components/digital-twin/CostSimulationCard.tsx` |
| `const randomScale = 0.5 + Math.random() * 0.5;` | `src/components/feedback/CelebrationMoment.tsx` |
| `delay={i * 0.02}` | `src/components/feedback/CelebrationMoment.tsx` |
| `: totalEstimatedTime > columnLimit * 0.7` | `src/components/kanban/DroppableColumn.tsx` |
| `Risco de Gargalo: {totalEstimatedTime > columnLimit ? "Crítico" : totalEstimatedTime > columnLimit * 0.7 ? "Moderado" : "Baixo"}` | `src/components/kanban/DroppableColumn.tsx` |
| `totalEstimatedTime > columnLimit * 0.7 ? "bg-orange-500" : "bg-success"` | `src/components/kanban/DroppableColumn.tsx` |
| `totalEstimatedTime > columnLimit * 0.7 ? "border-orange-500 text-orange-500 bg-orange-500/10" :` | `src/components/kanban/DroppableColumn.tsx` |
| `totalEstimatedTime > columnLimit * 0.7 ? "text-orange-500" : "text-success"` | `src/components/kanban/DroppableColumn.tsx` |
| `{totalEstimatedTime > columnLimit ? "GARGALO" : totalEstimatedTime > columnLimit * 0.7 ? "ATENÇÃO" : "ESTÁVEL"}` | `src/components/kanban/DroppableColumn.tsx` |
| `delay: i * 0.15,` | `src/components/loading/LoadingSpinner.tsx` |
| `transition={{ delay: i * 0.01 }}` | `src/components/machines/FactoryHeatmap.tsx` |
| `transition={{ delay: index * 0.03 }}` | `src/components/machines/MachineCard.tsx` |
| `transition={{ delay: index * 0.05 }}` | `src/components/navigation/GlobalSearch.tsx` |
| `transition={{ delay: index * 0.03, duration: 0.2 }}` | `src/components/navigation/MobileNavigation.tsx` |
| `transition: { delay: (actions.length - index - 1) * 0.03 }` | `src/components/navigation/MobileQuickActions.tsx` |
| `transition: { delay: index * 0.05 }` | `src/components/navigation/MobileQuickActions.tsx` |
| `transition={{ delay: idx * 0.1 }}` | `src/components/operators/AIWorkforceAdvisor.tsx` |
| `100% atingidas` | `src/components/operators/GoalsHistoryCard.tsx` |
| `const personalBest = operator.efficiencyScore * (1.1); // Simulated 10% higher than current for visualization` | `src/components/operators/OperatorProductivityCard.tsx` |
| `Garantia de cumprimento do prazo (Deadline) com margem de segurança de 20%.` | `src/components/planning/LoadBalancingPanel.tsx` |
| `+2.4%` | `src/components/planning/PlanningEfficiencyDashboard.tsx` |
| `currentTime += duration * 0.9;` | `src/components/qrcode/scanHistorySounds.ts` |
| `transition={{ delay: idx * 0.05 }}` | `src/components/scheduling/CapacityHealthPanel.tsx` |
| `transition={{ delay: idx * 0.1 }}` | `src/components/scheduling/StuckJobsPanel.tsx` |
| `pressure: 5.0 + Math.random() * 0.8,` | `src/components/technical-assistant/TechnicalTelemetryPanel.tsx` |
| `transition={{ delay: idx * 0.05 }}` | `src/components/traceability/LotGenealogyView.tsx` |
| `delay: Math.random() * 0.5,` | `src/components/ui/celebration.tsx` |
| `transition={{ delay: idx * 0.1 }}` | `src/features/admin/components/audit/AuditAIAdvisor.tsx` |
| `v === null ? "bg-muted" : v >= max * 0.8 ? "bg-warning" : "bg-primary/60",` | `src/features/admin/components/monitoring/CronP95TrendCard.tsx` |
| `transition={{ delay: idx * 0.1 }}` | `src/features/analytics/components/bi/AIInsights.tsx` |
| `transition={{ delay: index * 0.15 }}` | `src/features/analytics/components/bi/BIAIInsights.tsx` |
| `<CardDescription>Últimos 14 dias • Meta: 85%</CardDescription>` | `src/features/analytics/components/bi/BINormalView.tsx` |
| `// Target reduction: 50% reduction in losses` | `src/features/analytics/components/bi/BIPredictiveROI.tsx` |
| `Reduzindo a variabilidade térmica na técnica <strong>Laser</strong> e otimizando o setup em 8%, o sistema prevê um retorno de capital em <strong>42 dias</strong …` | `src/features/analytics/components/bi/BIPredictiveROI.tsx` |
| `const potentialSaving = currentLossCost * 0.5;` | `src/features/analytics/components/bi/BIPredictiveROI.tsx` |
| `transition={{ delay: idx * 0.1 }}` | `src/features/analytics/components/energy/AIEnergyAdvisor.tsx` |
| `recommendation: `Considere redistribuir ${scheduledJobs.length - Math.floor(scheduledJobs.length * 0.7)} jobs para outras datas ou técnicas alternativas`` | `src/features/analytics/hooks/useBottleneckPrediction.ts` |
| `const carbonFootprintKg = totalConsumption * 0.088;` | `src/features/analytics/hooks/useEnergy.ts` |
| `confidence: 0.9 - (i * 0.05)` | `src/features/analytics/hooks/useKPIs.ts` |
| `const colorAdjustment = 1 + (colorCount - 1) * 0.15;` | `src/features/analytics/hooks/useKPIs.ts` |
| `if (m.jobCount > 0 && (85 - (m.lossRate * 2)) < targets.occupancyRate * 0.7) {` | `src/features/analytics/hooks/useKPIs.ts` |
| `if (totalJobs > 0 && delayedJobs > totalJobs * 0.1) {` | `src/features/analytics/hooks/useKPIs.ts` |
| `severity: delayedJobs > totalJobs * 0.2 ? 'high' : 'medium',` | `src/features/analytics/hooks/useKPIs.ts` |
| `isUnbalanced: boolean; // > 30% difference between min/max` | `src/features/analytics/types/index.ts` |
| `const newVibration = 2 + Math.random() + (Math.sin(Date.now() / 1000) * 0.5);` | `src/features/maintenance/components/VirtualSensorPanel.tsx` |
| `: `hsl(var(--destructive) / ${0.15 + intensity * 0.85})`;` | `src/features/packaging/components/PackagingSlaHeatmap.tsx` |
| `// ordered" — falling back to job.quantity fabricated 100% output with` | `src/features/production/hooks/useOEE.ts` |
| `// DROP DETECTION: If OEE drops more than 10% compared to last check within the same session` | `src/features/production/hooks/useOEEAlerts.ts` |
| `// Don't alert on 0% if the machine had no jobs at all in this period` | `src/features/production/hooks/useOEEAlerts.ts` |
| `const efficiencyScore = jobsCompleted > 0 ? (lossScore * 0.6 + timeScore * 0.4) : 0;` | `src/features/production/hooks/useOperatorEvolution.ts` |
| `// Met the goal: show granular progress (0% loss = 100%, at target = 75% baseline)` | `src/features/production/hooks/useOperatorGoals.ts` |
| `const bonusRange = 25; // 25% extra for being better than target` | `src/features/production/hooks/useOperatorGoals.ts` |
| `: 100 + timeDeviation * 50 // Full penalty for being slower (-50 per 100% slower)` | `src/features/production/hooks/useOperatorProductivity.ts` |
| `? 100 - timeDeviation * 25 // Gentle penalty for being faster (only -25 per 100% faster)` | `src/features/production/hooks/useOperatorProductivity.ts` |
| `const efficiencyScore = (lossScore * 0.6 + timeScore * 0.4); // 60% weight on quality, 40% on time` | `src/features/production/hooks/useOperatorProductivity.ts` |
| `const lossScore = Math.max(0, 100 - lossRate * 5); // -5 points per 1% loss` | `src/features/production/hooks/useOperatorProductivity.ts` |
| `// "fully produced as ordered" (fabricates 100% output / zero loss).` | `src/features/production/services/oeeCalculations.ts` |
| `const resistedDistance = distance * 0.5;` | `src/hooks/use-pull-to-refresh.tsx` |
| `* - Jobs in production exceeding 100% of estimated time (critical - auto-marks as delayed)` | `src/hooks/useSmartDelayAlerts.ts` |
| `* - Jobs in production exceeding 80% of estimated time (warning)` | `src/hooks/useSmartDelayAlerts.ts` |
| `// Critical at 100% — auto-mark as delayed` | `src/hooks/useSmartDelayAlerts.ts` |
| `// Warning at 80%` | `src/hooks/useSmartDelayAlerts.ts` |
| `const jitter = delay * 0.25 * (Math.random() * 2 - 1);` | `src/lib/queryConfig.ts` |
| `A IA identificou que mover o <strong>Almoxarifado de Tintas</strong> 5 metros para a esquerda reduzirá o tempo de deslocamento em 12%.` | `src/pages/DigitalTwin.tsx` |
| `transition={{ delay: 0.2 + index * 0.1 }}` | `src/pages/InstallAppPage.tsx` |
| `94.2%` | `src/pages/LogisticsPage.tsx` |
| `A IA identificou que trocando a transportadora padrão pela <strong>Expresso Veloz</strong> em rotas para o Sudeste, você economizará <strong>15%</strong> no pró …` | `src/pages/LogisticsPage.tsx` |
| `? `hsl(var(--primary) / ${0.06 + ratio * 0.28})`` | `src/pages/MonthlyCalendar.tsx` |
| `transition={{ delay: index * 0.05 }}` | `src/pages/NotFound.tsx` |
| `p95Latency: results.length > 0 ? results.sort((a, b) => a.latency - b.latency)[Math.floor(results.length * 0.95)]?.latency : 0,` | `src/pages/SimulationDashboard.tsx` |
| `// Quality Master achievement (>99% quality)` | `supabase/functions/calculate-rankings/index.ts` |

## H. Parâmetros de negócio (constantes, prazos, limites)

### H.1 Constantes

| Constante | Valor | Arquivo |
|---|---|---|
| `WORK_DAY_MINUTES` | `13` | `src/components/dashboard/AlertScheduleModal.tsx` |
| `WORK_START` | `7` | `src/components/dashboard/AlertScheduleModal.tsx` |
| `WORK_START` | `7` | `src/components/dashboard/AlertScheduleModal.tsx` |
| `BUFFER_TARGET` | `3` | `src/components/dashboard/BufferStatusWidget.tsx` |
| `MAX_VISIBLE_ITEMS` | `4` | `src/components/navigation/Breadcrumbs.tsx` |
| `LABEL_MAX_CHARS` | `22` | `src/components/navigation/Breadcrumbs.tsx` |
| `DIALOG_SELECTOR` | `'[role="` | `src/components/navigation/DialogHistoryGuard.tsx` |
| `MAX_ENTRIES` | `30` | `src/components/navigation/ScrollRestoration.tsx` |
| `FORECAST_DAYS` | `7` | `src/components/operators/EvolutionChart.tsx` |
| `SIDEBAR_COOKIE_MAX_AGE` | `60` | `src/components/ui/sidebar.tsx` |
| `SIDEBAR_WIDTH` | `"16rem"` | `src/components/ui/sidebar.tsx` |
| `SIDEBAR_WIDTH_MOBILE` | `"18rem"` | `src/components/ui/sidebar.tsx` |
| `REAUTH_VALIDITY_MINUTES` | `5` | `src/contexts/ReauthContext.tsx` |
| `OPT_OUT_FLAG` | `"cron_alerts_off"` | `src/features/admin/components/monitoring/CronEmailPreferenceCard.tsx` |
| `CONTEXT` | `'useAuditTrail'` | `src/features/admin/hooks/useAuditTrail.ts` |
| `MAX_RETRIES` | `3` | `src/features/admin/hooks/useBitrix24Sync.ts` |
| `RETRY_DELAY_MS` | `1000` | `src/features/admin/hooks/useBitrix24Sync.ts` |
| `CRON_FAILURE_ALERT_THRESHOLD` | `3` | `src/features/admin/hooks/useCronHealth.ts` |
| `MIN_SAMPLES` | `3` | `src/features/admin/hooks/useCronHealthHistory.ts` |
| `MAX_EXPORT_ROWS` | `10000` | `src/features/admin/hooks/useDataExport.ts` |
| `MAX_VERSIONS` | `50` | `src/features/admin/hooks/useVersionHistory.ts` |
| `DAILY_CAPACITY_MINUTES` | `11` | `src/features/analytics/hooks/useBottleneckPrediction.ts` |
| `DAYS_AHEAD` | `14` | `src/features/analytics/hooks/useBottleneckPrediction.ts` |
| `DAILY_CAPACITY_MINUTES` | `11` | `src/features/analytics/hooks/useLoadBalancingWithActions.ts` |
| `AUTH_BOOT_TIMEOUT_MS` | `8000` | `src/features/auth/components/AuthProvider.tsx` |
| `USER_DATA_TIMEOUT_MS` | `6000` | `src/features/auth/components/AuthProvider.tsx` |
| `ACTIVITY_TIMEOUT_MINUTES` | `60` | `src/features/auth/components/AuthProvider.tsx` |
| `REFRESH_INTERVAL_MINUTES` | `30` | `src/features/auth/components/AuthProvider.tsx` |
| `WARNING_HOURS` | `8` | `src/features/jobs/hooks/useStuckJobsDetection.ts` |
| `CRITICAL_HOURS` | `24` | `src/features/jobs/hooks/useStuckJobsDetection.ts` |
| `GLOBAL_TECHNIQUE_VALUE` | `'__global__'` | `src/features/maintenance/components/ChecklistManager.tsx` |
| `DAILY_SUMMARY_HOUR` | `8` | `src/features/notifications/hooks/useDailySummaryNotifications.ts` |
| `NONE_TECH` | `'__none__'` | `src/features/packaging/components/PackagingSlaOverridesManager.tsx` |
| `SP_TIMEZONE` | `'America/Sao_Paulo'` | `src/features/production/hooks/useOEE.ts` |
| `CONTEXT` | `'useOEEAlerts'` | `src/features/production/hooks/useOEEAlerts.ts` |
| `PLANNED_MINUTES_PER_DAY` | `11` | `src/features/production/services/oeeCalculations.ts` |
| `MOBILE_BREAKPOINT` | `768` | `src/hooks/use-device.tsx` |
| `TABLET_BREAKPOINT` | `1024` | `src/hooks/use-device.tsx` |
| `RESIZE_THROTTLE_MS` | `150` | `src/hooks/use-device.tsx` |
| `MODAL_PUSHED_STATE` | `'modalPushed'` | `src/hooks/use-modal-param.ts` |
| `TOAST_LIMIT` | `1` | `src/hooks/use-toast.ts` |
| `TOAST_REMOVE_DELAY` | `1000000` | `src/hooks/use-toast.ts` |
| `MAX_FAVORITES` | `6` | `src/hooks/useQuickFavorites.ts` |
| `DAILY_CAPACITY` | `480` | `src/hooks/useTechniqueCapacityAlerts.ts` |
| `BATCH_SIZE` | `5` | `src/hooks/abc/useABCMutations.ts` |
| `MAX_ATTEMPTS` | `3` | `src/lib/lazyWithRetry.ts` |
| `RELOAD_FLAG` | `'lazy-chunk-reload-attempted'` | `src/lib/lazyWithRetry.ts` |
| `RELOAD_FLAG_TTL_MS` | `60` | `src/lib/lazyWithRetry.ts` |
| `OFFLINE_WAIT_MS` | `10` | `src/lib/lazyWithRetry.ts` |
| `MAX_HISTORY` | `50` | `src/lib/logger.ts` |
| `MAX_QUEUE` | `100` | `src/lib/logger.ts` |
| `FLUSH_DEBOUNCE_MS` | `2000` | `src/lib/logger.ts` |
| `FLUSH_AT_SIZE` | `25` | `src/lib/logger.ts` |
| `MAX_STACK` | `60` | `src/lib/navHistory.ts` |
| `NAV_STACK_STATE` | `'__fgNavStack'` | `src/lib/navHistory.ts` |
| `NAVIGATION_EVENT` | `'app:navigate'` | `src/lib/navigation.ts` |
| `DB_VERSION` | `1` | `src/lib/offlineStorage.ts` |
| `DEFAULT_PAGE_SIZE` | `50` | `src/lib/queryConfig.ts` |
| `MAX_PAGE_SIZE` | `200` | `src/lib/queryConfig.ts` |
| `MAX_RETRIES` | `3` | `src/lib/offline/offlineQueue.ts` |
| `RETRY_BACKOFF_BASE_MS` | `3000` | `src/lib/offline/offlineQueue.ts` |
| `START_HOUR` | `7` | `src/pages/DailyCalendar.tsx` |
| `END_HOUR` | `21` | `src/pages/DailyCalendar.tsx` |
| `DEFAULT_ALLOWED_METHODS` | `"GET, POST, PATCH, PUT, DELETE, OPTIONS"` | `supabase/functions/_shared/cors.ts` |
| `REQUEST_ID_HEADER` | `"x-request-id"` | `supabase/functions/_shared/logger.ts` |
| `BUFFER_TARGET` | `3` | `supabase/functions/auto-promote-jobs/index.ts` |
| `PAGE_SIZE` | `5000` | `supabase/functions/backup-scheduler/index.ts` |
| `MAX_PAGES` | `20` | `supabase/functions/backup-scheduler/index.ts` |
| `CACHE_TTL_MS` | `60` | `supabase/functions/bitrix24-sync/index.ts` |
| `MAX_FAILED_ATTEMPTS` | `5` | `supabase/functions/check-login-lockout/index.ts` |
| `BASE_LOCKOUT_MINUTES` | `1` | `supabase/functions/check-login-lockout/index.ts` |
| `FAILURE_THRESHOLD` | `3` | `supabase/functions/cron-alert-email/index.ts` |
| `DEDUPE_HOURS` | `6` | `supabase/functions/cron-alert-email/index.ts` |
| `FROM` | `"Fast Gravações <alertas@resend.dev>"` | `supabase/functions/cron-alert-email/index.ts` |
| `MAX_BODY_BYTES` | `16` | `supabase/functions/csp-report/index.ts` |
| `INBOUND_WINDOW_MS` | `60` | `supabase/functions/csp-report/index.ts` |
| `EXPORT_ROW_LIMIT` | `20000` | `supabase/functions/excel-export/index.ts` |
| `MAX_BATCH_SIZE` | `10` | `supabase/functions/ml-predictions/index.ts` |
| `RESEND_MAX_RECIPIENTS` | `50` | `supabase/functions/send-loss-risk-alert/index.ts` |
| `MAX_MESSAGES` | `40` | `supabase/functions/technical-assistant/index.ts` |
| `MAX_MESSAGE_CHARS` | `8000` | `supabase/functions/technical-assistant/index.ts` |
| `MAX_CUSTOM_KNOWLEDGE_CHARS` | `20000` | `supabase/functions/technical-assistant/index.ts` |

### H.2 Prazos, expirações e janelas de tempo

| Trecho | Arquivo |
|---|---|
| `timeout: 120_000,` | `playwright.config.ts` |
| `assertiveTimeoutRef.current = setTimeout(() => setAssertiveMessage(''), 1000);` | `src/components/accessibility/AccessibilityProvider.tsx` |
| `politeTimeoutRef.current = setTimeout(() => setPoliteMessage(''), 1000);` | `src/components/accessibility/AccessibilityProvider.tsx` |
| `setTimeout(() => setMessage(""), 1000);` | `src/components/accessibility/hooks.ts` |
| `const endTime = addMinutes(startTime, 60);` | `src/components/calendar/QuickJobDrawer.tsx` |
| `const days = eachDayOfInterval({ start: subDays(today, 13), end: today });` | `src/components/dashboard/EfficiencyAlertTrendChart.tsx` |
| `const days = eachDayOfInterval({ start: subDays(today, 29), end: today });` | `src/components/dashboard/OEELoadTrendWidget.tsx` |
| `<Button size="sm" variant="outline" onClick={() => { setGenerating(true); setTimeout(() => setGenerating(false), 1500); }} disabled={generating}>` | `src/components/design-system/hooks/PredictionHooksDemos.tsx` |
| `new Promise((resolve) => setTimeout(resolve, 2000)),` | `src/components/design-system/sections/FeedbackSection.tsx` |
| `const simulateLoading = () => { setIsLoading(true); setTimeout(() => setIsLoading(false), 2000); };` | `src/components/design-system/sections/loading/ButtonLoadingSection.tsx` |
| `setTimeout(() => setConfetti(prev => prev.filter(p => p.id < id \|\| p.id >= id + 40)), 1600);` | `src/components/design-system/sections/overview/OverviewStatCard.tsx` |
| `const date = startOfDay(subDays(new Date(), 13 - i));` | `src/components/integrations/Bitrix24SyncHistory.tsx` |
| `const timer = setTimeout(() => setShowTour(true), 1000);` | `src/components/onboarding/OnboardingTour.tsx` |
| `const timer = setTimeout(() => setRun(true), 2000);` | `src/components/onboarding/SystemOnboarding.tsx` |
| `end = endOfMonth(addMonths(now, 1));` | `src/components/operators/CreateGoalModal.tsx` |
| `end = endOfMonth(addMonths(now, 2));` | `src/components/operators/CreateGoalModal.tsx` |
| `start = startOfMonth(addMonths(now, 1));` | `src/components/operators/CreateGoalModal.tsx` |
| `highlightTimeoutRef.current = window.setTimeout(() => { setNewScanIdsRef.current(prev => { const u = new Set(prev); u.delete(newScan.id); return u; }); }, 3000) …` | `src/components/qrcode/ScanHistory.tsx` |
| `<Button variant="ghost" size="sm" className="w-full h-7 text-[9px] uppercase font-bold text-muted-foreground hover:text-primary" onClick={() => { onDateRangeCha …` | `src/components/reports/ReportSourcePanel.tsx` |
| `onDateRangeChange({ from: subDays(new Date(), 7), to: new Date() });` | `src/components/reports/ReportSourcePanel.tsx` |
| `sequenceTimeout.current = setTimeout(() => { setKeySequence([]); }, 1000);` | `src/components/shortcuts/KeyboardShortcuts.tsx` |
| `setTimeout(() => setCopied(false), 2000);` | `src/components/technical-assistant/ChatMessage.tsx` |
| `setTimeout(() => setCopied(false), 2000);` | `src/components/technical-assistant/TechnicalArtifacts.tsx` |
| `setTimeout(() => setCopied(false), 2000);` | `src/components/ui/code-block.tsx` |
| `onClick={() => setDate({ from: subDays(new Date(), 30), to: new Date() })}` | `src/components/ui/date-range-picker.tsx` |
| `onClick={() => setDate({ from: subDays(new Date(), 7), to: new Date() })}` | `src/components/ui/date-range-picker.tsx` |
| `const timer = setTimeout(() => setShowFeedback(false), 3000);` | `src/components/voice/VoiceCommands.tsx` |
| `SESSION_EXPIRE: 30 * 60 * 1000, // 30 min` | `src/constants/index.ts` |
| `SESSION_WARNING: 25 * 60 * 1000, // 25 min` | `src/constants/index.ts` |
| `}, 5 * 60 * 1000);` | `src/contexts/OfflineSyncContext.tsx` |
| `const isRecent = new Date(device.last_seen_at).getTime() > Date.now() - 5 * 60 * 1000; // 5 min` | `src/features/admin/components/security/ActiveDevicesPanel.tsx` |
| `: new Date(Date.now() + parseInt(expiresHours, 10) * 60 * 60 * 1000).toISOString();` | `src/features/admin/components/security/BlockedIPsPanel.tsx` |
| `const isRecent = new Date(alert.created_at).getTime() > Date.now() - 24 * 60 * 60 * 1000;` | `src/features/admin/components/security/SecurityAlertsPanel.tsx` |
| `case "1h": return 5 * 60 * 1000; // 5 min` | `src/features/admin/components/telemetry/TelemetryCharts.tsx` |
| `case "24h": return 60 * 60 * 1000; // 1 hora` | `src/features/admin/components/telemetry/TelemetryCharts.tsx` |
| `case "6h": return 30 * 60 * 1000; // 30 min` | `src/features/admin/components/telemetry/TelemetryCharts.tsx` |
| `default: return 6 * 60 * 60 * 1000; // 6 horas (7d/custom)` | `src/features/admin/components/telemetry/TelemetryCharts.tsx` |
| `const dateRange = { start: subDays(new Date(), 30), end: new Date(), label: 'Últimos 30 dias' };` | `src/features/admin/hooks/useBIExport.ts` |
| `staleTime: 10 * 60 * 1000, // 10 minutes` | `src/features/admin/hooks/useBusinessConfig.ts` |
| `const cutoff = Date.now() - 24 * 60 * 60 * 1000;` | `src/features/admin/hooks/useCronHealthHistory.ts` |
| `const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();` | `src/features/admin/hooks/useCronHealthHistory.ts` |
| `const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)` | `src/features/admin/hooks/useCronP95Daily.ts` |
| `staleTime: 5 * 60 * 1000,` | `src/features/admin/hooks/useDashboardSettings.ts` |
| `staleTime: 5 * 60 * 1000, // 5 minutes` | `src/features/admin/hooks/useFeatureFlags.ts` |
| `const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));` | `src/features/analytics/hooks/useEnergy.ts` |
| `const prevEnd = endOfMonth(subMonths(start, 1));` | `src/features/analytics/hooks/useEnergy.ts` |
| `const prevStart = startOfMonth(subMonths(start, 1));` | `src/features/analytics/hooks/useEnergy.ts` |
| `{ label: 'Hoje', start: subDays(now, 0), end: now },` | `src/features/analytics/hooks/useExecutiveDashboard.ts` |
| `{ label: 'Mês Passado', start: startOfMonth(subMonths(now, 1)), end: endOfMonth(subMonths(now, 1)) },` | `src/features/analytics/hooks/useExecutiveDashboard.ts` |
| `const diffDays = (now.getTime() - jobDate.getTime()) / (1000 * 60 * 60 * 24);` | `src/features/analytics/hooks/useKPIs.ts` |
| `reconnectTimerRef.current = setTimeout(() => { reconnectRef.current?.(); }, 5000);` | `src/features/analytics/hooks/useRealtimeConnection.ts` |
| `const diffHours = (new Date(expiresAt * 1000).getTime() - new Date().getTime()) / (1000 * 60 * 60);` | `src/features/auth/components/AuthProvider.tsx` |
| `if (dateFilter === '24h') cutoff = subDays(now, 1);` | `src/features/inventory/components/inventory-page/InventoryHistoryTable.tsx` |
| `if (dateFilter === '30d') cutoff = subDays(now, 30);` | `src/features/inventory/components/inventory-page/InventoryHistoryTable.tsx` |
| `if (dateFilter === '7d') cutoff = subDays(now, 7);` | `src/features/inventory/components/inventory-page/InventoryHistoryTable.tsx` |
| `const last24h = subDays(now, 1);` | `src/features/inventory/hooks/useInventory.ts` |
| `const interval = setInterval(checkEscalation, 5 * 60 * 1000);` | `src/features/jobs/hooks/usePriorityEscalation.ts` |
| `const hoursInProduction = elapsedMs / (1000 * 60 * 60);` | `src/features/jobs/hooks/useStuckJobsDetection.ts` |
| `const stuckThreshold = subHours(now, 4);` | `src/features/jobs/lib/pending-queue.ts` |
| `const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();` | `src/features/jobs/services/jobsService.ts` |
| `onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}` | `src/features/maintenance/components/TPMCalendar.tsx` |
| `onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}` | `src/features/maintenance/components/TPMCalendar.tsx` |
| `setTimeout(() => setCopied(false), 2000);` | `src/features/notifications/components/ToastWithUndo.tsx` |
| `const initialTimeout = setTimeout(() => { showDailySummaryNotification(); }, 3000);` | `src/features/notifications/hooks/useDailySummaryNotifications.ts` |
| `}, 30 * 60 * 1000);` | `src/features/notifications/hooks/useDailySummaryNotifications.ts` |
| `const daysRemaining = Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));` | `src/features/notifications/hooks/useGoalAlerts.ts` |
| `const timeout = setTimeout(() => { hasInitialized.current = true; showNotifications(); }, 3000);` | `src/features/notifications/hooks/useGoalAlerts.ts` |
| `}, 5 * 60 * 1000);` | `src/features/notifications/hooks/useMLPredictionNotifications.ts` |
| `}, 5 * 60 * 1000);` | `src/features/notifications/hooks/useTPMNotifications.ts` |
| `const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();` | `src/features/packaging/hooks/usePackagingQuality.ts` |
| `const elapsed = (now - new Date(refIso).getTime()) / (1000 * 60 * 60);` | `src/features/packaging/hooks/usePackagingSettings.ts` |
| `const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();` | `src/features/packaging/hooks/usePackagingSlaHeatmap.ts` |
| `const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();` | `src/features/packaging/hooks/usePackagingThroughput.ts` |
| `const throttleMs = 4 * 60 * 60 * 1000;` | `src/features/production/hooks/useOEEAlerts.ts` |
| `highlightTimer = window.setTimeout(() => { el.classList.remove('deeplink-focus-highlight'); if (highlighted === el) highlighted = null; }, 2400);` | `src/hooks/use-deeplink-focus.ts` |
| `onDateChange(e.shiftKey ? addWeeks(selectedDate, 1) : addDays(selectedDate, 1));` | `src/hooks/useCalendarHotkeys.ts` |
| `onDateChange(e.shiftKey ? subWeeks(selectedDate, 1) : subDays(selectedDate, 1));` | `src/hooks/useCalendarHotkeys.ts` |
| `const timeoutId = setTimeout(() => controller.abort(), 5000);` | `src/hooks/useNetworkStatus.tsx` |
| `const timer = setTimeout(() => setShowReconnected(false), 3000);` | `src/hooks/useNetworkStatus.tsx` |
| `setTimeout(() => setIsRetrying(false), 2000);` | `src/hooks/useNetworkStatus.tsx` |
| `}, { timeout: 2000 });` | `src/hooks/useRoutePrefetch.ts` |
| `}, { timeout: 3000 });` | `src/hooks/useRoutePrefetch.ts` |
| `const interval = setInterval(checkDelays, 2 * 60 * 1000); // every 2 min` | `src/hooks/useSmartDelayAlerts.ts` |
| `? (new Date(job.actual_end_time).getTime() - new Date(job.actual_start_time).getTime()) / (1000 * 60 * 60)` | `src/hooks/abc/useABCMutations.ts` |
| `}, { timeout: 2000 });` | `src/lib/prefetch.ts` |
| `STATIC: 15 * 60 * 1000, // 15 minutes for static data (techniques, machines)` | `src/lib/queryConfig.ts` |
| `USER: 5 * 60 * 1000, // 5 minutes for user data` | `src/lib/queryConfig.ts` |
| `gcTime: 10 * 60 * 1000, // 10 minutes garbage collection` | `src/lib/queryConfig.ts` |
| `const threshold = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();` | `src/pages/AdminTelemetriaPage.tsx` |
| `const [customRange, setCustomRange] = useState<DateRange>({ from: subDays(new Date(), 30), to: new Date() });` | `src/pages/BIDashboard.tsx` |
| `const [customRange2, setCustomRange2] = useState<DateRange>({ from: subDays(new Date(), 60), to: subDays(new Date(), 31) });` | `src/pages/BIDashboard.tsx` |
| `const endDate = subDays(dateRange.from, 1);` | `src/pages/BIDashboard.tsx` |
| `try { return isWithinInterval(parseISO(j.created_at), { start: startOfDay(halfPeriod), end: endOfDay(subDays(dateRange.from, 1)) }); }` | `src/pages/BIDashboard.tsx` |
| `onNext={() => setSelectedDate(addDays(selectedDate, 1))}` | `src/pages/DailyCalendar.tsx` |
| `onPrev={() => setSelectedDate(subDays(selectedDate, 1))}` | `src/pages/DailyCalendar.tsx` |
| `<Button variant="outline" onClick={() => setDateRange({ start: startOfMonth(subMonths(dateRange.start, 1)), end: endOfMonth(subMonths(dateRange.start, 1)) })}>M …` | `src/pages/EnergyDashboard.tsx` |
| `gcTime: 10 * 60 * 1000,` | `src/pages/ExecutiveDashboard.tsx` |
| `staleTime: 5 * 60 * 1000,` | `src/pages/ExecutiveDashboard.tsx` |
| `d = addDays(d, 1);` | `src/pages/MonthlyCalendar.tsx` |
| `onNext={() => setSelectedDate(addMonths(selectedDate, 1))}` | `src/pages/MonthlyCalendar.tsx` |
| `onPrev={() => setSelectedDate(subMonths(selectedDate, 1))}` | `src/pages/MonthlyCalendar.tsx` |
| `const stuckThreshold = subHours(now, 4);` | `src/pages/PendingQueue.tsx` |
| `from: subDays(new Date(), 30),` | `src/pages/ReportBuilderPage.tsx` |
| `setTimeout(() => navigate('/auth'), 2000);` | `src/pages/ResetPasswordPage.tsx` |
| `startDate: format(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd')` | `src/pages/ShiftHandoverPage.tsx` |
| `gcTime: 10 * 60 * 1000,` | `src/pages/TechnicalKnowledgeBase.tsx` |
| `staleTime: 5 * 60 * 1000,` | `src/pages/TechnicalKnowledgeBase.tsx` |
| `onNext={() => setSelectedDate(addWeeks(selectedDate, 1))}` | `src/pages/WeeklyCalendar.tsx` |
| `onPrev={() => setSelectedDate(subWeeks(selectedDate, 1))}` | `src/pages/WeeklyCalendar.tsx` |
| `('a1111111-1111-1111-1111-000000000001'::uuid, 'PED-2026-0741', 'Adidas Brasil', 'Camiseta Dry Fit', 500, 'serigrafia', v_ser1, v_today - 25, '09:00', '13:30', …` | `supabase/seed.sql` |
| `('a1111111-1111-1111-1111-000000000001'::uuid, 'production','finished', NULL, now() - interval '25 days' + interval '4 hours 30 minutes'),` | `supabase/seed.sql` |
| `('a1111111-1111-1111-1111-000000000001'::uuid, 'queue', 'scheduled', NULL, now() - interval '26 days'),` | `supabase/seed.sql` |
| `('a1111111-1111-1111-1111-000000000001'::uuid, 'scheduled','production',NULL, now() - interval '25 days'),` | `supabase/seed.sql` |
| `('a1111111-1111-1111-1111-000000000002'::uuid, 'PED-2026-0742', 'Nike Brasil', 'Short Esportivo', 300, 'sublimacao', v_sub1, v_today - 22, '08:00', '12:00', 240 …` | `supabase/seed.sql` |
| `('a1111111-1111-1111-1111-000000000002'::uuid, 'production','finished', NULL, now() - interval '22 days' + interval '4 hours'),` | `supabase/seed.sql` |
| `('a1111111-1111-1111-1111-000000000002'::uuid, 'queue', 'scheduled', NULL, now() - interval '23 days'),` | `supabase/seed.sql` |
| `('a1111111-1111-1111-1111-000000000002'::uuid, 'scheduled','production',NULL, now() - interval '22 days'),` | `supabase/seed.sql` |
| `('a1111111-1111-1111-1111-000000000003'::uuid, 'PED-2026-0743', 'Coca-Cola FEMSA', 'Garrafa Térmica 600ml', 1000, 'laser', v_lsr1, v_today - 18, '07:30', '15:30 …` | `supabase/seed.sql` |
| `('a1111111-1111-1111-1111-000000000004'::uuid, 'PED-2026-0744', 'Renner', 'Bolsa de Praia Algodão', 200, 'flexo', v_flx1, v_today - 14, '09:00', '11:30', 150, ' …` | `supabase/seed.sql` |
| `('a1111111-1111-1111-1111-000000000005'::uuid, 'PED-2026-0745', 'Hering', 'Camiseta Básica', 800, 'serigrafia', v_ser2, v_today - 7, '08:00', '17:00', 540, 'fin …` | `supabase/seed.sql` |
| `('a1111111-1111-1111-1111-000000000006'::uuid, 'PED-2026-0751', 'Natura', 'Frasco 50ml Cosmético', 400, 'tampografia', v_tam1, v_today, '07:00', '11:30', 270, ' …` | `supabase/seed.sql` |
| `('a1111111-1111-1111-1111-000000000006'::uuid, 'queue', 'production',NULL, now() - interval '5 hours')` | `supabase/seed.sql` |
| `('a1111111-1111-1111-1111-000000000007'::uuid, 'PED-2026-0752', 'Vivo', 'Caneca Cerâmica 350ml', 600, 'sublimacao', v_sub1, v_today, '09:00', '14:00', 300, 'pro …` | `supabase/seed.sql` |
| `('a1111111-1111-1111-1111-000000000008'::uuid, 'PED-2026-0753', 'Magazine Luiza', 'Sacola Ecológica', 350, 'uv', v_uv1, v_today, '10:00', '13:00', 180, 'product …` | `supabase/seed.sql` |
| `('b0000001-0000-0000-0000-000000000001'::uuid, NULL, 'IN', 10.0, 'Compra mensal', NULL, now() - interval '20 days'),` | `supabase/seed.sql` |
| `('b0000001-0000-0000-0000-000000000002'::uuid, NULL, 'IN', 15.0, 'Reposição estoque', NULL, now() - interval '18 days'),` | `supabase/seed.sql` |
| `('b0000001-0000-0000-0000-000000000003'::uuid, NULL, 'OUT', 2.5, 'Pedido PED-2026-0742', 'a1111111-1111-1111-1111-000000000002'::uuid, now() - interval '22 days …` | `supabase/seed.sql` |
| `('b0000001-0000-0000-0000-000000000004'::uuid, NULL, 'OUT', 0.5, 'Pedido PED-2026-0751', 'a1111111-1111-1111-1111-000000000006'::uuid, now() - interval '5 hours …` | `supabase/seed.sql` |
| `('b0000001-0000-0000-0000-000000000005'::uuid, NULL, 'OUT', 20.0, 'Pedido PED-2026-0741', 'a1111111-1111-1111-1111-000000000001'::uuid, now() - interval '25 day …` | `supabase/seed.sql` |
| `const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()` | `supabase/functions/auto-promote-jobs/index.ts` |
| `.lt('created_at', new Date(Date.now() - 15 * 60 * 1000).toISOString());` | `supabase/functions/bitrix24-sync/index.ts` |
| `const TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000;` | `supabase/functions/bitrix24-sync/index.ts` |
| `if (isNaN(tsNum) \|\| Date.now() - tsNum > 15 * 60 * 1000) return false;` | `supabase/functions/bitrix24-sync/index.ts` |
| `const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);` | `supabase/functions/cleanup-security-logs/index.ts` |
| `const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);` | `supabase/functions/cleanup-security-logs/index.ts` |
| `const dedupeSince = new Date(Date.now() - DEDUPE_HOURS * 60 * 60 * 1000).toISOString();` | `supabase/functions/cron-alert-email/index.ts` |
| `const since = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();` | `supabase/functions/cron-alert-email/index.ts` |
| `const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString();` | `supabase/functions/cron-cleanup/index.ts` |
| `? Math.max(...overdueSchedules.map((s: any) => Math.floor((Date.now() - new Date(s.next_due_at).getTime()) / (1000 * 60 * 60 * 24))))` | `supabase/functions/ml-predictions/index.ts` |
| `? new Date(Date.now() + prediction.predicted_days_to_failure * 24 * 60 * 60 * 1000).toISOString().split('T')[0]` | `supabase/functions/ml-predictions/index.ts` |
| `exp: now + 12 * 60 * 60, // 12 hours` | `supabase/functions/send-push-notification/index.ts` |
| `expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days')` | `supabase/migrations/20251214173607_56d7abd2-222a-4c11-9fe0-b42c21db4c23.sql` |
| `expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '24 hours'),` | `supabase/migrations/20251231115823_134f6d49-9ed4-4404-947d-31003dae8914.sql` |
| `window_end TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '1 minute'),` | `supabase/migrations/20251231115823_134f6d49-9ed4-4404-947d-31003dae8914.sql` |
| `expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '5 minutes'),` | `supabase/migrations/20251231124514_6ce7bbb6-1f8a-4853-ba6a-e980b3841640.sql` |
| `(started_at < now() - interval '2 hours' AND completed_at IS NULL)` | `supabase/migrations/20260802113515_15352d5c-bbea-4170-9300-d918db96318b.sql` |
| `(updated_at < now() - interval '30 minutes')` | `supabase/migrations/20260802113515_15352d5c-bbea-4170-9300-d918db96318b.sql` |
| `AND updated_at < now() - interval '30 minutes';` | `supabase/migrations/20261108000001_business_rules_ddl.sql` |

### H.3 Limites de paginação

| Limite | Arquivo |
|---|---|
| 100 | `src/components/chat/QuickChat.tsx` |
| 3 | `src/components/digital-twin/SupplyChainPanel.tsx` |
| 2 | `src/components/qrcode/QRScanner.tsx` |
| 100 | `src/components/settings/LoginAuditLog.tsx` |
| 50 | `src/components/settings/PasswordResetRequests.tsx` |
| 1 | `src/components/shift/OccurrencesPanel.tsx` |
| 20 | `src/features/admin/components/security/SecurityAlertsPanel.tsx` |
| 2000 | `src/features/admin/hooks/useCronHealthHistory.ts` |
| 5000 | `src/features/admin/hooks/useCronP95Daily.ts` |
| 10 | `src/features/admin/hooks/useDetailedAuditTrail.ts` |
| 20 | `src/features/admin/hooks/useDetailedAuditTrail.ts` |
| 1 | `src/features/admin/hooks/useGeoBlocking.ts` |
| 1000 | `src/features/admin/hooks/useMonitoringData.ts` |
| 200 | `src/features/admin/hooks/useMonitoringData.ts` |
| 50 | `src/features/admin/services/integrationsService.ts` |
| 50 | `src/features/analytics/hooks/useEnergy.ts` |
| 200 | `src/features/analytics/hooks/useMLPredictions.ts` |
| 1 | `src/features/analytics/hooks/useSPC.ts` |
| 100 | `src/features/analytics/hooks/useSPC.ts` |
| 25 | `src/features/analytics/hooks/useSPC.ts` |
| 1 | `src/features/auth/components/AuthProvider.tsx` |
| 10 | `src/features/inventory/hooks/useTraceability.ts` |
| 1 | `src/features/jobs/hooks/useJobInventoryCheck.ts` |
| 100 | `src/features/maintenance/components/TPMNotificationLogs.tsx` |
| 50 | `src/features/maintenance/components/TPMNotificationQueue.tsx` |
| 200 | `src/features/maintenance/hooks/useTPMData.ts` |
| 1 | `src/features/notifications/hooks/usePushNotifications.ts` |
| 200 | `src/features/packaging/hooks/usePackagingAuditTimeline.ts` |
| 1 | `src/features/packaging/hooks/usePackagingSettings.ts` |
| 1 | `src/features/production/services/machinesService.ts` |
| 50 | `src/hooks/useGamification.ts` |
| 100 | `src/hooks/useOfflineSync.ts` |
| 200 | `src/hooks/abc/useABCData.ts` |
| 200 | `src/pages/AdminTelemetriaPage.tsx` |
| 500 | `src/pages/AdminTelemetriaPage.tsx` |
| 100 | `src/pages/NotificationsPage.tsx` |
| 30 | `src/pages/NotificationsPage.tsx` |
| 10 | `src/pages/ReportBuilderPage.tsx` |
| 20 | `supabase/functions/auto-promote-jobs/index.ts` |
| 1 | `supabase/functions/bitrix24-sync/index.ts` |
| 1 | `supabase/functions/calculate-inventory-intelligence/index.ts` |
| 1 | `supabase/functions/calculate-rankings/index.ts` |
| 1000 | `supabase/functions/cron-alert-email/index.ts` |
| 200 | `supabase/functions/cron-alert-email/index.ts` |
| 1000 | `supabase/functions/erp-api/index.ts` |
| 200 | `supabase/functions/ml-predictions/index.ts` |
| 500 | `supabase/functions/ml-predictions/index.ts` |
| 1 | `supabase/functions/rate-limit-check/index.ts` |
| 1 | `supabase/functions/send-push-notification/index.ts` |
| 1 | `supabase/functions/tpm-notifications/index.ts` |
| 10 | `supabase/functions/tpm-notifications/index.ts` |

## I. Regras implícitas em mensagens de erro/validação

| Mensagem | Arquivo |
|---|---|
| ,     renotify: true,     requireInteraction: true,     data: data.data,     actions: [       {         action:  | `public/sw.js` |
| ❌ ${label} está sem  | `scripts/bundle-diff.mjs` |
| ❌ ${label} não é um object JSON válido (esperado bundle-report.json). | `scripts/bundle-diff.mjs` |
| ❌ ${label} tem entrada inválida em files[${i}] (faltam  | `scripts/bundle-diff.mjs` |
| ❌ ${label} tem gzipKb inválido em files[${i}] ( | `scripts/bundle-diff.mjs` |
| ❌ ${label} tem totals.${k} inválido (arquivo corrompido ou relatório antigo). | `scripts/bundle-diff.mjs` |
| ❌ Relatório ${label} não encontrado: ${path} | `scripts/bundle-diff.mjs` |
| ❌ Relatório ${label} não é JSON válido (${path}): ${err.message} | `scripts/bundle-diff.mjs` |
| bundle-budget.json precisa ser um objeto JSON. | `scripts/bundle-report.mjs` |
| bundle-budget.json:  | `scripts/bundle-report.mjs` |
| bundle-budget.json: ${key}[ | `scripts/bundle-report.mjs` |
| não foi possível carregar o pacote  | `scripts/check-any-baseline.mjs` |
| GRAPHIFY_PYTHON (${explicitly}) não tem graphify ${config.version} instalado  | `scripts/graphify.mjs` |
| GRAPHIFY_PYTHON não pôde ser executado (${explicitly}): ${probe.error.message} | `scripts/graphify.mjs` |
| ${msg}: esperado ${JSON.stringify(b)} obtido ${JSON.stringify(a)} | `scripts/ai-context/cenarios.mjs` |
| /><Tabs role={ | `scripts/ai-context/gerar.unit.mjs` |
| Aresta sem endpoint no grafo exportado. | `scripts/graphify/corpus.py` |
| Artefato inconsistente: graph.json. Execute graph:build. | `scripts/graphify/corpus.py` |
| Direção das relações perdida. | `scripts/graphify/corpus.py` |
| Grafo desatualizado. Execute npm run graph:build para este perfil. | `scripts/graphify/corpus.py` |
| Grafo vazio; saída anterior preservada. | `scripts/graphify/corpus.py` |
| IDs de nós duplicados. | `scripts/graphify/corpus.py` |
| manifest.json fora do formato esperado. Execute npm run graph:build. | `scripts/graphify/corpus.py` |
| Arquivos mudaram durante a extração. Execute novamente. | `scripts/graphify/pipeline.py` |
| Exportação recusada. | `scripts/graphify/pipeline.py` |
| Extração vazia; saída anterior preservada. | `scripts/graphify/pipeline.py` |
| Nenhum arquivo elegível; saída anterior preservada. | `scripts/graphify/pipeline.py` |
| Exceção de ratchet exige metric, reason, responsible e expires_on. | `scripts/graphify/quality.py` |
| Modo de ratchet deve ser report ou enforce. | `scripts/graphify/quality.py` |
| Budget deve estar entre 100 e 10000 tokens estimados. | `scripts/graphify/run.py` |
| Parser SQL ausente. Execute npm run graph:install. | `scripts/graphify/run.py` |
| Ratchet encontrou regressão sem exceção válida. | `scripts/graphify/run.py` |
| diff exige --baseline CAMINHO_PARA_graph.json. | `scripts/graphify/run.py` |
| ratchet só existe para o perfil all (a baseline é do snapshot completo). | `scripts/graphify/run.py` |
| Falha ao autenticar com {secret} | `scripts/regras_negocio/test_generate.py` |
| O teste offline não permite consultas ao banco | `scripts/supabase_snapshot/test_snapshot.py` |
| banco indisponível na fixture | `scripts/supabase_snapshot/test_snapshot.py` |
| catálogo indisponível na fixture | `scripts/supabase_snapshot/test_snapshot.py` |
| permission denied for schema auth | `scripts/supabase_snapshot/test_snapshot.py` |
| relation  | `scripts/supabase_snapshot/test_snapshot.py` |
| statement timeout simulado | `scripts/supabase_snapshot/test_snapshot.py` |
| view removida depois da consulta ao catálogo | `scripts/supabase_snapshot/test_snapshot.py` |
| view sem permissão na fixture | `scripts/supabase_snapshot/test_snapshot.py` |
|  aria-live= | `src/components/accessibility/AccessibilityProvider.tsx` |
| Créditos esgotados. Contate o administrador. | `src/components/assistant/TechnicalAssistant.tsx` |
| Falha ao conectar com o assistente | `src/components/assistant/TechnicalAssistant.tsx` |
| Limite de requisições excedido. Aguarde um momento. | `src/components/assistant/TechnicalAssistant.tsx` |
| Digite o código de 6 dígitos | `src/components/auth/MFALoginVerification.tsx` |
| Acesso restrito | `src/components/auth/ProtectedRoute.tsx` |
| Configuração de MFA obrigatória | `src/components/auth/ProtectedRoute.tsx` |
| Conflito de agendamento: máquina já possui job neste horário. | `src/components/calendar/QuickJobDrawer.tsx` |
| Erro ao agendar job | `src/components/calendar/QuickJobDrawer.tsx` |
| Não foi possível enviar a mensagem | `src/components/chat/QuickChat.tsx` |
| Erro ao agendar job | `src/components/dashboard/AlertScheduleModal.tsx` |
| Selecione uma data | `src/components/dashboard/AlertScheduleModal.tsx` |
| Dashboard element not found | `src/components/dashboard/DashboardExport.tsx` |
| Erro ao exportar dashboard | `src/components/dashboard/DashboardExport.tsx` |
| Erro ao resolver | `src/components/dashboard/EfficiencyAlertHistoryWidget.tsx` |
| ; import { AlertCircle, Wrench, Users } from  | `src/components/design-system/hooks/MaintenanceOperatorDemos.tsx` |
| ; import { AlertCircle, Brain, Loader2, RefreshCw, Play, CheckCircle } from  | `src/components/design-system/hooks/PredictionHooksDemos.tsx` |
| ; import { Skeleton } from  | `src/components/design-system/sections/FeedbackSection.tsx` |
| Atenção! | `src/components/design-system/sections/FeedbackSection.tsx` |
| useFeedback must be used within a FeedbackProvider | `src/components/feedback/FeedbackProvider.tsx` |
| ; import { sanitizeUrl } from  | `src/components/integrations/Bitrix24SyncPanel.tsx` |
| Localização inválida. Use o formato Corredor (A-D) + Nível (1-4). Ex: A2 | `src/components/inventory/WarehouseMap.tsx` |
| Não existem itens nesta posição para transferir | `src/components/inventory/WarehouseMap.tsx` |
| O destino não pode ser igual à origem | `src/components/inventory/WarehouseMap.tsx` |
| Preencha a técnica e o título | `src/components/knowledge/TechnicalSheetEditor.tsx` |
| Erro ao gerar PDF | `src/components/knowledge/TechnicalSheetViewer.tsx` |
| , icon: AlertTriangle, label:  | `src/components/navigation/MobileQuickActions.tsx` |
| Você está offline | `src/components/offline/NetworkStatusToaster.tsx` |
| Erro ao salvar checklist | `src/components/operator/PreProductionChecklist.tsx` |
| Arquivo inválido: ${file.name}. ${validation.error} | `src/components/operator/ProductionRegistrationModal.tsx` |
| Erro ao enviar foto: ${file.name} | `src/components/operator/ProductionRegistrationModal.tsx` |
| Erro ao enviar fotos | `src/components/operator/ProductionRegistrationModal.tsx` |
| Job não pode ser finalizado no estado atual:  | `src/components/operator/ProductionRegistrationModal.tsx` |
| Observações excedem o limite de 2000 caracteres | `src/components/operator/ProductionRegistrationModal.tsx` |
| Quantidade produzida muito alta (máximo ${(job.quantity * 3).toLocaleString()}) | `src/components/operator/ProductionRegistrationModal.tsx` |
| Quantidades não podem ser negativas | `src/components/operator/ProductionRegistrationModal.tsx` |
| Erro ao reequilibrar carga | `src/components/planning/LoadBalancingPanel.tsx` |
| Erro ao atualizar status | `src/components/qrcode/QRScanner.tsx` |
| Erro ao processar QR Code | `src/components/qrcode/QRScanner.tsx` |
| Job não encontrado | `src/components/qrcode/QRScanner.tsx` |
| Não foi possível acessar a câmera | `src/components/qrcode/QRScanner.tsx` |
| Pedido ${orderNumber} tem ${matches.length}+ jobs — sem desambiguação offline; selecione o job manualmente | `src/components/qrcode/QRScanner.tsx` |
| Pedido ${orderNumber} tem ${res.length}+ jobs — escaneie a etiqueta da máquina (com j=) ou selecione o job manualmente | `src/components/qrcode/QRScanner.tsx` |
| QR Code inválido | `src/components/qrcode/QRScanner.tsx` |
| Erro ao atualizar status | `src/components/settings/IPAllowlist.tsx` |
| Erro ao remover IP | `src/components/settings/IPAllowlist.tsx` |
| Formato de IP inválido. Use: xxx.xxx.xxx.xxx ou xxx.xxx.xxx.xxx/xx | `src/components/settings/IPAllowlist.tsx` |
| ; import { toast } from  | `src/components/settings/TwoFactorSetup.tsx` |
| Digite um código de 6 dígitos | `src/components/settings/TwoFactorSetup.tsx` |
| Digite um código válido | `src/components/settings/TwoFactorSetup.tsx` |
| Erro ao atualizar usuário | `src/components/settings/UserManagement.tsx` |
| Erro ao remover usuário | `src/components/settings/UserManagement.tsx` |
| Por favor, insira um email | `src/components/settings/UserManagement.tsx` |
| Erro ao gerar relatório PDF | `src/components/shift/AutoShiftSummary.tsx` |
| Adicione pelo menos um item ao checklist | `src/components/shift/ChecklistTemplatesManager.tsx` |
| Nome do template é obrigatório | `src/components/shift/ChecklistTemplatesManager.tsx` |
| useKeyboardShortcuts must be used within KeyboardShortcutsProvider | `src/components/shortcuts/KeyboardShortcuts.tsx` |
| O motivo da alteração é obrigatório para auditoria | `src/components/traceability/ElectronicSignatureDialog.tsx` |
| Senha de assinatura é obrigatória | `src/components/traceability/ElectronicSignatureDialog.tsx` |
| Arquivo inválido: ${file.name}. ${validation.error} | `src/components/traceability/LotInspectionsTab.tsx` |
| Erro ao enviar foto: ${file.name} | `src/components/traceability/LotInspectionsTab.tsx` |
| Erro ao enviar fotos | `src/components/traceability/LotInspectionsTab.tsx` |
| Pop-up bloqueado. Permita pop-ups para imprimir. | `src/components/traceability/LotLabelPrint.tsx` |
|  className={cn(alertVariants({ variant }), className)} {...props} /> )); Alert.displayName =  | `src/components/ui/alert.tsx` |
| useCarousel must be used within a <Carousel /> | `src/components/ui/carousel.tsx` |
| useCelebration must be used within a CelebrationProvider | `src/components/ui/celebration.tsx` |
| useChart must be used within a <ChartContainer /> | `src/components/ui/chart.tsx` |
| useFormField should be used within <FormField> | `src/components/ui/form.tsx` |
| useSidebar must be used within a SidebarProvider. | `src/components/ui/sidebar.tsx` |
| Erro no reconhecimento de voz | `src/components/voice/VoiceCommands.tsx` |
| useBreadcrumbContext must be used within BreadcrumbProvider | `src/contexts/BreadcrumbContext.tsx` |
| useConfirmation must be used within ConfirmationProvider | `src/contexts/ConfirmationContext.tsx` |
| useFeatureFlags must be used within FeatureFlagsProvider | `src/contexts/FeatureFlagsContext.tsx` |
| useNotificationsContext must be used within NotificationsProvider | `src/contexts/NotificationsContext.tsx` |
| useOfflineSyncContext must be used within OfflineSyncProvider | `src/contexts/OfflineSyncContext.tsx` |
| usePermissionsContext must be used within PermissionsProvider | `src/contexts/PermissionsContext.tsx` |
| Digite sua senha | `src/contexts/ReauthContext.tsx` |
| Senha incorreta | `src/contexts/ReauthContext.tsx` |
| Usuário não encontrado | `src/contexts/ReauthContext.tsx` |
| useReauth must be used within ReauthProvider | `src/contexts/ReauthContext.tsx` |
| useSearchContext must be used within SearchProvider | `src/contexts/SearchContext.tsx` |
| useSidebarContext must be used within SidebarProvider | `src/contexts/SidebarContext.tsx` |
| useThemeContext must be used within ThemeContextProvider | `src/contexts/ThemeContext.tsx` |
| useUserPreferences must be used within UserPreferencesProvider | `src/contexts/UserPreferencesContext.tsx` |
| useWebSocketContext must be used within WebSocketProvider | `src/contexts/WebSocketContext.tsx` |
| ; import { Skeleton } from  | `src/features/admin/components/monitoring/CronHealthCard.tsx` |
| ; import {   Globe,   Plus,   Trash2,   ShieldCheck,   AlertTriangle,   History,   MapPin } from  | `src/features/admin/components/security/GeoBlockingSettings.tsx` |
| O código deve ter 6 dígitos | `src/features/admin/components/security/MFAEnroll.tsx` |
| Falha ao gerar exportação. | `src/features/admin/hooks/useBIExport.ts` |
| Nenhum dado encontrado para exportar. | `src/features/admin/hooks/useBIExport.ts` |
| Erro ao limpar tokens | `src/features/admin/hooks/useBitrix24Sync.ts` |
| Erro ao verificar OAuth | `src/features/admin/hooks/useBitrix24Sync.ts` |
| Erro de conexão | `src/features/admin/hooks/useBitrix24Sync.ts` |
| Erro na sincronização | `src/features/admin/hooks/useBitrix24Sync.ts` |
| Token expirado | `src/features/admin/hooks/useBitrix24Sync.ts` |
| Sessão expirada. Faça login novamente. | `src/features/admin/hooks/useBusinessConfig.ts` |
| Not authenticated | `src/features/admin/hooks/useDashboardPresets.ts` |
| Erro na exportação de auditoria | `src/features/admin/hooks/useDataExport.ts` |
| Exportação limitada a ${MAX_EXPORT_ROWS.toLocaleString( | `src/features/admin/hooks/useDataExport.ts` |
| Exportação limitada a 10.000 registros. Pode haver dados adicionais não exportados. | `src/features/admin/hooks/useDataExport.ts` |
| ${result.imported} importados, ${result.failed} falharam | `src/features/admin/hooks/useDataImport.ts` |
| Nenhum arquivo carregado | `src/features/admin/hooks/useDataImport.ts` |
| Nenhum arquivo selecionado | `src/features/admin/hooks/useDataImport.ts` |
| Nenhuma coluna mapeada | `src/features/admin/hooks/useDataImport.ts` |
| País já está na lista | `src/features/admin/hooks/useGeoBlocking.ts` |
| Alerta de Segurança: ${event.event_type} | `src/features/admin/hooks/useSecurityEvents.ts` |
| Aviso de Segurança: ${event.event_type} | `src/features/admin/hooks/useSecurityEvents.ts` |
| IP Bloqueado: ${block.ip_address} | `src/features/admin/hooks/useSecurityEvents.ts` |
| ; import { AlertTriangle, ShieldCheck, ArrowDownRight, Wrench } from  | `src/features/analytics/components/oee/PredictiveAlerts.tsx` |
| Créditos insuficientes. Adicione créditos ao workspace. | `src/features/analytics/hooks/useMLPredictions.ts` |
| Erro ao gerar previsões. Tente novamente. | `src/features/analytics/hooks/useMLPredictions.ts` |
| Limite de requisições excedido. Tente novamente em alguns minutos. | `src/features/analytics/hooks/useMLPredictions.ts` |
| Conexão instável | `src/features/analytics/hooks/useRealtimeConnection.ts` |
| Mínimo de 10 medições necessárias | `src/features/analytics/hooks/useSPC.ts` |
| Nenhum valor finito fornecido para medição | `src/features/analytics/hooks/useSPC.ts` |
| Atenção: ${result.attempts_remaining} tentativa(s) restante(s) | `src/features/auth/components/AuthProvider.tsx` |
| useAuth must be used within an AuthProvider | `src/features/auth/hooks/useAuth.ts` |
| Código inválido | `src/features/auth/hooks/useMFA.ts` |
| Erro ao desativar MFA | `src/features/auth/hooks/useMFA.ts` |
| Erro ao iniciar cadastro MFA | `src/features/auth/hooks/useMFA.ts` |
| Saldo insuficiente para realizar a saída | `src/features/inventory/components/inventory-page/InventoryCard.tsx` |
| Estoque insuficiente de ${item.name} para realizar esta saída. | `src/features/inventory/hooks/useInventory.ts` |
| Sessão expirada. Faça login novamente. | `src/features/inventory/hooks/useInventory.ts` |
| Envio atualizado, mas falha ao sincronizar o job ${shipment.job_id}: ${jobError.message} | `src/features/inventory/hooks/useLogistics.ts` |
| Falha ao acionar promoção automática | `src/features/jobs/hooks/useAutoBufferPromotion.ts` |
| Erro ao mover agendamento | `src/features/jobs/hooks/useDailyDragDrop.ts` |
| Erro ao duplicar job | `src/features/jobs/hooks/useDuplicateJob.ts` |
| Erro ao atualizar status | `src/features/jobs/hooks/useKanbanDragDrop.ts` |
| Erro ao reordenar | `src/features/jobs/hooks/useKanbanDragDrop.ts` |
| Transição não permitida | `src/features/jobs/hooks/useKanbanDragDrop.ts` |
| Falha ao otimizar todas as ${failedCount} máquina(s) | `src/features/jobs/hooks/useSmartSequencingWithActions.ts` |
| Atenção: Nenhum slot livre encontrado. Conflito detectado. | `src/features/jobs/hooks/useWeeklyDragDrop.ts` |
| Conflito de agendamento: máquina já possui job neste horário. | `src/features/jobs/hooks/useWeeklyDragDrop.ts` |
| Erro ao mover agendamento | `src/features/jobs/hooks/useWeeklyDragDrop.ts` |
| Transição inválida:  | `src/features/jobs/services/jobStateMachine.ts` |
| Erro ao alterar status | `src/features/maintenance/components/ChecklistManager.tsx` |
| Erro ao salvar checklist | `src/features/maintenance/components/ChecklistManager.tsx` |
| Selecione o tipo de manutenção | `src/features/maintenance/components/ChecklistManager.tsx` |
| checklistId ausente ao inserir itens | `src/features/maintenance/components/ChecklistManager.tsx` |
| Erro ao carregar detalhes da execução | `src/features/maintenance/components/ExecutionDetailsModal.tsx` |
| Erro ao gerar PDF profissional. Usando impressão padrão... | `src/features/maintenance/components/ExecutionDetailsModal.tsx` |
| Erro ao gerar ZIP | `src/features/maintenance/components/ExecutionDetailsModal.tsx` |
| Não é possível aprovar | `src/features/maintenance/components/ExecutionDetailsModal.tsx` |
| Por favor, informe o motivo da correção. | `src/features/maintenance/components/ExecutionDetailsModal.tsx` |
| Atenção: Existem riscos críticos (parâmetros fora do range) que exigem o anexo de evidências (fotos) antes de prosseguir. | `src/features/maintenance/components/MaintenanceExecutionModal.tsx` |
| Erro ao enviar evidência | `src/features/maintenance/components/MaintenanceExecutionModal.tsx` |
| Erro ao enviar foto | `src/features/maintenance/components/MaintenanceExecutionModal.tsx` |
| Existem itens críticos não marcados: ${missingCritical.map(i => i.description).join( | `src/features/maintenance/components/MaintenanceExecutionModal.tsx` |
| Existem requisitos de qualidade obrigatórios não atendidos ou reprovados. | `src/features/maintenance/components/MaintenanceExecutionModal.tsx` |
| Riscos críticos detectados. Por favor, preencha as Observações/Justificativa final antes de concluir. | `src/features/maintenance/components/MaintenanceExecutionModal.tsx` |
| Seleção de Ficha Técnica (Produto/Técnica) é obrigatória para esta execução. | `src/features/maintenance/components/MaintenanceExecutionModal.tsx` |
| Selecione uma máquina para o teste | `src/features/maintenance/components/TPMNotificationSettings.tsx` |
| Erro ao resolver alerta | `src/features/maintenance/components/TPMParameterAlerts.tsx` |
| Erro ao gerar Excel | `src/features/maintenance/components/TPMReports.tsx` |
| Erro ao gerar PDF | `src/features/maintenance/components/TPMReports.tsx` |
| Erro ao gerar arquivo ZIP | `src/features/maintenance/components/TPMReports.tsx` |
| ${failed.length} manutenções não puderam ser aprovadas | `src/features/maintenance/hooks/useTPMApprovalMutations.ts` |
| Assinatura obrigatória ausente | `src/features/maintenance/hooks/useTPMApprovalMutations.ts` |
| Pelo menos uma foto de evidência é obrigatória para itens que exigem foto. | `src/features/maintenance/hooks/useTPMApprovalMutations.ts` |
| Registro já foi processado por outra aprovação/correção | `src/features/maintenance/hooks/useTPMApprovalMutations.ts` |
| Registro não encontrado | `src/features/maintenance/hooks/useTPMApprovalMutations.ts` |
| Agendamento não encontrado | `src/features/maintenance/hooks/useTPMLifecycleMutations.ts` |
| Custo de manutenção elevado detectado. Verifique se o valor está em centavos ou reais. | `src/features/maintenance/hooks/useTPMLifecycleMutations.ts` |
| Existem ${criticalAlerts.length} parâmetros fora do range crítico sem evidências fotográficas anexadas. | `src/features/maintenance/hooks/useTPMLifecycleMutations.ts` |
| Parâmetros de ajuste inválidos: formato incorreto. | `src/features/maintenance/hooks/useTPMLifecycleMutations.ts` |
| Registro de manutenção não encontrado no sistema. | `src/features/maintenance/hooks/useTPMLifecycleMutations.ts` |
| Reprovação em ${failures.length} itens de qualidade exige justificativa técnica detalhada. | `src/features/maintenance/hooks/useTPMLifecycleMutations.ts` |
| Snapshot do checklist inválido: estrutura de dados corrompida ou incompleta. | `src/features/maintenance/hooks/useTPMLifecycleMutations.ts` |
| Tempo de parada muito alto (>8h) detectado. Certifique-se de que o valor está correto. | `src/features/maintenance/hooks/useTPMLifecycleMutations.ts` |
| );     } else if (summary.alerts.total_attention_items > 0 && isEnabled()) {       playSound( | `src/features/notifications/hooks/useDailySummaryNotifications.ts` |
| ${criticalCount} gargalo(s) crítico(s) detectado(s) | `src/features/notifications/hooks/useEfficiencyNotifications.ts` |
| ${newAlerts} novo(s) alerta(s) de gargalo | `src/features/notifications/hooks/useEfficiencyNotifications.ts` |
| ${warningCount} alerta(s) de capacidade | `src/features/notifications/hooks/useEfficiencyNotifications.ts` |
| ${criticalCount} meta(s) em risco crítico! | `src/features/notifications/hooks/useGoalAlerts.ts` |
| ${warningCount} meta(s) em alerta | `src/features/notifications/hooks/useGoalAlerts.ts` |
| Meta em alerta | `src/features/notifications/hooks/useGoalAlerts.ts` |
| Meta em risco crítico! | `src/features/notifications/hooks/useGoalAlerts.ts` |
| Erro ao atualizar configurações | `src/features/notifications/hooks/useNotificationSettings.ts` |
| User not authenticated | `src/features/notifications/hooks/useNotificationSettings.ts` |
| ), [playSound]);    const setEnabled = useCallback((enabled: boolean) => {     isEnabledRef.current = enabled;     localStorage.setItem( | `src/features/notifications/hooks/useNotificationSounds.ts` |
| Erro ao excluir notificação | `src/features/notifications/hooks/useNotifications.ts` |
| Erro ao marcar notificação como lida | `src/features/notifications/hooks/useNotifications.ts` |
| Erro ao marcar notificações como lidas | `src/features/notifications/hooks/useNotifications.ts` |
| Not authenticated | `src/features/notifications/hooks/useNotifications.ts` |
| Sem permissão ou registro inexistente | `src/features/notifications/hooks/useNotifications.ts` |
| Notificações bloqueadas | `src/features/notifications/hooks/usePushNotifications.ts` |
| Notificações não suportadas | `src/features/notifications/hooks/usePushNotifications.ts` |
| Erro ao ativar push notifications | `src/features/notifications/hooks/usePushSubscription.ts` |
| Erro ao desativar push notifications | `src/features/notifications/hooks/usePushSubscription.ts` |
| Erro ao enviar notificação | `src/features/notifications/hooks/usePushSubscription.ts` |
| Erro ao enviar notificação de teste | `src/features/notifications/hooks/usePushSubscription.ts` |
| Erro ao salvar subscription | `src/features/notifications/hooks/usePushSubscription.ts` |
| Invalid subscription data | `src/features/notifications/hooks/usePushSubscription.ts` |
| Permissão para notificações negada | `src/features/notifications/hooks/usePushSubscription.ts` |
| Push notifications não são suportadas neste navegador | `src/features/notifications/hooks/usePushSubscription.ts` |
| VAPID keys não configuradas. Notificações em modo simulado. | `src/features/notifications/hooks/usePushSubscription.ts` |
| Você precisa estar logado para receber notificações | `src/features/notifications/hooks/usePushSubscription.ts` |
| Erro ao processar notificação de teste | `src/features/notifications/hooks/useTPMNotifications.ts` |
| Máquina não encontrada | `src/features/notifications/hooks/useTPMNotifications.ts` |
| Nenhum destinatário configurado para este canal e máquina. | `src/features/notifications/hooks/useTPMNotifications.ts` |
| Erro ao ativar notificações push | `src/features/notifications/hooks/useWebPushNotifications.ts` |
| Erro ao desativar notificações | `src/features/notifications/hooks/useWebPushNotifications.ts` |
| Erro ao enviar notificação de teste | `src/features/notifications/hooks/useWebPushNotifications.ts` |
| Permissão para notificações negada | `src/features/notifications/hooks/useWebPushNotifications.ts` |
| Push notifications não são suportadas neste navegador | `src/features/notifications/hooks/useWebPushNotifications.ts` |
| Subscription keys not available | `src/features/notifications/hooks/useWebPushNotifications.ts` |
| Falha ao reatribuir tarefas. | `src/features/packaging/components/BulkReassignDialog.tsx` |
| Informe uma técnica, cliente ou ambos. | `src/features/packaging/components/PackagingSlaOverridesManager.tsx` |
| Os prazos devem ser maiores que zero. | `src/features/packaging/components/PackagingSlaOverridesManager.tsx` |
| Tarefa inválida | `src/features/packaging/hooks/usePackagingChecklist.ts` |
| Não autenticado | `src/features/packaging/services/packagingService.ts` |
|  }         });          // Persist in DB         await supabase.rpc( | `src/features/production/hooks/useOEEAlerts.ts` |
| ⚠️ QUEDA DE PERFORMANCE: ${machine.machineName} | `src/features/production/hooks/useOEEAlerts.ts` |
| Usuário não autenticado | `src/features/production/hooks/useOperatorMachines.ts` |
| Erro ao alterar status do operador | `src/features/production/hooks/useOperators.ts` |
| Erro ao remover operador | `src/features/production/hooks/useOperators.ts` |
| User not authenticated | `src/features/production/hooks/useOperators.ts` |
| Erro ao registrar perda. Tente novamente. | `src/features/production/hooks/useProductionLosses.ts` |
| ${completed} atualizados, ${failed} falharam | `src/hooks/useBulkActions.ts` |
| ${completed} excluídos, ${failed} falharam | `src/hooks/useBulkActions.ts` |
| Nenhum item selecionado | `src/hooks/useBulkActions.ts` |
| Erro ao salvar layout na nuvem. Mantido localmente. | `src/hooks/useDashboardLayout.ts` |
| Erro ao aprovar documento | `src/hooks/useDocuments.ts` |
| Erro ao criar versão | `src/hooks/useDocuments.ts` |
| Erro ao enviar documento | `src/hooks/useDocuments.ts` |
| Erro ao rejeitar documento | `src/hooks/useDocuments.ts` |
| Erro ao remover documento | `src/hooks/useDocuments.ts` |
| Erro ao calcular rankings | `src/hooks/useGamification.ts` |
| Erro ao solicitar resgate. Tente novamente. | `src/hooks/useGamification.ts` |
| Este prêmio está esgotado. | `src/hooks/useGamification.ts` |
| Saldo insuficiente. Você tem ${currentBalance} pontos, mas este resgate custa ${reward.cost_points}. | `src/hooks/useGamification.ts` |
| Usuário não autenticado. | `src/hooks/useGamification.ts` |
| useNetworkStatus must be used within NetworkStatusProvider | `src/hooks/useNetworkStatus.tsx` |
| ${newlyFailed.length} ação(ões) não puderam ser sincronizadas | `src/hooks/useOfflineSync.ts` |
| Sem conexão | `src/hooks/useOfflineSync.ts` |
| Erro ao salvar favoritos | `src/hooks/useQuickFavorites.ts` |
| Erro na migração | `src/hooks/useQuickFavorites.ts` |
| User not authenticated | `src/hooks/useQuickFavorites.ts` |
| Conversa não encontrada | `src/hooks/useTechnicalConversations.ts` |
| No conversation selected | `src/hooks/useTechnicalConversations.ts` |
| User not authenticated | `src/hooks/useTechnicalConversations.ts` |
| Erro ao atualizar dispositivo | `src/hooks/useUserDevices.ts` |
| Erro ao marcar dispositivo como confiável | `src/hooks/useUserDevices.ts` |
| Erro ao remover dispositivo | `src/hooks/useUserDevices.ts` |
| Job não encontrado | `src/hooks/abc/useABCMutations.ts` |
| Passagem não está aguardando aceite (status atual: ${handover.status}). | `src/hooks/shift-handover/useShiftHandoverMutations.ts` |
| Usuário não autenticado | `src/hooks/shift-handover/useShiftHandoverMutations.ts` |
| Você não pode aceitar sua própria passagem de turno. | `src/hooks/shift-handover/useShiftHandoverMutations.ts` |
| Erro ao adicionar dica | `src/hooks/technical-sheets/useTechnicalSheetMutations.ts` |
| Erro ao adicionar etapa | `src/hooks/technical-sheets/useTechnicalSheetMutations.ts` |
| Erro ao adicionar material | `src/hooks/technical-sheets/useTechnicalSheetMutations.ts` |
| Erro ao atualizar | `src/hooks/technical-sheets/useTechnicalSheetMutations.ts` |
| Erro ao atualizar etapa | `src/hooks/technical-sheets/useTechnicalSheetMutations.ts` |
| Erro ao atualizar favorito | `src/hooks/technical-sheets/useTechnicalSheetMutations.ts` |
| Erro ao criar ficha | `src/hooks/technical-sheets/useTechnicalSheetMutations.ts` |
| Erro ao remover | `src/hooks/technical-sheets/useTechnicalSheetMutations.ts` |
| Erro ao remover dica | `src/hooks/technical-sheets/useTechnicalSheetMutations.ts` |
| … +171 linhas — lista completa em `context.json` | |

## J. Controle de acesso no código (checagens de perfil/permissão)

| Valor comparado | Arquivo |
|---|---|
| `assistant` | `src/components/assistant/TechnicalAssistant.tsx` |
| `user` | `src/components/assistant/TechnicalAssistant.tsx` |
| `admin` | `src/components/auth/ProtectedRoute.tsx` |
| `coordinator` | `src/components/auth/ProtectedRoute.tsx` |
| `manager` | `src/components/auth/ProtectedRoute.tsx` |
| `null` | `src/components/auth/ProtectedRoute.tsx` |
| `operator` | `src/components/auth/ProtectedRoute.tsx` |
| `coordinator` | `src/components/documents/DocumentsList.tsx` |
| `admin` | `src/components/layout/AppSidebar.tsx` |
| `coordinator` | `src/components/layout/AppSidebar.tsx` |
| `manager` | `src/components/layout/AppSidebar.tsx` |
| `operator` | `src/components/layout/AppSidebar.tsx` |
| `operator` | `src/components/layout/OperatorMachinesIndicator.tsx` |
| `denied` | `src/components/ml/MLNotificationSettings.tsx` |
| `granted` | `src/components/ml/MLNotificationSettings.tsx` |
| `manager` | `src/components/navigation/MobileQuickActions.tsx` |
| `operator` | `src/components/navigation/MobileQuickActions.tsx` |
| `assistant` | `src/components/technical-assistant/ChatArea.tsx` |
| `user` | `src/components/technical-assistant/ChatArea.tsx` |
| `assistant` | `src/components/technical-assistant/ChatMessage.tsx` |
| `user` | `src/components/technical-assistant/ChatMessage.tsx` |
| `perm` | `src/features/admin/components/security/PermissionManager.tsx` |
| `selectedRole` | `src/features/admin/components/security/PermissionManager.tsx` |
| `denied` | `src/features/admin/components/security/PushNotificationSettings.tsx` |
| `admin` | `src/features/auth/components/AuthProvider.tsx` |
| `coordinator` | `src/features/auth/components/AuthProvider.tsx` |
| `manager` | `src/features/auth/components/AuthProvider.tsx` |
| `operator` | `src/features/auth/components/AuthProvider.tsx` |
| `admin` | `src/features/auth/hooks/useRBAC.tsx` |
| `p` | `src/features/auth/hooks/useRBAC.tsx` |
| `role` | `src/features/auth/hooks/useRBAC.tsx` |
| `target` | `src/features/auth/hooks/useRBAC.tsx` |
| `admin` | `src/features/auth/hooks/useRolePermissions.ts` |
| `permissionStr` | `src/features/auth/hooks/useRolePermissions.ts` |
| `granted` | `src/features/maintenance/components/TPMNotificationSettings.tsx` |
| `granted` | `src/features/notifications/components/DailySummaryCard.tsx` |
| `denied` | `src/features/notifications/components/PushNotificationManager.tsx` |
| `granted` | `src/features/notifications/components/PushNotificationManager.tsx` |
| `denied` | `src/features/notifications/components/PushNotificationPrompt.tsx` |
| `granted` | `src/features/notifications/hooks/useDailySummaryNotifications.ts` |
| `granted` | `src/features/notifications/hooks/useMLPredictionNotifications.ts` |
| `granted` | `src/features/notifications/hooks/usePushNotifications.ts` |
| `granted` | `src/features/notifications/hooks/usePushSubscription.ts` |
| `granted` | `src/features/notifications/hooks/useTPMNotifications.ts` |
| `granted` | `src/features/notifications/hooks/useWebPushNotifications.ts` |
| `granted` | `src/pages/NotificationsPage.tsx` |
| `assistant` | `src/pages/TechnicalAssistantPage.tsx` |
| `coordinator` | `src/pages/TechnicalKnowledgeBase.tsx` |
| `user` | `supabase/functions/technical-assistant/index.ts` |
| `g` | `supabase/migrations/20261019140000_validation_hardening.sql` |

## K. Testes como especificação (1205 testes em 98 arquivos — nomes completos em `context.json`)

| Arquivo | Testes | Exemplos do que o sistema DEVE fazer |
|---|---|---|
| `supabase/functions/external-db-bridge/index.test.ts` | 80 | CS-001: error always returns  · CS-002: error with high duration still returns  · CS-003: 0ms no error = normal · CS-004: 1ms = normal … |
| `src/test/jobStateMachine.test.ts` | 71 | canTransition · queue · allows queue → scheduled · allows queue → ready … |
| `src/lib/offlineStorage.test.ts` | 42 | offlineStorage · generic CRUD against an object store · put/get round-trips a record · get returns undefined for a key that was never stored … |
| `src/test/erpApiContracts.test.ts` | 36 | ERP Job Create — valid payloads · priority=%s → valid · without priority (uses default) → valid · with optional machine_id → valid … |
| `src/test/errorHandling.test.ts` | 36 | categorizeError · returns UNKNOWN_ERROR for null/undefined · returns NETWORK_ERROR for network errors · returns TIMEOUT for timeout errors … |
| `src/test/webhookSimulation.test.ts` | 35 | Webhook — valid combinations (happy path) · source=%s event=%s → 200 · Webhook — data field variations · data=%s → 200 … |
| `src/test/queryConfig.test.ts` | 34 | calculateRetryDelay · returns a positive number for each attempt index · respects the max delay cap · generally increases with attempt index (exponential growth) … |
| `scripts/bundle.test.mjs` | 29 | remove hash Vite de 8 chars · remove hash Vite de 16 chars (configuravel) · nao come o nome quando o chunk tem multiplos dash segments · aceita hash com  … |
| `src/features/inventory/hooks/useTraceability.test.ts` | 29 | useProductionLots · busca lotes de produção com o job vinculado, mais recentes primeiro · useProductionLot · não consulta o Supabase quando lotId é null … |
| `src/test/offlineStorage.test.ts` | 29 | sanitize - additional edge cases · sanitizeUrl · allows https URLs · allows http URLs … |
| `src/test/utils.test.ts` | 29 | merges class strings · removes falsy values · resolves Tailwind conflicts (last class wins) · handles conditional classes via object syntax … |
| `src/test/authFlow.test.ts` | 27 | AuthService · signIn · calls supabase.auth.signInWithPassword with correct credentials · throws when Supabase returns an error … |
| `src/test/exportRegression.test.ts` | 25 | inventoryExport — regressão de formato · gera cabeçalho canônico exato · mapeia tipos IN/OUT/TRANSFER/ADJUST para labels em pt-BR · faz fallback para full_name quando display_name está ausente … |
| `src/test/webhookFuzz.test.ts` | 25 | Fuzz — webhook string injections in event field · Fuzz — webhook malformed source injections · Fuzz — webhook deeply nested / circular-like data · deeply nested object in data field → accepted … |
| `src/test/jobsService.test.ts` | 22 | jobsService.getAll · returns an array of jobs on success · throws when Supabase returns an error · returns empty array when data is null … |
| `src/test/loadStress.test.ts` | 21 | Load — RateLimiter (10 000 requests) · correctly tracks allowed vs throttled across 10k requests · multiple limiters in parallel do not interfere · completes 10k tryAcquire calls in < 50ms … |
| `src/test/sanitize.test.ts` | 21 | escapeHtml · escapes & < >  · leaves safe strings unchanged · stripTags … |
| `supabase/functions/_shared/auth.test.ts` | 19 | jsonOk: envelope {ok:true,data,meta.requestId} · jsonError: envelope {ok:false,error{code,message},meta} · requireRole: sucesso quando papel está na allowlist · requireRole: 403 FORBIDDEN com papéis exigidos em details … |
| `src/features/inventory/hooks/useInventory.test.ts` | 18 | useInventoryMovements · não consulta quando não há usuário autenticado · busca todas as movimentações ordenadas por data quando nenhum item é informado · filtra movimentações por item_id quando um itemId é informado … |
| `src/lib/pdfExport.test.ts` | 18 | pdfExport · exportExecutiveDashboardPDF · renders one autoTable section per KPI group present in the data · skips the Top Operadores/Técnica/Performance sections when those arrays are empty … |
| `src/test/rateLimiterAdvanced.test.ts` | 18 | RateLimiter — advanced scenarios · basic token consumption · allows requests up to maxTokens · rejects when tokens are exhausted … |
| `src/features/inventory/services/traceabilityService.test.ts` | 15 | TraceabilityService · getLots · busca todos os lotes ordenados por data de criação quando nenhum jobId é informado · filtra lotes por job_id quando informado … |
| `src/features/jobs/hooks/useSchedulingConflicts.test.tsx` | 15 | useSchedulingConflicts · retorna lista vazia enquanto jobs ou machines ainda não carregaram · não aponta conflito quando só há um job na máquina/data · detecta sobreposição de horário entre dois jobs na mesma máquina e data … |
| `src/features/jobs/services/scheduling.test.ts` | 15 | findNextAvailableSlot · retorna o início do expediente quando não há jobs existentes · encontra um espaço antes do primeiro job quando ele é grande o suficiente · pula para depois do job quando o espaço antes dele é pequeno demais … |
| `src/lib/calendarExports.test.ts` | 15 | calendarExports · exportElementToPdf · captures the element and saves a landscape PDF when width > height · uses portrait orientation when height >= width … |
| `src/test/exportSimulation.test.ts` | 15 | inventoryExport — simulação de cenários · não lança erro em 300 movimentos aleatórios com dados sujos · retorna silenciosamente com array vazio · retorna silenciosamente com null/undefined … |
| `src/test/validation.test.ts` | 15 | safeParse · returns success:true with parsed data for valid input · returns success:false with ZodError for invalid input · captures missing required fields … |
| `tests/e2e/navigation.spec.ts` | 15 | Botão Voltar · volta uma entrada do histórico interno · deep-link sem histórico interno cai no fallback (home, não sai do app) · Alt+B navega para trás … |
| `src/features/admin/hooks/useSystemStatusSummary.test.ts` | 13 | deriveCronStatus · retorna  · retorna  · retorna  … |
| `src/features/jobs/services/jobStateMachine.test.ts` | 13 | jobStateMachine · canTransition · permite fluxo padrão: queue → scheduled → ready → production → finished · bloqueia transições ilegais críticas … |
| `src/lib/oeeExport.test.ts` | 13 | oeeExport · pdf · renders the header row via doc.autoTable with a grid theme · writes an unsanitized (raw) machineName into the PDF body, unlike the CSV path … |
| `src/test/circuitBreakerAdvanced.test.ts` | 13 | CircuitBreaker — advanced scenarios · stays CLOSED on success · opens after failureThreshold consecutive failures · throws CircuitOpenError when circuit is OPEN … |
| `scripts/audit-gate.test.mjs` | 12 | advisory isento passa · source renumerado pelo npm com a mesma GHSA continua isento · GHSA em caixa diferente na URL continua isenta · GHSA nova em pacote isento reprova … |
| `scripts/check-any-baseline.test.mjs` | 12 | conta todo any em posição de tipo · não conta a palavra fora de posição de tipo · linhas reportadas são 1-based e na ordem do arquivo · seleção de arquivos … |
| `src/features/inventory/hooks/useLogistics.test.ts` | 11 | useLogistics · busca apenas transportadoras ativas, ordenadas por nome · busca envios com transportadora e job vinculados, mais recentes primeiro · cria um envio removendo campos de relação (provider/job) antes de inserir e sincroniza o job vinculado … |
| `src/lib/utils.test.ts` | 11 | merges tailwind classes and dedupes conflicts · safeParseInt · parses common integer strings · returns fallback for invalid/empty input … |
| `src/test/retryBackoffAdvanced.test.ts` | 11 | retryWithBackoff — advanced scenarios · returns immediately on first success · retries up to maxRetries times then throws · stops retrying when isRetryable returns false … |
| `src/test/retryWithBackoff.test.ts` | 11 | retryWithBackoff · resolves immediately on first success · retries after failure and eventually succeeds · throws after exhausting all retries … |
| `tests/e2e/auth.spec.ts` | 11 | Auth Flow - Login/Logout · should login successfully with valid credentials · should show error with invalid credentials · should logout successfully … |
| `src/features/jobs/hooks/useSchedulingData.test.tsx` | 10 | useSchedulingData · mantém as consultas desabilitadas quando não há usuário autenticado · carrega jobs, técnicas, máquinas e perfis quando autenticado · propaga erro do jobsService através de error … |
| `tests/e2e/jobs.spec.ts` | 10 | Jobs — CRUD and state transitions · calendar page loads with job blocks · quick job drawer opens and closes · job priority filter changes visible jobs … |
| `tests/e2e/packaging.spec.ts` | 10 | Packaging — Acesso anônimo · redireciona para /auth ao acessar /packaging sem sessão · sub-rota inexistente de /packaging sem sessão não expõe conteúdo protegido · Packaging — Abertura via sidebar … |
| `src/features/admin/hooks/useCronP95Daily.test.ts` | 9 | median · retorna null para amostra vazia · calcula mediana ímpar e par · computeDrift … |
| `src/lib/excelExport.test.ts` | 9 | excelExport · builds the 3 documented sheets in order: Resumo, Tendência de Produção, Performance Máquinas · Resumo sheet contains the KPI rows with formatted percentages · Tendência de Produção sheet header + one row per productionTrend entry … |
| `src/test/circuitBreaker.test.ts` | 9 | CircuitBreaker · starts in closed state · opens after failureThreshold failures · throws CircuitOpenError immediately when open … |
| `src/test/dateUtils.test.ts` | 9 | parseDateOnly · parses a date-only string at local midnight (no UTC shift) · keeps the calendar day stable regardless of timezone offset · delegates full timestamps to new Date() … |
| `src/test/oeeCalculations.test.ts` | 9 | calculateRealOEE · returns 100% quality when no jobs · calculates standard metrics correctly · floors goodPieces at 0 when lost > produced (data quality issue) … |
| `scripts/ci/check-claude-md-integrity.test.mjs` | 8 | estado íntegro passa, com e sem base explícita, e de qualquer cwd · AGENTS.md ausente ou sem seção obrigatória reprova · wipe do conjunto ou de um arquivo reprova · doc apagado ou esvaziado reprova, inclusive com espaço, acento e .MD no nome … |
| `src/lib/spcExport.test.ts` | 8 | spcExport · renders parameter details, capability indices and measurement history when capability is provided · skips the capability section entirely when capability is null · flags out-of-control measurements with the  … |
| `supabase/functions/_shared/cronAuth.test.ts` | 8 | aceita header x-cron-secret correto · aceita Authorization: Bearer com o segredo · rejeita segredo incorreto com 401 e CORS · rejeita ausência total de credencial quando o segredo existe … |
| `scripts/ci/session-start.test.mjs` | 7 | fora da nuvem não faz nada · primeira sessão: declara async, instala, constrói e carimba o commit · grafo já carimbado e árvore limpa: nada a fazer · edição não commitada invalida a marca: reconstrói … |
| `src/hooks/use-modal-param.test.tsx` | 7 | useModalParam · abre o modal quando a URL traz ?modal=<name> · está fechado sem o param ou com outro nome · setOpen(true) escreve o param e setOpen(false) remove … |
| `src/lib/excel.test.ts` | 7 | excel helper · objectsToRows · emits a header row followed by data rows in key order · coerces missing/undefined values to null … |
| `src/test/rateLimiter.test.ts` | 7 | RateLimiter · allows requests up to max tokens · refills tokens over time · does not exceed maxTokens on refill … |
| `supabase/functions/_shared/rateLimit.test.ts` | 7 | checkRateLimit returns null when under limit · checkRateLimit returns 429 when at/over limit · checkRateLimit fails open on infra error · checkRateLimit atomic path: allows under limit without legacy insert … |
| `tests/e2e/critical-flows.spec.ts` | 7 | Authentication and Authorization Flow · User Login and Dashboard Access · Protected Route Enforcement · User Logout Flow … |
| `scripts/seed-users.test.mjs` | 6 | falha fechado sem token, sem ref ou com ref fora da lista · trava de produção vale mesmo com espaço ou maiúscula no ref · todos criados ou já existentes: sai 0 · qualquer usuário com erro faz o seed sair 1 … |
| `src/features/admin/hooks/useCronHealthHistory.test.ts` | 6 | percentile (R-7) · retorna null para amostra vazia · retorna o único valor quando há uma amostra · interpola linearmente entre posições … |
| `src/hooks/useOfflineSync.test.ts` | 6 | useOfflineSync · should queue actions when offline · should sync actions when coming back online · should handle sync failures and retries … |
| `src/lib/csvSafety.test.ts` | 6 | sanitizeCsvCell · prefixes a leading = with a quote (formula injection) · prefixes a leading + - @ with a quote · prefixes a leading tab or carriage return (used to smuggle a formula past naive checks) … |
| `src/lib/logger.test.ts` | 6 | logger persistence · batches multiple events into a single insert after the debounce window · does not recurse when the error_logs insert itself fails · redacts email addresses from the persisted message and error data … |
| `supabase/functions/_shared/cors.test.ts` | 6 | pickAllowedOrigin: retorna o próprio origin quando está na allowlist · pickAllowedOrigin: origin fora da allowlist cai para o primeiro permitido, nunca * · pickAllowedOrigin: ausência de header Origin cai para o primeiro permitido · EXTRA_ALLOWED_ORIGINS: entradas extras são aceitas quando presentes na env … |
| `supabase/functions/_shared/logger.test.ts` | 6 | getOrCreateRequestId reuses valid header · getOrCreateRequestId generates uuid when missing · getOrCreateRequestId ignores oversize header · logger emits structured JSON … |
| `scripts/graphify.test.mjs` | 5 | fixa PYTHONHASHSEED=0 para o build ser determinístico; respeita valor explícito · repassa argumentos intactos, sem shell · propaga o código de saída do Python · interpretador apontado com versão errada ou inexistente falha com mensagem clara … |
| `src/features/production/services/oeeCalculations.test.ts` | 5 | calculateRealOEE · treats a finished job with unrecorded production (produced_quantity=null) as zero produced, not as the full ordered quantity · counts a recorded produced_quantity normally, including recorded losses · ignores non-finished jobs entirely … |
| `src/hooks/use-smart-back.test.tsx` | 5 | useSmartBack · reporta canGoBack=false em deep-link (primeira entrada  · vai para o fallback quando não há entrada interna · usa fallbackTo customizado quando não há entrada interna … |
| `supabase/functions/_shared/contracts.test.ts` | 5 | Webhook Contract - Valid Payload · Webhook Contract - Invalid Source · ERP Job Contract - Valid Request · ERP Job Contract - Missing Required Field … |
| `tests/e2e/accessibility.spec.ts` | 5 | Acessibilidade - Sweep axe-core WCAG 2.2 AA · rota ${route} não deve apresentar violações críticas · CommandPaletteAdvanced - teclado e foco · abre com Cmd+K, navega com setas e fecha com Escape … |
| `tests/e2e/admin.spec.ts` | 5 | Admin and Settings Flow · should verify settings page structure · should navigate to Admin Telemetry · should navigate to Audit Trail … |
| `tests/e2e/production.spec.ts` | 5 | Production and Jobs Flow · should navigate to Kanban and verify jobs · should create a new job · should verify OEE Dashboard … |
| `src/features/analytics/components/bi/BIStatCard.test.tsx` | 4 | BIStatCard · renders correctly with basic props · shows trend indicator when trend prop is provided · calls onClick when clicked |
| `src/features/analytics/hooks/useRealtimeConnection.test.ts` | 4 | useRealtimeConnection · should connect to realtime channel on mount · should handle connection errors · should remove channel on unmount |
| `src/features/auth/components/AuthProvider.test.tsx` | 4 | AuthContext · should initialize with loading state · should sign in successfully · should sign out successfully |
| `src/features/jobs/services/jobsService.test.ts` | 4 | jobsService · deve chamar select ao buscar todos os jobs · deve criar um novo job com sucesso · deve lidar com erros na busca de jobs |
| `src/pages/InventoryPage.test.tsx` | 4 | InventoryPage - Skeletons e Estabilidade · deve exibir skeletons enquanto os itens do estoque estão carregando · deve manter o layout estável durante a transição de carregamento · deve filtrar itens corretamente |
| `tests/e2e/error-states.spec.ts` | 4 | Error boundaries and fallback states · should not have unhandled page errors on auth page · login with wrong credentials shows error message · navigating to non-existent route shows not found state |
| `tests/e2e/inventory-intelligence.spec.ts` | 4 | Fluxos de Inventário e Inteligência · deve permitir visualizar e filtrar o inventário · deve abrir o modal de registro de movimentação · deve validar o Mapa WMS e sugestões de IA |
| `tests/e2e/logistics.spec.ts` | 4 | Logistics Flow · should verify Logistics page structure · should verify Fleet Management tab · should verify public tracking page |
| `tests/e2e/system-status.spec.ts` | 4 | Status do sistema · renderiza o painel consolidado com os agregados · não expõe detalhes de erro interno · painel de monitoramento exibe tendência das rotinas |
| `tests/e2e/visual-regression.spec.ts` | 4 | Regressão Visual · snapshot da dashboard principal · snapshot da sidebar colapsada e expandida · snapshot responsivo mobile |
| `src/features/analytics/hooks/useKPIs.test.ts` | 3 | useKPIs · should return null when data is loading · should calculate correct metrics when data is provided |
| `src/features/jobs/hooks/useJobs.realtime.test.tsx` | 3 | useJobs — Realtime invalidation · refetches when a Realtime postgres_changes event arrives · chama removeChannel no unmount e ignora eventos posteriores |
| `src/features/jobs/hooks/useTechniques.realtime.test.tsx` | 3 | useTechniques — Realtime invalidation · chama removeChannel no unmount e ignora eventos posteriores · refetches when a Realtime postgres_changes event arrives |
| `src/features/jobs/hooks/useTechniques.test.tsx` | 3 | useTechniques · fetches techniques once and caches them · reuses the cache across multiple consumers (no duplicate queries) |
| `src/features/notifications/hooks/useNotifications.test.ts` | 3 | useNotifications · should fetch and transform notifications correctly · should handle unread count |
| `src/features/production/hooks/useMachines.realtime.test.tsx` | 3 | useMachines — Realtime invalidation · chama removeChannel no unmount e ignora eventos posteriores · refetches when a Realtime postgres_changes event arrives |
| `src/features/production/hooks/useMachines.test.tsx` | 3 | useMachines · fetches active machines and caches the result · shares cache across multiple consumers (no duplicate queries) |
| `src/features/production/hooks/useOperatorProductivity.test.ts` | 3 | useOperatorProductivity · should fetch and calculate productivity data · should handle errors gracefully |
| `src/test/realtimeMock.test.ts` | 3 | createRealtimeMock — contrato de tabelas não assinadas · emitFor lança quando a tabela não tem handler registrado · não dispara callbacks de outras tabelas ao emitir para tabela não assinada |
| `tests/e2e/dashboard.spec.ts` | 3 | Dashboard de KPIs · deve carregar o dashboard de KPIs e navegar entre abas · deve permitir alterar o período do dashboard |
| `tests/e2e/inventory-stability.spec.ts` | 3 | Estabilidade Visual do Inventário · deve exibir skeletons durante a busca no inventário · layout deve permanecer estável entre estados de carregamento |
| `tests/e2e/maintenance.spec.ts` | 3 | Dashboard de Manutenção (TPM) · deve carregar o dashboard de TPM · deve navegar para a aba de alertas |
| `src/features/analytics/hooks/useOEE.test.ts` | 2 | useOEE · should calculate OEE components correctly |
| `src/pages/AdminTelemetriaPage.test.tsx` | 2 | Painel de Telemetria (Lite) · deve carregar dados de telemetria e exibir na tabela |
| `supabase/functions/_shared/webpushEncrypt.test.ts` | 2 | encryptPushPayload produz corpo aes128gcm descriptografável (RFC 8291/8188) · encryptPushPayload aceita p256dh/auth em base64url |
| `tests/e2e/offline.spec.ts` | 2 | Offline Syncing and Persistence · should queue actions offline and show sync indicators |
| `tests/e2e/simulation.spec.ts` | 2 | Simulation and Stress Testing · should run mass simulation and display results |
| `src/features/auth/types/admin_bypass.test.ts` | 1 | Admin role should always have bypass on protected routes |

## L. Eventos de webhook tratados (contratos com sistemas externos)

| Evento | Arquivo |
|---|---|
| `dismiss` | `public/sw.js` |
| `Atrasados` | `src/features/analytics/components/bi/BINormalView.tsx` |
| `Finalizados` | `src/features/analytics/components/bi/BINormalView.tsx` |
| `rpc` | `supabase/functions/external-db-bridge/index.ts` |

## M. Efeitos colaterais (e-mail, SMS, cobrança, fila — não são idempotentes por padrão)

| Chamada | Arquivo |
|---|---|
| `invoke(` | `src/components/operators/CreateOperatorModal.tsx` |
| `invoke(` | `src/components/operators/EditOperatorModal.tsx` |
| `invoke(` | `src/components/settings/PasswordResetRequests.tsx` |
| `invoke(` | `src/features/admin/services/integrationsService.ts` |
| `invoke(` | `src/features/analytics/hooks/useMLPredictions.ts` |
| `invoke(` | `src/features/auth/services/authService.ts` |
| `invoke(` | `src/features/inventory/hooks/useInventory.ts` |
| `invoke(` | `src/features/jobs/hooks/useAutoBufferPromotion.ts` |
| `notify` | `src/features/jobs/hooks/usePriorityEscalation.ts` |
| `invoke(` | `src/features/maintenance/components/ExecutionDetailsModal.tsx` |
| `invoke(` | `src/features/maintenance/hooks/useTPMAlertMutations.ts` |
| `sendNotification` | `src/features/notifications/components/PushNotificationManager.tsx` |
| `invoke(` | `src/features/notifications/hooks/useDailySummaryNotifications.ts` |
| `sendNotification` | `src/features/notifications/hooks/useDailySummaryNotifications.ts` |
| `notify` | `src/features/notifications/hooks/useMLPredictionNotifications.ts` |
| `sendNotification` | `src/features/notifications/hooks/useMLPredictionNotifications.ts` |
| `notifyStatusChange` | `src/features/notifications/hooks/useNotifications.ts` |
| `sendNotification` | `src/features/notifications/hooks/usePushNotifications.ts` |
| `invoke(` | `src/features/notifications/hooks/usePushSubscription.ts` |
| `notify` | `src/features/notifications/hooks/useTPMNotifications.ts` |
| `sendNotification` | `src/features/notifications/hooks/useTPMNotifications.ts` |
| `invoke(` | `src/features/notifications/hooks/useWebPushNotifications.ts` |
| `sendNotification` | `src/features/production/hooks/useOEEAlerts.ts` |
| `.add('deeplink-focus-highlight'` | `src/hooks/use-deeplink-focus.ts` |
| `invoke(` | `src/hooks/useDeviceDetection.ts` |
| `invoke(` | `src/hooks/useGamification.ts` |
| `notify` | `src/lib/circuitBreaker.ts` |
| `notify` | `src/lib/navHistory.ts` |
| `invoke(` | `src/lib/simulation.ts` |
| `.add('simulate-reduced-motion'` | `src/pages/DesignSystemPage.tsx` |
| `notifyStatusChange` | `src/pages/KioskPage.tsx` |
| `notifyStatusChange` | `src/pages/OperatorView.tsx` |
| `invoke(` | `supabase/functions/_shared/cronAuth.ts` |
| `resend.emails.send` | `supabase/functions/new-device-alert/index.ts` |
| `notify` | `supabase/functions/send-push-notification/index.ts` |
| `notify_tpm_email` | `supabase/migrations/20260508115941_72493014-c1ac-4815-aab4-748637090416.sql` |
| `notify_tpm_email` | `supabase/migrations/20260508115950_328ed89c-42c7-404c-9c8f-561ad1d33527.sql` |
| `notify` | `supabase/migrations/20260508144832_765e2d9e-90d4-43dc-99bf-7e072423cd5f.sql` |
| `notify_loss_risk` | `supabase/migrations/20260508144832_765e2d9e-90d4-43dc-99bf-7e072423cd5f.sql` |
| `notify_loss_risk` | `supabase/migrations/20260512213123_cde65308-0c68-43ec-ab86-334d186a3b6d.sql` |
| `notify_tpm_email` | `supabase/migrations/20260512213123_cde65308-0c68-43ec-ab86-334d186a3b6d.sql` |
| `notify_loss_risk` | `supabase/migrations/20260512213154_c63162d3-4250-46dc-8e13-665679808192.sql` |
| `notify_tpm_email` | `supabase/migrations/20260512213154_c63162d3-4250-46dc-8e13-665679808192.sql` |
| `notify_loss_risk` | `supabase/migrations/20260514211713_6529e69c-528c-4d4a-87bb-a27f0fcfd0d7.sql` |
| `notify_tpm_email` | `supabase/migrations/20260514211713_6529e69c-528c-4d4a-87bb-a27f0fcfd0d7.sql` |
| `notify` | `supabase/migrations/20260516172507_1193e061-8bc4-44b8-9cf5-ba855879c3bb.sql` |
| `notify_loss_risk` | `supabase/migrations/20260522195522_6c50b805-300f-485b-ad16-db2df4128e8f.sql` |
| `notify_tpm_email` | `supabase/migrations/20260522195522_6c50b805-300f-485b-ad16-db2df4128e8f.sql` |
| `notify_packaging_defect_critical` | `supabase/migrations/20260723150905_1ffa0b04-7991-41a3-a443-1ca9ee07ce07.sql` |
| `notify_packaging_task_created` | `supabase/migrations/20260723150905_1ffa0b04-7991-41a3-a443-1ca9ee07ce07.sql` |
| `notify_loss_risk` | `supabase/migrations/20261002120000_fix_notify_loss_risk_and_tpm_alerts_rls.sql` |
| `notify_loss_risk` | `supabase/migrations/20261008160000_runtime_config_edge_auth.sql` |
| `notify_loss_risk` | `supabase/migrations/20261019140000_validation_hardening.sql` |

## N. Regras citadas em comentários do código

| Comentário | Arquivo |
|---|---|
| idiomatic pattern for required secrets validated at boot. | `eslint.config.js` |
| Background Sync — tag must match registerBackgroundSync() in | `public/sw.js` |
| Env validation must precede every other import — see envGuard.ts. | `src/main.tsx` |
| Performance Monitoring (Web Vitals → Sentry apenas quando habilitado) | `src/main.tsx` |
| Persistir o log de erro é best-effort; nunca deve mascarar o erro original. | `src/components/auth/AuthErrorBoundary.tsx` |
| Hook for password validation | `src/components/auth/PasswordStrengthIndicator.tsx` |
| precisam de um fator MFA VERIFICADO — não apenas do desafio de login. | `src/components/auth/ProtectedRoute.tsx` |
| on the permission loader. Redirect to the safest available authenticated route. | `src/components/auth/ProtectedRoute.tsx` |
| the exhaustive-deps lint rule when used inside useEffect. | `src/components/autonomous/AutonomousEventLog.tsx` |
| Determine the bottleneck limit for this specific column if applicable | `src/components/kanban/DroppableColumn.tsx` |
| deve pedir confirmação de descarte do formulário atr��s dele. | `src/components/layout/MainLayout.tsx` |
| Hooks must be called before any conditional returns | `src/components/layout/QuickFavoritesBar.tsx` |
| Permission Status */} | `src/components/ml/MLNotificationSettings.tsx` |
| Máximo de itens visíveis antes de colapsar em "..." | `src/components/navigation/Breadcrumbs.tsx` |
| Pai sem rota própria: texto apagado — não pode parecer | `src/components/navigation/Breadcrumbs.tsx` |
| deve mover o scroll. | `src/components/navigation/ScrollRestoration.tsx` |
| alcançar o offset antigo — aceita o máximo alcançável para | `src/components/navigation/ScrollRestoration.tsx` |
| não prender o scroll do usuário até o deadline. Exige | `src/components/navigation/ScrollRestoration.tsx` |
| * Sanitiza o payload para garantir que apenas campos permitidos sejam enviados. | `src/components/operator/ProductionRegistrationModal.tsx` |
| Validação por Magic Bytes (Segurança 10/10) | `src/components/operator/ProductionRegistrationModal.tsx` |
| SANITIZAR: garantir que apenas campos permitidos sejam enviados | `src/components/operator/ProductionRegistrationModal.tsx` |
| Calculate planning efficiency based on deadline adherence and optimization potential | `src/components/planning/PlanningEfficiencyDashboard.tsx` |
| The deadline is the whole scheduled day, so compare against its end. | `src/components/planning/PlanningEfficiencyDashboard.tsx` |
| Deadline Health */} | `src/components/planning/PlanningEfficiencyDashboard.tsx` |
| , jobs:job_id (order_number, product, client)`).order("scanned_at", { ascending: false }).limit(limit); | `src/components/qrcode/ScanHistory.tsx` |
| render (React refs must only be read/written in effects or handlers). | `src/components/qrcode/ScanHistory.tsx` |
| 3b82f6'} required /> | `src/components/settings/TechniqueManagement.tsx` |
| para inicializar apenas uma vez por sessão. | `src/components/technical-assistant/TechnicalArtifacts.tsx` |
| Validação Magic Bytes (Segurança 10/10) | `src/components/traceability/LotInspectionsTab.tsx` |
| When asChild, Slot must receive exactly ONE React element child. | `src/components/ui/button.tsx` |
| best-effort; nunca deve mascarar o erro original. | `src/components/ui/error-boundary.tsx` |
| Persistir o log de erro é best-effort; nunca deve mascarar o erro original. | `src/components/ui/error-boundary.tsx` |
| e não pode ser cancelado — a confirmação pendente apontaria para a | `src/contexts/DirtyFormContext.tsx` |
| (popstate) não pode ser cancelado; formulários com rascunho | `src/contexts/DirtyFormContext.tsx` |
| Deve ser chamado dentro do provider (MainLayout). | `src/contexts/DirtyFormContext.tsx` |
| realtime WS is reachable. The handler must be stable (useCallback) so | `src/contexts/WebSocketContext.tsx` |
| * Tendência de longo prazo (até 365 dias) do p95 de duração por rotina, | `src/features/admin/components/monitoring/CronP95TrendCard.tsx` |
| Permission Groups */} | `src/features/admin/components/security/PermissionManager.tsx` |
| Info sobre permissão bloqueada */} | `src/features/admin/components/security/PushNotificationSettings.tsx` |
| apenas por coordenadores/gestores (RLS). | `src/features/admin/hooks/useCronHealthHistory.ts` |
| degradação de longo prazo, além da janela de 90 dias do histórico bruto. | `src/features/admin/hooks/useCronP95Daily.ts` |
| limit(10000) era inútil: o servidor trunca em max-rows (~1000) antes. | `src/features/admin/hooks/useDataExport.ts` |
| Função SECURITY DEFINER que exige apenas um papel ativo — devolve somente | `src/features/admin/hooks/useSystemStatusSummary.ts` |
| Data validation helpers | `src/features/analytics/hooks/useBottleneckPrediction.ts` |
| Data validation helpers | `src/features/analytics/hooks/useKPIs.ts` |
| Data validation helpers | `src/features/analytics/hooks/useLoadBalancing.ts` |
| Assign jobs to machines with validation | `src/features/analytics/hooks/useLoadBalancing.ts` |
| Rule 1: Point outside control limits (already handled in db trigger usually, but good to have) | `src/features/analytics/hooks/useSPC.ts` |
| Rule 2: Seven or more points in a row on one side of the mean | `src/features/analytics/hooks/useSPC.ts` |
| Rule 3: Seven points in a row steadily increasing or decreasing | `src/features/analytics/hooks/useSPC.ts` |
| query sem ORDER BY + .limit(1) devolve uma linha em ordem não garantida | `src/features/auth/components/AuthProvider.tsx` |
| `ProtectedRoute` must not treat an AAL1 session as fully authenticated when | `src/features/auth/hooks/useAuthenticatorAssuranceLevel.ts` |
| Permission checks | `src/features/auth/hooks/useRBAC.tsx` |
| Validação de segurança: estoque insuficiente | `src/features/inventory/hooks/useInventory.ts` |
| Runtime validation | `src/features/jobs/hooks/usePaginatedJobs.ts` |
| Per-job try/catch: one failed update must not abort the loop for | `src/features/jobs/hooks/usePriorityEscalation.ts` |
| Data validation helpers | `src/features/jobs/hooks/useSmartSequencing.ts` |
| Runtime validation with Schema fallback | `src/features/jobs/services/jobsService.ts` |
| coordenador/manager não pode roubar a produção do operador | `src/features/jobs/services/jobsService.ts` |
| Throw instead of swallowing: a connectivity/RLS failure must not be | `src/features/jobs/services/techniquesService.ts` |
| so "foto obrigatória ausente" (the same rule approveBatch enforces | `src/features/maintenance/components/BatchApprovalPreviewModal.tsx` |
| Validation Feedback */} | `src/features/maintenance/components/ExecutionRecordView.tsx` |
| Real-time parameter validation | `src/features/maintenance/components/MaintenanceExecutionModal.tsx` |
| Validação obrigatória de Produto/Técnica (Ficha Técnica) | `src/features/maintenance/components/MaintenanceExecutionModal.tsx` |
| Validação de Requisitos de Qualidade da Ficha Técnica | `src/features/maintenance/components/MaintenanceExecutionModal.tsx` |
| Validação de riscos críticos (Alertas de parâmetros) | `src/features/maintenance/components/MaintenanceExecutionModal.tsx` |
| Approve batch mutation. Must enforce the same minimum-evidence | `src/features/maintenance/hooks/useTPMAlertMutations.ts` |
| required) — the batch path previously skipped that validation entirely, | `src/features/maintenance/hooks/useTPMAlertMutations.ts` |
| letting records without required evidence get approved when done via | `src/features/maintenance/hooks/useTPMAlertMutations.ts` |
| Single fetch for both validation data (responses/photos) and schedule | `src/features/maintenance/hooks/useTPMApprovalMutations.ts` |
| validation check passed. | `src/features/maintenance/hooks/useTPMApprovalMutations.ts` |
| response row itself — must join through checklist_item_id to read it | `src/features/maintenance/hooks/useTPMApprovalMutations.ts` |
| render (React refs must only be read/written in effects or handlers). | `src/features/notifications/components/InAppNotificationWatcher.tsx` |
| render (React refs must only be read/written in effects or handlers). | `src/features/notifications/components/NotificationIntegrator.tsx` |
| * Mostrar apenas uma vez por sessão */ | `src/features/notifications/components/PushNotificationPrompt.tsx` |
| * Prompt flutuante para solicitar permissão de Push Notifications | `src/features/notifications/components/PushNotificationPrompt.tsx` |
| - Permissão negada | `src/features/notifications/components/PushNotificationPrompt.tsx` |
| .select('id') expõe falha silenciosa de RLS (update sem permissão | `src/features/notifications/hooks/useNotifications.ts` |
| Request notification permission | `src/features/notifications/hooks/usePushSubscription.ts` |
| Pedir permissão | `src/features/notifications/hooks/useWebPushNotifications.ts` |
| Sem permissão (operador) devolve lista vazia sem quebrar UI | `src/features/packaging/hooks/usePackagingAuditTimeline.ts` |
| ').limit(1).maybeSingle(); | `src/features/packaging/hooks/usePackagingSettings.ts` |
| Data validation helpers | `src/features/production/hooks/useOEE.ts` |
| must be the same job subset (see note above). | `src/features/production/hooks/useOperatorProductivity.ts` |
| Throw instead of swallowing: a connectivity/RLS failure must not be | `src/features/production/services/machinesService.ts` |
| Null produced_quantity means "not recorded" — must not be treated as | `src/features/production/services/oeeCalculations.ts` |
| * Voltar seguro: navega no histórico apenas quando existe uma entrada | `src/hooks/use-smart-back.ts` |
| navHistory): o voltar deve consumi-la e fechar o dialog — o | `src/hooks/use-smart-back.ts` |
| @returns Object with debounced value, loading state, and validation | `src/hooks/useDebounce.ts` |
| @param options - Fuse.js options with required 'keys' field | `src/hooks/useFuseSearch.ts` |
| from storage must NOT re-enter the queue (it would duplicate the write | `src/hooks/useOfflineSync.ts` |
| queue as ghosts). Future passes must skip them or the same write gets | `src/hooks/useOfflineSync.ts` |
| ').order('created_at', { ascending: false }).limit(100), | `src/hooks/useOfflineSync.ts` |
| storage that aren't part of this pass's snapshot must survive the | `src/hooks/useOfflineSync.ts` |
| Tenta encontrar em CRITICAL_ROUTES ou RELATED_ROUTES ou apenas tenta importar se for um padrão conhecido | `src/hooks/useRoutePrefetch.ts` |
| every CSV writer must run cell values through this before serializing. | `src/lib/csvSafety.ts` |
| * Startup guard for required environment variables. | `src/lib/envGuard.ts` |
| * MUST be the first import in main.tsx: ES module imports are evaluated | `src/lib/envGuard.ts` |
| with an undefined URL it throws the cryptic "supabaseUrl is required." | `src/lib/envGuard.ts` |
| Excel worksheet names must be <= 31 chars and cannot contain : \ / ? * [ ] | `src/lib/excel.ts` |
| `.select()` sem .range()/.limit() devolve no máximo 1000 linhas e o resto | `src/lib/fetchAllRows.ts` |
| // A query DEVE ter .order() determinístico (chave única como 'id', ou | `src/lib/fetchAllRows.ts` |
| (cursor, limit) => { | `src/lib/fetchAllRows.ts` |
| return q.limit(limit); | `src/lib/fetchAllRows.ts` |
| - Rede intermitente/offline: espera o evento `online` e tenta de novo (limite de | `src/lib/lazyWithRetry.ts` |
| apenas instável (bug de produção real). | `src/lib/lazyWithRetry.ts` |
| o client instrumenta fetch via logger, então o logger não pode | `src/lib/logger.ts` |
| Login screens must NOT reuse this — they validate existing credentials. | `src/lib/passwordPolicy.ts` |
| JOBS key's full history. They must never share a cache entry — whichever | `src/lib/queryConfig.ts` |
| PostgREST error codes that must not be retried (auth/permission/client errors). | `src/lib/queryConfig.ts` |
| Don't retry on 4xx errors (client errors) except 408 (timeout) and 429 (rate limit) | `src/lib/queryConfig.ts` |
| Rate limit - retry with backoff | `src/lib/queryConfig.ts` |
| Auth/permission errors - don't retry | `src/lib/queryConfig.ts` |
| Validation errors - don't retry | `src/lib/queryConfig.ts` |
| the Supabase client validation. Fanout to the listener sets at runtime. | `src/lib/realtimeChannel.ts` |
| auth-token velho no localStorage (setup anterior) não pode | `src/lib/soundFeedback.ts` |
| * Runtime validation utilities using Zod. | `src/lib/validation.ts` |
| Logs validation failures in dev mode. | `src/lib/validation.ts` |
| errors must not throw into the caller; the caller already has the data in | `src/lib/offline/offlineQueue.ts` |
| items antigo SEM modal — voltar até ela não pode restaurar a | `src/pages/InventoryPage.tsx` |
| ').gte('created_at', subDays(new Date(), parseInt(dateRange, 10)).toISOString()).order('created_at', { ascending: false }).limit(30); if (error) throw error; return data as DailySummaryRecord[]; }, | `src/pages/NotificationsPage.tsx` |
| `j` original não pode seqüestrar a consulta digitada. | `src/pages/PublicTrackingPage.tsx` |
| papel ativo. Mostra apenas agregados; detalhes ficam em /admin/monitoring. | `src/pages/SystemStatusPage.tsx` |
| Seed que não criou todos os usuários não pode sair 0 (quem chama acharia que semeou). | `supabase/seed-users.mjs` |
| const forbidden = requireRole(auth.ctx, ['admin']); if (forbidden) return forbidden; | `supabase/functions/_shared/auth.ts` |
| ── Decodificação do claim AAL (pós-validação — seguro sem verificar assinatura) ── | `supabase/functions/_shared/auth.ts` |
| reportada como negação de permissão). | `supabase/functions/_shared/auth.ts` |
| Falha de infraestrutura ≠ negação de permissão. | `supabase/functions/_shared/auth.ts` |
| // Premissa do plano: webhooks aceitam SOMENTE assinatura HMAC verificada sobre | `supabase/functions/_shared/auth.ts` |
| --- Validation Helper --- | `supabase/functions/_shared/contracts.ts` |
| *  - If the `CRON_SECRET` environment variable is set, callers MUST send a | `supabase/functions/_shared/cronAuth.ts` |
| immediately when it must be rejected. Any `corsHeaders` provided are attached | `supabase/functions/_shared/cronAuth.ts` |
| text) must never be interpolated raw into HTML — an attacker-controlled | `supabase/functions/_shared/htmlEscape.ts` |
| - When the count exceeds `max`, returns a rate-limit response. | `supabase/functions/_shared/rateLimit.ts` |
| os dois caminhos (RPC e legado) e o rate limit por IP abria bypass. | `supabase/functions/_shared/rateLimit.ts` |
| * Helper to perform contract validation tests against a handler | `supabase/functions/_shared/test-utils.ts` |
| Central Zod validation helper for Edge Functions. | `supabase/functions/_shared/validate.ts` |
| Um record só: o plaintext não pode exceder o record size declarado (rs). | `supabase/functions/_shared/webpushEncrypt.ts` |
| Rate limit: 30 approvals per hour per reviewer. | `supabase/functions/approve-password-reset/index.ts` |
| must not run unauthenticated on an unconfigured deployment. | `supabase/functions/auto-promote-jobs/index.ts` |
| Shared secret Bitrix24 must send (as ?token= query param or x-bitrix-webhook-secret | `supabase/functions/bitrix24-sync/index.ts` |
| callback — um state capturado não pode ser reutilizado para trocar o code | `supabase/functions/bitrix24-sync/index.ts` |
| A backend failure must not be silently reported as an authorization denial. | `supabase/functions/bitrix24-sync/index.ts` |
| Fail-closed: BITRIX24_WEBHOOK_TOKEN must be configured before webhooks work. | `supabase/functions/bitrix24-sync/index.ts` |
| inventory and must not be callable by any signed-in user. | `supabase/functions/calculate-inventory-intelligence/index.ts` |
| padrão dual-header (service_role) não resolve usuário e não deve ser | `supabase/functions/calculate-rankings/index.ts` |
| so an unconfigured deployment must never run it unauthenticated. | `supabase/functions/calculate-rankings/index.ts` |
| record_success must prove the caller actually holds a session for this | `supabase/functions/check-login-lockout/index.ts` |
| Clean up old rate limit logs | `supabase/functions/cleanup-security-logs/index.ts` |
| Rate limit: 10 operator-creations per hour per requesting user. | `supabase/functions/create-operator/index.ts` |
| Password policy — must match src/lib/passwordPolicy.ts (newPasswordSchema) | `supabase/functions/create-operator/index.ts` |
| * Mantém apenas a coleta mais recente de cada rotina. */ | `supabase/functions/cron-alert-email/index.ts` |
| defesa é: schema zod estrito + rate limit por IP + insert via service role | `supabase/functions/csp-report/index.ts` |
| (schema mantido local e não em _shared/validation.ts para evitar conflito | `supabase/functions/csp-report/index.ts` |
| pelo cliente e driblaria o rate limit por IP. | `supabase/functions/csp-report/index.ts` |
| público sustentado não pode virar volume de escrita em rate_limit_logs — | `supabase/functions/csp-report/index.ts` |
| Clamp limit to [1, 200] so zero/negative values can't break .range(). | `supabase/functions/erp-api/index.ts` |
| ').order('created_at', { ascending: false }).limit(limit); | `supabase/functions/erp-api/index.ts` |
| ").limit(EXPORT_ROW_LIMIT); | `supabase/functions/excel-export/index.ts` |
| * Defense-in-depth allowlist. Even admins must not use this bridge to | `supabase/functions/external-db-bridge/index.ts` |
| Swallow — Sentry outages must never fail the monitor. | `supabase/functions/health-monitor/index.ts` |
| Falha na persistência nunca deve derrubar o monitor. | `supabase/functions/health-monitor/index.ts` |
| porque o deno check do CI cobria apenas 2 arquivos). | `supabase/functions/ml-predictions/index.ts` |
| Fetch all required data | `supabase/functions/ml-predictions/index.ts` |
| ").in("status", ["finished", "production"]).order("updated_at", { ascending: false }).limit(500), | `supabase/functions/ml-predictions/index.ts` |
| ").order("started_at", { ascending: false }).limit(200), | `supabase/functions/ml-predictions/index.ts` |
| fields — a caller must not be able to forge device records or trigger | `supabase/functions/new-device-alert/index.ts` |
| de PDF real deve ser implementada com `pdf-lib` ou similar; até lá o texto | `supabase/functions/pdf-generator/index.ts` |
| Guarda de abuso do próprio endpoint de rate limit (público): anônimos são | `supabase/functions/rate-limit-check/index.ts` |
| Get rate limit config for endpoint | `supabase/functions/rate-limit-check/index.ts` |
| we must walk every page or subscribers beyond the first page silently | `supabase/functions/send-loss-risk-alert/index.ts` |
| "failed" and must NOT cause the subscription to be deleted. | `supabase/functions/send-push-notification/index.ts` |
| Filter by eligible roles before limit(1) to handle users with multiple role rows. | `supabase/functions/send-push-notification/index.ts` |
| Non-broadcast requests must always provide a user_id | `supabase/functions/send-push-notification/index.ts` |
| 3. Get subscriber emails — must paginate: default listUsers() returns only 50 rows | `supabase/functions/send-tpm-email/index.ts` |
| Rate limit: 120 webhooks/min per source IP. | `supabase/functions/webhook-handler/index.ts` |
