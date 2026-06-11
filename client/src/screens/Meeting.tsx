import { useEffect, useState } from 'react';
import type { MeetingPick, Scenario } from '../engine/types';
import { QUALITY_POINTS } from '../engine/game';
import { sfx } from '../engine/sfx';
import Avatar from '../components/Avatar';

interface Props {
  scenario: Scenario;
  level: 1 | 2 | 3;
  isFirstMeeting?: boolean;
  onDone: (picks: MeetingPick[]) => void;
}

const REACTIONS: Record<string, string[]> = {
  best: [
    '{c} leans back, visibly relieved. "This is exactly why we bank with you."',
    '{c} nods slowly. "You actually read our numbers. Most bankers don\'t."',
    '{c} smiles. "Sold. Send me the offer letter."',
  ],
  good: [
    '{c} considers it, then nods. "Workable. Not what I imagined, but workable."',
    '{c} shrugs. "Fine — though your competitor pitched it differently."',
    '{c} agrees, with a slight pause you decide not to overthink.',
  ],
  poor: [
    '{c} frowns at the term sheet. "I\'ll need to discuss this with my partners."',
    '{c} goes quiet for a moment. "That\'s... not quite what we had in mind."',
    '{c} checks their watch. The energy in the room has changed.',
  ],
  bad: [
    '{c} stares at you. "Have you actually looked at our file?"',
    '{c} closes the folder. The meeting is effectively over.',
    '{c} smiles politely — the smile of someone already dialing another bank.',
  ],
};

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

export default function Meeting({ scenario, level, isFirstMeeting, onDone }: Props) {
  const [decisionIdx, setDecisionIdx] = useState(0);
  const [picks, setPicks] = useState<MeetingPick[]>([]);
  const [picked, setPicked] = useState<string | null>(null);
  const [reaction, setReaction] = useState('');
  const [showNotes, setShowNotes] = useState(level === 1);
  const [coachDismissed, setCoachDismissed] = useState(() => localStorage.getItem('dcb_coached') === '1');

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
    const pool = REACTIONS[opt.quality];
    const firstName = scenario.client.contact.split(',')[0].trim();
    setReaction(pool[Math.floor(Math.random() * pool.length)].replace('{c}', firstName));
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
      setReaction('');
    }
  };

  // keyboard play: A–D selects, Enter advances
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.key === 'Enter' && picked) {
        next();
        return;
      }
      const idx = e.key.toUpperCase().charCodeAt(0) - 65;
      if (!picked && idx >= 0 && idx < shuffledOptions.length && /^[a-dA-D]$/.test(e.key)) {
        choose(shuffledOptions[idx].id);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [picked, decisionIdx, shuffledOptions]);

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
        {isFirstMeeting && !coachDismissed && (
          <div className="coach-tip anim-rise">
            <span className="coach-icon">🧭</span>
            <p>
              <strong>First day on the desk?</strong> Read the analysis pack on the left — every ratio is
              already computed for you. Your job is judgement: pick the structure that fits the numbers. You
              can also play with keys <kbd>A</kbd>–<kbd>D</kbd> and <kbd>Enter</kbd>.
            </p>
            <button
              className="btn tiny"
              onClick={() => {
                localStorage.setItem('dcb_coached', '1');
                setCoachDismissed(true);
              }}
            >
              Got it
            </button>
          </div>
        )}
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
              {reaction && <p className="reaction">{reaction}</p>}
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
