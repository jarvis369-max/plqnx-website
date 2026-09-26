from pathlib import Path
import os

from fastapi import FastAPI
from fastapi.responses import FileResponse, RedirectResponse

BASE_DIR = Path(__file__).resolve().parent

app = FastAPI(
    title="PLQNX CORE",
    version="4.2.0",
    description="Browser-first multimodal AI workspace using WebGPU, WebLLM and Transformers.js.",
)

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

@app.get("/health")
async def health():
    return {
        "ok": True,
        "version": "4.2.0",
        "runtime": "browser-first",
        "server_api_key_required": False,
        "capabilities": {
            "text": "MLC WebLLM / instant SmolLM2 360M + optional Qwen2.5 1.5B-3B",
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
