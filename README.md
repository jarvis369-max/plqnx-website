# PLQNX CORE — Text-first local AI

PLQNX CORE now focuses on fast text chat first.

It uses the Ollama models already installed on the Windows machine:

- `R4C3R/qwen2.5-0.5b-heretic`
- `huihui_ai/llama3.2-abliterate:1b`

No browser model download is required. The website talks to the local Ollama service through the PLQNX FastAPI backend.

## Windows quick start

1. Install/open Ollama for Windows.
2. Confirm the models exist:

```powershell
ollama list
```

3. Clone or download this GitHub repository.
4. Double-click:

```text
RUN-PLQNX.bat
```

The launcher:

- verifies Ollama is available
- starts Ollama if necessary
- verifies both PLQNX models are installed
- creates a local Python virtual environment
- installs the FastAPI dependencies
- warms the Qwen model
- starts the local AI bridge at `http://127.0.0.1:3000`
- opens the public frontend at `https://jarvis369-max.github.io/plqnx-website/`

Keep the launcher window open while using PLQNX.

## Manual start

```powershell
ollama list
py -3 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
$env:OLLAMA_URL="http://127.0.0.1:11434"
.\.venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 3000
```

Then open:

```text
http://127.0.0.1:3000
```

## Text models

### PLQNX Fast
`R4C3R/qwen2.5-0.5b-heretic`

Used as the default lightweight model.

### PLQNX Plus
`huihui_ai/llama3.2-abliterate:1b`

Available from the model selector for the larger local option.

## Current focus

Version 5 focuses on:

- text chat
- streaming responses
- coding
- writing
- summarization
- multilingual conversation
- conversation history
- Markdown/code rendering
- model switching

Voice and vision are intentionally postponed until the text experience is stable.

## Public URL

`https://jarvis369-max.github.io/plqnx-website/`

The GitHub Pages frontend is public. To use the two models on your own Windows PC, run `RUN-PLQNX.bat` so the page can connect to the local PLQNX/Ollama bridge.

## Production deployment

The preferred low-cost production path is Oracle Cloud:

```text
GitHub Pages frontend
        ↓
Oracle Cloud VM
        ↓
Nginx + FastAPI
        ↓
Ollama
  ↙             ↘
Qwen 0.5B     Llama 1B
```

Deployment files are in:

```text
deploy/oracle/
```

Start with `deploy/oracle/README.md`.

The model weights stay on the Oracle VM, not in GitHub. Once the VM and HTTPS API are online, the GitHub Pages frontend can be pointed at that public backend so PLQNX works while the founder's PC is off.
