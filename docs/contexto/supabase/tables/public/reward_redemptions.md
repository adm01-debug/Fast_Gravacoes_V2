# public.reward_redemptions

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
| 2 | `user_id` | `uuid` | não |  |  |  |
| 3 | `reward_id` | `uuid` | não |  |  |  |
| 4 | `points_spent` | `integer` | não |  |  |  |
| 5 | `status` | `text` | sim | `'pending'::text` |  |  |
| 6 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| reward_redemptions_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| reward_redemptions_reward_id_fkey | FOREIGN KEY | `FOREIGN KEY (reward_id) REFERENCES gamification_rewards(id)` | NO ACTION | NO ACTION | sim |
| reward_redemptions_user_id_fkey | FOREIGN KEY | `FOREIGN KEY (user_id) REFERENCES auth.users(id)` | NO ACTION | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_reward_redemptions_reward_id | btree | reward_id | não | sim |  | `CREATE INDEX idx_reward_redemptions_reward_id ON public.reward_redemptions USING btree (reward_id)` |
| idx_reward_redemptions_user_id | btree | user_id | não | sim |  | `CREATE INDEX idx_reward_redemptions_user_id ON public.reward_redemptions USING btree (user_id)` |
| reward_redemptions_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX reward_redemptions_pkey ON public.reward_redemptions USING btree (id)` |


## Policies (RLS)

### `Users can create redemptions`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | public |
| USING |  |
| WITH CHECK | `(( SELECT auth.uid() AS uid) = user_id)` |

### `Users can view their redemptions`

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
