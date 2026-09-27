import json
import time
import urllib.error
import urllib.request

BASE = "http://127.0.0.1:11434"
DEFAULT_MODEL = "R4C3R/qwen2.5-0.5b-heretic"

def request_json(path, payload=None, timeout=10):
    data = None if payload is None else json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        BASE + path,
        data=data,
        headers={"Content-Type": "application/json"} if data else {},
        method="POST" if data else "GET",
    )
    with urllib.request.urlopen(req, timeout=timeout) as response:
        return json.loads(response.read().decode("utf-8"))

for attempt in range(90):
    try:
        request_json("/api/tags", timeout=2)
        break
    except Exception:
        if attempt == 89:
            raise
        time.sleep(1)

# Load the fast default model into memory before Railway marks the service ready.
request_json(
    "/api/chat",
    {
        "model": DEFAULT_MODEL,
        "messages": [{"role": "user", "content": "Reply with OK."}],
        "stream": False,
        "keep_alive": "30m",
        "options": {"num_predict": 2, "temperature": 0},
    },
    timeout=120,
)
print("PLQNX default Ollama model is warm.")
