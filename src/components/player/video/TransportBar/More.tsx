/**
 * V19 W7.3 — `More`: the video lane's entry point to the secondary sheet.
 *
 * ## What changed in WAVE B15
 *
 * The button is now the SHARED one (`shared/MoreSheet/MoreButton`), because
 * the audio lane has the same affordance and a 20 px `sliders` glyph in a
 * 44 pt target is exactly the "some icons are partially hidden" defect
 * this component was written to fix — it must not exist twice.
 *
 * The sheet's chrome and rows are shared too. This component is now only
 * the VIDEO lane's wiring: the button, the sheet's visibility, and the
 * playlist picker that the sheet's "Add to playlist" row opens.
 *
 * ## Why the playlist picker lives HERE and not inside the sheet
 *
 * The picker is a `Modal`. A `Modal` opened from inside another
 * `Modal` stacks two panels over the film, and on Android the second
 * one's backdrop lands on top of the first one's dismiss control. The
 * sheet therefore only REPORTS the action (`onAction('addToPlaylist')`)
 * and this component closes the sheet and opens the picker — one panel
 * at a time.
 *
 * Architecture source of truth:
 * `md/SIMBA_PLAYER_V19_UI_OVERHAUL.md` §3.2;
 * `md/SIMBA_PLAYER_MODULE_V19_SPECIFICATION.md` §3.3.
 */

import * as React from 'react';
import {
  VideoMoreSheet,
  type VideoMoreAction,
} from '../VideoMoreSheet/VideoMoreSheet';
import {MoreButton} from '../../shared/MoreSheet/MoreButton';
import {useCurrentPlaylistItem} from '../../shared/useCurrentPlaylistItem';
import {PlaylistSheet} from '../../../sheets/PlaylistSheet/PlaylistSheet';

export const More: React.FC = () => {
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [playlistOpen, setPlaylistOpen] = React.useState(false);
  const playlistItem = useCurrentPlaylistItem();

  const handleAction = React.useCallback((action: VideoMoreAction) => {
    if (action === 'addToPlaylist') {
      // Close the panel FIRST: the picker is a modal, and a modal opened
      // from inside another modal stacks two panels over the film.
      setSheetOpen(false);
      setPlaylistOpen(true);
    }
  }, []);

  return (
    <>
      <MoreButton
        onPress={() => setSheetOpen(true)}
        accessibilityHint="Opens playback settings, quality, and more"
      />

      <VideoMoreSheet
        visible={sheetOpen}
        onAction={handleAction}
        onClose={() => setSheetOpen(false)}
      />

      {playlistItem ? (
        <PlaylistSheet
          visible={playlistOpen}
          onClose={() => setPlaylistOpen(false)}
          currentItem={playlistItem}
        />
      ) : null}
    </>
  );
};

export default More;
