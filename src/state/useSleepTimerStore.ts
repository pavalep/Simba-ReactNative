/**
 * V19 W3.5.6 — `useSleepTimerStore`.
 *
 * mmkv-backed zustand store for the user's sleep-timer selection.
 *
 * Why JS-side (not an mpv feature):
 *   mpv has no built-in sleep timer. The W3.5.6 UX is a chrome-level
 *   countdown that pauses playback when the timer expires — exactly what
 *   VLC + MX Player + YouTube Premium do (the OS sleep timer apps on
 *   Android do NOT integrate with mpv, only with the foreground audio
 *   session). The chrome owns the countdown, so the countdown's owner is
 *   `useSleepTimerOwner` in `src/infrastructure/player/`, mounted ONCE
 *   above both lanes.
 *
 * ## The armed timer is SESSION state, and it is NOT persisted
 *
 * This store used to persist `minutes`. The value it persisted was the
 * ARMED timer — the same number the value row showed — and the sheet
 * armed a countdown from it on mount. So a fresh app start re-armed a
 * countdown the user had never set in that session: playback stopped
 * 30 minutes into whatever they happened to start, for a timer they had
 * set yesterday. The store's own docblock said the opposite ("a fresh
 * app start resets the timer to 'off'"), which is the kind of comment
 * that hides a defect instead of documenting one.
 *
 * The two halves cannot both be true of one number:
 *
 *   - if the number is the ARMED timer, it must not survive the session
 *     — Spotify, Apple Music, YouTube Music and Audible all re-arm per
 *     session, and none of them remembers yesterday's choice;
 *   - if the number is a remembered CHOICE, it is a different fact from
 *     the armed timer, and it needs its own field — and no shipping
 *     player of this class keeps one.
 *
 * So the timer is session state and the store is not persisted. A fresh
 * start has no timer armed, and the value row says "Off", which is
 * true.
 *
 * Timer semantics:
 *   - `minutes === 0` → timer off (no countdown).
 *   - `minutes > 0`  → timer armed. The owner starts a countdown that
 *     pauses at zero, and the store resets itself so that re-arming
 *     requires user intent.
 *
 * Architecture source of truth: `md/SIMBA_PLAYER_MODULE_V19_SPECIFICATION.md`
 * §3.10.
 */

import {create} from 'zustand';

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
>()(set => ({
  minutes: DEFAULT_SLEEP_TIMER_MINUTES,
  setMinutes: (minutes: number) =>
    set({minutes: minutes > 0 ? minutes : 0}),
  reset: () => set({minutes: DEFAULT_SLEEP_TIMER_MINUTES}),
}));
