# Connect real Gemini AI to PLQNX CORE

This folder contains a Cloudflare Worker for an **invite-only private beta**. The public website remains on GitHub Pages. The frontend remains in scripted demo mode until you explicitly configure a Worker URL.

## 1. Create your Gemini API key

Go to https://aistudio.google.com/apikey and create an API key in an **eligible free-tier project**. Confirm the model and your actual project's quotas in AI Studio before continuing. Google AI Pro does **not** give your public app unlimited API usage.

**Never put this key in GitHub, a web page, or a chat.**

## 2. Create the free Worker

1. Open https://dash.cloudflare.com/ and go to Workers & Pages.
2. Create a Worker named `plqnx-core-beta`.
3. Choose Edit code and replace the default Worker code with `backend/worker.js` from this repository, then deploy.
4. Copy the new Worker address, such as `https://plqnx-core-beta.YOURSUBDOMAIN.workers.dev`.

## 3. Configure the encrypted secrets

In your Worker, go to **Settings → Variables and Secrets → Add**. Add:

- **Secret:** `GEMINI_API_KEY` with your Gemini key.
- **Secret:** `BETA_ACCESS_CODE` with a random private access code of **at least 12 characters**.

Optional **Text** variable: `GEMINI_MODEL` = `gemini-3.5-flash-lite` (choose a free-tier-eligible model available to your project).

Deploy changes. The Worker rejects all requests except POST /chat from the specified GitHub Pages origin and requests with the beta access code. CORS is not an authentication or rate-limiting mechanism. Anyone who learns the beta code can potentially consume quota.

## 4. Connect from the website

Open https://jarvis369-max.github.io/plqnx-website/ and click **Try the demo**. Click **Connect live beta**, enter your own Worker URL and beta access code, then send a short test message.

The site stores the Worker URL locally in your browser and the beta code only in session storage. Do not share the code with the public. You can switch back to scripted demo mode via the **Disconnect beta** button.

## 5. Important for ₹0 additional budget

Keep the code invite-only and request access code confidential. Check your Gemini project for billing status, API model availability, request quotas and rate limits. The Worker has input-length and output-length bounds but **no distributed per-user quota**, so it is NOT ready for public unlimited use. Before a public release, add real user authentication, durable per-user rate limiting and abuse controls. Free Gemini API prompts may be used by Google for product improvement; do not test with sensitive information.
