"""Deterministic architecture evidence derived from the selected local corpus.

These reports deliberately complement, rather than replace, Graphify's AST graph.
They use conservative text patterns only to expose review candidates.  They never
claim a runtime path, a live database schema, or a security guarantee.
"""
from collections import Counter, defaultdict
from pathlib import Path
import json
import re

import networkx as nx


def _write(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


def _relative(root, path):
    return path.relative_to(root).as_posix()


def _text(path):
    return path.read_text(encoding='utf-8', errors='replace')


def _matches(root, paths, expression, *, limit=5000):
    """Return source locations, capped so an unusual file cannot explode output."""
    pattern = re.compile(expression, re.IGNORECASE)
    found = []
    for path in paths:
        for number, line in enumerate(_text(path).splitlines(), start=1):
            if pattern.search(line):
                found.append({'file': _relative(root, path), 'line': number, 'text': line.strip()[:300]})
                if len(found) >= limit:
                    return found
    return found


def _source_paths(root, files):
    return [path for path in files if path.is_file() and path.resolve().is_relative_to(root.resolve())]


def _routes(root):
    path = root / 'src/routes/AppRoutes.tsx'
    if not path.is_file():
        return []
    entries = []
    for number, line in enumerate(_text(path).splitlines(), start=1):
        match = re.search(r'<Route\s+path=["\']([^"\']+)', line)
        if match:
            entries.append({'path': match.group(1), 'file': _relative(root, path), 'line': number,
                            'source': line.strip()[:300]})
    return entries


def _providers(root):
    path = root / 'src/providers/AppProviders.tsx'
    if not path.is_file():
        return []
    providers = []
    for number, line in enumerate(_text(path).splitlines(), start=1):
        for name in re.findall(r'<([A-Z][A-Za-z0-9]*(?:Provider|Context))\b', line):
            providers.append({'name': name, 'file': _relative(root, path), 'line': number})
    return providers


def _edge_functions(root, paths):
    function_root = root / 'supabase/functions'
    functions = []
    if function_root.is_dir():
        for index in sorted(function_root.glob('*/index.ts')):
            if index.parent.name.startswith('_'):
                continue
            content = _text(index)
            functions.append({
                'name': index.parent.name,
                'entry': _relative(root, index),
                'handler': bool(re.search(r'\b(?:Deno\.serve|serve)\s*\(', content)),
                'auth_guards': sorted(set(re.findall(r'\b(require(?:Auth|Role|Aal2|ElevatedAal2)|getAuthUser)\b', content))),
                'service_role_reference': bool(re.search(r'(service[_-]?role|SUPABASE_SERVICE_ROLE)', content, re.I)),
            })
    consumers = _matches(root, paths, r"\.functions\.invoke\(\s*['\"][A-Za-z0-9_-]+")
    for item in consumers:
        name = re.search(r"['\"]([A-Za-z0-9_-]+)", item['text'])
        item['function'] = name.group(1) if name else 'unknown'
    return functions, consumers


def _sql_history(root, paths):
    migrations = [p for p in paths if 'supabase/migrations/' in _relative(root, p) and p.suffix == '.sql']
    objects = []
    policies = []
    schedules = []
    for path in migrations:
        relative = _relative(root, path)
        content = _text(path)
        for number, line in enumerate(content.splitlines(), start=1):
            object_match = re.search(r'\b(CREATE|ALTER|DROP)\s+(?:OR\s+REPLACE\s+)?(TABLE|FUNCTION|TYPE|VIEW|INDEX|TRIGGER)\s+(?:IF\s+(?:NOT\s+)?EXISTS\s+)?([\w.\"]+)', line, re.I)
            if object_match:
                objects.append({'file': relative, 'line': number, 'operation': object_match.group(1).upper(),
                                'kind': object_match.group(2).upper(), 'name': object_match.group(3)})
            policy = re.search(r'\b(?:CREATE|ALTER|DROP)\s+POLICY\s+([\w\"]+)', line, re.I)
            if policy:
                policies.append({'file': relative, 'line': number, 'operation': line.strip()[:300],
                                 'policy': policy.group(1)})
            if re.search(r'\b(?:cron\.schedule|pg_cron|schedule)\b', line, re.I):
                schedules.append({'file': relative, 'line': number, 'text': line.strip()[:300]})
    return {'migrations': [_relative(root, path) for path in migrations], 'objects': objects,
            'policies': policies, 'schedules': schedules,
            'limitation': 'Histórico de migrations; não representa nem consulta o schema ou as políticas efetivas do banco.'}


def _relation_catalog(raw):
    nodes = {node.get('id') for node in raw.get('nodes', []) if node.get('id')}
    relations = []
    unresolved = []
    groups = defaultdict(list)
    for position, edge in enumerate(raw.get('edges', [])):
        source, target = edge.get('source'), edge.get('target')
        item = {'id': f'raw-{position}', 'source': source, 'target': target,
                'relation': edge.get('relation', 'unknown'), 'confidence': edge.get('confidence', 'EXTRACTED'),
                'source_file': edge.get('source_file')}
        if source in nodes and target in nodes:
            relations.append(item)
            groups[(source, target)].append(item['id'])
        else:
            unresolved.append(item)
    parallel = [{'source': source, 'target': target, 'relations': ids, 'count': len(ids)}
                for (source, target), ids in groups.items() if len(ids) > 1]
    return {'schema_version': 1, 'relations': relations, 'unresolved_relations': unresolved,
            'parallel_groups': parallel,
            'limitation': 'Catálogo bruto preserva relações paralelas; graph.json continua sendo uma projeção DiGraph navegável.'}


def _cycles(graph):
    components = [sorted(component) for component in nx.strongly_connected_components(graph) if len(component) > 1]
    samples = []
    for component in components[:100]:
        subgraph = graph.subgraph(component)
        try:
            cycle = nx.find_cycle(subgraph, orientation='original')
        except nx.NetworkXNoCycle:
            continue
        samples.append({'nodes': [edge[0] for edge in cycle], 'edges': len(cycle)})
    return {'strongly_connected_components': len(components), 'components': components[:100],
            'cycle_samples': samples,
            'limitation': 'Ciclos são estruturais no grafo estático; não provam recursão ou falha em produção.'}


def _dead_code_candidates(root, graph, paths):
    source_files = {_relative(root, path) for path in paths}
    inbound = Counter()
    for source, target, attributes in graph.edges(data=True):
        if attributes.get('relation') not in {'imports_from', 'imports', 'reexports', 'dynamic_imports'}:
            continue
        target_file = str(graph.nodes[target].get('source_file', ''))
        if target_file:
            inbound[target_file] += 1
    excluded = ('src/main.', 'src/App.', 'src/routes/', 'src/pages/', 'src/providers/', 'src/test/', 'tests/',
                'supabase/functions/', 'supabase/migrations/')
    candidates = [file for file in sorted(source_files) if not inbound[file] and not file.startswith(excluded)]
    return {'candidates': [{'file': file, 'reason': 'Nenhuma importação AST resolvida para o arquivo no perfil.'}
                           for file in candidates],
            'limitation': 'Candidatos não são autorização para remover: rotas lazy, convenções, Deno e imports dinâmicos podem ser legítimos.'}


def _requirements(root):
    def parse(path, expression):
        if not path.is_file():
            return []
        stages, current = [], None
        for number, line in enumerate(_text(path).splitlines(), start=1):
            stage = re.match(expression, line)
            if stage:
                current = {'stage': int(stage.group(1)), 'title': stage.group(2).strip(),
                           'file': _relative(root, path), 'line': number, 'checkpoint': None,
                           'substeps_detected': 0}
                stages.append(current)
            elif current and line.startswith('Checkpoint:'):
                current['checkpoint'] = line.strip()
                current['substeps_detected'] = len(re.findall(r'\b\d+\)', line))
        return stages
    graphify = parse(root / 'docs/plano-graphify-50-etapas.md', r'###\s+Etapa\s+(\d+)\s+—\s+(.+)')
    master = parse(root / 'docs/plano-mestre-10-10.md', r'\*\*Etapa\s+(\d+)\s+—\s+(.+?)\*\*')
    return {'stages': graphify, 'master_stages': master,
            'limitation': 'Rastreabilidade documental. IDs/checkpoints são extraídos; vínculo requisito→código→teste→ambiente requer evidência humana explícita.'}


def _journeys(graph):
    """Small, static review views; a match is a starting point, not a runtime path."""
    definitions = {
        'auth': ['auth', 'aal', 'mfa', 'role'],
        'production': ['production', 'machine', 'job'],
        'tpm': ['tpm', 'maintenance'],
        'offline': ['offline', 'sync'],
        'communication': ['notification', 'email', 'push', 'webhook'],
    }
    views = []
    for name, terms in definitions.items():
        matches = []
        for node_id, data in graph.nodes(data=True):
            haystack = f"{node_id} {data.get('label', '')} {data.get('source_file', '')}".lower()
            if any(term in haystack for term in terms):
                matches.append({'id': node_id, 'source_file': data.get('source_file'), 'source_location': data.get('source_location')})
        views.append({'journey': name, 'terms': terms, 'nodes': matches[:250], 'total_nodes': len(matches)})
    return {'views': views,
            'limitation': 'Filtros lexicais para revisão, não jornadas executadas; confirme cada elo em fonte/teste antes de decisão.'}


def _test_contracts(root, paths):
    """List direct test imports and schema references without inferring coverage."""
    records = []
    for path in paths:
        relative = _relative(root, path)
        if not re.search(r'(?:\.(?:test|spec)\.[jt]sx?$|/tests?/)', relative):
            continue
        imports = []
        contracts = []
        for number, line in enumerate(_text(path).splitlines(), start=1):
            source = re.search(r"\bfrom\s+['\"]([^'\"]+)['\"]", line)
            if source:
                imports.append({'line': number, 'module': source.group(1)})
            if re.search(r'\b(?:zod|z\.|schema)\b', line, re.I):
                contracts.append({'line': number, 'text': line.strip()[:300]})
        records.append({'file': relative, 'imports': imports, 'contract_mentions': contracts})
    return {'tests': records,
            'limitation': 'Somente imports e referências explícitas. Não calcula cobertura, não prova execução e não associa import relativo a módulo sem resolução AST.'}


def _benchmark(root, graph):
    path = root / 'graphify-benchmark.json'
    if not path.is_file():
        return {'questions': [], 'passed': 0, 'total': 0, 'limitation': 'Arquivo de benchmark ausente.'}
    spec = json.loads(path.read_text(encoding='utf-8'))
    haystack = '\n'.join(
        f"{node_id} {node.get('label', '')} {node.get('source_file', '')}"
        for node_id, node in graph.nodes(data=True)
    ).lower()
    results = []
    for question in spec.get('questions', []):
        expected = [term.lower() for term in question.get('expected_terms', [])]
        missing = [term for term in expected if term not in haystack]
        results.append({'id': question.get('id'), 'question': question.get('question'), 'profile': question.get('profile'),
                        'expected_terms': expected, 'missing_terms': missing, 'pass': not missing})
    return {'schema_version': 1, 'method': 'Presença de termos esperados no snapshot; não mede precisão humana nem custo real.',
            'questions': results, 'passed': sum(item['pass'] for item in results), 'total': len(results)}


def enrich(root, files, raw, graph, stage):
    """Write integrity-preserving, review-oriented artifacts into a staged build."""
    paths = _source_paths(root, files)
    functions, consumers = _edge_functions(root, paths)
    sql = _sql_history(root, paths)
    catalog = _relation_catalog(raw)
    access = _matches(root, paths, r"\.(?:from|rpc)\(\s*['\"][A-Za-z0-9_.-]+")
    simulations = _matches(root, paths, r'\bMath\.random\s*\(')
    notification_hits = _matches(root, paths, r'\b(?:notification|push|email|resend|webhook)\b')
    architecture = {
        'schema_version': 1,
        'routes': _routes(root),
        'provider_order': _providers(root),
        'edge_functions': functions,
        'edge_function_consumers': consumers,
        'data_access_candidates': access,
        'notification_candidates': notification_hits,
        'simulation_candidates': simulations,
        'limitation': 'Mapas estáticos para revisão: chamadas indiretas, variáveis e runtime podem não ser resolvidos.'
    }
    security = {
        'edge_function_guards': [{'name': item['name'], 'entry': item['entry'], 'guards': item['auth_guards'],
                                  'service_role_reference': item['service_role_reference']} for item in functions],
        'migration_policies': sql['policies'],
        'service_role_mentions': _matches(root, paths, r'(?:service[_-]?role|SUPABASE_SERVICE_ROLE)'),
        'limitation': 'Presença de guard/policy é evidência de código/histórico, não verificação de RLS, MFA ou privilégio efetivo.'
    }
    overview = {
        'schema_version': 1, 'files': len(paths), 'routes': len(architecture['routes']), 'providers': len(architecture['provider_order']),
        'edge_functions': len(functions), 'edge_function_consumers': len(consumers), 'migration_files': len(sql['migrations']),
        'raw_relations': len(raw.get('edges', [])), 'preserved_relations': len(catalog['relations']),
        'unresolved_relations': len(catalog['unresolved_relations']), 'parallel_relation_groups': len(catalog['parallel_groups']),
        'static_only': True,
    }
    _write(stage / 'architecture.json', architecture)
    _write(stage / 'security-map.json', security)
    _write(stage / 'sql-history.json', sql)
    _write(stage / 'relation-catalog.json', catalog)
    _write(stage / 'cycle-report.json', _cycles(graph))
    _write(stage / 'dead-code-candidates.json', _dead_code_candidates(root, graph, paths))
    _write(stage / 'requirements-traceability.json', _requirements(root))
    _write(stage / 'journey-views.json', _journeys(graph))
    _write(stage / 'test-contract-map.json', _test_contracts(root, paths))
    _write(stage / 'benchmark.json', _benchmark(root, graph))
    _write(stage / 'overview.json', overview)
    return overview
