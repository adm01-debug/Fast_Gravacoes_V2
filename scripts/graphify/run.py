"""Project entry point. All user arguments are passed as argv, never through a shell."""
import argparse
import importlib.metadata
import json
import subprocess
import sys

from corpus import ROOT, check_snapshot, inventory, load_config, output_dir
from pipeline import build
from quality import audit, graph_diff, ratchet


def main():
    config = load_config()
    parser = argparse.ArgumentParser(description='Graphify local — FAST GRAVAÇÕES V2')
    parser.add_argument('command', choices=['doctor', 'detect', 'build', 'check', 'query', 'path', 'explain', 'affected', 'html', 'test', 'audit', 'ratchet', 'diff', 'benchmark'])
    parser.add_argument('--profile', choices=config['profiles'], default='all')
    parser.add_argument('--rebuild', action='store_true', help='Reconstruir usando cache AST, inclusive após exclusões')
    parser.add_argument('--budget', type=int, default=2000)
    parser.add_argument('--mode', choices=['report', 'enforce'], default='report')
    parser.add_argument('--baseline', help='graph.json de referência para o diff estrutural')
    parser.add_argument('terms', nargs='*')
    args = parser.parse_intermixed_args()
    installed = importlib.metadata.version('graphifyy')
    if installed != config['version']:
        raise ValueError(f'Versão instalada {installed}; exigida {config["version"]}.')
    # Required for the migration corpus, not an optional silent fallback.
    try:
        import tree_sitter_sql  # noqa: F401
    except ImportError as exc:
        raise ValueError('Parser SQL ausente. Execute npm run graph:install.') from exc
    out = output_dir(ROOT, args.profile)
    if args.command == 'doctor':
        print(json.dumps({'python': sys.version.split()[0], 'graphify': installed, 'profiles': list(config['profiles']), 'root': str(ROOT)}, indent=2))
        return
    if args.command == 'test':
        subprocess.run([sys.executable, '-m', 'unittest', 'discover', '-s', str(ROOT / 'scripts/graphify/tests'), '-v'], check=True, cwd=ROOT)
        return
    if args.command == 'build':
        build(ROOT, config, args.profile, args.rebuild)
        return
    detection, files, _, signature = inventory(ROOT, config, args.profile)
    if args.command == 'detect':
        print(json.dumps({'profile': args.profile, 'eligible': len(files), 'detected': detection['total_files'],
                          'files': [str(p.relative_to(ROOT)) for p in files],
                          'skipped_sensitive': [str(p) for p in detection.get('skipped_sensitive', [])]}, indent=2))
        return
    manifest, graph = check_snapshot(out, signature)
    if args.command == 'check':
        health = json.loads((out / 'health.json').read_text(encoding='utf-8'))
        print(json.dumps({'snapshot': 'current and consistent', 'nodes': manifest['nodes'],
                          'edges': manifest['edges'], 'health': health}, indent=2))
        return
    if args.command == 'audit':
        print(json.dumps(audit(ROOT, out), ensure_ascii=False, indent=2))
        return
    if args.command == 'ratchet':
        result = ratchet(ROOT, out, args.mode)
        print(json.dumps(result, ensure_ascii=False, indent=2))
        if args.mode == 'enforce' and result['would_fail']:
            raise ValueError('Ratchet encontrou regressão sem exceção válida.')
        return
    if args.command == 'diff':
        if not args.baseline:
            raise ValueError('diff exige --baseline CAMINHO_PARA_graph.json.')
        print(json.dumps(graph_diff(args.baseline, out / 'graph.json'), ensure_ascii=False, indent=2))
        return
    if args.command == 'benchmark':
        print((out / 'benchmark.json').read_text(encoding='utf-8'), end='')
        return
    if args.command == 'html':
        if len(graph['nodes']) > config['htmlNodeLimit']:
            print('Grafo acima de 5.000 nós: HTML será agregado por comunidades.', flush=True)
        command = ['export', 'html', '--graph', str(out / 'graph.json'), '--node-limit', str(config['htmlNodeLimit'])]
    else:
        needed = 2 if args.command == 'path' else 1
        if len(args.terms) != needed:
            raise ValueError(f'{args.command} exige {needed} argumento(s); use aspas para frases.')
        command = [args.command, *args.terms, '--graph', str(out / 'graph.json')]
        if args.command == 'query':
            if not 100 <= args.budget <= 10000:
                raise ValueError('Budget deve estar entre 100 e 10000 tokens estimados.')
            command += ['--budget', str(args.budget)]
    subprocess.run([sys.executable, '-m', 'graphify', *command], check=True, cwd=ROOT)


if __name__ == '__main__':
    try:
        main()
    except (ValueError, OSError, KeyError, subprocess.CalledProcessError) as error:
        print(f'[graphify] {error}', file=sys.stderr)
        sys.exit(1)
