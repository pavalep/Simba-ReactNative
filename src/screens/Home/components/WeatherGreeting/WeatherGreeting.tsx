// ─── WeatherGreeting (P66) ────────────────────────────────
// The Home page's hero greeting block, now a single card surface
// that fuses the time-of-day greeting, the weather chip, and the
// caption into one composition.
//
// Layout:
//
//   ┌───────────────────────────────────────────────┐
//   │  [chip]  Good evening, Paval                  │
//   │          Mainly clear in San Jose · 15°        │
//   └───────────────────────────────────────────────┘
//
// Why a single card (P66):
//   • P62's split layout (h2 above + chip below) read as two
//     unrelated rows. The user wanted the greeting to be PART OF
//     the weather display, not a header for it.
//   • A single card reads as one phrase — Spotify / Apple Music
//     also surface the weather line as a single inline capsule.
//   • The card is always present (even before the snapshot
//     lands). On first cold load the chip is a tinted
//     placeholder and the caption reads "Fetching weather
//     information…" so the user never sees an empty rectangle.
//   • The chip itself carries the Lottie — same P65 two-layer
//     scene composition (background Meteocons scene + foreground
//     glyph) so the card "breathes" instead of being a sticker.
//
// P66 also persisted the last successful snapshot, so the
// cached chip + caption render immediately on cold start while
// the fresh fetch runs in the background. No flash of empty
// card.

import React, {memo} from 'react';
import {View, StyleSheet, ActivityIndicator} from 'react-native';
import {AppText} from '../../../../components/core/AppText/AppText';
import {WeatherChip} from '../../../../components/utility/WeatherIcon';
import {useTheme} from '../../../../theme';
import {spacing, radius} from '../../../../theme/tokens';
import type {WeatherGreetingProps} from './WeatherGreeting.types';

const WeatherGreetingComponent: React.FC<WeatherGreetingProps> = ({
  text,
  firstName,
  condition,
  caption,
  isFetching = false,
}) => {
  const {colors} = useTheme();

  // The card surface matches the CategoryCard's elevated surface
  // (P55–P59) so the Home page reads as one visual language.
  // We use a slightly warmer tint than surface.elevated so the
  // greeting feels like a hero element, not just another rail.
  const cardStyle = [
    styles.card,
    {
      backgroundColor: colors.background.elevated,
      borderColor: colors.border.subtle,
    },
  ];

  // When we don't have a snapshot yet, show a muted loading
  // caption with a small spinner so the user knows data is
  // coming. The chip itself still renders (tinted, no Lottie
  // glyph) so the card silhouette stays stable.
  const showLoadingCaption = !caption && isFetching;
  const showLiveCaption = !!caption;
  const showNothing = !caption && !isFetching;

  return (
    <View style={styles.section}>
      <View
        style={cardStyle}
        accessibilityRole="summary"
        accessibilityLabel={
          showLiveCaption
            ? `${text} ${firstName}. ${caption}`
            : `${text} ${firstName}. Fetching weather information.`
        }>
        <WeatherChip condition={condition} style={styles.chip} />

        <View style={styles.textCol}>
          {/* v7 greeting: Cormorant Garamond prefix (displaySerif,
              inline fontSize 28 per spec §10 — one tier smaller than
              the user name so the Inter name reads as the dominant
              word), then Inter Bold gold for the user name. */}
          <AppText
            variant="displaySerif"
            color="primary"
            style={styles.greeting}
            numberOfLines={1}
            accessibilityRole="header">
            {text},{' '}
            <AppText variant="h2" color="accent" style={styles.greetingName}>
              {firstName}
            </AppText>
          </AppText>

          {showLiveCaption && (
            <AppText
              variant="body2"
              color="secondary"
              style={styles.caption}
              numberOfLines={1}>
              {caption}
            </AppText>
          )}

          {showLoadingCaption && (
            <View style={styles.loadingRow}>
              <ActivityIndicator
                size="small"
                color={colors.text.secondary}
                style={styles.spinner}
              />
              <AppText
                variant="body2"
                color="secondary"
                style={styles.caption}>
                Fetching weather information…
              </AppText>
            </View>
          )}

          {showNothing && (
            <AppText
              variant="body2"
              color="tertiary"
              style={styles.caption}
              numberOfLines={1}>
              Weather unavailable
            </AppText>
          )}
        </View>
      </View>
    </View>
  );
};

export const WeatherGreeting = memo(WeatherGreetingComponent);
WeatherGreeting.displayName = 'WeatherGreeting';

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    paddingBottom: spacing.md,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.md,
  },
  chip: {
    // The chip is 56×56 by default; the card height is dictated
    // by the chip + 2× spacing.md padding. No flex on the chip
    // so it stays a fixed square.
  },
  textCol: {
    flex: 1,
    minWidth: 0, // allow text to shrink below intrinsic content
  },
  greeting: {
    // v7: greeting prefix uses Cormorant Garamond (displaySerif).
    // The fontSize 28 override is per spec §10 — one tier smaller
    // than the user name (Inter h2 = 24 / displaySerif token = 48).
    // The token's fontFamily + lineHeight supply the rest; the inline
    // fontWeight is removed because the token already provides 700.
    fontSize: 28,
    lineHeight: 36,
  },
  // v8: NO fontWeight override. The h2 typography token
  // now maps to FONT_FAMILY.inter.bold (Inter-Bold.ttf
  // deterministically). Slight negative letterSpacing so
  // the gold user name reads tightly against the Cormorant
  // greeting prefix.
  greetingName: {
    letterSpacing: -0.5,
  },
  caption: {
    fontWeight: '500',
    letterSpacing: 0.1,
    marginTop: 2,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  spinner: {
    marginRight: spacing.xs,
  },
});
