/**
 * Audio player presentation — `mini` vs `expanded`.
 *
 * ## Why audio needs this store and video does not
 *
 * Video's presentation is DERIVED, never stored. `PlayerActivity` is the
 * full-screen video player; there is no video mini dock, so "is the
 * video player showing" is answered by asking the host tree
 * (`useIsPlayerActivity()`) and nothing has to be written anywhere. See
 * `usePresentationStore` for the full account, and for the black-screen
 * incident that removed the stored version: `App` is mounted once per
 * Android Activity React root, so while the player is up there are two
 * live roots writing the same process-global store, and `mode` ping-
 * ponged between them forever.
 *
 * Audio has no Activity, so there is no per-tree fact to derive from —
 * the full player and the mini bar both live in the MainActivity tree,
 * and which one is showing is a genuine user decision. It has to be
 * stored.
 *
 * ## The rule this store still obeys: gestures only
 *
 * W6.0's lesson was "two writers, one value, is a race". The store is
 * only ever written by a user gesture — expand() from a tap, minimize()
 * from the chevron — and by the launch seam, which runs in the
 * MainActivity tree where the screens live. There is deliberately NO
 * `useAudioPresentationSync()` effect, and no code path may write this
 * from a render or a per-tree lifecycle hook. If you find yourself
 * adding one, that is the W6.0 bug again.
 *
 * ## "Is there anything to show?" is NOT this store's job
 *
 * That is `useNowPlayingStore.current`. Keeping it there means exactly
 * one owner for "is a track loaded": the launch seam writes it, `end()`
 * clears it, and `usePlaybackCheckpointSync` already reads it. Duplicating
 * it here would be two owners of one fact, which is how W5's
 * `videoState` enum and `VideoController.videoState` came to disagree.
 * The chrome renders nothing when `current == null`, whatever this says.
 */

import {create} from 'zustand';

/**
 * Which of the two audio surfaces is showing.
 *
 * There is no `'hidden'`: "nothing is playing" is the absence of a
 * `useNowPlayingStore.current`, not a third mode. A `'hidden'` mode
 * would be a second thing to keep consistent with that store, and the
 * one bug it could not express is the one that matters — a track that
 * has ended should leave the mini bar up, and only the user closing it
 * takes it away.
 */
export type AudioPresentationMode = 'mini' | 'expanded';

export interface AudioPresentationState {
  readonly mode: AudioPresentationMode;

  /** Show the full player. Called when the user taps the mini bar, and
   *  by the launch seam on every audio launch. */
  expand: () => void;

  /** Collapse to the mini bar. This is the chevron-down verb, and it
   *  is a React state change and nothing else — no window is touched,
   *  no Activity is finished, and playback is not interrupted. */
  minimize: () => void;
}

export const useAudioPresentationStore = create<AudioPresentationState>()(set => ({
  // A first audio launch expands, so `expanded` is the honest default
  // for a process that has already played something. Resetting to
  // `mini` on logout/login is `useNowPlayingStore.reset()`'s job, not
  // this store's — see the note above about not owning that fact.
  mode: 'expanded',
  expand: () => set({mode: 'expanded'}),
  minimize: () => set({mode: 'mini'}),
}));