import { useState } from 'react';
import { collateralTypes, facilities, sopSteps } from '../engine/content';
import { sfx } from '../engine/sfx';

interface Props {
  onBack: () => void;
}

type Tab = 'cash' | 'noncash' | 'collateral' | 'sop';

export default function Glossary({ onBack }: Props) {
  const [tab, setTab] = useState<Tab>('cash');
  const [query, setQuery] = useState('');

  const q = query.trim().toLowerCase();
  const matchFacility = (f: (typeof facilities)[number]) =>
    !q || `${f.name} ${f.short} ${f.description} ${f.bestFor}`.toLowerCase().includes(q);
  const matchCollateral = (c: (typeof collateralTypes)[number]) =>
    !q || `${c.name} ${c.description}`.toLowerCase().includes(q);

  return (
    <div className="glossary">
      <div className="card anim-rise">
        <span className="kicker">Reference</span>
        <h2>Product &amp; SOP Guide</h2>
        <div className="glossary-controls">
          <div className="tabs">
            <button className={`tab ${tab === 'cash' ? 'active' : ''}`} onClick={() => { sfx.click(); setTab('cash'); }}>
              💵 Cash Facilities
            </button>
            <button className={`tab ${tab === 'noncash' ? 'active' : ''}`} onClick={() => { sfx.click(); setTab('noncash'); }}>
              📜 Non-Cash Facilities
            </button>
            <button className={`tab ${tab === 'collateral' ? 'active' : ''}`} onClick={() => { sfx.click(); setTab('collateral'); }}>
              🔐 Collateral &amp; Security
            </button>
            <button className={`tab ${tab === 'sop' ? 'active' : ''}`} onClick={() => { sfx.click(); setTab('sop'); }}>
              🧭 The SOP
            </button>
          </div>
          {tab !== 'sop' && (
            <input
              className="glossary-search"
              placeholder="Search…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          )}
        </div>

        {(tab === 'cash' || tab === 'noncash') && (
          <div className="glossary-list">
            {facilities
              .filter((f) => f.category === tab)
              .filter(matchFacility)
              .map((f) => (
                <div className="glossary-item" key={f.id}>
                  <h3>
                    {f.name} <span className="short">{f.short}</span>
                  </h3>
                  <p>{f.description}</p>
                  <p className="gloss-best">
                    <strong>Best for:</strong> {f.bestFor}
                  </p>
                  <p className="warning">
                    <strong>⚠ Watch out:</strong> {f.warning}
                  </p>
                </div>
              ))}
          </div>
        )}

        {tab === 'collateral' && (
          <div className="glossary-list">
            {collateralTypes.filter(matchCollateral).map((c) => (
              <div className="glossary-item" key={c.id}>
                <h3>{c.name}</h3>
                <p>{c.description}</p>
              </div>
            ))}
          </div>
        )}

        {tab === 'sop' && (
          <div className="glossary-list">
            <p className="muted small">Draft process flow v1 — to be reviewed and adjusted by the training team.</p>
            <ol className="sop-list">
              {sopSteps.map((s, i) => (
                <li key={s.id} className="anim-rise" style={{ animationDelay: `${i * 50}ms` }}>
                  <span className="sop-num">{i + 1}</span>
                  <div>
                    <strong>{s.name}</strong>
                    <p>{s.detail}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        )}

        <button className="btn primary" onClick={() => { sfx.click(); onBack(); }}>
          Back
        </button>
      </div>
    </div>
  );
}
