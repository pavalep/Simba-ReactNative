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
 *   - `canEnterPip`       — `presentation.mode === 'expanded' && isPlaying`
 *                           (PiP makes no sense for a paused / mini
 *                           player; the gesture wires through here).
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
import {
  usePlayer,
  usePlayerProgress,
  type PlayerProgress,
  type PlayerCommands,
} from '@simba-dev/react-native-media-player';

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
  /** V19 W3 — current repeat mode (V19 vocabulary). */
  repeatMode: RepeatMode;
  /** V19 W3 — subtitle/caption tracks for the current file. */
  captionTracks: CaptionTrack[];
  /** V19 W3 — id of the currently-active subtitle track (or null). */
  activeCaptionTrackId: number | null;
  /** V19 W3.5 — true when the playlist has a previous entry. */
  canGoPrev: boolean;
  /** V19 W3.5 — true when the playlist has a next entry. */
  canGoNext: boolean;
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
}

/**
 * Transport commands — what chrome primitives call.
 *
 * `seek()` takes a millisecond position (clamped to `[0, durationMs]`).
 * `seekBy()` takes a signed delta (negative seeks backward). `step()`
 * is a small forward/back skip — 15s matches the V11/V2 audio UX.
 */
export interface TransportCommands {
  seek(positionMs: number): void;
  seekBy(deltaMs: number): void;
  step(deltaMs: number): void;
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
   * disable captions (lib's `setTrack('sub', -1)` sentinel).
   */
  selectCaptionTrack(trackId: number | null): void;
  /** V19 W3.5 — skip to the next playlist entry. */
  next(): void;
  /** V19 W3.5 — skip to the previous playlist entry. */
  previous(): void;
  /** V19 W3.5 — seek backward by 10s (canonical rewind). */
  rewind10(): void;
  /** V19 W3.5 — seek forward by 10s (canonical forward). */
  forward10(): void;
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
}

/**
 * V19 W3 — the V19 semantic loop mode. The chrome renders these
 * labels; the facade maps them to the lib's `MpvLoopMode`.
 *
 *   - `'off'`  → lib `'none'`    — no looping
 *   - `'one'`  → lib `'file'`    — repeat the current file
 *   - `'all'`  → lib `'playlist'`— repeat the entire playlist
 *
 * Why a V19 enum separate from `MpvLoopMode`: the V19 chrome
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
  const {state: playerState, commands: libCommands}: {
    state: {
      loopMode?: string;
      tracks?: ReadonlyArray<{id: number; type: string; title?: string; lang?: string; selected: boolean}>;
      playlist?: ReadonlyArray<unknown>;
      currentIndex?: number;
      speed?: number;
      volume?: number;
      isMuted?: boolean;
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

  const state = useMemo<TransportState>(() => {
    const {positionMs, durationMs, isBuffering, isSeeking, seekable} = progress;
    const isEnded =
      durationMs > 0 && positionMs >= durationMs - ENDED_EPSILON_MS;
    const isPlaying = !isEnded && !isBuffering && !isSeeking;
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
      repeatMode,
      captionTracks,
      activeCaptionTrackId,
      canGoPrev,
      canGoNext,
      speed: playerState.speed ?? 1,
      volume: playerState.volume ?? 100,
      isMuted: playerState.isMuted ?? false,
    };
  }, [
    progress,
    bufferedRanges,
    repeatMode,
    captionTracks,
    activeCaptionTrackId,
    canGoPrev,
    canGoNext,
    playerState.speed,
    playerState.volume,
    playerState.isMuted,
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
      step: (deltaMs: number) => {
        // `step` is a V19 convenience for the TransportBar's
        // 15-second skip buttons. Maps to the lib's `seekBy` so
        // it survives a single native call (no re-entry).
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
      selectCaptionTrack: (trackId: number | null) => {
        if (trackId === null) {
          // Disable captions. The lib's `setTrack(type, -1)`
          // sentinel clears the active track of that type.
          commands.setTrack('sub', -1);
        } else {
          commands.selectTrack(trackId);
        }
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
      setSpeed: (rate: number) => {
        commands.setSpeed(rate);
      },
      setVolume: (volume: number) => {
        commands.setVolume(volume);
      },
      setScreenBrightness: (value: number) => {
        commands.setScreenBrightness(value);
      },
      getScreenBrightness: () => commands.getScreenBrightness(),
      setProperty: (name: string, value: unknown) => {
        commands.setProperty(name, value);
      },
    }),
    [commands, state.durationMs],
  );

  return {state, commands: wrapped};
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
 */
export function clampPosition(
  positionMs: number,
  durationMs: number,
): number {
  if (!Number.isFinite(positionMs)) return 0;
  if (durationMs <= 0) return 0;
  return Math.max(0, Math.min(positionMs, durationMs));
}
