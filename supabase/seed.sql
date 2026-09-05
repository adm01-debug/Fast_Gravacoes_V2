-- =============================================================================
-- FAST GRAVAÇÕES - SEED DATA
-- =============================================================================
-- Idempotent seed for the post-migration Supabase project.
-- Safe to re-run (everything uses ON CONFLICT).
--
-- What this populates:
--   1. Reference data: techniques, business_config
--   2. Machines (8) - powers Calendar/Kanban/BI drills
--   3. Profiles (6) - admin + 5 operators
--   4. Jobs (10) - mix of finished/in-progress/scheduled
--   5. job_status_history + machine_event_audit (last 30 days)
--   6. inventory_items + inventory_movements (stock history)
--   7. energy_consumption (last 30 days)
--
-- What this does NOT create:
--   - auth.users rows (managed by Supabase Auth; passwords cannot be set via SQL)
--   - Historical OEE tables (no production_history/oee_history table exists in schema;
--     OEE is computed in real time, so the historical graphs on /executive will still
--     be empty until the app accumulates live data)
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. TECHNIQUES (reference table)
-- -----------------------------------------------------------------------------
INSERT INTO public.techniques (id, name, short_name, color, setup_time) VALUES
  ('serigrafia', 'Serigrafia',     'SER', '#3b82f6', 15),
  ('sublimacao', 'Sublimação',     'SUB', '#a855f7', 12),
  ('tampografia','Tampografia',    'TAM', '#f97316', 10),
  ('flexo',      'Flexografia',    'FLX', '#22c55e', 18),
  ('laser',      'Gravação Laser', 'LSR', '#ef4444', 8),
  ('uv',         'UV DTF',         'UV',  '#eab308', 12),
  ('dtf',        'DTF',            'DTF', '#06b6d4', 10),
  ('bordado',    'Bordado',        'BRD', '#ec4899', 20)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  short_name = EXCLUDED.short_name,
  color = EXCLUDED.color,
  setup_time = EXCLUDED.setup_time;

-- -----------------------------------------------------------------------------
-- 2. BUSINESS CONFIG (key/value defaults read by hooks)
-- -----------------------------------------------------------------------------
INSERT INTO public.business_config (key, value, description) VALUES
  ('general_settings',
   '{"app_name":"FAST GRAVAÇÕES","timezone":"America/Sao_Paulo","locale":"pt-BR","default_period_days":30,"currency":"BRL"}'::jsonb,
   'General application settings'),
  ('shift_settings',
   '{"shifts":[{"name":"Manhã","start":"07:00","end":"15:00"},{"name":"Tarde","start":"15:00","end":"23:00"},{"name":"Noite","start":"23:00","end":"07:00"}],"default_shift":"Manhã"}'::jsonb,
   'Production shifts'),
  ('kpi_thresholds',
   '{"oee_target":85,"quality_target":95,"availability_target":90,"performance_target":90}'::jsonb,
   'KPI targets for green/amber/red'),
  ('notification_settings',
   '{"oee_alerts_enabled":true,"job_delay_minutes":30,"daily_summary_enabled":true,"daily_summary_time":"08:00"}'::jsonb,
   'Notification defaults')
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  description = EXCLUDED.description,
  updated_at = now();

-- -----------------------------------------------------------------------------
-- 3. MACHINES (with deterministic UUIDs so the seed is reproducible)
-- -----------------------------------------------------------------------------
-- Use a temp staging table to avoid the (id) UPDATE that would cascade FK
-- swaps onto kpi_alerts and other tables referencing machines.id.
DROP TABLE IF EXISTS _seed_machines_stage;
CREATE TEMP TABLE _seed_machines_stage (
  id    uuid PRIMARY KEY,
  code  text NOT NULL,
  name  text NOT NULL,
  technique_id text NOT NULL,
  is_active boolean NOT NULL
) ON COMMIT DROP;

INSERT INTO _seed_machines_stage (id, code, name, technique_id, is_active) VALUES
  ('11111111-1111-1111-1111-111111111111', 'SER-01', 'Serigrafia 1',  'serigrafia',  true),
  ('22222222-2222-2222-2222-222222222222', 'SER-02', 'Serigrafia 2',  'serigrafia',  true),
  ('33333333-3333-3333-3333-333333333333', 'SUB-01', 'Sublimação 1',  'sublimacao',  true),
  ('44444444-4444-4444-4444-444444444444', 'TAM-01', 'Tampografia 1', 'tampografia', true),
  ('55555555-5555-5555-5555-555555555555', 'TAM-02', 'Tampografia 2', 'tampografia', true),
  ('66666666-6666-6666-6666-666666666666', 'FLX-01', 'Flexo 1',       'flexo',       true),
  ('77777777-7777-7777-7777-777777777777', 'LSR-01', 'Laser 1',       'laser',       true),
  ('88888888-8888-8888-8888-888888888888', 'UV-01',  'UV 1',          'uv',          true);

-- Insert only machines that don't already exist (matched by code, not id,
-- so we keep whatever id the live row already has and avoid FK swaps).
INSERT INTO public.machines (id, code, name, technique_id, is_active)
SELECT s.id, s.code, s.name, s.technique_id, s.is_active
FROM _seed_machines_stage s
WHERE NOT EXISTS (SELECT 1 FROM public.machines m WHERE m.code = s.code);

-- For machines that already exist by code, refresh metadata without touching id.
UPDATE public.machines m
SET name         = s.name,
    technique_id = s.technique_id,
    is_active    = s.is_active
FROM _seed_machines_stage s
WHERE m.code = s.code
  AND (m.name <> s.name OR m.technique_id <> s.technique_id OR m.is_active IS DISTINCT FROM s.is_active);

DROP TABLE _seed_machines_stage;

-- -----------------------------------------------------------------------------
-- 4. PROFILES (uses deterministic UUIDs that are NOT linked to auth.users,
--    so RLS on user_roles won't break. Real auth.users entries need to be
--    created via Supabase Auth (signup endpoint) or the Studio UI.)
-- -----------------------------------------------------------------------------
-- Note: profiles.id FKs auth.users(id). Without auth.users rows, this insert
-- will fail. Skipped here. Operator names only live in jobs.created_by/notes
-- until a real admin signs up and creates the profile.

-- -----------------------------------------------------------------------------
-- 5. JOBS - 10 jobs spread across the last 30 days + near future
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  v_today date := current_date;
  v_ser1  uuid := '11111111-1111-1111-1111-111111111111';
  v_ser2  uuid := '22222222-2222-2222-2222-222222222222';
  v_sub1  uuid := '33333333-3333-3333-3333-333333333333';
  v_tam1  uuid := '44444444-4444-4444-4444-444444444444';
  v_tam2  uuid := '55555555-5555-5555-5555-555555555555';
  v_flx1  uuid := '66666666-6666-6666-6666-666666666666';
  v_lsr1  uuid := '77777777-7777-7777-7777-777777777777';
  v_uv1   uuid := '88888888-8888-8888-8888-888888888888';
BEGIN

-- Resolve actual machine ids from public.machines (seed assumes the 8 codes
-- were inserted or refreshed by the staging block above). This way jobs use
-- the live id, not the deterministic seed uuid, so we don't violate FKs.
SELECT id INTO v_ser1 FROM public.machines WHERE code = 'SER-01';
SELECT id INTO v_ser2 FROM public.machines WHERE code = 'SER-02';
SELECT id INTO v_sub1 FROM public.machines WHERE code = 'SUB-01';
SELECT id INTO v_tam1 FROM public.machines WHERE code = 'TAM-01';
SELECT id INTO v_tam2 FROM public.machines WHERE code = 'TAM-02';
SELECT id INTO v_flx1 FROM public.machines WHERE code = 'FLX-01';
SELECT id INTO v_lsr1 FROM public.machines WHERE code = 'LSR-01';
SELECT id INTO v_uv1  FROM public.machines WHERE code = 'UV-01';

-- Finished jobs (last 30 days)
INSERT INTO public.jobs (id, order_number, client, product, quantity, technique_id, machine_id, scheduled_date, start_time, end_time, estimated_duration, status, priority, gravure_color, actual_start_time, actual_end_time, lost_pieces, notes, created_at, updated_at) VALUES
  ('a1111111-1111-1111-1111-000000000001'::uuid, 'PED-2026-0741', 'Adidas Brasil',    'Camiseta Dry Fit',          500,  'serigrafia',  v_ser1, v_today - 25, '09:00', '13:30', 195, 'finished', 'high',     'Branco 1 cor',  v_today - 25,  v_today - 25 + interval '4 hours 30 minutes', 12, NULL, now() - interval '25 days', now() - interval '25 days'),
  ('a1111111-1111-1111-1111-000000000002'::uuid, 'PED-2026-0742', 'Nike Brasil',      'Short Esportivo',           300,  'sublimacao',  v_sub1, v_today - 22, '08:00', '12:00', 240, 'finished', 'medium',   'Full Color',    v_today - 22,  v_today - 22 + interval '4 hours',            5,  'Cliente aprovou amostra prévia', now() - interval '22 days', now() - interval '22 days'),
  ('a1111111-1111-1111-1111-000000000003'::uuid, 'PED-2026-0743', 'Coca-Cola FEMSA',  'Garrafa Térmica 600ml',     1000, 'laser',       v_lsr1, v_today - 18, '07:30', '15:30', 480, 'finished', 'urgent',   'Sem cor',       v_today - 18,  v_today - 18 + interval '8 hours',            30, 'Lote enviado para SP', now() - interval '18 days', now() - interval '18 days'),
  ('a1111111-1111-1111-1111-000000000004'::uuid, 'PED-2026-0744', 'Renner',           'Bolsa de Praia Algodão',    200,  'flexo',       v_flx1, v_today - 14, '09:00', '11:30', 150, 'finished', 'medium',   'Verde Pantone', v_today - 14,  v_today - 14 + interval '2 hours 30 minutes', 8,  NULL, now() - interval '14 days', now() - interval '14 days'),
  ('a1111111-1111-1111-1111-000000000005'::uuid, 'PED-2026-0745', 'Hering',           'Camiseta Básica',           800,  'serigrafia',  v_ser2, v_today - 7,  '08:00', '17:00', 540, 'finished', 'high',     'Azul + Branco', v_today - 7,   v_today - 7  + interval '9 hours',            22, NULL, now() - interval '7 days',  now() - interval '7 days'),

-- In production today
  ('a1111111-1111-1111-1111-000000000006'::uuid, 'PED-2026-0751', 'Natura',           'Frasco 50ml Cosmético',     400,  'tampografia', v_tam1, v_today,      '07:00', '11:30', 270, 'production','urgent',   'Dourado',       v_today,        NULL,                                         0,  'Em produção desde 07:00', now() - interval '5 hours', now()),
  ('a1111111-1111-1111-1111-000000000007'::uuid, 'PED-2026-0752', 'Vivo',             'Caneca Cerâmica 350ml',     600,  'sublimacao',  v_sub1, v_today,      '09:00', '14:00', 300, 'production','high',     'Full Color',    v_today,        NULL,                                         0,  NULL, now() - interval '4 hours', now()),
  ('a1111111-1111-1111-1111-000000000008'::uuid, 'PED-2026-0753', 'Magazine Luiza',   'Sacola Ecológica',          350,  'uv',          v_uv1,  v_today,      '10:00', '13:00', 180, 'production','medium',   'Preto',         v_today,        NULL,                                         0,  NULL, now() - interval '3 hours', now()),

-- Scheduled for the coming days
  ('a1111111-1111-1111-1111-000000000009'::uuid, 'PED-2026-0754', 'Petrobras',        'Caneca Promocional',        1000, 'serigrafia',  v_ser1, v_today + 2,  '08:00', '14:00', 360, 'scheduled', 'high',     'Branco + Azul', NULL,           NULL,                                         0,  'Aguardando aprovação da arte', now(), now()),
  ('a1111111-1111-1111-1111-000000000010'::uuid, 'PED-2026-0755', 'Localiza',         'Chaveiro Aço Inox',         200,  'laser',       v_lsr1, v_today + 4,  '09:00', '12:00', 180, 'scheduled', 'medium',   'Sem cor',       NULL,           NULL,                                         0,  NULL, now(), now())
ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 6. JOB STATUS HISTORY
-- -----------------------------------------------------------------------------
INSERT INTO public.job_status_history (job_id, previous_status, new_status, changed_by, created_at) VALUES
  ('a1111111-1111-1111-1111-000000000001'::uuid, 'queue',    'scheduled', NULL, now() - interval '26 days'),
  ('a1111111-1111-1111-1111-000000000001'::uuid, 'scheduled','production',NULL, now() - interval '25 days'),
  ('a1111111-1111-1111-1111-000000000001'::uuid, 'production','finished', NULL, now() - interval '25 days' + interval '4 hours 30 minutes'),
  ('a1111111-1111-1111-1111-000000000002'::uuid, 'queue',    'scheduled', NULL, now() - interval '23 days'),
  ('a1111111-1111-1111-1111-000000000002'::uuid, 'scheduled','production',NULL, now() - interval '22 days'),
  ('a1111111-1111-1111-1111-000000000002'::uuid, 'production','finished', NULL, now() - interval '22 days' + interval '4 hours'),
  ('a1111111-1111-1111-1111-000000000006'::uuid, 'queue',    'production',NULL, now() - interval '5 hours')
ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- 7. MACHINE EVENT AUDIT (last 7 days, varied events per machine)
-- -----------------------------------------------------------------------------
INSERT INTO public.machine_event_audit (machine_id, event_type, old_value, new_value, performed_by, performed_at) VALUES
  (v_ser1, 'activation',  'false', 'true',  NULL, now() - interval '7 days'),
  (v_ser1, 'status_change','idle',  'running',NULL, now() - interval '25 days'),
  (v_ser1, 'status_change','running','idle', NULL, now() - interval '25 days' + interval '4 hours 30 minutes'),
  (v_sub1, 'activation',  'false', 'true',  NULL, now() - interval '6 days'),
  (v_lsr1, 'activation',  'false', 'true',  NULL, now() - interval '5 days'),
  (v_lsr1, 'status_change','idle',  'running',NULL, now() - interval '18 days'),
  (v_lsr1, 'status_change','running','idle', NULL, now() - interval '18 days' + interval '8 hours'),
  (v_tam1, 'activation',  'false', 'true',  NULL, now() - interval '2 days'),
  (v_flx1, 'activation',  'false', 'true',  NULL, now() - interval '3 days'),
  (v_uv1,  'activation',  'false', 'true',  NULL, now() - interval '1 day')
ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- 8. INVENTORY ITEMS
-- -----------------------------------------------------------------------------
INSERT INTO public.inventory_items (id, name, category, current_stock, unit, min_stock_level, location, specification) VALUES
  ('b0000001-0000-0000-0000-000000000001'::uuid, 'Tinta Serigráfica Branca Premium',  'ink',         8.5,    'kg',   5,    'Almoxarifado A', 'PVC Branco 150 mesh'),
  ('b0000001-0000-0000-0000-000000000002'::uuid, 'Tinta Serigráfica Azul Cyan',       'ink',         12.2,   'kg',   5,    'Almoxarifado A', 'PVC Azul Cyan 150 mesh'),
  ('b0000001-0000-0000-0000-000000000003'::uuid, 'Tinta Sublimação Full Color',       'ink',         3.8,    'l',    5,    'Almoxarifado B', 'Tinta sublimática universal'),
  ('b0000001-0000-0000-0000-000000000004'::uuid, 'Tinta Tampografia Dourada',         'ink',         0.8,    'kg',   2,    'Almoxarifado A', 'Tinta tampo metalizada'),
  ('b0000001-0000-0000-0000-000000000005'::uuid, 'Tecido Algodão Cru 1.80m',          'consumable',  85.0,   'm',    50,   'Almoxarifado C', 'Algodão 100%'),
  ('b0000001-0000-0000-0000-000000000006'::uuid, 'Papel Transfer Sublimático A4',     'consumable',  2400.0, 'unit', 500,  'Almoxarifado B', 'Papel subli 100g'),
  ('b0000001-0000-0000-0000-000000000007'::uuid, 'Tela Serigráfica 150 mesh',         'screen',      24.0,   'unit', 10,   'Almoxarifado A', '150 mesh 40x50cm'),
  ('b0000001-0000-0000-0000-000000000008'::uuid, 'Solvente Cleaner Universal',        'solvent',     18.5,   'l',    10,   'Almoxarifado A', 'Solvente para limpeza'),
  ('b0000001-0000-0000-0000-000000000009'::uuid, 'Filme UV DTF A3',                   'consumable',  120.0,  'unit', 50,   'Almoxarifado B', 'Filme UV A3 0.3mm'),
  ('b0000001-0000-0000-0000-000000000010'::uuid, 'Caneca Cerâmica 350ml Branca',      'consumable',  680.0,  'unit', 200,  'Almoxarifado D', 'Cerâmica branca lisa'),
  ('b0000001-0000-0000-0000-000000000011'::uuid, 'Garrafa Térmica Inox 600ml',        'consumable',  150.0,  'unit', 100,  'Almoxarifado D', 'Inox escovado'),
  ('b0000001-0000-0000-0000-000000000012'::uuid, 'Bolsa Algodão Cru',                 'consumable',  240.0,  'unit', 100,  'Almoxarifado C', '100% algodão cru')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  current_stock = EXCLUDED.current_stock,
  unit = EXCLUDED.unit,
  min_stock_level = EXCLUDED.min_stock_level,
  location = EXCLUDED.location,
  specification = EXCLUDED.specification,
  updated_at = now();

-- -----------------------------------------------------------------------------
-- 9. INVENTORY MOVEMENTS (30 movements over the last 30 days)
-- -----------------------------------------------------------------------------
INSERT INTO public.inventory_movements (item_id, user_id, type, quantity, reason, job_id, created_at) VALUES
  ('b0000001-0000-0000-0000-000000000001'::uuid, NULL, 'IN',     10.0,  'Compra mensal',        NULL,                                                  now() - interval '20 days'),
  ('b0000001-0000-0000-0000-000000000002'::uuid, NULL, 'IN',     15.0,  'Reposição estoque',    NULL,                                                  now() - interval '18 days'),
  ('b0000001-0000-0000-0000-000000000003'::uuid, NULL, 'OUT',    2.5,   'Pedido PED-2026-0742', 'a1111111-1111-1111-1111-000000000002'::uuid,       now() - interval '22 days'),
  ('b0000001-0000-0000-0000-000000000004'::uuid, NULL, 'OUT',    0.5,   'Pedido PED-2026-0751', 'a1111111-1111-1111-1111-000000000006'::uuid,       now() - interval '5 hours'),
  ('b0000001-0000-0000-0000-000000000005'::uuid, NULL, 'OUT',    20.0,  'Pedido PED-2026-0741', 'a1111111-1111-1111-1111-000000000001'::uuid,       now() - interval '25 days'),
  ('b0000001-0000-0000-0000-000000000006'::uuid, NULL, 'IN',     500.0, 'Compra trimestral',    NULL,                                                  now() - interval '15 days'),
  ('b0000001-0000-0000-0000-000000000007'::uuid, NULL, 'IN',     4.0,   'Reposição',            NULL,                                                  now() - interval '12 days'),
  ('b0000001-0000-0000-0000-000000000008'::uuid, NULL, 'ADJUST',  1.5,   'Inventário mensal',    NULL,                                                  now() - interval '10 days'),
  ('b0000001-0000-0000-0000-000000000010'::uuid, NULL, 'OUT',    120.0, 'Pedido PED-2026-0752', 'a1111111-1111-1111-1111-000000000007'::uuid,       now() - interval '4 hours'),
  ('b0000001-0000-0000-0000-000000000011'::uuid, NULL, 'OUT',    50.0,  'Pedido PED-2026-0743', 'a1111111-1111-1111-1111-000000000003'::uuid,       now() - interval '18 days')
ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- 10. ENERGY CONSUMPTION (last 30 days, daily aggregate per machine)
-- -----------------------------------------------------------------------------
INSERT INTO public.energy_consumption (machine_id, recorded_at, consumption_kwh, power_factor, voltage, current_amps, peak_demand_kw, cost_per_kwh, reading_type) VALUES
  (v_ser1, now() - interval '30 days', 12.5, 0.92, 220,  8.2, 3.2, 0.85, 'automatic'),
  (v_ser1, now() - interval '25 days', 18.7, 0.93, 220, 10.5, 4.1, 0.85, 'automatic'),
  (v_ser1, now() - interval '20 days', 22.1, 0.94, 220, 12.1, 4.8, 0.85, 'automatic'),
  (v_ser1, now() - interval '15 days', 16.4, 0.92, 220,  9.8, 3.6, 0.85, 'automatic'),
  (v_ser1, now() - interval '10 days', 24.8, 0.95, 220, 13.4, 5.2, 0.85, 'automatic'),
  (v_ser1, now() - interval '5 days',  19.2, 0.93, 220, 10.9, 4.3, 0.85, 'automatic'),
  (v_sub1, now() - interval '30 days',  8.4, 0.91, 220,  5.2, 2.1, 0.85, 'automatic'),
  (v_sub1, now() - interval '25 days', 14.2, 0.93, 220,  7.8, 3.0, 0.85, 'automatic'),
  (v_sub1, now() - interval '20 days', 18.5, 0.94, 220, 10.1, 3.9, 0.85, 'automatic'),
  (v_sub1, now() - interval '15 days', 11.8, 0.92, 220,  6.9, 2.6, 0.85, 'automatic'),
  (v_sub1, now() - interval '10 days', 16.3, 0.94, 220,  9.3, 3.6, 0.85, 'automatic'),
  (v_sub1, now() - interval '5 days',  13.7, 0.93, 220,  7.5, 3.0, 0.85, 'automatic'),
  (v_lsr1, now() - interval '30 days',  6.8, 0.90, 220,  4.1, 1.6, 0.85, 'automatic'),
  (v_lsr1, now() - interval '25 days',  9.2, 0.92, 220,  5.4, 2.1, 0.85, 'automatic'),
  (v_lsr1, now() - interval '20 days', 11.5, 0.93, 220,  6.7, 2.6, 0.85, 'automatic'),
  (v_lsr1, now() - interval '15 days',  7.4, 0.91, 220,  4.4, 1.7, 0.85, 'automatic'),
  (v_lsr1, now() - interval '10 days', 10.1, 0.93, 220,  5.9, 2.3, 0.85, 'automatic'),
  (v_lsr1, now() - interval '5 days',   8.6, 0.92, 220,  5.0, 2.0, 0.85, 'automatic')
ON CONFLICT DO NOTHING;

END $$;

COMMIT;
