import facilitiesData from '../data/facilities.json';
import collateralData from '../data/collateral.json';
import sopData from '../data/sop.json';
import level1 from '../data/scenarios.level1.json';
import level2 from '../data/scenarios.level2.json';
import level3 from '../data/scenarios.level3.json';
import configData from '../data/config.json';
import type { Facility, CollateralType, Scenario, SopStep } from './types';

export const config = configData;
export const facilities = facilitiesData as Facility[];
export const collateralTypes = collateralData as CollateralType[];
export const sopSteps = (sopData.steps as SopStep[]);
export const sopDocuments = sopData.documents as Record<string, string[]>;

const decks: Record<number, Scenario[]> = {
  1: level1 as unknown as Scenario[],
  2: level2 as unknown as Scenario[],
  3: level3 as unknown as Scenario[],
};

export function getDeck(level: 1 | 2 | 3): Scenario[] {
  return decks[level];
}

export const LEVEL_INFO: Record<number, { title: string; audience: string; blurb: string }> = {
  1: {
    title: 'Level 1 — Foundations',
    audience: 'Fresh graduates',
    blurb: 'Meet eight clients and learn each facility one need at a time: LCs, guarantees, overdrafts, the STRL, term loans and discounting. Analyst hints are shown inline.',
  },
  2: {
    title: 'Level 2 — Structuring',
    audience: '1–5 years of experience',
    blurb: 'Sizing limits from the working capital cycle, reading DSCR tables, matching usance to the trade cycle, restructuring messy clients — and resisting clients who push.',
  },
  3: {
    title: 'Level 3 — Refresher',
    audience: '5+ years of experience',
    blurb: 'The hard files: window dressing, evergreening, diversion by tenor, concentration, overtrading, and ratios that lie without their sector. Trust nothing; verify everything.',
  },
};

export function requiredDocs(docTags: string[]): string[] {
  const docs: string[] = [];
  for (const tag of docTags) {
    for (const d of sopDocuments[tag] ?? []) {
      if (!docs.includes(d)) docs.push(d);
    }
  }
  return docs;
}

export function distractorDocs(): string[] {
  return sopDocuments['distractors'] ?? [];
}

export function formatKD(n: number): string {
  return 'KD ' + n.toLocaleString('en-US');
}
