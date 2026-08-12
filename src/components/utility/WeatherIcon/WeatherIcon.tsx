import React, {memo, useMemo} from 'react';
import LottieView from 'lottie-react-native';
import type {AnimationObject} from 'lottie-react-native';
import type {WeatherIconProps, WeatherCondition, WeatherIconSize} from './WeatherIcon.types';

const SIZE_PX: Record<WeatherIconSize, number> = {
  sm: 28,
  md: 56,
  lg: 80,
};

const SOURCE: Record<WeatherCondition, AnimationObject> = {
  // P63: swapped to Meteocons (MIT, 60fps, 360-frame loops). These
  // are real motion-design pieces: raindrops fade in and fall with
  // stagger, clouds bob, lightning flashes — not the static
  // "spinning ring" hand-rolled files.
  sunny: require('../../../assets/lottie/weather/sun.json'),
  partlyCloudy: require('../../../assets/lottie/weather/partly-cloudy.json'),
  cloudy: require('../../../assets/lottie/weather/cloud.json'),
  rainy: require('../../../assets/lottie/weather/rain.json'),
  snowy: require('../../../assets/lottie/weather/snow.json'),
  // P66: clear-night (WMO 0 + !isDay) renders as a dark sky with
  // a moon and twinkling stars. We use the dedicated starry-night
  // scene in WeatherChip's full-scene path, but expose the single-
  // moon glyph here too for any other consumer (e.g. a 28×28 sm
  // variant in a different context).
  clearNight: require('../../../assets/lottie/weather/stars.json'),
};

const WeatherIconComponent: React.FC<WeatherIconProps> = ({
  condition,
  size = 'md',
  autoPlay = true,
  loop = true,
  style,
}) => {
  const px = SIZE_PX[size];
  const source = useMemo(() => SOURCE[condition], [condition]);

  return (
    <LottieView
      source={source}
      autoPlay={autoPlay}
      loop={loop}
      // P66: cover, not contain. Meteocons draws the subject in a
      // ~64×64 area inside a 128×128 canvas (32px transparent margin
      // on each side). contain would render the 128×128 canvas at
      // fit-to-size inside our 56×56 chip, leaving the subject at
      // ~28×28 in the center — too small. cover scales the 128×128
      // up to fill the chip and crops the margins, so the subject
      // is ~56×56 and reads as the chip's hero.
      resizeMode="cover"
      style={[{width: px, height: px}, style]}
    />
  );
};

export const WeatherIcon = memo(WeatherIconComponent);
WeatherIcon.displayName = 'WeatherIcon';
