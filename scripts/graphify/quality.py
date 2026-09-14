"""Read-only quality controls for published Graphify snapshots."""
from datetime import date
from pathlib import Path
import json


# File and raw-edge counts are capacity telemetry, not quality regressions: a
# legitimate feature can raise both.  The reviewed ratchet starts with ambiguity
# metrics, which should only grow with an explicit, expiring exception.
METRICS = ('unresolved_relations', 'parallel_relation_groups')


def _read(path):
    return json.loads(Path(path).read_text(encoding='utf-8'))


def _metric_snapshot(out):
    overview = _read(Path(out) / 'overview.json')
    return {name: overview.get(name, 0) for name in METRICS}


def ratchet(root, out, mode='report'):
    """Compare current static evidence with a reviewed baseline.

    ``report`` is intentionally non-blocking for CI adoption.  ``enforce`` exits
    through the caller when a regression has no non-expired exception.
    """
    if mode not in {'report', 'enforce'}:
        raise ValueError('Modo de ratchet deve ser report ou enforce.')
    baseline_path = Path(root) / 'graphify-baseline.json'
    baseline = _read(baseline_path)
    allowed = set(METRICS)
    for item in baseline.get('exceptions', []):
        if item.get('metric') not in allowed:
            raise ValueError(f'Exceção de métrica desconhecida: {item.get("metric")}')
        if not item.get('reason') or not item.get('responsible') or not item.get('expires_on'):
            raise ValueError('Exceção de ratchet exige metric, reason, responsible e expires_on.')
    current = _metric_snapshot(out)
    exceptions = {item['metric']: item for item in baseline.get('exceptions', [])
                  if item.get('expires_on', '') >= date.today().isoformat()}
    regressions = []
    for metric, value in current.items():
        limit = baseline.get('metrics', {}).get(metric)
        if limit is None or value <= limit:
            continue
        exception = exceptions.get(metric)
        regressions.append({'metric': metric, 'baseline': limit, 'current': value,
                            'exception': exception, 'blocking': exception is None})
    return {'mode': mode, 'baseline': str(baseline_path.name), 'current': current,
            'regressions': regressions, 'would_fail': any(item['blocking'] for item in regressions)}


def graph_diff(baseline_path, current_graph):
    """Compare exported graph JSON files without assuming a git provider."""
    previous = _read(baseline_path)
    current = _read(current_graph)
    def ids(data):
        return {node['id'] for node in data.get('nodes', [])}
    def edges(data):
        return {(edge.get('source'), edge.get('target'), edge.get('relation', edge.get('type', 'unknown')))
                for edge in data.get('links', data.get('edges', []))}
    old_nodes, new_nodes = ids(previous), ids(current)
    old_edges, new_edges = edges(previous), edges(current)
    return {
        'baseline': str(baseline_path),
        'nodes': {'added': sorted(new_nodes - old_nodes), 'removed': sorted(old_nodes - new_nodes)},
        'edges': {'added': sorted(new_edges - old_edges), 'removed': sorted(old_edges - new_edges)},
        'limitation': 'Diff de estrutura exportada; relações paralelas devem ser comparadas em relation-catalog.json quando relevantes.'
    }


def audit(root, out):
    """Cheap local policy audit; it does not inspect a running service or cloud CI."""
    root = Path(root)
    checks = []
    for relative, description in [
        ('.graphifyignore', 'exclusões de arquivos sensíveis'),
        ('graphify.config.json', 'perfis explícitos'),
        ('graphify-benchmark.json', 'benchmark controlado'),
        ('graphify-baseline.json', 'baseline/ratchet versionado'),
        ('docs/graphify/README.md', 'guia operacional'),
        ('.github/workflows/graphify.yml', 'automação CI'),
    ]:
        checks.append({'check': description, 'path': relative, 'pass': (root / relative).is_file()})
    overview = _read(Path(out) / 'overview.json')
    checks.extend([
        {'check': 'catálogo de relações preserva evidência bruta', 'path': 'relation-catalog.json',
         'pass': (Path(out) / 'relation-catalog.json').is_file()},
        {'check': 'saída declara limitação estática', 'path': 'overview.json', 'pass': overview.get('static_only') is True},
    ])
    return {'checks': checks, 'passed': sum(check['pass'] for check in checks), 'total': len(checks),
            'limitation': 'Auditoria local de artefatos e políticas; não substitui revisão humana, CI remoto ou testes de produção.'}
