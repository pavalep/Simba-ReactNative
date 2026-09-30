/**
 * V19 W6.0 — `PlayerHostProvider` / `useIsPlayerActivity`: a genuinely
 * PER-TREE "is this React tree the player activity's tree?" answer.
 *
 * ## Why this exists instead of the lib's `useIsPlayerActivity()`
 *
 * The lib's hook reads `MpvBridgeModule.isCurrentActivityPlayer()`,
 * whose backing field is a process-wide `@Volatile @JvmStatic` on the
 * companion object, flipped in `PlayerActivity.onCreate` / `onDestroy`.
 * So it answers **"is the player activity alive in this process"**, not
 * **"is this tree the player activity's tree"**.
 *
 * Those are the same question only while a single activity is mounted.
 * The moment the user opens a video there are TWO React roots in the
 * one process — the live `PlayerActivity` root and the still-mounted
 * background `MainActivity` root — and BOTH read `true`. A consumer
 * gating its own chrome on the lib's hook therefore mounts that chrome
 * in the background activity as well, painting a full-bleed overlay
 * over Home, Movies and Settings.
 *
 * That is not hypothetical: it is the reason the app's chrome gate was
 * fighting itself. `usePresentationSync` ran once per root, both roots
 * wrote the same process-global zustand `mode`, and they ping-ponged
 * `expanded ⇄ mini` forever — which unmounted and rebuilt the entire
 * chrome several times a second over a playing video, and read on
 * screen as a black screen with no controls at all.
 *
 * ## Why a context
 *
 * React context and `initialProps` are per-ROOT. Each activity's
 * `ReactActivityDelegate` supplies `isPlayerActivity` in its launch
 * options, so the value is bound to the root that was created with it
 * and the other root can never observe it. That makes it correct by
 * construction rather than correct by timing.
 *
 * It is also correct on the FIRST render — launch options are present
 * before the component mounts — so there is no frame of wrong chrome
 * in either direction, and no subscription is needed: the host of a
 * React root never changes for the life of that root.
 *
 * ## Fail-closed
 *
 * A missing provider reads as `false` ("no player surface here"). That
 * is deliberate: the failure mode is chrome mounted over a surface
 * that isn't there, not a video with no controls on it.
 */

import * as React from 'react';

/**
 * `null` = no provider above this component (an isolated test, or a
 * component mounted outside the app root). Consumers treat it as
 * `false`.
 */
const PlayerHostContext = React.createContext<boolean | null>(null);

export interface PlayerHostProviderProps {
  /** From the root component's `initialProps`. See the module docstring. */
  isPlayerActivity: boolean;
  children: React.ReactNode;
}

export const PlayerHostProvider: React.FC<PlayerHostProviderProps> = ({
  isPlayerActivity,
  children,
}) => (
  <PlayerHostContext.Provider value={isPlayerActivity}>
    {children}
  </PlayerHostContext.Provider>
);

/**
 * Is the player surface beneath THIS React tree?
 *
 * Synchronous and stable for the lifetime of the root — see the module
 * docstring for why that is a property worth having.
 */
export function useIsPlayerActivity(): boolean {
  return React.useContext(PlayerHostContext) === true;
}

export default PlayerHostProvider;
