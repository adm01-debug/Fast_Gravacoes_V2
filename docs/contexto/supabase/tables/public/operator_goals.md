# public.operator_goals

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
| 2 | `operator_id` | `uuid` | não |  |  |  |
| 3 | `goal_type` | `text` | não |  |  |  |
| 4 | `target_value` | `numeric` | não |  |  |  |
| 5 | `period_start` | `date` | não |  |  |  |
| 6 | `period_end` | `date` | não |  |  |  |
| 7 | `created_by` | `uuid` | sim |  |  |  |
| 8 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 9 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| operator_goals_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| valid_goal_type | CHECK | `CHECK (goal_type = ANY (ARRAY['efficiency'::text, 'jobs_completed'::text, 'pieces_produced'::text, 'loss_rate'::text]))` |  |  | sim |
| valid_period | CHECK | `CHECK (period_end >= period_start)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_operator_goals_operator_period | btree | operator_id, period_start, period_end | não | sim |  | `CREATE INDEX idx_operator_goals_operator_period ON public.operator_goals USING btree (operator_id, period_start, period_end)` |
| operator_goals_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX operator_goals_pkey ON public.operator_goals USING btree (id)` |


## Policies (RLS)

### `Authenticated users can view operator goals`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `has_any_active_role()` |
| WITH CHECK |  |

### `Coordinators can manage operator goals`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | public |
| USING | `app_private.has_role(( SELECT auth.uid() AS uid), 'coordinator'::app_role)` |
| WITH CHECK | `app_private.has_role(( SELECT auth.uid() AS uid), 'coordinator'::app_role)` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| update_operator_goals_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
