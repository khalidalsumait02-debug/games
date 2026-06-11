// Best-effort save sync with the shared server. Everything degrades
// gracefully: no server, no PIN, or no network → purely local saves.
import { config } from './content';
import type { GameState } from './types';
import type { Profile } from './profiles';

function canSync(profile: Profile | null): profile is Profile & { pin: string } {
  return Boolean(profile?.pin);
}

/** Push the current save (or null when the campaign ends) to the server. Fire-and-forget. */
export function pushSave(profile: Profile | null, state: GameState | null): void {
  if (!canSync(profile)) return;
  fetch(`${config.leaderboardUrl}/api/saves`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: profile.name, pin: profile.pin, state }),
    signal: AbortSignal.timeout(4000),
  }).catch(() => {
    /* offline — local save still holds */
  });
}

/** Fetch the server-side save for this account, if any. */
export async function pullSave(profile: Profile | null): Promise<GameState | null> {
  if (!canSync(profile)) return null;
  try {
    const res = await fetch(
      `${config.leaderboardUrl}/api/saves?name=${encodeURIComponent(profile.name)}&pin=${encodeURIComponent(profile.pin)}`,
      { signal: AbortSignal.timeout(4000) }
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { state: GameState | null };
    return data.state ?? null;
  } catch {
    return null;
  }
}
