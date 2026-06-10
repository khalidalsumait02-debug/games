import type { GameState } from '../engine/types';
import { config, formatKD } from '../engine/content';

interface Props {
  state: GameState;
  onContinue: () => void;
}

const KIND_ICON: Record<string, string> = {
  income: '💰',
  watch: '⚠️',
  npl: '🔴',
  audit: '📋',
  lost: '🚪',
  info: '✦',
  achievement: '🏆',
};

export default function MonthEnd({ state, onContinue }: Props) {
  const statusLabel: Record<string, string> = {
    performing: 'Performing',
    watch: 'Watchlist',
    npl: 'Non-performing',
  };

  return (
    <div className="monthend">
      <div className="card">
        <h2>Month {state.month} — Portfolio Report</h2>

        <div className="events">
          {state.monthEvents.length === 0 && <p className="muted">A quiet month on the desk.</p>}
          {state.monthEvents.map((e, i) => (
            <div key={i} className={`event ${e.kind}`}>
              <span className="icon">{KIND_ICON[e.kind]}</span>
              <span className="text">{e.text}</span>
              <span className={`pts ${e.points >= 0 ? 'pos' : 'neg'}`}>
                {e.points >= 0 ? '+' : ''}
                {e.points}
              </span>
            </div>
          ))}
        </div>

        {state.deals.length > 0 && (
          <>
            <h3>Your book</h3>
            <table className="portfolio">
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Facilities</th>
                  <th>Exposure</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {state.deals.map((d) => (
                  <tr key={d.scenarioId} className={`status-${d.status}`}>
                    <td>{d.clientName}</td>
                    <td>{d.summary}</td>
                    <td className="num">{formatKD(d.sizeKD)}</td>
                    <td>
                      <span className={`badge ${d.status}`}>{statusLabel[d.status]}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        <button className="btn primary big" onClick={onContinue}>
          {state.month >= config.campaignMonths ? 'Close the year' : `Start month ${state.month + 1}`}
        </button>
      </div>
    </div>
  );
}
