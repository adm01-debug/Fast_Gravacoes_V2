# public.shift_handover_checklist

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
| 2 | `handover_id` | `uuid` | não |  |  |  |
| 3 | `item_description` | `text` | não |  |  |  |
| 4 | `is_checked` | `boolean` | não | `false` |  |  |
| 5 | `checked_at` | `timestamp with time zone` | sim |  |  |  |
| 6 | `notes` | `text` | sim |  |  |  |
| 7 | `item_order` | `integer` | não | `0` |  |  |
| 8 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| shift_handover_checklist_handover_id_fkey | FOREIGN KEY | `FOREIGN KEY (handover_id) REFERENCES shift_handovers(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| shift_handover_checklist_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_shift_handover_checklist_handover_id | btree | handover_id | não | sim |  | `CREATE INDEX idx_shift_handover_checklist_handover_id ON public.shift_handover_checklist USING btree (handover_id)` |
| shift_handover_checklist_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX shift_handover_checklist_pkey ON public.shift_handover_checklist USING btree (id)` |


## Policies (RLS)

### `Active roles can manage handover checklist`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `has_any_active_role()` |
| WITH CHECK | `has_any_active_role()` |

### `Authenticated users can view checklist items`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `has_any_active_role()` |
| WITH CHECK |  |

### `Coordinators can manage shift handover checklist`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
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
