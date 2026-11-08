# public.audit_log

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
| 2 | `entity_type` | `text` | não |  |  |  |
| 3 | `entity_id` | `text` | não |  |  |  |
| 4 | `action` | `text` | não |  |  |  |
| 5 | `actor_id` | `uuid` | sim |  |  |  |
| 6 | `actor_email` | `text` | sim |  |  |  |
| 7 | `old_data` | `jsonb` | sim |  |  |  |
| 8 | `new_data` | `jsonb` | sim |  |  |  |
| 9 | `changed_fields` | `text[]` | sim |  |  |  |
| 10 | `hash` | `text` | sim |  |  |  |
| 11 | `previous_hash` | `text` | sim |  |  |  |
| 12 | `metadata` | `jsonb` | sim | `'{}'::jsonb` |  |  |
| 13 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| audit_log_action_check | CHECK | `CHECK (action = ANY (ARRAY['INSERT'::text, 'UPDATE'::text, 'DELETE'::text, 'CREATE'::text]))` |  |  | sim |
| audit_log_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| audit_log_actor_idx | btree | actor_id, created_at | não | sim |  | `CREATE INDEX audit_log_actor_idx ON public.audit_log USING btree (actor_id, created_at DESC)` |
| audit_log_created_idx | btree | created_at | não | sim |  | `CREATE INDEX audit_log_created_idx ON public.audit_log USING btree (created_at DESC)` |
| audit_log_entity_idx | btree | entity_type, entity_id, created_at | não | sim |  | `CREATE INDEX audit_log_entity_idx ON public.audit_log USING btree (entity_type, entity_id, created_at DESC)` |
| audit_log_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX audit_log_pkey ON public.audit_log USING btree (id)` |
| idx_audit_log_entity | btree | entity_type, entity_id, created_at | não | sim |  | `CREATE INDEX idx_audit_log_entity ON public.audit_log USING btree (entity_type, entity_id, created_at DESC)` |
| idx_audit_log_entity_created | btree | entity_type, entity_id, created_at | não | sim |  | `CREATE INDEX idx_audit_log_entity_created ON public.audit_log USING btree (entity_type, entity_id, created_at DESC)` |


## Policies (RLS)

### `Coordinators and managers can view audit log`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(app_private.has_role(( SELECT auth.uid() AS uid), 'coordinator'::app_role) OR app_private.has_role(( SELECT auth.uid() AS uid), 'manager'::app_role))` |
| WITH CHECK |  |

### `Deny all changes to audit logs`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | public |
| USING | `false` |
| WITH CHECK | `false` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| audit_log_no_delete | BEFORE | DELETE | ROW | enabled | public.audit_log_immutable |
| audit_log_no_update | BEFORE | UPDATE | ROW | enabled | public.audit_log_immutable |
| tr_audit_log_hashing | BEFORE | INSERT | ROW | enabled | public.process_audit_log_hashing |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
