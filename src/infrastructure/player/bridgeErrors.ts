/**
 * V22 B-009 — Bridge error code → typed `StreamError` mapper.
 *
 * `MpvBridgeModule.openPlayer` (Kotlin side) rejects with one of 5
 * documented codes (see `MpvBridgeModule.kt:1235-1239`):
 *
 *   - `E_INVALID_TYPE`        → unsupported (the type arg was bad;
 *                              normally caught at the TS type boundary)
 *   - `E_NO_ACTIVITY`         → launch (no current activity to launch from)
 *   - `E_ACTIVITY_NOT_FOUND`  → launch (PlayerActivity missing from manifest)
 *   - `E_SECURITY`            → blocked (manifest restriction refused)
 *   - `E_OPEN_PLAYER_FAILED`  → launch (catch-all startActivity failure)
 *
 * Pre-V22 the facade collapsed every rejection to `network`, so users
 * saw "No connection" toasts even when the launch itself was the
 * failure (B-009). This mapper restores the right `StreamError`
 * variant per code, plus a per-code `userFixable` flag so the toast
 * can say "this is on the app side, please file a bug" vs "try again
 * in a moment".
 *
 * When the error object is null/undefined or doesn't carry a
 * recognisable `code`, the mapper falls back to `launch` with the
 * raw message — better than the previous silent "network" mapping.
 */

import {
  blockedError,
  launchError,
  networkError,
  unsupportedError,
  type StreamError,
} from './streamErrors';

/** Native error codes surfaced by `MpvBridgeModule.openPlayer`. */
export type BridgeLaunchErrorCode =
  | 'E_INVALID_TYPE'
  | 'E_NO_ACTIVITY'
  | 'E_ACTIVITY_NOT_FOUND'
  | 'E_SECURITY'
  | 'E_OPEN_PLAYER_FAILED';

/** Pull the `code` off a thrown Error (RN Promise rejection shape). */
export function bridgeCodeFromError(e: unknown): string | undefined {
  if (e && typeof e === 'object') {
    const anyE = e as {code?: unknown};
    if (typeof anyE.code === 'string' && anyE.code.length > 0) {
      return anyE.code;
    }
  }
  return undefined;
}

export function mapBridgeLaunchError(e: unknown): StreamError {
  const code = bridgeCodeFromError(e);
  const cause = e instanceof Error ? e.message : String(e);

  switch (code) {
    case 'E_INVALID_TYPE':
      return unsupportedError('Player does not support this media type', {
        format: cause,
      });

    case 'E_NO_ACTIVITY':
      // Bridge called from a context with no current activity —
      // usually a headless / background path. Retryable: the user
      // can foreground the app and try again.
      return launchError(
        'Player is not ready — open the app and try again',
        {code, cause, userFixable: true},
      );

    case 'E_ACTIVITY_NOT_FOUND':
      // PlayerActivity missing from AndroidManifest — app-side bug,
      // not user-fixable. Reinstall or file a bug.
      return launchError(
        'Player screen is not installed in this build',
        {code, cause, userFixable: false},
      );

    case 'E_SECURITY':
      // Manifest restriction refused the launch — usually a build
      // / signing issue, not user-fixable.
      return blockedError(
        'Player launch was blocked by the app configuration',
        {provider: 'app', reason: 'unknown'},
      );

    case 'E_OPEN_PLAYER_FAILED':
      // Catch-all from `startActivity` — surface the cause verbatim
      // so users can report it.
      return launchError(
        `Player could not start — ${cause}`,
        {code, cause, userFixable: false},
      );

    default: {
      // Unknown / null error: fall back to network (retryable) so
      // transient failures keep the existing "try again" UX. This
      // matches the pre-V22 behaviour for unmapped codes.
      if (code === undefined) {
        return networkError(
          'Player launch failed',
          {cause, retryable: true},
        );
      }
      // Recognised code family but not in the switch above — treat
      // as launch so we don't mislabel as network.
      return launchError(
        `Player could not start — ${cause}`,
        {code, cause, userFixable: false},
      );
    }
  }
}
