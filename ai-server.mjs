import http from "node:http";
import { pipeline, env } from "@huggingface/transformers";

const PORT = Number(process.env.AI_PORT || 9000);
const MODEL = "onnx-community/SmolLM2-135M-Instruct-ONNX-MHA";

env.allowRemoteModels = true;
env.allowLocalModels = true;
env.cacheDir = process.env.HF_CACHE_DIR || "/tmp/plqnx-hf-cache";

let ready = false;
let loadError = "";
let generator = null;

const SYSTEM = [
  "You are PLQNX CORE, a practical helpful AI assistant.",
  "Answer directly and clearly.",
  "Support coding, analysis, writing, and general questions.",
  "When the user provides attachment-derived context, use it carefully and do not claim more than it proves.",
  "Be concise unless detail is requested."
].join(" ");

async function loadModel() {
  try {
    console.log("[PLQNX AI] Loading", MODEL);
    generator = await pipeline("text-generation", MODEL, {
      dtype: "q4"
    });
    ready = true;
    console.log("[PLQNX AI] READY");
  } catch (error) {
    loadError = error?.stack || error?.message || String(error);
    console.error("[PLQNX AI] MODEL_LOAD_FAILED", loadError);
  }
}

const loading = loadModel();

function json(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(payload),
    "cache-control": "no-store"
  });
  res.end(payload);
}

async function readJson(req) {
  let body = "";
  for await (const chunk of req) {
    body += chunk;
    if (body.length > 2_000_000) throw new Error("Request too large");
  }
  return body ? JSON.parse(body) : {};
}

function normalizeHistory(history) {
  if (!Array.isArray(history)) return [];
  return history
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .slice(-10)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 12000) }));
}

async function generateReply(body) {
  await loading;
  if (!ready || !generator) {
    throw new Error(loadError || "AI model is not ready");
  }

  const message = String(body?.message || "").trim();
  if (!message) throw new Error("Message is required");

  const messages = [
    { role: "system", content: SYSTEM },
    ...normalizeHistory(body?.history),
    { role: "user", content: message.slice(0, 24000) }
  ];

  const result = await generator(messages, {
    max_new_tokens: 320,
    do_sample: false,
    repetition_penalty: 1.05
  });

  const generated = result?.[0]?.generated_text;
  if (Array.isArray(generated)) {
    const last = generated.at(-1);
    if (last?.content) return String(last.content).trim();
  }

  if (typeof generated === "string") {
    return generated.trim();
  }

  throw new Error("Model returned no text");
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", "http://127.0.0.1");

  if (req.method === "GET" && url.pathname === "/health") {
    return json(res, ready ? 200 : 503, {
      ok: ready,
      ready,
      model: MODEL,
      error: loadError ? "model_load_failed" : null
    });
  }

  if (req.method === "POST" && url.pathname === "/generate") {
    try {
      const body = await readJson(req);
      const text = await generateReply(body);
      return json(res, 200, { text, model: MODEL });
    } catch (error) {
      console.error("[PLQNX AI] GENERATE_FAILED", error?.message || error);
      return json(res, 503, {
        error: "AI service unavailable",
        detail: error?.message || String(error)
      });
    }
  }

  return json(res, 404, { error: "Not found" });
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`[PLQNX AI] listening on 127.0.0.1:${PORT}`);
});
