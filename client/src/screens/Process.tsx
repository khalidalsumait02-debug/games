import { useMemo, useState } from 'react';
import type { Scenario } from '../engine/types';
import { distractorDocs, requiredDocs, sopSteps } from '../engine/content';
import { sfx } from '../engine/sfx';

interface Props {
  scenario: Scenario;
  onDone: (orderScore: number, docScore: number, plantedScore: number | null) => void;
}

type Part = 'order' | 'docs' | 'planted' | 'summary';

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

export default function Process({ scenario, onDone }: Props) {
  // booking-less scenarios (e.g. a declined deal with a review exercise) skip straight to the planted error
  const hasBooking = scenario.dealSizeKD > 0;
  const [part, setPart] = useState<Part>(hasBooking ? 'order' : 'planted');

  // --- Part A: SOP step ordering ---
  const [pool, setPool] = useState(() => shuffle(sopSteps));
  const [ordered, setOrdered] = useState<string[]>([]);
  const [orderMistakes, setOrderMistakes] = useState(0);
  const [flash, setFlash] = useState<string | null>(null);

  // --- Part B: documents ---
  const [required] = useState(() => requiredDocs(scenario.docTags));
  const [docChoices] = useState(() => shuffle([...required, ...shuffle(distractorDocs()).slice(0, 3)]));
  const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set());
  const [docsSubmitted, setDocsSubmitted] = useState(false);

  // --- Part C: planted error ---
  const planted = scenario.plantedError ?? null;
  const [plantedOptions] = useState(() => (planted ? shuffle(planted.options) : []));
  const [plantedPick, setPlantedPick] = useState<string | null>(null);

  const orderScore = Math.max(0, 100 - orderMistakes * 15);

  const clickStep = (stepId: string) => {
    const expected = sopSteps[ordered.length].id;
    if (stepId === expected) {
      sfx.step();
      setOrdered([...ordered, stepId]);
      setPool(pool.filter((s) => s.id !== stepId));
      if (ordered.length + 1 === sopSteps.length) {
        setPart('docs');
      }
    } else {
      sfx.wrong();
      setOrderMistakes(orderMistakes + 1);
      setFlash(stepId);
      setTimeout(() => setFlash(null), 450);
    }
  };

  const toggleDoc = (doc: string) => {
    if (docsSubmitted) return;
    sfx.click();
    const next = new Set(selectedDocs);
    if (next.has(doc)) next.delete(doc);
    else next.add(doc);
    setSelectedDocs(next);
  };

  const docScore = useMemo(() => {
    if (!docsSubmitted) return 0;
    let correct = 0;
    let wrong = 0;
    for (const doc of selectedDocs) {
      if (required.includes(doc)) correct++;
      else wrong++;
    }
    const missed = required.length - correct;
    return Math.max(0, Math.round(((correct - wrong - missed * 0.5) / required.length) * 100));
  }, [docsSubmitted, selectedDocs, required]);

  const plantedCorrect =
    planted && plantedPick ? planted.options.find((o) => o.id === plantedPick)?.correct ?? false : false;
  const plantedScore = planted ? (plantedCorrect ? 100 : 0) : null;

  const parts: { id: Part; label: string }[] = [
    ...(hasBooking
      ? [
          { id: 'order' as Part, label: 'Sequence' },
          { id: 'docs' as Part, label: 'Documents' },
        ]
      : []),
    ...(planted ? [{ id: 'planted' as Part, label: 'File review' }] : []),
    { id: 'summary' as Part, label: 'Sign-off' },
  ];
  const partIdx = parts.findIndex((p) => p.id === part);

  const finish = () => {
    sfx.click();
    // without a booking, only the file-review part was played — score it alone
    const fallback = plantedScore ?? 100;
    onDone(hasBooking ? orderScore : fallback, hasBooking ? docScore : fallback, plantedScore);
  };

  return (
    <div className="process">
      <div className="card anim-rise">
        <div className="process-head">
          <div>
            <span className="kicker">Operations · Credit Administration</span>
            <h2>{scenario.facilitySummary}</h2>
          </div>
          <div className="part-stepper">
            {parts.map((p, i) => (
              <span key={p.id} className={`part-step ${i < partIdx ? 'done' : ''} ${i === partIdx ? 'active' : ''}`}>
                {i < partIdx ? '✓' : i + 1} {p.label}
              </span>
            ))}
          </div>
        </div>
        <p className="muted">
          The committee said yes — now the deal must move through the SOP correctly. Process mistakes don't
          show up today; they show up when audit visits.
        </p>

        {part === 'order' && (
          <div className="sop-order">
            <h3>Put the SOP steps in the correct order</h3>
            <p className="muted small">Click the step that comes next. Wrong clicks cost points.</p>
            <ol className="ordered-steps">
              {ordered.map((id) => {
                const step = sopSteps.find((s) => s.id === id)!;
                return (
                  <li key={id} className="anim-pop">
                    {step.name}
                  </li>
                );
              })}
              {ordered.length < sopSteps.length && <li className="placeholder">{ordered.length + 1}</li>}
            </ol>
            <div className="step-pool">
              {pool.map((s) => (
                <button
                  key={s.id}
                  className={`chip ${flash === s.id ? 'flash-wrong' : ''}`}
                  onClick={() => clickStep(s.id)}
                  title={s.detail}
                >
                  {s.name}
                </button>
              ))}
            </div>
            <div className={`muted small ${orderMistakes > 0 ? 'mistakes' : ''}`}>
              Mistakes: {orderMistakes}
            </div>
          </div>
        )}

        {part === 'docs' && (
          <div className="doc-check">
            <h3>Select every document this file requires — and nothing it doesn't</h3>
            <div className="doc-grid">
              {docChoices.map((doc) => {
                const sel = selectedDocs.has(doc);
                let cls = sel ? 'selected' : '';
                if (docsSubmitted) {
                  const isRequired = required.includes(doc);
                  if (isRequired && sel) cls = 'doc-correct';
                  else if (isRequired && !sel) cls = 'doc-missed';
                  else if (!isRequired && sel) cls = 'doc-wrong';
                }
                return (
                  <button key={doc} className={`doc ${cls}`} onClick={() => toggleDoc(doc)}>
                    <span className="doc-tick">{sel ? '☑' : '☐'}</span> {doc}
                  </button>
                );
              })}
            </div>
            {!docsSubmitted ? (
              <button
                className="btn primary"
                disabled={selectedDocs.size === 0}
                onClick={() => {
                  setDocsSubmitted(true);
                }}
              >
                Submit checklist ▸
              </button>
            ) : (
              <div className="feedback info anim-pop">
                <div className="feedback-head">
                  <strong>Document check</strong>
                  <span className={`pts-badge ${docScore >= 80 ? 'best' : docScore >= 50 ? 'good' : 'bad'}`}>
                    {docScore}/100
                  </span>
                </div>
                <p>
                  {docScore === 100
                    ? 'Complete file, no padding — exactly what documentation wants to see.'
                    : 'Green = correctly included · red = not required for this file · amber = required but missed.'}
                </p>
                <button className="btn primary" onClick={() => { sfx.click(); setPart(planted ? 'planted' : 'summary'); }}>
                  Continue ▸
                </button>
              </div>
            )}
          </div>
        )}

        {part === 'planted' && planted && (
          <div className="planted">
            <h3>File review</h3>
            <p className="planted-prompt">{planted.prompt}</p>
            <div className="options">
              {plantedOptions.map((o, i) => {
                const isPicked = plantedPick === o.id;
                const cls = plantedPick ? (isPicked ? (o.correct ? 'revealed best' : 'revealed bad') : 'dimmed') : '';
                return (
                  <button
                    key={o.id}
                    className={`option anim-rise ${cls}`}
                    style={{ animationDelay: `${i * 60}ms` }}
                    disabled={!!plantedPick}
                    onClick={() => {
                      (o.correct ? sfx.best : sfx.bad)();
                      setPlantedPick(o.id);
                    }}
                  >
                    <span className="option-key">{String.fromCharCode(65 + i)}</span>
                    <span className="option-body">
                      <span className="option-label">{o.label}</span>
                    </span>
                  </button>
                );
              })}
            </div>
            {plantedPick && (
              <div className={`feedback anim-pop ${plantedCorrect ? 'best' : 'bad'}`}>
                <div className="feedback-head">
                  <strong>{plantedCorrect ? 'Sharp eyes' : 'Missed it'}</strong>
                  <span className={`pts-badge ${plantedCorrect ? 'best' : 'bad'}`}>
                    {plantedCorrect ? '+100' : '+0'} pts
                  </span>
                </div>
                <p>{planted.options.find((o) => o.id === plantedPick)?.feedback}</p>
                <button className="btn primary" onClick={() => { sfx.click(); setPart('summary'); }}>
                  Continue ▸
                </button>
              </div>
            )}
          </div>
        )}

        {part === 'summary' && (
          <div className="process-summary anim-rise">
            <h3>✦ Processing complete</h3>
            {hasBooking && (
              <div className="score-pills">
                <span className="score-pill">
                  SOP sequence <strong>{orderScore}</strong>
                </span>
                <span className="score-pill">
                  Documentation <strong>{docScore}</strong>
                </span>
                {plantedScore !== null && (
                  <span className="score-pill">
                    File review <strong>{plantedScore}</strong>
                  </span>
                )}
              </div>
            )}
            <div className="learn-box">
              <span className="learn-kicker">Key takeaway — added to your journal</span>
              {scenario.learn}
            </div>
            <button className="btn primary big" onClick={finish}>
              Go to month-end ▸
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
