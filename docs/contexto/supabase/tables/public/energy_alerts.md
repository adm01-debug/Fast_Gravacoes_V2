# public.energy_alerts

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
| 2 | `machine_id` | `uuid` | sim |  |  |  |
| 3 | `alert_type` | `text` | não |  |  |  |
| 4 | `threshold_value` | `numeric` | não |  |  |  |
| 5 | `current_value` | `numeric` | não |  |  |  |
| 6 | `severity` | `text` | não | `'warning'::text` |  |  |
| 7 | `message` | `text` | não |  |  |  |
| 8 | `is_resolved` | `boolean` | não | `false` |  |  |
| 9 | `resolved_at` | `timestamp with time zone` | sim |  |  |  |
| 10 | `resolved_by` | `uuid` | sim |  |  |  |
| 11 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| energy_alerts_machine_id_fkey | FOREIGN KEY | `FOREIGN KEY (machine_id) REFERENCES machines(id)` | NO ACTION | NO ACTION | sim |
| energy_alerts_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| energy_alerts_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX energy_alerts_pkey ON public.energy_alerts USING btree (id)` |
| idx_energy_alerts_machine | btree | machine_id | não | sim |  | `CREATE INDEX idx_energy_alerts_machine ON public.energy_alerts USING btree (machine_id)` |
| idx_energy_alerts_resolved | btree | is_resolved | não | sim |  | `CREATE INDEX idx_energy_alerts_resolved ON public.energy_alerts USING btree (is_resolved)` |


## Policies (RLS)

### `Active roles can manage energy alerts`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `has_any_active_role()` |
| WITH CHECK | `has_any_active_role()` |

### `Authenticated users can view energy alerts`

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
