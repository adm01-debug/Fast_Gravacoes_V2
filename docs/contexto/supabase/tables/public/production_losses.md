# public.production_losses

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
| 2 | `job_id` | `uuid` | não |  |  |  |
| 3 | `quantity` | `integer` | não | `1` |  |  |
| 4 | `operator_id` | `uuid` | sim |  |  |  |
| 5 | `notes` | `text` | sim |  |  |  |
| 6 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 7 | `shift` | `text` | sim |  |  |  |
| 8 | `loss_type` | `text` | sim | `'availability'::text` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| production_losses_job_id_fkey | FOREIGN KEY | `FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| production_losses_loss_type_check | CHECK | `CHECK (loss_type = ANY (ARRAY['availability'::text, 'performance'::text, 'quality'::text]))` |  |  | sim |
| production_losses_operator_id_fkey | FOREIGN KEY | `FOREIGN KEY (operator_id) REFERENCES auth.users(id)` | NO ACTION | NO ACTION | sim |
| production_losses_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| production_losses_quantity_positive | CHECK | `CHECK (quantity >= 0)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_production_losses_job_id | btree | job_id | não | sim |  | `CREATE INDEX idx_production_losses_job_id ON public.production_losses USING btree (job_id)` |
| idx_production_losses_operator_id | btree | operator_id | não | sim |  | `CREATE INDEX idx_production_losses_operator_id ON public.production_losses USING btree (operator_id)` |
| production_losses_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX production_losses_pkey ON public.production_losses USING btree (id)` |


## Policies (RLS)

### `Active roles can insert losses`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `has_any_active_role()` |

### `Authenticated users can view production losses`

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

_nenhum_
