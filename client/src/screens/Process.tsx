import { useMemo, useState } from 'react';
import type { Scenario } from '../engine/types';
import { distractorDocs, requiredDocs, sopSteps } from '../engine/content';

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
      setOrdered([...ordered, stepId]);
      setPool(pool.filter((s) => s.id !== stepId));
      if (ordered.length + 1 === sopSteps.length) {
        setPart('docs');
      }
    } else {
      setOrderMistakes(orderMistakes + 1);
      setFlash(stepId);
      setTimeout(() => setFlash(null), 450);
    }
  };

  const toggleDoc = (doc: string) => {
    if (docsSubmitted) return;
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

  const plantedCorrect = planted && plantedPick
    ? planted.options.find((o) => o.id === plantedPick)?.correct ?? false
    : false;
  const plantedScore = planted ? (plantedCorrect ? 100 : 0) : null;

  const finish = () => {
    // without a booking, only the file-review part was played — score it alone
    const fallback = plantedScore ?? 100;
    onDone(hasBooking ? orderScore : fallback, hasBooking ? docScore : fallback, plantedScore);
  };

  return (
    <div className="process">
      <div className="card">
        <h2>Processing — {scenario.facilitySummary}</h2>
        <p className="muted">
          The committee said yes. Now the deal must move through the SOP correctly — sequence, documents, and checks.
          Process mistakes don't always show up today; they show up when audit visits.
        </p>

        {part === 'order' && (
          <div className="sop-order">
            <h3>1 · Put the SOP steps in the correct order</h3>
            <p className="muted">Click the step that comes next. Wrong clicks cost points.</p>
            <ol className="ordered-steps">
              {ordered.map((id) => {
                const step = sopSteps.find((s) => s.id === id)!;
                return <li key={id}>{step.name}</li>;
              })}
              {ordered.length < sopSteps.length && <li className="placeholder">?</li>}
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
            <div className="muted small">Mistakes: {orderMistakes}</div>
          </div>
        )}

        {part === 'docs' && (
          <div className="doc-check">
            <h3>2 · Select every document this file requires — and nothing it doesn't</h3>
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
                    {doc}
                  </button>
                );
              })}
            </div>
            {!docsSubmitted ? (
              <button
                className="btn primary"
                disabled={selectedDocs.size === 0}
                onClick={() => setDocsSubmitted(true)}
              >
                Submit checklist
              </button>
            ) : (
              <div className="feedback info">
                <strong>Document check: {docScore}/100.</strong>{' '}
                {docScore === 100
                  ? 'Complete file, no padding — exactly what documentation wants to see.'
                  : 'Green = correctly included · red = not required for this file · amber = required but missed.'}
                <button className="btn primary" onClick={() => setPart(planted ? 'planted' : 'summary')}>
                  Continue
                </button>
              </div>
            )}
          </div>
        )}

        {part === 'planted' && planted && (
          <div className="planted">
            <h3>{hasBooking ? '3 · ' : ''}File review</h3>
            <p>{planted.prompt}</p>
            <div className="options">
              {plantedOptions.map((o) => {
                const isPicked = plantedPick === o.id;
                const cls = plantedPick ? (isPicked ? (o.correct ? 'revealed best' : 'revealed bad') : 'dimmed') : '';
                return (
                  <button
                    key={o.id}
                    className={`option ${cls}`}
                    disabled={!!plantedPick}
                    onClick={() => setPlantedPick(o.id)}
                  >
                    <span className="option-label">{o.label}</span>
                  </button>
                );
              })}
            </div>
            {plantedPick && (
              <div className={`feedback ${plantedCorrect ? 'best' : 'bad'}`}>
                <strong>{plantedCorrect ? 'Sharp eyes.' : 'Missed it.'}</strong>{' '}
                {planted.options.find((o) => o.id === plantedPick)?.feedback}
                <button className="btn primary" onClick={() => setPart('summary')}>
                  Continue
                </button>
              </div>
            )}
          </div>
        )}

        {part === 'summary' && (
          <div className="process-summary">
            <h3>Processing complete</h3>
            {hasBooking && (
              <ul>
                <li>SOP sequence: {orderScore}/100</li>
                <li>Documentation: {docScore}/100</li>
                {plantedScore !== null && <li>File review: {plantedScore}/100</li>}
              </ul>
            )}
            <div className="learn-box">
              <strong>Takeaway:</strong> {scenario.learn}
            </div>
            <button className="btn primary big" onClick={finish}>
              Go to month-end
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
