# Debug Session: player-controls-hidden
- **Status**: [OPEN]
- **Issue**: Video player controls are still not visible. The top bar is missing, the bottom control bar is missing, and when video plays the control area does not appear full width.
- **Debug Server**: Pending
- **Log File**: .dbg/trae-debug-log-player-controls-hidden.ndjson

## Reproduction Steps
1. Open the app.
2. Navigate to any video.
3. Start playback or wait for playback to begin.
4. Observe that the top bar and bottom controls are not visible or not usable.

## Hypotheses & Verification
| ID | Hypothesis | Likelihood | Effort | Evidence |
|----|------------|------------|--------|----------|
| A | Control components are gated off by render conditions such as `pipUiVisible`, `loadingPhase`, or `controlsLocked` | High | Low | Pending |
| B | Controls render, but their parent layout or animated wrappers collapse or sit off-screen | High | Low | Pending |
| C | Another overlay or native layer is visually covering the controls even though they render | Medium | Low | Pending |
| D | Surface tap / visibility state changes immediately hide controls after mount | Medium | Medium | Pending |
| E | The native surface or gesture layer sizing differs from the React layout, causing overlays to render outside the visible player area | Medium | Medium | Pending |

## Log Evidence
Pending

## Verification Conclusion
Pending
