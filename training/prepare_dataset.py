import argparse
import json
from pathlib import Path

from datasets import concatenate_datasets, load_dataset

SYSTEM = (
    "You are PLQNX CORE, a practical multilingual AI assistant for coding, "
    "analysis, writing and everyday work. Respond in the user's language when "
    "clear. Be accurate, concise when possible, and explicit about uncertainty."
)

DEFAULT_LANGS = [
    "eng", "hin", "ben", "tam", "tel",
    "kan", "mar", "mal", "guj", "pan", "urd",
]


def parse_args():
    parser = argparse.ArgumentParser(
        description="Build a PLQNX multilingual SFT dataset from Aya + custom examples."
    )
    parser.add_argument(
        "--seed-file",
        default="training/data/plqnx_train.jsonl",
    )
    parser.add_argument(
        "--output",
        default="training/data/plqnx_mixed_train.jsonl",
    )
    parser.add_argument(
        "--per-language",
        type=int,
        default=100,
        help="Maximum Aya examples sampled per language.",
    )
    parser.add_argument(
        "--custom-repeat",
        type=int,
        default=8,
        help="Repeat the reviewed PLQNX seed examples to preserve product behavior.",
    )
    parser.add_argument(
        "--languages",
        nargs="+",
        default=DEFAULT_LANGS,
    )
    parser.add_argument("--seed", type=int, default=42)
    return parser.parse_args()


def load_seed(path):
    rows = []
    with open(path, "r", encoding="utf-8") as handle:
        for line in handle:
            line = line.strip()
            if line:
                rows.append(json.loads(line))
    return rows


def aya_to_example(row):
    return {
        "prompt": [
            {"role": "system", "content": SYSTEM},
            {"role": "user", "content": row["inputs"].strip()},
        ],
        "completion": [
            {"role": "assistant", "content": row["targets"].strip()},
        ],
    }


def main():
    args = parse_args()

    seed_rows = load_seed(args.seed_file)
    output_rows = seed_rows * max(1, args.custom_repeat)

    aya = load_dataset("CohereLabs/aya_dataset", split="train")

    counts = {}
    for code in args.languages:
        subset = aya.filter(lambda row: row["language_code"] == code)
        if len(subset) == 0:
            counts[code] = 0
            continue

        n = min(args.per_language, len(subset))
        subset = subset.shuffle(seed=args.seed).select(range(n))
        counts[code] = n

        for row in subset:
            inp = (row.get("inputs") or "").strip()
            tgt = (row.get("targets") or "").strip()
            if not inp or not tgt:
                continue
            output_rows.append(aya_to_example(row))

    # Deterministic shuffle without adding another dependency.
    import random

    random.Random(args.seed).shuffle(output_rows)

    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    with output.open("w", encoding="utf-8") as handle:
        for row in output_rows:
            handle.write(json.dumps(row, ensure_ascii=False) + "\n")

    print(f"Wrote {len(output_rows)} examples to {output}")
    print("Aya examples by language:", json.dumps(counts, indent=2))
    print(f"Custom seed examples: {len(seed_rows)} x {args.custom_repeat}")


if __name__ == "__main__":
    main()
