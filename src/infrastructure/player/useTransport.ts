/**
 * V19 W2 — `useTransport()` facade hook.
 *
 * The transport surface every chrome primitive reads from. Wraps
 * the lib's existing `usePlayerProgress()` + `usePlayer()` hooks
 * (which already subscribe to the native mpv event stream and
 * populate the position / duration / buffered / seeking / seekable
 * fields at 1Hz) and adds the V19-specific derivations:
 *
 *   - `isPlaying`         — `!isPaused && hasFile`
 *   - `isEnded`           — `positionMs >= durationMs - epsilon`
 *   - `normalizedWindow`  — the contiguous buffered range containing
 *                           the playhead (or the single full range
 *                           if there's no gap near the playhead,
 *                           or null if the playhead is in a gap or
 *                           there are no buffered ranges). Drives
 *                           the `BufferedRangeFill` width.
 *   - `canEnterPip`       — true while the media is actively playing,
 *                           not ended and not buffering. This used
 *                           to be documented as
 *                           `presentation.mode === 'expanded' &&
 *                           isPlaying`, but the code only ever tested
 *                           the playback terms: the chrome that hosts
 *                           `PiPToggle` renders only in
 *                           `'expanded'` mode, so the mode test was
 *                           implied by the call site rather than
 *                           asserted here. Corrected to match the
 *                           code instead of leaving the comment
 *                           advertising a condition nothing
 *                           evaluated.
 *
 * Why a facade instead of the spec's `TransportContext`:
 *
 *   The lib's `<PlayerProvider>` already wraps the entire player
 *   subtree and exposes progress + commands through React context.
 *   The V19 W2 spec (§2.1, TRACKER Phase 2.1) called for a parallel
 *   `<TransportProvider>` that re-subscribes to mpv events, but
 *   that would double the subscription cost and require re-mounting
 *   the lib's provider. The pragmatic move: wrap the lib hooks in a
 *   V19 facade that adds only the derivations the chrome needs.
 *   The "throws outside provider" requirement from the spec is
 *   satisfied by `usePlayerProgress()` already returning
 *   `DEFAULT_PROGRESS` (= zeros + falsy flags) when called outside
 *   `<PlayerProvider>` — the chrome primitives already short-circuit
 *   on `durationMs === 0`, so the contract holds in practice.
 *
 * Source of truth: `md/SIMBA_PLAYER_V19_SPECIFICATION.md` §3.7 +
 * `md/SIMBA_PLAYER_MODULE_V19_TRACKER.md` Phase 2.1.
 */

import {useMemo} from 'react';
import {useWindowDimensions} from 'react-native';
import {
  usePlayer,
  usePlayerProgress,
  type PlayerProgress,
  type PlayerCommands,
} from '@simba-dev/react-native-media-player';
import {getSkipPrevThresholdMs} from '../../state/useSkipPrevThresholdStore';
import {useOrientationLockStore} from '../../state/useOrientationLockStore';

/**
 * A contiguous buffered range, normalized to milliseconds.
 *
 * mpv's `cacheRanges` field exposes byte offsets (`{start, end}`
 * in bytes), but for the TransportBar's visual progress fill we
 * need the SAME time-space as `positionMs` / `durationMs`. The
 * facade converts bytes → ms at the boundary so the chrome never
 * has to think about byte-space.
 */
export interface BufferedRange {
  startMs: number;
  endMs: number;
}

/**
 * The single contiguous range containing the playhead, OR the
 * single full-coverage range, OR null if the playhead is in a gap.
 *
 * Algorithm (SPEC §4.2):
 *   1. If `bufferedRanges.length === 0`            → `null`
 *   2. If `positionMs === 0 && durationMs === 0`    → `null` (no file)
 *   3. Find the range whose `[start, end]` contains `positionMs`
 *      (with a 1s tolerance on the lower bound to absorb the
 *      playhead-vs-buffered slop during live playback)
 *   4. If no range contains the playhead, return null
 *   5. Otherwise return that range as `BufferedRange`
 *
 * `BufferedRangeFill` reads this and renders a flat-fill rectangle
 * whose left edge is `(startMs / durationMs) * width` and right
 * edge is `(endMs / durationMs) * width`. When null, it renders
 * nothing — no fake placeholder.
 */
export type NormalizedWindow = BufferedRange | null;

/**
 * V19 transport state — what chrome primitives read.
 */
export interface TransportState {
  positionMs: number;
  durationMs: number;
  isPlaying: boolean;
  isBuffering: boolean;
  isSeeking: boolean;
  isEnded: boolean;
  bufferedRanges: BufferedRange[];
  normalizedWindow: NormalizedWindow;
  seekable: boolean;
  canEnterPip: boolean;
  /**
   * V19 W6.4 — whether the player header's orientation lock is engaged.
   *
   * Read from `useOrientationLockStore` (the user's persisted intent),
   * NOT from the platform. `Activity.requestedOrientation` has no
   * getter, so the platform cannot be asked what state it is in; the
   * store is the record of what was requested, and
   * `setOrientationLock` is what re-requests it. See that store's
   * header for why that is sound inside the chrome's mount gate.
   */
  isOrientationLocked: boolean;
  /** V19 W3 - current repeat mode (V19 vocabulary). */
  repeatMode: RepeatMode;
  /**
   * Whether playlist shuffle is on. Mirrors mpv's `playlist-shuffle`.
   *
   * Added with the audio player (V20 Phase C). `setShuffle` existed
   * since 1.6.0 but nothing could read the result back through this
   * facade, so a shuffle control built on it would have been able to
   * fire a command and never show its own state — the "control that
   * may or may not be the real one" ambiguity. The lib already owns
   * the value (`state.shuffle`); this only forwards it.
   */
  shuffle: boolean;
  /** V19 W3 — subtitle/caption tracks for the current file. */
  captionTracks: CaptionTrack[];
  /** V19 W3 — id of the currently-active subtitle track (or null). */
  activeCaptionTrackId: number | null;
  /** V19 W3.5 — true when the playlist has a previous entry. */
  canGoPrev: boolean;
  /** V19 W3.5 - true when the playlist has a next entry. */
  canGoNext: boolean;
  /**
   * The URI (mpv `filename`) of the currently-playing playlist
   * entry, or `null` when nothing is loaded.
   *
   * **W5/W6 cleanup — this closes the "current-track URI facade
   * identity" blocker.** The lib's `PlayerState` already carries
   * `playlist: PlaylistEntry[]` + `currentIndex`, and every entry
   * has a `filename`, so the real current URI was available the
   * whole time. It was just never surfaced, which is why
   * `VideoMoreSheet`'s Save / Add-to-playlist / Track-info rows
   * could only `console.warn` and the retry path had no URI to
   * reload. Deriving it from the structural playlist (rather than
   * re-inventing a "current item" concept) is what lets those
   * actions be real.
   */
  currentUri: string | null;
  /**
   * The NEXT playlist entry after the current one, or `null` at the
   * end of the queue. Drives `NextUpOverlay` so it can name the
   * upcoming track instead of a generic placeholder.
   */
  nextTrack: {uri: string; title: string} | null;
  /**
   * V19 W3.5.5 — current playback rate (1.0 = normal). Mirrors
   * `lib.PlayerState.speed` and is the value the long-press gesture
   * restores after a 2× preview.
   */
  speed: number;
  /**
   * V19 W3.5.3 — current mpv volume (0..100). Drives the
   * volume indicator pill on right-half vertical swipes.
   */
  volume: number;
  /** V19 W3.5.3 — mute state (decoupled from `volume`). */
  isMuted: boolean;
  /** V19 chrome surface — current track title (mpv `media-title`).
   *  Used by the share action (W3.4) and the more menu's title
   *  preview. Defaults to empty string when no file is loaded. */
  title: string;
  /** V19 chrome surface — current track artist (mpv
   *  `metadata/by-key/artist`). May be empty when the source
   *  metadata doesn't carry the field. */
  artist: string;
}

/**
 * Transport commands — what chrome primitives call.
 *
 * `seek()` takes a millisecond position (clamped to `[0, durationMs]`).
 * `seekBy()` takes a signed delta (negative seeks backward). For
 * the common "rewind 10s" / "forward 10s" UI, use the semantic
 * wrappers `rewind10()` / `forward10()` (W3.5). `skipPrev()` is
 * the Apple Music / Spotify smart-prev pattern (W3.6.11).
 */
export interface TransportCommands {
  seek(positionMs: number): void;
  seekBy(deltaMs: number): void;
  togglePlayPause(): void;
  play(): void;
  pause(): void;
  /**
   * V19 W3 — set the loop mode. Maps the V19 semantic
   * (`'off' | 'one' | 'all'`) to the lib's mpv-native
   * `MpvLoopMode` (`'none' | 'file' | 'playlist'`).
   */
  setRepeatMode(mode: RepeatMode): void;
  /**
   * V19 W3 — select a caption track by id. Pass `null` to
   * disable captions.
   *
   * Backed by the lib's track-TYPED command `setTrack('sub', id)`,
   * which mpv receives as `sid` (the SUBTITLE property). The lib's
   * untyped `selectTrack(id)` is deliberately NOT used — it carries
   * no track type and writes mpv's `vid` (video) property instead.
   */
  selectCaptionTrack(trackId: number | null): void;
  /**
   * V19 W7.3 — set playback volume, 0–100. Clamped here, because the
   * slider can overshoot on a fast drag and an out-of-range value
   * would reach mpv as a property write.
   */
  setVolume(volume: number): void;
  /**
   * V19 W7.3 — mute/unmute WITHOUT touching `volume`.
   *
   * `mute` and `volume` are separate mpv properties. Faking a mute with
   * `setVolume(0)` would destroy the user's chosen level, so the real
   * `setMuted` boolean is forwarded instead. A control that cannot
   * preserve the level across a mute/unmute cycle is a control that
   * lies about what it did.
   */
  setMuted(muted: boolean): void;
  /** V19 W3.5 — skip to the next playlist entry. */
  next(): void;
  /** V19 W3.5 — skip to the previous playlist entry. */
  previous(): void;
  /** V19 W3.5 — seek backward by 10s (canonical rewind). */
  rewind10(): void;
  /** V19 W3.5 — seek forward by 10s (canonical forward). */
  forward10(): void;
  /**
   * V19 W3.6.11 — Apple Music / Spotify pattern. If the playhead
   * is more than `useSkipPrevThresholdStore().thresholdMs` into
   * the current item, `seek(0)` (restart). Else, `commands.previous()`
   * (skip to the previous item). Threshold defaults to 3000 ms.
   */
  skipPrev(): void;
  /**
   * V19 W3.5.5 — set playback rate. Backed by lib
   * `commands.setSpeed(rate)`. Used by the long-press preview
   * (which writes 2 and restores) and by the More menu Speed chips.
   */
  setSpeed(rate: number): void;
  /**
   * V19 W3.5.3 — set mpv volume (0..100). Backed by lib
   * `commands.setVolume`. Drives the volume indicator pill on
   * right-half vertical swipes.
   */
  setVolume(volume: number): void;
  /**
   * V19 W3.5.3 — set the OS screen brightness (0..1) via the lib.
   * Backed by lib `commands.setScreenBrightness` (Android
   * `Window.LayoutParams.screenBrightness`).
   */
  setScreenBrightness(value: number): void;
  /**
   * V19 W3.5.3 — read the current OS screen brightness (0..1).
   * Promoted onto public `PlayerCommands` in lib 1.6.0. Used by
   * the VerticalSwipeGestures mount-time hydration so the
   * brightness pill starts at the user's prior value (the
   * mpv bridge doesn't expose a `volume` readback-by-event for
   * screen brightness — the lib caches a value on the
   * `MpvPlayerModule` and we read it once).
   */
  getScreenBrightness(): number;
  /**
   * V19 W3.5.6 — write an arbitrary mpv property via lib
   * `commands.setProperty(name, value)`. Used by the Quality
   * chips to set `hwdec` + `profile` (mpv-native mapping; no
   * dedicated `setVideoQuality` exists in mpv — the facade
   * deliberately avoids adding one to keep the surface honest).
   */
  setProperty(name: string, value: unknown): void;
  /**
   * V19 W3.6.5 — toggle an mpv audio filter. Backed by lib
   * `commands.setAudioFilter(filter, enabled)` (mpv `--af-add`
   * when `enabled`, `--af-remove` when not). Powers the
   * SkipSilence toggle (mpv's `scaletempo2=max-speed=32.0`
   * is the canonical silence-skip recipe).
   */
  setAudioFilter(filter: string, enabled: boolean): void;
  /**
   * V19 W3.6.5 — toggle an mpv video filter. Backed by lib
   * `commands.setVideoFilter(filter, enabled)` (mpv `--vf-add`
   * when `enabled`, `--vf-remove` when not). Reserved for
   * future chrome pieces that wrap mpv video filters; today
   * no chrome surface calls it.
   */
  setVideoFilter(filter: string, enabled: boolean): void;
  /**
   * V19 W3.6.12 / lib 1.6.0 — enable or disable playlist
   * shuffle. Backed by mpv's `playlist-shuffle` property.
   *
   * Read the current value from `state.shuffle` and pass the opposite.
   * There is deliberately no `toggleShuffle()` here: the lib owns the
   * value (`state.shuffle`, mirrored from mpv via `onPropertyChanged`
   * and on hydration), so this facade forwards it rather than guessing.
   */
  setShuffle(enabled: boolean): void;
  /**
   * V19 W3 Phase 3.3 + W5 reaudit fix — enter the native PiP window.
   * Backed by lib `commands.enterPip()` (lib 1.5.x+), which
   * delegates to `MpvBridgeModule.enterPip()`.
   *
   * **Why this exists (W5 reaudit):** `PiPToggle` used to reach for
   * this via `(commands as unknown as {enterPip?: () => void}).enterPip`
   * and fall back to `() => {}` when it was absent. `TransportCommands`
   * never had the method, so the cast always evaluated to
   * `undefined` and the PiP button rendered (because `canEnterPip` is
   * a state flag, not a command check) while being **completely
   * inert** — a silently broken control. Promoting the real lib
   * method onto the facade removes both the cast and the no-op
   * fallback, and is the correct alternative to bolting on a
   * third-party PiP package.
   */
  enterPip(): void;
  /**
   * Exit the native PiP window, returning to the pre-PiP
   * presentation. Backed by lib `commands.exitPip()`.
   */
  exitPip(): void;
  /**
   * V19 W5 reaudit fix — close the session: release the native
   * player and clear the playlist.
   *
   * Backed by the lib's real `commands.stop()` + `commands.clear()`.
   * The V19 error overlay previously had no close path at all (its
   * Close button was an explicit no-op placeholder), so this gives
   * it a genuine one instead of a button that does nothing.
   */
  close(): void;

  // ── V19 W6.4 — the player header's two real actions ────────────────────
  //
  // Both were missing while the header that needs them shipped, and both
  // were previously reachable only as `(commands as unknown as {...})`
  // casts with `() => {}` fallbacks. That is the exact shape of the
  // "silently inert control" the W5 reaudit removed for `enterPip`: the
  // cast always evaluated to `undefined`, so the button rendered while
  // doing nothing. Promoting the real lib methods here removes both the
  // cast and the no-op, and keeps the "a control that cannot act renders
  // null" invariant enforceable by the type system.

  /**
   * Leave the player: exit PiP if the PiP window is up, finish
   * `PlayerActivity`, and return to the app.
   *
   * Backed by the lib's real `commands.exitPipAndFinish()`.
   *
   * **This is the ONE correct answer for "minimize", "back" and
   * "close" — they are the same action, and the header therefore renders
   * a single back affordance rather than three buttons for one effect.**
   * The reason is structural: the player runs in its own Android
   * activity (`PlayerActivity`, `launchMode="singleTask"`), and V6.0
   * removed the mini dock — `usePresentationStore` keeps only
   * `pipActive`, deriving `'mini' | 'expanded'` from which activity this
   * React tree is mounted in. So there is no smaller player to minimize
   * TO; dismissing the activity is the transition, and it re-derives the
   * mode on its own.
   *
   * Do NOT implement this as `setPresentation('mini')`. That method was
   * removed on purpose: the host immediately overwrites such a write,
   * so it is a control that lies.
   */
  exitPlayer(): void;

  /**
   * Pin the player to the current orientation, or release it back to
   * free rotation.
   *
   * Backed by the lib's real `commands.setOrientation(mode)`:
   *   - locking   → `'landscape'` if the frame is currently landscape,
   *                  else `'portrait'` (pin to CURRENT, the YouTube /
   *                  Apple TV / Plex behaviour — never force a side)
   *   - unlocking → `'sensor'`
   *
   * The side is derived at call time from the live layout rather than
   * stored, so a lock engaged while rotated is not re-applied to a
   * portrait window on the next open. `useOrientationLockStore` records
   * only the boolean intent.
   */
  setOrientationLock(locked: boolean): void;
}

/**
 * V19 W3 — the V19 semantic loop mode. The chrome renders these
 * labels; the facade maps them to the lib's `MpvLoopMode`.
 *
 *   - `'off'`  → lib `'none'`    — no looping
 *   - `'one'`  → lib `'file'`    — repeat the current file
 *   - `'all'`  → lib `'playlist'`— repeat the entire playlist
 *
 * Why a V19 enum separate from `MpvLoopMode`: the video chrome
 * renders Apple-Music-style labels ("Repeat one" / "Repeat all"),
 * and decoupling the chrome vocabulary from the native vocabulary
 * means a future lib-side rename doesn't cascade through the UI.
 */
export type RepeatMode = 'off' | 'one' | 'all';

function mpvLoopModeToRepeat(mode: string | undefined): RepeatMode {
  if (mode === 'file') return 'one';
  if (mode === 'playlist') return 'all';
  return 'off';
}

function repeatModeToMpv(mode: RepeatMode): 'none' | 'file' | 'playlist' {
  if (mode === 'one') return 'file';
  if (mode === 'all') return 'playlist';
  return 'none';
}

/**
 * V19 W3 — A caption track. Derived from the lib's `MpvTrack`
 * filtered by `type === 'sub'`. The chrome never sees the raw
 * `MpvTrack` shape — the facade strips it down to the fields
 * the chrome actually renders (id + display label).
 */
export interface CaptionTrack {
  /** Stable id passed back to `commands.selectCaptionTrack(id)`. */
  id: number;
  /** Display label. Falls back to "Track N" when no title/lang. */
  label: string;
  /** BCP-47-ish language tag (e.g. "en", "ja") when available. */
  lang: string | null;
  /** True when this is the track the lib is currently rendering. */
  active: boolean;
}

export interface TransportHook {
  state: TransportState;
  commands: TransportCommands;
}

/** Tolerance for playhead-vs-buffered match (ms). 1s absorbs
 *  the 1Hz position-tick vs higher-rate cache-event skew. */
const PLAYHEAD_TOLERANCE_MS = 1000;

/** Minimum duration to consider a file "ended" instead of
 *  "still playing near the end". Below this we can't reliably
 *  distinguish paused-at-end from still-loading. */
const ENDED_EPSILON_MS = 250;

/**
 * Convert the lib's `cacheRanges` (byte space) to V19
 * `BufferedRange[]` (millisecond space).
 *
 * V13.5 placeholder: the lib currently exposes `cacheRanges` in
 * bytes via `cacheFill` percent, not as a true ms-space time
 * range. The current derivation treats the cache fill % as a
 * single contiguous range from 0 to `durationMs * cacheFill / 100`.
 * That's enough for the TransportBar's progress fill; a future
 * bridge update will expose time-space ranges (mpv's
 * `demuxer-cache-range` event carries time-space tuples directly).
 *
 * For empty / zero-fill cache, returns `[]`.
 */
function deriveBufferedRanges(progress: PlayerProgress): BufferedRange[] {
  const {durationMs, cacheFill, cacheRanges} = progress;
  if (durationMs <= 0) return [];
  // Prefer time-space ranges if the lib ever ships them; fall
  // back to the percent-fill approximation otherwise.
  if (cacheRanges.length > 0) {
    return cacheRanges.map(r => ({
      startMs: Math.max(0, r.start),
      endMs: Math.min(durationMs, r.end),
    }));
  }
  if (cacheFill > 0) {
    return [
      {
        startMs: 0,
        endMs: Math.min(durationMs, Math.round((durationMs * cacheFill) / 100)),
      },
    ];
  }
  return [];
}

function deriveNormalizedWindow(
  ranges: BufferedRange[],
  positionMs: number,
  durationMs: number,
): NormalizedWindow {
  if (ranges.length === 0) return null;
  if (durationMs <= 0) return null;
  // Playhead in a range: pick the first range whose [start, end]
  // contains positionMs (with tolerance on the lower bound).
  const match = ranges.find(
    r =>
      positionMs >= r.startMs - PLAYHEAD_TOLERANCE_MS &&
      positionMs <= r.endMs,
  );
  if (match) return match;
  // No containing range — playhead is in a gap. Return null so
  // BufferedRangeFill renders nothing (not a stale "100%" fill).
  return null;
}

function deriveCaptionTracks(tracks: ReadonlyArray<{id: number; type: string; title?: string; lang?: string; selected: boolean}> | undefined): {
  captionTracks: CaptionTrack[];
  activeCaptionTrackId: number | null;
} {
  if (!tracks || tracks.length === 0) {
    return {captionTracks: [], activeCaptionTrackId: null};
  }
  const captions: CaptionTrack[] = [];
  let activeId: number | null = null;
  for (let i = 0; i < tracks.length; i++) {
    const t = tracks[i];
    if (t.type !== 'sub') continue;
    const label =
      t.title ||
      (t.lang ? `Track (${t.lang})` : `Track ${captions.length + 1}`);
    captions.push({
      id: t.id,
      label,
      lang: t.lang ?? null,
      active: t.selected,
    });
    if (t.selected) activeId = t.id;
  }
  return {captionTracks: captions, activeCaptionTrackId: activeId};
}

export function useTransport(): TransportHook {
  const progress = usePlayerProgress();
  // V19 W6.4 — the live window, used ONLY to resolve which side the
  // orientation lock should pin to. Read as a hook (not
  // `Dimensions.get`) so a rotation while unlocked updates the derived
  // side the next time the lock is engaged.
  const window = useWindowDimensions();
  const isOrientationLocked = useOrientationLockStore(s => s.locked);
  const setOrientationLocked = useOrientationLockStore(s => s.setLocked);
  const {state: playerState, commands: libCommands}: {
    state: {
      loopMode?: string;
      tracks?: ReadonlyArray<{id: number; type: string; title?: string; lang?: string; selected: boolean}>;
      playlist?: ReadonlyArray<{filename?: string; title?: string}>;
      currentIndex?: number;
      speed?: number;
      volume?: number;
      isMuted?: boolean;
      /**
       * mpv's own play/pause, driven by `onPlaybackStateChanged`.
       * The one pause-aware signal in the stack — see the `isPlaying`
       * derivation below for why this hook could not simply re-derive it.
       */
      isPlaying?: boolean;
      /** mpv `playlist-shuffle`, mirrored by the lib. */
      shuffle?: boolean;
      title?: string;
      artist?: string;
    };
    commands: PlayerCommands;
  } = usePlayer();
  const commands = libCommands;

  const bufferedRanges = useMemo(
    () => deriveBufferedRanges(progress),
    [progress.durationMs, progress.cacheFill, progress.cacheRanges],
  );

  const repeatMode = useMemo<RepeatMode>(
    () => mpvLoopModeToRepeat(playerState.loopMode),
    [playerState.loopMode],
  );

  const {captionTracks, activeCaptionTrackId} = useMemo(
    () => deriveCaptionTracks(playerState.tracks),
    [playerState.tracks],
  );

  const canGoPrev = useMemo(() => {
    const idx = playerState.currentIndex ?? -1;
    return idx > 0;
  }, [playerState.currentIndex]);

  const canGoNext = useMemo(() => {
    const idx = playerState.currentIndex ?? -1;
    const playlist = playerState.playlist ?? [];
    return idx >= 0 && idx < playlist.length - 1;
  }, [playerState.currentIndex, playerState.playlist]);

  // The real current URI + next entry, derived structurally from the
  // lib's playlist rather than from any app-side "current item"
  // bookkeeping (which is what left the Save / Add-to-playlist /
  // NextUp surfaces without an identity to act on).
  const {currentUri, nextTrack} = useMemo(() => {
    const idx = playerState.currentIndex ?? -1;
    const playlist = playerState.playlist ?? [];
    const current = idx >= 0 ? playlist[idx] : undefined;
    const next = idx >= 0 ? playlist[idx + 1] : undefined;
    // An entry with no `filename` is not a usable identity — mpv
    // always sets it, but the lib's type marks it optional, so a
    // malformed entry must degrade to "unknown" rather than
    // producing `{uri: undefined}` that downstream actions would
    // happily try to download.
    return {
      currentUri: current?.filename ?? null,
      nextTrack:
        next?.filename
          ? {uri: next.filename, title: next.title ?? ''}
          : null,
    };
  }, [playerState.currentIndex, playerState.playlist]);

  const state = useMemo<TransportState>(() => {
    const {positionMs, durationMs, isBuffering, isSeeking, seekable} = progress;
    const isEnded =
      durationMs > 0 && positionMs >= durationMs - ENDED_EPSILON_MS;
    // `!isPaused && hasFile`, as documented at the top of this file —
    // which is what the previous `!isEnded && !isBuffering && !isSeeking`
    // was NOT. It had no pause term at all, so it stayed `true` after a
    // pause: a frozen position with `durationMs > 0` reads as "not
    // ended, not buffering, not seeking" no matter what mpv is doing.
    //
    // Three consumers were quietly wrong because of it:
    //   - `usePipBridge` does `isPlaying ? pause() : play()`, so its
    //     PiP play/pause button could only ever pause.
    //   - `usePlaybackCheckpointSync` gates on `isPlaying` to avoid
    //     writing a checkpoint for a paused player, and so kept
    //     overwriting one.
    //   - a play/pause button renders "Pause" for a stopped track.
    //
    // The pause term comes from the lib's own `state.isPlaying`
    // (`onPlaybackStateChanged` → `mpv get-playback-state`), which is
    // the authoritative signal and the one `usePlaybackState` already
    // reads. Deriving it here instead gave the file two owners of the
    // same fact, which is how they came to disagree.
    const isPlaying =
      playerState.isPlaying === true && !isEnded && !isBuffering && !isSeeking;
    return {
      positionMs,
      durationMs,
      isPlaying,
      isBuffering,
      isSeeking,
      isEnded,
      bufferedRanges,
      normalizedWindow: deriveNormalizedWindow(
        bufferedRanges,
        positionMs,
        durationMs,
      ),
      seekable,
      // PiP only makes sense for an actively playing, expanded
      // player. The chrome auto-hide timer (W3.5) gates the
      // gesture on `presentation.mode === 'expanded'` already;
      // this is a belt-and-suspenders for the hook consumer.
      canEnterPip: isPlaying && !isEnded && !isBuffering,
      isOrientationLocked,
      repeatMode,
      shuffle: playerState.shuffle === true,
      captionTracks,
      activeCaptionTrackId,
      canGoPrev,
      canGoNext,
      currentUri,
      nextTrack,
      speed: playerState.speed ?? 1,
      volume: playerState.volume ?? 100,
      isMuted: playerState.isMuted ?? false,
      title: playerState.title ?? '',
      artist: playerState.artist ?? '',
    };
  // V19 W9 (v1.10.0) — dependency list is FIELD-based, not object-based.
  //
  // This used to list `progress` (the whole object). `progress` gets a new
  // identity on every event that touches ANY progress field, so this memo
  // — and therefore the entire 24-field `TransportHook` object that all 12
  // chrome components consume — was rebuilt on every position tick, every
  // cache update, and every buffering flag flip.
  //
  // `progress.positionMs` genuinely changes ~4x/second during playback, so
  // this memo still recomputes at 4Hz — but it now recomputes for the ONE
  // reason the value actually changed, and the deps below are exactly the
  // fields read in the body above.
  }, [
    progress.positionMs,
    progress.durationMs,
    progress.isBuffering,
    progress.isSeeking,
    progress.seekable,
    bufferedRanges,
    repeatMode,
    captionTracks,
    activeCaptionTrackId,
    canGoPrev,
    canGoNext,
    currentUri,
    nextTrack,
    playerState.speed,
    playerState.volume,
    playerState.isMuted,
    playerState.isPlaying,
    playerState.shuffle,
    playerState.title,
    playerState.artist,
    isOrientationLocked,
  ]);

  const wrapped = useMemo<TransportCommands>(
    () => ({
      seek: (positionMs: number) => {
        const clamped = Math.max(
          0,
          Math.min(positionMs, state.durationMs || positionMs),
        );
        commands.seek(clamped);
      },
      seekBy: (deltaMs: number) => {
        commands.seekBy(deltaMs);
      },
      togglePlayPause: () => {
        commands.togglePlayPause();
      },
      play: () => {
        commands.play();
      },
      pause: () => {
        commands.pause();
      },
      setRepeatMode: (mode: RepeatMode) => {
        commands.setLoopMode(repeatModeToMpv(mode));
      },
      // BOTH branches go through `setTrack('sub', …)`.
      //
      // The lib's `selectTrack(trackId)` looks like the obvious call
      // for the "pick a track" case, but it carries no track TYPE and
      // lib 1.8.3 hard-wires it to mpv's VIDEO property:
      //
      //   android/src/main/cpp/main.cpp (nativeSelectTrack)
      //     mpv_set_property(mpv, "vid", MPV_FORMAT_INT64, &trackId);
      //
      // so every `selectCaptionTrack(n)` retargeted the video stream
      // and left the subtitle stream on whatever it was. mpv's
      // subtitle property is `sid`.
      //
      // `setTrack` is the one lib command that takes the track TYPE.
      // Its Kotlin mapping (`MpvBridgeModule.setTrack`) is
      // 'sub' -> `sid`, 'audio' -> `aid`, 'video' -> `vid`, and a
      // negative id is written as the literal `"no"` — which is why
      // `-1` disables captions without a second code path.
      selectCaptionTrack: (trackId: number | null) => {
        commands.setTrack('sub', trackId ?? -1);
      },
      next: () => {
        commands.next();
      },
      previous: () => {
        commands.previous();
      },
      rewind10: () => {
        commands.seekBy(-10_000);
      },
      forward10: () => {
        commands.seekBy(10_000);
      },
      skipPrev: () => {
        const threshold = getSkipPrevThresholdMs();
        const position = state.positionMs;
        if (position > threshold) {
          commands.seek(0);
        } else {
          commands.previous();
        }
      },
      setSpeed: (rate: number) => {
        commands.setSpeed(rate);
      },
      setVolume: (volume: number) => {
        // Clamp at the facade boundary. A fast slider drag can hand
        // back a fraction outside the range, and an unclamped value
        // becomes a raw mpv property write of e.g. 104.
        if (!Number.isFinite(volume)) return;
        commands.setVolume(Math.max(0, Math.min(100, Math.round(volume))));
      },
      /**
       * V19 W7.3 — the real mute primitive, forwarded straight to the
       * lib's `setMuted(boolean)`.
       *
       * Why this is forwarded and not simulated by `setVolume(0)`:
       * `state.isMuted` and `state.volume` are two DIFFERENT mpv
       * properties (`mute` and `volume`). Zeroing the volume to fake a
       * mute makes the next unmute have to guess a level to restore,
       * and it silently overwrites the user's chosen volume. The lib
       * already ships `setMuted`, so the honest implementation was a
       * one-line facade addition rather than a lib release.
       */
      setMuted: (muted: boolean) => {
        commands.setMuted(muted);
      },
      setScreenBrightness: (value: number) => {
        commands.setScreenBrightness(value);
      },
      getScreenBrightness: () => commands.getScreenBrightness(),
      setProperty: (name: string, value: unknown) => {
        commands.setProperty(name, value);
      },
      setAudioFilter: (filter: string, enabled: boolean) => {
        commands.setAudioFilter(filter, enabled);
      },
      setVideoFilter: (filter: string, enabled: boolean) => {
        commands.setVideoFilter(filter, enabled);
      },
      setShuffle: (enabled: boolean) => {
        commands.setShuffle(enabled);
      },
      enterPip: () => {
        commands.enterPip();
      },
      exitPip: () => {
        commands.exitPip();
      },
      close: () => {
        // Release the native session, then clear the queue. Both are
        // real lib commands - not a fabricated "close".
        commands.stop();
        commands.clear();
      },

      // ── V19 W6.4 — the header's two real actions ──────────────────────
      exitPlayer: () => {
        // The lib's own dismiss primitive. It exits the PiP window if
        // one is up, finishes `PlayerActivity`, and tears the
        // SurfaceView down with it. No cast, no `() => {}` fallback —
        // both were how this used to be unreachable.
        commands.exitPipAndFinish();
      },
      setOrientationLock: (locked: boolean) => {
        // Pin to the side the video is in RIGHT NOW rather than forcing
        // one: YouTube / Apple TV / Plex all lock to current. `width >
        // height` is the live layout, so a video opened in portrait and
        // rotated to landscape locks landscape.
        //
        // Unlock returns to `'sensor'` (free rotation) — the only mode
        // that re-enables the device's own rotation behaviour.
        commands.setOrientation(
          locked ? (window.width > window.height ? 'landscape' : 'portrait') : 'sensor',
        );
        // Record the intent only AFTER the platform call, so a store can
        // never claim a lock the platform was never asked for.
        setOrientationLocked(locked);
      },
    }),
    [commands, state.durationMs, window.width, window.height, setOrientationLocked],
  );

  // V19 W9 (v1.10.0) — the returned object is memoised too.
  //
  // `return {state, commands: wrapped}` allocated a fresh hook object on
  // EVERY render, so even a consumer whose `state` memo had correctly
  // bailed out still received a new reference from `useTransport()` and
  // re-rendered. Both halves are stable now, so the tuple is too.
  return useMemo(() => ({state, commands: wrapped}), [state, wrapped]);
}

/**
 * Pure helper: format a duration in milliseconds as `M:SS` or
 * `H:MM:SS` for the TransportBar's time labels.
 *
 * Rounds DOWN to whole seconds — that's what users expect from
 * a media player (Apple Music / Spotify both floor). Negative
 * or non-finite values collapse to `0:00`.
 */
export function formatMsAsClock(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return '0:00';
  const totalSec = Math.floor(ms / 1000);
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  const ss = seconds.toString().padStart(2, '0');
  if (hours > 0) {
    const mm = minutes.toString().padStart(2, '0');
    return `${hours}:${mm}:${ss}`;
  }
  return `${minutes}:${ss}`;
}

/**
 * Pure helper: clamp `positionMs` into `[0, durationMs]`.
 *
 * Used by TransportBar's tap-to-seek handler before calling
 * `commands.seek`. Also useful for tests.
 *
 * A non-finite `positionMs` (NaN, ±Infinity from a degenerate gesture)
 * resolves to `0`, the lower bound — the same fallback Media3's
 * `Util.clampPosition` uses, and the safer of the two ends: a user who
 * has somehow scrubbed to "infinity" is closer to the start of the file
 * than to its end, and seeking to `durationMs` would end playback.
 */
export function clampPosition(
  positionMs: number,
  durationMs: number,
): number {
  if (!Number.isFinite(positionMs)) return 0;
  if (durationMs <= 0) return 0;
  return Math.max(0, Math.min(positionMs, durationMs));
}
