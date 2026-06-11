import { useMemo, useState } from 'react';
import type { DrillKind, Scenario, SopStep } from '../engine/types';
import { distractorDocs, requiredDocs, sopSteps } from '../engine/content';
import { sfx } from '../engine/sfx';

interface Props {
  scenario: Scenario;
  drillKind: DrillKind;
  onDone: (drillScore: number, plantedScore: number | null) => void;
}

type Part = 'drill' | 'planted' | 'summary';

const DRILL_TITLE: Record<DrillKind, string> = {
  'order-full': 'Put the SOP steps in the correct order',
  'next-step': 'What comes next?',
  misplaced: 'One step is out of place — find it',
  docs: 'Build the document checklist',
};

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

export default function Process({ scenario, drillKind, onDone }: Props) {
  // booking-less scenarios (e.g. a declined deal with a review exercise) only run the file check
  const hasBooking = scenario.dealSizeKD > 0;
  const planted = scenario.plantedError ?? null;
  // file checks pop up randomly — always for review-only cases, ~60% otherwise
  const [showPlanted] = useState(() => Boolean(planted) && (!hasBooking || Math.random() < 0.6));
  const [part, setPart] = useState<Part>(hasBooking ? 'drill' : showPlanted ? 'planted' : 'summary');
  const [drillScore, setDrillScore] = useState<number | null>(null);

  // ---- drill: full ordering ----
  const [pool, setPool] = useState(() => shuffle(sopSteps));
  const [ordered, setOrdered] = useState<string[]>([]);
  const [orderMistakes, setOrderMistakes] = useState(0);
  const [flash, setFlash] = useState<string | null>(null);

  // ---- drill: what comes next ----
  const [nextStepQuiz] = useState(() => {
    const k = 2 + Math.floor(Math.random() * 6); // show steps 0..k-1, ask for step k
    const correct = sopSteps[k];
    const wrong = shuffle(sopSteps.filter((s) => s.id !== correct.id)).slice(0, 3);
    return { shown: sopSteps.slice(0, k), choices: shuffle([correct, ...wrong]), correctId: correct.id };
  });
  const [nextPick, setNextPick] = useState<string | null>(null);

  // ---- drill: misplaced step ----
  const [misplacedQuiz] = useState(() => {
    const i = Math.floor(Math.random() * (sopSteps.length - 1));
    const seq = [...sopSteps];
    [seq[i], seq[i + 1]] = [seq[i + 1], seq[i]];
    return { seq, swapped: [sopSteps[i].id, sopSteps[i + 1].id] };
  });
  const [misplacedMistakes, setMisplacedMistakes] = useState(0);
  const [misplacedFound, setMisplacedFound] = useState<string | null>(null);

  // ---- drill: documents ----
  const [required] = useState(() => requiredDocs(scenario.docTags));
  const [docChoices] = useState(() => shuffle([...required, ...shuffle(distractorDocs()).slice(0, 3)]));
  const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set());
  const [docsSubmitted, setDocsSubmitted] = useState(false);

  // ---- file check ----
  const [plantedOptions] = useState(() => (planted ? shuffle(planted.options) : []));
  const [plantedPick, setPlantedPick] = useState<string | null>(null);

  const plantedCorrect =
    planted && plantedPick ? planted.options.find((o) => o.id === plantedPick)?.correct ?? false : false;
  const plantedScore = showPlanted && plantedPick ? (plantedCorrect ? 100 : 0) : null;

  const finishDrill = (score: number) => {
    setDrillScore(score);
    setPart(showPlanted ? 'planted' : 'summary');
  };

  // full ordering handlers
  const clickStep = (stepId: string) => {
    const expected = sopSteps[ordered.length].id;
    if (stepId === expected) {
      sfx.step();
      setOrdered([...ordered, stepId]);
      setPool(pool.filter((s) => s.id !== stepId));
      if (ordered.length + 1 === sopSteps.length) {
        finishDrill(Math.max(0, 100 - orderMistakes * 15));
      }
    } else {
      sfx.wrong();
      setOrderMistakes(orderMistakes + 1);
      setFlash(stepId);
      setTimeout(() => setFlash(null), 450);
    }
  };

  const pickNextStep = (id: string) => {
    if (nextPick) return;
    (id === nextStepQuiz.correctId ? sfx.best : sfx.bad)();
    setNextPick(id);
  };

  const pickMisplaced = (id: string) => {
    if (misplacedFound) return;
    if (misplacedQuiz.swapped.includes(id)) {
      sfx.best();
      setMisplacedFound(id);
    } else {
      sfx.wrong();
      setMisplacedMistakes(misplacedMistakes + 1);
      setFlash(id);
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

  const finish = () => {
    sfx.click();
    // review-only cases score on the file check alone
    onDone(hasBooking ? drillScore ?? 0 : plantedScore ?? 100, hasBooking ? plantedScore : null);
  };

  const stepName = (s: SopStep) => s.name;

  return (
    <div className="process">
      <div className="card anim-rise">
        <div className="process-head">
          <div>
            <span className="kicker">Operations · Credit Administration</span>
            <h2>{scenario.facilitySummary}</h2>
          </div>
        </div>
        <p className="muted">
          The committee said yes — now the deal must move through the SOP correctly. Process mistakes don't
          show up today; they show up when audit visits.
        </p>

        {part === 'drill' && drillKind === 'order-full' && (
          <div className="sop-order">
            <h3>{DRILL_TITLE[drillKind]}</h3>
            <p className="muted small">Click the step that comes next. Wrong clicks cost points.</p>
            <ol className="ordered-steps">
              {ordered.map((id) => (
                <li key={id} className="anim-pop">
                  {stepName(sopSteps.find((s) => s.id === id)!)}
                </li>
              ))}
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
            <div className={`muted small ${orderMistakes > 0 ? 'mistakes' : ''}`}>Mistakes: {orderMistakes}</div>
          </div>
        )}

        {part === 'drill' && drillKind === 'next-step' && (
          <div className="sop-order">
            <h3>{DRILL_TITLE[drillKind]}</h3>
            <p className="muted small">The file has progressed this far. One shot — choose the next step.</p>
            <ol className="ordered-steps">
              {nextStepQuiz.shown.map((s) => (
                <li key={s.id}>{s.name}</li>
              ))}
              <li className="placeholder">?</li>
            </ol>
            <div className="step-pool">
              {nextStepQuiz.choices.map((s) => {
                let cls = '';
                if (nextPick) {
                  if (s.id === nextStepQuiz.correctId) cls = 'chip-correct';
                  else if (s.id === nextPick) cls = 'flash-wrong';
                  else cls = 'chip-dim';
                }
                return (
                  <button key={s.id} className={`chip ${cls}`} disabled={!!nextPick} onClick={() => pickNextStep(s.id)}>
                    {s.name}
                  </button>
                );
              })}
            </div>
            {nextPick && (
              <div className={`feedback anim-pop ${nextPick === nextStepQuiz.correctId ? 'best' : 'bad'}`}>
                <div className="feedback-head">
                  <strong>
                    {nextPick === nextStepQuiz.correctId
                      ? 'Correct — the sequence holds.'
                      : `Not quite — the next step is "${sopSteps.find((s) => s.id === nextStepQuiz.correctId)?.name}".`}
                  </strong>
                </div>
                <button
                  className="btn primary"
                  onClick={() => finishDrill(nextPick === nextStepQuiz.correctId ? 100 : 30)}
                >
                  Continue
                </button>
              </div>
            )}
          </div>
        )}

        {part === 'drill' && drillKind === 'misplaced' && (
          <div className="sop-order">
            <h3>{DRILL_TITLE[drillKind]}</h3>
            <p className="muted small">
              Operations drafted this processing sequence — but two steps got swapped. Click a step that sits
              in the wrong position.
            </p>
            <div className="step-pool vertical">
              {misplacedQuiz.seq.map((s, i) => {
                let cls = '';
                if (flash === s.id) cls = 'flash-wrong';
                if (misplacedFound && misplacedQuiz.swapped.includes(s.id)) cls = 'chip-correct';
                return (
                  <button
                    key={s.id}
                    className={`chip ${cls}`}
                    disabled={!!misplacedFound}
                    onClick={() => pickMisplaced(s.id)}
                  >
                    <span className="chip-num">{i + 1}</span> {s.name}
                  </button>
                );
              })}
            </div>
            {misplacedFound && (
              <div className="feedback anim-pop best">
                <div className="feedback-head">
                  <strong>
                    Found it — those two steps were swapped. ({misplacedMistakes} wrong{' '}
                    {misplacedMistakes === 1 ? 'click' : 'clicks'})
                  </strong>
                </div>
                <button
                  className="btn primary"
                  onClick={() => finishDrill(Math.max(10, 100 - misplacedMistakes * 30))}
                >
                  Continue
                </button>
              </div>
            )}
          </div>
        )}

        {part === 'drill' && drillKind === 'docs' && (
          <div className="doc-check">
            <h3>{DRILL_TITLE[drillKind]}</h3>
            <p className="muted small">Select every document this file requires — and nothing it doesn't.</p>
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
              <button className="btn primary" disabled={selectedDocs.size === 0} onClick={() => setDocsSubmitted(true)}>
                Submit checklist
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
                <button className="btn primary" onClick={() => { sfx.click(); finishDrill(docScore); }}>
                  Continue
                </button>
              </div>
            )}
          </div>
        )}

        {part === 'planted' && planted && (
          <div className="planted">
            <h3>{hasBooking ? 'Surprise file check' : 'File review'}</h3>
            <p className="planted-prompt">{planted.prompt}</p>
            {planted.exhibit && (
              <div className="file-exhibit anim-rise">
                <div className="file-exhibit-head">📁 The file, as presented</div>
                <ul>
                  {planted.exhibit.map((line, i) => (
                    <li key={i}>{line}</li>
                  ))}
                </ul>
              </div>
            )}
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
                    <span className="option-key">{i + 1}</span>
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
                    {plantedCorrect ? '100' : '0'}/100
                  </span>
                </div>
                <p>{planted.options.find((o) => o.id === plantedPick)?.feedback}</p>
                <button className="btn primary" onClick={() => { sfx.click(); setPart('summary'); }}>
                  Continue
                </button>
              </div>
            )}
          </div>
        )}

        {part === 'summary' && (
          <div className="process-summary anim-rise">
            <h3>Processing complete</h3>
            <div className="score-pills">
              {hasBooking && drillScore !== null && (
                <span className="score-pill">
                  {DRILL_TITLE[drillKind]} <strong>{drillScore}</strong>
                </span>
              )}
              {plantedScore !== null && (
                <span className="score-pill">
                  File check <strong>{plantedScore}</strong>
                </span>
              )}
            </div>
            <div className="learn-box">
              <span className="learn-kicker">Key takeaway — added to your journal</span>
              {scenario.learn}
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
