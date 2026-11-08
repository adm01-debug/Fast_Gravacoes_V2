# public.new_device_alerts

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
| 3 | `device_id` | `uuid` | sim |  |  |  |
| 4 | `ip_address` | `inet` | sim |  |  |  |
| 5 | `user_agent` | `text` | sim |  |  |  |
| 6 | `email_sent` | `boolean` | não | `false` |  |  |
| 7 | `email_sent_at` | `timestamp with time zone` | sim |  |  |  |
| 8 | `acknowledged` | `boolean` | não | `false` |  |  |
| 9 | `acknowledged_at` | `timestamp with time zone` | sim |  |  |  |
| 10 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| new_device_alerts_device_id_fkey | FOREIGN KEY | `FOREIGN KEY (device_id) REFERENCES user_devices(id)` | NO ACTION | NO ACTION | sim |
| new_device_alerts_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_new_device_alerts_device_id | btree | device_id | não | sim |  | `CREATE INDEX idx_new_device_alerts_device_id ON public.new_device_alerts USING btree (device_id)` |
| new_device_alerts_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX new_device_alerts_pkey ON public.new_device_alerts USING btree (id)` |


## Policies (RLS)

### `Authenticated can insert device alerts`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `(( SELECT auth.uid() AS uid) = user_id)` |

### `Authenticated can update device alerts`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(( SELECT auth.uid() AS uid) = user_id)` |
| WITH CHECK |  |

### `Users can view their own alerts`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(( SELECT auth.uid() AS uid) = user_id)` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

_nenhum_
