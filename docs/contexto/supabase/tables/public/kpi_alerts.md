# public.kpi_alerts

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
| 2 | `machine_id` | `uuid` | sim |  |  |  |
| 3 | `metric_name` | `text` | não |  |  |  |
| 4 | `metric_value` | `double precision` | não |  |  |  |
| 5 | `threshold` | `double precision` | não |  |  |  |
| 6 | `severity` | `text` | sim |  |  |  |
| 7 | `is_resolved` | `boolean` | sim | `false` |  |  |
| 8 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| kpi_alerts_machine_id_fkey | FOREIGN KEY | `FOREIGN KEY (machine_id) REFERENCES machines(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| kpi_alerts_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| kpi_alerts_severity_check | CHECK | `CHECK (severity = ANY (ARRAY['WARNING'::text, 'CRITICAL'::text]))` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_kpi_alerts_machine_id | btree | machine_id | não | sim |  | `CREATE INDEX idx_kpi_alerts_machine_id ON public.kpi_alerts USING btree (machine_id)` |
| kpi_alerts_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX kpi_alerts_pkey ON public.kpi_alerts USING btree (id)` |


## Policies (RLS)

### `Admins can view all alerts`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(app_private.has_role(( SELECT auth.uid() AS uid), 'admin'::app_role) OR app_private.has_role(( SELECT auth.uid() AS uid), 'manager'::app_role))` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

_nenhum_
