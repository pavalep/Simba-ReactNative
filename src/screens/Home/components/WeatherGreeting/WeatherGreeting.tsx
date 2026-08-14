// ─── WeatherGreeting (P66) ────────────────────────────────
// The Home page's hero greeting block, now a single card surface
// that fuses the time-of-day greeting, the weather chip, and the
// weather detail into one composition.
//
// Layout (v9g — 3-column, nothing sits directly under the name):
//
//   ┌───────────────────────────────────────────────┐
//   │  [chip]  Good evening                  25°    │
//   │          Paval                       Clear in │
//   │                                       London   │
//   └───────────────────────────────────────────────┘
//
// Why a 3-column layout (v9g):
//   The previous "3-line stacked" layout put the weather caption
//   directly below the name in the same column — even when the
//   caption was right-aligned, it still read as "under the name"
//   vertically. v9g splits the card into three discrete columns:
//
//     ┌──────┬─────────────────────────┬──────────┐
//     │ chip │ greeting (left-aligned) │ weather  │
//     │      │  • "Good evening"       │  (right- │
//     │      │  • Paval (hero)         │  aligned)│
//     └──────┴─────────────────────────┴──────────┘
//
//   The greeting column owns the name as its hero. The weather
//   column is structurally separate — it can never "be under" the
//   name because they live in different columns. The temperature
//   is the focal point of the weather column (Inter Bold 26 px,
//   primary text) with the description + city as a small secondary
//   line below it.
//
// Why a single card (P66):
//   • P62's split layout (h2 above + chip below) read as two
//     unrelated rows. The user wanted the greeting to be PART OF
//     the weather display, not a header for it.
//   • A single card reads as one phrase — Spotify / Apple Music
//     also surface the weather line as a single inline capsule.
//   • The card is always present (even before the snapshot
//     lands). On first cold load the chip is a tinted
//     placeholder and the right column reads "Fetching…" so
//     the user never sees an empty rectangle.
//   • The chip itself carries the Lottie — same P65 two-layer
//     scene composition (background Meteocons scene + foreground
//     glyph) so the card "breathes" instead of being a sticker.
//
// P66 also persisted the last successful snapshot, so the
// cached weather renders immediately on cold start while the
// fresh fetch runs in the background. No flash of empty card.
//
// v9g: long-name handling. The greeting column has the full
// text column width (less the weather column on the right), so
// the name shrinks adaptively 22–32 px based on firstName.length.
// Tiers are tuned so:
//   ≤ 6 chars  (Paval, Maria, 田中)    → 32 px
//   7–10 chars (Sundar, Abdul, 鈴木)  → 30 px
//   11–14 chars (Christopher, José)     → 28 px
//   15–18 chars (Bartholomew)           → 26 px
//   19+ chars                            → 22 px + ellipsis

import React, {memo} from 'react';
import {View, StyleSheet, ActivityIndicator} from 'react-native';
import {AppText} from '../../../../components/core/AppText/AppText';
import {WeatherChip} from '../../../../components/utility/WeatherIcon';
import {useTheme} from '../../../../theme';
import {spacing, radius} from '../../../../theme/tokens';
import {FONT_FAMILY} from '../../../../constants/fontFamily';
import type {WeatherGreetingProps} from './WeatherGreeting.types';

const WeatherGreetingComponent: React.FC<WeatherGreetingProps> = ({
  text,
  firstName,
  condition,
  weather,
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

  // v9g: which right-column state to render.
  //   • snapshot available → temperature + description
  //   • first cold load in flight + no cache → "Fetching…"
  //   • no snapshot + not loading (e.g. fetch failed) → "Weather unavailable"
  const showLiveWeather = !!weather;
  const showLoading = !weather && isFetching;
  const showUnavailable = !weather && !isFetching;

  // v9g: adaptive name font size. The greeting column has the
  // full available width (the weather column is fixed-width
  // and right-aligned), so the name tiers are tuned larger:
  //   ≤ 6 chars  (Paval, Maria, 田中)    → 32 px
  //   7–10 chars (Sundar, Abdul, 鈴木)  → 30 px
  //   11–14 chars (Christopher, José)     → 28 px
  //   15–18 chars (Bartholomew)           → 26 px
  //   19+ chars                            → 22 px + ellipsis
  const nameLen = firstName.length;
  const nameFontSize =
    nameLen <= 6 ? 32 :
    nameLen <= 10 ? 30 :
    nameLen <= 14 ? 28 :
    nameLen <= 18 ? 26 : 22;

  return (
    <View style={styles.section}>
      <View
        style={cardStyle}
        accessibilityRole="summary"
        accessibilityLabel={
          showLiveWeather
            ? `${text} ${firstName}. ${weather?.temperatureC} degrees, ${weather?.description} in ${weather?.cityName}.`
            : `${text} ${firstName}. Weather information loading.`
        }>
        {/* Left: weather chip. Always renders (tinted if no
            snapshot) so the card silhouette stays stable. */}
        <WeatherChip condition={condition} style={styles.chip} />

        {/* Middle: greeting column. Owns the name as its hero. */}
        <View style={styles.greetingCol}>
          <AppText
            color="primary"
            style={styles.greetingPrefix}
            numberOfLines={1}>
            {text},
          </AppText>

          <AppText
            color="accent"
            style={[styles.greetingName, {fontSize: nameFontSize}]}
            numberOfLines={1}
            ellipsizeMode="tail">
            {firstName}
          </AppText>
        </View>

        {/* Right: weather column. Structurally separate from the
            greeting column — never sits "under" the name.
            Right-aligned so the temperature anchors to the
            right edge of the card. */}
        <View style={styles.weatherCol}>
          {showLiveWeather && (
            <>
              <AppText
                style={styles.temperature}
                numberOfLines={1}>
                {weather!.temperatureC}°
              </AppText>
              <AppText
                variant="bodySmall"
                color="secondary"
                style={styles.weatherDescription}
                numberOfLines={2}>
                {weather!.description} in{'\n'}{weather!.cityName}
              </AppText>
            </>
          )}

          {showLoading && (
            <View style={styles.loadingRow}>
              <ActivityIndicator
                size="small"
                color={colors.text.secondary}
                style={styles.spinner}
              />
              <AppText
                variant="bodySmall"
                color="secondary"
                style={styles.weatherDescription}
                numberOfLines={1}>
                Fetching…
              </AppText>
            </View>
          )}

          {showUnavailable && (
            <AppText
              variant="bodySmall"
              color="tertiary"
              style={styles.weatherDescription}
              numberOfLines={2}>
              Weather{'\n'}unavailable
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
  // v9g: section uses `paddingHorizontal: spacing.md` (12 px)
  // so the greeting card aligns with the content cards in the
  // rails below (MovieCategoriesShelf, MusicCategoriesShelf,
  // etc. all use `paddingHorizontal: spacing.md` for their
  // horizontal scroll content). Page-level labels (the rail
  // titles "Movies", "Recently Played" and the "Your Library"
  // / "Discover" dividers) sit one tier further out at
  // `spacing.lg` (16 px) — that's the label gutter. The
  // greeting card is content, not a label, so it lives in the
  // content gutter.
  section: {
    paddingHorizontal: spacing.md,
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
    // The chip is 56×56 by default. No flex on the chip
    // so it stays a fixed square.
  },
  // v9g: greeting column. Takes the remaining space after
  // the chip and the weather column. The name sits at the
  // left of the column (no flex-end on the column) so the
  // greeting reads as anchored to the chip.
  greetingCol: {
    flex: 1,
    minWidth: 0,
    alignItems: 'flex-start',
  },
  // v9g: small editorial prefix. Cormorant Garamond Italic
  // at 16 px — a quiet accent above the name, not a
  // competing heading. Primary text color (not gold) so
  // the name is the only gold element on the card.
  greetingPrefix: {
    fontFamily: FONT_FAMILY.cormorant.italic,
    fontSize: 16,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  // v9g: the hero. Inter Bold gold, fontSize is adaptive
  // based on firstName.length (see tiers above). Tight
  // letter-spacing so the name reads as a single bold
  // word. marginTop creates the gap from the prefix.
  greetingName: {
    fontFamily: FONT_FAMILY.inter.bold,
    letterSpacing: -0.5,
    marginTop: 2,
  },
  // v9g: weather column. Right-aligned so the temperature
  // anchors to the right edge of the card. No flex, so the
  // column takes only the width it needs (the temperature
  // string + the description/city below). This means the
  // greeting column gets the maximum available width for
  // the name.
  weatherCol: {
    alignItems: 'flex-end',
    maxWidth: 120, // cap so a long city name doesn't push the chip
  },
  // v9g: temperature is the focal point of the weather
  // column. Inter Bold, primary text (not gold — gold is
  // reserved for the name as the page's primary focal
  // point). Slightly larger than the h2 token so it
  // reads as a "stat" next to the greeting.
  temperature: {
    fontFamily: FONT_FAMILY.inter.bold,
    fontSize: 26,
    lineHeight: 30,
    color: undefined, // explicit; AppText passes color through
  },
  // v9g: small description under the temperature. The
  // newline breaks "Clear in" / "London" onto two lines
  // so the column stays narrow (the cap on weatherCol
  // keeps the chip in place).
  weatherDescription: {
    marginTop: 2,
    textAlign: 'right',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  spinner: {
    marginRight: spacing.xs,
  },
});
