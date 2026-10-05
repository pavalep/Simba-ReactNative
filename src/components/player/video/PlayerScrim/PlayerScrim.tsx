/**
 * V19 W7.2 — `PlayerScrim`: the one backdrop for the whole player chrome.
 *
 * ## The defect this fixes
 *
 * `TransportBar` had **no background at all** — its root style was
 * `row: { width: '100%' }`. Every icon in the transport was drawn
 * directly on an arbitrary film frame. On a bright frame the white-80%
 * on-media ink washed out; on a dark frame only the gold accent read,
 * which is what made the chrome look like it had *partially* rendered.
 *
 * Legibility over unknown imagery is a property of the **surface**, not
 * of the content. A premium player designs the backdrop; it does not
 * hope the frame underneath is dark. See the overhaul doc, §1.1 and
 * invariant I12.
 *
 * ## Why one scrim, not two bars
 *
 * The previous state was an opaque black slab at the top (the header)
 * and nothing at the bottom. That made the top and bottom of the screen
 * read as two different products. This is a single continuous
 * gradient surface behind the entire chrome, weighted so the ink is
 * dense exactly where controls sit and falls to nothing over the
 * middle of the frame where the video should be seen.
 *
 * ## Geometry
 *
 * The gradient covers the full screen, not just the control bands, so
 * the falloff is continuous:
 *
 *   0.00  transparent      ← the top of the video, untouched
 *   0.10  rgba(0,0,0,0.55) ← header band (back / title / lock)
 *   0.42  rgba(0,0,0,0.55) ← hold, so the header text has a solid bed
 *   0.62  rgba(0,0,0,0.00) ← the middle: the picture is never obscured
 *   0.78  rgba(0,0,0,0.72) ← transport band, densest for the scrub row
 *   1.00  rgba(0,0,0,0.72)
 *
 * The transport band is deliberately darker than the header band
 * (0.72 vs 0.55): it carries the scrub track and the densest row of
 * icons, and the thumb is gold, which needs the darker bed to read as
 * a lit element rather than a smudge.
 *
 * The middle stop is what makes this read as *designed* rather than as
 * a black bar — the picture is never dimmed, only framed.
 *
 * ## Implementation note (corrects an earlier wrong assumption)
 *
 * An earlier comment in `VideoTitleOverlay` recorded that
 * `react-native-linear-gradient` was unusable here because it had zero
 * usages and predated the new architecture. That was wrong on both
 * counts: it is a declared dependency at `^2.8.3` and it is installed.
 * A hard-edged `background.scrimDeep` rectangle was used as a
 * substitute, and that substitute is what produced the "black slab
 * bolted to the top" look. Real gradients are available; the
 * substitute is no longer needed.
 *
 * ## Why `pointerEvents="none"`
 *
 * The scrim is purely a backdrop. The `VideoSurface` beneath owns the
 * tap that toggles the chrome, so anything opaque here would swallow
 * it.
 *
 * Architecture source of truth: `md/SIMBA_PLAYER_V19_UI_OVERHAUL.md`
 * §1.1, §3.1 and invariant I12.
 */

import * as React from 'react';
import {StyleSheet} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {useTheme} from '../../../../theme';

/**
 * Where each band of the scrim sits, as a fraction of screen height,
 * and which alpha it carries.
 *
 * Exported so tests can assert the SHAPE of the scrim — specifically
 * that the middle of the frame is fully transparent, which is the
 * property that makes this a designed frame rather than a black bar. A
 * test that only checked "a gradient rendered" would pass even if every
 * stop were opaque black, which is precisely the regression this
 * component exists to prevent.
 *
 * The colours themselves are NOT here — they are theme tokens
 * (`colors.background.playerScrim`), because a raw `rgba(0,0,0,0.55)`
 * in a component is exactly how a design system rots: the number
 * becomes unchangeable without a grep across the codebase.
 */
export const SCRIM_STOPS: ReadonlyArray<{
  offset: number;
  /** Which alpha band this stop carries. */
  band: 'none' | 'header' | 'transport';
}> = [
  {offset: 0, band: 'none'},
  {offset: 0.1, band: 'header'},
  {offset: 0.42, band: 'header'},
  {offset: 0.62, band: 'none'},
  {offset: 0.78, band: 'transport'},
  {offset: 1, band: 'transport'},
];

export const PlayerScrim: React.FC = () => {
  const {colors} = useTheme();
  const {playerScrim} = colors.background;

  return (
    <LinearGradient
      testID="player-scrim"
      // Backdrop only. The surface below owns the tap that toggles the
      // chrome; anything opaque here would swallow it.
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
      colors={SCRIM_STOPS.map(s => playerScrim[s.band])}
      locations={SCRIM_STOPS.map(s => s.offset)}
    />
  );
};

export default PlayerScrim;
