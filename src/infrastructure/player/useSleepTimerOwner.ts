/**
 * WAVE B15 — the SLEEP TIMER's countdown owner.
 *
 * ## Why it moved out of the video lane
 *
 * The countdown lived inside `VideoMoreSheet`, which is a VIDEO-lane
 * component. That was fine while the video lane was the only lane with
 * a more sheet. It is not fine now that the audio lane has one too:
 *
 *   - two lanes, two countdown timers, two timeouts — and whichever
 *     sheet happened to mount last would decide when playback pauses;
 *   - the audio lane's sheet would have had to mount a SECOND owner of
 *     the same countdown.
 *
 * So the countdown is owned ONCE, here, and mounted once — above both
 * lanes, in `AppRoot`, which is the only place that is mounted for the
 * whole app session and therefore the only place a countdown can survive
 * the user opening and closing a sheet.
 *
 * ## What the countdown does
 *
 * mpv has no sleep timer. The app implements it the way VLC, MX Player
 * and YouTube Premium do: a chrome-level countdown that pauses playback
 * when it reaches zero.
 *
 * When it fires, the timer is reset to "off" so that re-arming requires
 * an explicit user action — otherwise the sheet's value row would keep
 * reporting a timer that had already expired.
 *
 * Architecture source of truth:
 * `md/SIMBA_PLAYER_MODULE_V19_SPECIFICATION.md` §3.10.
 */

import * as React from 'react';
import {useSleepTimerStore} from '../../state/useSleepTimerStore';
import {useTransport} from './useTransport';

/**
 * Owns the running sleep-timer countdown.
 *
 * Mount it ONCE, above every lane. Calling it twice would give the same
 * timer two timeouts.
 */
export function useSleepTimerOwner(): void {
  const minutes = useSleepTimerStore(s => s.minutes);
  const setMinutes = useSleepTimerStore(s => s.setMinutes);
  const {commands} = useTransport();
  const handleRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    if (handleRef.current) {
      clearTimeout(handleRef.current);
      handleRef.current = null;
    }
    if (!Number.isFinite(minutes) || minutes <= 0) return;
    const ms = minutes * 60_000;
    handleRef.current = setTimeout(() => {
      handleRef.current = null;
      // Reset to "Off" so the next arm requires explicit user action,
      // and so the value row stops reporting a timer that has expired.
      setMinutes(0);
      try {
        commands.pause();
      } catch {
        // The engine may already be gone (the session was closed while
        // the timer ran). There is nothing to pause, and nothing to say.
      }
    }, ms);
    return () => {
      if (handleRef.current) {
        clearTimeout(handleRef.current);
        handleRef.current = null;
      }
    };
  }, [minutes, setMinutes, commands]);
}
