#!/usr/bin/env python3
"""Regressões offline: uma coleta parcial não pode destruir o SQL já publicado."""

from __future__ import annotations

import contextlib
import copy
import datetime as dt
import importlib.util
import io
import json
import os
import pathlib
import re
import shutil
import sys
import tempfile
import types
import unittest
import urllib.error
from unittest import mock


_PGQL = "postgres" + "ql://"  # prefixos montados: o literal inteiro com "usuário:senha@host" dispara o scanner de segredos do CI
_PG = "postgres" + "://"
_REDIS = "re" + "dis://"


class OfflineConnection:
    def __enter__(self):
        return self

    def __exit__(self, *_):
        return False

    def execute(self, command):
        if not command.startswith("SET "):
            raise AssertionError("O teste offline não permite consultas ao banco")

    def rollback(self):
        pass


def function(name="demo", value=1):
    return {
        "schema": "public", "name": name, "args": "", "returns": "integer",
        "language": "sql", "kind": "function", "is_trigger_fn": False,
        "security_definer": False, "volatility": "v", "config": [],
        "execute_api_roles": ["authenticated"], "execute_public": False,
        "definition": f"CREATE FUNCTION public.{name}() RETURNS integer LANGUAGE sql AS $$ SELECT {value} $$;",
    }


def migration(version="20260101000000", name="demo", statements=None):
    return {
        "version": version, "name": name,
        "statements": statements if statements is not None else [
            "CREATE TABLE public.demo_table (id integer);",
            "CREATE INDEX demo_id ON public.demo_table (id);",
        ],
    }


def structural_records(records):
    return [{k: v for k, v in row.items() if k != "callers"} for row in records] if records is not None else None


class SnapshotFixture(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="snapshot-sql-test-")
        self.addCleanup(self.temp.cleanup)
        self.out = pathlib.Path(self.temp.name) / "output"

        # Nem driver instalado nem credenciais são necessários. Qualquer tentativa real falha.
        driver = types.ModuleType("psycopg")
        driver.connect = mock.Mock(side_effect=AssertionError("Conexão real proibida no teste"))
        rows = types.ModuleType("psycopg.rows")
        rows.dict_row = object()
        spec = importlib.util.spec_from_file_location("snapshot_tested", pathlib.Path(__file__).with_name("snapshot.py"))
        self.snapshot = importlib.util.module_from_spec(spec)
        env = {
            "SUPABASE_DB_URL": "offline-fixture", "SNAPSHOT_DIR": str(self.out),
            "PGDUMP": "false", "GEN_TYPES": "false", "REPO_ROOT": "",
        }
        with mock.patch.dict(sys.modules, {"psycopg": driver, "psycopg.rows": rows}):
            with mock.patch.dict(os.environ, env, clear=True):
                spec.loader.exec_module(self.snapshot)

        self.source_files = [("src/client.ts", "supabase.rpc('demo')")]

    def collect(self, *, failures=(), functions=None, migrations=None, cron=None):
        snapshot = self.snapshot
        snapshot.ERRORS.clear()
        snapshot.CARRIED.clear()
        snapshot._SLUG_SEEN.clear()
        records = {
            "server": {"server_version": "offline-fixture"},
            "functions": [function()] if functions is None else functions,
            "migrations": [migration()] if migrations is None else migrations,
        }
        if cron is not None:
            records["cron"] = cron

        def section(name):
            @snapshot.section(name)
            def collect_section(_conn):
                if name in failures:
                    raise PermissionError(f"Falha simulada na seção {name}")
                return copy.deepcopy(records[name])
            return collect_section

        snapshot.DB_SECTIONS = [section(name) for name in records]
        with mock.patch.object(snapshot.psycopg, "connect", return_value=OfflineConnection()):
            with mock.patch.object(snapshot, "scan_code_files", return_value=self.source_files):
                with mock.patch.object(snapshot.urllib.request, "urlopen", side_effect=AssertionError("HTTP proibido no teste")):
                    with mock.patch.object(snapshot.subprocess, "run", side_effect=AssertionError("Comando externo proibido no teste")):
                        with contextlib.redirect_stdout(io.StringIO()):
                            return snapshot.main()

    def metadata(self):
        return json.loads((self.out / "snapshot.json").read_text(encoding="utf-8"))

    def function_sql(self, name="demo"):
        return self.out / "functions" / "public" / f"{name}__{self.snapshot.sha('')}.sql"

    def migration_sql(self, version="20260101000000", name="demo"):
        return self.out / "migrations" / f"{version}_{name}.sql"

    def error_sections(self):
        return {error["section"] for error in self.metadata()["errors"]}


class SnapshotSQLRecoveryTests(SnapshotFixture):
    def test_output_marker_is_created_preserved_and_recovers_legacy_snapshot(self):
        self.out.mkdir()  # diretório existente e vazio também é um alvo novo válido.
        self.assertEqual(self.collect(), 0)
        marker = self.out / self.snapshot.OUTPUT_MARKER
        self.assertEqual(marker.read_text(encoding="utf-8"), self.snapshot.OUTPUT_MARKER_CONTENT)
        marker.unlink()  # snapshot.json v2 identifica uma saída legítima anterior ao marcador.
        self.assertEqual(self.collect(), 0)
        self.assertEqual(marker.read_text(encoding="utf-8"), self.snapshot.OUTPUT_MARKER_CONTENT)

    def test_old_format_version_snapshot_is_recognized_as_ours_not_unowned(self):
        # valid_previous_snapshot() só confere a FORMA, não a versão: um snapshot.json de uma
        # versão mais antiga do script (sem marcador — o marcador nunca é commitado em git, cada
        # run do Actions começa num runner novo) ainda é reconhecido como NOSSO. Exigir a versão
        # exata aqui faria prepare_output_directory() recusar a própria pasta a cada bump de
        # FORMAT_VERSION, travando o job para sempre (nenhum run geraria o marcador novo, então
        # nenhum run subsequente passaria). Quem decide se o dado é REAPROVEITÁVEL é main(), não
        # esta função — e main() continua exigindo a versão exata para isso (ver test_snapshot
        # desta mesma classe e SnapshotCronSecretRedactionTests).
        self.out.mkdir()
        (self.out / "snapshot.json").write_text(
            json.dumps({"format_version": self.snapshot.FORMAT_VERSION - 1, "db": {}, "api": {}}),
            encoding="utf-8",
        )
        self.assertEqual(self.collect(), 0, "pasta com snapshot de versão antiga não pode travar o job")

    def test_unowned_nonempty_output_is_rejected_before_collection(self):
        unowned = pathlib.Path(self.temp.name) / "unowned"
        unowned.mkdir()
        sentinel = unowned / "user.txt"
        sentinel.write_text("não apagar", encoding="utf-8")
        self.snapshot.OUT = unowned
        with mock.patch.object(self.snapshot, "introspect_db", side_effect=AssertionError("coleta proibida")):
            with contextlib.redirect_stderr(io.StringIO()) as stderr:
                self.assertEqual(self.snapshot.main(), 2)
        self.assertIn("sem marcador/snapshot válido", stderr.getvalue())
        self.assertEqual(sentinel.read_text(encoding="utf-8"), "não apagar")
        self.assertFalse((unowned / self.snapshot.OUTPUT_MARKER).exists())

    def test_broad_output_paths_are_rejected_before_collection(self):
        cwd = pathlib.Path.cwd().resolve()
        unsafe = {pathlib.Path(cwd.anchor).resolve(), pathlib.Path.home().resolve(), cwd, cwd.parent}
        for path in unsafe:
            with self.subTest(path=path):
                self.snapshot.OUT = path
                with mock.patch.object(self.snapshot, "introspect_db", side_effect=AssertionError("coleta proibida")):
                    with contextlib.redirect_stderr(io.StringIO()) as stderr:
                        self.assertEqual(self.snapshot.main(), 2)
                self.assertIn("SNAPSHOT_DIR inseguro", stderr.getvalue())

    def test_successful_collection_writes_full_sql_with_compact_metadata(self):
        self.assertEqual(self.collect(), 0)
        self.assertEqual(self.function_sql().read_text().strip(), function()["definition"])
        self.assertEqual(self.migration_sql().read_text().strip(), "\n\n".join(migration()["statements"]))
        metadata = self.metadata()
        self.assertIsNone(metadata["db"]["functions"][0]["definition"])
        self.assertEqual(metadata["db"]["migrations"][0]["statements"], 2)
        self.assertEqual(metadata["errors"], [])

    def test_repeated_failures_preserve_sql_counts_hashes_and_db_callers(self):
        self.assertEqual(self.collect(), 0)
        original_function = self.function_sql().read_bytes()
        original_migration = self.migration_sql().read_bytes()
        original_metadata = self.metadata()["db"]
        self.source_files = []

        for _ in range(2):
            self.assertEqual(self.collect(failures={"functions", "migrations"}), 0)
            self.assertEqual(self.function_sql().read_bytes(), original_function)
            self.assertEqual(self.migration_sql().read_bytes(), original_migration)
            metadata = self.metadata()
            self.assertEqual(structural_records(metadata["db"]["functions"]), structural_records(original_metadata["functions"]))
            self.assertEqual(metadata["db"]["functions"][0]["callers"]["db"], original_metadata["functions"][0]["callers"]["db"])
            self.assertEqual(metadata["db"]["functions"][0]["callers"]["code"], [])
            self.assertEqual(metadata["db"]["migrations"], original_metadata["migrations"])
            self.assertEqual(set(metadata["carried"]), {"functions", "migrations"})
            self.assertEqual(self.error_sections(), {"functions", "migrations"})
            for name in ("functions", "migrations"):
                self.assertIn("versão anterior", (self.out / f"{name}.md").read_text())
            for name in ("functions.md", "README.md"):
                document = (self.out / name).read_text()
                self.assertIn("| código do repo | coleta atual |", document)
                self.assertIn("| outras funções | coleta anterior; corpos SQL não atualizados |", document)

    def test_failed_functions_allow_healthy_migrations_to_update(self):
        self.collect()
        old_function = self.function_sql().read_bytes()
        statements = ["ALTER TABLE public.demo_table ADD COLUMN name text;"]
        self.assertEqual(self.collect(failures={"functions"}, migrations=[migration(statements=statements)]), 0)
        self.assertEqual(self.function_sql().read_bytes(), old_function)
        self.assertEqual(self.migration_sql().read_text().strip(), statements[0])
        self.assertEqual(self.metadata()["carried"], ["functions"])

    def test_failed_migrations_allow_healthy_functions_to_update(self):
        self.collect()
        old_migration = self.migration_sql().read_bytes()
        changed = function(value=2)
        self.assertEqual(self.collect(failures={"migrations"}, functions=[changed]), 0)
        self.assertEqual(self.function_sql().read_text().strip(), changed["definition"])
        self.assertEqual(self.migration_sql().read_bytes(), old_migration)
        self.assertEqual(self.metadata()["carried"], ["migrations"])

    def test_next_healthy_collection_replaces_sql_and_prunes_removed_objects(self):
        obsolete_migration = migration("20260102000000", "obsolete")
        self.collect(functions=[function(), function("obsolete")], migrations=[migration(), obsolete_migration])
        self.collect(failures={"functions", "migrations"})
        self.assertTrue(self.function_sql("obsolete").is_file())
        self.assertTrue(self.migration_sql("20260102000000", "obsolete").is_file())

        changed = function(value=3)
        statements = ["ALTER TABLE public.demo_table ADD COLUMN enabled boolean;"]
        self.assertEqual(self.collect(functions=[changed], migrations=[migration(statements=statements)]), 0)
        self.assertFalse(self.function_sql("obsolete").exists())
        self.assertFalse(self.migration_sql("20260102000000", "obsolete").exists())
        self.assertEqual(self.function_sql().read_text().strip(), changed["definition"])
        self.assertEqual(self.migration_sql().read_text().strip(), statements[0])
        self.assertEqual(self.metadata()["carried"], [])
        self.assertEqual(self.metadata()["errors"], [])
        self.assertNotIn("versão anterior", (self.out / "functions.md").read_text())

    def test_missing_previous_sql_is_reported_without_fake_content_or_links(self):
        self.collect()
        original_migrations = self.metadata()["db"]["migrations"]
        shutil.rmtree(self.out / "functions")
        shutil.rmtree(self.out / "migrations")

        self.assertEqual(self.collect(failures={"functions", "migrations"}), 0)
        self.assertFalse(self.function_sql().exists())
        self.assertFalse(self.migration_sql().exists())
        self.assertEqual(self.metadata()["db"]["migrations"], original_migrations)
        self.assertTrue({"functions.sql", "migrations.sql"}.issubset(self.error_sections()))
        for name in ("functions", "migrations"):
            document = (self.out / f"{name}.md").read_text()
            self.assertIn("SQL indisponível", document)
            self.assertNotIn(f"]({name}/", document)

    def test_failed_first_collection_does_not_claim_empty_sections(self):
        self.assertEqual(self.collect(failures={"functions", "migrations"}), 0)
        self.assertFalse(self.function_sql().exists())
        self.assertFalse(self.migration_sql().exists())
        self.assertEqual(self.metadata()["carried"], [])
        self.assertEqual(self.error_sections(), {"functions", "migrations"})
        for name in ("functions", "migrations"):
            document = (self.out / f"{name}.md").read_text()
            self.assertIn("Coleta indisponível", document)
            self.assertNotIn("_nenhum_", document)
            self.assertIn(f"| {name} | n/d |", (self.out / "README.md").read_text())

    def test_successful_empty_sections_are_not_reported_as_collection_failures(self):
        self.assertEqual(self.collect(functions=[], migrations=[]), 0)
        self.assertEqual(self.metadata()["errors"], [])
        self.assertEqual(self.metadata()["carried"], [])
        for name in ("functions", "migrations"):
            self.assertIn("_nenhum_", (self.out / f"{name}.md").read_text())
            self.assertIn(f"| {name} | 0 |", (self.out / "README.md").read_text())

    def test_aggregate_and_window_without_sql_remain_healthy_catalog_entries(self):
        entries = [{**function(f"demo_{kind}"), "kind": kind, "definition": None} for kind in ("aggregate", "window")]
        self.assertEqual(self.collect(functions=entries), 0)
        self.assertEqual(self.error_sections(), set())
        self.assertEqual([f["kind"] for f in self.metadata()["db"]["functions"]], ["aggregate", "window"])
        for entry in entries:
            self.assertFalse(self.function_sql(entry["name"]).exists())
        document = (self.out / "functions.md").read_text()
        self.assertIn("SQL não coletado para este tipo", document)
        self.assertNotIn("](functions/", document)
        self.assertEqual(self.collect(failures={"functions"}), 0)
        self.assertEqual(self.error_sections(), {"functions"})
        self.assertEqual(self.metadata()["carried"], ["functions"])
        self.assertEqual(self.collect(functions=entries), 0)
        self.assertEqual(self.error_sections(), set())


class SnapshotFailureMatrixTests(SnapshotFixture):
    """24 sequências: seção × histórico/SQL disponível × repetição × recuperação."""

    def exercise_failure_recovery(self, section, history, attempts, recovery):
        if history != "none":
            self.collect(functions=[function(), function("obsolete")],
                         migrations=[migration(), migration("20260102000000", "obsolete")])
            previous = copy.deepcopy(self.metadata()["db"][section])
            sql_before = {p.relative_to(self.out): p.read_bytes() for p in (self.out / section).rglob("*.sql")}
            if history == "metadata_only":
                shutil.rmtree(self.out / section)
        else:
            previous, sql_before = None, {}

        self.source_files = []  # não pode apagar callers da seção que veio do histórico
        for attempt in range(attempts):
            changed_function = function(value=attempt + 20)
            changed_statement = f"ALTER TABLE public.demo_table ADD COLUMN field_{attempt} integer;"
            self.assertEqual(self.collect(failures={section}, functions=[changed_function],
                                         migrations=[migration(statements=[changed_statement])]), 0)
            metadata = self.metadata()
            self.assertEqual(structural_records(metadata["db"][section]), structural_records(previous))
            if section == "functions" and previous:
                self.assertEqual(metadata["db"][section][0]["callers"]["db"], previous[0]["callers"]["db"])
                self.assertEqual(metadata["db"][section][0]["callers"]["code"], [])
            self.assertEqual(metadata["carried"], [section] if history != "none" else [])
            self.assertIn(section, self.error_sections())
            self.assertEqual(f"{section}.sql" in self.error_sections(), history == "metadata_only")
            document = (self.out / f"{section}.md").read_text()
            if history == "complete":
                for relative, contents in sql_before.items():
                    self.assertEqual((self.out / relative).read_bytes(), contents)
                self.assertIn("versão anterior", document)
                self.assertNotIn("SQL indisponível", document)
            else:
                self.assertFalse((self.out / section).exists())
                self.assertNotIn(f"]({section}/", document)
                self.assertIn("SQL indisponível" if history == "metadata_only" else "Coleta indisponível", document)
            if history == "none":
                self.assertIn(f"| {section} | n/d |", (self.out / "README.md").read_text())
            else:
                self.assertIn(f"| {section} | 2 |", (self.out / "README.md").read_text())
                # Falha da coleta não pode transformar registros conhecidos em remoções.
                changes = self.snapshot.diff_fingerprints(
                    self.snapshot.fingerprints({"db": {section: structural_records(previous)}}),
                    self.snapshot.fingerprints({"db": {section: structural_records(metadata["db"][section])}}))
                self.assertEqual(changes, [])
            if section == "functions":
                self.assertEqual(self.migration_sql().read_text().strip(), changed_statement)
            else:
                self.assertEqual(self.function_sql().read_text().strip(), changed_function["definition"])

        self.source_files = [("src/recovered.ts", "supabase.rpc('demo')")]
        final_function = function(value=99)
        final_statement = "ALTER TABLE public.demo_table ADD COLUMN recovered boolean;"
        functions = [] if section == "functions" and recovery == "empty" else [final_function]
        migrations = [] if section == "migrations" and recovery == "empty" else [migration(statements=[final_statement])]
        self.assertEqual(self.collect(functions=functions, migrations=migrations), 0)
        metadata = self.metadata()
        self.assertEqual(metadata["errors"], [])
        self.assertEqual(metadata["carried"], [])
        self.assertFalse(self.function_sql("obsolete").exists())
        self.assertFalse(self.migration_sql("20260102000000", "obsolete").exists())
        document = (self.out / f"{section}.md").read_text()
        self.assertNotIn("versão anterior", document)
        self.assertNotIn("SQL indisponível", document)
        if recovery == "empty":
            self.assertEqual(metadata["db"][section], [])
            self.assertFalse((self.out / section).exists())
            self.assertIn("_nenhum_", document)
        elif section == "functions":
            self.assertEqual(self.function_sql().read_text().strip(), final_function["definition"])
            self.assertEqual(metadata["db"][section][0]["callers"]["code"], [{"file": "src/recovered.ts", "hits": 1}])
        else:
            self.assertEqual(self.migration_sql().read_text().strip(), final_statement)
            self.assertEqual(metadata["db"][section][0]["statements"], 1)


def recovery_case(section, history, attempts, recovery):
    def run(self):
        self.exercise_failure_recovery(section, history, attempts, recovery)
    return run


for _section in ("functions", "migrations"):
    for _history in ("none", "complete", "metadata_only"):
        for _attempts in (1, 3):
            for _recovery in ("changed", "empty"):
                setattr(SnapshotFailureMatrixTests,
                        f"test_{_section}_{_history}_{_attempts}_failures_recover_{_recovery}",
                        recovery_case(_section, _history, _attempts, _recovery))


class SnapshotFunctionCallerTests(SnapshotFixture):
    def callers(self, files, *, scan_dirs=None, kind="function"):
        root = pathlib.Path(self.temp.name) / "repo"
        for relative, text in files.items():
            path = root / relative
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(text, encoding="utf-8")
        self.snapshot.REPO_ROOT = root
        self.snapshot.CODE_SCAN_DIRS = scan_dirs or ["."]
        db = {"functions": [{**function(), "kind": kind}]}
        with contextlib.redirect_stdout(io.StringIO()):
            self.snapshot.build_function_callers(db)
        return db["functions"][0]["callers"]["code"]

    def test_function_declaration_is_not_a_call(self):
        declarations = {
            "supabase/migrations/001.sql": function()["definition"],
            "supabase/migrations/002.sql": "CREATE OR REPLACE\nFUNCTION public.demo() RETURNS integer AS $$ SELECT 2 $$ LANGUAGE sql;",
            "supabase/migrations/003.sql": "CREATE PROCEDURE public.demo() LANGUAGE sql AS $$ SELECT 1 $$;",
        }
        self.assertEqual(self.callers(declarations), [])

    def test_aggregate_declarations_and_metadata_are_not_calls(self):
        statements = [
            "CREATE AGGREGATE public.demo(integer) (SFUNC = int4pl, STYPE = integer);",
            "DROP AGGREGATE IF EXISTS public.demo(integer);",
            "ALTER AGGREGATE public.demo(integer) OWNER TO postgres;",
            "COMMENT ON AGGREGATE public.demo(integer) IS 'description';",
        ]
        self.assertEqual(self.callers({f"supabase/migrations/{i}.sql": text for i, text in enumerate(statements)}, kind="aggregate"), [])

    def test_ddl_function_signatures_are_not_calls(self):
        statements = [
            "DROP FUNCTION IF EXISTS public.demo();",
            "ALTER FUNCTION public.demo() OWNER TO postgres;",
            "COMMENT ON FUNCTION public.demo() IS 'description';",
            "GRANT EXECUTE ON FUNCTION public.demo() TO authenticated;",
            "REVOKE EXECUTE ON FUNCTION public.demo() FROM anon;",
        ]
        self.assertEqual(self.callers({f"supabase/migrations/{i}.sql": text for i, text in enumerate(statements)}), [])

    def test_real_calls_inside_function_bodies_and_migrations_remain(self):
        text = "CREATE FUNCTION public.demo() RETURNS integer AS $$ SELECT public.demo(); $$ LANGUAGE sql;\nSELECT public.demo();"
        self.assertEqual(self.callers({"supabase/migrations/active.sql": text}),
                         [{"file": "supabase/migrations/active.sql", "hits": 2}])

    def test_ddl_like_text_does_not_hide_a_real_call_later_in_the_statement(self):
        text = "SELECT audit_note('ALTER FUNCTION public.demo()'), public.demo();"
        self.assertEqual(self.callers({"supabase/migrations/active.sql": text}),
                         [{"file": "supabase/migrations/active.sql", "hits": 1}])

    def test_multiple_signatures_are_ignored_but_default_argument_calls_remain(self):
        text = ("GRANT EXECUTE ON FUNCTION public.demo(), public.demo(integer) TO authenticated;\n"
                "CREATE FUNCTION public.other(value integer DEFAULT public.demo()) RETURNS integer AS $$ SELECT 1 $$ LANGUAGE sql;")
        self.assertEqual(self.callers({"supabase/migrations/active.sql": text}),
                         [{"file": "supabase/migrations/active.sql", "hits": 1}])

    def test_overlapping_scan_paths_do_not_duplicate_real_calls(self):
        self.assertEqual(self.callers({"src/hooks/useDemo.ts": "supabase.rpc('demo')"}, scan_dirs=["src", "src/hooks"]),
                         [{"file": "src/hooks/useDemo.ts", "hits": 1}])

    def test_historical_and_test_files_do_not_prove_current_usage(self):
        excluded = [
            "supabase/migrations/_foreign/other/old.sql", "supabase/migrations/_superseded/old.sql",
            "src/__tests__/client.ts", "src/tests/client.ts", "src/test/client.ts", "src/__fixtures__/client.ts",
            "src/fixtures/client.ts", "src/__mocks__/client.ts", "src/client.test.ts", "src/client.spec.ts",
            "scripts/ci/client.unit.mjs", "scripts/test_client.py", "server/client_test.go", "src/client.stories.tsx",
        ]
        files = {name: "supabase.rpc('demo'); SELECT public.demo();" for name in excluded}
        files["src/client.ts"] = "supabase.rpc('demo')"
        self.assertEqual(self.callers(files), [{"file": "src/client.ts", "hits": 1}])

    def test_similar_names_operational_scripts_and_custom_scan_paths_remain(self):
        names = ["runtime/testimonials.ts", "runtime/customer_foreign/client.ts", "runtime/_superseded_backup/client.ts",
                 "runtime/fixtures-page.ts", "scripts/operations/sync.ts", "supabase/migrations/_foreign.sql"]
        files = {name: "supabase.rpc('demo')" for name in names}
        # SQL reconhece a chamada SQL, não a sintaxe de RPC do cliente.
        files[names[-1]] = "SELECT public.demo();"
        files["src/not_selected.ts"] = "supabase.rpc('demo')"
        self.assertEqual(self.callers(files, scan_dirs=["runtime", "scripts/operations", "supabase/migrations"]),
                         [{"file": name, "hits": 1} for name in sorted(names)])


class SnapshotCronSecretRedactionTests(SnapshotFixture):
    """cron.job.command pode trazer URL e cabeçalho com segredo em texto puro (achado real: pelo
    menos um job deste banco embute x-cron-secret). cron.md e snapshot.json são publicados numa
    branch pública — o command bruto nunca pode chegar lá."""

    # Valor FALSO, só para o teste — nunca o segredo real do banco.
    SEGREDO = "x-cron-secret", "fake00000000000000000000000000000000000000000000000000000000fake"
    URL = "https://supabase.atomicabr.com.br/functions/v1/x"

    def comando_com_segredo(self, *funcoes):
        # net.http_post é sempre chamado: é exatamente o padrão real (job dispara webhook com
        # segredo no cabeçalho) e também é, ele mesmo, uma chamada de função legítima — o teste
        # tem de distinguir "o nome net.http_post pode aparecer" de "a URL/o segredo não podem".
        chamadas = " ".join(f"{f}()" for f in funcoes)
        header, valor = self.SEGREDO
        return (f"select net.http_post(url := '{self.URL}', "
                f"headers := jsonb_build_object('{header}','{valor}')); select {chamadas};")

    def test_pure_function_lists_only_the_called_names(self):
        redigir = self.snapshot.redigir_comando_cron
        self.assertEqual(redigir(self.comando_com_segredo("public.snapshot_cron_health")),
                          "chama: net.http_post, public.snapshot_cron_health")
        # Duas funções: ordem estável (alfabética), sem repetir.
        self.assertEqual(redigir(self.comando_com_segredo("cron.foo", "public.foo", "cron.foo")),
                          "chama: cron.foo, net.http_post, public.foo")
        self.assertEqual(redigir("select 1;"), "(sem chamada reconhecida)")
        self.assertEqual(redigir(None), "(sem chamada reconhecida)")

    def test_pure_function_never_echoes_the_url_or_the_secret_value(self):
        redigir = self.snapshot.redigir_comando_cron
        _, valor_do_segredo = self.SEGREDO
        saida = redigir(self.comando_com_segredo("public.demo"))
        self.assertNotIn(valor_do_segredo, saida)
        self.assertNotIn(self.URL, saida)
        self.assertIn("net.http_post", saida)  # o NOME da função é informação legítima, fica

    def test_main_never_writes_the_raw_command_to_cron_md_or_snapshot_json(self):
        _, valor_do_segredo = self.SEGREDO
        cron = {"installed": True, "jobs": [{
            "jobid": 1, "jobname": "cron-alert-email-every-30min", "schedule": "*/30 * * * *",
            "command": self.comando_com_segredo("public.demo"), "database": "postgres",
            "username": "postgres", "active": True,
        }]}
        self.assertEqual(self.collect(cron=cron), 0)
        cron_md = (self.out / "cron.md").read_text(encoding="utf-8")
        snapshot_json = (self.out / "snapshot.json").read_text(encoding="utf-8")
        for saida in (cron_md, snapshot_json):
            self.assertNotIn(valor_do_segredo, saida, "o segredo do command vazou para a saída publicada")
            self.assertNotIn(self.URL, saida, "a URL do command vazou para a saída publicada")
        self.assertIn("chama: net.http_post, public.demo", cron_md)

    def test_redaction_does_not_break_the_cron_cross_reference(self):
        # build_function_callers roda ANTES da redação: a função ainda precisa aparecer como
        # chamada pelo job em callers["cron"], mesmo depois do command ter sido redigido.
        cron = {"installed": True, "jobs": [{
            "jobid": 7, "jobname": "job-de-teste", "schedule": "*/5 * * * *",
            "command": self.comando_com_segredo("public.demo"), "database": "postgres",
            "username": "postgres", "active": True,
        }]}
        self.assertEqual(self.collect(cron=cron), 0)
        callers = self.metadata()["db"]["functions"][0]["callers"]
        self.assertEqual(callers["cron"], ["7:job-de-teste"])

    def test_carried_cron_is_not_redacted_a_second_time(self):
        # O resumo "chama: f()" não termina em "(" — redigir de novo não bateria no regex e
        # apagaria a informação ("(sem chamada reconhecida)") numa seção que não tem nada de
        # errado, só está reaproveitada por falha de coleta.
        cron = {"installed": True, "jobs": [{
            "jobid": 1, "jobname": "job", "schedule": "*/5 * * * *",
            "command": self.comando_com_segredo("public.demo"), "database": "postgres",
            "username": "postgres", "active": True,
        }]}
        self.assertEqual(self.collect(cron=cron), 0)
        primeira = (self.out / "cron.md").read_text(encoding="utf-8")
        self.assertIn("chama: net.http_post, public.demo", primeira)

        self.assertEqual(self.collect(cron=cron, failures=("cron",)), 0)
        self.assertIn("cron", self.snapshot.CARRIED)
        segunda = (self.out / "cron.md").read_text(encoding="utf-8")
        self.assertIn("chama: net.http_post, public.demo", segunda,
                       "a seção reaproveitada perdeu a redação já feita na publicação anterior")
        self.assertNotIn("sem chamada reconhecida", segunda)

    def test_pre_fix_snapshot_on_disk_is_not_trusted_even_if_cron_fails_right_after_deploy(self):
        # Achado por auditoria adversarial (não visto em produção): um snapshot.json em disco
        # ESCRITO POR UMA VERSAO ANTERIOR do script (format_version velho, sem a redação) ainda
        # tem o command cru com o segredo. Se a coleta de "cron" falhar no primeiro run DEPOIS do
        # deploy deste fix, introspect_db reaproveitaria esse previous_db["cron"] cru, e o guard
        # "cron" not in CARRIED pularia a redação — pensado pra não redigir de novo um resumo já
        # seguro, mas aqui reaproveitaria um dado que NUNCA foi redigido. O bump de FORMAT_VERSION
        # é o que impede isto: um snapshot de versão antiga nunca é aceito como `previous`.
        _, valor_do_segredo = self.SEGREDO
        pre_fix = {
            "format_version": 2,  # versao anterior a este fix (FORMAT_VERSION atual é 3)
            "db": {"cron": {"installed": True, "jobs": [{
                "jobid": 1, "jobname": "job-antigo", "schedule": "*/5 * * * *",
                "command": self.comando_com_segredo("public.demo"),  # CRU: nunca foi redigido
                "database": "postgres", "username": "postgres", "active": True,
            }]}},
            "api": {}, "errors": [], "carried": [],
        }
        self.out.mkdir(parents=True, exist_ok=True)
        (self.out / "snapshot.json").write_text(json.dumps(pre_fix), encoding="utf-8")

        # A coleta de cron falha logo nesse primeiro run pós-deploy — justo o cenário que faria
        # o código vazar o dado reaproveitado, se o format_version não tivesse sido invalidado.
        # collect()==0 (não 2) também prova que prepare_output_directory() não travou o job só
        # por achar a pasta não-vazia com um snapshot.json de versão antiga e sem marcador —
        # achado colateral do mesmo bump: exigir a versão EXATA ali faria o job recusar a própria
        # pasta pra sempre (nenhum run geraria o marcador novo, então nenhum run subsequente
        # passaria). valid_previous_snapshot() agora só confere a forma, não a versão.
        self.assertEqual(self.collect(failures=("cron",)), 0)

        self.assertNotIn("cron", self.snapshot.CARRIED,
                          "snapshot pre-fix nao pode ser aceito como `previous` para carry-over")
        self.assertEqual(self.metadata()["format_version"], self.snapshot.FORMAT_VERSION)
        cron_md = (self.out / "cron.md").read_text(encoding="utf-8")
        snapshot_json = (self.out / "snapshot.json").read_text(encoding="utf-8")
        for saida in (cron_md, snapshot_json):
            self.assertNotIn(valor_do_segredo, saida, "o segredo do snapshot pre-fix vazou pelo carry-over")
            self.assertNotIn(self.URL, saida, "a URL do snapshot pre-fix vazou pelo carry-over")
            self.assertNotIn("job-antigo", saida, "o job antigo nao deveria ter sobrevivido ao reset de versao")


class SnapshotCallerFreshnessTests(SnapshotFixture):
    @staticmethod
    def database(stage):
        consumer = function(f"{stage}_consumer")
        consumer["definition"] = f"CREATE FUNCTION public.{stage}_consumer() RETURNS integer AS $$ SELECT public.demo() $$ LANGUAGE sql;"
        return {
            "functions": [function(), consumer],
            "cron": {"jobs": [{"jobid": stage, "jobname": stage, "command": "SELECT public.demo();"}]},
            "triggers": [{"schema": "public", "table": "orders", "name": f"{stage}_trigger", "function": "public.demo"}],
            "views": [{"schema": "public", "name": f"{stage}_view", "definition": "SELECT public.demo();"}],
        }

    def build(self, database, files):
        with mock.patch.object(self.snapshot, "scan_code_files", return_value=files):
            with contextlib.redirect_stdout(io.StringIO()):
                return self.snapshot.build_function_callers(database)

    def previous_database(self):
        previous = self.database("old")
        self.build(previous, [("src/old.ts", "supabase.rpc('demo')")])
        for entry in previous["functions"]:
            entry["definition_sha"] = self.snapshot.sha(entry["definition"])
            entry["definition"] = None
        return previous

    def exercise_sources(self, failed_sources):
        previous = self.previous_database()
        previous_copy = copy.deepcopy(previous)
        current = self.database("new")
        # introspect_db reutiliza a lista anterior; o mapa não pode alterar esse histórico em memória.
        current["functions"] = previous["functions"]
        self.snapshot.CARRIED[:] = ["functions", *failed_sources]
        for source in failed_sources:
            current[source] = previous[source]
        states = self.build(current, [("src/new.ts", "supabase.rpc('demo')")])
        callers = current["functions"][0]["callers"]
        self.assertEqual(callers["code"], [{"file": "src/new.ts", "hits": 1}])
        self.assertEqual(callers["code_total_files"], 1)
        self.assertEqual(callers["db"], ["public.old_consumer"])
        expected = {"cron": ["new:new"], "triggers": ["public.orders.new_trigger"], "views": ["public.new_view"]}
        for source in expected:
            if source in failed_sources:
                self.assertEqual(callers[source], previous_copy["functions"][0]["callers"][source])
                self.assertIn("anterior", states[source])
            else:
                self.assertEqual(callers[source], expected[source])
                self.assertIn("coleta atual", states[source])
        self.assertIn("anterior", states["db"])
        self.assertEqual(previous, previous_copy, "recalcular callers não pode reescrever a base do changelog")
        self.assertEqual([{k: v for k, v in f.items() if k != "callers"} for f in current["functions"]],
                         [{k: v for k, v in f.items() if k != "callers"} for f in previous_copy["functions"]])

        self.snapshot.CARRIED.clear()
        recovered = self.database("recovered")
        states = self.build(recovered, [("src/recovered.ts", "supabase.rpc('demo')")])
        callers = recovered["functions"][0]["callers"]
        self.assertEqual(callers["db"], ["public.recovered_consumer"])
        self.assertEqual(callers["cron"], ["recovered:recovered"])
        self.assertEqual(callers["triggers"], ["public.orders.recovered_trigger"])
        self.assertEqual(callers["views"], ["public.recovered_view"])
        self.assertTrue(all("coleta atual" in state for state in states.values()))

    def test_unavailable_sources_preserve_known_references_without_claiming_freshness(self):
        previous = self.previous_database()
        expected = copy.deepcopy(previous["functions"][0]["callers"])
        current = {"functions": previous["functions"], "cron": None, "triggers": None, "views": None}
        self.snapshot.CARRIED[:] = ["functions"]
        states = self.build(current, None)
        self.assertEqual(current["functions"][0]["callers"], expected)
        for source in ("code", "cron", "triggers", "views"):
            self.assertIn("indisponível", states[source])

    def test_successful_empty_sources_remove_old_references(self):
        previous = self.previous_database()
        current = {"functions": previous["functions"], "cron": {"jobs": []}, "triggers": [], "views": []}
        self.snapshot.CARRIED[:] = ["functions"]
        states = self.build(current, [])
        callers = current["functions"][0]["callers"]
        for source in ("code", "cron", "triggers", "views"):
            self.assertEqual(callers[source], [])
            self.assertIn("coleta atual", states[source])
        self.assertEqual(callers["code_total_files"], 0)
        self.assertEqual(callers["db"], ["public.old_consumer"])

    def test_unreadable_code_preserves_previous_code_references_and_reports_failure(self):
        previous = self.previous_database()
        expected = copy.deepcopy(previous["functions"][0]["callers"]["code"])
        root = pathlib.Path(self.temp.name) / "repo"
        (root / "src").mkdir(parents=True)
        (root / "src/client.ts").write_text("supabase.rpc('demo')", encoding="utf-8")
        self.snapshot.REPO_ROOT = root
        self.snapshot.CODE_SCAN_DIRS = ["src"]
        self.snapshot.CARRIED[:] = ["functions"]
        with mock.patch.object(pathlib.Path, "read_text", side_effect=PermissionError("fixture ilegível")):
            with contextlib.redirect_stdout(io.StringIO()):
                states = self.snapshot.build_function_callers(previous)
        self.assertEqual(previous["functions"][0]["callers"]["code"], expected)
        self.assertIn("indisponível", states["code"])
        self.assertTrue(any(e["section"] == "callers.code" for e in self.snapshot.ERRORS))

    def test_database_callers_include_defaults_on_the_first_definition_line(self):
        consumer = function("consumer")
        consumer["definition"] = (
            "CREATE OR REPLACE FUNCTION public.consumer(value integer DEFAULT public.demo())\n"
            " RETURNS integer\n LANGUAGE sql\n AS $function$ SELECT value $function$;"
        )
        database = {"functions": [function(), consumer]}
        self.build(database, [])
        self.assertEqual(database["functions"][0]["callers"]["db"], ["public.consumer"])
        self.assertEqual(database["functions"][1]["callers"]["db"], [])


class SnapshotHeartbeatTests(SnapshotFixture):
    def manifest(self):
        return json.loads((self.out / "manifest.json").read_text(encoding="utf-8"))

    def collect_at(self, instant, **options):
        class FrozenDateTime(dt.datetime):
            @classmethod
            def now(cls, tz=None):
                return instant.astimezone(tz) if tz is not None else instant.replace(tzinfo=None)
        with mock.patch.object(self.snapshot.dt, "datetime", FrozenDateTime):
            return self.collect(**options)

    def unified_index(self):
        script = pathlib.Path(__file__).resolve().parents[1] / "regras_negocio" / "indice.py"
        spec = importlib.util.spec_from_file_location("heartbeat_index", script)
        index = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(index)
        arguments = [str(script), "--repo", self.temp.name, "--out", "INDEX.md", "--remote", "owner/repo",
                     "--head", "a" * 40, "--fonte", "banco real=output"]
        with mock.patch.object(sys, "argv", arguments):
            with mock.patch.object(index, "git", side_effect=AssertionError("manifest/CHANGELOG dispensam fallback Git")):
                with contextlib.redirect_stderr(io.StringIO()):
                    self.assertEqual(index.main(), 0)
        return (pathlib.Path(self.temp.name) / "INDEX.md").read_text(encoding="utf-8")

    def test_unchanged_collection_refreshes_utc_heartbeat_without_structural_changes(self):
        first = dt.datetime(2026, 1, 1, 0, 0, tzinfo=dt.timezone.utc)
        second = first + dt.timedelta(minutes=10)
        self.assertEqual(self.collect_at(first), 0)
        original_manifest = self.manifest()
        original_snapshot = (self.out / "snapshot.json").read_bytes()
        original_changelog = (self.out / "CHANGELOG.md").read_bytes()
        original_fingerprints = self.snapshot.fingerprints(self.metadata())
        self.assertEqual(self.collect_at(second), 0)
        current_manifest = self.manifest()
        self.assertEqual(original_manifest["gerado_em"], "2026-01-01T00:00:00Z")
        self.assertEqual(current_manifest["gerado_em"], "2026-01-01T00:10:00Z")
        self.assertEqual(dt.datetime.fromisoformat(current_manifest["gerado_em"]).utcoffset(), dt.timedelta(0))
        self.assertEqual(current_manifest["entrada"], "README.md")
        self.assertEqual(current_manifest["gerador"], "scripts/supabase_snapshot/snapshot.py")
        self.assertEqual(current_manifest["erros"], [])
        self.assertEqual(current_manifest["carried"], [])
        self.assertEqual((self.out / "snapshot.json").read_bytes(), original_snapshot)
        self.assertEqual((self.out / "CHANGELOG.md").read_bytes(), original_changelog)
        self.assertEqual(self.snapshot.fingerprints(self.metadata()), original_fingerprints)

    def test_partial_heartbeat_includes_collection_and_render_errors(self):
        self.collect()
        shutil.rmtree(self.out / "functions")
        self.assertEqual(self.collect(failures={"functions"}), 0)
        manifest = self.manifest()
        self.assertEqual(manifest["erros"], self.metadata()["errors"])
        self.assertEqual({error["section"] for error in manifest["erros"]}, {"functions", "functions.sql"})
        self.assertEqual(manifest["carried"], ["functions"])
        self.assertIn("| parcial ·", self.unified_index())

    def test_recovery_clears_heartbeat_errors_and_carried_sections(self):
        self.collect()
        self.collect(failures={"functions", "migrations"})
        self.assertTrue(self.manifest()["erros"])
        self.assertEqual(set(self.manifest()["carried"]), {"functions", "migrations"})
        self.assertEqual(self.collect(), 0)
        self.assertEqual(self.manifest()["erros"], [])
        self.assertEqual(self.manifest()["carried"], [])

    def test_index_prefers_current_heartbeat_to_old_structural_changelog(self):
        self.collect()
        (self.out / "CHANGELOG.md").write_text("# Histórico\n\n## 2000-01-01 00:00 UTC\n", encoding="utf-8")
        document = self.unified_index()
        self.assertIn("| ok ·", document)
        self.assertNotIn("desatualizado", document)
        # Sem manifest.json não há como confiar em erros/carried do produtor — producer_health()
        # retorna "não verificável" antes mesmo de olhar a idade (README.md de regras_negocio:
        # "não verificável (manifest ausente/ilegível, ...)"). A idade pelo fallback do CHANGELOG
        # ainda aparece como aviso ("desatualizado há..."), só não promovida a estado principal.
        (self.out / "manifest.json").unlink()
        document_sem_manifest = self.unified_index()
        self.assertIn("| não verificável ·", document_sem_manifest)
        self.assertIn("manifest.json ausente", document_sem_manifest)
        self.assertIn("desatualizado há", document_sem_manifest)

    def test_unavailable_collection_does_not_renew_previous_heartbeat(self):
        self.collect()
        before = (self.out / "manifest.json").read_bytes()
        with mock.patch.object(self.snapshot, "introspect_db", return_value=({"functions": None, "migrations": None}, {})):
            with contextlib.redirect_stdout(io.StringIO()):
                self.assertEqual(self.snapshot.main(), 1)
        self.assertEqual((self.out / "manifest.json").read_bytes(), before)

    def test_interrupted_render_does_not_publish_a_completed_heartbeat(self):
        with mock.patch.object(self.snapshot, "render_simple", side_effect=RuntimeError("falha de escrita simulada")):
            with self.assertRaisesRegex(RuntimeError, "falha de escrita"):
                self.collect()
        self.assertFalse((self.out / "manifest.json").exists())


def source_freshness_case(failed_sources):
    def run(self):
        self.exercise_sources(failed_sources)
    return run


for _mask in range(8):
    _sources = tuple(source for bit, source in enumerate(("cron", "triggers", "views")) if _mask & (1 << bit))
    setattr(SnapshotCallerFreshnessTests, f"test_functions_carried_with_{'_'.join(_sources) or 'no_other_failure'}",
            source_freshness_case(_sources))


class SnapshotDBStatsTests(SnapshotFixture):
    """Catálogo e resultados sintéticos; nenhum driver, socket ou banco real."""

    def stats(self, *, schema="extensions", auth_error=False, top=15, failure=None, empty=False):
        snapshot = self.snapshot
        snapshot.ERRORS.clear()
        snapshot.STAT_STATEMENTS_TOP = top
        calls = []

        def query(_conn, sql, params=None):
            calls.append((sql, params))
            compact = " ".join(sql.split())
            if "pg_extension" in compact:
                extension = params[0] if params else "pg_stat_statements"
                if extension == "pgmq":
                    return [{"present": 1}]
                if failure == "catalog":
                    raise PermissionError("catálogo indisponível na fixture")
                if schema is None:
                    return []
                if "extnamespace" in compact:
                    return [{"schema": schema}]
                return [{"present": 1}]  # has_ext do código anterior
            if "total_exec_time" in compact:
                # O backend de teste não inclui a extensão no search_path.
                # Aceita somente um identificador SQL delimitado, não texto cru.
                relation = re.search(
                    r'FROM\s+("(?:""|[^"])*")\.pg_stat_statements\s+s', sql, re.I)
                if relation is None or relation.group(1)[1:-1].replace('""', '"') != schema:
                    raise RuntimeError('relation "pg_stat_statements" does not exist')
                if failure == "permission":
                    raise PermissionError("view sem permissão na fixture")
                if failure == "missing":
                    raise RuntimeError("view removida depois da consulta ao catálogo")
                if failure == "timeout":
                    raise TimeoutError("statement timeout simulado")
                if failure == "row":
                    return [{"query": None}]
                return [] if empty else [{
                    "role": "fixture_reader", "calls": 3, "total_ms": 8,
                    "mean_ms": 2.67, "rows": 3, "query": "select 'literal-fixture'",
                }]
            if "pg_database_size" in compact:
                if failure == "database":
                    raise RuntimeError("banco indisponível na fixture")
                return [{"s": 123456}]
            if "pg_stat_activity" in compact:
                return [{"usename": "fixture_reader", "state": "idle", "n": 2}]
            if "sum(pg_total_relation_size" in compact:
                return [{"schema": "public", "bytes": 45678}]
            if "FROM storage.objects" in compact:
                return [{"bucket_id": "fixture", "objects": 2, "bytes": 42}]
            if "FROM auth." in compact:
                if auth_error:
                    raise PermissionError("permission denied for schema auth")
                if "auth.identities" in compact:
                    return [{"provider": "fixture", "users": 5}]
                if "auth.mfa_factors" in compact:
                    return [{"factor_type": "totp", "status": "verified", "total": 2}]
                return [{"c": 5}]
            if "pgmq.metrics_all()" in compact:
                return [{"queue_name": "fixture", "queue_length": 3, "newest_msg_age_sec": 1,
                         "oldest_msg_age_sec": 2, "total_messages": 4}]
            raise AssertionError(f"Consulta não prevista no modelo offline: {compact[:70]}")

        with mock.patch.object(snapshot, "q", side_effect=query):
            with mock.patch.object(snapshot.urllib.request, "urlopen", side_effect=AssertionError("HTTP proibido")):
                with contextlib.redirect_stdout(io.StringIO()):
                    result = snapshot.get_db_stats(OfflineConnection())
        errors = {error["section"] for error in snapshot.ERRORS}
        return result, calls, errors

    def assert_core_metrics(self, stats, auth_error):
        self.assertIsInstance(stats, dict, "Falha opcional não deve descartar db_stats")
        self.assertEqual(stats["database_bytes"], 123456)
        self.assertEqual(stats["connections"], [{"usename": "fixture_reader", "state": "idle", "n": 2}])
        self.assertEqual(stats["schema_bytes"], [{"schema": "public", "bytes": 45678}])
        self.assertEqual(stats["storage"], [{"bucket_id": "fixture", "objects": 2, "bytes": 42}])
        self.assertEqual(stats["queues"][0]["queue_length"], 3)
        self.assertEqual(bool(stats["auth"]), not auth_error)

    def exercise_schema(self, schema, auth_error):
        stats, calls, errors = self.stats(schema=schema, auth_error=auth_error)
        self.assert_core_metrics(stats, auth_error)
        self.assertEqual(stats["top_queries"][0]["query"], "select '?'")
        self.assertEqual(errors, {"db_stats.auth"} if auth_error else set())
        lookup = [(sql, params) for sql, params in calls if "extnamespace" in sql]
        self.assertEqual(len(lookup), 1)
        top_calls = [(sql, params) for sql, params in calls if "total_exec_time" in sql]
        self.assertEqual(len(top_calls), 1)
        # Sem binds, '%' no identificador não vira placeholder do psycopg.
        self.assertIsNone(top_calls[0][1])
        self.assertIn("LIMIT 15", top_calls[0][0])

    def exercise_availability(self, present, top, auth_error):
        stats, calls, errors = self.stats(schema="extensions" if present else None,
                                         top=top, auth_error=auth_error)
        self.assert_core_metrics(stats, auth_error)
        self.assertEqual(errors, {"db_stats.auth"} if auth_error else set())
        self.assertEqual("top_queries" in stats, present and top > 0)
        stat_calls = [(sql, params) for sql, params in calls
                      if "total_exec_time" in sql or "extnamespace" in sql or params == ("pg_stat_statements",)]
        if top <= 0:
            self.assertEqual(stat_calls, [])
        elif present:
            self.assertEqual(len(stat_calls), 2)
            self.assertIn("LIMIT 1", stat_calls[-1][0])
        else:
            self.assertEqual(len(stat_calls), 1)

    def exercise_failure(self, failure, auth_error):
        stats, _, errors = self.stats(failure=failure, auth_error=auth_error)
        self.assert_core_metrics(stats, auth_error)
        self.assertNotIn("top_queries", stats)
        expected = {"db_stats.top_queries"} | ({"db_stats.auth"} if auth_error else set())
        self.assertEqual(errors, expected)

    def exercise_recovery(self, auth_error, empty):
        failed, _, errors = self.stats(failure="permission", auth_error=auth_error)
        self.assert_core_metrics(failed, auth_error)
        self.assertIn("db_stats.top_queries", errors)
        recovered, _, errors = self.stats(empty=empty, auth_error=auth_error)
        self.assert_core_metrics(recovered, auth_error)
        self.assertEqual(errors, {"db_stats.auth"} if auth_error else set())
        self.assertEqual(len(recovered["top_queries"]), 0 if empty else 1)
        self.assertNotIn("top_queries", failed, "Recuperação não deve alterar o resultado anterior")

    def test_schema_is_resolved_again_after_extension_moves(self):
        first, _, first_errors = self.stats(schema="extensions")
        second, _, second_errors = self.stats(schema='Stats "new"')
        self.assert_core_metrics(first, False)
        self.assert_core_metrics(second, False)
        self.assertEqual(first_errors | second_errors, set())
        self.assertEqual(first["top_queries"], second["top_queries"])

    def test_partial_metrics_remain_in_rendered_json_and_markdown(self):
        stats, _, errors = self.stats(failure="missing", auth_error=True)
        self.assert_core_metrics(stats, True)
        self.snapshot.render_stats({"db_stats": stats}, {}, {})
        rendered = json.loads((self.out / "stats.json").read_text())["db"]["db_stats"]
        self.assertEqual(rendered["database_bytes"], 123456)
        self.assertEqual(rendered["queues"][0]["queue_name"], "fixture")
        self.assertNotIn("top_queries", rendered)
        self.assertTrue((self.out / "stats.md").exists())
        self.assertEqual(errors, {"db_stats.auth", "db_stats.top_queries"})

    def test_mandatory_database_failure_keeps_section_error_contract(self):
        stats, _, errors = self.stats(failure="database")
        self.assertIsNone(stats)
        self.assertEqual(errors, {"db_stats"})


class SnapshotConfigurationTests(unittest.TestCase):
    def test_invalid_integer_environment_is_reported_without_traceback(self):
        script = pathlib.Path(__file__).with_name("snapshot.py")
        for key, value in (("CRON_RUNS_PER_JOB", "x"), ("STAT_STATEMENTS_TOP", "1.5"),
                           ("CODE_SCAN_MAX_FILES", "")):
            with self.subTest(key=key):
                driver = types.ModuleType("psycopg")
                driver.connect = mock.Mock(side_effect=AssertionError("conexão proibida"))
                rows = types.ModuleType("psycopg.rows")
                rows.dict_row = object()
                spec = importlib.util.spec_from_file_location(f"snapshot_invalid_{key}", script)
                snapshot = importlib.util.module_from_spec(spec)
                env = {"SUPABASE_DB_URL": "offline-fixture", key: value}
                with mock.patch.dict(sys.modules, {"psycopg": driver, "psycopg.rows": rows}):
                    with mock.patch.dict(os.environ, env, clear=True):
                        spec.loader.exec_module(snapshot)
                with contextlib.redirect_stderr(io.StringIO()) as stderr:
                    self.assertEqual(snapshot.main(), 2)
                message = stderr.getvalue()
                self.assertIn(f"Configuração inválida: {key}", message)
                self.assertNotIn("Traceback", message)


def db_stats_case(method, *args):
    def run(self):
        getattr(self, method)(*args)
    return run


for _index, _schema in enumerate((
        "extensions", "public", "analytics", "Query Metrics", 'stats"quoted',
        "select", "stats%raw", 'stats"; DROP TABLE private; --')):
    for _auth_error in (False, True):
        setattr(SnapshotDBStatsTests, f"test_schema_{_index}_auth_{_auth_error}",
                db_stats_case("exercise_schema", _schema, _auth_error))

for _present in (False, True):
    for _top in (0, -1, 1):
        for _auth_error in (False, True):
            setattr(SnapshotDBStatsTests, f"test_available_{_present}_top_{_top}_auth_{_auth_error}",
                    db_stats_case("exercise_availability", _present, _top, _auth_error))

for _failure in ("catalog", "permission", "missing", "timeout", "row"):
    for _auth_error in (False, True):
        setattr(SnapshotDBStatsTests, f"test_failure_{_failure}_auth_{_auth_error}",
                db_stats_case("exercise_failure", _failure, _auth_error))

for _auth_error in (False, True):
    for _empty in (False, True):
        setattr(SnapshotDBStatsTests, f"test_recovery_auth_{_auth_error}_empty_{_empty}",
                db_stats_case("exercise_recovery", _auth_error, _empty))


class ScrubTests(SnapshotFixture):
    """Redação de segredos: nada com cara de token pode sair para a branch pública de contexto."""

    HEX64 = "9f" * 32  # valor fictício com o formato do segredo real do pg_cron
    # DSN fictícia montada em partes: o literal inteiro dispara o scanner de segredos do CI.
    DSN_PW = "Sup3r" + "Senha"
    DSN = "postgresql" + "://postgres:" + DSN_PW + "@" + "db.host:5432/postgres"

    def test_name_value_pair_with_comma_is_redacted(self):
        # Formato que vazou em cron.md/snapshot.json: jsonb_build_object('x-cron-secret','<hex64>').
        cases = [
            f"headers := jsonb_build_object('Content-Type','application/json','x-cron-secret','{self.HEX64}')",
            f"jsonb_build_object('x-cron-secret', '{self.HEX64}')",
            f"jsonb_build_object('x-cron-secret' ,\n  '{self.HEX64}')",
            f'{{"X-Cron-Secret", "{self.HEX64}"}}',
            f"VALUES ('service_api_key', '{self.HEX64}')",
            f"ARRAY['authorization','{self.HEX64}']",
            f"('webhook.token','{self.HEX64}')",
            f"select vault.create_secret('{self.HEX64}') , 'cron_secret', '{self.HEX64}'",
        ]
        for text in cases[:-1]:
            out = self.snapshot.scrub(text)
            self.assertNotIn(self.HEX64, out, text)
            self.assertIn("[REDACTED]", out, text)
        # O par nomeado é redigido mesmo quando outra forma (ainda não coberta) aparece na mesma linha.
        self.assertIn("'cron_secret', '[REDACTED]'", self.snapshot.scrub(cases[-1]))

    def test_pair_rule_keeps_names_and_prose(self):
        # Não pode mutilar o que não é segredo: nomes de chave, mensagens, tipos, valores curtos.
        keep = [
            "jsonb_build_object('error','invalid_token','description','Token inválido ou expirado')",
            "jsonb_build_object('token_type','bearer','expires_in',3600)",
            "RAISE EXCEPTION 'password', 'A senha precisa de pelo menos 12 caracteres e 1 número'",
            "jsonb_build_object('secret_name','cron_secret')",
            "current_setting('app.cron_secret', true)",
            "jsonb_build_object('x-cron-secret', current_setting('app.cron_secret', true))",
            "jsonb_build_object('x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret'))",
            "COMMENT ON COLUMN t.api_key IS 'identificador_publico_da_integracao'",
            "SELECT 'token', 'pending', 'approved'",
        ]
        for text in keep:
            self.assertEqual(self.snapshot.scrub(text), text, text)

    def test_bearer_header_pair_still_handled_by_bearer_rule(self):
        out = self.snapshot.scrub(f"jsonb_build_object('Authorization','Bearer {self.HEX64}')")
        self.assertNotIn(self.HEX64, out)
        self.assertIn("Bearer [REDACTED]", out)

    def test_existing_rules_still_redact(self):
        jwt = "eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIn0.abcdefghijk"
        for text, secret in [
            (f"apikey: {jwt}", jwt),
            ("x-api-key = 'abc123def456ghi789jkl'", "abc123def456ghi789jkl"),
            (self.DSN, self.DSN_PW),
            ("ALTER ROLE app PASSWORD 'hunter2'", "hunter2"),
            ("sb_secret_abcdefgh12345678", "sb_secret_abcdefgh12345678"),
        ]:
            self.assertNotIn(secret, self.snapshot.scrub(text), text)

    def test_q_scrubs_rows_from_database(self):
        # Caminho real: todo texto vindo do banco passa por q() -> scrub_value().
        row = {"jobname": "tpm", "command": f"select net.http_post(headers := jsonb_build_object('x-cron-secret','{self.HEX64}'))",
               "nested": [{"k": f"'api_key','{self.HEX64}'"}]}
        cleaned = {k: self.snapshot.scrub_value(v) for k, v in row.items()}
        self.assertNotIn(self.HEX64, json.dumps(cleaned))
        self.assertEqual(cleaned["jobname"], "tpm")

    def test_scrub_is_idempotent(self):
        text = f"jsonb_build_object('x-cron-secret','{self.HEX64}') apikey: abc123def456ghi789jkl {self.DSN}"
        once = self.snapshot.scrub(text)
        self.assertEqual(self.snapshot.scrub(once), once)

    def test_previous_snapshot_is_rescrubbed_before_carry_over(self):
        # Snapshot anterior gravado com a redação antiga ainda tem o segredo; se a seção cron falhar
        # agora, o carry-over não pode republicá-lo.
        leaked = f"select net.http_post(headers := jsonb_build_object('x-cron-secret','{self.HEX64}'))"
        self.out.mkdir(parents=True, exist_ok=True)
        (self.out / "snapshot.json").write_text(json.dumps({
            "format_version": self.snapshot.FORMAT_VERSION,
            "db": {"cron_jobs": [{"jobid": 5, "jobname": "tpm", "command": leaked}]},
            "api": {},
        }), encoding="utf-8")
        seen = {}

        def fake_introspect(previous_db):
            seen["previous"] = copy.deepcopy(previous_db)
            raise SystemExit(0)

        with mock.patch.object(self.snapshot, "introspect_db", side_effect=fake_introspect):
            with contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()):
                with self.assertRaises(SystemExit):
                    self.snapshot.main()
        self.assertIn("previous", seen)
        self.assertNotIn(self.HEX64, json.dumps(seen["previous"]))
        self.assertIn("[REDACTED]", json.dumps(seen["previous"]))

    def test_record_error_scrubs_dsn_password(self):
        self.snapshot.ERRORS.clear()
        with contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()):
            self.snapshot.record_error("db.conexao", f'connection to "{self.DSN}" failed')
        try:
            self.assertEqual(len(self.snapshot.ERRORS), 1)
            self.assertNotIn(self.DSN_PW, self.snapshot.ERRORS[0]["error"])
            self.assertIn("db.host", self.snapshot.ERRORS[0]["error"])
        finally:
            self.snapshot.ERRORS.clear()


class RecordingConnection(OfflineConnection):
    def __init__(self):
        self.commands = []

    def execute(self, command):
        self.commands.append(command)
        super().execute(command)


class FakeCursor:
    def __init__(self, rows):
        self.rows = rows

    def __enter__(self):
        return self

    def __exit__(self, *_):
        return False

    def execute(self, sql, params=None):
        pass

    def fetchall(self):
        return self.rows


class FakeRowsConnection:
    def __init__(self, rows):
        self.rows = rows

    def cursor(self, row_factory=None):
        return FakeCursor(self.rows)


class SnapshotCatalogContractTests(SnapshotFixture):
    """Contratos das consultas de catálogo: o SQL é o que o teste offline consegue provar."""

    def run_section(self, section, fake_q):
        with mock.patch.object(self.snapshot, "q", side_effect=fake_q):
            with contextlib.redirect_stdout(io.StringIO()):
                return section(OfflineConnection())

    def test_connection_is_read_only_with_timeouts_before_any_section_runs(self):
        connection = RecordingConnection()
        self.snapshot.DB_SECTIONS = []
        with mock.patch.object(self.snapshot.psycopg, "connect", return_value=connection) as connect:
            with contextlib.redirect_stdout(io.StringIO()):
                self.snapshot.introspect_db(None)
        self.assertEqual(connection.commands, [
            "SET default_transaction_read_only = on", "SET statement_timeout = '90s'", "SET lock_timeout = '5s'"])
        self.assertTrue(connect.call_args.kwargs["autocommit"])

    def test_q_scrubs_every_row_it_returns(self):
        secret = "9f" * 32
        rows = [{"jobname": "tpm", "command": f"select http_post(headers := jsonb_build_object('x-cron-secret','{secret}'))",
                 "nested": [{"k": f"apikey: {secret}"}]}]
        result = self.snapshot.q(FakeRowsConnection(rows), "SELECT 1")
        self.assertNotIn(secret, json.dumps(result))
        self.assertEqual(result[0]["jobname"], "tpm")

    def test_vault_reads_names_only_never_the_decrypted_value(self):
        seen = []

        def fake_q(_conn, sql, params=None):
            seen.append(" ".join(sql.split()))
            return [{"present": 1}]

        self.run_section(self.snapshot.get_vault, fake_q)
        query = seen[-1]
        self.assertRegex(query, r"^SELECT name, description, created_at FROM vault\.secrets\b")
        self.assertNotIn("decrypted", query.lower())

    def test_realtime_publication_tables_skip_the_daily_partitions_of_realtime_messages(self):
        seen = []

        def fake_q(_conn, sql, params=None):
            seen.append(" ".join(sql.split()))
            return []

        self.run_section(self.snapshot.get_realtime, fake_q)
        tables = [sql for sql in seen if "pg_publication_tables" in sql]
        self.assertEqual(len(tables), 1)
        self.assertIn("WHERE schemaname <> 'realtime'", tables[0])

    def test_server_settings_match_timezone_case_insensitively_and_report_the_global_timeout(self):
        seen = []

        def fake_q(_conn, sql, params=None):
            seen.append(" ".join(sql.split()))
            if "pg_settings" in sql:
                # pg_settings guarda o GUC como "TimeZone".
                return [{"name": "TimeZone", "setting": "UTC"}, {"name": "statement_timeout", "setting": "0"}]
            return [{"db": "postgres"}]

        info = self.run_section(self.snapshot.get_server, fake_q)
        settings = seen[0]
        self.assertIn("lower(name) IN", settings)
        self.assertRegex(settings, r"CASE WHEN name = 'statement_timeout' THEN reset_val ELSE setting END")
        self.assertEqual(info["timezone"], "UTC")
        self.assertNotIn("TimeZone", info)

    def test_lints_flag_tables_without_rls_and_rls_without_policies(self):
        def fake_q(_conn, sql, params=None):
            if "relrowsecurity" in sql:
                return [{"schema": "public", "table": "open", "rls": False, "policies": 0},
                        {"schema": "public", "table": "closed", "rls": True, "policies": 0},
                        {"schema": "public", "table": "fine", "rls": True, "policies": 2}]
            return []

        lints = self.run_section(self.snapshot.get_lints, fake_q)
        self.assertEqual([(l["severity"], l["code"], l["object"]) for l in lints],
                         [("ALTA", "rls_disabled", "public.open"), ("MÉDIA", "rls_no_policies", "public.closed")])


class SnapshotChangelogTests(SnapshotFixture):
    def entries(self):
        return (self.out / "CHANGELOG.md").read_text(encoding="utf-8").split("\n## ")[1:]

    def test_code_only_change_of_callers_is_not_a_database_change(self):
        self.assertEqual(self.collect(), 0)
        changelog = (self.out / "CHANGELOG.md").read_bytes()
        snapshot_before = (self.out / "snapshot.json").read_bytes()
        self.source_files = [("src/a.ts", "supabase.rpc('demo')"), ("src/b.ts", "supabase.rpc('demo')")]
        self.assertEqual(self.collect(), 0)
        self.assertNotEqual((self.out / "snapshot.json").read_bytes(), snapshot_before, "callers continua no arquivo")
        self.assertEqual((self.out / "CHANGELOG.md").read_bytes(), changelog)

    def test_real_function_change_is_still_recorded(self):
        self.collect()
        self.collect(functions=[function(value=2)])
        self.assertIn("**functions** alterado (1): `public.demo()`", self.entries()[0])

    def test_policies_are_tracked_by_the_changelog(self):
        policy = {"schema": "public", "table": "jobs", "name": "sel", "using": "true"}
        old = self.snapshot.fingerprints({"db": {"policies": [policy]}})
        new = self.snapshot.fingerprints({"db": {"policies": [policy, {**policy, "name": "ins"}, ]}})
        self.assertEqual(self.snapshot.diff_fingerprints(old, new), [("policies (RLS)", "adicionado", ["public.jobs.ins"])])
        changed = self.snapshot.fingerprints({"db": {"policies": [{**policy, "using": "false"}]}})
        self.assertEqual(self.snapshot.diff_fingerprints(old, changed), [("policies (RLS)", "alterado", ["public.jobs.sel"])])

    def test_changelog_keeps_a_bounded_number_of_entries(self):
        self.out.mkdir()
        for i in range(330):
            self.snapshot.update_changelog([("tabelas", "adicionado", [f"public.t{i}"])], previous_existed=True)
        entries = self.entries()
        self.assertLessEqual(len(entries), 301)
        self.assertIn("`public.t329`", entries[0])
        self.assertNotIn("public.t0`", (self.out / "CHANGELOG.md").read_text(encoding="utf-8"))

    def test_realtime_partition_rotation_is_not_filtered_after_collection(self):
        # a filtragem é do SQL; o changelog continua registrando o que a coleta devolver.
        old = self.snapshot.fingerprints({"db": {"realtime": {"tables": [
            {"publication": "p", "schema": "realtime", "table": "messages_2026_11_05"}]}}})
        new = self.snapshot.fingerprints({"db": {"realtime": {"tables": [
            {"publication": "p", "schema": "realtime", "table": "messages_2026_11_12"}]}}})
        self.assertEqual(len(self.snapshot.diff_fingerprints(old, new)), 2)


class SnapshotHeartbeatHonestyTests(SnapshotFixture):
    def test_every_structural_section_carried_is_a_database_outage(self):
        self.assertEqual(self.collect(), 0)
        watched = ("manifest.json", "snapshot.json", "README.md", "CHANGELOG.md", "errors.md")
        before = {name: (self.out / name).read_bytes() for name in watched}
        with contextlib.redirect_stderr(io.StringIO()):
            self.assertEqual(self.collect(failures={"server", "functions", "migrations"}), 1)
        self.assertEqual(set(self.snapshot.CARRIED), {"server", "functions", "migrations"})
        for name in watched:
            self.assertEqual((self.out / name).read_bytes(), before[name], name)

    def test_one_fresh_section_is_enough_to_publish_a_partial_collection(self):
        self.collect()
        self.assertEqual(self.collect(failures={"functions", "migrations"}), 0)

    def test_total_failure_without_history_is_still_an_outage(self):
        self.assertEqual(self.collect(failures={"server", "functions", "migrations"}), 1)
        self.assertFalse((self.out / "manifest.json").exists())


class SnapshotOutputOwnershipTests(SnapshotFixture):
    def lose_hidden_files(self):
        # upload-artifact não leva arquivos ocultos: o marcador nunca chega à branch.
        (self.out / self.snapshot.OUTPUT_MARKER).unlink()
        (self.out / ".gitattributes").unlink()

    def test_manifest_proves_ownership_when_marker_is_missing_and_snapshot_json_is_corrupt(self):
        self.collect()
        self.lose_hidden_files()
        text = (self.out / "snapshot.json").read_text(encoding="utf-8")
        (self.out / "snapshot.json").write_text(text[:300], encoding="utf-8")
        self.assertEqual(self.collect(), 0)
        self.assertEqual(self.metadata()["errors"], [])
        self.assertEqual((self.out / self.snapshot.OUTPUT_MARKER).read_text(encoding="utf-8"), self.snapshot.OUTPUT_MARKER_CONTENT)

    def test_foreign_manifest_does_not_prove_ownership(self):
        self.collect()
        self.lose_hidden_files()
        (self.out / "snapshot.json").write_text("{", encoding="utf-8")
        (self.out / "manifest.json").write_text(json.dumps({"produtor": "outro-produtor"}), encoding="utf-8")
        with contextlib.redirect_stderr(io.StringIO()) as stderr:
            self.assertEqual(self.collect(), 2)
        self.assertIn("sem marcador/snapshot válido", stderr.getvalue())
        self.assertEqual((self.out / "snapshot.json").read_text(encoding="utf-8"), "{")


class SnapshotCommandLineTests(SnapshotFixture):
    def run_main(self, argv):
        stdout, stderr = io.StringIO(), io.StringIO()
        with mock.patch.object(self.snapshot, "introspect_db", side_effect=AssertionError("coleta proibida")):
            with contextlib.redirect_stdout(stdout), contextlib.redirect_stderr(stderr):
                code_ = self.snapshot.main(argv)
        return code_, stdout.getvalue(), stderr.getvalue()

    def test_help_prints_usage_and_exits_zero_without_collecting(self):
        for flag in ("--help", "-h"):
            with self.subTest(flag=flag):
                code_, stdout, _ = self.run_main([flag])
                self.assertEqual(code_, 0)
                self.assertIn("Variáveis de ambiente", stdout)
                self.assertIn("SUPABASE_DB_URL", stdout)
        self.assertFalse(self.out.exists())

    def test_help_works_even_with_invalid_environment(self):
        self.snapshot.CONFIG_ERRORS.append("CRON_RUNS_PER_JOB inválida")
        self.assertEqual(self.run_main(["--help"])[0], 0)

    def test_unknown_options_are_rejected_instead_of_silently_ignored(self):
        for argv in (["--out", "/tmp/x"], ["--bogus"], ["positional"]):
            with self.subTest(argv=argv):
                code_, _, stderr = self.run_main(argv)
                self.assertEqual(code_, 2)
                self.assertIn("unrecognized arguments", stderr)
        self.assertFalse(self.out.exists())


class SnapshotMarkdownSafetyTests(SnapshotFixture):
    def table(self, **overrides):
        return {"schema": "public", "name": "t", "kind": "table", "rls_enabled": True, "rls_forced": False, "owner": "postgres",
                "comment": None, "is_partition": False, "parent": None, "partition_key": None, "partition_bound": None,
                "replica_identity": "default", "from_extension": False, **overrides}

    def test_pipes_are_escaped_in_every_table_cell(self):
        self.assertEqual(self.snapshot.md_cell("a|b\nc"), "a\\|b c")
        rendered = self.snapshot.md_table(["x", "y"], [["a|b", "c"], [None, "d|e|f"]])
        for line in rendered.splitlines():
            self.assertEqual(len(re.findall(r"(?<!\\)\|", line)), 3, line)

    def test_code_span_survives_backticks_in_the_value(self):
        code = self.snapshot.code
        self.assertEqual(code("plain"), "`plain`")
        self.assertEqual(code("a`b"), "``a`b``")
        self.assertEqual(code("`x`"), "`` `x` ``")
        self.assertEqual(code("a``b"), "```a``b```")
        self.assertEqual((code(None), code("")), ("", ""))

    def test_fence_is_longer_than_any_backtick_run_inside(self):
        fence = self.snapshot.md_fence
        self.assertEqual(fence("select 1", "sql"), "```sql\nselect 1\n```\n")
        self.assertEqual(fence("select '```'", "sql"), "````sql\nselect '```'\n````\n")
        self.assertEqual(fence("x ````` y"), "``````\nx ````` y\n``````\n")

    def test_view_definition_with_triple_backticks_keeps_the_markdown_fence_balanced(self):
        view = {"schema": "public", "name": "v", "kind": "view", "definition": " SELECT '```'::text AS fence;", "options": None,
                "owner": "postgres", "comment": None, "populated": None, "security_invoker": True, "depends_on": None}
        with contextlib.redirect_stdout(io.StringIO()):
            self.snapshot.render_simple({"views": [view]}, {"enabled": False})
        text = (self.out / "views.md").read_text(encoding="utf-8")
        self.assertIn("````sql\nSELECT '```'::text AS fence;\n````\n", text)

    def test_multiline_table_comment_cannot_become_a_heading(self):
        db = {"tables": [self.table(comment="primeira\n# titulo\nterceira")]}
        with contextlib.redirect_stdout(io.StringIO()):
            self.snapshot.render_tables(db)
        lines = (self.out / "tables" / "public" / "t.md").read_text(encoding="utf-8").splitlines()
        self.assertEqual([l for l in lines if l.startswith("# ")], ["# public.t"])
        self.assertEqual(lines[2:5], ["> primeira", "> # titulo", "> terceira"])

    def test_dot_schemas_cannot_write_outside_their_folder(self):
        for name in (".", "..", "...", "../.."):
            self.assertNotIn(self.snapshot.slug(name), (".", ".."), name)
            self.assertNotIn("/", self.snapshot.slug(name))
        db = {"tables": [self.table(schema="..", name="README")]}
        with contextlib.redirect_stdout(io.StringIO()):
            self.snapshot.render_tables(db)
        self.assertTrue((self.out / "tables" / "_" / "README.md").is_file())
        self.assertFalse((self.out / "README.md").exists())

    def test_functions_whose_names_collapse_to_the_same_slug_keep_distinct_files(self):
        spaced, underscored = function("f a"), function("f_a")
        self.assertEqual(self.collect(functions=[spaced, underscored]), 0)
        files = sorted(p.name for p in (self.out / "functions" / "public").glob("*.sql"))
        self.assertEqual(len(files), 2)
        bodies = {p.read_text(encoding="utf-8").strip() for p in (self.out / "functions" / "public").glob("*.sql")}
        self.assertEqual(bodies, {spaced["definition"], underscored["definition"]})
        document = (self.out / "functions.md").read_text(encoding="utf-8")
        self.assertEqual(len(set(re.findall(r"\]\((functions/public/[^)]+\.sql)\)", document))), 2)
        # carry-over recalcula os mesmos nomes
        self.assertEqual(self.collect(failures={"functions"}), 0)
        self.assertEqual(sorted(p.name for p in (self.out / "functions" / "public").glob("*.sql")), files)
        self.assertNotIn("SQL indisponível", (self.out / "functions.md").read_text(encoding="utf-8"))

    def test_function_in_a_dot_schema_stays_inside_the_output_folder(self):
        entry = {**function("x"), "schema": ".."}
        self.assertEqual(self.collect(functions=[entry]), 0)
        outside = [p for p in pathlib.Path(self.temp.name).rglob("*.sql") if self.out not in p.parents]
        self.assertEqual(outside, [])
        self.assertTrue(list((self.out / "functions" / "_").glob("x__*.sql")))


API_OK = {
    "": {"id": "ref", "name": "proj", "region": "sa-east-1", "status": "ACTIVE_HEALTHY", "created_at": "x", "organization_id": "o"},
    "/functions": [
        {"slug": "fn-a", "name": "fn-a", "status": "ACTIVE", "version": 3, "verify_jwt": True, "entrypoint_path": "index.ts", "updated_at": 1},
        {"slug": "fn-b", "name": "fn-b", "status": "ACTIVE", "version": 1, "verify_jwt": False, "entrypoint_path": "index.ts", "updated_at": 2}],
    "/secrets": [{"name": "A_KEY", "value": "nao-publicar"}],
    "/config/auth": {"site_url": "https://app.example", "jwt_exp": 3600, "password_min_length": 8, "smtp_pass": "senha-smtp-fixture",
                     "sms_messagebird_access_key": "chave-messagebird-fixture", "external_email_enabled": True,
                     "external_google_secret": "", "hook_custom_access_token_enabled": True, "hook_send_sms_enabled": False,
                     "hook_send_sms_secrets": "v1,whsec_fixture"},
    "/postgrest": {"db_schema": "public", "max_rows": 1000, "jwt_secret": "jwt-fixture"},
    "/config/database/postgres": {}, "/config/database/pooler": [], "/config/storage": {"fileSizeLimit": 1},
    "/network-restrictions": {}, "/ssl-enforcement": {}, "/custom-hostname": {"status": "x"}, "/branches": [],
    "/database/backups": {"region": "r", "pitr_enabled": False, "walg_enabled": True}, "/health": [{"name": "db", "healthy": True}],
}


class ManagementApiFixture(SnapshotFixture):
    def collect_api(self, *, fail=None, responses=None, **options):
        payloads = copy.deepcopy(API_OK if responses is None else responses)
        fail = fail or {}

        def fake_api(path):
            suffix = path[len("/projects/ref"):].split("?")[0]
            if suffix in fail:
                code_, body = fail[suffix] if isinstance(fail[suffix], tuple) else (fail[suffix], b'{"message":"boom"}')
                raise urllib.error.HTTPError(path, code_, "erro", {}, io.BytesIO(body))
            return copy.deepcopy(payloads[suffix])

        self.snapshot.PROJECT_REF, self.snapshot.ACCESS_TOKEN = "ref", "token-fixture"
        with mock.patch.object(self.snapshot, "api", side_effect=fake_api):
            return self.collect(**options)

    def readme(self, slug_):
        return self.out / "edge-functions" / slug_ / "README.md"

    def manifest(self):
        return json.loads((self.out / "manifest.json").read_text(encoding="utf-8"))

    def text(self, name):
        return (self.out / name).read_text(encoding="utf-8")


class ManagementApiFailureTests(ManagementApiFixture):
    def test_custom_hostname_without_the_add_on_is_not_a_collection_error(self):
        for status in (400, 403, 404):
            with self.subTest(status=status):
                self.assertEqual(self.collect_api(fail={"/custom-hostname": status}), 0)
                self.assertEqual(self.manifest()["erros"], [])
                self.assertEqual(self.manifest()["carried"], [])

    def test_400_elsewhere_stays_an_error_and_records_a_short_scrubbed_body(self):
        secret = "9f" * 32
        body = ('{"message":"parametro invalido","apikey":"' + secret + '","detalhe":"' + "x" * 600 + '"}').encode()
        self.assertEqual(self.collect_api(fail={"/branches": (400, body), "/ssl-enforcement": 400}), 0)
        errors = {e["section"]: e["error"] for e in self.manifest()["erros"]}
        self.assertEqual(set(errors), {"api.branches", "api.ssl_enforcement"})
        self.assertIn("HTTP 400 em /projects/ref/branches: ", errors["api.branches"])
        self.assertIn("parametro invalido", errors["api.branches"])
        self.assertNotIn(secret, errors["api.branches"])
        self.assertLessEqual(len(errors["api.branches"]), len("HTTP 400 em /projects/ref/branches: ") + 200)
        self.assertNotIn(secret, self.text("errors.md"))

    def test_error_body_hint_is_redacted_and_tolerates_missing_body(self):
        secret = "9f" * 32
        error = urllib.error.HTTPError("https://api.invalid/x", 400, "erro", {}, io.BytesIO(
            ('{"message":"falhou",\n "apikey": "' + secret + '"}').encode()))
        hint = self.snapshot.api_error_hint(error)
        self.assertTrue(hint.startswith(": {"))
        self.assertNotIn(secret, hint)
        self.assertNotIn("\n", hint)
        self.assertEqual(self.snapshot.api_error_hint(urllib.error.HTTPError("https://api.invalid/x", 400, "erro", {}, None)), "")

    def test_transient_failures_keep_edge_functions_config_and_changelog(self):
        for status in (401, 403, 404, 429, 500):
            with self.subTest(status=status):
                shutil.rmtree(self.out, ignore_errors=True)
                self.assertEqual(self.collect_api(), 0)
                readmes = {s: self.readme(s).read_bytes() for s in ("fn-a", "fn-b")}
                changelog = (self.out / "CHANGELOG.md").read_bytes()
                self.assertEqual(self.collect_api(fail={"/functions": status, "/config/auth": status, "/secrets": status}), 0)
                for s, content in readmes.items():
                    self.assertEqual(self.readme(s).read_bytes(), content)
                self.assertEqual(set(self.manifest()["carried"]), {"api.edge_functions", "api.auth_config", "api.secrets"})
                self.assertEqual({e["section"] for e in self.manifest()["erros"]}, {"api.edge_functions", "api.auth_config", "api.secrets"})
                edge = self.text("edge-functions.md")
                self.assertIn("`api.edge_functions` não pôde ser atualizada", edge)
                self.assertIn("`api.secrets` não pôde ser atualizada", edge)
                self.assertIn("| fn-a |", edge)
                self.assertIn("| A_KEY |", edge)
                auth = self.text("auth.md")
                self.assertIn("`api.auth_config` não pôde ser atualizada", auth)
                self.assertIn("| jwt_exp (s) | 3600 |", auth)
                self.assertIn("| edge functions | 2 |", self.text("README.md"))
                self.assertEqual((self.out / "CHANGELOG.md").read_bytes(), changelog)
                self.assertEqual(self.collect_api(), 0)  # recuperação: sem "adicionado (2)" falso
                self.assertEqual((self.out / "CHANGELOG.md").read_bytes(), changelog)
                self.assertEqual(self.manifest()["carried"], [])
                self.assertNotIn("não pôde ser atualizada", self.text("edge-functions.md"))

    def test_failed_listing_without_history_preserves_existing_readmes_and_says_so(self):
        self.assertEqual(self.collect_api(), 0)
        metadata = self.metadata()
        metadata["api"] = {"enabled": False}  # histórico sem dados da API
        (self.out / "snapshot.json").write_text(json.dumps(metadata), encoding="utf-8")
        readme = self.readme("fn-a").read_bytes()
        self.assertEqual(self.collect_api(fail={"/functions": 401}), 0)
        self.assertEqual(self.readme("fn-a").read_bytes(), readme)
        self.assertTrue(self.readme("fn-b").is_file())
        self.assertEqual(self.manifest()["carried"], [])
        self.assertIn("`api.edge_functions` indisponível nesta coleta e sem versão anterior", self.text("edge-functions.md"))
        self.assertIn("| edge functions | n/d |", self.text("README.md"))

    def test_successful_listing_prunes_only_the_removed_functions(self):
        self.assertEqual(self.collect_api(), 0)
        kept = self.readme("fn-a").read_bytes()
        responses = copy.deepcopy(API_OK)
        responses["/functions"] = responses["/functions"][:1]
        self.assertEqual(self.collect_api(responses=responses), 0)
        self.assertEqual(self.readme("fn-a").read_bytes(), kept)
        self.assertFalse((self.out / "edge-functions" / "fn-b").exists())
        self.assertIn("**edge functions** removido (1): `fn-b`", self.text("CHANGELOG.md"))

    def test_disabled_api_removes_the_orphaned_edge_function_readmes(self):
        self.assertEqual(self.collect_api(), 0)
        self.snapshot.PROJECT_REF, self.snapshot.ACCESS_TOKEN = "", ""
        self.assertEqual(self.collect(), 0)
        self.assertFalse((self.out / "edge-functions").exists())
        self.assertIn("Management API desabilitada", self.text("edge-functions.md"))

    def test_unexpected_response_shapes_become_section_errors_not_crashes(self):
        cases = [
            ("/functions", {"message": "x"}, "api.edge_functions"),
            ("/functions", [{"name": "sem-slug"}], "api.edge_functions"),
            ("/functions", [{"slug": None, "name": "x"}], "api.edge_functions"),
            ("/functions", ["texto"], "api.edge_functions"),
            ("/config/auth", [1], "api.auth_config"),
            ("/postgrest", "oops", "api.postgrest_config"),
            ("", None, "api.project"),
            ("/secrets", [{"name": None}, {"name": "A"}], "api.secrets"),
        ]
        for suffix, payload, section in cases:
            with self.subTest(suffix=suffix, payload=payload):
                responses = copy.deepcopy(API_OK)
                responses[suffix] = payload
                self.assertEqual(self.collect_api(responses=responses), 0)
                self.assertIn(section, {e["section"] for e in self.manifest()["erros"]})
                self.assertTrue((self.out / "auth.md").is_file())

    def test_auth_summary_keeps_numbers_and_hooks_but_not_secrets(self):
        self.assertEqual(self.collect_api(), 0)
        auth = self.text("auth.md")
        self.assertIn("| jwt_exp (s) | 3600 |", auth)
        self.assertIn("| hooks | hook_custom_access_token_enabled |", auth)
        self.assertIn('"password_min_length": 8', auth)
        self.assertIn('"hook_send_sms_enabled": false', auth)
        self.assertIn('"external_google_secret": ""', auth)
        for leaked in ("senha-smtp-fixture", "chave-messagebird-fixture", "whsec_fixture", "jwt-fixture", "nao-publicar"):
            for name in ("auth.md", "project-config.md", "edge-functions.md", "snapshot.json"):
                self.assertNotIn(leaked, self.text(name), name)


class FakeHttpResponse:
    def __init__(self, body):
        self.body = body

    def __enter__(self):
        return self

    def __exit__(self, *_):
        return False

    def read(self):
        return self.body


class ManagementApiRetryTests(SnapshotFixture):
    def call(self, effects, path="/projects/ref/functions"):
        queue = list(effects)

        def urlopen(request, timeout=None):
            effect = queue.pop(0)
            if isinstance(effect, BaseException):
                raise effect
            return FakeHttpResponse(effect)

        sleep = mock.Mock()
        with mock.patch.object(self.snapshot.urllib.request, "urlopen", side_effect=urlopen) as opened:
            with mock.patch.object(self.snapshot, "API_SLEEP", sleep):
                with contextlib.redirect_stdout(io.StringIO()):
                    try:
                        result = self.snapshot.api(path)
                        error = None
                    except Exception as exc:  # noqa: BLE001
                        result, error = None, exc
        return result, error, opened.call_count, sleep

    @staticmethod
    def http(status):
        return urllib.error.HTTPError("https://api.invalid/x", status, "erro", {}, io.BytesIO(b"{}"))

    def test_transient_failures_are_retried_once_after_a_short_backoff(self):
        transient = [self.http(500), self.http(502), self.http(429), urllib.error.URLError("rede"), TimeoutError("lento")]
        for failure in transient:
            with self.subTest(failure=repr(failure)):
                result, error, calls, sleep = self.call([failure, b'{"ok": 1}'])
                self.assertIsNone(error)
                self.assertEqual(result, {"ok": 1})
                self.assertEqual(calls, 2)
                sleep.assert_called_once_with(1.0)

    def test_persistent_transient_failure_stops_after_the_configured_attempts(self):
        result, error, calls, sleep = self.call([self.http(503), self.http(503), b"{}"])
        self.assertIsInstance(error, urllib.error.HTTPError)
        self.assertEqual(error.code, 503)
        self.assertEqual(calls, self.snapshot.API_ATTEMPTS)
        self.assertEqual(sleep.call_count, self.snapshot.API_ATTEMPTS - 1)

    def test_client_errors_are_never_retried(self):
        for status in (400, 401, 403, 404, 422):
            with self.subTest(status=status):
                _, error, calls, sleep = self.call([self.http(status), b"{}"])
                self.assertEqual(error.code, status)
                self.assertEqual(calls, 1)
                sleep.assert_not_called()

    def test_malformed_json_is_not_retried(self):
        _, error, calls, sleep = self.call([b"{truncado", b"{}"])
        self.assertIsInstance(error, ValueError)
        self.assertEqual(calls, 1)
        sleep.assert_not_called()


class RedactionTableTests(SnapshotFixture):
    def test_name_based_redaction_only_hides_values_that_can_be_secrets(self):
        redact = self.snapshot.redact
        hidden = [("smtp_pass", "x"), ("SMTP_PASS", "x"), ("sms_messagebird_access_key", "k"), ("external_x_secret", ["a"]),
                  ("hook_send_sms_secrets", {"v": "1"}), ("jwt_secret", "s"), ("db_password", "p"), ("api_key", "k")]
        for key, value in hidden:
            with self.subTest(hidden=key):
                self.assertEqual(redact({key: value}), {key: "[REDACTED]"})
        shown = [("jwt_exp", 3600), ("password_min_length", 8), ("hook_x_enabled", True), ("hook_y_enabled", False),
                 ("external_google_secret", None), ("smtp_pass", ""), ("secrets", []), ("credentials", {}),
                 ("refresh_token_rotation_enabled", True), ("security_refresh_token_reuse_interval", 10), ("ratio_secret", 0.5)]
        for key, value in shown:
            with self.subTest(shown=key):
                self.assertEqual(redact({key: value}), {key: value})

    def test_redaction_recurses_and_never_invents_keys(self):
        redact = self.snapshot.redact
        self.assertEqual(redact({}), {})
        self.assertEqual(redact({"a": [{"api_key": "k", "n": 1}]}), {"a": [{"api_key": "[REDACTED]", "n": 1}]})
        self.assertEqual(redact({"nome": "x"}), {"nome": "x"})
        self.assertEqual(redact({"url": "postgresql://u:" + "p" * 8 + "@h/db"}), {"url": _PGQL + "u:[REDACTED]@h/db"})
        self.assertEqual(redact([{"token": "t"}, 3, None]), [{"token": "[REDACTED]"}, 3, None])


class ScrubAdversarialTests(SnapshotFixture):
    HEX = "9f" * 32
    # montados em partes: o literal inteiro dispara scanners de segredo.
    SBP = "sb" + "p_" + "0123456789abcdef" * 2 + "01234567"
    TELEGRAM = "https://api.telegram.org/bot" + "123456789" + ":" + "AAH" + "fakefake" * 4 + "/sendMessage"
    SLACK = "https://hooks.slack.com/services/" + "T00000000/B00000000/" + "X1" * 12
    AWS = "aws_secret" + "_access_key=" + "wJalrXUtnFEMI7MDENG" + "bPxRfiCYEXAMPLEKEY"

    LEAKS = [
        ("password = 'CorrectHorseBatteryStaple'", "CorrectHorseBatteryStaple"),
        ("PASSWORD := 'SomenteLetrasAqui'", "SomenteLetrasAqui"),
        ("update t set password=>'SomenteLetrasAqui'", "SomenteLetrasAqui"),
        ("select vault.create_secret('SegredoSemDigitoNenhum', 'nome')", "SegredoSemDigitoNenhum"),
        ("select vault.create_secret(new_secret := 'OutroSegredoLongo', new_name := 'n')", "OutroSegredoLongo"),
        ("select vault.create_secret('com ''aspas'' dentro', 'n')", "aspas"),
        (SBP, SBP),
        (f"select net.http_get('{TELEGRAM}')", TELEGRAM.split("/bot")[1].split("/")[0]),
        (f"webhook '{SLACK}'", "X1X1X1X1"),
        (AWS, "wJalrXUtnFEMI7MDENG"),
        (_PGQL + "postgres:p@ssFake1@db.x.supabase.co:5432/postgres", "ssFake1"),
        (_REDIS + ":SenhaDoRedis9@cache:6379", "SenhaDoRedis9"),
        (_PG + "user:pa/ss1@host/db", "pa/ss1"),
    ]
    KEEP = [
        "password = current_setting('app.password')",
        "password_hash = crypt(new.password, gen_salt('bf'))",
        "select password from auth.users where id = 1",
        "vault.create_secret(secret_value, 'nome')",
        "select vault.create_secret(null, 'n')",
        "select net.http_post('http://kong:8000/functions/v1/x','{\"to\":\"a@b.com\"}')",
        "https://api.telegram.org/botfoo/sendMessage",
        "https://hooks.slack.com/services/",
        "sbp_curto",
        "aws_access_key_id = 'AKIAEXEMPLO'",
        "https://example.com:443/path?next=a",
    ]

    def test_known_leaks_are_redacted(self):
        for text, secret in self.LEAKS:
            with self.subTest(text=text[:40]):
                out = self.snapshot.scrub(text)
                self.assertNotIn(secret, out)
                self.assertIn("[REDACTED", out)

    def test_non_secrets_are_left_alone(self):
        for text in self.KEEP:
            with self.subTest(text=text[:40]):
                self.assertEqual(self.snapshot.scrub(text), text)

    def test_every_rule_is_idempotent(self):
        for text, _ in self.LEAKS:
            once = self.snapshot.scrub(text)
            self.assertEqual(self.snapshot.scrub(once), once, text)

    def test_the_dsn_rule_keeps_the_host_after_the_password(self):
        self.assertEqual(self.snapshot.scrub(_PGQL + "postgres:p@ssFake1@db.x.supabase.co:5432/postgres"),
                         _PGQL + "postgres:[REDACTED]@db.x.supabase.co:5432/postgres")


if __name__ == "__main__":
    unittest.main()
