# public.user_notification_settings

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
| 2 | `user_id` | `uuid` | não |  |  |  |
| 3 | `email_enabled` | `boolean` | sim | `true` |  |  |
| 4 | `push_enabled` | `boolean` | sim | `true` |  |  |
| 5 | `whatsapp_enabled` | `boolean` | sim | `false` |  |  |
| 6 | `whatsapp_number` | `text` | sim |  |  |  |
| 7 | `notification_types` | `text[]` | sim | `ARRAY['upcoming'::text, 'due'::text, 'overdue'::text, 'critical'::text]` |  |  |
| 8 | `machine_filters` | `uuid[]` | sim | `ARRAY[]::uuid[]` |  |  |
| 9 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 10 | `updated_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 11 | `event_configs` | `jsonb` | sim | `'{"awaiting_correction": {"email": true, "in_app": true}, "critical_item_approved": {"email": false, "in_app": true}}'::jsonb` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| user_notification_settings_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| user_notification_settings_user_id_fkey | FOREIGN KEY | `FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| user_notification_settings_user_id_key | UNIQUE | `UNIQUE (user_id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| user_notification_settings_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX user_notification_settings_pkey ON public.user_notification_settings USING btree (id)` |
| user_notification_settings_user_id_key | btree | user_id | sim | sim |  | `CREATE UNIQUE INDEX user_notification_settings_user_id_key ON public.user_notification_settings USING btree (user_id)` |


## Policies (RLS)

### `Users can insert their own settings`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | public |
| USING |  |
| WITH CHECK | `(( SELECT auth.uid() AS uid) = user_id)` |

### `Users can update their own settings`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(( SELECT auth.uid() AS uid) = user_id)` |
| WITH CHECK |  |

### `Users can view their own settings`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(( SELECT auth.uid() AS uid) = user_id)` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| update_user_notification_settings_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

_nenhum_
