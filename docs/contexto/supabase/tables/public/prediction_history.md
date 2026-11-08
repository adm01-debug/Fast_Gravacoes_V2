# public.prediction_history

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 2 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `prediction_id` | `uuid` | não |  |  |  |
| 3 | `machine_id` | `uuid` | não |  |  |  |
| 4 | `predicted_risk_score` | `numeric(5,2)` | não |  |  |  |
| 5 | `predicted_failure_date` | `date` | sim |  |  |  |
| 6 | `actual_failure_date` | `date` | sim |  |  |  |
| 7 | `was_accurate` | `boolean` | sim |  |  |  |
| 8 | `accuracy_notes` | `text` | sim |  |  |  |
| 9 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 10 | `resolved_at` | `timestamp with time zone` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| prediction_history_machine_id_fkey | FOREIGN KEY | `FOREIGN KEY (machine_id) REFERENCES machines(id)` | NO ACTION | NO ACTION | sim |
| prediction_history_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| prediction_history_prediction_id_fkey | FOREIGN KEY | `FOREIGN KEY (prediction_id) REFERENCES machine_predictions(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_prediction_history_machine_id | btree | machine_id | não | sim |  | `CREATE INDEX idx_prediction_history_machine_id ON public.prediction_history USING btree (machine_id)` |
| idx_prediction_history_prediction_id | btree | prediction_id | não | sim |  | `CREATE INDEX idx_prediction_history_prediction_id ON public.prediction_history USING btree (prediction_id)` |
| prediction_history_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX prediction_history_pkey ON public.prediction_history USING btree (id)` |


## Policies (RLS)

### `Authenticated users can view prediction history`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `has_any_active_role()` |
| WITH CHECK |  |

### `Coordinators can manage prediction history`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `app_private.has_role(( SELECT auth.uid() AS uid), 'coordinator'::app_role)` |
| WITH CHECK | `app_private.has_role(( SELECT auth.uid() AS uid), 'coordinator'::app_role)` |


## Triggers

_nenhum_


## Grants

_nenhum_
