export type Quality = 'best' | 'good' | 'poor' | 'bad';

export interface DecisionOption {
  id: string;
  label: string;
  detail?: string;
  quality: Quality;
  feedback: string;
  consequence?: string;
  books?: boolean;
}

export interface Decision {
  id: string;
  stage: 'structure' | 'collateral' | 'judgment';
  prompt: string;
  options: DecisionOption[];
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
  optionId: string;
  quality: Quality;
  consequence?: string;
  books: boolean;
}

export interface MeetingResult {
  scenarioId: string;
  picks: MeetingPick[];
}

export interface ProcessResult {
  scenarioId: string;
  orderScore: number; // 0-100
  docScore: number; // 0-100
  plantedScore: number | null; // 0-100 or null if no planted error
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
  level: 1 | 2 | 3;
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
