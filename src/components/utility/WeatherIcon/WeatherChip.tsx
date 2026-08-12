// ─── WeatherChip (P66) ───────────────────────────────────────────
//
// The pill that sits inline with the greeting caption. A vivid
// per-condition sky (top→bottom linear gradient) with a Meteocons
// foreground glyph on top — except for "clearNight" where the chip
// is the starry-night scene (moon + 3 twinkling stars on a dark
// sky) rendered alone, no separate gradient or glyph.
//
// P64 history: a pastel gradient + the foreground glyph. Worked
// but the colors were too washed out against the parchment page
// background — the chip looked like a hole in the page.
//
// P65 (rolled back): a second Meteocons scene Lottie as the sky.
// Abandoned — Meteocons scenes are designed for a colored page
// surface (transparent backgrounds), their subjects are positioned
// at 128×128 origin (mostly off-screen inside a 56×56 chip with
// resizeMode=contain), and stacking two Lottie views at 56×56 was
// too much weight for too little visible payoff.
//
// P66 (current): restore the gradient but make it vivid. For
// clearNight, swap the gradient for the starry-night full scene
// (the user's "black bg with stars" request, served as a real
// Meteocons Lottie). Switch the foreground glyph to
// resizeMode="cover" so the Meteocons 128×128 art fills the
// 56×56 chip (the subjects are drawn in a 64×64 center area with
// 32px transparent margins; contain was leaving those margins
// visible and shrinking the subject).

import React, {memo, useMemo} from 'react';
import {View, StyleSheet, type ViewStyle} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import LottieView from 'lottie-react-native';
import type {AnimationObject} from 'lottie-react-native';
import {WeatherIcon} from './WeatherIcon';
import {
  WEATHER_PALETTE,
  FULL_SCENE_CONDITIONS,
  type WeatherCondition,
} from './WeatherIcon.types';
import {radius} from '../../../theme/tokens';

const SIZE = 56;

interface WeatherChipProps {
  condition: WeatherCondition;
  style?: ViewStyle;
}

// Starry-night — the dedicated "clear night" full-scene Meteocons
// file. Renders a moon + three twinkling stars on a dark sky. Used
// as the WHOLE chip (no separate gradient or foreground glyph).
const STARRY_NIGHT_SOURCE: AnimationObject = require('../../../assets/lottie/weather/starry-night.json');

const WeatherChipComponent: React.FC<WeatherChipProps> = ({condition, style}) => {
  const palette = WEATHER_PALETTE[condition];
  const isFullScene = FULL_SCENE_CONDITIONS.has(condition);

  return (
    <View style={[styles.chip, style]}>
      {isFullScene ? (
        // The full-scene path: starry-night Lottie fills the chip
        // by itself. The dark sky it draws is exactly the "black bg
        // with stars" the user asked for, so no extra gradient.
        <LottieView
          source={STARRY_NIGHT_SOURCE}
          autoPlay
          loop
          resizeMode="cover"
          style={StyleSheet.absoluteFill}
        />
      ) : (
        <>
          {/* Vivid sky — top→bottom gradient. The whole mood comes
              from this: real sky blue for partly cloudy, warm sky
              for sunny, slate for rainy, ice blue for snowy. */}
          <LinearGradient
            colors={[palette.top, palette.bottom]}
            start={{x: 0.5, y: 0}}
            end={{x: 0.5, y: 1}}
            style={StyleSheet.absoluteFill}
          />
          {/* Foreground Meteocons glyph. resizeMode="cover" so the
              128×128 art scales up to fill the 56×56 chip (cropping
              the 32px transparent margin on each side), making the
              sun / cloud / raindrop / snowflake large enough to
              actually be the chip's subject. */}
          <WeatherIcon condition={condition} size="md" />
        </>
      )}
    </View>
  );
};

export const WeatherChip = memo(WeatherChipComponent);
WeatherChip.displayName = 'WeatherChip';

const styles = StyleSheet.create({
  chip: {
    width: SIZE,
    height: SIZE,
    borderRadius: radius.md,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
