#!/usr/bin/env node
/**
 * music-radio.js — the Music and Radio boards, and their filter sheets.
 *
 * FOUR BOARDS, SEPARATELY
 * -----------------------
 * The Movies page established the pattern (2026-11-13): the page and its
 * filter are two boards of their own, in both themes. Music and Radio
 * follow it:
 *
 *   • "MusicScreen / light — screen"  — the page as it opens.
 *   • "MusicScreen / light — filter"  — the page with the app's own sheet.
 *   • "RadioScreen / light — screen"  — the page as it opens.
 *   • "RadioScreen / light — filter"  — the page with the app's own sheet.
 *
 * WHY THE PAGES ARE DRAWN WITH ONE FILTER ACTIVE
 * ----------------------------------------------
 * Grammar element 4 — the ACTIVE-filter strip — is INVISIBLE when nothing
 * is filtered. A board that draws the default state would not show the
 * family at all, and the strip is the one place where a filter says so.
 *
 * So both boards are drawn with ONE filter active: "Rock" on Music, "pop"
 * on Radio. The strip carries the chip, the list answers the filter, and
 * the filter board shows the SAME choice highlighted in the sheet — which
 * is the connection the strip exists to make.
 *
 * WHERE EVERY NUMBER COMES FROM
 * -----------------------------
 * The geometry is read out of the app's own components — not eyeballed,
 * not typed in by hand:
 *
 *   • the header is `InternalHeader` (60 dp: 12 + a 36 dp button + 12);
 *   • the field is `SearchBar` — 44 dp, `radius.pill`, the app's own
 *     18 dp magnifier and its 15 px Inter;
 *   • the search row is the shell's own: 16 dp above the field, 12 below
 *     (`BrowseLayout.tsx:299-303`);
 *   • the strip chip is the shared `FilterChips` chip — 10 dp of
 *     horizontal padding, 4 dp of vertical padding, a 1 dp border, a pill
 *     radius and an 11 px Inter SemiBold label
 *     (`FilterChips.tsx:207-232`). Radio's and Live TV's own chips were
 *     44 dp gold-dim pills with a 12 px caption — a different language
 *     from every other browse surface — and they now speak the shared
 *     chip's language too;
 *   • the Music row is `TrackCard` — a 52 dp thumb, a 14 px SemiBold
 *     title, a 13 px artist line, a 13 px album line and the duration
 *     (`TrackCard.styles.ts`, `TrackCard.tsx`);
 *   • the Radio row is `RadioStationCard` — a 48 dp favicon, a 14 px
 *     SemiBold name, a 13 px "country · tag" subtitle, a codec badge and
 *     a bitrate (`RadioStationCard.tsx`);
 *   • the FAB is `Fab` — a 56 dp gold disc with the app's `sliders` glyph,
 *     floating at `insets.bottom + spacing.lg`;
 *   • the sheet is the app's own `FilterSheet` — a 32 dp chip with a
 *     1.5 dp border and 12 dp of horizontal padding, an 11 px group
 *     title, a 40 dp grabber zone, a divider with 12 dp either side, and
 *     a RESET footer that appears only when something is active.
 *
 * THE CONTENT IS THE APP'S OWN
 * -----------------------------
 * The Music titles, artists, albums and durations are Jamendo's own
 * first screenful, fetched on 2026-11-16 with the app's own client id
 * and the app's own `order` chain. The Radio stations are radio-browser's
 * own `/json/stations/topclick` first screenful, same day, and the
 * subtitles are the app's OWN rule (`country · first tag`,
 * `related/stationRow.ts`).
 *
 * The ARTWORK cannot be the app's own: the Music row draws Jamendo's
 * album art and the Radio row draws a station favicon, and both are
 * remote URLs a Penpot board cannot fetch. So the rows carry the app's
 * OWN bundled audio placeholders — the same pictures the app ships for
 * audio with no artwork of its own.
 *
 * THE RADIO SHEET IS A PANEL, NOT A SHEET
 * ---------------------------------------
 * The Radio sheet carries three groups — 40 genres, 30 countries and 30
 * languages — so its body is far taller than the screen. The app's own
 * `FilterSheet` caps the sheet at `snapPoints={['auto', '92%']}`, so it
 * opens at 92 % of the window and scrolls. The board draws that: a panel
 * from 73 dp down, which is what the user actually sees. The three
 * groups' worth of chips is recorded in the wave md, not drawn here.
 */

'use strict';

const {kit, SCREEN_W, SCREEN_H, spacing, radius} = require('./kit');
const {profileKit, HEADER_H} = require('./profile');
const {measure} = require('./text-metrics');

// ─── the page's own metrics ────────────────────────────────────────────────

/**
 * THE STATUS BAND — the strip above the app's own content.
 *
 * MEASURED on `emulator-5554` (2026-11-13): the app's WINDOW starts 24 dp
 * below the screen's top (the status bar is a strip of its own, not an
 * overlay) and the window's BOTTOM is the screen's bottom (the
 * navigation bar is OVERLAID on the window). So the page's content starts
 * 24 dp down the canvas and the bottom-anchored furniture is anchored to
 * the canvas's bottom.
 */
const STATUS_INSET = 24;

/** The page's gutter — `spacing.lg` (16), the shell's own gutter. */
const GUTTER = spacing.lg; // 16

/** The field (`SearchBar.tsx:147-155`). */
const FIELD = {
  h: 44,
  padX: spacing.md, // 12
  glyph: 18,
  gap: spacing.sm, // 8
  textSize: 15,
  textLine: 22,
};

/**
 * The shell's stack (`BrowseLayout.tsx:185-236`).
 *
 *   header 60 → search slot (16 above the field, 44 of field, 12 below)
 *   → chip slot (the chips sit on the search slot's 12 dp, and the slot
 *     carries 12 dp below) → the content.
 *
 *   60 + 16 = 76 (the field's top)
 *   76 + 44 + 12 = 132 (the chips' top)
 *   132 + 23 + 12 = 167 (the content's top)
 *
 * The chip is 23 dp tall: the shared `FilterChips` chip is a 13 px label
 * with 4 dp of padding either side and a 1 dp border
 * (`FilterChips.tsx:207-232`).
 */
const SHELL = {
  fieldY: HEADER_H + spacing.lg, // 76
  chipsY: HEADER_H + spacing.lg + FIELD.h + spacing.md, // 132
  chipH: 13 + 4 + 4 + 1 + 1, // 23
  chipPadX: spacing.sm + 2, // 10
  chipBorder: 1,
  chipGap: 4,
  chipLabelSize: 11,
  chipLabelLine: 13,
  contentY: 132 + 23 + spacing.md, // 167
};

/**
 * The FAB (`Fab.tsx:63,143-159`).
 *
 * A 56 dp gold disc, `spacing.xl` (20) from the right edge, the app's
 * 24 dp `sliders` glyph in `text.inverse`, floating at
 * `insets.bottom + spacing.lg`.
 */
const FAB = {
  size: 56,
  right: spacing.xl, // 20
  bottomInset: 24, // the emulator's insets.bottom
  gap: spacing.lg, // 16
  glyph: 24,
};

/**
 * The sheet (`FilterSheet.tsx:426-509`).
 *
 * The chip is a 32 dp pill with a 1.5 dp border and 12 dp of horizontal
 * padding; the group title is 11 px, weight 600, `letterSpacing 1.4`; the
 * first group reserves 40 dp at the top for true-sheet's native grabber;
 * the groups are separated by a hairline with 12 dp either side.
 *
 * The group title's LINE HEIGHT is 24, not 16: the title is an `AppText`
 * with no variant, so it keeps the default variant's line height
 * (`body1` = 17/24) and only overrides the size.
 */
const SHEET = {
  padX: GUTTER,
  grabberZone: 40,
  grabberW: 36,
  grabberH: 4,
  titleSize: 11,
  titleLine: 24,
  titleGap: spacing.sm, // 8
  chipH: 32,
  chipPadX: spacing.md, // 12
  chipBorder: 1.5,
  chipGap: spacing.sm, // 8
  chipLabelSize: 13,
  chipLabelLine: 15,
  dividerMargin: spacing.md, // 12
  bottomPadding: spacing.sm, // 8
  radius: radius.lg, // 16
  toggleSize: 12,
  toggleLine: 24,
  toggleLetterSpacing: 1.5,
  togglePadY: spacing.sm, // 8
  toggleMarginTop: spacing.xs, // 4
  toggleGlyph: 14,
  toggleGap: spacing.xs, // 4
  /** The sheet's cap: `snapPoints={['auto', '92%']}`. */
  maxFraction: 0.92,
};

// ─── the content, taken from the app's own live sources ────────────────────

/**
 * The Music screen's first screenful — Jamendo's own `popularity_total`
 * page, fetched on 2026-11-16 with the app's own client id.
 *
 * The durations are the app's OWN format: floored seconds
 * (`TrackCard.tsx:35-40`).
 */
const TRACKS = [
  {title: 'Wish You Were Here', artist: 'The.madpix.project', album: 'Wish You Were Here', duration: '4:30'},
  {title: 'RED LIGHT', artist: 'Egor Budennyy', album: 'RED LIGHT', duration: '3:10'},
  {title: 'What Is Love', artist: 'Melanie Ungar', album: 'What Is Love', duration: '4:32'},
  {title: 'Love Will Come Back Again', artist: 'Chaz Robinson', album: 'Chaz Robinson', duration: '4:56'},
  {title: 'First', artist: 'JekK', album: 'Dear Dreams', duration: '3:24'},
  {title: 'In Tune (J. Glaze Remix)', artist: 'Kellee Maize', album: 'The Remixes (2015)', duration: '6:46'},
  {title: 'Energy', artist: 'Pokki DJ', album: 'Energy', duration: '4:50'},
];

/** The Music row's artwork, in the order the rows use it. */
const TRACK_ARTWORK = [
  'ph.musicRow1',
  'ph.musicRow2',
  'ph.musicRow3',
  'ph.musicRow4',
  'ph.musicRow5',
  'ph.musicRow6',
  'ph.musicRow1',
];

/**
 * The Radio screen's first screenful — radio-browser's own
 * `/json/stations/topclick`, fetched on 2026-11-16.
 *
 * The subtitle is the app's OWN rule: the country and the station's first
 * tag (`related/stationRow.ts:58-64`).
 */
const STATIONS = [
  {name: 'Christmas FM Non-stop!', subtitle: 'Finland · advent', codec: 'AAC', bitrate: '128 kbps', favorite: false},
  {name: 'Radio Armisa', subtitle: 'Italy · anni 80', codec: 'MP3', bitrate: '0 kbps', favorite: false},
  {name: 'RTL', subtitle: 'France · généraliste', codec: 'AAC', bitrate: '64 kbps', favorite: false},
  {name: 'France Info', subtitle: 'France · aac', codec: 'AAC', bitrate: '192 kbps', favorite: true},
  {name: 'Classic Vinyl HD', subtitle: 'The United States Of America · 1930', codec: 'MP3', bitrate: '320 kbps', favorite: false},
  {name: 'RMC Info Talk Sport', subtitle: 'France · sports news', codec: 'MP3', bitrate: '128 kbps', favorite: false},
];

/** The Radio row's artwork, in the order the rows use it. */
const STATION_ARTWORK = [
  'ph.radioRow1',
  'ph.radioRow2',
  'ph.radioRow3',
  'ph.radioRow4',
  'ph.radioRow5',
  'ph.radioRow6',
];

/**
 * The GENRE group — the app's own ten genres
 * (`constants/musicCategories.ts`, minus the synthetic `all`, which the
 * sheet does not offer because an empty selection already means "All").
 *
 * The group is SINGLE-select (`browseConfig.ts:29-40`) and it COLLAPSES
 * to its first six chips (`collapsedRowLimit: 6`), with a SHOW MORE
 * toggle that also extends the sheet to its full detent.
 */
const MUSIC_GENRES = [
  {key: 'rock', label: 'Rock'},
  {key: 'pop', label: 'Pop'},
  {key: 'electronic', label: 'Electronic'},
  {key: 'jazz', label: 'Jazz'},
  {key: 'classical', label: 'Classical'},
  {key: 'hip-hop', label: 'Hip-Hop'},
  {key: 'ambient', label: 'Ambient'},
  {key: 'folk', label: 'Folk'},
  {key: 'blues', label: 'Blues'},
  {key: 'reggae', label: 'Reggae'},
];

/** How many of the genre chips the sheet shows before SHOW MORE. */
const COLLAPSED = 6;

/**
 * The Radio sheet's three groups — radio-browser's own tag lists, fetched
 * on 2026-11-16.
 *
 * GENRE is `/json/tags?type=genre` (ordered by station count), COUNTRY is
 * `/json/countries` and LANGUAGE is `/json/languages` — the app's own
 * three endpoints (`radioBrowser/adapter.ts:313-354`).
 *
 * A tag's ONLY identity is its NAME: the live endpoint returns
 * `{name, stationcount}` and there is no `id` at all.
 */
const RADIO_GENRES = [
  'pop', 'music', 'news', 'rock', 'talk', 'dance', 'hits', 'oldies', 'entretenimiento', 'radio', 'classical', 'jazz',
];
const RADIO_COUNTRIES = [
  'The United States Of America', 'Germany', 'France', 'The Russian Federation', 'China',
  'The United Kingdom Of Great Britain And Northern Ireland', 'Greece', 'Australia', 'Italy', 'Mexico',
];
const RADIO_LANGUAGES = [
  'english', 'german', 'spanish', 'french', 'chinese', 'russian', 'italian', 'greek', 'portuguese', 'dutch',
];

// ─── the drawing kit for one theme ─────────────────────────────────────────

function browseKit(themeName) {
  const k = kit(themeName);
  const c = k.c;
  const P = profileKit(themeName);

  const iconKey = (name) => `ico.${name}.${themeName}`;

  /**
   * The search field — the app's own `SearchBar`, unfocused.
   *
   * The magnifier is `text.tertiary` and the border stays `border.subtle`
   * — the focus ring is never gold (`md/SEARCH_PAGE_REDESIGN.md` §3.5).
   */
  function field(name, o) {
    const y = o.y;
    return [
      k.rect(name + ' box', {
        x: GUTTER,
        y,
        w: SCREEN_W - GUTTER * 2,
        h: FIELD.h,
        radius: radius.full,
        fill: c.background.elevated,
        stroke: c.border.subtle,
        strokeWidth: 1,
      }),
      k.image(name + ' glyph', {
        x: GUTTER + FIELD.padX,
        y: y + (FIELD.h - FIELD.glyph) / 2,
        w: FIELD.glyph,
        h: FIELD.glyph,
        media: iconKey('searchField'),
      }),
      k.text(name + ' text', o.placeholder, {
        x: GUTTER + FIELD.padX + FIELD.glyph + FIELD.gap,
        y: y + (FIELD.h - FIELD.textLine) / 2,
        family: 'Inter',
        weight: 400,
        size: FIELD.textSize,
        lineHeight: FIELD.textLine,
        fill: c.text.tertiary,
      }),
    ];
  }

  /**
   * The ACTIVE-filter chip — the shared `FilterChips` chip.
   *
   * ACTIVE = a gold fill with inverse text and a gold border
   * (`FilterChips.tsx:17-19, 122-135`). Radio's and Live TV's own chips
   * now speak the same language; the × is the strip's own "tap to clear"
   * affordance and it carries the inverse ink with the label.
   */
  function stripChip(name, o) {
    const labelW = measure(o.label, {
      family: 'Inter SemiBold',
      size: SHELL.chipLabelSize,
    });
    const clearW = o.clear ? SHELL.chipGap + 12 : 0;
    const w = labelW + clearW + SHELL.chipPadX * 2 + SHELL.chipBorder * 2;
    const h = SHELL.chipH;
    const out = [
      // The pill — behind the label.
      k.rect(name + ' pill', {
        x: o.x,
        y: o.y,
        w,
        h,
        radius: radius.full,
        fill: c.accent.gold,
        stroke: c.accent.gold,
        strokeWidth: SHELL.chipBorder,
      }),
      k.text(name + ' label', o.label, {
        x: o.x + SHELL.chipPadX + SHELL.chipBorder,
        y: o.y + (h - SHELL.chipLabelLine) / 2,
        family: 'Inter SemiBold',
        weight: 600,
        size: SHELL.chipLabelSize,
        lineHeight: SHELL.chipLabelLine,
        fill: c.text.inverse,
      }),
    ];
    if (o.clear) {
      out.push(
        k.image(name + ' clear', {
          x: o.x + SHELL.chipPadX + SHELL.chipBorder + labelW + SHELL.chipGap,
          y: o.y + (h - 12) / 2,
          w: 12,
          h: 12,
          media: iconKey('closeInverse'),
        }),
      );
    }
    return out;
  }

  /** The FAB — the app's ONE floating action button. */
  function fab(name, o) {
    return [
      k.ellipse(name + ' disc', {
        x: SCREEN_W - FAB.right - FAB.size,
        y: o.y,
        w: FAB.size,
        h: FAB.size,
        fill: c.accent.gold,
      }),
      k.image(name + ' glyph', {
        x: SCREEN_W - FAB.right - FAB.size + (FAB.size - FAB.glyph) / 2,
        y: o.y + (FAB.size - FAB.glyph) / 2,
        w: FAB.glyph,
        h: FAB.glyph,
        media: iconKey('sliders'),
      }),
    ];
  }

  return {k, c, P, iconKey, field, stripChip, fab, theme: k.theme};
}

// ─── the rows ──────────────────────────────────────────────────────────────

/**
 * The Music row (`TrackCard.tsx`).
 *
 * The card is 72 dp tall: 8 dp of padding, a 56 dp text column (a 14 px
 * title on an 18 dp line, 1 dp, a 13 px artist line, 1 dp, a 13 px album
 * line) and 8 dp of padding. The thumb is 52 dp, so the TEXT is what
 * makes the row its height — which is why the app's own row keeps the
 * album line.
 *
 * There is no play disc: the row IS the play action, and a second
 * affordance inside it read as a button that did nothing.
 */
function trackRow(S, name, o) {
  const y = o.y;
  const cardH = 72;
  const padX = 8;
  const infoX = GUTTER + padX + 52 + spacing.md; // 88
  return [
    S.k.rect(name + ' card', {
      x: GUTTER,
      y,
      w: SCREEN_W - GUTTER * 2,
      h: cardH,
      radius: radius.md,
      fill: S.c.background.elevated,
    }),
    S.k.image(name + ' artwork', {
      x: GUTTER + padX,
      y: y + padX,
      w: 52,
      h: 52,
      radius: radius.sm,
      media: o.artwork,
    }),
    S.k.text(name + ' title', o.title, {
      x: infoX,
      y: y + padX,
      family: 'Inter SemiBold',
      weight: 600,
      size: 14,
      lineHeight: 18,
      fill: S.c.text.primary,
    }),
    S.k.text(name + ' artist', o.artist, {
      x: infoX,
      y: y + padX + 19,
      family: 'Inter',
      weight: 400,
      size: 13,
      lineHeight: 18,
      fill: S.c.text.secondary,
    }),
    S.k.text(name + ' album', o.album, {
      x: infoX,
      y: y + padX + 38,
      family: 'Inter',
      weight: 400,
      size: 13,
      lineHeight: 18,
      fill: S.c.text.tertiary,
    }),
    S.k.text(name + ' duration', o.duration, {
      x: {right: SCREEN_W - GUTTER - padX},
      y: y + padX,
      family: 'Inter',
      weight: 400,
      size: 13,
      lineHeight: 18,
      fill: S.c.text.tertiary,
    }),
  ];
}

/**
 * The Radio row (`RadioStationCard.tsx`).
 *
 * The card is 90 dp tall: 12 dp of padding, a 66 dp text column (a 14 px
 * name on a 20 dp line, 4 dp, a 13 px subtitle, 4 dp, a 20 dp codec
 * badge) and 12 dp of padding.
 *
 * The heart is the app's OWN favourite language — the same glyph the
 * Radio header uses for the favourites screen. It used to be a BOOKMARK,
 * which is the same word as the app's bookmark feature.
 */
function stationRow(S, name, o) {
  const y = o.y;
  const cardH = 90;
  const padX = 12;
  const infoX = GUTTER + padX + 48 + spacing.md; // 88
  const playX = SCREEN_W - GUTTER - padX - 32;
  const out = [
    S.k.rect(name + ' card', {
      x: GUTTER,
      y,
      w: SCREEN_W - GUTTER * 2,
      h: cardH,
      radius: radius.md,
      fill: S.c.background.elevated,
    }),
    S.k.image(name + ' artwork', {
      x: GUTTER + padX,
      y: y + padX,
      w: 48,
      h: 48,
      radius: radius.sm,
      media: o.artwork,
    }),
    S.k.text(name + ' name', o.name, {
      x: infoX,
      y: y + padX,
      family: 'Inter SemiBold',
      weight: 600,
      size: 14,
      lineHeight: 20,
      fill: S.c.text.primary,
    }),
    S.k.text(name + ' subtitle', o.subtitle, {
      x: infoX,
      y: y + padX + 24,
      family: 'Inter',
      weight: 400,
      size: 13,
      lineHeight: 18,
      fill: S.c.text.secondary,
    }),
  ];

  // The codec badge — the app's own gold-dim pill with a 10 px label.
  const codecLabel = o.codec;
  const codecW = measure(codecLabel, {family: 'Inter', size: 10}) + 16;
  out.push(
    S.k.rect(name + ' codec badge', {
      x: infoX,
      y: y + padX + 46,
      w: codecW,
      h: 20,
      radius: radius.sm - 2,
      fill: S.c.accent.goldDim,
    }),
    S.k.text(name + ' codec', codecLabel, {
      x: infoX + 8,
      y: y + padX + 47,
      family: 'Inter',
      weight: 400,
      size: 10,
      lineHeight: 18,
      fill: S.c.accent.gold,
    }),
    S.k.text(name + ' bitrate', o.bitrate, {
      x: infoX + codecW + spacing.sm,
      y: y + padX + 47,
      family: 'Inter',
      weight: 400,
      size: 13,
      lineHeight: 18,
      fill: S.c.text.tertiary,
    }),
  );

  if (o.favorite) {
    out.push(
      S.k.image(name + ' heart', {
        x: playX - spacing.md - 16,
        y: y + (cardH - 16) / 2,
        w: 16,
        h: 16,
        media: S.iconKey('heart'),
      }),
    );
  }

  // The play glyph — a MARK, not a button: the row is the action.
  out.push(
    S.k.image(name + ' play', {
      x: playX + 8,
      y: y + (cardH - 16) / 2,
      w: 16,
      h: 16,
      media: S.iconKey('playGold'),
    }),
  );
  return out;
}

// ─── the chips of a sheet ──────────────────────────────────────────────────

/**
 * The width of one sheet chip: the label's own width on the device's pixel
 * grid, plus the chip's 12 dp of horizontal padding and its 1.5 dp border
 * on either side.
 */
function sheetChipWidth(label, selected) {
  const labelW = measure(label, {
    family: selected ? 'Inter SemiBold' : 'Inter Medium',
    size: SHEET.chipLabelSize,
  });
  return labelW + SHEET.chipPadX * 2 + SHEET.chipBorder * 2;
}

/**
 * The chip's flow — which chips share a row.
 *
 * The sheet's group is a `flexWrap: 'row'` flow with an 8 dp row gap and
 * an 8 dp column gap, inside a group that is 16 dp in from either edge.
 */
function flowChips(chips) {
  const rows = [];
  let row = [];
  let x = SHEET.padX;
  const limit = SCREEN_W - SHEET.padX;
  for (const chip of chips) {
    const w = chip.width;
    if (row.length && x + w > limit) {
      rows.push(row);
      row = [];
      x = SHEET.padX;
    }
    row.push({chip, x, w});
    x += w + SHEET.chipGap;
  }
  if (row.length) rows.push(row);
  return rows;
}

/**
 * The chips of one group, row by row.
 *
 * The PILL IS DRAWN FIRST, so the label is painted ON TOP of it — the
 * plan's order is the painting order.
 */
function sheetChips(S, prefix, rows, top) {
  const out = [];
  rows.forEach((row, rowIndex) => {
    const y = top + rowIndex * (SHEET.chipH + SHEET.chipGap);
    row.forEach(entry => {
      const chip = entry.chip;
      out.push(
        S.k.rect(prefix + ' chip ' + chip.key + ' pill', {
          x: entry.x,
          y,
          w: entry.w,
          h: SHEET.chipH,
          radius: radius.full,
          fill: chip.selected ? S.c.accent.gold : S.c.background.primary,
          stroke: chip.selected ? undefined : S.c.border.subtle,
          strokeWidth: chip.selected ? undefined : 1.5,
        }),
        S.k.text(prefix + ' chip ' + chip.key + ' label', chip.label, {
          x: entry.x + SHEET.chipPadX + SHEET.chipBorder,
          y: y + (SHEET.chipH - SHEET.chipLabelLine) / 2,
          family: chip.selected ? 'Inter SemiBold' : 'Inter Medium',
          weight: chip.selected ? 600 : 500,
          size: SHEET.chipLabelSize,
          lineHeight: SHEET.chipLabelLine,
          fill: chip.selected ? S.c.background.primary : S.c.text.primary,
        }),
      );
    });
  });
  return out;
}

// ─── the boards ────────────────────────────────────────────────────────────

/**
 * Move a list of shapes down by the status inset.
 *
 * The header is drawn by the shared profile kit, which draws the app's
 * header at the top of whatever canvas it is handed. The app's own header
 * starts BELOW the status bar.
 */
function shiftDown(shapes, dy) {
  return shapes.map(s => (typeof s.y === 'number' ? {...s, y: s.y + dy} : s));
}

/**
 * The chrome every state of the page carries: the header and the field.
 *
 * The field sits 16 dp below the header (the search slot's own padding)
 * and the page's gutter is 16 on both sides.
 */
function chrome(S, o) {
  const shapes = shiftDown(S.P.header(o.route, o.title, {rightIcon: o.rightIcon}), STATUS_INSET);
  shapes.push(
    ...S.field(o.route + ' search field', {
      y: SHELL.fieldY + STATUS_INSET,
      placeholder: o.placeholder,
    }),
  );
  return shapes;
}

/** The Music page's rows, row by row. */
function tracks(S, o) {
  const shapes = [];
  for (let i = 0; i < TRACKS.length; i++) {
    if (i >= o.maxRows) break;
    const track = TRACKS[i];
    shapes.push(
      ...trackRow(S, 'MusicScreen track ' + (i + 1), {
        y: o.top + i * 80, // the 72 dp card + the row's own 8 dp margin
        title: track.title,
        artist: track.artist,
        album: track.album,
        duration: track.duration,
        artwork: TRACK_ARTWORK[i % TRACK_ARTWORK.length],
      }),
    );
  }
  return shapes;
}

/** The Radio page's rows, row by row. */
function stations(S, o) {
  const shapes = [];
  for (let i = 0; i < STATIONS.length; i++) {
    if (i >= o.maxRows) break;
    const station = STATIONS[i];
    shapes.push(
      ...stationRow(S, 'RadioScreen station ' + (i + 1), {
        y: o.top + i * 98, // the 90 dp card + the 8 dp separator
        name: station.name,
        subtitle: station.subtitle,
        codec: station.codec,
        bitrate: station.bitrate,
        favorite: station.favorite,
        artwork: STATION_ARTWORK[i % STATION_ARTWORK.length],
      }),
    );
  }
  return shapes;
}

/**
 * THE MUSIC SCREEN — the page with one filter active.
 *
 * "Rock" is active, so the strip carries the chip (the shared
 * `FilterChips` chip, gold) and the list answers the filter.
 */
function musicScreenBoard(themeName) {
  const S = browseKit(themeName);
  const shapes = [...chrome(S, {
    route: 'MusicScreen',
    title: 'Music',
    placeholder: 'Search music…',
  })];

  // The active-filter strip — the shared chip, gold, with the label.
  shapes.push(
    ...S.stripChip('MusicScreen active filter chip', {
      x: GUTTER,
      y: SHELL.chipsY + STATUS_INSET,
      label: 'Rock',
    }),
  );

  shapes.push(...tracks(S, {top: SHELL.contentY + STATUS_INSET, maxRows: TRACKS.length}));

  // The FAB floats over the viewport: the app anchors it to the SCREEN's
  // bottom, so the content scrolls UNDER it.
  shapes.push(
    ...S.fab('MusicScreen FAB', {
      y: SCREEN_H - FAB.bottomInset - FAB.gap - FAB.size,
    }),
  );

  return {width: SCREEN_W, height: SCREEN_H, shapes};
}

/**
 * THE RADIO SCREEN — the page with one filter active.
 *
 * "pop" is active, so the strip carries the chip and the list answers the
 * filter. The header's heart — the app's own favourite language — is the
 * door to the favourites screen.
 */
function radioScreenBoard(themeName) {
  const S = browseKit(themeName);
  const shapes = [...chrome(S, {
    route: 'RadioScreen',
    title: 'Live Radio',
    rightIcon: 'heartSecondary',
    placeholder: 'Search stations…',
  })];

  // The active-filter strip — the shared chip, gold, with the × that
  // clears it.
  shapes.push(
    ...S.stripChip('RadioScreen active filter chip', {
      x: GUTTER,
      y: SHELL.chipsY + STATUS_INSET,
      label: 'pop',
      clear: true,
    }),
  );

  shapes.push(...stations(S, {top: SHELL.contentY + STATUS_INSET + 16, maxRows: STATIONS.length}));

  shapes.push(
    ...S.fab('RadioScreen FAB', {
      y: SCREEN_H - FAB.bottomInset - FAB.gap - FAB.size,
    }),
  );

  return {width: SCREEN_W, height: SCREEN_H, shapes};
}

/**
 * THE MUSIC FILTER — the page with the app's own filter sheet over it.
 *
 * The sheet is the app's `FilterSheet`: a GENRE group (the app's ten
 * genres, collapsed to six with a SHOW MORE toggle), with "Rock" drawn as
 * the applied state — the same choice the strip carries.
 */
function musicFilterBoard(themeName) {
  const S = browseKit(themeName);
  const content = musicSheetContent();

  const sheetH = content.height + FAB.bottomInset;
  const sheetTop = SCREEN_H - sheetH;

  const shapes = [...chrome(S, {
    route: 'MusicScreen',
    title: 'Music',
    placeholder: 'Search music…',
  })];
  shapes.push(...tracks(S, {top: SHELL.contentY + STATUS_INSET, maxRows: 3}));

  // The scrim over the page behind the sheet.
  shapes.push(
    S.k.rect('MusicScreen filter sheet scrim', {
      x: 0,
      y: 0,
      w: SCREEN_W,
      h: sheetTop,
      fill: S.c.background.scrim,
    }),
  );

  // The sheet's surface — a rounded top, and a square bottom.
  shapes.push(
    S.k.rect('MusicScreen filter sheet surface', {
      x: 0,
      y: sheetTop,
      w: SCREEN_W,
      h: sheetH,
      radius: SHEET.radius,
      fill: S.c.background.elevated,
    }),
    S.k.rect('MusicScreen filter sheet surface foot', {
      x: 0,
      y: sheetTop + SHEET.radius,
      w: SCREEN_W,
      h: sheetH - SHEET.radius,
      fill: S.c.background.elevated,
    }),
    // true-sheet's native grabber — the 40 dp the first group reserves.
    S.k.rect('MusicScreen filter sheet grabber', {
      x: {center: SCREEN_W / 2},
      y: sheetTop + 14,
      w: SHEET.grabberW,
      h: SHEET.grabberH,
      radius: SHEET.grabberH / 2,
      fill: S.c.border.emphasis,
    }),
    // The GENRE group title.
    S.k.text('MusicScreen filter sheet title GENRE', 'GENRE', {
      x: SHEET.padX,
      y: sheetTop + content.titleY,
      family: 'Inter SemiBold',
      weight: 600,
      size: SHEET.titleSize,
      lineHeight: SHEET.titleLine,
      letterSpacing: 1.4,
      fill: S.c.text.secondary,
    }),
  );

  shapes.push(...sheetChips(S, 'MusicScreen filter sheet', content.rows, sheetTop + content.chipsTop));

  // The SHOW MORE toggle — the app's own centred row with the gold chevron.
  const toggleLabel = 'MusicScreen filter sheet show more';
  const toggleLabelW = measure('SHOW MORE', {
    family: 'Inter',
    size: SHEET.toggleSize,
    letterSpacing: SHEET.toggleLetterSpacing,
  });
  const toggleRowW = toggleLabelW + SHEET.toggleGap + SHEET.toggleGlyph;
  const toggleLeft = (SCREEN_W - toggleRowW) / 2;
  shapes.push(
    S.k.text(toggleLabel, 'SHOW MORE', {
      x: toggleLeft,
      y: sheetTop + content.toggleTop + SHEET.togglePadY,
      family: 'Inter',
      weight: 700,
      size: SHEET.toggleSize,
      lineHeight: SHEET.toggleLine,
      letterSpacing: SHEET.toggleLetterSpacing,
      fill: S.c.accent.gold,
    }),
    S.k.image('MusicScreen filter sheet show more chevron', {
      x: toggleLeft + toggleLabelW + SHEET.toggleGap,
      y: sheetTop + content.toggleTop + SHEET.togglePadY + (SHEET.toggleLine - SHEET.toggleGlyph) / 2,
      w: SHEET.toggleGlyph,
      h: SHEET.toggleGlyph,
      media: S.iconKey('chevronDown'),
    }),
  );

  return {width: SCREEN_W, height: SCREEN_H, shapes};
}

/**
 * The Music sheet's content, laid out the app's way, from its own top.
 */
function musicSheetContent() {
  const collapsed = MUSIC_GENRES.slice(0, COLLAPSED).map(g => ({
    ...g,
    selected: g.key === 'rock',
    width: sheetChipWidth(g.label, g.key === 'rock'),
  }));
  const rows = flowChips(collapsed);

  let y = SHEET.grabberZone; // the first group's 40 dp grabber zone
  const titleY = y;
  y += SHEET.titleLine; // the group title's line box
  y += SHEET.titleGap; // the title's own marginBottom
  const chipsTop = y;
  for (let i = 0; i < rows.length; i++) {
    y += SHEET.chipH;
    if (i < rows.length - 1) y += SHEET.chipGap;
  }
  const toggleTop = y + SHEET.toggleMarginTop;
  y = toggleTop + (SHEET.toggleLine + SHEET.togglePadY * 2);
  y += SHEET.bottomPadding;

  return {titleY, chipsTop, rows, toggleTop, height: y};
}

/**
 * THE RADIO FILTER — the page with the app's own filter sheet over it.
 *
 * The Radio sheet is NOT a sheet: three groups of 40 / 30 / 30 chips do
 * not fit on a screen, so the app's `FilterSheet` caps it at
 * `snapPoints={['auto', '92%']}` and it opens at 92 % of the window —
 * 841 dp on this canvas, so its top edge is at 73 dp. The board draws
 * that, and draws the GENRE group's first rows, which is what the user
 * actually sees.
 */
function radioFilterBoard(themeName) {
  const S = browseKit(themeName);
  const content = radioSheetContent();

  const sheetH = Math.round(SCREEN_H * SHEET.maxFraction);
  const sheetTop = SCREEN_H - sheetH;

  const shapes = [...chrome(S, {
    route: 'RadioScreen',
    title: 'Live Radio',
    rightIcon: 'heartSecondary',
    placeholder: 'Search stations…',
  })];
  shapes.push(...stations(S, {top: SHELL.contentY + STATUS_INSET + 16, maxRows: 2}));

  // The scrim over the page behind the sheet.
  shapes.push(
    S.k.rect('RadioScreen filter sheet scrim', {
      x: 0,
      y: 0,
      w: SCREEN_W,
      h: sheetTop,
      fill: S.c.background.scrim,
    }),
  );

  // The sheet's surface — a rounded top, and a square bottom.
  shapes.push(
    S.k.rect('RadioScreen filter sheet surface', {
      x: 0,
      y: sheetTop,
      w: SCREEN_W,
      h: sheetH,
      radius: SHEET.radius,
      fill: S.c.background.elevated,
    }),
    S.k.rect('RadioScreen filter sheet surface foot', {
      x: 0,
      y: sheetTop + SHEET.radius,
      w: SCREEN_W,
      h: sheetH - SHEET.radius,
      fill: S.c.background.elevated,
    }),
    S.k.rect('RadioScreen filter sheet grabber', {
      x: {center: SCREEN_W / 2},
      y: sheetTop + 14,
      w: SHEET.grabberW,
      h: SHEET.grabberH,
      radius: SHEET.grabberH / 2,
      fill: S.c.border.emphasis,
    }),
    // The GENRE group title.
    S.k.text('RadioScreen filter sheet title GENRE', 'GENRE', {
      x: SHEET.padX,
      y: sheetTop + content.titleY,
      family: 'Inter SemiBold',
      weight: 600,
      size: SHEET.titleSize,
      lineHeight: SHEET.titleLine,
      letterSpacing: 1.4,
      fill: S.c.text.secondary,
    }),
  );

  shapes.push(...sheetChips(S, 'RadioScreen filter sheet', content.genreRows, sheetTop + content.chipsTop));

  // The COUNTRY group's title — where it lands once the GENRE group's
  // chips have flowed.
  shapes.push(
    S.k.text('RadioScreen filter sheet title COUNTRY', 'COUNTRY', {
      x: SHEET.padX,
      y: sheetTop + content.countryTitleY,
      family: 'Inter SemiBold',
      weight: 600,
      size: SHEET.titleSize,
      lineHeight: SHEET.titleLine,
      letterSpacing: 1.4,
      fill: S.c.text.secondary,
    }),
  );

  return {width: SCREEN_W, height: SCREEN_H, shapes};
}

/**
 * The Radio sheet's content, laid out the app's way, from its own top.
 *
 * Only the GENRE group's chips are drawn — the COUNTRY group's title is
 * the next thing on screen, and the LANGUAGE group and the RESET footer
 * are below the board's bottom edge (they are on the device too, and the
 * user scrolls to them).
 */
function radioSheetContent() {
  const genreChips = RADIO_GENRES.map(label => ({
    key: label,
    label,
    selected: label === 'pop',
    width: sheetChipWidth(label, label === 'pop'),
  }));
  const genreRows = flowChips(genreChips);

  let y = SHEET.grabberZone;
  const titleY = y;
  y += SHEET.titleLine;
  y += SHEET.titleGap;
  const chipsTop = y;
  for (let i = 0; i < genreRows.length; i++) {
    y += SHEET.chipH;
    if (i < genreRows.length - 1) y += SHEET.chipGap;
  }

  // The divider between the groups: 12 dp either side of a hairline.
  const dividerY = y + SHEET.dividerMargin;
  y = dividerY + 1 + SHEET.dividerMargin;
  const countryTitleY = y;

  return {titleY, chipsTop, genreRows, dividerY, countryTitleY, height: y};
}

module.exports = {
  browseKit,
  musicScreenBoard,
  musicFilterBoard,
  radioScreenBoard,
  radioFilterBoard,
  TRACKS,
  STATIONS,
  MUSIC_GENRES,
  RADIO_GENRES,
  RADIO_COUNTRIES,
  RADIO_LANGUAGES,
};
