import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {darkColors as cinemaColors} from '../../../../theme/tokens';
import {FONT_FAMILY} from '../../../../constants/fontFamily';
import strings from '../../../../constants/strings';

/**
 * v11 T9.2 \u2014 Resume prompt card.
 *
 * Per spec \u00a74.11: when the user reopens a partially-watched
 * video (saved position > 30 s AND < duration \u2212 60 s, no
 * explicit deep-link `startPosition`, not a live source), the
 * player loads at 0, paused, AND overlays this card. The card
 * offers two choices:
 *   - "Resume"   \u2014 seek to the saved position and play.
 *   - "Start over" \u2014 dismiss the card and play from 0.
 *
 * 8 s auto-"Start over" timer is handled by the host (T9.2
 * step 2). This component is purely presentational: the
 * parent owns the visibility + the timers.
 */
export interface VideoResumePromptProps {
  readonly savedPosition: number;
  readonly onResume: () => void;
  readonly onStartOver: () => void;
  readonly testID?: string;
}

const HOURS = 3600;
const MINUTES = 60;

function formatHms(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '--:--';
  const total = Math.floor(seconds);
  const h = Math.floor(total / HOURS);
  const m = Math.floor((total % HOURS) / MINUTES);
  const s = total % MINUTES;
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${m}:${String(s).padStart(2, '0')}`;
}

export function VideoResumePrompt({
  savedPosition,
  onResume,
  onStartOver,
  testID,
}: VideoResumePromptProps) {
  return (
    <View
      pointerEvents="box-none"
      style={styles.host}
      testID={testID ?? 'videoResumePrompt'}
    >
      <View style={styles.card}>
        <Text style={styles.title} numberOfLines={1}>
          {strings.videoResumeTitle}
        </Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          {strings.videoResumeSubtitle.replace(
            '{time}',
            formatHms(savedPosition),
          )}
        </Text>
        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={strings.videoResumeAction}
            onPress={onResume}
            testID="videoResumePrompt:resume"
            style={({pressed}) => [
              styles.primary,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.primaryText}>
              {strings.videoResumeAction}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={strings.videoStartOverAction}
            onPress={onStartOver}
            testID="videoResumePrompt:startOver"
            style={({pressed}) => [
              styles.ghost,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.ghostText}>
              {strings.videoStartOverAction}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 32,
    alignItems: 'center',
  },
  card: {
    minWidth: 280,
    maxWidth: 360,
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: cinemaColors.background.scrimStrong,
    borderWidth: 1,
    borderColor: cinemaColors.accent.goldDim,
  },
  title: {
    color: cinemaColors.text.bright,
    fontSize: 14,
    lineHeight: 18,
    fontFamily: FONT_FAMILY.inter.bold,
    marginBottom: 4,
  },
  subtitle: {
    color: cinemaColors.text.onMediaSoft,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: FONT_FAMILY.inter.regular,
    marginBottom: 12,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  primary: {
    flex: 1,
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: cinemaColors.accent.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: {
    color: cinemaColors.text.primary,
    fontSize: 13,
    lineHeight: 16,
    fontFamily: FONT_FAMILY.inter.bold,
    letterSpacing: 0.2,
  },
  ghost: {
    flex: 1,
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: cinemaColors.border.emphasis,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostText: {
    color: cinemaColors.text.bright,
    fontSize: 13,
    lineHeight: 16,
    fontFamily: FONT_FAMILY.inter.regular,
  },
  pressed: {
    opacity: 0.7,
  },
});
