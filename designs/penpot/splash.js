#!/usr/bin/env node
/**
 * splash.js — the app's splash, drawn from the app's own source.
 *
 * WHICH SPLASH THIS IS
 * --------------------
 * The app's splash is the **native** `SplashActivity`
 * (`android/app/src/main/java/com/simba/player/SplashActivity.kt`), which the
 * launcher starts on every cold start. There is no JS splash screen: the
 * screen that used to live at `src/screens/Splash/` was removed on
 * 2026-11-11 — it was a second splash, with a second set of rings, in a
 * different typeface from the native one.
 *
 * The layout is `android/app/src/main/res/layout/activity_splash.xml`:
 *
 *   • the page is `@color/splash_background` — parchment `#F5F0E8` in light,
 *     near-black `#0A0A0C` in night (`values/colors.xml`,
 *     `values-night/colors.xml`);
 *   • the glow is a 220 x 220 dp `ImageView` holding a gold radial gradient,
 *     its alpha pulsing between 0.4 and 0.7;
 *   • the lion is a 96 x 96 dp `ImageView` in `@color/splash_ink` — the
 *     brand ink, `#5C3A1E` / `#B27340`, the same values as
 *     `accent.brandInk` in `src/theme/tokens.ts`;
 *   • the loading ring is a 180 x 180 dp `ImageView` holding a rotating
 *     `splash_ring_shape` — a ring whose sweep gradient runs from
 *     transparent to the brand ink;
 *   • the wordmark is a plain `TextView`: "Simba", 14sp, letter spacing
 *     0.15, in `@color/splash_wordmark` — the gold, `#B8922E` / `#C9A84C`,
 *     the same values as `accent.gold`. It has NO `fontFamily`, so it is
 *     set in the system face; the board sets it in Inter, the app's own
 *     sans.
 *
 * The theme is `windowFullscreen`, so there is no status bar inset: the
 * group is centred in the whole window.
 *
 * THE NUMBERS, MEASURED
 * ----------------------
 * The ring's band cannot be read off the XML — `splash_ring_shape` puts it
 * at a fraction of the ImageView's box — so it was measured on the device,
 * on a dark cold start:
 *
 *   the visible band   125.6 dp across, 6.5 dp thick
 *   the band's centre  (205.4, 434.6) dp
 *   the wordmark's ink y 573.5 .. 584.2 dp
 *
 * The board draws the band where the layout puts it (centred in the logo
 * area), which is within 2 dp of the measurement — the two differ by the
 * TextView's line box, which the layout does not state.
 *
 * WHAT THE BOARD CANNOT SHOW
 * --------------------------
 * The motion: the lion's scale-up, the glow's pulse, the ring's rotation
 * and the wordmark's fade are the app's. And the glow is a **radial
 * gradient**, which Penpot cannot render — measured on the device it is a
 * 2–3% wash (light `#F5F0E8` → `#F3EDE2` inside it, dark `#0A0A0C` →
 * `#11100E`), so the board draws it flat, at the size of its own box.
 */

'use strict';

const {kit, SCREEN_W, SCREEN_H, spec} = require('./kit');

/** The brand strings — read from the app's own owner. */
const BRAND = spec.brand;

/** The logo area — the `ImageView`s' shared parent (`activity_splash.xml`). */
const LOGO_AREA = 220;

/** The lion (`:48`). */
const LION = 96;

/**
 * The loading ring's visible band — measured on the device, 125.6 dp across
 * and 6.5 dp thick. Penpot strokes INSIDE a shape's box
 * (`strokeAlignment: 'inner'`), so the box carries the band's OUTER edge.
 */
const RING_BAND = 125.6;
const RING_THICKNESS = 6.5;

/** The wordmark's gap under the logo area (`:76`). */
const WORDMARK_GAP = 24;

/** The wordmark's type — a plain `TextView`, 14sp with 0.15 tracking. */
const WORDMARK_SIZE = 14;
const WORDMARK_LH = 16.8;
const WORDMARK_LS = 0.15;

/**
 * The glow's flat stand-in: the app's radial gradient under an alpha of
 * 0.4–0.7 leaves a 2–3% wash on the page, so the board draws the disc at
 * 4% of the gold.
 */
const GLOW_OPACITY = 0.04;

/**
 * The Splash, in one theme.
 *
 * @param {'light'|'dark'} theme
 */
function splashBoard(theme) {
  const k = kit(theme);
  const c = k.c;

  // The group — the logo area and the wordmark under it — is centred in the
  // window: `windowFullscreen` means there is no status bar inset.
  const groupH = LOGO_AREA + WORDMARK_GAP + WORDMARK_LH;
  const groupTop = (SCREEN_H - groupH) / 2;
  const logoX = (SCREEN_W - LOGO_AREA) / 2;
  const logoY = groupTop;
  const logoCx = SCREEN_W / 2;
  const logoCy = logoY + LOGO_AREA / 2;

  const shapes = [];

  // ── the glow ──────────────────────────────────────────────────────────
  // A gold radial gradient Penpot cannot draw; the flat disc stands in for
  // it at the size of its own 220 dp box.
  shapes.push(
    k.ellipse('Splash glow', {
      x: logoX,
      y: logoY,
      w: LOGO_AREA,
      h: LOGO_AREA,
      fill: c.accent.gold,
      opacity: GLOW_OPACITY,
    }),
  );

  // ── the loading ring ──────────────────────────────────────────────────
  // The app's ring is a sweep gradient — transparent to the ink — turning
  // round; the board draws the band at the gradient's end colour, which is
  // the ring's brightest state.
  shapes.push(
    k.ellipse('Splash loading ring', {
      x: logoCx - RING_BAND / 2,
      y: logoCy - RING_BAND / 2,
      w: RING_BAND,
      h: RING_BAND,
      fill: null,
      stroke: c.accent.brandInk,
      strokeWidth: RING_THICKNESS,
    }),
  );

  // ── the mark and the wordmark ─────────────────────────────────────────
  shapes.push(
    k.image('Splash lion', {
      x: logoCx - LION / 2,
      y: logoCy - LION / 2,
      w: LION,
      h: LION,
      media: k.iconKey('lion'),
    }),
    k.text('Splash wordmark', BRAND.name, {
      x: {center: logoCx},
      y: logoY + LOGO_AREA + WORDMARK_GAP,
      family: 'Inter',
      weight: 400,
      size: WORDMARK_SIZE,
      lineHeight: WORDMARK_LH,
      letterSpacing: WORDMARK_LS,
      fill: c.accent.gold,
      align: 'center',
    }),
  );

  return {width: SCREEN_W, height: SCREEN_H, shapes};
}

module.exports = {splashBoard};
