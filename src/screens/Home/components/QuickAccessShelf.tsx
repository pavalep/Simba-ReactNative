// ─── QuickAccessShelf — the pinned playlists rail ──────────────────────
//
// V2: THE COVER IS THE CARD.
//
// V1's tile was a 160 × 110 box with a 32 dp cover in its top-left
// corner and the words "Jump back in" underneath: the picture was the
// smallest thing on the tile and the words said nothing. V2 gives the
// playlist its own cover at the size of the other artwork on the page
// and lets the name and the item count sit under it.
//
// The collage itself has ONE owner — `PlaylistCover` — so the artwork
// is the same here, on the All Playlists card and in the Library. This
// component only owns the CHROME around it.
//
// THE PIN BADGE
// -------------
// The badge belongs to the COVER (`PlaylistCover` draws it), so it says
// the pinned state on every surface a playlist is drawn. It is a
// STATE, not a button (D-P8): the long-press menu is the shortcut, and
// All Playlists keeps the visible 32 px toggle, so the pin is never
// reachable by gesture alone.
//
// That menu is the app's own `PlaylistActionMenu` — the same sheet the
// All Playlists grid opens. The Home tile used to have no way to unpin
// at all: the only door was All Playlists.

import React, {useCallback, useMemo, useState} from 'react';
import {View, FlatList, StyleSheet, TouchableOpacity} from 'react-native';
import {radius, spacing} from '../../../theme/tokens';
import {AppText} from '../../../components/core/AppText/AppText';
import {SectionHeader} from '../../../components/utility/SectionHeader/SectionHeader';
import {PlaylistCover} from '../../../components/playlist/PlaylistCover';
import {PlaylistActionMenu} from '../../../components/playlist/PlaylistActionMenu';
import {FONT_FAMILY} from '../../../constants/fontFamily';
import {RAIL_CARD_WIDTH} from '../../../components/media/railMetrics';
import type {Playlist} from '../../../types/playlist';

interface QuickAccessShelfProps {
  title?: string;
  /**
   * The playlists the rail draws. They are WHOLE playlists: the tile
   * draws the playlist's cover, so the rail needs the artwork and the
   * pinned state — not a summary of them.
   */
  playlists: Playlist[];
  onPlaylistPress: (playlistId: string) => void;
  /**
   * Pin or unpin. Called from the long-press menu, with the state the
   * playlist should END in.
   */
  onTogglePin: (playlistId: string, pinned: boolean) => void;
  /** P41.5: See All coverage — every shelf links to its full catalog. */
  onSeeAll?: () => void;
}

export const QuickAccessShelf: React.FC<QuickAccessShelfProps> = ({
  title = 'Quick Access',
  playlists,
  onPlaylistPress,
  onTogglePin,
  onSeeAll,
}) => {
  // The menu reads the LIVE playlist, so a pin changed elsewhere shows
  // in the menu's label instead of a stale snapshot.
  const [actionPlaylistId, setActionPlaylistId] = useState<string | null>(null);
  const actionPlaylist = useMemo(
    () => playlists.find(playlist => playlist.id === actionPlaylistId) ?? null,
    [playlists, actionPlaylistId],
  );
  const handleCloseActionMenu = useCallback(() => setActionPlaylistId(null), []);

  // A RAIL WITH NOTHING IN IT IS NOT DRAWN.
  //
  // Not "drawn with a message saying what would fill it". That was the
  // 2026-11-05 rule, and it made the page's one grammar into two: every
  // other rail disappeared when it was empty, and this one stayed as a
  // line of text. V2 has ONE rule — a rail with nothing in it is not
  // drawn — and the section builder drops this rail out of the page
  // entirely when nothing is pinned, divider and all.
  //
  // The feature's front door is still on the page: the Library and the
  // Profile both open All Playlists, and the rail's own "See All" does
  // too. What is gone is the lonely heading.
  //
  // The early return is BELOW the hooks on purpose: an early return
  // above them would change the hook count between renders, and React
  // would throw on the next one.
  if (playlists.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <SectionHeader
        label={title}
        variant="plain"
        // The same rule the other Home rails use (P4): the link appears
        // when the rail holds more than one item, because a destination
        // with nothing more to show is not worth a "See All".
        actionLabel={playlists.length > 1 ? 'See All' : undefined}
        onAction={onSeeAll}
        actionAccessibilityLabel={`See all ${title}`}
      />

      <FlatList
        horizontal
        data={playlists}
        keyExtractor={playlist => playlist.id}
        renderItem={({item: playlist}) => (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => onPlaylistPress(playlist.id)}
            onLongPress={() => setActionPlaylistId(playlist.id)}
            accessibilityRole="button"
            accessibilityLabel={`Open playlist ${playlist.name}${playlist.pinned ? ', pinned' : ''}`}
            accessibilityHint="Long press for more actions"
            style={styles.card}>
            {/* The tile's artwork IS the playlist's cover — the same
                artwork the Library card draws (spec §4.2), and with
                it the pin badge that says which are pinned. */}
            <PlaylistCover playlist={playlist} style={styles.cover} />

            <AppText variant="bodySmall" numberOfLines={1} style={styles.playlistName}>
              {playlist.name}
            </AppText>
            <AppText variant="overline" color="accent" style={styles.count}>
              {playlist.items.length} ITEMS
            </AppText>
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.scrollContent}
        showsHorizontalScrollIndicator={false}
        initialNumToRender={Math.min(playlists.length, 24)}
        windowSize={5}
        maxToRenderPerBatch={12}
      />

      {/* The long-press menu — the app's own sheet, the same one the
          All Playlists grid opens. */}
      <PlaylistActionMenu
        visible={actionPlaylist !== null}
        playlist={actionPlaylist}
        onTogglePin={onTogglePin}
        onClose={handleCloseActionMenu}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.xxl,
  },
  scrollContent: {
    // The ONE gutter: 16 dp, like every left-aligned thing on the page.
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
    paddingBottom: 4,
  },
  card: {
    width: RAIL_CARD_WIDTH,
  },
  // The tile's artwork box. The collage fills it, and the corner radius
  // clips the cells.
  cover: {
    width: RAIL_CARD_WIDTH,
    height: RAIL_CARD_WIDTH,
    borderRadius: radius.md,
  },
  playlistName: {
    // Inter SemiBold 14/20 — the `bodySmall` metrics with the semibold
    // family. The weight lives in the FAMILY key (the app's
    // weight-intent rule), so there is no `fontWeight` here.
    marginTop: 10,
    fontFamily: FONT_FAMILY.inter.semibold,
  },
  count: {
    marginTop: 2,
  },
});
