/**
 * V22 W33 (2026-10-28) — the APP's deep-link launcher.
 *
 * ## What was broken
 *
 * `AppContent` used the **lib's** `useOpenFromUrl()`. That hook forwards
 * to `useOpenWithResume()` → `usePlayerActivity().openPlayer()` → the
 * bridge, and the bridge asks `isSurfaceMounted()` before it will open a
 * VIDEO. `PlayerSurface.attach(...)` — the only writer of the registry's
 * `viewRef` — has **ZERO** call sites, so `viewRef` is never non-null,
 * `current()` always returns `null`, and `isSurfaceMounted()` always
 * answers `false`. **A deep-linked video therefore never played at all.**
 *
 * ## What was ALSO lost
 *
 * The lib's path bypasses the app's `useResumeAwareLaunch` seam, and with
 * it the **now-playing entry**, the **history checkpoint**, the **dock**
 * and the **resume prompt**. Audio deep links *did* play — but through a
 * path the app does not own, so a shared track never appeared in
 * Recently Played and the app never knew what was playing.
 *
 * ## The fix
 *
 * The app owns deep links, exactly as it owns every other launch. This
 * hook does the three things the lib's hook did — filter the scheme,
 * derive the title, classify the lane — and then launches through the
 * app's own seam.
 *
 * ## Why the classification is NOT copied out of the lib
 *
 * The lib's `AUDIO_EXTENSIONS` / `VIDEO_EXTENSIONS` / `deriveDisplayName`
 * are module-private, so they cannot be reused. Copying them would put
 * "which lane is this file in" in TWO places — and the app already
 * answers that question, in `services/fileService`. The extension table
 * now lives in **ONE** place, `utils/mediaUri`, and the picker and this
 * hook both read it.
 *
 * (The table cannot live in `services/fileService`, because that module
 * imports the player barrel — so the player layer importing it back
 * would be a cycle, and a cycle in this repo has shipped as a redbox.)
 *
 * ## Known limitation, deliberately not fixed here
 *
 * A `content://` share-sheet URI carries no filename — its last segment
 * is a provider id — so the derived title is that id (`video:1000000064`).
 * Reading the real name needs the `ContentResolver`, which is a native
 * call. The behaviour here matches what the app already shipped, so this
 * is a carried-forward improvement, not a regression.
 */
import {useCallback} from 'react';
import {useResumeAwareLaunch} from './useResumeAwareLaunch';
import {displayNameFromUri, mediaTypeFromUri} from '../../utils/mediaUri';

/**
 * Open a shared media URI in the player.
 *
 * Returns `false` for a URI the app does not handle — an empty string, or
 * a scheme that is not a shared file. `http(s)` URLs are deliberately NOT
 * handled here: a remote stream is opened by the screen that owns it, not
 * by the share sheet, and a share-sheet `http` URL is a web page.
 */
export function useDeepLinkLaunch(): (uri: string) => Promise<boolean> {
  const {openPlayer} = useResumeAwareLaunch();

  return useCallback(
    async (uri: string): Promise<boolean> => {
      if (!uri) return false;
      if (!uri.startsWith('content://') && !uri.startsWith('file://')) {
        return false;
      }

      const title = displayNameFromUri(uri);
      const type = mediaTypeFromUri(uri);

      // The APP's seam, not the lib's. It resolves the resume position,
      // records the now-playing session, picks the lane's presentation,
      // and — for a video — hands the load to the in-window launcher
      // instead of asking the bridge whether a surface exists.
      return openPlayer({uri, title, type});
    },
    [openPlayer],
  );
}

export default useDeepLinkLaunch;
