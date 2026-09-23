-- PLQNX CORE 4 private beta request throttling.
-- Execute this single CREATE TABLE statement in the D1 Console BEFORE deploying worker-v4.js.
-- Do NOT drop or change existing users, sessions, conversations or messages.
CREATE TABLE IF NOT EXISTS auth_limits (
  key TEXT PRIMARY KEY,
  window_start INTEGER NOT NULL,
  requests INTEGER NOT NULL DEFAULT 0
);
