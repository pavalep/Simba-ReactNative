/**
 * V19 W0 Phase 0.4 — `SimbaPlayer` public types.
 *
 * W0 stub: types only. The component is in `SimbaPlayer.tsx`. Wave 4
 * fills in the chrome composition.
 *
 * Architecture source of truth: `md/SIMBA_PLAYER_V19_SPECIFICATION.md`
 * §5.3 + audit doc §4.
 */

// W9.3: `MediaLane` and `Result` are no longer imported. They were
// referenced only by the launch trio (`open` / `openWithResume` /
// `openPlaylist`), which is removed — see the `SimbaPlayerRef`
// docblock below. `StreamError` stays: `SimbaPlayerProps.onError`
// still uses it.
import type {MediaKind} from '../../../../types/media';
import type {StreamError} from '../../../../infrastructure/player';

/**
 * The declarative source for `<SimbaPlayer source={...} />`.
 *
 * V19 introduces this; the V16 lib uses an ad-hoc `{uri, title,
 * type}` shape. V19 normalizes to a stable union.
 */
export type VideoSource = {
  uri: string;
  title: string;
  kind: Extract<MediaKind, 'video' | 'movie' | 'archive-video' | 'live-tv'>;
  artwork?: string;
};

/**
 * The imperative ref API exposed by `<SimbaPlayer ref={ref} />`.
 *
 * Sourced from the lib's `usePlayer().commands` + facade wrappers.
 * V19 names them canonically so consumers never reach into the lib.
 *
 * **What is deliberately NOT here** (W9.3):
 *
 *   - `open` / `openWithResume` / `openPlaylist`. Launching is owned by
 *     the app's launch seam (`useResumeAwarePlayerActivity`) and the
 *     `usePlaybackFacade().launch` surface. The chrome compositor does
 *     not launch media, so these three could only ever have thrown.
 *   - `selectAudioDescriptionTrack`. The lib exposes no AD-selection
 *     command, so `AudioDescriptionTrackSelector` renders `null`
 *     rather than shipping a control that cannot act.
 *
 * All four previously type-checked and then threw at runtime — a
 * method that compiles but always fails is a trap, strictly worse than
 * a missing one: `tsc` agrees the code is fine, and the app dies at the
 * moment the user presses play. This file already set the precedent in
 * W6.0, when `setPresentation` was removed rather than kept as a
 * setter that could only lie. Zero callers referenced any of them.
 */
export interface SimbaPlayerRef {
  // ── Transport
  play(): Promise<void>;
  pause(): Promise<void>;
  togglePlayPause(): Promise<void>;
  seek(positionMs: number): Promise<void>;
  seekRelative(deltaMs: number): Promise<void>;
  skip(direction: 'forward' | 'backward'): Promise<void>;

  // ── Output
  setVolume(volume: number): Promise<void>;
  setSpeed(speed: number): Promise<void>;
  setVideoQuality(quality: string): Promise<void>;
  setLoopMode(mode: 'none' | 'file' | 'playlist'): Promise<void>;
  setShuffle(enabled: boolean): Promise<void>;
  selectCaptionTrack(trackId: string | null): Promise<void>;
  setSkipSilence(enabled: boolean): Promise<void>;

  close(): Promise<void>;

  // ── PiP
  //
  // Each of these performs BOTH halves of the transition: the native
  // PiP window (`commands.enterPip` / `commands.exitPip`) and the JS
  // chrome suppression that goes with it. W6.0 removed the separate
  // `setPresentation(mode)` method — `'mini'` / `'expanded'` are
  // derived from which activity is hosting, so they are not something
  // a consumer selects, and a setter for them could only ever lie.
  enterPip(): Promise<void>;
  exitPip(): Promise<void>;

  // ── Read-only for the dock
  getCurrentUri(): string | null;
  getCurrentTitle(): string | null;
  getCurrentArtwork(): string | null;
}

/**
 * The declarative props for `<SimbaPlayer source={...} ref={ref} />`.
 *
 * V19 SPEC §5.2 — this is what consumers write.
 *
 * W4 note: `source` is OPTIONAL in W4 because the chrome
 * composition doesn't yet route the source to the lib's
 * PlayerSurface — the V16 SimbaPlayer's PlayerSurface handles
 * that. The V19 component renders chrome on top of the lib's
 * surface; the `source` prop becomes load-bearing once V19
 * replaces the V16 root in W22+.
 */
export interface SimbaPlayerProps {
  /** Optional. W4: the chrome ignores this (V16 owns the surface).
   *  W22+: load-bearing; `null` = unload + reset to idle. */
  source?: VideoSource | null;

  /** Deep-link / scrub-to-time only. Mini-expand NEVER sets this. */
  initialPositionMs?: number;

  /** Default `false`. The consumer decides when to play. */
  autoPlay?: boolean;

  /** Default `'contain'`. Letterbox/pillarbox, never crop. */
  aspectRatio?: 'contain' | 'cover';

  /** Optional. Fires on every state transition. */
  onStateChange?: (state: 'idle' | 'preparing' | 'playing' | 'paused' | 'buffering' | 'finished' | 'error') => void;

  /** Optional. Fires on terminal error. Recover via ref. */
  onError?: (error: StreamError) => void;

  /** Optional. Fires on natural EOF (not user-close). */
  onEnded?: () => void;

  /** Optional. Override style. The chrome still owns its layout. */
  style?: object;
}
