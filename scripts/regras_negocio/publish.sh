#!/usr/bin/env bash
# Publica docs/ai-context gerados: commit + push na branch padrão, ou PR quando a branch é protegida.
# Variáveis:
#   BRANCH          branch alvo (default: branch atual). Com HEAD destacado (checkout de tag/SHA) os modos push/pr exigem BRANCH
#                   explícito, e o HEAD precisa estar contido em origin/<BRANCH>; o modo branch não precisa (parte do commit do HEAD)
#   OUT_DIR         pasta gerada (default: docs/ai-context)
#   MODE            push | pr | branch (maiúsculas/minúsculas tanto faz; qualquer outro valor é erro, nada é publicado)
#                   push   = commit direto na branch padrão (cai para pr se rejeitado e gh existir)
#                   pr     = abre/atualiza uma PR a partir de ai-context/sync
#                   branch = publica em branch derivada BRANCH_OUT (= branch padrão + 1 commit, force-with-lease),
#                            preservando as pastas de outros produtores (KEEP_DIRS) e regenerando o índice (INDEX_CMD).
#                            É o desenho para repos com main protegida e vários produtores numa branch só.
#                            Monta tudo num worktree temporário: checkout, índice, HEAD e identidade git de quem chama
#                            não são tocados. Se não conseguir LER a branch derivada no remoto, aborta sem publicar.
#   BRANCH_OUT      branch derivada (default: contexto)
#   KEEP_DIRS       pastas de outros produtores a preservar na branch derivada, separadas por espaço
#                   (ou uma por linha, quando algum caminho tem espaço)
#   INDEX_CMD       comando que (re)gera o índice único depois de montar a branch (opcional); roda na raiz do
#                   worktree temporário, que já contém a branch padrão + KEEP_DIRS + OUT_DIR
#   PUSH_URL        URL de push com token (CI com persist-credentials: false), ex.: https://x-access-token:$TOKEN@github.com/o/r.git
#                   No modo branch é também de onde a branch derivada é lida.
#   GEN_CMD         comando para regenerar após rebase (default: python3 <pasta deste script>/generate.py --repo . --out $OUT_DIR)
set -euo pipefail
BRANCH="${BRANCH:-}"
OUT_DIR="${OUT_DIR:-docs/ai-context}"
MODE="$(printf '%s' "${MODE:-push}" | tr '[:upper:]' '[:lower:]')"
case "$MODE" in
  push|pr|branch) ;;
  *) echo "ERRO: MODE inválido: '$MODE' (use push, pr ou branch). Nada foi publicado." >&2; exit 2 ;;
esac
SELF_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GEN_CMD="${GEN_CMD:-python3 $(printf '%q' "$SELF_DIR/generate.py") --repo . --out $(printf '%q' "$OUT_DIR")}"
PR_BRANCH="ai-context/sync"
MSG="chore(ai-context): atualiza contexto para agentes [skip ci]"
# Identidade do bot só nos comandos que criam commit: a configuração git do clone não é alterada.
BOT_ID=(-c "user.name=${GIT_USER_NAME:-ai-context-bot}" -c "user.email=${GIT_USER_EMAIL:-ai-context-bot@users.noreply.github.com}")
# No rebase, os commits locais de quem chama mantêm a identidade dele; o bot só entra se não houver nenhuma.
REBASE_ID=(); git config user.email >/dev/null 2>&1 || REBASE_ID=("${BOT_ID[@]}")
ERR="$(mktemp)"
TMPWT=""
OLD_REF="refs/ai-context-publish/old-$$"
cleanup() {
  rm -f "$ERR"
  git update-ref -d "$OLD_REF" >/dev/null 2>&1 || true
  if [ -n "$TMPWT" ]; then
    git worktree remove --force "$TMPWT" >/dev/null 2>&1 || rm -rf "$TMPWT"
    git worktree prune >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT
trap 'exit 130' INT TERM HUP   # sinal também passa pelo cleanup (não deixa worktree temporário para trás)
show_err() { sed -E 's#(://)[^/@[:space:]]+@#\1***@#g' "$ERR" >&2; }   # stderr do git sem o token de PUSH_URL

stage() {
  git add -f -A "$OUT_DIR"   # -f: a saída gerada pode estar no .gitignore da branch padrão (versionada só na branch derivada)
  for f in CLAUDE.md AGENTS.md; do [ -f "$f" ] && git add "$f" || true; done
}

assert_no_foreign_staged_changes() {
  local path
  while IFS= read -r -d '' path; do
    case "$path" in
      "$OUT_DIR"|"$OUT_DIR"/*|CLAUDE.md|AGENTS.md) ;;
      *)
        echo "ERRO: há alteração staged fora da saída gerada: $path. Nada foi publicado." >&2
        return 1
        ;;
    esac
  done < <(git diff --cached --name-only -z)
}

if [ -z "$BRANCH" ]; then
  BRANCH="$(git symbolic-ref -q --short HEAD || true)"   # vazio = HEAD destacado
  if [ -z "$BRANCH" ]; then
    if [ "$MODE" != "branch" ]; then
      echo "ERRO: HEAD destacado (checkout de tag/SHA) e BRANCH não definido — não há branch para publicar. Defina BRANCH=<branch destino> (ex.: BRANCH=main). Nada foi publicado." >&2
      exit 2
    fi
    BRANCH="$(git rev-parse --short HEAD)"   # no modo branch é só o rótulo da mensagem: a base é o commit do HEAD
  fi
elif [ "$MODE" != "branch" ] && ! git symbolic-ref -q HEAD >/dev/null; then
  # HEAD destacado com BRANCH explícito: só publica se o commit estiver em origin/$BRANCH — senão o rebase levaria commits alheios para a branch
  if ! git fetch -q origin "$BRANCH" 2>"$ERR"; then
    echo "ERRO: não foi possível buscar origin/$BRANCH — nada foi publicado." >&2; show_err; exit 1
  fi
  if ! git merge-base --is-ancestor HEAD "refs/remotes/origin/$BRANCH"; then
    echo "ERRO: HEAD destacado em $(git rev-parse --short HEAD) não está contido em origin/$BRANCH — publicar levaria commits alheios para $BRANCH. Faça checkout de $BRANCH (ou de um commit dele). Nada foi publicado." >&2
    exit 1
  fi
fi
if git check-ignore -q "$OUT_DIR"; then
  echo "ERRO: $OUT_DIR está no .gitignore — os docs nunca seriam commitados. Remova a regra ou mude AI_CONTEXT_OUT."; exit 1
fi
assert_no_foreign_staged_changes
if [ "$MODE" = "branch" ]; then
  # Branch derivada = branch padrão + 1 commit, montada em worktree temporário com git plumbing (commit-tree):
  # nada muda no checkout de quem chama — a saída gerada e edições não commitadas continuam no disco.
  BRANCH_OUT="${BRANCH_OUT:-contexto}"
  REMOTE="${PUSH_URL:-origin}"
  REF="refs/heads/$BRANCH_OUT"
  if [ ! -d "$OUT_DIR" ]; then
    echo "ERRO: $OUT_DIR não existe — nada a publicar." >&2; exit 1
  fi
  SRC=$(git rev-parse HEAD)
  for attempt in 1 2 3; do
    # Estado da branch derivada no MESMO remoto do push. Falha de rede/credencial não é "a branch não existe":
    # sem saber o que está lá, publicar apagaria as pastas dos outros produtores — então aborta.
    rc=0; git ls-remote --exit-code "$REMOTE" "$REF" >/dev/null 2>"$ERR" || rc=$?
    OLD=""
    if [ "$rc" = 0 ]; then
      if ! git fetch -q --no-tags "$REMOTE" "+$REF:$OLD_REF" 2>"$ERR"; then
        echo "ERRO: a branch $BRANCH_OUT existe no remoto mas não pôde ser baixada — nada foi publicado nem apagado." >&2; show_err; exit 1
      fi
      OLD=$(git rev-parse "$OLD_REF")
    elif [ "$rc" != 2 ]; then
      echo "ERRO: não foi possível consultar $BRANCH_OUT no remoto (rede/credencial?) — nada foi publicado nem apagado." >&2; show_err; exit 1
    fi
    keep_dirs=()
    if [ -n "${KEEP_DIRS:-}" ]; then
      if [[ "$KEEP_DIRS" == *$'\n'* ]]; then
        while IFS= read -r d; do [ -n "$d" ] && keep_dirs+=("$d"); done <<<"$KEEP_DIRS"
      elif [ -n "$OLD" ] && git cat-file -e "$OLD:$KEEP_DIRS" 2>/dev/null; then
        keep_dirs=("$KEEP_DIRS")   # um único caminho (com espaço no nome) que existe na branch derivada
      else
        read -r -a keep_dirs <<<"$KEEP_DIRS"
      fi
    fi
    if [ -n "$TMPWT" ]; then git worktree remove --force "$TMPWT" >/dev/null 2>&1 || rm -rf "$TMPWT"; fi
    TMPWT="$(mktemp -d)"
    git worktree add -q --detach "$TMPWT" "$SRC" >/dev/null 2>"$ERR" || { echo "ERRO: não foi possível criar o worktree temporário." >&2; show_err; exit 1; }
    if [ -n "$OLD" ]; then
      for d in ${keep_dirs[@]+"${keep_dirs[@]}"}; do
        # pasta que o outro produtor ainda não publicou não é erro; pasta que existe e não pôde ser copiada é (set -e aborta)
        if git cat-file -e "$OLD:$d" 2>/dev/null; then git -C "$TMPWT" checkout -q "$OLD" -- "$d"; fi
      done
    fi
    rm -rf "${TMPWT:?}/$OUT_DIR"; mkdir -p "$(dirname "$TMPWT/$OUT_DIR")"; cp -a "$OUT_DIR" "$TMPWT/$OUT_DIR"   # a nossa saída
    for f in CLAUDE.md AGENTS.md; do [ -f "$f" ] && cp -a "$f" "$TMPWT/$f" || true; done
    if [ -n "${INDEX_CMD:-}" ]; then
      # sem INDEX_CMD no ambiente do comando: se ele (ou algo que ele chame) rodar este script, não entra em recursão
      ( cd "$TMPWT" && cmd="$INDEX_CMD" && unset INDEX_CMD && eval "$cmd" )
      git -C "$TMPWT" add -f -A -- "$(dirname "$OUT_DIR")"
    fi
    git -C "$TMPWT" add -f -A -- "$OUT_DIR"   # -f: a saída gerada pode estar no .gitignore da branch padrão
    for f in CLAUDE.md AGENTS.md; do [ -f "$TMPWT/$f" ] && git -C "$TMPWT" add -- "$f" || true; done
    TREE=$(git -C "$TMPWT" write-tree)
    if [ -n "$OLD" ] && [ "$TREE" = "$(git rev-parse "$OLD^{tree}")" ] && [ "$(git rev-parse -q --verify "$OLD^" 2>/dev/null || true)" = "$SRC" ]; then
      echo "branch $BRANCH_OUT já reflete este estado — nada a publicar"; exit 0
    fi
    NEW=$(git "${BOT_ID[@]}" commit-tree "$TREE" -p "$SRC" -m "$MSG")
    # lease = o estado que acabamos de ler (vazio: a branch não pode existir). Se outro publicador entrou no meio, o push é recusado.
    if git push -q --force-with-lease="$REF:$OLD" "$REMOTE" "$NEW:$REF" 2>"$ERR"; then
      echo "publicado em $BRANCH_OUT ($(git rev-parse --short "$NEW") = $BRANCH + 1 commit)"
      exit 0
    fi
    if ! grep -qiE "stale info|fetch first|non-fast-forward" "$ERR"; then   # só recusa de lease é corrida; o resto é erro de verdade
      echo "ERRO: push para $BRANCH_OUT falhou — nada foi publicado." >&2; show_err; exit 1
    fi
    echo "outro publicador atualizou $BRANCH_OUT no meio (tentativa $attempt) — remontando sobre o estado novo"
  done
  echo "ERRO: não foi possível publicar em $BRANCH_OUT após 3 tentativas (corrida com outro publicador). Nada foi sobrescrito." >&2
  exit 1
fi

stage
if git diff --cached --quiet; then
  # Uma execução anterior pode ter commitado e falhado no push: o commit gerado ainda está só aqui.
  if [ "$(git show -s --format=%B HEAD)" = "$MSG" ] && git rev-parse -q --verify "refs/remotes/origin/$BRANCH" >/dev/null \
     && ! git merge-base --is-ancestor HEAD "refs/remotes/origin/$BRANCH"; then
    echo "commit gerado anterior ainda não foi enviado — publicando"
  else
    echo "docs já atualizados — nada a commitar"; exit 0
  fi
else
  git "${BOT_ID[@]}" commit -q -m "$MSG"
fi

# O SHA muda no rebase, mas estes metadados de autoria são preservados. Eles
# distinguem o commit gerado do novo topo da origem quando o rebase descarta
# nossa alteração por ela já ter sido aplicada por outro produtor.
remember_generated_head() {
  GENERATED_COMMIT=$(git rev-parse HEAD)
  GENERATED_AUTHOR_EMAIL=$(git show -s --format=%ae HEAD)
  GENERATED_AUTHOR_DATE=$(git show -s --format=%aI HEAD)
}

generated_commit_is_head() {
  # Commit que já está na origem nunca é "o nosso" para emendar, mesmo com mensagem, autor e segundo idênticos
  # (dois produtores com a identidade do bot commitando no mesmo segundo).
  [ "$(git show -s --format=%B HEAD)" = "$MSG" ] &&
    [ "$(git show -s --format=%ae HEAD)" = "$GENERATED_AUTHOR_EMAIL" ] &&
    [ "$(git show -s --format=%aI HEAD)" = "$GENERATED_AUTHOR_DATE" ] &&
    ! git merge-base --is-ancestor HEAD "origin/$BRANCH"
}

generated_output_conflict_is_recoverable() {
  local conflicted=0 path
  [ "$(git rev-parse -q --verify REBASE_HEAD 2>/dev/null || true)" = "$GENERATED_COMMIT" ] || return 1
  while IFS= read -r -d '' path; do
    conflicted=1
    case "$path" in
      "$OUT_DIR"|"$OUT_DIR"/*) ;;
      *) return 1 ;;
    esac
  done < <(git diff --name-only --diff-filter=U -z)
  [ "$conflicted" = 1 ]
}

discard_generated_output_commit() {
  local path
  local -a generated_paths=()
  while IFS= read -r -d '' path; do
    case "$path" in "$OUT_DIR"|"$OUT_DIR"/*) generated_paths+=("$path");; esac
  done < <(git diff-tree --no-commit-id --name-only -z -r "$GENERATED_COMMIT")
  git reset -q --mixed "$GENERATED_COMMIT^"
  for path in "${generated_paths[@]}"; do
    if git cat-file -e "HEAD:$path" 2>/dev/null; then
      git restore --source=HEAD --staged --worktree -- "$path"
    else
      rm -f -- "$path"
    fi
  done
}

remember_generated_head

if [ "$MODE" = "push" ]; then
  for attempt in 1 2 3; do
    if git push -q origin "HEAD:refs/heads/$BRANCH" 2>"$ERR"; then
      echo "contexto publicado em $(git rev-parse --short HEAD) ($BRANCH)"; exit 0
    fi
    if grep -qiE "protected|GH006|pre-receive|required status|review|rule" "$ERR"; then
      echo "push rejeitado por proteção de branch:"; show_err
      MODE="pr"; break
    fi
    echo "push falhou (tentativa $attempt) — sincronizando com origin/$BRANCH e regenerando"
    git fetch -q origin "$BRANCH"
    # Reaplica somente o commit gerado sobre a origem. --autostash preserva alterações
    # locais rastreadas; arquivos não rastreados permanecem intocados. Nunca use reset
    # destrutivo aqui: este utilitário também pode ser executado fora de um runner efêmero.
    if ! git ${REBASE_ID[@]+"${REBASE_ID[@]}"} rebase --autostash "origin/$BRANCH"; then
      if generated_output_conflict_is_recoverable; then
        git rebase --abort >/dev/null 2>&1 || true
        discard_generated_output_commit
        if ! git ${REBASE_ID[@]+"${REBASE_ID[@]}"} rebase --autostash "origin/$BRANCH"; then
          git rebase --abort >/dev/null 2>&1 || true
          echo "ERRO: não foi possível preservar os commits locais antes de regenerar." >&2
          exit 1
        fi
      else
        git rebase --abort >/dev/null 2>&1 || true
        echo "ERRO: conflito fora da saída gerada; o checkout local foi preservado." >&2
        exit 1
      fi
    fi
    # Um rebase bem-sucedido troca o SHA do commit sobrevivente mesmo quando a
    # regeneração seguinte não cria diff. Não atualize a identidade se ele foi
    # descartado: nesse caso HEAD pertence à origem ou ao usuário.
    if generated_commit_is_head; then remember_generated_head; fi
    eval "$GEN_CMD --force"
    stage
    if ! git diff --cached --quiet; then
      if generated_commit_is_head; then
        git "${BOT_ID[@]}" commit -q --amend --no-edit
      else
        # O rebase pode descartar o commit gerado como patch equivalente. Nesse
        # caso HEAD pertence à origem (ou ao usuário) e jamais deve ser emendado.
        git "${BOT_ID[@]}" commit -q -m "$MSG"
      fi
      remember_generated_head
    fi
  done
  if [ "$MODE" != "pr" ]; then
    echo "ERRO: não foi possível publicar após 3 tentativas"; show_err; exit 1
  fi
fi

# ---- modo PR (branch protegida ou MODE=pr)
if ! command -v gh >/dev/null; then
  echo "ERRO: branch protegida e gh CLI ausente — não há como abrir PR"; exit 1
fi
# lease = o que está no remoto agora: se alguém mexeu na branch da PR entre esta leitura e o push, o push é recusado
rc=0; PR_OLD=$(git ls-remote --exit-code origin "refs/heads/$PR_BRANCH" 2>"$ERR" | cut -f1) || rc=$?
if [ "$rc" != 0 ] && [ "$rc" != 2 ]; then
  echo "ERRO: não foi possível consultar $PR_BRANCH no remoto — nada foi publicado." >&2; show_err; exit 1
fi
git push -q --force-with-lease="refs/heads/$PR_BRANCH:$PR_OLD" origin "HEAD:refs/heads/$PR_BRANCH"
if gh pr list --head "$PR_BRANCH" --base "$BRANCH" --state open --json number -q '.[0].number' | grep -q .; then
  echo "PR existente atualizada (branch $PR_BRANCH)"
else
  gh pr create --base "$BRANCH" --head "$PR_BRANCH" --title "chore(ai-context): atualiza contexto para agentes" \
    --body "Atualização automática de \`$OUT_DIR\` pelo AI Context Sync. Mergeie para manter os agentes com contexto atual." >/dev/null
  echo "PR aberta (branch $PR_BRANCH → $BRANCH)"
fi
