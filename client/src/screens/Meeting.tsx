import { useEffect, useState } from 'react';
import type { MeetingPick, Scenario } from '../engine/types';
import { QUALITY_POINTS } from '../engine/game';
import { sfx } from '../engine/sfx';

interface Props {
  scenario: Scenario;
  level: 1 | 2 | 3;
  month: number;
  isFirstMeeting?: boolean;
  onDone: (picks: MeetingPick[]) => void;
}

const STAGE_LABEL: Record<string, string> = {
  structure: 'Structuring',
  collateral: 'Security & conditions',
  judgment: 'Credit judgement',
};

const QUALITY_LABEL: Record<string, string> = {
  best: 'Excellent',
  good: 'Acceptable',
  poor: 'Weak',
  bad: 'Serious mistake',
};

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

export default function Meeting({ scenario, level, month, isFirstMeeting, onDone }: Props) {
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

  // keyboard play: 1–4 selects, Enter advances
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.key === 'Enter' && picked) {
        next();
        return;
      }
      const idx = parseInt(e.key, 10) - 1;
      if (!picked && idx >= 0 && idx < shuffledOptions.length) {
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
          <span className="kicker">Client meeting — month {month}</span>
          <h2>{scenario.client.name}</h2>
          <div className="client-chips">
            <span className="chip-tag">{scenario.client.sector}</span>
            <span className="chip-tag">{scenario.client.contact}</span>
          </div>
          <span className="kicker sub">Relationship history</span>
          <p className="profile">{scenario.client.profile}</p>
          <span className="kicker sub">The request, in their words</span>
          <blockquote>{scenario.request}</blockquote>
        </div>

        {isFirstMeeting && !coachDismissed && (
          <div className="coach-tip anim-rise">
            <p>
              <strong>First day on the desk?</strong> Every ratio is pre-computed — your job is judgement:
              pick the structure that fits the numbers. Play with keys <kbd>1</kbd>–<kbd>4</kbd> and{' '}
              <kbd>Enter</kbd>.
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
      </div>

      <div className="meeting-right">
        <div className="card pack-card anim-rise d1">
          <span className="kicker">Financials — audited</span>
          <div className="figures-grid">
            {scenario.analysisPack.figures.map((f) => (
              <div className="figure-cell" key={f.label}>
                <span className="figure-label">{f.label}</span>
                <span className="figure-value">{f.value}</span>
              </div>
            ))}
          </div>

          <div className="pack-header">
            <span className="kicker">Key ratios · analyst notes {level === 1 ? 'on' : 'on demand'}</span>
            {level > 1 && (
              <button className="btn tiny" onClick={() => { sfx.click(); setShowNotes(!showNotes); }}>
                {showNotes ? 'Hide notes' : 'Show notes'}
              </button>
            )}
          </div>
          <div className="ratio-grid">
            {scenario.analysisPack.ratios.map((r) => (
              <div className="ratio" key={r.label}>
                <span className="figure-label">{r.label}</span>
                <span className="ratio-value">{r.value}</span>
                {r.benchmark && <span className="benchmark">benchmark {r.benchmark}</span>}
                {r.hint && showNotes && <p className="hint">{r.hint}</p>}
              </div>
            ))}
          </div>
        </div>

        <div className="card decision-card anim-rise d2" key={decisionIdx}>
          <span className="decision-pill">
            Decision {decisionIdx + 1} of {scenario.decisions.length} · {STAGE_LABEL[decision.stage]}
          </span>
          <h3 className="decision-prompt">{decision.prompt}</h3>
          <div className="options">
            {shuffledOptions.map((o, i) => {
              const isPicked = picked === o.id;
              const revealClass = picked ? (isPicked ? `revealed ${o.quality}` : 'dimmed') : '';
              return (
                <button
                  key={o.id}
                  className={`option anim-rise ${revealClass}`}
                  style={{ animationDelay: `${i * 50}ms` }}
                  onClick={() => choose(o.id)}
                  disabled={!!picked}
                >
                  <span className="option-key">{i + 1}</span>
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
                <span className={`verdict-tag ${pickedOption.quality}`}>
                  {QUALITY_LABEL[pickedOption.quality]}
                </span>
                <span className="pts-inline">+{QUALITY_POINTS[pickedOption.quality]} pts</span>
              </div>
              {reaction && <p className="reaction">{reaction}</p>}
              <p>{pickedOption.feedback}</p>
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
