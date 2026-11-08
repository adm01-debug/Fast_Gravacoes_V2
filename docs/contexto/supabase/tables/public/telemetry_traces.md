# public.telemetry_traces

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
| 2 | `trace_id` | `text` | não |  |  |  |
| 3 | `span_id` | `text` | não |  |  |  |
| 4 | `parent_span_id` | `text` | sim |  |  |  |
| 5 | `name` | `text` | não |  |  |  |
| 6 | `service_name` | `text` | não |  |  |  |
| 7 | `duration_ms` | `numeric` | sim |  |  |  |
| 8 | `status` | `text` | sim |  |  |  |
| 9 | `attributes` | `jsonb` | sim |  |  |  |
| 10 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| telemetry_traces_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_telemetry_traces_created_at | btree | created_at | não | sim |  | `CREATE INDEX idx_telemetry_traces_created_at ON public.telemetry_traces USING btree (created_at DESC)` |
| idx_telemetry_traces_service_created | btree | service_name, created_at | não | sim |  | `CREATE INDEX idx_telemetry_traces_service_created ON public.telemetry_traces USING btree (service_name, created_at DESC)` |
| idx_telemetry_traces_trace_id | btree | trace_id | não | sim |  | `CREATE INDEX idx_telemetry_traces_trace_id ON public.telemetry_traces USING btree (trace_id)` |
| telemetry_traces_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX telemetry_traces_pkey ON public.telemetry_traces USING btree (id)` |


## Policies (RLS)

### `Apenas administradores veem traces`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `app_private.has_role(( SELECT auth.uid() AS uid), 'manager'::app_role)` |
| WITH CHECK |  |

### `Authenticated users can insert traces`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `(( SELECT auth.uid() AS uid) IS NOT NULL)` |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
