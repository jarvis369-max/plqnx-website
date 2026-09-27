FROM python:3.12-slim-bookworm

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    OLLAMA_HOST=127.0.0.1:11434 \
    OLLAMA_MODELS=/root/.ollama/models

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends curl ca-certificates \
    && curl -fsSL https://ollama.com/install.sh | sh \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Bake both user-selected Ollama models into the production image.
# This makes deploys larger, but visitors never download model weights.
RUN sh -c 'ollama serve >/tmp/ollama-build.log 2>&1 & pid=$!; \
    sleep 4; \
    ollama pull R4C3R/qwen2.5-0.5b-heretic; \
    ollama pull huihui_ai/llama3.2-abliterate:1b; \
    kill "$pid"; \
    wait "$pid" || true'

EXPOSE 8080

CMD ["sh", "-c", "ollama serve >/tmp/ollama.log 2>&1 & python warm_ollama.py && exec uvicorn main:app --host 0.0.0.0 --port ${PORT:-8080}"]
