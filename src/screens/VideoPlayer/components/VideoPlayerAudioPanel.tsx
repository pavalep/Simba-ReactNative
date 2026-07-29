import React, {useMemo} from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  FlatList,
} from 'react-native';
import {AppText} from '../../../components/core/AppText/AppText';
import {useTheme} from '../../../theme';
import {spacing} from '../../../theme/tokens';

// ─── Props ───────────────────────────────────────────────────

export interface VideoPlayerAudioPanelProps {
  audioTracks: Array<{
    id: number;
    title?: string;
    lang?: string;
    selected?: boolean;
  }>;
  activeAudioTrack: number | null;
  onSelectTrack: (trackId: number | null) => void;
}

// ─── Component ───────────────────────────────────────────────

export const VideoPlayerAudioPanel: React.FC<VideoPlayerAudioPanelProps> = ({
  audioTracks,
  activeAudioTrack,
  onSelectTrack,
}) => {
  const {colors} = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        scrollContent: {
          paddingHorizontal: spacing.lg,
          paddingBottom: spacing.xl,
        },
        trackRow: {
          flexDirection: 'row',
          alignItems: 'center',
          minHeight: 60,
          paddingVertical: spacing.sm,
          paddingHorizontal: spacing.sm,
          borderRadius: 14,
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
        selectedRow: {
          backgroundColor: colors.accent.goldDim,
        },
        emptyState: {
          paddingVertical: spacing.lg,
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
    <FlatList
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      data={audioTracks}
      keyExtractor={(item: {id: number}) => String(item.id)}
      ListHeaderComponent={
        <>
          {/* Disable audio option */}
          <TouchableOpacity
            style={[styles.trackRow, activeAudioTrack === null && styles.selectedRow]}
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
            style={[styles.trackRow, isSelected && styles.selectedRow]}
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
            {isSelected && <AppText variant="caption" color="accent">Selected</AppText>}
          </TouchableOpacity>
        );
      }}
      ListEmptyComponent={
        <View style={styles.emptyState}>
          <AppText variant="body2" color="secondary">No alternate audio tracks</AppText>
          <AppText variant="caption" color="tertiary">The default track is being used.</AppText>
        </View>
      }
    />
  );
};
