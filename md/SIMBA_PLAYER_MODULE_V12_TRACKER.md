# SIMBA Player Module — V12 Tracker

**Document Version:** 1.0
**Created:** 2026-09-01
**Last Updated:** 2026-09-01
**Owner:** Mobile team
**Status:** �� Planning — Phase 0 (architecture validation)
**Companion to:** [SIMBA_PLAYER_MODULE_V12_SPECIFICATION.md](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/md/SIMBA_PLAYER_MODULE_V12_SPECIFICATION.md)
**Target Release:** V12.0.0

---

## 0. Quick Status Dashboard

| Metric | Current | Target |
|---|---|---|
| Phases complete | 0 / 48 | 48 |
| Wave completion | 0% (W1) — 0% (W2-W8) | 100% all waves |
| Critical bugs open | 1 (V11 PiP black-screen) | 0 |
| Days in current phase | 0 | n/a |
| Estimated days remaining | ~21 working days | 0 |
| Next milestone | Wave 1 complete (Phase 5) | Wave 2 start |
| Blockers | None | None |

---

## 1. Wave Progress

| Wave | Theme | Phases | Status | Progress |
|---|---|---|---|---|
| **W1** | MVP `PlayerActivity` | 1–5 | �� In progress | `[░░░░░░░░░░]` 0% |
| **W2** | Surface migration & PiP fix | 6–10 | ⚪ Pending | `[░░░░░░░░░░]` 0% |
| **W3** | Audio unification | 11–15 | ⚪ Pending | `[░░░░░░░░░░]` 0% |
| **W4** | MediaSession & foreground service | 16–20 | ⚪ Pending | `[░░░░░░░░░░]` 0% |
| **W5** | Configuration, theming & control slots | 21–25 | ⚪ Pending | `[░░░░░░░░░░]` 0% |
| **W6** | NPM package extraction | 26–32 | ⚪ Pending | `[░░░░░░░░░░]` 0% |
| **W7** | Testing, hardening, documentation | 33–40 | ⚪ Pending | `[░░░░░░░░░░]` 0% |
| **W8** | V11 deprecation & cleanup | 41–48 | ⚪ Pending | `[░░░░░░░░░░]` 0% |

**Overall:** `[▓░░░░░░░░░]` 0% complete

---

## 2. Active Phase Detail

### Currently in: **Phase 0 — Architecture validation** (not yet started W1)
- V11 PiP black-screen investigation complete
- Reference architectures analyzed:
  - heritage mpv-android (`BaseMPVView.kt`) — SurfaceView at root, default z-order
  - mpvKt (`PlayerActivity.kt`) — Compose SurfaceView with PiP, "Smoother PiP" feature
  - rn-pip (`RnPipModule.java`) — companion pattern for bridgeless RN
- Decision made: Option A — dedicated `PlayerActivity`
- Spec document drafted (`SIMBA_PLAYER_MODULE_V12_SPECIFICATION.md`)
- Wait on greenlight to begin Phase 1

---

## 3. Phase Status Table

| # | Phase | Wave | Status | Started | Completed | Owner | Notes |
|---|---|---|---|---|---|---|---|
| 1 | Create PlayerActivity skeleton | W1 | ⚪ Pending | — | — | — | — |
| 2 | Register PlayerActivity in manifest | W1 | ⚪ Pending | — | — | — | — |
| 3 | openPlayer TurboModule method | W1 | ⚪ Pending | — | — | — | — |
| 4 | PlayerActivity reads intent | W1 | ⚪ Pending | — | — | — | — |
| 5 | JS-side launch orchestration | W1 | ⚪ Pending | — | — | — | — |
| 6 | Mount MpvRenderView at content root | W2 | ⚪ Pending | — | — | — | — |
| 7 | Surface identity guard & native pointer | W2 | ⚪ Pending | — | — | — | — |
| 8 | Transparent root for RN view tree | W2 | ⚪ Pending | — | — | — | — |
| 9 | setPictureInPictureParams in PlayerActivity | W2 | ⚪ Pending | — | — | — | — |
| 10 | RemoteAction receiver + PiP enter/exit | W2 | ⚪ Pending | — | — | — | — |
| 11 | Audio intent extra in openPlayer | W3 | ⚪ Pending | — | — | — | — |
| 12 | Hide MpvRenderView for audio | W3 | ⚪ Pending | — | — | — | — |
| 13 | Audio UI conditional rendering | W3 | ⚪ Pending | — | — | — | — |
| 14 | Audio background playback groundwork | W3 | ⚪ Pending | — | — | — | — |
| 15 | Audio PiP | W3 | ⚪ Pending | — | — | — | — |
| 16 | Create MediaPlaybackService | W4 | ⚪ Pending | — | — | — | — |
| 17 | Bind/Unbind service in PlayerActivity | W4 | ⚪ Pending | — | — | — | — |
| 18 | MediaSession setup | W4 | ⚪ Pending | — | — | — | — |
| 19 | Media metadata on lock screen | W4 | ⚪ Pending | — | — | — | — |
| 20 | Bluetooth / wired headset controls | W4 | ⚪ Pending | — | — | — | — |
| 21 | PlayerProvider and config | W5 | ⚪ Pending | — | — | — | — |
| 22 | Theme propagation | W5 | ⚪ Pending | — | — | — | — |
| 23 | Custom controls slot | W5 | ⚪ Pending | — | — | — | — |
| 24 | Default controls component | W5 | ⚪ Pending | — | — | — | — |
| 25 | Surface placeholder component | W5 | ⚪ Pending | — | — | — | — |
| 26 | Create module directory structure | W6 | ⚪ Pending | — | — | — | — |
| 27 | Move Android code to module | W6 | ⚪ Pending | — | — | — | — |
| 28 | Create module build.gradle | W6 | ⚪ Pending | — | — | — | — |
| 29 | Move TypeScript code | W6 | ⚪ Pending | — | — | — | — |
| 30 | package.json and react-native.config.js | W6 | ⚪ Pending | — | — | — | — |
| 31 | PlayerPackage registration | W6 | ⚪ Pending | — | — | — | — |
| 32 | Module documentation | W6 | ⚪ Pending | — | — | — | — |
| 33 | Unit tests for native module | W7 | ⚪ Pending | — | — | — | — |
| 34 | TypeScript unit tests | W7 | ⚪ Pending | — | — | — | — |
| 35 | Manual QA test matrix | W7 | ⚪ Pending | — | — | — | — |
| 36 | Memory leak audit | W7 | ⚪ Pending | — | — | — | — |
| 37 | Performance benchmarks | W7 | ⚪ Pending | — | — | — | — |
| 38 | Error handling & recovery | W7 | ⚪ Pending | — | — | — | — |
| 39 | Logging & debug mode | W7 | ⚪ Pending | — | — | — | — |
| 40 | Example app | W7 | ⚪ Pending | — | — | — | — |
| 41 | Feature flag cutover | W8 | ⚪ Pending | — | — | — | — |
| 42 | Remove inline player from MainActivity | W8 | ⚪ Pending | — | — | — | — |
| 43 | Update navigation | W8 | ⚪ Pending | — | — | — | — |
| 44 | Update usePipLifecycle.ts | W8 | ⚪ Pending | — | — | — | — |
| 45 | Clean up V11 debug logs | W8 | ⚪ Pending | — | — | — | — |
| 46 | Update V11 docs | W8 | ⚪ Pending | — | — | — | — |
| 47 | Final QA | W8 | ⚪ Pending | — | — | — | — |
| 48 | V12.0.0 release | W8 | ⚪ Pending | — | — | — | — |

**Status legend:** ⚪ Pending · �� In Progress · ✅ Complete · �� Blocked · ⚫ Deferred

---

## 4. Recent Updates (most recent first)

### 2026-09-01 — Spec + Tracker drafted
- **Author:** Mobile team
- **What:** Created `SIMBA_PLAYER_MODULE_V12_SPECIFICATION.md` (48 phases, 8 waves) and this tracker.
- **Why:** V11 PiP black-screen bug traced to SurfaceView nesting + opaque shell background. Multiple fix attempts (setZOrderOnTop, surface cycling, TextureView) failed. Reference projects (mpvKt, heritage mpv-android) show that SurfaceView at the **activity root** with **default z-order** is the proven pattern.
- **Decision:** Option A — dedicated `PlayerActivity` extending `ReactActivity` with `MpvRenderView` at content root. UI stays in RN. Goal: package as `simba-player` NPM module.
- **Next:** Begin Phase 1 (Create `PlayerActivity` skeleton).

### 2026-09-01 (earlier) — TextureView attempt failed
- **What:** Switched MpvRenderView from SurfaceView to TextureView (Round 2).
- **Why:** Theorized that TextureView content drawn into view tree would be captured by PiP's VRI compositor.
- **Result:** PiP still showed black. TextureView's content display depends on HWUI draw pass, which is suspended for paused activities. Even though SurfaceTexture keeps receiving producer buffers, the TextureView's display layer becomes stale.
- **Conclusion:** TextureView cannot work for PiP. SurfaceView is the only option.

### 2026-08-31 — SurfaceView with z-order experiments failed
- **What:** Tried `setZOrderOnTop(true)`, `setZOrderMediaOverlay(true)`, surface cycling on PiP entry, MediaCodec copy hwdec.
- **Result:** All variants showed black PiP. SurfaceFlinger dump showed VRI's `opaque=1` but content was black.
- **Why failed:** The opaque `#121216` shell background in `VideoPresentationShell.tsx` covers the SurfaceView's hole during PiP re-layout.

### 2026-08-30 — Bridgeless emit fix
- **What:** Migrated from `reactInstanceManager` (throws IllegalStateException in bridgeless) to `reactHost.currentReactContext`.
- **Result:** Emit succeeded but PiP still black. Then fixed `Bundle → Arguments.createMap()` (WritableMap) which was rejected by bridgeless emit. PiP still black.
- **Conclusion:** PiP bug is NOT in the JS-side event delivery. It's in the rendering pipeline.

---

## 5. Open Questions / Decisions Pending

| # | Question | Status | Owner | Blocks |
|---|---|---|---|---|
| Q1 | Reuse `SimbaPlayer` component name in `PlayerActivity`, or split into separate `PlayerScreen`? | �� Pending decision | Mobile team | Phase 5, Phase 8 |
| Q2 | Audio merge timing — same refactor or post-PiP validation? | �� Pending decision | Mobile team | Phase 13+ |
| Q3 | Mini player ownership — keep in `MainActivity` or move to `PlayerActivity`? | �� Pending decision | Mobile team | Phase 2 |
| Q4 | libmpv licensing — bundle or external dep? | �� Pending decision | Mobile team | Phase 28 |
| Q5 | NPM scope — public `@yourorg/simba-player` or scoped private? | ⚪ Not yet | Mobile team | Phase 30 |

---

## 6. Decisions Log

| Date | Decision | Rationale | Decided By |
|---|---|---|---|
| 2026-09-01 | Use Option A (dedicated `PlayerActivity`) | mpvKt proven pattern; SurfaceView at root avoids RN view-tree complications | Mobile team |
| 2026-09-01 | `PlayerActivity` extends `ReactActivity` | Reuse all RN infrastructure for UI; less boilerplate | Mobile team |
| 2026-09-01 | UI stays 100% in React Native | Per user direction; Android side handles only engine + surface + lifecycle | Mobile team |
| 2026-09-01 | Package as standalone NPM module `simba-player` | Reusability; consumer-friendly API; future publishing | Mobile team |
| 2026-09-01 | Use SurfaceView with DEFAULT z-order (no `setZOrderOnTop`, no `setZOrderMediaOverlay`) | Only configuration that works for PiP per mpvKt reference | Mobile team |
| 2026-09-01 | `force-window=yes` STICKY on attach, `force-window=no` on detach | Matches heritage mpv-android BaseMPVView pattern | Mobile team |
| 2026-09-01 | Audio + video unified in same `PlayerActivity` | Share MediaSession, foreground service, PiP lifecycle | Mobile team |
| 2026-08-31 | Drop TextureView attempt | HWUI pause suspends TextureView display | Mobile team |
| 2026-08-31 | Drop `setZOrderOnTop` / `setZOrderMediaOverlay` | Both place surface outside PiP's VRI sample | Mobile team |
| 2026-08-30 | Use `companion object` pattern for bridgeless emit | Mirrors rn-pip; avoids reactInstanceManager throw | Mobile team |

---

## 7. Risk Register

| ID | Risk | Severity | Probability | Owner | Mitigation | Status |
|---|---|---|---|---|---|---|
| R1 | PlayerActivity RN bridge init race condition with mpv | High | Medium | Mobile team | Phase 5 + 7 explicitly test | �� Mitigated by phase design |
| R2 | SurfaceView still doesn't work in PiP after migration | Critical | Low | Mobile team | Wave 2 verification steps | �� Open — to be validated |
| R3 | libmpv GPL blocks commercial consumers | Medium | Medium | Mobile team | Document in README; offer external-dep option | �� Open |
| R4 | MediaSession/foreground service breaks on Android 14+ | High | Medium | Mobile team | `foregroundServiceType="mediaPlayback"` | �� Open |
| R5 | State management across activities (Player ↔ Main) | High | Medium | Mobile team | JS Redux remains canonical state | �� Mitigated by design |
| R6 | npm publishing friction (autolinking edge cases) | Medium | Low | Mobile team | Explicit Phase 30-31 verification | �� Mitigated |
| R7 | ReactActivity re-creation on theme/locale change | Medium | Low | Mobile team | Add configChanges for relevant flags | �� Open |
| R8 | MPV observer leaks if not removed in onDestroy | High | Low | Mobile team | Phase 36 leak audit | �� Mitigated by audit |

---

## 8. Upcoming Milestones

| Milestone | Target Date | Dependencies | Phase Range |
|---|---|---|---|
| **M1: MVP PlayerActivity** | TBD | Phase 0 sign-off | 1–5 |
| **M2: PiP working** | TBD | M1 | 6–10 |
| **M3: Audio + video unified** | TBD | M2 | 11–15 |
| **M4: MediaSession + foreground service** | TBD | M3 | 16–20 |
| **M5: Public API complete** | TBD | M4 | 21–25 |
| **M6: NPM package extracted** | TBD | M5 | 26–32 |
| **M7: Production-ready** | TBD | M6 | 33–40 |
| **M8: V12 release** | TBD | M7 | 41–48 |

---

## 9. Backlog / Deferred Items

| Item | Source | Deferred To | Notes |
|---|---|---|---|
| DRM (Widevine L1/L3) | Phase 38 follow-up | V13 | libmpv Widevine is community-grade |
| Chromecast support | Phase 38 follow-up | V13+ | Separate native module |
| AirPlay support | Phase 38 follow-up | V13+ | iOS-first concern |
| iOS player engine | Architecture gap | V13 | Currently Android-only |
| DRM-protected streaming | Future feature | V13 | Depends on DRM |
| Custom subtitle renderer (libass wrapper exposed) | API gap | V13 | Currently opaque |
| Equalizer / DSP | Phase 38 follow-up | V13 | mpv has EQ, need API |
| Network bandwidth adaptation (ABR) | Phase 37 follow-up | V13 | ExoPlayer is better here |
| Chapter thumbnails | Phase 24 follow-up | V13 | mpv can grab frames |
| Resume from notification action | Phase 20 follow-up | V13 | Minor UX improvement |
| Subtitle font customization UI | Phase 21 follow-up | V13 | Currently config-only |

---

## 10. Standup / Update Log

### Standup: 2026-09-01 (initial)
- **Done:** Spec + Tracker drafted. Reference analysis complete.
- **Doing:** Awaiting Phase 1 greenlight.
- **Blockers:** None.
- **Next:** Begin Phase 1 (Create `PlayerActivity.kt` skeleton).

---

## 11. Links & References

### Internal docs
- [SIMBA_PLAYER_MODULE_V12_SPECIFICATION.md](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/md/SIMBA_PLAYER_MODULE_V12_SPECIFICATION.md) — full 48-phase spec
- [VIDEO_UI_V11_SPECIFICATION.md](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/md/VIDEO_UI_V11_SPECIFICATION.md) — predecessor (archived post-V12)
- [debug-pip-black-screen.md](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/debug-pip-black-screen.md) — V11 PiP investigation log

### External references
- [heritage mpv-android BaseMPVView](https://github.com/mpv-android/mpv-android/blob/master/app/src/main/java/is/xyz/mpv/BaseMPVView.kt)
- [mpvKt PlayerActivity](https://github.com/abdallahmehiz/mpvKt/blob/main/app/src/main/java/live/mehiz/mpvkt/ui/player/PlayerActivity.kt)
- [mpvKt PipActions](https://github.com/abdallahmehiz/mpvKt/blob/main/app/src/main/java/live/mehiz/mpvkt/ui/player/PipActions.kt)
- [rn-pip module](https://github.com/micaiah-effiong/rn-pip)
- [Android PiP guide](https://developer.android.com/develop/ui/views/tasks-and-back-stack/picture-in-picture)
- [React Native autolinking](https://reactnative.dev/docs/the-new-architecture/pure-cxx-modules)

### Code locations
- [MainActivity.kt](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/android/app/src/main/java/com/simba/player/MainActivity.kt)
- [MpvBridgeModule.kt](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/android/app/src/main/java/com/simba/player/mpv/MpvBridgeModule.kt)
- [MpvRenderView.kt](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/android/app/src/main/java/com/simba/player/mpv/MpvRenderView.kt)
- [PipManager.kt](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/android/app/src/main/java/com/simba/player/PipManager.kt)
- [AndroidManifest.xml](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/android/app/src/main/AndroidManifest.xml)
- [VideoHost.tsx](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/modules/playback/video/host/VideoHost.tsx)
- [VideoPresentationShell.tsx](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/modules/playback/video/presentation/VideoPresentationShell.tsx)
- [VideoNativeSurface.tsx](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/modules/playback/video/surface/VideoNativeSurface.tsx)
- [usePipLifecycle.ts](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/hooks/usePipLifecycle.ts)
- [VideoPipAdapter.ts](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/modules/playback/video/platform/VideoPipAdapter.ts)

---

## 12. Notes & Observations

### Why mpvKt is the canonical reference
- 1.3k stars, actively maintained fork of mpv-android
- Explicitly advertises "Smoother PiP" as a feature
- Uses the SAME `BaseMPVView` (heritage mpv-android) — proving the reference is correct
- Compose + ConstraintLayout + MPVView layout matches our needs
- Companion pattern for PiP events is identical to rn-pip (good validation of our approach)

### Why this refactor is the right call
- V11 PiP bug has been investigated for multiple days with no fix found within the existing architecture
- The bug is structural: `SurfaceView` inside React Native's view tree doesn't play well with PiP's VRI sampling
- Removing the structural conflict by promoting `SurfaceView` to the activity root is the only proven solution
- The refactor is the right size for V12 (3-4 weeks) and unlocks the NPM package path

### Risk of doing nothing
- V11 PiP bug remains a known regression
- New contributors will hit the same wall
- Code debt accumulates (we have multiple `force-window`, `setZOrderOnTop`, surface cycling workarounds in the codebase that didn't fix the root cause)
- Customizing the player for partners becomes harder

---

## 13. Change Log (Tracker)

| Date | Author | Change |
|---|---|---|
| 2026-09-01 | Mobile team | Initial tracker created — Phase 0 (architecture validation) |

---

*Tracker maintained alongside [SIMBA_PLAYER_MODULE_V12_SPECIFICATION.md](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/md/SIMBA_PLAYER_MODULE_V12_SPECIFICATION.md). Update this file as phases