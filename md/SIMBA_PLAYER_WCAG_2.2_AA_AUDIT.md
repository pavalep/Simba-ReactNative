# SIMBA Player — WCAG 2.2 AA Audit (Template)

**Owner:** a11y lead (external). V19 author creates this template in W0. The external a11y lead performs the actual audit before V20 ships. V19 ships without a sign-off row; this is a planning document.

**Audit window:** After V19 W7 lands (acceptance matrix + a11y + responsive QA), before V20 starts. Audit must be on a real device (Android emulator + iOS simulator) with at least one production video source.

**Tooling:** axe-core, Accessibility Inspector (iOS), Accessibility Scanner (Android), VoiceOver (iOS), TalkBack (Android).

---

## Clause-by-clause matrix

### 1.2.2 Captions (Prerecorded) — Level A — REQUIRED

| V19 surface | Test method | Expected result | Actual | Sign-off |
|---|---|---|---|---|
| `CaptionTrackSelector` (§3.12) renders tracks labeled `English [CC]` / `English [SDH]` for source kind `caption` / `sdh` | Open a video with both CC and SDH tracks; inspect track list | Labels match source kind; no collapsed labels | _TBD_ | _TBD_ |
| `CaptionCustomizer` (§3.13) persists font size + background + position across app restarts | Change settings, kill app, relaunch | Settings persist | _TBD_ | _TBD_ |
| Track metadata carries `kind: 'subtitle' \| 'caption' \| 'sdh'` | Unit test in lib repo | All three kinds parse correctly | _TBD_ | _TBD_ |

### 1.2.5 Audio Description (Prerecorded) — Level AA — REQUIRED

| V19 surface | Test method | Expected result | Actual | Sign-off |
|---|---|---|---|---|
| `AudioDescriptionTrackSelector` (§3.14) renders ONLY when `controls.audioDescriptionTracks.length > 0` | Open a video with no AD track → row hidden; open a video with AD track → row visible | Hidden / visible per source | _TBD_ | _TBD_ |
| AD mixer routes `--audio-add` to mpv with main track | Open AD video; AD narrates visual content during a known scene | AD audible alongside main | _TBD_ | _TBD_ |

### 2.1.1 Keyboard — Level A — REQUIRED

| V19 surface | Test method | Expected result | Actual | Sign-off |
|---|---|---|---|---|
| `DpadController` (§3.21) subscribes to KEYCODE_DPAD_* + KEYCODE_MEDIA_* | Connect Bluetooth keyboard; press media keys | play/pause/next/prev fire | _TBD_ | _TBD_ |
| Every chrome control reachable by tab/D-pad traversal in left-to-right, top-to-bottom order | Press Tab / DPAD_RIGHT repeatedly from idle | Focus moves through chrome in expected order | _TBD_ | _TBD_ |
| Visible focus ring: 2 px gold outline (WCAG 2.4.7) | Inspect focus state via Accessibility Inspector | Focus ring visible at 100% alpha | _TBD_ | _TBD_ |

### 2.2.2 Pause, Stop, Hide — Level A — REQUIRED

| V19 surface | Test method | Expected result | Actual | Sign-off |
|---|---|---|---|---|
| `NextUpOverlay` (§3.18) can be cancelled within 2 taps | Trigger next-up; tap Cancel | Overlay dismissed, user remains on finished item | _TBD_ | _TBD_ |
| `LongPressSpeedPreview` (§3.11) release restores prior rate | Long-press 500 ms; release | Rate restored | _TBD_ | _TBD_ |

### 2.3.1 Three Flashes or Below Threshold — Level A — REQUIRED

| V19 surface | Test method | Expected result | Actual | Sign-off |
|---|---|---|---|---|
| V19 NEVER decodes >3 Hz flash content without warning (deferred: `FlashingLightsBadge` §3.20 → V20) | Manual QA with strobe-test video | No seizure-triggering content without warning | _TBD (V20)_ | _TBD (V20)_ |
| iOS 17+ `Dim Flashing Lights` system-level detection (deferred to V20) | Play strobe-test video on iOS 17+ | iOS dims display | _TBD (V20)_ | _TBD (V20)_ |

### 2.4.7 Focus Visible — Level AA — REQUIRED

| V19 surface | Test method | Expected result | Actual | Sign-off |
|---|---|---|---|---|
| Every interactive chrome element has a visible focus ring | Tab through chrome | All elements show ring | _TBD_ | _TBD_ |
| Focus ring contrast ratio ≥3:1 against background | Contrast checker | Pass | _TBD_ | _TBD_ |

### 2.4.11 Focus Not Obscured — Level AA — REQUIRED (NEW WCAG 2.2)

| V19 surface | Test method | Expected result | Actual | Sign-off |
|---|---|---|---|---|
| Chrome never overlaps the focused element | Tab to each control; inspect | No overlap | _TBD_ | _TBD_ |
| Safe-area insets applied to all interactive chrome | Manual QA on iPhone 15 Pro / Pixel 8 | Insets respected | _TBD_ | _TBD_ |

### 2.5.5 Target Size Enhanced — Level AAA — TARGET

| V19 surface | Test method | Expected result | Actual | Sign-off |
|---|---|---|---|---|
| Every chrome control ≥44×44 pt (iOS HIG baseline — exceeds WCAG AAA) | Measure hit areas | All ≥44 pt | _TBD_ | _TBD_ |

### 2.5.8 Target Size Minimum — Level AA — REQUIRED

| V19 surface | Test method | Expected result | Actual | Sign-off |
|---|---|---|---|---|
| Every chrome control ≥24×24 pt (WCAG baseline) | Measure hit areas | All ≥24 pt | _TBD_ | _TBD_ |

---

## Additional accessibility surfaces (beyond strict WCAG clauses)

| Surface | V19 reference | Tested |
|---|---|---|
| `SmartResumePrompt` (§3.17) — readable contrast + 2-tap to dismiss | _TBD_ | _TBD_ |
| `InteractiveTranscript` (§3.15) — Dynamic Type respect, scroll without kinetic | _TBD_ | _TBD_ |
| `ReduceMotionController` (§3.19) — subscribe to `AccessibilityInfo.isReduceMotionEnabled` | _TBD_ | _TBD_ |
| `CaptionTrackSelector` (§3.12) — VoiceOver/TalkBack label clarity | _TBD_ | _TBD_ |

---

## Sign-off block

| Role | Name | Date | Result |
|---|---|---|---|
| a11y lead (external) | _TBD_ | _TBD_ | _TBD_ |
| V19 author | _self_ | _TBD_ | _TBD_ |
| Eng lead | _TBD_ | _TBD_ | _TBD_ |

**Audit decision:** PASS / FAIL / CONDITIONAL. If CONDITIONAL, list specific clauses that need follow-up work and the wave they target.

---

## Reference

- [WCAG 2.2 specification](https://www.w3.org/TR/WCAG22/)
- [WAI Media Player Accessibility Guide](https://www.w3.org/WAI/media/av/player/)
- [Apple Accessibility — Video Player patterns](https://www.apple.com/accessibility/features/)
- [Android Accessibility — Media controls](https://developer.android.com/training/tv/get-started/controllers)
- V19 SPEC §9.12 — clause-by-clause mapping

---

**End of WCAG 2.2 AA audit template.**