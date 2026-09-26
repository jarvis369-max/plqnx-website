FROM python:3.12-slim-bookworm

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    HF_CACHE_DIR=/app/.hf-cache \
    AI_PORT=9000

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends nodejs npm ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt package.json ./

RUN pip install --no-cache-dir -r requirements.txt \
    && npm install --omit=dev --no-audit --no-fund

COPY . .

# Download the quantized server model during the image build so end users
# never wait for a model download and production only starts from a warm image.
RUN mkdir -p "$HF_CACHE_DIR" \
    && node -e "import('@huggingface/transformers').then(async ({pipeline,env})=>{env.cacheDir=process.env.HF_CACHE_DIR; console.log('Prefetching PLQNX model...'); const p=await pipeline('text-generation','onnx-community/SmolLM2-135M-Instruct-ONNX-MHA',{dtype:'q4'}); console.log('PLQNX model cached'); if(p.dispose) await p.dispose();}).catch(e=>{console.error(e);process.exit(1)})"

EXPOSE 8080

CMD ["sh", "-c", "node ai-server.mjs & exec uvicorn main:app --host 0.0.0.0 --port ${PORT:-8080}"]
