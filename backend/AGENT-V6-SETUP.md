# PLQNX ECLIPSE: optional scheduled AI briefs

This upgrade is **prepared in GitHub, not enabled on the deployed Worker**. The existing private beta continues operating unchanged. Use it only after reading its data and cost implications.

## What the feature really does

An invited user can explicitly enable short AI-generated briefs and choose a subject, for example "my Python project" or "study plan for machine learning." The system sends **only that chosen subject**, not complete conversations, to the configured Gemini API. An enabled Cloudflare Worker Cron Trigger calls Gemini at most three times daily per opted-in beta user and stores the resulting brief in the same Cloudflare D1 database. The inbox shows stored results only after they exist. Turning the feature off stops future generations; existing brief entries remain in the user’s inbox.

These are **AI-generated suggestions**, not code optimizations, verified reports, up-to-date news, actions taken in another service, or autonomous modifications to a user’s files. They may be inaccurate.

## Manual activation (Cloudflare account owner)

1. Preserve the live Worker source and export/back up the existing D1 database before migrating.
2. Open **Cloudflare D1 → existing plqnx-core-db → Console**. Execute the complete `backend/agent-v6.sql` migration once, verify both new tables exist and original users/conversations remain intact.
3. Open the existing `plqnx-core-beta` Worker, keep its existing `DB` binding and `GEMINI_API_KEY` and `BETA_ACCESS_CODE` secrets. Replace only its JavaScript source with `backend/worker-v6-agents.js`. Do **not** expose secrets in GitHub or website JavaScript. Deploy.
4. In Worker Settings → Variables add `ENABLE_AGENT_SCHEDULE=true` as a plain **non-secret** configuration variable. Alternatively leave it unset/false and the feature remains disabled.
5. In Worker Settings → Triggers → Cron, add **`30 2,8,14 * * *`** (UTC). These correspond to approximately **08:00, 14:00 and 20:00 India Standard Time**. Cron execution may have platform delay. You can verify scheduled execution in Cloudflare logs.
6. Sign in to CORE and use the new **Daily Briefs** settings card to choose a non-sensitive topic and explicitly enable the feature. A user with no opt-in receives no scheduled brief. You can disable it again in the same place.
7. Do not advertise scheduled agents as live until Cloudflare cron execution and the inbox have been tested end-to-end. Scheduled Gemini calls can use quota and incur charges depending on your account. Current beta uses at most five accounts, therefore at most 15 additional Gemini calls daily if all five opt in.

**Security:** Account-specific authentication is required for inbox reads and preference updates. The scheduled handler queries only opted-in subjects and does not download user chats. There is no auto-publishing or third-party action. Database row ownership is enforced by user ID in read/update queries.

**If activation fails:** Revert to the last working Worker v5 source without deleting the new D1 tables. The website hides brief controls whenever the Worker does not advertise `agentBriefs=true`.

**Existing website address:** `https://jarvis369-max.github.io/plqnx-website/`. No paid domain, extra web hosting, or changes to the current D1 identity are required.
