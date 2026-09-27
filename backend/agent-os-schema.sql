-- PLQNX Agent OS migration.
-- Run AFTER backend/schema.sql and backend/security-v4.sql in the EXISTING D1 database.
-- This migration does not delete or replace chat/account data.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS agent_tasks (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK(kind IN ('chief','research','engineering','operations','growth','support','brief')),
  title TEXT NOT NULL,
  prompt TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('pending_approval','queued','starting','running','completed','failed','cancelled')),
  model TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'manual' CHECK(source IN ('manual','schedule')),
  requires_approval INTEGER NOT NULL DEFAULT 1 CHECK(requires_approval IN (0,1)),
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  openai_session_id TEXT,
  result TEXT,
  error TEXT,
  approved_at INTEGER,
  started_at INTEGER,
  completed_at INTEGER,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_status ON agent_tasks(status,created_at);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_session ON agent_tasks(openai_session_id);

CREATE TABLE IF NOT EXISTS agent_events (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES agent_tasks(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_agent_events_task ON agent_events(task_id,created_at DESC);

CREATE TABLE IF NOT EXISTS agent_schedules (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK(kind IN ('chief','research','engineering','operations','growth','support','brief')),
  title TEXT NOT NULL,
  prompt TEXT NOT NULL,
  every_hours INTEGER NOT NULL CHECK(every_hours BETWEEN 1 AND 168),
  enabled INTEGER NOT NULL DEFAULT 0 CHECK(enabled IN (0,1)),
  next_run_at INTEGER NOT NULL,
  last_run_at INTEGER,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

INSERT OR IGNORE INTO agent_schedules(id,kind,title,prompt,every_hours,enabled,next_run_at)
VALUES
  ('ops-watch','operations','PLQNX operations watch',
   'Review the current PLQNX operating plan and identify reliability, security, cost, deployment, or follow-up risks. Return only actionable items and clearly label anything that requires founder approval.',
   6,0,unixepoch()+3600),
  ('research-scan','research','AI market and competitor scan',
   'Produce a concise research scan for PLQNX: important AI product or developer-platform developments, competitor moves, user needs worth testing, and two concrete experiments. Prefer recent verifiable information when tools permit.',
   12,0,unixepoch()+3600),
  ('engineering-review','engineering','PLQNX engineering review',
   'Review the current PLQNX technical direction. Identify the highest-value engineering improvements, likely bugs or security risks, and a prioritized implementation plan. Do not claim code was changed unless a connected tool confirms it.',
   24,0,unixepoch()+3600),
  ('founder-brief','brief','PLQNX founder brief',
   'Create a short founder brief using the task context available to you: what matters now, blockers, risks, and the top three next actions. Separate completed work from proposals.',
   24,0,unixepoch()+3600);
