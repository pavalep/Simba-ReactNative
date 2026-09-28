/**
 * V19 W3.5.6 — `useSleepTimerStore`.
 *
 * MMKV-backed Zustand store for the user's sleep timer selection.
 *
 * Why JS-side (not an mpv feature):
 *   mpv has no built-in sleep timer. The W3.5.6 UX is a chrome-level
 *   countdown that calls `commands.pause()` when the timer expires —
 *   exactly what VLC + MX Player + YouTube Premium all do (the OS
 *   sleep timer apps on Android do NOT integrate with mpv, only with
 *   the foreground audio session). The chrome owns the countdown, so
 *   navigating away from NowPlayingScreen CANCELS the timer (the
 *   hook re-derives correctness on every mount — if the user is no
 *   longer in the player, the timer is a no-op).
 *
 * Persistence: the chip selection is persisted; the running countdown
 * is NOT (a fresh app start resets the timer to "off" — that's the
 * standard for sleep timers across media players).
 *
 * Timer semantics:
 *   - `selectedMinutes === null` → timer off (no countdown).
 *   - `selectedMinutes > 0`      → timer armed. The hook starts a
 *     countdown that calls `commands.pause()` at zero. The user can
 *     disarm (set back to null) at any time.
 *
 * Architecture source of truth: `md/SIMBA_PLAYER_MODULE_V19_SPECIFICATION.md`
 * §3.10.
 */

import {create} from 'zustand';
import {persist, createJSONStorage} from 'zustand/middleware';
import {sharedMMKVStorage, CURRENT_PERSIST_VERSION} from './persistence';

export const SLEEP_TIMER_OPTIONS: ReadonlyArray<{
  value: number; // minutes; 0 = Off
  label: string;
}> = [
  {value: 0, label: 'Off'},
  {value: 5, label: '5 min'},
  {value: 10, label: '10 min'},
  {value: 15, label: '15 min'},
  {value: 30, label: '30 min'},
  {value: 45, label: '45 min'},
  {value: 60, label: '60 min'},
];

export interface SleepTimerActions {
  /**
   * Arm or disarm the timer. Pass `0` (or any non-positive value) to
   * disarm. Pass positive minutes to arm.
   */
  setMinutes: (minutes: number) => void;
  reset: () => void;
}

const DEFAULT_SLEEP_TIMER_MINUTES = 0;

export const useSleepTimerStore = create<
  {minutes: number} & SleepTimerActions
>()(
  persist(
    set => ({
      minutes: DEFAULT_SLEEP_TIMER_MINUTES,
      setMinutes: (minutes: number) =>
        set({minutes: minutes > 0 ? minutes : 0}),
      reset: () => set({minutes: DEFAULT_SLEEP_TIMER_MINUTES}),
    }),
    {
      name: 'player.sleepTimerMinutes',
      storage: createJSONStorage(() => sharedMMKVStorage),
      version: CURRENT_PERSIST_VERSION,
    },
  ),
);
