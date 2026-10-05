/**
 * V19 W7.3 — `More`: the single entry point to the secondary sheet.
 *
 * ## What changed
 *
 * This was the WORST offender in the icon-scale audit: a **20 px**
 * `sliders` glyph — the smallest mark in the player — inside a `minWidth:
 * 44` box, with `hitSlop={8}` and opacity-only press feedback. The 20 px
 * glyph inside a 44 pt target was the specific thing the product owner
 * described as "some icons are partially hidden": the target looked
 * right but the mark inside it looked lost, so the control did not read
 * as reliably tappable.
 *
 * It now renders through `PlayerControl` at the 24 px floor, in a real
 * 44 × 44 target, with no `hitSlop` and a spring press. The sheet it
 * opens is unchanged in behaviour here — `VideoMoreSheet` owns every
 * side effect, and this component owns only visibility.
 *
 * ## Why the icon is `sliders` and not `list`
 *
 * The sheet is a settings-style panel (playback speed, quality, audio,
 * tracks, library actions), not a track queue. `sliders` is the correct
 * affordance for "adjust settings"; `list` would promise a queue that
 * this sheet does not show.
 *
 * ## On the old placeholder handlers
 *
 * This component previously carried a comment describing Share / Save /
 * Track-info as "placeholder no-ops that surface a console warning".
 * Those warnings are gone. W3.5.6 moved every action into
 * `VideoMoreSheet`, and this button now does exactly one thing: open
 * the sheet. A button that opens a sheet of real, working actions is
 * not a placeholder, and it no longer needs to apologise for one.
 *
 * Architecture source of truth: `md/SIMBA_PLAYER_V19_UI_OVERHAUL.md`
 * §3.2; `md/SIMBA_PLAYER_MODULE_V19_SPECIFICATION.md` §3.3.
 */

import * as React from 'react';
import {
  VideoMoreSheet,
  type VideoMoreAction,
} from '../VideoMoreSheet/VideoMoreSheet';
import {PlayerControl} from '../PlayerControl/PlayerControl';

export const More: React.FC = () => {
  const [sheetOpen, setSheetOpen] = React.useState(false);

  return (
    <>
      <PlayerControl
        testID="more-options"
        icon="sliders"
        onPress={() => setSheetOpen(true)}
        accessibilityLabel="More options"
        accessibilityHint="Opens playback settings, audio, tracks, and more"
      />

      <VideoMoreSheet
        visible={sheetOpen}
        onAction={(_action: VideoMoreAction) => {
          // The sheet owns every action side effect (setSpeed,
          // shareContent, quality, …). This button owns only
          // visibility, so there is deliberately nothing to do here.
        }}
        onClose={() => setSheetOpen(false)}
      />
    </>
  );
};

export default More;
