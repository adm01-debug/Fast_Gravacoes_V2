"""Exercise failure modes and actual AST behavior in disposable repositories."""
import contextlib
from collections import Counter
import io
import json
from pathlib import Path
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


if __name__ == '__main__':
    unittest.main()
