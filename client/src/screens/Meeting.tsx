import { useState } from 'react';
import type { MeetingPick, Scenario } from '../engine/types';

interface Props {
  scenario: Scenario;
  level: 1 | 2 | 3;
  onDone: (picks: MeetingPick[]) => void;
}

const STAGE_LABEL: Record<string, string> = {
  structure: 'Structuring decision',
  collateral: 'Security & conditions',
  judgment: 'Credit judgement',
};

const QUALITY_LABEL: Record<string, string> = {
  best: 'Excellent call',
  good: 'Acceptable',
  poor: 'Weak choice',
  bad: 'Serious mistake',
};

export default function Meeting({ scenario, level, onDone }: Props) {
  const [decisionIdx, setDecisionIdx] = useState(0);
  const [picks, setPicks] = useState<MeetingPick[]>([]);
  const [picked, setPicked] = useState<string | null>(null);
  const [showNotes, setShowNotes] = useState(level === 1);

  // shuffle option order once per meeting so answers aren't position-memorisable
  const [shuffledByDecision] = useState(() =>
    scenario.decisions.map((d) => [...d.options].sort(() => Math.random() - 0.5))
  );

  const decision = scenario.decisions[decisionIdx];
  const shuffledOptions = shuffledByDecision[decisionIdx];
  const pickedOption = picked ? decision.options.find((o) => o.id === picked) : null;

  const choose = (optionId: string) => {
    if (picked) return;
    setPicked(optionId);
  };

  const next = () => {
    if (!pickedOption) return;
    const pick: MeetingPick = {
      decisionId: decision.id,
      optionId: pickedOption.id,
      quality: pickedOption.quality,
      consequence: pickedOption.consequence,
      books: pickedOption.books !== false,
    };
    const newPicks = [...picks, pick];
    if (pick.books === false || decisionIdx + 1 >= scenario.decisions.length) {
      onDone(newPicks);
    } else {
      setPicks(newPicks);
      setDecisionIdx(decisionIdx + 1);
      setPicked(null);
    }
  };

  return (
    <div className="meeting">
      <div className="meeting-left">
        <div className="card client-card">
          <h2>{scenario.client.name}</h2>
          <span className="sector">{scenario.client.sector}</span>
          <p className="profile">{scenario.client.profile}</p>
          <blockquote>
            <span className="contact">{scenario.client.contact}:</span> {scenario.request}
          </blockquote>
        </div>

        <div className="card pack-card">
          <div className="pack-header">
            <h3>Analysis Pack</h3>
            {level > 1 && (
              <button className="btn tiny" onClick={() => setShowNotes(!showNotes)}>
                {showNotes ? 'Hide analyst notes' : 'Show analyst notes'}
              </button>
            )}
          </div>
          <table className="figures">
            <tbody>
              {scenario.analysisPack.figures.map((f) => (
                <tr key={f.label}>
                  <td>{f.label}</td>
                  <td className="num">{f.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <h4>Ratios & indicators (pre-computed)</h4>
          <div className="ratios">
            {scenario.analysisPack.ratios.map((r) => (
              <div className="ratio" key={r.label}>
                <div className="ratio-line">
                  <span className="ratio-label">{r.label}</span>
                  <span className="ratio-value">{r.value}</span>
                </div>
                {r.benchmark && <span className="benchmark">{r.benchmark}</span>}
                {r.hint && showNotes && <p className="hint">{r.hint}</p>}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="meeting-right">
        <div className="card decision-card">
          <div className="decision-progress">
            Decision {decisionIdx + 1} of {scenario.decisions.length} · {STAGE_LABEL[decision.stage]}
          </div>
          <h3>{decision.prompt}</h3>
          <div className="options">
            {shuffledOptions.map((o) => {
              const isPicked = picked === o.id;
              const revealClass = picked
                ? isPicked
                  ? `revealed ${o.quality}`
                  : 'dimmed'
                : '';
              return (
                <button
                  key={o.id}
                  className={`option ${revealClass}`}
                  onClick={() => choose(o.id)}
                  disabled={!!picked}
                >
                  <span className="option-label">{o.label}</span>
                  {o.detail && <span className="option-detail">{o.detail}</span>}
                </button>
              );
            })}
          </div>

          {pickedOption && (
            <div className={`feedback ${pickedOption.quality}`}>
              <strong>{QUALITY_LABEL[pickedOption.quality]}.</strong> {pickedOption.feedback}
              <button className="btn primary" onClick={next}>
                {pickedOption.books === false || decisionIdx + 1 >= scenario.decisions.length
                  ? 'Conclude the meeting'
                  : 'Next decision'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
