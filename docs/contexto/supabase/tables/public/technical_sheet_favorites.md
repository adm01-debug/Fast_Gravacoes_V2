# public.technical_sheet_favorites

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
| 2 | `user_id` | `uuid` | sim |  |  |  |
| 3 | `technical_sheet_id` | `uuid` | sim |  |  |  |
| 4 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| technical_sheet_favorites_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| technical_sheet_favorites_technical_sheet_id_fkey | FOREIGN KEY | `FOREIGN KEY (technical_sheet_id) REFERENCES technical_sheets(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| technical_sheet_favorites_user_id_fkey | FOREIGN KEY | `FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| technical_sheet_favorites_user_id_technical_sheet_id_key | UNIQUE | `UNIQUE (user_id, technical_sheet_id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_technical_sheet_favorites_technical_sheet_id | btree | technical_sheet_id | não | sim |  | `CREATE INDEX idx_technical_sheet_favorites_technical_sheet_id ON public.technical_sheet_favorites USING btree (technical_sheet_id)` |
| technical_sheet_favorites_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX technical_sheet_favorites_pkey ON public.technical_sheet_favorites USING btree (id)` |
| technical_sheet_favorites_user_id_technical_sheet_id_key | btree | user_id, technical_sheet_id | sim | sim |  | `CREATE UNIQUE INDEX technical_sheet_favorites_user_id_technical_sheet_id_key ON public.technical_sheet_favorites USING btree (user_id, technical_sheet_id)` |


## Policies (RLS)

### `Users can manage their own favorites`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(( SELECT auth.uid() AS uid) = user_id)` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
