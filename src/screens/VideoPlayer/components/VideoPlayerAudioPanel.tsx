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
  );
};
