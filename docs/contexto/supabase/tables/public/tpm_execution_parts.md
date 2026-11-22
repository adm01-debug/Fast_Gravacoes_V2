# public.tpm_execution_parts

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
| 2 | `execution_id` | `uuid` | sim |  |  |  |
| 3 | `part_name` | `text` | não |  |  |  |
| 4 | `part_code` | `text` | sim |  |  |  |
| 5 | `quantity` | `numeric` | sim | `1` |  |  |
| 6 | `unit` | `text` | sim | `'un'::text` |  |  |
| 7 | `cost` | `numeric` | sim |  |  |  |
| 8 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| tpm_execution_parts_execution_id_record_fkey | FOREIGN KEY | `FOREIGN KEY (execution_id) REFERENCES maintenance_records(id) ON DELETE CASCADE NOT VALID` | CASCADE | NO ACTION | não |
| tpm_execution_parts_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_tpm_execution_parts_execution_id | btree | execution_id | não | sim |  | `CREATE INDEX idx_tpm_execution_parts_execution_id ON public.tpm_execution_parts USING btree (execution_id)` |
| tpm_execution_parts_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX tpm_execution_parts_pkey ON public.tpm_execution_parts USING btree (id)` |


## Policies (RLS)

### `Active roles can manage tpm parts`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `has_any_active_role()` |
| WITH CHECK | `has_any_active_role()` |

### `Active roles can view tpm parts`

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
