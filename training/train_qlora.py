import argparse
import json
from pathlib import Path

import torch
from datasets import load_dataset
from peft import LoraConfig
from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig
from trl import SFTConfig, SFTTrainer

DEFAULT_MODEL = "dheeyantra/dhee-nxtgen-qwen3-indic"


def parse_args():
    parser = argparse.ArgumentParser(description="QLoRA fine-tuning for PLQNX CORE")
    parser.add_argument("--model", default=DEFAULT_MODEL)
    parser.add_argument("--train-file", default="training/data/plqnx_train.jsonl")
    parser.add_argument("--output-dir", default="artifacts/plqnx-indic-4b-lora")
    parser.add_argument("--epochs", type=float, default=2.0)
    parser.add_argument("--learning-rate", type=float, default=1e-4)
    parser.add_argument("--max-length", type=int, default=2048)
    parser.add_argument("--eval-size", type=float, default=0.08)
    parser.add_argument(
        "--hub-repo",
        default="",
        help="Optional Hugging Face repo id, e.g. username/plqnx-indic-4b-lora",
    )
    parser.add_argument(
        "--public-hub-repo",
        action="store_true",
        help="Make the uploaded adapter public. Default is private.",
    )
    return parser.parse_args()


def main():
    args = parse_args()
    if not torch.cuda.is_available():
        raise SystemExit("A CUDA GPU is required for this QLoRA training script.")

    use_bf16 = torch.cuda.is_bf16_supported()
    compute_dtype = torch.bfloat16 if use_bf16 else torch.float16

    quant_config = BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_quant_type="nf4",
        bnb_4bit_use_double_quant=True,
        bnb_4bit_compute_dtype=compute_dtype,
    )

    tokenizer = AutoTokenizer.from_pretrained(args.model, use_fast=True)
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token

    model = AutoModelForCausalLM.from_pretrained(
        args.model,
        quantization_config=quant_config,
        device_map="auto",
        torch_dtype=compute_dtype,
    )
    model.config.use_cache = False

    dataset = load_dataset("json", data_files=args.train_file, split="train")
    split = dataset.train_test_split(test_size=args.eval_size, seed=42)

    peft_config = LoraConfig(
        r=32,
        lora_alpha=64,
        lora_dropout=0.05,
        bias="none",
        task_type="CAUSAL_LM",
        target_modules=[
            "q_proj", "k_proj", "v_proj", "o_proj",
            "gate_proj", "up_proj", "down_proj",
        ],
    )

    training_args = SFTConfig(
        output_dir=args.output_dir,
        num_train_epochs=args.epochs,
        per_device_train_batch_size=1,
        per_device_eval_batch_size=1,
        gradient_accumulation_steps=16,
        learning_rate=args.learning_rate,
        lr_scheduler_type="cosine",
        warmup_ratio=0.03,
        max_length=args.max_length,
        gradient_checkpointing=True,
        bf16=use_bf16,
        fp16=not use_bf16,
        logging_steps=5,
        eval_strategy="steps",
        eval_steps=50,
        save_strategy="steps",
        save_steps=50,
        save_total_limit=2,
        report_to="none",
        seed=42,
    )

    trainer = SFTTrainer(
        model=model,
        args=training_args,
        train_dataset=split["train"],
        eval_dataset=split["test"],
        processing_class=tokenizer,
        peft_config=peft_config,
    )

    trainer.train()
    trainer.save_model(args.output_dir)
    tokenizer.save_pretrained(args.output_dir)

    metadata = {
        "base_model": args.model,
        "adapter_path": args.output_dir,
        "train_file": args.train_file,
        "epochs": args.epochs,
        "learning_rate": args.learning_rate,
        "max_length": args.max_length,
        "method": "QLoRA 4-bit NF4",
    }
    Path(args.output_dir).mkdir(parents=True, exist_ok=True)
    Path(args.output_dir, "plqnx_training.json").write_text(
        json.dumps(metadata, indent=2), encoding="utf-8"
    )
    print(f"Saved PLQNX LoRA adapter to {args.output_dir}")

    if args.hub_repo:
        from huggingface_hub import HfApi

        api = HfApi()
        api.create_repo(
            repo_id=args.hub_repo,
            repo_type="model",
            private=not args.public_hub_repo,
            exist_ok=True,
        )
        api.upload_folder(
            repo_id=args.hub_repo,
            repo_type="model",
            folder_path=args.output_dir,
            commit_message="Upload PLQNX QLoRA adapter",
        )
        print(f"Uploaded adapter to https://huggingface.co/{args.hub_repo}")


if __name__ == "__main__":
    main()
