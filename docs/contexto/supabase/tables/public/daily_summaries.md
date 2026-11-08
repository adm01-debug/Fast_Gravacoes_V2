# public.daily_summaries

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
| 2 | `date` | `date` | não |  |  |  |
| 3 | `summary_type` | `text` | não |  |  |  |
| 4 | `data` | `jsonb` | não | `'{}'::jsonb` |  |  |
| 5 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| daily_summaries_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| daily_summaries_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX daily_summaries_pkey ON public.daily_summaries USING btree (id)` |
| idx_daily_summaries_date_type | btree | date, summary_type | sim | sim |  | `CREATE UNIQUE INDEX idx_daily_summaries_date_type ON public.daily_summaries USING btree (date, summary_type)` |


## Policies (RLS)

### `Authenticated users can view summaries`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `has_any_active_role()` |
| WITH CHECK |  |

### `Coordinators can manage summaries`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(app_private.has_role(( SELECT auth.uid() AS uid), 'coordinator'::app_role) OR app_private.has_role(( SELECT auth.uid() AS uid), 'manager'::app_role))` |
| WITH CHECK | `(app_private.has_role(( SELECT auth.uid() AS uid), 'coordinator'::app_role) OR app_private.has_role(( SELECT auth.uid() AS uid), 'manager'::app_role))` |


## Triggers

_nenhum_


## Grants

_nenhum_
