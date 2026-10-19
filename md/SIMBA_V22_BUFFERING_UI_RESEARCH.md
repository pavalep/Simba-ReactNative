# Buffering in the player — how it is shown, how buffer islands are handled, and why none of it appears today

2026-10-19. Research + a read of this repo's own code, in that order. Every
claim about a shipping product is sourced below; every claim about *this* app
is a file:line.

---

## 1. The short answer: you are not seeing a buffer indicator because the state that drives it never arrives

This is not a styling problem, and it is not a "the overlay is too subtle"
problem. The overlay is correct and has always been correct. The state it
reads is permanently `false`.

### The chain, verified end to end

```
mpv  paused-for-cache / cache-buffering-state   (an observed property)
  └─> MPV_EVENT_PROPERTY_CHANGE                   ❌ NEVER DELIVERED
       └─> MpvBridgeModule.onMpvPropertyChanged  (MpvBridgeModule.kt:306-311)
            └─> eventEmitter.emit("onBuffering")  (MpvBridgeModule.kt:340-358)
                 └─> PlayerProvider → progress.isBuffering
                      └─> useTransport().state.isBuffering
                           └─> VideoLoadingOverlay: `isBuffering`  (VideoLoadingOverlay.tsx:36)
```

**The break is the second link, and the library already knows it.** The lib's
own `PlayerProvider.tsx` carries the finding verbatim:

> `seekable`, `isSeeking`, `isBuffering` and `cacheRanges` have **no polling
> fallback**, so with nothing observing them the scrub bar renders
> permanently disabled, the buffering spinner never appears, and the
> buffered-range fill is never painted — while every test in this repo still
> passes, because the defaults are valid-looking values.
> — `node_modules/@simba-dev/react-native-media-player/src/components/PlayerProvider.tsx:250-257`

and, as an **OPEN NATIVE DEFECT (1.8.4)**:

> `mpv_observe_property(...)` returns `result=0` for all twelve — registration
> genuinely succeeds. `onPlaybackRestart` arrives 7,418 times; `onFileLoaded`
> arrives. So the native event loop IS pumping and IS dispatching to JS.
> `onSeekable` / `onPositionChanged` / `onDurationChanged` / `onCacheState` /
> `onPlaybackStateChanged` arrive **0 times**.
> `MPV_EVENT_PROPERTY_CHANGE` is therefore never delivered to this handle
> even though the property is observed on it. The next release must fix the
> native property-event path (observe handle vs. pumped handle in
> `android/src/main/cpp/event.cpp` / `property.cpp`).
> — `PlayerProvider.tsx:263-286`

We reproduced this on device on 2026-10-19, independently, against lib
1.15.0. The events that arrived during a playing video:

```
startFile · surfaceAttached · audioReconfig ×3 · fileLoaded
videoReconfig ×2 · playbackRestart
```

Every `MPV_EVENT_PROPERTY_CHANGE`-derived event —
`onPositionChanged`, `onDurationChanged`, `onPlaybackStateChanged`,
`onSeekable`, `onBuffering`, `onCacheState` — arrived **zero** times.

And the 1 Hz poll that used to backstop half of them is gone:

> This used to be a 1Hz `setInterval` calling the SYNCHRONOUS…
> — `PlayerProvider.tsx:767` (v1.10.0)

The poll was removed on the premise that the event stream is authoritative.
The event stream is dead. So the fields with no poll fallback have **no
source at all**:

| field | poll fallback? | live? |
|---|---|---|
| `positionMs` | yes (1 Hz) | ✅ works |
| `durationMs` | yes (1 Hz) | ❌ `--:--` on device |
| `volume`, `speed`, play state | yes (1 Hz) | ✅ works |
| `isBuffering` | **none** | ❌ **spinner never appears** |
| `seekable` | **none** | ❌ was permanently disabled (now fixed *by accident* — the file loads, so seeking works) |
| `isSeeking` | **none** | ❌ |
| `cacheRanges` / `cacheFill` | **none** | ❌ **buffered fill never painted** |

**This is the single highest-value defect in the player.** It is one native
fix in `event.cpp` / `property.cpp`, and it unblocks the buffering indicator,
the duration readout, the seekable flag, the buffered-range fill and the
seeking state at once.

---

## 2. How buffering is shown in shipping players

### 2.1 ExoPlayer / Media3 — the reference implementation on this platform

`PlayerView` exposes the buffering spinner as an XML attribute, and it is
**opt-in**:

> `show_buffering` — Whether the buffering spinner is displayed when the
> player is buffering. Valid values are `never`, `when_playing` and `always`.
> **Default: `never`**
> — [PlayerView (ExoPlayer library)](https://mofazhe.github.io/ExoPlayer-ffmpeg/doc/reference/com/google/android/exoplayer2/ui/PlayerView.html)

> `exo_buffering` — A view that's made visible when the player is
> buffering. This view typically displays a buffering spinner or animation.
> Type: `View`
> — same source

Three things follow, and they are the design:

1. **`never` is the default.** A buffering spinner is not free — it is noise
   if it fires on every 200 ms stall. You opt in.
2. **`when_playing` is the meaningful middle.** Show the spinner only while
   the player is actually playing. A spinner shown while *paused* is a lie:
   nothing is being fetched, so nothing is being waited for.
3. The spinner is a **plain `ProgressBar` in a layout slot** — no bespoke
   animation, no card, no percentage.

ExoPlayer's buffering *state* is also explicit:

> `Player.STATE_BUFFERING` — The player is not able to immediately play from
> its current position. This mostly happens because more data needs to be
> loaded.
> — [Media3 Player Events](https://developer.android.com/media/media3/exoplayer/listening-to-player-events)

### 2.2 Video.js — the delay, which is the part people get wrong

> Shows a loading indicator when the media is waiting to buffer and not
> paused, but only after a configurable `delay` (default **500ms**). This
> delay prevents the indicator from flickering during brief stalls. The
> indicator hides **immediately** when buffering ends.
> — [media-buffering-indicator | Video.js](https://videojs.org/docs/framework/html/reference/components/buffering-indicator)

Note the **asymmetry**: delayed on, immediate off. Onset is filtered because
a 200 ms stall is invisible to a human and a spinner makes it visible; offset
is not filtered because the moment data arrives, the spinner is a lie.

### 2.3 UX guidance on the indicator's own timeline

> **Below 1 second, show nothing.** A spinner flashing for 0.3 seconds is
> visual noise that makes the system feel slower.
> **Use a spinner only for waits of 2–10 seconds.**
> **Any wait over 10 seconds demands percent-done feedback.**
> **Never let the bar move backward.**
> **Keep the bar moving.** If work stalls, say why in words rather than
> freezing silently at 99%.
> Once an indicator appears, leave it up for at least half a second, so it
> reads as a state rather than a glitch.
> — [Progress Indicators Ease the Wait](https://www.uxtigers.com/post/progress-indicators)

### 2.4 Media3 analytics — the same event means different things

> Event interpretation: to be useful for analytics purposes, events need to
> be interpreted in the context of a single playback. For example **the raw
> event of a player state change to `STATE_BUFFERING` may correspond to
> initial buffering, a rebuffer, or buffering that happens after a seek.**
> — [Media3 Analytics](https://developer.android.com/media/media3/exoplayer/analytics)

So `isBuffering` is not one thing. Three distinct situations:

| situation | what the user did | what the UI should do |
|---|---|---|
| initial buffering | pressed play | full-screen spinner is fine, nothing to cancel |
| rebuffer | nothing — the network stalled | spinner, and the picture should hold its last frame |
| post-seek buffering | dragged the scrubber | spinner over the new position, and the seek should not be cancelled |

### 2.5 QoE — why this matters more than it looks

> Rebuffering (also referred to as buffering, stalling) is possibly the most
> noticeable undesired playback event, during which the player runs out of
> media data, resulting in a pause of the video.
> — [Akamai: Enhancing video streaming quality for ExoPlayer — Part 1](https://www.akamai.com/blog/performance/enhancing-video-streaming-quality-for-exoplayer-part-1-quality-of-user-experience-metrics)

---

## 3. Buffer islands

### 3.1 What an island is

The buffer is not one interval. It is a **set of disjoint ranges**:

> The `buffered` property is a `TimeRanges` object, essentially an array of
> start and stop times, not a single value. So the `buffered` property can
> contain an array of discontinuous ranges.
> — [MDN — Using DOM Events to Monitor Load Progress](https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/buffered)

mpv exposes the same thing. `demuxer-cache-state` is a NODE map containing
`seekable-ranges` (an array of maps) plus `fw-bytes`, `reader-pts`,
`raw-input-rate` — see the lib's own comment at
`android/src/main/cpp/event.cpp:230-233`. Each range is `{start, end, flags}`.

So "buffer islands" are simply **the ranges in that array** — contiguous
spans of data with gaps between them, which is what a seek or a cache
eviction leaves behind.

### 3.2 What shipping players do with them: they collapse them

**ExoPlayer does not expose islands at all.**

> `long getBufferedPosition()` — Gets an estimate of the absolute position in
> milliseconds up to which data is buffered, or `UNKNOWN_TIME` if no estimate
> is available.
> — [ExoPlayer API](https://javadoc.io/static/com.google.android.exoplayer/exoplayer/r1.4.1/com/google/android/exoplayer/ExoPlayer.html)

One number. "Absolute position up to which data is buffered" — i.e. the
**contiguous prefix** from zero. The islands behind the playhead are not
surfaced.

YouTube, Netflix and Plex all do the same thing: **one continuous grey bar**
extending from 0 to the buffered position, with the playhead drawn on top of
it. You do not get a segment map.

**That is the answer to "how to combine islands": you do not combine them
into one span.** Merging `[0,10]` and `[20,30]` into `[0,30]` would claim
that 10–20 s is buffered, and it is not. Lying about the buffer is worse
than showing less of it, because the user's next action (seek into the
"buffered" region) then stalls.

The shipping rule is:

> **Render the contiguous prefix from 0.** Islands behind the playhead are
> not shown. When the playhead is in a gap, the bar still shows the prefix
> and the playhead sits visibly *beyond* it — which is exactly the honest
> picture: "we have data up to here, and we are past it".

### 3.3 The one thing you may merge: sub-second gaps

mpv's ranges are not perfectly contiguous — the demuxer can open and close a
gap of a few tens of milliseconds as it reads ahead. Rendering each range as
its own segment makes the bar *flicker* as those gaps open and close.

The fix is not to merge islands, but to merge **gaps below a threshold**:
ranges separated by less than ~0.5 s are one range for display purposes.
0.5 s is the same number Video.js uses for the indicator's onset delay, and
it is well under a frame of perceptual noise on a 3 px track.

### 3.4 What this repo does today, and why it is not the shipping behaviour

`src/infrastructure/player/useTransport.ts`:

```ts
// useTransport.ts:529-547
function deriveNormalizedWindow(ranges, positionMs, durationMs) {
  if (ranges.length === 0) return null;
  if (durationMs <= 0) return null;
  // Playhead in a range: pick the first range whose [start, end] contains positionMs
  const match = ranges.find(
    r => positionMs >= r.startMs - PLAYHEAD_TOLERANCE_MS && positionMs <= r.endMs,
  );
  if (match) return match;
  // No containing range — playhead is in a gap. Return null so
  // BufferedRangeFill renders nothing (not a stale "100%" fill).
  return null;
}
```

Two differences from the shipping behaviour:

1. **It renders the island under the playhead, not the prefix.** When the
   playhead is in a gap it renders *nothing* — so a user with 40 minutes
   buffered is told "nothing is buffered". YouTube shows the prefix and lets
   the playhead sit past it.
2. **It renders ONE range.** There is no island map, and no merging of
   sub-second gaps.

The docstring at `useTransport.ts:26-28` says the intent was *"the contiguous
buffered range that contains the playhead"*, so the current behaviour is
intentional — but it is not what ExoPlayer, YouTube, Netflix or Plex do.

### 3.5 🟠 A unit bug, waiting behind the dead event

```ts
// useTransport.ts:507-527
if (cacheRanges.length > 0) {
  return cacheRanges.map(r => ({
    startMs: Math.max(0, r.start),
    endMs: Math.min(durationMs, r.end),
  }));
}
```

`r.start` / `r.end` are used as **milliseconds**. They are not milliseconds:

- The native side reads `seekable-ranges` (falling back to `ranges`) out of
  the mpv node — `MpvBridgeModule.kt:2467-2468`. `seekable-ranges` is
  **time in seconds**; `ranges` is **byte offsets**. The same field name
  carries two different units depending on which key was present, and the
  bridge does not record which one it used.
- The native comment says *"in seconds, relative to the stream start"* —
  `MpvBridgeModule.kt:362-364`.
- The app's own comment admits the mismatch: *"the lib currently exposes
  `cacheRanges` in bytes via `cacheFill` percent, not as a true ms-space time
  range"* — `useTransport.ts:496-504`.

So a 60-second buffered range arrives as `60` and becomes **60 ms** — a fill
0.1 % wide, effectively invisible. And on the `ranges` fallback path (byte
offsets) a 400 MB offset becomes 400 000 000 ms, clamped to the duration —
a bar that claims the whole file is buffered.

**This must be fixed before the buffered fill can be shown at all**, or the
first thing users see is a bar that lies.

---

## 4. What this app's buffering UI does today, against the above

`src/components/player/video/VideoLoadingOverlay/VideoLoadingOverlay.tsx`:

| aspect | this app | shipping practice | verdict |
|---|---|---|---|
| trigger | `videoState === 'preparing' \|\| isBuffering` | `isBuffering` + "not paused" | ❌ no paused guard |
| onset delay | none | Video.js 500 ms; NN/g "show nothing under 1 s" | ❌ will flicker on a 200 ms stall |
| minimum visible | none | NN/g: "leave it up for at least half a second" | ❌ flickers |
| visual | `ActivityIndicator` + "Buffering" text, full-bleed, transparent | ExoPlayer: a `ProgressBar` in a slot | ✅ equivalent |
| accessible | `role="progressbar"`, label "Loading", `liveRegion="polite"` | — | ✅ better than ExoPlayer's bare ProgressBar |
| no percentage | ✅ ("NEVER a fake percentage") | NN/g: determinate past 10 s | ✅ correct for now |
| determinate fallback | none | NN/g: percent-done past 10 s | ⚠️ missing, but only reachable once buffering is unblocked |

The component's own docstring is honest about its restraint: *"NEVER a fake
percentage, NEVER a full-page card."* That is right and should stay.

**The overlay needs three changes, in this order:**

1. **Do not show it while paused.** ExoPlayer's `when_playing`, Video.js's
   "not paused". A spinner over a paused video says "we are fetching" when
   we are not.
2. **Delay the onset by ~500 ms** and **hold it for ≥500 ms** once shown.
   Video.js's asymmetric delay/hide, plus NN/g's "reads as a state rather
   than a glitch".
3. **Distinguish initial buffering from a rebuffer** (Media3 analytics).
   The app already has `videoState === 'preparing'` for the initial case, so
   this is available — the label is already different.

**None of this matters until the state arrives.** The overlay is currently
reading a `false` that can never become `true`.

---

## 5. Recommended order of work

1. **LIB — fix `MPV_EVENT_PROPERTY_CHANGE` delivery** (`event.cpp` /
   `property.cpp`; observe handle vs. pumped handle). Unblocks
   `isBuffering`, `duration`, `seekable`, `isSeeking`, `cacheRanges`,
   `cacheFill` in one change. **Everything below is blocked on this.**
   *Fallback if the native fix is slow:* restore the 1 Hz poll for the
   fields that have none, exactly as v1.10.0 removed it. The poll is worse
   than events (1 Hz granularity, no `seekable`/`isSeeking` at all) but it
   unblocks the UI, and the lib already had it.
2. **APP — fix the seconds/bytes → ms conversion** in
   `deriveBufferedRanges`, and make the bridge record which unit it sent.
   A buffered fill that lies is worse than no buffered fill.
3. **APP — switch the buffered fill to the contiguous prefix** (ExoPlayer
   semantics) and merge sub-second gaps, rather than showing the playhead's
   island and nothing when the playhead is in a gap.
4. **APP — add the overlay's onset delay, minimum-visible time and paused
   guard.**
5. **APP — surface the load-failure error.** A file that fails to load
   currently shows a silent black screen; `VideoErrorOverlay` never appears.
   See the carried-forward list.

---

## 6. Sources

- [PlayerView (ExoPlayer library)](https://mofazhe.github.io/ExoPlayer-ffmpeg/doc/reference/com/google/android/exoplayer2/ui/PlayerView.html) — `show_buffering` values and default; `exo_buffering` slot
- [ExoPlayer API (r1.4.1)](https://javadoc.io/static/com.google.android.exoplayer/exoplayer/r1.4.1/com/google/android/exoplayer/ExoPlayer.html) — `getBufferedPosition()` as a single contiguous value
- [Media3 — Listening to player events](https://developer.android.com/media/media3/exoplayer/listening-to-player-events) — `STATE_BUFFERING` semantics
- [Media3 — Analytics](https://developer.android.com/media/media3/exoplayer/analytics) — initial buffering vs. rebuffer vs. post-seek
- [media-buffering-indicator | Video.js](https://videojs.org/docs/framework/html/reference/components/buffering-indicator) — 500 ms onset delay, immediate hide, "not paused"
- [Progress Indicators Ease the Wait — UX Tigers](https://www.uxtigers.com/post/progress-indicators) — 1 s / 10 s thresholds, minimum visible time, never move backward
- [MDN — Using DOM Events to Monitor Load Progress](https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/buffered) — `buffered` as discontinuous ranges
- [Akamai — Enhancing video streaming quality for ExoPlayer, Part 1](https://www.akamai.com/blog/performance/enhancing-video-streaming-quality-for-exoplayer-part-1-quality-of-user-experience-metrics) — rebuffering as the most noticeable negative event
- [Video Streaming UI/UX Best Practices (2026) — FluxPlays](https://www.fluxplays.live/blog/streaming-ui-ux-best-practices) — "never let the loading state appear indefinitely with no feedback"; show the reason on failure
