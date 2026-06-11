import facilitiesData from '../data/facilities.json';
import collateralData from '../data/collateral.json';
import sopData from '../data/sop.json';
import level1 from '../data/scenarios.level1.json';
import level2 from '../data/scenarios.level2.json';
import level3 from '../data/scenarios.level3.json';
import level4 from '../data/scenarios.level4.json';
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
  4: level4 as unknown as Scenario[],
};

export function getDeck(level: 1 | 2 | 3 | 4): Scenario[] {
  return decks[level];
}

export const LEVEL_INFO: Record<number, { title: string; name: string; audience: string; blurb: string }> = {
  1: {
    title: 'Level 1 — Intern',
    name: 'Intern',
    audience: 'No banking background needed',
    blurb: 'What is a loan, a guarantee, an LC, collateral? One concept per client, fully explained as you play.',
  },
  2: {
    title: 'Level 2 — Analyst',
    name: 'Analyst',
    audience: 'Fresh graduates',
    blurb: 'Analyst hints always on, single-decision meetings, forgiving scoring.',
  },
  3: {
    title: 'Level 3 — Associate',
    name: 'Associate',
    audience: '1–5 years’ experience',
    blurb: 'Build proposals blank-by-blank: facility, amount and tenor each scored. Market events in play.',
  },
  4: {
    title: 'Level 4 — Senior RM',
    name: 'Senior RM',
    audience: '5+ years’ experience',
    blurb: 'Every decision built from five-option blanks. Complex structures, thin margins for error, full audit exposure.',
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
