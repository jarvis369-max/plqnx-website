import argparse
import json
from pathlib import Path

import torch
from peft import PeftModel
from transformers import AutoModelForCausalLM, AutoTokenizer

DEFAULT_MODEL = "Qwen/Qwen3-4B-Instruct-2507"

PROMPTS = [
    "Explain a Python FastAPI WebSocket bug where a client disconnect is not handled.",
    "Write a concise TypeScript function that validates an email address without claiming perfect RFC validation.",
    "हिंदी में समझाइए: REST API और WebSocket में क्या अंतर है?",
    "తెలుగులో చెప్పండి: AI hallucination అంటే ఏమిటి, దాన్ని ఎలా తగ్గించాలి?",
    "தமிழில் இரண்டு எண்களின் GCD கண்டுபிடிக்கும் Python function-ஐ விளக்குங்கள்.",
    "ಕನ್ನಡದಲ್ಲಿ ವಿವರಿಸಿ: API key ಅನ್ನು frontend JavaScript ನಲ್ಲಿ ಏಕೆ ಇಡಬಾರದು?",
    "Return valid JSON with keys summary, risks and next_steps for deploying an AI API.",
]


def generate(model, tokenizer, prompt):
    messages = [
        {"role": "system", "content": "You are PLQNX CORE, a concise multilingual technical assistant."},
        {"role": "user", "content": prompt},
    ]
    text = tokenizer.apply_chat_template(
        messages,
        tokenize=False,
        add_generation_prompt=True,
    )
    inputs = tokenizer(text, return_tensors="pt").to(model.device)
    with torch.no_grad():
        output = model.generate(
            **inputs,
            max_new_tokens=320,
            do_sample=False,
        )
    generated = output[0][inputs["input_ids"].shape[1]:]
    return tokenizer.decode(generated, skip_special_tokens=True).strip()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-model", default=DEFAULT_MODEL)
    parser.add_argument("--adapter", required=True)
    parser.add_argument("--output", default="artifacts/eval_comparison.json")
    args = parser.parse_args()

    tokenizer = AutoTokenizer.from_pretrained(args.base_model, use_fast=True)
    base_model = AutoModelForCausalLM.from_pretrained(
        args.base_model,
        device_map="auto",
        torch_dtype="auto",
    )
    tuned_model = PeftModel.from_pretrained(base_model, args.adapter)
    tuned_model.eval()

    results = []
    for prompt in PROMPTS:
        results.append({
            "prompt": prompt,
            "fine_tuned": generate(tuned_model, tokenizer, prompt),
        })

    out = Path(args.output)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(
        json.dumps(results, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(f"Wrote {out}")


if __name__ == "__main__":
    main()
