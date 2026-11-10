#!/usr/bin/env node
/**
 * splash.js — the animated JS Splash, drawn from the app's own source.
 *
 * WHY THE SPLASH HAS A BOARD
 * --------------------------
 * It is the app's first screen, and the flow starts on it
 * (`SIMBA app` starts at `Splash / light`). It was a placeholder, and a
 * placeholder on the board the walk starts from means the walk opens on
 * a page that says "not designed yet" — the opposite of what the app
 * shows.
 *
 * WHERE EVERY NUMBER COMES FROM
 * -----------------------------
 * The app's own source, `src/screens/Splash/components/SplashScreen.tsx`,
 * and the device:
 *
 *   • the page is `colors.background.primary` — parchment in light, near
 *     black in dark (the tokens, via `app-spec.js`);
 *   • the logo stack is 280 × 280 and is centred in the logo area
 *     (`:133-138`, `:128-132`);
 *   • the pulse ring is an SVG circle of radius 100 with a 3 dp gold
 *     stroke, absolutely filling the stack (`:85-86`, `:350-369`);
 *   • the lion is 96 × 96 in the brand ink (`:381`);
 *   • the wordmark is the `brandScript` token — Allura 48/56 — 14 dp
 *     under the lion (`:155-157`, `tokens.ts:429`);
 *   • the tagline is `LOCKUP_TAGLINE` — Cormorant Garamond Italic
 *     22/28, 0.4 letter spacing — 2 dp under the wordmark
 *     (`src/constants/brand.ts`);
 *   • the progress ring is the same circle again, 48 dp below the stack
 *     (`:410`, `:357-447`).
 *
 * The vertical positions were checked against the device: with the stack's
 * top at 202 dp, the pulse ring's visible box measured 104.3, 240.5,
 * 202.5 × 202.5 dp and the progress ring's centre 634.75 dp — the app's
 * own arithmetic, to the pixel.
 *
 * WHAT THE BOARD CANNOT SHOW
 * --------------------------
 * The motion. The board draws the splash at rest: the pulse ring at its
 * peak opacity (0.3 — the app's own maximum), the progress ring full,
 * and the lockup fully faded in. The sequence itself is the app's.
 */

'use strict';

const {kit, SCREEN_W, SCREEN_H, spec} = require('./kit');

/** The brand strings — read from the app's own owner. */
const BRAND = spec.brand;

/** The Android status bar — the content's own top padding. */
const INSETS_TOP = 24;

/** The logo stack (`SplashScreen.tsx:133-138`). */
const LOGO_STACK = 280;

/** The pulse ring and the progress ring (`:85-86`). */
const RING_RADIUS = 100;
const RING_STROKE = 3;

/** The lion (`:147`, `:381`). */
const LION = 96;

/** The gaps between the lockup's three parts (`:156`, `:163`). */
const WORDMARK_GAP = 14;
const TAGLINE_GAP = 2;

/** The progress ring's own gap under the stack (`:410`). */
const PROGRESS_GAP = 48;

/** The lockup's type — the app's own tokens. */
const WORDMARK_SIZE = 48;
const WORDMARK_LH = 56;
const TAGLINE_SIZE = 22;
const TAGLINE_LH = 28;
const TAGLINE_LS = 0.4;

/**
 * The Splash, in one theme.
 *
 * @param {'light'|'dark'} theme
 */
function splashBoard(theme) {
  const k = kit(theme);
  const c = k.c;

  // The logo area is `flex: 1` under the status bar, and the stack and the
  // progress ring are centred in it as one block.
  const blockH = LOGO_STACK + PROGRESS_GAP + (RING_RADIUS * 2 + RING_STROKE * 2);
  const stackTop = INSETS_TOP + (SCREEN_H - INSETS_TOP - blockH) / 2;

  // The lockup column: the lion, the wordmark and the tagline, centred in
  // the stack.
  const columnH = LION + WORDMARK_GAP + WORDMARK_LH + TAGLINE_GAP + TAGLINE_LH;
  const columnTop = stackTop + (LOGO_STACK - columnH) / 2;

  // The ring's geometry.
  //
  // The app draws an SVG of 206 x 206 (RING_RADIUS * 2 + RING_STROKE * 2)
  // with a circle of radius 100 inside it, so the circle's PATH sits 3 dp
  // inside the SVG and the stroke straddles that path: the visible band
  // runs from 98.5 to 101.5 dp from the centre — 203 dp across.
  //
  // Penpot strokes INSIDE a shape's box (`strokeAlignment: 'inner'`), so
  // the box that carries the same visible band is 203 x 203, and the
  // stroke's outer edge is the box's edge.
  const ringSvg = RING_RADIUS * 2 + RING_STROKE * 2;
  const ringBox = ringSvg - RING_STROKE;
  const ringOffset = RING_STROKE / 2;

  const shapes = [];

  // ── the pulse ring ───────────────────────────────────────────────────
  // The app pulses it between 0 and 0.3 opacity; the board draws the peak.
  // The SVG is absolutely centred in the 280 dp stack.
  shapes.push({
    kind: 'ellipse',
    name: 'Splash pulse ring',
    x: (SCREEN_W - ringBox) / 2,
    y: stackTop + (LOGO_STACK - ringSvg) / 2 + ringOffset,
    w: ringBox,
    h: ringBox,
    fill: null,
    stroke: c.accent.gold,
    strokeWidth: RING_STROKE,
    opacity: 0.3,
  });

  // ── the progress ring ────────────────────────────────────────────────
  // At rest the arc has closed the circle, so the ring reads as one gold
  // circle — the track underneath it is the same gold at 0.15.
  shapes.push({
    kind: 'ellipse',
    name: 'Splash progress ring',
    x: (SCREEN_W - ringBox) / 2,
    y: stackTop + LOGO_STACK + PROGRESS_GAP + ringOffset,
    w: ringBox,
    h: ringBox,
    fill: null,
    stroke: c.accent.gold,
    strokeWidth: RING_STROKE,
  });

  // ── the lockup ───────────────────────────────────────────────────────
  shapes.push(
    {
      kind: 'image',
      name: 'Splash lion',
      x: (SCREEN_W - LION) / 2,
      y: columnTop,
      w: LION,
      h: LION,
      media: k.iconKey('lion'),
    },
    k.text('Splash wordmark', BRAND.name, {
      x: {center: SCREEN_W / 2},
      y: columnTop + LION + WORDMARK_GAP,
      family: 'Allura',
      size: WORDMARK_SIZE,
      lineHeight: WORDMARK_LH,
      fill: c.accent.brandInk,
      align: 'center',
    }),
    k.text('Splash tagline', BRAND.tagline, {
      x: {center: SCREEN_W / 2},
      y: columnTop + LION + WORDMARK_GAP + WORDMARK_LH + TAGLINE_GAP,
      family: 'Cormorant Garamond',
      weight: 400,
      italic: true,
      size: TAGLINE_SIZE,
      lineHeight: TAGLINE_LH,
      letterSpacing: TAGLINE_LS,
      fill: c.accent.brandInkSoft,
      align: 'center',
    }),
  );

  return {width: SCREEN_W, height: SCREEN_H, shapes};
}

module.exports = {splashBoard};
