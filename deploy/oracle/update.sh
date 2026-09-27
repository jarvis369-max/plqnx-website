#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${PLQNX_APP_DIR:-/opt/plqnx}"

if [ "${EUID}" -ne 0 ]; then
  echo "Run with sudo: sudo bash deploy/oracle/update.sh"
  exit 1
fi

git -C "${APP_DIR}" fetch origin main
git -C "${APP_DIR}" reset --hard origin/main
"${APP_DIR}/.venv/bin/python" -m pip install -r "${APP_DIR}/requirements.txt"
systemctl restart plqnx
systemctl --no-pager --full status plqnx
