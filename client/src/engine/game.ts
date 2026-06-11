import type {
  BookedDeal,
  GameEvent,
  GameState,
  MeetingResult,
  ProcessResult,
  Quality,
  Scenario,
} from './types';
import { config, getDeck } from './content';
import newsItems from '../data/news.json';

// Points are two-sided: weak calls genuinely cost you.
export const QUALITY_POINTS: Record<Quality, number> = { best: 100, good: 40, poor: -60, bad: -120 };
// Deal health (0-100) drives portfolio behaviour — separate from score points.
export const QUALITY_HEALTH: Record<Quality, number> = { best: 100, good: 70, poor: 30, bad: 0 };
export const QUALITY_REP: Record<Quality, number> = { best: 2, good: 1, poor: -3, bad: -6 };

export const BOARD_PENALTY = 500;

const SAVE_PREFIX = 'dcb_save_v2_';

function saveKey(profileId: string) {
  return `${SAVE_PREFIX}${profileId}`;
}

export function newGame(playerName: string, level: 1 | 2 | 3 | 4, profileId = 'local'): GameState {
  return {
    playerName,
    profileId,
    level,
    month: 1,
    phase: 'meeting',
    scenarioIndex: 0,
    reputation: config.startingReputation,
    score: 0,
    breakdown: { structuring: 0, process: 0, portfolio: 0, bonus: 0 },
    streak: 0,
    deals: [],
    monthEvents: [],
    achievements: [],
    finished: false,
    endedEarly: false,
    pendingDeal: null,
    pendingLost: false,
  };
}

export type Action =
  | { type: 'MEETING_DONE'; result: MeetingResult }
  | { type: 'PROCESS_DONE'; result: ProcessResult }
  | { type: 'MONTH_CONTINUE' };

const CONSEQUENCE_TEXT: Record<string, { watch: string; npl: string }> = {
  maturity_mismatch: {
    watch: 'is showing cash strain — short-term money is stuck funding a long-term use, exactly the mismatch flagged at structuring.',
    npl: 'has defaulted. The maturity mismatch came home: the facility funded something that could never repay on its tenor.',
  },
  weak_structure: {
    watch: 'is struggling with the facility as structured — the instrument never quite fit the need.',
    npl: 'has defaulted. The mis-structured facility unravelled, and the bank is exposed.',
  },
  weak_security: {
    watch: 'is deteriorating — and with thin security, the bank has little to fall back on.',
    npl: 'has defaulted with inadequate security. Recovery prospects are poor; provisions hit hard.',
  },
  diversion: {
    watch: 'shows funds drifting away from the stated purpose — the excess limit/tenor is being used elsewhere.',
    npl: 'has defaulted. The diverted funds went into uses that never generated repayment.',
  },
  underfunded: {
    watch: 'is straining against an undersized limit — operations are being squeezed and the client is openly unhappy.',
    npl: 'has failed — starved of working capital at the critical moment.',
  },
  dscr_breach: {
    watch: 'is missing instalments — exactly what the DSCR below 1.2x predicted at approval.',
    npl: 'has defaulted on the term loan. The instalments never fit the cash flow, and the arithmetic finally won.',
  },
  overtrading: {
    watch: 'is overtrading visibly now — suppliers unpaid, cheques delayed, the order book devouring cash.',
    npl: 'has collapsed mid-growth — a full order book and an empty bank account. Overtrading completed its course.',
  },
  slow_stock: {
    watch: 'has a warehouse of unsold stock and mounting supplier pressure — the inventory never moved.',
    npl: 'has defaulted. The dead stock was finally written down, and the working capital went with it.',
  },
  window_dressing: {
    watch: 'reports "delayed collections" from the related party — the year-end receivables are not converting to cash.',
    npl: 'has defaulted. The dressed-up receivables were never real cash flow, and the facility was lent against decoration.',
  },
  project_overrun: {
    watch: 'reports cost overruns and slowing sales on the project — exposure is rising faster than progress.',
    npl: 'has stalled — a half-built project, exhausted financing, and the bank holding the largest share of the rubble.',
  },
  concentration: {
    watch: 'is renegotiating with its single dominant customer — and every line in the file moves with that conversation.',
    npl: 'lost its key customer and defaulted within months. Concentration risk, fully realised.',
  },
  evergreening: {
    watch: 'needs "one more facility" again — the restructured exposure is rolling rather than repaying.',
    npl: 'has finally defaulted after the last extension. Each renewal only grew the eventual loss.',
  },
  misread_sector: {
    watch: 'is performing oddly against the structure chosen — the facility never matched how this business actually works.',
    npl: 'has defaulted on a structure that misread its business model from day one.',
  },
  lost_goodwill: {
    watch: 'is openly shopping competitor banks — the heavy-handed terms are costing the relationship.',
    npl: 'has moved its business away and left the residual exposure to sour.',
  },
};

function consequenceText(deal: BookedDeal, kind: 'watch' | 'npl'): string {
  for (const c of deal.consequences) {
    const t = CONSEQUENCE_TEXT[c];
    if (t) return `${deal.clientName} ${t[kind]}`;
  }
  return kind === 'watch'
    ? `${deal.clientName} is showing early signs of stress — moved to the watchlist.`
    : `${deal.clientName} has defaulted. The exposure is classified non-performing.`;
}

function qualityFactor(q: number): number {
  if (q >= 85) return 1.2;
  if (q >= 60) return 1.0;
  if (q >= 40) return 0.7;
  return 0.5;
}

function incomePoints(deal: BookedDeal): number {
  const base = Math.min(40, Math.max(2, Math.round(deal.sizeKD / 100000) + 2));
  return Math.round(base * qualityFactor(deal.quality));
}

export function scenarioFor(state: GameState): Scenario | null {
  const deck = getDeck(state.level);
  return state.scenarioIndex < deck.length ? deck[state.scenarioIndex] : null;
}

function addAchievement(state: GameState, events: GameEvent[], name: string) {
  if (!state.achievements.includes(name)) {
    state.achievements = [...state.achievements, name];
    events.push({ month: state.month, kind: 'achievement', text: `Achievement unlocked: ${name}`, points: 50, reputation: 0 });
    state.score += 50;
    state.breakdown = { ...state.breakdown, bonus: state.breakdown.bonus + 50 };
  }
}

function runMonthEnd(state: GameState, events: GameEvent[]): void {
  // Income + deterioration on the book
  let nplThisMonth = false;
  state.deals = state.deals.map((deal) => {
    if (deal.status === 'npl') return deal;
    const d = { ...deal };
    // only a performing book earns — watchlisted names are frozen
    if (d.status === 'performing') {
      const inc = incomePoints(d);
      events.push({
        month: state.month,
        kind: 'income',
        text: `${d.clientName} — ${d.summary}: facility income earned.`,
        points: inc,
        reputation: 0,
      });
      state.score += inc;
      state.breakdown = { ...state.breakdown, portfolio: state.breakdown.portfolio + inc };
    }

    // audit findings surface with a lag
    if (d.auditMonth === state.month) {
      events.push({
        month: state.month,
        kind: 'audit',
        text: `Internal audit finding on the ${d.clientName} file: process gaps at booking (sequence/documentation). Remediation required.`,
        points: -100,
        reputation: -8,
      });
      state.score -= 100;
      state.breakdown = { ...state.breakdown, process: state.breakdown.process - 100 };
      state.reputation -= 8;
      d.auditMonth = undefined;
    }

    // deterioration driven by structuring quality
    const roll = Math.random();
    if (d.status === 'performing') {
      const pWatch = d.quality < 40 ? 0.35 : d.quality < 70 ? 0.1 : 0.02;
      if (roll < pWatch) {
        d.status = 'watch';
        events.push({ month: state.month, kind: 'watch', text: consequenceText(d, 'watch'), points: -60, reputation: -5 });
        state.score -= 60;
        state.breakdown = { ...state.breakdown, portfolio: state.breakdown.portfolio - 60 };
        state.reputation -= 5;
      }
    } else if (d.status === 'watch') {
      const pNpl = d.quality < 40 ? 0.4 : d.quality < 60 ? 0.15 : 0.05;
      if (roll < pNpl) {
        d.status = 'npl';
        nplThisMonth = true;
        events.push({ month: state.month, kind: 'npl', text: consequenceText(d, 'npl'), points: -300, reputation: -15 });
        state.score -= 300;
        state.breakdown = { ...state.breakdown, portfolio: state.breakdown.portfolio - 300 };
        state.reputation -= 15;
      } else if (d.quality >= 60 && roll > 0.7) {
        d.status = 'performing';
        events.push({
          month: state.month,
          kind: 'info',
          text: `${d.clientName} has stabilised and returns to performing status — sound structure pays off.`,
          points: 20,
          reputation: 2,
        });
        state.score += 20;
        state.breakdown = { ...state.breakdown, portfolio: state.breakdown.portfolio + 20 };
        state.reputation += 2;
      }
    }
    return d;
  });

  // market pulse: an occasional bit of desk news to keep months from feeling identical
  if (Math.random() < 0.45) {
    const seen = state.newsSeen ?? [];
    const fresh = newsItems.filter((n) => !seen.includes(n.id));
    if (fresh.length > 0) {
      const item = fresh[Math.floor(Math.random() * fresh.length)];
      state.newsSeen = [...seen, item.id];
      events.push({ month: state.month, kind: 'news', text: item.text, points: item.points, reputation: 0 });
      state.score += item.points;
      state.breakdown = { ...state.breakdown, bonus: state.breakdown.bonus + item.points };
    }
  }

  if (!nplThisMonth && state.month >= 3 && events.every((e) => e.points >= 0)) {
    // quiet, healthy month
    events.push({ month: state.month, kind: 'info', text: 'Clean monitoring month — no findings, no deterioration across the book.', points: 15, reputation: 1 });
    state.score += 15;
    state.breakdown = { ...state.breakdown, bonus: state.breakdown.bonus + 15 };
    state.reputation += 1;
  }

  state.reputation = Math.max(0, Math.min(100, state.reputation));
}

export function reduce(state: GameState, action: Action): GameState {
  const s: GameState = { ...state, breakdown: { ...state.breakdown } };

  switch (action.type) {
    case 'MEETING_DONE': {
      const deck = getDeck(s.level);
      const scenario = deck[s.scenarioIndex];
      const events: GameEvent[] = [];
      const avg = (ns: number[]) => ns.reduce((a, b) => a + b, 0) / Math.max(1, ns.length);
      let lost = false;
      let healthSum = 0;
      let bestCount = 0;
      for (const pick of action.result.picks) {
        const pts = Math.round(avg(pick.qualities.map((q) => QUALITY_POINTS[q])));
        healthSum += avg(pick.qualities.map((q) => QUALITY_HEALTH[q]));
        s.score += pts;
        s.breakdown.structuring += pts;
        s.reputation += Math.round(avg(pick.qualities.map((q) => QUALITY_REP[q])));
        if (!pick.books) lost = true;
        const allBest = pick.qualities.every((q) => q === 'best');
        if (allBest) {
          bestCount++;
          s.streak++;
          if (s.streak > 0 && s.streak % 3 === 0) {
            s.score += 50;
            s.breakdown.bonus += 50;
            events.push({ month: s.month, kind: 'info', text: `Decision streak ×${s.streak} — bonus points for consistent sound judgement.`, points: 50, reputation: 0 });
          }
        } else if (pick.qualities.some((q) => q === 'poor' || q === 'bad')) {
          s.streak = 0;
        }
      }
      const quality = Math.round(healthSum / action.result.picks.length);
      if (bestCount === action.result.picks.length) addAchievement(s, events, 'Flawless Structuring');

      // For decline-type scenarios (dealSizeKD 0), the "right" outcome may be no booking.
      const lostWasWrong =
        lost &&
        action.result.picks.some((p) => !p.books && p.qualities.some((q) => q === 'poor' || q === 'bad'));
      if (lostWasWrong) {
        events.push({
          month: s.month,
          kind: 'lost',
          text: `${scenario.client.name} took their business to a competitor. The relationship — and its income — is gone.`,
          points: -100,
          reputation: -3,
        });
        s.score -= 100;
        s.breakdown.portfolio -= 100;
        s.reputation -= 3;
      }

      if (lost || scenario.dealSizeKD <= 0) {
        s.pendingDeal = null;
        s.pendingLost = lost;
        // No booking: for decline scenarios there is still process/judgment learning, but no file to process.
        s.monthEvents = events;
        s.phase = lost ? 'monthEnd' : scenario.plantedError ? 'process' : 'monthEnd';
        if (s.phase === 'monthEnd') runMonthEnd(s, events);
      } else {
        const consequences = action.result.picks.flatMap((p) => p.consequences);
        s.pendingDeal = {
          scenarioId: scenario.id,
          clientName: scenario.client.name,
          summary: scenario.facilitySummary,
          sizeKD: scenario.dealSizeKD,
          quality,
          consequences,
          processScore: 100,
          bookedMonth: s.month,
          status: 'performing',
        };
        s.pendingLost = false;
        s.monthEvents = events;
        s.phase = 'process';
      }
      s.reputation = Math.max(0, Math.min(100, s.reputation));
      save(s);
      return s;
    }

    case 'PROCESS_DONE': {
      const events: GameEvent[] = [...s.monthEvents];
      const parts = [action.result.drillScore];
      if (action.result.plantedScore !== null) parts.push(action.result.plantedScore);
      const processScore = Math.round(parts.reduce((a, b) => a + b, 0) / parts.length);
      // two-sided: a clean file earns up to +100, a sloppy one costs up to -100
      const pts = Math.round((processScore - 50) * 2);
      s.score += pts;
      s.breakdown.process += pts;
      if (action.result.plantedScore === 100) addAchievement(s, events, 'Audit-Proof');
      if (processScore === 100) addAchievement(s, events, 'SOP Perfectionist');

      if (s.pendingDeal) {
        const deal = { ...s.pendingDeal, processScore };
        if (processScore < 60) {
          // sloppy processing surfaces as an audit finding 2 months later
          deal.auditMonth = s.month + 2;
        }
        s.deals = [...s.deals, deal];
        s.pendingDeal = null;
      }
      s.monthEvents = events;
      runMonthEnd(s, events);
      s.phase = 'monthEnd';
      save(s);
      return s;
    }

    case 'MONTH_CONTINUE': {
      if (s.reputation <= 0) {
        s.finished = true;
        s.endedEarly = true;
        s.phase = 'results';
        // board intervention is a failure, not an escape hatch
        s.score -= BOARD_PENALTY;
        s.breakdown.bonus -= BOARD_PENALTY;
        finalize(s);
        save(s);
        return s;
      }
      const deck = getDeck(s.level);
      s.month += 1;
      s.scenarioIndex += 1;
      s.monthEvents = [];
      if (s.month > config.campaignMonths || s.scenarioIndex >= deck.length + 2) {
        s.finished = true;
        s.phase = 'results';
        finalize(s);
        save(s);
        return s;
      }
      if (s.scenarioIndex < deck.length) {
        s.phase = 'meeting';
      } else {
        // monitoring-only month at the end of the campaign
        const events: GameEvent[] = [];
        runMonthEnd(s, events);
        s.monthEvents = events;
        s.phase = 'monthEnd';
      }
      save(s);
      return s;
    }
  }
}

function finalize(s: GameState) {
  const events: GameEvent[] = [...s.monthEvents];
  if (s.deals.length > 0 && s.deals.every((d) => d.status !== 'npl')) {
    addAchievement(s, events, 'Zero NPL Campaign');
  }
  if (s.reputation >= 85) addAchievement(s, events, 'Trusted Adviser');
  s.monthEvents = events;
  clearSave(s.profileId ?? 'local');
}

export function grade(score: number, level: number): string {
  const t = score / (level <= 2 ? 1 : 1.15);
  if (t >= 2400) return 'AAA — Committee Chair material';
  if (t >= 2000) return 'AA — Senior Relationship Manager';
  if (t >= 1500) return 'A — Solid credit mind';
  if (t >= 1000) return 'BBB — Developing well';
  if (t >= 500) return 'BB — Re-read the credit manual';
  if (t >= 0) return 'C — The audit department would like a word';
  if (t >= -1000) return 'CC — Lending license under review';
  return 'D — HR would like a word';
}

export function save(state: GameState) {
  try {
    state.savedAt = Date.now();
    localStorage.setItem(saveKey(state.profileId ?? 'local'), JSON.stringify(state));
  } catch {
    /* storage unavailable — ignore */
  }
}

export function loadSave(profileId = 'local'): GameState | null {
  try {
    const raw = localStorage.getItem(saveKey(profileId));
    if (!raw) return null;
    const s = JSON.parse(raw) as GameState;
    return s.finished ? null : s;
  } catch {
    return null;
  }
}

export function clearSave(profileId = 'local') {
  try {
    localStorage.removeItem(saveKey(profileId));
  } catch {
    /* ignore */
  }
}
