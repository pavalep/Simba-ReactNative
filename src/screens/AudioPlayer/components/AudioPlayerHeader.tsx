import React from 'react';
import {View, StyleSheet} from 'react-native';
import {BackButton} from '../../../components/utility/BackButton/BackButton';
import {AppText} from '../../../components/core/AppText/AppText';
import type {ColorTokens} from '../../../theme/tokens';

interface Props {
  onGoBack: () => void;
  insetsTop: number;
  colors: ColorTokens;
}

/**
 * Top bar for the full-screen audio player. Uses the canonical shared
 * BackButton (36px circular elevated target with the chevron back arrow)
 * so every internal page is consistent. The header floats over the album
 * art / gradient background and respects the top safe-area inset.
 */
export const AudioPlayerHeader: React.FC<Props> = ({onGoBack, insetsTop, colors: _colors}) => {
  return (
    <View style={[styles.header, {paddingTop: insetsTop}]}>
      <BackButton onPress={onGoBack} />
      <AppText variant="h3" color="primary" style={styles.headerTitle}>
        Now Playing
      </AppText>
      {/* Right spacer keeps the title visually centred, matching the 36px
          width of the BackButton on the left. */}
      <View style={{width: 36}} />
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 48,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 8,
  },
});
