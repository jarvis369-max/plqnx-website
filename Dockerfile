FROM python:3.12-slim-bookworm

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    OLLAMA_HOST=127.0.0.1:11434 \
    OLLAMA_MODELS=/root/.ollama/models

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends curl ca-certificates zstd \
    && curl -fsSL https://ollama.com/install.sh | sh \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Bake the two PLQNX text models into the image so production does not
# depend on the founder's PC and visitors never download model weights.
RUN sh -c 'ollama serve >/tmp/ollama-build.log 2>&1 & pid=$!; \
    for i in 1 2 3 4 5 6 7 8 9 10; do ollama list >/dev/null 2>&1 && break; sleep 1; done; \
    ollama pull R4C3R/qwen2.5-0.5b-heretic; \
    ollama pull huihui_ai/llama3.2-abliterate:1b; \
    kill "$pid"; \
    wait "$pid" || true'

EXPOSE 10000

CMD ["sh", "-c", "ollama serve >/tmp/ollama.log 2>&1 & exec uvicorn main:app --host 0.0.0.0 --port ${PORT:-10000}"]
