import {create} from 'zustand';
import type {MediaKind, MediaLane} from '../types/media';
import {mediaKey} from '../infrastructure/player/playbackProgress';

/**
 * W9.4 — "what did the app last launch?".
 *
 * ## Why this exists
 *
 * To record a resume checkpoint you need to know which file is playing.
 * The obvious source is `useTransport().state.currentUri`, but that is
 * derived from the lib's **queue** (`playlist[currentIndex].filename`),
 * and this app launches media through `openPlayer({uri, ...})` — a
 * single-file launch that populates no queue. So `currentUri` is
 * `null` for exactly the launches that matter, which is why
 * `useQueueSync` has been writing `uri: ''` into `playerStore` and
 * calls it a V20 gap.
 *
 * The lib genuinely does not expose "the current file" for a
 * single-file launch. The **app** does, though: it is the thing that
 * called `openPlayer`, and it passed the URI. So the launch seam — the
 * one place every launch passes through — records it here.
 *
 * This is the same principle as the seam that resolves resume on the
 * way in: the boundary the app already owns is where the fact becomes
 * knowable. Asking the lib for it would mean a native change to answer
 * a question the app was handed the answer to.
 *
 * ## Not persisted, and that is deliberate
 *
 * This is per-session, not durable state. Persisting it would let a
 * cold start believe something is playing when nothing is, and the
 * checkpoint writer would then write a position for a media file that
 * was never opened — history entries invented out of thin air. The
 * durable record is `recentHistoryStore`; this is only the handle the
 * writer uses to reach it.
 *
 * ## Lane is carried
 *
 * `mediaLane` is recorded separately from the URI because the app keeps
 * separate audio and video queues, and because the music / podcast
 * surfaces will read this to decide what they own. That work is
 * deferred until the music player lands — this store is already
 * lane-aware so it does not have to be re-plumbed then.
 */

export interface NowPlaying {
  /** Canonical URI (see `mediaKey`). The identity of the session. */
  readonly uri: string;
  /** Title as supplied by the launching screen. */
  readonly title: string;
  /** Semantic kind when the launching screen knew it. */
  readonly type?: MediaKind;
  readonly mediaLane?: MediaLane;
  /** Catalogue name, when known. */
  readonly provider?: string;
  /** Artwork URI, when known — carried so the shelf can render a thumb. */
  readonly thumbnailPath?: string;
  /** Monotonic id of this session. Bumped per launch. */
  readonly sessionId: number;
}

interface NowPlayingState {
  current: NowPlaying | null;
  /** Record a launch. Returns the stored entry so callers can read the canonical key. */
  begin: (input: Omit<NowPlaying, 'uri' | 'sessionId'> & {uri: string}) => NowPlaying;
  /** End the session. Called on close / teardown. */
  end: () => void;
  /** Test + account-switch support. */
  reset: () => void;
}

let sessionCounter = 0;

export const useNowPlayingStore = create<NowPlayingState>()((set, get) => ({
  current: null,

  begin: (input) => {
    const next: NowPlaying = {
      ...input,
      uri: mediaKey(input.uri),
      sessionId: (sessionCounter += 1),
    };
    set({current: next});
    return next;
  },

  end: () => set({current: null}),

  reset: () => {
    sessionCounter = 0;
    set({current: null});
  },
}));

/**
 * Non-React reader for services that already hold a store handle.
 * Exists so a future background/auto-play caller does not have to reach
 * for a hook outside a component.
 */
export const getNowPlaying = (): NowPlaying | null => useNowPlayingStore.getState().current;