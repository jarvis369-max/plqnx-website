# PLQNX CORE — Real-time Multimodal AI

PLQNX CORE is now a focused full-stack multimodal AI web application. The previous receivables product pages and unrelated concepts are removed from the active product direction.

## What this project does

- Text-to-text AI chat with streaming responses
- Voice-to-text through the browser microphone
- Voice-to-voice over a WebSocket turn pipeline
- Text-to-voice using OpenAI speech synthesis
- Dynamic provider routing:
  - technical and coding prompts → Anthropic Claude when configured
  - general writing, analysis and content → OpenAI
  - voice interactions → low-latency OpenAI model
- Multilingual text support, including English, Hindi, Tamil, Telugu, Kannada, Marathi and Bengali
- Split-screen workspace:
  - left: chat, history, microphone, live status
  - right: rendered Markdown and syntax-highlighted code
- Replit-ready FastAPI backend

## Project structure

```text
.
├── main.py
├── index.html
├── requirements.txt
├── .replit
└── README.md
```

## Replit setup

1. Import this GitHub repository into Replit.
2. Open **Tools → Secrets**.
3. Add the provider keys you intend to use:

```text
OPENAI_API_KEY=...
ANTHROPIC_API_KEY=...
VAPI_API_KEY=...
ROOMI_AI_KEY=...
```

Only `OPENAI_API_KEY` is required for the complete text + voice experience. Anthropic is optional; when absent, coding requests fall back to OpenAI.

The application reads secrets from environment variables. Do not hard-code keys into source files.

### Optional model overrides

You can also add:

```text
OPENAI_TEXT_MODEL=gpt-4o
OPENAI_FAST_MODEL=gpt-4o-mini
OPENAI_STT_MODEL=gpt-4o-mini-transcribe
OPENAI_TTS_MODEL=gpt-4o-mini-tts
OPENAI_TTS_VOICE=alloy
ANTHROPIC_MODEL=claude-3-5-sonnet-latest
PORT=3000
```

If a provider deprecates a model alias, update the corresponding environment variable without changing application code.

## Install and run

Replit normally installs from `requirements.txt` automatically. To run manually:

```bash
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 3000
```

Open the Replit web preview. The same origin serves both the frontend and backend.

## API routes

- `GET /` — application UI
- `GET /health` — provider/configuration health
- `GET /api/providers` — configured model/provider information
- `POST /api/chat` — NDJSON streaming text responses
- `WS /ws/audio` — streamed microphone chunks → transcription → AI response → speech audio

## Voice WebSocket protocol

Client → server:

```json
{"type":"start","language":"auto","mode":"voice"}
```

Then send browser `MediaRecorder` WebM chunks as binary frames.

Finish the turn with:

```json
{"type":"stop"}
```

Server events include:

- `ready`
- `recording`
- `audio_ack`
- `processing`
- `transcript`
- `assistant_text`
- `assistant_audio`
- `done`
- `error`

## Vapi and Roomi

`VAPI_API_KEY` and `ROOMI_AI_KEY` are loaded securely and reported through `/api/providers`. The working in-app voice path uses OpenAI STT + low-latency chat + TTS. This avoids inventing undocumented third-party endpoints. If you standardize on Vapi/Retell or a specific Roomi API contract, add its adapter behind the same WebSocket protocol.

## Security notes

- Keep all provider credentials in Replit Secrets.
- The browser never receives API keys.
- Markdown output is sanitized with DOMPurify before rendering.
- The current app does not include user authentication or account isolation. Add authenticated sessions, rate limiting, persistent conversation storage, observability and abuse controls before opening a public production deployment.
- Browser chat history is stored locally in `localStorage`.

## Deployment

For a Replit Deployment, keep the deployment command:

```bash
uvicorn main:app --host 0.0.0.0 --port 3000
```

The previous GitHub Pages-only static deployment cannot run the FastAPI backend. Use Replit Deployment for the real multimodal application.
