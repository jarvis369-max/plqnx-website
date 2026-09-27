from pathlib import Path
import stat
import tarfile
import urllib.request

import zstandard as zstd

ROOT = Path(__file__).resolve().parent
DEST = ROOT / ".ollama-runtime"
ARCHIVE_URL = "https://ollama.com/download/ollama-linux-amd64.tar.zst"

DEST.mkdir(parents=True, exist_ok=True)
ollama_bin = DEST / "bin" / "ollama"
if ollama_bin.exists():
    print(f"Ollama already installed at {ollama_bin}")
    raise SystemExit(0)

print("Downloading Ollama runtime...")
with urllib.request.urlopen(ARCHIVE_URL, timeout=300) as response:
    dctx = zstd.ZstdDecompressor()
    with dctx.stream_reader(response) as reader:
        with tarfile.open(fileobj=reader, mode="r|") as tar:
            tar.extractall(DEST)

if not ollama_bin.exists():
    raise RuntimeError(f"Ollama binary not found after extraction: {ollama_bin}")

mode = ollama_bin.stat().st_mode
ollama_bin.chmod(mode | stat.S_IXUSR | stat.S_IXGRP | stat.S_IXOTH)
print(f"Installed Ollama at {ollama_bin}")
