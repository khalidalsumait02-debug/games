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

function playCampaign(level: 1 | 2 | 3, strategy: 'best' | 'worst'): GameState {
  let s = newGame('SmokeBot', level);
  const deck = getDeck(level);
  let guard = 0;
  while (!s.finished && guard++ < 100) {
    if (s.phase === 'meeting') {
      const scenario = deck[s.scenarioIndex];
      const picks: MeetingPick[] = [];
      for (const d of scenario.decisions) {
        const order: Quality[] = strategy === 'best' ? ['best', 'good', 'poor', 'bad'] : ['bad', 'poor', 'good', 'best'];
        const opt = order.map((q) => d.options.find((o) => o.quality === q)).find(Boolean)!;
        picks.push({
          decisionId: d.id,
          optionId: opt.id,
          quality: opt.quality,
          consequence: opt.consequence,
          books: opt.books !== false,
        });
        if (opt.books === false) break;
      }
      s = reduce(s, { type: 'MEETING_DONE', result: { scenarioId: scenario.id, picks } })!;
    } else if (s.phase === 'process') {
      const score = strategy === 'best' ? 100 : 20;
      s = reduce(s, {
        type: 'PROCESS_DONE',
        result: { scenarioId: deck[s.scenarioIndex].id, orderScore: score, docScore: score, plantedScore: strategy === 'best' ? 100 : 0 },
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
for (const level of [1, 2, 3] as const) {
  // sanity-check scenario data
  for (const sc of getDeck(level)) {
    for (const d of sc.decisions) {
      if (!d.options.some((o) => o.quality === 'best')) {
        console.error(`FAIL: ${sc.id}/${d.id} has no 'best' option`);
        failures++;
      }
      const ids = new Set(d.options.map((o) => o.id));
      if (ids.size !== d.options.length) {
        console.error(`FAIL: ${sc.id}/${d.id} has duplicate option ids`);
        failures++;
      }
    }
    if (sc.plantedError && sc.plantedError.options.filter((o) => o.correct).length !== 1) {
      console.error(`FAIL: ${sc.id} planted error must have exactly one correct option`);
      failures++;
    }
  }

  for (const strategy of ['best', 'worst'] as const) {
    const end = playCampaign(level, strategy);
    const ok = end.finished && end.phase === 'results';
    console.log(
      `L${level} ${strategy.padEnd(5)} → score=${String(end.score).padStart(5)} rep=${String(end.reputation).padStart(3)} ` +
        `deals=${end.deals.length} npl=${end.deals.filter((d) => d.status === 'npl').length} ` +
        `endedEarly=${end.endedEarly} finished=${ok}`
    );
    if (!ok) {
      console.error(`FAIL: L${level} ${strategy} campaign did not reach results`);
      failures++;
    }
    if (strategy === 'best' && end.score <= 0) {
      console.error(`FAIL: L${level} best-play score should be positive`);
      failures++;
    }
  }
}

if (failures > 0) {
  console.error(`\n${failures} smoke failure(s)`);
  process.exit(1);
}
console.log('\nAll smoke checks passed.');
