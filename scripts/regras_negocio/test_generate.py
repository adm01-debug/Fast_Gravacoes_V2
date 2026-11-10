"""Regressões offline do gerador de regras; não acessam banco nem APIs de LLM."""
from __future__ import annotations

import importlib.util
import json
import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


SCRIPT = Path(__file__).with_name("generate.py")
SPEC = importlib.util.spec_from_file_location("context_rules_generate", SCRIPT)
generator = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(generator)


class CurrentSqlSourcesTests(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory(prefix="context-rules-")
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name)
        self.files = []

    def write(self, name, content):
        file = self.root / name
        file.parent.mkdir(parents=True, exist_ok=True)
        file.write_text(content, encoding="utf-8")
        self.files.append(file)
        return file

    def schema(self):
        return generator.parse_sql_schema(self.root, self.files)

    def test_foreign_migration_cannot_replace_current_table(self):
        current = "supabase/migrations/20260101000000_orders.sql"
        self.write(current, "CREATE TABLE public.orders (id uuid, created_at timestamptz);")
        self.write("supabase/migrations/_foreign/another-project/20250101000000_orders.sql",
                   "CREATE TABLE public.orders (id uuid, changed_at timestamptz);")
        schema = self.schema()
        self.assertEqual([c["name"] for c in schema["tables"]["orders"]["columns"]], ["id", "created_at"])
        self.assertEqual(schema["tables"]["orders"]["src"], current)
        self.assertEqual(schema["sources"], [current])

    def test_superseded_migration_cannot_undo_current_changes(self):
        self.write("supabase/migrations/20260101000000_orders.sql", "CREATE TABLE public.orders (id uuid);")
        self.write("supabase/migrations/20260102000000_status.sql", "ALTER TABLE public.orders ADD COLUMN status text;")
        self.write("supabase/migrations/_superseded/20250101000000_orders.sql", "DROP TABLE public.orders;")
        schema = self.schema()
        self.assertIn("orders", schema["tables"])
        self.assertEqual([c["name"] for c in schema["tables"]["orders"]["columns"]], ["id", "status"])
        self.assertEqual(len(schema["sources"]), 2)

    def test_archived_objects_do_not_contribute_to_schema_or_rules(self):
        sql = """
CREATE TYPE order_state AS ENUM ('open', 'done');
CREATE TABLE public.orders (id uuid PRIMARY KEY, status order_state DEFAULT 'open', amount numeric CHECK (amount >= 0));
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY orders_select ON public.orders FOR SELECT TO authenticated USING (true);
CREATE FUNCTION public.ensure_order() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'amount cannot be negative';
  RETURN NEW;
END;
$$;
CREATE TRIGGER ensure_order_before BEFORE INSERT ON public.orders FOR EACH ROW EXECUTE FUNCTION public.ensure_order();
CREATE INDEX orders_status ON public.orders (status);
CREATE VIEW public.open_orders AS SELECT * FROM public.orders;
GRANT SELECT ON public.orders TO authenticated;
COMMENT ON TABLE public.orders IS 'Current orders';
SELECT cron.schedule('daily_orders', '0 0 * * *', $$SELECT 1$$);
"""
        self.write("supabase/migrations/20260101000000_orders.sql", sql)
        self.write("supabase/seed.sql", "INSERT INTO public.orders (id) VALUES ('current');")
        expected = self.schema()
        for key in ("tables", "policies", "triggers", "functions", "enums", "indexes", "cron_jobs",
                    "views", "rls", "grants", "raises", "seed", "comments"):
            self.assertTrue(expected[key], key)
        self.write("supabase/migrations/_foreign/old-project/20240101000000_schema.sql",
                   sql.replace("orders", "foreign_orders").replace("order_state", "foreign_state").replace("ensure_order", "ensure_foreign"))
        self.write("supabase/migrations/_superseded/20240102000000_seed.sql", "INSERT INTO public.orders (id) VALUES ('historical');")
        self.assertEqual(self.schema(), expected)

    def test_archive_only_repository_has_no_current_sql_schema(self):
        self.write("db/migrations/_foreign/old.sql", "CREATE TABLE old_foreign (id uuid);")
        self.write("db/migrations/_superseded/old.sql", "CREATE TABLE old_superseded (id uuid);")
        schema = self.schema()
        self.assertEqual(schema["sources"], [])
        self.assertEqual(schema["tables"], {})

    def test_exact_directory_names_leave_other_sql_sources_visible(self):
        # O nome de um diretório acima da raiz do repo não muda seu significado.
        self.root = self.root / "_foreign" / "project"
        paths = [
            "supabase/migrations/_foreign.sql",
            "supabase/migrations/_superseded.sql",
            "supabase/migrations/customer_foreign/active.sql",
            "supabase/migrations/_superseded_backup/active.sql",
            "packages/store/prisma/migrations/20260101/active.sql",
            "db/current.sql",
            "sql/current.sql",
            "database/current.sql",
            "prisma/current.sql",
            "custom/schema.sql",
        ]
        for index, name in enumerate(paths):
            self.write(name, f"CREATE TABLE current_{index} (id uuid);")
        schema = self.schema()
        self.assertEqual(schema["sources"], sorted(paths))
        self.assertEqual(set(schema["tables"]), {f"current_{i}" for i in range(len(paths))})

    def test_current_prisma_and_types_fallback_remain_available(self):
        self.write("prisma/schema.prisma", "model Store {\n id String @id\n}\n")
        self.write("src/database.types.ts", """
export type Database = {
  public: {
    Tables: {
      customers: {
        Row: {
          id: string
        }
      }
    }
  }
}
""")
        schema = self.schema()
        self.assertEqual(set(schema["tables"]), {"Store", "customers"})
        self.assertEqual(schema["tables"]["Store"]["origin"], "prisma")
        self.assertEqual(schema["tables"]["customers"]["origin"], "types.ts")

    def test_archived_sql_is_not_current_code_but_remains_in_file_inventory(self):
        current = self.write("supabase/migrations/20260101000000_retention.sql", "SELECT now() - interval '7 days';")
        archived = self.write("supabase/migrations/_superseded/20250101000000_retention.sql", "SELECT now() - interval '365 days';")
        self.assertTrue(generator.analyze_code_file(current, self.root)["temporal"])
        self.assertIsNone(generator.analyze_code_file(archived, self.root))
        files = generator.walk_repo(self.root, self.root / "output")
        self.assertEqual(set(files), {current, archived})

    def test_cli_rules_profile_uses_current_schema_and_temporal_rules(self):
        current = "supabase/migrations/20260101000000_orders.sql"
        archived = "supabase/migrations/_superseded/20250101000000_orders.sql"
        self.write(current, "CREATE TABLE public.orders (id uuid, created_at timestamptz);\nSELECT now() - interval '7 days';")
        self.write(archived, "CREATE TABLE public.orders (id uuid, historical_status text);\nSELECT now() - interval '365 days';")
        subprocess.run([sys.executable, str(SCRIPT), "--repo", str(self.root), "--out", "output",
                        "--profile", "regras", "--no-pointer"], check=True, capture_output=True, text=True, timeout=30)
        context = json.loads((self.root / "output/context.json").read_text(encoding="utf-8"))
        self.assertEqual(context["schema"]["sources"], [current])
        self.assertEqual([c["name"] for c in context["schema"]["tables"]["orders"]["columns"]], ["id", "created_at"])
        self.assertEqual(context["rules"]["temporal"], [{"file": current, "line": "SELECT now() - interval '7 days';"}])
        self.assertIn(current, context["code_files"])
        self.assertNotIn(archived, context["code_files"])
        self.assertEqual(context["meta"]["files_total"], 2)
        rendered = (self.root / "output/07-REGRAS-DE-NEGOCIO.md").read_text(encoding="utf-8")
        self.assertIn("7 days", rendered)
        self.assertNotIn("365 days", rendered)
        self.assertNotIn("historical_status", rendered)
        self.assertFalse((self.root / "AGENTS.md").exists())


MIG = "supabase/migrations/"
BASE_TABLE = ("CREATE TABLE public.t (id uuid primary key, owner uuid, status text);\n"
              "ALTER TABLE public.t ENABLE ROW LEVEL SECURITY;\n")


class RepoFixture(unittest.TestCase):
    """Repo mínimo em tempdir; `schema()` reconstrói em memória e `cli()` roda o gerador como o CI."""

    def setUp(self):
        temporary = tempfile.TemporaryDirectory(prefix="context-rules-")
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name)
        self.files = []

    def write(self, name, content):
        file = self.root / name
        file.parent.mkdir(parents=True, exist_ok=True)
        file.write_text(content, encoding="utf-8")
        self.files.append(file)
        return file

    def schema(self):
        return generator.parse_sql_schema(self.root, self.files)

    def cli(self, *extra, check=True):
        result = subprocess.run([sys.executable, "-B", str(SCRIPT), "--repo", str(self.root), "--out", "output",
                                 "--profile", "regras", "--no-pointer", *extra], capture_output=True, text=True, timeout=60)
        if check:
            self.assertEqual(result.returncode, 0, result.stderr)
        return result

    def out(self, name):
        return (self.root / "output" / name).read_text(encoding="utf-8")

    def out_json(self, name):
        return json.loads(self.out(name))

    def section(self, doc, start, end):
        text = self.out(doc)
        return text[text.index(start):text.index(end)]


class PolicyParsingTests(RepoFixture):
    def test_using_and_with_check_stay_in_their_own_clauses(self):
        self.write(MIG + "1.sql", BASE_TABLE +
                   'CREATE POLICY "upd" ON public.t FOR UPDATE TO authenticated USING (owner = auth.uid()) WITH CHECK (status <> \'locked\');\n'
                   'CREATE POLICY "ins" ON public.t FOR INSERT WITH CHECK (owner = auth.uid());\n'
                   'CREATE POLICY "sel" ON public.t FOR SELECT USING (true);\n')
        policies = {p["name"]: p for p in self.schema()["policies"]}
        self.assertEqual(policies["upd"]["using"], "owner = auth.uid()")
        self.assertEqual(policies["upd"]["check"], "status <> 'locked'")
        self.assertEqual((policies["ins"]["using"], policies["ins"]["check"]), ("", "owner = auth.uid()"))
        self.assertEqual((policies["sel"]["using"], policies["sel"]["check"]), ("true", ""))
        self.assertEqual({n: p["cmd"] for n, p in policies.items()}, {"upd": "UPDATE", "ins": "INSERT", "sel": "SELECT"})
        self.assertEqual(policies["upd"]["roles"], "authenticated")

    def test_restrictive_mode_and_full_expression_are_kept(self):
        long_expr = " OR ".join(f"owner = '{i:036d}'::uuid" for i in range(12))  # > 300 chars
        self.write(MIG + "1.sql", BASE_TABLE +
                   f'CREATE POLICY "long" ON public.t FOR SELECT USING ({long_expr});\n'
                   "CREATE POLICY aal2 ON public.t AS RESTRICTIVE FOR DELETE TO authenticated USING ((auth.jwt() ->> 'aal') = 'aal2');\n")
        policies = {p["name"]: p for p in self.schema()["policies"]}
        self.assertEqual(policies["aal2"]["mode"], "restrictive")
        self.assertEqual(policies["long"]["mode"], "permissive")
        self.assertGreater(len(long_expr), 300)
        self.assertEqual(policies["long"]["using"], long_expr)

    def test_drop_policy_removes_only_the_named_policy(self):
        self.write(MIG + "1.sql", BASE_TABLE + 'CREATE POLICY "a" ON public.t FOR SELECT USING (true);\n'
                                               'CREATE POLICY "b" ON public.t FOR SELECT USING (false);\n')
        self.write(MIG + "2.sql", 'DROP POLICY IF EXISTS "a" ON public.t;')
        self.assertEqual([p["name"] for p in self.schema()["policies"]], ["b"])

    def test_alter_policy_changes_only_given_clauses_and_renames(self):
        self.write(MIG + "1.sql", BASE_TABLE + 'CREATE POLICY "p" ON public.t FOR UPDATE TO authenticated USING (true) WITH CHECK (true);\n')
        self.write(MIG + "2.sql", 'ALTER POLICY "p" ON public.t USING (owner = (select auth.uid()));\n')
        policy = self.schema()["policies"][0]
        self.assertEqual((policy["using"], policy["check"], policy["roles"], policy["cmd"]),
                         ("owner = (select auth.uid())", "true", "authenticated", "UPDATE"))
        self.write(MIG + "3.sql", 'ALTER POLICY "p" ON public.t TO anon WITH CHECK (false);\nALTER POLICY "p" ON public.t RENAME TO "q";\n')
        policy = self.schema()["policies"][0]
        self.assertEqual((policy["name"], policy["roles"], policy["using"], policy["check"]),
                         ("q", "anon", "owner = (select auth.uid())", "false"))

    def test_row_level_security_state_follows_the_last_statement(self):
        self.write(MIG + "1.sql", "CREATE TABLE public.on_ (id int);\nCREATE TABLE public.off_ (id int);\nCREATE TABLE public.forced_ (id int);\n"
                                  "CREATE TABLE public.never_ (id int);\n"
                                  "ALTER TABLE public.on_ ENABLE ROW LEVEL SECURITY;\n"
                                  "ALTER TABLE public.off_ ENABLE ROW LEVEL SECURITY;\nALTER TABLE public.off_ DISABLE ROW LEVEL SECURITY;\n"
                                  "ALTER TABLE public.forced_ ENABLE ROW LEVEL SECURITY, FORCE ROW LEVEL SECURITY;\n")
        self.assertEqual(self.schema()["rls"], {"on_": "enabled", "off_": "disabled", "forced_": "forced"})


class MigrationReplayTests(RepoFixture):
    def test_drop_table_purges_dependents_and_types_file_cannot_resurrect_it(self):
        self.write(MIG + "1.sql", BASE_TABLE + "CREATE TABLE public.keep (id int);\nCREATE TABLE public.b (id int);\n"
                   'CREATE POLICY "p" ON public.t FOR SELECT USING (true);\n'
                   "CREATE FUNCTION f() RETURNS trigger LANGUAGE plpgsql AS $$ begin return new; end $$;\n"
                   "CREATE TRIGGER tg BEFORE INSERT ON public.t FOR EACH ROW EXECUTE FUNCTION f();\n"
                   "CREATE INDEX i ON public.t (status);\n")
        self.write(MIG + "2.sql", "DROP TABLE IF EXISTS public.t, b CASCADE;\nALTER PUBLICATION supabase_realtime DROP TABLE public.keep;\n")
        self.write("src/integrations/supabase/types.ts",
                   "export type Database = {\n  public: {\n    Tables: {\n      t: {\n        Row: {\n          id: string\n        }\n      }\n"
                   "      keep: {\n        Row: {\n          id: number\n        }\n      }\n    }\n  }\n}\n")
        schema = self.schema()
        self.assertEqual(set(schema["tables"]), {"keep"})
        self.assertEqual((schema["policies"], schema["triggers"], schema["indexes"], schema["rls"]), ([], [], [], {}))

    def test_migration_with_seed_in_its_name_still_applies_ddl(self):
        self.write(MIG + "1.sql", BASE_TABLE)
        self.write(MIG + "20261001143300_seed_price_per_piece.sql",
                   'CREATE POLICY "ins" ON public.t FOR INSERT TO authenticated WITH CHECK (true);\n'
                   "INSERT INTO public.t (id, status) VALUES ('1', 'a');\n")
        self.write("supabase/seed.sql", "CREATE TABLE public.from_seed_file (id int);\nINSERT INTO public.t (id) VALUES ('2');\n")
        schema = self.schema()
        self.assertEqual([(p["name"], p["cmd"]) for p in schema["policies"]], [("ins", "INSERT")])
        self.assertNotIn("from_seed_file", schema["tables"])
        self.assertEqual(sorted(s["src"] for s in schema["seed"]), [MIG + "20261001143300_seed_price_per_piece.sql", "supabase/seed.sql"])

    def test_do_block_static_ddl_is_applied_and_dynamic_ddl_is_reported(self):
        self.write(MIG + "1.sql", BASE_TABLE + 'CREATE POLICY "old" ON public.t FOR SELECT USING (true);\n'
                   "CREATE FUNCTION f() RETURNS trigger LANGUAGE plpgsql AS $$ begin return new; end $$;\n"
                   "DO $$\nBEGIN\n"
                   "  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'guarded') THEN\n"
                   "    CREATE POLICY \"guarded\" ON public.t FOR SELECT USING (owner = auth.uid());\n  END IF;\n"
                   "  EXECUTE 'DROP POLICY IF EXISTS \"old\" ON public.t';\n"
                   "  EXECUTE 'CREATE POLICY \"quoted\" ON public.t FOR DELETE USING (status = ''x'')';\n"
                   "  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'check_times') THEN\n"
                   "    CREATE TRIGGER check_times BEFORE UPDATE ON public.t FOR EACH ROW EXECUTE FUNCTION f();\n  END IF;\n"
                   "  ALTER TABLE public.t ADD CONSTRAINT st_chk CHECK (status IN ('a','b'));\n"
                   "  EXECUTE format('CREATE POLICY %I ON public.t FOR SELECT USING (true)', 'dyn');\n"
                   "END $$;\n")
        schema = self.schema()
        policies = {p["name"]: p for p in schema["policies"]}
        self.assertEqual(set(policies), {"guarded", "quoted"})
        self.assertEqual(policies["quoted"]["using"], "status = 'x'")
        self.assertEqual([(t["name"], t["table"]) for t in schema["triggers"]], [("check_times", "t")])
        self.assertTrue(any("st_chk" in c and "'b'" in c for c in schema["tables"]["t"]["constraints"]))
        self.assertEqual(schema["dynamic_ddl"], [{"src": MIG + "1.sql", "count": 1}])

    def test_conditional_create_policy_in_do_block_keeps_existing_policy(self):
        self.write(MIG + "1.sql", BASE_TABLE + 'CREATE POLICY "p" ON public.t FOR SELECT TO public USING (true);\n'
                   "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 't') THEN\n"
                   "  EXECUTE 'CREATE POLICY \"p\" ON public.t FOR SELECT TO authenticated USING (false)'; END IF; END $$;\n"
                   "DO $$ BEGIN IF to_regclass('public.never_created') IS NOT NULL THEN\n"
                   "  EXECUTE 'CREATE POLICY \"ghost\" ON public.never_created FOR SELECT USING (true)'; END IF; END $$;\n")
        self.assertEqual([(p["name"], p["table"], p["roles"], p["using"]) for p in self.schema()["policies"]], [("p", "t", "public", "true")])

    def test_alter_function_sets_search_path(self):
        self.write(MIG + "1.sql", "CREATE FUNCTION fixed(a int) RETURNS int LANGUAGE sql SECURITY DEFINER AS $$ select 1 $$;\n"
                                  "CREATE FUNCTION open_() RETURNS int LANGUAGE sql SECURITY DEFINER AS $$ select 1 $$;\n")
        self.write(MIG + "2.sql", "ALTER FUNCTION public.fixed(int) SET search_path = public;\n")
        functions = self.schema()["functions"]
        self.assertEqual({n: (f["security_definer"], f["search_path"]) for n, f in functions.items()},
                         {"fixed": (True, True), "open_": (True, False)})

    def test_create_table_if_not_exists_does_not_replace_existing_table(self):
        self.write(MIG + "1.sql", "CREATE TABLE public.r (id uuid, kind text NOT NULL);\nALTER TABLE public.r ADD COLUMN extra int;\n")
        self.write(MIG + "2.sql", "CREATE TABLE IF NOT EXISTS public.r (id uuid, kind text CHECK (kind IN ('a','b')), created_at timestamptz);\n"
                                  "CREATE TABLE IF NOT EXISTS public.fresh (id uuid);\n")
        schema = self.schema()
        self.assertEqual([(c["name"], c["type"]) for c in schema["tables"]["r"]["columns"]],
                         [("id", "uuid"), ("kind", "text NOT NULL"), ("extra", "int")])
        self.assertEqual(schema["tables"]["r"]["src"], MIG + "1.sql")
        self.assertIn("fresh", schema["tables"])

    def test_alter_table_with_several_actions_keeps_types_and_checks(self):
        self.write(MIG + "1.sql", "CREATE TABLE public.m (id int, old_a int, old_b int);\n"
                   "ALTER TABLE public.m\n  ADD COLUMN IF NOT EXISTS price DECIMAL(10,2) NOT NULL DEFAULT 0,\n"
                   "  ADD COLUMN IF NOT EXISTS status text DEFAULT 'draft' CHECK (status IN ('draft','published')),\n"
                   "  ADD COLUMN tags text[] DEFAULT ARRAY['x','y'],\n  DROP COLUMN old_a, DROP COLUMN old_b;\n"
                   "ALTER TABLE public.m ADD PRIMARY KEY (id);\n")
        schema = self.schema()
        columns = {c["name"]: c["type"] for c in schema["tables"]["m"]["columns"]}
        self.assertEqual(list(columns), ["id", "price", "status", "tags"])
        self.assertEqual(columns["price"], "DECIMAL(10,2) NOT NULL DEFAULT 0")
        self.assertEqual(columns["tags"], "text[] DEFAULT ARRAY['x','y']")
        self.assertEqual(schema["tables"]["m"]["constraints"], ["PRIMARY KEY (id)"])
        rules = generator.collect_rules({}, schema, {}, {}, {})
        status = [c for c in rules["state_machines"]["columns"] if c["column"] == "status"][0]
        self.assertEqual((status["table"], status["allowed"], status["default"]), ("m", ["draft", "published"], "draft"))

    def test_status_check_constraint_defines_allowed_values(self):
        self.write(MIG + "1.sql", "CREATE TABLE public.j (id int, status text DEFAULT 'queue' CHECK (status IN ('queue', 'done')), stage text);\n"
                                  "ALTER TABLE public.j ADD CONSTRAINT j_stage_chk CHECK (stage IN ('a', 'b'));\n")
        rules = generator.collect_rules({}, self.schema(), {}, {}, {})
        allowed = {c["column"]: c["allowed"] for c in rules["state_machines"]["columns"]}
        self.assertEqual(allowed, {"status": ["done", "queue"], "stage": ["a", "b"]})

    def test_trigger_with_update_of_columns_and_constraint_trigger(self):
        self.write(MIG + "1.sql", BASE_TABLE + "CREATE TABLE public.other (id int);\n"
                   "CREATE FUNCTION f() RETURNS trigger LANGUAGE plpgsql AS $$ begin return new; end $$;\n"
                   "CREATE TRIGGER trg_cancel BEFORE INSERT OR UPDATE OF status, owner ON public.t FOR EACH ROW WHEN (NEW.status = 'cancelled') EXECUTE FUNCTION f();\n"
                   "CREATE CONSTRAINT TRIGGER trg_deferred AFTER INSERT ON public.other DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION f();\n")
        triggers = {t["name"]: t for t in self.schema()["triggers"]}
        self.assertEqual(set(triggers), {"trg_cancel", "trg_deferred"})
        self.assertEqual((triggers["trg_cancel"]["table"], triggers["trg_cancel"]["when"], triggers["trg_cancel"]["condition"], triggers["trg_cancel"]["function"]),
                         ("t", "BEFORE INSERT OR UPDATE OF STATUS, OWNER", "NEW.status = 'cancelled'", "f"))
        self.assertEqual((triggers["trg_deferred"]["table"], triggers["trg_deferred"]["each"]), ("other", "row"))

    def test_loose_supabase_scripts_do_not_rebuild_schema(self):
        self.write("supabase/fix_staff_view_policies.sql", 'DROP POLICY IF EXISTS "p" ON public.t;\nCREATE POLICY "p" ON public.t FOR SELECT USING (false);\n'
                                                           "CREATE TABLE public.only_in_loose_script (id int);\n")
        self.write(MIG + "1.sql", BASE_TABLE + 'CREATE POLICY "p" ON public.t FOR SELECT USING (true);\n')
        schema = self.schema()
        self.assertEqual([p["using"] for p in schema["policies"]], ["true"])
        self.assertEqual(set(schema["tables"]), {"t"})
        self.assertEqual(schema["sources"], [MIG + "1.sql"])
        self.assertEqual(schema["ignored_sources"], ["supabase/fix_staff_view_policies.sql"])


class CodeExtractionTests(RepoFixture):
    def analyze(self, name, content):
        return generator.analyze_code_file(self.write(name, content), self.root)

    def test_long_zod_schema_is_not_cut_and_derived_schemas_are_captured(self):
        fields = "".join(f"  field_{i}: z.string().min(1, 'Campo {i} é obrigatório').max(200),\n" for i in range(25))
        info = self.analyze("src/job.schema.ts", "import { z } from 'zod';\n"
                            f"export const jobSchema = z.object({{\n{fields}  last_rule: z.number().max(43_200, 'não pode exceder 30 dias'),\n}});\n"
                            "export const jobFormSchema = jobSchema.omit({ id: true, status: true }).extend({\n"
                            "  quantity: z.coerce.number().positive('Quantidade deve ser positiva'), // comentário\n});\n"
                            "export const pickedSchema = jobSchema.pick({ field_1: true });\n"
                            "const merged = z.object({ a: z.string() }).merge(jobSchema);\n"
                            "const notZod = somethingElse.merge({ a: 1 });\n")
        zod = {z["name"]: z for z in info["zod"]}
        self.assertEqual(set(zod), {"jobSchema", "jobFormSchema", "pickedSchema", "merged"})
        self.assertGreater(len(zod["jobSchema"]["body"]), 800)
        self.assertIn("last_rule: z.number().max(43_200, 'não pode exceder 30 dias')", zod["jobSchema"]["body"])
        self.assertFalse(zod["jobSchema"]["body"].endswith("…"))
        self.assertEqual((zod["jobFormSchema"]["base"], zod["jobFormSchema"]["chain"]), ("jobSchema", ["extend", "omit"]))
        self.assertEqual(zod["jobFormSchema"]["body"], "jobSchema.omit({ id: true, status: true }).extend({ quantity: z.coerce.number().positive('Quantidade deve ser positiva'), })")
        self.assertEqual(zod["pickedSchema"]["body"], "jobSchema.pick({ field_1: true })")
        self.assertIn(".merge(jobSchema)", zod["merged"]["body"])

    def test_line_comment_does_not_swallow_the_next_transition(self):
        info = self.analyze("src/jobStateMachine.ts", "const TRANSITIONS: Record<string, string[]> = {\n"
                            "  finished: ['packaging'], // finished can be sent (auto) to packaging\n"
                            "  cancelled: ['queue'], /* bloco */\n  url: ['http://example.com/a'],\n};\n")
        self.assertEqual(info["transition_maps"], [{"name": "TRANSITIONS",
                         "body": "finished: ['packaging'], cancelled: ['queue'], url: ['http://example.com/a'],"}])

    def test_fixture_tables_in_tests_and_scripts_are_not_reported_as_inconsistencies(self):
        self.write(MIG + "1.sql", "CREATE TABLE public.orders (id uuid);\nALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;\n"
                                  'CREATE POLICY "read" ON public.orders FOR SELECT USING (true);\n')
        self.write("scripts/ai-context/gerar.unit.mjs", "await supabase.from('ghost_table').select('id'); await supabase.rpc('ghost_rpc'); await supabase.functions.invoke('ghost-edge');\n")
        self.write("src/a.test.ts", "await supabase.from('fantasma').select('id');\n")
        self.write("src/a.ts", "await supabase.from('orders').select('id, missing_col'); await supabase.from('real_missing').select('id');\n"
                               "await supabase.rpc('real_missing_rpc');\n")
        self.cli()
        issues = [i["msg"] for i in self.out_json("context.json")["audit"]["issues"]]
        self.assertEqual(sorted(issues), [
            "RPC `real_missing_rpc` chamada mas não definida nas migrations/types do repo",
            "coluna `missing_col` usada no código não existe no schema de `orders`",
            "tabela `real_missing` usada no código não existe nas migrations/types do repo",
        ])
        glossary = self.out("11-GLOSSARIO-E-LACUNAS.md")
        for fixture in ("ghost_table", "fantasma", "ghost_rpc", "ghost-edge"):
            self.assertNotIn(fixture, glossary)


def snapshot_fixture():
    """snapshot.json no formato do produtor supabase-snapshot (format_version 2), só com o necessário."""
    col = lambda table, name, type_, position, nullable=True, default=None: {
        "schema": "public", "table": table, "name": name, "type": type_, "position": position, "nullable": nullable,
        "default": default, "generated": None, "identity": None, "is_enum": False, "comment": None}
    return {"format_version": 2, "errors": [], "carried": [], "db": {
        "tables": [{"schema": "public", "name": "jobs", "kind": "table", "rls_enabled": True, "rls_forced": False, "comment": "Ordens de produção"},
                   {"schema": "public", "name": "open_table", "kind": "table", "rls_enabled": False, "rls_forced": False, "comment": None}],
        "columns": [col("jobs", "id", "uuid", 1, False, "gen_random_uuid()"), col("jobs", "status", "text", 2, False, "'queue'::text"),
                    col("jobs", "machine_id", "uuid", 3), col("open_table", "id", "integer", 1, False)],
        "constraints": [
            {"schema": "public", "table": "jobs", "name": "jobs_pkey", "type": "PRIMARY KEY", "columns": ["id"], "definition": "PRIMARY KEY (id)", "validated": True},
            {"schema": "public", "table": "jobs", "name": "jobs_status_check", "type": "CHECK", "columns": ["status"],
             "definition": "CHECK (status = ANY (ARRAY['queue'::text, 'real_only_state'::text]))", "validated": True},
            {"schema": "public", "table": "jobs", "name": "jobs_machine_fk", "type": "FOREIGN KEY", "columns": ["machine_id"], "ref_schema": "public",
             "ref_table": "machines", "ref_columns": ["id"], "on_delete": "CASCADE", "definition": "FOREIGN KEY (machine_id) REFERENCES machines(id) ON DELETE CASCADE", "validated": True}],
        "policies": [
            {"schema": "public", "table": "jobs", "name": "Active users read jobs", "cmd": "SELECT", "permissive": "PERMISSIVE", "roles": ["authenticated"],
             "using": "has_any_active_role()", "with_check": None},
            {"schema": "public", "table": "jobs", "name": "Coordinators manage jobs", "cmd": "ALL", "permissive": "PERMISSIVE", "roles": ["authenticated"],
             "using": "is_coordinator()", "with_check": "is_coordinator_check()"},
            {"schema": "public", "table": "jobs", "name": "AAL2 required", "cmd": "DELETE", "permissive": "RESTRICTIVE", "roles": ["authenticated"],
             "using": "((auth.jwt() ->> 'aal'::text) = 'aal2'::text)", "with_check": None}],
        "triggers": [{"schema": "public", "table": "jobs", "name": "trg_real_cancel_reason", "timing": "BEFORE", "events": "UPDATE", "level": "ROW", "status": "enabled",
                      "function": "public.validate_cancel", "definition": "CREATE TRIGGER trg_real_cancel_reason BEFORE UPDATE OF status, machine_id ON jobs "
                                                                         "FOR EACH ROW WHEN (new.status = 'cancelled'::text) EXECUTE FUNCTION validate_cancel()"}],
        "functions": [{"schema": "public", "name": "validate_cancel", "args": "", "returns": "trigger", "language": "plpgsql", "security_definer": True,
                       "config": ["search_path=public"], "definition": None, "definition_sha": "abc"},
                      {"schema": "public", "name": "no_path", "args": "", "returns": "void", "language": "sql", "security_definer": True, "config": None,
                       "definition": None, "definition_sha": "def"}],
        "types": [{"schema": "public", "name": "app_role", "kind": "enum", "values": ["operator", "admin"]}],
        "indexes": [{"schema": "public", "table": "jobs", "name": "jobs_pkey", "columns": ["id"], "is_unique": True, "predicate": None}],
        "views": []}}


class RealDatabaseSnapshotTests(RepoFixture):
    SNAP = "docs/contexto/supabase"

    def setUp(self):
        super().setUp()
        # migrations contam uma história diferente do banco: policy aberta, tabela que não existe mais, CHECK antigo
        self.write(MIG + "1.sql", "CREATE TABLE public.jobs (id uuid primary key, status text CHECK (status IN ('queue', 'migration_only_state')));\n"
                   "ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;\nCREATE TABLE public.dropped_in_prod (id int);\n"
                   'CREATE POLICY "Anyone can view jobs" ON public.jobs FOR SELECT USING (true);\n')

    def write_snapshot(self, data=None, manifest='{"gerado_em": "2026-01-02T03:04:05Z", "produtor": "supabase-snapshot"}'):
        self.write(self.SNAP + "/snapshot.json", json.dumps(snapshot_fixture() if data is None else data))
        if manifest is not None:
            self.write(self.SNAP + "/manifest.json", manifest)
        # cópias que o snapshot publica e que NÃO são fonte do gerador
        self.write(self.SNAP + "/migrations/20990101000000_copy.sql", "CREATE TABLE public.from_snapshot_copy (id int);\n")
        self.write(self.SNAP + "/functions/public/validate_cancel__x.sql",
                   "CREATE OR REPLACE FUNCTION public.validate_cancel()\n RETURNS trigger\n LANGUAGE plpgsql\n SECURITY DEFINER\nAS $function$\n"
                   "BEGIN\n  RAISE EXCEPTION 'Motivo de cancelamento é obrigatório';\nEND;\n$function$\n")

    def test_snapshot_is_the_source_of_rls_constraints_triggers_and_states(self):
        self.write_snapshot()
        self.cli("--schema-snapshot", self.SNAP)
        rules = self.out("07-REGRAS-DE-NEGOCIO.md")
        section_b = self.section("07-REGRAS-DE-NEGOCIO.md", "## B. ", "## C. ")
        self.assertIn("## B. Quem pode ver/alterar o quê (RLS — banco real, snapshot de 2026-01-02T03:04:05Z)", rules)
        self.assertIn("| `jobs` | Active users read jobs | SELECT | authenticated | permissive | `has_any_active_role()` |  |", section_b)
        self.assertIn("| `jobs` | AAL2 required | DELETE | authenticated | **RESTRICTIVE (E obrigatório)** |", section_b)
        self.assertNotIn("Anyone can view jobs", rules)
        self.assertNotIn("derivado de migrations", rules)
        section_c = self.section("07-REGRAS-DE-NEGOCIO.md", "## C. ", "## D. ")
        self.assertIn("| `jobs` | `machine_id` | FK → machines.id on delete cascade |", section_c)
        self.assertIn("constraint jobs_status_check CHECK (status = ANY (ARRAY['queue'::text, 'real_only_state'::text]))", section_c)
        section_d = self.section("07-REGRAS-DE-NEGOCIO.md", "## D. ", "## E. ")
        self.assertIn("| trg_real_cancel_reason | BEFORE UPDATE OF status, machine_id | `jobs` | `validate_cancel` | `new.status = 'cancelled'::text` |", section_d)
        self.assertIn("| `validate_cancel` | Motivo de cancelamento é obrigatório |", section_d)
        section_e1 = self.section("07-REGRAS-DE-NEGOCIO.md", "### E.1 ", "### E.2 ")
        self.assertIn("| `jobs` | `status` | `queue`, `real_only_state` | `queue` |", section_e1)
        self.assertNotIn("migration_only_state", rules)
        access = self.out("10-ACESSO-E-SEGURANCA.md")
        self.assertIn("políticas RLS — banco real, snapshot de 2026-01-02T03:04:05Z", access)
        self.assertIn("| `open_table` | disabled | sem RLS | sem RLS | sem RLS | sem RLS |", access)
        self.assertNotIn("dropped_in_prod", access)
        context = self.out_json("context.json")
        self.assertEqual(set(context["schema"]["tables"]), {"jobs", "open_table"})
        self.assertEqual(context["schema"]["enums"], {"app_role": ["operator", "admin"]})
        self.assertEqual([i["msg"] for i in context["audit"]["issues"] if i["kind"] == "segurança"],
                         ["função `no_path` é SECURITY DEFINER sem `set search_path` (risco de escalação)"])
        manifest = self.out_json("manifest.json")
        self.assertEqual((manifest["fonte_schema"], manifest["snapshot_gerado_em"], manifest["schema_real_em"], manifest["erros"]),
                         ("snapshot", "2026-01-02T03:04:05Z", self.SNAP, []))

    def test_snapshot_folder_is_not_scanned_as_repository_source(self):
        self.write_snapshot()
        self.cli("--schema-snapshot", self.SNAP)
        context = self.out_json("context.json")
        self.assertEqual(context["schema"]["sources"], [MIG + "1.sql"])
        self.assertEqual(context["meta"]["files_total"], 1)
        self.assertFalse([path for path in context["code_files"] if path.startswith(self.SNAP)])
        self.assertNotIn("from_snapshot_copy", json.dumps(context["schema"]))

    def test_matrix_uses_with_check_for_insert_and_marks_restrictive_as_and(self):
        self.write_snapshot()
        self.cli("--schema-snapshot", self.SNAP)
        row = [line for line in self.out("10-ACESSO-E-SEGURANCA.md").splitlines() if line.startswith("| `jobs` |")][0]
        select, insert, update, delete = [cell.strip() for cell in row.split("|")[3:7]]
        self.assertEqual(select, "authenticated: has_any_active_role()<br>authenticated: is_coordinator()")
        self.assertEqual(insert, "authenticated: WITH CHECK is_coordinator_check()")
        self.assertEqual(update, "authenticated: USING is_coordinator() · WITH CHECK is_coordinator_check()")
        self.assertEqual(delete, "authenticated: is_coordinator()<br>**E AINDA EXIGE (RESTRICTIVE)** authenticated: ((auth.jwt() ->> 'aal'::text) = 'aal2'::text)")

    def test_missing_snapshot_falls_back_to_migrations_and_says_so(self):
        self.cli("--schema-snapshot", self.SNAP)
        rules = self.out("07-REGRAS-DE-NEGOCIO.md")
        self.assertIn("## B. Quem pode ver/alterar o quê (RLS — derivado de migrations — pode divergir do banco)", rules)
        self.assertIn("| `jobs` | Anyone can view jobs | SELECT | public | permissive | `true` |  |", rules)
        self.assertIn(f"confirme no banco real (`{self.SNAP}/`)", rules)
        manifest = self.out_json("manifest.json")
        self.assertEqual((manifest["fonte_schema"], manifest["schema_real_em"]), ("migrations", ""))
        self.assertEqual(len(manifest["erros"]), 1)
        self.assertIn("derivados de migrations e podem divergir do banco", manifest["erros"][0])

    def test_unusable_snapshot_falls_back_and_records_the_reason(self):
        for broken, reason in (("{ not json", "snapshot.json ilegível"), (json.dumps({"db": {"tables": []}}), "sem a(s) seção(ões) db.columns")):
            with self.subTest(reason=reason):
                self.write(self.SNAP + "/snapshot.json", broken)
                self.cli("--schema-snapshot", self.SNAP, "--force")
                manifest = self.out_json("manifest.json")
                self.assertEqual(manifest["fonte_schema"], "migrations")
                self.assertIn(reason, manifest["erros"][0])
                self.assertIn("derivado de migrations — pode divergir do banco", self.out("10-ACESSO-E-SEGURANCA.md"))

    def test_rules_profile_never_points_to_the_file_it_does_not_generate(self):
        for with_snapshot in (False, True):
            with self.subTest(with_snapshot=with_snapshot):
                if with_snapshot:
                    self.write_snapshot()
                self.cli("--schema-snapshot", self.SNAP, "--force")
                self.assertFalse((self.root / "output/06-BANCO-DE-DADOS.md").exists())
                for name in ("07-REGRAS-DE-NEGOCIO.md", "10-ACESSO-E-SEGURANCA.md", "11-GLOSSARIO-E-LACUNAS.md"):
                    self.assertNotIn("`06`", self.out(name), name)
                    self.assertNotIn("06-BANCO", self.out(name), name)
                self.assertIn(f"veja `{self.SNAP}/`", self.out("10-ACESSO-E-SEGURANCA.md"))


class RulesDocumentTests(RepoFixture):
    def test_section_b_lists_every_policy_grouped_by_table_without_truncation(self):
        tables = "".join(f"CREATE TABLE public.t{i:03d} (id int);\n" for i in range(120))
        policies = "".join(f'CREATE POLICY "p{i:03d}_{cmd}" ON public.t{i:03d} FOR {cmd} USING (true);\n'
                           for i in reversed(range(120)) for cmd in ("DELETE", "SELECT", "UPDATE"))
        self.write(MIG + "1.sql", tables + policies)
        self.cli()
        section_b = self.section("07-REGRAS-DE-NEGOCIO.md", "## B. ", "## C. ")
        names = [line.split("|")[2].strip() for line in section_b.splitlines() if line.startswith("| `t")]
        self.assertEqual(len(names), 360)
        self.assertEqual(names[:3], ["p000_SELECT", "p000_UPDATE", "p000_DELETE"])
        self.assertEqual(names[-1], "p119_DELETE")
        self.assertIn("360 política(s) em 120 tabela(s)", section_b)
        self.assertNotIn("linhas — lista completa", section_b)
        matrix = self.out("10-ACESSO-E-SEGURANCA.md")
        self.assertEqual(sum(1 for line in matrix.splitlines() if line.startswith("| `t") and "| não encontrado |" in line), 120)

    def test_insert_through_for_all_policy_is_documented_with_its_with_check(self):
        self.write(MIG + "1.sql", BASE_TABLE + 'CREATE POLICY "all_split" ON public.t FOR ALL TO authenticated USING (owner = auth.uid()) WITH CHECK (status = \'new\');\n')
        self.write(MIG + "2.sql", "CREATE TABLE public.u (id int);\nALTER TABLE public.u ENABLE ROW LEVEL SECURITY;\n"
                                  'CREATE POLICY "all_same" ON public.u FOR ALL USING (id > 0);\n'
                                  "CREATE POLICY only_and ON public.u AS RESTRICTIVE FOR SELECT USING (id < 9);\n")
        self.cli()
        rows = {line.split("|")[1].strip(): [c.strip() for c in line.split("|")[3:7]]
                for line in self.out("10-ACESSO-E-SEGURANCA.md").splitlines() if line.startswith(("| `t` |", "| `u` |"))}
        self.assertEqual(rows["`t`"], ["authenticated: owner = auth.uid()", "authenticated: WITH CHECK status = 'new'",
                                       "authenticated: USING owner = auth.uid() · WITH CHECK status = 'new'", "authenticated: owner = auth.uid()"])
        self.assertEqual(rows["`u`"][0], "public: id > 0<br>**E AINDA EXIGE (RESTRICTIVE)** public: id < 9")
        self.assertEqual(rows["`u`"][1], "public: WITH CHECK id > 0")
        section_b = self.section("07-REGRAS-DE-NEGOCIO.md", "## B. ", "## C. ")
        self.assertIn("| `u` | all_same | ALL | public | permissive | `id > 0` | _= USING_ |", section_b)
        self.assertIn("| `u` | only_and | SELECT | public | **RESTRICTIVE (E obrigatório)** | `id < 9` |  |", section_b)

    def test_restrictive_policy_alone_does_not_count_as_permission(self):
        self.write(MIG + "1.sql", BASE_TABLE + "CREATE POLICY only_and ON public.t AS RESTRICTIVE FOR SELECT USING (true);\n"
                                               'CREATE POLICY "ins" ON public.t FOR INSERT WITH CHECK (true);\n')
        self.write("src/a.ts", "await supabase.from('t').select('id');\n")
        self.cli()
        issues = [i["msg"] for i in self.out_json("context.json")["audit"]["issues"] if i["kind"] == "rls"]
        self.assertEqual(issues, ["`t`: front faz SELECT mas nenhuma política RLS permite SELECT → vai falhar/retornar vazio para usuários"])

    def test_manual_rules_secrets_and_extracted_rules_reach_the_document(self):
        secret = "sk-" + "A1b2C3d4" * 3  # montado em runtime: não é credencial real
        self.write(MIG + "1.sql", BASE_TABLE + 'CREATE POLICY "Owners read" ON public.t FOR SELECT USING (owner = auth.uid());\n'
                   "CREATE FUNCTION f() RETURNS trigger LANGUAGE plpgsql AS $$ begin return new; end $$;\n"
                   "CREATE TRIGGER trg_t BEFORE UPDATE ON public.t FOR EACH ROW EXECUTE FUNCTION f();\n")
        self.write("src/schema.ts", "import { z } from 'zod';\nexport const orderSchema = z.object({ qty: z.number().min(1, 'Quantidade mínima é 1') });\n"
                                    "const TRANSITIONS = { open: ['done'] };\n"
                                    f"export function connect() {{ throw new Error('Falha ao autenticar com {secret}'); }}\n")
        self.write("output/manual/regras.md", "# Regra do dono\n\nPedido cancelado nunca volta para a fila.\n")
        self.cli()
        rules = self.out("07-REGRAS-DE-NEGOCIO.md")
        self.assertIn("Pedido cancelado nunca volta para a fila.", self.section("07-REGRAS-DE-NEGOCIO.md", "## A. ", "## B. "))
        self.assertIn("| `t` | Owners read | SELECT | public | permissive | `owner = auth.uid()` |  |", self.section("07-REGRAS-DE-NEGOCIO.md", "## B. ", "## C. "))
        self.assertIn("| trg_t | BEFORE UPDATE | `t` | `f` |  |", self.section("07-REGRAS-DE-NEGOCIO.md", "## D. ", "## E. "))
        self.assertIn("- **TRANSITIONS** (`src/schema.ts`):\n  ```ts\n  open: ['done']", rules)
        self.assertIn("{ qty: z.number().min(1, 'Quantidade mínima é 1') }", self.section("07-REGRAS-DE-NEGOCIO.md", "### F.1 ", "### F.2 "))
        self.assertIn("| `t` | enabled | public: owner = auth.uid() | — | — | — |", self.out("10-ACESSO-E-SEGURANCA.md"))
        for name in ("07-REGRAS-DE-NEGOCIO.md", "10-ACESSO-E-SEGURANCA.md", "11-GLOSSARIO-E-LACUNAS.md", "context.json"):
            self.assertNotIn(secret, self.out(name), name)
        self.assertIn("Falha ao autenticar com [REDACTED]", rules)


class InputValidationTests(RepoFixture):
    def test_missing_repository_fails_without_writing_documents(self):
        missing = self.root / "does-not-exist"
        result = subprocess.run([sys.executable, "-B", str(SCRIPT), "--repo", str(missing), "--out", str(self.root / "output"),
                                 "--profile", "regras", "--no-pointer"], capture_output=True, text=True, timeout=60)
        self.assertEqual(result.returncode, 2)
        self.assertIn("não é um diretório", result.stderr)
        self.assertFalse((self.root / "output").exists())
        self.assertFalse(missing.exists())

    def test_skipped_files_are_reported_in_manifest_instead_of_vanishing(self):
        self.write(MIG + "1.sql", "CREATE TABLE public.small (id int);\n")
        self.write(MIG + "2_huge.sql", "CREATE TABLE public.huge (id int);\n" + "-- padding\n" * (generator.MAX_SQL_BYTES // 11 + 1))
        self.write("src/big.ts", "export const A_LIMIT = 1;\n" + "// padding\n" * (generator.MAX_FILE_BYTES // 11 + 1))
        self.cli()
        manifest = self.out_json("manifest.json")
        self.assertEqual([e for e in manifest["erros"] if "2_huge.sql" in e],
                         [f"`{MIG}2_huge.sql` ignorado: {(self.root / MIG / '2_huge.sql').stat().st_size} bytes > limite de {generator.MAX_SQL_BYTES}"
                          " — o schema reconstruído está incompleto"])
        self.assertTrue(any(a.startswith("`src/big.ts` ignorado: ") for a in manifest["avisos"]), manifest["avisos"])
        self.assertNotIn("huge", self.out_json("context.json")["schema"]["tables"])

    def test_manifest_records_commit_and_clean_run_has_no_errors(self):
        self.write(MIG + "1.sql", BASE_TABLE)
        git = ["git", "-c", "user.name=t", "-c", "user.email=t@example.com", "-c", "commit.gpgsign=false", "-c", "core.hooksPath=/dev/null"]
        env = {**os.environ, "GIT_CONFIG_GLOBAL": os.devnull, "GIT_CONFIG_NOSYSTEM": "1"}
        for args in (["init", "-q", "-b", "main"], ["add", "-A"], ["commit", "-q", "-m", "feat: fixture"]):
            subprocess.run(git + args, cwd=self.root, check=True, capture_output=True, env=env, timeout=30)
        head = subprocess.run(["git", "rev-parse", "HEAD"], cwd=self.root, check=True, capture_output=True, text=True, env=env, timeout=30).stdout.strip()
        self.cli()
        manifest = self.out_json("manifest.json")
        self.assertEqual(len(head), 40)
        self.assertEqual(manifest["commit"], head)
        self.assertEqual(manifest["erros"], [])
        self.assertEqual(manifest["avisos"], ["sem snapshot do banco (--schema-snapshot) — RLS, restrições, triggers e colunas de status foram derivados "
                                              "de migrations e podem divergir do banco"])
        self.assertEqual(manifest["entrada"], "07-REGRAS-DE-NEGOCIO.md")


if __name__ == "__main__":
    unittest.main()
