"""Exercise failure modes and actual AST behavior in disposable repositories."""
import contextlib
from collections import Counter
import importlib.metadata
import io
import json
import os
from pathlib import Path
import shutil
import signal
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from corpus import check_snapshot, inventory, validate_graph
from pipeline import build, build_lock
from quality import graph_diff, ratchet


class GraphifyIntegrationTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(prefix='fast-graphify-test-')
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.config = {'version': '0.9.48', 'maxWorkers': 1, 'warnFiles': 500,
                       'extensions': ['.ts', '.sql'], 'profiles': {'all': ['src', 'supabase']}}
        self.write('graphify.config.json', json.dumps(self.config))
        self.write('.graphifyignore', '.env*\ngraphify-out/\nnode_modules/\n')
        self.write('src/math.ts', 'export function double(n: number) { return n * 2; }\n')
        self.write('src/main.ts', "import { double } from './math';\nexport function run() { return double(3); }\n")

    def write(self, name, text):
        path = self.root / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text, encoding='utf-8')
        return path

    def build(self):
        with contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()):
            return build(self.root, self.config, 'all')

    def test_excludes_sensitive_outputs_and_outside_symlinks(self):
        self.write('src/.env.ts', 'const secret = 1;')
        self.write('node_modules/dependency.ts', 'export const ignored = 1;')
        self.write('graphify-out/generated.ts', 'export const ignored = 1;')
        with tempfile.TemporaryDirectory() as external:
            outside = Path(external) / 'outside.ts'
            outside.write_text('export const outside = true;')
            (self.root / 'src/link.ts').symlink_to(outside)
            _, files, _, _ = inventory(self.root, self.config, 'all')
        self.assertEqual({p.name for p in files}, {'math.ts', 'main.ts'})

    def test_real_extraction_is_directed_and_retains_source_evidence(self):
        result = self.build()
        manifest, graph = check_snapshot(self.root / 'graphify-out')
        self.assertGreater(result['nodes'], 0)
        self.assertTrue(graph['directed'])
        self.assertEqual(manifest['api_input_tokens'], 0)
        self.assertTrue(any(n.get('source_file') == 'src/math.ts' for n in graph['nodes']))
        raw = json.loads((self.root / 'graphify-out/extraction.json').read_text())
        self.assertTrue(any(e.get('relation') == 'imports_from' for e in raw['edges']))
        report = (self.root / 'graphify-out/GRAPH_REPORT.md').read_text()
        self.assertNotIn('Semantic extraction will be expensive', report)
        self.assertNotIn('graphify update .', report)
        self.assertIn('npm run graph:check', report)
        catalog = json.loads((self.root / 'graphify-out/relation-catalog.json').read_text())
        self.assertGreater(len(catalog['relations']), 0)
        architecture = json.loads((self.root / 'graphify-out/architecture.json').read_text())
        self.assertTrue(architecture['limitation'].startswith('Mapas estáticos'))

    def test_unchanged_build_is_noop(self):
        first = self.build()
        with patch('pipeline.extract', side_effect=AssertionError('must not extract')):
            second = self.build()
        self.assertEqual(first['built_at'], second['built_at'])

    def test_sql_migration_is_represented_without_database(self):
        self.write('supabase/migrations/001_jobs.sql',
                   'CREATE TABLE public.jobs (id uuid PRIMARY KEY, status text NOT NULL);')
        self.build()
        _, graph = check_snapshot(self.root / 'graphify-out')
        self.assertTrue(any(n.get('source_file') == 'supabase/migrations/001_jobs.sql'
                            for n in graph['nodes']))

    def test_profiles_have_independent_snapshots(self):
        self.config['profiles']['security'] = ['src/math.ts']
        self.write('graphify.config.json', json.dumps(self.config))
        self.build()
        before = (self.root / 'graphify-out/graph.json').read_bytes()
        with contextlib.redirect_stdout(io.StringIO()):
            build(self.root, self.config, 'security')
        self.assertEqual((self.root / 'graphify-out/graph.json').read_bytes(), before)
        manifest, _ = check_snapshot(self.root / 'graphify-out/profiles/security')
        self.assertEqual(set(manifest['files']), {'src/math.ts'})

    def test_edit_delete_and_config_change_invalidate_snapshot(self):
        self.build()
        self.write('src/math.ts', 'export function triple(n: number) { return n * 3; }\n')
        signature = inventory(self.root, self.config, 'all')[3]
        with self.assertRaisesRegex(ValueError, 'desatualizado'):
            check_snapshot(self.root / 'graphify-out', signature)
        self.build()
        (self.root / 'src/main.ts').unlink()
        self.build()
        manifest, graph = check_snapshot(self.root / 'graphify-out')
        self.assertNotIn('src/main.ts', manifest['files'])
        self.assertFalse(any(n.get('source_file') == 'src/main.ts' for n in graph['nodes']))
        self.write('tsconfig.json', '{"compilerOptions":{"baseUrl":"."}}')
        with self.assertRaisesRegex(ValueError, 'desatualizado'):
            check_snapshot(self.root / 'graphify-out', inventory(self.root, self.config, 'all')[3])

    def test_failed_extraction_preserves_previous_snapshot(self):
        self.build()
        previous = (self.root / 'graphify-out/graph.json').read_bytes()
        self.write('src/main.ts', 'export const changed = 1;')
        with patch('pipeline.extract', return_value={'nodes': [], 'edges': []}):
            with self.assertRaisesRegex(ValueError, 'vazia'):
                self.build()
        self.assertEqual((self.root / 'graphify-out/graph.json').read_bytes(), previous)
        self.assertFalse((self.root / 'graphify-out/.build.lock').exists())

    def test_concurrent_build_is_rejected(self):
        with build_lock(self.root / 'graphify-out'):
            with self.assertRaisesRegex(ValueError, 'andamento'):
                self.build()

    def test_corruption_is_rejected(self):
        self.build()
        (self.root / 'graphify-out/graph.json').write_text('{}')
        with self.assertRaisesRegex(ValueError, 'inconsistente'):
            check_snapshot(self.root / 'graphify-out')

    def test_missing_endpoint_is_rejected(self):
        with self.assertRaisesRegex(ValueError, 'endpoint'):
            validate_graph({'directed': True, 'nodes': [{'id': 'a'}], 'links': [{'source': 'a', 'target': 'missing'}]})

    def test_duplicate_node_id_is_rejected(self):
        with self.assertRaisesRegex(ValueError, 'duplicados'):
            validate_graph({'directed': True, 'nodes': [{'id': 'a'}, {'id': 'a'}], 'links': []})

    def test_changed_during_build_is_rejected(self):
        from graphify.extract import extract as real_extract
        def changing_extract(*args, **kwargs):
            result = real_extract(*args, **kwargs)
            self.write('src/main.ts', 'export const concurrent = 1;')
            return result
        with patch('pipeline.extract', side_effect=changing_extract):
            with self.assertRaisesRegex(ValueError, 'mudaram'):
                self.build()
        self.assertFalse((self.root / 'graphify-out/manifest.json').exists())

    def test_enrichment_maps_routes_functions_sql_and_simulation_candidates(self):
        self.write('src/routes/AppRoutes.tsx', '<Route path="/jobs" element={<Jobs />} />\n')
        self.write('src/providers/AppProviders.tsx', '<AuthProvider><ThemeProvider>{children}</ThemeProvider></AuthProvider>\n')
        self.write('src/client.ts', "supabase.functions.invoke('sync-jobs'); supabase.from('jobs'); Math.random();\n")
        self.write('src/client.test.ts', "import { schema } from './schema'; import { z } from 'zod';\n")
        self.write('supabase/functions/sync-jobs/index.ts', "import { requireAuth } from '../_shared/auth.ts'; Deno.serve(() => requireAuth());")
        self.write('supabase/migrations/001_jobs.sql', 'CREATE TABLE public.jobs (id uuid); CREATE POLICY p ON public.jobs; SELECT cron.schedule(\'x\', \'* * * * *\', \'SELECT 1\');')
        self.build()
        out = self.root / 'graphify-out'
        architecture = json.loads((out / 'architecture.json').read_text())
        sql = json.loads((out / 'sql-history.json').read_text())
        self.assertEqual(architecture['routes'][0]['path'], '/jobs')
        self.assertEqual(architecture['edge_functions'][0]['name'], 'sync-jobs')
        self.assertTrue(architecture['simulation_candidates'])
        self.assertTrue(sql['objects'])
        self.assertTrue(sql['policies'])
        self.assertTrue(sql['schedules'])
        contracts = json.loads((out / 'test-contract-map.json').read_text())
        self.assertEqual(contracts['tests'][0]['file'], 'src/client.test.ts')

    def test_relation_catalog_preserves_parallel_raw_edges(self):
        self.build()
        catalog = json.loads((self.root / 'graphify-out/relation-catalog.json').read_text())
        raw = json.loads((self.root / 'graphify-out/extraction.json').read_text())
        pairs = Counter((edge.get('source'), edge.get('target')) for edge in raw['edges'])
        expected_parallel = sum(1 for count in pairs.values() if count > 1)
        self.assertEqual(len(catalog['parallel_groups']), expected_parallel)

    def test_diff_and_ratchet_are_read_only(self):
        self.build()
        out = self.root / 'graphify-out'
        baseline = out / 'graph.json'
        self.assertEqual(graph_diff(baseline, baseline)['nodes']['added'], [])
        self.write('graphify-baseline.json', json.dumps({'metrics': {'unresolved_relations': -1}, 'exceptions': []}))
        result = ratchet(self.root, out, 'report')
        self.assertTrue(result['would_fail'])

    def test_quality_audit_fails_clearly_when_overview_missing(self):
        from quality import audit, _overview
        out = self.root / 'graphify-out'
        out.mkdir(parents=True, exist_ok=True)
        # Direto: arquivo ausente → FileNotFoundError com orientação, não KeyError cru.
        with self.assertRaisesRegex(FileNotFoundError, 'overview.json ausente'):
            _overview(out)
        with self.assertRaisesRegex(FileNotFoundError, 'overview.json ausente'):
            audit(self.root, out)
        # JSON corrompido → ValueError com contexto, não rastreamento cru.
        (out / 'overview.json').write_text('{corrompido')
        with self.assertRaisesRegex(ValueError, 'não é JSON válido'):
            _overview(out)

    def test_quality_audit_accepts_absent_optional_artifacts(self):
        from quality import audit
        out = self.root / 'graphify-out'
        out.mkdir(parents=True, exist_ok=True)
        (out / 'overview.json').write_text(json.dumps({'static_only': True}))
        result = audit(self.root, out)
        self.assertTrue(any(check['check'] == 'saída declara limitação estática' and check['pass']
                            for check in result['checks']))

    def test_edge_function_consumers_via_template_or_variable_do_not_crash(self):
        from enrich import _edge_functions
        self.write('src/client.ts',
                   "supabase.functions.invoke(`template-name`);\n"
                   "const fn = 'dynamic-name'; supabase.functions.invoke(fn);\n"
                   "supabase.functions.invoke('literal-name');\n")
        functions, consumers = _edge_functions(self.root, [self.root / 'src/client.ts'])
        by_line = {item['line']: item['function'] for item in consumers}
        # Template literal com nome estático é resolvido; variável real é
        # omitida (impossível resolver estaticamente) — nenhum dos dois crasha
        # nem aponta nome errado.
        self.assertEqual(by_line.get(1), 'template-name')
        self.assertNotIn(2, by_line)
        self.assertEqual(by_line.get(3), 'literal-name')
        self.assertFalse(functions)

    # ── regressões da auditoria de scripts ──────────────────────────────────────────────

    def test_leftover_lock_file_from_dead_process_does_not_block(self):
        # Arquivo de lock que sobrou de um build morto (sem flock preso) não trava o próximo.
        out = self.root / 'graphify-out'
        out.mkdir(parents=True, exist_ok=True)
        (out / '.build.lock').write_text('999999999')
        self.assertGreater(self.build()['nodes'], 0)
        self.assertFalse((out / '.build.lock').exists())

    def test_lock_is_released_when_holder_is_killed(self):
        out = self.root / 'graphify-out'
        code = ("import sys, time; sys.path.insert(0, sys.argv[1]); from pathlib import Path; "
                "from pipeline import build_lock\n"
                "with build_lock(Path(sys.argv[2])):\n    print('locked', flush=True); time.sleep(60)\n")
        holder = subprocess.Popen([sys.executable, '-c', code, str(Path(__file__).resolve().parents[1]), str(out)],
                                  stdout=subprocess.PIPE, text=True)
        try:
            self.assertEqual(holder.stdout.readline().strip(), 'locked')
            # Enquanto o dono vive, outro processo é rejeitado e a mensagem traz o PID dele.
            with self.assertRaisesRegex(ValueError, f'andamento \\(PID {holder.pid}\\)'):
                with build_lock(out):
                    pass
            holder.send_signal(signal.SIGKILL)
            holder.wait(timeout=10)
            with build_lock(out):
                pass
        finally:
            if holder.poll() is None:
                holder.kill()
            holder.stdout.close()
        self.assertFalse((out / '.build.lock').exists())

    def test_reexport_and_dynamic_import_are_not_dead_code(self):
        import networkx as nx
        from enrich import _dead_code_candidates
        graph = nx.DiGraph()
        names = ['src/barrel/index.ts', 'src/barrel/Spinner.ts', 'src/lazy/Page.ts', 'src/orphan.ts', 'src/app.ts',
                 'src/old/a.ts', 'src/old/b.ts']
        for name in names:
            graph.add_node(name, source_file=name)
        graph.add_edge('src/barrel/index.ts', 'src/barrel/Spinner.ts', relation='re_exports')
        graph.add_edge('src/app.ts', 'src/lazy/Page.ts', relation='dynamic_import')
        graph.add_edge('src/app.ts', 'src/barrel/index.ts', relation='imports_from')
        graph.add_edge('src/app.ts', 'src/old/a.ts', relation='reexports')
        graph.add_edge('src/app.ts', 'src/old/b.ts', relation='dynamic_imports')
        graph.add_edge('src/app.ts', 'src/orphan.ts', relation='calls')  # não é importação
        paths = [self.write(name, 'export const x = 1;\n') for name in names]
        candidates = {item['file'] for item in _dead_code_candidates(self.root, graph, paths)['candidates']}
        self.assertEqual(candidates, {'src/orphan.ts', 'src/app.ts'})

    def test_benchmark_scopes_questions_to_profile_and_rejects_vacuous_pass(self):
        import networkx as nx
        from enrich import _benchmark
        graph = nx.DiGraph()
        graph.add_node('auth_guard', label='requireAuth', source_file='supabase/functions/_shared/auth.ts')
        self.write('graphify-benchmark.json', json.dumps({'questions': [
            {'id': 'sec', 'profile': 'security', 'expected_terms': ['auth.ts']},
            {'id': 'front', 'profile': 'frontend', 'expected_terms': ['ProtectedRoute']},
            {'id': 'vazia', 'profile': 'security', 'expected_terms': []},
        ]}))
        full = _benchmark(self.root, graph)
        self.assertEqual((full['passed'], full['total'], full['skipped']), (1, 3, 0))
        self.assertEqual({q['id']: q['pass'] for q in full['questions']}, {'sec': True, 'front': False, 'vazia': False})
        scoped = _benchmark(self.root, graph, 'security')
        self.assertEqual((scoped['passed'], scoped['total'], scoped['skipped']), (1, 2, 1))
        self.assertIsNone(next(q for q in scoped['questions'] if q['id'] == 'front')['pass'])

    def ratchet_with(self, baseline):
        out = self.root / 'graphify-out'
        out.mkdir(parents=True, exist_ok=True)
        (out / 'overview.json').write_text(json.dumps({'unresolved_relations': 10, 'parallel_relation_groups': 10}))
        self.write('graphify-baseline.json', baseline if isinstance(baseline, str) else json.dumps(baseline))
        return ratchet(self.root, out, 'enforce')

    def test_ratchet_rejects_malformed_baseline_instead_of_passing(self):
        for baseline, pattern in [
            ({'metric': {'unresolved_relations': 1}}, 'objeto "metrics"'),
            ({'metrics': {}}, 'objeto "metrics"'),
            ({'metrics': []}, 'objeto "metrics"'),
            ([], 'objeto "metrics"'),
            ({'metrics': {'unresolved_relation': 1}}, 'desconhecida'),
            ({'metrics': {'unresolved_relations': '1'}}, 'inteiro'),
            ({'metrics': {'unresolved_relations': True}}, 'inteiro'),
            ({'metrics': {'unresolved_relations': 1}, 'exceptions': {}}, 'lista'),
            ('{quebrado', 'JSON válido'),
        ]:
            with self.assertRaisesRegex(ValueError, pattern, msg=str(baseline)):
                self.ratchet_with(baseline)
        (self.root / 'graphify-baseline.json').unlink()
        with self.assertRaisesRegex(ValueError, 'ausente'):
            ratchet(self.root, self.root / 'graphify-out', 'enforce')

    def test_ratchet_exception_dates_are_real_dates(self):
        def exc(expires):
            return {'metrics': {'unresolved_relations': 1, 'parallel_relation_groups': 99},
                    'exceptions': [{'metric': 'unresolved_relations', 'reason': 'r', 'responsible': 'x', 'expires_on': expires}]}
        self.assertFalse(self.ratchet_with(exc('2999-12-31'))['would_fail'])
        self.assertTrue(self.ratchet_with(exc('2020-12-31'))['would_fail'])
        # Não-ISO: como string, "31/12/2020" >= "2026-…" valia para sempre.
        for bad in ['31/12/2020', '2026-13-45', 'nunca', '12-31-2030']:
            with self.assertRaisesRegex(ValueError, 'ISO-8601', msg=str(bad)):
                self.ratchet_with(exc(bad))

    def test_ratchet_reports_regression_and_unchecked_metrics(self):
        result = self.ratchet_with({'metrics': {'parallel_relation_groups': 9}, 'exceptions': []})
        self.assertTrue(result['would_fail'])
        self.assertEqual([r['metric'] for r in result['regressions']], ['parallel_relation_groups'])
        self.assertEqual(result['unchecked_metrics'], ['unresolved_relations'])
        ok = self.ratchet_with({'metrics': {'unresolved_relations': 10, 'parallel_relation_groups': 10}})
        self.assertFalse(ok['would_fail'])
        self.assertEqual(ok['unchecked_metrics'], [])

    def test_diff_rejects_non_graph_and_tolerates_edges_without_endpoints(self):
        self.build()
        current = self.root / 'graphify-out/graph.json'
        for content in ['{}', '[]', 'null', '{"nodes": []}', '{quebrado']:
            bad = self.write('bad.json', content)
            with self.assertRaises(ValueError, msg=content):
                graph_diff(bad, current)
        with self.assertRaisesRegex(ValueError, 'não encontrado'):
            graph_diff(self.root / 'nao-existe.json', current)
        loose = self.write('loose.json', json.dumps({'nodes': [{'id': 'a'}, {'id': 1}],
                                                     'links': [{'source': 'a'}, {'source': 'a', 'target': 'b', 'relation': 'calls'}]}))
        result = graph_diff(loose, current)
        self.assertIn('a', result['nodes']['removed'])
        self.assertIn(['a', 'None', 'unknown'], [list(edge) for edge in result['edges']['removed']])

    def test_check_snapshot_explains_missing_or_malformed_manifest(self):
        out = self.root / 'graphify-out'
        with self.assertRaisesRegex(ValueError, 'graph:build'):
            check_snapshot(out)
        self.build()
        good = (out / 'manifest.json').read_text()
        for content in ['[]', 'null', '{}', '{"artifacts": []}', '{"artifacts": {}}', '{quebrado']:
            (out / 'manifest.json').write_text(content)
            with self.assertRaisesRegex(ValueError, 'graph:build', msg=content):
                check_snapshot(out)
        # Build por cima de manifest inválido se cura.
        self.assertGreater(self.build()['nodes'], 0)
        check_snapshot(out)
        (out / 'manifest.json').write_text(good)
        (out / 'overview.json').unlink()
        with self.assertRaisesRegex(ValueError, 'inconsistente: overview.json'):
            check_snapshot(out)


class GraphifyCliTests(unittest.TestCase):
    """run.py ponta a ponta numa cópia isolada (a raiz é derivada da localização do script)."""

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(prefix='fast graphify cli-')  # espaço de propósito
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        source = Path(__file__).resolve().parents[1]
        shutil.copytree(source, self.root / 'scripts/graphify', ignore=shutil.ignore_patterns('__pycache__', 'tests'))
        self.write('graphify.config.json', json.dumps({
            'version': importlib.metadata.version('graphifyy'), 'maxWorkers': 1, 'warnFiles': 500, 'htmlNodeLimit': 5000,
            'extensions': ['.ts'], 'profiles': {'all': ['src'], 'security': ['src/auth']}}))
        self.write('.graphifyignore', 'graphify-out/\n')
        self.write('src/math.ts', 'export function double(n: number) { return n * 2; }\n')
        self.write('src/auth/guard.ts', "import { double } from '../math';\nexport function requireAuth() { return double(1); }\n")
        self.write('graphify-benchmark.json', json.dumps({'questions': [
            {'id': 'guard', 'profile': 'security', 'expected_terms': ['requireAuth']},
            {'id': 'math', 'profile': 'frontend', 'expected_terms': ['math.ts']}]}))
        self.write('graphify-baseline.json', json.dumps({'metrics': {'unresolved_relations': 999, 'parallel_relation_groups': 999}, 'exceptions': []}))
        self.write('docs/graphify/README.md', 'guia\n')
        self.write('.github/workflows/graphify.yml', 'name: graph\n')

    def write(self, name, text):
        path = self.root / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text, encoding='utf-8')
        return path

    def run_cli(self, *args):
        env = {**os.environ, 'PYTHONHASHSEED': '0'}
        result = subprocess.run([sys.executable, str(self.root / 'scripts/graphify/run.py'), *args],
                                capture_output=True, text=True, cwd=tempfile.gettempdir(), env=env)
        return result.returncode, result.stdout + result.stderr

    def test_audit_benchmark_and_ratchet_exit_codes(self):
        code, out = self.run_cli('build')
        self.assertEqual(code, 0, out)
        self.assertEqual(self.run_cli('check')[0], 0)
        self.assertEqual(self.run_cli('audit')[0], 0)
        self.assertEqual(self.run_cli('benchmark')[0], 0)
        self.assertEqual(self.run_cli('ratchet', '--mode', 'enforce')[0], 0)

        # Controle versionado removido → audit reprova (antes: 6/8 e exit 0). O README não entra
        # na assinatura do snapshot, então o grafo continua atual.
        (self.root / 'docs/graphify/README.md').unlink()
        code, out = self.run_cli('audit')
        self.assertEqual(code, 1, out)
        self.assertIn('docs/graphify/README.md', out)
        self.write('docs/graphify/README.md', 'guia\n')

        # Pergunta de regressão que deixa de ser respondida → benchmark reprova (antes: exit 0).
        self.write('graphify-benchmark.json', json.dumps({'questions': [
            {'id': 'sumiu', 'profile': 'security', 'expected_terms': ['termo-que-nao-existe']}]}))
        self.assertEqual(self.run_cli('build')[0], 0)
        code, out = self.run_cli('benchmark')
        self.assertEqual(code, 1, out)
        self.assertIn('sumiu', out)

        # Métrica acima da baseline → enforce reprova, report não.
        self.write('graphify-baseline.json', json.dumps({'metrics': {'unresolved_relations': -1}, 'exceptions': []}))
        self.assertEqual(self.run_cli('build')[0], 0)
        self.assertEqual(self.run_cli('ratchet', '--mode', 'report')[0], 0)
        self.assertEqual(self.run_cli('ratchet', '--mode', 'enforce')[0], 1)

    def test_profile_benchmark_only_counts_its_own_questions(self):
        self.assertEqual(self.run_cli('build', '--profile', 'security')[0], 0)
        code, out = self.run_cli('benchmark', '--profile', 'security')
        self.assertEqual(code, 0, out)
        result = json.loads(out)
        self.assertEqual((result['passed'], result['total'], result['skipped']), (1, 1, 1))
        code, out = self.run_cli('ratchet', '--profile', 'security')
        self.assertEqual(code, 1, out)
        self.assertIn('perfil all', out)

    def test_missing_or_malformed_snapshot_gives_actionable_error(self):
        code, out = self.run_cli('check')
        self.assertEqual(code, 1, out)
        self.assertIn('graph:build', out)
        self.assertNotIn('Traceback', out)
        self.assertEqual(self.run_cli('build')[0], 0)
        for content in ['[]', 'null']:
            (self.root / 'graphify-out/manifest.json').write_text(content)
            code, out = self.run_cli('check')
            self.assertEqual(code, 1, out)
            self.assertNotIn('Traceback', out)
        code, out = self.run_cli('build')
        self.assertEqual(code, 0, out)
        self.assertEqual(self.run_cli('check')[0], 0)

    def test_sigterm_during_build_releases_lock_and_stage(self):
        code = ("import sys, time; sys.path.insert(0, sys.argv[1]); import run, pipeline\n"
                "def slow(*a, **k):\n    print('extracting', flush=True); time.sleep(60)\n"
                "pipeline.extract = slow\nsys.argv = ['run.py', 'build']\nrun.main()\n")
        proc = subprocess.Popen([sys.executable, '-c', code, str(self.root / 'scripts/graphify')],
                                stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        try:
            self.assertEqual(proc.stdout.readline().strip(), 'extracting')
            self.assertTrue((self.root / 'graphify-out/.build.lock').exists())
            proc.send_signal(signal.SIGTERM)
            self.assertEqual(proc.wait(timeout=15), 128 + signal.SIGTERM)
        finally:
            if proc.poll() is None:
                proc.kill()
            proc.stdout.close()
            proc.stderr.close()
        self.assertFalse((self.root / 'graphify-out/.build.lock').exists())
        code, out = self.run_cli('build')
        self.assertEqual(code, 0, out)


if __name__ == '__main__':
    unittest.main()
