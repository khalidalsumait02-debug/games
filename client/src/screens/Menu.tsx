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

const LEVEL_ICONS: Record<number, string> = { 1: '🌱', 2: '📐', 3: '🦅' };
const LEVEL_PIPS: Record<number, number> = { 1: 1, 2: 2, 3: 3 };

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
      <div className="menu-hero anim-rise">
        <div className="emblem">
          <span className="emblem-mark">{config.bankShort}</span>
          <span className="emblem-ring" />
        </div>
        <h1>{config.bankName}</h1>
        <p className="tagline">{config.tagline}</p>
        <p className="menu-intro">
          Take the Relationship Manager's chair. Read real analysis packs, structure cash &amp; non-cash
          facilities, run every deal through the SOP — and answer for the consequences.
        </p>
        <div className="menu-features">
          <span>🤝 8 client meetings</span>
          <span>📋 SOP &amp; documentation drills</span>
          <span>📈 A living portfolio</span>
          <span>🏆 Cohort leaderboard</span>
        </div>
      </div>

      {savedGame && (
        <div className="resume-card anim-rise d1">
          <div>
            <strong>Campaign in progress</strong>
            <span>
              {savedGame.playerName} · {LEVEL_INFO[savedGame.level].title} · Month {savedGame.month} ·{' '}
              {savedGame.score.toLocaleString()} pts
            </span>
          </div>
          <button className="btn primary" onClick={() => { sfx.click(); onResume(); }}>
            Resume ▸
          </button>
        </div>
      )}

      <div className="menu-form anim-rise d2">
        <label htmlFor="player-name">Banker name — as it will appear on the leaderboard</label>
        <input
          id="player-name"
          value={name}
          maxLength={30}
          placeholder="e.g. Khalid"
          autoComplete="off"
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && start()}
        />

        <div className="level-grid">
          {([1, 2, 3] as const).map((l) => (
            <button
              key={l}
              className={`level-card ${level === l ? 'selected' : ''}`}
              onClick={() => { sfx.click(); setLevel(l); }}
            >
              <div className="level-head">
                <span className="level-icon">{LEVEL_ICONS[l]}</span>
                <span className="level-pips">
                  {[1, 2, 3].map((p) => (
                    <i key={p} className={p <= LEVEL_PIPS[l] ? 'on' : ''} />
                  ))}
                </span>
              </div>
              <h3>{LEVEL_INFO[l].title}</h3>
              <span className="audience">{LEVEL_INFO[l].audience}</span>
              <p>{LEVEL_INFO[l].blurb}</p>
            </button>
          ))}
        </div>

        <div className="menu-actions">
          <button className="btn primary big glow" onClick={start} disabled={!name.trim()}>
            Start Campaign ▸
          </button>
          <button className="btn" onClick={() => { sfx.click(); onLeaderboard(); }}>
            🏆 Leaderboard
          </button>
          <button className="btn" onClick={() => { sfx.click(); onGlossary(); }}>
            📖 Product &amp; SOP Guide
          </button>
        </div>
      </div>

      <div className="howto anim-rise d3">
        <div className="howto-step">
          <span className="howto-num">1</span>
          <div>
            <strong>Meet the client</strong>
            <p>Every ratio is pre-computed. Your job is judgement: what to give, and how much.</p>
          </div>
        </div>
        <div className="howto-step">
          <span className="howto-num">2</span>
          <div>
            <strong>Run the process</strong>
            <p>Sequence the SOP, complete the file, catch what audit would catch — before audit does.</p>
          </div>
        </div>
        <div className="howto-step">
          <span className="howto-num">3</span>
          <div>
            <strong>Live with your book</strong>
            <p>Sound structures earn quietly. Weak ones come back — as watchlists, calls and write-offs.</p>
          </div>
        </div>
      </div>

      <p className="disclaimer">
        Internal training simulation · all clients and figures are fictional · content is draft material for
        the training team to review — edit it in <code>src/data/</code>
      </p>
    </div>
  );
}
