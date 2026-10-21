/**
 * V22 W22 (2026-10-21) — `MiniPlayerToggle`: the video lane's MINIMISE control.
 *
 * ## Why this control exists
 *
 * The top bar's back used to minimise, and the paragraph that justified it
 * cited YouTube's miniplayer, Plex's mini player and VLC's minimise. It is
 * withdrawn. Back is the platform's "leave this screen" verb, and this
 * control's accessibility label has always said "Closes the player and
 * returns to the app" — the label was the lie, and the handler is now the
 * close.
 *
 * So minimise needs its own home, and its home is the transport bar: a
 * control you reach for while watching, next to the other controls of the
 * moment, rather than a gesture hidden in the header.
 *
 * ## Why the glyph is a down-chevron
 *
 * Spotify documents chevron-down as "Minimize" on its now-playing screen,
 * and Apple Music and YouTube Music use the same collapse glyph. It is the
 * shipping convention for "make this smaller, keep it playing", and it is
 * the glyph this app already used for the audio player's minimise — so the
 * two lanes speak the same language.
 *
 * It is deliberately NOT the picture-in-picture glyph. PiP hands the video
 * to the OS window; this hands it to the app's own dock. They are
 * different destinations and they get different glyphs.
 *
 * ## Why it is a bare target and not a chip
 *
 * Same reasoning as `PiPToggle`: this is an ACTION with no value to show.
 * A chip would be a wider target saying exactly what a square one says.
 *
 * ## It renders nothing it cannot do
 *
 * SPEC invariant I3: a control that cannot act must not occupy space.
 * The transport bar only exists in the expanded presentation, and in the
 * expanded presentation the dock is always a legal destination — there is
 * a smaller presentation to move to, and the session is live by
 * definition. So there is no availability gate here, and inventing one
 * would be a control that hides for reasons the user cannot act on.
 */

import * as React from 'react';
import {usePresentation} from '../../../../infrastructure/player';
import {PlayerControl} from '../PlayerControl/PlayerControl';

export const MiniPlayerToggle: React.FC = () => {
  const {setVideoPresentation} = usePresentation();

  const onPress = React.useCallback(() => {
    // Minimise, not close. The film keeps playing and the dock keeps the
    // live video on screen; the dock's X is the stop.
    setVideoPresentation('mini');
  }, [setVideoPresentation]);

  return (
    <PlayerControl
      testID="video-mini-toggle"
      icon="chevronDown"
      onPress={onPress}
      accessibilityLabel="Mini player"
      accessibilityHint="Collapses the player to the mini bar and keeps playing"
    />
  );
};

export default MiniPlayerToggle;
