# public.operator_rankings

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
| 3 | `ranking_type` | `text` | não |  |  |  |
| 4 | `period_start` | `date` | não |  |  |  |
| 5 | `period_end` | `date` | não |  |  |  |
| 6 | `position` | `integer` | não |  |  |  |
| 7 | `total_points` | `integer` | não | `0` |  |  |
| 8 | `total_produced` | `integer` | não | `0` |  |  |
| 9 | `efficiency_rate` | `numeric` | sim | `0` |  |  |
| 10 | `quality_rate` | `numeric` | sim | `0` |  |  |
| 11 | `calculated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| operator_rankings_operator_id_ranking_type_period_start_per_key | UNIQUE | `UNIQUE (operator_id, ranking_type, period_start, period_end)` |  |  | sim |
| operator_rankings_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| operator_rankings_operator_id_ranking_type_period_start_per_key | btree | operator_id, ranking_type, period_start, period_end | sim | sim |  | `CREATE UNIQUE INDEX operator_rankings_operator_id_ranking_type_period_start_per_key ON public.operator_rankings USING btree (operator_id, ranking_type, period_start, period_end)` |
| operator_rankings_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX operator_rankings_pkey ON public.operator_rankings USING btree (id)` |


## Policies (RLS)

### `Authenticated users can view rankings`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `has_any_active_role()` |
| WITH CHECK |  |

### `Coordinators can manage rankings`

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
