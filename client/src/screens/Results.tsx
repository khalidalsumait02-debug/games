import { useEffect, useState } from 'react';
import type { GameState } from '../engine/types';
import { grade } from '../engine/game';
import { submitScore } from '../engine/leaderboard';
import { LEVEL_INFO } from '../engine/content';

interface Props {
  state: GameState;
  onMenu: () => void;
  onLeaderboard: () => void;
}

export default function Results({ state, onMenu, onLeaderboard }: Props) {
  const finalGrade = grade(state.score, state.level);
  const guardKey = `dcb_submitted_${state.playerName}_${state.level}_${state.score}`;
  // guard against double submission (StrictMode remounts, back-navigation)
  const [submitState, setSubmitState] = useState<'sending' | 'shared' | 'local'>(() =>
    sessionStorage.getItem(guardKey) ? 'shared' : 'sending'
  );

  useEffect(() => {
    if (sessionStorage.getItem(guardKey)) return;
    sessionStorage.setItem(guardKey, '1');
    let cancelled = false;
    submitScore({
      name: state.playerName,
      level: state.level,
      score: state.score,
      grade: finalGrade,
      date: new Date().toISOString().slice(0, 10),
    }).then((r) => {
      if (!cancelled) setSubmitState(r);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const npls = state.deals.filter((d) => d.status === 'npl').length;

  return (
    <div className="results">
      <div className="card">
        {state.endedEarly ? (
          <>
            <h2>Board Intervention</h2>
            <p className="muted">
              Your reputation reached zero and the board reassigned your portfolio. In corporate banking, trust is the
              license to operate — losing it ends campaigns early.
            </p>
          </>
        ) : (
          <h2>Year Closed — {LEVEL_INFO[state.level].title}</h2>
        )}

        <div className="final-score">
          <span className="score-number">{state.score.toLocaleString()}</span>
          <span className="score-grade">{finalGrade}</span>
        </div>

        <table className="breakdown">
          <tbody>
            <tr>
              <td>Deal structuring</td>
              <td className="num">{state.breakdown.structuring.toLocaleString()}</td>
            </tr>
            <tr>
              <td>SOP & process discipline</td>
              <td className="num">{state.breakdown.process.toLocaleString()}</td>
            </tr>
            <tr>
              <td>Portfolio performance</td>
              <td className="num">{state.breakdown.portfolio.toLocaleString()}</td>
            </tr>
            <tr>
              <td>Bonuses & achievements</td>
              <td className="num">{state.breakdown.bonus.toLocaleString()}</td>
            </tr>
            <tr>
              <td>Final reputation</td>
              <td className="num">{state.reputation}/100</td>
            </tr>
            <tr>
              <td>Non-performing clients</td>
              <td className="num">{npls}</td>
            </tr>
          </tbody>
        </table>

        {state.achievements.length > 0 && (
          <div className="achievements">
            {state.achievements.map((a) => (
              <span key={a} className="badge achievement">
                🏆 {a}
              </span>
            ))}
          </div>
        )}

        <p className="muted small">
          {submitState === 'sending' && 'Submitting score to the leaderboard…'}
          {submitState === 'shared' && 'Score submitted to the shared leaderboard.'}
          {submitState === 'local' &&
            'Shared leaderboard unreachable — score saved on this device (it will still appear in your local rankings).'}
        </p>

        <div className="menu-actions">
          <button className="btn primary big" onClick={onLeaderboard}>
            View Leaderboard
          </button>
          <button className="btn" onClick={onMenu}>
            Back to Menu
          </button>
        </div>
      </div>
    </div>
  );
}
