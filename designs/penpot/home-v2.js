#!/usr/bin/env node
/**
 * home-v2.js — the REDESIGN of the Home screen.
 *
 * WHAT THIS IS
 * ------------
 * `home.js` draws the Home screen the app has today. This file draws the
 * second version of it: the same sections, the same data, the same
 * navigation — a different screen.
 *
 * WHAT CHANGED, AND WHY
 * ----------------------
 *
 *   1. THE GREETING IS NOT IN A BOX.
 *      V1 drew it as a 96 dp elevated card with three columns (chip,
 *      greeting, weather). The card wrapped a sentence in a rectangle and
 *      took a third of the width away from the name. V2 drops the card: the
 *      salutation, the name and one quiet weather line sit directly on the
 *      page, the name is the only large type on the screen, and the chip
 *      moves to the top right where it is an accent rather than a third
 *      column.
 *
 *   2. EVERY CARD PUTS ITS ARTWORK WHOLE AND ITS TEXT UNDERNEATH.
 *      V1 had four different card grammars: text over the artwork on a
 *      scrim (media, categories), a tiny cover in a box with a filler
 *      footer (playlists), and a circle with a heavy shadow (podcasts).
 *      V2 has one: art above, label below. Apple Music, Spotify, Plex,
 *      Jellyfin and the Apple TV app all draw their rails this way, and it
 *      is the reason V2 reads as one page instead of four widgets.
 *
 *   3. THE SHELF HEADERS ARE PLAIN.
 *      V1 put a 32 dp gold-soft badge with a glyph in it in front of every
 *      rail title. Four identical gold discs on one screen pull the eye
 *      away from the artwork. V2 keeps the title and the "See All" action
 *      and drops the badge and the collapse chevron — one action per row.
 *
 *   4. THE GENRE SHELF IS GONE.
 *      The genre list is obsolete — it is being removed from the app, and
 *      it is not drawn here.
 *
 * WHAT IS NOT CHANGED
 * -------------------
 * The header (lion, Allura wordmark, search, avatar) and the Cormorant
 * section dividers are the brand, and they are left alone. The FAB is a
 * VIEWPORT overlay (`Fab.tsx` puts it at `insets.bottom + spacing.lg`), so
 * it belongs to the device frame rather than to the scroll — it is not drawn
 * on a full-page board, and the app keeps it as it is.
 *
 * THE BOARD IS WIDER THAN THE PHONE
 * ---------------------------------
 * Exactly as in V1: a Penpot board clips its children, and the Explore
 * Contents rail is nine cards. The phone column is the left 411 dp; the
 * rail runs on to the right, the way it runs off the screen in the app. The
 * hairline at x = 411 says where the device's own edge is.
 */

'use strict';

const {kit, SCREEN_W, spacing} = require('./kit');
const {kitV2, GUTTER, RAIL_W, RAIL_GAP} = require('./kit-v2');
const {RECENT, PINNED, BOOKMARKS, PODCASTS, CATEGORIES} = require('./home');

/**
 * The width of the V2 board — the phone column plus the whole Explore rail.
 */
function fullWidth(categoryCount) {
  return GUTTER + (categoryCount - 1) * (RAIL_W + RAIL_GAP) + RAIL_W + GUTTER;
}

/**
 * The catalogue descriptions, broken onto two lines.
 *
 * THE WORDS HAVE ONE OWNER: `src/screens/Home/related/categoryDescriptions.json`.
 *
 * The app renders them with `numberOfLines={2}`, so the line break belongs
 * to the design; in V1 the description was one unbroken line that ran past
 * the card and was cut off by the next card.
 *
 * This file used to carry its own copy of the nine descriptions. Two
 * copies of the copy is how a design and an app drift apart: the board
 * said one thing and the app said another, and neither was wrong on its
 * own. The JSON is now the single file both read.
 */
const CATEGORY_DESCRIPTION = require('../../src/screens/Home/related/categoryDescriptions.json');

/**
 * The vertical rhythm of the page.
 *
 * One rule, everywhere:
 *
 *   • a section divider is a 48 dp block;
 *   • a shelf title is a 28 dp line;
 *   • 16 dp between a divider and the title under it, 12 dp between a
 *     title and its cards, 32 dp between one shelf and the next.
 *
 * Every number is on the app's own spacing scale (4 / 8 / 12 / 16 / 20 /
 * 24 / 32).
 */
const RHYTHM = {
  divider: 48,
  title: 28,
  afterDivider: 16,
  afterTitle: 12,
  betweenShelves: 32,
};

/**
 * Draw the V2 Home screen.
 *
 * @param {'light'|'dark'} theme
 * @param {{firstRun?: boolean}} opts  `firstRun` draws the FRESH INSTALL
 *        state: no library at all, and no weather yet — which is the state a
 *        new user sees, and the state that decides what the TOP of the page
 *        looks like.
 * @returns {{shapes: object[], height: number, width: number}}
 */
function homeV2Board(theme, opts = {}) {
  const k = kit(theme);
  const v = kitV2(theme);
  const shapes = [];
  const firstRun = !!opts.firstRun;
  const pageH = 1700;

  // Where the device's screen ends — drawn FIRST so it sits behind the
  // content, the way the app's own clipping does.
  shapes.push(
    k.rect('V2 Screen edge — the device right edge', {
      x: SCREEN_W,
      y: 0,
      w: 1,
      h: pageH,
      fill: k.c.border.subtle,
    }),
  );

  // ── 1. the header ───────────────────────────────────────────────────
  // The app's own header, unchanged: the lion, the wordmark, the search
  // button and the avatar.
  shapes.push(...k.homeHeader('V2 Home header'));

  // ── 2. the greeting ─────────────────────────────────────────────────
  // Unboxed, three lines, the name as the hero.
  const GREETING_TOP = 112;
  shapes.push(
    ...v.greeting('V2 Greeting', {
      y: GREETING_TOP,
      salutation: 'Good afternoon,',
      name: 'Paval',
      // A fresh install has no weather yet — no location permission, no
      // snapshot — so there is no chip and no weather line.
      weather: firstRun ? null : 'Mainly clear in San Jose · 11°',
    }),
  );

  // ── 3. "Your Library" ───────────────────────────────────────────────
  //
  // THE ORDER IS PERSONAL-FIRST, AND THE EMPTY CASE IS NOT DRAWN.
  //
  // "Your Library" comes before "Discover" on purpose: the user's own
  // material is why they open a media app, and every shipping app that
  // shows both leads with the personal — Netflix's Continue Watching, Plex's
  // Continue Watching, YouTube's History, Spotify's "Jump back in".
  //
  // The weakness of that rule is a FRESH INSTALL: the library is empty, and
  // the app today renders four empty rails (as quiet lines) before the only
  // content on the page. Netflix, Plex and Spotify never do that — a row
  // with nothing in it is not drawn at all.
  //
  // So the rule is: a rail with no items is not drawn, and when every rail
  // is empty the "Your Library" divider is not drawn either. On a fresh
  // install the page therefore STARTS WITH DISCOVER — not because Discover
  // moved up, but because there is no library to show.
  //
  // The board is drawn with a populated library, because that is the state
  // a design file has to be reviewable in. The empty state is the same code
  // path with empty rails.
  const LIBRARY = (
    firstRun
      ? []
      : [
          {title: 'Recently Played', kind: 'media', items: RECENT},
          {title: 'Pinned Playlists', kind: 'playlist', items: PINNED},
          {title: 'Bookmarks', kind: 'media', items: BOOKMARKS},
          {title: 'Followed Podcasts', kind: 'podcast', items: PODCASTS},
        ]
  ).filter(rail => rail.items.length > 0);

  let y = GREETING_TOP + 74 + 18 + spacing.xl; // 228
  if (LIBRARY.length) {
    shapes.push(...k.divider('V2 Library divider', 'Your Library', y));
    y += RHYTHM.divider + RHYTHM.afterDivider; // 292

    for (const rail of LIBRARY) {
      shapes.push(
        ...v.shelfTitle('V2 ' + rail.title, {
          y,
          title: rail.title,
          // The app only offers "See All" when the rail holds more than one
          // item (`SectionHeader`'s own rule) — one card is the rail.
          action: rail.items.length > 1 ? 'See All' : null,
        }),
      );
      y += RHYTHM.title + RHYTHM.afterTitle;

      rail.items.forEach((item, i) => {
        const x = GUTTER + i * (RAIL_W + RAIL_GAP);
        const noun =
          rail.kind === 'media' ? 'card' :
          rail.kind === 'playlist' ? 'tile' :
          'card';
        const name = 'V2 ' + rail.title + ' ' + noun + ' ' + (i + 1);
        if (rail.kind === 'media') {
          shapes.push(
            ...v.mediaCard(name, {
              x,
              y,
              title: item.title,
              meta: item.subtitle,
              artwork: item.media,
              progress: item.progress,
            }),
          );
        } else if (rail.kind === 'playlist') {
          shapes.push(
            ...v.playlistTile(name, {
              x,
              y,
              title: item.title,
              count: item.count,
              // The 160 dp cover — the same collage the V1 tile draws,
              // rendered at the size this tile draws it (`collage.js` makes
              // one of each).
              cover: item.cover.replace('ph.collage', 'ph.collageBig'),
            }),
          );
        } else {
          shapes.push(
            ...v.podcastTile(name, {
              x,
              y,
              title: item.title,
              author: item.author,
              artwork: item.media,
            }),
          );
        }
      });

      const height =
        rail.kind === 'media' ? v.MEDIA_CARD_H :
        rail.kind === 'playlist' ? v.PLAYLIST_TILE_H :
        v.PODCAST_TILE_H;
      y += height + RHYTHM.betweenShelves;
    }
  }

  // ── 8. "Discover" ───────────────────────────────────────────────────
  shapes.push(...k.divider('V2 Discover divider', 'Discover', y));
  y += RHYTHM.divider + RHYTHM.afterDivider; // 1312

  // ── 9. Explore Contents ─────────────────────────────────────────────
  // The only rail with no action: `BrowseAllShelf` passes neither an action
  // label nor a collapse control to the header.
  shapes.push(
    ...v.shelfTitle('V2 Explore Contents', {
      y,
      title: 'Explore Contents',
    }),
  );
  y += RHYTHM.title + RHYTHM.afterTitle; // 1352
  CATEGORIES.forEach((cat, i) => {
    shapes.push(
      ...v.categoryTile('V2 Browse card ' + cat.name, {
        x: GUTTER + i * (RAIL_W + RAIL_GAP),
        y,
        title: cat.name,
        description: CATEGORY_DESCRIPTION[cat.name],
        artwork: cat.media,
        icon: cat.icon,
      }),
    );
  });
  y += v.CATEGORY_TILE_H + spacing.xl; // 1627

  return {shapes, height: y, width: fullWidth(CATEGORIES.length)};
}

module.exports = {
  homeV2Board,
  CATEGORY_DESCRIPTION,
  fullWidth,
};
