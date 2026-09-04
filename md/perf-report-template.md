# SIMBA Player V12 — Performance Benchmark Report

**Run timestamp:** ______________________
**Device serial:** ______________________
**Device model:** ______________________
**Android version:** ______________________
**Iterations:** ______________________
**Build:** `release` (recommended) / `debug` (note which)

---

## Results Summary

| # | Metric | Target | Value | Pass? | Notes |
|---|---|---|---|---|---|
| 37.1 | Cold start time | < 2000 ms | ________ | ☐ | |
| 37.2 | TTFF for local MP4 | < 1000 ms | ________ | ☐ | |
| 37.3 | Seek latency | < 200 ms | ________ | ☐ | |
| 37.4 | Frame drop rate | < 5% | ________% | ☐ | |
| 37.5 | Memory: idle / playing / PiP | baseline | ___ / ___ / ___ | ☐ (baseline) | TOTAL PSS in KB |
| 37.6 | Battery drain (1h playback) | < 10% / hour | ____% | ☐ | |
| 37.7 | PiP entry/exit jank | < 1 dropped frame | ________ | ☐ | |
| 37.8 | Bundle size impact | baseline | ________ MB | ☐ (baseline) | |

---

## Detailed Measurements

### 37.1 — Cold start time (target < 2000 ms)

**Procedure:** Force-stop + `pm clear` + cold launch via `am start -W`. Average over N iterations.

| Iteration | TotalTime (ms) | First frame timestamp | First frame delta (ms) |
|---|---|---|---|
| 1 | | | |
| 2 | | | |
| 3 | | | |
| Average | | | |

**Pass?** ☐ Yes ☐ No

---

### 37.2 — TTFF for local MP4 (target < 1000 ms)

**Procedure:** Launch `PlayerActivity` directly with `mp4-small.mp4`. Capture logcat for `PlayerActivity ready` (T0) and `wireNativePtr: ptr=` (T3). Measure T3 − T0.

**Note:** Requires device-side clock offset correction. `run-perf-benchmarks.ps1` estimates; manual logcat verification recommended.

| Iteration | TTFF (ms) |
|---|---|
| 1 | |
| 2 | |
| 3 | |
| Average | |

**Pass?** ☐ Yes ☐ No

---

### 37.3 — Seek latency (target < 200 ms)

**Procedure:** Open `mp4-medium.mp4`. Seek to 6 positions (10s, 30s, 5s, 60s, 20s, 45s). Measure from `seekAbsolute` log line to `seeking=false` log line.

**Note:** Requires `DEBUG_SEEK` broadcast receiver in PlayerActivity for accurate timing. Until then, manual logcat verification.

| Seek target | Latency (ms) |
|---|---|
| 10s | |
| 30s | |
| 5s | |
| 60s | |
| 20s | |
| 45s | |
| Average | |

**Pass?** ☐ Yes ☐ No

---

### 37.4 — Frame drop rate (target < 5%)

**Procedure:** Use `dumpsys SurfaceFlinger --latency` while playing `mp4-medium.mp4` for 10 seconds. Parse with `parse-framestats.py` (companion to `run-perf-benchmarks.ps1`).

**Drop rate:** ________% (frames dropped: _____ / total: _____)

**Pass?** ☐ Yes ☐ No

---

### 37.5 — Memory footprint (baseline only)

**Procedure:** `dumpsys meminfo com.simba.app` at three states (idle / playing / PiP). Capture TOTAL PSS + Native Heap + Java Heap + Graphics.

| State | TOTAL PSS (KB) | Native Heap (KB) | Java Heap (KB) | Graphics (KB) |
|---|---|---|---|---|
| Idle (paused) | | | | |
| Playing (10s in) | | | | |
| PiP (3s after home) | | | | |

**Documented.** Future regressions detected by comparing against this baseline.

---

### 37.6 — Battery drain over 1h playback (target < 10%)

**Procedure:** Full charge → 60 minutes of continuous playback → measure drain.

**Start battery level:** ____%
**End battery level:** ____%
**Drain over 1h:** ____%

**Pass?** ☐ Yes ☐ No

---

### 37.7 — PiP entry/exit jank (target < 1 dropped frame)

**Procedure:** Press home → enters PiP. Tap PiP window center → exits PiP. Measure from `onUserLeaveHint` log line to `onPictureInPictureModeChanged: isInPip=true` log line.

**Note:** Manual logcat verification required. Auto-harness only verifies no `FATAL EXCEPTION`.

| Iteration | PiP entry latency (ms) | PiP exit latency (ms) | FATAL EXCEPTION? |
|---|---|---|---|
| 1 | | | ☐ |
| 2 | | | ☐ |
| 3 | | | ☐ |
| Average | | | |

**Pass?** ☐ Yes ☐ No

---

### 37.8 — Bundle size impact (baseline only)

**Procedure:** Build release APK, use APK Analyzer or `aapt dump badging` to get component sizes.

| Component | Size |
|---|---|
| Total APK | _____ MB |
| Native libs (libmpv + wrapper, all 4 ABIs) | _____ MB |
| Kotlin classes (module .dex) | _____ KB |
| Other (RN runtime, deps) | _____ MB |

**Documented.** Future regressions detected by comparing against this baseline.

---

## Pass / Fail Summary

Phase 37 is `[x] Complete` when ALL of the following PASS on the primary device:

- ☐ 37.1 Cold start < 2000 ms
- ☐ 37.2 TTFF < 1000 ms
- ☐ 37.3 Seek latency < 200 ms
- ☐ 37.4 Frame drop rate < 5%
- ☐ 37.6 Battery drain < 10% / hour
- ☐ 37.7 PiP entry/exit < 1 dropped frame + no FATAL EXCEPTION

37.5 and 37.8 are baseline-only.

---

## Sign-off

| Role | Name | Signature | Date |
|---|---|---|---|
| Mobile Lead | ________________ | ________________ | ________ |
| QA Lead | ________________ | ________________ | ________ |
| Product Owner | ________________ | ________________ | ________ |

---

*This report template is auto-populated by `run-perf-benchmarks.ps1` (Phase 37 of the SIMBA Player V12 refactor). For full methodology see [SIMBA_PLAYER_MODULE_V12_PERFORMANCE_BENCHMARKS.md](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/md/SIMBA_PLAYER_MODULE_V12_PERFORMANCE_BENCHMARKS.md).*
