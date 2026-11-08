# public.qr_scan_history

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
| 3 | `operator_id` | `uuid` | não |  |  |  |
| 4 | `action` | `text` | não |  |  |  |
| 5 | `scanned_at` | `timestamp with time zone` | não | `now()` |  |  |
| 6 | `device_info` | `text` | sim |  |  |  |
| 7 | `notes` | `text` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| qr_scan_history_job_id_fkey | FOREIGN KEY | `FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| qr_scan_history_operator_id_fkey | FOREIGN KEY | `FOREIGN KEY (operator_id) REFERENCES auth.users(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| qr_scan_history_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_qr_scan_history_job_id | btree | job_id | não | sim |  | `CREATE INDEX idx_qr_scan_history_job_id ON public.qr_scan_history USING btree (job_id)` |
| idx_qr_scan_history_operator_id | btree | operator_id | não | sim |  | `CREATE INDEX idx_qr_scan_history_operator_id ON public.qr_scan_history USING btree (operator_id)` |
| idx_qr_scan_history_scanned_at_desc | btree | scanned_at | não | sim |  | `CREATE INDEX idx_qr_scan_history_scanned_at_desc ON public.qr_scan_history USING btree (scanned_at DESC)` |
| qr_scan_history_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX qr_scan_history_pkey ON public.qr_scan_history USING btree (id)` |


## Policies (RLS)

### `Authenticated users can view scan history`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `has_any_active_role()` |
| WITH CHECK |  |

### `Users can insert their own scans`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `(( SELECT auth.uid() AS uid) = operator_id)` |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
