#!/usr/bin/env bash
set -euo pipefail

export OLLAMA_HOST="${OLLAMA_HOST:-127.0.0.1:11434}"
export OLLAMA_MODELS="${OLLAMA_MODELS:-$PWD/.ollama-models}"
export OLLAMA_MAX_LOADED_MODELS="${OLLAMA_MAX_LOADED_MODELS:-1}"
export OLLAMA_NUM_PARALLEL="${OLLAMA_NUM_PARALLEL:-1}"

"$PWD/.ollama-runtime/bin/ollama" serve >/tmp/ollama-runtime.log 2>&1 &

for i in $(seq 1 60); do
  if "$PWD/.ollama-runtime/bin/ollama" list >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

exec uvicorn main:app --host 0.0.0.0 --port "${PORT:-10000}"
