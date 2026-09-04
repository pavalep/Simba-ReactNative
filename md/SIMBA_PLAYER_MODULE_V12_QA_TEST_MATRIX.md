# SIMBA Player Module V12 — Manual QA Test Matrix

**Document Version:** 1.0
**Created:** 2026-09-03
**Owner:** QA Team (execution) + Mobile Team (scaffold)
**Status:** 🟡 Scaffolded — test cases defined; execution pending QA team
**Companion to:** [SIMBA_PLAYER_MODULE_V12_SPECIFICATION.md](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/md/SIMBA_PLAYER_MODULE_V12_SPECIFICATION.md) §35 + [SIMBA_PLAYER_MODULE_V12_TRACKER.md](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/md/SIMBA_PLAYER_MODULE_V12_TRACKER.md)
**Module Under Test:** `@simba/react-native-media-player@0.1.0` (V12 refactor of the V11 inline player)
**Spec Phase:** 35 — Manual QA test matrix (5 days effort)

---

## 1. Purpose

Verify the V12 `@simba/react-native-media-player` module meets every documented playback contract across the most common real-world usage patterns. The 20 cases in §4 cover the four primary risk surfaces:

1. **Codec compatibility** (cases 35.1–35.6) — V12 ships libmpv with full ffmpeg codec support, but the Kotlin ↔ mpv bridge is brand-new code
2. **Lifecycle / OS integration** (cases 35.7, 35.10–35.13) — V12's whole purpose is to fix the V11 PiP black-screen bug and properly wire MediaSession / foreground service
3. **Picture-in-Picture** (cases 35.8–35.9, 35.19) — the marquee V12 deliverable
4. **Robustness** (cases 35.14–35.18, 35.20) — long-session stability, rotation, network drops, memory pressure

A "PASS" on all 20 cases is required before V12.0.0 release (Phase 48).

---

## 2. Test Environment

### 2.1 Device matrix

Run each test case on the **primary device** at minimum. Re-run failed cases on the **secondary device** to rule out device-specific bugs.

| Role | Device | Android version | ABI | minSdk |
|---|---|---|---|---|
| **Primary** | Pixel 7 (or current Google flagship) | Android 14 (API 34) | arm64-v8a | 24 |
| **Secondary** | Samsung Galaxy A54 (mid-range) | Android 13 (API 33) | arm64-v8a | 24 |
| **Tertiary** (optional, for PiP regressions) | OnePlus 9 (Oxygen OS quirks) | Android 13 (API 33) | arm64-v8a | 24 |
| **Tablet** (for PiP aspect ratio) | Pixel Tablet | Android 14 (API 34) | arm64-v8a | 24 |

### 2.2 Test media files

Place the following fixtures on each test device's `/sdcard/Movies/simba-qa/` (or `Documents/simba-qa/` for audio):

| File | Codec / container | Size | Purpose |
|---|---|---|---|
| `mp4-small.mp4` | H.264 480p + AAC | ~5 MB | 35.1 small MP4 |
| `mp4-medium.mp4` | H.264 720p + AAC | ~50 MB | 35.1 medium MP4 |
| `mp4-large.mp4` | H.264 1080p + AAC | ~500 MB | 35.1 large MP4 |
| `mkv-test.mkv` | H.264 720p + AC3 in MKV | ~80 MB | 35.2 MKV container |
| `mp3-test.mp3` | MP3 192kbps | ~3 MB | 35.3 MP3 |
| `flac-test.flac` | FLAC 16-bit/44.1kHz | ~30 MB | 35.4 FLAC |
| `hls-stream.m3u8` | HLS H.264 manifest (public test stream) | n/a | 35.5 HLS streaming |
| `http-progressive.mp4` | HTTP progressive download MP4 | ~20 MB | 35.6 HTTP progressive |
| `audio-for-pip.mp3` | MP3 with embedded artwork | ~5 MB | 35.9 audio PiP |

**Recommended public test streams for HLS (35.5):**
- `https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8` (Apple's reference HLS stream)
- `https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8` (Unified Streaming demo)

### 2.3 Build configuration

Build the consumer app (`MOBILE_APP_REACT_NATIVE/android/`) in **debug** mode with the V12 module:

```bash
# from MOBILE_APP_REACT_NATIVE/
npm install            # pulls module via gradle :react-native-media-player path dep
cd android
./gradlew :app:assembleDebug
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

The module is enabled via the `V12_MODULE_ENABLED=true` build flag (set in `gradle.properties` per Phase 5.5). Confirm the flag is set before testing:

```bash
adb shell run-as com.simba.app cat /data/data/com.simba.app/files/simba-build-flags.txt
# Expected: V12_MODULE_ENABLED=true
```

### 2.4 Logging

Set logcat tag filter for the player module:

```bash
adb logcat -c
adb logcat PlayerActivity:V MpvBridgeModule:V MpvPlayerView:V MediaPlaybackService:V PipManager:V *:S
```

For verbose mpv logs (Phase 39 hook), set `config={{ debug: { verboseLogging: true } }}` in the test app's `<PlayerProvider>`.

---

## 3. Test Execution Workflow

### 3.1 Per-case protocol

For each test case in §4:

1. **Preconditions** — verify the listed preconditions hold (device state, app state, media file present)
2. **Steps** — execute the steps in order. Do not skip steps.
3. **Expected result** — verify each bullet in the expected result
4. **Record actual result** — fill in the "Actual result" column. Be specific (logs, screenshots, timing)
5. **Record status** — one of:
   - ✅ **PASS** — all expected-result bullets met
   - ❌ **FAIL** — at least one bullet unmet. Attach a bug ID (create one in the tracker if needed)
   - ⚠️ **BLOCKED** — cannot execute (e.g., device unavailable, media file corrupted). Document the blocker
   - ➖ **N/A** — not applicable for this device (e.g., 35.8 PiP video not testable on a phone with PiP disabled by carrier)
6. **Attach evidence** — link to a logcat capture (`adb logcat -d > case-35.X.log`), screenshot, or screen recording
7. **Notes** — any context that helps the developer triage a failure

### 3.2 Bug filing

For every FAIL, open a bug in the V12 tracker with:

- **Title:** `[QA 35.X] <one-line summary>`
- **Steps to reproduce:** paste the §4 steps verbatim
- **Expected:** paste the §4 "Expected result" verbatim
- **Actual:** paste your "Actual result" + logcat excerpt
- **Device:** Pixel 7 / Android 14 / arm64-v8a / API 34 (etc.)
- **Severity:** Blocker / Major / Minor / Cosmetic

Bugs from this matrix feed Phase 36 (memory leak audit) + Phase 38 (error handling & recovery) + Phase 48 (release blocker review).

### 3.3 Re-test protocol

After a FAIL is fixed:

1. Developer commits the fix with a bug reference in the commit message (`[QA 35.X] Fix ...`)
2. QA re-runs **only** the failing case (not the full matrix) on the same device + Android version
3. If the case PASSes on re-test, mark the bug as Resolved in the tracker
4. If the case still FAILs, escalate to Mobile team lead

Regressions discovered during re-test are filed as new bugs (`[QA 35.X-REGRESSION] ...`) and re-tested independently.

---

## 4. Test Cases

### 35.1 — Local MP4 playback (small, medium, large files)

| Field | Value |
|---|---|
| **Priority** | Blocker |
| **Devices** | Primary + Secondary |
| **Media** | `mp4-small.mp4`, `mp4-medium.mp4`, `mp4-large.mp4` |

**Preconditions:**
- App installed and launched on primary device
- All 3 MP4 files present at `/sdcard/Movies/simba-qa/`
- V12 module flag enabled (see §2.3)

**Steps:**
1. Launch the consumer app's "Open local media" screen
2. Tap `mp4-small.mp4` to open with the player
3. Wait for first frame; observe playback starts within 2 seconds
4. Let play for 10 seconds; verify smooth playback (no stuttering)
5. Tap pause; verify playback pauses (frame visible, audio silent)
6. Tap play; verify playback resumes from the same position
7. Press back / home; return to the app; verify playback is still paused at the same position
8. Repeat steps 1–7 with `mp4-medium.mp4`
9. Repeat steps 1–7 with `mp4-large.mp4`

**Expected result:**
- All 3 files open without error
- First frame visible within 2 seconds for small + medium; within 4 seconds for large
- Play / pause / resume works correctly
- App backgrounding preserves position (does NOT auto-resume unless `audio.backgroundPlayback=true`)
- No native crash (logcat shows no `FATAL EXCEPTION`)

**Actual result:** _to be filled by QA_

**Status:** ☐ PASS ☐ FAIL ☐ BLOCKED ☐ N/A
**Tester:** ________________  **Date:** ________  **Device:** ________________  **Bug ID:** ________
**Evidence (logcat / screenshot):** ________________________________________________

---

### 35.2 — Local MKV playback

| Field | Value |
|---|---|
| **Priority** | Major |
| **Devices** | Primary |
| **Media** | `mkv-test.mkv` |

**Preconditions:**
- `mkv-test.mkv` present at `/sdcard/Movies/simba-qa/`

**Steps:**
1. Launch the app
2. Tap `mkv-test.mkv` to open with the player
3. Wait for first frame; observe playback starts within 3 seconds
4. Let play for 30 seconds; verify smooth playback
5. Tap pause + play; verify both work
6. Seek to 75% of duration via the scrubber; verify position jumps and playback continues from new position

**Expected result:**
- MKV opens without error (libmpv supports MKV natively)
- AC3 audio plays (verify by hearing sound + checking `dumpsys audio` shows non-zero stream)
- Scrubber seek works correctly

**Actual result:** _to be filled by QA_

**Status:** ☐ PASS ☐ FAIL ☐ BLOCKED ☐ N/A
**Tester:** ________________  **Date:** ________  **Device:** ________________  **Bug ID:** ________
**Evidence:** ________________________________________________

---

### 35.3 — Local MP3 playback

| Field | Value |
|---|---|
| **Priority** | Blocker |
| **Devices** | Primary + Secondary |
| **Media** | `mp3-test.mp3` |

**Preconditions:**
- `mp3-test.mp3` present at `/sdcard/Documents/simba-qa/` (audio file, not Movies)
- App configured to open audio files from `Documents/`

**Steps:**
1. Launch the app
2. Open `mp3-test.mp3`
3. Observe the player UI shows the audio-only layout (no video surface, full-screen artwork or album art placeholder)
4. Verify playback starts within 1 second
5. Tap play/pause; verify both work
6. Send the app to background (home button); observe the notification appears with play/pause controls
7. Tap pause from the notification; verify playback pauses
8. Tap play from the notification; verify playback resumes
9. Lock the screen; observe lock-screen controls appear
10. Tap pause from the lock-screen controls; verify playback pauses

**Expected result:**
- Audio file opens in audio-only mode (no video surface visible)
- Background playback works (notification + lock-screen controls)
- Notification controls + lock-screen controls both work
- No native crash

**Actual result:** _to be filled by QA_

**Status:** ☐ PASS ☐ FAIL ☐ BLOCKED ☐ N/A
**Tester:** ________________  **Date:** ________  **Device:** ________________  **Bug ID:** ________
**Evidence:** ________________________________________________

---

### 35.4 — Local FLAC playback

| Field | Value |
|---|---|
| **Priority** | Major |
| **Devices** | Primary |
| **Media** | `flac-test.flac` |

**Preconditions:**
- `flac-test.flac` present at `/sdcard/Documents/simba-qa/`

**Steps:**
1. Open `flac-test.flac`
2. Verify playback starts
3. Verify the duration is correct (30 MB / ~1500 kbps ≈ 3 minutes)
4. Pause + resume; verify both work

**Expected result:**
- FLAC plays without error
- Duration is accurate (compare to file metadata via `ffprobe`)
- Bit-perfect playback (verify with a spectrum analyser app if available)

**Actual result:** _to be filled by QA_

**Status:** ☐ PASS ☐ FAIL ☐ BLOCKED ☐ N/A
**Tester:** ________________  **Date:** ________  **Device:** ________________  **Bug ID:** ________
**Evidence:** ________________________________________________

---

### 35.5 — HLS streaming playback

| Field | Value |
|---|---|
| **Priority** | Major |
| **Devices** | Primary (with internet) |
| **Media** | `https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8` |

**Preconditions:**
- Device has internet access (WiFi or mobile data)
- The HLS test stream URL is reachable (`curl -I https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8` returns 200)

**Steps:**
1. Launch the app's "Open URL" screen
2. Enter the HLS URL
3. Open the stream
4. Observe first frame within 5 seconds
5. Let play for 60 seconds
6. Verify playback continues without buffering (the test stream is short — may end)
7. If the stream ends, verify the player shows the end-of-stream UI (or just stops cleanly)

**Expected result:**
- HLS stream opens
- Playback starts within 5 seconds
- No buffering spinner (test stream is well-provisioned)
- Stream ending is handled gracefully (no crash)

**Actual result:** _to be filled by QA_

**Status:** ☐ PASS ☐ FAIL ☐ BLOCKED ☐ N/A
**Tester:** ________________  **Date:** ________  **Device:** ________________  **Bug ID:** ________
**Evidence:** ________________________________________________

---

### 35.6 — HTTP progressive download playback

| Field | Value |
|---|---|
| **Priority** | Major |
| **Devices** | Primary (with internet) |
| **Media** | `http-progressive.mp4` (served from a local dev server or public test URL) |

**Preconditions:**
- HTTP server serves `http-progressive.mp4` (test setup: `python3 -m http.server 8000` in the media directory)
- Device is on the same network as the dev server

**Steps:**
1. Open `http://<dev-server-ip>:8000/http-progressive.mp4`
2. Observe first frame within 3 seconds (mpv starts playing as soon as the moov atom is downloaded)
3. Let play for 30 seconds
4. Verify playback continues without buffering for the full 30 seconds

**Expected result:**
- HTTP URL opens
- Playback starts as soon as moov is parsed
- Continuous playback (no buffering) for the full 30 seconds

**Actual result:** _to be filled by QA_

**Status:** ☐ PASS ☐ FAIL ☐ BLOCKED ☐ N/A
**Tester:** ________________  **Date:** ________  **Device:** ________________  **Bug ID:** ________
**Evidence:** ________________________________________________

---

### 35.7 — Audio playback in background (lock screen, recents)

| Field | Value |
|---|---|
| **Priority** | Blocker |
| **Devices** | Primary + Secondary |
| **Media** | `mp3-test.mp3` |

**Preconditions:**
- App installed; `audio.backgroundPlayback=true` (default in V12 spec — verify in the test app's `<PlayerProvider config={...}>`)

**Steps:**
1. Open `mp3-test.mp3`
2. Verify playback starts
3. Press the home button (app goes to background)
4. Verify playback continues (audio still audible)
5. Open the recents view (swipe up and hold); verify the app's preview shows the player UI
6. Lock the screen; verify lock-screen controls appear
7. Tap pause from the lock screen; verify audio pauses
8. Unlock + tap play from the notification; verify audio resumes
9. Repeat with `video-mp4-medium.mp4` (the V11 PiP-black-screen bug)
10. Press home with a video open; verify the app enters PiP (case 35.8 covers that scenario in detail)

**Expected result:**
- Audio continues in background
- Lock-screen controls appear and work
- Notification controls appear and work
- Video playback backgrounding shows the V12 PiP window (not the V11 black screen)

**Actual result:** _to be filled by QA_

**Status:** ☐ PASS ☐ FAIL ☐ BLOCKED ☐ N/A
**Tester:** ________________  **Date:** ________  **Device:** ________________  **Bug ID:** ________
**Evidence:** ________________________________________________

---

### 35.8 — Video playback in PiP (180s test, must show live video)

| Field | Value |
|---|---|
| **Priority** | **BLOCKER for V12 release** (this is the marquee V12 deliverable — fixing the V11 PiP black-screen bug) |
| **Devices** | Primary + Secondary + Tablet |
| **Media** | `mp4-medium.mp4` |

**Preconditions:**
- App installed with `pip.enabled=true` (default in V12)
- Device supports PiP (Settings → Apps → Special access → Picture-in-picture → SIMBA Player is enabled)

**Steps:**
1. Open `mp4-medium.mp4`
2. Verify playback starts
3. Press the home button (app goes to background)
4. **Verify a PiP window appears within 2 seconds** (this is the V11 fix)
5. **Verify the PiP window shows live video frames** (not a black screen — this is the V11 bug)
6. Let the PiP playback continue for 180 seconds (full 3 minutes)
7. Tap the PiP window; verify it expands back to the full player UI
8. Pause via the PiP window's controls; verify the player pauses
9. Play via the PiP window's controls; verify the player resumes
10. Drag the PiP window to a different position; verify it moves smoothly
11. Close the PiP window (✕ button or back gesture); verify the player closes (returns to whatever was behind it)

**Expected result:**
- PiP window appears within 2 seconds of pressing home
- **Live video is visible in the PiP window** (not black — this is the V12 fix verification)
- PiP window survives 180+ seconds without crash
- PiP → full-screen expansion works
- PiP controls (play/pause/expand/close) work
- PiP window dragging works
- PiP window closing ends the player

**Actual result:** _to be filled by QA_

**Status:** ☐ PASS ☐ FAIL ☐ BLOCKED ☐ N/A
**Tester:** ________________  **Date:** ________  **Device:** ________________  **Bug ID:** ________
**Evidence:** ________________________________________________

---

### 35.9 — Audio playback in PiP (artwork visible)

| Field | Value |
|---|---|
| **Priority** | Major |
| **Devices** | Primary |
| **Media** | `audio-for-pip.mp3` (MP3 with embedded artwork) |

**Preconditions:**
- Audio file has embedded artwork (verify with `ffprobe -show_streams audio-for-pip.mp3 | grep attached_pic`)

**Steps:**
1. Open `audio-for-pip.mp3`
2. Verify playback starts
3. Press the home button
4. Verify PiP window appears (audio PiP uses 1:1 aspect)
5. **Verify the embedded artwork is visible in the PiP window** (not a blank square)
6. Tap the PiP window to expand; verify the full player shows the artwork + audio controls
7. Pause / play via PiP controls; verify both work

**Expected result:**
- Audio PiP window appears with 1:1 aspect ratio
- Embedded artwork is visible in the PiP window
- Expand-to-fullscreen works
- PiP audio controls work

**Actual result:** _to be filled by QA_

**Status:** ☐ PASS ☐ FAIL ☐ BLOCKED ☐ N/A
**Tester:** ________________  **Date:** ________  **Device:** ________________  **Bug ID:** ________
**Evidence:** ________________________________________________

---

### 35.10 — Bluetooth headphone controls

| Field | Value |
|---|---|
| **Priority** | Major |
| **Devices** | Primary (paired with Bluetooth headphones) |
| **Media** | `mp3-test.mp3` or `mp4-medium.mp4` |

**Preconditions:**
- Bluetooth headphones paired and connected
- Audio playback active

**Steps:**
1. Open media and start playback
2. Press the Bluetooth headphone's play/pause button; verify playback pauses
3. Press play/pause again; verify playback resumes
4. Press the headphone's next-track button; verify the player skips forward (or — if at end of playlist — does nothing gracefully)
5. Press the headphone's previous-track button; verify the player skips backward (or — if at start — does nothing gracefully)

**Expected result:**
- All 3 headphone buttons (play/pause, next, previous) work correctly
- Headset-button events route through `MediaSessionCompat` (verify via `dumpsys media_session`)

**Actual result:** _to be filled by QA_

**Status:** ☐ PASS ☐ FAIL ☐ BLOCKED ☐ N/A
**Tester:** ________________  **Date:** ________  **Device:** ________________  **Bug ID:** ________
**Evidence:** ________________________________________________

---

### 35.11 — Wired headset controls

| Field | Value |
|---|---|
| **Priority** | Major |
| **Devices** | Primary (with wired headset plugged in) |
| **Media** | `mp3-test.mp3` |

**Preconditions:**
- Wired headset plugged in (3.5mm or USB-C analog)
- Audio playback active

**Steps:**
1. Plug in the wired headset (audio routes to it automatically)
2. Press the headset's play/pause button; verify playback pauses
3. Press play/pause again; verify playback resumes
4. Unplug the headset mid-playback; verify playback pauses (Android audio focus event)
5. Re-plug the headset; verify playback resumes (or remains paused — both are acceptable per Phase 14 spec)

**Expected result:**
- Wired headset buttons work
- Unplug pauses playback
- Re-plug behaviour matches spec (resumes or stays paused)

**Actual result:** _to be filled by QA_

**Status:** ☐ PASS ☐ FAIL ☐ BLOCKED ☐ N/A
**Tester:** ________________  **Date:** ________  **Device:** ________________  **Bug ID:** ________
**Evidence:** ________________________________________________

---

### 35.12 — Notification controls (play/pause/stop)

| Field | Value |
|---|---|
| **Priority** | Major |
| **Devices** | Primary + Secondary |
| **Media** | `mp3-test.mp3` |

**Preconditions:**
- Audio playback active in background
- Notification is visible in the notification shade

**Steps:**
1. Open `mp3-test.mp3`
2. Press home; verify notification appears with metadata + controls
3. Pull down the notification shade; verify the SIMBA notification shows: title, artist, album (or "Unknown" for the test file), play/pause button
4. Tap pause; verify audio pauses
5. Tap play; verify audio resumes
6. Tap the "Close" / "Stop" button (if present) or swipe the notification away; verify playback stops and the notification disappears

**Expected result:**
- Notification appears with correct metadata
- Play/pause button works
- Stop / dismiss stops playback

**Actual result:** _to be filled by QA_

**Status:** ☐ PASS ☐ FAIL ☐ BLOCKED ☐ N/A
**Tester:** ________________  **Date:** ________  **Device:** ________________  **Bug ID:** ________
**Evidence:** ________________________________________________

---

### 35.13 — Lock screen controls

| Field | Value |
|---|---|
| **Priority** | Major |
| **Devices** | Primary + Secondary |
| **Media** | `mp3-test.mp3` |

**Preconditions:**
- Audio playback active in background
- Device supports lock-screen media controls (Android 5.0+ — universal)

**Steps:**
1. Open `mp3-test.mp3`; press home
2. Lock the screen (power button)
3. Wake the screen (without unlocking); observe the lock-screen media controls
4. Verify the controls show: title, artist, album, play/pause, next, previous
5. Tap pause; verify audio pauses
6. Tap play; verify audio resumes
7. Tap next / previous; verify each works (skip to next file or do nothing if at end)

**Expected result:**
- Lock-screen controls appear with correct metadata
- All 3 transport buttons work
- Metadata updates when the track changes

**Actual result:** _to be filled by QA_

**Status:** ☐ PASS ☐ FAIL ☐ BLOCKED ☐ N/A
**Tester:** ________________  **Date:** ________  **Device:** ________________  **Bug ID:** ________
**Evidence:** ________________________________________________

---

### 35.14 — Rotate device while playing video

| Field | Value |
|---|---|
| **Priority** | Major |
| **Devices** | Primary (tablet is bonus) |
| **Media** | `mp4-medium.mp4` |

**Preconditions:**
- Auto-rotate enabled on the device
- Video playback active

**Steps:**
1. Open `mp4-medium.mp4` in portrait orientation
2. Rotate the device to landscape; observe the player UI
3. Verify the video resizes to fill the landscape viewport (no letterboxing for short content)
4. Rotate back to portrait; verify the video resizes correctly
5. Verify playback continues throughout (no pause / restart)
6. Repeat with the device in landscape at start; rotate to portrait

**Expected result:**
- Rotation works smoothly (within 1 second)
- Video aspect ratio is preserved (no stretching)
- Playback continues during rotation (no pause / restart)
- No native crash

**Actual result:** _to be filled by QA_

**Status:** ☐ PASS ☐ FAIL ☐ BLOCKED ☐ N/A
**Tester:** ________________  **Date:** ________  **Device:** ________________  **Bug ID:** ________
**Evidence:** ________________________________________________

---

### 35.15 — Switch audio output (speaker → Bluetooth → speaker)

| Field | Value |
|---|---|
| **Priority** | Major |
| **Devices** | Primary (paired with Bluetooth speaker/headphones) |
| **Media** | `mp3-test.mp3` |

**Preconditions:**
- Bluetooth speaker/headphones paired
- Audio playback active through the device speaker

**Steps:**
1. Open `mp3-test.mp3`; audio plays through device speaker
2. Open Bluetooth settings (or use the volume button) and route audio to the Bluetooth device
3. Verify audio switches to Bluetooth (no glitch, no pause)
4. Route audio back to the device speaker
5. Verify audio switches back (no glitch, no pause)
6. Disconnect the Bluetooth device
7. Verify audio continues through the device speaker (no crash)

**Expected result:**
- Audio routing changes are handled gracefully (no pause, no crash)
- Audio plays through the selected output

**Actual result:** _to be filled by QA_

**Status:** ☐ PASS ☐ FAIL ☐ BLOCKED ☐ N/A
**Tester:** ________________  **Date:** ________  **Device:** ________________  **Bug ID:** ________
**Evidence:** ________________________________________________

---

### 35.16 — Network interruption (airplane mode mid-stream)

| Field | Value |
|---|---|
| **Priority** | Major |
| **Devices** | Primary (with internet) |
| **Media** | HLS or HTTP progressive stream (from 35.5 / 35.6) |

**Preconditions:**
- Stream playing normally

**Steps:**
1. Start an HLS or HTTP progressive stream (per 35.5 / 35.6)
2. Wait 10 seconds (let the buffer fill)
3. Enable airplane mode (`adb shell settings put global airplane_mode_on 1` + `adb shell am broadcast -a android.intent.action.AIRPLANE_MODE`)
4. Wait 10 seconds
5. Observe the player UI: does it show a "Reconnecting" indicator? Does playback pause?
6. Disable airplane mode
7. Wait 10 seconds
8. Observe: does the stream resume automatically? Or does the user need to tap play?

**Expected result:**
- Network drop is detected within 5 seconds
- Player pauses (or shows buffering spinner) without crashing
- When network returns, player resumes automatically (Phase 14 audio focus spec says yes for audio; video is up to the consumer app — V12 default behaviour should be auto-resume for audio, manual-resume prompt for video)

**Actual result:** _to be filled by QA_

**Status:** ☐ PASS ☐ FAIL ☐ BLOCKED ☐ N/A
**Tester:** ________________  **Date:** ________  **Device:** ________________  **Bug ID:** ________
**Evidence:** ________________________________________________

---

### 35.17 — Low battery scenarios

| Field | Value |
|---|---|
| **Priority** | Minor |
| **Devices** | Primary |
| **Media** | `mp4-medium.mp4` |

**Preconditions:**
- Battery level < 20% (use a battery-saver scenario or `adb shell dumpsys battery set level 15`)
- Video playback active

**Steps:**
1. Open `mp4-medium.mp4`
2. Verify playback starts
3. Enable battery-saver mode (`adb shell cmd settings put global low_power 1`)
4. Verify playback continues (no crash, no stuttering)
5. Lock the screen + wake; verify playback continues if it was in PiP

**Expected result:**
- Battery-saver mode does not interrupt playback
- No crash from low-power system events

**Actual result:** _to be filled by QA_

**Status:** ☐ PASS ☐ FAIL ☐ BLOCKED ☐ N/A
**Tester:** ________________  **Date:** ________  **Device:** ________________  **Bug ID:** ________
**Evidence:** ________________________________________________

---

### 35.18 — Memory pressure (background apps)

| Field | Value |
|---|---|
| **Priority** | Major |
| **Devices** | Primary |
| **Media** | `mp4-medium.mp4` |

**Preconditions:**
- Open several memory-hungry apps (Chrome with many tabs, Google Photos, Maps) to push the device into memory pressure
- Verify with `adb shell dumpsys meminfo com.simba.app | grep TOTAL` that the player has limited RAM available

**Steps:**
1. Open the player with `mp4-medium.mp4`
2. Open several other apps (Chrome, Maps, Photos)
3. Return to the player; verify playback continues
4. Trigger Android's memory-reclaim by opening 10+ apps
5. Verify the player is not killed (or, if killed, that it restores position on reopen)

**Expected result:**
- Player survives memory pressure (or restores position on reopen)
- No native OOM crash in logcat

**Actual result:** _to be filled by QA_

**Status:** ☐ PASS ☐ FAIL ☐ BLOCKED ☐ N/A
**Tester:** ________________  **Date:** ________  **Device:** ________________  **Bug ID:** ________
**Evidence:** ________________________________________________

---

### 35.19 — Rapid enter/exit PiP (no crashes, no leaks)

| Field | Value |
|---|---|
| **Priority** | Major (Phase 36 leak audit feeds into this) |
| **Devices** | Primary + Tablet |
| **Media** | `mp4-medium.mp4` |

**Preconditions:**
- Device supports PiP

**Steps:**
1. Open `mp4-medium.mp4`
2. Rapidly enter / exit PiP 20 times (press home → tap PiP to expand → press home → repeat)
3. Observe the player state after each cycle
4. Check `adb shell dumpsys meminfo com.simba.app | grep TOTAL` for memory growth
5. After the 20 cycles, let the app sit idle for 30 seconds; verify no late crashes (from queued events)
6. Close the player; verify the app returns to idle (no orphan windows, no leaked services)

**Expected result:**
- 20 cycles complete without crash
- Memory growth is bounded (< 20 MB per cycle on average; ideally flat)
- App returns to clean idle state after close

**Actual result:** _to be filled by QA_

**Status:** ☐ PASS ☐ FAIL ☐ BLOCKED ☐ N/A
**Tester:** ________________  **Date:** ________  **Device:** ________________  **Bug ID:** ________
**Evidence:** ________________________________________________

---

### 35.20 — Long playback (1+ hour session stability)

| Field | Value |
|---|---|
| **Priority** | Blocker (V12 release-gate) |
| **Devices** | Primary |
| **Media** | `mp4-large.mp4` (or a long podcast for audio) |

**Preconditions:**
- Device plugged in to power (so the test isn't cut short by battery drain)
- App in foreground, video playing

**Steps:**
1. Open `mp4-large.mp4`
2. Set a timer for 65 minutes
3. Observe the player at 15-minute intervals: check `dumpsys meminfo com.simba.app` for memory growth
4. At 60 minutes, verify playback is still smooth (no buffering, no stuttering)
5. Pause + play + scrub a few times; verify all work
6. Press home at 60 minutes; verify PiP works
7. Return to the app; close the player

**Expected result:**
- 60+ minutes of playback completes without crash
- Memory growth is bounded (< 50 MB over 60 minutes; flat is ideal)
- Play / pause / scrub all work after 60 minutes
- PiP works after 60 minutes
- Clean close after long playback

**Actual result:** _to be filled by QA_

**Status:** ☐ PASS ☐ FAIL ☐ BLOCKED ☐ N/A
**Tester:** ________________  **Date:** ________  **Device:** ________________  **Bug ID:** ________
**Evidence:** ________________________________________________

---

## 5. Summary

_QA team to fill this section after running all 20 cases._

| Statistic | Count |
|---|---|
| Total cases | 20 |
| ✅ PASS | __ |
| ❌ FAIL | __ |
| ⚠️ BLOCKED | __ |
| ➖ N/A | __ |

**Release-gate status:** ☐ Ready for V12.0.0 release (all blocker + major cases PASS) · ☐ Not ready (see open bugs below)

**Open blocker bugs:** ___
**Open major bugs:** ___
**Open minor bugs:** ___

---

## 6. Sign-off

| Role | Name | Signature | Date |
|---|---|---|---|
| QA Lead | ________________ | ________________ | ________ |
| Mobile Team Lead | ________________ | ________________ | ________ |
| Product Owner | ________________ | ________________ | ________ |

A release-gate sign-off requires:
- All 7 **Blocker** priority cases (35.1, 35.3, 35.7, 35.8, 35.20) → PASS
- All 12 **Major** priority cases (35.2, 35.4, 35.5, 35.6, 35.9–35.13, 35.15, 35.16, 35.18, 35.19) → PASS or have an accepted Minor-bug workaround
- Minor cases (35.14, 35.17) → PASS or N/A (acceptable to defer)

---

## 7. Appendix

### 7.1 Quick logcat commands

```bash
# Real-time filter (V12 modules)
adb logcat PlayerActivity:V MpvBridgeModule:V MpvPlayerView:V MediaPlaybackService:V PipManager:V *:S

# Dump to file after a test
adb logcat -d > case-35.8-pip-180s.log

# Native crash check
adb logcat -d | grep -E "FATAL|AndroidRuntime|tombstone"

# MediaSession state
adb shell dumpsys media_session

# Audio routing
adb shell dumpsys audio

# Memory snapshot
adb shell dumpsys meminfo com.simba.app | grep -E "TOTAL|Native Heap|Java Heap"
```

### 7.2 Known issues to watch for

These are areas where V12 is brand-new code and regressions are most likely:

- **PiP black-screen on backgrounding** — the V11 bug. If you see a black PiP window instead of live video, that's the V11 bug re-emerging → immediate Blocker bug
- **Foreground service notification missing** — if the notification doesn't appear when audio backgrounds, the `MediaPlaybackService` isn't starting correctly → Blocker
- **MediaSession metadata empty** — if the lock-screen shows no title/artist, the metadata isn't propagating from mpv → Major
- **Codec init crash on FLAC / MKV** — Phase 33.5 added a null-surface guard but the codec-init path is similar → Major
- **Memory leak after PiP cycle** — Phase 36 will catch this with LeakCanary, but a 20+ MB growth per PiP cycle is a smell

### 7.3 Related documents

- [SIMBA_PLAYER_MODULE_V12_SPECIFICATION.md](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/md/SIMBA_PLAYER_MODULE_V12_SPECIFICATION.md) §35 — the spec for this phase
- [SIMBA_PLAYER_MODULE_V12_TRACKER.md](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/md/SIMBA_PLAYER_MODULE_V12_TRACKER.md) — the master tracker
- [react-native-media-player/README.md](file:///x:/Development/SIMBA/react-native-media-player/README.md) — module docs (consumer-facing)
- [beta-qa-script.md](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/md/beta-qa-script.md) — V11 beta QA script (historical reference for the V11→V12 regression checklist)

---

*End of document. Next step: QA team executes §4 cases and fills in §5 + §6.*
