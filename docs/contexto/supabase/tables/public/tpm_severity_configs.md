# public.tpm_severity_configs

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
| 3 | `severity` | `text` | não |  |  |  |
| 4 | `days_threshold` | `integer` | sim | `0` |  |  |
| 5 | `message_override` | `text` | sim |  |  |  |
| 6 | `is_enabled` | `boolean` | sim | `true` |  |  |
| 7 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 8 | `updated_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| tpm_severity_configs_machine_id_fkey | FOREIGN KEY | `FOREIGN KEY (machine_id) REFERENCES machines(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| tpm_severity_configs_machine_id_severity_key | UNIQUE | `UNIQUE (machine_id, severity)` |  |  | sim |
| tpm_severity_configs_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| tpm_severity_configs_severity_check | CHECK | `CHECK (severity = ANY (ARRAY['upcoming'::text, 'due'::text, 'overdue'::text, 'critical'::text]))` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| tpm_severity_configs_machine_id_severity_key | btree | machine_id, severity | sim | sim |  | `CREATE UNIQUE INDEX tpm_severity_configs_machine_id_severity_key ON public.tpm_severity_configs USING btree (machine_id, severity)` |
| tpm_severity_configs_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX tpm_severity_configs_pkey ON public.tpm_severity_configs USING btree (id)` |


## Policies (RLS)

### `Active roles can manage severity configs`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `has_any_active_role()` |
| WITH CHECK | `has_any_active_role()` |

### `Severity configs viewable by authenticated users`

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
