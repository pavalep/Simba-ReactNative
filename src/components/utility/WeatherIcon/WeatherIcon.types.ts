import type {StyleProp, ViewStyle} from 'react-native';

export type WeatherCondition =
  | 'sunny'
  | 'partlyCloudy'
  | 'cloudy'
  | 'rainy'
  | 'snowy'
  | 'clearNight';

export type WeatherIconSize = 'sm' | 'md' | 'lg';

export interface WeatherIconProps {
  condition: WeatherCondition;
  size?: WeatherIconSize;
  autoPlay?: boolean;
  loop?: boolean;
  style?: StyleProp<ViewStyle>;
}

// ─── Mood palettes (P66) ──────────────────────────────────────────
//
// One palette per condition. Each is a top→bottom linear gradient
// that paints the *sky* behind the Meteocons glyph. P66 crank: the
// previous palette (P64) was too pastel and washed out against the
// parchment page background (#F5F0E8). The new palette saturates
// each sky so the chip has real visual identity and contrast — the
// user calls this "vivid sky" and rightly so.
//
// Readability against the Meteocons glyphs:
//   • Meteocons `fill/` glyphs are mostly pale-blue outlines + warm
//     gold accents. A vivid sky (e.g. #3F8DD3 royal blue for
//     partlyCloudy) makes the gold sun pop and keeps the pale-blue
//     cloud as a soft secondary subject. A pastel sky makes both
//     invisible.
//   • For clearNight we go very dark (deep navy → black) so the
//     starry-night scene's moon and stars are luminous.
//
// The `tint` is the solid-color fallback used before the Lottie
// paints its first frame, and to colour the corners that overflow
// clips. It is the most-saturated of the three values so the chip
// never looks hollow while Lottie is mounting.

export interface WeatherPalette {
  /** Top of the gradient. */
  top: string;
  /** Bottom of the gradient. */
  bottom: string;
  /**
   * Solid background colour — most saturated of the three. Used as
   * the safety-net tint that shows under the Lottie on first frame
   * and bleeds at the rounded corners after overflow:hidden clips
   * the Lottie edges. Picking a saturated tint here means the chip
   * still has identity even if the Lottie fails to load.
   */
  tint: string;
}

/** Conditions whose chip background is a complete Meteocons scene
 *  (no separate gradient + glyph — the scene IS the chip). */
export const FULL_SCENE_CONDITIONS = new Set<WeatherCondition>([
  'clearNight', // starry-night.json = moon + 3 twinkling stars on a dark sky
]);

export const WEATHER_PALETTE: Record<WeatherCondition, WeatherPalette> = {
  // Sunny — clear day. Sky is the hero. Top is real sky blue, the
  // bottom warms up as if the sun is low. Meteocons' gold sun
  // (#f8af18) pops against the blue without disappearing.
  sunny: {
    top: '#3F8DD3',
    bottom: '#FFC78A',
    tint: '#5BA0D6',
  },
  // Partly cloudy — the user's exact ask: "clear sky, skyblue bg".
  // Mid-saturation sky blue so the gold sun rays are the star and
  // the pale-blue cloud outline reads as a soft secondary.
  partlyCloudy: {
    top: '#3F8DD3',
    bottom: '#7AC0E8',
    tint: '#5BA0D6',
  },
  // Cloudy — overcast. Steel grey, deeper than P64 so the chip
  // doesn't look like a hole in the page.
  cloudy: {
    top: '#6B7785',
    bottom: '#9BA8B5',
    tint: '#7C8A99',
  },
  // Rainy — storm. Dark slate top, lighter slate bottom. The
  // bright royal blue raindrops (#0a5ad4) pop against the slate.
  rainy: {
    top: '#283041',
    bottom: '#4A5668',
    tint: '#3A4356',
  },
  // Snowy — winter sky. Real ice blue (not pastel). The cyan
  // snowflakes (#86c3db) glow against the deeper blue.
  snowy: {
    top: '#5B8FB8',
    bottom: '#A8C8E4',
    tint: '#7BA5C9',
  },
  // Clear night — deep navy → black. The chip is the night sky;
  // starry-night.json paints moon + stars on top. Tint is pure
  // black so any unmounted frame still reads as "night."
  clearNight: {
    top: '#0B1437',
    bottom: '#1E2950',
    tint: '#0A0F2C',
  },
};
