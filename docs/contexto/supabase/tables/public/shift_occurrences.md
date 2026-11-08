# public.shift_occurrences

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 6 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `handover_id` | `uuid` | não |  |  |  |
| 3 | `occurrence_type` | `text` | não |  |  |  |
| 4 | `severity` | `text` | não | `'info'::text` |  |  |
| 5 | `title` | `text` | não |  |  |  |
| 6 | `description` | `text` | não |  |  |  |
| 7 | `machine_id` | `uuid` | sim |  |  |  |
| 8 | `job_id` | `uuid` | sim |  |  |  |
| 9 | `occurred_at` | `timestamp with time zone` | não | `now()` |  |  |
| 10 | `resolution` | `text` | sim |  |  |  |
| 11 | `resolved_at` | `timestamp with time zone` | sim |  |  |  |
| 12 | `resolved_by` | `uuid` | sim |  |  |  |
| 13 | `photos` | `text[]` | sim | `'{}'::text[]` |  |  |
| 14 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| shift_occurrences_handover_id_fkey | FOREIGN KEY | `FOREIGN KEY (handover_id) REFERENCES shift_handovers(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| shift_occurrences_job_id_fkey | FOREIGN KEY | `FOREIGN KEY (job_id) REFERENCES jobs(id)` | NO ACTION | NO ACTION | sim |
| shift_occurrences_machine_id_fkey | FOREIGN KEY | `FOREIGN KEY (machine_id) REFERENCES machines(id)` | NO ACTION | NO ACTION | sim |
| shift_occurrences_occurrence_type_check | CHECK | `CHECK (occurrence_type = ANY (ARRAY['incident'::text, 'maintenance'::text, 'quality'::text, 'safety'::text, 'production'::text, 'other'::text]))` |  |  | sim |
| shift_occurrences_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| shift_occurrences_severity_check | CHECK | `CHECK (severity = ANY (ARRAY['info'::text, 'warning'::text, 'error'::text, 'critical'::text]))` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_shift_occurrences_handover_id | btree | handover_id | não | sim |  | `CREATE INDEX idx_shift_occurrences_handover_id ON public.shift_occurrences USING btree (handover_id)` |
| idx_shift_occurrences_job_id | btree | job_id | não | sim |  | `CREATE INDEX idx_shift_occurrences_job_id ON public.shift_occurrences USING btree (job_id)` |
| idx_shift_occurrences_machine_id | btree | machine_id | não | sim |  | `CREATE INDEX idx_shift_occurrences_machine_id ON public.shift_occurrences USING btree (machine_id)` |
| shift_occurrences_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX shift_occurrences_pkey ON public.shift_occurrences USING btree (id)` |


## Policies (RLS)

### `Active roles can manage occurrences`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `has_any_active_role()` |
| WITH CHECK | `has_any_active_role()` |

### `Active roles can view shift occurrences`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `has_any_active_role()` |
| WITH CHECK |  |

### `Authenticated users can view occurrences`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `has_any_active_role()` |
| WITH CHECK |  |

### `Elevated can delete occurrences`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(app_private.has_role(auth.uid(), 'coordinator'::app_role) OR app_private.has_role(auth.uid(), 'manager'::app_role) OR app_private.has_role(auth.uid(), 'admin'::app_role))` |
| WITH CHECK |  |

### `Handover participants can insert occurrences`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `((EXISTS ( SELECT 1    FROM shift_handovers h   WHERE ((h.id = shift_occurrences.handover_id) AND ((h.outgoing_operator_id = auth.uid()) OR (h.incoming_operator_id = auth.uid()))))) OR app_private.has_role(auth.uid(), 'coordinator'::app_role) OR app_private.has_role(auth.uid(), 'manager'::app_role) OR app_private.has_role(auth.uid(), 'admin'::app_role))` |

### `Handover participants can update occurrences`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `((EXISTS ( SELECT 1    FROM shift_handovers h   WHERE ((h.id = shift_occurrences.handover_id) AND ((h.outgoing_operator_id = auth.uid()) OR (h.incoming_operator_id = auth.uid()))))) OR app_private.has_role(auth.uid(), 'coordinator'::app_role) OR app_private.has_role(auth.uid(), 'manager'::app_role) OR app_private.has_role(auth.uid(), 'admin'::app_role))` |
| WITH CHECK | `((EXISTS ( SELECT 1    FROM shift_handovers h   WHERE ((h.id = shift_occurrences.handover_id) AND ((h.outgoing_operator_id = auth.uid()) OR (h.incoming_operator_id = auth.uid()))))) OR app_private.has_role(auth.uid(), 'coordinator'::app_role) OR app_private.has_role(auth.uid(), 'manager'::app_role) OR app_private.has_role(auth.uid(), 'admin'::app_role))` |


## Triggers

_nenhum_


## Grants

_nenhum_
