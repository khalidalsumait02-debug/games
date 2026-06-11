// Lightweight local accounts: each profile has its own save slot and stats.
// A profile with a PIN can also sync its save through the shared server,
// enabling resume-from-any-device.
export interface Profile {
  id: string;
  name: string;
  pin?: string; // present = cross-device sync enabled (when a server is configured)
  createdAt: number;
  best: Partial<Record<1 | 2 | 3 | 4, number>>;
  campaignsCompleted: number;
}

const PROFILES_KEY = 'dcb_profiles_v1';
const ACTIVE_KEY = 'dcb_active_profile_v1';

function readAll(): Profile[] {
  try {
    return JSON.parse(localStorage.getItem(PROFILES_KEY) ?? '[]') as Profile[];
  } catch {
    return [];
  }
}

function writeAll(profiles: Profile[]) {
  try {
    localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
  } catch {
    /* ignore */
  }
}

export function listProfiles(): Profile[] {
  return readAll();
}

export function createProfile(name: string, pin?: string): Profile {
  const profile: Profile = {
    id: `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    name: name.trim().slice(0, 30),
    pin: pin && /^\d{4,8}$/.test(pin) ? pin : undefined,
    createdAt: Date.now(),
    best: {},
    campaignsCompleted: 0,
  };
  const all = readAll();
  all.push(profile);
  writeAll(all);
  setActiveProfile(profile.id);
  return profile;
}

export function deleteProfile(id: string) {
  writeAll(readAll().filter((p) => p.id !== id));
  try {
    localStorage.removeItem(`dcb_save_v2_${id}`);
    if (localStorage.getItem(ACTIVE_KEY) === id) localStorage.removeItem(ACTIVE_KEY);
  } catch {
    /* ignore */
  }
}

export function updateProfile(updated: Profile) {
  writeAll(readAll().map((p) => (p.id === updated.id ? updated : p)));
}

export function recordResult(id: string, level: 1 | 2 | 3 | 4, score: number) {
  const all = readAll();
  const p = all.find((x) => x.id === id);
  if (!p) return;
  p.campaignsCompleted += 1;
  if (score > (p.best[level] ?? -Infinity)) p.best[level] = score;
  writeAll(all);
}

export function getActiveProfile(): Profile | null {
  const id = localStorage.getItem(ACTIVE_KEY);
  if (!id) return null;
  return readAll().find((p) => p.id === id) ?? null;
}

export function setActiveProfile(id: string) {
  try {
    localStorage.setItem(ACTIVE_KEY, id);
  } catch {
    /* ignore */
  }
}

/** One-time migration: players from before accounts existed get a profile
 *  built from their remembered name and any in-progress save. */
export function migrateLegacy(): void {
  if (readAll().length > 0) return;
  const legacyName = localStorage.getItem('dcb_player_name');
  const legacySave = localStorage.getItem('dcb_save_v1');
  if (!legacyName && !legacySave) return;
  const profile = createProfile(legacyName ?? 'Player');
  if (legacySave) {
    try {
      localStorage.setItem(`dcb_save_v2_${profile.id}`, legacySave);
      localStorage.removeItem('dcb_save_v1');
    } catch {
      /* ignore */
    }
  }
}
