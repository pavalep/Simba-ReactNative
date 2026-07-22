import React, {useMemo} from 'react';
import {View, StyleSheet} from 'react-native';
import {AppText} from '../../../components/core/AppText/AppText';
import {useTheme} from '../../../theme';
import {spacing, radius} from '../../../theme/tokens';

// ─── Props ───────────────────────────────────────────────────

export interface PlayerLoadingOverlayProps {
  visible: boolean;
  message?: string;
}

// ─── Component ───────────────────────────────────────────────

export const PlayerLoadingOverlay: React.FC<PlayerLoadingOverlayProps> = ({
  visible,
  message = 'Loading…',
}) => {
  const {colors} = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        overlay: {
          ...StyleSheet.absoluteFill,
          backgroundColor: colors.background.overlay,
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 50,
        },
      }),
    [colors],
  );

  if (!visible) {
    return null;
  }

  return (
    <View style={styles.overlay}>
      <AppText variant="body1" color="primary">
        {message}
      </AppText>
    </View>
  );
};
