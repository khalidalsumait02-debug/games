import { useState } from 'react';
import { LEVEL_INFO, config } from '../engine/content';
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
    onStart(trimmed, level);
  };

  return (
    <div className="menu">
      <div className="menu-hero">
        <div className="bank-mark">{config.bankShort}</div>
        <h1>{config.bankName}</h1>
        <p className="tagline">{config.tagline}</p>
        <p className="menu-intro">
          You are a Relationship Manager in Corporate Banking. Over a {config.campaignMonths}-month campaign you will meet
          clients, read their analysis packs, structure cash and non-cash facilities, walk every deal through the SOP —
          and live with the consequences of your decisions. Your progress saves automatically; close the game any time
          and resume where you left off.
        </p>
      </div>

      {savedGame && (
        <div className="resume-card">
          <div>
            <strong>Campaign in progress</strong>
            <span>
              {savedGame.playerName} · {LEVEL_INFO[savedGame.level].title} · Month {savedGame.month}
            </span>
          </div>
          <button className="btn primary" onClick={onResume}>
            Resume
          </button>
        </div>
      )}

      <div className="menu-form">
        <label htmlFor="player-name">Your name (for the leaderboard)</label>
        <input
          id="player-name"
          value={name}
          maxLength={30}
          placeholder="e.g. Khalid"
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && start()}
        />

        <div className="level-grid">
          {([1, 2, 3] as const).map((l) => (
            <button
              key={l}
              className={`level-card ${level === l ? 'selected' : ''}`}
              onClick={() => setLevel(l)}
            >
              <h3>{LEVEL_INFO[l].title}</h3>
              <span className="audience">{LEVEL_INFO[l].audience}</span>
              <p>{LEVEL_INFO[l].blurb}</p>
            </button>
          ))}
        </div>

        <div className="menu-actions">
          <button className="btn primary big" onClick={start} disabled={!name.trim()}>
            Start Campaign
          </button>
          <button className="btn" onClick={onLeaderboard}>
            Leaderboard
          </button>
          <button className="btn" onClick={onGlossary}>
            Product & SOP Guide
          </button>
        </div>
      </div>

      <p className="disclaimer">
        Training simulation with a fictional bank and fictional clients. Product terms and SOP content are draft
        material for review by the training team — edit them in <code>src/data/</code>.
      </p>
    </div>
  );
}
