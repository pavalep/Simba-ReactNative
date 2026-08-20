import React from 'react';
import {View, StyleSheet, Dimensions} from 'react-native';
import {AppText} from '../../../../components/core/AppText/AppText';
import type {ColorTokens} from '../../../../theme/tokens';

const ART_SIZE = Math.min(Dimensions.get('window').width - 64, 280);

interface Props {
  albumArtUri: string | null | undefined;
  colors: ColorTokens;
}

export const AudioAlbumArt: React.FC<Props> = ({albumArtUri, colors}) => {
  if (albumArtUri) {
    return (
      <View style={styles.artContainer}>
        <View style={[styles.artFrame, {borderColor: colors.border.subtle}]}>
          <View style={[styles.artPlaceholder, {backgroundColor: colors.border.subtle}]}>
            <AppText style={[styles.artIcon, {color: colors.text.tertiary}]}>
              {'♫'}
            </AppText>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.artContainer}>
      <View style={[styles.artPlaceholder, {backgroundColor: colors.border.subtle}]}>
        <AppText style={[styles.artIcon, {color: colors.text.tertiary}]}>
          {'♫'}
        </AppText>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  artContainer: {
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 16,
  },
  artFrame: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 2,
  },
  artPlaceholder: {
    width: ART_SIZE,
    height: ART_SIZE,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  artIcon: {
    fontSize: 64,
  },
});
