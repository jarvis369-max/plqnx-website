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
