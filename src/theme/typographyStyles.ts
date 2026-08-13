// ─── Semantic typography style helpers ──────────────────────────
// v7 brand typography. Use these when you need to compose a
// typography token INTO a non-AppText component (e.g. TextInput
// `placeholderTextColor`, a `TouchableOpacity` pressable label,
// an SVG `<Text>`). For ordinary in-screen text, prefer
// `<AppText variant="displaySans">...</AppText>` — the
// `variantMap` already routes the variant to the right family.
//
// All helpers read from `tokens.ts` (which is themed — dark / light)
// and `FONT_FAMILY` from `constants/fontFamily.ts` (which is
// constant — the family name never changes between themes).
//
// The 5 visual roles:
//
//   1. brandScript   — Allura. Wordmark only.
//   2. displaySerif  — Cormorant Garamond. Cinematic hero titles.
//   3. displaySans   — Manrope. Section titles.
//   4. ui*           — Inter. Body, headers, captions, buttons.
//   5. mono          — JetBrains Mono. Code / monospace.

import {Platform, type TextStyle} from 'react-native';
import {FONT_FAMILY} from '../constants/fontFamily';
import {typography} from './tokens';

// ─── Brand & display ───────────────────────────────────────

/** Allura — the SIMBA wordmark. Single weight, no fontWeight. */
export const brandScript: TextStyle = typography.brandScript;

/** Cormorant Garamond Bold — cinematic hero / detail titles. */
export const displaySerif: TextStyle = typography.displaySerif;

/** Manrope SemiBold — section titles ("Your Library", "Movies", etc.). */
export const displaySans: TextStyle = typography.displaySans;

// ─── UI body (Inter) ───────────────────────────────────────

/** Inter Bold — display (largest UI heading). */
export const uiDisplay: TextStyle = typography.display;

/** Inter Bold — h1. */
export const uiH1: TextStyle = typography.h1;

/** Inter Bold — h2. */
export const uiH2: TextStyle = typography.h2;

/** Inter SemiBold — h3. */
export const uiH3: TextStyle = typography.h3;

/** Inter Regular — body 1 (default). */
export const uiBody1: TextStyle = typography.body1;

/** Inter Regular — body 2. */
export const uiBody2: TextStyle = typography.body2;

/** Inter Regular — body small. */
export const uiBodySmall: TextStyle = typography.bodySmall;

/** Inter Regular — caption. */
export const uiCaption: TextStyle = typography.caption;

/** Inter Medium — overline (uppercase, letter-spaced). */
export const uiOverline: TextStyle = typography.overline;

/** Inter SemiBold — button. */
export const uiButton: TextStyle = typography.button;

/** Inter Medium — tab labels. */
export const uiTab: TextStyle = typography.tab;

// ─── Code / monospace ──────────────────────────────────────

/** JetBrains Mono — code / monospace. */
export const uiMono: TextStyle = {
  ...typography.mono,
  // Disable JBM's programming ligatures so the MPV config editor
  // and any debug surfaces look identical to the previous
  // `'monospace'` system default. JBM by default ligates `=>`,
  // `!=`, `->` etc., which makes diff output confusing.
  fontVariant: ['no-common-ligatures'],
};

// ─── Composite semantic styles ─────────────────────────────

/**
 * The greeting prefix "Good morning" / "Good afternoon" /
 * "Good evening" in WeatherGreeting.tsx. Smaller than the
 * `displaySerif` token's 48px — clamped for the greeting card.
 */
export const greetingPrefix: TextStyle = {
  ...displaySerif,
  fontSize: 26,
  lineHeight: 32,
};

/** The user name in the greeting — Inter Bold gold. */
export const greetingName: TextStyle = {
  ...uiH2,
  // v8: NO fontWeight override. The uiH2 token now maps to
  // `fontFamily: FONT_FAMILY.inter.bold` (Inter-Bold.ttf)
  // directly — encoding the weight in the family key means
  // there's no axis for Android's font-weight picker to
  // bias toward extra-bold.
};

/** Section header — "Your Library", "Movies", "Recently Played", etc. */
export const sectionTitle: TextStyle = displaySans;

/** Hero detail title — Movie Detail, Album Detail, etc. */
export const heroTitle: TextStyle = displaySerif;

/** Splash / Login wordmark (slightly different sizing than the
 *  inline HomeHeader wordmark — uses the token defaults). */
export const splashWordmark: TextStyle = brandScript;

/** Splash / Login tagline — Cormorant Italic when used in splash. */
export const splashTagline: TextStyle = {
  ...displaySerif,
  fontStyle: 'italic',
  fontSize: 16,
  lineHeight: 22,
};

/** MVP config editor code line. */
export const codeLine: TextStyle = {
  ...uiMono,
  fontSize: 13,
  lineHeight: 20,
};

// ─── Cross-platform safety: android:includeFontPadding ────
// Android text views add extra padding above/below the line
// baseline. We zero it out for our typography so the typographic
// rhythm matches the design spec.
const zeroFontPadding: TextStyle =
  Platform.OS === 'android' ? {includeFontPadding: false} : {};

export const allTypographyStyles: Record<string, TextStyle> = {
  brandScript: {...brandScript, ...zeroFontPadding},
  displaySerif: {...displaySerif, ...zeroFontPadding},
  displaySans: {...displaySans, ...zeroFontPadding},
  uiDisplay: {...uiDisplay, ...zeroFontPadding},
  uiH1: {...uiH1, ...zeroFontPadding},
  uiH2: {...uiH2, ...zeroFontPadding},
  uiH3: {...uiH3, ...zeroFontPadding},
  uiBody1: {...uiBody1, ...zeroFontPadding},
  uiBody2: {...uiBody2, ...zeroFontPadding},
  uiBodySmall: {...uiBodySmall, ...zeroFontPadding},
  uiCaption: {...uiCaption, ...zeroFontPadding},
  uiOverline: {...uiOverline, ...zeroFontPadding},
  uiButton: {...uiButton, ...zeroFontPadding},
  uiTab: {...uiTab, ...zeroFontPadding},
  uiMono: {...uiMono, ...zeroFontPadding},
  greetingPrefix: {...greetingPrefix, ...zeroFontPadding},
  greetingName: {...greetingName, ...zeroFontPadding},
  sectionTitle: {...sectionTitle, ...zeroFontPadding},
  heroTitle: {...heroTitle, ...zeroFontPadding},
  splashWordmark: {...splashWordmark, ...zeroFontPadding},
  splashTagline: {...splashTagline, ...zeroFontPadding},
  codeLine: {...codeLine, ...zeroFontPadding},
};

// Re-export FONT_FAMILY so consumers can `import {FONT_FAMILY} from '@/theme/typographyStyles'`
// if they prefer a single import path. The single source of truth
// is still `src/constants/fontFamily.ts`.
export {FONT_FAMILY};
