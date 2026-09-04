# SIMBA Player Module — V13 Planning (Wave 9 kickoff)

> **Status:** V13 work shipped as 1.2.0 — see [`SIMBA_PLAYER_MODULE_V13_FINAL_QA_REPORT.md`](./SIMBA_PLAYER_MODULE_V13_FINAL_QA_REPORT.md) and [`SIMBA_PLAYER_MODULE_V13_TRACKER.md`](./SIMBA_PLAYER_MODULE_V13_TRACKER.md) for the canonical record. **The V13 spec ([`SIMBA_PLAYER_MODULE_V13_SPECIFICATION.md`](./SIMBA_PLAYER_MODULE_V13_SPECIFICATION.md)) overrode the original 4-theme plan in this document — V13 became "complete the extraction" (Phases 49-58), not DRM/Casting/iOS/Cleanup.** DRM, Casting, and iOS are deferred to V14.
> **Author:** V12 refactor team · **Created:** 2026-09-03 (alongside the V12.0.0 release)
> **Linked V13 spec:** [`SIMBA_PLAYER_MODULE_V13_SPECIFICATION.md`](./SIMBA_PLAYER_MODULE_V13_SPECIFICATION.md)
> **Linked V13 tracker:** [`SIMBA_PLAYER_MODULE_V13_TRACKER.md`](./SIMBA_PLAYER_MODULE_V13_TRACKER.md)
> **Linked V13 final QA report:** [`SIMBA_PLAYER_MODULE_V13_FINAL_QA_REPORT.md`](./SIMBA_PLAYER_MODULE_V13_FINAL_QA_REPORT.md)
> **Release gating V12.0.0 → V13 planning:** superseded — V13 was scoped by the V13 spec, not this planning doc.

---

## 0. Why this document exists

V12.0.0 fixes the original V11 PiP black-screen bug + restructures the player into a dedicated Android `PlayerActivity` + an NPM-packaged TypeScript provider. **Wave 9 (V13) is the next baseline** — it scopes the work that *wasn't* in V12's charter but emerged as a logical next step:

1. **DRM support** — encrypted media streams (Widevine + ClearKey)
2. **Casting** — DLNA + Chromecast + AirPlay-equivalent
3. **Cleanup deferred from V12's deprecation sweep** — finish deleting the 5 `@deprecated` V11 source files + collapse `usePlaybackState.active` state + thin bridge shim
4. **Cross-platform support** — the V12 module is Android-only. iOS / Linux / tvOS support is plausible once the V12 architecture is mature

This doc is **scoping only** — it does not commit to specific phase work or timelines. The actual V13 spec will be a separate document once the V13 priorities are confirmed in the post-V12 retrospective.

---

## 1. V13 thematic scope (4 themes)

### Theme 1 — DRM (Widevine + ClearKey)

Encrypted media playback is one of the most-requested features for V13. The V12 architecture (`PlayerActivity` + `@simba/react-native-media-player`) makes DRM integration tractable because the native side already owns the playback lifecycle.

#### 1.1 Scope

- **Widevine** (modular / L1) — for HD/4K encrypted streams (Netflix-style)
- **ClearKey** — for unencrypted-CENC streams (e.g., public test streams, education content)
- **Optional:** PlayReady / FairPlay (for cross-platform parity; defer to Theme 4 iOS)

#### 1.2 Native side

- `MpvBridgeModule.kt` gains DRM-specific methods: `setDrmScheme`, `setDrmLicenseServer`, `setDrmHeaders`, `releaseDrm`
- `PlayerActivity.kt` extends `onCreate` to attach DRM schemes before `MpvPlayer.openPlayer(...)`
- License-acquisition is delegated to ExoPlayer's `DefaultDrmSessionManager` (or a custom one if ExoPlayer's defaults don't fit) — but ExoPlayer is one option; the architecture should support swapping

#### 1.3 Consumer API

```typescript
import {PlayerProvider, usePlayer} from '@simba/react-native-media-player';

const config: PlayerConfig = {
  drm: {
    scheme: 'widevine',
    licenseServer: 'https://drm.example.com/license',
    headers: {'X-Custom': 'value'},
  },
  // ... other V12 config ...
};

<PlayerProvider config={config}>
  <App />
</PlayerProvider>
```

#### 1.4 Open questions for V13 scoping

- **L1 vs L3:** Widevine L1 (hardware DRM) requires Widevine-modular + a `MediaDrm` session. L3 is software-only. Which level does the project target?
- **License persistence:** offline playback requires license caching. Do we use `MediaDrm` key sets + storage in `SharedPreferences` (encrypted at rest)?
- **DRM fallback:** what happens when a device doesn't support the requested DRM scheme? Transcode to L3? Block playback? Show error?

---

### Theme 2 — Casting (DLNA + Chromecast + AirPlay-equivalent)

Casting is the second-most-requested feature for V13. V12's architecture supports it naturally because the native player already runs in a dedicated `Activity` that can be paused/resumed cleanly while a remote renderer takes over.

#### 2.1 Scope

- **Chromecast** (Google Cast SDK) — first-class support
- **DLNA / UPnP** — for local-network streaming to smart TVs
- **AirPlay** (iOS-only, so deferred to Theme 4)
- **WebRTC** (browser-cast) — optional, deferred

#### 2.2 Native side

- New Kotlin class: `CastManager.kt` — owns the Cast session lifecycle
- `PlayerActivity.kt` extends `onResume` + `onPause` to delegate playback to the remote renderer when a Cast session is active
- `MpvBridgeModule.kt` gains `startCast`, `stopCast`, `listCastDevices`, `connectToDevice`
- Cast device discovery via `MediaRouter` (Android's built-in Cast protocol) — no extra dependency needed for the discovery layer

#### 2.3 Consumer API

```typescript
import {useCast} from '@simba/react-native-media-player';

function VideoScreen() {
  const {devices, startCast, stopCast, isCasting} = useCast();

  return (
    <View>
      <Pressable onPress={() => startCast(devices[0].id)}>
        <Text>Cast to {devices[0].name}</Text>
      </Pressable>
      {isCasting && <Text>Playing on TV...</Text>}
    </View>
  );
}
```

#### 2.4 Open questions for V13 scoping

- **Session continuity:** when the user casts from phone, then exits the app, does the cast continue? (Should: yes, until `stopCast` is invoked)
- **Battery + Wi-Fi:** long-running cast sessions drain battery. Should we move the cast logic to a foreground service?
- **DRM + cast:** Widevine-protected content has a separate cast path (`CastContext` + `MediaSession` integration). Does Theme 1's design need to consider this?

---

### Theme 3 — Cleanup of the `@deprecated` V11 leftovers

The V12 refactor marked 5 V11 source files `@deprecated` (Phase 42 audit). Two PiP hooks were already deleted (Phase 44). Three remain:

- [`src/services/notificationService.ts`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/services/notificationService.ts) — V11 `MediaNotificationService` (Phase 47.3 deletion candidate)
- [`src/modules/playback/video/surface/VideoNativeSurface.tsx`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/modules/playback/video/surface/VideoNativeSurface.tsx) — V11 inline-mount native surface (Phase 47.2 candidate)
- [`src/modules/playback/video/presentation/VideoSurfaceGestures.tsx`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/modules/playback/video/presentation/VideoSurfaceGestures.tsx) — V11 gesture handler (Phase 47.2 candidate)

Plus two more V11 source files that don't have `@deprecated` headers but are unreachable under V12's `USE_DEDICATED_PLAYER_ACTIVITY = true` flag:

- `src/modules/playback/video/host/VideoHost.tsx` (the main V11 inline host)
- `src/modules/playback/audio/AudioModule.tsx` (audio lane inline host)

#### 3.1 Phased deletion sequence (V13)

The Phase 47 deprecation audit laid out a 6-step deletion sequence. V13 should execute steps 1-4 as the first wave of cleanups:

| Step | Action | Effect |
|------|--------|--------|
| 47.1 | Delete `VideoHost.tsx` + `AudioModule.tsx` | V11 inline-host components go away |
| 47.2 | Delete `VideoNativeSurface.tsx` + `VideoSurfaceGestures.tsx` | V11 inline-mount surface + gestures go away |
| 47.3 | Delete `notificationService.ts` | V11 foreground notification wrapper goes away (V12 module has its own `MediaPlaybackService`) |
| 47.4 | Delete `PlaybackOverlayHost.tsx` + collapse `usePlaybackState.active` state | The Redux `active` state isn't needed anymore — `PlaybackContext.openPlayer()` directly launches `PlayerActivity` |

After 47.4:
- The consumer app's `src/modules/playback/` shrinks to just `PlaybackContext.tsx` (the chokepoint) + the 5 `@deprecated` files are gone
- The bridge code (`MpvPlayerModule.ts`) becomes the only JS-side interface to the player
- The `USE_DEDICATED_PLAYER_ACTIVITY` flag becomes a no-op (V12 is always the path); a follow-up Phase deletes the flag

#### 3.2 Follow-up: flag retirement

After Phase 47.4, `USE_DEDICATED_PLAYER_ACTIVITY` and its emergency-rollback code path can be deleted:

```typescript
// V12 (with flag):
const openPlayer = (request) => {
  if (USE_DEDICATED_PLAYER_ACTIVITY) {
    MpvPlayer.openPlayer(request.uri, request.title);
  } else {
    dispatch(setActive({...request.entry, presentation: 'expanded'})); // V11 path
  }
};

// V13 (no flag):
const openPlayer = (request) => {
  MpvPlayer.openPlayer(request.uri, request.title); // always V12
};
```

The flag retirement is a non-trivial change because it touches:
- `src/lib/flags.ts` (delete the constant)
- `src/modules/playback/PlaybackContext.tsx` (collapse the if/else)
- `src/modules/playback/PlaybackOverlayHost.tsx` (already gated; can now be deleted entirely)
- `__tests__/playbackOverlayHost.test.tsx` (delete; the host itself is gone)
- The cutover runbook (delete the flag-flip rollback procedure)
- The final QA report + this V13 planning doc (update cross-references)

Phasing-wise, the flag retirement is best as **the last V13 cleanup phase** — after the 47.4 sweep, the V11 path is gone, the flag has no consumer, and the deletion is mechanical.

---

### Theme 4 — Cross-platform support (iOS / Linux / tvOS)

V12 is Android-only by design (the V11 PiP bug fix was scoped to Android first because that's where the bug occurred). V13's natural expansion is iOS support, then potentially tvOS + Linux desktop + Web.

#### 4.1 iOS scope

- Port `PlayerActivity.kt` → `PlayerViewController.swift` (iOS equivalent)
- Use `AVPlayer` instead of `mpv` (no `libmpv` on iOS; AVPlayer has native DRM support via FairPlay)
- Migrate the bridge from Kotlin/TurboModule to Swift/TurboModule (or pure Objective-C++ if bridging is easier)
- `MpvPlayerModule.ts` becomes platform-agnostic with platform-specific implementations
- Native PiP: `AVPictureInPictureController` (iOS 14+) + `AVAudioSession`

#### 4.2 iOS DRM integration (FairPlay)

- AVPlayer + FairPlay license acquisition is well-trodden Apple territory; the V12 `DrmConfig` interface should be extended to support FairPlay
- License persistence: AVContentKeySession with offline keys

#### 4.3 Cross-platform architecture

The V12 architecture's `PlayerProvider` + native activity is **conceptually portable**:

| Layer | Android (V12) | iOS (V13) |
|-------|---------------|-----------|
| Native container | `PlayerActivity.kt` | `PlayerViewController.swift` |
| Renderer | `MpvBridgeModule.kt` + libmpv | `AVPlayer` + AVFoundation |
| JS-provider | `PlayerProvider.tsx` | Same (no change) |
| MediaSession | `MediaSessionCompat` + `AudioFocusRequest` | `AVAudioSession` + `MPNowPlayingInfoCenter` |
| PiP | `androidx.media3` + `PictureInPictureParams` | `AVPictureInPictureController` + `AVAudioSession` |
| DRM | Widevine (modular) | FairPlay |
| Foreground service | `MediaPlaybackService` | `AVAudioSession` (no FGS needed; iOS handles background audio via `UIBackgroundModes: audio`) |
| RN bridge | Kotlin/TurboModule | Swift/TurboModule |
| Notification | NotificationCompat + FGS channel | `UNUserNotificationCenter` + `MPNowPlayingInfoCenter` |

The JS-side `PlayerProvider` + `usePlayer` hook + `DefaultControls` would be **identical** between Android + iOS — only the native platform layer differs. This is the "ABI-stable" promise of V12's architecture.

#### 4.4 Open questions for V13 scoping

- **Native layer rewrite cost:** porting mpv → AVPlayer is a significant rewrite. Worth scoping as a multi-phase V13
- **Codec parity:** libmpv supports a wide range of codecs; AVPlayer supports a subset. Does the project's use case require mpv's wider codec support, or is AVPlayer's HLS/H.264/HEVC enough?
- **Is iOS actually needed?** Validate by user demand before committing to a multi-quarter effort

---

## 2. V13 → Wave 9 phasing (proposal)

If V13 is greenlit at a Wave 9 retrospective, here's a proposed phase breakdown:

| Phase | Theme | Effort | Deliverable |
|-------|-------|--------|-------------|
| 49 | Phase 47 cleanup (steps 47.1-47.2) | 1 day | Delete `VideoHost.tsx`, `AudioModule.tsx`, `VideoNativeSurface.tsx`, `VideoSurfaceGestures.tsx` — the inline-mount host + surface are gone |
| 50 | Phase 47 cleanup (step 47.3-47.4) | 1 day | Delete `notificationService.ts` + `PlaybackOverlayHost.tsx` + collapse `usePlaybackState.active` state |
| 51 | Flag retirement | 0.5 day | Delete `USE_DEDICATED_PLAYER_ACTIVITY` + the cutover runbook rollback procedure |
| 52 | DRM scoping + spike | 2 days | Architecture decision doc: Widevine L1 vs L3, license persistence strategy, fallback behaviour. No code yet |
| 53 | DRM implementation (Widevine L3) | 5 days | ClearKey + Widevine L3 working in `PlayerActivity` |
| 54 | DRM implementation (Widevine L1) | 3 days | Hardware-DRM support for HD/4K |
| 55 | Casting scoping + spike | 2 days | Cast SDK architecture decision: Google Cast SDK vs custom MediaRouter-based |
| 56 | Casting implementation (Chromecast) | 4 days | Cast to TV, session continuity, cast UI in `DefaultControls` |
| 57 | Casting implementation (DLNA) | 4 days | Local-network streaming to smart TVs |
| 58 | Cross-platform spike (iOS) | 3 days | PoC: iOS PlayerViewController + Swift TurboModule wrapping AVPlayer; JS-side `PlayerProvider` reuses unchanged |
| 59 | iOS implementation | 8 days | Full iOS support + FairPlay DRM |
| 60 | Final QA + V13.0.0 release tag | 3 days | Same shape as Wave 8 Phase 47-48 |

**Total estimated V13 effort: ~37 working days (~7-8 weeks).**

This is a proposed scoping — the actual V13 phase plan will be a separate document after the post-V12 retrospective confirms priorities.

---

## 3. V13 scope guardrails

V13's success metric is the **same as V12's**:

1. **Fix the next-biggest bug** — DRM is the most-requested. Casting is second
2. **Don't regress V12** — V12's PiP fix + MediaSession + AudioFocus are now baseline. Any V13 change that breaks V12 is a release-blocker
3. **Wave 9 ships on time** — V13 should target a similar 8-week wave shape as V12, not bloat into a multi-quarter monolith

V13's risk areas:

- **libmpv copyright / patent situation** — mpv + ffmpeg include codecs (HEVC, AC3) with patent encumbrances. If V13 needs HEVC hardware DRM (L1), this might require commercial HEVC licensing. Validate early with legal
- **Cast SDK license + analytics** — Google Cast SDK + Chromecast hardware require Google Cast Developer Console registration + telemetry. Plan for SDK license terms
- **iOS App Store review** — iOS app submission has stricter DRM / privacy requirements than Android. V13 Phase 59 (iOS implementation) needs to plan for App Store review cycle (~2-4 weeks per submission)
- **Cross-platform test matrix explosion** — V13 expands the device matrix from "4 Android devices" to "4 Android + 4 iOS devices" minimum. QA Lead needs to budget accordingly

---

## 4. Cross-references

- **V12 release runbook:** [`SIMBA_PLAYER_MODULE_V12_RELEASE_RUNBOOK.md`](./SIMBA_PLAYER_MODULE_V12_RELEASE_RUNBOOK.md) §6 (rollback procedure), §7 (V13 transition)
- **V12 final QA report:** [`SIMBA_PLAYER_MODULE_V12_FINAL_QA_REPORT.md`](./SIMBA_PLAYER_MODULE_V12_FINAL_QA_REPORT.md) §5.1 (V11 cleanup backlog)
- **V12 deprecation audit:** [`SIMBA_PLAYER_MODULE_V12_DEPRECATION_AUDIT.md`](./SIMBA_PLAYER_MODULE_V12_DEPRECATION_AUDIT.md) §5 (6-step Phase 47 sequence)
- **V12 cutover runbook:** [`SIMBA_PLAYER_MODULE_V12_CUTOVER_RUNBOOK.md`](./SIMBA_PLAYER_MODULE_V12_CUTOVER_RUNBOOK.md) §6.3 (48h metric window for V12 → V13 transition)
- **V12 architecture spec:** [`SIMBA_PLAYER_MODULE_V12_SPECIFICATION.md`](./SIMBA_PLAYER_MODULE_V12_SPECIFICATION.md) §10 (PlayerActivity) + §11 (PiP)

---

## 5. Wave 9 kickoff

When V12.0.0 ships and the post-V12 retrospective confirms priorities:

1. **Re-confirm scope** — this doc is the proposal, the retrospective is the commitment
2. **Update SPEC** — fork `SIMBA_PLAYER_MODULE_V12_SPECIFICATION.md` to `SIMBA_PLAYER_MODULE_V13_SPECIFICATION.md`; the V12 docs are preserved (per the V11 docs archived in Phase 46)
3. **Update TRACKER** — fork `SIMBA_PLAYER_MODULE_V12_TRACKER.md` to `SIMBA_PLAYER_MODULE_V13_TRACKER.md`
4. **Wave 9 phase greenlighting** — same pattern as Wave 8: each phase greenlit with "Wave 9 Phase X" + a Phase 49.1/49.2/49.3 deliverable checklist
5. **iOS scoping spike first** — if iOS is genuinely wanted (which user demand justifies?), the spike (Phase 58) is the cheapest way to know if the architecture translation is tractable. If the spike shows iOS is harder than expected, V13 can pivot to "Android-only cleanup + cast + DRM" without iOS

The V13 architecture is **deferred** to the post-retrospective. This planning doc exists so the post-retrospective can move quickly.

---

## 6. Status note

This planning doc is **scoping, not commitment**. Real V13 commitments will be made by the engineering lead + product owner in the post-V12 retrospective, drawing on the scope above as a starting point. Questions / proposals / scope changes go in the `#v13-planning` channel (a follow-up `#mobile-team` topic) once V12.0.0 ships.

# End of V13 planning doc.
