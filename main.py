from pathlib import Path
import os

from fastapi import FastAPI
from fastapi.responses import FileResponse, RedirectResponse

BASE_DIR = Path(__file__).resolve().parent

app = FastAPI(
    title="PLQNX CORE",
    version="3.0.0",
    description="Free in-browser multimodal AI workspace powered by WebLLM.",
)

@app.get("/")
async def home():
    return FileResponse(BASE_DIR / "index.html")

@app.get("/core.html")
async def legacy_core():
    return RedirectResponse(url="/", status_code=307)

@app.get("/health")
async def health():
    return {
        "ok": True,
        "ai_runtime": "browser-webgpu",
        "provider": "MLC WebLLM",
        "model": "Qwen2.5-0.5B-Instruct-q4f16_1-MLC",
        "server_api_key_required": False,
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", "3000")),
    )
