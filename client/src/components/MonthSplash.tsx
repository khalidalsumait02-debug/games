import { useEffect } from 'react';
import { sfx } from '../engine/sfx';
import { config } from '../engine/content';

const QUARTER_NAMES = ['Q1', 'Q1', 'Q1', 'Q2', 'Q2', 'Q2', 'Q3', 'Q3', 'Q3', 'Q4', 'Q4', 'Q4'];
const MOOD = [
  'A new desk, a fresh book. Make it count.',
  'The pipeline is warming up.',
  'Quarter close is watching.',
  'New quarter, clean slate.',
  'Your book is starting to talk about you.',
  'Half-year review approaches.',
  'The second half begins.',
  'Committee remembers everything.',
  'Audit season is never far away.',
  'Year-end. Finish strong.',
];

export default function MonthSplash({ month, onDone }: { month: number; onDone: () => void }) {
  useEffect(() => {
    sfx.month();
    const id = setTimeout(onDone, 1900);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="splash" onClick={onDone}>
      <div className="splash-inner">
        <span className="splash-quarter">{QUARTER_NAMES[(month - 1) % 12]}</span>
        <h1>Month {month}</h1>
        <p>{MOOD[(month - 1) % MOOD.length]}</p>
        <span className="splash-skip">click to continue</span>
      </div>
      <div className="splash-rule" style={{ ['--p' as string]: `${(month / config.campaignMonths) * 100}%` }} />
    </div>
  );
}
