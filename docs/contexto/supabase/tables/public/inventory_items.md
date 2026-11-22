# public.inventory_items

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
| 2 | `name` | `text` | não |  |  |  |
| 3 | `category` | `text` | não |  |  |  |
| 4 | `current_stock` | `numeric` | não | `0` |  |  |
| 5 | `unit` | `text` | não |  |  |  |
| 6 | `min_stock_level` | `numeric` | não | `0` |  |  |
| 7 | `location` | `text` | sim |  |  |  |
| 8 | `specification` | `text` | sim |  |  |  |
| 9 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 10 | `updated_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 11 | `price_per_unit` | `numeric` | sim | `0` |  |  |
| 12 | `daily_usage_avg` | `numeric` | sim | `0` |  |  |
| 13 | `days_of_supply` | `integer` | sim | `0` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| check_positive_stock | CHECK | `CHECK (current_stock >= 0::numeric)` |  |  | sim |
| inventory_items_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| inventory_stock_positive | CHECK | `CHECK (current_stock >= 0::numeric)` |  |  | sim |
| stock_non_negative | CHECK | `CHECK (current_stock >= 0::numeric)` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.inventory_movements | inventory_movements_item_id_fkey | item_id | CASCADE |
| public.technical_sheet_materials | technical_sheet_materials_inventory_item_id_fkey | inventory_item_id | SET NULL |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| inventory_items_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX inventory_items_pkey ON public.inventory_items USING btree (id)` |


## Policies (RLS)

### `Active roles can view inventory items`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `has_any_active_role()` |
| WITH CHECK |  |

### `Inventory items managed by managers/coordinators`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(app_private.has_role(auth.uid(), 'admin'::app_role) OR app_private.has_role(auth.uid(), 'manager'::app_role) OR app_private.has_role(auth.uid(), 'coordinator'::app_role))` |
| WITH CHECK | `(app_private.has_role(auth.uid(), 'admin'::app_role) OR app_private.has_role(auth.uid(), 'manager'::app_role) OR app_private.has_role(auth.uid(), 'coordinator'::app_role))` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| tr_calculate_days_of_supply | BEFORE | INSERT OR UPDATE | ROW | enabled | public.calculate_days_of_supply |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
