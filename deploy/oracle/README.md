# Oracle Cloud deployment for PLQNX

This directory contains the production path for running PLQNX without the founder's PC.

## Target architecture

GitHub Pages -> HTTPS PLQNX API on Oracle Cloud -> Ollama -> Qwen / Llama

The VM runs:

- Ollama
- R4C3R/qwen2.5-0.5b-heretic
- huihui_ai/llama3.2-abliterate:1b
- FastAPI / Uvicorn
- Nginx
- optional Let's Encrypt HTTPS

## VM recommendation

Use an Ubuntu ARM64 Ampere A1 VM with enough memory for Ollama and the 1B model. Start with 2 OCPUs and 8-12 GB RAM when available.

Open these ingress ports in the Oracle VCN/security list:

- TCP 22 from your own IP if possible
- TCP 80 from 0.0.0.0/0
- TCP 443 from 0.0.0.0/0

Do not expose Ollama port 11434 publicly.

## First deployment

SSH into the VM, then:

```bash
git clone https://github.com/jarvis369-max/plqnx-website.git
cd plqnx-website
sudo bash deploy/oracle/bootstrap.sh
```

This installs the app and models into /opt/plqnx.

## Add a domain

Create an A record such as:

```text
api.yourdomain.com -> YOUR_ORACLE_PUBLIC_IP
```

After DNS resolves, run:

```bash
cd /opt/plqnx
sudo PLQNX_DOMAIN=api.yourdomain.com bash deploy/oracle/bootstrap.sh
```

The script configures Nginx and requests a Let's Encrypt certificate.

## Update PLQNX later

```bash
sudo bash /opt/plqnx/deploy/oracle/update.sh
```

## Diagnostics

```bash
systemctl status ollama
systemctl status plqnx
journalctl -u plqnx -n 100 --no-pager
ollama list
curl http://127.0.0.1:3000/health
```

## Security

Ollama listens only on localhost. Public traffic reaches FastAPI through Nginx. Keep SSH restricted where possible and keep Ubuntu security updates enabled.
