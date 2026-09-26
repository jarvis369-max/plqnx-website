# PLQNX model fine-tuning

The first PLQNX training target is dheeyantra/dhee-nxtgen-qwen3-indic.

This is an Apache-2.0 Qwen3-4B derivative specialized for 14 Indic languages, including Hindi, Bengali, Tamil, Telugu, Malayalam, Gujarati, Kannada, Marathi, Odia, Punjabi, Assamese, Maithili, Sanskrit and Sindhi. PLQNX will fine-tune it further for coding, structured output, product behavior and multilingual assistant quality.

Why this model:
- 4B parameters is practical for a first QLoRA experiment.
- Apache-2.0 licensed.
- The selected base is already specialized for 14 Indic languages.
- It is already instruction-tuned, so we can specialize behavior instead of training from scratch.

Training method:
- supervised fine-tuning (SFT)
- 4-bit QLoRA
- LoRA rank 32
- target attention and MLP projection modules
- 2048 token context by default

The checked-in JSONL is only a reviewed seed set. Do not treat 12 examples as enough for a production model. Grow it to a few thousand high-quality examples and keep a separate held-out evaluation set.

Recommended dataset mix:
- 30% coding, debugging, APIs and full-stack work
- 20% analysis and writing
- 25% Indian-language conversations
- 10% JSON, Markdown and structured outputs
- 10% security, uncertainty and safe credential handling
- 5% concise everyday assistant tasks

Training commands:

1. Create a Python environment.
2. Install training dependencies from training/requirements.txt.
3. Run:

python training/train_qlora.py

The adapter will be written to:

artifacts/plqnx-indic-4b-lora

Evaluate with:

python training/evaluate.py --adapter artifacts/plqnx-indic-4b-lora

Before deployment, compare the fine-tuned adapter against the untouched base model on a frozen evaluation set. Check multilingual quality, coding correctness, JSON validity, hallucination rate, safety behavior and latency.

Production deployment direction:
- publish the LoRA adapter to a private model repository
- serve the Qwen3 base model plus the PLQNX adapter with vLLM on a GPU host
- expose an OpenAI-compatible endpoint
- point the PLQNX FastAPI backend at that endpoint
- keep the current browser WebLLM mode as an offline fallback

Do not expose a runtime LoRA-loading endpoint publicly. Load only the approved PLQNX adapter at service startup.
