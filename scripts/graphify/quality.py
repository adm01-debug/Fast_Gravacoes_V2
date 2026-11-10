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


def _overview(out):
    """Read overview.json with an explicit, actionable failure instead of a
    raw FileNotFoundError/KeyError when the snapshot output is missing."""
    path = Path(out) / 'overview.json'
    if not path.is_file():
        raise FileNotFoundError(
            f'overview.json ausente em {path} — rode o build do grafo '
            f'(npm run graph:build) antes do quality/ratchet.')
    try:
        return _read(path)
    except json.JSONDecodeError as error:
        raise ValueError(f'{path} não é JSON válido: {error}') from error


def _metric_snapshot(out):
    overview = _overview(out)
    return {name: overview.get(name, 0) for name in METRICS}


def ratchet(root, out, mode='report'):
    """Compare current static evidence with a reviewed baseline.

    ``report`` is intentionally non-blocking for CI adoption.  ``enforce`` exits
    through the caller when a regression has no non-expired exception.
    """
    if mode not in {'report', 'enforce'}:
        raise ValueError('Modo de ratchet deve ser report ou enforce.')
    baseline_path = Path(root) / 'graphify-baseline.json'
    try:
        baseline = _read(baseline_path)
    except FileNotFoundError as error:
        raise ValueError(f'{baseline_path.name} ausente: sem baseline não há ratchet.') from error
    except json.JSONDecodeError as error:
        raise ValueError(f'{baseline_path.name} não é JSON válido: {error}') from error
    # Baseline malformada (chave `metric` em vez de `metrics`, nome de métrica errado, valor
    # não numérico) fazia toda comparação ser pulada e o ratchet passar sem medir nada.
    metrics = baseline.get('metrics') if isinstance(baseline, dict) else None
    if not isinstance(metrics, dict) or not metrics:
        raise ValueError(f'{baseline_path.name} precisa de um objeto "metrics" com ao menos uma métrica.')
    for metric, limit in metrics.items():
        if metric not in METRICS:
            raise ValueError(f'{baseline_path.name}: métrica desconhecida em metrics: {metric!r} (aceitas: {", ".join(METRICS)}).')
        if isinstance(limit, bool) or not isinstance(limit, int):
            raise ValueError(f'{baseline_path.name}: metrics.{metric} precisa ser inteiro, veio {limit!r}.')
    raw_exceptions = baseline.get('exceptions', [])
    if not isinstance(raw_exceptions, list):
        raise ValueError(f'{baseline_path.name}: "exceptions" precisa ser uma lista.')
    allowed = set(METRICS)
    today = date.today()
    exceptions = {}
    for item in raw_exceptions:
        if not isinstance(item, dict) or item.get('metric') not in allowed:
            raise ValueError(f'Exceção de métrica desconhecida: {item.get("metric") if isinstance(item, dict) else item!r}')
        if not item.get('reason') or not item.get('responsible') or not item.get('expires_on'):
            raise ValueError('Exceção de ratchet exige metric, reason, responsible e expires_on.')
        # Data de verdade: comparar como string deixava "31/12/2020" (vencida) valer para sempre.
        try:
            expires = date.fromisoformat(str(item['expires_on']))
        except ValueError as error:
            raise ValueError(f'expires_on deve ser data ISO-8601 (AAAA-MM-DD), veio {item["expires_on"]!r}.') from error
        if expires >= today:
            exceptions[item['metric']] = item
    current = _metric_snapshot(out)
    regressions = []
    for metric, value in current.items():
        limit = metrics.get(metric)
        if limit is None or value <= limit:
            continue
        exception = exceptions.get(metric)
        regressions.append({'metric': metric, 'baseline': limit, 'current': value,
                            'exception': exception, 'blocking': exception is None})
    return {'mode': mode, 'baseline': str(baseline_path.name), 'current': current,
            'unchecked_metrics': [metric for metric in METRICS if metric not in metrics],
            'regressions': regressions, 'would_fail': any(item['blocking'] for item in regressions)}


def graph_diff(baseline_path, current_graph):
    """Compare exported graph JSON files without assuming a git provider."""
    def load(path, label):
        try:
            data = _read(path)
        except FileNotFoundError as error:
            raise ValueError(f'{label} não encontrado: {path}') from error
        except json.JSONDecodeError as error:
            raise ValueError(f'{label} não é JSON válido ({path}): {error}') from error
        # `{}`/`[]` não é um grafo: sem isso o diff saía 0 listando o grafo inteiro como "added".
        if not isinstance(data, dict) or not isinstance(data.get('nodes'), list) or not data['nodes']:
            raise ValueError(f'{label} não é um graph.json exportado (sem "nodes"): {path}')
        return data
    previous = load(baseline_path, 'Baseline do diff')
    current = load(current_graph, 'Grafo atual')
    def ids(data):
        return {str(node['id']) for node in data['nodes'] if isinstance(node, dict) and 'id' in node}
    def edges(data):
        # str(): aresta sem endpoint (None) não pode quebrar a ordenação.
        return {(str(edge.get('source')), str(edge.get('target')), str(edge.get('relation', edge.get('type', 'unknown'))))
                for edge in data.get('links', data.get('edges', [])) if isinstance(edge, dict)}
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
    overview = _overview(out)
    checks.extend([
        {'check': 'catálogo de relações preserva evidência bruta', 'path': 'relation-catalog.json',
         'pass': (Path(out) / 'relation-catalog.json').is_file()},
        {'check': 'saída declara limitação estática', 'path': 'overview.json', 'pass': overview.get('static_only') is True},
    ])
    return {'checks': checks, 'passed': sum(check['pass'] for check in checks), 'total': len(checks),
            'limitation': 'Auditoria local de artefatos e políticas; não substitui revisão humana, CI remoto ou testes de produção.'}
