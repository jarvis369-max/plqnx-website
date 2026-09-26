import asyncio
import base64
import json
import os
import tempfile
from pathlib import Path
from typing import AsyncIterator, Literal

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, RedirectResponse, StreamingResponse
from openai import AsyncOpenAI
from pydantic import BaseModel, Field


BASE_DIR = Path(__file__).resolve().parent

OPENAI_TEXT_MODEL = os.getenv("OPENAI_TEXT_MODEL", "gpt-5.6-luna")
OPENAI_VOICE_MODEL = os.getenv("OPENAI_VOICE_MODEL", "gpt-realtime-1.5")
OPENAI_STT_MODEL = os.getenv("OPENAI_STT_MODEL", "gpt-4o-mini-transcribe")
OPENAI_TTS_MODEL = os.getenv("OPENAI_TTS_MODEL", "gpt-4o-mini-tts")
OPENAI_TTS_VOICE = os.getenv("OPENAI_TTS_VOICE", "alloy")


app = FastAPI(
    title="PLQNX CORE",
    version="2.0.0",
    description="OpenAI-powered multilingual multimodal AI workspace.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

SYSTEM_PROMPT = """You are PLQNX CORE, a multilingual multimodal AI assistant.
Be accurate, useful, practical, and explicit about uncertainty.
Respond in the user's language when clear. Support English and Indian languages
including Hindi, Telugu, Tamil, Kannada, Marathi, Bengali, Malayalam, Gujarati,
Punjabi and Urdu. For coding tasks, provide complete runnable code when useful,
explain important assumptions, and prefer secure modern patterns."""


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=50_000)


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=50_000)
    history: list[ChatMessage] = Field(default_factory=list)


def require_client() -> AsyncOpenAI:
    # Read the secret at request time so Railway-injected variables are always used.
    api_key = (os.getenv("OPENAI_API_KEY") or "").strip()
    if not api_key:
        raise HTTPException(
            status_code=503,
            detail="OPENAI_API_KEY is not configured on the server.",
        )
    return AsyncOpenAI(api_key=api_key)


def response_input(history: list[ChatMessage], message: str) -> list[dict]:
    items: list[dict] = [
        {
            "role": "system",
            "content": [{"type": "input_text", "text": SYSTEM_PROMPT}],
        }
    ]
    for item in history[-24:]:
        content_type = "input_text" if item.role == "user" else "output_text"
        items.append(
            {
                "role": item.role,
                "content": [{"type": content_type, "text": item.content}],
            }
        )
    items.append(
        {
            "role": "user",
            "content": [{"type": "input_text", "text": message}],
        }
    )
    return items


async def stream_text(history: list[ChatMessage], message: str) -> AsyncIterator[str]:
    api = require_client()
    async with api.responses.stream(
        model=OPENAI_TEXT_MODEL,
        input=response_input(history, message),
    ) as stream:
        async for event in stream:
            if event.type == "response.output_text.delta" and event.delta:
                yield event.delta


async def generate_text(message: str, history: list[ChatMessage] | None = None) -> str:
    parts: list[str] = []
    async for piece in stream_text(history or [], message):
        parts.append(piece)
    return "".join(parts)


async def transcribe_audio(
    audio_bytes: bytes,
    suffix: str = ".webm",
    language: str | None = None,
) -> str:
    api = require_client()

    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as temp:
        temp.write(audio_bytes)
        temp_path = Path(temp.name)

    try:
        with temp_path.open("rb") as audio_file:
            kwargs = {"model": OPENAI_STT_MODEL, "file": audio_file}
            if language and language != "auto":
                kwargs["language"] = language
            result = await api.audio.transcriptions.create(**kwargs)
        return (result.text or "").strip()
    finally:
        temp_path.unlink(missing_ok=True)


async def synthesize_speech(text: str) -> bytes:
    api = require_client()
    response = await api.audio.speech.create(
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

    raise RuntimeError("OpenAI speech synthesis returned an unsupported response.")


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
        "openai_configured": bool((os.getenv("OPENAI_API_KEY") or "").strip()),
        "text_model": OPENAI_TEXT_MODEL,
        "voice_model": OPENAI_VOICE_MODEL,
        "stt_model": OPENAI_STT_MODEL,
        "tts_model": OPENAI_TTS_MODEL,
    }


@app.get("/api/providers")
async def providers():
    return {
        "provider": "OpenAI",
        "configured": bool((os.getenv("OPENAI_API_KEY") or "").strip()),
        "text_model": OPENAI_TEXT_MODEL,
        "voice_model": OPENAI_VOICE_MODEL,
        "stt_model": OPENAI_STT_MODEL,
        "tts_model": OPENAI_TTS_MODEL,
    }


@app.post("/api/chat")
async def chat(request: ChatRequest):
    async def event_stream():
        yield ndjson(
            {
                "type": "meta",
                "provider": "OpenAI",
                "model": OPENAI_TEXT_MODEL,
            }
        )
        try:
            async for text in stream_text(request.history, request.message):
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
        await websocket.send_json({"type": "ready", "provider": "OpenAI"})

        while True:
            message = await websocket.receive()

            if message.get("bytes") is not None:
                chunks.append(message["bytes"])
                continue

            raw_text = message.get("text")
            if not raw_text:
                continue

            event = json.loads(raw_text)
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
                await websocket.send_json(
                    {"type": "warning", "message": "Unknown voice event."}
                )
                continue

            if not chunks:
                await websocket.send_json(
                    {"type": "error", "message": "No audio was received."}
                )
                continue

            await websocket.send_json(
                {"type": "processing", "stage": "transcription"}
            )

            audio_blob = b"".join(chunks)
            chunks.clear()

            transcript = await transcribe_audio(audio_blob, ".webm", language)
            if not transcript:
                await websocket.send_json(
                    {
                        "type": "error",
                        "message": "No speech could be detected in that recording.",
                    }
                )
                continue

            await websocket.send_json(
                {"type": "transcript", "text": transcript}
            )
            await websocket.send_json(
                {"type": "processing", "stage": "reasoning"}
            )

            reply = await generate_text(transcript)

            await websocket.send_json(
                {
                    "type": "assistant_text",
                    "text": reply,
                    "provider": "OpenAI",
                    "model": OPENAI_TEXT_MODEL,
                }
            )

            if mode == "transcribe":
                await websocket.send_json({"type": "done"})
                continue

            await websocket.send_json(
                {"type": "processing", "stage": "speech"}
            )

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
        try:
            await websocket.close(code=1011)
        except Exception:
            pass


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", "3000")),
        reload=os.getenv("RELOAD", "false").lower() == "true",
    )
