// Corporate Banking Academy — Cloudflare Worker
// Serves the built game (static assets) and the API (/api/*) from one deployment,
// with scores and account saves stored in a D1 (SQLite) database.

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  // CORS is open so the GitHub Pages copy (or local dev) can use the same API.
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: JSON_HEADERS });

async function hashPin(pin) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`dcb:${pin}`));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

const validCreds = (name, pin) =>
  typeof name === 'string' && name.trim().length >= 2 && /^\d{4,8}$/.test(String(pin ?? ''));

const accountKey = (name) => String(name).trim().toLowerCase();

async function handleApi(request, env, path) {
  const url = new URL(request.url);

  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: JSON_HEADERS });

  if (path === '/api/health') return json({ ok: true });

  // ---------- leaderboard ----------
  if (path === '/api/scores' && request.method === 'GET') {
    const level = Number(url.searchParams.get('level'));
    const rows = [1, 2, 3, 4].includes(level)
      ? await env.DB.prepare('SELECT name, level, score, grade, date FROM scores WHERE level = ? ORDER BY score DESC LIMIT 20').bind(level).all()
      : await env.DB.prepare('SELECT name, level, score, grade, date FROM scores ORDER BY score DESC LIMIT 20').all();
    return json(rows.results);
  }

  if (path === '/api/scores' && request.method === 'POST') {
    const { name, level, score, grade, date } = await request.json().catch(() => ({}));
    if (typeof name !== 'string' || !name.trim() || ![1, 2, 3, 4].includes(Number(level)) || !Number.isFinite(Number(score))) {
      return json({ error: 'invalid score entry' }, 400);
    }
    await env.DB.prepare('INSERT INTO scores (name, level, score, grade, date) VALUES (?, ?, ?, ?, ?)')
      .bind(
        name.trim().slice(0, 30),
        Number(level),
        Math.round(Number(score)),
        typeof grade === 'string' ? grade.slice(0, 60) : '',
        typeof date === 'string' ? date.slice(0, 10) : new Date().toISOString().slice(0, 10)
      )
      .run();
    return json({ ok: true }, 201);
  }

  // ---------- account saves (cross-device resume) ----------
  if (path === '/api/saves' && request.method === 'PUT') {
    const { name, pin, state } = await request.json().catch(() => ({}));
    if (!validCreds(name, pin)) return json({ error: 'name (2+ chars) and a 4–8 digit pin are required' }, 400);
    const key = accountKey(name);
    const pinHash = await hashPin(pin);
    const existing = await env.DB.prepare('SELECT pin_hash FROM saves WHERE key = ?').bind(key).first();
    if (existing && existing.pin_hash !== pinHash) return json({ error: 'wrong pin for this account name' }, 403);
    const savedAt = Date.now();
    await env.DB.prepare(
      'INSERT INTO saves (key, name, pin_hash, state, saved_at) VALUES (?, ?, ?, ?, ?) ' +
        'ON CONFLICT(key) DO UPDATE SET state = excluded.state, saved_at = excluded.saved_at'
    )
      .bind(key, String(name).trim().slice(0, 30), pinHash, state ? JSON.stringify(state) : null, savedAt)
      .run();
    return json({ ok: true, savedAt });
  }

  if (path === '/api/saves' && request.method === 'GET') {
    const name = url.searchParams.get('name');
    const pin = url.searchParams.get('pin');
    if (!validCreds(name, pin)) return json({ error: 'name and pin query params required' }, 400);
    const row = await env.DB.prepare('SELECT name, pin_hash, state, saved_at FROM saves WHERE key = ?')
      .bind(accountKey(name))
      .first();
    if (!row) return json({ error: 'no account' }, 404);
    if (row.pin_hash !== (await hashPin(pin))) return json({ error: 'wrong pin' }, 403);
    return json({ name: row.name, state: row.state ? JSON.parse(row.state) : null, savedAt: row.saved_at });
  }

  return json({ error: 'not found' }, 404);
}

export default {
  async fetch(request, env) {
    const path = new URL(request.url).pathname;
    if (path.startsWith('/api/')) {
      try {
        return await handleApi(request, env, path);
      } catch (e) {
        return json({ error: 'server error', detail: String(e) }, 500);
      }
    }
    // everything else: the game itself
    return env.ASSETS.fetch(request);
  },
};
