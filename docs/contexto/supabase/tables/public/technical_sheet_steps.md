# public.technical_sheet_steps

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
| 2 | `technical_sheet_id` | `uuid` | não |  |  |  |
| 3 | `step_number` | `integer` | não |  |  |  |
| 4 | `title` | `text` | não |  |  |  |
| 5 | `description` | `text` | não |  |  |  |
| 6 | `tips` | `text` | sim |  |  |  |
| 7 | `warnings` | `text` | sim |  |  |  |
| 8 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| technical_sheet_steps_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| technical_sheet_steps_technical_sheet_id_fkey | FOREIGN KEY | `FOREIGN KEY (technical_sheet_id) REFERENCES technical_sheets(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_technical_sheet_steps_technical_sheet_id | btree | technical_sheet_id | não | sim |  | `CREATE INDEX idx_technical_sheet_steps_technical_sheet_id ON public.technical_sheet_steps USING btree (technical_sheet_id)` |
| technical_sheet_steps_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX technical_sheet_steps_pkey ON public.technical_sheet_steps USING btree (id)` |


## Policies (RLS)

### `Authenticated users can view technical sheet steps`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `has_any_active_role()` |
| WITH CHECK |  |

### `Coordinators can manage sheet steps`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | public |
| USING | `app_private.has_role(( SELECT auth.uid() AS uid), 'coordinator'::app_role)` |
| WITH CHECK | `app_private.has_role(( SELECT auth.uid() AS uid), 'coordinator'::app_role)` |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
