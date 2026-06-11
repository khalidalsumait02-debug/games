import { useState } from 'react';
import { LEVEL_INFO, config } from '../engine/content';
import { sfx } from '../engine/sfx';
import type { GameState } from '../engine/types';

interface Props {
  savedGame: GameState | null;
  onStart: (name: string, level: 1 | 2 | 3) => void;
  onResume: () => void;
  onLeaderboard: () => void;
  onGlossary: () => void;
}

export default function Menu({ savedGame, onStart, onResume, onLeaderboard, onGlossary }: Props) {
  const [name, setName] = useState(localStorage.getItem('dcb_player_name') ?? '');
  const [level, setLevel] = useState<1 | 2 | 3>(1);

  const start = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    localStorage.setItem('dcb_player_name', trimmed);
    sfx.fanfare();
    onStart(trimmed, level);
  };

  return (
    <div className="menu">
      <div className="menu-panel anim-rise">
        <h1>{config.tagline}</h1>
        <p className="menu-sub">A relationship-manager training simulation</p>
        <p className="menu-intro">
          Meet a client each month. Structure the right facility, run the deal through the bank's process,
          and keep your portfolio healthy across a {config.campaignMonths}-month campaign. Progress saves
          automatically — leave anytime.
        </p>

        <label className="field-label" htmlFor="player-name">
          Your name — for the leaderboard
        </label>
        <input
          id="player-name"
          value={name}
          maxLength={30}
          placeholder="e.g. Sara Al-Sabah"
          autoComplete="off"
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && start()}
        />

        <div className="field-label">Choose your level</div>
        <div className="level-grid">
          {([1, 2, 3] as const).map((l) => (
            <button
              key={l}
              className={`level-card ${level === l ? 'selected' : ''}`}
              onClick={() => { sfx.click(); setLevel(l); }}
            >
              <span className="level-tag-label">Level {l}</span>
              {level === l && <span className="level-check">✓</span>}
              <h3>{LEVEL_INFO[l].name}</h3>
              <span className="audience">{LEVEL_INFO[l].audience}</span>
              <p>{LEVEL_INFO[l].blurb}</p>
            </button>
          ))}
        </div>

        <div className="menu-actions">
          <button className="btn primary big" onClick={start} disabled={!name.trim()}>
            Start campaign
          </button>
          {savedGame && (
            <button className="btn resume" onClick={() => { sfx.click(); onResume(); }}>
              <strong>Resume saved campaign</strong>
              <span>
                Month {savedGame.month} · {LEVEL_INFO[savedGame.level].name} ·{' '}
                {savedGame.score.toLocaleString()} pts
              </span>
            </button>
          )}
          <span className="kbd-hint">
            Fully keyboard playable — <kbd>1</kbd>–<kbd>4</kbd> to choose, <kbd>Enter</kbd> to confirm
          </span>
        </div>

        <div className="menu-links">
          <button className="btn" onClick={() => { sfx.click(); onLeaderboard(); }}>
            Leaderboard
          </button>
          <button className="btn" onClick={() => { sfx.click(); onGlossary(); }}>
            Reference guide
          </button>
        </div>
      </div>

      <p className="disclaimer">
        Internal training simulation · all clients and figures are fictional · content is draft material for
        the training team to review — edit it in <code>src/data/</code>
      </p>
    </div>
  );
}
