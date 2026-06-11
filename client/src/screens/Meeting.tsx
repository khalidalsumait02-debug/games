import { useEffect, useState } from 'react';
import type { MeetingPick, Scenario } from '../engine/types';
import { QUALITY_POINTS } from '../engine/game';
import { sfx } from '../engine/sfx';
import Avatar from '../components/Avatar';

interface Props {
  scenario: Scenario;
  level: 1 | 2 | 3;
  onDone: (picks: MeetingPick[]) => void;
}

const STAGE_LABEL: Record<string, string> = {
  structure: 'Structuring',
  collateral: 'Security & Conditions',
  judgment: 'Credit Judgement',
};

const QUALITY_LABEL: Record<string, string> = {
  best: 'Excellent call',
  good: 'Acceptable',
  poor: 'Weak choice',
  bad: 'Serious mistake',
};

function useTypewriter(text: string) {
  const [n, setN] = useState(0);
  useEffect(() => {
    const id = setInterval(() => {
      setN((v) => {
        if (v >= text.length) {
          clearInterval(id);
          return v;
        }
        return v + 3;
      });
    }, 18);
    return () => clearInterval(id);
  }, [text]);
  return {
    shown: text.slice(0, n),
    done: n >= text.length,
    skip: () => setN(text.length),
  };
}

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
  const quote = useTypewriter(scenario.request);

  const choose = (optionId: string) => {
    if (picked) return;
    const opt = decision.options.find((o) => o.id === optionId)!;
    sfx[opt.quality]();
    setPicked(optionId);
  };

  const next = () => {
    if (!pickedOption) return;
    sfx.click();
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
        <div className="card client-card anim-rise">
          <div className="client-head">
            <Avatar name={scenario.client.name} />
            <div>
              <h2>{scenario.client.name}</h2>
              <span className="sector">{scenario.client.sector}</span>
            </div>
          </div>
          <p className="profile">{scenario.client.profile}</p>
          <blockquote onClick={quote.skip} className={quote.done ? '' : 'typing'}>
            <span className="contact">{scenario.client.contact}</span>
            {quote.shown}
            {!quote.done && <span className="caret" />}
          </blockquote>
        </div>

        <div className="card pack-card anim-rise d1">
          <div className="pack-header">
            <h3>
              <span className="pack-icon">📊</span> Analysis Pack
            </h3>
            {level > 1 && (
              <button className="btn tiny" onClick={() => { sfx.click(); setShowNotes(!showNotes); }}>
                {showNotes ? 'Hide analyst notes' : '💡 Analyst notes'}
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
          <h4>Ratios &amp; indicators · pre-computed</h4>
          <div className="ratios">
            {scenario.analysisPack.ratios.map((r) => (
              <div className="ratio" key={r.label}>
                <div className="ratio-line">
                  <span className="ratio-label">{r.label}</span>
                  <span className="ratio-value">{r.value}</span>
                </div>
                {r.benchmark && <span className="benchmark">{r.benchmark}</span>}
                {r.hint && showNotes && <p className="hint">💡 {r.hint}</p>}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="meeting-right">
        <div className="card decision-card anim-rise d2" key={decisionIdx}>
          <div className="stage-chips">
            {scenario.decisions.map((d, i) => (
              <span
                key={d.id}
                className={`stage-chip ${i < decisionIdx ? 'done' : ''} ${i === decisionIdx ? 'active' : ''}`}
              >
                {i < decisionIdx ? '✓ ' : ''}
                {STAGE_LABEL[d.stage]}
              </span>
            ))}
          </div>
          <h3 className="decision-prompt">{decision.prompt}</h3>
          <div className="options">
            {shuffledOptions.map((o, i) => {
              const isPicked = picked === o.id;
              const revealClass = picked ? (isPicked ? `revealed ${o.quality}` : 'dimmed') : '';
              return (
                <button
                  key={o.id}
                  className={`option anim-rise ${revealClass}`}
                  style={{ animationDelay: `${i * 60}ms` }}
                  onClick={() => choose(o.id)}
                  disabled={!!picked}
                >
                  <span className="option-key">{String.fromCharCode(65 + i)}</span>
                  <span className="option-body">
                    <span className="option-label">{o.label}</span>
                    {o.detail && <span className="option-detail">{o.detail}</span>}
                  </span>
                </button>
              );
            })}
          </div>

          {pickedOption && (
            <div className={`feedback anim-pop ${pickedOption.quality}`}>
              <div className="feedback-head">
                <strong>{QUALITY_LABEL[pickedOption.quality]}</strong>
                <span className={`pts-badge ${pickedOption.quality}`}>
                  +{QUALITY_POINTS[pickedOption.quality]} pts
                </span>
              </div>
              <p>{pickedOption.feedback}</p>
              <button className="btn primary" onClick={next}>
                {pickedOption.books === false || decisionIdx + 1 >= scenario.decisions.length
                  ? 'Conclude the meeting ▸'
                  : 'Next decision ▸'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
