import React from 'react';
import {View, StyleSheet} from 'react-native';
import {AppText} from '../../../components/core/AppText/AppText';
import {getFileName} from '../../../services/fileService';
import type {ColorTokens} from '../../../theme/tokens';

interface Props {
  title: string;
  artist: string | undefined;
  album: string | undefined;
  fileUri: string;
  colors: ColorTokens;
}

export const AudioTrackInfo: React.FC<Props> = ({title, artist, album, fileUri, colors}) => {
  return (
    <View style={styles.infoContainer}>
      <AppText variant="h2" color="primary" style={styles.trackTitle} numberOfLines={1}>
        {title}
      </AppText>
      {artist ? (
        <AppText variant="body1" color="secondary" numberOfLines={1}>
          {artist}{album ? ` · ${album}` : ''}
        </AppText>
      ) : (
        <AppText variant="body2" color="secondary" numberOfLines={1}>
          {getFileName(fileUri ?? '')}
        </AppText>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  infoContainer: {
    alignItems: 'center',
    paddingHorizontal: 32,
    marginBottom: 24,
  },
  trackTitle: {
    marginBottom: 4,
    textAlign: 'center',
  },
});
