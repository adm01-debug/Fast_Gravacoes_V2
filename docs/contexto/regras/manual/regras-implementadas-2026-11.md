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
