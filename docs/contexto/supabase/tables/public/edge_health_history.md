# public.edge_health_history

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 1 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `status` | `text` | não |  |  |  |
| 3 | `checks` | `jsonb` | não | `'{}'::jsonb` |  |  |
| 4 | `latency_ms` | `integer` | sim |  |  |  |
| 5 | `source` | `text` | não | `'health-monitor'::text` |  |  |
| 6 | `captured_at` | `timestamp with time zone` | não | `now()` |  |  |
| 7 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| edge_health_history_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| edge_health_history_status_check | CHECK | `CHECK (status = ANY (ARRAY['pass'::text, 'warn'::text, 'fail'::text]))` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| edge_health_history_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX edge_health_history_pkey ON public.edge_health_history USING btree (id)` |
| idx_edge_health_history_captured_at | btree | captured_at | não | sim |  | `CREATE INDEX idx_edge_health_history_captured_at ON public.edge_health_history USING btree (captured_at DESC)` |


## Policies (RLS)

### `Coordinators and managers can view edge health`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(app_private.has_role(auth.uid(), 'coordinator'::app_role) OR app_private.has_role(auth.uid(), 'manager'::app_role))` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

_nenhum_
