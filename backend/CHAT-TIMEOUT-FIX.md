# PLQNX CORE chat timeout: deployment and diagnosis

The message "The operation was aborted due to timeout" comes from the **Cloudflare Worker -> Gemini request**. The previous Worker source used a **25-second** outbound request deadline. A GitHub Pages theme or HTML update cannot change a deployed Worker.

## What this repo now fixes

- `backend/worker-v5.js` and `backend/worker-v6-agents.js` allow up to **45 seconds** for the upstream AI request.
- A timed-out request returns HTTP **504** with code `AI_TIMEOUT` and a useful message. Other AI upstream failures return HTTP **502**.
- If the Gemini call fails before the chat is saved, the Worker restores one daily request allowance. It does not retry upstream automatically. Avoid multiple manual retries when service is slow.
- The CORE browser now allows up to **55 seconds**, then offers **Restore my message** rather than losing the unsent text.

## Activate the actual backend fix

1. Open your Cloudflare dashboard at https://dash.cloudflare.com/ and select the existing `plqnx-core-beta` Worker.
2. Verify which Worker version is deployed before replacing anything. **Back up the live Worker code** and D1 database first. If you're running the existing normal beta, take the complete latest [worker-v5.js](./worker-v5.js) source. If the optional scheduled AI briefs and the agent SQL migration are **already deployed and working**, use [worker-v6-agents.js](./worker-v6-agents.js) instead. Do **not** switch from v5 to v6 just to fix chat; v6 needs its [separate migration and Cron setup](./AGENT-V6-SETUP.md).
3. In the existing Worker editor, replace the old source with the selected **complete file** and click **Deploy**. GitHub commits only publish the website. They never redeploy your Cloudflare Worker.
4. Leave the current D1 `DB` binding and secrets `GEMINI_API_KEY` and `BETA_ACCESS_CODE` unchanged. You don't need to paste, share, regenerate or reveal their values for this fix.
5. Verify `/v1/status` works from your own browser and sign in at [PLQNX CORE](https://jarvis369-max.github.io/plqnx-website/core.html). Try a **short** question in a new chat. If the answer is received, try a longer question.

## If it still times out

In Cloudflare -> Workers -> `plqnx-core-beta` -> Observability/Logs, inspect the timestamp and HTTP status for the failing request. Check your Gemini project quota, selected `GEMINI_MODEL` and model availability in [Google AI Studio](https://aistudio.google.com/). The current fallback model configured in source is `gemini-3.5-flash-lite`; your project must have access to it. Check the model ID using Google's official [model list](https://ai.google.dev/gemini-api/docs/models).

Try again with a short new conversation because long histories can take longer. If the timeout persists after the new Worker is deployed, investigate the upstream latency and any 429, 404 or billing errors. Increasing a timeout is **not** a guarantee that an unavailable or overloaded model responds.

**Never share logs that include API keys, invitation codes, passwords or actual private chat content.** Only share sanitized error codes, timestamps and the selected non-secret model name.
