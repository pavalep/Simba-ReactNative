// ─── SearchResultRow ─────────────────────────────────────────────────────
// THE row of the Search page.
//
// 2026-11-12 (SEARCH_PAGE_REDESIGN): the page had FOUR row components —
// `ResultListRow` (a card), `ResultTile` (a poster card in a 2-column
// grid), the `MediaRow` inside `RemoteResults` (a third card, with a 32 dp
// gold disc at the trailing edge) and `StreamingRow` (a fourth card, used
// for the trending list). Four grammars, three of them rounded cards with
// a circle on them.
//
// This is the ONE row: the Profile page's `SettingsRow` anatomy —
// full-bleed, a hairline under the row, a title, a description, an
// optional leading glyph, an optional trailing chevron — with artwork
// where the result has some.
//
// NO card. NO border box. NO elevated background. NO disc.
//
// The leading slot is either a 40×40 artwork (radius 8) or an 18 dp GOLD
// glyph in the same 40 dp slot, so the text column starts on the same
// left edge either way. The trailing slot is a chevron (the row opens
// something), a bare download glyph (the row can be saved), or nothing
// (the row plays).

import React, {useMemo} from 'react';
import {StyleSheet, TouchableOpacity, View} from 'react-native';
import {useTheme} from '../../../theme';
import {spacing} from '../../../theme/tokens';
import {AppText} from '../../../components/core/AppText/AppText';
import {DownloadButton} from '../../../components/core/DownloadButton/DownloadButton';
import {MediaImage} from '../../../components/utility/MediaImage';
import {SvgIcon, type SvgIconName} from '../../../components/utility/SvgIcon';
import {toRenderableImageUri, withCacheToken} from '../../../utils/mediaUri';
import type {MediaLane, MediaSource} from '../../../types/media';
import {HighlightedText} from './HighlightedText';

export interface SearchResultRowProps {
  title: string;
  subtitle?: string;
  /** The query — the matched part of the text is highlighted. */
  query?: string;
  /** The artwork, when the result has one. */
  artwork?: string;
  /**
   * The cache-busting token for the artwork.
   *
   * The old search tile busts its thumbnail cache on `lastPlayedAt`, so
   * the same poster is fetched again when an item is played a second
   * time. The row keeps that.
   */
  cacheToken?: string;
  /** The gold glyph, when the result has no artwork. */
  icon?: SvgIconName;
  /** What sits at the right edge of the row. */
  trailing?: 'chevron' | 'download' | 'none';
  /** The download's own data — the row's trailing glyph draws it. */
  download?: {
    uri: string;
    title: string;
    mediaType?: MediaLane;
    source?: MediaSource;
  };
  onPress: () => void;
}

export const SearchResultRow: React.FC<SearchResultRowProps> = ({
  title,
  subtitle,
  query,
  artwork,
  cacheToken,
  icon,
  trailing = 'none',
  download,
  onPress,
}) => {
  const {colors} = useTheme();

  /**
   * The artwork's URI.
   *
   * `toRenderableImageUri` is the app's owner of that decision: a
   * captured frame is a LOCAL path and needs the `file://` scheme, while
   * catalogue artwork is a remote URL and must be left exactly as it is —
   * `file://https://…` names no file at all. The old search tile had its
   * own inline copy of that rule and got it wrong, which is why every
   * remote thumbnail in the search results silently failed to render.
   */
  const artworkUri = useMemo(() => {
    const uri = toRenderableImageUri(artwork);
    if (!uri) return undefined;
    return cacheToken ? withCacheToken(uri, cacheToken) : uri;
  }, [artwork, cacheToken]);

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.6}
      accessibilityRole="button"
      accessibilityLabel={subtitle ? `${title}, ${subtitle}` : title}
      style={[styles.row, {borderBottomColor: colors.border.subtle}]}>
      {artworkUri ? (
        <MediaImage source={artworkUri} style={styles.art} resizeMode="cover" />
      ) : icon ? (
        <View style={styles.glyphSlot}>
          <SvgIcon name={icon} size={18} color={colors.accent.gold} />
        </View>
      ) : null}

      <View style={styles.textCol}>
        {query ? (
          <HighlightedText text={title} query={query} />
        ) : (
          <AppText variant="body2" color="primary" numberOfLines={1}>
            {title}
          </AppText>
        )}
        {subtitle ? (
          query ? (
            <HighlightedText text={subtitle} query={query} variant="subtitle" />
          ) : (
            <AppText variant="caption" color="tertiary" numberOfLines={1}>
              {subtitle}
            </AppText>
          )
        ) : null}
      </View>

      {trailing === 'chevron' ? (
        <SvgIcon name="chevronRight" size={14} color={colors.text.tertiary} />
      ) : null}
      {trailing === 'download' && download ? (
        <DownloadButton
          uri={download.uri}
          title={download.title}
          mediaType={download.mediaType}
          source={download.source ?? 'api'}
          size={20}
          variant="bare"
        />
      ) : null}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    // The Profile's row metrics (`SettingsRow`): full-bleed with the row's
    // own 16 dp as the gutter, a hairline under it, and a 52 dp floor.
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    minHeight: 56,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  art: {
    width: 40,
    height: 40,
    borderRadius: 8,
    marginRight: spacing.md,
    backgroundColor: 'transparent',
  },
  glyphSlot: {
    width: 40,
    height: 40,
    marginRight: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCol: {
    flex: 1,
    marginRight: spacing.md,
  },
});
