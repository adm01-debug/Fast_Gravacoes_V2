"""Regressões do publish.sh contra um remoto bare LOCAL em tempdir — nenhum teste fala com remoto real."""
from __future__ import annotations

import os
import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path


SCRIPT = Path(__file__).with_name("publish.sh")
BASH, GIT = shutil.which("bash"), shutil.which("git")
BRANCH_MODE = {"MODE": "branch", "BRANCH_OUT": "contexto"}


@unittest.skipUnless(BASH and GIT, "bash e git são necessários")
class PublishFixture(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory(prefix="context-publish-")
        self.addCleanup(temporary.cleanup)
        self.tmp = Path(temporary.name).resolve()
        for name in ("home", "tmpdir", "bin"):
            (self.tmp / name).mkdir()
        # gh falso: se o script cair no modo PR, a chamada fica registrada e nada sai da máquina
        gh = self.tmp / "bin/gh"
        gh.write_text(f'#!/usr/bin/env bash\necho "gh $*" >> "{self.tmp}/gh.calls"\nexit 1\n', encoding="utf-8")
        gh.chmod(0o755)
        self.env = {"PATH": f"{self.tmp / 'bin'}{os.pathsep}{os.environ['PATH']}", "HOME": str(self.tmp / "home"), "TMPDIR": str(self.tmp / "tmpdir"),
                    "GIT_CONFIG_GLOBAL": os.devnull, "GIT_CONFIG_NOSYSTEM": "1", "GIT_TERMINAL_PROMPT": "0", "HUSKY": "0", "LC_ALL": "C"}
        self.remote = self.tmp / "remote.git"
        self.git(self.tmp, "init", "-q", "--bare", "-b", "main", str(self.remote))
        seed = self.tmp / "seed"
        self.git(self.tmp, "init", "-q", "-b", "main", str(seed))
        (seed / "src").mkdir()
        (seed / "src/a.ts").write_text("export const a = 1\n", encoding="utf-8")
        self.git(seed, "add", "-A")
        self.git(seed, "commit", "-q", "-m", "feat: seed")
        self.git(seed, "remote", "add", "origin", str(self.remote))
        self.git(seed, "push", "-q", "origin", "main")

    def git(self, cwd, *args, check=True):
        result = subprocess.run([GIT, "-c", "user.name=seed", "-c", "user.email=seed@example.com", "-c", "commit.gpgsign=false", *args],
                                cwd=cwd, env=self.env, capture_output=True, text=True, timeout=60)
        if check:
            self.assertEqual(result.returncode, 0, f"git {' '.join(args)}\n{result.stderr}")
        return result.stdout.strip()

    def clone(self, name, *extra):
        path = self.tmp / name
        self.git(self.tmp, "clone", "-q", *extra, str(self.remote), str(path))
        self.git(path, "config", "user.name", "Dev Humano")
        self.git(path, "config", "user.email", "dev@empresa.com")
        return path

    def generate(self, clone, out_dir, text):
        folder = clone / out_dir
        folder.mkdir(parents=True, exist_ok=True)
        (folder / "saida.md").write_text(text + "\n", encoding="utf-8")

    def publish(self, clone, **variables):
        origin = self.git(clone, "remote", "get-url", "origin")
        self.assertTrue(origin.startswith(str(self.tmp)), f"origin fora do tempdir: {origin}")  # trava de segurança do próprio teste
        push_url = variables.get("PUSH_URL", str(self.tmp))
        self.assertTrue(push_url.startswith(str(self.tmp)), f"PUSH_URL fora do tempdir: {push_url}")
        return subprocess.run([BASH, str(SCRIPT)], cwd=clone, env={**self.env, **variables}, capture_output=True, text=True, timeout=120)

    def remote_sha(self, ref):
        return self.git(self.remote, "rev-parse", "-q", "--verify", f"refs/heads/{ref}", check=False)

    def remote_files(self, ref):
        return [f for f in self.git(self.remote, "ls-tree", "-r", "--name-only", ref).splitlines() if f.startswith("docs/")]

    def remote_show(self, ref, path):
        return self.git(self.remote, "show", f"{ref}:{path}")

    def assert_ok(self, result):
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)

    def assert_clean_temp(self, clone):
        self.assertEqual(list((self.tmp / "tmpdir").iterdir()), [])
        self.assertEqual(len(self.git(clone, "worktree", "list").splitlines()), 1)
        self.assertEqual(self.git(clone, "for-each-ref", "refs/ai-context-publish"), "")


class BranchModeTests(PublishFixture):
    def test_first_publication_creates_derived_branch_and_leaves_checkout_untouched(self):
        a = self.clone("A")
        self.generate(a, "docs/ctx/regras", "regras v1")
        head_before = self.git(a, "rev-parse", "HEAD")
        result = self.publish(a, OUT_DIR="docs/ctx/regras", **BRANCH_MODE)
        self.assert_ok(result)
        self.assertIn("publicado em contexto", result.stdout)
        self.assertEqual(self.remote_files("contexto"), ["docs/ctx/regras/saida.md"])
        self.assertEqual(self.remote_show("contexto", "docs/ctx/regras/saida.md"), "regras v1")
        self.assertEqual(self.git(self.remote, "rev-parse", "contexto^"), self.remote_sha("main"))
        self.assertEqual(self.git(self.remote, "log", "-1", "--format=%an <%ae>|%s", "contexto"),
                         "ai-context-bot <ai-context-bot@users.noreply.github.com>|chore(ai-context): atualiza contexto para agentes [skip ci]")
        # quem chamou: mesma branch, mesmo HEAD, saída no disco, nada staged, identidade git preservada, sem lixo temporário
        self.assertEqual((self.git(a, "rev-parse", "--abbrev-ref", "HEAD"), self.git(a, "rev-parse", "HEAD")), ("main", head_before))
        self.assertEqual(self.git(a, "status", "--porcelain"), "?? docs/")
        self.assertEqual((a / "docs/ctx/regras/saida.md").read_text(encoding="utf-8"), "regras v1\n")
        self.assertEqual((self.git(a, "config", "--local", "user.name"), self.git(a, "config", "--local", "user.email")), ("Dev Humano", "dev@empresa.com"))
        self.assert_clean_temp(a)

    def test_republishing_without_change_creates_no_commit(self):
        a = self.clone("A")
        self.generate(a, "docs/ctx/regras", "regras v1")
        self.assert_ok(self.publish(a, OUT_DIR="docs/ctx/regras", **BRANCH_MODE))
        before = self.remote_sha("contexto")
        result = self.publish(a, OUT_DIR="docs/ctx/regras", **BRANCH_MODE)
        self.assert_ok(result)
        self.assertIn("nada a publicar", result.stdout)
        self.assertEqual(self.remote_sha("contexto"), before)
        self.generate(a, "docs/ctx/regras", "regras v2")
        self.assert_ok(self.publish(a, OUT_DIR="docs/ctx/regras", **BRANCH_MODE))
        self.assertNotEqual(self.remote_sha("contexto"), before)
        self.assertEqual(self.remote_show("contexto", "docs/ctx/regras/saida.md"), "regras v2")

    def test_folders_of_other_producers_are_preserved(self):
        b = self.clone("B")
        self.generate(b, "docs/ctx/codigo", "codigo v1")
        self.assert_ok(self.publish(b, OUT_DIR="docs/ctx/codigo", KEEP_DIRS="docs/ctx/regras docs/ctx/supabase", **BRANCH_MODE))
        c = self.clone("C")
        self.generate(c, "docs/ctx/meu banco", "banco v1")
        self.assert_ok(self.publish(c, OUT_DIR="docs/ctx/meu banco", KEEP_DIRS="docs/ctx/regras docs/ctx/codigo", **BRANCH_MODE))
        # clone --single-branch não tem refs/remotes/origin/contexto: o script precisa buscar a branch por conta própria
        a = self.clone("A", "--single-branch", "--branch", "main")
        self.generate(a, "docs/ctx/regras", "regras v1")
        self.assert_ok(self.publish(a, OUT_DIR="docs/ctx/regras", KEEP_DIRS="docs/ctx/codigo\ndocs/ctx/meu banco\ndocs/ctx/ainda-nao-publicado", **BRANCH_MODE))
        self.assertEqual(self.remote_files("contexto"), ["docs/ctx/codigo/saida.md", "docs/ctx/meu banco/saida.md", "docs/ctx/regras/saida.md"])
        # um único KEEP_DIRS com espaço no nome (sem quebra de linha) também é preservado
        self.generate(b, "docs/ctx/codigo", "codigo v2")
        self.assert_ok(self.publish(b, OUT_DIR="docs/ctx/codigo", KEEP_DIRS="docs/ctx/meu banco", **BRANCH_MODE))
        self.assertEqual(self.remote_files("contexto"), ["docs/ctx/codigo/saida.md", "docs/ctx/meu banco/saida.md"])
        self.assertEqual(self.remote_show("contexto", "docs/ctx/meu banco/saida.md"), "banco v1")

    def test_unreadable_remote_aborts_without_publishing_or_deleting(self):
        b = self.clone("B")
        self.generate(b, "docs/ctx/codigo", "codigo v1")
        self.assert_ok(self.publish(b, OUT_DIR="docs/ctx/codigo", **BRANCH_MODE))
        before = self.remote_sha("contexto")
        a = self.clone("A")
        self.generate(a, "docs/ctx/regras", "regras v1")
        # 1) leitura falha no remoto do push (URL errada / sem credencial)
        result = self.publish(a, OUT_DIR="docs/ctx/regras", KEEP_DIRS="docs/ctx/codigo", PUSH_URL=str(self.tmp / "nao-existe.git"), **BRANCH_MODE)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("nada foi publicado nem apagado", result.stderr)
        # 2) origin inacessível no momento da leitura (rede fora): idem
        hidden = self.tmp / "remote-fora.git"
        self.remote.rename(hidden)
        try:
            result = self.publish(a, OUT_DIR="docs/ctx/regras", KEEP_DIRS="docs/ctx/codigo", **BRANCH_MODE)
        finally:
            hidden.rename(self.remote)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("nada foi publicado nem apagado", result.stderr)
        self.assertEqual(self.remote_sha("contexto"), before)
        self.assertEqual(self.remote_files("contexto"), ["docs/ctx/codigo/saida.md"])
        self.assertEqual((a / "docs/ctx/regras/saida.md").read_text(encoding="utf-8"), "regras v1\n")
        self.assert_clean_temp(a)
        # e a execução seguinte, com o remoto de volta, publica normalmente preservando o outro produtor
        self.assert_ok(self.publish(a, OUT_DIR="docs/ctx/regras", KEEP_DIRS="docs/ctx/codigo", **BRANCH_MODE))
        self.assertEqual(self.remote_files("contexto"), ["docs/ctx/codigo/saida.md", "docs/ctx/regras/saida.md"])

    def competitor(self, clone, body):
        """Script que publica como OUTRO produtor; usado como INDEX_CMD para cair entre a leitura e o push de quem o chama."""
        script = self.tmp / "competitor.sh"
        script.write_text("#!/usr/bin/env bash\nset -e\n" + f'cd "{clone}"\n{body}\n'
                          f'MODE=branch BRANCH_OUT=contexto OUT_DIR=docs/ctx/codigo KEEP_DIRS=docs/ctx/regras bash "{SCRIPT}" >/dev/null\n', encoding="utf-8")
        script.chmod(0o755)
        return f'bash "{script}"'

    def test_publisher_racing_in_the_middle_is_merged_not_overwritten(self):
        a, b = self.clone("A"), self.clone("B")
        self.generate(a, "docs/ctx/regras", "regras v1")
        self.assert_ok(self.publish(a, OUT_DIR="docs/ctx/regras", KEEP_DIRS="docs/ctx/codigo", **BRANCH_MODE))
        self.generate(a, "docs/ctx/regras", "regras v2")
        self.generate(b, "docs/ctx/codigo", "codigo v2")
        result = self.publish(a, OUT_DIR="docs/ctx/regras", KEEP_DIRS="docs/ctx/codigo", INDEX_CMD=self.competitor(b, ":"), **BRANCH_MODE)
        self.assert_ok(result)
        self.assertIn("outro publicador atualizou contexto no meio (tentativa 1)", result.stdout)
        self.assertEqual(self.remote_show("contexto", "docs/ctx/regras/saida.md"), "regras v2")
        self.assertEqual(self.remote_show("contexto", "docs/ctx/codigo/saida.md"), "codigo v2")
        self.assert_clean_temp(a)

    def test_lease_gives_up_instead_of_overwriting_a_publisher_that_keeps_winning(self):
        a, b = self.clone("A"), self.clone("B")
        self.generate(a, "docs/ctx/regras", "regras v1")
        self.assert_ok(self.publish(a, OUT_DIR="docs/ctx/regras", KEEP_DIRS="docs/ctx/codigo", **BRANCH_MODE))
        self.generate(a, "docs/ctx/regras", "regras v2")
        self.generate(b, "docs/ctx/codigo", "codigo 0")
        bump = 'n=$(cat .n 2>/dev/null || echo 0); n=$((n + 1)); echo "$n" > .n; echo "codigo $n" > docs/ctx/codigo/saida.md'
        result = self.publish(a, OUT_DIR="docs/ctx/regras", KEEP_DIRS="docs/ctx/codigo", INDEX_CMD=self.competitor(b, bump), **BRANCH_MODE)
        self.assertEqual(result.returncode, 1, result.stdout + result.stderr)
        self.assertIn("após 3 tentativas", result.stderr)
        self.assertEqual(self.remote_show("contexto", "docs/ctx/codigo/saida.md"), "codigo 3")  # o que o outro publicou continua lá
        self.assertEqual(self.remote_show("contexto", "docs/ctx/regras/saida.md"), "regras v1")  # e o nosso não entrou à força
        self.assert_clean_temp(a)

    def test_uncommitted_human_rule_and_local_edits_survive_publication(self):
        a = self.clone("A")
        (a / "docs/ctx/regras/manual").mkdir(parents=True)
        (a / "docs/ctx/regras/manual/regras.md").write_text("regra antiga\n", encoding="utf-8")
        self.git(a, "add", "-A")
        self.git(a, "commit", "-q", "-m", "docs: regra")
        self.git(a, "push", "-q", "origin", "main")
        (a / "docs/ctx/regras/manual/regras.md").write_text("regra EDITADA e não commitada\n", encoding="utf-8")
        (a / "docs/ctx/regras/manual/nova.md").write_text("regra NOVA não rastreada\n", encoding="utf-8")
        (a / "src/a.ts").write_text("export const a = 2 // trabalho em andamento\n", encoding="utf-8")
        self.generate(a, "docs/ctx/regras", "regras v1")
        self.assert_ok(self.publish(a, OUT_DIR="docs/ctx/regras", **BRANCH_MODE))
        self.assertEqual((a / "docs/ctx/regras/manual/regras.md").read_text(encoding="utf-8"), "regra EDITADA e não commitada\n")
        self.assertEqual((a / "docs/ctx/regras/manual/nova.md").read_text(encoding="utf-8"), "regra NOVA não rastreada\n")
        self.assertEqual((a / "docs/ctx/regras/saida.md").read_text(encoding="utf-8"), "regras v1\n")
        self.assertEqual(self.git(a, "diff", "--cached", "--name-only"), "")  # nada foi para o índice de quem chamou
        self.assertEqual(self.git(a, "diff", "--name-only").splitlines(), ["docs/ctx/regras/manual/regras.md", "src/a.ts"])
        self.assertEqual(self.git(a, "ls-files", "--others", "--exclude-standard").splitlines(), ["docs/ctx/regras/manual/nova.md", "docs/ctx/regras/saida.md"])
        self.assertEqual(self.remote_show("contexto", "docs/ctx/regras/manual/regras.md"), "regra EDITADA e não commitada")
        self.assertEqual(self.remote_show("contexto", "src/a.ts"), "export const a = 1")  # edição fora da saída não vaza

    def test_mode_is_case_insensitive_and_invalid_mode_is_an_error(self):
        a = self.clone("A")
        self.generate(a, "docs/ctx/regras", "regras v1")
        result = self.publish(a, OUT_DIR="docs/ctx/regras", MODE="Branch", BRANCH_OUT="contexto")
        self.assert_ok(result)
        self.assertEqual(self.remote_files("contexto"), ["docs/ctx/regras/saida.md"])
        before = self.git(self.remote, "for-each-ref", "--format=%(refname) %(objectname)")
        result = self.publish(a, OUT_DIR="docs/ctx/regras", MODE="brnch", BRANCH_OUT="contexto")
        self.assertEqual(result.returncode, 2)
        self.assertIn("MODE inválido: 'brnch'", result.stderr)
        self.assertEqual(self.git(self.remote, "for-each-ref", "--format=%(refname) %(objectname)"), before)
        self.assertEqual(self.git(a, "rev-list", "--count", "origin/main..HEAD"), "0")
        self.assertFalse((self.tmp / "gh.calls").exists())  # nunca caiu no modo PR


class PushModeTests(PublishFixture):
    def test_commit_left_behind_by_failed_push_is_sent_on_the_next_run(self):
        a = self.clone("A")
        self.generate(a, "docs/ctx/regras", "regras v1")
        hidden = self.tmp / "remote-fora.git"
        self.remote.rename(hidden)
        try:
            failed = self.publish(a, OUT_DIR="docs/ctx/regras", MODE="push")
        finally:
            hidden.rename(self.remote)
        self.assertNotEqual(failed.returncode, 0)
        self.assertEqual(self.git(a, "rev-list", "--count", "origin/main..HEAD"), "1")
        result = self.publish(a, OUT_DIR="docs/ctx/regras", MODE="push")
        self.assert_ok(result)
        self.assertIn("commit gerado anterior ainda não foi enviado — publicando", result.stdout)
        self.assertEqual(self.remote_show("main", "docs/ctx/regras/saida.md"), "regras v1")
        self.assertEqual(self.remote_sha("main"), self.git(a, "rev-parse", "HEAD"))
        again = self.publish(a, OUT_DIR="docs/ctx/regras", MODE="push")
        self.assert_ok(again)
        self.assertIn("nada a commitar", again.stdout)
        self.assertEqual((self.git(a, "config", "--local", "user.name"), self.git(a, "config", "--local", "user.email")), ("Dev Humano", "dev@empresa.com"))
        self.assertEqual(list((self.tmp / "tmpdir").iterdir()), [])

    def test_commit_already_on_origin_is_never_amended_even_in_the_same_second(self):
        a, b = self.clone("A"), self.clone("B")
        self.generate(a, "docs/ctx/regras", "versao A")
        self.generate(b, "docs/ctx/regras", "versao B")
        same_second = {"GIT_AUTHOR_DATE": "2026-11-09T12:00:00+00:00", "GIT_COMMITTER_DATE": "2026-11-09T12:00:00+00:00"}
        self.assert_ok(self.publish(a, OUT_DIR="docs/ctx/regras", MODE="push", **same_second))
        commit_a = self.remote_sha("main")
        result = self.publish(b, OUT_DIR="docs/ctx/regras", MODE="push", GEN_CMD="echo regenerado-por-B > docs/ctx/regras/saida.md; true", **same_second)
        self.assert_ok(result)
        self.assertEqual(self.remote_show("main", "docs/ctx/regras/saida.md"), "regenerado-por-B")
        # o commit de A continua na história (não foi reescrito) e B terminou alinhado com a origem
        self.assertEqual(self.git(self.remote, "merge-base", "--is-ancestor", commit_a, "main", check=False), "")
        self.assertEqual(self.git(self.remote, "rev-parse", "main~1"), commit_a)
        self.git(b, "fetch", "-q", "origin")
        self.assertEqual((self.git(b, "rev-list", "--count", "origin/main..HEAD"), self.git(b, "rev-list", "--count", "HEAD..origin/main")), ("0", "0"))


class DetachedHeadTests(PublishFixture):
    """CI que faz checkout de SHA/tag deixa o HEAD destacado: `HEAD:HEAD` não é destino de push."""

    def detached_clone(self):
        a = self.clone("A")
        self.git(a, "checkout", "-q", "--detach")
        self.generate(a, "docs/ctx/regras", "regras v1")
        return a

    def test_push_mode_without_branch_fails_clearly_and_publishes_nothing(self):
        a = self.detached_clone()
        head = self.git(a, "rev-parse", "HEAD")
        result = self.publish(a, OUT_DIR="docs/ctx/regras", MODE="push", GEN_CMD="touch gerador-rodou")
        self.assertEqual(result.returncode, 2, result.stdout + result.stderr)
        self.assertIn("HEAD destacado", result.stderr)
        self.assertIn("Defina BRANCH=<branch destino>", result.stderr)
        self.assertEqual((self.git(a, "rev-parse", "HEAD"), self.remote_sha("main")), (head, head))  # nenhum commit local nem remoto
        self.assertFalse((a / "gerador-rodou").exists())

    def test_push_mode_with_explicit_branch_publishes_from_detached_head(self):
        a = self.detached_clone()
        result = self.publish(a, OUT_DIR="docs/ctx/regras", MODE="push", BRANCH="main")
        self.assert_ok(result)
        self.assertIn("contexto publicado em", result.stdout)
        self.assertEqual(self.remote_show("main", "docs/ctx/regras/saida.md"), "regras v1")
        self.assertEqual(self.git(self.remote, "log", "-1", "--format=%s", "main"), "chore(ai-context): atualiza contexto para agentes [skip ci]")
        self.assertEqual(self.git(self.remote, "rev-list", "--count", "main"), "2")

    def test_detached_head_outside_target_branch_is_refused(self):
        a = self.clone("A")
        self.git(a, "commit", "-q", "--allow-empty", "-m", "feat: so local")
        self.git(a, "checkout", "-q", "--detach")
        self.generate(a, "docs/ctx/regras", "regras v1")
        main_before = self.remote_sha("main")
        result = self.publish(a, OUT_DIR="docs/ctx/regras", MODE="push", BRANCH="main")
        self.assertEqual(result.returncode, 1, result.stdout + result.stderr)
        self.assertIn("não está contido em origin/main", result.stderr)
        self.assertEqual(self.remote_sha("main"), main_before)

    def test_branch_mode_works_from_detached_head(self):
        a = self.detached_clone()
        result = self.publish(a, OUT_DIR="docs/ctx/regras", **BRANCH_MODE)
        self.assert_ok(result)
        self.assertEqual(self.remote_show("contexto", "docs/ctx/regras/saida.md"), "regras v1")
        self.assertEqual(self.git(self.remote, "rev-parse", "contexto^"), self.remote_sha("main"))
        self.assert_clean_temp(a)


if __name__ == "__main__":
    unittest.main()
