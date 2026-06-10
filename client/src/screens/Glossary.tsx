import { useState } from 'react';
import { collateralTypes, facilities, sopSteps } from '../engine/content';

interface Props {
  onBack: () => void;
}

type Tab = 'cash' | 'noncash' | 'collateral' | 'sop';

export default function Glossary({ onBack }: Props) {
  const [tab, setTab] = useState<Tab>('cash');

  return (
    <div className="glossary">
      <div className="card">
        <h2>Product & SOP Guide</h2>
        <div className="tabs">
          <button className={`tab ${tab === 'cash' ? 'active' : ''}`} onClick={() => setTab('cash')}>
            Cash Facilities
          </button>
          <button className={`tab ${tab === 'noncash' ? 'active' : ''}`} onClick={() => setTab('noncash')}>
            Non-Cash Facilities
          </button>
          <button className={`tab ${tab === 'collateral' ? 'active' : ''}`} onClick={() => setTab('collateral')}>
            Collateral & Security
          </button>
          <button className={`tab ${tab === 'sop' ? 'active' : ''}`} onClick={() => setTab('sop')}>
            The SOP
          </button>
        </div>

        {(tab === 'cash' || tab === 'noncash') && (
          <div className="glossary-list">
            {facilities
              .filter((f) => f.category === tab)
              .map((f) => (
                <div className="glossary-item" key={f.id}>
                  <h3>
                    {f.name} <span className="short">({f.short})</span>
                  </h3>
                  <p>{f.description}</p>
                  <p>
                    <strong>Best for:</strong> {f.bestFor}
                  </p>
                  <p className="warning">
                    <strong>Watch out:</strong> {f.warning}
                  </p>
                </div>
              ))}
          </div>
        )}

        {tab === 'collateral' && (
          <div className="glossary-list">
            {collateralTypes.map((c) => (
              <div className="glossary-item" key={c.id}>
                <h3>{c.name}</h3>
                <p>{c.description}</p>
              </div>
            ))}
          </div>
        )}

        {tab === 'sop' && (
          <div className="glossary-list">
            <p className="muted small">
              Draft process flow v1 — to be reviewed and adjusted by the training team.
            </p>
            <ol className="sop-list">
              {sopSteps.map((s) => (
                <li key={s.id}>
                  <strong>{s.name}</strong>
                  <p>{s.detail}</p>
                </li>
              ))}
            </ol>
          </div>
        )}

        <button className="btn primary" onClick={onBack}>
          Back
        </button>
      </div>
    </div>
  );
}
