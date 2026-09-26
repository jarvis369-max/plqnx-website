# PLQNX CORE — Multimodal browser AI

PLQNX CORE is a browser-first multimodal AI workspace designed so users can actually use the AI without requiring a paid model API key.

## Live architecture

Railway serves the application shell. AI inference runs primarily in the visitor's browser:

- **Text + code:** MLC WebLLM with instant background startup
  - Instant default: SmolLM2 360M
  - Balanced manual upgrade: Qwen2.5 1.5B
  - Pro manual upgrade: Qwen2.5 3B
- The interface renders immediately; model warm-up no longer blocks the whole screen.
- A prompt entered during warm-up is queued and runs automatically when the model is ready.
- **Images:** Transformers.js image captioning, then the text model reasons over the extracted image context
- **OCR:** optional printed-text extraction for screenshots/documents
- **Speech-to-text:** multilingual Whisper Tiny through Transformers.js
- **Speech output:** browser speech synthesis
- **Documents:** local PDF and text extraction
- **Code canvas:** Markdown rendering, syntax highlighting and sandboxed HTML execution
- **Caching:** browser/model caches plus a service worker for the application shell

No OpenAI, Anthropic, Vapi or Roomi API key is required by the deployed app.

## Why browser-first

The connected Hugging Face account currently cannot start paid GPU Jobs without compute credit, so production GPU fine-tuned inference is not available at zero cost. Browser WebGPU lets PLQNX remain usable immediately while the fine-tuning assets are prepared.

## Fine-tuning pipeline

The repository also includes a QLoRA training pipeline under `training/` targeting:

`dheeyantra/dhee-nxtgen-qwen3-indic`

Files include:

- `training/train_qlora.py`
- `training/prepare_dataset.py`
- `training/evaluate.py`
- `training/data/plqnx_train.jsonl`
- `training/PLQNX_Finetune_Colab.ipynb`

The training data mixer uses multilingual examples plus PLQNX-specific reviewed behavior examples. The current dataset is a pipeline seed, not yet a production-quality training corpus.

## Run locally

```bash
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 3000
```

Then open `http://localhost:3000`.

A recent Chromium browser with WebGPU provides the best experience.

## Production roadmap

1. Keep the browser runtime as the free/private fallback.
2. Expand the reviewed fine-tuning and evaluation datasets.
3. Train the QLoRA adapter on online GPU compute.
4. Host the approved fine-tuned adapter behind vLLM.
5. Add authenticated server routing so capable devices can choose local inference while heavier requests use hosted inference.
6. Add persistent user accounts, encrypted conversation sync, rate limits and production observability.

## Security

- No model provider API key is shipped to the browser.
- Attached files are processed locally by default.
- Generated HTML runs in a sandboxed iframe.
- Conversation history is stored in browser localStorage.
