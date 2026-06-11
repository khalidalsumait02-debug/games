import type { GameState } from '../engine/types';
import { getDeck } from '../engine/content';
import Avatar from '../components/Avatar';
import { sfx } from '../engine/sfx';

interface Props {
  state: GameState;
  onBack: () => void;
}

/** The banker's journal: every key takeaway collected so far this campaign. */
export default function Journal({ state, onBack }: Props) {
  const deck = getDeck(state.level);
  const completed = deck.filter(
    (_, i) => i < state.scenarioIndex || (i === state.scenarioIndex && state.phase !== 'meeting')
  );

  return (
    <div className="journal">
      <div className="card anim-rise">
        <span className="kicker">Your Journal</span>
        <h2>Lessons from the desk</h2>
        <p className="muted">
          One takeaway per client — {completed.length} of {deck.length} collected this campaign.
        </p>
        {completed.length === 0 && (
          <p className="muted">Nothing here yet. Lessons appear after each client meeting is processed.</p>
        )}
        <div className="journal-list">
          {completed.map((s, i) => (
            <div className="journal-item anim-rise" key={s.id} style={{ animationDelay: `${i * 60}ms` }}>
              <Avatar name={s.client.name} size={40} />
              <div>
                <strong>{s.client.name}</strong>
                <span className="journal-sector">{s.client.sector}</span>
                <p>{s.learn}</p>
              </div>
            </div>
          ))}
        </div>
        <button className="btn primary" onClick={() => { sfx.click(); onBack(); }}>
          Back to the desk ▸
        </button>
      </div>
    </div>
  );
}
