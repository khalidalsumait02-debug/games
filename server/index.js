// Shared leaderboard server for the Corporate Banking Academy game.
// Scores are stored in a JSON file (data/scores.json) — no database needed,
// which keeps deployment on an internal network trivial.
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8787;
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'scores.json');

function readScores() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function writeScores(scores) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(scores, null, 2));
}

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/scores', (req, res) => {
  const level = Number(req.query.level);
  let scores = readScores();
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
  const scores = readScores();
  scores.push({
    name: name.trim().slice(0, 30),
    level: Number(level),
    score: Math.round(Number(score)),
    grade: typeof grade === 'string' ? grade.slice(0, 60) : '',
    date: typeof date === 'string' ? date.slice(0, 10) : new Date().toISOString().slice(0, 10),
  });
  scores.sort((a, b) => b.score - a.score);
  writeScores(scores.slice(0, 500));
  res.status(201).json({ ok: true });
});

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`Leaderboard server listening on http://localhost:${PORT}`);
});
