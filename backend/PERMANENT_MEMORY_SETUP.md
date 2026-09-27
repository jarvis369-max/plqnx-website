# PLQNX CORE permanent memory, phase 1

This is a **private-beta schema**, not a finished public authentication product. The current website and existing short-term memory keep working without a database. No new login UI is active until the Worker is updated in phase 2.

## Create D1 database (Cloudflare free tier, subject to current limits)

1. Log into Cloudflare and choose **Storage & databases → D1 SQL database** (the wording may be **D1** under Storage).
2. Create a database named `plqnx-core-db`.
3. Open that database's **Console** and paste the complete contents of [schema.sql](./schema.sql), then execute it. All statements use `IF NOT EXISTS` so rerunning them won't duplicate tables.
4. Open **Workers & Pages → plqnx-core-beta → Settings → Bindings → Add binding → D1 database**.
5. Set the **variable/binding name** to exactly `DB` (uppercase) and select database `plqnx-core-db`. Save/deploy the binding.
6. Leave existing `GEMINI_API_KEY`, `BETA_ACCESS_CODE`, and any optional `GEMINI_MODEL` untouched.

**Important:** A SQL database and its binding alone do **not** turn on permanent memory. Phase 2 updates the Worker and chat interface to save messages to this database, add private beta accounts and enforce usage limits. Do not post screenshots containing secrets or paste API keys into the SQL console.

### Planned security before public release
Private invite-gated signup, password hashing, short-lived revocable sessions, owner-scoped conversation retrieval, server-side daily request quotas, and Cloudflare WAF / bot controls for login and signup. Email verification, password recovery, account deletion, and privacy terms must be designed before unrestricted public signup. Keep the beta code private.

## Phase 2: Activate permanent memory (manual deployment)

The version 3 Worker is stored in [worker-v3.js](./worker-v3.js). It is **not** deployed by GitHub Pages.

1. Verify your D1 database contains `users`, `sessions`, `conversations`, `messages`, and `daily_usage`. You have already connected `plqnx-core-db` to `plqnx-core-beta` under the exact D1 binding `DB`.
2. Open [worker-v3.js](./worker-v3.js) on GitHub, click **Raw** or the copy button, then copy the complete file.
3. In Cloudflare, open **Workers & Pages → plqnx-core-beta → Edit code**, replace the existing Worker code with the V3 file, and **Deploy**. Leave the current `GEMINI_API_KEY`, `BETA_ACCESS_CODE` and `DB` binding intact.
4. Wait for GitHub Pages to deploy [core.html](../core.html). Visit https://jarvis369-max.github.io/plqnx-website/core.html and refresh. If the backend isn't deployed, the page reports that V3 is needed. Do not enter any password in an unexpected page.
5. Register with a new username and a **unique password of at least 12 characters** using your existing private `BETA_ACCESS_CODE` as the invitation code. Keep your password and invitation private. The beta is limited to 5 accounts.
6. Send a message, refresh the page, and reopen the saved conversation. The session token is held in browser session storage. After closing the tab, sign in again with your username and password to reopen D1-saved chats. Press **New conversation** to create another thread.

**Testing limits:** Private beta only. The backend currently caps signed-in users at **25 AI requests per day**, with a maximum of 5 beta accounts. This is an initial safety measure, *not* production abuse prevention: the legacy beta-code route still functions for the original home-page demo without an equivalent distributed quota. Before any public release, remove the old route and implement WAF/rate limiting for signup, login and the beta route, plus email verification, account recovery, consent/privacy and deletion flows. Passwords are derived with PBKDF2 and salted, and sessions are stored as token hashes in D1, but production authentication needs security review. The chat page displays model responses as plain text rather than interpreting HTML. Avoid sensitive information in tests.
