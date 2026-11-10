"""Explicit local corpus and content hashes; no network or LLM is used."""
import hashlib
import json
from pathlib import Path

from graphify.detect import detect

ROOT = Path(__file__).resolve().parents[2]


def load_config(root=ROOT):
    return json.loads((root / 'graphify.config.json').read_text(encoding='utf-8'))


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def inventory(root, config, profile):
    detection = detect(root, follow_symlinks=False, google_workspace=False)
    prefixes = config['profiles'][profile]
    files = []
    for name in detection['files'].get('code', []):
        path = Path(name)
        if path.is_symlink() or not path.resolve().is_relative_to(root.resolve()):
            continue
        rel = path.relative_to(root).as_posix()
        if path.suffix in config['extensions'] and any(
            rel == prefix or rel.startswith(prefix + '/') for prefix in prefixes
        ):
            files.append(path)
    files = sorted(set(files))
    hashes = {p.relative_to(root).as_posix(): digest(p) for p in files}
    # Config, aliases and implementation changes invalidate even an unchanged source corpus.
    controls = ['graphify.config.json', '.graphifyignore', '.gitignore',
                'tsconfig.json', 'tsconfig.app.json', 'deno.json', 'deno.jsonc',
                'scripts/graphify.mjs', 'scripts/graphify/requirements.lock',
                'graphify-baseline.json', 'graphify-benchmark.json',
                'docs/plano-graphify-50-etapas.md', 'docs/plano-mestre-10-10.md']
    controls += [p.relative_to(root).as_posix() for p in (root / 'scripts/graphify').glob('*.py')]
    control_hashes = {p: digest(root / p) for p in sorted(set(controls)) if (root / p).is_file()}
    signature = hashlib.sha256(json.dumps(
        {'profile': profile, 'files': hashes, 'controls': control_hashes}, sort_keys=True
    ).encode()).hexdigest()
    return detection, files, hashes, signature


def output_dir(root, profile):
    base = root / 'graphify-out'
    return base if profile == 'all' else base / 'profiles' / profile


def validate_graph(data):
    nodes = data.get('nodes', [])
    if not nodes:
        raise ValueError('Grafo vazio; saída anterior preservada.')
    ids = {node['id'] for node in nodes}
    if len(ids) != len(nodes):
        raise ValueError('IDs de nós duplicados.')
    if not data.get('directed'):
        raise ValueError('Direção das relações perdida.')
    for edge in data.get('links', data.get('edges', [])):
        if edge.get('source') not in ids or edge.get('target') not in ids:
            raise ValueError('Aresta sem endpoint no grafo exportado.')


def check_snapshot(out, signature=None):
    path = out / 'manifest.json'
    if not path.is_file():
        raise ValueError(f'Grafo ainda não gerado ({path} ausente). Execute npm run graph:build.')
    try:
        manifest = json.loads(path.read_text(encoding='utf-8'))
    except ValueError as error:
        raise ValueError(f'manifest.json não é JSON válido ({error}). Execute npm run graph:build.') from error
    # `[]`, `null` ou manifest sem os campos: snapshot inconsistente, não traceback.
    if not isinstance(manifest, dict) or not isinstance(manifest.get('artifacts'), dict) or 'signature' not in manifest:
        raise ValueError('manifest.json fora do formato esperado. Execute npm run graph:build.')
    for name, expected in manifest['artifacts'].items():
        if not (out / name).is_file() or digest(out / name) != expected:
            raise ValueError(f'Artefato inconsistente: {name}. Execute graph:build.')
    try:
        data = json.loads((out / 'graph.json').read_text(encoding='utf-8'))
    except ValueError as error:
        raise ValueError(f'Artefato inconsistente: graph.json ({error}). Execute graph:build.') from error
    if not isinstance(data, dict):
        raise ValueError('Artefato inconsistente: graph.json. Execute graph:build.')
    validate_graph(data)
    if signature is not None and manifest['signature'] != signature:
        raise ValueError('Grafo desatualizado. Execute npm run graph:build para este perfil.')
    return manifest, data
