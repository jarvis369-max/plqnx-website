import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const origin = 'https://jarvis369-max.github.io';
const conversationId = '11111111-1111-1111-1111-111111111111';
const token = 'a'.repeat(64);

async function workerFromFile(name) {
  const source = await readFile(new URL(name, import.meta.url), 'utf8');
  return (await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`)).default;
}

function database() {
  const state = { requests: 24, messages: [] };
  return {
    state,
    prepare(sql) {
      let args;
      return {
        bind(...values) { args = values; return this; },
        async first() {
          if (sql.includes('FROM sessions JOIN users')) return { id: 'user-1', username: 'tester' };
          if (sql.includes('FROM conversations WHERE id=')) return { id: conversationId, title: 'New chat' };
          if (sql.startsWith('INSERT INTO daily_usage')) {
            if (state.requests >= 25) return null;
            return { requests: ++state.requests };
          }
          throw Error(`Unexpected first query: ${sql}`);
        },
        async all() {
          if (sql.includes('FROM messages WHERE conversation_id=')) return { results: [] };
          throw Error(`Unexpected all query: ${sql}`);
        },
        async run() {
          if (sql.startsWith('UPDATE daily_usage')) { state.requests = Math.max(0, state.requests - 1); return; }
          if (sql.startsWith('INSERT INTO messages')) { state.messages.push(args); return; }
          if (sql.startsWith('UPDATE conversations')) return;
          throw Error(`Unexpected run query: ${sql}`);
        }
      };
    },
    async batch(statements) { for (const statement of statements) await statement.run(); }
  };
}

async function chat(worker, env) {
  return worker.fetch(new Request('https://example.workers.dev/v1/chat', {
    method: 'POST',
    headers: { Origin: origin, Authorization: `Bearer ${token}` },
    body: JSON.stringify({ conversationId, message: 'Hello' })
  }), env);
}

test('Workers AI failure refunds quota; the next successful message uses the last slot', async () => {
  const worker = await workerFromFile('worker-v5-workers-ai.js');
  const DB = database();
  const env = { DB, BETA_ACCESS_CODE: 'test-code', AI: { run: async () => { throw Error('upstream down'); } } };
  const failed = await chat(worker, env);
  assert.equal(failed.status, 502);
  assert.equal(DB.state.requests, 24);
  assert.equal(DB.state.messages.length, 0);

  env.AI.run = async () => ({ response: 'Hello back' });
  const succeeded = await chat(worker, env);
  assert.equal(succeeded.status, 200);
  assert.equal((await succeeded.json()).remainingToday, 0);
  assert.equal(DB.state.requests, 25);
  assert.equal(DB.state.messages.length, 2);
  assert.equal((await chat(worker, env)).status, 429);
});

test('Gemini v5 failure also refunds quota', async () => {
  const worker = await workerFromFile('worker-v5.js');
  const DB = database();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response('{}', { status: 503 });
  try {
    const failed = await chat(worker, { DB, BETA_ACCESS_CODE: 'test-code', GEMINI_API_KEY: 'test-key' });
    assert.equal(failed.status, 502);
    assert.equal(DB.state.requests, 24);
    assert.equal(DB.state.messages.length, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
