import asyncio
import base64
import json
import os
import tempfile
from pathlib import Path
from typing import AsyncIterator, Literal

from anthropic import AsyncAnthropic
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, RedirectResponse, StreamingResponse
from openai import AsyncOpenAI
from pydantic import BaseModel, Field

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
VAPI_API_KEY = os.getenv("VAPI_API_KEY", "")
ROOMI_AI_KEY = os.getenv("ROOMI_AI_KEY", "")

OPENAI_TEXT_MODEL = os.getenv("OPENAI_TEXT_MODEL", "gpt-4o")
OPENAI_FAST_MODEL = os.getenv("OPENAI_FAST_MODEL", "gpt-4o-mini")
OPENAI_STT_MODEL = os.getenv("OPENAI_STT_MODEL", "gpt-4o-mini-transcribe")
OPENAI_TTS_MODEL = os.getenv("OPENAI_TTS_MODEL", "gpt-4o-mini-tts")
OPENAI_TTS_VOICE = os.getenv("OPENAI_TTS_VOICE", "alloy")
ANTHROPIC_MODEL = os.getenv("ANTHROPIC_MODEL", "claude-3-5-sonnet-latest")

openai_client = AsyncOpenAI(api_key=OPENAI_API_KEY) if OPENAI_API_KEY else None
anthropic_client = AsyncAnthropic(api_key=ANTHROPIC_API_KEY) if ANTHROPIC_API_KEY else None

app = FastAPI(
    title="PLQNX Multimodal AI",
    version="1.0.0",
    description="Real-time multilingual multimodal AI workspace.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

SYSTEM_PROMPT = """You are PLQNX, a multilingual multimodal AI assistant.
Be accurate, practical, concise when possible, and explicit about uncertainty.
Respond in the user's language when that is clear. You handle English and Indian
regional languages including Hindi, Tamil, Telugu, Kannada, Marathi and Bengali.
For code, produce complete runnable examples, explain important assumptions, and
prefer secure current patterns. Never invent results from tools you did not run."""

CODE_HINTS = {
    "code", "coding", "python", "javascript", "typescript", "html", "css", "react",
    "fastapi", "django", "flask", "sql", "database", "api", "bug", "debug", "error",
    "stack trace", "function", "class", "algorithm", "docker", "kubernetes", "git",
    "regex", "refactor", "compile", "terminal", "backend", "frontend", "full-stack",
}


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=50_000)


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=50_000)
    history: list[ChatMessage] = Field(default_factory=list)
    mode: Literal["auto", "openai", "anthropic"] = "auto"


def choose_provider(text: str, mode: str = "auto", voice: bool = False) -> tuple[str, str]:
    if voice:
        return "openai", OPENAI_FAST_MODEL
    if mode == "openai":
        return "openai", OPENAI_TEXT_MODEL
    if mode == "anthropic":
        return "anthropic", ANTHROPIC_MODEL

    lowered = text.lower()
    if any(hint in lowered for hint in CODE_HINTS) and anthropic_client:
        return "anthropic", ANTHROPIC_MODEL
    return "openai", OPENAI_TEXT_MODEL


def _openai_messages(history: list[ChatMessage], message: str) -> list[dict[str, str]]:
    trimmed = history[-20:]
    return [
        {"role": "system", "content": SYSTEM_PROMPT},
        *[{"role": item.role, "content": item.content} for item in trimmed],
        {"role": "user", "content": message},
    ]


def _anthropic_messages(history: list[ChatMessage], message: str) -> list[dict[str, str]]:
    trimmed = history[-20:]
    return [
        *[{"role": item.role, "content": item.content} for item in trimmed],
        {"role": "user", "content": message},
    ]


async def stream_openai(history: list[ChatMessage], message: str, model: str) -> AsyncIterator[str]:
    if not openai_client:
        raise HTTPException(status_code=503, detail="OPENAI_API_KEY is not configured.")
    stream = await openai_client.chat.completions.create(
        model=model,
        messages=_openai_messages(history, message),
        temperature=0.4,
        stream=True,
    )
    async for chunk in stream:
        text = chunk.choices[0].delta.content or ""
        if text:
            yield text


async def stream_anthropic(history: list[ChatMessage], message: str, model: str) -> AsyncIterator[str]:
    if not anthropic_client:
        # Graceful fallback keeps the application working when only OpenAI is configured.
        async for text in stream_openai(history, message, OPENAI_TEXT_MODEL):
            yield text
        return

    async with anthropic_client.messages.stream(
        model=model,
        system=SYSTEM_PROMPT,
        max_tokens=4096,
        temperature=0.3,
        messages=_anthropic_messages(history, message),
    ) as stream:
        async for text in stream.text_stream:
            if text:
                yield text


async def generate_text(
    message: str,
    history: list[ChatMessage] | None = None,
    mode: str = "auto",
    voice: bool = False,
) -> tuple[str, str, str]:
    history = history or []
    provider, model = choose_provider(message, mode=mode, voice=voice)
    parts: list[str] = []
    iterator = (
        stream_anthropic(history, message, model)
        if provider == "anthropic"
        else stream_openai(history, message, model)
    )
    async for piece in iterator:
        parts.append(piece)
    return "".join(parts), provider, model


async def transcribe_audio(audio_bytes: bytes, suffix: str = ".webm", language: str | None = None) -> str:
    if not openai_client:
        raise RuntimeError("OPENAI_API_KEY is required for speech recognition.")

    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as temp:
        temp.write(audio_bytes)
        temp_path = Path(temp.name)

    try:
        with temp_path.open("rb") as audio_file:
            kwargs = {
                "model": OPENAI_STT_MODEL,
                "file": audio_file,
            }
            if language and language != "auto":
                kwargs["language"] = language
            result = await openai_client.audio.transcriptions.create(**kwargs)
        return (result.text or "").strip()
    finally:
        temp_path.unlink(missing_ok=True)


async def synthesize_speech(text: str) -> bytes:
    if not openai_client:
        raise RuntimeError("OPENAI_API_KEY is required for speech synthesis.")

    response = await openai_client.audio.speech.create(
        model=OPENAI_TTS_MODEL,
        voice=OPENAI_TTS_VOICE,
        input=text[:4096],
        response_format="mp3",
    )
    content = getattr(response, "content", None)
    if isinstance(content, (bytes, bytearray)):
        return bytes(content)
    read_method = getattr(response, "read", None)
    if read_method:
        data = read_method()
        if asyncio.iscoroutine(data):
            data = await data
        return bytes(data)
    raise RuntimeError("The speech provider returned an unsupported response type.")


def ndjson(payload: dict) -> bytes:
    return (json.dumps(payload, ensure_ascii=False) + "\n").encode("utf-8")


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
        "openai": bool(OPENAI_API_KEY),
        "anthropic": bool(ANTHROPIC_API_KEY),
        "vapi": bool(VAPI_API_KEY),
        "roomi": bool(ROOMI_AI_KEY),
    }


@app.get("/api/providers")
async def providers():
    return {
        "text": {
            "openai": {"configured": bool(OPENAI_API_KEY), "model": OPENAI_TEXT_MODEL},
            "anthropic": {"configured": bool(ANTHROPIC_API_KEY), "model": ANTHROPIC_MODEL},
        },
        "voice": {
            "openai": {
                "configured": bool(OPENAI_API_KEY),
                "chat_model": OPENAI_FAST_MODEL,
                "stt_model": OPENAI_STT_MODEL,
                "tts_model": OPENAI_TTS_MODEL,
            },
            "vapi": {
                "configured": bool(VAPI_API_KEY),
                "role": "optional orchestration credential available to server-side adapters",
            },
            "roomi": {
                "configured": bool(ROOMI_AI_KEY),
                "role": "optional regional-voice credential available to server-side adapters",
            },
        },
    }


@app.post("/api/chat")
async def chat(request: ChatRequest):
    provider, model = choose_provider(request.message, request.mode)

    async def event_stream():
        yield ndjson({"type": "meta", "provider": provider, "model": model})
        try:
            iterator = (
                stream_anthropic(request.history, request.message, model)
                if provider == "anthropic"
                else stream_openai(request.history, request.message, model)
            )
            async for text in iterator:
                yield ndjson({"type": "delta", "text": text})
            yield ndjson({"type": "done"})
        except Exception as exc:
            yield ndjson({"type": "error", "message": str(exc)})

    return StreamingResponse(event_stream(), media_type="application/x-ndjson")


@app.websocket("/ws/audio")
async def audio_socket(websocket: WebSocket):
    await websocket.accept()
    chunks: list[bytes] = []
    language = "auto"
    mode = "voice"

    try:
        await websocket.send_json({"type": "ready"})
        while True:
            message = await websocket.receive()

            if message.get("bytes") is not None:
                chunks.append(message["bytes"])
                await websocket.send_json(
                    {"type": "audio_ack", "bytes_received": sum(len(c) for c in chunks)}
                )
                continue

            text_data = message.get("text")
            if not text_data:
                continue

            event = json.loads(text_data)
            event_type = event.get("type")

            if event_type == "start":
                chunks.clear()
                language = event.get("language", "auto")
                mode = event.get("mode", "voice")
                await websocket.send_json({"type": "recording"})
                continue

            if event_type == "cancel":
                chunks.clear()
                await websocket.send_json({"type": "cancelled"})
                continue

            if event_type != "stop":
                await websocket.send_json({"type": "warning", "message": "Unknown event type."})
                continue

            if not chunks:
                await websocket.send_json({"type": "error", "message": "No audio was received."})
                continue

            await websocket.send_json({"type": "processing", "stage": "transcription"})
            audio_blob = b"".join(chunks)
            chunks.clear()

            transcript = await transcribe_audio(audio_blob, ".webm", language)
            if not transcript:
                await websocket.send_json(
                    {"type": "error", "message": "I could not detect speech in that recording."}
                )
                continue

            await websocket.send_json({"type": "transcript", "text": transcript})
            await websocket.send_json({"type": "processing", "stage": "reasoning"})

            reply, provider, model = await generate_text(transcript, voice=True)
            await websocket.send_json(
                {
                    "type": "assistant_text",
                    "text": reply,
                    "provider": provider,
                    "model": model,
                }
            )

            if mode == "transcribe":
                await websocket.send_json({"type": "done"})
                continue

            await websocket.send_json({"type": "processing", "stage": "speech"})
            audio = await synthesize_speech(reply)
            await websocket.send_json(
                {
                    "type": "assistant_audio",
                    "mime": "audio/mpeg",
                    "data": base64.b64encode(audio).decode("ascii"),
                }
            )
            await websocket.send_json({"type": "done"})

    except WebSocketDisconnect:
        return
    except Exception as exc:
        try:
            await websocket.send_json({"type": "error", "message": str(exc)})
        except Exception:
            pass
        await websocket.close(code=1011)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", "3000")),
        reload=os.getenv("RELOAD", "false").lower() == "true",
    )
