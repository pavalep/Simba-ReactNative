/**
 * WAVE B15 — the shared "more" button.
 *
 * The video lane had one (`TransportBar/More.tsx`) and the audio lane had
 * none. It is the same affordance in both lanes — a sliders glyph that
 * opens a settings panel — so it is one component with one label and one
 * glyph size.
 *
 * ## Why the icon is `sliders` and not `list`
 *
 * The sheet is a settings-style panel (playback speed, sleep timer, a
 * playlist picker), not a track queue. `sliders` is the correct
 * affordance for "adjust settings"; `list` would promise a queue that
 * this sheet does not show. The QUEUE has its own button, and it has
 * always had one: `listMusic`.
 *
 * Architecture source of truth: `md/SIMBA_PLAYER_V19_UI_OVERHAUL.md` §3.2.
 */

import * as React from 'react';
import {PlayerControl} from '../PlayerControl/PlayerControl';

export interface MoreButtonProps {
  onPress: () => void;
  /** The hint describes what the sheet holds, and the two lanes differ. */
  accessibilityHint?: string;
  testID?: string;
}

export const MoreButton: React.FC<MoreButtonProps> = ({
  onPress,
  accessibilityHint = 'Opens playback settings and more',
  testID = 'more-options',
}) => (
  <PlayerControl
    testID={testID}
    icon="sliders"
    onPress={onPress}
    accessibilityLabel="More options"
    accessibilityHint={accessibilityHint}
  />
);

export default MoreButton;
