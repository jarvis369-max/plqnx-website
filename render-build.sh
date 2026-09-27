#!/usr/bin/env bash
set -euo pipefail

python -m pip install --upgrade pip
python -m pip install -r requirements.txt zstandard

python install_ollama_render.py

export OLLAMA_HOST=127.0.0.1:11434
export OLLAMA_MODELS="$PWD/.ollama-models"
export OLLAMA_MAX_LOADED_MODELS=1
export OLLAMA_NUM_PARALLEL=1
mkdir -p "$OLLAMA_MODELS"

"$PWD/.ollama-runtime/bin/ollama" serve >/tmp/ollama-build.log 2>&1 &
OLLAMA_PID=$!

cleanup() {
  kill "$OLLAMA_PID" >/dev/null 2>&1 || true
}
trap cleanup EXIT

for i in $(seq 1 60); do
  if "$PWD/.ollama-runtime/bin/ollama" list >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

"$PWD/.ollama-runtime/bin/ollama" pull R4C3R/qwen2.5-0.5b-heretic
"$PWD/.ollama-runtime/bin/ollama" pull huihui_ai/llama3.2-abliterate:1b

echo "PLQNX models are bundled into the Render build."
