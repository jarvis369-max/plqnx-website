# PLQNX 7.1: isolate the Gemini HTTP 503

The 7.1 website design, HTML, and existing D1 tables **remain unchanged**. The optional file `worker-v5-diagnostic.js` is copied from the original 7.1 Worker v5 with only backend-side error visibility, a 45-second upstream deadline, a smaller 450-token response cap, and failed-request quota refunds. It makes **one** Gemini generation request per chat; it does not automatically retry or switch models. It does not reveal API keys or prompt content in logs.

## Confirm the currently deployed Worker

Your live Cloudflare Worker is NOT updated when GitHub Pages deploys. First back up the complete code of the live `plqnx-core-beta` Worker and verify your binding is still `DB` to `plqnx-core-db`. If you currently use scheduled agents / a v6 Worker, **do not replace it with v5 diagnostic**: v5 has no scheduled-agent routes.

If you are using Worker v5: replace the existing Cloudflare Worker script with the full contents of [worker-v5-diagnostic.js](./worker-v5-diagnostic.js), leaving your existing `GEMINI_API_KEY` secret, `BETA_ACCESS_CODE` secret, `GEMINI_MODEL` text variable, and `DB` binding intact. Click **Deploy**. No database migration or new account registration is needed.

**Verify deployment:** sign in to PLQNX CORE 7.1, then press the browser's Check Worker only if your deployed site actually has that button. The 7.1 site may not. Alternatively, the publicly available status endpoint requires the allowed website origin header; inspect the network response when CORE starts. The new status body contains `"securityVersion":"v5.1-diagnostic"`. Never add API keys to browser console or a public URL.

## Reproduce once

1. In Cloudflare, open Worker `plqnx-core-beta` > Observability > Events / Logs and select **Live** (enable observability if needed).
2. In CORE, start a brand-new empty conversation and send `Hi` just once. Do not repeatedly consume API quota.
3. Find the log line beginning `PLQNX_AI_DIAGNOSTIC`. It reports `model`, `turns`, `chars`, `durationMs`, `httpStatus` and `upstreamStatus`. It never logs message content, credentials, or Gemini response text.
4. If `turns:1`, a short `chars` value and `httpStatus:503` appear, the request was rejected by the upstream model even without any chat history. If this happens for different models or projects, gather the sanitized record and contact Google AI developer support. If only long histories fail, compare `turns` and `chars` and consider limiting the history window. If `phase:upstream_fetch` and `result:TIMEOUT` appear, Gemini gave no HTTP response before the deadline.
5. If the response is HTTP 400, 403, 404 or 429, fix the specific returned upstream status. Do not assume all errors are 503. Google's official guide explains [API errors](https://ai.google.dev/gemini-api/docs/api-errors) and [backoff](https://ai.google.dev/gemini-api/docs/troubleshooting).

**Rollback:** Redeploy your backed-up live Worker code if diagnostics cause any regression. Do not delete D1 tables, sessions or conversations. GitHub's `main` website stays at the 7.1 interface; this optional diagnostic file has no frontend imports and cannot alter it.

**Privacy:** Before sharing any screenshot of Cloudflare logs, hide account information, bearer tokens, API keys and any text entered by testers.
