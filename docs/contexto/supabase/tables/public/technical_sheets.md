# public.technical_sheets

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
| 2 | `technique_id` | `text` | não |  |  |  |
| 3 | `product_category_id` | `uuid` | sim |  |  |  |
| 4 | `material_id` | `uuid` | sim |  |  |  |
| 5 | `title` | `text` | não |  |  |  |
| 6 | `description` | `text` | sim |  |  |  |
| 7 | `estimated_time_minutes` | `integer` | sim |  |  |  |
| 8 | `recommended_machine_id` | `uuid` | sim |  |  |  |
| 9 | `is_active` | `boolean` | não | `true` |  |  |
| 10 | `created_by` | `uuid` | sim |  |  |  |
| 11 | `updated_by` | `uuid` | sim |  |  |  |
| 12 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 13 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |
| 14 | `machine_settings` | `jsonb` | sim | `'{}'::jsonb` |  |  |
| 15 | `ink_specifications` | `text` | sim |  |  |  |
| 16 | `tooling_specifications` | `text` | sim |  |  |  |
| 17 | `version` | `integer` | sim | `1` |  |  |
| 18 | `settings_ranges` | `jsonb` | sim | `'{}'::jsonb` |  |  |
| 19 | `gap_specifications` | `text` | sim |  |  |  |
| 20 | `challenges_notes` | `text` | sim |  |  |  |
| 21 | `failure_scenarios` | `text` | sim |  |  |  |
| 22 | `quality_requirements` | `text` | sim |  |  |  |
| 23 | `quality_checklist` | `jsonb` | sim | `'[]'::jsonb` |  |  |
| 24 | `setup_instructions` | `text` | sim |  |  |  |
| 25 | `consumables` | `jsonb` | sim | `'[]'::jsonb` |  |  |
| 26 | `status` | `sheet_status` | sim | `'draft'::sheet_status` |  |  |
| 27 | `gold_standard_image_url` | `text` | sim |  |  |  |
| 28 | `failure_standard_image_url` | `text` | sim |  |  |  |
| 29 | `view_count` | `integer` | sim | `0` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| technical_sheets_created_by_fkey | FOREIGN KEY | `FOREIGN KEY (created_by) REFERENCES auth.users(id)` | NO ACTION | NO ACTION | sim |
| technical_sheets_material_id_fkey | FOREIGN KEY | `FOREIGN KEY (material_id) REFERENCES materials(id)` | NO ACTION | NO ACTION | sim |
| technical_sheets_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| technical_sheets_product_category_id_fkey | FOREIGN KEY | `FOREIGN KEY (product_category_id) REFERENCES product_categories(id)` | NO ACTION | NO ACTION | sim |
| technical_sheets_recommended_machine_id_fkey | FOREIGN KEY | `FOREIGN KEY (recommended_machine_id) REFERENCES machines(id)` | NO ACTION | NO ACTION | sim |
| technical_sheets_technique_id_fkey | FOREIGN KEY | `FOREIGN KEY (technique_id) REFERENCES techniques(id)` | NO ACTION | NO ACTION | sim |
| technical_sheets_updated_by_fkey | FOREIGN KEY | `FOREIGN KEY (updated_by) REFERENCES auth.users(id)` | NO ACTION | NO ACTION | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.maintenance_records | maintenance_records_technical_sheet_id_fkey | technical_sheet_id | NO ACTION |
| public.technical_documents | technical_documents_technical_sheet_id_fkey | technical_sheet_id | CASCADE |
| public.technical_sheet_audit | technical_sheet_audit_technical_sheet_id_fkey | technical_sheet_id | CASCADE |
| public.technical_sheet_audit_logs | technical_sheet_audit_logs_technical_sheet_id_fkey | technical_sheet_id | CASCADE |
| public.technical_sheet_favorites | technical_sheet_favorites_technical_sheet_id_fkey | technical_sheet_id | CASCADE |
| public.technical_sheet_materials | technical_sheet_materials_technical_sheet_id_fkey | technical_sheet_id | CASCADE |
| public.technical_sheet_steps | technical_sheet_steps_technical_sheet_id_fkey | technical_sheet_id | CASCADE |
| public.technical_sheet_tips | technical_sheet_tips_technical_sheet_id_fkey | technical_sheet_id | CASCADE |
| public.technical_sheet_versions | technical_sheet_versions_sheet_id_fkey | sheet_id | CASCADE |
| public.tpm_executions | tpm_executions_technical_sheet_id_fkey | technical_sheet_id | NO ACTION |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_technical_sheets_created_by | btree | created_by | não | sim |  | `CREATE INDEX idx_technical_sheets_created_by ON public.technical_sheets USING btree (created_by)` |
| idx_technical_sheets_material_id | btree | material_id | não | sim |  | `CREATE INDEX idx_technical_sheets_material_id ON public.technical_sheets USING btree (material_id)` |
| idx_technical_sheets_product_category_id | btree | product_category_id | não | sim |  | `CREATE INDEX idx_technical_sheets_product_category_id ON public.technical_sheets USING btree (product_category_id)` |
| idx_technical_sheets_recommended_machine_id | btree | recommended_machine_id | não | sim |  | `CREATE INDEX idx_technical_sheets_recommended_machine_id ON public.technical_sheets USING btree (recommended_machine_id)` |
| idx_technical_sheets_technique_id | btree | technique_id | não | sim |  | `CREATE INDEX idx_technical_sheets_technique_id ON public.technical_sheets USING btree (technique_id)` |
| idx_technical_sheets_updated_by | btree | updated_by | não | sim |  | `CREATE INDEX idx_technical_sheets_updated_by ON public.technical_sheets USING btree (updated_by)` |
| technical_sheets_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX technical_sheets_pkey ON public.technical_sheets USING btree (id)` |


## Policies (RLS)

### `Authenticated users can view technical sheets`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `has_any_active_role()` |
| WITH CHECK |  |

### `Coordinators can manage technical sheets`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | public |
| USING | `app_private.has_role(( SELECT auth.uid() AS uid), 'coordinator'::app_role)` |
| WITH CHECK | `app_private.has_role(( SELECT auth.uid() AS uid), 'coordinator'::app_role)` |

### `Role-based technical sheets visibility`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `((app_private.has_role(( SELECT auth.uid() AS uid), 'operator'::app_role) AND (status = 'published'::sheet_status)) OR app_private.has_role(( SELECT auth.uid() AS uid), 'coordinator'::app_role) OR app_private.has_role(( SELECT auth.uid() AS uid), 'manager'::app_role) OR app_private.has_role(( SELECT auth.uid() AS uid), 'admin'::app_role))` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| on_technical_sheet_save | AFTER | INSERT OR UPDATE | ROW | enabled | public.create_technical_sheet_version |
| tr_audit_technical_sheets | AFTER | INSERT OR DELETE OR UPDATE | ROW | enabled | public.audit_technical_sheet_changes |
| tr_increment_tech_sheet_version | BEFORE | UPDATE | ROW | enabled | public.increment_technical_sheet_version |
| tr_log_technical_sheet_changes | AFTER | INSERT OR DELETE OR UPDATE | ROW | enabled | public.log_technical_sheet_change |
| update_technical_sheets_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
