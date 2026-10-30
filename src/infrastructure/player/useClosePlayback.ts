/**
 * V22 W22 (2026-10-21) — `useClosePlayback`, the ONE owner of the close verb.
 *
 * ## Why this exists
 *
 * "Close" is a verb with a precise meaning in this app, and it was being
 * spelled out in more than one place. `PlayerChrome`'s X (the dock's X and
 * the audio player's X) already implemented it correctly; the video player's
 * options sheet had no close at all, which left the user with exactly one
 * way out of a playing film — minimise to the dock and then press the X.
 *
 * Two owners of one teardown is the class of defect this app keeps hitting:
 * the two copies drift, and the one nobody tests keeps working. So the
 * teardown moved here and both call sites now call it.
 *
 * ## What "close" means, exactly
 *
 * The lib's own `stopPlayback()` docblock is the authority: "This is *the*
 * teardown, for both lanes. It is what 'close' means: the engine stops and
 * the foreground service is released." It is NOT `commands.stop()`, which
 * silences the engine while leaving the media session registered and the
 * notification posted — a "closed" player that still owns the media button
 * and still shows in the shade.
 *
 * So a close is, in this order:
 *
 *   1. `stopPlayback()` — engine stops, service released, notification
 *      dismissed.
 *   2. `endSession()` — `nowPlaying.current` becomes null, so the picture
 *      unmounts, the dock disappears and the fullscreen chrome goes with
 *      them. Only now is it true that nothing is playing. Clearing FIRST
 *      would hide a player whose audio is still going, which is a lie the
 *      user cannot detect.
 *
 * There is deliberately no third step. The presentation store is the
 * user's standing request — "what did I ask for the video" — and a close
 * is not a request for the NEXT video to start minimised.
 *
 * Step 3 is what makes this a CLOSE and not a MINIMISE. Minimise is
 * `setVideoPresentation('mini')` alone: the film keeps playing and the
 * dock appears. The top bar's back chevron does that, deliberately.
 *
 * ## The failure path
 *
 * If the native stop throws, the media is still playing. The UI is left
 * standing and the failure is surfaced, because dismissing the player while
 * audio keeps going is a lie the user cannot detect until they wonder why
 * sound is coming from a closed screen. The toast is raised here, in the
 * one place that owns the verb, so no call site can forget it.
 *
 * ## Boundary note
 *
 * This file lives in `src/infrastructure/player/` because that is the only
 * directory allowed to import the player module
 * (`scripts/check-import-boundaries.js`, PLAYER rule). It previously lived
 * inline in `PlayerChrome.tsx`, which was itself a boundary violation.
 *
 * It reads the presentation LIVE from the store at call time rather than
 * closing over a value captured at render time — the same discipline as
 * SPEC invariant I30 ("a command that decides from a live value must read
 * it live").
 */

import {useCallback} from 'react';
import {getMpvPlayerModule} from '@simba-dev/react-native-media-player';
import {useToast} from '../../components/feedback/Toast';
import {useNowPlayingStore} from '../../state/nowPlayingStore';

/**
 * The close verb. Returns a callback; call it to close media playback.
 *
 * The callback is safe to call when nothing is playing: `stopPlayback()`
 * on an idle engine is a no-op on the native side, and the session is
 * already clear.
 */
export function useClosePlayback(): () => void {
  const toast = useToast();
  const endSession = useNowPlayingStore(s => s.end);

  return useCallback(() => {
    try {
      // Stops the engine and sends ACTION_STOP, so the session is
      // released and the notification is dismissed. A plain
      // `commands.stop()` would leave both.
      //
      // `stopPlayback` is named for what it does, not for a lane: video
      // and audio share one process-global engine, so there is one
      // teardown and one name for it.
      getMpvPlayerModule().stopPlayback();
    } catch (error) {
      // The media is still playing. Leave the player standing and say so.
      toast.show(
        error instanceof Error ? error.message : 'Could not stop playback',
        'error',
      );
      return;
    }

    // Only now is it true that nothing is playing. Clearing first would
    // hide a player whose audio is still going.
    //
    // Clearing the session is also what takes the chrome down: the video
    // lane and the audio lane both live inside a subtree that renders
    // nothing when there is no session, so the fullscreen player and the
    // dock both go with it.
    //
    // And it is what RELEASES THE WINDOW. The browsing stack is blanked
    // while a fullscreen video owns it, and the owner is derived from the
    // request AND a session that can honour it (`useVideoOwnsWindow`), not
    // from the request alone. So ending the session hands the window back
    // to the feed, and nothing here has to rewrite the request to do it.
    //
    // That separation matters, and it was learned the hard way. An earlier
    // version of this hook keyed the window on the request alone, so after a
    // close the chrome went away and the feed stayed blanked: the app sat
    // on a blank white screen until it was restarted. Measured on device,
    // 2026-10-26.
    //
    // So: do NOT write the presentation store on the way out. It is the
    // user's standing request ("what did I ask for the video"), and a close
    // is not a request for the next video to start minimised. The launch
    // seam writes 'expanded' on every video launch, so the next video opens
    // fullscreen either way.
    endSession();

    // The app is portrait whenever there is NO session, and this is the
    // ONE place a session ends.
    //
    // The window can be in landscape while a session lives: the
    // orientation lock pins it there, and the device can simply be
    // rotated. Ending the session has to hand the window back, or the
    // browsing UI is left in landscape with nothing playing.
    //
    // `MainActivity.onResume()` restores portrait too, but only on a
    // background -> foreground transition. It cannot help when the
    // session ends while the app is ALREADY in front, which is the
    // common case: the user closes the player and lands on the feed.
    //
    // The lib's own `setOrientation('portrait')` is the command the
    // player's orientation lock already uses - `useTransport`'s
    // `setOrientationLock` calls `commands.setOrientation`, and the lib
    // routes that to `getMpvPlayerModule().setOrientation` - so this is
    // the SAME call, not a second mechanism. It maps to
    // `SCREEN_ORIENTATION_PORTRAIT`, the same constant the app's
    // boot-time `lockToPortrait()` sets on Android. So the window has ONE
    // mechanism during a session (the lib's command) and one outside it
    // (the app's boot lock), and the handover happens here, where the
    // session stops.
    //
    // It is the lib's command and NOT the app's `lockToPortrait()`, for
    // two reasons that were measured, not assumed:
    //
    //  - `src/utils/orientation.ts` imports `react-native-orientation-
    //    locker`, whose module body constructs a `NativeEventEmitter`
    //    with no argument. Importing it into the player facade broke 22
    //    jest suites at MODULE level - not on an assertion - and that
    //    helper and `AppContent` are therefore untestable in jest.
    //  - The lib is ANDROID-ONLY: `react-native.config.js` declares
    //    `ios: null` and the package ships no `ios/` folder, so the
    //    player - and the landscape-while-playing state this restores
    //    from - only exists where the lib's command is live.
    //
    // The lib's command also refuses LOUDLY: `setOrientation` logs a
    // warning when there is no current activity, instead of quietly doing
    // nothing.
    getMpvPlayerModule().setOrientation('portrait');
  }, [endSession, toast]);
}
