# Android MpvBridgeModule and Video V3 Session Layer
## Code Quality and Performance Review

**Date:** 24 August 2026  
**Author:** Manus AI  
**Scope:** Android Kotlin/JNI/libmpv bridge and the independent `src/modules/playback/video/v3` session layer.  
**Review mode:** Static source review plus TypeScript, targeted ESLint, and Android Kotlin compilation. No emulator, Maestro, or runtime playback acceptance was performed.

> **Release position:** The V3 architecture is directionally strong, but it is **not ready for production sign-off**. There are several high-priority correctness and lifecycle risks below, especially content-URI load correlation, native pointer/surface lifetime coordination, callback concurrency, and high-frequency event pressure.

## 1. Executive summary

The V3 session layer has good separation of responsibilities. `VideoV3MpvSession` is presentation-neutral, the intent controller owns command policy, the state adapter is isolated from React, and the pure reducer makes event translation deterministic. The Android side also has useful defensive behavior such as idempotent destruction, explicit TLS verification, native cache-range forwarding, and a dedicated event thread.

The main weakness is that the native bridge still behaves like a process-wide singleton without a single serialized ownership protocol. Native playback commands, surface attach/detach, destruction, JNI callbacks, and property observation can originate from different threads while sharing `g_mpv`, `g_surface`, `nativePtr`, and lifecycle flags. The libmpv client API is generally thread-safe, but its handle lifetime and the single `mpv_wait_event` ownership requirement still need an application-level lifecycle gate.[1]

The V3 TypeScript layer adds generation guards, but a generation guard cannot repair a native callback that never becomes associated with the current file. The current exact-path check is likely to reject Android `content://` playback after the bridge resolves the URI to `fd://N`. That would leave `activeFileGeneration` unset and cause later V3 events to be ignored for local document-provider files.

## 2. Severity model

| Severity | Meaning | Release implication |
|---|---|---|
| **P0 — blocker** | A realistic crash, use-after-free, permanent playback failure, or data-loss path. | Must be fixed before production acceptance. |
| **P1 — high** | A likely correctness, lifecycle, or sustained-performance defect under normal playback flows. | Fix before broad manual acceptance; do not waive casually. |
| **P2 — medium** | A bounded correctness, maintainability, privacy, or performance issue. | Fix in the current overhaul or explicitly track with owner/date. |
| **P3 — low** | Cleanup, clarity, or future-hardening opportunity. | Can follow after release-critical issues. |

## 3. Findings requiring remediation

### P0-1 — Native handle and surface lifetime are not serialized

**Evidence:** `main.cpp:19-23, 255-270, 292-358`; `MpvBridgeModule.kt:36-37, 240-334, 777-810`.[2] [3]

`g_mpv`, `g_initialized`, `g_running`, `g_surface`, and the Kotlin `nativePtr` are accessed by the React Native module thread, the `TextureView` surface thread, and the mpv event thread. `volatile` flags provide visibility for simple reads but do not establish a safe ownership protocol for a pointer that can be destroyed concurrently. A bridge call can pass its null check, then the player can be destroyed and the handle freed before the native operation uses it. The same class of race exists between surface reattachment and destruction.

The current `nativeDestroy()` joins the event thread, but it does not prevent a concurrent `nativePlay`, `nativeGetProperty`, `nativeSetProperty`, `nativeAttachSurface`, or `nativeSurfaceChanged` call from using the old handle. This is the most important native lifecycle risk because it can present as an intermittent crash or hang rather than a deterministic test failure.

**Recommendation:** Introduce one native lifecycle mutex/state machine around `create → initialized → accepting commands → destroying → destroyed`. Every JNI entry point must acquire a stable handle lease or execute on one serialized native command lane. Destruction must first transition to `destroying`, reject new work, detach/tear down the surface, stop/wake mpv, join the event thread, clear the global surface reference, and only then destroy the handle. Do not rely on `volatile` for ownership.

### P0-2 — Content-URI file-loaded correlation can strand the V3 session

**Evidence:** `VideoV3MpvSession.ts:153-156, 474-476`; `player.api.ts:112-123`; `MpvBridgeModule.kt:322-334, 396-410`.[4] [5] [6]

V3 sets `expectedNativePath` to the original URI or a downloaded local path. The Android bridge resolves a `content://` URI by calling `detachFd()` and sends `fd://N` to mpv. The native `fileLoaded` callback therefore reports a path that is not necessarily equal to the V3 expected path. `handleFileLoaded()` returns early on mismatch, leaving `activeFileGeneration` as `null`; subsequent position, duration, buffering, track, first-frame, and EOF callbacks are then rejected by `hasActiveFile()`.

This is a correctness failure for document-provider and linked-local-file playback, precisely where the app needs dependable playback identity.

**Recommendation:** Correlate loads with an explicit native load-request token or generation passed across the bridge, not with a transformed path. The native bridge should emit `{requestId, requestedUri, resolvedPath}` or V3 should disable exact-path matching for content URIs while retaining the generation guard. Track and close transferred file descriptors on failed load/replacement paths; `detachFd()` transfers ownership and cannot be treated as a normal temporary descriptor.

### P1-1 — JNI callback path performs synchronous, allocation-heavy work for every event

**Evidence:** `event.cpp:130-195, 199-333`; `MpvBridgeModule.kt:53-187`; `main.cpp:53-55`.[2] [3] [7]

Every callback can allocate native and JNI strings, attach/detach the event thread, synchronously invoke Kotlin, parse or construct JSON/maps, emit a React Native event, and write multiple log lines. The event loop also requests verbose mpv logging during initialization. High-rate properties such as `time-pos`, `volume`, `speed`, and cache state can therefore create sustained JNI, JSON, log I/O, and JavaScript pressure.

The callback is synchronous from the event thread’s perspective. If Java/Kotlin or the downstream bridge is slow, the mpv event loop cannot drain promptly. mpv explicitly exposes queue-overflow behavior in the current bridge, so this is not merely theoretical.

**Recommendation:** Keep the event thread attached to the JVM once for its lifetime rather than attaching/detaching on each callback.[7] Disable verbose mpv logs by default and gate diagnostic logging behind a debug flag. Coalesce position updates to a controlled rate, use typed numeric payloads for high-rate properties, batch cache/property updates, and preserve only milestone logs in release builds. The V3 UI should not receive a React render update for every native position tick.

### P1-2 — `MPVLib.listeners` is not concurrency-safe

**Evidence:** `MPVLib.kt:102-120, 131-139`.[8]

Native callbacks iterate a mutable `MutableList` while React Native initialization/destruction can call `addListener` or `removeListener` from another thread. This can produce concurrent modification, missed listeners, or callbacks into a listener that is being removed. The problem is compounded by `onCatalystInstanceDestroy()` removing the module listener while the event thread may still be dispatching.

**Recommendation:** Use `CopyOnWriteArrayList` for the small listener set or synchronize mutations and dispatch over a snapshot. Remove the listener before allowing the native event thread to be torn down, and make callback dispatch tolerate a destroyed React context.

### P1-3 — Surface reattachment still depends on a fragile post-initialize `wid`/VO sequence

**Evidence:** `main.cpp:292-358`; `MpvRenderView.kt:74-93`.[2] [9]

The native code itself documents that setting `wid` after initialization can be undefined behavior, while the Java view changes the `vo` property to `null` and then `gpu` around surface destruction/attachment. There is no completion or acknowledgement that mpv has fully released the old VO before the JNI global reference is replaced or the new surface is used. A TextureView callback can arrive during activity transitions or layout changes while destruction is also in flight.

The V3 single-surface rule is correct, but the native bridge does not yet provide a strong enough acknowledgment protocol to make surface ownership crash-safe under all lifecycle races.

**Recommendation:** Make surface operations a serialized native state machine. Keep the JNI global reference until the native VO teardown is acknowledged, then install the new surface and reconfigure rendering. Reject or queue attach/detach while `destroying`. Add native lifecycle diagnostics for `requested`, `accepted`, `vo-released`, `surface-installed`, and `surface-destroyed` milestones without logging object addresses in release builds.

### P1-4 — JavaScript/native track and chapter contracts are inconsistent

**Evidence:** `NativeMpvPlayer.ts:137-145`; `MpvBridgeModule.kt:449-455, 494-499, 512-517`; `player.api.ts:166-198`; `VideoV3MpvSession.ts:480-492`.[4] [5] [10]

The TypeScript `Spec` declares `getTracks`, `getChapters`, and `getCurrentChapter` as structured arrays/objects. The Kotlin bridge returns JSON strings for those methods. The JS wrapper returns the native result directly without parsing. V3 then calls `.map()` on `MpvPlayer.getTracks()` and `MpvPlayer.getChapters()`.

Depending on which native registration path is active, this can produce a runtime type mismatch or cause the V3 catch blocks to silently replace valid track/chapter data with empty arrays. It directly affects captions, audio selection, and chapters.

**Recommendation:** Make the TurboModule/native `Spec` match the actual native return type, then parse once in `player.api.ts` and expose structured wrapper types. Add defensive schema parsing and a focused unit test for each method. Do not let a parsing failure silently look like “the media has no tracks” without a diagnostic reason.

### P1-5 — Latest-seek-wins is weakened by the outer global command queue

**Evidence:** `VideoV3IntentController.ts:27-38, 65-74`; `VideoV3SeekCoordinator.ts:23-43`.[11] [12]

The seek coordinator can supersede a queued request, but every seek first waits behind the intent controller’s global `tail`. A burst of seek intents is therefore queued by the outer controller one at a time. By the time the inner coordinator sees later requests, earlier seeks may already have reached native mpv. This does not provide true latest-seek-wins behavior during a scrub gesture.

**Recommendation:** Route seek intents through a dedicated coalescing lane before the global command queue, or make the command controller maintain a replaceable pending seek slot keyed by generation. Only the latest pending seek should enter native execution; a seek already sent to mpv can be marked stale, but new seeks must not wait behind unrelated slow commands.

## 4. Medium-priority correctness and performance findings

### P2-1 — Native surface global reference is not cleared in `nativeDestroy()`

**Evidence:** `main.cpp:255-270, 273-274, 346-357`.[2]

`nativeDestroy()` destroys `g_mpv` but does not delete `g_surface`. Normal `MpvRenderView` cleanup may detach it first, but activity destruction, partial React teardown, or an exception can bypass that assumption. The global JNI reference can remain until a later attach or process termination.

**Recommendation:** Add an idempotent surface-release helper that runs during native destruction after VO teardown and before the handle is freed. Make it safe when no `JNIEnv` is available by obtaining one through the existing VM attachment helper.

### P2-2 — Property observation IDs are hash-derived without collision protection

**Evidence:** `property.cpp:111-155`.[13]

The reply userdata is generated from a 64-bit rolling hash of the property name. The same hash is recomputed for unobserve. Although collisions are uncommon, the code has no property-to-ID registry or collision check. A collision would make one observation overwrite or remove another.

**Recommendation:** Allocate monotonically increasing observation IDs and maintain a native map from property name to ID. Reusing an existing ID for the same property is fine; do not use an unchecked string hash as identity.

### P2-3 — Generic property reads always serialize through `MPV_FORMAT_NODE`

**Evidence:** `property.cpp:75-93`; `event.cpp:266-295`.[13] [7]

`nativeGetProperty()` always requests `MPV_FORMAT_NODE`, recursively serializes to JSON, allocates a JNI string, and then the JS wrapper often parses it again. That is appropriate for arbitrary diagnostic properties, but it is unnecessary for scalar state reads such as position, duration, volume, speed, and booleans. Repeated synchronous calls can block the JS thread and add avoidable allocations.

**Recommendation:** Keep generic property access for diagnostics, but add typed native getters or a typed snapshot query for the state synchronizer. Reserve synchronous methods for small, infrequent metadata reads. Avoid exposing large node trees through blocking synchronous methods.

### P2-4 — V3 emits a new snapshot for every position tick

**Evidence:** `VideoV3MpvSession.ts:364-367, 556-569`; `reduceVideoV3SessionEvent.ts:31`; `VideoV3StateAdapter.ts:72-78`.[4] [14] [15]

Every accepted position event creates a new immutable snapshot and emits it. The reducer returns the supplied snapshot event, and the state adapter notifies all listeners. This is architecturally simple, but it can cause React host/control re-rendering at the native position-event rate.

**Recommendation:** Keep position as a high-frequency transport signal separate from structural session state, or throttle/coalesce it at the adapter boundary. Apply a minimum meaningful delta for UI updates while retaining precise native state for seek completion and persistence. The progress rail should use a performant animated/shared-value path once the presentation host is finalized.

### P2-5 — Lifecycle refreshes can outlive synchronizer disposal

**Evidence:** `VideoV3NativeStateSynchronizer.ts:20-32, 34-43`; `createVideoV3Playback.ts:26-34`.[16] [17]

`dispose()` unsubscribes future events but does not flush or cancel a `refreshTail` already queued. The factory then releases the session after disposing the synchronizer. A pending refresh can consequently attempt native reads during or after session release. The promise is generally caught by the caller, but the ordering creates unnecessary native work and obscures shutdown behavior.

**Recommendation:** Add a synchronizer `dispose(): Promise<void>` that marks disposal, unsubscribes, and awaits the current refresh tail before the session is released. Alternatively, add a generation/cancellation token checked immediately before the native refresh.

### P2-6 — Release waits behind every already-queued command

**Evidence:** `VideoV3IntentController.ts:40-47`.[11]

Disposal marks the controller closed and cancels future seeks, but waits for the entire outer `tail` before releasing the session. A burst of commands can therefore delay close and native teardown. This is safer than destroying while commands run, but it gives close latency proportional to queue depth.

**Recommendation:** Use a priority shutdown path that prevents not-yet-started nonessential commands from executing, resolves their results as cancelled, cancels the pending seek lane, then waits only for the currently executing native operation before release.

### P2-7 — Release-build logs expose paths, payloads, and potentially sensitive metadata

**Evidence:** `main.cpp:131, 158, 179, 294, 300`; `MpvBridgeModule.kt:55, 75, 326, 352, 383`; `MPVLib.kt:105, 112, 119`.[2] [3] [7] [8]

The bridge logs raw event payloads, property values, requested/resolved paths, URI permissions, and mpv log text. This creates both performance cost and a privacy concern for local file paths, document-provider identifiers, and signed URLs.

**Recommendation:** Use structured milestone logging with redaction and `BuildConfig.DEBUG` gating. Never log full URLs or document-provider URIs by default. If a diagnostic identifier is needed, log a short non-reversible session/source hash.

## 5. Positive architecture decisions to preserve

The following decisions are sound and should remain in the implementation rather than being replaced by a larger undifferentiated player hook.

| Area | Review result |
|---|---|
| V3 presentation boundary | Correctly separated from the native session; no React or layout concerns exist in `VideoV3MpvSession`. |
| Source identity | Fingerprint-based source replacement is the right direction; the correlation mechanism needs a native request token for transformed URIs. |
| Event reducer | Pure event reduction is easy to test and reason about. Preserve it while reducing high-frequency snapshot churn. |
| Seek ownership | A dedicated seek coordinator is the correct abstraction; it needs to sit before the global queue to achieve real coalescing. |
| Cleanup intent | Release is idempotent and native listeners are explicitly unsubscribed. The remaining issue is ordering and native concurrency, not the decision to centralize cleanup. |
| Buffer architecture | Native `demuxer-cache-state.seekable-ranges` is the correct source of buffered timeline truth. Keep all ranges in state and let presentation choose the active contiguous window. |
| TLS | The bridge keeps TLS verification enabled and supplies a CA bundle rather than disabling certificate verification. Preserve this behavior. |

## 6. Recommended remediation order

The correct order is to fix lifecycle and identity failures before tuning visual performance. Otherwise runtime testing will produce misleading symptoms such as missing first frames, empty tracks, or apparent buffering failures that originate in the bridge.

| Order | Work package | Expected outcome |
|---:|---|---|
| 1 | Native lifecycle gate and surface teardown protocol | No handle use-after-free; deterministic create/destroy/attach behavior. |
| 2 | Content-URI/request-token load correlation | Local document-provider playback reaches `file-loaded`, first-frame, and active state. |
| 3 | Track/chapter contract correction | Caption/audio/chapter features receive structured data reliably. |
| 4 | Thread-safe listener registry and event-thread JNI attachment | Stable callback dispatch without concurrent modification or per-event attach/detach. |
| 5 | Event coalescing and log gating | Lower JS/JNI/log pressure during long playback. |
| 6 | Seek coalescing before global command serialization | Scrubbing behaves as latest-intent-wins. |
| 7 | Synchronizer/close ordering | No refresh after release and faster deterministic close. |
| 8 | Typed scalar snapshot bridge | Lower synchronous bridge overhead and fewer JSON allocations. |

## 7. Validation performed

| Check | Result |
|---|---|
| TypeScript compilation | `TSC_EXIT=0` |
| Targeted ESLint for V3 and native JS wrappers | `ESLINT_EXIT=0` |
| Android `:app:compileDebugKotlin` | `ANDROID_KOTLIN_EXIT=0` |
| Runtime playback/PiP/surface stress | Not run |
| Emulator/Maestro/manual acceptance | Not run |

Static success does not clear the P0/P1 findings. In particular, content-URI playback, native teardown races, event listener concurrency, and long-session event pressure require runtime verification after remediation.

## 8. References

[1]: https://github.com/mpv-player/mpv/blob/master/include/mpv/client.h "mpv client API — thread-safety and event-loop contract"
[2]: `android/app/src/main/cpp/main.cpp` "SIMBA native mpv lifecycle, surface, and playback JNI implementation"
[3]: `android/app/src/main/java/com/simba/player/mpv/MpvBridgeModule.kt` "SIMBA Android React Native mpv bridge"
[4]: `src/modules/playback/video/v3/session/VideoV3MpvSession.ts` "SIMBA V3 native session adapter"
[5]: `src/native/player.api.ts` "SIMBA JavaScript native player wrapper"
[6]: `src/services/downloadService.ts` "SIMBA local-download path resolver"
[7]: `android/app/src/main/cpp/event.cpp` "SIMBA native mpv event loop and JNI callback dispatcher"
[8]: `android/app/src/main/java/com/simba/player/mpv/MPVLib.kt` "SIMBA Kotlin JNI facade and listener registry"
[9]: `android/app/src/main/java/com/simba/player/mpv/MpvRenderView.kt` "SIMBA TextureView surface lifecycle"
[10]: `src/native/NativeMpvPlayer.ts` "SIMBA native TypeScript module contract"
[11]: `src/modules/playback/video/v3/controller/VideoV3IntentController.ts` "SIMBA V3 serialized command controller"
[12]: `src/modules/playback/video/v3/controller/VideoV3SeekCoordinator.ts` "SIMBA V3 seek coordinator"
[13]: `android/app/src/main/cpp/property.cpp` "SIMBA native mpv property observation and JSON bridge"
[14]: `src/modules/playback/video/v3/state/reduceVideoV3SessionEvent.ts` "SIMBA V3 pure session-event reducer"
[15]: `src/modules/playback/video/v3/state/VideoV3StateAdapter.ts` "SIMBA V3 session-to-view adapter"
[16]: `src/modules/playback/video/v3/state/VideoV3NativeStateSynchronizer.ts` "SIMBA V3 lifecycle refresh synchronizer"
[17]: `src/modules/playback/video/v3/session/createVideoV3Playback.ts` "SIMBA V3 playback assembly and release ordering"
