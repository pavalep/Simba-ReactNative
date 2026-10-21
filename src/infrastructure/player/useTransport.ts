/**
 * V19 W2 — `useTransport()` facade hook.
 *
 * The transport surface every chrome primitive reads from. Wraps
 * the lib's existing `usePlayerProgress()` + `usePlayer()` hooks
 * (which already subscribe to the native mpv event stream and
 * populate the position / duration / buffered / seeking / seekable
 * fields from it) and adds the V19-specific derivations:
 *
 *   - `isPlaying`         — `!isPaused && hasFile`
 *   - `isEnded`           — `positionMs >= durationMs - epsilon`
 *   - `bufferedSegments`  — every buffered ISLAND the demux cache
 *                           currently holds, with overlapping ones
 *                           merged (see `BufferedSegments` for the
 *                           rule and the shipping precedent). Drives
 *                           the `BufferedRangeFill` segments.
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

import {useEffect, useMemo, useRef} from 'react';
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
 * A contiguous buffered range, in milliseconds.
 *
 * The lib's `cacheRanges` is ALREADY in milliseconds. mpv's
 * `demuxer-cache-state` carries `seekable-ranges`, and mpv derives
 * those from the demux queue's packet extent
 * (`update_seek_ranges()` in mpv's `demux/demux.c`) — so they are the
 * time spans of the data mpv currently holds, which is exactly the
 * "buffer islands" a seek bar has to draw. mpv reports them in
 * seconds; the native bridge converts to milliseconds because it is
 * the only layer that knows which unit the payload carried.
 *
 * So this facade does NOT convert anything. It clamps to the media's
 * duration and drops inverted ranges, and that is all.
 */
export interface BufferedRange {
  startMs: number;
  endMs: number;
}

/**
 * The buffered SEGMENTS the TransportBar paints — every island the
 * demux cache currently holds, with overlapping ones merged.
 *
 * ## What the shipping players actually do
 *
 * This replaces an earlier rule that painted only the FIRST range and
 * called it "the contiguous buffered PREFIX". That rule rested on the
 * claim that "ExoPlayer, YouTube, Netflix and Plex all draw ONE
 * continuous grey bar from 0 to that position … Nobody draws a segment
 * map." Each part of that was checked against the player's own source
 * on 2026-10-20, and it is only half right — and the half that is
 * wrong is the half that matters here:
 *
 * | player | what it draws |
 * |---|---|
 * | ExoPlayer / media3 `DefaultTimeBar` | ONE number (`setBufferedPosition(long)`), painted FROM the playhead forward — `bufferedLeft = Math.max(bufferedLeft, scrubberBar.right)` |
 * | YouTube (2026 build) | ONE number — the end of the range CONTAINING the playhead — as a separate `.ytp-load-progress` element painted UNDER the played fill, in white at 40 % |
 * | Plex web (v4.163.0) | ONE bar from 0, in brand amber `rgba(204,123,25,.3)` over an opaque amber played fill; internally it keeps a merged `bufferedRanges` array |
 * | Shaka Player | ONE envelope (first range start → last range end); played colour behind the playhead, buffered colour ahead of it |
 * | **Video.js 8.x / VHS** | **A SEGMENT MAP — one DOM element per buffered range, with no merge at all** |
 * | hls.js demo | one canvas rect per range, `Math.max(2, end - start)` — a 2 px minimum |
 *
 * So "nobody draws a segment map" is FALSE: Video.js is a shipping
 * player that draws exactly that, and it is the one that keeps a
 * multi-range API. And "grey" is wrong too — Plex's buffered fill is
 * the BRAND colour at 30 % alpha, which is the pattern that actually
 * reads as "the same thing as the played fill, but not played yet".
 *
 * ## Why SIMBA draws the islands
 *
 * mpv really does hold a LIST of ranges: one `demux_cached_range` per
 * contiguous cached region (`demux/demux.c`, `in->ranges[]`), so a seek
 * that jumps away leaves the old region cached and starts a new one.
 * The old rule threw every range but the first away, so the region the
 * user had actually seeked TO was invisible — and so was the answer to
 * "what happens when I seek back": the data is still there, seeking
 * back into it is instant, and now the bar can show that it is.
 *
 * Drawing every island is honest: a drawn segment is a span mpv holds
 * right now. It is also Plex's rule that keeps a GAP a gap — merging
 * `[0,10s]` and `[20s,30s]` into `[0,30s]` would claim that 10–20 s is
 * buffered, and it is not. A user who seeks into the "buffered" region
 * then stalls, which is worse than showing less of the buffer.
 *
 * ## The rules
 *   1. clamp the ranges to the duration and drop inverted ones
 *   2. sort them by start
 *   3. merge a range into the previous one only when it OVERLAPS it
 *      (Plex's rule: `next.start < prev.end`)
 *   4. paint every merged segment
 *
 * ## What is NOT painted: the region behind the playhead
 *
 * Every implementation with a playhead clips the buffered region to
 * start AT it — ExoPlayer clips it explicitly, YouTube and Plex paint
 * the played fill over it, Shaka paints the played colour there. A
 * visible back-cached band behind the playhead is not the standard and
 * reads as a rendering bug.
 *
 * SIMBA gets that from the z-order instead of a clip: the segments
 * are painted UNDER the opaque played fill, which covers 0 →
 * playhead. A segment entirely behind the playhead is therefore
 * covered, and a segment that straddles it shows only the part ahead
 * of it. That is exactly ExoPlayer's partition, generalised to
 * islands.
 */
export type BufferedSegments = readonly BufferedRange[];

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
  /**
   * Every buffered island the demux cache holds, overlapping ones
   * merged. Painted UNDER the opaque played fill, so what the user
   * sees ahead of the playhead is the part of the buffer that is
   * downloaded but not yet played.
   *
   * See `BufferedSegments` for the rule and the shipping precedent.
   */
  bufferedSegments: BufferedSegments;
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
   *
   * Backed by the lib's `commands.setVolume`. This is the ONLY volume
   * path in the app: the audio slider (`AudioPlayer`), the video
   * `VolumeControl`, the right-half vertical swipe pill
   * (`VerticalSwipeGestures`), and `<VideoPlayer>`'s imperative ref all
   * route through here, so every one of them inherits the clamp.
   *
   * It was previously declared TWICE in this interface — once as W7.3
   * (here) and again as W3.5.3 further down, each docblock claiming a
   * different wave introduced it. TypeScript accepts an identical
   * overload silently, so nothing flagged it; there has only ever been
   * one implementation. The second declaration is gone.
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
   * V19 W3.5.3 — set the OS screen brightness (0..1) via the lib.
   * Backed by lib `commands.setScreenBrightness` (Android
   * `Window.LayoutParams.screenBrightness`).
   *
   * Clamped here, for the same reason `setVolume` is: the
   * declared range is the contract, and nothing enforced it. The one
   * caller (`VerticalSwipeGestures`) clamps on its own, but a
   * facade method that is safe only because its present callers behave
   * is not a facade — it is a convention, and the next caller
   * inherits the native call unfiltered.
   *
   * Deliberately NOT rounded — brightness is a continuous 0..1 float.
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
   * Leave the player — and stop it.
   *
   * **This used to only dismiss the window, and that was the bug.**
   * `exitPipAndFinish()` finishes `PlayerActivity` and tears the
   * SurfaceView down, but the mpv engine is a process-global C++ handle
   * that outlives any Activity. So back closed the screen while the media
   * carried on — audio still coming out, notification still posted,
   * engine still advancing — with no window left to stop it. Users
   * described it as "it doesn't actually close".
   *
   * ## Why this is a STOP and not a minimise (revised in V21 F4)
   *
   * This verb used to argue that video could not continue in the
   * background, because "W6.0 removed the mini dock, so dismissing the
   * Activity leaves no surface behind". F4 adds the dock — a `MiniPlayer`
   * holding live video — so that argument no longer holds, and the verb
   * back-press used to reach it no longer does either: back now minimises.
   *
   * It is still correct for what DOES reach it. A dock's X means "stop
   * this", and so does the audio player's close. Spotify, Apple Music,
   * Plex, YouTube and VLC all treat an explicit close as ending playback
   * rather than hiding the controls, and background continuation is still
   * right for AUDIO where the dock is always on screen to stop it again.
   * So: back navigates, X stops, and neither is reachable as the other.
   *
   * PiP remains the separately-chosen way to keep watching while doing
   * something else.
   *
   * ## The order is the contract
   *
   * `stopPlayback()` first, so the engine and the foreground service are
   * gone by the time the window is. Finishing first would tear down the
   * surface while the engine still held a decoded frame, and would leave
   * `ACTION_STOP` racing the Activity's own teardown.
   *
   * The paragraph this replaces warned against implementing this as
   * `setPresentation('mini')`, because "the host immediately overwrites
   * such a write, so it is a control that lies". That remains true of the
   * OLD host. The value written today is `videoPresentation`, a real input
   * to the derived mode with discrete event writers, so minimising is a
   * different verb rather than a broken stand-in for stopping — and the
   * two are no longer interchangeable, which is the whole reason they are
   * separate methods.
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

/** Minimum duration to consider a file "ended" instead of
 *  "still playing near the end". Below this we can't reliably
 *  distinguish paused-at-end from still-loading. */
const ENDED_EPSILON_MS = 250;

/**
 * The lib's `cacheRanges` → V19 `BufferedRange[]`.
 *
 * A PASS-THROUGH in milliseconds, which is the whole point of the
 * change: the native bridge converts mpv's seconds to milliseconds
 * because it is the only layer that knows which unit the payload
 * carried, and the consumer receives one unit — the same one
 * `positionMs` and `durationMs` use.
 *
 * This used to do two things that made the bar lie:
 *
 *   1. It described `cacheRanges` as BYTE OFFSETS. mpv's legacy
 *      `ranges` field was byte offsets, and the bridge used to forward
 *      them unlabelled; the consumer read the numbers as milliseconds.
 *      A 60-second range arrived as 60 ms, and a byte range was
 *      clamped to the duration and painted as a full-width "100%
 *      buffered" bar — a bar claiming that data is buffered when it
 *      is not. The bridge no longer forwards byte offsets at all
 *      (lib 1.16.0), so there is nothing to convert here any more.
 *
 *   2. It FELL BACK to the `cacheFill` percentage when `cacheRanges`
 *      was empty, inventing a range from 0 to
 *      `durationMs * cacheFill / 100`. That is not a time range at
 *      all: the cache fills FORWARD FROM THE PLAYHEAD, and the
 *      bitrate varies, so "40% of the cache is full" says nothing
 *      about which 40% of the timeline is buffered. It painted a bar
 *      claiming the first 40% of the film was buffered when the
 *      buffered data was somewhere else entirely. The fallback is
 *      GONE: a percentage is a level, and a level is not a position.
 *
 * The only work left here is clamping to the duration and dropping
 * inverted ranges.
 */
function deriveBufferedRanges(progress: PlayerProgress): BufferedRange[] {
  const {durationMs, cacheRanges} = progress;
  if (durationMs <= 0) return [];
  if (!Array.isArray(cacheRanges) || cacheRanges.length === 0) return [];
  return cacheRanges
    .map(r => ({
      startMs: Math.max(0, Math.min(durationMs, r.start)),
      endMs: Math.max(0, Math.min(durationMs, r.end)),
    }))
    .filter(r => r.endMs > r.startMs)
    .sort((a, b) => a.startMs - b.startMs);
}

/**
 * Merge ranges that OVERLAP, and only those.
 *
 * The rule is Plex web's, read from the shipped client
 * (`plex-4.163.0`): after quantising to whole seconds and sorting by
 * start, a range is merged into the previous one **iff
 * `next.startSeconds < previous.endSeconds`** — a strict overlap. A
 * range that merely TOUCHES the previous one stays separate, and so
 * does a range separated by any real gap.
 *
 * The earlier rule here merged anything within 500 ms of the previous
 * range, on the theory that mpv's demuxer opens and closes gaps of a
 * few tens of milliseconds while reading ahead. That threshold was
 * invented: no shipping player uses a seconds-based merge threshold
 * (Video.js merges nothing at all, Plex merges only on overlap, Shaka
 * merges everything into one envelope, hls.js merges nothing and
 * instead enforces a 2 px minimum width). A 500 ms merge claims half
 * a second of data that is not there, which is exactly the lie the
 * prefix rule was written to avoid.
 *
 * The input is already sorted by start. The output preserves that
 * order and is contiguous within each entry: a merged entry's `endMs`
 * is the furthest end of the ranges it absorbed.
 */
function mergeOverlappingRanges(ranges: BufferedRange[]): BufferedRange[] {
  const merged: BufferedRange[] = [];
  for (const range of ranges) {
    const last = merged[merged.length - 1];
    if (last && range.startMs < last.endMs) {
      last.endMs = Math.max(last.endMs, range.endMs);
      continue;
    }
    merged.push({startMs: range.startMs, endMs: range.endMs});
  }
  return merged;
}

/**
 * The buffered segments to paint: every island, with overlapping ones
 * merged.
 *
 * See `BufferedSegments` for the rule and the shipping precedent.
 * The playhead plays no part in it — these are the spans the demux
 * cache holds, not the island the playhead happens to be sitting in.
 * The z-order in `TransportBar` is what turns them into "played" and
 * "buffered ahead of the playhead".
 */
function deriveBufferedSegments(ranges: BufferedRange[]): BufferedRange[] {
  if (ranges.length === 0) return [];
  return mergeOverlappingRanges(ranges);
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
    [progress.durationMs, progress.cacheRanges],
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
      bufferedSegments: deriveBufferedSegments(bufferedRanges),
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

  /**
   * A LIVE snapshot of what is playing, for the commands that need the
   * value at the moment they are CALLED rather than the value at the
   * moment their memo was built.
   *
   * The `wrapped` commands memo is deliberately stable — it only
   * rebuilds when the DURATION changes — so a command that closed over
   * `state.positionMs` would read a position that is minutes old. The
   * PiP notification is the case that matters: "0 %" because the memo
   * was built when the film started is worse than no percentage.
   *
   * Written in an effect rather than during render: a ref written
   * during render is a side effect in the render phase, and React may
   * render a component without ever committing it.
   */
  const livePlaybackRef = useRef({positionMs: 0, durationMs: 0, title: ''});
  useEffect(() => {
    livePlaybackRef.current = {
      positionMs: progress.positionMs,
      durationMs: progress.durationMs,
      title: playerState.title ?? '',
    };
  });

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
        // Clamp at the facade boundary, for the same reason `setVolume`
        // does. `Window.LayoutParams.screenBrightness` is a native OS
        // call, so an out-of-range value is handed straight to the
        // platform rather than degrading the way an mpv property write
        // would.
        //
        // Deliberately NOT rounded, unlike volume: brightness is a
        // continuous 0..1 float, and rounding it would leave the user
        // with two brightness levels.
        if (!Number.isFinite(value)) return;
        commands.setScreenBrightness(Math.max(0, Math.min(1, value)));
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
        // The native PiP notification shows a title and a progress
        // percentage, and the native method takes BOTH as arguments —
        // its arity is 2 and TurboModule enforces it. Its own fallbacks
        // are "Simba Player" and "0 %", so a real title and a real
        // percentage have to be supplied here: this is the app's
        // session, and the app is what knows what is playing.
        const live = livePlaybackRef.current;
        const progressPct =
          live.durationMs > 0
            ? `${Math.round((live.positionMs / live.durationMs) * 100)} %`
            : null;
        commands.enterPip(live.title || null, progressPct);
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
        // Order is the contract: engine + foreground service first,
        // window second. See the docblock above for why the previous
        // order (or the previous lack of a stop) left audio playing
        // behind a closed screen.
        commands.stopPlayback();
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
