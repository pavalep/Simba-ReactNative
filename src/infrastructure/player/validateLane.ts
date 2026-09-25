/**
 * V19 W0 Phase 0.3 — `validateLane()` wrapper (FOUNDATIONAL).
 *
 * Lane integrity guard on every launch path. JS-side enforcement
 * (native-level enforcement is V20 — the lib doesn't surface typed
 * rejection codes for lane mismatch today; see SPEC §12 + audit §6).
 *
 * The facade's launch functions (`usePlay`, `usePlayWithResume`,
 * `usePlaybackFacade.launch`) call `validateLane()` before invoking
 * the lib's `openPlayer` / `openPlaylist`. If mismatched, the facade
 * returns `err({kind: 'lane', ...})` to the consumer.
 *
 * Architecture source of truth: `md/SIMBA_PLAYER_V19_SPECIFICATION.md`
 * §3.24 + the audit doc §3.D.
 */

import {ok, err, type Result} from './streamErrors';
import {mediaKindToLane} from '../../types/media';
import type {MediaKind, MediaLane} from '../../types/media';

/**
 * V19 W0 Phase 0.3 — `LaneStreamError`.
 *
 * New variant added to the StreamError union. The native bridge
 * doesn't surface lane-mismatch today; V19's JS-side guard maps it
 * to this typed variant so the consumer can show "Stop playback
 * first." UI (vs a generic "Network error" toast).
 */
export interface LaneStreamError {
  readonly kind: 'lane';
  readonly message: string;
  /** The lane that is currently active (e.g. `'audio'`). */
  readonly activeLane: MediaLane;
  /** The lane the new launch requested (e.g. `'video'`). */
  readonly attemptedLane: MediaLane;
  /** True — the user can fix this by stopping current playback. */
  readonly userFixable: true;
}

export const laneError = (
  message: string,
  activeLane: MediaLane,
  attemptedLane: MediaLane,
): LaneStreamError => ({
  kind: 'lane',
  message,
  activeLane,
  attemptedLane,
  userFixable: true,
});

/**
 * Validate the lane of a new launch against the currently active
 * lane.
 *
 * @param mediaType The incoming item's mediaType (MediaKind or
 *                  MediaLane). Pass `'audio'` or `'video'` to mean
 *                  the lane directly; pass a more specific kind
 *                  (e.g. `'podcast'`) to derive the lane via
 *                  `mediaKindToLane`.
 * @param activeLane The currently active lane, or `undefined` if no
 *                   session is active.
 *
 * @returns `ok(undefined)` if the launch is allowed; `err({kind:
 *          'lane', ...})` if mismatched.
 *
 * @example
 *   const result = validateLane('video', 'audio');
 *   if (!result.ok) {
 *     toast.error(result.error.message);
 *     return;
 *   }
 *   // safe to call openPlayer(...)
 */
export function validateLane(
  mediaType: MediaKind | MediaLane,
  activeLane: MediaLane | undefined,
): Result<void, LaneStreamError> {
  const attemptedLane: MediaLane =
    mediaType === 'audio' || mediaType === 'video'
      ? mediaType
      : mediaKindToLane(mediaType as MediaKind);

  if (activeLane && activeLane !== attemptedLane) {
    return err(
      laneError(
        `Can't play ${attemptedLane} while ${activeLane} is active. Stop playback first.`,
        activeLane,
        attemptedLane,
      ),
    );
  }
  return ok(undefined);
}
