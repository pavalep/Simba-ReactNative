// ─── Audiobooks — BookCard ─────────────────────────────────────────────
// The catalogue row: a 60×60 cover, the title, the author, the language
// and the running time, and the chevron that says "this opens a page".
//
// The row OPENS THE BOOK'S OWN PAGE. It carries no play action and no
// long-press menu, and that is deliberate:
//
//   • A BOOK is not a playable file. It is a collection of chapters, and
//     the only URI in the app for one is the chapter's. "Play Next" and
//     "Add to Queue" would have nothing to queue.
//   • The playlist rule refuses an audiobook anyway —
//     `PLAYLIST_ALLOWED_MEDIA_KINDS` holds 'audio', 'music' and 'podcast'
//     for the audio lane, and 'audiobook' is not among them. A row whose
//     only secondary action would be refused is a control that cannot
//     act, and a control that cannot act must not occupy space.
//
// The chapter list — and every action that CAN act on a chapter — is on
// the book's own page, which is where the Music, Movie and Podcast rows
// send the user too.
//
// The cover follows the house artwork contract: the thumb shows the
// surface's OWN tile (a goldDim plate with the book glyph on it) until
// the image decodes, and the tile is dropped the moment it does. It used
// to be a bare glyph on the border colour with no plate at all, so a
// book with no cover was a hole in the list.

import React, {useMemo} from 'react';
import {TouchableOpacity, View} from 'react-native';
import {MediaImage} from '../../../components/utility/MediaImage';
import {useTheme} from '../../../theme';
import {AppText} from '../../../components/core/AppText/AppText';
import {SvgIcon} from '../../../components/utility/SvgIcon';
import {
  archiveImageUrl,
  archiveIdentifierFromUrl,
} from '../../../infrastructure/api/internetArchive/adapter';
import {createBookCardStyles} from '../styles';
import text from '../related/textContent.json';
import type {AudiobookResult} from '../../../types/api';

interface Props {
  item: AudiobookResult;
  onPress: (item: AudiobookResult) => void;
}

/**
 * The running time, in the app's one format for a duration this long.
 *
 * A book is hours, not minutes, so this is "3h 25m" and not "205:00" —
 * the Music row's `m:ss` is right for a track and absurd for a book.
 */
export function formatBookDuration(totalSeconds: number): string {
  if (!totalSeconds || totalSeconds <= 0) return '';
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.round((totalSeconds % 3600) / 60);
  if (h > 0) {
    return text.row.duration
      .replace('{hours}', String(h))
      .replace('{minutes}', String(m));
  }
  return text.row.minutes.replace('{minutes}', String(m));
}

export const BookCard: React.FC<Props> = React.memo(({item, onPress}) => {
  const {colors} = useTheme();
  const styles = useMemo(() => createBookCardStyles(colors), [colors]);

  // LibriVox does not send a cover url — the cover is the archive
  // item's own image, addressed by the archive identifier inside the
  // book's `url_iarchive` field.
  const identifier = archiveIdentifierFromUrl(item.urlIArchive);
  const cover = identifier ? archiveImageUrl(identifier) : '';

  const duration = formatBookDuration(item.totalTime);
  const subtitle = [item.language, duration].filter(Boolean).join(' · ');

  const thumbTile = (
    <View style={styles.thumbPlaceholder} testID="audiobook-artwork-placeholder">
      <SvgIcon name="headphones" size={22} color={colors.accent.gold} />
    </View>
  );

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => onPress(item)}
      accessibilityRole="button"
      accessibilityLabel={text.row.openA11y.replace('{title}', item.title)}
      style={styles.bookCard}>
      <View style={styles.thumbWrap}>
        {cover ? (
          <MediaImage
            source={cover}
            style={styles.thumbImage}
            resizeMode="cover"
            placeholder={thumbTile}
            accessibilityIgnoresInvertColors
            testID="audiobook-artwork-image"
          />
        ) : (
          thumbTile
        )}
      </View>

      <View style={styles.info}>
        <AppText variant="bodySmall" numberOfLines={1} style={styles.title}>
          {item.title}
        </AppText>
        {item.author ? (
          <AppText variant="caption" color="secondary" numberOfLines={1}>
            {item.author}
          </AppText>
        ) : null}
        {subtitle ? (
          <AppText variant="caption" color="tertiary" numberOfLines={1}>
            {subtitle}
          </AppText>
        ) : null}
      </View>

      <SvgIcon name="chevronRight" size={18} color={colors.text.tertiary} />
    </TouchableOpacity>
  );
});
