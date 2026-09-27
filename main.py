from pathlib import Path
import json
import os

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse, RedirectResponse, StreamingResponse
from pydantic import BaseModel, Field

BASE_DIR = Path(__file__).resolve().parent
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://127.0.0.1:11434")

MODELS = {
    "qwen-fast": {
        "ollama": "R4C3R/qwen2.5-0.5b-heretic",
        "label": "PLQNX Fast · Qwen 0.5B",
        "context": 8192,
    },
    "llama-1b": {
        "ollama": "huihui_ai/llama3.2-abliterate:1b",
        "label": "PLQNX Plus · Llama 1B",
        "context": 8192,
    },
}

SYSTEM_PROMPT = """You are PLQNX CORE, a fast and practical text AI assistant.
Answer directly and clearly. Support general questions, writing, coding, debugging,
summarization, brainstorming, and multilingual conversation. Use the user's language
when clear. For code, provide complete runnable examples when useful. Be concise
unless the user requests detail. Do not invent facts when uncertain.
Do not provide instructions whose primary purpose is to enable serious violence,
self-harm, credential theft, malware deployment, or other clearly harmful activity."""

app = FastAPI(
    title="PLQNX CORE",
    version="5.0.0",
    description="Text-first PLQNX AI powered by server-hosted Ollama models.",
)


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=24000)
    history: list[dict] = Field(default_factory=list)
    model: str = Field(default="qwen-fast")


def no_store_file(path: Path, media_type: str | None = None):
    response = FileResponse(path, media_type=media_type)
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return response


def chosen_model(key: str):
    return MODELS.get(key, MODELS["qwen-fast"])


def normalized_history(history: list[dict]):
    cleaned = []
    for item in history[-12:]:
        if not isinstance(item, dict):
            continue
        role = item.get("role")
        content = item.get("content")
        if role not in {"user", "assistant"} or not isinstance(content, str):
            continue
        cleaned.append({"role": role, "content": content[:12000]})
    return cleaned


def ollama_payload(request: ChatRequest, stream: bool):
    model = chosen_model(request.model)
    return {
        "model": model["ollama"],
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            *normalized_history(request.history),
            {"role": "user", "content": request.message},
        ],
        "stream": stream,
        "keep_alive": "30m",
        "options": {
            "temperature": 0.65,
            "top_p": 0.9,
            "num_ctx": model["context"],
            "num_predict": 700,
        },
    }


@app.get("/")
async def home():
    return no_store_file(BASE_DIR / "index.html")


@app.get("/index.html")
async def index_html():
    return no_store_file(BASE_DIR / "index.html")


@app.get("/core.html")
async def legacy_core():
    return RedirectResponse(url="/", status_code=307)


@app.get("/site.css")
async def site_css():
    return no_store_file(BASE_DIR / "site.css", media_type="text/css")


@app.get("/app.js")
async def app_js():
    return no_store_file(BASE_DIR / "app.js", media_type="text/javascript")


@app.get("/manifest.webmanifest")
async def manifest():
    return no_store_file(
        BASE_DIR / "manifest.webmanifest",
        media_type="application/manifest+json",
    )


@app.get("/sw.js")
async def service_worker():
    response = FileResponse(BASE_DIR / "sw.js", media_type="text/javascript")
    response.headers["Service-Worker-Allowed"] = "/"
    response.headers["Cache-Control"] = "no-cache"
    return response


@app.get("/api/models")
async def api_models():
    return {
        "default": "qwen-fast",
        "models": [
            {"id": key, "label": value["label"]}
            for key, value in MODELS.items()
        ],
    }


@app.get("/api/ai-health")
async def ai_health():
    try:
        async with httpx.AsyncClient(timeout=4.0) as client:
            response = await client.get(f"{OLLAMA_URL}/api/tags")
            response.raise_for_status()
            names = [item.get("name", "") for item in response.json().get("models", [])]
    except Exception as exc:
        return {"ok": False, "ready": False, "error": type(exc).__name__}

    expected = [value["ollama"] for value in MODELS.values()]
    ready = all(
        any(name == model or name.startswith(model + ":") for name in names)
        for model in expected
    )
    return {
        "ok": ready,
        "ready": ready,
        "runtime": "ollama",
        "models": names,
    }


@app.post("/api/chat")
async def api_chat(request: ChatRequest):
    model = chosen_model(request.model)
    try:
        async with httpx.AsyncClient(timeout=180.0) as client:
            response = await client.post(
                f"{OLLAMA_URL}/api/chat",
                json=ollama_payload(request, stream=False),
            )
            response.raise_for_status()
    except httpx.HTTPError as exc:
        raise HTTPException(
            status_code=503,
            detail="PLQNX text model is temporarily unavailable",
        ) from exc

    data = response.json()
    text = ((data.get("message") or {}).get("content") or "").strip()
    if not text:
        raise HTTPException(status_code=502, detail="PLQNX returned an empty response")

    return {
        "text": text,
        "model": model["label"],
    }


@app.post("/api/chat/stream")
async def api_chat_stream(request: ChatRequest):
    model = chosen_model(request.model)

    async def generate():
        try:
            async with httpx.AsyncClient(timeout=None) as client:
                async with client.stream(
                    "POST",
                    f"{OLLAMA_URL}/api/chat",
                    json=ollama_payload(request, stream=True),
                ) as response:
                    if response.status_code >= 400:
                        yield "\n[PLQNX model unavailable]"
                        return

                    async for line in response.aiter_lines():
                        if not line:
                            continue
                        try:
                            event = json.loads(line)
                        except json.JSONDecodeError:
                            continue

                        content = ((event.get("message") or {}).get("content") or "")
                        if content:
                            yield content
        except Exception:
            yield "\n[PLQNX model unavailable]"

    headers = {
        "Cache-Control": "no-cache, no-transform",
        "X-Accel-Buffering": "no",
        "X-PLQNX-Model": model["label"],
    }
    return StreamingResponse(generate(), media_type="text/plain; charset=utf-8", headers=headers)


@app.get("/health")
async def health():
    state = await ai_health()
    if not state.get("ready"):
        raise HTTPException(status_code=503, detail="PLQNX models are starting")

    return {
        "ok": True,
        "version": "5.0.0",
        "runtime": "ollama-text-first",
        "chat_endpoint": "/api/chat/stream",
        "models": [value["ollama"] for value in MODELS.values()],
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", "3000")),
    )
