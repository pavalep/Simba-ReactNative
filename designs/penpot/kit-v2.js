#!/usr/bin/env node
/**
 * kit-v2.js — the drawing vocabulary for the Home_V2 screens.
 *
 * WHY A SECOND KIT
 * ----------------
 * `kit.js` draws the Home screen the app has today. This file draws the
 * REDESIGN of it, and the redesign changes the grammar of the page, not just
 * its numbers:
 *
 *   • the greeting loses its box and becomes a three-line stack;
 *   • the shelf header loses its badge circle and becomes a plain title;
 *   • every card puts its ARTWORK WHOLE and its TEXT UNDERNEATH, so the
 *     page has exactly one card language instead of four.
 *
 * Those are different shapes, so they are a different kit. The primitives
 * (text / rect / ellipse / image), the colours, the type scale and the
 * spacing scale all still come from `kit.js` and `app-spec.js` — the app's
 * own tokens — so V2 cannot drift from the app either.
 *
 * THE NUMBERS ARE THE APP'S NUMBERS
 * ---------------------------------
 * Every size below is either a value the app already ships (the rail card's
 * 160 dp width, the 56 dp weather chip, the 12 dp radius, the 40 dp icon
 * disc, the 22 dp pin badge) or a value from the app's own spacing scale
 * (4 / 8 / 12 / 16 / 20 / 24 / 32). The type roles name the app's own
 * typography variants. Where V2 uses a size that is not a token, the comment
 * says so and says where it comes from.
 *
 * THE ONE GRID
 * ------------
 * V2 puts EVERY left-aligned thing on the same gutter — the labels, the
 * greeting, the cards — so the page reads as one column. The gutter is
 * `spacing.lg` (16), the app's own label gutter (`SectionHeader.tsx:121`).
 * V1 mixed two gutters (12 for content, 16 for labels); the mismatch is what
 * makes a screen look assembled rather than designed.
 */

'use strict';

const {kit, SCREEN_W, spacing, radius} = require('./kit');

/** The one gutter every left-aligned thing sits on. */
const GUTTER = spacing.lg; // 16

/** The rail card's width — the app's own (`MediaRailCard.tsx`). */
const RAIL_W = 160;

/** The gap between two rail cards. */
const RAIL_GAP = spacing.md; // 12

/**
 * The type roles, each one an app variant.
 *
 *   salutation  Cormorant Garamond italic 18/24 — the same face and size as
 *               the section divider's label (`SubsectionTitle.tsx`), so the
 *               greeting and the section labels speak with one voice.
 *   name        h1 — Inter Bold 32/40, gold, letter-spacing -0.5. The name
 *               is the hero, exactly as `WeatherGreeting.tsx:264-272` says.
 *   weather     caption — Inter 13/18, secondary.
 *   shelfTitle  h3 — Inter SemiBold 20/28, primary.
 *   action      caption — Inter 13/18, gold (the app's own action style,
 *               `SectionHeader.tsx:91-92`).
 *   cardTitle   bodySmall's metrics with the semibold family — Inter
 *               SemiBold 14/20. The app's own card titles are hard-coded
 *               12/700 (`MediaRailCard.tsx:139-147`); V2 gives the card a
 *               title it can actually read at arm's length.
 *   cardMeta    caption — Inter 13/18, secondary.
 *   count       overline — Inter Medium 11/16, letter-spacing 0.5, gold.
 */
const TYPE = {
  salutation: {family: 'Cormorant Garamond', weight: 400, italic: true, size: 18, lineHeight: 24},
  name: {family: 'Inter', weight: 700, size: 32, lineHeight: 40, letterSpacing: -0.5},
  weather: {family: 'Inter', weight: 400, size: 13, lineHeight: 18},
  shelfTitle: {family: 'Inter SemiBold', weight: 600, size: 20, lineHeight: 28},
  action: {family: 'Inter', weight: 400, size: 13, lineHeight: 18},
  cardTitle: {family: 'Inter SemiBold', weight: 600, size: 14, lineHeight: 20},
  cardMeta: {family: 'Inter', weight: 400, size: 13, lineHeight: 18},
  count: {family: 'Inter Medium', weight: 500, size: 11, lineHeight: 16, letterSpacing: 0.5},
};

/**
 * Build the V2 drawing helpers for one theme.
 *
 * @param {'light'|'dark'} themeName
 */
function kitV2(themeName) {
  const k = kit(themeName);
  const c = k.c;

  /** The media key of one of the app's own glyphs, in this theme. */
  const iconKey = (name) => `ico.${name}.${themeName}`;

  /** A text run in one of the type roles. */
  function role(name, str, roleName, o = {}) {
    const t = TYPE[roleName];
    return k.text(name, str, {
      x: o.x,
      y: o.y,
      family: t.family,
      weight: t.weight,
      italic: t.italic,
      size: o.size != null ? o.size : t.size,
      lineHeight: o.lineHeight != null ? o.lineHeight : t.lineHeight,
      letterSpacing: o.letterSpacing != null ? o.letterSpacing : t.letterSpacing || 0,
      fill: o.fill || c.text.primary,
      align: o.align,
    });
  }

  /**
   * The greeting — unboxed, and stacked so the NAME is the hero.
   *
   * V1 put the greeting in a 96 dp elevated card with three columns: chip,
   * greeting, weather. The card was a box around a sentence, and the weather
   * column took a third of the width away from the name — the app's own
   * comment on that layout says the split exists so the caption can never
   * sit "under" the name (`WeatherGreeting.tsx:14-31`).
   *
   * V2 answers that differently: the greeting is NOT in a box, the name is
   * the only large type on the page, and the weather is ONE quiet line
   * underneath it — a footnote can never compete with a 32 px gold name.
   * The chip moves to the top right, where it is an accent and not a third
   * column.
   */
  function greeting(name, o) {
    const chip = 56;
    const chipX = SCREEN_W - GUTTER - chip;
    const out = [
      role(name + ' salutation', o.salutation, 'salutation', {
        x: GUTTER,
        y: o.y,
        fill: c.text.primary,
      }),
      role(name + ' name', o.name, 'name', {
        x: GUTTER,
        y: o.y + 26,
        fill: c.accent.gold,
      }),
    ];
    // The weather line and the chip exist only when there IS weather — the
    // app's own rule (`WeatherGreeting.tsx:95-113`: the chip is drawn only
    // when there is a real snapshot behind it, and the weather column says
    // nothing at all when there is none). A fresh install has no location
    // permission yet, so it has neither.
    if (o.weather) {
      out.push(
        role(name + ' weather', o.weather, 'weather', {
          x: GUTTER,
          y: o.y + 74,
          fill: c.text.secondary,
        }),
        // The app's own chip — a Meteocons Lottie over a LinearGradient, so it
        // is the device's own crop (see `designs/assets/README.md`).
        //
        // It is aligned with the NAME, not with the salutation: the chip is
        // the weather, and the name is what the greeting is about.
        k.image(name + ' chip', {
          x: chipX,
          y: o.y + 18,
          w: chip,
          h: chip,
          media: 'weather.chip',
          radius: radius.md,
        }),
      );
    }
    return out;
  }

  /**
   * A shelf title — the page's second level of hierarchy.
   *
   * V1 drew every rail with the app's `SectionHeader`: a 32 dp gold-soft
   * badge with a glyph in it, the title, a "See All" and a collapse chevron.
   * Four of those on one screen is four identical gold discs, and they pull
   * the eye away from the artwork — the thing the user actually came for.
   *
   * V2 keeps the title and the action, and drops the badge and the chevron:
   * one action per row, and the gold is spent on the name, the divider
   * labels and the item counts instead.
   */
  function shelfTitle(name, o) {
    const out = [
      role(name + ' title', o.title, 'shelfTitle', {
        x: GUTTER,
        y: o.y,
        fill: c.text.primary,
      }),
    ];
    if (o.action) {
      out.push(
        role(name + ' action', o.action, 'action', {
          x: {right: SCREEN_W - GUTTER},
          y: o.y + 5,
          fill: c.accent.gold,
        }),
      );
    }
    return out;
  }

  /**
   * A media card — artwork WHOLE, text UNDERNEATH.
   *
   * V1 laid the title and the position line over the artwork on a scrim,
   * which covers the bottom half of the picture and makes the type fight the
   * image. V2 gives the artwork its full frame and puts the type on the
   * page's background, where it is always legible and the picture is always
   * the picture.
   *
   * The progress bar rides the artwork's bottom edge — the app's own place
   * for it (`MediaRailCard.tsx:155-168, :236-243`) — inset by the corner
   * radius so it does not poke out past the rounded corners.
   */
  function mediaCard(name, o) {
    const w = o.w || RAIL_W;
    const th = o.th || 90;
    const out = [
      k.image(name + ' artwork', {
        x: o.x,
        y: o.y,
        w,
        h: th,
        media: o.artwork,
        radius: radius.md,
      }),
    ];
    if (o.progress != null) {
      const inset = radius.md;
      out.push(
        k.rect(name + ' progress track', {
          x: o.x + inset,
          y: o.y + th - 3,
          w: w - inset * 2,
          h: 3,
          fill: c.background.highlightStrong,
        }),
        k.rect(name + ' progress fill', {
          x: o.x + inset,
          y: o.y + th - 3,
          w: (w - inset * 2) * Math.min(1, Math.max(0, o.progress)),
          h: 3,
          fill: c.accent.gold,
        }),
      );
    }
    out.push(
      role(name + ' title', o.title, 'cardTitle', {
        x: o.x,
        y: o.y + th + 8,
        fill: c.text.primary,
      }),
    );
    if (o.meta) {
      out.push(
        role(name + ' meta', o.meta, 'cardMeta', {
          x: o.x,
          y: o.y + th + 30,
          fill: c.text.secondary,
        }),
      );
    }
    return out;
  }

  /** The height of a media card, so the caller can lay the rhythm out. */
  const MEDIA_CARD_H = 90 + 8 + 20 + 2 + 18;

  /**
   * A pinned playlist — the artwork IS the card.
   *
   * V1's tile was a 160 x 110 box with a 32 dp cover in its top-left corner
   * and the words "Jump back in" underneath: the picture was the smallest
   * thing on the tile and the words said nothing. V2 gives the playlist its
   * own cover at the size of the other artwork on the page and lets the
   * name and the item count sit under it.
   *
   * The pin badge is the app's own state marker (`PlaylistCover.tsx:170-183`),
   * at the app's own 22 dp.
   */
  function playlistTile(name, o) {
    const w = o.w || RAIL_W;
    const cover = w;
    const badge = 22;
    return [
      k.image(name + ' cover', {
        x: o.x,
        y: o.y,
        w: cover,
        h: cover,
        media: o.cover,
        radius: radius.md,
      }),
      k.rect(name + ' pin badge', {
        x: o.x + 10,
        y: o.y + 10,
        w: badge,
        h: badge,
        radius: radius.sm,
        fill: c.background.scrimStrong,
      }),
      k.image(name + ' pin glyph', {
        x: o.x + 10 + 4,
        y: o.y + 10 + 4,
        w: badge - 8,
        h: badge - 8,
        media: iconKey('pinFilled'),
      }),
      role(name + ' playlist name', o.title, 'cardTitle', {
        x: o.x,
        y: o.y + cover + 10,
        fill: c.text.primary,
      }),
      role(name + ' count', o.count, 'count', {
        x: o.x,
        y: o.y + cover + 32,
        fill: c.accent.gold,
      }),
    ];
  }

  /** The height of a playlist tile. */
  const PLAYLIST_TILE_H = 160 + 10 + 20 + 2 + 16;

  /**
   * A followed podcast — a circle of artwork, and its name under it.
   *
   * The circle is the app's own 132 dp (`FollowedPodcastsShelf.tsx`). V2
   * drops the heavy drop shadow for a ring of the app's own border colour,
   * which separates the artwork from the parchment without the blur.
   */
  function podcastTile(name, o) {
    const d = o.d || 132;
    const w = o.w || RAIL_W;
    const cx = o.x + w / 2;
    return [
      k.image(name + ' artwork', {
        x: o.x + (w - d) / 2,
        y: o.y,
        w: d,
        h: d,
        media: o.artwork,
        radius: d / 2,
      }),
      role(name + ' title', o.title, 'cardTitle', {
        x: {center: cx},
        y: o.y + d + 12,
        fill: c.text.primary,
        align: 'center',
      }),
      role(name + ' author', o.author, 'cardMeta', {
        x: {center: cx},
        y: o.y + d + 34,
        fill: c.text.secondary,
        align: 'center',
      }),
    ];
  }

  /** The height of a podcast tile. */
  const PODCAST_TILE_H = 132 + 12 + 20 + 2 + 18;

  /**
   * A catalogue section — the app's own poster, and the name under it.
   *
   * V1 laid the title and the description over the poster on a scrim, and
   * the description was one long line that ran past the card and was cut off
   * by the next card. V2 puts both under the poster, and breaks the
   * description the way the app's own `numberOfLines={2}` breaks it.
   *
   * The poster keeps the app's 140:160 shape, scaled to the page's 160 dp
   * rail pitch, and the app's own 40 dp icon disc sits in its top-left
   * corner (`CategoryCard.tsx`).
   */
  function categoryTile(name, o) {
    const w = o.w || RAIL_W;
    const h = Math.round((w * 160) / 140); // the app's 140 x 160 card
    const out = [];
    if (o.artwork) {
      out.push(
        k.image(name + ' artwork', {
          x: o.x,
          y: o.y,
          w,
          h,
          media: o.artwork,
          radius: radius.md,
        }),
        k.ellipse(name + ' icon disc', {
          x: o.x + spacing.md,
          y: o.y + spacing.md,
          w: 40,
          h: 40,
          fill: 'rgba(10,10,12,0.45)',
        }),
        k.image(name + ' icon glyph', {
          x: o.x + spacing.md + 9,
          y: o.y + spacing.md + 9,
          w: 22,
          h: 22,
          media: iconKey(o.icon),
        }),
      );
    } else {
      // No cover — the app falls back to a gold-tinted tile
      // (`CategoryCard`'s `localFiles` variant).
      out.push(
        k.rect(name + ' artwork', {
          x: o.x,
          y: o.y,
          w,
          h,
          radius: radius.md,
          fill: c.accent.goldSoft,
        }),
        k.image(name + ' icon glyph', {
          x: o.x + w / 2 - 22,
          y: o.y + h / 2 - 22,
          w: 44,
          h: 44,
          media: iconKey(o.icon),
        }),
      );
    }
    out.push(
      role(name + ' title', o.title, 'cardTitle', {
        x: o.x,
        y: o.y + h + 10,
        fill: c.text.primary,
      }),
    );
    if (o.description) {
      out.push(
        role(name + ' description', o.description, 'cardMeta', {
          x: o.x,
          y: o.y + h + 32,
          fill: c.text.secondary,
        }),
      );
    }
    return out;
  }

  /** The height of a catalogue tile. */
  const CATEGORY_TILE_H = Math.round((RAIL_W * 160) / 140) + 10 + 20 + 2 + 36;

  return {
    theme: k.theme,
    c,
    iconKey,
    greeting,
    shelfTitle,
    mediaCard,
    playlistTile,
    podcastTile,
    categoryTile,
    MEDIA_CARD_H,
    PLAYLIST_TILE_H,
    PODCAST_TILE_H,
    CATEGORY_TILE_H,
  };
}

module.exports = {kitV2, TYPE, GUTTER, RAIL_W, RAIL_GAP};
