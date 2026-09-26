from pathlib import Path
import os

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse, RedirectResponse
from pydantic import BaseModel, Field
import httpx

BASE_DIR = Path(__file__).resolve().parent

app = FastAPI(
    title="PLQNX CORE",
    version="4.4.0",
    description="Fast multimodal AI workspace with shared server inference and optional browser-local models.",
)

AI_URL = os.getenv("PLQNX_AI_URL", "http://127.0.0.1:9000")

class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=24000)
    history: list[dict] = Field(default_factory=list)

def no_store_file(path: Path, media_type: str | None = None):
    response = FileResponse(path, media_type=media_type)
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return response

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

@app.get("/api/ai-health")
async def ai_health():
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            response = await client.get(f"{AI_URL}/health")
        data = response.json()
        return {"ok": response.status_code == 200, **data}
    except Exception as exc:
        return {"ok": False, "ready": False, "error": type(exc).__name__}

@app.post("/api/chat")
async def api_chat(request: ChatRequest):
    payload = {
        "message": request.message,
        "history": request.history[-10:],
    }
    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(f"{AI_URL}/generate", json=payload)
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=503, detail=f"AI service connection failed: {type(exc).__name__}") from exc

    if response.status_code != 200:
        detail = "AI service is starting"
        try:
            body = response.json()
            detail = body.get("detail") or body.get("error") or detail
        except Exception:
            pass
        raise HTTPException(status_code=503, detail=detail)

    data = response.json()
    text = (data.get("text") or "").strip()
    if not text:
        raise HTTPException(status_code=502, detail="AI service returned an empty response")
    return {"text": text, "model": data.get("model", "plqnx-server-ai")}

@app.get("/health")
async def health():
    ai_ready = False
    ai_model = None
    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            response = await client.get(f"{AI_URL}/health")
        if response.status_code == 200:
            data = response.json()
            ai_ready = bool(data.get("ready"))
            ai_model = data.get("model")
    except Exception:
        ai_ready = False

    if not ai_ready:
        raise HTTPException(status_code=503, detail="PLQNX AI is starting")

    return {
        "ok": True,
        "version": "4.4.0",
        "runtime": "server-first-with-browser-fallback",
        "server_api_key_required": False,
        "chat_endpoint": "/api/chat",
        "ai_ready": True,
        "ai_model": ai_model,
        "capabilities": {
            "text": "Preloaded shared SmolLM2 135M + optional local WebLLM models",
            "vision": "Transformers.js image captioning + optional OCR",
            "speech_to_text": "Transformers.js Whisper",
            "text_to_speech": "Browser speech synthesis",
            "documents": "Browser PDF/text extraction",
            "code_canvas": "Markdown, syntax highlighting and sandboxed HTML",
        },
    }

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", "3000")),
    )
