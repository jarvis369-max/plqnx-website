import * as webllm from "https://esm.run/@mlc-ai/web-llm";
import { pipeline, env } from "https://esm.run/@huggingface/transformers";

env.allowLocalModels = false;
env.useBrowserCache = true;

const MODELS = {
  lite: {
    id: "SmolLM2-360M-Instruct-q4f16_1-MLC",
    label: "Instant · SmolLM2 360M",
    approx: "small quick-start model",
  },
  balanced: {
    id: "Qwen2.5-1.5B-Instruct-q4f16_1-MLC",
    label: "Qwen 2.5 · 1.5B",
    approx: "≈1.6 GB",
  },
  pro: {
    id: "Qwen2.5-3B-Instruct-q4f16_1-MLC",
    label: "Qwen 2.5 · 3B",
    approx: "≈2.5 GB",
  },
};

const SYSTEM = `You are PLQNX CORE, a practical multimodal AI assistant.
You can receive text plus extracted context from images and files.
Be accurate and useful. Clearly distinguish what came from an attachment from what you infer.
Respond in the user's language when clear, including English and Indian languages.
For coding tasks, provide complete runnable code when useful and explain material assumptions.
When HTML is requested, prefer a complete HTML code block so the output canvas can render it.
Do not claim you directly saw an image when the supplied context is only a caption or OCR extraction.
Be concise unless the user asks for detail.`;

const els = {
  loader: document.getElementById("loader"),
  loadCopy: document.getElementById("loadCopy"),
  loadBar: document.getElementById("loadBar"),
  loadNote: document.getElementById("loadNote"),
  messages: document.getElementById("messages"),
  prompt: document.getElementById("prompt"),
  send: document.getElementById("sendBtn"),
  attach: document.getElementById("attachBtn"),
  fileInput: document.getElementById("fileInput"),
  attachments: document.getElementById("attachments"),
  mic: document.getElementById("micBtn"),
  wave: document.getElementById("wave"),
  voiceReply: document.getElementById("voiceReply"),
  modelSelect: document.getElementById("modelSelect"),
  modelFoot: document.getElementById("modelFoot"),
  statusText: document.getElementById("statusText"),
  statusDot: document.getElementById("statusDot"),
  preview: document.getElementById("preview"),
  codeView: document.getElementById("codeView"),
  runView: document.getElementById("runView"),
  runFrame: document.getElementById("runFrame"),
  contextView: document.getElementById("contextView"),
  privacyPill: document.getElementById("privacyPill"),
  toast: document.getElementById("toast"),
  dropMask: document.getElementById("dropMask"),
};

let engine = null;
let currentTier = null;
let busy = false;
let attachments = [];
let lastContexts = [];
let history = safeJSON(localStorage.getItem("plqnxHistoryV4"), []);
let captioner = null;
let ocrReader = null;
let transcriber = null;
let mediaRecorder = null;
let audioChunks = [];
let mediaStream = null;
let recording = false;
let queuedMessage = "";

function safeJSON(value, fallback) {
  try { return value ? JSON.parse(value) : fallback; }
  catch { return fallback; }
}

function setStatus(text, active = false) {
  els.statusText.textContent = text;
  els.statusDot.classList.toggle("busy", active);
}

function toast(message, ms = 2800) {
  els.toast.textContent = message;
  els.toast.classList.add("show");
  clearTimeout(window.__plqnxToast);
  window.__plqnxToast = setTimeout(() => els.toast.classList.remove("show"), ms);
}

function saveHistory() {
  localStorage.setItem("plqnxHistoryV4", JSON.stringify(history.slice(-36)));
}

function chooseAutoTier() {
  // Always boot the smallest supported model first so the app becomes usable fast.
  // Users can manually switch to Balanced or Pro after startup.
  return "lite";
}

function selectedTier() {
  return els.modelSelect.value === "auto" ? chooseAutoTier() : els.modelSelect.value;
}

function tierDescription(tier) {
  const item = MODELS[tier] || MODELS.lite;
  return `${item.label} · ${item.approx}`;
}

function escapeText(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function addMessage(role, text, options = {}) {
  document.getElementById("emptyState")?.remove();

  const wrap = document.createElement("div");
  wrap.className = `msgwrap ${role}`;

  if (options.attachments?.length) {
    const thumbs = document.createElement("div");
    thumbs.className = "thumbrow";
    for (const item of options.attachments) {
      if (item.kind === "image") {
        const img = document.createElement("img");
        img.className = "msgthumb";
        img.src = item.url;
        img.alt = item.name;
        thumbs.appendChild(img);
      } else {
        const badge = document.createElement("span");
        badge.className = "filebadge";
        badge.textContent = item.name;
        thumbs.appendChild(badge);
      }
    }
    wrap.appendChild(thumbs);
  }

  const bubble = document.createElement("div");
  bubble.className = `msg ${role}`;
  bubble.textContent = text;
  wrap.appendChild(bubble);

  if (options.meta) {
    const meta = document.createElement("div");
    meta.className = "msgmeta";
    meta.textContent = options.meta;
    wrap.appendChild(meta);
  }

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
  const cleanMarkdown = markdown || "";
  const html = DOMPurify.sanitize(marked.parse(cleanMarkdown));
  els.preview.innerHTML = html || '<div class="rawempty">PLQNX output will appear here.</div>';
  els.preview.querySelectorAll("pre code").forEach((block) => Prism.highlightElement(block));

  const codeBlocks = [...cleanMarkdown.matchAll(/```([\w+-]*)\n([\s\S]*?)```/g)];
  els.codeView.textContent = codeBlocks.length
    ? codeBlocks.map((m, i) => {
        const title = codeBlocks.length > 1 ? `// Block ${i + 1} · ${m[1] || "text"}\n` : "";
        return title + m[2].trim();
      }).join("\n\n")
    : cleanMarkdown;

  const htmlBlock = codeBlocks.find((m) => /^(html?|markup)$/i.test(m[1] || ""));
  if (htmlBlock) {
    els.runFrame.srcdoc = htmlBlock[2];
  } else {
    els.runFrame.srcdoc = `<!doctype html><html><body style="font-family:system-ui;padding:32px;color:#68776f"><h3>No runnable HTML yet</h3><p>Ask PLQNX to create a complete HTML page and it will appear here.</p></body></html>`;
  }
}

function renderContexts(contexts = lastContexts) {
  lastContexts = contexts;
  if (!contexts.length) {
    els.contextView.innerHTML = '<div class="rawempty">Image analysis and extracted document text will appear here.</div>';
    return;
  }
  els.contextView.innerHTML = "";
  for (const item of contexts) {
    const card = document.createElement("div");
    card.className = "contextitem";
    const title = document.createElement("b");
    title.textContent = item.title;
    const text = document.createElement("p");
    text.textContent = item.text;
    card.append(title, text);
    els.contextView.appendChild(card);
  }
}

function renderAttachments() {
  els.attachments.innerHTML = "";
  els.attachments.classList.toggle("hidden", attachments.length === 0);

  attachments.forEach((item, index) => {
    const chip = document.createElement("div");
    chip.className = "attachment";

    if (item.kind === "image") {
      const img = document.createElement("img");
      img.src = item.url;
      img.alt = item.name;
      chip.appendChild(img);
    }

    const name = document.createElement("span");
    name.textContent = item.name;
    chip.appendChild(name);

    const remove = document.createElement("button");
    remove.type = "button";
    remove.textContent = "×";
    remove.title = "Remove attachment";
    remove.addEventListener("click", () => {
      const [removed] = attachments.splice(index, 1);
      if (removed?.url?.startsWith("blob:")) URL.revokeObjectURL(removed.url);
      renderAttachments();
    });
    chip.appendChild(remove);
    els.attachments.appendChild(chip);
  });
}

async function loadTextModel(forceTier = selectedTier()) {
  if (!("gpu" in navigator)) {
    els.loadCopy.textContent = "This browser does not expose WebGPU.";
    els.loadNote.textContent = "Use a recent Chrome or Edge build. Vision and file extraction can still work, but local chat needs WebGPU.";
    setStatus("WebGPU unavailable");
    els.loader.classList.add("hide");
    return;
  }

  const tier = forceTier;
  const model = MODELS[tier];
  if (engine && currentTier === tier) return;

  currentTier = tier;
  setStatus(`Loading ${model.label}`, true);
  els.modelFoot.textContent = `Loading ${tierDescription(tier)}`;

  if (!engine) {
    // Keep the workspace visible while the model downloads in the background.
    els.loader.classList.add("hide");
    els.loadCopy.textContent = `Loading ${model.label}…`;
    els.loadNote.textContent = "The app is ready to use; your first prompt will run as soon as the local model is warm.";
  }

  try {
    if (engine && typeof engine.unload === "function") {
      await engine.unload();
    }

    engine = await webllm.CreateMLCEngine(model.id, {
      initProgressCallback: (report) => {
        const progress = Math.max(0, Math.min(1, Number(report.progress || 0)));
        els.loadBar.style.width = `${Math.round(progress * 100)}%`;
        els.loadCopy.textContent = report.text || `Loading ${model.label}…`;
        els.modelFoot.textContent = `Warming AI · ${Math.round(progress * 100)}%`;
        setStatus(`Warming AI · ${Math.round(progress * 100)}%`, true);
      },
    });

    els.loadBar.style.width = "100%";
    els.loadCopy.textContent = "PLQNX is ready";
    els.modelFoot.textContent = `${model.label} · local WebGPU`;
    setStatus(`${model.label} · ready`);
    els.loader.classList.add("hide");

    if (queuedMessage) {
      const next = queuedMessage;
      queuedMessage = "";
      queueMicrotask(() => runChat(next));
    }
  } catch (error) {
    console.error(error);

    if (tier !== "lite") {
      toast(`${model.label} could not load. Falling back to Lite.`, 3600);
      currentTier = null;
      return loadTextModel("lite");
    }

    engine = null;
    currentTier = null;
    els.loadCopy.textContent = "The local text model could not start.";
    els.loadNote.textContent = error?.message || "Try refreshing in Chrome or Edge with WebGPU enabled.";
    setStatus("Text model unavailable");
    setTimeout(() => els.loader.classList.add("hide"), 1200);
  }
}

async function ensureCaptioner() {
  if (captioner) return captioner;
  setStatus("Loading vision model…", true);
  els.modelFoot.textContent = "Loading local image captioner…";

  try {
    captioner = await pipeline(
      "image-to-text",
      "Xenova/vit-gpt2-image-captioning",
      { device: "webgpu" }
    );
  } catch {
    captioner = await pipeline(
      "image-to-text",
      "Xenova/vit-gpt2-image-captioning"
    );
  }

  setStatus(`${MODELS[currentTier || "lite"].label} · ready`);
  els.modelFoot.textContent = `${MODELS[currentTier || "lite"].label} · vision ready`;
  return captioner;
}

async function ensureOCR() {
  if (ocrReader) return ocrReader;
  setStatus("Loading OCR model…", true);
  try {
    ocrReader = await pipeline("image-to-text", "Xenova/trocr-small-printed");
  } finally {
    setStatus(`${MODELS[currentTier || "lite"].label} · ready`);
  }
  return ocrReader;
}

async function ensureTranscriber() {
  if (transcriber) return transcriber;
  setStatus("Loading Whisper…", true);
  els.modelFoot.textContent = "Loading local speech recognition…";

  try {
    transcriber = await pipeline(
      "automatic-speech-recognition",
      "onnx-community/whisper-tiny",
      { device: "webgpu" }
    );
  } catch {
    transcriber = await pipeline(
      "automatic-speech-recognition",
      "onnx-community/whisper-tiny"
    );
  }

  setStatus(`${MODELS[currentTier || "lite"].label} · ready`);
  els.modelFoot.textContent = `${MODELS[currentTier || "lite"].label} · Whisper ready`;
  return transcriber;
}

async function extractPdf(file) {
  const pdfjs = await import("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs";
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: buffer }).promise;
  const pages = [];
  const maxPages = Math.min(pdf.numPages, 30);

  for (let i = 1; i <= maxPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const text = content.items.map((x) => x.str).join(" ").trim();
    if (text) pages.push(`[Page ${i}] ${text}`);
    if (pages.join("\n").length > 50000) break;
  }

  return pages.join("\n").slice(0, 50000);
}

async function addFiles(fileList) {
  const files = [...fileList];
  for (const file of files) {
    if (attachments.length >= 8) {
      toast("Up to 8 attachments per message.");
      break;
    }

    if (file.type.startsWith("image/")) {
      attachments.push({
        kind: "image",
        name: file.name,
        file,
        url: URL.createObjectURL(file),
      });
      continue;
    }

    if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
      attachments.push({
        kind: "pdf",
        name: file.name,
        file,
      });
      continue;
    }

    const text = await file.text();
    attachments.push({
      kind: "text",
      name: file.name,
      file,
      text: text.slice(0, 50000),
    });
  }
  renderAttachments();
}

function wantsOCR(message) {
  return /\b(ocr|read (the )?text|extract text|document text|screenshot text|scan|invoice|receipt|letter)\b/i.test(message);
}

async function analyzeAttachments(userMessage, currentAttachments) {
  const contexts = [];

  for (const item of currentAttachments) {
    if (item.kind === "text") {
      contexts.push({
        title: `File · ${item.name}`,
        text: item.text.slice(0, 24000),
      });
      continue;
    }

    if (item.kind === "pdf") {
      setStatus(`Reading ${item.name}…`, true);
      try {
        const text = await extractPdf(item.file);
        contexts.push({
          title: `PDF · ${item.name}`,
          text: text || "No extractable text was found in this PDF.",
        });
      } catch (error) {
        contexts.push({
          title: `PDF · ${item.name}`,
          text: `PDF extraction failed: ${error?.message || String(error)}`,
        });
      }
      continue;
    }

    if (item.kind === "image") {
      setStatus(`Analyzing ${item.name}…`, true);
      try {
        const vision = await ensureCaptioner();
        const result = await vision(item.url, { max_new_tokens: 80 });
        const caption = result?.[0]?.generated_text || "Image caption unavailable.";
        let text = `Image caption: ${caption}`;

        if (wantsOCR(userMessage)) {
          try {
            const ocr = await ensureOCR();
            const ocrResult = await ocr(item.url, { max_new_tokens: 120 });
            const extracted = ocrResult?.[0]?.generated_text;
            if (extracted) text += `\nOCR text: ${extracted}`;
          } catch (error) {
            text += `\nOCR could not run: ${error?.message || String(error)}`;
          }
        }

        contexts.push({
          title: `Image · ${item.name}`,
          text,
        });
      } catch (error) {
        contexts.push({
          title: `Image · ${item.name}`,
          text: `Image analysis failed: ${error?.message || String(error)}`,
        });
      }
    }
  }

  setStatus(engine ? `${MODELS[currentTier || "lite"].label} · ready` : "Ready");
  renderContexts(contexts);
  return contexts;
}

function composePrompt(message, contexts) {
  if (!contexts.length) return message;
  const contextText = contexts.map((item, i) => {
    return `[Attachment ${i + 1}: ${item.title}]\n${item.text}`;
  }).join("\n\n");

  return `${message}\n\nUse the following attachment-derived context when relevant. Do not overstate what the attachment analysis proves.\n\n${contextText}`;
}

async function runChat(rawMessage) {
  const message = rawMessage.trim();
  if (!message || busy) return;
  if (!engine) {
    queuedMessage = message;
    els.prompt.value = "";
    els.prompt.style.height = "auto";
    toast("AI is warming up — your message is queued and will run automatically.", 3600);
    return;
  }

  busy = true;
  els.send.disabled = true;
  els.attach.disabled = true;
  els.mic.disabled = true;

  const sentAttachments = attachments;
  attachments = [];
  renderAttachments();

  els.prompt.value = "";
  els.prompt.style.height = "auto";

  addMessage("user", message, { attachments: sentAttachments });
  history.push({ role: "user", content: message });
  saveHistory();

  const contexts = await analyzeAttachments(message, sentAttachments);
  const effectivePrompt = composePrompt(message, contexts);

  const pending = showTyping();
  let full = "";
  setStatus("Thinking…", true);

  try {
    const modelHistory = history.slice(-14).map((item) => ({
      role: item.role,
      content: item.content,
    }));

    if (contexts.length) {
      modelHistory[modelHistory.length - 1] = {
        role: "user",
        content: effectivePrompt,
      };
    }

    const stream = await engine.chat.completions.create({
      messages: [
        { role: "system", content: SYSTEM },
        ...modelHistory,
      ],
      temperature: 0.65,
      top_p: 0.9,
      max_tokens: 1100,
      stream: true,
    });

    pending.bubble.textContent = "";

    for await (const chunk of stream) {
      const delta = chunk.choices?.[0]?.delta?.content || "";
      if (!delta) continue;
      full += delta;
      pending.bubble.textContent = full;
      renderOutput(full);
      els.messages.scrollTop = els.messages.scrollHeight;
    }

    history.push({ role: "assistant", content: full });
    saveHistory();

    const meta = document.createElement("div");
    meta.className = "msgmeta";
    meta.textContent = `${MODELS[currentTier].label} · local WebGPU${contexts.length ? " · attachment context" : ""}`;
    pending.wrap.appendChild(meta);

    if (els.voiceReply.checked && full) speak(full);
  } catch (error) {
    console.error(error);
    pending.bubble.textContent = `Error: ${error?.message || String(error)}`;
    toast("Generation failed. Try a shorter prompt or a smaller model.", 4200);
  } finally {
    busy = false;
    els.send.disabled = false;
    els.attach.disabled = false;
    els.mic.disabled = false;
    setStatus(`${MODELS[currentTier || "lite"].label} · ready`);
  }
}

function speak(text) {
  if (!("speechSynthesis" in window)) {
    toast("Speech output is not available in this browser.");
    return;
  }

  window.speechSynthesis.cancel();
  const cleaned = text
    .replace(/```[\s\S]*?```/g, " Code block omitted. ")
    .replace(/[`*_#>|]/g, " ")
    .slice(0, 4200);

  const utterance = new SpeechSynthesisUtterance(cleaned);
  utterance.rate = 1;
  utterance.pitch = 1;
  const locale = navigator.language || "en-IN";
  utterance.lang = locale;
  window.speechSynthesis.speak(utterance);
}

async function blobToMono16k(blob) {
  const arrayBuffer = await blob.arrayBuffer();
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  const audioContext = new AudioCtx();
  const decoded = await audioContext.decodeAudioData(arrayBuffer.slice(0));

  const offline = new OfflineAudioContext(
    1,
    Math.ceil(decoded.duration * 16000),
    16000
  );
  const source = offline.createBufferSource();
  source.buffer = decoded;
  source.connect(offline.destination);
  source.start(0);
  const rendered = await offline.startRendering();
  await audioContext.close();

  return rendered.getChannelData(0);
}

async function startRecording() {
  if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
    toast("Microphone recording is not supported in this browser.");
    return;
  }

  mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  audioChunks = [];

  const preferred = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
  ].find((type) => MediaRecorder.isTypeSupported(type));

  mediaRecorder = preferred
    ? new MediaRecorder(mediaStream, { mimeType: preferred })
    : new MediaRecorder(mediaStream);

  mediaRecorder.ondataavailable = (event) => {
    if (event.data?.size) audioChunks.push(event.data);
  };

  mediaRecorder.onstop = transcribeRecording;
  mediaRecorder.start(250);
  recording = true;
  els.mic.classList.add("recording");
  els.wave.classList.remove("hidden");
  setStatus("Listening…", true);
  toast("Listening — tap the microphone again to transcribe.", 2200);
}

function stopRecording() {
  if (!recording || !mediaRecorder) return;
  recording = false;
  els.mic.classList.remove("recording");
  els.wave.classList.add("hidden");
  mediaRecorder.stop();
  mediaStream?.getTracks().forEach((track) => track.stop());
}

async function transcribeRecording() {
  if (!audioChunks.length) {
    setStatus(`${MODELS[currentTier || "lite"].label} · ready`);
    return;
  }

  setStatus("Transcribing locally…", true);

  try {
    const asr = await ensureTranscriber();
    const blob = new Blob(audioChunks, { type: mediaRecorder?.mimeType || "audio/webm" });
    const pcm = await blobToMono16k(blob);
    const result = await asr(pcm, {
      chunk_length_s: 30,
      stride_length_s: 5,
      task: "transcribe",
    });

    const text = (result?.text || "").trim();
    if (!text) {
      toast("No speech was detected.");
      return;
    }

    els.prompt.value = text;
    els.prompt.dispatchEvent(new Event("input"));

    if (els.voiceReply.checked) {
      await runChat(text);
    }
  } catch (error) {
    console.error(error);
    toast(`Voice transcription failed: ${error?.message || String(error)}`, 4200);
  } finally {
    setStatus(engine ? `${MODELS[currentTier || "lite"].label} · ready` : "Ready");
  }
}

function switchTab(tabName) {
  document.querySelectorAll("[data-tab]").forEach((button) => {
    button.classList.toggle("active", button.dataset.tab === tabName);
  });

  els.preview.style.display = tabName === "preview" ? "block" : "none";
  els.codeView.classList.toggle("active", tabName === "code");
  els.runView.classList.toggle("active", tabName === "run");
  els.contextView.classList.toggle("active", tabName === "context");
}

function setupTabs() {
  document.querySelectorAll("[data-tab]").forEach((button) => {
    button.addEventListener("click", () => switchTab(button.dataset.tab));
  });
}

function setupDragDrop() {
  let dragDepth = 0;

  window.addEventListener("dragenter", (event) => {
    event.preventDefault();
    dragDepth += 1;
    els.dropMask.classList.add("show");
  });

  window.addEventListener("dragover", (event) => event.preventDefault());

  window.addEventListener("dragleave", (event) => {
    event.preventDefault();
    dragDepth = Math.max(0, dragDepth - 1);
    if (!dragDepth) els.dropMask.classList.remove("show");
  });

  window.addEventListener("drop", async (event) => {
    event.preventDefault();
    dragDepth = 0;
    els.dropMask.classList.remove("show");
    if (event.dataTransfer?.files?.length) {
      await addFiles(event.dataTransfer.files);
    }
  });
}

function restoreHistory() {
  if (!history.length) return;
  document.getElementById("emptyState")?.remove();

  history.forEach((item) => addMessage(item.role, item.content));
  const last = [...history].reverse().find((item) => item.role === "assistant");
  if (last) renderOutput(last.content);
}

async function removeLegacyServiceWorkers() {
  if (!("serviceWorker" in navigator)) return;
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(regs.map((reg) => reg.unregister()));
  } catch {}
  if ("caches" in window) {
    try {
      const keys = await caches.keys();
      await Promise.all(keys.filter((key) => key.startsWith("plqnx-core-")).map((key) => caches.delete(key)));
    } catch {}
  }
}

els.attach.addEventListener("click", () => els.fileInput.click());
els.fileInput.addEventListener("change", async () => {
  if (els.fileInput.files?.length) await addFiles(els.fileInput.files);
  els.fileInput.value = "";
});

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

els.mic.addEventListener("click", async () => {
  try {
    if (recording) stopRecording();
    else await startRecording();
  } catch (error) {
    toast(error?.message || "Microphone access failed.");
  }
});

els.modelSelect.addEventListener("change", async () => {
  if (busy) {
    toast("Wait for the current response to finish before switching models.");
    return;
  }
  await loadTextModel(selectedTier());
});

setupTabs();
setupDragDrop();
restoreHistory();
removeLegacyServiceWorkers();
renderContexts();

// Never block the interface on a multi-hundred-MB model download.
els.loader.classList.add("hide");
setStatus("Warming AI…", true);
els.modelFoot.textContent = "Instant model warming in background…";

setTimeout(() => loadTextModel().catch((error) => {
  console.error(error);
  els.loader.classList.add("hide");
  toast("PLQNX could not initialize the text model.");
}), 120);
