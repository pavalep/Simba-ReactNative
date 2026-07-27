import React from 'react';
import {View, ScrollView, StyleSheet} from 'react-native';
import {useTheme} from '../../../theme';
import {useAppSelector} from '../../../store';
import {selectAlbums} from '../../../store/slices/mediaSlice';
import {AppText} from '../../../components/core/AppText/AppText';
import {AppCard} from '../../../components/core/AppCard/AppCard';
import {SvgIcon} from '../../../components/utility/SvgIcon';
import {spacing, radius} from '../../../theme/tokens';

interface AlbumGridProps {
  onAlbumPress: (albumTitle: string, artistName: string) => void;
}

function formatTotalDuration(seconds: number): string {
  if (seconds <= 0) return '';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hrs > 0) return `${hrs}h ${mins}m`;
  return `${mins}m`;
}

export const AlbumGrid: React.FC<AlbumGridProps> = ({onAlbumPress}) => {
  const {colors} = useTheme();
  const albums = useAppSelector(selectAlbums);

  if (albums.length === 0) return null;

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <View style={styles.grid}>
        {albums.map(album => (
          <AppCard
            key={`${album.artist}|${album.title}`}
            elevated
            onPress={() => onAlbumPress(album.title, album.artist)}
            style={styles.card}>
            {/* Album art placeholder */}
            <View
              style={[
                styles.art,
                {backgroundColor: colors.accent.goldDim},
              ]}>
              <SvgIcon
                name="listMusic"
                size={24}
                color={colors.accent.gold}
              />
            </View>
            <View style={styles.info}>
              <AppText
                variant="body2"
                color="primary"
                numberOfLines={1}
                style={styles.title}>
                {album.title}
              </AppText>
              <AppText
                variant="caption"
                color="secondary"
                numberOfLines={1}
                style={styles.artist}>
                {album.artist}
              </AppText>
              <View style={styles.metaRow}>
                {album.year > 0 && (
                  <AppText variant="caption" color="tertiary">
                    {album.year}
                  </AppText>
                )}
                <AppText variant="caption" color="tertiary">
                  {album.trackCount}{' '}
                  {album.trackCount === 1 ? 'track' : 'tracks'}
                </AppText>
                {album.totalDuration > 0 && (
                  <AppText variant="caption" color="tertiary">
                    {formatTotalDuration(album.totalDuration)}
                  </AppText>
                )}
              </View>
            </View>
          </AppCard>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  grid: {
    gap: 10,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  art: {
    width: 48,
    height: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  info: {
    flex: 1,
  },
  title: {
    fontWeight: '600',
    marginBottom: 1,
  },
  artist: {
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 8,
  },
});
