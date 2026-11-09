#!/usr/bin/env bash
# Instala a rotina diária (timer systemd de usuário, 08:15). Idempotente.
# Copia os scripts para um local ESTÁVEL fora do repo, para o timer não depender da branch ativa.
# Desinstalar: systemctl --user disable --now fast-gravacoes-rotina.timer
set -euo pipefail
REPO="$(git rev-parse --show-toplevel)"
STORE="$HOME/.local/share/fast-gravacoes-rotina"
UNITS="$HOME/.config/systemd/user"
NODE="$(command -v node)"
mkdir -p "$STORE/scripts" "$UNITS" "$HOME/relatorios/fast-gravacoes-v2"
rm -rf "$STORE/scripts/autofix" "$STORE/scripts/audit"
cp -r "$REPO/scripts/autofix" "$REPO/scripts/audit" "$STORE/scripts/"
rm -f "$STORE/scripts/audit/baseline.json"   # a rotina compara com o dia anterior, não com este arquivo
cp "$REPO/scripts/rotina/rotina.mjs" "$STORE/rotina.mjs"

cat > "$UNITS/fast-gravacoes-rotina.service" <<UNIT
[Unit]
Description=Rotina diaria Fast_Gravacoes_V2 (audit + autofix, sem IA)
[Service]
Type=oneshot
Environment=FG_REPO=$REPO
ExecStart=/usr/bin/flock -n /tmp/fast-gravacoes-rotina.lock $NODE $STORE/rotina.mjs
Nice=15
IOSchedulingClass=idle
TimeoutStartSec=40min
UNIT

cat > "$UNITS/fast-gravacoes-rotina.timer" <<UNIT
[Unit]
Description=Rotina diaria Fast_Gravacoes_V2 (08:15)
[Timer]
OnCalendar=*-*-* 08:15:00
Persistent=true
[Install]
WantedBy=timers.target
UNIT

systemctl --user daemon-reload
systemctl --user enable --now fast-gravacoes-rotina.timer
systemctl --user list-timers fast-gravacoes-rotina.timer --no-pager | head -3
