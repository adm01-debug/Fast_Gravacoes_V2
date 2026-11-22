# public.lot_quality_inspections

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
| 2 | `lot_id` | `uuid` | não |  |  |  |
| 3 | `inspection_type` | `text` | não |  |  |  |
| 4 | `result` | `text` | não |  |  |  |
| 5 | `inspector_id` | `uuid` | sim |  |  |  |
| 6 | `inspector_name` | `text` | sim |  |  |  |
| 7 | `sample_size` | `integer` | sim |  |  |  |
| 8 | `defects_found` | `integer` | sim | `0` |  |  |
| 9 | `notes` | `text` | sim |  |  |  |
| 10 | `photos` | `text[]` | sim | `'{}'::text[]` |  |  |
| 11 | `inspected_at` | `timestamp with time zone` | não | `now()` |  |  |
| 12 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| lot_quality_inspections_lot_id_fkey | FOREIGN KEY | `FOREIGN KEY (lot_id) REFERENCES production_lots(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| lot_quality_inspections_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_lot_quality_inspections_lot_id | btree | lot_id | não | sim |  | `CREATE INDEX idx_lot_quality_inspections_lot_id ON public.lot_quality_inspections USING btree (lot_id)` |
| lot_quality_inspections_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX lot_quality_inspections_pkey ON public.lot_quality_inspections USING btree (id)` |


## Policies (RLS)

### `Active roles can manage inspections`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `has_any_active_role()` |
| WITH CHECK | `has_any_active_role()` |

### `Authenticated users can view quality inspections`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `has_any_active_role()` |
| WITH CHECK |  |

### `Coordinators can manage quality inspections`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `app_private.has_role(( SELECT auth.uid() AS uid), 'coordinator'::app_role)` |
| WITH CHECK | `app_private.has_role(( SELECT auth.uid() AS uid), 'coordinator'::app_role)` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| audit_lot_quality_inspections | AFTER | INSERT OR DELETE OR UPDATE | ROW | enabled | public.audit_trigger_func |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
