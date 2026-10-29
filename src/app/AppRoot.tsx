/**
 * The app's content tree: the browsing UI and the player layers.
 *
 * ## Why this is a component and not part of `App`
 *
 * It needs `useTheme()` to build the ErrorBoundary's fallback palette,
 * and `App` is the component that renders `ThemeProvider` — so `App`
 * cannot read the theme context. A component cannot consume a context it
 * provides itself. A child of `ThemeProvider` can.
 *
 * That React rule is the ONLY reason this is a separate component. It
 * used to be called `ActivityShell` and justified itself with a two-
 * Activity split: one React root per Activity, providers mounted above
 * the split, and a `isPlayerActivity` ternary deciding which half
 * rendered. There is one Activity and one React root now (V21 F3), so
 * the split, the flag and the ternary are gone. What remained was a
 * component with a false name and a 40-line docstring describing an
 * architecture that no longer existed.
 *
 * ## The paint order
 *
 * The three layers below are SIBLINGS, and their order is the paint
 * order — React Native paints later siblings on top. Read bottom-up:
 *
 *   1. `BrowsingStack` — the browsing screens.
 *   2. `VideoPlayer`   — the video picture, plus the expanded chrome.
 *   3. `PlayerChrome`  — the dock, shared by both lanes.
 *
 * The picture is a Fabric view IN this tree (a `<SimbaVideo>`), so it
 * composites over the browsing screens because of this order — not
 * because anything is "transparent" and not because of a `zIndex`. Keep
 * it above `BrowsingStack`: put it below and the browsing screen covers
 * the picture, and the dock's transparent hole shows Home instead of the
 * video. Keep it below `PlayerChrome`: the dock is opaque except for the
 * hole it leaves for the picture, so it has to paint after it.
 *
 * `BrowsingStack` is additionally blanked while the video owns the
 * window (`hidden`). That is not about paint order — the picture already
 * covers the stack — it is so the stack does not keep handling touches
 * behind a fullscreen video, and so the transition into fullscreen does
 * not flash the feed behind it.
 *
 * ## The providers here
 *
 * `ErrorBoundary` + `ToastProvider` are app-wide: `useToast()` throws
 * without its provider, and the player chrome calls it unconditionally,
 * so a provider mounted below the chrome would tear the compositor down
 * and leave a blank screen. `ResumePromptContext` is app-wide for the
 * same reason `useResumeAwareLaunch` is the single launch seam: a prompt
 * passed per-screen is a prompt the next screen forgets.
 */
import React, {useCallback, useMemo} from 'react';
import {useTheme} from '../theme';
import {useConfirmDialog} from '../components/core/Dialog';
import {ToastProvider} from '../components/feedback/Toast';
import {VideoPlayer} from '../components/player/video/VideoPlayer';
import {PlayerChrome} from '../components/player/PlayerChrome';
import {ErrorBoundary} from './ErrorBoundary';
import {BrowsingStack} from './BrowsingStack';
import {AppContent} from './AppContent';
import {
  ResumePromptContext,
  useInWindowVideoLaunch,
  usePlaybackCheckpointSync,
  useVideoOwnsWindow,
  type PromptResume,
} from '../infrastructure/player';
import {formatDuration} from '../utils/timeAgo';
import {resolveMediaArtwork} from '../utils/mediaArtwork';

export const AppRoot: React.FC = () => {
  const {colors} = useTheme();

  // The Continue / Start-over prompt, supplied ONCE here and reached by
  // every launch through `ResumePromptContext`.
  //
  // The pattern is Plex's: "if you had started a title, a dialog offers
  // Resume or From the beginning". VLC reaches the same prompt through a
  // "Continue playback?" preference whose default is Ask, and Kodi offers
  // "Resume from hh:mm:ss" alongside "Play from beginning". Three
  // shipping players, one shape — a binary choice, with resume as the
  // affirmative.
  //
  // It lives here, not in a screen, because the seam is called from ~34
  // screens and a per-screen prompt is a prompt the next screen forgets.
  const {confirm, dialog} = useConfirmDialog();

  const promptResume = useCallback<PromptResume>(async candidate => {
    const at = formatDuration(candidate.positionMs / 1000);
    // The wording differs by source because the two are different kinds
    // of signal. A bookmark is something the user chose; a history
    // position is something we inferred. Saying "you marked" about an
    // inferred position would be a lie about where the number came from.
    const resume = await confirm({
      title:
        candidate.source === 'bookmark'
          ? 'Resume from your bookmark?'
          : 'Continue watching?',
      message: `Continue at ${at} or start from the beginning.`,
      confirmLabel: 'Continue',
      cancelLabel: 'Start from beginning',
      // Netflix, YouTube and Plex all lead a resume card with the title's
      // own image — it is how the user confirms at a glance that the card
      // is about the thing they just tapped. `captureFrame` writes
      // `resumeThumbnailPath`; catalogue artwork is the fallback for a
      // first play, where no frame has been captured yet.
      //
      // `resolveMediaArtwork` owns that precedence for every surface
      // that draws a media record's artwork.
      imageUri: resolveMediaArtwork(candidate),
      // V19 spec (SIMBA_PLAYER_MODULE_V19_SPECIFICATION.md:604-611):
      // "Auto-dismisses after 8 s; default action is Resume."
      //
      // The spec was right and the implementation had this inverted.
      // Dismissing used to resolve `false`, which maps to "start from the
      // beginning" — so eight seconds of silence silently discarded the
      // resume point the card existed to offer. Auto-dismiss is the right
      // behaviour; auto-dismiss onto the DESTRUCTIVE option never is.
      autoDismissMs: 8000,
    });
    // `false` means the user actively chose "Start from beginning". It
    // must never be what a timeout produces — `autoDismissMs` resolves
    // through the confirm path, so silence continues rather than restarts.
    return resume ? 'resume' : 'start';
  }, [confirm]);

  // The resume checkpoint writer. It must observe every real playback
  // session, not only the sessions that happen to be on screen while a
  // navigator is up — so it is mounted here, above the browsing stack.
  usePlaybackCheckpointSync();

  // The in-window video path. Mounted once, for the same reason: this
  // tree is mounted once and must keep working now that there is one
  // root and no player Activity to branch on.
  //
  // 2026-10-16: `useVideoSurface` is gone. It existed to drive a surface
  // mounted by Kotlin OUTSIDE this tree — sizing it in window pixels, then
  // revealing it, in that order because a 0x0 SurfaceView is an invalid
  // libmpv target, and publishing "is it actually showing?" for
  // `usePresentation()` to read. The picture is now `<SimbaVideo>`, a view
  // in this tree, so React Native sizes it, reveals it and answers the
  // question structurally. There is nothing left for a hook to report.
  useInWindowVideoLaunch();

  // Whether the BROWSING STACK may paint.
  //
  // `useVideoOwnsWindow()` is the single derived answer to "does the video
  // own this window". The two-Activity design enforced that with
  // `isPlayerActivity ? null : <AppContent />`. F5 deleted the flag, and
  // deleted that ternary with it, without putting a replacement in place:
  // the activity no longer exists, so the *reason* for the guard outlived
  // the *flag* that carried it. Every layer of the app that paints a
  // background then covered the video, which is why playback was fully
  // live and completely invisible.
  //
  // It used to read `presentation.isExpanded` — the user's REQUEST for a
  // fullscreen video. The request outlives the session on purpose (a close
  // must not rewrite it), so keying the WINDOW on it left the window owned
  // by a video that was gone: the chrome unmounted, the feed stayed blanked,
  // and the app sat on white. Measured on device, 2026-10-26. The window's
  // owner is now the request AND a session that can honour it.
  //
  // Read here, not inside `AppContent`, so the navigator does not have to
  // know a video player exists. See `src/app/BrowsingStack.tsx`.
  const videoOwnsWindow = useVideoOwnsWindow();

  const fallbackColors = useMemo(
    () => ({
      background: colors.background.primary,
      text: colors.text.primary,
      textSecondary: colors.text.secondary,
      accent: colors.accent.gold,
      border: colors.border.emphasis,
      accentDim: colors.accent.goldDim,
    }),
    [colors],
  );

  return (
    <ErrorBoundary fallbackColors={fallbackColors}>
      <ToastProvider>
        <ResumePromptContext.Provider value={promptResume}>
          <BrowsingStack hidden={videoOwnsWindow}>
            <AppContent />
          </BrowsingStack>

          <VideoPlayer />
          <PlayerChrome />

          {/* The resume prompt's own Dialog. It has to be inside the
              providers, so `confirm()`'s element lives in the same tree
              that owns the state. */}
          {dialog}
        </ResumePromptContext.Provider>
      </ToastProvider>
    </ErrorBoundary>
  );
};
