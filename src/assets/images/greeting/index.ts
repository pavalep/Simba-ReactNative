// ─── Greeting Image Registry ──────────────────────────────────────
// P60: small watercolor-style illustrations rendered next to the
// Home greeting ("Good morning" → sun, "Good afternoon" → coffee,
// "Good evening" → moon, "Good night" → stars). All four are
// 128×128 PNGs bundled at build time.

import type {ImageSourcePropType} from 'react-native';

export type GreetingImage = ImageSourcePropType;

export const GREETING_IMAGES: {
  sun: GreetingImage;
  coffee: GreetingImage;
  moon: GreetingImage;
  stars: GreetingImage;
} = {
  sun: require('./sun.png'),
  coffee: require('./coffee.png'),
  moon: require('./moon.png'),
  stars: require('./stars.png'),
};

export type GreetingImageKey = keyof typeof GREETING_IMAGES;
