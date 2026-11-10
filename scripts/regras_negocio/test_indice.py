"""Regressões offline do índice único (indice.py): datas, manifest ausente/ilegível e erros do produtor."""
from __future__ import annotations

import importlib.util
import json
import os
import subprocess
import sys
import tempfile
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path


SCRIPT = Path(__file__).with_name("indice.py")
SPEC = importlib.util.spec_from_file_location("context_rules_indice", SCRIPT)
indice = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(indice)

HEAD = "6c96376b1d88ab7baf87a769144be1cd5606972d"
FONTES = {"banco real": "docs/contexto/supabase", "código": "docs/contexto/codigo", "regras de negócio": "docs/contexto/regras"}


class ParseDateTests(unittest.TestCase):
    def test_formats_published_by_the_three_producers(self):
        # valores copiados de origin/contexto:docs/contexto/{codigo,supabase,regras}/manifest.json
        self.assertEqual(indice.parse_dt("2026-11-09T14:45:52.441Z"), datetime(2026, 11, 9, 14, 45, 52, 441000, tzinfo=timezone.utc))
        self.assertEqual(indice.parse_dt("2026-11-09T23:09:47Z"), datetime(2026, 11, 9, 23, 9, 47, tzinfo=timezone.utc))
        self.assertEqual(indice.parse_dt("2026-11-09 14:45 UTC"), datetime(2026, 11, 9, 14, 45, tzinfo=timezone.utc))

    def test_other_timezone_aware_iso_formats(self):
        expected = datetime(2026, 11, 9, 23, 10, tzinfo=timezone.utc)
        for value in ("2026-11-09T23:10:00+00:00", "2026-11-09T20:10:00-03:00", "2026-11-09 23:10:00 UTC", "2026-11-09T23:10Z"):
            with self.subTest(value=value):
                self.assertEqual(indice.parse_dt(value), expected)

    def test_unreadable_or_timezone_less_dates_are_rejected(self):
        for value in ("2026-11-09T23:10:00", "2026-11-09 23:10", "2026-11-09", "09/11/2026 23:10", "ontem", "", None, 1794008715, ["2026"]):
            with self.subTest(value=value):
                self.assertIsNone(indice.parse_dt(value))


class IndexStateTests(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory(prefix="context-index-")
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name)
        self.now = datetime.now(timezone.utc)

    def iso(self, **delta):
        return (self.now - timedelta(**delta)).strftime("%Y-%m-%dT%H:%M:%SZ")

    def source(self, name, manifest=None, raw=None):
        folder = self.root / FONTES[name]
        folder.mkdir(parents=True, exist_ok=True)
        (folder / "README.md").write_text("x\n", encoding="utf-8")
        if raw is not None:
            (folder / "manifest.json").write_bytes(raw)
        elif manifest is not None:
            (folder / "manifest.json").write_text(json.dumps(manifest), encoding="utf-8")
        return folder

    def states(self, *names):
        command = [sys.executable, "-B", str(SCRIPT), "--repo", str(self.root), "--out", "docs/contexto/00-INDEX.md", "--head", HEAD, "--remote", "o/r"]
        for name in names or FONTES:
            command += ["--fonte", f"{name}={FONTES[name]}"]
        result = subprocess.run(command, capture_output=True, text=True, timeout=60,
                                env={**os.environ, "GIT_CEILING_DIRECTORIES": str(self.root.parent)})
        self.assertEqual(result.returncode, 0, result.stderr)
        text = (self.root / "docs/contexto/00-INDEX.md").read_text(encoding="utf-8")
        rows = [line for line in text.splitlines() if line.startswith("| ") and "**" in line]
        return {name: next(row.rsplit("|", 2)[-2].strip() for row in rows if f"**{name}**" in row) for name in names or FONTES}

    def test_fresh_sources_in_production_formats_are_ok(self):
        self.source("código", {"gerado_em": (self.now - timedelta(minutes=2)).strftime("%Y-%m-%dT%H:%M:%S.") + "441Z", "commit": HEAD, "erros": []})
        self.source("banco real", {"gerado_em": self.iso(minutes=3), "erros": [], "carried": []})
        self.source("regras de negócio", {"gerado_em": (self.now - timedelta(minutes=4)).strftime("%Y-%m-%d %H:%M UTC"), "commit": HEAD,
                                          "erros": [], "avisos": []})
        states = self.states()
        self.assertRegex(states["código"], r"^ok · [12] min atrás$")  # a fração .441 fixa desloca até 1 s
        self.assertEqual(states["banco real"], "ok · 3 min atrás")
        self.assertRegex(states["regras de negócio"], r"^ok · [45] min atrás$")

    def test_folder_without_manifest_is_not_ok(self):
        self.source("banco real")
        state = self.states("banco real")["banco real"]
        self.assertTrue(state.startswith("não verificável"), state)
        self.assertIn("manifest.json ausente", state)

    def test_corrupt_manifest_is_not_ok(self):
        self.source("banco real", raw=b"{ nao json")
        self.source("código", raw=b"[1, 2]")
        states = self.states("banco real", "código")
        self.assertEqual(states["banco real"], "não verificável · ⚠️ manifest.json ilegível")
        self.assertEqual(states["código"], "não verificável · ⚠️ manifest.json não contém um objeto JSON")

    def test_date_without_timezone_or_unreadable_is_not_ok(self):
        for value in ((self.now - timedelta(hours=3)).strftime("%Y-%m-%d %H:%M"), "09/11/2026 23:10", 1794008715):
            with self.subTest(value=value):
                self.source("banco real", {"gerado_em": value})
                state = self.states("banco real")["banco real"]
                self.assertTrue(state.startswith("não verificável · ⚠️ data de geração ilegível ou sem timezone no manifest"), state)
                self.assertNotIn("min atrás", state)

    def test_manifest_without_any_date_is_not_ok(self):
        self.source("banco real", {"gerado_em": "", "produtor": "x"})
        self.assertEqual(self.states("banco real")["banco real"],
                         "não verificável · ⚠️ sem data de geração (manifest, CHANGELOG ou git) — idade desconhecida")

    def test_date_in_the_future_is_flagged(self):
        self.source("código", {"gerado_em": self.iso(hours=-5), "commit": HEAD})
        state = self.states("código")["código"]
        self.assertTrue(state.startswith("não verificável · ⚠️ data de geração "), state)
        self.assertIn("min no futuro", state)
        self.assertNotIn("atrás", state)

    def test_small_clock_skew_is_tolerated(self):
        self.source("código", {"gerado_em": self.iso(minutes=-2), "commit": HEAD})
        self.assertEqual(self.states("código")["código"], "ok · 0 min atrás")

    def test_old_database_snapshot_is_stale(self):
        self.source("banco real", {"gerado_em": self.iso(days=3)})
        self.assertEqual(self.states("banco real")["banco real"], "desatualizado · 72h atrás · ⚠️ desatualizado há 72h00")

    def test_source_with_errors_in_manifest_is_never_ok(self):
        self.source("regras de negócio", {"gerado_em": self.iso(minutes=1), "commit": HEAD,
                                          "erros": ["snapshot `docs/contexto/supabase/` não existe nesta execução | derivado de migrations"],
                                          "avisos": ["a", "b"]})
        state = self.states("regras de negócio")["regras de negócio"]
        self.assertTrue(state.startswith("parcial · 1 min atrás · ⚠️ 1 erro(s) de coleta no manifest (erros): snapshot `docs/contexto/supabase/` não existe"), state)
        self.assertIn("2 aviso(s) do produtor no manifest", state)
        self.assertEqual(state.count("|"), 0)  # texto do erro não pode quebrar a tabela Markdown

    def test_warnings_alone_are_shown_but_do_not_downgrade(self):
        self.source("regras de negócio", {"gerado_em": self.iso(minutes=1), "commit": HEAD, "erros": [], "avisos": ["sem snapshot"]})
        self.assertEqual(self.states("regras de negócio")["regras de negócio"], "ok · 1 min atrás · ⚠️ 1 aviso(s) do produtor no manifest")

    def test_missing_folder_is_reported_as_not_generated(self):
        self.source("código", {"gerado_em": self.iso(minutes=1), "commit": HEAD})
        self.assertEqual(self.states("código", "banco real")["banco real"], "ainda não gerado")


if __name__ == "__main__":
    unittest.main()
