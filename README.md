# PLQNX CORE + Agent OS

PLQNX is now structured as a GitHub-hosted frontend with a Cloudflare backend and OpenAI-powered AI/agent layer.

## Public apps

- CORE: https://jarvis369-max.github.io/plqnx-website/
- Agent OS: https://jarvis369-max.github.io/plqnx-website/agent.html

The restored PLQNX CORE warm fluid UI, animations, saved conversations, loading state and account experience stay intact.

## Architecture

```text
GitHub Pages
  ├─ PLQNX CORE chat
  └─ Agent OS founder dashboard
           │
           ▼
Cloudflare Worker
  ├─ auth + rate limits
  ├─ D1 conversations
  ├─ D1 agent queue
  └─ 15-minute Cron Trigger
           │
           ▼
OpenAI
  ├─ Responses API -> PLQNX CORE chat
  └─ Agents API -> durable startup-agent sessions
       ├─ Chief
       ├─ Research
       ├─ Engineering
       ├─ Operations
       ├─ Growth
       ├─ Support
       └─ Founder brief
```

## Model defaults

- CORE chat: `gpt-6-astra`
- Chief / Research / Engineering: `gpt-6-astra`
- Operations / Growth / Support / Brief: `gpt-6-sol`

All model IDs are configurable as Cloudflare Worker variables.

## Cost and action guardrails

Scheduled automation is disabled by default.

```text
AGENT_AUTOMATION_ENABLED=false
```

Manual tasks default to founder approval before execution. Agent OS v1 does not have tools that spend money, publish externally, send email, merge production code, rotate credentials, or delete external data.

Enable those capabilities later only as explicit tools with separate approval checks.

## Source files

- `backend/agent-os.ts` — Cloudflare Worker / OpenAI integration
- `backend/agent-os-schema.sql` — D1 task and schedule migration
- `backend/wrangler.agent-os.toml` — Worker config and 15-minute cron
- `backend/AGENT_OS_SETUP.md` — deployment instructions
- `agent.html` — founder dashboard
- `.github/workflows/deploy-agent-os.yml` — manual GitHub Actions deployment

## Secrets

Never commit these values:

- `OPENAI_API_KEY`
- `BETA_ACCESS_CODE`
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

The Cloudflare Worker reads the OpenAI key only from an encrypted Worker secret. Browser code never receives it.

## Deploy from GitHub Actions

Add these repository secrets:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `OPENAI_API_KEY`
- `BETA_ACCESS_CODE`

Then run the workflow **Deploy PLQNX Agent OS to Cloudflare**.

It asks for your existing PLQNX username and whether to enable automation. Leave automation off for the first deployment, verify one manual task, set an API budget, then enable only the schedules you need.

See `backend/AGENT_OS_SETUP.md` for the full safe setup.
