# SIMBA V21 — Device Proof Capture (Gate 3 + Gate 4)

> **Date:** 2026-09-12 · **Status:** empty skeleton, ready for the user to fill.
> **Purpose:** Physical-device evidence for the 23 flows listed in
> `SIMBA_V21_COVERAGE.md` §1. Each captured proof flips one row of
> Gate 3 or Gate 4 from `☐ pending` to `�� captured`.

**How to use:** for each row below, capture one of:
- A logcat snippet (`adb logcat -d -s ReactNativeJS:* SimbaPlayer:* | grep …`)
- A screenshot (drag into the `md/screenshots/` folder if it exists, or inline)
- A 1-line text note describing what you saw

Then mark the `Status` checkbox and add the file path / timestamp.

**Equipment:** Pixel 7 / Android 14 device + `adb` access.
**Run order:** the rows below are ordered by Gate (3 first, then 4),
so flipping them in order keeps Gate 3 + Gate 4 results grouped.

---

## Gate 3 — beta-critical functional flows

### Flow 1 — App cold-start, no URL

- **Row ID:** Coverage-1
- **Setup:** Pixel 7 with no recent app state. Force-stop SIMBA
  (`adb shell am force-stop com.simba`). Clear from recents.
- **Action:** Launch SIMBA from the launcher icon.
- **Expected:** App opens to the Home / Library screen. No
  crash. No "shared file" prompt (no URL was passed).
- **Status:** ☐ pending
- **Captured:** ____
- **Evidence:** ____
- **Notes:** ____

### Flow 2 — App cold-start with `simbaplayer://` URL

- **Row ID:** Coverage-2
- **Setup:** Force-stop SIMBA.
- **Action:** `adb shell am start -W -a android.intent.action.VIEW -d "simbaplayer://open?uri=file%3A%2F%2F%2Fsdcard%2FMusic%2Ftest.mp3" com.simba`
- **Expected:** PlayerActivity opens directly to the file at
  position 0.
- **Status:** ☐ pending
- **Captured:** ____
- **Evidence:** ____
- **Notes:** ____

### Flow 3 — App cold-start with `content://` shared file

- **Row ID:** Coverage-3
- **Setup:** Force-stop SIMBA. Have a file in another app's
  Files app / gallery that can be shared.
- **Action:** Share the file → choose SIMBA from the share
  sheet.
- **Expected:** SIMBA opens directly to PlayerActivity playing
  the shared file.
- **Status:** ☐ pending
- **Captured:** ____
- **Evidence:** ____
- **Notes:** ____

### Flow 4 — Local file playback

- **Row ID:** Coverage-4
- **Setup:** SIMBA is on Home / Library. Folder linked with
  ≥1 audio file (Flow 22 must be ✅ first).
- **Action:** Tap a track.
- **Expected:** PlayerActivity opens, audio plays within 2
  seconds, notification appears.
- **Status:** ☐ pending
- **Captured:** ____
- **Evidence:** ____
- **Notes:** ____

### Flow 5 — Pause / Play / Seek

- **Row ID:** Coverage-5
- **Setup:** A track is currently playing (from Flow 4).
- **Action:** Tap pause → wait 1s → tap play → tap +10s →
  tap -10s.
- **Expected:** Each control responds within 500ms. Position
  bar reflects the seek.
- **Status:** ☐ pending
- **Captured:** ____
- **Evidence:** ____
- **Notes:** ____

### Flow 6 — Resume from saved position (close + relaunch)

- **Row ID:** Coverage-6
- **Setup:** A track is currently playing at, e.g., 1:23.
- **Action:** Force-stop SIMBA → relaunch from launcher.
- **Expected:** SIMBA opens at the same track, position ~1:23
  (within 2s).
- **Status:** ☐ pending
- **Captured:** ____
- **Evidence:** ____
- **Notes:** ____

### Flow 8 — PiP entry

- **Row ID:** Coverage-8
- **Setup:** A video track is currently playing full-screen.
- **Action:** Press the Home button.
- **Expected:** PiP window appears in a corner. Audio continues.
- **Status:** ☐ pending
- **Captured:** ____
- **Evidence:** ____
- **Notes:** ____

### Flow 9 — PiP exit (tap full-screen)

- **Row ID:** Coverage-9
- **Setup:** SIMBA is in PiP mode (from Flow 8).
- **Action:** Tap the PiP window.
- **Expected:** PlayerActivity returns to full-screen at the
  same position.
- **Status:** ☐ pending
- **Captured:** ____
- **Evidence:** ____
- **Notes:** ____

### Flow 10 — PiP resize

- **Row ID:** Coverage-10
- **Setup:** SIMBA is in PiP mode (from Flow 8).
- **Action:** Drag the PiP corner to resize.
- **Expected:** Video resizes without black-screen flash or
  position reset. Playback continues.
- **Status:** ☐ pending
- **Captured:** ____
- **Evidence:** ____
- **Notes:** ____

### Flow 11 — Background audio (lock screen)

- **Row ID:** Coverage-11
- **Setup:** An audio track is currently playing full-screen.
- **Action:** Lock the screen with the side button.
- **Expected:** Audio continues. Screen is off. Lock screen
  shows media controls (if any).
- **Status:** ☐ pending
- **Captured:** ____
- **Evidence:** ____
- **Notes:** ____

### Flow 12 — Notification actions

- **Row ID:** Coverage-12
- **Setup:** An audio track is playing in the background (from
  Flow 11).
- **Action:** Pull down notification shade. Tap Pause. Tap
  Play. Tap Close.
- **Expected:** Each action reflects in playback within 500ms.
  Close ends the foreground service.
- **Status:** ☐ pending
- **Captured:** ____
- **Evidence:** ____
- **Notes:** ____

### Flow 16 — Download resume via Range header

- **Row ID:** Coverage-16
- **Setup:** In the Downloads screen, start downloading a
  large file (>50 MB).
- **Action:** Pause the download at ~50%. Wait 10s. Resume.
- **Expected:** `adb logcat -d -s ReactNativeJS:* | grep Range`
  shows `Range: bytes=N-` for the resumed request (N = bytes
  already downloaded, not 0).
- **Status:** ☐ pending
- **Captured:** ____
- **Evidence:** ____
- **Notes:** ____

### Flow 23 — Permission-revoked recovery

- **Row ID:** Coverage-23
- **Setup:** Have ≥1 linked folder (Flow 22). Library screen
  shows it.
- **Action:** Android Settings → Apps → SIMBA → Permissions →
  Files and media → Deny. Relaunch SIMBA, open Library.
- **Expected:** Banner appears naming the folder. Folder is
  auto-unlinked.
- **Status:** ☐ pending
- **Captured:** ____
- **Evidence:** ____
- **Notes:** ____

### Flow 24 — StreamError variants (4 of them)

- **Row ID:** Coverage-24
- **Setup:** SIMBA on Search or NowPlaying screen.
- **Action:** Trigger each:
  - (A) Network down: toggle airplane mode, attempt playback.
  - (B) 404: `adb shell am start -W -a android.intent.action.VIEW -d "simbaplayer://open?uri=https%3A%2F%2Fexample.com%2Fnonexistent.mp4" com.simba`
  - (C) Unsupported codec: try a `.txt` file as media.
  - (D) Auth-required: open a DRM-protected content URI.
- **Expected:** Each shows a distinct message in the toast /
  error UI:
  - A: "Network unavailable" or similar
  - B: "Source not found (404)" or similar
  - C: "Codec not supported" or similar
  - D: "Sign-in required" or similar
- **Status:** ☐ pending
- **Captured:** ____
- **Evidence:** ____
- **Notes:** ____

### Flow 27 — Signed release APK install + launch

- **Row ID:** Coverage-27
- **Setup:** Build the signed release APK (CI artifact or
  locally via `./gradlew :app:assembleRelease`).
- **Action:** `adb install -r app-release.apk` → launch from
  launcher.
- **Expected:** App launches. `adb shell pm list packages -f |
  grep com.simba` shows the package is signed (path is the
  install path, not the system one). `apksigner verify
  --verbose app-release.apk` (on host) shows "Verifies" with
  v1+v2+v3 schemes.
- **Status:** ☐ pending
- **Captured:** ____
- **Evidence:** ____
- **Notes:** ____

### Flow 28 — Minified release APK runs

- **Row ID:** Coverage-28
- **Setup:** Use the same APK from Flow 27.
- **Action:** Exercise Flows 4–12 (open file → play → PiP →
  notification) in sequence on the minified build.
- **Expected:** No `ClassNotFoundException`, no missing native
  method, no UI regression. Notification actions work.
- **Status:** ☐ pending
- **Captured:** ____
- **Evidence:** ____
- **Notes:** ____

---

## Gate 4 — persistence flows

### Flow 13 — Bookmarks persist

- **Row ID:** Coverage-13
- **Setup:** On Bookmarks screen.
- **Action:** Add 2 bookmarks → `adb shell am force-stop
  com.simba` → relaunch → open Bookmarks.
- **Expected:** Both bookmarks still present.
- **Status:** ☐ pending
- **Captured:** ____
- **Evidence:** ____
- **Notes:** ____

### Flow 14 — Playlists persist

- **Row ID:** Coverage-14
- **Setup:** On Playlists screen.
- **Action:** Create playlist "Test" + add 1 track → force-stop
  → relaunch → open Playlists → tap "Test".
- **Expected:** Playlist exists with the same track.
- **Status:** ☐ pending
- **Captured:** ____
- **Evidence:** ____
- **Notes:** ____

### Flow 15 — Downloads persist

- **Row ID:** Coverage-15
- **Setup:** On Downloads screen with ≥1 active download.
- **Action:** Force-stop → relaunch → open Downloads.
- **Expected:** Active download resumes or completes (depends
  on Range header behaviour — see Flow 16).
- **Status:** ☐ pending
- **Captured:** ____
- **Evidence:** ____
- **Notes:** ____

### Flow 18 — Queue persist

- **Row ID:** Coverage-18
- **Setup:** On NowPlaying / Queue screen.
- **Action:** Add 3 tracks to the queue → force-stop →
  relaunch → open Queue.
- **Expected:** 3 tracks still in queue, in order.
- **Status:** ☐ pending
- **Captured:** ____
- **Evidence:** ____
- **Notes:** ____

### Flow 19 — Playback history persist

- **Row ID:** Coverage-19
- **Setup:** On History screen.
- **Action:** Play 2 distinct tracks → force-stop → relaunch →
  open History.
- **Expected:** 2 most-recent tracks visible (in reverse-chrono
  order, latest first).
- **Status:** ☐ pending
- **Captured:** ____
- **Evidence:** ____
- **Notes:** ____

### Flow 20 — Recent searches persist

- **Row ID:** Coverage-20
- **Setup:** On Search screen.
- **Action:** Search "test1" + "test2" → force-stop → relaunch
  → open Search.
- **Expected:** "test1" and "test2" appear in recent searches.
- **Status:** ☐ pending
- **Captured:** ____
- **Evidence:** ____
- **Notes:** ____

### Flow 21 — Theme persist

- **Row ID:** Coverage-21
- **Setup:** On Settings → Theme.
- **Action:** Switch theme (e.g., Dark → Light) → force-stop →
  relaunch.
- **Expected:** Theme is still Light.
- **Status:** ☐ pending
- **Captured:** ____
- **Evidence:** ____
- **Notes:** ____

### Flow 22 — Linked folders persist

- **Row ID:** Coverage-22
- **Setup:** On Settings → Folders.
- **Action:** Link a new folder → force-stop → relaunch → open
  Settings → Folders.
- **Expected:** Folder is still linked.
- **Status:** ☐ pending
- **Captured:** ____
- **Evidence:** ____
- **Notes:** ____

---

## Summary

- **Total flows:** 23 (15 functional + 8 persistence)
- **Captured:** 0 / 23
- **Gate 3 PASS threshold:** all 15 functional rows captured.
- **Gate 4 PASS threshold:** all 8 persistence rows captured.

Once all 23 are captured, update `SIMBA_V21_COVERAGE.md` §1
column `Device proof` from `☐ pending` → `�� captured` and add
the proof reference (path or timestamp). Then Gate 3 + Gate 4 +
Gate 5 all flip from FAIL/PARTIAL to PASS.

---

## Sign-off

- Reviewer: TBD (the user)
- Capture date: ____
- Re-score trigger: update the GO/NO-GO review (`SIMBA_V21_GO_NO_GO_REVIEW.md`) Gate 3 + Gate 4 + Gate 5