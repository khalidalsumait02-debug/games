import { useEffect, useState } from 'react';
import { fetchScores, type ScoreEntry } from '../engine/leaderboard';
import { LEVEL_INFO } from '../engine/content';

interface Props {
  onBack: () => void;
}

export default function Leaderboard({ onBack }: Props) {
  const [level, setLevel] = useState<1 | 2 | 3>(1);
  const [data, setData] = useState<{ level: number; source: 'shared' | 'local'; scores: ScoreEntry[] } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchScores(level).then((r) => {
      if (!cancelled) setData({ level, ...r });
    });
    return () => {
      cancelled = true;
    };
  }, [level]);

  const loaded = data && data.level === level ? data : null;
  const source: 'shared' | 'local' | 'loading' = loaded ? loaded.source : 'loading';
  const scores = loaded ? loaded.scores : [];

  return (
    <div className="leaderboard">
      <div className="card">
        <h2>High Scores</h2>
        <div className="tabs">
          {([1, 2, 3] as const).map((l) => (
            <button key={l} className={`tab ${level === l ? 'active' : ''}`} onClick={() => setLevel(l)}>
              {LEVEL_INFO[l].title.split('—')[0].trim()}
            </button>
          ))}
        </div>
        {source === 'loading' && <p className="muted">Loading…</p>}
        {source === 'local' && (
          <p className="muted small">Shared leaderboard unreachable — showing scores saved on this device.</p>
        )}
        {source !== 'loading' && scores.length === 0 && <p className="muted">No scores yet. Be the first.</p>}
        {scores.length > 0 && (
          <table className="scores">
            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Score</th>
                <th>Grade</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {scores.map((s, i) => (
                <tr key={i} className={i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : ''}>
                  <td>{i + 1}</td>
                  <td>{s.name}</td>
                  <td className="num">{s.score.toLocaleString()}</td>
                  <td>{s.grade?.split('—')[0]?.trim()}</td>
                  <td>{s.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <button className="btn primary" onClick={onBack}>
          Back
        </button>
      </div>
    </div>
  );
}
