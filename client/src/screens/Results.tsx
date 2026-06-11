import { useEffect, useState } from 'react';
import type { GameState } from '../engine/types';
import { grade } from '../engine/game';
import { submitScore } from '../engine/leaderboard';
import { LEVEL_INFO } from '../engine/content';
import { sfx } from '../engine/sfx';
import CountUp from '../components/CountUp';
import Confetti from '../components/Confetti';

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
  const [copied, setCopied] = useState(false);

  const celebrate = !state.endedEarly && state.score >= 1600;

  useEffect(() => {
    (celebrate ? sfx.fanfare : sfx.month)();
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
  const [gradeShort, gradeTitle] = finalGrade.split('—').map((s) => s.trim());

  const bars = [
    { label: 'Deal structuring', value: state.breakdown.structuring },
    { label: 'SOP & process discipline', value: state.breakdown.process },
    { label: 'Portfolio performance', value: state.breakdown.portfolio },
    { label: 'Bonuses & achievements', value: state.breakdown.bonus },
  ];
  const maxBar = Math.max(1, ...bars.map((b) => Math.abs(b.value)));

  return (
    <div className="results">
      {celebrate && <Confetti />}
      <div className="card anim-rise">
        {state.endedEarly ? (
          <div className="results-head">
            <span className="kicker bad-kicker">Board Intervention</span>
            <h2>The board has reassigned your portfolio</h2>
            <p className="muted">
              Your reputation reached zero. In corporate banking, trust is the license to operate — losing it
              ends campaigns early.
            </p>
          </div>
        ) : (
          <div className="results-head">
            <span className="kicker">Year Closed · {LEVEL_INFO[state.level].title}</span>
            <h2>Annual Performance Review</h2>
          </div>
        )}

        <div className="final-score">
          <span className="score-number">
            <CountUp value={state.score} duration={1600} />
          </span>
          <span className="grade-seal anim-seal">{gradeShort}</span>
          <span className="score-grade">{gradeTitle}</span>
        </div>

        <div className="bars">
          {bars.map((b, i) => (
            <div className="bar-row" key={b.label}>
              <span className="bar-label">{b.label}</span>
              <div className="bar-track">
                <div
                  className={`bar-fill ${b.value < 0 ? 'neg' : ''}`}
                  style={{
                    width: `${(Math.abs(b.value) / maxBar) * 100}%`,
                    animationDelay: `${0.3 + i * 0.15}s`,
                  }}
                />
              </div>
              <span className={`bar-value ${b.value < 0 ? 'neg' : ''}`}>{b.value.toLocaleString()}</span>
            </div>
          ))}
          <div className="bar-row meta">
            <span className="bar-label">Final reputation</span>
            <div className="bar-track">
              <div className="bar-fill rep" style={{ width: `${state.reputation}%`, animationDelay: '0.9s' }} />
            </div>
            <span className="bar-value">{state.reputation}/100</span>
          </div>
          <div className="bar-row meta">
            <span className="bar-label">Non-performing clients</span>
            <div className="bar-track" />
            <span className={`bar-value ${npls > 0 ? 'neg' : ''}`}>{npls}</span>
          </div>
        </div>

        {state.achievements.length > 0 && (
          <div className="achievements">
            {state.achievements.map((a, i) => (
              <span key={a} className="badge achievement anim-pop" style={{ animationDelay: `${1 + i * 0.2}s` }}>
                🏆 {a}
              </span>
            ))}
          </div>
        )}

        <p className="muted small submit-note">
          {submitState === 'sending' && 'Submitting score to the leaderboard…'}
          {submitState === 'shared' && '✓ Score submitted to the shared leaderboard.'}
          {submitState === 'local' &&
            'Shared leaderboard unreachable — score saved on this device (it will still appear in your local rankings).'}
        </p>

        <div className="menu-actions">
          <button className="btn primary big" onClick={() => { sfx.click(); onLeaderboard(); }}>
            🏆 View Leaderboard
          </button>
          <button
            className="btn"
            onClick={() => {
              sfx.click();
              const text = `I scored ${state.score.toLocaleString()} (${gradeShort}) on ${LEVEL_INFO[state.level].title} of the Corporate Banking Academy 🏦 Can you beat it?`;
              navigator.clipboard?.writeText(text).then(
                () => setCopied(true),
                () => setCopied(true)
              );
            }}
          >
            {copied ? '✓ Copied!' : '📋 Share score'}
          </button>
          <button className="btn" onClick={() => { sfx.click(); onMenu(); }}>
            Back to Menu
          </button>
        </div>
      </div>
    </div>
  );
}
