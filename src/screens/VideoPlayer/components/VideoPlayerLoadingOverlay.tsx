import React, {useMemo} from 'react';
import {View, StyleSheet, TouchableOpacity} from 'react-native';
import {AppText} from '../../../components/core/AppText/AppText';
import {useTheme} from '../../../theme';
import {ActivityOrb} from '../../../components/feedback/ActivityOrb/ActivityOrb';
import {SvgIcon} from '../../../components/utility/SvgIcon';


// ─── Props ───────────────────────────────────────────────────

export interface VideoPlayerLoadingOverlayProps {
  visible: boolean;
  message?: string;
  /** V5: optional back button — shown top-left so users can exit even
   *  while the player is initializing (no other UI is visible at that point). */
  onBack?: () => void;
}

// ─── Component ───────────────────────────────────────────────

export const VideoPlayerLoadingOverlay: React.FC<VideoPlayerLoadingOverlayProps> = ({
  visible,
  message = 'Loading…',
  onBack,
}) => {
  const {colors} = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        overlay: {
          ...StyleSheet.absoluteFill,
          // Translucent dark background overlay: allows top bar and bottom controls to stay rendered on top (zIndex > 6)
          backgroundColor: 'rgba(0,0,0,0.75)',
          zIndex: 6,
        },
        content: {
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
        },
        spinner: {
          marginBottom: 14,
        },
        message: {
          textAlign: 'center',
          fontSize: 14,
          letterSpacing: 0.4,
          fontWeight: '500',
        },
        backButton: {
          position: 'absolute',
          top: 16,
          left: 16,
          width: 36,
          height: 36,
          borderRadius: 18,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.background.scrimFaint,
          zIndex: 10,
        },
      }),
    [colors],
  );

  if (!visible) {
    return null;
  }

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      {/* V5 / V6.5: canonical chevron back arrow — lets the user exit even
          while the player is initializing (the top bar isn't shown yet at
          this point). Sits above the dim scrim so the icon stays legible. */}
      {onBack && (
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack}
          activeOpacity={0.7}
          accessibilityLabel="Go back"
          accessibilityRole="button"
          hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
          <SvgIcon
            name="chevronRight"
            size={20}
            color="#FFFFFF"
            style={{transform: [{rotate: '180deg'}]}}
          />
        </TouchableOpacity>
      )}
      <View style={styles.content} pointerEvents="none">
        <View style={styles.spinner}>
          <ActivityOrb size={48} />
        </View>
        <AppText variant="body1" color="onMediaSoft" style={styles.message}>
          {message}
        </AppText>
      </View>
    </View>
  );
};
