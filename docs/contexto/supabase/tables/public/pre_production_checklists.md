# public.pre_production_checklists

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 3 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `job_id` | `uuid` | não |  |  |  |
| 3 | `checked_by` | `uuid` | sim |  |  |  |
| 4 | `checked_by_name` | `text` | sim |  |  |  |
| 5 | `material_verified` | `boolean` | não | `false` |  |  |
| 6 | `color_verified` | `boolean` | não | `false` |  |  |
| 7 | `machine_clean` | `boolean` | não | `false` |  |  |
| 8 | `tools_ready` | `boolean` | não | `false` |  |  |
| 9 | `notes` | `text` | sim |  |  |  |
| 10 | `completed_at` | `timestamp with time zone` | sim |  |  |  |
| 11 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 12 | `squeegee_passes` | `text` | sim |  |  |  |
| 13 | `pressure` | `text` | sim |  |  |  |
| 14 | `speed` | `text` | sim |  |  |  |
| 15 | `temperature` | `text` | sim |  |  |  |
| 16 | `technical_sheet_version` | `integer` | sim |  |  |  |
| 17 | `consumables_confirmed` | `jsonb` | sim | `'[]'::jsonb` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| pre_production_checklists_job_id_fkey | FOREIGN KEY | `FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| pre_production_checklists_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_pre_production_checklists_job_id | btree | job_id | não | sim |  | `CREATE INDEX idx_pre_production_checklists_job_id ON public.pre_production_checklists USING btree (job_id)` |
| pre_production_checklists_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX pre_production_checklists_pkey ON public.pre_production_checklists USING btree (id)` |


## Policies (RLS)

### `Active roles can insert pre-prod checklists`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `has_any_active_role()` |

### `Active roles can update pre-prod checklists`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `has_any_active_role()` |
| WITH CHECK | `has_any_active_role()` |

### `Anyone can view checklists`

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
