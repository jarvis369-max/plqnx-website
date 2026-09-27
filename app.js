const MODEL_LABELS = {
  "qwen-fast": "PLQNX Fast · Qwen 0.5B",
  "llama-1b": "PLQNX Plus · Llama 1B",
};

const els = {
  messages: document.getElementById("messages"),
  prompt: document.getElementById("prompt"),
  send: document.getElementById("sendBtn"),
  modelSelect: document.getElementById("modelSelect"),
  modelFoot: document.getElementById("modelFoot"),
  statusText: document.getElementById("statusText"),
  statusDot: document.getElementById("statusDot"),
  preview: document.getElementById("preview"),
  codeView: document.getElementById("codeView"),
  runView: document.getElementById("runView"),
  runFrame: document.getElementById("runFrame"),
  toast: document.getElementById("toast"),
};

let busy = false;
let history = safeJSON(localStorage.getItem("plqnxHistoryV5"), []);

function safeJSON(value, fallback) {
  try { return value ? JSON.parse(value) : fallback; }
  catch { return fallback; }
}

function saveHistory() {
  localStorage.setItem("plqnxHistoryV5", JSON.stringify(history.slice(-40)));
}

function selectedModel() {
  return els.modelSelect.value || "qwen-fast";
}

function setStatus(text, active = false) {
  els.statusText.textContent = text;
  els.statusDot.classList.toggle("busy", active);
}

function toast(message, ms = 3000) {
  els.toast.textContent = message;
  els.toast.classList.add("show");
  clearTimeout(window.__plqnxToast);
  window.__plqnxToast = setTimeout(() => els.toast.classList.remove("show"), ms);
}

function addMessage(role, text) {
  document.getElementById("emptyState")?.remove();

  const wrap = document.createElement("div");
  wrap.className = `msgwrap ${role}`;

  const bubble = document.createElement("div");
  bubble.className = `msg ${role}`;
  bubble.textContent = text;
  wrap.appendChild(bubble);

  els.messages.appendChild(wrap);
  els.messages.scrollTop = els.messages.scrollHeight;
  return { wrap, bubble };
}

function showTyping() {
  const item = addMessage("assistant", "");
  item.bubble.innerHTML = '<span class="typing"><i></i><i></i><i></i></span>';
  return item;
}

function renderOutput(markdown) {
  const text = markdown || "";

  if (window.marked && window.DOMPurify) {
    const html = DOMPurify.sanitize(marked.parse(text));
    els.preview.innerHTML = html || '<div class="rawempty">PLQNX output will appear here.</div>';
    if (window.Prism) {
      els.preview.querySelectorAll("pre code").forEach((block) => Prism.highlightElement(block));
    }
  } else {
    els.preview.textContent = text;
  }

  const codeBlocks = [...text.matchAll(/\`\`\`([\w+-]*)\n([\s\S]*?)\`\`\`/g)];
  els.codeView.textContent = codeBlocks.length
    ? codeBlocks.map((m, i) => {
        const title = codeBlocks.length > 1 ? `// Block ${i + 1} · ${m[1] || "text"}\n` : "";
        return title + m[2].trim();
      }).join("\n\n")
    : text;

  const htmlBlock = codeBlocks.find((m) => /^(html?|markup)$/i.test(m[1] || ""));
  els.runFrame.srcdoc = htmlBlock
    ? htmlBlock[2]
    : '<!doctype html><html><body style="font-family:system-ui;padding:32px;color:#68776f"><h3>No runnable HTML yet</h3><p>Ask PLQNX to create a complete HTML page and it will appear here.</p></body></html>';
}

async function streamChat(message, model, priorHistory, onChunk) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 180000);

  try {
    const response = await fetch("/api/chat/stream", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        message,
        model,
        history: priorHistory.slice(-12),
      }),
      signal: controller.signal,
    });

    if (!response.ok || !response.body) {
      let body = {};
      try { body = await response.json(); } catch {}
      throw new Error(body?.detail || `PLQNX returned ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let full = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      if (!chunk) continue;
      full += chunk;
      onChunk(full);
    }

    return full.trim();
  } finally {
    clearTimeout(timeout);
  }
}

async function runChat(rawMessage) {
  const message = rawMessage.trim();
  if (!message || busy) return;

  busy = true;
  els.send.disabled = true;
  els.prompt.value = "";
  els.prompt.style.height = "auto";

  addMessage("user", message);
  const priorHistory = history.slice(-12);
  history.push({ role: "user", content: message });
  saveHistory();

  const pending = showTyping();
  const model = selectedModel();
  const label = MODEL_LABELS[model] || "PLQNX";

  setStatus(`${label} · thinking`, true);

  try {
    let started = false;
    const full = await streamChat(message, model, priorHistory, (text) => {
      if (!started) {
        pending.bubble.textContent = "";
        started = true;
      }
      pending.bubble.textContent = text;
      renderOutput(text);
      els.messages.scrollTop = els.messages.scrollHeight;
    });

    if (!full) throw new Error("The model returned an empty response");

    history.push({ role: "assistant", content: full });
    saveHistory();

    const meta = document.createElement("div");
    meta.className = "msgmeta";
    meta.textContent = `${label} · server Ollama`;
    pending.wrap.appendChild(meta);
  } catch (error) {
    console.error(error);
    pending.bubble.textContent = "PLQNX could not generate a reply right now. Please retry.";
    toast(error?.name === "AbortError" ? "The response timed out." : "The text model is temporarily unavailable.", 4200);
  } finally {
    busy = false;
    els.send.disabled = false;
    setStatus(`${MODEL_LABELS[selectedModel()]} · ready`);
    els.prompt.focus();
  }
}

function switchTab(tabName) {
  document.querySelectorAll("[data-tab]").forEach((button) => {
    button.classList.toggle("active", button.dataset.tab === tabName);
  });
  els.preview.style.display = tabName === "preview" ? "block" : "none";
  els.codeView.classList.toggle("active", tabName === "code");
  els.runView.classList.toggle("active", tabName === "run");
}

function restoreHistory() {
  if (!history.length) return;
  document.getElementById("emptyState")?.remove();
  history.forEach((item) => addMessage(item.role, item.content));
  const last = [...history].reverse().find((item) => item.role === "assistant");
  if (last) renderOutput(last.content);
}

async function checkHealth() {
  try {
    const response = await fetch("/api/ai-health", { cache: "no-store" });
    const data = await response.json();
    if (response.ok && data.ready) {
      setStatus(`${MODEL_LABELS[selectedModel()]} · ready`);
      return true;
    }
  } catch {}
  setStatus("Models starting…", true);
  return false;
}

els.send.addEventListener("click", () => runChat(els.prompt.value));

els.prompt.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    runChat(els.prompt.value);
  }
});

els.prompt.addEventListener("input", () => {
  els.prompt.style.height = "auto";
  els.prompt.style.height = `${Math.min(els.prompt.scrollHeight, 150)}px`;
});

els.modelSelect.addEventListener("change", () => {
  const label = MODEL_LABELS[selectedModel()];
  els.modelFoot.textContent = `${label} · server model`;
  setStatus(`${label} · ready`);
});

document.querySelectorAll("[data-tab]").forEach((button) => {
  button.addEventListener("click", () => switchTab(button.dataset.tab));
});

restoreHistory();
renderOutput("");
els.modelFoot.textContent = `${MODEL_LABELS[selectedModel()]} · server model`;
setStatus(`${MODEL_LABELS[selectedModel()]} · ready`);
checkHealth().then((ok) => {
  if (!ok) {
    const poll = setInterval(async () => {
      if (await checkHealth()) clearInterval(poll);
    }, 3000);
    setTimeout(() => clearInterval(poll), 120000);
  }
});
els.prompt.focus();
