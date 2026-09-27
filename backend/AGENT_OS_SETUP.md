# PLQNX Agent OS setup

PLQNX Agent OS keeps the existing PLQNX CORE UI, accounts, saved conversations and animations, but replaces the AI layer with OpenAI and adds scheduled managed agents.

## What is implemented

- PLQNX CORE chat -> OpenAI Responses API
- Default chat model -> gpt-6-astra
- Chief/research/engineering agents -> gpt-6-astra
- Lower-cost operations/growth/support/brief agents -> gpt-6-sol
- OpenAI Agents API sessions for durable agent work
- D1 task queue, task history and schedules
- Human approval state for manually created tasks
- Cloudflare Cron handler for 24/7 wake-ups
- Agent OS dashboard at agent.html
- No destructive external tools are enabled by default

## Important cost safety

Automation is committed with AGENT_AUTOMATION_ENABLED=false. This prevents scheduled API spending until you deliberately enable it after checking your OpenAI billing limits.

## 1. Database migration

In the existing Cloudflare D1 database used by PLQNX, run these files in order if they have not already been run:

1. backend/schema.sql
2. backend/security-v4.sql
3. backend/agent-os-schema.sql

Do not delete the existing database. The Agent OS migration is additive.

## 2. Cloudflare Worker

Use backend/agent-os.ts as the Worker source.

Keep the existing D1 binding name:

DB

Set these encrypted Worker secrets:

OPENAI_API_KEY
BETA_ACCESS_CODE

Never place either secret in GitHub, HTML, browser JavaScript, or chat messages.

Set these text variables:

SITE_ORIGIN=https://jarvis369-max.github.io
PLQNX_CHAT_MODEL=gpt-6-astra
PLQNX_CHIEF_MODEL=gpt-6-astra
PLQNX_WORKER_MODEL=gpt-6-sol
AGENT_ADMIN_USER=YOUR_PLQNX_USERNAME
AGENT_AUTOMATION_ENABLED=false
AGENT_MAX_STARTS_PER_TICK=1

The OpenAI API key needs permissions for the Agents API session operations and Responses inference.

## 3. Cron

Configure one Cron Trigger:

*/15 * * * *

The Worker wakes every 15 minutes. It polls running managed-agent sessions. When automation is enabled it also queues due schedules and starts a small number of queued tasks.

## 4. First test

Keep AGENT_AUTOMATION_ENABLED=false.

Deploy the Worker, sign in to PLQNX CORE, then open:

https://jarvis369-max.github.io/plqnx-website/agent.html

Create one task with approval enabled, approve it, then press Run queue. The dashboard will show pending, queued, running, completed or failed states.

## 5. Enable 24/7 schedules

After one manual task succeeds and you have set an OpenAI budget/usage alert, change:

AGENT_AUTOMATION_ENABLED=true

Then enable only the schedules you actually want from the Agent OS dashboard.

The default schedule rows are disabled. This is intentional so cloning/deploying the repository cannot silently generate API spend.

## Approval boundary

The first Agent OS version can research, reason, draft, review and produce code or plans inside OpenAI managed sessions. It does not send email, publish content, spend money, merge production code, change credentials or delete external data. Those actions should be added later as explicit tools with separate approval gates.
