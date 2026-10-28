/**
 * V22 W32 (2026-10-28) — the mini player's bottom chrome.
 *
 * ## The defect this exists to fix
 *
 * The mini-player docks are an APP-LEVEL OVERLAY. They are painted at
 * `bottom: 0` of the window, over whatever screen the user happens to be
 * on — the video lane's `VideoDock` and the audio lane's mini bar.
 *
 * Every floating action button in the app floats at
 * `insets.bottom + spacing.lg` — one spacing step above the safe area —
 * and NOTHING knew that a dock might be up. The arithmetic:
 *
 *   • the docks are 54 dp tall at the window bottom, so their band is
 *     0…54 dp;
 *   • on a 24 dp gesture bar a FAB's bottom edge sits at 40 dp.
 *
 * So the dock's top **14 dp cover the bottom of the button**. Every FAB
 * in the app had that collision — Home, Movies, Music, Podcasts, Radio,
 * Live TV and Library — and no screen's scroll padding cleared the dock
 * either, so the last row of a list sat underneath it.
 *
 * ## The rule
 *
 *     bottom offset = max(insets.bottom, mini player band) + spacing.lg
 *
 * Both terms are measured from the WINDOW bottom, so they are
 * comparable. With no mini player up the band is 0 and the rule is the
 * app's long-standing `insets.bottom + spacing.lg` — nothing changes for
 * anyone who is not playing anything. With a dock up the band is 54 and
 * the button sits at 70 dp, clear of it.
 *
 * ## Why the FAB MOVES and the dock does not yield
 *
 * The alternative is to HIDE the FAB while a mini player is up, which is
 * what YouTube and Plex do. But this app's FABs are not decoration: the
 * Home one opens the file picker, the five catalogue ones open their
 * filter sheet, and the Library one opens the create-playlist sheet.
 * Hiding a control removes the action; moving it keeps it.
 *
 * The dock, by contrast, cannot move: it is the thing the user minimised
 * the player INTO, and lifting it off the bottom edge would put it over
 * the content the user is looking at.
 *
 * ## One owner for the height
 *
 * `MINI_PLAYER_HEIGHT` is the ONE place the dock's height is written
 * down, and it is derived from the same three numbers the docks lay
 * themselves out with — so the declared height and the rendered height
 * cannot drift apart. Both docks take their height from it, and every
 * screen that has to clear the dock reads it.
 *
 * Before this the height was an emergent property of four style numbers
 * spread across two files — the same "arithmetic sized for a component
 * that no longer exists" smell as the deleted bottom tab bar's 48 dp.
 *
 * ## What is deliberately NOT here
 *
 * The dock does not respect `insets.bottom`. It is painted at `bottom: 0`
 * of the window, so its bottom 24 dp sits under the system navigation
 * bar. On a gesture-bar device the bar is a floating pill in the middle
 * of the screen and the dock's artwork is on the left, so nothing is
 * covered; on a three-button device the dock's controls WOULD be under
 * the bar. That is the dock's own question, it is a separate change, and
 * pretending to solve it here would move the constant without a
 * measurement.
 */

import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {spacing} from '../../theme/tokens';
import {useNowPlayingStore} from '../../state/nowPlayingStore';
import {usePresentationStore} from '../../state/usePresentationStore';
import {useAudioPresentationStore} from '../../state/useAudioPresentationStore';

/**
 * The dock's progress hairline.
 *
 * Part of the height arithmetic, so it is owned here rather than being
 * a second `const` in each dock.
 */
export const MINI_PLAYER_PROGRESS_HEIGHT = 2;

/**
 * The dock's leading square — the artwork (audio) and the video slot.
 *
 * 44 is the artwork's own size AND the touch-target floor, so the row
 * meets both at once.
 */
export const MINI_PLAYER_ART_SIZE = 44;

/**
 * The dock row's vertical padding, above and below the art.
 *
 * `spacing.xs` — 4 dp. The row is `paddingTop` + art + the root's
 * `paddingBottom`, so this number appears twice in the height.
 */
export const MINI_PLAYER_ROW_PADDING = spacing.xs;

/**
 * The mini player's height in dp. THE owner.
 *
 * `2 (progress) + 44 (art) + 4 + 4 (row padding)` = 54.
 *
 * This is the height of the band the dock occupies at the bottom of the
 * window, and it is the number every screen that has to clear the dock
 * uses. It is a declaration, not a measurement: both docks set their own
 * height to it, so the band they paint and the band the app reserves are
 * the same band by construction.
 */
export const MINI_PLAYER_HEIGHT =
  MINI_PLAYER_PROGRESS_HEIGHT +
  MINI_PLAYER_ART_SIZE +
  MINI_PLAYER_ROW_PADDING * 2;

/**
 * Is a mini player on screen right now?
 *
 * The dock is VISIBLE, not merely mounted — the video lane's dock is
 * always laid out and only its opacity changes, so "mounted" would claim
 * a band that nothing is painting in.
 *
 * Two lanes, two answers, and the lane is decided by the same
 * `streamType` the chrome itself branches on: `PlayerChrome` renders the
 * audio lane for every session that is not a video, and `VideoLane`
 * renders for a session that is. A session with no `streamType` is the
 * audio lane, because that is what the chrome does with it.
 */
export function useMiniPlayerUp(): boolean {
  const nowPlaying = useNowPlayingStore(s => s.current);
  const videoPresentation = usePresentationStore(s => s.videoPresentation);
  const pipActive = usePresentationStore(s => s.pipActive);
  const audioMode = useAudioPresentationStore(s => s.mode);

  if (nowPlaying == null) return false;

  if (nowPlaying.streamType === 'video') {
    // The video dock shows in the dock presentation only. PiP hands the
    // window to the OS and the JS chrome is suppressed with it, so PiP
    // is NOT a mini player.
    return videoPresentation === 'mini' && !pipActive;
  }

  return audioMode === 'mini';
}

/**
 * The band of persistent bottom chrome, measured from the window bottom.
 *
 * `0` when nothing is playing, `MINI_PLAYER_HEIGHT` when a dock is up.
 * The dock ignores `insets.bottom` — it is painted at the window's own
 * bottom edge — so the band it occupies is its height and nothing else.
 */
export function useBottomChromeHeight(): number {
  return useMiniPlayerUp() ? MINI_PLAYER_HEIGHT : 0;
}

/**
 * The strip of the window the bottom chrome occupies.
 *
 * This is the REPLACEMENT for `insets.bottom`. The safe area says "the
 * system navigation bar is here"; the mini-player dock says "I am
 * here"; and whichever of the two is taller is the one that has to be
 * cleared.
 *
 * A screen adds its own furniture on top of the band: one spacing step
 * for the usual breathing room, a FAB's height where the screen has
 * one, a sticky button's height where it has one.
 */
export function useBottomChromeBand(): number {
  const insets = useSafeAreaInsets();
  const chrome = useBottomChromeHeight();
  return Math.max(insets.bottom, chrome);
}

/**
 * The standard clearance: the band plus one spacing step.
 *
 * What a floating action button's `bottom` is, and what a screen with
 * no bottom furniture of its own reserves.
 */
export function useBottomChromeInset(): number {
  return useBottomChromeBand() + spacing.lg;
}
