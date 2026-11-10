#!/usr/bin/env bash
# Espelha o clone local no GitHub: o estado COMMITADO local fica EXATAMENTE igual ao do GitHub.
# Sem IA, sem custo, sem intervenção. Roda de hora em hora (timer systemd).
#
# O que faz:
#   1. git fetch origin --prune --prune-tags --tags   (refs remotas e tags idênticas às do GitHub)
#   2. garante que existe a branch local `main` acompanhando origin/main
#   3. para cada branch local cujo upstream tem O MESMO NOME no GitHub, deixa a branch IGUAL ao GitHub:
#        - atrasada            -> avança (fast-forward)
#        - adiantada/divergida -> SALVA o estado local em refs/backup/sync/<branch>/<data> e iguala ao GitHub
#      Branch aberta no clone principal: só mexe nos arquivos se não houver alteração local (reset --keep
#      numa árvore limpa = igual ao GitHub; conflito recusa a atualização). Se houver alteração local, espera ficar limpa e avisa no log.
#
# Por que o backup: "igual ao GitHub" descarta commits que só existem aqui. Eles ficam recuperáveis:
#   git branch recuperada refs/backup/sync/<branch>/<data>      (backups com mais de 30 dias são apagados)
#
# O que NUNCA faz: tocar em arquivo modificado ou não rastreado, mexer em pasta de trabalho separada
# (worktree), trocar de branch, apagar branch, mexer em branch sem upstream de mesmo nome (trabalho local
# ou configuração de upstream errada: só avisa), fazer push.
#
# Log: ~/relatorios/fast-gravacoes-v2/sync.log   Repo: $FG_REPO (padrão ~/projetos/Fast_Gravacoes_V2)
set -euo pipefail
REPO="${FG_REPO:-$HOME/projetos/Fast_Gravacoes_V2}"
LOGDIR="${FG_REPORTS:-$HOME/relatorios/fast-gravacoes-v2}"
LOG="$LOGDIR/sync.log"
mkdir -p "$LOGDIR"
[ -f "$LOG" ] && [ "$(stat -c %s "$LOG")" -gt 1048576 ] && mv -f "$LOG" "$LOG.1"
log() { printf '%s %s\n' "$(date '+%F %T')" "$*" >> "$LOG"; echo "$*"; }

cd "$REPO" 2>/dev/null || { log "ERRO: repositório não encontrado em $REPO"; exit 1; }
export GIT_TERMINAL_PROMPT=0   # nunca pedir senha: sem credencial, falha e segue

if ! ERR=$(timeout 180 git fetch origin --prune --prune-tags --tags --quiet 2>&1); then
  log "fetch falhou (rede/credencial?): $(echo "$ERR" | head -1 | cut -c1-160)"
  exit 1
fi

# branch principal do GitHub (main) existe localmente e acompanha origin/main
if git rev-parse --verify --quiet refs/remotes/origin/main >/dev/null \
   && ! git rev-parse --verify --quiet refs/heads/main >/dev/null; then
  git branch --track main origin/main >/dev/null 2>&1 && log "criada a branch local main acompanhando origin/main"
fi

# mapa branch -> pasta onde está aberta (repo principal e worktrees)
declare -A ABERTA
cur=""
while IFS= read -r l; do
  case "$l" in
    "worktree "*) cur="${l#worktree }" ;;
    "branch refs/heads/"*) ABERTA["${l#branch refs/heads/}"]="$cur" ;;
  esac
done < <(git worktree list --porcelain)

em_andamento() { # merge/rebase/cherry-pick/revert em curso na pasta $1?
  local d="$1" f
  for f in MERGE_HEAD CHERRY_PICK_HEAD REVERT_HEAD rebase-merge rebase-apply; do
    [ -e "$(git -C "$d" rev-parse --git-path "$f" 2>/dev/null)" ] && return 0
  done
  return 1
}

# apaga backups com mais de 30 dias (o nome da ref termina com AAAAMMDDTHHMMSS)
limite=$(date -d '30 days ago' +%Y%m%d)
while IFS= read -r ref; do
  d="${ref##*/}"; d="${d:0:8}"
  [[ "$d" =~ ^[0-9]{8}$ ]] && [ "$d" -lt "$limite" ] && git update-ref -d "$ref"
done < <(git for-each-ref --format='%(refname)' refs/backup/sync)

igualadas=(); avancadas=(); puladas=(); avisos=()
while IFS='|' read -r b up track; do
  [ -z "$up" ] && continue
  [ "$track" = "[gone]" ] && continue                      # upstream apagado no GitHub: não mexe
  if [ "${up#origin/}" != "$b" ]; then                     # upstream de outro nome: configuração suspeita
    [ "$(git rev-parse "refs/heads/$b")" != "$(git rev-parse "$up" 2>/dev/null)" ] \
      && avisos+=("$b acompanha $up (nome diferente): não espelhada")
    continue
  fi
  local_sha=$(git rev-parse "refs/heads/$b") || continue
  up_sha=$(git rev-parse "$up" 2>/dev/null) || continue
  [ "$local_sha" = "$up_sha" ] && continue

  dir="${ABERTA[$b]:-}"
  if [ -n "$dir" ] && [ "$dir" != "$REPO" ]; then
    puladas+=("$b: aberta em outra pasta de trabalho ($(basename "$dir"))"); continue
  fi
  if [ -n "$dir" ]; then
    if em_andamento "$dir"; then puladas+=("$b: merge/rebase em andamento"); continue; fi
    if [ -n "$(git -C "$dir" status --porcelain --untracked-files=all)" ]; then
      puladas+=("$b: alterações locais não commitadas (espera ficar limpa)"); continue
    fi
  fi

  if git merge-base --is-ancestor "$local_sha" "$up_sha"; then
    modo="ff"; n=$(git rev-list --count "$local_sha..$up_sha")
  else
    # tem commit local que o GitHub não tem: guarda antes de igualar
    modo="espelho"; n=$(git rev-list --count "$up_sha..$local_sha")
    bk="refs/backup/sync/$b/$(date +%Y%m%dT%H%M%S)"
    git update-ref "$bk" "$local_sha" || { puladas+=("$b: não consegui criar o backup, não mexi"); continue; }
  fi

  if [ -n "$dir" ]; then
    git -C "$dir" reset --keep --quiet "$up_sha" 2>/dev/null || { puladas+=("$b: reset recusado pelo git"); continue; }
  else
    git update-ref -m "sync: igualar a $up" "refs/heads/$b" "$up_sha" "$local_sha" || { puladas+=("$b: update-ref recusado"); continue; }
  fi
  if [ "$modo" = "ff" ]; then avancadas+=("$b(+$n)"); else igualadas+=("$b(-$n commits locais salvos em $bk)"); fi
done < <(git for-each-ref --format='%(refname:short)|%(upstream:short)|%(upstream:track)' refs/heads)

msg="fetch ok"
[ ${#avancadas[@]} -gt 0 ] && msg="$msg | avançadas: ${avancadas[*]}"
[ ${#igualadas[@]} -gt 0 ] && msg="$msg | IGUALADAS ao GitHub: ${igualadas[*]}"
[ ${#puladas[@]} -gt 0 ] && msg="$msg | puladas: $(IFS=';'; echo "${puladas[*]}")"
[ ${#avisos[@]} -gt 0 ] && msg="$msg | avisos: $(IFS=';'; echo "${avisos[*]}")"
log "$msg"
exit 0
