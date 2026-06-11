import { useState } from 'react';
import { LEVEL_INFO, config } from '../engine/content';
import { sfx } from '../engine/sfx';
import type { GameState } from '../engine/types';
import type { Profile } from '../engine/profiles';

interface Props {
  profiles: Profile[];
  activeProfile: Profile | null;
  savedGame: GameState | null;
  onSelectProfile: (id: string) => void;
  onCreateProfile: (name: string, pin?: string) => void;
  onDeleteProfile: (id: string) => void;
  onStart: (level: 1 | 2 | 3 | 4) => void;
  onResume: () => void;
  onLeaderboard: () => void;
  onGlossary: () => void;
}

export default function Menu({
  profiles,
  activeProfile,
  savedGame,
  onSelectProfile,
  onCreateProfile,
  onDeleteProfile,
  onStart,
  onResume,
  onLeaderboard,
  onGlossary,
}: Props) {
  const [level, setLevel] = useState<1 | 2 | 3 | 4>(1);
  const [creating, setCreating] = useState(profiles.length === 0);
  const [newName, setNewName] = useState('');
  const [newPin, setNewPin] = useState('');

  const create = () => {
    const name = newName.trim();
    if (!name) return;
    const pin = newPin.trim();
    if (pin && !/^\d{4,8}$/.test(pin)) return;
    sfx.click();
    onCreateProfile(name, pin || undefined);
    setNewName('');
    setNewPin('');
    setCreating(false);
  };

  const start = () => {
    if (!activeProfile) return;
    sfx.fanfare();
    onStart(level);
  };

  const bestLine = (p: Profile) => {
    const bests = ([1, 2, 3, 4] as const)
      .filter((l) => p.best[l] !== undefined)
      .map((l) => `L${l} ${p.best[l]!.toLocaleString()}`);
    return bests.length > 0 ? `Best: ${bests.join(' · ')}` : 'No campaigns finished yet';
  };

  return (
    <div className="menu">
      <div className="menu-panel anim-rise">
        <h1>{config.tagline}</h1>
        <p className="menu-sub">A relationship-manager training simulation</p>
        <p className="menu-intro">
          Meet a client each month. Structure the right facility, run the deal through the bank's process,
          and keep your portfolio healthy across a {config.campaignMonths}-month campaign. Progress saves
          automatically to your account — leave anytime.
        </p>

        <div className="field-label">Account</div>
        <div className="account-row">
          {profiles.map((p) => (
            <div key={p.id} className={`account-card ${activeProfile?.id === p.id ? 'selected' : ''}`}>
              <button className="account-main" onClick={() => { sfx.click(); onSelectProfile(p.id); }}>
                <strong>{p.name}</strong>
                <span>{bestLine(p)}</span>
                {p.pin && <span className="sync-tag">sync on</span>}
              </button>
              <button
                className="account-delete"
                title="Delete this account on this device"
                onClick={() => {
                  if (window.confirm(`Delete the account "${p.name}" and its save on this device?`)) {
                    onDeleteProfile(p.id);
                  }
                }}
              >
                ×
              </button>
            </div>
          ))}
          {!creating && (
            <button className="account-card new" onClick={() => { sfx.click(); setCreating(true); }}>
              + New account
            </button>
          )}
        </div>

        {creating && (
          <div className="account-form anim-rise">
            <input
              value={newName}
              maxLength={30}
              placeholder="Your name — shown on the leaderboard"
              autoComplete="off"
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && create()}
            />
            <input
              value={newPin}
              maxLength={8}
              inputMode="numeric"
              placeholder="PIN (4–8 digits, optional)"
              autoComplete="off"
              onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
              onKeyDown={(e) => e.key === 'Enter' && create()}
            />
            <button className="btn primary" onClick={create} disabled={!newName.trim() || (!!newPin && !/^\d{4,8}$/.test(newPin))}>
              Create account
            </button>
            {profiles.length > 0 && (
              <button className="btn" onClick={() => setCreating(false)}>
                Cancel
              </button>
            )}
            <p className="muted small account-note">
              The PIN lets the same account resume its campaign from another device when the shared server is
              connected. Without one, progress stays on this device.
            </p>
          </div>
        )}

        <div className="field-label">Choose your level</div>
        <div className="level-grid">
          {([1, 2, 3, 4] as const).map((l) => (
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
          <button className="btn primary big" onClick={start} disabled={!activeProfile}>
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
