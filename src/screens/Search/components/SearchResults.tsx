// ─── SearchResults — the LOCAL result groups ─────────────────────────────
//
// 2026-11-12 (SEARCH_PAGE_REDESIGN): every group draws the ONE row
// (`SearchResultRow` — the Profile page's `SettingsRow` anatomy). The
// page had two local grammars before: `ResultListRow` (a card with a
// 24 dp glyph and a chevron) for the entity groups and `ResultTile` (a
// poster card in a 2-column grid) for the media groups.
//
// The grid is gone. A search result list is a list of rows — YouTube,
// Apple Music, Plex and VLC all draw their search results as rows, and a
// grid of posters is a browse-shelf pattern (the Home page's rails), not
// a results pattern.
//
// The nested virtualisation is gone with it: the page's ScrollView used
// to hold a FlatList per group, each with `scrollEnabled={false}` and
// `initialNumToRender={items.length}` — a virtualiser that rendered
// everything anyway, inside a scroller that could not virtualise.

import React from 'react';
import {View} from 'react-native';
import {SubsectionTitle} from '../../../components/utility/SubsectionTitle/SubsectionTitle';
import type {SvgIconName} from '../../../components/utility/SvgIcon';
import type {
  SearchResultItem,
  SearchResultRoute,
} from '../../../hooks/useSearch';
import {SearchResultRow} from './SearchResultRow';

export interface SearchResultGroup {
  key: string;
  label: string;
  items: SearchResultItem[];
}

/**
 * The gold glyph for each group, for the results that have no artwork.
 *
 * The About page's rows use the same 18 dp gold glyph in the same slot,
 * so an artist and a settings row read as one family.
 */
const GROUP_ICON: Record<string, SvgIconName> = {
  artists: 'headphones',
  albums: 'disc3',
  playlists: 'listMusic',
  folders: 'folder',
  videos: 'video',
  audio: 'music',
};

interface SearchResultsProps {
  groups: SearchResultGroup[];
  /** The settled query — the matched text is highlighted. */
  query: string;
  /**
   * Play a local result.
   *
   * `thumbnailPath` is the artwork the result itself carries — the
   * catalogue art for a result the media store knows about. It travels
   * with the play because the launch is what puts the artwork into the
   * history entry, and the history entry is what the next search for
   * that film draws from (B-026).
   */
  onPlayFile: (fileUri: string, title: string, thumbnailPath?: string) => void;
  /**
   * Open the screen a result points at.
   *
   * W22 D-020: the route is typed as one of the four screens a search
   * result can open (`SearchResultRoute`), so the call site is
   * checked — before this, `navigateTo.route` was a bare `string` and
   * the row had to cast its way to `navigation.navigate`.
   */
  onNavigate: (route: SearchResultRoute, params?: Record<string, any>) => void;
}

export const SearchResults: React.FC<SearchResultsProps> = ({
  groups,
  query,
  onPlayFile,
  onNavigate,
}) => (
  <View>
    {groups.map(group => (
      <View key={group.key}>
        <SubsectionTitle label={group.label} variant="displaySerif" />
        {group.items.map(item => (
          <SearchResultRow
            key={item.id}
            title={item.title}
            subtitle={item.subtitle}
            query={query}
            artwork={item.thumbnailPath}
            cacheToken={item.lastPlayedAt}
            icon={GROUP_ICON[group.key]}
            // A row that opens a screen carries a chevron; a row that
            // plays carries nothing.
            trailing={item.navigateTo ? 'chevron' : 'none'}
            onPress={() => {
              const nt = item.navigateTo;
              if (nt) {
                onNavigate(nt.route, nt.params);
              } else if (item.fileUri) {
                onPlayFile(item.fileUri, item.title, item.thumbnailPath);
              }
            }}
          />
        ))}
      </View>
    ))}
  </View>
);
