/**
 * Sleep timer helpers shared by the players, mini player, and pickers (P50).
 */

/** Preset countdown options shown in the sleep timer pickers. */
export const SLEEP_TIMER_PRESETS = [5, 15, 30, 45, 60] as const;

/** Format milliseconds as m:ss (or h:mm:ss past an hour). */
export function formatSleepRemaining(ms: number): string {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/** Human label for a sleep timer mode. */
export function sleepTimerModeLabel(mode: 'time' | 'track' | 'chapter'): string {
  switch (mode) {
    case 'track':
      return 'End of track';
    case 'chapter':
      return 'End of chapter';
    default:
      return 'Sleep timer';
  }
}
