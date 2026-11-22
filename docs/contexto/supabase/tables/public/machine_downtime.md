# public.machine_downtime

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
| 2 | `machine_id` | `uuid` | não |  |  |  |
| 3 | `job_id` | `uuid` | sim |  |  |  |
| 4 | `downtime_type` | `text` | não |  |  |  |
| 5 | `start_time` | `timestamp with time zone` | não | `now()` |  |  |
| 6 | `end_time` | `timestamp with time zone` | sim |  |  |  |
| 7 | `reason` | `text` | sim |  |  |  |
| 8 | `operator_id` | `uuid` | sim |  |  |  |
| 9 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| machine_downtime_downtime_type_check | CHECK | `CHECK (downtime_type = ANY (ARRAY['setup'::text, 'maintenance'::text, 'breakdown'::text, 'idle'::text, 'other'::text]))` |  |  | sim |
| machine_downtime_job_id_fkey | FOREIGN KEY | `FOREIGN KEY (job_id) REFERENCES jobs(id)` | NO ACTION | NO ACTION | sim |
| machine_downtime_machine_id_fkey | FOREIGN KEY | `FOREIGN KEY (machine_id) REFERENCES machines(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| machine_downtime_operator_id_fkey | FOREIGN KEY | `FOREIGN KEY (operator_id) REFERENCES auth.users(id)` | NO ACTION | NO ACTION | sim |
| machine_downtime_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_machine_downtime_job_id | btree | job_id | não | sim |  | `CREATE INDEX idx_machine_downtime_job_id ON public.machine_downtime USING btree (job_id)` |
| idx_machine_downtime_machine_id | btree | machine_id | não | sim |  | `CREATE INDEX idx_machine_downtime_machine_id ON public.machine_downtime USING btree (machine_id)` |
| idx_machine_downtime_operator_id | btree | operator_id | não | sim |  | `CREATE INDEX idx_machine_downtime_operator_id ON public.machine_downtime USING btree (operator_id)` |
| machine_downtime_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX machine_downtime_pkey ON public.machine_downtime USING btree (id)` |


## Policies (RLS)

### `Active roles can manage machine downtime`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `has_any_active_role()` |
| WITH CHECK | `has_any_active_role()` |

### `Authenticated users can view machine downtime`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `has_any_active_role()` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
