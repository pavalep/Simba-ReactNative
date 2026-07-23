import React, {useMemo} from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  SafeAreaView,
} from 'react-native';
import {AppText} from '../../../components/core/AppText/AppText';
import {useTheme} from '../../../theme';
import {spacing, radius} from '../../../theme/tokens';

// ─── Props ───────────────────────────────────────────────────

export interface PlayerAudioPanelProps {
  audioTracks: Array<{
    id: number;
    title?: string;
    lang?: string;
    selected?: boolean;
  }>;
  activeAudioTrack: number | null;
  onSelectTrack: (trackId: number | null) => void;
  onClose: () => void;
}

// ─── Component ───────────────────────────────────────────────

export const PlayerAudioPanel: React.FC<PlayerAudioPanelProps> = ({
  audioTracks,
  activeAudioTrack,
  onSelectTrack,
  onClose,
}) => {
  const {colors} = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        overlay: {
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: colors.background.overlay,
          zIndex: 50,
          justifyContent: 'flex-end',
        },
        panel: {
          backgroundColor: colors.background.elevated,
          borderTopLeftRadius: radius.lg,
          borderTopRightRadius: radius.lg,
          paddingBottom: spacing.xxl,
          maxHeight: '70%',
        },
        handleRow: {
          alignItems: 'center',
          paddingTop: spacing.sm,
          paddingBottom: spacing.xs,
        },
        handle: {
          width: 16,
          height: 4,
          borderRadius: 2,
          backgroundColor: colors.border.emphasis,
        },
        header: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.md,
        },
        closeBtn: {
          width: 32,
          height: 32,
          borderRadius: 16,
          alignItems: 'center',
          justifyContent: 'center',
        },
        scrollContent: {
          paddingHorizontal: spacing.lg,
        },
        trackRow: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: spacing.sm,
        },
        radioOuter: {
          width: 16,
          height: 16,
          borderRadius: 8,
          borderWidth: 2,
          borderColor: colors.border.subtle,
          alignItems: 'center',
          justifyContent: 'center',
        },
        radioFilled: {
          width: 16,
          height: 16,
          borderRadius: 8,
          backgroundColor: colors.accent.gold,
        },
        trackInfo: {
          flex: 1,
          marginLeft: spacing.md,
        },
        trackIdText: {
          marginLeft: spacing.sm,
        },
        divider: {
          height: 1,
          backgroundColor: colors.border.subtle,
          marginVertical: spacing.xs,
        },
      }),
    [colors],
  );

  return (
    <SafeAreaView style={styles.overlay}>
      <TouchableOpacity
        style={StyleSheet.absoluteFill}
        activeOpacity={1}
        onPress={onClose}
      />
      <View style={styles.panel}>
        {/* Handle bar */}
        <View style={styles.handleRow}>
          <View style={styles.handle} />
        </View>

        {/* Header */}
        <View style={styles.header}>
          <AppText variant="h3" color="primary">
            Audio Tracks
          </AppText>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <AppText variant="body1" color="secondary">
              ✕
            </AppText>
          </TouchableOpacity>
        </View>

        <FlatList
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          data={audioTracks}
          keyExtractor={(item: {id: number}) => String(item.id)}
          ListHeaderComponent={
            <>
              {/* Disable audio option */}
              <TouchableOpacity
                style={styles.trackRow}
                onPress={() => onSelectTrack(null)}>
                <View
                  style={
                    activeAudioTrack === null
                      ? styles.radioFilled
                      : styles.radioOuter
                  }
                />
                <View style={styles.trackInfo}>
                  <AppText variant="body2" color="primary">
                    Disable audio
                  </AppText>
                </View>
              </TouchableOpacity>

              <View style={styles.divider} />
            </>
          }
          renderItem={({item: track}) => {
            const isSelected = track.id === activeAudioTrack;
            return (
              <TouchableOpacity
                style={styles.trackRow}
                onPress={() => onSelectTrack(track.id)}>
                <View
                  style={isSelected ? styles.radioFilled : styles.radioOuter}
                />
                <View style={styles.trackInfo}>
                  <AppText variant="body2" color="primary">
                    {track.title || `Track ${track.id}`}
                  </AppText>
                  {track.lang ? (
                    <AppText variant="caption" color="secondary">
                      {track.lang}
                    </AppText>
                  ) : null}
                </View>
                <AppText
                  variant="caption"
                  color="secondary"
                  style={styles.trackIdText}>
                  #{track.id}
                </AppText>
              </TouchableOpacity>
            );
          }}
        />
      </View>
    </SafeAreaView>
  );
};
