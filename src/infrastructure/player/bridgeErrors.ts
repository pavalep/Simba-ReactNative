/**
 * V22 B-009 — Bridge error code → typed `StreamError` mapper.
 *
 * The bridge has no `openPlayer` method any more — video loads in-window
 * and audio starts a foreground service — so there is no "launch an
 * Activity" step for a code to describe. What the bridge does have is an
 * error-code registry (`MpvBridgeModule.codeToNumeric`), and the codes
 * below are the launch-range ones still registered there:
 *
 *   - `E_SECURITY`            → blocked (manifest restriction refused)
 *   - `E_OPEN_PLAYER_FAILED`  → launch (catch-all launch failure)
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
  type StreamError,
} from './streamErrors';

/**
 * Native error codes the lib's bridge still registers for the launch
 * range (`MpvBridgeModule.codeToNumeric`).
 *
 * The mapper gives some of them their own variant; the rest fall through
 * to the default branch, which treats an unrecognised-but-registered code
 * as a launch failure rather than mislabelling it as a network error.
 */
export type BridgeLaunchErrorCode =
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
    case 'E_SECURITY':
      // Manifest restriction refused the launch — usually a build
      // / signing issue, not user-fixable.
      return blockedError(
        'Player launch was blocked by the app configuration',
        {provider: 'app', reason: 'unknown'},
      );

    case 'E_OPEN_PLAYER_FAILED':
      // Catch-all from the bridge — surface the cause verbatim
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
