// Shared leaderboard + account-save server for the Corporate Banking Academy game.
// Data is stored in JSON files (data/) — no database needed, which keeps
// deployment on an internal network trivial.
//
// Accounts are lightweight training-game accounts: a display name plus a PIN.
// This is deliberately simple (PINs stored hashed, no rate limiting beyond
// basic checks) — suitable for an internal training leaderboard, not for
// anything sensitive.
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8787;
const DATA_DIR = path.join(__dirname, 'data');
const SCORES_FILE = path.join(DATA_DIR, 'scores.json');
const SAVES_FILE = path.join(DATA_DIR, 'saves.json');

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJson(file, data) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function hashPin(pin) {
  return crypto.createHash('sha256').update(`dcb:${pin}`).digest('hex');
}

function accountKey(name) {
  return String(name).trim().toLowerCase();
}

const app = express();
app.use(cors());
app.use(express.json({ limit: '256kb' }));

// ---------- leaderboard ----------
app.get('/api/scores', (req, res) => {
  const level = Number(req.query.level);
  let scores = readJson(SCORES_FILE, []);
  if ([1, 2, 3].includes(level)) {
    scores = scores.filter((s) => s.level === level);
  }
  scores.sort((a, b) => b.score - a.score);
  res.json(scores.slice(0, 20));
});

app.post('/api/scores', (req, res) => {
  const { name, level, score, grade, date } = req.body ?? {};
  if (
    typeof name !== 'string' ||
    !name.trim() ||
    ![1, 2, 3].includes(Number(level)) ||
    !Number.isFinite(Number(score))
  ) {
    return res.status(400).json({ error: 'invalid score entry' });
  }
  const scores = readJson(SCORES_FILE, []);
  scores.push({
    name: name.trim().slice(0, 30),
    level: Number(level),
    score: Math.round(Number(score)),
    grade: typeof grade === 'string' ? grade.slice(0, 60) : '',
    date: typeof date === 'string' ? date.slice(0, 10) : new Date().toISOString().slice(0, 10),
  });
  scores.sort((a, b) => b.score - a.score);
  writeJson(SCORES_FILE, scores.slice(0, 500));
  res.status(201).json({ ok: true });
});

// ---------- account saves (cross-device resume) ----------
// PUT /api/saves   { name, pin, state }  — create the account on first use, then upsert the save
// GET /api/saves?name=&pin=              — fetch the save (404 if none, 403 on wrong pin)
function validCreds(name, pin) {
  return typeof name === 'string' && name.trim().length >= 2 && /^\d{4,8}$/.test(String(pin ?? ''));
}

app.put('/api/saves', (req, res) => {
  const { name, pin, state } = req.body ?? {};
  if (!validCreds(name, pin)) {
    return res.status(400).json({ error: 'name (2+ chars) and a 4–8 digit pin are required' });
  }
  const saves = readJson(SAVES_FILE, {});
  const key = accountKey(name);
  const existing = saves[key];
  if (existing && existing.pinHash !== hashPin(pin)) {
    return res.status(403).json({ error: 'wrong pin for this account name' });
  }
  saves[key] = {
    name: String(name).trim().slice(0, 30),
    pinHash: hashPin(pin),
    state: state ?? null, // null clears the save (campaign finished)
    savedAt: Date.now(),
  };
  writeJson(SAVES_FILE, saves);
  res.json({ ok: true, savedAt: saves[key].savedAt });
});

app.get('/api/saves', (req, res) => {
  const { name, pin } = req.query;
  if (!validCreds(name, pin)) {
    return res.status(400).json({ error: 'name and pin query params required' });
  }
  const saves = readJson(SAVES_FILE, {});
  const entry = saves[accountKey(name)];
  if (!entry) return res.status(404).json({ error: 'no account' });
  if (entry.pinHash !== hashPin(pin)) return res.status(403).json({ error: 'wrong pin' });
  res.json({ name: entry.name, state: entry.state, savedAt: entry.savedAt });
});

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`Academy server (leaderboard + saves) listening on http://localhost:${PORT}`);
});
