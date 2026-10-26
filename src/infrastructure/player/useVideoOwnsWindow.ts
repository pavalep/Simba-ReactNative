/**
 * V22 W22 (2026-10-21) — `useVideoOwnsWindow`: does the video own the window?
 *
 * ## The defect this exists to fix
 *
 * While a fullscreen video is up, the browsing stack is blanked: the feed must
 * not flash behind the picture, and it must not swallow the player's touches.
 *
 * That blanking used to be keyed on `presentation.isExpanded` — the user's
 * REQUEST for a fullscreen video.
 *
 * The request outlives the session, and that is deliberate: the close verb
 * ends the session without rewriting the request, because the request means
 * "what did I ask for the video", and a close is not a request for the NEXT
 * video to start minimised.
 *
 * But keying the WINDOW on the request meant the window stayed owned after
 * the video was gone. The chrome unmounted with the session, the feed stayed
 * blanked, and the app sat on a blank white screen with nothing on it.
 *
 * **Measured on device, 2026-10-26 (emulator-5554, API 37):** launch a film,
 * press the header's back. The native teardown ran (`[stopPlayback] service
 * not running; engine stopped`) and the chrome went away — but the screen
 * stayed white. Two minutes later it was still white. The app was unusable
 * until the process was restarted.
 *
 * ## Two facts, not one
 *
 * The window is owned by the video when BOTH hold:
 *
 *   1. the user asked for fullscreen (`presentation.isExpanded`), and
 *   2. there is a video session that can honour that request.
 *
 * (1) alone is the request. (2) alone is "something is loaded". Neither one
 * is the window's owner on its own, and using either by itself is what
 * produced the blank screen.
 *
 * ## Why this is NOT `usePresentation`
 *
 * `usePresentation` derives the MODE from the app's own request, and it is
 * forbidden from reading the session — deliberately, and with a test that
 * fails if it ever does (`usePresentation.test.tsx`, "imports nothing from
 * nowPlayingStore").
 *
 * That rule is about a DIFFERENT question. The old derivation used "a video
 * session exists" as a proxy for "video is ON SCREEN", which is not evidence
 * of anything — a session can exist with no surface revealed.
 *
 * "Is there a video session that can own the window" is precisely what a
 * session IS. So the session is read HERE, where the question is the window's,
 * and not in the presentation's derivation, where the question is the
 * request's.
 *
 * ## The same answer everywhere
 *
 * Two things ask "does the video own the window?": the browsing stack (may it
 * paint?) and the hardware-back handler (may it swallow the press?). They
 * used to ask it in two different ways, which is how they came to disagree.
 * Now they ask this one.
 */

import {useNowPlayingStore} from '../../state/nowPlayingStore';
import {usePresentation} from './usePresentation';

/**
 * `true` while a fullscreen VIDEO session owns the window.
 *
 * `false` for an audio session (audio has no window of its own — it is drawn
 * over the app), for a minimised video (the feed is meant to be visible
 * beside the dock), and during PiP (the OS window owns the surface).
 */
export function useVideoOwnsWindow(): boolean {
  const {isExpanded} = usePresentation();
  const streamType = useNowPlayingStore(s => s.current?.streamType);
  return isExpanded && streamType === 'video';
}
