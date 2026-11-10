#!/usr/bin/env node
/**
 * home.js — the Home screen, drawn.
 *
 * WHAT THIS IS
 * ------------
 * The first page of the prototype. It is the screen the app opens on, so
 * it is where the redesign either earns its keep or does not.
 *
 * Two boards are produced per theme:
 *
 *   • `Home / <theme>`            the whole scroll, and the board the
 *                                prototype walks. It is WIDER than the phone
 *                                because a Penpot board clips its children
 *                                and the Explore Contents rail is nine
 *                                cards (see `fullWidth`).
 *   • `Home / <theme> — viewport`  411 × 914  — the screen as the app
 *                                renders it, viewport and all.
 *
 * THE ORDER OF THE PAGE — THE APP'S ORDER
 * ---------------------------------------
 *
 * The page is drawn in the order `useHomeScreen.ts:373-424` builds it:
 *
 *   1. header                     who am I, where am I
 *   2. greeting card              who am I today
 *   3. "Your Library"             the user's own material
 *   4. Recently Played            pick up where you left off
 *   5. Pinned Playlists           what the user chose to keep
 *   6. Bookmarks                  what the user marked
 *   7. Followed Podcasts          what the user subscribed to
 *   8. "Discover"                 the catalogue's front door
 *   9. Explore Contents           every catalogue section, one card each
 *  10. Browse by Genre            the cheap way into the catalogue
 *
 * THE FIRST VERSION OF THIS BOARD WAS WRONG
 * ----------------------------------------
 * It had a hero card the app does not have, put "Discover" above "Your
 * Library", drew the genre chips as a naked row of pills with no header,
 * no glyph and no count, drew the weather chip as a gold disc and the lion
 * as two circles, and left out three of the four rails the app always
 * renders. Every one of those was a thing the app does NOT do, invented by
 * the drawing. The board is now drawn from the app's own components.
 *
 * WHY THE PAGE SHOWS POPULATED RAILS
 * ----------------------------------
 * The device this was measured on has an empty library, so the rails
 * render their empty-state line. The board draws the rails WITH their
 * content, because that is the state a design file has to be reviewable
 * in — and because an empty rail has no "See All" (the app only offers it
 * when the rail holds more than one item) and therefore no walkable
 * connector. The empty-state copy is quoted in
 * `md/UI_UX_PROTOTYPE_REBUILD.md`.
 */

'use strict';

const {kit, SCREEN_W, SCREEN_H, INSETS_TOP, spacing} = require('./kit');

/**
 * The Explore Contents card: 140 wide, 8 apart, 12 from the edge.
 */
const CARD_W = 140;
const CARD_GAP = spacing.sm;

/** The media rail card: 160 wide, 12 apart, 12 from the edge. */
const RAIL_W = 160;
const RAIL_GAP = spacing.md;

/**
 * The width of the full-page board.
 *
 * The full-page board is the prototype's walk target, and the Explore
 * Contents rail is a HORIZONTAL rail of nine cards: on the device only two
 * and a half of them fit, and the other six run off the right edge.
 *
 * A Penpot board clips its children to its own bounds — a shape outside the
 * board is not drawn and cannot be clicked. So a 411-wide board would make
 * six of the nine catalogue sections unreachable in Play, and "Shows" has
 * no other route in the app (`BrowseAllShelf` is the only place that
 * navigates to `ShowsScreen`), which would leave the walk with a dead end.
 *
 * The full-page board is therefore WIDER than the phone: the 411-wide phone
 * column is exactly the viewport board's content, and the rail runs on to
 * the right, the way the app's rail continues off the screen. The hairline
 * at x = 411 marks where the device's screen ends.
 */
function fullWidth(categoryCount) {
  return (
    spacing.md + (categoryCount - 1) * (CARD_W + CARD_GAP) + CARD_W + spacing.md
  );
}

/**
 * The catalogue sections, in the app's own order
 * (`BrowseAllShelf.tsx` → `BROWSE_ALL_SECTIONS`). Each one carries the
 * cover the app itself ships for that section (`CATEGORY_COVERS`), the
 * app's own per-section glyph and the app's own description.
 */
const CATEGORIES = [
  {name: 'Movies', description: 'Classic, sci-fi, noir & more', icon: 'clapperboard', media: 'cat.movies'},
  {name: 'Podcasts', description: 'Arts, news, science & more', icon: 'podcastRings', media: 'cat.podcasts'},
  {name: 'Music', description: 'Rock, jazz, classical & more', icon: 'disc3', media: 'cat.music'},
  {name: 'Radio', description: 'Live stations worldwide', icon: 'radioTower', media: 'cat.radio'},
  {name: 'Live TV', description: 'News, sports & entertainment', icon: 'tv', media: 'cat.livetv'},
  {name: 'Audiobooks', description: 'Fiction, mystery, history & more', icon: 'bookOpen', media: 'cat.audiobooks'},
  {name: 'Shows', description: 'Drama, comedy, sci-fi & more', icon: 'videoCamera', media: 'cat.shows'},
  {name: 'Archive', description: 'Audio, video & old-time radio', icon: 'archive', media: 'cat.archive'},
  {name: 'Local Files', description: 'Linked folders and offline media', icon: 'folder', media: null},
];

/**
 * The library.
 *
 * These are the board's own sample records — the app has no fixed
 * catalogue of titles, it shows the user's own files — but every FIELD is
 * one the app itself renders: the title, the lane (which picks the type
 * badge's glyph), the position line in the app's own
 * `position / duration` format (`utils/mediaTime.ts:63-70`), the progress
 * fraction, and the bookmark's `position · date` line.
 *
 * The genres on the records are what the "Browse by Genre" shelf counts:
 * the app derives that shelf from the local track store
 * (`useHomeScreen.ts:143-155`), so the chip counts are the board's own
 * library tallied by genre. They agree with the cards that are on the
 * board — nothing is counted that is not shown.
 */
const RECENT = [
  {title: 'Kind of Blue', lane: 'audio', subtitle: '12:44 / 46:12', media: 'ph.rail1', progress: 0.27, genre: 'Jazz'},
  {title: 'Blue in Green', lane: 'audio', subtitle: '1:08 / 5:42', media: 'ph.rail4', progress: 0.2, genre: 'Jazz'},
  {title: 'Clair de Lune', lane: 'audio', subtitle: '3:41 / 5:12', media: 'ph.rail2', progress: 0.71, genre: 'Classical'},
  {title: 'Music for Airports', lane: 'audio', subtitle: '22:10 / 49:00', media: 'ph.rail5', progress: 0.45, genre: 'Ambient'},
];

/** The pinned playlists — the app's own tile (`QuickAccessShelf.tsx`). */
const PINNED = [
  {title: 'Late Night Jazz', count: '12 ITEMS', cover: 'ph.collage1'},
  {title: 'Deep Focus', count: '8 ITEMS', cover: 'ph.collage2'},
  {title: 'Road Trip', count: '21 ITEMS', cover: 'ph.collage3'},
];

/** The bookmarks — the same card as the rail, with the app's own line. */
const BOOKMARKS = [
  {title: 'Kind of Blue', lane: 'audio', subtitle: '4:12 · 11/2/2026', media: 'ph.rail1'},
  {title: 'Clair de Lune', lane: 'audio', subtitle: '1:55 · 11/1/2026', media: 'ph.rail2'},
  {title: 'Planet Earth II', lane: 'video', subtitle: '22:10 · 10/31/2026', media: 'ph.rail3'},
];

/** The followed podcasts — a circle of artwork and two centred lines. */
const PODCASTS = [
  {title: 'Radiolab', author: 'WNYC Studios', media: 'ph.pod1'},
  {title: 'The Rest Is History', author: 'Tommy Bowker', media: 'ph.pod2'},
  {title: 'Huberman Lab', author: 'Andrew Huberman', media: 'ph.pod3'},
];

/**
 * The genre shelf.
 *
 * The app's shelf is a row of pills, each with a music glyph in a circle,
 * the genre's name and a count of the tracks in it
 * (`GenreChipsShelf.tsx`). It is NOT a `SectionHeader` — it has its own
 * plain title — and it is drawn LAST, after Explore Contents, because
 * `useHomeScreen.ts:421-424` pushes it after the literal section array.
 *
 * The counts are the board's own library tallied by genre (see `RECENT`).
 */
const GENRES = ['Jazz', 'Classical', 'Ambient'];

/**
 * Draw the Home screen.
 *
 * @param {'light'|'dark'} theme
 * @param {{full?: boolean}} opts  `full` draws the whole scroll.
 * @returns {{shapes: object[], height: number, width: number}}
 */
function homeBoard(theme, opts = {}) {
  const k = kit(theme);
  const full = !!opts.full;
  const shapes = [];

  // Where the device's screen ends. The board is wider than the phone so
  // that the whole rail is on it; this hairline says where the phone's own
  // right edge is, so the extra width reads as "the rail continues" and not
  // as a mistake in the layout.
  //
  // It is drawn FIRST, so it sits BEHIND the content: on the device the
  // rail is clipped by the screen edge, and a hairline painted across the
  // Music card's artwork would read as a defect rather than as an edge.
  const pageH = full ? 1600 : SCREEN_H;
  if (full) {
    shapes.push(
      k.rect('Screen edge — the device right edge', {
        x: SCREEN_W,
        y: 0,
        w: 1,
        h: pageH,
        fill: k.c.border.subtle,
      }),
    );
  }

  // ── 1. the header ─────────────────────────────────────────────────
  shapes.push(...k.homeHeader('Home header'));

  // ── 2. the greeting card ──────────────────────────────────────────
  // The card's top edge was MEASURED on the device: 123 dp. The greeting
  // column holds the name as its hero; the weather column sits to the
  // right; the chip is the app's own tile.
  const CARD_TOP = 123;
  shapes.push(
    ...k.greetingCard('Greeting', {
      y: CARD_TOP,
      salutation: 'Good afternoon,',
      name: 'Paval',
      temperature: '11°',
      condition: 'Mainly clear',
      city: 'San Jose',
    }),
  );

  // The greeting section's own bottom padding is 12 (`WeatherGreeting.tsx:227-231`).
  let y = CARD_TOP + 96 + spacing.md;

  // ── 3. "Your Library" ─────────────────────────────────────────────
  // `SubsectionTitle` has `marginTop: spacing.sm` (8) above itself.
  y += spacing.sm;
  shapes.push(...k.divider('Library divider', 'Your Library', y));
  y += 48;

  // ── 4. Recently Played ────────────────────────────────────────────
  // The rail always renders. Its header carries the app's own clock glyph
  // and — because the rail holds more than one item — a "See All" and the
  // collapse chevron.
  shapes.push(
    ...k.shelfHeader('Recently Played', {
      y,
      title: 'Recently Played',
      icon: 'clock',
      seeAll: true,
      chevron: true,
    }),
  );
  y += 56;
  RECENT.forEach((item, i) => {
    shapes.push(
      ...k.mediaCard('Recently Played card ' + (i + 1), {
        x: spacing.md + i * (RAIL_W + RAIL_GAP),
        y,
        title: item.title,
        subtitle: item.subtitle,
        artwork: item.media,
        lane: item.lane,
        progress: item.progress,
      }),
    );
  });
  y += 90 + 8 + spacing.xxl;

  // ── 5. Pinned Playlists ───────────────────────────────────────────
  shapes.push(
    ...k.shelfHeader('Pinned Playlists', {
      y,
      title: 'Pinned Playlists',
      icon: 'listMusic',
      seeAll: true,
      chevron: true,
    }),
  );
  y += 56;
  PINNED.forEach((item, i) => {
    shapes.push(
      ...k.playlistTile('Pinned playlist tile ' + (i + 1), {
        x: spacing.md + i * (RAIL_W + RAIL_GAP),
        y,
        title: item.title,
        count: item.count,
        cover: item.cover,
      }),
    );
  });
  y += 110 + 4 + spacing.xxl;

  // ── 6. Bookmarks ──────────────────────────────────────────────────
  shapes.push(
    ...k.shelfHeader('Bookmarks', {
      y,
      title: 'Bookmarks',
      icon: 'bookmark',
      seeAll: true,
      chevron: true,
    }),
  );
  y += 56;
  BOOKMARKS.forEach((item, i) => {
    shapes.push(
      ...k.mediaCard('Bookmark tile ' + (i + 1), {
        x: spacing.md + i * (RAIL_W + RAIL_GAP),
        y,
        title: item.title,
        subtitle: item.subtitle,
        artwork: item.media,
        lane: item.lane,
      }),
    );
  });
  y += 90 + 8 + spacing.xxl;

  // ── 7. Followed Podcasts ──────────────────────────────────────────
  shapes.push(
    ...k.shelfHeader('Followed Podcasts', {
      y,
      title: 'Followed Podcasts',
      icon: 'podcastRings',
      seeAll: true,
      chevron: true,
    }),
  );
  y += 56;
  PODCASTS.forEach((item, i) => {
    shapes.push(
      ...k.podcastCard('Followed podcast card ' + (i + 1), {
        x: spacing.md + i * (144 + spacing.md),
        y,
        title: item.title,
        author: item.author,
        artwork: item.media,
      }),
    );
  });
  y += 132 + spacing.md + 18 + 2 + 16 + spacing.lg;

  // ── 8. "Discover" ─────────────────────────────────────────────────
  y += spacing.sm;
  shapes.push(...k.divider('Discover divider', 'Discover', y));
  y += 48 + spacing.sm;

  // ── 9. Explore Contents ───────────────────────────────────────────
  // The only rail with NO action and NO chevron: `BrowseAllShelf` passes
  // neither `actionLabel` nor `collapsible` to `SectionHeader`.
  shapes.push(
    ...k.shelfHeader('Explore Contents', {y, title: 'Explore Contents', icon: 'compass'}),
  );
  y += 56;

  // The rail: 140 px cards, 8 px apart, 12 px from the edge. The device
  // frame draws the three cards that fit. The full-page board draws the
  // WHOLE rail: the cards past the third run on past x = 411, exactly as
  // they run off the screen in the app. Every one of them is a real shape
  // with a real connector, so the design file shows the whole catalogue
  // and the walk can reach it. (A Penpot board clips its children, so a
  // card outside the board would not be drawn and could not be clicked —
  // see `fullWidth`.)
  //
  // "Local Files" has no cover of its own — the app draws it as the
  // fallback tile, and so does the board.
  const drawn = full ? CATEGORIES : CATEGORIES.slice(0, 3);
  drawn.forEach((cat, i) => {
    shapes.push(
      ...k.categoryCard('Browse card ' + cat.name, {
        x: spacing.md + i * (CARD_W + CARD_GAP),
        y,
        title: cat.name,
        description: cat.description,
        artwork: cat.media,
        icon: cat.icon,
      }),
    );
  });
  y += 160 + spacing.lg;

  // ── 10. Browse by Genre ───────────────────────────────────────────
  // The shelf's own header is NOT a `SectionHeader` — it is a plain
  // `displaySans` title on the content gutter (`GenreChipsShelf.tsx:29-33`).
  shapes.push(
    k.text('Genre shelf title', 'Browse by Genre', {
      x: spacing.md,
      y,
      family: 'Manrope SemiBold',
      weight: 700,
      size: 22,
      lineHeight: 28,
      letterSpacing: -0.5,
      fill: k.c.text.primary,
    }),
  );
  y += 28 + spacing.md;

  const chipShapes = [];
  GENRES.forEach((genre, i) => {
    const name = 'Genre ' + genre;
    const count = RECENT.filter(r => r.genre === genre).length;
    const chip = k.genreChip(name, {
      x: spacing.md,
      y,
      label: genre,
      count,
    });
    // The chip's own width is measured by Penpot (the label decides it),
    // so the next chip hangs off the one before it and the count badge
    // hangs off the label.
    chip[0].x = i === 0 ? spacing.md : {chain: {prev: 'Genre ' + GENRES[i - 1] + ' bg', gap: CARD_GAP}};
    chipShapes.push(...chip);
  });
  shapes.push(...chipShapes);
  y += 44 + spacing.xxl;

  if (!full) {
    // ── the FAB, floating over the viewport ────────────────────────
    // `Fab.tsx` positions it at `insets.bottom + spacing.lg` — it is a
    // VIEWPORT overlay, not part of the scroll, so it belongs to the
    // device frame and not to the full-page board.
    shapes.push(...k.fab('FAB', {x: SCREEN_W - spacing.xl - 56, y: SCREEN_H - 24 - spacing.lg - 56}));
    return {shapes, height: SCREEN_H, width: SCREEN_W};
  }

  return {shapes, height: y, width: fullWidth(CATEGORIES.length)};
}

module.exports = {
  homeBoard,
  CATEGORIES,
  GENRES,
  RECENT,
  PINNED,
  BOOKMARKS,
  PODCASTS,
  fullWidth,
};
