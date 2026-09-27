import asyncio
import hashlib
import json
import os
import re
import secrets
import time
import uuid
from datetime import datetime, timezone

import httpx
import sqlite3
from pathlib import Path
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

DB_PATH = Path(os.getenv("PLQNX_DB_PATH", "/tmp/plqnx.db"))
KIE_API_KEY = os.getenv("KIE_API_KEY", "").strip()
BETA_ACCESS_CODE = os.getenv("BETA_ACCESS_CODE", "").strip()
SITE_ORIGIN = os.getenv("SITE_ORIGIN", "https://jarvis369-max.github.io").rstrip("/")
KIE_RESPONSES_URL = "https://api.kie.ai/codex/v1/responses"
CHAT_MODEL = os.getenv("PLQNX_CHAT_MODEL", "gpt-6-astra")
CHIEF_MODEL = os.getenv("PLQNX_CHIEF_MODEL", "gpt-6-astra")
WORKER_MODEL = os.getenv("PLQNX_WORKER_MODEL", "gpt-6-sol")
DAILY_LIMIT = int(os.getenv("DAILY_LIMIT", "25"))
SESSION_SECONDS = 7 * 86400

AGENT_INSTRUCTIONS = {
    "chief": (
        "You are PLQNX Chief Agent. Act as a careful startup operating partner. "
        "Break goals into concrete work, coordinate priorities, identify risks, and produce an executive-ready result. "
        "Do not spend money, publish externally, delete data, send messages, change credentials, or claim an action "
        "happened unless a connected tool actually confirms it. When an external action is needed, propose it clearly "
        "for human approval."
    ),
    "research": (
        "You are PLQNX Research Agent. Research AI products, technical approaches, market changes, user needs, "
        "and competitors. Separate verified facts from assumptions. Produce concise findings, implications for PLQNX, "
        "and next experiments. Never fabricate sources or claim work was performed outside the available tools."
    ),
    "engineering": (
        "You are PLQNX Engineering Agent. Review technical goals, architecture, bugs, security, performance, tests, "
        "and deployment. Produce implementation-ready plans or code when useful. Do not claim code was merged or "
        "deployed unless a connected tool confirms it. Flag destructive or production changes for human approval."
    ),
    "operations": (
        "You are PLQNX Operations Agent. Look for operational risks, failed workflows, cost problems, reliability "
        "issues, security gaps, and important follow-ups. Return a prioritized checklist. Do not make purchases, billing "
        "changes, credential changes, or destructive changes."
    ),
    "growth": (
        "You are PLQNX Growth Agent. Draft product messaging, launch ideas, SEO experiments, onboarding improvements, "
        "and growth tests. Keep claims accurate. Do not publish or contact people without explicit human approval."
    ),
    "support": (
        "You are PLQNX Support Agent. Draft helpful customer support responses, identify recurring issues, and suggest "
        "product fixes. Do not send messages or reveal private data."
    ),
    "brief": (
        "You are PLQNX Daily Brief Agent. Summarize the latest PLQNX agent results into a short founder brief: "
        "what changed, what matters, blockers, cost or security concerns, and the top three next actions. "
        "Distinguish completed work from proposed work."
    ),
}

app = FastAPI(title="PLQNX CORE", version="8.0.0", description="PLQNX CORE + Agent OS powered by Kie.ai")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[SITE_ORIGIN, "http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=False,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)


def connect():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def now_ts():
    return int(time.time())


def new_id():
    return str(uuid.uuid4())


def token_hex():
    return secrets.token_hex(32)


def sha256(value: str):
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def password_hash(password: str, salt: str):
    return hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 100_000).hex()


def clean_title(value: str):
    return re.sub(r"\s+", " ", value).strip()[:68] or "New chat"


def ensure_schema():
    ddl = """
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password_salt TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL DEFAULT 'New chat',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_conversations_user ON conversations(user_id, updated_at DESC);

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      role TEXT NOT NULL CHECK(role IN ('user','model')),
      content TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at, id);

    CREATE TABLE IF NOT EXISTS daily_usage (
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      day TEXT NOT NULL,
      requests INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY(user_id, day)
    );

    CREATE TABLE IF NOT EXISTS auth_limits (
      key TEXT PRIMARY KEY,
      window_start INTEGER NOT NULL,
      requests INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS agent_tasks (
      id TEXT PRIMARY KEY,
      kind TEXT NOT NULL,
      title TEXT NOT NULL,
      prompt TEXT NOT NULL,
      status TEXT NOT NULL,
      model TEXT NOT NULL,
      source TEXT NOT NULL DEFAULT 'manual',
      requires_approval INTEGER NOT NULL DEFAULT 1,
      created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
      result TEXT,
      error TEXT,
      approved_at INTEGER,
      started_at INTEGER,
      completed_at INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_agent_tasks_status ON agent_tasks(status, created_at);

    CREATE TABLE IF NOT EXISTS agent_events (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL REFERENCES agent_tasks(id) ON DELETE CASCADE,
      event_type TEXT NOT NULL,
      payload TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS agent_schedules (
      id TEXT PRIMARY KEY,
      kind TEXT NOT NULL,
      title TEXT NOT NULL,
      prompt TEXT NOT NULL,
      every_hours INTEGER NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 0,
      next_run_at INTEGER NOT NULL,
      last_run_at INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    """
    with connect() as conn:
        with conn.cursor() as cur:
            cur.execute(ddl)
            current = now_ts()
            defaults = [
                (
                    "ops-watch", "operations", "PLQNX operations watch",
                    "Review PLQNX operations and identify reliability, security, cost, deployment, or follow-up risks. "
                    "Return only actionable items and clearly label anything requiring founder approval.",
                    6
                ),
                (
                    "research-scan", "research", "AI market and competitor scan",
                    "Research important AI product and developer-platform developments, competitor moves, user needs worth "
                    "testing, and two concrete experiments for PLQNX. Prefer recent verifiable information.",
                    12
                ),
                (
                    "engineering-review", "engineering", "PLQNX engineering review",
                    "Review the PLQNX technical direction. Identify the highest-value engineering improvements, likely bugs "
                    "or security risks, and a prioritized implementation plan.",
                    24
                ),
                (
                    "founder-brief", "brief", "PLQNX founder brief",
                    "Create a short founder brief: what matters now, blockers, risks, and the top three next actions. "
                    "Separate completed work from proposals.",
                    24
                ),
            ]
            for sid, kind, title, prompt, hours in defaults:
                cur.execute(
                    """
                    INSERT INTO agent_schedules(id,kind,title,prompt,every_hours,enabled,next_run_at,created_at,updated_at)
                    VALUES(?,?,?,?,?,0,?,?,?)
                    ON CONFLICT (id) DO NOTHING
                    """,
                    (sid, kind, title, prompt, hours, current + 3600, current, current),
                )
        conn.commit()


def request_ip(request: Request):
    return request.headers.get("cf-connecting-ip") or request.headers.get("x-forwarded-for", "").split(",")[0].strip() or "unknown"


def throttle(kind: str, identifier: str, window_seconds: int, limit: int):
    current_window = now_ts() // window_seconds * window_seconds
    secret = BETA_ACCESS_CODE or "plqnx-rate-limit"
    key = sha256(f"{secret}|{kind}|{identifier}")
    with connect() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT window_start,requests FROM auth_limits WHERE key=?", (key,))
            row = cur.fetchone()
            if not row or int(row["window_start"]) != current_window:
                cur.execute(
                    """
                    INSERT INTO auth_limits(key,window_start,requests) VALUES(?,?,1)
                    ON CONFLICT(key) DO UPDATE SET window_start=EXCLUDED.window_start, requests=1
                    """,
                    (key, current_window),
                )
                conn.commit()
                return True
            if int(row["requests"]) >= limit:
                return False
            cur.execute("UPDATE auth_limits SET requests=requests+1 WHERE key=?", (key,))
        conn.commit()
    return True


def bearer_user(request: Request):
    header = request.headers.get("authorization", "")
    if not re.fullmatch(r"Bearer [a-f0-9]{64}", header):
        return None
    hashed = sha256(header[7:])
    with connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT users.id,users.username,sessions.token_hash
                FROM sessions JOIN users ON users.id=sessions.user_id
                WHERE sessions.token_hash=? AND sessions.expires_at>?
                """,
                (hashed, now_ts()),
            )
            return cur.fetchone()


def create_session(user_id: str):
    value = token_hex()
    hashed = sha256(value)
    expires = now_ts() + SESSION_SECONDS
    with connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO sessions(token_hash,user_id,expires_at,created_at) VALUES(?,?,?,?)",
                (hashed, user_id, expires, now_ts()),
            )
        conn.commit()
    return {"token": value, "expiresAt": expires}


def is_admin(user):
    with connect() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT id FROM users ORDER BY created_at ASC LIMIT 1")
            first = cur.fetchone()
    return bool(first and first["id"] == user["id"])


def model_for_agent(kind: str):
    return CHIEF_MODEL if kind in {"chief", "research", "engineering"} else WORKER_MODEL


def extract_kie_text(data: dict):
    if isinstance(data.get("output_text"), str) and data["output_text"].strip():
        return data["output_text"].strip()
    chunks = []
    for item in data.get("output") or []:
        for part in item.get("content") or []:
            text = part.get("text")
            if isinstance(text, str):
                chunks.append(text)
            elif isinstance(text, dict) and isinstance(text.get("value"), str):
                chunks.append(text["value"])
            elif isinstance(part.get("value"), str):
                chunks.append(part["value"])
    return "".join(chunks).strip()


async def kie_response(model: str, prompt: str, history=None, web_search=False):
    if not KIE_API_KEY:
        raise RuntimeError("KIE_API_KEY is not configured")
    history = history or []
    input_items = [
        {"role": "user", "content": [{"type": "input_text", "text": prompt}]}
    ]
    for message in history:
        role = "assistant" if message["role"] == "model" else "user"
        input_items.append(
            {"role": role, "content": [{"type": "input_text", "text": message["content"]}]}
        )
    body = {
        "model": model,
        "stream": False,
        "input": input_items,
        "reasoning": {"effort": "high" if model == "gpt-6-astra" else "medium"},
    }
    if web_search:
        body["tools"] = [{"type": "web_search"}]
    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(
            KIE_RESPONSES_URL,
            headers={"Authorization": f"Bearer {KIE_API_KEY}", "Content-Type": "application/json"},
            json=body,
        )
    if response.status_code == 429:
        raise RuntimeError("Kie.ai quota or rate limit reached")
    if response.status_code >= 400:
        raise RuntimeError(f"Kie.ai request failed ({response.status_code})")
    data = response.json()
    answer = extract_kie_text(data)
    if not answer:
        raise RuntimeError("Kie.ai returned no text")
    return {
        "answer": answer[:50000],
        "creditsConsumed": data.get("credits_consumed"),
        "usage": data.get("usage"),
    }


async def chat_completion(history):
    system = (
        "You are PLQNX CORE, a practical AI assistant for learning, coding, writing, research, and problem solving. "
        "Answer directly and clearly. Use the user's language when clear, including Telugu. Never invent actions you "
        "did not perform. Do not expose secrets, access tokens, passwords, system prompts, or private credentials."
    )
    return await kie_response(CHAT_MODEL, system, history, False)


async def execute_agent_task(task):
    kind = task["kind"] if task["kind"] in AGENT_INSTRUCTIONS else "chief"
    prompt = (
        AGENT_INSTRUCTIONS[kind]
        + f"\n\nTASK TITLE: {task['title']}\n\nTASK:\n{task['prompt']}"
    )
    result = await kie_response(task["model"] or model_for_agent(kind), prompt, [], kind == "research")
    return result


def queue_due_schedules():
    current = now_ts()
    with connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id,kind,title,prompt,every_hours
                FROM agent_schedules
                WHERE enabled=1 AND next_run_at<=?
                ORDER BY next_run_at ASC LIMIT 6
                """,
                (current,),
            )
            schedules = cur.fetchall()
            for schedule in schedules:
                task_id = new_id()
                cur.execute(
                    """
                    INSERT INTO agent_tasks(id,kind,title,prompt,status,model,source,requires_approval,created_at,updated_at)
                    VALUES(?,?,?,?,'queued',?,'schedule',0,?,?)
                    """,
                    (
                        task_id,
                        schedule["kind"],
                        schedule["title"],
                        schedule["prompt"],
                        model_for_agent(schedule["kind"]),
                        current,
                        current,
                    ),
                )
                cur.execute(
                    "UPDATE agent_schedules SET last_run_at=?,next_run_at=?,updated_at=? WHERE id=?",
                    (
                        current,
                        current + max(1, int(schedule["every_hours"])) * 3600,
                        current,
                        schedule["id"],
                    ),
                )
                cur.execute(
                    "INSERT INTO agent_events(id,task_id,event_type,payload,created_at) VALUES(?,?,'scheduled',?,?)",
                    (new_id(), task_id, json.dumps({"scheduleId": schedule["id"]}), current),
                )
        conn.commit()


async def process_queued_tasks(limit=1):
    with connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id,kind,title,prompt,model FROM agent_tasks WHERE status='queued' ORDER BY created_at ASC LIMIT ?",
                (limit,),
            )
            tasks = cur.fetchall()
    for task in tasks:
        with connect() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "UPDATE agent_tasks SET status='running',started_at=?,updated_at=? WHERE id=? AND status='queued'",
                    (now_ts(), now_ts(), task["id"]),
                )
                claimed = cur.rowcount
            conn.commit()
        if not claimed:
            continue
        try:
            result = await execute_agent_task(task)
            current = now_ts()
            with connect() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        UPDATE agent_tasks
                        SET status='completed',result=?,completed_at=?,updated_at=?,error=NULL
                        WHERE id=?
                        """,
                        (result["answer"], current, current, task["id"]),
                    )
                    cur.execute(
                        "INSERT INTO agent_events(id,task_id,event_type,payload,created_at) VALUES(?,?,'completed',?,?)",
                        (
                            new_id(),
                            task["id"],
                            json.dumps({
                                "provider": "kie.ai",
                                "model": task["model"],
                                "creditsConsumed": result.get("creditsConsumed"),
                                "usage": result.get("usage"),
                            }),
                            current,
                        ),
                    )
                conn.commit()
        except Exception as exc:
            with connect() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        "UPDATE agent_tasks SET status='failed',error=?,updated_at=? WHERE id=?",
                        (str(exc)[:500], now_ts(), task["id"]),
                    )
                conn.commit()


async def run_agent_scheduler(manual=False):
    if not KIE_API_KEY:
        return
    if manual or os.getenv("AGENT_AUTOMATION_ENABLED", "true").lower() == "true":
        if not manual:
            queue_due_schedules()
        await process_queued_tasks(2 if manual else 1)


class AuthRequest(BaseModel):
    username: str
    password: str


class ConversationCreate(BaseModel):
    title: str = "New chat"


class ConversationRename(BaseModel):
    title: str


class ChatRequest(BaseModel):
    conversationId: str
    message: str = Field(min_length=1, max_length=1000)


class AgentTaskCreate(BaseModel):
    kind: str = "chief"
    title: str
    prompt: str
    requiresApproval: bool = True
    model: str | None = None


class SchedulePatch(BaseModel):
    enabled: bool | None = None
    title: str | None = None
    prompt: str | None = None
    everyHours: int | None = None


async def scheduler_loop():
    while True:
        try:
            await run_agent_scheduler(manual=False)
        except Exception as exc:
            print("PLQNX scheduler error:", type(exc).__name__)
        await asyncio.sleep(900)


@app.on_event("startup")
async def startup():
    ensure_schema()
    asyncio.create_task(scheduler_loop())


@app.get("/health")
async def health():
    return {
        "ok": True,
        "service": "plqnx-core",
        "provider": "kie.ai",
        "chatModel": CHAT_MODEL,
        "databaseConfigured": True,
        "kieConfigured": bool(KIE_API_KEY),
    }


@app.get("/v1/status")
async def status():
    return {
        "version": "persistent-v1",
        "accounts": True,
        "permanentMemory": True,
        "securityVersion": "render-kie-sqlite-v1",
        "renameConversation": True,
        "aiProvider": "kie.ai",
        "chatModel": CHAT_MODEL,
        "agentOS": True,
        "automationEnabled": True,
    }


@app.post("/v1/register")
async def register(request: Request, data: AuthRequest):
    if not throttle("register-ip", request_ip(request), 3600, 4):
        raise HTTPException(429, "Too many registration attempts. Try later.")
    if not re.fullmatch(r"[A-Za-z][A-Za-z0-9_]{2,19}", data.username):
        raise HTTPException(400, "Username: 3-20 letters/numbers/underscores.")
    if len(data.password) < 12 or len(data.password) > 128:
        raise HTTPException(400, "Password: 12-128 characters.")
    with connect() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) AS n FROM users")
            count = int(cur.fetchone()["n"])
            if count >= 5:
                raise HTTPException(403, "Private beta registration is full.")
            invitation = request.headers.get("x-beta-code", "")
            if count > 0 and BETA_ACCESS_CODE and invitation != BETA_ACCESS_CODE:
                raise HTTPException(403, "Private beta invitation code required.")
            salt = token_hex()
            hashed = password_hash(data.password, salt)
            uid = new_id()
            try:
                cur.execute(
                    "INSERT INTO users(id,username,password_salt,password_hash,created_at) VALUES(?,?,?,?,?)",
                    (uid, data.username, salt, hashed, now_ts()),
                )
            except sqlite3.IntegrityError:
                raise HTTPException(409, "Username is unavailable.")
        conn.commit()
    session = create_session(uid)
    return {"username": data.username, **session}


@app.post("/v1/login")
async def login(request: Request, data: AuthRequest):
    if not throttle("login-ip", request_ip(request), 900, 12):
        raise HTTPException(429, "Too many sign-in attempts. Try again in 15 minutes.")
    if not throttle("login-user", data.username.lower(), 900, 7):
        raise HTTPException(429, "Too many sign-in attempts for this account. Try again in 15 minutes.")
    with connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id,username,password_salt,password_hash FROM users WHERE lower(username)=lower(?)",
                (data.username,),
            )
            user = cur.fetchone()
    if not user:
        raise HTTPException(401, "Invalid username or password.")
    if password_hash(data.password, user["password_salt"]) != user["password_hash"]:
        raise HTTPException(401, "Invalid username or password.")
    return {"username": user["username"], **create_session(user["id"])}


@app.get("/v1/me")
async def me(request: Request):
    user = bearer_user(request)
    if not user:
        raise HTTPException(401, "Please sign in again.")
    return {"username": user["username"], "agentAdmin": is_admin(user)}


@app.post("/v1/logout")
async def logout(request: Request):
    user = bearer_user(request)
    if not user:
        raise HTTPException(401, "Please sign in again.")
    with connect() as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM sessions WHERE token_hash=?", (user["token_hash"],))
        conn.commit()
    return {"ok": True}


@app.get("/v1/conversations")
async def list_conversations(request: Request):
    user = bearer_user(request)
    if not user:
        raise HTTPException(401, "Please sign in again.")
    with connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id,title,created_at,updated_at FROM conversations WHERE user_id=? ORDER BY updated_at DESC LIMIT 50",
                (user["id"],),
            )
            rows = cur.fetchall()
    return {"conversations": rows}


@app.post("/v1/conversations")
async def create_conversation(request: Request, data: ConversationCreate):
    user = bearer_user(request)
    if not user:
        raise HTTPException(401, "Please sign in again.")
    cid = new_id()
    title = clean_title(data.title)
    current = now_ts()
    with connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO conversations(id,user_id,title,created_at,updated_at) VALUES(?,?,?,?,?)",
                (cid, user["id"], title, current, current),
            )
        conn.commit()
    return {"id": cid, "title": title}


@app.get("/v1/conversations/{conversation_id}")
async def get_conversation(conversation_id: str, request: Request):
    user = bearer_user(request)
    if not user:
        raise HTTPException(401, "Please sign in again.")
    with connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id,title FROM conversations WHERE id=? AND user_id=?",
                (conversation_id, user["id"]),
            )
            convo = cur.fetchone()
            if not convo:
                raise HTTPException(404, "Conversation not found.")
            cur.execute(
                "SELECT role,content,created_at FROM messages WHERE conversation_id=? ORDER BY created_at ASC,id ASC LIMIT 150",
                (conversation_id,),
            )
            messages = cur.fetchall()
    return {"conversation": convo, "messages": messages}


@app.patch("/v1/conversations/{conversation_id}")
async def rename_conversation(conversation_id: str, request: Request, data: ConversationRename):
    user = bearer_user(request)
    if not user:
        raise HTTPException(401, "Please sign in again.")
    title = clean_title(data.title)
    with connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE conversations SET title=?,updated_at=? WHERE id=? AND user_id=? RETURNING id,title",
                (title, now_ts(), conversation_id, user["id"]),
            )
            row = cur.fetchone()
        conn.commit()
    if not row:
        raise HTTPException(404, "Conversation not found.")
    return {"conversation": row}


@app.delete("/v1/conversations/{conversation_id}")
async def delete_conversation(conversation_id: str, request: Request):
    user = bearer_user(request)
    if not user:
        raise HTTPException(401, "Please sign in again.")
    with connect() as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM conversations WHERE id=? AND user_id=?", (conversation_id, user["id"]))
        conn.commit()
    return {"ok": True}


@app.post("/v1/chat")
async def chat(request: Request, data: ChatRequest):
    user = bearer_user(request)
    if not user:
        raise HTTPException(401, "Please sign in again.")
    with connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id,title FROM conversations WHERE id=? AND user_id=?",
                (data.conversationId, user["id"]),
            )
            convo = cur.fetchone()
            if not convo:
                raise HTTPException(404, "Conversation not found.")
            day = datetime.now(timezone.utc).strftime("%Y-%m-%d")
            cur.execute("SELECT requests FROM daily_usage WHERE user_id=? AND day=?", (user["id"], day))
            usage = cur.fetchone()
            used = int(usage["requests"]) if usage else 0
            if used >= DAILY_LIMIT:
                raise HTTPException(429, f"Daily beta limit reached ({DAILY_LIMIT} requests). Try tomorrow.")
            cur.execute(
                "SELECT role,content FROM messages WHERE conversation_id=? ORDER BY created_at DESC,id DESC LIMIT 12",
                (data.conversationId,),
            )
            previous = list(reversed(cur.fetchall()))
    history = [{"role": row["role"], "content": row["content"]} for row in previous]
    if history and history[0]["role"] == "model":
        history = history[1:]
    history.append({"role": "user", "content": data.message.strip()})
    try:
        generated = await chat_completion(history)
    except Exception as exc:
        raise HTTPException(502, str(exc))
    title = clean_title(data.message) if convo["title"] == "New chat" else convo["title"]
    current = now_ts()
    with connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO daily_usage(user_id,day,requests) VALUES(?,?,1)
                ON CONFLICT(user_id,day) DO UPDATE SET requests=daily_usage.requests+1
                RETURNING requests
                """,
                (user["id"], day),
            )
            new_usage = int(cur.fetchone()["requests"])
            cur.execute(
                "INSERT INTO messages(id,conversation_id,role,content,created_at) VALUES(?,?,'user',?,?)",
                (new_id(), data.conversationId, data.message.strip(), current),
            )
            cur.execute(
                "INSERT INTO messages(id,conversation_id,role,content,created_at) VALUES(?,?,'model',?,?)",
                (new_id(), data.conversationId, generated["answer"], current + 1),
            )
            cur.execute(
                "UPDATE conversations SET title=?,updated_at=? WHERE id=? AND user_id=?",
                (title, current, data.conversationId, user["id"]),
            )
        conn.commit()
    return {
        "answer": generated["answer"],
        "title": title,
        "model": CHAT_MODEL,
        "provider": "kie.ai",
        "remainingToday": max(0, DAILY_LIMIT - new_usage),
        "creditsConsumed": generated.get("creditsConsumed"),
    }


def require_admin(request: Request):
    user = bearer_user(request)
    if not user:
        raise HTTPException(401, "Please sign in again.")
    if not is_admin(user):
        raise HTTPException(403, "Only the first PLQNX account can control Agent OS.")
    return user


@app.get("/v1/agent/status")
async def agent_status(request: Request):
    require_admin(request)
    with connect() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT status,COUNT(*) AS n FROM agent_tasks GROUP BY status")
            counts = cur.fetchall()
    return {
        "ok": True,
        "automationEnabled": True,
        "chatModel": CHAT_MODEL,
        "chiefModel": CHIEF_MODEL,
        "workerModel": WORKER_MODEL,
        "counts": counts,
    }


@app.get("/v1/agent/tasks")
async def agent_tasks(request: Request):
    require_admin(request)
    with connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id,kind,title,status,model,source,requires_approval,created_at,started_at,completed_at,error,result
                FROM agent_tasks ORDER BY created_at DESC LIMIT 60
                """
            )
            rows = cur.fetchall()
    return {"tasks": rows}


@app.post("/v1/agent/tasks")
async def create_agent_task(request: Request, data: AgentTaskCreate):
    user = require_admin(request)
    if data.kind not in AGENT_INSTRUCTIONS:
        raise HTTPException(400, "Unknown agent kind.")
    if not data.prompt.strip() or len(data.prompt) > 8000:
        raise HTTPException(400, "Prompt must be 1-8,000 characters.")
    task_id = new_id()
    status = "pending_approval" if data.requiresApproval else "queued"
    model = data.model if data.model and re.fullmatch(r"gpt-[a-z0-9.-]+", data.model) else model_for_agent(data.kind)
    current = now_ts()
    with connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO agent_tasks(id,kind,title,prompt,status,model,source,requires_approval,created_by,created_at,updated_at)
                VALUES(?,?,?,?,?,?,'manual',?,?,?,?)
                """,
                (
                    task_id, data.kind, data.title.strip()[:120], data.prompt.strip(), status, model,
                    1 if data.requiresApproval else 0, user["id"], current, current
                ),
            )
        conn.commit()
    return {"id": task_id, "status": status, "model": model}


@app.post("/v1/agent/tasks/{task_id}/approve")
async def approve_task(task_id: str, request: Request):
    require_admin(request)
    with connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE agent_tasks SET status='queued',approved_at=?,updated_at=? WHERE id=? AND status='pending_approval'",
                (now_ts(), now_ts(), task_id),
            )
            changed = cur.rowcount
        conn.commit()
    if not changed:
        raise HTTPException(409, "Task is not awaiting approval.")
    return {"ok": True, "status": "queued"}


@app.post("/v1/agent/tasks/{task_id}/cancel")
async def cancel_task(task_id: str, request: Request):
    require_admin(request)
    with connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE agent_tasks SET status='cancelled',updated_at=? WHERE id=? AND status IN ('pending_approval','queued')",
                (now_ts(), task_id),
            )
            changed = cur.rowcount
        conn.commit()
    if not changed:
        raise HTTPException(409, "Only pending or queued tasks can be cancelled.")
    return {"ok": True, "status": "cancelled"}


@app.get("/v1/agent/schedules")
async def list_schedules(request: Request):
    require_admin(request)
    with connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id,kind,title,prompt,every_hours,enabled,next_run_at,last_run_at FROM agent_schedules ORDER BY id"
            )
            rows = cur.fetchall()
    return {"schedules": rows}


@app.patch("/v1/agent/schedules/{schedule_id}")
async def patch_schedule(schedule_id: str, request: Request, data: SchedulePatch):
    require_admin(request)
    with connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id,title,prompt,every_hours,enabled FROM agent_schedules WHERE id=?",
                (schedule_id,),
            )
            current_row = cur.fetchone()
            if not current_row:
                raise HTTPException(404, "Schedule not found.")
            enabled = int(data.enabled) if data.enabled is not None else int(current_row["enabled"])
            title = data.title.strip()[:120] if data.title is not None else current_row["title"]
            prompt = data.prompt.strip()[:8000] if data.prompt is not None else current_row["prompt"]
            hours = max(1, min(168, int(data.everyHours))) if data.everyHours is not None else int(current_row["every_hours"])
            next_run = now_ts() + 60 if enabled and not current_row["enabled"] else None
            if next_run:
                cur.execute(
                    """
                    UPDATE agent_schedules
                    SET enabled=?,title=?,prompt=?,every_hours=?,next_run_at=?,updated_at=?
                    WHERE id=?
                    """,
                    (enabled, title, prompt, hours, next_run, now_ts(), schedule_id),
                )
            else:
                cur.execute(
                    """
                    UPDATE agent_schedules
                    SET enabled=?,title=?,prompt=?,every_hours=?,updated_at=?
                    WHERE id=?
                    """,
                    (enabled, title, prompt, hours, now_ts(), schedule_id),
                )
        conn.commit()
    return {"ok": True}


@app.post("/v1/agent/run")
async def run_queue(request: Request):
    require_admin(request)
    await run_agent_scheduler(manual=True)
    return {"ok": True, "message": "Agent queue processed."}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=int(os.getenv("PORT", "10000")))
