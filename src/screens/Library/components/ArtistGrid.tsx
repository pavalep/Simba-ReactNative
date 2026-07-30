import React from 'react';
import {View, ScrollView, StyleSheet} from 'react-native';
import {useTheme} from '../../../theme';
import {useAppSelector} from '../../../store';
import {selectArtists} from '../../../store/slices/mediaSlice';
import {AppText} from '../../../components/core/AppText/AppText';
import {AppCard} from '../../../components/core/AppCard/AppCard';
import {SvgIcon} from '../../../components/utility/SvgIcon';
import {spacing, radius} from '../../../theme/tokens';

interface ArtistGridProps {
  onArtistPress: (artistName: string) => void;
}

export const ArtistGrid: React.FC<ArtistGridProps> = ({onArtistPress}) => {
  const {colors} = useTheme();
  const artists = useAppSelector(selectArtists);

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <View style={styles.grid}>
        {artists.map(artist => (
          <AppCard
            key={artist.name}
            elevated
            onPress={() => onArtistPress(artist.name)}
            style={styles.card}>
            {/* Artist avatar circle */}
            <View
              style={[
                styles.avatar,
                {backgroundColor: colors.accent.goldDim},
              ]}>
              <SvgIcon
                name="headphones"
                size={24}
                color={colors.accent.gold}
              />
            </View>
            <View style={styles.info}>
              <AppText
                variant="body2"
                color="primary"
                numberOfLines={1}
                style={styles.name}>
                {artist.name}
              </AppText>
              <AppText variant="caption" color="tertiary">
                {artist.albumCount}{' '}
                {artist.albumCount === 1 ? 'album' : 'albums'}
                {' · '}
                {artist.trackCount}{' '}
                {artist.trackCount === 1 ? 'track' : 'tracks'}
              </AppText>
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
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  info: {
    flex: 1,
  },
  name: {
    fontWeight: '600',
    marginBottom: 2,
  },
});
