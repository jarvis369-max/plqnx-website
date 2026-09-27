#!/usr/bin/env bash
set -euo pipefail

REPO_URL="${PLQNX_REPO_URL:-https://github.com/jarvis369-max/plqnx-website.git}"
APP_DIR="${PLQNX_APP_DIR:-/opt/plqnx}"
DOMAIN="${PLQNX_DOMAIN:-}"
APP_USER="${PLQNX_USER:-ubuntu}"

if [ "${EUID}" -ne 0 ]; then
  echo "Run with sudo: sudo bash deploy/oracle/bootstrap.sh"
  exit 1
fi

echo "==> Installing system packages"
apt-get update
DEBIAN_FRONTEND=noninteractive apt-get install -y \
  ca-certificates curl git nginx python3 python3-venv python3-pip ufw

echo "==> Installing Ollama"
if ! command -v ollama >/dev/null 2>&1; then
  curl -fsSL https://ollama.com/install.sh | sh
fi

systemctl enable --now ollama

echo "==> Downloading PLQNX models"
sudo -u ollama ollama pull R4C3R/qwen2.5-0.5b-heretic
sudo -u ollama ollama pull huihui_ai/llama3.2-abliterate:1b

echo "==> Installing PLQNX"
if [ -d "${APP_DIR}/.git" ]; then
  git -C "${APP_DIR}" fetch origin main
  git -C "${APP_DIR}" reset --hard origin/main
else
  rm -rf "${APP_DIR}"
  git clone --branch main "${REPO_URL}" "${APP_DIR}"
fi

python3 -m venv "${APP_DIR}/.venv"
"${APP_DIR}/.venv/bin/python" -m pip install --upgrade pip
"${APP_DIR}/.venv/bin/python" -m pip install -r "${APP_DIR}/requirements.txt"

chown -R "${APP_USER}:${APP_USER}" "${APP_DIR}"

echo "==> Creating PLQNX systemd service"
cat >/etc/systemd/system/plqnx.service <<EOF
[Unit]
Description=PLQNX CORE FastAPI
After=network-online.target ollama.service
Wants=network-online.target
Requires=ollama.service

[Service]
Type=simple
User=${APP_USER}
WorkingDirectory=${APP_DIR}
Environment=OLLAMA_URL=http://127.0.0.1:11434
Environment=PYTHONUNBUFFERED=1
ExecStart=${APP_DIR}/.venv/bin/uvicorn main:app --host 127.0.0.1 --port 3000
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --now plqnx

echo "==> Configuring Nginx"
SERVER_NAME="_"
if [ -n "${DOMAIN}" ]; then
  SERVER_NAME="${DOMAIN}"
fi

cat >/etc/nginx/sites-available/plqnx <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name ${SERVER_NAME};

    client_max_body_size 2m;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_buffering off;
        proxy_read_timeout 600s;
    }
}
EOF

ln -sf /etc/nginx/sites-available/plqnx /etc/nginx/sites-enabled/plqnx
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl restart nginx

echo "==> Configuring firewall"
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

if [ -n "${DOMAIN}" ]; then
  echo "==> Installing HTTPS certificate for ${DOMAIN}"
  DEBIAN_FRONTEND=noninteractive apt-get install -y certbot python3-certbot-nginx
  certbot --nginx --non-interactive --agree-tos --redirect \
    --register-unsafely-without-email -d "${DOMAIN}"
fi

echo
echo "PLQNX backend is installed."
echo "Health check: curl http://127.0.0.1:3000/health"
if [ -n "${DOMAIN}" ]; then
  echo "Public API: https://${DOMAIN}"
else
  echo "Next: point a domain/subdomain at this VM, then rerun with:"
  echo "sudo PLQNX_DOMAIN=api.example.com bash ${APP_DIR}/deploy/oracle/bootstrap.sh"
fi
