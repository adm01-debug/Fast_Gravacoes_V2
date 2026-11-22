# public.technical_messages

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
| 2 | `conversation_id` | `uuid` | não |  |  |  |
| 3 | `role` | `text` | não |  |  |  |
| 4 | `content` | `text` | não |  |  |  |
| 5 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| technical_messages_conversation_id_fkey | FOREIGN KEY | `FOREIGN KEY (conversation_id) REFERENCES technical_conversations(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| technical_messages_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| technical_messages_role_check | CHECK | `CHECK (role = ANY (ARRAY['user'::text, 'assistant'::text]))` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_technical_messages_conversation | btree | conversation_id | não | sim |  | `CREATE INDEX idx_technical_messages_conversation ON public.technical_messages USING btree (conversation_id)` |
| technical_messages_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX technical_messages_pkey ON public.technical_messages USING btree (id)` |


## Policies (RLS)

### `Users can insert messages to their conversations`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | public |
| USING |  |
| WITH CHECK | `(EXISTS ( SELECT 1    FROM technical_conversations   WHERE ((technical_conversations.id = technical_messages.conversation_id) AND (technical_conversations.user_id = ( SELECT auth.uid() AS uid)))))` |

### `Users can view messages from their conversations`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(EXISTS ( SELECT 1    FROM technical_conversations   WHERE ((technical_conversations.id = technical_messages.conversation_id) AND (technical_conversations.user_id = ( SELECT auth.uid() AS uid)))))` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
