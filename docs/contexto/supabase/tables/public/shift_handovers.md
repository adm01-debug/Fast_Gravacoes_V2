# public.shift_handovers

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 3 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `shift_date` | `date` | não | `CURRENT_DATE` |  |  |
| 3 | `shift_type` | `text` | não |  |  |  |
| 4 | `outgoing_operator_id` | `uuid` | não |  |  |  |
| 5 | `incoming_operator_id` | `uuid` | sim |  |  |  |
| 6 | `machine_id` | `uuid` | sim |  |  |  |
| 7 | `status` | `text` | não | `'open'::text` |  |  |
| 8 | `general_notes` | `text` | sim |  |  |  |
| 9 | `started_at` | `timestamp with time zone` | não | `now()` |  |  |
| 10 | `completed_at` | `timestamp with time zone` | sim |  |  |  |
| 11 | `accepted_at` | `timestamp with time zone` | sim |  |  |  |
| 12 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 13 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| shift_handovers_machine_id_fkey | FOREIGN KEY | `FOREIGN KEY (machine_id) REFERENCES machines(id)` | NO ACTION | NO ACTION | sim |
| shift_handovers_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| shift_handovers_shift_type_check | CHECK | `CHECK (shift_type = ANY (ARRAY['morning'::text, 'afternoon'::text, 'night'::text]))` |  |  | sim |
| shift_handovers_status_check | CHECK | `CHECK (status = ANY (ARRAY['open'::text, 'pending_acceptance'::text, 'completed'::text, 'cancelled'::text]))` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.shift_handover_checklist | shift_handover_checklist_handover_id_fkey | handover_id | CASCADE |
| public.shift_occurrences | shift_occurrences_handover_id_fkey | handover_id | CASCADE |
| public.shift_pending_tasks | shift_pending_tasks_handover_id_fkey | handover_id | CASCADE |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_shift_handovers_machine_id | btree | machine_id | não | sim |  | `CREATE INDEX idx_shift_handovers_machine_id ON public.shift_handovers USING btree (machine_id)` |
| shift_handovers_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX shift_handovers_pkey ON public.shift_handovers USING btree (id)` |


## Policies (RLS)

### `Authenticated users can create handovers`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | public |
| USING |  |
| WITH CHECK | `(( SELECT auth.uid() AS uid) IS NOT NULL)` |

### `Authenticated users can view shift handovers`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `has_any_active_role()` |
| WITH CHECK |  |

### `Operators can update their handovers`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | public |
| USING | `((outgoing_operator_id = ( SELECT auth.uid() AS uid)) OR (incoming_operator_id = ( SELECT auth.uid() AS uid)) OR app_private.has_role(( SELECT auth.uid() AS uid), 'coordinator'::app_role))` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| update_shift_handovers_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
