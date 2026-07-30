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

const ITEM_HEIGHT = 76;

// ─── Props ───────────────────────────────────────────────────

export interface VideoPlayerAudioPanelProps {
  audioTracks: Array<{
    id: number;
    title?: string;
    lang?: string;
    codec?: string;
    selected?: boolean;
  }>;
  activeAudioTrack: number | null;
  onSelectTrack: (trackId: number | null) => void;
}

/** Map language code → flag emoji for common languages */
function langFlag(lang?: string): string {
  if (!lang) return '';
  const map: Record<string, string> = {
    eng: '🇬🇧', en: '🇬🇧',
    jpn: '🇯🇵', ja: '🇯🇵',
    kor: '🇰🇷', ko: '🇰🇷',
    chi: '🇨🇳', zh: '🇨🇳',
    fre: '🇫🇷', fr: '🇫🇷',
    ger: '🇩🇪', de: '🇩🇪',
    spa: '🇪🇸', es: '🇪🇸',
    por: '🇵🇹', pt: '🇵🇹',
    rus: '🇷🇺', ru: '🇷🇺',
    ara: '🇸🇦', ar: '🇸🇦',
    hin: '🇮🇳', hi: '🇮🇳',
    ita: '🇮🇹', it: '🇮🇹',
    dut: '🇳🇱', nl: '🇳🇱',
    pol: '🇵🇱', pl: '🇵🇱',
    tur: '🇹🇷', tr: '🇹🇷',
  };
  return map[lang.toLowerCase()] ?? '';
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
          borderWidth: 1,
          borderColor: colors.accent.gold,
        },
        codecBadge: {
          paddingHorizontal: 6,
          paddingVertical: 2,
          borderRadius: 4,
          backgroundColor: colors.border.subtle,
          marginLeft: spacing.sm,
        },
        emptyState: {
          paddingVertical: spacing.lg,
        },
        divider: {
          height: 1,
          backgroundColor: colors.border.subtle,
          marginVertical: spacing.xs,
        },
        row: {
          flexDirection: 'row',
          alignItems: 'center',
        },
        flagStyle: {
          marginRight: 6,
          fontSize: 16,
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
      getItemLayout={(_, index) => ({length: ITEM_HEIGHT, offset: ITEM_HEIGHT * index, index})}
      windowSize={5}
      maxToRenderPerBatch={10}
      removeClippedSubviews={true}
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
        const flag = langFlag(track.lang);
        return (
          <TouchableOpacity
            style={[styles.trackRow, isSelected && styles.selectedRow]}
            onPress={() => onSelectTrack(track.id)}>
            <View
              style={isSelected ? styles.radioFilled : styles.radioOuter}
            />
            <View style={styles.trackInfo}>
              <View style={styles.row}>
                {flag ? (
                  <AppText style={styles.flagStyle}>
                    {flag}
                  </AppText>
                ) : null}
                <AppText variant="body2" color="primary">
                  {track.title || `Track ${track.id}`}
                </AppText>
                {track.codec ? (
                  <AppText variant="caption" color="tertiary" style={styles.codecBadge}>
                    {track.codec.toUpperCase()}
                  </AppText>
                ) : null}
              </View>
              {track.lang ? (
                <AppText variant="caption" color="secondary">
                  {flag ? `${track.lang}` : track.lang}
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
