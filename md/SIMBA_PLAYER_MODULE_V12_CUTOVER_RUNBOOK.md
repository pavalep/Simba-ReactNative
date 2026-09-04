# SIMBA Player Module V12 — Cutover Runbook (Phase 41)

**Document Version:** 1.0
**Created:** 2026-09-03
**Owner:** Mobile team (cutover) + DevOps (rollback execution)
**Status:** 🟢 Active — `USE_DEDICATED_PLAYER_ACTIVITY = true` since 2026-09-03
**Companion to:** [SIMBA_PLAYER_MODULE_V12_SPECIFICATION.md](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/md/SIMBA_PLAYER_MODULE_V12_SPECIFICATION.md) §41 + [SIMBA_PLAYER_MODULE_V12_TRACKER.md](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/md/SIMBA_PLAYER_MODULE_V12_TRACKER.md)

---

## 1. What changed in Phase 41

One-line flag flip in [`src/lib/flags.ts`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/lib/flags.ts):

```diff
- export const USE_DEDICATED_PLAYER_ACTIVITY = false;
+ export const USE_DEDICATED_PLAYER_ACTIVITY = true;
```

That's the entire Phase 41 diff. Everything else — the dedicated `PlayerActivity`, the `MpvBridgeModule` Kotlin module, the `MediaPlaybackService`, the `PlayerProvider` + `DefaultControls` + `usePlayer` hooks — was already wired in Wave 0–6 + Wave 7. Phase 41 just enables the path.

## 2. What this means for consumers

When a user taps a video or audio file:

**Before Phase 41 (V11):**
1. `PlaybackContext.openPlayer()` sets inline-mount state
2. `VideoHost` mounts a `MpvRenderView` inside `MainActivity`
3. The V11 `MediaNotificationService` owns the foreground notification
4. PiP uses Android's `setPictureInPictureParams` from `MainActivity`

**After Phase 41 (V12, current default):**
1. `PlaybackContext.openPlayer()` calls `MpvPlayer.openPlayer(uri, title, type, startPositionMs)`
2. The native bridge launches a dedicated `PlayerActivity` (declared in the module's AndroidManifest)
3. The V12 `MediaPlaybackService` (in the module) owns the foreground notification
4. PiP is owned by `PlayerActivity` (which has its own PiP lifecycle)
5. The V11 `VideoHost` is unmounted (its `inPlayerActivity` flag is true, so it renders transparent)

## 3. Code paths now active

Verified via `Grep USE_DEDICATED_PLAYER_ACTIVITY` — all 7 references are in TS code only (no native code path is gated by this flag; the module is always linked, the flag controls the JS chokepoint):

| File | Lines | Role |
|---|---|---|
| [`src/lib/flags.ts`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/lib/flags.ts) | 33 | Flag definition |
| [`src/modules/playback/PlaybackContext.tsx`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/modules/playback/PlaybackContext.tsx) | 4, 49 | Gating the V12 `openPlayer()` call |
| [`src/native/player.api.ts`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/native/player.api.ts) | 415 | TypeScript comment |
| [`src/modules/playback/video/host/VideoHost.tsx`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/modules/playback/video/host/VideoHost.tsx) | 84 | Comment about the flag |
| [`src/modules/playback/types.ts`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/modules/playback/types.ts) | 101 | Comment about the flag |

## 4. What stays V11 for now

These V11 surfaces are kept for Phase 41+ (deprecation) and Phase 47+ (deletion):

- `src/services/notificationService.ts` — V11 notification path. Phase 41 leaves it as-is because `USE_UNIFIED_MEDIA_SESSION = false`. Phase 41.5 will disable it.
- `src/hooks/usePlayer.ts` — V11 hook with a different signature. Consumers still using this import will continue to work because it's a separate file from the module's `types/player.ts`.
- `src/hooks/usePipEntry.ts` — V11 PiP entry orchestration. The V12 `PlayerActivity` has its own PiP lifecycle; this hook is no longer used.
- `src/hooks/usePipLifecycle.ts` — same.
- `MediaNotificationService.kt` in `com.simba.player` — V11 foreground service. Phase 41 leaves it registered; Phase 41.5 will unregister it.

## 5. Rollback procedure (if V12 misbehaves in production)

The flag flip is a **JS-only change** — rollback does NOT require rebuilding native code, restarting services, or migrating data. It is a single-file, single-line, git-checkout-style rollback.

### 5.1 Emergency rollback (under 5 minutes)

```bash
# On a developer machine with the repo
cd MOBILE_APP_REACT_NATIVE
git checkout src/lib/flags.ts  # if the bad commit is the only one touching flags.ts
# OR: edit flags.ts directly to flip the flag back to false

# Rebuild + redeploy
cd android
./gradlew :app:assembleRelease
# Deploy via your normal release pipeline
```

Once the new APK is rolled out, `PlaybackContext.openPlayer()` sees `USE_DEDICATED_PLAYER_ACTIVITY === false` and routes to the V11 inline-mount path. `VideoHost` re-renders with the V11 `MpvRenderView` and the V11 notification service resumes ownership.

### 5.2 Targeted rollback (one user / one build)

For a phased rollout (e.g., 1% → 10% → 50% → 100%), use the same flag — wrap the rollout behind a remote-config layer (Firebase Remote Config, LaunchDarkly, or your existing tool) that flips `USE_DEDICATED_PLAYER_ACTIVITY` based on a user attribute:

```typescript
// src/lib/flags.ts (future remote-config integration)
export const USE_DEDICATED_PLAYER_ACTIVITY =
  remoteConfig.getBoolean('v12_dedicated_player') ?? true;
```

This pattern is **not implemented in Phase 41** (would require a new dependency on the remote-config SDK). Phase 41 ships the constant flag.

### 5.3 Hard rollback (V12 has a critical bug)

If V12 has a critical bug that the flag flip cannot mitigate (e.g., the launched `PlayerActivity` crashes on launch):

1. Flip the flag back to `false` (per §5.1)
2. Optionally: also remove the module from `package.json` + `settings.gradle` + `app/build.gradle` (this is the Phase 47+ work; Phase 41 doesn't touch native dependency wiring)
3. Rebuild + redeploy

The native module stays linked in the APK but is dormant (the JS chokepoint doesn't call it). This is the safest intermediate state — consumers who import from `@simba/react-native-media-player` directly still get the new API; consumers who went through `PlaybackContext.openPlayer()` get the V11 fallback.

## 6. Verification after cutover

### 6.1 Smoke tests (must run within 30 minutes of release)

- [ ] Open a local MP4 from the library → `PlayerActivity` launches, playback starts
- [ ] Open an HLS stream from the URL bar → `PlayerActivity` launches, playback starts
- [ ] Open an MP3 from the library → `PlayerActivity` launches, audio plays, notification appears with transport controls
- [ ] Press home during video playback → PiP window appears with live video (V11 bug regression check)
- [ ] Lock screen during audio playback → lock-screen controls appear
- [ ] Pause via notification → playback pauses
- [ ] Resume via notification → playback resumes
- [ ] Close the player via back button → `MainActivity` resumes; no orphan `PlayerActivity`
- [ ] Rotate the device during playback → video resizes correctly; no crash
- [ ] Airplane mode mid-stream → playback pauses; recovery on re-enable (manual QA)

### 6.2 Logcat checks

After the smoke tests, pull logcat and verify:

```bash
adb logcat -d -s PlayerActivity:I MpvBridgeModule:I | grep -E "ready|launchUri|openPlayer|setNativePtr"
```

You should see lines like:

```
[PlaybackTrace][Bridge][openPlayer] launched PlayerActivity uri='...' type='video' startMs=0
[PlaybackTrace][Bridge][initialize] MpvPlayerModule v0.1.0 init: package=com.simba.app isHeadlessJsTask=false debugLogging=true
PlayerActivity ready (uri='...', type='video', startMs=0)
[PlaybackTrace][Bridge][property] name=time-pos value="0.0"
```

The absence of any `[PlaybackTrace][Bridge][error]` line in the first 5 minutes after release is the key signal.

### 6.3 Metric to monitor for 48 hours

| Metric | Threshold | Why |
|---|---|---|
| `PlayerActivity` crash rate | < 0.1% | New activity; expect a few edge cases |
| `MediaPlaybackService` start failures | < 0.5% | Foreground service can be killed by OEMs |
| `openPlayer` rejection rate | < 1% | Includes E_ACTIVITY_NOT_FOUND (manifest error) |
| `onError` event rate | < 2% of sessions | Includes E_NETWORK_FAILURE on flaky networks |
| User-reported PiP bugs | < 5 reports / 1k sessions | V11 bug regression check |

If any of these thresholds are breached in the first 24 hours, **execute §5.1 rollback**.

## 7. Cutover timeline (planned)

| Time | Action | Owner |
|---|---|---|
| T+0 (2026-09-03) | Flip flag to `true`; release 0.1.0 | Mobile team |
| T+24h | Monitor §6.3 metrics; no rollback needed → proceed | DevOps |
| T+48h | If metrics OK → declare Phase 41 complete; proceed to Phase 42 (remove inline player from MainActivity) | Mobile team |
| T+1 week | If metrics OK → Phase 47 (delete V11 leftover files) | Mobile team |
| T+2 weeks | If metrics OK → Phase 48 (cut V12.0.0 release) | Mobile team |

If at T+24h or T+48h any §6.3 threshold is breached, execute §5.1 rollback and open a `Phase 41-REGRESSION` bug.

## 8. Files modified

- **Modified:**
  - [`MOBILE_APP_REACT_NATIVE/src/lib/flags.ts`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/lib/flags.ts) — flipped `USE_DEDICATED_PLAYER_ACTIVITY` to `true` + updated header comments + added rollback procedure link

## 9. Related documents

- [SIMBA_PLAYER_MODULE_V12_SPECIFICATION.md](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/md/SIMBA_PLAYER_MODULE_V12_SPECIFICATION.md) §41 — the spec for this phase
- [SIMBA_PLAYER_MODULE_V12_TRACKER.md](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/md/SIMBA_PLAYER_MODULE_V12_TRACKER.md) — the master tracker
- [SIMBA_PLAYER_MODULE_V12_ERROR_CONTRACT.md](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/md/SIMBA_PLAYER_MODULE_V12_ERROR_CONTRACT.md) — error event contract used by §6.2 logcat checks
- [SIMBA_PLAYER_MODULE_V12_PERFORMANCE_BENCHMARKS.md](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/md/SIMBA_PLAYER_MODULE_V12_PERFORMANCE_BENCHMARKS.md) — perf benchmarks to verify §6.3 metrics
- [SIMBA_PLAYER_MODULE_V12_QA_TEST_MATRIX.md](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/md/SIMBA_PLAYER_MODULE_V12_QA_TEST_MATRIX.md) — manual QA matrix covering §6.1 smoke tests
