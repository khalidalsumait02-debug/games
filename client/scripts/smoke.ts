// Engine smoke test: simulates full campaigns on all three levels without the UI.
// Run with: npx tsx scripts/smoke.ts
import { newGame, reduce } from '../src/engine/game';
import { getDeck } from '../src/engine/content';
import type { GameState, MeetingPick, Quality } from '../src/engine/types';

// minimal localStorage stub for node
(globalThis as { localStorage?: unknown }).localStorage = {
  store: {} as Record<string, string>,
  getItem(k: string) {
    return this.store[k] ?? null;
  },
  setItem(k: string, v: string) {
    this.store[k] = v;
  },
  removeItem(k: string) {
    delete this.store[k];
  },
};

const ORDER: Record<'best' | 'worst', Quality[]> = {
  best: ['best', 'good', 'poor', 'bad'],
  worst: ['bad', 'poor', 'good', 'best'],
};

function playCampaign(level: 1 | 2 | 3 | 4, strategy: 'best' | 'worst'): GameState {
  let s = newGame('SmokeBot', level);
  const deck = getDeck(level);
  let guard = 0;
  while (!s.finished && guard++ < 100) {
    if (s.phase === 'meeting') {
      const scenario = deck[s.scenarioIndex];
      const picks: MeetingPick[] = [];
      for (const d of scenario.decisions) {
        let pick: MeetingPick;
        if (d.slots?.length) {
          const chosen = d.slots.map(
            (sl) => ORDER[strategy].map((q) => sl.options.find((o) => o.quality === q)).find(Boolean)!
          );
          pick = {
            decisionId: d.id,
            qualities: chosen.map((o) => o.quality),
            consequences: chosen.map((o) => o.consequence).filter((c): c is string => Boolean(c)),
            books: chosen.every((o) => o.books !== false),
          };
        } else {
          const opt = ORDER[strategy].map((q) => d.options!.find((o) => o.quality === q)).find(Boolean)!;
          pick = {
            decisionId: d.id,
            qualities: [opt.quality],
            consequences: opt.consequence ? [opt.consequence] : [],
            books: opt.books !== false,
          };
        }
        picks.push(pick);
        if (!pick.books) break;
      }
      s = reduce(s, { type: 'MEETING_DONE', result: { scenarioId: scenario.id, picks } })!;
    } else if (s.phase === 'process') {
      const score = strategy === 'best' ? 100 : 10;
      s = reduce(s, {
        type: 'PROCESS_DONE',
        result: {
          scenarioId: deck[s.scenarioIndex].id,
          drillScore: score,
          plantedScore: strategy === 'best' ? 100 : 0,
        },
      })!;
    } else if (s.phase === 'monthEnd') {
      s = reduce(s, { type: 'MONTH_CONTINUE' })!;
    } else {
      break;
    }
  }
  return s;
}

let failures = 0;
for (const level of [1, 2, 3, 4] as const) {
  // sanity-check scenario data
  for (const sc of getDeck(level)) {
    for (const d of sc.decisions) {
      if (d.slots?.length) {
        for (const sl of d.slots) {
          if (!sl.options.some((o) => o.quality === 'best')) {
            console.error(`FAIL: ${sc.id}/${d.id}/${sl.id} has no 'best' option`);
            failures++;
          }
          const ids = new Set(sl.options.map((o) => o.id));
          if (ids.size !== sl.options.length) {
            console.error(`FAIL: ${sc.id}/${d.id}/${sl.id} has duplicate option ids`);
            failures++;
          }
          if (level === 4 && sl.options.length < 5) {
            console.error(`FAIL: ${sc.id}/${d.id}/${sl.id} L4 slots need 5 options`);
            failures++;
          }
        }
      } else if (d.options?.length) {
        if (!d.options.some((o) => o.quality === 'best')) {
          console.error(`FAIL: ${sc.id}/${d.id} has no 'best' option`);
          failures++;
        }
        const ids = new Set(d.options.map((o) => o.id));
        if (ids.size !== d.options.length) {
          console.error(`FAIL: ${sc.id}/${d.id} has duplicate option ids`);
          failures++;
        }
      } else {
        console.error(`FAIL: ${sc.id}/${d.id} has neither options nor slots`);
        failures++;
      }
    }
    if (sc.plantedError && sc.plantedError.options.filter((o) => o.correct).length !== 1) {
      console.error(`FAIL: ${sc.id} planted error must have exactly one correct option`);
      failures++;
    }
  }
  // level design rules
  if (level === 3) {
    for (const sc of getDeck(level)) {
      if (!sc.decisions[0].slots?.length) {
        console.error(`FAIL: ${sc.id} L3 first decision must be a slot builder`);
        failures++;
      }
    }
  }
  if (level === 4) {
    for (const sc of getDeck(level)) {
      if (!sc.decisions.every((d) => d.slots?.length)) {
        console.error(`FAIL: ${sc.id} L4 decisions must all be slot builders`);
        failures++;
      }
    }
  }

  for (const strategy of ['best', 'worst'] as const) {
    const end = playCampaign(level, strategy);
    const ok = end.finished && end.phase === 'results';
    console.log(
      `L${level} ${strategy.padEnd(5)} → score=${String(end.score).padStart(6)} rep=${String(end.reputation).padStart(3)} ` +
        `deals=${end.deals.length} npl=${end.deals.filter((d) => d.status === 'npl').length} ` +
        `endedEarly=${end.endedEarly} finished=${ok}`
    );
    if (!ok) {
      console.error(`FAIL: L${level} ${strategy} campaign did not reach results`);
      failures++;
    }
    if (strategy === 'best' && end.score <= 1500) {
      console.error(`FAIL: L${level} best-play score should be strong (got ${end.score})`);
      failures++;
    }
    if (strategy === 'worst' && end.score >= -500) {
      console.error(`FAIL: L${level} worst-play score should be deeply negative (got ${end.score})`);
      failures++;
    }
  }
}

if (failures > 0) {
  console.error(`\n${failures} smoke failure(s)`);
  process.exit(1);
}
console.log('\nAll smoke checks passed.');
