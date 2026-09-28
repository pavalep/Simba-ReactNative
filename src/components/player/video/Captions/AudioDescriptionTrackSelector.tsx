/**
 * V19 W3.6 Phase 3.6.3 — `AudioDescriptionTrackSelector`
 * (WCAG 2.2 §1.2.5 AA — REQUIRED for accessibility).
 *
 * Per TRACKER Phase 3.6.3:
 *   - Renders ONLY when `controls.audioDescriptionTracks.length > 0`
 *   - Selecting a track calls `commands.selectAudioDescriptionTrack(trackId)`
 *   - Lib routes AD as secondary `--audio-add` channel mixing
 *     with main audio
 *   - Default off
 *
 * **W3.6.3 status (2026-09-28): STUB.** The lib doesn't expose
 * `audioDescriptionTracks` and there's no `selectAudioDescriptionTrack`
 * command yet. The chrome can't ship a UI for tracks that don't
 * exist. When the lib-side bridge update lands:
 *
 *   1. Add `audioDescriptionTracks: AudioDescriptionTrack[]` to
 *      `PlayerState` (filtered from `tracks` where `type === 'audio'`
 *      AND `codec === 'ad'` or some `kind === 'ad'` marker).
 *   2. Add `selectAudioDescriptionTrack(trackId)` to `PlayerCommands`
 *      that maps to `setTrack('audio', trackId)` + a mixer flag.
 *   3. Expose via the facade: `state.audioDescriptionTracks` +
 *      `commands.selectAudioDescriptionTrack(trackId)`.
 *   4. Wire this component to read those.
 *
 * Until then the component is a no-op render. We deliberately
 * don't ship a "AD not available" stub — the spec says "hidden
 * otherwise — no 'AD not available' stub".
 *
 * Architecture source of truth: `md/SIMBA_PLAYER_V19_SPECIFICATION.md`
 * §3 + TRACKER Phase 3.6.3.
 */

import * as React from 'react';

export interface AudioDescriptionTrackSelectorProps {
  visible: boolean;
  onClose: () => void;
}

/**
 * Stub component. Returns null when AD tracks aren't
 * available (the always state today). Real implementation
 * lands when the lib-side bridge update exposes AD tracks.
 */
export const AudioDescriptionTrackSelector: React.FC<
  AudioDescriptionTrackSelectorProps
> = () => null;

export default AudioDescriptionTrackSelector;
