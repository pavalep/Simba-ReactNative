import React from 'react';
import {View, TouchableOpacity, StyleSheet} from 'react-native';
import {SvgIcon} from '../../../components/utility/SvgIcon';
import {AppText} from '../../../components/core/AppText/AppText';
import type {ColorTokens} from '../../../theme/tokens';

interface Props {
  onGoBack: () => void;
  insetsTop: number;
  colors: ColorTokens;
}

export const AudioPlayerHeader: React.FC<Props> = ({onGoBack, insetsTop, colors}) => {
  return (
    <View style={[styles.header, {paddingTop: insetsTop}]}>
      <TouchableOpacity
        style={[styles.headerBtn, {backgroundColor: colors.border.subtle}]}
        onPress={onGoBack}
        activeOpacity={0.7}
        accessibilityLabel="Go back"
        accessibilityRole="button">
        <SvgIcon name="chevronDown" size={20} color={colors.text.primary} />
      </TouchableOpacity>
      <AppText variant="h3" color="primary" style={styles.headerTitle}>
        Now Playing
      </AppText>
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
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    marginRight: 36,
  },
});
