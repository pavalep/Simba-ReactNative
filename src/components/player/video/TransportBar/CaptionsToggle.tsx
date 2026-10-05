/**
 * V19 W7.3 — `CaptionsToggle`: the subtitle control (chip tier).
 *
 * ## What changed
 *
 * Same three defects as `ModeControl`, fixed the same way: a **16 px**
 * glyph (the smallest icon anywhere in the player), `hitSlop={8}`
 * inflating the touch area past its own bounds so it fought its
 * neighbours in the mode row, and opacity-only press feedback that is
 * near-invisible over a video frame. It now renders through
 * `PlayerControl`'s chip tier — 22 px glyph, real 44 pt pill, spring
 * press, haptic, accessibility role.
 *
 * ## Why it still returns `null` with no caption tracks
 *
 * This is SPEC invariant I3 (a control that cannot act must not render)
 * and it is deliberate, not an oversight. A file with no subtitle tracks
 * has no captions to turn on, so a "CC" button here would be a control
 * that looks live and does nothing — the exact defect class this
 * overhaul exists to remove. The mode row collapses to its remaining
 * pills instead, and `TransportRow` is a centred cluster so that
 * collapse does not shift the primary CTA sideways.
 *
 * ## Why the label shows the track, not just "CC"
 *
 * When a track is active, the pill names it ("English", "हिन्दी"). The
 * user needs to know WHICH subtitle language is rendering, and a bare
 * "CC" only tells them that captions are on. The glyph swap and the gold
 * `active` state both carry the same information for anyone who cannot
 * distinguish the colour (WCAG 1.4.1).
 *
 * Architecture source of truth: `md/SIMBA_PLAYER_V19_UI_OVERHAUL.md`
 * §3.2; `md/SIMBA_PLAYER_MODULE_V19_SPECIFICATION.md` §3.3.
 */

import * as React from 'react';
import {useTransport} from '../../../../infrastructure/player';
import {PlayerControl, CONTROL_ICON_SIZE_COMPACT} from '../PlayerControl/PlayerControl';
import {CaptionsSheet} from './CaptionsSheet';

export const CaptionsToggle: React.FC = () => {
  const {state, commands} = useTransport();
  const [sheetOpen, setSheetOpen] = React.useState(false);

  // Hooks run before this early return — `useState` above is already
  // called, so returning `null` here is legal and the sheet's open
  // state is simply discarded along with the control.
  if (state.captionTracks.length === 0) return null;

  const activeTrack = state.captionTracks.find(
    t => t.id === state.activeCaptionTrackId,
  );
  const isActive = state.activeCaptionTrackId !== null;
  const label = activeTrack ? activeTrack.label : 'CC';

  return (
    <>
      <PlayerControl
        testID="captions-toggle"
        chip
        icon="subtitles"
        iconSize={CONTROL_ICON_SIZE_COMPACT}
        label={label}
        active={isActive}
        onPress={() => setSheetOpen(true)}
        accessibilityRole="switch"
        accessibilityChecked={isActive}
        accessibilityLabel={
          isActive ? `Captions: ${label}` : 'Captions off'
        }
        accessibilityHint="Opens the captions picker"
      />

      <CaptionsSheet
        visible={sheetOpen}
        captionTracks={state.captionTracks}
        activeTrackId={state.activeCaptionTrackId}
        onSelect={id => commands.selectCaptionTrack(id)}
        onClose={() => setSheetOpen(false)}
      />
    </>
  );
};

export default CaptionsToggle;
