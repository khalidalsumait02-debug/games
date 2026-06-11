export type Quality = 'best' | 'good' | 'poor' | 'bad';

export interface DecisionOption {
  id: string;
  label: string;
  detail?: string;
  quality: Quality;
  feedback: string;
  consequence?: string;  // tag for portfolio events
  books?: boolean;       // default true; false = no deal booked (declined/lost)
}

export interface SlotOption {
  id: string;
  label: string;
  quality: Quality;
  feedback: string;
  consequence?: string;
  books?: boolean;
}

/** One blank in a fill-in-the-blank decision (e.g. "Facility", "Amount", "Tenor"). */
export interface DecisionSlot {
  id: string;
  label: string;
  options: SlotOption[];
}

export interface Decision {
  id: string;
  stage: 'structure' | 'collateral' | 'judgment';
  prompt: string;
  /** classic single-choice decisions */
  options?: DecisionOption[];
  /** builder decisions: pick one option per slot */
  slots?: DecisionSlot[];
}

export interface RatioLine {
  label: string;
  value: string;
  benchmark?: string;
  hint?: string;
}

export interface PlantedError {
  prompt: string;
  /** the deal file contents shown for inspection — the clue is buried in here */
  exhibit?: string[];
  options: { id: string; label: string; correct: boolean; feedback: string }[];
}

export interface Scenario {
  id: string;
  client: { name: string; sector: string; contact: string; profile: string };
  request: string;
  analysisPack: {
    figures: { label: string; value: string }[];
    ratios: RatioLine[];
  };
  decisions: Decision[];
  dealSizeKD: number;
  facilitySummary: string;
  docTags: string[];
  plantedError?: PlantedError;
  learn: string;
}

export interface Facility {
  id: string;
  name: string;
  category: 'cash' | 'noncash';
  short: string;
  description: string;
  bestFor: string;
  warning: string;
  incomeRate: number;
  docTags: string[];
}

export interface CollateralType {
  id: string;
  name: string;
  description: string;
}

export interface SopStep {
  id: string;
  name: string;
  detail: string;
}

export type DealStatus = 'performing' | 'watch' | 'npl';

export interface BookedDeal {
  scenarioId: string;
  clientName: string;
  summary: string;
  sizeKD: number;
  quality: number; // 0-100 structuring quality
  consequences: string[];
  processScore: number; // 0-100
  bookedMonth: number;
  status: DealStatus;
  auditMonth?: number; // month an audit finding surfaces, if process was sloppy
}

export interface GameEvent {
  month: number;
  kind: 'income' | 'watch' | 'npl' | 'audit' | 'lost' | 'info' | 'achievement' | 'news';
  text: string;
  points: number;
  reputation: number;
}

export interface MeetingPick {
  decisionId: string;
  /** one quality per slot (single-element array for classic decisions) */
  qualities: Quality[];
  consequences: string[];
  books: boolean;
}

export interface MeetingResult {
  scenarioId: string;
  picks: MeetingPick[];
}

export type DrillKind = 'order-full' | 'next-step' | 'misplaced' | 'docs';

export interface ProcessResult {
  scenarioId: string;
  drillScore: number; // 0-100
  plantedScore: number | null; // 0-100, or null if no file check appeared
}

export type Phase = 'meeting' | 'process' | 'monthEnd' | 'results';

export interface ScoreBreakdown {
  structuring: number;
  process: number;
  portfolio: number;
  bonus: number;
}

export interface GameState {
  playerName: string;
  profileId: string;
  savedAt?: number;
  level: 1 | 2 | 3 | 4;
  month: number;
  phase: Phase;
  scenarioIndex: number;
  reputation: number;
  score: number;
  breakdown: ScoreBreakdown;
  streak: number;
  deals: BookedDeal[];
  monthEvents: GameEvent[];
  achievements: string[];
  newsSeen?: string[];
  finished: boolean;
  endedEarly: boolean;
  // transient: result of the meeting just played, consumed by process/monthEnd
  pendingDeal: BookedDeal | null;
  pendingLost: boolean;
}
