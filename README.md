# PLQNX CORE — OpenAI Multimodal AI

PLQNX CORE is a focused full-stack multimodal AI web application powered only by OpenAI.

## Capabilities

- Streaming text-to-text responses
- Voice-to-text from the browser microphone
- Voice-to-voice turn pipeline over WebSockets
- Text-to-voice playback
- Multilingual support for English and Indian languages
- Split-screen chat + output/code canvas
- Markdown rendering and syntax highlighting
- Local browser conversation history
- One AI provider only: OpenAI

## Required secret

The backend requires an OpenAI API key supplied securely by the deployment environment:

```text
OPENAI_API_KEY=...
```

Do not put the key inside `index.html`, commit it to GitHub, or expose it to browser JavaScript.

## Optional model settings

```text
OPENAI_TEXT_MODEL=gpt-5.6-luna
OPENAI_VOICE_MODEL=gpt-realtime-1.5
OPENAI_STT_MODEL=gpt-4o-mini-transcribe
OPENAI_TTS_MODEL=gpt-4o-mini-tts
OPENAI_TTS_VOICE=alloy
PORT=3000
```

OpenAI's current model catalog includes GPT-5.6 models for general work, GPT-Realtime models for voice, GPT-4o Mini TTS for speech synthesis, and GPT-4o Mini Transcribe for transcription.

## Run

```bash
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 3000
```

## Routes

- `GET /` — application
- `GET /health` — configuration health
- `GET /api/providers` — current OpenAI model configuration
- `POST /api/chat` — streaming OpenAI response
- `WS /ws/audio` — microphone audio → transcription → AI response → speech audio

## Security

- API keys remain server-side.
- The browser never receives the key.
- Markdown is sanitized before rendering.
- Before a public production launch, add authentication, rate limiting, persistent storage, abuse controls, monitoring and request quotas.

## Hosting

This app requires a Python/ASGI backend. GitHub Pages alone can only serve the static frontend and cannot run `main.py`. Deploy the repository to any host that supports Python/FastAPI and set `OPENAI_API_KEY` there as a secret.
