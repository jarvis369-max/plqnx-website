// PLQNX CORE private beta Cloudflare Worker
// Set GEMINI_API_KEY and BETA_ACCESS_CODE as Cloudflare encrypted secrets.
// DO NOT paste keys into this public file, GitHub Pages, or chat.
const SITE = "https://jarvis369-max.github.io";
// Keep this as a private beta. A shared access code is not full user authentication.
function headers(origin) {
  return {
    "Access-Control-Allow-Origin": origin === SITE ? SITE : "null",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Beta-Code",
    "Vary": "Origin",
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8"
  };
}
function json(value, status, origin) {
  return new Response(JSON.stringify(value), { status, headers: headers(origin) });
}
export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    if (request.method === "OPTIONS") {
      if (origin !== SITE) return new Response(null, {status: 403});
      return new Response(null, {status: 204, headers: headers(origin)});
    }
    if (origin !== SITE) return json({ error: "Only the PLQNX website is allowed." }, 403, origin);
    if (new URL(request.url).pathname !== "/chat" || request.method !== "POST")
      return json({ error: "Not found." }, 404, origin);
    if (!env.GEMINI_API_KEY || !env.BETA_ACCESS_CODE)
      return json({ error: "Backend not configured yet." }, 503, origin);
    const provided = request.headers.get("X-Beta-Code") || "";
    if (provided.length < 12 || provided !== env.BETA_ACCESS_CODE)
      return json({ error: "Invalid private beta access code." }, 401, origin);
    const bodyText = await request.text();
    if (bodyText.length > 16000)
      return json({ error: "Request too long." }, 413, origin);
    let input;
    try { input = JSON.parse(bodyText); }
    catch { return json({ error: "Invalid JSON." }, 400, origin); }
    if (!input || typeof input.message !== "string" || !input.message.trim() ||
        input.message.length > 1000)
      return json({ error: "Message must be 1–1000 characters." }, 400, origin);
    // Accept up to six complete prior exchanges, with strict length bounds.
    const history = Array.isArray(input.history) ? input.history : [];
    if (history.length > 12 || history.some(turn =>
      !turn || !["user", "model"].includes(turn.role) ||
      typeof turn.text !== "string" || !turn.text.trim() || turn.text.length > 1000
    )) return json({error:"Invalid conversation history."},400,origin);
    // Model contents must begin with a user turn and alternate roles.
    if (history.some((turn, index) => turn.role !== (index % 2 === 0 ? "user" : "model")) ||
        history.length % 2 !== 0)
      return json({error:"Conversation history must contain complete exchanges."},400,origin);
    const contents = history.map(turn => ({
      role:turn.role, parts:[{text:turn.text}]
    }));
    contents.push({role:"user",parts:[{text:input.message.trim()}]});
    const model = env.GEMINI_MODEL || "gemini-3.5-flash-lite";
    // Only owner-selected safe model ids; never accept a model from a browser request.
    if (!/^gemini-[a-z0-9.-]+$/.test(model))
      return json({error: "Invalid model configuration."}, 503, origin);
    let response;
    try {
      response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/" +
        encodeURIComponent(model) + ":generateContent", {
        method: "POST",
        headers: {"Content-Type": "application/json", "x-goog-api-key": env.GEMINI_API_KEY},
        body: JSON.stringify({
          systemInstruction: { parts: [{ text:
            "You are PLQNX CORE, an early-stage AI assistant for learning and coding. " +
            "Answer clearly, respond in Telugu when the user writes Telugu, and never falsely " +
            "claim that PLQNX is incorporated or that you performed actions you did not perform."
          }]},
          contents,
          generationConfig: {maxOutputTokens: 650}
        }),
        signal: AbortSignal.timeout(25000)
      });
    } catch {
      return json({error:"AI provider unavailable. Try again later."}, 502, origin);
    }
    if (response.status === 429)
      return json({error:"Gemini free-tier quota reached. Please try later."}, 429, origin);
    if (!response.ok)
      return json({error:"Gemini request failed. Check your model, API key and quotas."}, 502, origin);
    let data;
    try {data=await response.json();}
    catch {return json({error:"Invalid AI provider response."}, 502, origin);}
    const answer=(data.candidates?.[0]?.content?.parts||[])
      .filter(part=>typeof part.text==="string").map(part=>part.text).join("").trim();
    if (!answer) return json({error:"No text response was returned."},502,origin);
    return json({answer:answer.slice(0,8000)},200,origin);
  }
};
