/**
 * V19 W8.7 — `CaptionsToggle`: the subtitle control. ONE TAP CYCLES
 * THROUGH THE AVAILABLE TRACKS.
 *
 * ## Why the picker popup is gone
 *
 * `CaptionsSheet` was the second of the two W3 popovers that W8.7
 * deleted. Beyond the popup itself, it was LIGHT-themed — a cream panel
 * over a black player — because it was written in W3 against the app's
 * elevated surface and never moved onto the on-media surface when the
 * player became its own dark band. Fixing that panel would have been
 * fixing an invented pattern; the pattern is what was wrong.
 *
 * Cycling is the shipped behaviour in Plex and VLC, and it is the right
 * call for a track list that is usually one or two entries long. When a
 * file genuinely has many subtitle tracks the cycle is still correct —
 * it wraps — it just takes more taps, and every tap is reversible and
 * free of modal navigation.
 *
 * ## Why it still returns `null` with no caption tracks
 *
 * SPEC invariant I3: a control that cannot act must not render. A file
 * with no subtitle tracks has nothing to turn on, so a "CC" button here
 * would look live and do nothing — the exact defect class this overhaul
 * exists to remove. The cluster it belongs to simply has one fewer
 * member, and the cluster is laid out from its own edge so nothing
 * shifts.
 */
import * as React from 'react';
import {useTransport, type CaptionTrack} from '../../../../infrastructure/player';
import {PlayerControl} from '../PlayerControl/PlayerControl';

/**
 * The next track to select, given what is playing now.
 *
 * `null` (captions off) advances to the FIRST track; any active track
 * advances to the next one and wraps back to `null` after the last. So
 * the full cycle for a two-track file is off → 1 → 2 → off.
 *
 * Exported because this is the contract the tests pin, and a test that
 * hardcodes `'the second track'` cannot tell a re-order of `tracks`
 * from a re-order of the cycle.
 */
export function nextCaptionTrackId(
  tracks: ReadonlyArray<CaptionTrack>,
  activeId: number | null,
): number | null {
  if (tracks.length === 0) return null;
  const index = tracks.findIndex(t => t.id === activeId);
  // Nothing active → turn the FIRST track on.
  if (index < 0) return tracks[0].id;
  // Past the last track → captions OFF. `null` is a real state here,
  // not a fallback: without it the cycle never leaves captions on, and
  // a user whose only subtitle track is one they do not want can never
  // turn it off without opening a picker that no longer exists.
  const next = index + 1;
  return next >= tracks.length ? null : tracks[next].id;
}

export const CaptionsToggle: React.FC = () => {
  const {state, commands} = useTransport();

  const tracks = state.captionTracks;

  const activeIndex = React.useMemo(
    () => tracks.findIndex(t => t.id === state.activeCaptionTrackId),
    [tracks, state.activeCaptionTrackId],
  );
  const activeTrack = activeIndex >= 0 ? tracks[activeIndex] : null;
  const isActive = activeTrack !== null;

  const onPress = React.useCallback(() => {
    commands.selectCaptionTrack(nextCaptionTrackId(tracks, state.activeCaptionTrackId));
  }, [commands, tracks, state.activeCaptionTrackId]);

  // No tracks ⇒ nothing to cycle to, so the control does not render.
  // Hooks above already ran, so this early return is legal.
  if (tracks.length === 0) return null;

  return (
    <PlayerControl
      testID="captions-toggle"
      icon="subtitles"
      onPress={onPress}
      accessibilityRole="switch"
      accessibilityChecked={isActive}
      // Names the LANGUAGE that is actually rendering, not a bare "CC":
      // "captions are on" is only half the answer — the user needs to
      // know which subtitle language they are reading.
      accessibilityLabel={
        isActive ? `Captions: ${activeTrack.label}` : 'Captions off'
      }
      accessibilityHint="Switches between captions off and each available subtitle track"
      // Engaged turns the glyph gold. Second channel only — the a11y
      // switch state carries the same information without colour.
      active={isActive}
    />
  );
};

export default CaptionsToggle;