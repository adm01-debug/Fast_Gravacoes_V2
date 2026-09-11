"""Cached AST extraction, full reconstruction and validated publication."""
from collections import Counter
from contextlib import contextmanager
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import time

from graphify.analyze import god_nodes, surprising_connections, suggest_questions
from graphify.build import build_from_json
from graphify.cluster import cluster, score_all
from graphify.diagnostics import diagnose_extraction, format_diagnostic_report
from graphify.export import to_json
from graphify.extract import extract
from graphify.report import generate

from corpus import check_snapshot, digest, inventory, output_dir, validate_graph
from enrich import enrich


@contextmanager
def build_lock(out):
    out.mkdir(parents=True, exist_ok=True)
    lock = out / '.build.lock'
    try:
        handle = os.open(lock, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
    except FileExistsError as exc:
        raise ValueError(f'Build já em andamento ou lock abandonado: {lock}') from exc
    try:
        with os.fdopen(handle, 'w') as stream:
            stream.write(str(os.getpid()))
        yield
    finally:
        lock.unlink(missing_ok=True)


def write_json(path, data):
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


def git_value(root, *args):
    result = subprocess.run(['git', *args], cwd=root, capture_output=True, text=True, check=False)
    return result.stdout.strip() if result.returncode == 0 else 'unavailable'


def build(root, config, profile, rebuild=False):
    started = time.monotonic()
    out = output_dir(root, profile)
    # The extractor shares a repository cache across profiles: serialize all builds.
    with build_lock(root / 'graphify-out'):
        detection, files, hashes, signature = inventory(root, config, profile)
        if not files:
            raise ValueError('Nenhum arquivo elegível; saída anterior preservada.')
        if len(files) > config['warnFiles']:
            print(f'Corpus grande: {len(files)} arquivos. Extração local com {config["maxWorkers"]} workers; perfis disponíveis.', flush=True)
        if (out / 'manifest.json').exists() and not rebuild:
            try:
                manifest, _ = check_snapshot(out, signature)
                print(f'Grafo atual: {manifest["nodes"]} nós; nenhuma extração necessária.')
                return manifest
            except (ValueError, OSError, KeyError):
                pass
        result = extract(files, cache_root=root, root=root, max_workers=config['maxWorkers'])
        diagnostic = diagnose_extraction(result, directed=True, root=str(root))
        graph = build_from_json(result, root=root, directed=True)
        if not graph.number_of_nodes():
            raise ValueError('Extração vazia; saída anterior preservada.')
        communities = cluster(graph)
        cohesion = score_all(graph, communities)
        labels = {}
        for cid, members in communities.items():
            paths = [str(graph.nodes[n].get('source_file', '')) for n in members]
            folders = [str(Path(p).parent) for p in paths if p and not p.startswith(('http:', 'https:'))]
            labels[cid] = Counter(folders).most_common(1)[0][0] if folders else 'External dependencies'
        gods = god_nodes(graph)
        surprises = surprising_connections(graph, communities)
        questions = suggest_questions(graph, communities, labels)
        commit = git_value(root, 'rev-parse', 'HEAD')
        # A changed corpus during extraction must never be stamped as current.
        if inventory(root, config, profile)[3] != signature:
            raise ValueError('Arquivos mudaram durante a extração. Execute novamente.')
        represented = {str(d.get('source_file', '')) for _, d in graph.nodes(data=True)}
        missing = sorted(set(hashes) - represented)
        out.mkdir(parents=True, exist_ok=True)
        with tempfile.TemporaryDirectory(prefix='.stage-', dir=out) as directory:
            stage = Path(directory)
            if not to_json(graph, communities, str(stage / 'graph.json'), built_at_commit=commit, community_labels=labels):
                raise ValueError('Exportação recusada.')
            validate_graph(json.loads((stage / 'graph.json').read_text(encoding='utf-8')))
            # Retain raw evidence: upstream DiGraph may collapse parallel relations or omit unresolved endpoints.
            write_json(stage / 'extraction.json', result)
            overview = enrich(root, files, result, graph, stage)
            selected_detection = {
                'total_files': len(files),
                'total_words': sum(len(p.read_text(encoding='utf-8', errors='replace').split()) for p in files),
                'warning': f'Perfil {profile}: {len(files)} arquivos estruturais; AST local, sem extração semântica/LLM.',
            }
            report = generate(graph, communities, cohesion, labels, gods, surprises,
                              selected_detection, {'input': 0, 'output': 0},
                              str(root), suggested_questions=questions)
            # Avoid rounded 100% EXTRACTED hiding a small, nonzero inferred set.
            confidence_counts = Counter(d.get('confidence', 'EXTRACTED') for _, _, d in graph.edges(data=True))
            confidence_text = ' · '.join(f'{count} {kind}' for kind, count in sorted(confidence_counts.items()))
            report = '\n'.join('- Extraction counts: ' + confidence_text if line.startswith('- Extraction:') else line
                               for line in report.splitlines()) + '\n'
            report += f'\n## FAST — origem e atualização\n\n- Commit de referência: `{commit}`; os hashes incluem alterações locais.\n'
            report += f'- Verifique `npm run graph:check -- --profile {profile}`; atualize com `npm run graph:build -- --profile {profile}`.\n'
            report += '\n## FAST — limites da evidência\n\n'
            report += f'- Perfil: `{profile}`; {len(files)} arquivos elegíveis; {len(missing)} sem nó de origem.\n'
            report += '- Extração AST local; 0 tokens de API. SQL representa o histórico, não o schema vivo.\n'
            report += '- Rótulos derivados das pastas; comunidades não comprovam limites de domínio.\n'
            report += '- Imports dinâmicos, bindings e chamadas indiretas podem permanecer incompletos.\n'
            report += '- Nós adicionados para resolver endpoints não comprovam a existência do símbolo.\n\n'
            report += '- `extraction.json` preserva a evidência bruta; `graph.json` é a projeção navegável do Graphify.\n\n'
            report += f'- `relation-catalog.json` preserva {overview["preserved_relations"]} relações brutas resolvidas e '
            report += f'{overview["parallel_relation_groups"]} grupos paralelos para revisão.\n\n'
            report += format_diagnostic_report(diagnostic) + '\n'
            (stage / 'GRAPH_REPORT.md').write_text(report, encoding='utf-8')
            write_json(stage / 'health.json', {'extraction': diagnostic, 'unrepresented_files': missing})
            write_json(stage / '.graphify_labels.json', labels)
            (stage / '.graphify_python').write_text(sys.executable + '\n', encoding='utf-8')
            (stage / '.graphify_root').write_text(str(root) + '\n', encoding='utf-8')
            artifacts = {p.name: digest(p) for p in stage.iterdir() if p.is_file()}
            manifest = {
                'schema_version': 1, 'graphify_version': config['version'], 'profile': profile,
                'signature': signature, 'built_at': datetime.now(timezone.utc).isoformat(),
                'commit': commit, 'dirty': bool(git_value(root, 'status', '--porcelain')),
                'files': hashes, 'nodes': graph.number_of_nodes(), 'edges': graph.number_of_edges(),
                'communities': len(communities), 'seconds': round(time.monotonic() - started, 2),
                'api_input_tokens': 0, 'api_output_tokens': 0, 'artifacts': artifacts,
            }
            write_json(stage / 'manifest.json', manifest)
            # Publish manifest last. Readers reject an interrupted/mixed snapshot by checksum.
            for name in [*artifacts, 'manifest.json']:
                os.replace(stage / name, out / name)
        print(f'Grafo {profile}: {manifest["nodes"]} nós, {manifest["edges"]} relações, {len(files)} arquivos; {manifest["seconds"]}s.', flush=True)
        print(format_diagnostic_report(diagnostic))
        if missing:
            print(f'ATENÇÃO: {len(missing)} arquivos sem representação; consulte health.json.')
        return manifest
