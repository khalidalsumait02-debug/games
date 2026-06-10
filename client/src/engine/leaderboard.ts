import { config } from './content';

export interface ScoreEntry {
  name: string;
  level: number;
  score: number;
  grade: string;
  date: string;
}

const LOCAL_KEY = 'dcb_local_scores';

function localScores(): ScoreEntry[] {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY) ?? '[]') as ScoreEntry[];
  } catch {
    return [];
  }
}

function saveLocal(entry: ScoreEntry) {
  const all = localScores();
  all.push(entry);
  all.sort((a, b) => b.score - a.score);
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(all.slice(0, 100)));
  } catch {
    /* ignore */
  }
}

export async function submitScore(entry: ScoreEntry): Promise<'shared' | 'local'> {
  saveLocal(entry);
  try {
    const res = await fetch(`${config.leaderboardUrl}/api/scores`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry),
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) throw new Error(String(res.status));
    return 'shared';
  } catch {
    return 'local';
  }
}

export async function fetchScores(level: number): Promise<{ source: 'shared' | 'local'; scores: ScoreEntry[] }> {
  try {
    const res = await fetch(`${config.leaderboardUrl}/api/scores?level=${level}`, {
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) throw new Error(String(res.status));
    const scores = (await res.json()) as ScoreEntry[];
    return { source: 'shared', scores };
  } catch {
    return {
      source: 'local',
      scores: localScores()
        .filter((s) => s.level === level)
        .slice(0, 20),
    };
  }
}
