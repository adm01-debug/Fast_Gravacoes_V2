#!/usr/bin/env bash
# Instala a versão revisada do espelho, com a mesma trava Git da rotina diária.
set -euo pipefail
REPO="$(git rev-parse --show-toplevel)"
STORE="$HOME/.local/share/fast-gravacoes-sync"
UNITS="$HOME/.config/systemd/user"
mkdir -p "$STORE" "$UNITS" "$HOME/.cache"
cp "$REPO/scripts/sync/sincronizar.sh" "$STORE/sincronizar.sh"
chmod +x "$STORE/sincronizar.sh"
cat > "$UNITS/fast-gravacoes-sync.service" <<UNIT
[Unit]
Description=Sincroniza Fast Gravações preservando alterações locais
[Service]
Type=oneshot
Environment=FG_REPO=$REPO
ExecStart=/usr/bin/flock -n $HOME/.cache/fast-gravacoes-git.lock $STORE/sincronizar.sh
Nice=10
IOSchedulingClass=idle
TimeoutStartSec=5min
UNIT
cat > "$UNITS/fast-gravacoes-sync.timer" <<'UNIT'
[Unit]
Description=Sincroniza Fast Gravações a cada hora
[Timer]
OnCalendar=hourly
Persistent=true
[Install]
WantedBy=timers.target
UNIT
systemctl --user daemon-reload
systemctl --user enable --now fast-gravacoes-sync.timer
