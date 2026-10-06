# V19 — W9 Playback Performance & Event Pipeline

> Wave: **W9** · Date: **2026-10-06** · Status: **shipped in lib `1.10.0`**
> Scope: `react-native-media-player` (native + TS) and `MOBILE_APP_REACT_NATIVE` (player chrome)

---

## 0. The report that started this

> *"its a performance issue, previously i was able to watch video even in emulator, now as i take player page the page gets stuck"*

Reported against the W8.7 build. **W8.7 was not the cause** — it was UI-only
(tap-to-cycle controls, sheets, layout). The regression sat in the event
pipeline underneath it and had been there longer; the chrome changes simply
made it more visible.

This wave was done **code-only** — no device, no screenshots — per explicit
instruction. Every claim below is either a source citation or a test that
fails without its fix.

---

## 1. Findings

All five are in the path *one mpv frame* takes to reach React.

### F1 — `time-pos` crossed the whole stack once per video frame

mpv documents `time-pos` as the per-frame position property
([mpv manual, Playback Control](https://mpv.io/manual/master/)):
*"Unlike `time-pos`, `time-remaining` updates more often than once per
frame"* — which is only meaningful if `time-pos` updates **once** per frame.

Every one of those updates cost, in sequence:

| Layer | Work per frame |
|---|---|
| C++ `event.cpp` | `snprintf` + `std::string` build |
| C++ → JNI | 2 `NewStringUTF`, 1 `CallStaticVoidMethod`, 2 `DeleteLocalRef` |
| Kotlin | `Arguments.createMap()`, `WritableMap` alloc, `RCTDeviceEventEmitter.emit` |
| JS | payload object, reducer spread, `setState` |
| React | context value replaced → **all 12 chrome components re-render** |

The UI samples position at ~1–4 Hz. The pipeline delivered at 30–60 Hz.
**Nothing consumed the extra 15×.**

**Fix:** rate-limit `time-pos` to 250 ms (4 Hz) in C++, *before*
serialization and before the JNI crossing. The most recent value always
wins, so the UI stays truthful — this is a trailing-edge rate limit, not a
filter that could drop a final value.

### F2 — Debug logging ran unconditionally on the hottest thread

`event.cpp` wrote a `__android_log_print(DEBUG, …)` line for **every**
property change, and `MpvBridgeModule.kt` wrote a `Log.i` for every property
change **including the full JSON payload**.

Android's own `Log` documentation notes the message is built before filtering
decides to discard it; measured Android studies (FDroid EMSE 2019) report up
to ~3× response-time overhead when logging is hot, and the cost is paid even
when the log is filtered out. `time-pos` alone meant **30–60 logd writes per
second** on the mpv event thread.

**Fix:** compile-time gate (`SIMBA_MPV_TRACE` / `TRACE_PROPERTY_EVENTS`,
both `false`). Not runtime-configurable on purpose — a runtime lookup would
still evaluate arguments at every call site.

> This log was deliberately made visible in an earlier wave because a
> `TRACEI` no-op had hidden a broken property path. That reasoning was
> correct and is preserved — the diagnostic now lives behind a build flag
> instead of shipping in every release.

### F3 — `demuxer-cache-state` was serialized on every cache tick

mpv documents it as a node map containing `seekable-ranges` (an **array of
maps**), `fw-bytes`, `reader-pts`, `cache-end` and `raw-input-rate` — the
largest payload in the loop. Measured on device: **1168 events** in one short
window, dominating every other event combined. It was then emitted **twice**:
once as `onCacheState` and again as the generic `onPropertyChanged`.

**Fix:** coalesce to 500 ms (2 Hz), and stop emitting the generic
`onPropertyChanged` for any property that already has a dedicated event.

### F4 — Position had two writers

`PlayerProvider` observed `time-pos` **and** ran a 1 Hz `setInterval` calling
the **synchronous** `getPosition()` / `getDuration()` TurboModule getters.

React Native's guidance on sync methods is explicit: *"Synchronous methods
block the JS thread. Use only for very fast operations (<5ms)."* A recurring
timer of blocking JNI round-trips fails that test, and two writers to one
field is how a seek bar ends up jumping backwards.

**Fix:** deleted the poll, not tuned it. The event stream is authoritative
and now faster than what it replaced. The mount-time `seekable` / `mute`
level seeds are **kept** — those are edge-triggered in mpv, so a provider
mounted mid-session would never learn them.

### F5 — the provider's no-op guard was dead code *(the render cascade)*

```ts
if (nextState !== stateRef.current) { setState(nextState) }
```

`applyPlayerEvent` is written as pure spread-and-return, so it allocates a
**new** object for every event. The guard compared a just-created object
against itself — it was **always true**, and never skipped anything.

Consequence: `setState` fired on every event, replacing the context value and
re-rendering every `usePlayer()` consumer, including on per-frame position
updates. The comment in the source claimed this prevented "re-render storms on
`videoReconfig` / PiP no-ops" — it never did.

**Fix:** `playerStateEqual()` — a field-wise compare whose key list is
**derived from `DEFAULT_STATE` at runtime** rather than hand-written, so a
newly added field can't be silently forgotten. A hand-written list would go
stale and start dropping real updates — worse than no guard, and invisible.

---

## 2. App-side cascade (same root, downstream)

| File | Defect | Fix |
|---|---|---|
| `useTransport.ts` | `state` memo depended on the whole `progress` **object** | depend on the 6 fields actually read |
| `useTransport.ts` | `return {state, commands}` allocated every render | `useMemo` the returned tuple |
| `TransportBar.tsx` | `PanResponder` memo depended on `scrubPreviewMs` + `durationMs` — **both change mid-drag** | hold stable, read through refs |

The PanResponder one was a correctness bug, not just cost: RN had to detach
and re-attach the gesture handlers several times per second underneath an
active finger.

Fixing it surfaced a **second real bug** in my own change: `onPanResponderRelease`
read `previewMs` back out of a render-synced ref, so a batched
grant→move→release (fast flick) committed **no seek at all**. The release now
derives the target from the release event's own coordinates — immune to
batching. Caught by the test, not by inspection.

---

## 3. Verification

### Lib `react-native-media-player`
- `tsc --noEmit` clean
- **11 suites / 183 tests green** (177 pre-existing + 6 new)
- New: `src/components/__tests__/PlayerProvider.performance.test.tsx`

### App `MOBILE_APP_REACT_NATIVE`
- `tsc --noEmit` clean
- `eslint . --ext .ts,.tsx --max-warnings 0` clean
- **74 suites / 908 tests green** (900 pre-existing + 8 new)
- New: `__tests__/infrastructure/player/useTransport.performance.test.tsx`
- New: `__tests__/components/player/video/TransportBar/TransportBar.scrub.test.tsx`

### Mutation-checked (a test that cannot fail is worthless)

Reverting the `playerStateEqual` guard → the render-count test **fails**
(`expected 3, received 4`). Confirmed by hand, then reverted back.

Every new test pairs a **"must not rebuild"** case with a **"must rebuild"**
case. A guard that never fires is a dropped update — worse than a wasted
render — so the mirror case is what makes the first one honest.

---

## 4. Invariants added

- **I19 — A no-op guard must compare FIELDS, never object identity, when the
  reducer returns a fresh object.** A reference compare against a just-created
  object is always true. Derive the comparison's field list from the type's
  default value so it cannot go stale.
- **I20 — Rate-limit at the cheapest point in the chain.** Dropping a frame
  in C++ before serialization and before JNI costs one `strcmp`; dropping it
  in React costs the whole pipeline. Rate-limit, never filter: the latest
  value must always win.
- **I21 — Hot-path logging is compile-time gated.** `time-pos` is per-frame;
  an unconditional log there is a release defect, not a diagnostic.
- **I22 — One source of truth per field.** An observed property and a polling
  timer writing the same value means the screen shows whichever landed last.
- **I23 — A gesture's handlers must not depend on state the gesture itself
  mutates.** Deps that change mid-drag force RN to re-attach the responder.
  Read through refs; derive committed values from the terminal event.

---

## 5. Carried forward

| ID | Item |
|---|---|
| W9-a | **Device verification** — APK rebuild required (C++ + Kotlin changed). Confirm playback is smooth and the page does not stick on entry. |
| W9-b | PiP re-verification (no red-box) and orientation-lock behaviour, both installed in 1.9.3/1.9.4, still unexercised. |
| W9-c | W8.7 device matrix: tap-to-cycle repeat/captions, more-sheet three exits, header-rises/transport-falls. |
| W9-d | Music player (deferred by explicit instruction). |
| W9-e | Earlier outstanding: `resolveLaunchParams`/`resolveResumeMs` dead wiring, A-B loop silent no-op, `isInPipMode` unread in JS, MediaSession adb matrix, InteractiveTranscript, lib haptics/hardware keys, single-`MainActivity` migration, W7 acceptance matrix, BookmarkSheet verification. |