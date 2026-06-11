import { useEffect } from 'react';
import type { GameState } from '../engine/types';
import { config, formatKD } from '../engine/content';
import { sfx } from '../engine/sfx';
import CountUp from '../components/CountUp';

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
  news: '📰',
};

function managerNote(state: GameState): string | null {
  if (state.month % 3 !== 0) return null;
  const npls = state.deals.filter((d) => d.status === 'npl').length;
  const watch = state.deals.filter((d) => d.status === 'watch').length;
  if (npls > 0)
    return `"We need to talk about the ${npls} non-performing ${npls === 1 ? 'name' : 'names'} on your book. Provisions are eating the division's quarter — committee wants your recovery plan in writing."`;
  if (state.reputation >= 85)
    return '"The committee has started using your files as the example. Keep underwriting like this and we should talk about your portfolio growing."';
  if (state.reputation >= 60)
    return watch > 0
      ? `"Decent quarter. Keep your eye on the watchlist — ${watch} ${watch === 1 ? 'name' : 'names'} there now, and watchlists have a way of growing teeth."`
      : '"Decent quarter. Clean book, steady income. Now show me you can do it under pressure."';
  if (state.reputation >= 35)
    return '"I\'ve had questions from upstairs about some of your structures. Tighten up — the year is long and audit is patient."';
  return '"Honestly? The board is asking whether you\'re right for this desk. The next quarter decides it."';
}

export default function MonthEnd({ state, onContinue }: Props) {
  const statusLabel: Record<string, string> = {
    performing: 'Performing',
    watch: 'Watchlist',
    npl: 'Non-performing',
  };

  useEffect(() => {
    if (state.monthEvents.some((e) => e.kind === 'npl')) sfx.bad();
    else if (state.monthEvents.some((e) => e.points > 0)) sfx.cash();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const monthPoints = state.monthEvents.reduce((a, e) => a + e.points, 0);
  const bookSize = state.deals.filter((d) => d.status !== 'npl').reduce((a, d) => a + d.sizeKD, 0);
  const note = managerNote(state);

  return (
    <div className="monthend">
      <div className="card anim-rise">
        <div className="monthend-head">
          <div>
            <span className="kicker">Portfolio Report</span>
            <h2>Month {state.month}</h2>
          </div>
          <div className="kpis">
            <div className="kpi">
              <span className="kpi-label">Month P&amp;L</span>
              <span className={`kpi-value ${monthPoints >= 0 ? 'pos' : 'neg'}`}>
                {monthPoints >= 0 ? '+' : ''}
                <CountUp value={monthPoints} />
              </span>
            </div>
            <div className="kpi">
              <span className="kpi-label">Book</span>
              <span className="kpi-value">{formatKD(bookSize)}</span>
            </div>
            <div className="kpi">
              <span className="kpi-label">Reputation</span>
              <span className="kpi-value">
                <CountUp value={state.reputation} />
                <small>/100</small>
              </span>
            </div>
          </div>
        </div>

        <div className="events">
          {state.monthEvents.length === 0 && <p className="muted">A quiet month on the desk.</p>}
          {state.monthEvents.map((e, i) => (
            <div key={i} className={`event anim-rise ${e.kind}`} style={{ animationDelay: `${i * 90}ms` }}>
              <span className="icon">{KIND_ICON[e.kind]}</span>
              <span className="text">{e.text}</span>
              <span className={`pts ${e.points >= 0 ? 'pos' : 'neg'}`}>
                {e.points >= 0 ? '+' : ''}
                {e.points}
              </span>
            </div>
          ))}
        </div>

        {note && (
          <div className="manager-note anim-rise">
            <span className="manager-avatar">👔</span>
            <div>
              <span className="manager-kicker">Quarterly review · Head of Corporate Banking</span>
              <p>{note}</p>
            </div>
          </div>
        )}

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
                    <td className="muted">{d.summary}</td>
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

        <button className="btn primary big" onClick={() => { sfx.click(); onContinue(); }}>
          {state.month >= config.campaignMonths ? 'Close the year ▸' : `Start month ${state.month + 1} ▸`}
        </button>
      </div>
    </div>
  );
}
