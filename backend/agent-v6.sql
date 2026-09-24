-- PLQNX ECLIPSE optional opt-in scheduled briefs.
-- Run in the EXISTING plqnx-core-db D1 database only if enabling Worker v6.
-- Do not delete or recreate your existing account/conversation tables.
CREATE TABLE IF NOT EXISTS agent_preferences (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  enabled INTEGER NOT NULL DEFAULT 0 CHECK(enabled IN (0,1)),
  topic TEXT NOT NULL DEFAULT '',
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE TABLE IF NOT EXISTS agent_briefs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day TEXT NOT NULL,
  slot TEXT NOT NULL CHECK(slot IN ('morning','afternoon','evening')),
  topic TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE(user_id,day,slot)
);
CREATE INDEX IF NOT EXISTS idx_agent_briefs_user_date ON agent_briefs(user_id,created_at DESC);
