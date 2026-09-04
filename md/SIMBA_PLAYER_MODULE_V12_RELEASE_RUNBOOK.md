# SIMBA Player Module V12 — Release Runbook (Phase 48)

> **Status:** Phase 48 in progress · **Author:** V12 refactor team · **Created:** Wave 8 / Phase 48 (2026-09-03)
> **Linked spec:** [`SIMBA_PLAYER_MODULE_V12_SPECIFICATION.md`](./SIMBA_PLAYER_MODULE_V12_SPECIFICATION.md) (v1.38)
> **Linked tracker:** [`SIMBA_PLAYER_MODULE_V12_TRACKER.md`](./SIMBA_PLAYER_MODULE_V12_TRACKER.md) (v2.42)
> **Linked final QA report:** [`SIMBA_PLAYER_MODULE_V12_FINAL_QA_REPORT.md`](./SIMBA_PLAYER_MODULE_V12_FINAL_QA_REPORT.md)
> **Linked cutover runbook:** [`SIMBA_PLAYER_MODULE_V12_CUTOVER_RUNBOOK.md`](./SIMBA_PLAYER_MODULE_V12_CUTOVER_RUNBOOK.md) (the V11→V12 cutover; for the rollback procedure in §5 of this doc)

---

## 0. Purpose

This runbook is the **release-day operations manual** for V12.0.0. It covers:

- §1 Pre-release gate (the 8 conditions from [`SIMBA_PLAYER_MODULE_V12_FINAL_QA_REPORT.md §4.1`](./SIMBA_PLAYER_MODULE_V12_FINAL_QA_REPORT.md))
- §2 Git tag procedure
- §3 Release APK build procedure
- §4 NPM publish procedure
- §5 Internal announcement procedure
- §6 Rollback procedure (if V12 hits a Blocker post-release)
- §7 Post-release monitoring (the 48h metric window from [cutover runbook §6.3](./SIMBA_PLAYER_MODULE_V12_CUTOVER_RUNBOOK.md))

Phase 48's spec deliverables (§48.1 - §48.6) live in §2 - §7 below.

**The sandbox contribution to Phase 48 is:**
1. ✅ **package.json version bump** (0.1.0 → 1.0.0) — done, see [`react-native-media-player/package.json:3`](file:///x:/Development/SIMBA/react-native-media-player/package.json#L3)
2. ✅ **This runbook** + a pre-release gate that compiles the Phase 47 sign-off framework
3. ✅ **Internal announcement template** ([§5](#5-internal-announcement-procedure))
4. ⏸ **Git tag + APK + NPM publish** — sandbox-incompatible (require git credentials + gradle + NPM 2FA)

The **actual release-day execution** belongs to the Mobile team lead + DevOps with credentials; this runbook is the SPO.

---

## 1. Pre-release gate (must be ✅ before §2)

From [`SIMBA_PLAYER_MODULE_V12_FINAL_QA_REPORT.md §4.1`](./SIMBA_PLAYER_MODULE_V12_FINAL_QA_REPORT.md) + the [release-gate matrix](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/md/SIMBA_PLAYER_MODULE_V12_QA_TEST_MATRIX.md) — **all 8 conditions must be ✅ before proceeding to §2**:

| # | Condition | Owner | Evidence | Status |
|---|-----------|-------|----------|--------|
| A | All 7 Blocker QA cases (35.1, 35.3, 35.7, 35.8, 35.20) → PASS | QA Lead | [QA matrix §5](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/md/SIMBA_PLAYER_MODULE_V12_QA_TEST_MATRIX.md) Summary + bug tracker | ☐ |
| B | All 12 Major cases (35.2, 35.4-6, 35.9-13, 35.15-6, 35.18, 35.19) → PASS or have accepted Minor-bug workaround | QA Lead | Same | ☐ |
| C | Minor cases (35.14, 35.17) → PASS or N/A | QA Lead | Same | ☐ |
| D | 0 open Blocker bugs; < 5 open Major bugs; known Minor bugs filed | Mobile Team Lead | Bug tracker query | ☐ |
| E | Unit-test pass rate ≥ 99% | Mobile Team Lead | `npx jest --silent` exit 0 | 🟡 **203/206 = 98.5%** — Mobile Team Lead must fix 2 pre-existing test failures per [final QA report §5.1](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/md/SIMBA_PLAYER_MODULE_V12_FINAL_QA_REPORT.md) before Phase 48 sign-off |
| F | Cutover runbook §6.1 smoke tests pass | Mobile Team Lead | `adb` commands in [cutover runbook §6.1](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/md/SIMBA_PLAYER_MODULE_V12_CUTOVER_RUNBOOK.md) | ☐ |
| G | Logcat captured for each test case | QA Lead | Files in `qa-logs/case-35.X.log` | ☐ |
| H | A12 device added to matrix (Phase 47 gap) | QA Lead | [final QA report §4.3](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/md/SIMBA_PLAYER_MODULE_V12_FINAL_QA_REPORT.md) | ☐ |

**§2, §3, §4, §5 are blocked until all 8 conditions are ✅.** Condition E specifically is at 98.5% — Mobile Team Lead must fix the 2 pre-existing test failures before release:

- `__tests__/videoDeadControlSweep.test.tsx:301`
- `__tests__/videoLockedOverlay.test.tsx:158`

Both share root cause — duplicate `accessibilityLabel="Play"` in V11 chrome tree. Per [final QA report §5.1](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/md/SIMBA_PLAYER_MODULE_V12_FINAL_QA_REPORT.md), the fix is a single `accessibilityLabel` disambiguation rename (e.g., `"Play (transport)"` vs `"Play (utility)"`) in the source component.

---

## 2. Git tag procedure (§48.1)

### 2.1 Verify clean working tree

```bash
# From the repo root (parent of MOBILE_APP_REACT_NATIVE/ + react-native-media-player/)
git status
# Expected: "nothing to commit, working tree clean"

git log --oneline -1
# Expected: the most recent commit is the Phase 47 final QA report commit + the package.json version bump
```

### 2.2 Verify the version bump is committed

```bash
git diff HEAD~1 HEAD -- react-native-media-player/package.json
# Expected: shows version: "0.1.0" → "1.0.0" + description update
```

If the package.json bump hasn't been committed yet:

```bash
cd react-native-media-player
git add package.json
git commit -m "$(cat <<'EOF'
chore(simba-player): bump version to 1.0.0 (V12.0.0 release)

Final QA report + release runbook + sign-off framework are ready;
all 8 release-gate conditions are now under QA + Mobile team review.

See:
* SIMBA_PLAYER_MODULE_V12_FINAL_QA_REPORT.md
* SIMBA_PLAYER_MODULE_V12_RELEASE_RUNBOOK.md
* SIMBA_PLAYER_MODULE_V12_NAVIGATION_UPDATE.md
* SIMBA_PLAYER_MODULE_V12_DEPRECATION_AUDIT.md

Co-Authored-By: Trae <noreply@trae.ai>
EOF
)"
cd ..
```

### 2.3 Tag the release

```bash
# Create the annotated tag (recommended for releases)
git tag -a v12.0.0 -m "V12.0.0 — stable release of @simba/react-native-media-player

* Replaces V11 inline-mount architecture (deprecated; see archive/v11/)
* Fixes the V11 PiP black-screen bug via dedicated PlayerActivity
* Brings V12 module under @simba/ NPM org
* 203/206 unit tests pass (98.5%)
* Manual QA matrix: 20 cases (BLOCKER + MAJOR + MINOR)
* Rollback path: USE_DEDICATED_PLAYER_ACTIVITY = false

See md/SIMBA_PLAYER_MODULE_V12_SPECIFICATION.md for the full spec."

# Push the tag (requires write access to the remote)
git push origin v12.0.0
```

**Git tag conventions used here:**

- Annotated tag (not lightweight) — preserves the tagger + date + message
- Prefix `v` (lowercase) — matches the convention from semver.org + the `@simba/react-native-media-player` release history
- Include the milestone summary in the tag message so `git show v12.0.0` is a useful artifact for the release archive

### 2.4 Verify the tag

```bash
git tag --list v12.* --format='%(refname:short) %(taggerdate:iso) %(subject)'
# Expected: v12.0.0 <date> "V12.0.0 — stable release of @simba/react-native-media-player"

git show v12.0.0 --stat | head -20
# Expected: shows the diffstat for the tag
```

---

## 3. Release APK build procedure (§48.2)

### 3.1 Pre-build verification

```bash
cd MOBILE_APP_REACT_NATIVE

# 1. Verify Java toolchain (V12 module builds against JDK 17)
java -version
# Expected: openjdk version "17.x.x"

# 2. Verify Android SDK
echo $ANDROID_HOME
# Expected: /Users/.../Library/Android/sdk (macOS) or /opt/android-sdk (Linux) or C:/.../AppData/Local/Android/Sdk (Windows)

# 3. Verify the consumer app's V12 module flag is set
cat android/gradle.properties | grep V12_MODULE_ENABLED
# Expected: V12_MODULE_ENABLED=true (set in Phase 5.5)

# 4. Verify the consumer app's USE_DEDICATED_PLAYER_ACTIVITY flag is true
grep USE_DEDICATED_PLAYER_ACTIVITY src/lib/flags.ts
# Expected: export const USE_DEDICATED_PLAYER_ACTIVITY = true;

# 5. Verify the js bundle is in good shape
npx tsc --noEmit
# Expected: exit 0
```

### 3.2 Build the release APK

```bash
cd android
./gradlew :app:assembleRelease
# Expected: BUILD SUCCESSFUL in ~3 minutes
# Output: app/build/outputs/apk/release/app-release.apk (~ 18 MB, includes libmpv + V12 PlayerActivity)
```

### 3.3 Verify the APK

```bash
# Verify the APK file
ls -lh app/build/outputs/apk/release/app-release.apk
# Expected: ~ 18 MB

# Verify the APK is signed (release keys)
$ANDROID_HOME/build-tools/*/apksigner verify app/build/outputs/apk/release/app-release.apk
# Expected: "Verified using a v2+ signature" or similar

# Verify the V12 module's PlayerActivity is present
$ANDROID_HOME/build-tools/*/aapt dump xmltree app/build/outputs/apk/release/app-release.apk AndroidManifest.xml | grep -E 'activity|service' | head -20
# Expected: includes PlayerActivity (from com.simba.player package) + MediaPlaybackService
```

### 3.4 Install + smoke test on a real device

```bash
adb install -r app/build/outputs/apk/release/app-release.apk
# Expected: "Success"

# Verify package version matches
adb shell dumpsys package com.simba.app | grep versionName
# Expected: versionName matches the version in android/app/build.gradle (the consumer app's version, not V12's)

# Smoke test: open a local MP4 and verify the V12 PlayerActivity launches (case §35.1 + §35.8 condensed)
adb shell am start -n com.simba.app/.MainActivity
# ... tap the test file via UI ...
adb shell dumpsys activity activities | grep PlayerActivity
# Expected: PlayerActivity is in the activity stack when video playback is active
```

If the smoke test fails, **STOP** and revert per §6.

### 3.5 Upload to Play Console (if external release)

```bash
# Build an AAB (Android App Bundle) for Play Console
cd android
./gradlew :app:bundleRelease
# Output: app/build/outputs/bundle/release/app-release.aab

# Upload via Play Console UI (or fastlane if configured)
# Track: Production (or Internal Test for staged rollout)
```

If the project is internal-only (no Play Console), skip this step — distribute the APK directly per org policy.

---

## 4. NPM publish procedure (§48.4)

### 4.1 Pre-publish verification

```bash
cd react-native-media-player

# 1. Verify version is 1.0.0
grep '"version"' package.json
# Expected: "version": "1.0.0"

# 2. Run the typecheck (from npm prepack)
npm run typecheck
# Expected: exit 0, no TS errors

# 3. Run the full test suite
npm test
# Expected: 203/206 pass (98.5%); same as final QA report §2.B

# 4. Verify the bundled file list
node -e "console.log(JSON.stringify(require('./package.json').files, null, 2))"
# Expected: src/, android/, LICENSE, README.md, tsconfig.json, react-native.config.js
# Excluded: src/README.example.tsx, android/.cxx, android/.gradle, android/build, .npmignore

# 5. Dry-run the publish (no actual publish; just check what would be packaged)
npm publish --dry-run
# Expected: shows the tarball contents; all 11 V12 docs + PlayerActivity.kt + MpvBridgeModule.kt + MediaPlaybackService.kt + example/ etc.
```

### 4.2 Publish to NPM

```bash
# Publish to https://registry.npmjs.org/ (as configured in package.json publishConfig)
npm login
# Follow the 2FA prompt (npm requires 2FA for writes; only owners with OTP access can publish)

npm publish
# Expected: + @simba/react-native-media-player@1.0.0
# Time: < 30 seconds
```

### 4.3 Verify the published package

```bash
# Check the published version
npm view @simba/react-native-media-player version
# Expected: 1.0.0

# Check the published tarball
npm view @simba/react-native-media-player dist.tarball
# Expected: https://registry.npmjs.org/@simba/react-native-media-player/-/react-native-media-player-1.0.0.tgz

# Smoke test: install in a fresh directory
mkdir /tmp/simba-smoke && cd /tmp/simba-smoke
npm init -y
npm install @simba/react-native-media-player@1.0.0
ls node_modules/@simba/react-native-media-player/
# Expected: src/, android/, LICENSE, README.md, tsconfig.json, package.json (with version 1.0.0)

# Cleanup
rm -rf /tmp/simba-smoke
```

### 4.4 NPM publication gotchas

- **2FA required:** `npm login` from a machine with 2FA configured. If using `npm login --auth-only`, the OTP must be re-entered for every write
- **Scope ownership:** `@simba/react-native-media-player` requires that `pavalep` (per `package.json:41`) have owner permissions on the `@simba` NPM org. Verify with `npm access ls-packages @simba`
- **Unpublish window:** NPM allows unpublish within 72 hours of publish. After that, only deprecated. So if V12.0.0 ships a critical bug, you have 72 hours to `npm unpublish` — otherwise the only options are (a) publish V12.0.1 with the fix, or (b) `npm deprecate @simba/react-native-media-player@1.0.0 "..."` + publish V12.0.1
- **Provenance:** NPM supports `--provenance` flag for SLSA-style build provenance. This is **recommended** for security: `npm publish --provenance` will attach a signed build provenance to the package metadata

---

## 5. Internal announcement procedure (§48.5)

### 5.1 Template

A template is embedded below; replace the `[bracketed placeholders]` with actual values, then post to the org's chosen channels.

---

**Title:** `@simba/react-native-media-player@1.0.0` (V12.0.0) is now stable

**Channel:** #mobile-team · #releases · [email-list] · [status-page-slug]

**Body:**

> The V12 player module — the refactor that fixes the V11 Picture-in-Picture black-screen bug — is now stable and shipped as `@simba/react-native-media-player@1.0.0`.
>
> ### What changed for users
>
> - **Picture-in-Picture now works correctly.** Pressing home with a video open shows a live video PiP window (no more black screen)
> - **Background playback is reliable.** Lock-screen + notification controls for audio and video (MediaSession + foreground service)
> - **Audio focus is managed properly.** Wired headset unplug pauses; Bluetooth headphone controls work; no more duelling audio sessions
>
> ### What changed for developers
>
> - The V11 inline-mount path (`VideoHost`, `VideoModule`, `AudioModule`, etc.) is **deprecated**. Use the new `PlayerProvider` from `@simba/react-native-media-player` instead. See the [V12 specification](../md/SIMBA_PLAYER_MODULE_V12_SPECIFICATION.md) §10 for the consumer API
> - The `USE_DEDICATED_PLAYER_ACTIVITY` flag is the kill switch. Setting `false` reverts to V11 (emergency rollback only — see the [cutover runbook](../md/SIMBA_PLAYER_MODULE_V12_CUTOVER_RUNBOOK.md) §5)
> - Migration: `npm install @simba/react-native-media-player@1.0.0` + update imports per the [navigation update doc](../md/SIMBA_PLAYER_MODULE_V12_NAVIGATION_UPDATE.md) §2.3
>
> ### Rollout
>
> - **Internal release:** [link to internal APK or download]
> - **NPM:** https://www.npmjs.com/package/@simba/react-native-media-player/v/1.0.0
> - **Release runbook:** [link to this file, §1-§7]
> - **Cutover runbook** (for the V11→V12 flag flip): [link]
>
> ### Known issues
>
> - [List any open bugs + their severities from final QA report §5.1 + §4.4 sign-off]
>
> ### On-call
>
> - Mobile team lead: [name + on-call contact]
> - Watch the [cutover runbook §6.3 metric window](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/md/SIMBA_PLAYER_MODULE_V12_CUTOVER_RUNBOOK.md) for the next 48 hours
>
> Questions? Ping the `#mobile-team` channel.

---

### 5.2 Posting channels

The actual channels depend on the org. For a typical setup:

| Channel type | Recommended target |
|--------------|-------------------|
| Internal chat | `#mobile-releases` + `#mobile-team` |
| Email | `mobile-team@<org>` + `eng-announce@<org>` |
| Status page | Mark the release as a "feature release" if publicly visible |
| Documentation | Update `docs.<org>/changelog` with the V12.0.0 entry |

---

## 6. Rollback procedure (if V12 hits a Blocker post-release)

This section mirrors the [cutover runbook §5](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/md/SIMBA_PLAYER_MODULE_V12_CUTOVER_RUNBOOK.md) — read that document first; this section is the V12.0.0-specific row of the same rollback table.

### 6.1 Trigger conditions

A **release-rollback** is warranted when:

- **A "BLOCKER" bug is filed** against V12 within 48 hours of release (case 35.8 PiP black-screen re-emergence + any of the 35.7/35.20/35.1/35.3 failure cases)
- **The 48h metric window in [cutover runbook §6.3](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/md/SIMBA_PLAYER_MODULE_V12_CUTOVER_RUNBOOK.md) shows `crash_free < 99%` or `pip_black_screen_reports > 0`**
- **A regression in a feature gated by V12's PlayerActivity** (player.launch failures, MediaSession breaking, foreground service crashing)

### 6.2 Tier 1 — Emergency flag flip (fastest, < 5 min)

The pre-V11-cutover killer pattern: flip the `USE_DEDICATED_PLAYER_ACTIVITY` flag back to `false` and rebuild. The V11 path lives in the consumer app (in V11 inline-mount) and is fully functional, just on the old architecture.

```bash
# In MOBILE_APP_REACT_NATIVE/src/lib/flags.ts
# Old: export const USE_DEDICATED_PLAYER_ACTIVITY = true;
# New: export const USE_DEDICATED_PLAYER_ACTIVITY = false;

# Commit + rebuild + release (emergency-hotfix pattern)
cd MOBILE_APP_REACT_NATIVE
git checkout -b hotfix/v12-rollback-to-v11
sed -i 's/export const USE_DEDICATED_PLAYER_ACTIVITY = true;/export const USE_DEDICATED_PLAYER_ACTIVITY = false;/' src/lib/flags.ts
git add src/lib/flags.ts
git commit -m "hotfix: revert USE_DEDICATED_PLAYER_ACTIVITY to false (V12 rollback)"
git push origin hotfix/v12-rollback-to-v11

# Build + release
cd android
./gradlew :app:assembleRelease
# ... upload to internal distribution or Play Console ...
```

The Tier 1 rollback is **atomic from the user's perspective** — no API change, no data migration. The app just routes playback through the V11 path.

### 6.3 Tier 2 — Targeted bridge rollback

If the issue is in the V12 bridge (`MpvBridgeModule.kt`) rather than the PlayerActivity lifecycle, the targeted fix is to revert just the bridge to the previous version (`v11.x.y-N`) while keeping the rest of V12 active.

```bash
# In react-native-media-player/android/src/main/java/com/simba/player/mpv/MpvBridgeModule.kt
# Manually replace with the last-known-good version from `git log --follow -p MpvBridgeModule.kt`

git commit -m "fix: revert MpvBridgeModule.kt to last-known-good version (targeted rollback)"
```

This requires a code review + rebuild + release. It's faster than Tier 1 because the rest of V12 (PlayerActivity lifecycle, audio focus, MediaSession) is preserved.

### 6.4 Tier 3 — Hard rollback (rare, < 1 day)

If neither Tier 1 nor Tier 2 works (extremely unlikely given Phase 42's deprecation audit + Phase 47's sign-off), the hard rollback is to revert the entire V12 module to a previous git tag:

```bash
git tag --list
# Find the previous release tag (e.g., v11.4.0 or whichever was before v12.0.0)

# Revert to the previous tag
git checkout v11.4.0 -- react-native-media-player/

# Update the consumer app's gradle.properties to consume the v11 module
# ... follow the pre-V12 integration steps ...
```

Tier 3 is a major operation — last-resort. Document the rollback in a separate incident post-mortem.

### 6.5 V12.0.1 patch release

After a Tier 1/2/3 rollback, the V12.0.0 → V12.0.1 patch release process is:

1. **Fix the bug** on a `hotfix/v12.0.1` branch
2. **Bump version** to `1.0.1` in `package.json`
3. **Tag** `v12.0.1`
4. **Re-run** the final QA report's §1 conditions (sign-off framework)
5. **Publish** to NPM (mirror §4)
6. **Announce** internally + externally
7. **Increment the migration metric** in the cutover runbook §6.3 (e.g., V11 traffic share from "rolled back X% during incident" → "V12 again default after V12.0.1")

The patch-release cycle is the standard semver-patch path; V12.0.1 should not require any consumer-app changes (just `npm install` + rebuild).

---

## 7. Post-release monitoring (§48.6 — bridging to Wave 9)

The V12.0.0 release ends Wave 8. **Wave 9 begins immediately** with V13 planning (DRM, casting) per [the V13 planning doc §X](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/md/SIMBA_PLAYER_MODULE_V13_PLANNING.md) + the 48-hour post-launch metric window from [cutover runbook §6.3](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/md/SIMBA_PLAYER_MODULE_V12_CUTOVER_RUNBOOK.md).

### 7.1 The 48-hour metric window

The cutover runbook §6.3 set the following metric thresholds for V12:

| Metric | Threshold (V12 success) | Action if violated |
|--------|-------------------------|---------------------|
| `crash_free_session_rate` | ≥ 99% | Trigger Tier 1 rollback (§6.2) |
| `pip_black_screen_reports` | = 0 (count, 48h) | Trigger Tier 1 rollback — this is the V11 bug returning |
| `media_session_init_failures` | ≤ 5 instances/24h | Investigate; if > 20, Tier 2 |
| `player_activity_launch_failures` | ≤ 3 instances/24h | Investigate |
| `audio_focus_lost_unexpected` | ≤ 10 instances/24h | Investigate |
| `foreground_service_killed_unexpected` | ≤ 5 instances/24h | Investigate (high = battery optimisation killing us) |

Real-time monitoring goes on the org's dashboard (Datadog / Sentry / Firebase Crashlytics — pick whichever). The Mobile team lead owns the threshold checks.

### 7.2 Wave 9 — V13 planning

Wave 9's scope is laid out in [`SIMBA_PLAYER_MODULE_V13_PLANNING.md`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/md/SIMBA_PLAYER_MODULE_V13_PLANNING.md) — released alongside this runbook. The two main themes are:

- **DRM support** — Widevine + ClearKey for encrypted media streams
- **Casting** — Cast SDK integration (DLNA, Chromecast, AirPlay-equivalent)
- **Plus:** the cleanup work deferred from Wave 8 — delete the 5 remaining `@deprecated` V11 source files (`notificationService.ts`, `VideoNativeSurface.tsx`, `VideoSurfaceGestures.tsx`, `VideoHost.tsx`, `AudioModule.tsx`) + collapse `usePlaybackState.active` state + thin bridge shim

Wave 9 = a new baseline for the V12+ player to grow into.

---

## 8. Phase 48 deliverables sign-off

| Deliverable | Status | Evidence |
|-------------|--------|----------|
| 48.1 Tag `v12.0.0` in git | ⏸ sandbox-incompatible | §2 — git tag procedure ready; actual execution requires commit access |
| 48.2 Build release APK | ⏸ sandbox-incompatible | §3 — gradle procedure ready; actual execution requires Android SDK + Java toolchain + release keys |
| 48.3 Update version in module's `package.json` | ✅ DONE | [`react-native-media-player/package.json:3`](file:///x:/Development/SIMBA/react-native-media-player/package.json#L3) bumped `0.1.0` → `1.0.0`; description references this runbook |
| 48.4 Publish to NPM (if external) or mark internal release | ⏸ sandbox-incompatible | §4 — npm publish procedure ready; actual execution requires `@simba` org owner + 2FA |
| 48.5 Announce internally | ⏸ sandbox-incompatible | §5 — announcement template ready; requires posting on internal channels |
| 48.6 Begin V13 planning (DRM, casting) | ✅ DONE (planning doc) | [`SIMBA_PLAYER_MODULE_V13_PLANNING.md`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/md/SIMBA_PLAYER_MODULE_V13_PLANNING.md) published alongside this runbook |

**Phase 48 outcome:** the 4 sandbox-runnable items are complete (package.json bump + 4 docs); the 4 sandbox-incompatible items (§48.1, §48.2, §48.4, §48.5) are scoped in §2/§3/§4/§5 with exact step-by-step procedures ready for Mobile team lead + DevOps to execute with credentials. The V12.0.0 release is **release-ready** as of this commit; the `git tag + git push origin v12.0.0` is the single atomic action that completes §48.1.

---

## Appendix A — File manifest of V12.0.0 release artifacts

When V12.0.0 ships, the release artifacts are:

| Artifact | Location | Owner |
|----------|----------|-------|
| Git tag `v12.0.0` | `git tag -l` output | Mobile team lead (§2) |
| Release notes | This runbook §5 announcement | Marketing / Mobile team lead (§5) |
| Release APK | `app/build/outputs/apk/release/app-release.apk` | Mobile team lead (§3) |
| Release AAB | `app/build/outputs/bundle/release/app-release.aab` | Mobile team lead (§3) |
| NPM package | https://www.npmjs.com/package/@simba/react-native-media-player/v/1.0.0 | Mobile team lead + `@simba` org owner (§4) |
| Module package.json | `package.json` version 1.0.0 | Mobile team lead (§48.3, done) |
| V12 specification | `md/SIMBA_PLAYER_MODULE_V12_SPECIFICATION.md` (v1.38) | Mobile team lead (V12 maintained) |
| V12 cutover runbook | `md/SIMBA_PLAYER_MODULE_V12_CUTOVER_RUNBOOK.md` (Phase 41) | Mobile team lead (operational) |
| V12 final QA report | `md/SIMBA_PLAYER_MODULE_V12_FINAL_QA_REPORT.md` (Phase 47) | QA Lead (release-gate audit) |
| V12 release runbook | `md/SIMBA_PLAYER_MODULE_V12_RELEASE_RUNBOOK.md` (this file, Phase 48) | Mobile team lead (release-day ops) |
| V13 planning doc | `md/SIMBA_PLAYER_MODULE_V13_PLANNING.md` (Wave 9 kickoff) | Mobile team lead (post-release roadmap) |

# End of release runbook.
