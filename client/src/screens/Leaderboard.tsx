import { useEffect, useState } from 'react';
import { fetchScores, type ScoreEntry } from '../engine/leaderboard';
import { LEVEL_INFO } from '../engine/content';
import { sfx } from '../engine/sfx';

interface Props {
  onBack: () => void;
}

const MEDALS = ['🥇', '🥈', '🥉'];

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
      <div className="card anim-rise">
        <span className="kicker">Hall of Fame</span>
        <h2>High Scores</h2>
        <div className="tabs">
          {([1, 2, 3] as const).map((l) => (
            <button key={l} className={`tab ${level === l ? 'active' : ''}`} onClick={() => { sfx.click(); setLevel(l); }}>
              {LEVEL_INFO[l].title.split('—')[0].trim()}
            </button>
          ))}
        </div>
        {source === 'loading' && <p className="muted">Loading…</p>}
        {source === 'local' && (
          <p className="muted small">Shared leaderboard unreachable — showing scores saved on this device.</p>
        )}
        {source !== 'loading' && scores.length === 0 && (
          <p className="muted empty-board">No scores yet at this level. The top of the board is wide open.</p>
        )}
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
                  <td>{MEDALS[i] ?? i + 1}</td>
                  <td>{s.name}</td>
                  <td className="num">{s.score.toLocaleString()}</td>
                  <td>{s.grade?.split('—')[0]?.trim()}</td>
                  <td className="muted">{s.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <button className="btn primary" onClick={() => { sfx.click(); onBack(); }}>
          Back
        </button>
      </div>
    </div>
  );
}
