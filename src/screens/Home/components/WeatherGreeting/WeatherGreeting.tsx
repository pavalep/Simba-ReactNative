// ─── WeatherGreeting (P66) ────────────────────────────────
// The Home page's greeting block.
//
// V2: NOT IN A BOX.
//
// V1 drew it as a 96 dp elevated card with three columns — chip,
// greeting, weather — and the card wrapped a sentence in a rectangle.
// The weather column took a third of the width away from the name, and
// the app's own comment on that layout says the split exists so the
// caption can never sit "under" the name.
//
// V2 answers it differently: the greeting is NOT in a box, the NAME is
// the only large type on the page, and the weather is ONE quiet line
// underneath it — a footnote can never compete with a 32 px gold name.
// The chip moves to the top right, where it is an accent and not a
// third column.
//
//   ┌──────────────────────────────────────────────┐
//   │  Good afternoon,                       ◍     │
//   │  Paval                                      │
//   │  Mainly clear in San Jose · 11°              │
//   └──────────────────────────────────────────────┘
//
// THE CHIP AND THE WEATHER LINE EXIST ONLY WHEN THERE IS WEATHER.
//
// The app's own rule (v9h) is that the chip is drawn only when there
// is a real snapshot behind it — a tinted placeholder for weather that
// does not exist is a lie. V2 extends the same rule to the LINE: while
// the first fetch is in flight, the greeting shows the salutation and
// the name, and nothing else. No chip, no line, no "Fetching…" row.
//
// v9g: long-name handling. The name's font size is adaptive, so a long
// name never pushes the greeting out of the card:
//   ≤ 6 chars  (Paval, Maria, 田中)    → 32 px
//   7–10 chars (Sundar, Abdul, 鈴木)  → 30 px
//   11–14 chars (Christopher, José)     → 28 px
//   15–18 chars (Bartholomew)           → 26 px
//   19+ chars                            → 22 px + ellipsis

import React, {memo} from 'react';
import {View, StyleSheet} from 'react-native';
import {AppText} from '../../../../components/core/AppText/AppText';
import {WeatherChip} from '../../../../components/utility/WeatherIcon';
import {spacing} from '../../../../theme/tokens';
import {FONT_FAMILY} from '../../../../constants/fontFamily';
import type {WeatherGreetingProps} from './WeatherGreeting.types';

const WeatherGreetingComponent: React.FC<WeatherGreetingProps> = ({
  text,
  firstName,
  condition,
  weather,
}) => {
  // v9g→v9h: the weather CHIP is only drawn when there is a snapshot.
  //
  // It used to render "always (tinted if no snapshot) so the card
  // silhouette stays stable". On a device with no weather — which is
  // the normal state for a fresh install, and the state on every
  // device whose weather fetch failed — that produced a flat BLUE
  // 56×56 tile in the middle of a warm parchment-and-gold card. It was
  // the loudest element on the Home page, and it was a placeholder
  // for information that did not exist.
  //
  // The silhouette argument does not survive measurement: the greeting
  // column is ~60 dp tall (18 dp prefix + 2 dp + ~38 dp name) and the
  // chip was 56 dp, so the card's height barely changed when the chip
  // went. Dropping the chip when there is nothing behind it is free,
  // and it removes a lie from the screen.
  const showLiveWeather = !!weather;
  const showChip = showLiveWeather;

  // v9g: adaptive name font size. The name is the page's hero, so it
  // is sized to the name:
  //   ≤ 6 chars  (Paval, Maria, 田中)    → 32 px
  //   7–10 chars (Sundar, Abdul, 鈴木)  → 30 px
  //   11–14 chars (Christopher, José)     → 28 px
  //   15–18 chars (Bartholomew)           → 26 px
  //   19+ chars                            → 22 px
  const nameLen = firstName.length;
  const nameFontSize =
    nameLen <= 6 ? 32 :
    nameLen <= 10 ? 30 :
    nameLen <= 14 ? 28 :
    nameLen <= 18 ? 26 : 22;

  return (
    <View style={styles.section}>
      <View style={styles.row}>
        {/* The greeting column owns the name as its hero. */}
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

        {/* The chip is an ACCENT in the top right, aligned with the
            NAME — the weather column took a third of the width away
            from the name in V1. It is drawn only when there is a
            snapshot behind it. */}
        {showChip ? <WeatherChip condition={condition} style={styles.chip} /> : null}
      </View>

      {showLiveWeather ? (
        <AppText
          variant="caption"
          color="secondary"
          style={styles.weatherLine}
          numberOfLines={1}>
          {weather!.description} in {weather!.cityName} · {weather!.temperatureC}°
        </AppText>
      ) : null}
    </View>
  );
};

export const WeatherGreeting = memo(WeatherGreetingComponent);
WeatherGreeting.displayName = 'WeatherGreeting';

const styles = StyleSheet.create({
  // V2: ONE gutter — 16 dp, like every left-aligned thing on the page.
  // The greeting used to sit in the 12 dp CONTENT gutter while the
  // labels below it sat in the 16 dp LABEL gutter, and the mismatch is
  // what makes a screen look assembled rather than designed.
  section: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    paddingBottom: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  greetingCol: {
    flex: 1,
    minWidth: 0,
  },
  // The chip is 56×56 by default. No flex on the chip so it stays a
  // fixed square.
  chip: {
    marginLeft: spacing.md,
  },
  // V2: small editorial prefix. Cormorant Garamond Italic at 18 px —
  // a quiet accent above the name, not a competing heading. Primary
  // text color (not gold) so the name is the only gold element.
  greetingPrefix: {
    fontFamily: FONT_FAMILY.cormorant.italic,
    fontSize: 18,
    lineHeight: 24,
    fontStyle: 'italic',
  },
  // V2: the hero. Inter Bold gold, fontSize is adaptive based on
  // firstName.length (see tiers above). Tight letter-spacing so the
  // name reads as a single bold word.
  greetingName: {
    fontFamily: FONT_FAMILY.inter.bold,
    letterSpacing: -0.5,
    marginTop: 2,
  },
  // V2: ONE quiet line under the name. A footnote can never compete
  // with a 32 px gold name — which is the whole reason the weather
  // moved out of its own column.
  weatherLine: {
    marginTop: 8,
  },
});
