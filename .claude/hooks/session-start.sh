#!/bin/bash
# Sessão na nuvem: instala as dependências do graphify (.venv-graphify/) e gera o grafo em
# graphify-out/. graphify-out/ e .venv-graphify/ ficam fora do Git (.gitignore), então cada
# clone precisa gerar os seus; sem isso os agentes da nuvem não têm graph.json nem
# GRAPH_REPORT.md e buscam por texto às cegas, e o PreToolUse hook-guard (abaixo) não acha o
# binário para nudgear.
# - Só roda com CLAUDE_CODE_REMOTE=true (local usa `npm run graph:install` + `graph:build`,
#   ver docs/graphify/README.md).
# - Assíncrono: o build pode levar minutos e não segura o início da sessão.
# - Pula se o grafo já foi gerado no commit atual (marca em graphify-out/.session-built-commit).
# Log de tudo (instalação inclusive): graphify-out/.session-start.log
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

echo '{"async": true, "asyncTimeout": 900000}'

# Sem CLAUDE_PROJECT_DIR, a raiz é a do próprio hook (.claude/hooks/ → ../..), nunca o cwd:
# rodando de src/ o hook criava src/graphify-out/ e refazia install+build toda vez.
cd "${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
mkdir -p graphify-out
LOG=graphify-out/.session-start.log
MARCA=graphify-out/.session-built-commit

exec >>"$LOG" 2>&1
echo "== $(date -u +%FT%TZ) session-start (npm run graph:install / graph:build)"

# O hook também dispara em resume/clear/compact, que podem cair no meio de um build de
# minutos: só um por vez neste clone. O segundo sai na hora; o primeiro termina e carimba.
# Sem `flock` no PATH segue sem lock (o build tem o próprio lock): antes o "command not found"
# era lido como "outro rodando" e o grafo nunca era gerado.
exec 9>graphify-out/.session-start.lock
if command -v flock >/dev/null 2>&1; then
  if ! flock -n 9; then
    echo "outro session-start já está rodando neste clone — saindo"
    exit 0
  fi
else
  echo "flock indisponível — seguindo sem lock de sessão"
fi

head_sha="$(git rev-parse HEAD)"
# A marca vale só com a árvore limpa: com edição não commitada o grafo do commit está
# desatualizado (graph:query recusa) e o build incremental abaixo custa poucos segundos.
if [ -f graphify-out/graph.json ] && [ -f graphify-out/GRAPH_REPORT.md ] && [ "$(cat "$MARCA" 2>/dev/null)" = "$head_sha" ] \
  && [ -z "$(git status --porcelain --untracked-files=normal 2>/dev/null)" ]; then
  echo "grafo já está no commit $head_sha — nada a fazer"
  exit 0
fi

# Instala/confere o venv ANTES do build: o grafo pode estar em dia e o venv ter sumido (o
# hook-guard do PreToolUse depende do binário em .venv-graphify/bin/graphify).
npm run graph:install

rm -f "$MARCA"
npm run graph:build
# O build roda em segundo plano: se o checkout mudou no meio, não carimba — a próxima sessão
# refaz.
if [ "$(git rev-parse HEAD)" = "$head_sha" ]; then
  echo "$head_sha" > "$MARCA"
  echo "grafo pronto no commit $head_sha"
else
  echo "HEAD mudou durante o build ($head_sha -> $(git rev-parse HEAD)); marca não gravada"
fi
