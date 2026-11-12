#!/usr/bin/env node
/**
 * kit.js — the shared drawing vocabulary for the Penpot prototype.
 *
 * Every screen in the prototype is drawn with THESE primitives, so that two
 * screens that mean the same thing look the same thing. The values come
 * from the app's own tokens (`app-spec.js` reads `src/theme/tokens.ts` and
 * `src/constants/fontFamily.ts` through the TypeScript AST), so the
 * prototype cannot drift from the app it is a design for.
 *
 * The rules the kit encodes are the ones written down in
 * `md/UI_UX_PROTOTYPE_REBUILD.md` §2 — the pattern. The kit IS the pattern
 * in code.
 *
 * A "shape" here is a Penpot plan shape: the same JSON the plugin script
 * consumes. Positions are ABSOLUTE (Penpot's flex layout is not React
 * Native's flexbox, and the design has to stay diffable against a device
 * screenshot).
 *
 * THE GEOMETRY IS THE APP'S GEOMETRY
 * ----------------------------------
 * Every number below is read out of the app's own component — the header's
 * padding, the card's radius, the rail card's 16:9 thumb, the section
 * header's 32 px gold badge. The file:line for each one is quoted beside it.
 * A number that is NOT in the app is a number this prototype invents, and
 * it has to earn its place.
 *
 * THE HOME PAGE WAS MEASURED, NOT EYEBALLED
 * ------------------------------------------
 * The Home screen's absolute positions were read off a full-resolution
 * capture of the app running on the emulator (1080x2400 px at density 420,
 * so 2.628 device px per dp). Every "measured" comment below is that
 * measurement, and the numbers it produced are the ones the board uses:
 *
 *   • the status band is 32 dp — the search button's top edge was measured
 *     at 44 dp, and the header's own padding is 12 dp;
 *   • the greeting card starts at 123 dp and is 96 dp tall (387 x 96), and
 *     the weather chip's top edge was measured at 143 dp — which is 20 dp
 *     below the card's top, not 12, because the weather COLUMN (26 px
 *     temperature + two 14 px lines = 72 dp) is the tallest thing in the
 *     row and the chip is centred in it;
 *   • the lion's ink starts at 20.9 dp and the wordmark's at 72.7 dp, which
 *     is the 16 dp gutter + the 44 dp lion + the 12 dp gap.
 */

'use strict';

const spec = require('./app-spec');

const {variant} = spec;

/** The phone the app is designed for — the emulator's viewport. */
const SCREEN_W = 411;
const SCREEN_H = 914;

/**
 * The status band above the app's own content.
 *
 * Measured: the search button's circle starts at 44 dp and the header's
 * padding is 12 dp, so the band is 32 dp.
 */
const INSETS_TOP = 32;

/** The app's spacing scale (`src/theme/tokens.ts`). */
const spacing = {xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32};
const radius = {none: 0, sm: 8, md: 12, lg: 16, full: 999};

/**
 * The app's font FILES map onto Penpot's Google-Fonts catalogue.
 *
 * Where the app bakes the weight into the family name (`Inter SemiBold`),
 * the family string IS the weight — the file is `Inter-SemiBold.ttf` and
 * inside the Inter family that face is weight 600. Where the family is
 * shared (`Inter`, `Cormorant Garamond`), the typography token's own
 * `fontWeight` selects the face.
 */
const PENPOT_FAMILY = {
  Allura: {family: 'Allura'},
  'Cormorant Garamond': {family: 'Cormorant Garamond'},
  Inter: {family: 'Inter'},
  'Inter Medium': {family: 'Inter', weight: '500'},
  'Inter SemiBold': {family: 'Inter', weight: '600'},
  Manrope: {family: 'Manrope'},
  'Manrope SemiBold': {family: 'Manrope', weight: '600'},
  'JetBrains Mono': {family: 'JetBrains Mono'},
};

/**
 * The font spec for a typography variant.
 *
 * `family` is the app's family string and `weight` the app's weight — the
 * two together say which face the app ships. This maps that pair onto
 * Penpot's catalogue.
 */
function fontOf(variantName, {italic = false, family = null, weight = null} = {}) {
  const tok = spec.typography[variantName];
  if (!tok) throw new Error('unknown typography variant ' + variantName);
  const appFamily = family || tok.fontFamily;
  const base = PENPOT_FAMILY[appFamily];
  if (!base) throw new Error('no Penpot font mapping for ' + appFamily);
  const appWeight = weight != null ? weight : tok.fontWeight != null ? Number(tok.fontWeight) : 400;
  return {
    family: base.family,
    weight: String(base.weight || appWeight),
    style: italic ? 'italic' : 'normal',
  };
}

/**
 * A theme: the colours, plus the two theme-specific gold values the app
 * hard-codes next to the Cormorant dividers (see `SubsectionTitle`).
 */
function themeOf(name) {
  const dark = name === 'dark';
  const c = dark ? spec.darkColors : spec.colors;
  return {
    name,
    dark,
    c,
    /**
     * The divider label's gold — 0.9 alpha, per the v9f calibration.
     *
     * `SubsectionTitle.tsx:76-82` hard-codes these two rgba values rather
     * than reading `colors.accent.gold`, and they are the WRONG way round
     * for the themes: the light theme's gold is #B8922E and the dark
     * theme's is #C9A84C (`src/theme/tokens.ts:245,321`), while the
     * divider paints rgba(201,168,76,0.9) — the dark theme's gold — in the
     * LIGHT theme. The board paints the divider with the theme's OWN gold
     * at 0.9 alpha, because that is what the divider is supposed to be;
     * the app's mismatch is recorded in md/UI_UX_PROTOTYPE_REBUILD.md.
     */
    dividerGold: dark ? 'rgba(201, 168, 76, 0.9)' : 'rgba(184, 146, 46, 0.9)',
    /** The divider rules. */
    dividerRule: c.accent.goldGlow,
  };
}

/**
 * Build the drawing helpers for one theme.
 *
 * Every helper returns one shape (or an array of shapes) in the Penpot plan
 * format. The shapes carry a `name`, because the plan's links address a
 * shape by name — a prototype connector has to point at the thing the
 * user actually taps.
 */
function kit(themeName) {
  const t = themeOf(themeName);
  const c = t.c;

  /** The media key of one of the app's own glyphs, in this theme. */
  const iconKey = (name) => `ico.${name}.${t.name}`;

  /** A text run. */
  function text(name, str, o = {}) {
    if (str == null) throw new Error('the text "' + name + '" has no content');
    const v = spec.typography[o.variant || 'body1'] || {};
    const family = o.family || v.fontFamily;
    const base = PENPOT_FAMILY[family];
    if (!base) throw new Error('no Penpot font mapping for ' + family);
    const weight = o.weight != null ? String(o.weight) : base.weight || String(v.fontWeight || 400);
    const size = o.size != null ? o.size : v.fontSize;
    const lineHeight = o.lineHeight != null ? o.lineHeight : v.lineHeight;
    const shape = {
      kind: 'text',
      name,
      text: str,
      font: {family: base.family, weight, style: o.italic ? 'italic' : 'normal'},
      size,
      lineHeight,
      letterSpacing: o.letterSpacing != null ? o.letterSpacing : v.letterSpacing || 0,
      fill: o.fill || c.text.primary,
      y: o.y,
      x: o.x,
    };
    if (o.align) shape.align = o.align;
    if (o.underline) shape.decoration = 'underline';
    return shape;
  }

  /** A rectangle. */
  function rect(name, o = {}) {
    const shape = {
      kind: 'rect',
      name,
      x: o.x,
      y: o.y,
      w: o.w,
      h: o.h,
      fill: o.fill || c.background.elevated,
    };
    if (o.radius != null) shape.radius = o.radius;
    if (o.stroke) {
      shape.stroke = o.stroke;
      shape.strokeWidth = o.strokeWidth || 1;
    }
    if (o.opacity != null) shape.opacity = o.opacity;
    if (o.shadow) shape.shadow = o.shadow;
    return shape;
  }

  /** An ellipse. */
  function ellipse(name, o = {}) {
    const shape = {
      kind: 'ellipse',
      name,
      x: o.x,
      y: o.y,
      w: o.w,
      h: o.h,
      // `fill: null` means NO fill — the app's own rings are strokes on an
      // empty circle, and a filled disc would be a different thing.
      fill: o.fill === null ? null : o.fill || c.background.elevated,
      opacity: o.opacity,
    };
    if (o.stroke) {
      shape.stroke = o.stroke;
      shape.strokeWidth = o.strokeWidth || 1;
    }
    return shape;
  }

  /**
   * An image.
   *
   * `media` is a KEY into the prototype's media registry
   * (`designs/penpot/media.js`) — the app's own bundled artwork and the
   * app's own SVG glyphs, uploaded into the Penpot file as real media. The
   * prototype therefore shows the same pictures and the same glyphs the app
   * ships, not stand-ins.
   */
  function image(name, o = {}) {
    return {
      kind: 'image',
      name,
      x: o.x,
      y: o.y,
      w: o.w,
      h: o.h,
      media: o.media,
      radius: o.radius,
      opacity: o.opacity,
    };
  }

  // ── Composites ───────────────────────────────────────────────────

  /**
   * A shelf header — rule P1.
   *
   * ONE header for every rail in the app (`SectionHeader.tsx`): a 32 px
   * gold-soft badge with the app's own glyph in gold, the title in Manrope
   * SemiBold 22, and on the right the optional "See All" action and the
   * optional chevron.
   *
   *   • the badge is 32x32 with `borderRadius: 16` (`:137-143`) and the
   *     glyph inside it is 18 px (`:68-69`);
   *   • the header's own padding is `spacing.lg` (16) horizontally and
   *     `spacing.md` (12) vertically (`:121-122`), so the row is 56 dp tall;
   *   • the title is `displaySans` (Manrope SemiBold 22/28) in `text.primary`
   *     with `letterSpacing: -0.3` when a leading icon is present
   *     (`:74-79, :146-148`);
   *   • the action is `caption` (Inter 13/18) in the accent colour (`:91-92`);
   *   • the chevron is 18 px in `text.tertiary`, in a cluster with the
   *     action and a 12 dp gap (`:159-163`), right-aligned to the 16 dp
   *     gutter.
   *
   * `icon` is the app's own `SvgIcon` name — the SAME name the app passes
   * (`clock`, `listMusic`, `bookmark`, `podcastRings`, `compass`).
   */
  function shelfHeader(name, o) {
    const out = [];
    const y = o.y;
    const badge = 32;
    const badgeTop = y + spacing.md;
    out.push(
      ellipse(name + ' badge', {
        x: spacing.lg,
        y: badgeTop,
        w: badge,
        h: badge,
        fill: c.accent.goldSoft,
      }),
      // The app's own glyph, centred in the badge.
      image(name + ' badge glyph', {
        x: spacing.lg + (badge - 18) / 2,
        y: badgeTop + (badge - 18) / 2,
        w: 18,
        h: 18,
        media: iconKey(o.icon),
      }),
      text(name + ' title', o.title, {
        x: spacing.lg + badge + spacing.sm,
        y: badgeTop + (badge - 28) / 2,
        family: 'Manrope SemiBold',
        weight: 600,
        size: 22,
        lineHeight: 28,
        letterSpacing: -0.3,
        fill: c.text.primary,
      }),
    );
    // The right-hand cluster: the action, then the chevron, 12 dp apart,
    // both flush with the 16 dp gutter.
    if (o.seeAll) {
      out.push(
        text(name + ' See All', 'See All', {
          x: {right: SCREEN_W - spacing.lg - (o.chevron ? 30 : 0)},
          y: badgeTop + (badge - 18) / 2,
          family: 'Inter',
          weight: 400,
          size: 13,
          lineHeight: 18,
          fill: c.accent.gold,
        }),
      );
    }
    if (o.chevron) {
      out.push(
        image(name + ' chevron', {
          x: SCREEN_W - spacing.lg - 18,
          y: badgeTop + (badge - 18) / 2,
          w: 18,
          h: 18,
          media: iconKey(o.chevronUp ? 'chevronUp' : 'chevronDown'),
        }),
      );
    }
    return out;
  }

  /**
   * A section divider — rule P7. The Cormorant Garamond Italic label at
   * 0.9 gold, with hairline rules either side (`SubsectionTitle.tsx`).
   *
   * The divider's own block is `marginTop: spacing.sm` (8) plus
   * `paddingVertical: spacing.md` (12) around a 24 dp line box, so it is
   * 48 dp tall and the label's box starts 12 dp into it. The rules are
   * `flex: 1` on either side of the label, with the label's own
   * `paddingHorizontal: spacing.xl` (20) keeping the rules away from the
   * italic (`:107-121, :135-151`).
   *
   * The rules are laid out as a ROW so that Penpot's own measurement of the
   * label decides where they stop — the same thing `flex: 1` does in the app.
   */
  function divider(name, label, y) {
    const left = name + ' rule left';
    const lab = name + ' label';
    const right = name + ' rule right';
    const order = [left, lab, right];
    const row = {row: {gap: 20, center: SCREEN_W / 2, order}};
    return [
      rect(left, {
        x: row,
        y: y + spacing.md + 11,
        w: 120,
        h: 2,
        fill: t.dividerRule,
      }),
      text(lab, label, {
        x: row,
        y: y + spacing.md,
        family: 'Cormorant Garamond',
        weight: 400,
        italic: true,
        size: 18,
        lineHeight: 24,
        // The app's divider label is `letterSpacing: 0` — a positive
        // tracking is what pushed the label's LAST GLYPH out of its own
        // measured box in the app (see `md/ABOUT_PAGE_FIX.md` §2.7).
        // The board draws what the app draws.
        letterSpacing: 0,
        fill: t.dividerGold,
      }),
      rect(right, {
        x: row,
        y: y + spacing.md + 11,
        w: 120,
        h: 2,
        fill: t.dividerRule,
      }),
    ];
  }

  /**
   * The Home header (`HomeHeader.tsx`).
   *
   * Left: the lion mark (44, engraved brand ink, no container) and the
   * Allura wordmark at 52 px (the clamp for a 411 dp screen). Right: the
   * 42 px search button and the 42 px gold-ringed avatar.
   *
   * The positions are measured: the search circle's top edge is 44 dp, the
   * lion's ink starts 4.9 dp inside its 44 dp box (the SVG's own viewBox
   * padding), and the wordmark's ink starts at 72.7 dp — the 16 dp gutter,
   * the 44 dp lion and the 12 dp gap.
   */
  function homeHeader(name, o = {}) {
    const top = o.y != null ? o.y : INSETS_TOP + spacing.md;
    const wordmarkSize = o.wordmarkSize || 52;
    const wordmarkLH = 56;
    const searchX = SCREEN_W - spacing.lg - 42 - spacing.sm - 42;
    const avatarX = SCREEN_W - spacing.lg - 42;
    return [
      // The lion — an engraved brand-ink mark on the parchment: the app's
      // own `ui_lion.svg`, no container, no gold tint (`HomeHeader.tsx:124-129`).
      image(name + ' lion', {
        x: spacing.lg,
        y: top + 2,
        w: 44,
        h: 44,
        media: iconKey('lion'),
      }),
      text(name + ' wordmark', 'Simba', {
        x: spacing.lg + 44 + spacing.md,
        y: top - 4,
        family: 'Allura',
        weight: 400,
        size: wordmarkSize,
        lineHeight: wordmarkLH,
        fill: c.accent.gold,
      }),
      // Search — a 42x42 elevated circle with the app's magnifier in it.
      ellipse(name + ' search', {
        x: searchX,
        y: top,
        w: 42,
        h: 42,
        fill: c.background.elevated,
      }),
      image(name + ' search icon', {
        x: searchX + 11,
        y: top + 11,
        w: 20,
        h: 20,
        media: iconKey('search'),
      }),
      // The avatar — a gold ring around the user's initial. The app draws
      // the user's PHOTO here when there is one (`HomeHeader.tsx:180-192`);
      // the prototype draws the app's own fallback — the initial in gold —
      // so no private photograph ends up in a shared design file.
      ellipse(name + ' avatar', {
        x: avatarX,
        y: top,
        w: 42,
        h: 42,
        fill: c.background.elevated,
        stroke: c.accent.gold,
        strokeWidth: 1.5,
      }),
      text(name + ' avatar initial', 'P', {
        x: {center: avatarX + 21},
        y: top + 13,
        family: 'Inter',
        weight: 700,
        size: 16,
        lineHeight: 20,
        fill: c.accent.gold,
        align: 'center',
      }),
    ];
  }

  /**
   * The greeting card — rules P5 and P6.
   *
   * The app's v9g composition (`WeatherGreeting.tsx`): a chip | greeting |
   * weather row on one elevated surface. The greeting column owns the name
   * as its hero (Inter Bold gold, 32 px for a five-letter name); the
   * weather column is structurally separate, so the caption can never sit
   * "under" the name.
   *
   * The card is 96 dp tall — MEASURED on the device — because the weather
   * column (a 30 dp temperature line + a 40 dp two-line caption) is 72 dp
   * and the row is as tall as its tallest child. The chip (56 dp) is
   * therefore centred in that row, which puts its top edge 20 dp below the
   * card's top, not 12.
   *
   * The chip is the app's OWN rendering — a Meteocons Lottie over a vertical
   * LinearGradient — cropped from the device, because Penpot can render
   * neither a Lottie nor a gradient.
   */
  function greetingCard(name, o) {
    const h = o.h || 96;
    const rowH = h - spacing.md * 2;
    const rowTop = o.y + spacing.md;
    const chipX = spacing.md + spacing.md;
    const chipW = 56;
    const greetingX = chipX + chipW + spacing.md;
    const rightEdge = SCREEN_W - spacing.md - spacing.md;
    const greetingH = 20 + 2 + 38;
    const weatherH = 30 + 2 + 40;
    const greetingTop = rowTop + (rowH - greetingH) / 2;
    const weatherTop = rowTop + (rowH - weatherH) / 2;
    return [
      rect(name + ' card', {
        x: spacing.md,
        y: o.y,
        w: SCREEN_W - spacing.md * 2,
        h,
        radius: radius.lg,
        fill: c.background.elevated,
        stroke: c.border.subtle,
        strokeWidth: 1,
      }),
      // The weather chip — the app's own tile.
      image(name + ' chip', {
        x: chipX,
        y: rowTop + (rowH - chipW) / 2,
        w: chipW,
        h: chipW,
        media: 'weather.chip',
        radius: radius.md,
      }),
      // The greeting column — the name is the hero.
      text(name + ' salutation', o.salutation, {
        x: greetingX,
        y: greetingTop,
        family: 'Cormorant Garamond',
        weight: 400,
        italic: true,
        size: 16,
        lineHeight: 20,
        fill: c.text.primary,
      }),
      text(name + ' name', o.name, {
        x: greetingX,
        y: greetingTop + 22,
        family: 'Inter',
        weight: 700,
        size: 32,
        lineHeight: 38,
        letterSpacing: -0.5,
        fill: c.accent.gold,
      }),
      // The weather column — right-aligned, structurally separate. The
      // caption reads "<description> in" then the city, on two lines
      // (`WeatherGreeting.tsx:179`).
      text(name + ' temperature', o.temperature, {
        x: {right: rightEdge},
        y: weatherTop,
        family: 'Inter',
        weight: 700,
        size: 26,
        lineHeight: 30,
        fill: c.text.primary,
      }),
      text(name + ' weather', o.condition + ' in\n' + o.city, {
        x: {right: rightEdge},
        y: weatherTop + 32,
        family: 'Inter',
        weight: 400,
        size: 14,
        lineHeight: 20,
        fill: c.text.secondary,
        align: 'right',
      }),
    ];
  }

  /**
   * A media rail card — `MediaRailCard.tsx`.
   *
   * The card is a 160x90 (16:9) thumbnail with a radius of 12; the title
   * and the position line are OVERLAID on the thumbnail, not printed under
   * it (`:125-153`); a 22 px type badge sits in the top right corner
   * (`:121-123, :225-235`); and a 3 px progress bar rides the bottom edge
   * when there is a position (`:155-168, :236-243`).
   */
  function mediaCard(name, o) {
    const w = o.w || 160;
    const th = o.th || 90;
    const out = [
      image(name + ' artwork', {
        x: o.x,
        y: o.y,
        w,
        h: th,
        media: o.artwork,
        radius: radius.md,
      }),
      // The type badge — the lane's own glyph.
      ellipse(name + ' type badge', {
        x: o.x + w - 6 - 22,
        y: o.y + 6,
        w: 22,
        h: 22,
        fill: c.background.scrim,
      }),
      image(name + ' type glyph', {
        x: o.x + w - 6 - 22 + 5,
        y: o.y + 6 + 5,
        w: 12,
        h: 12,
        media: iconKey(o.lane === 'audio' ? 'music' : 'video'),
      }),
      // The bottom strip: a solid scrim with the title and the position
      // line on it (the app paints a gradient above this strip).
      rect(name + ' scrim', {
        x: o.x,
        y: o.y + th - 46,
        w,
        h: 46,
        fill: c.background.scrim,
      }),
      text(name + ' title', o.title, {
        x: o.x + spacing.sm,
        y: o.y + th - 46 + spacing.sm,
        family: 'Inter',
        weight: 700,
        size: 12,
        lineHeight: 15,
        fill: c.text.bright,
      }),
    ];
    if (o.subtitle) {
      out.push(
        text(name + ' subtitle', o.subtitle, {
          x: o.x + spacing.sm,
          y: o.y + th - 46 + spacing.sm + 17,
          family: 'Inter',
          weight: 600,
          size: 10,
          lineHeight: 13,
          fill: c.text.onMediaSoft,
        }),
      );
    }
    if (o.progress) {
      out.push(
        rect(name + ' progress track', {
          x: o.x,
          y: o.y + th - 3,
          w,
          h: 3,
          fill: c.background.highlightStrong,
        }),
        rect(name + ' progress fill', {
          x: o.x,
          y: o.y + th - 3,
          w: w * Math.min(1, o.progress),
          h: 3,
          fill: c.accent.gold,
        }),
      );
    }
    return out;
  }

  /**
   * A pinned-playlist tile — `QuickAccessShelf.tsx`.
   *
   * 160x110 with a radius of 12; the playlist's own 32x32 cover in the top
   * left; the item count in a gold-soft badge in the top right; the
   * playlist's name; and a "Jump back in" footer with a chevron
   * (`:95-124`).
   *
   * The app draws the cover as a 2x2 collage of the playlist's first four
   * items (`PlaylistCover.tsx:136-158`) with the PIN badge in its top-left
   * corner (`:170-183`) — the prototype's collage is one asset per tile,
   * rendered by `collage.js` from the same app placeholders.
   */
  function playlistTile(name, o) {
    const w = o.w || 160;
    const h = o.h || 110;
    const cover = 32;
    return [
      rect(name + ' tile', {
        x: o.x,
        y: o.y,
        w,
        h,
        radius: radius.md,
        fill: c.background.elevated,
      }),
      image(name + ' cover', {
        x: o.x + spacing.md,
        y: o.y + spacing.md,
        w: cover,
        h: cover,
        media: o.cover,
        radius: radius.sm,
      }),
      // The pin badge — the app's own state marker on the cover.
      rect(name + ' pin badge', {
        x: o.x + spacing.md + 4,
        y: o.y + spacing.md + 4,
        w: 22,
        h: 22,
        radius: radius.sm,
        fill: c.background.scrimStrong,
      }),
      image(name + ' pin glyph', {
        x: o.x + spacing.md + 4 + 4,
        y: o.y + spacing.md + 4 + 4,
        w: 14,
        h: 14,
        media: iconKey('pinFilled'),
      }),
      // The item-count badge — its width follows the count, the way the
      // app's badge does (6 px of padding either side of the label).
      rect(name + ' count badge', {
        x: {right: o.x + w - spacing.md},
        y: o.y + spacing.md,
        w: {text: name + ' count', min: 30, extra: 12},
        h: 18,
        radius: radius.sm,
        fill: c.accent.goldSoft,
      }),
      text(name + ' count', o.count, {
        x: {right: o.x + w - spacing.md - 6},
        y: o.y + spacing.md + 3,
        family: 'Inter',
        weight: 700,
        size: 10,
        lineHeight: 13,
        fill: c.accent.gold,
        align: 'right',
      }),
      text(name + ' playlist name', o.title, {
        x: o.x + spacing.md,
        y: o.y + 56,
        family: 'Inter',
        weight: 700,
        size: 15,
        lineHeight: 20,
        fill: c.text.primary,
      }),
      text(name + ' footer', 'Jump back in', {
        x: o.x + spacing.md,
        y: o.y + 82,
        family: 'Inter',
        weight: 400,
        size: 13,
        lineHeight: 18,
        fill: c.text.tertiary,
      }),
      image(name + ' footer chevron', {
        x: o.x + w - spacing.md - 14,
        y: o.y + 82 + 2,
        w: 14,
        h: 14,
        media: iconKey('chevronRight'),
      }),
    ];
  }

  /**
   * A followed-podcast card — `FollowedPodcastsShelf.tsx`.
   *
   * A 132 dp circle of artwork with a soft shadow, and the title and the
   * author centred UNDER it (`:96-146`).
   */
  function podcastCard(name, o) {
    const d = o.d || 132;
    const w = 144;
    const cx = o.x + w / 2;
    return [
      image(name + ' artwork', {
        x: o.x + (w - d) / 2,
        y: o.y,
        w: d,
        h: d,
        media: o.artwork,
        radius: d / 2,
        shadow: {color: c.shadow, offsetX: 0, offsetY: 6, blur: 12, spread: 0, opacity: 0.32},
      }),
      text(name + ' title', o.title, {
        x: {center: cx},
        y: o.y + d + spacing.md,
        family: 'Inter',
        weight: 700,
        size: 14,
        lineHeight: 18,
        fill: c.text.primary,
        align: 'center',
      }),
      text(name + ' author', o.author, {
        x: {center: cx},
        y: o.y + d + spacing.md + 20,
        family: 'Inter',
        weight: 400,
        size: 12,
        lineHeight: 16,
        fill: c.text.secondary,
        align: 'center',
      }),
    ];
  }

  /**
   * An Explore Contents card — `CategoryCard.tsx`: 140x160, the cover
   * full-bleed, a dark scrim so the text stays readable, the icon disc
   * CENTRED on the poster, and the title and description at the bottom.
   *
   * The badge is the same on every card: a 40 dp disc with a 32 dp glyph
   * inside it, in the middle of the poster. It used to sit in the top-left
   * corner, and the card with no cover had no disc at all.
   */
  function categoryCard(name, o) {
    const w = o.w || 140;
    const h = o.h || 160;
    const out = [];
    if (o.artwork) {
      out.push(
        image(name + ' artwork', {
          x: o.x,
          y: o.y,
          w,
          h,
          media: o.artwork,
          radius: radius.md,
        }),
      );
    } else {
      // No cover — the app falls back to a gold-tinted gradient tile
      // (`CategoryCard`'s `localFiles` variant).
      out.push(
        rect(name + ' card', {
          x: o.x,
          y: o.y,
          w,
          h,
          radius: radius.md,
          fill: c.accent.goldSoft,
        }),
      );
    }
    out.push(
      rect(name + ' scrim', {
        x: o.x,
        y: o.y + h - 76,
        w,
        h: 76,
        fill: 'rgba(10,10,12,0.62)',
      }),
      ellipse(name + ' icon disc', {
        x: o.x + (w - 40) / 2,
        y: o.y + (h - 40) / 2,
        w: 40,
        h: 40,
        fill: 'rgba(10,10,12,0.45)',
      }),
      // The app's own per-section glyph (`BrowseAllShelf.tsx`).
      image(name + ' icon glyph', {
        x: o.x + (w - 32) / 2,
        y: o.y + (h - 32) / 2,
        w: 32,
        h: 32,
        media: iconKey(o.icon),
      }),
      text(name + ' title', o.title, {
        x: o.x + spacing.md,
        y: o.y + h - 12 - 28 - 8 - 18,
        family: 'Inter',
        weight: 700,
        size: 14,
        lineHeight: 18,
        fill: o.artwork ? '#FFFFFF' : c.text.primary,
      }),
      text(name + ' description', o.description, {
        x: o.x + spacing.md,
        y: o.y + h - 12 - 28,
        family: 'Inter',
        weight: 400,
        size: 13,
        lineHeight: 14,
        fill: o.artwork ? 'rgba(255,255,255,0.78)' : c.text.tertiary,
      }),
    );
    return out;
  }

  /**
   * A genre chip — `GenreChipsShelf.tsx`.
   *
   * A 44 dp pill with a 1 px border, a 28 dp circle holding the app's music
   * glyph, the genre's name, and a count badge (`:96-128`). The shelf's
   * header is NOT a `SectionHeader` — it is a plain `displaySans` title
   * ("Browse by Genre") on the content gutter (`:29-33, :80-90`).
   */
  function genreChip(name, o) {
    const h = 44;
    const circle = 28;
    const label = name + ' label';
    const badge = name + ' count badge';
    const out = [
      // The pill's width follows the label, the way the app's row does:
      // 10 px of padding, the 28 px circle, a 4 px gap, the label, a 4 px
      // gap, the 20 px count badge and 10 px of padding.
      rect(name + ' bg', {
        x: o.x,
        y: o.y,
        w: {text: label, min: 80, extra: 76},
        h,
        radius: radius.full,
        fill: c.accent.goldDim,
        stroke: c.border.subtle,
        strokeWidth: 1,
      }),
      ellipse(name + ' icon circle', {
        x: o.x + 10,
        y: o.y + (h - circle) / 2,
        w: circle,
        h: circle,
        fill: c.background.scrimSoft,
      }),
      image(name + ' icon glyph', {
        x: o.x + 10 + (circle - 16) / 2,
        y: o.y + (h - circle) / 2 + (circle - 16) / 2,
        w: 16,
        h: 16,
        media: iconKey('musicChip'),
      }),
      text(label, o.label, {
        x: o.x + 10 + circle + 4,
        y: o.y + (h - 18) / 2,
        family: 'Inter',
        weight: 600,
        size: 13,
        lineHeight: 18,
        fill: c.text.bright,
      }),
      rect(badge, {
        x: {after: {name: label, edge: 'right', pad: 4}},
        y: o.y + (h - 18) / 2,
        w: 20,
        h: 18,
        radius: radius.sm,
        fill: c.background.highlightStrong,
      }),
      text(name + ' count', String(o.count), {
        x: {centerOf: badge},
        y: o.y + (h - 18) / 2,
        family: 'Inter',
        weight: 700,
        size: 11,
        lineHeight: 15,
        fill: c.text.onMediaSoft,
        align: 'center',
      }),
    ];
    return out;
  }

  /**
   * The floating action button — the app's "play a local media file".
   * It floats over the content: `insets.bottom + spacing.lg`.
   */
  function fab(name, o) {
    return [
      ellipse(name + ' circle', {
        x: o.x,
        y: o.y,
        w: 56,
        h: 56,
        fill: c.accent.gold,
      }),
      image(name + ' play', {
        x: o.x + 16,
        y: o.y + 16,
        w: 24,
        h: 24,
        media: iconKey('play'),
      }),
    ];
  }

  /**
   * The quiet empty line — rule P3. One line of tertiary text, and
   * nothing else.
   */
  function quietEmpty(name, text_, o) {
    return [
      text(name, text_, {
        x: spacing.md,
        y: o.y,
        family: 'Inter',
        weight: 400,
        size: 13,
        lineHeight: 18,
        fill: c.text.tertiary,
      }),
    ];
  }

  return {
    theme: t,
    c,
    iconKey,
    text,
    rect,
    ellipse,
    image,
    shelfHeader,
    divider,
    homeHeader,
    greetingCard,
    mediaCard,
    playlistTile,
    podcastCard,
    categoryCard,
    genreChip,
    fab,
    quietEmpty,
  };
}

module.exports = {
  kit,
  themeOf,
  fontOf,
  PENPOT_FAMILY,
  SCREEN_W,
  SCREEN_H,
  INSETS_TOP,
  spacing,
  radius,
  spec,
};
