#!/usr/bin/env node
/**
 * podcasts.js — the Podcasts boards.
 *
 * FOUR STATES, SEPARATELY
 * -----------------------
 * The Podcasts feature is THREE screens, and they are the app's first
 * multi-screen feature — so the family is drawn the way the Search page
 * carries its four states:
 *
 *   • "PodcastsScreen / <theme> — screen"   — the catalogue as it opens;
 *   • "PodcastsScreen / <theme> — filter"   — the catalogue with the app's
 *                                             own filter sheet over it, and
 *                                             the sheet is a COVER GRID;
 *   • "PodcastDetail / <theme> — screen"    — one podcast and its episodes;
 *   • "FollowedPodcasts / <theme> — screen" — "My Podcasts".
 *
 * Both themes, because a family that only exists in the light theme is half
 * a family.
 *
 * WHAT THIS WAVE CHANGES
 * ----------------------
 * The audit (`md/WAVE_B12_PODCASTS.md` §3) found the Podcasts surface reading
 * as three screens that were each designed alone, and the biggest failure on
 * it being the category filter: the app shipped a curated 12-genre catalogue
 * with its own cover art and threw it away the moment the Podcast Index
 * answered, so the sheet showed the API's own 112-item taxonomy —
 * "Sexuality", "Buddhism", "Baseball" — instead of the app's list.
 *
 * The sheet is therefore a GRID OF COVER PLATES: the app's own
 * `categories/podcasts/*.png` art, the app's own per-genre glyph in the app's
 * own badge disc, and the app's own name under the plate. That is the
 * grammar the app already uses for a category card (`CategoryCard.tsx`):
 * the poster WHOLE, the badge in the middle of it, the name UNDERNEATH.
 *
 * Apple Podcasts, Spotify and Pocket Casts all browse their categories by
 * cover tile, so this is not a new affordance — it is the affordance the
 * genre was already borrowed from, with the app's own art.
 *
 * WHERE EVERY NUMBER COMES FROM
 * -----------------------------
 * Nothing on these boards is typed in by hand:
 *
 *   • the header is `InternalHeader` (60 dp: 12 dp of padding either side of
 *     a 36 dp button) — `profile.js`'s `header`;
 *   • the field is `SearchBar` — 44 dp, `radius.pill`, the app's own 18 dp
 *     magnifier and its 15 px Inter;
 *   • the list row is `PodcastRow` — a 76 dp card (8 dp of padding either
 *     side of a 60 dp thumb), a 12 dp radius, a 12 dp gap, `bodySmall` for
 *     the title and `caption` for the author;
 *   • the sheet is `FilterSheet` — a 40 dp grabber zone, an 11 px group
 *     title with 1.4 of tracking, and the app's own bottom inset;
 *   • the FAB is `Fab` — a 56 dp gold disc with the app's `sliders` glyph;
 *   • the hero is `HeroSection` — a 120 dp cover with a 16 dp radius, the
 *     title in `displaySerif`, the author in `body1`, the description in two
 *     lines with a "Show more", the episode-count pill and the follow pill;
 *   • the episode card is `DetailItem` — 12 dp of padding, a 12 dp radius, a
 *     1 px border, a 44 dp action column and a 44 dp play disc.
 *
 * THE BOTTOM OF THE BOARD
 * -----------------------
 * Every board is 914 dp tall — the emulator's own viewport (1080 x 2400 px at
 * 420 dpi = 411.4 x 914.3 dp) — so the board's canvas IS the screen. The
 * app's own content starts 24 dp down it (the status bar is a strip of its
 * own), and the window's bottom IS the screen's bottom (the navigation bar is
 * OVERLAID), so the bottom-anchored furniture is anchored to the canvas's
 * bottom exactly where the app puts it. See `STATUS_INSET`.
 */

'use strict';

const {kit, SCREEN_W, SCREEN_H, spacing, radius} = require('./kit');
const {profileKit, HEADER_H} = require('./profile');
const {measure} = require('./text-metrics');

// ─── the page's own metrics ────────────────────────────────────────────────

/**
 * THE STATUS BAND — the strip above the app's own content.
 *
 * MEASURED on `emulator-5554` (2026-11-13): the board's canvas is the SCREEN
 * (914 dp tall); the app's WINDOW starts 24 dp below the screen's top (the
 * status bar is a strip of its own, not an overlay); and the window's BOTTOM
 * is the screen's bottom (the navigation bar is OVERLAID on the window, so
 * `insets.bottom` is 24 and the FAB's clearance is 24 + 16 = 40 dp).
 */
const STATUS_INSET = 24;

/** The page's one gutter — `spacing.lg` (16). */
const GUTTER = spacing.lg;

/** The field (`SearchBar.tsx:147-155`). */
const FIELD = {
  h: 44,
  padX: spacing.md,
  glyph: 18,
  gap: spacing.sm,
  textSize: 15,
  textLine: 22,
};

/**
 * THE LIST'S TOP.
 *
 * The shell's own stack (`BrowseLayout.tsx:202-238`): the status band, the
 * header (60 dp), the search slot (16 above the field, 44 of field, 12
 * below) and the chip slot (12 below — and nothing above, because the chip
 * row is only there when a filter is active).
 *
 *   24 + 60 + 16 + 44 + 12 + 12 = 168
 */
const LIST_TOP = STATUS_INSET + HEADER_H + spacing.lg + FIELD.h + spacing.md + spacing.md;

/**
 * THE ROW (`PodcastRow.styles.ts:15-42`).
 *
 * A 76 dp card: 8 dp of padding either side of a 60 dp thumb. The thumb is a
 * 60 dp square with an 8 dp radius. The info column is the title
 * (`bodySmall`, semibold) and the author (`caption`, secondary) with a 4 dp
 * gap, and it is VERTICALLY CENTRED in the 60 dp of content, so the title
 * sits 9 dp below the thumb's top.
 *
 * The chevron is 18 px in `text.tertiary`.
 */
const ROW = {
  h: 76,
  pitch: 84, // the row + its own 8 dp marginBottom
  pad: spacing.sm,
  thumb: 60,
  thumbRadius: radius.sm,
  gap: spacing.md,
  cardRadius: radius.md,
  titleSize: 14,
  titleLine: 20,
  authorSize: 13,
  authorLine: 18,
  chevron: 18,
};

/** The row's inner columns, measured from the card's own left edge. */
const ROW_INNER = {
  thumbX: ROW.pad, // 8
  infoX: ROW.pad + ROW.thumb + ROW.gap, // 80 → 96 on the page
  infoW: SCREEN_W - GUTTER * 2 - ROW.pad * 2 - ROW.thumb - ROW.gap * 2 - ROW.chevron, // 269
  chevronX:
    SCREEN_W - GUTTER - ROW.pad - ROW.chevron, // 377
};

/**
 * "MY PODCASTS" — the followed list
 * (`src/screens/FollowedPodcasts/styles/FollowedPodcastsScreen.styles.ts`).
 *
 * The row is art + title + author — the same three things the catalogue's
 * row carries — with the page's own action trailing it. The artwork is a
 * CIRCLE here (the app's `ARTWORK_SIZE` with a radius of half its size),
 * 56 dp, and the row is 80 dp tall: 12 dp of padding either side of a
 * 56 dp artwork.
 */
const FOLLOWED = {
  art: 56,
  gap: spacing.md, // 12
  padY: spacing.md, // 12
  padTop: spacing.sm, // 8 — the list's own paddingTop
  titleSize: 14,
  titleLine: 20,
  authorSize: 13,
  authorLine: 18,
  authorGap: 2,
  unfollowSize: 13,
  unfollowLine: 18,
  touch: 44,
  unfollowPadX: spacing.sm, // 8
  rowH: 80,
};

/** The FAB (`Fab.tsx:63,143-159`). */
const FAB = {
  size: 56,
  right: spacing.xl,
  bottomInset: 24,
  gap: spacing.lg,
  glyph: 24,
};

/**
 * THE SHEET (`FilterSheet.tsx`).
 *
 * The grabber zone (40 dp), the group title (11 px, semibold, 1.4 of
 * tracking, `text.secondary`, on a 24 dp line box) and the body's own bottom
 * padding are the app's. What is NEW is what the group contains: a GRID of
 * cover tiles instead of a flow of text chips.
 */
const SHEET = {
  padX: GUTTER,
  grabberZone: 40,
  grabberW: 36,
  grabberH: 4,
  titleSize: 11,
  titleLine: 24,
  titleGap: spacing.sm,
  bottomPadding: spacing.sm,
  radius: radius.lg,
};

/**
 * THE TILE.
 *
 * 88 dp square, four to a row: 4 x 88 + 3 x 9 = 379, which is exactly the
 * content width between the page's two 16 dp gutters.
 *
 * The badge is the app's OWN (`CategoryCard.tsx:99-105`): a disc in the
 * CENTRE of the plate with the section's glyph inside it, in the accent
 * colour. The Home card's disc is 40 dp on a 160 dp poster; this tile is
 * 88 dp square, so the disc is scaled to 32 dp and the glyph to 24 dp —
 * the same 0.3 proportion.
 *
 * The name is UNDERNEATH the plate, in the app's `caption` metrics with the
 * semibold family — the same treatment `CategoryCard` gives its own title.
 */
const TILE = {
  size: 88,
  cols: 4,
  gap: 9,
  disc: 32,
  glyph: 24,
  labelGap: 6,
  labelSize: 13,
  labelLine: 18,
  rowGap: spacing.md,
  ring: 2,
};

/** The tile's row pitch — plate, label, and the gap under it. */
const TILE_PITCH = TILE.size + TILE.labelGap + TILE.labelLine + TILE.rowGap;

/**
 * THE CATEGORIES — the app's own curated catalogue, with the CORRECT
 * Podcast Index ids.
 *
 * The ids here were wrong in the app before this wave: ten of the twelve
 * pointed at a different Podcast Index category (`id 20` is "Education", not
 * "Comedy"; `id 35` is "Sexuality", not "News"). Every id below was verified
 * against the live `/categories/list` on 2026-11-13.
 *
 * `cover` is false for the two genres the app has no plate for — Science and
 * Sports — and those two draw the app's own gold-soft plate with their own
 * glyph in the badge, exactly as the Local Files card draws the one card
 * with no art (`CategoryCard.tsx:91-95`).
 */
const CATEGORIES = [
  {key: 'all', label: 'All', icon: 'micVocal', media: 'cat.pod.all'},
  {key: '1', label: 'Arts', icon: 'palette', media: 'cat.pod.arts'},
  {key: '53', label: 'Music', icon: 'disc3Tile', media: 'cat.pod.music'},
  {key: '9', label: 'Business', icon: 'briefcase', media: 'cat.pod.business'},
  {key: '16', label: 'Comedy', icon: 'smile', media: 'cat.pod.comedy'},
  {key: '20', label: 'Education', icon: 'graduationCap', media: 'cat.pod.education'},
  {key: '29', label: 'Health', icon: 'heartPulse', media: 'cat.pod.health'},
  {key: '102', label: 'Technology', icon: 'cpuTile', media: 'cat.pod.technology'},
  {key: '28', label: 'History', icon: 'historyTile', media: 'cat.pod.history'},
  {key: '55', label: 'News', icon: 'newspaper', media: 'cat.pod.news'},
  {key: '67', label: 'Science', icon: 'flaskConical', media: null},
  {key: '86', label: 'Sports', icon: 'trophyTile', media: null},
];

/**
 * THE CATALOGUE'S ROWS.
 *
 * The app's own first page of the trending stream, read off the live Podcast
 * Index on 2026-11-13 (`/podcasts/trending?max=8`). These are the real
 * titles and the real authors — including the fact that the trending stream
 * is heavy on audiobooks, which is the content finding, not a design flaw.
 */
const PODCASTS = [
  {title: 'Tall Tales from Texas', author: 'Mody Coggin Boatright'},
  {title: 'The Mark of Zorro', author: 'Johnston McCulley'},
  {title: 'The Three Just Men', author: 'Edgar Wallace'},
  {title: 'Arms and The Man', author: 'George Bernard Shaw'},
  {title: 'Northanger Abbey - Jane Austen', author: 'Jane Austen'},
  {title: 'The Awakening', author: 'Kate Chopin'},
  {title: 'The Empire of Business', author: 'Andrew Carnegie'},
  {title: 'Great Works of Drama', author: 'The Podcast Network'},
];

/**
 * THE DETAIL PAGE'S PODCAST.
 *
 * The app's own `/podcasts/byfeedid` answer for "The Big Story | WIRED"
 * (id 8048224), read off the live API on 2026-11-13, and the cover art is
 * the feed's own.
 */
const PODCAST = {
  title: 'The Big Story | WIRED',
  author: 'WIRED',
  description:
    'The future, read out loud. Handpicked WIRED stories, professionally narrated.…',
  episodes: 22,
  followed: true,
};

/** The detail page's episodes — the app's own `/episodes/byfeedid` answer. */
const EPISODES = [
  {
    title: 'The AI-Powered, Totally Autonomous Fu…',
    date: '11/13/2026',
    duration: '29min',
    description:
      'Ships without crews. Self-directed drone swarms. How a US Navy task force is using off…',
  },
  {
    title: 'What 800 Nerds on a Cruise Ship Taught…',
    date: '11/11/2026',
    duration: '44min',
    description:
      "Here's what I learned sailing the seas with a boat full of “Sea Monkeys” celebrating geek c…",
  },
  {
    title: 'She Got a Great Deal on Egg Freezing. T…',
    date: '11/8/2026',
    duration: '36min',
    description:
      'The novelist makes the Earthly rituals of sex, marriage, childbirth—and all of human life—ap…',
  },
];

/**
 * THE DETAIL PAGE'S HERO (`HeroSection.styles.ts`).
 *
 * A 120 dp cover with a 16 dp radius, 20 dp above it, the title in
 * `displaySerif` (Cormorant Garamond Bold 48/56), the author in `body1`
 * (17/24), the description in `bodySmall` on two lines with a "Show more",
 * the episode-count pill, and the follow pill.
 */
const HERO = {
  padTop: spacing.xl,
  padBottom: spacing.lg,
  cover: 120,
  coverRadius: radius.lg,
  coverGap: spacing.lg,
  titleSize: 48,
  titleLine: 56,
  titleGap: spacing.xs,
  authorSize: 17,
  authorLine: 24,
  authorGap: spacing.md,
  descSize: 14,
  descLine: 20,
  descGap: spacing.xs,
  moreSize: 13,
  moreLine: 18,
  moreGap: spacing.md,
  pillSize: 13,
  pillLine: 18,
  pillPadX: spacing.md,
  pillPadY: spacing.xs,
  pillGap: spacing.xs,
  followPadY: spacing.xs,
  followPadX: spacing.md,
  followMarginTop: spacing.sm,
  followMinH: 44,
};

/** The episode card (`DetailItem.styles.ts:11-55`). */
const EPISODE = {
  pad: spacing.md,
  radius: radius.md,
  titleSize: 15,
  titleLine: 22,
  titleGap: 2,
  metaSize: 13,
  metaLine: 18,
  metaPad: spacing.xs,
  descSize: 13,
  descLine: 18,
  actionW: 44,
  play: 44,
  gap: spacing.sm,
  infoGap: spacing.xs,
};

// ─── the drawing kit for one theme ─────────────────────────────────────────

/**
 * Build the drawing helpers for one theme.
 *
 * @param {'light'|'dark'} themeName
 */
function podcastsKit(themeName) {
  const k = kit(themeName);
  const c = k.c;
  const P = profileKit(themeName);

  /** The media key of one of the app's own glyphs, in this theme. */
  const iconKey = (name) => `ico.${name}.${themeName}`;

  /** The search field — the app's own, unfocused. */
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
   * THE ROW — the app's own podcast row.
   *
   * The card is the app's own elevated surface with a 12 dp radius; the
   * thumb is a 60 dp square with an 8 dp radius; the title is `bodySmall`
   * with the SEMIBOLD family (the weight lives in the family key, never in a
   * `fontWeight` prop); and the chevron is the app's own 18 px `chevronRight`
   * in `text.tertiary`.
   *
   * The title is ONE line with a tail (`numberOfLines={1}`), so a long feed
   * name is cut to the column's own width and the ellipsis is added by
   * `fit()`.
   */
  function row(name, o) {
    const y = o.y;
    const x = GUTTER;
    const out = [];
    out.push(
      k.rect(name + ' card', {
        x,
        y,
        w: SCREEN_W - GUTTER * 2,
        h: ROW.h,
        radius: ROW.cardRadius,
        fill: c.background.elevated,
      }),
      k.image(name + ' thumb', {
        x: x + ROW_INNER.thumbX,
        y: y + ROW.pad,
        w: ROW.thumb,
        h: ROW.thumb,
        radius: ROW.thumbRadius,
        media: o.artwork,
      }),
    );

    // The info column is VERTICALLY CENTRED in the 60 dp of content.
    const infoH = ROW.titleLine + ROW.authorSize + 8 + (ROW.authorLine - ROW.authorSize);
    const infoTop = y + ROW.pad + (ROW.thumb - infoH) / 2;

    out.push(
      k.text(name + ' title', fit(o.title, ROW_INNER.infoW, 'Inter SemiBold', ROW.titleSize), {
        x: x + ROW_INNER.infoX,
        y: infoTop,
        family: 'Inter SemiBold',
        weight: 600,
        size: ROW.titleSize,
        lineHeight: ROW.titleLine,
        fill: c.text.primary,
      }),
      k.text(name + ' author', fit(o.author, ROW_INNER.infoW, 'Inter', ROW.authorSize), {
        x: x + ROW_INNER.infoX,
        y: infoTop + ROW.titleLine + 4,
        family: 'Inter',
        weight: 400,
        size: ROW.authorSize,
        lineHeight: ROW.authorLine,
        fill: c.text.secondary,
      }),
      k.image(name + ' chevron', {
        x: x + ROW_INNER.chevronX,
        y: y + ROW.pad + (ROW.thumb - ROW.chevron) / 2,
        w: ROW.chevron,
        h: ROW.chevron,
        media: iconKey('chevronRight18'),
      }),
    );
    return out;
  }

  /** The FAB — the app's ONE floating action button, and the door to the sheet. */
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

  /**
   * ONE TILE — a category plate in the sheet.
   *
   * The plate is the app's own cover art (or, for the two genres it has no
   * plate for, its own gold-soft field — the app's "no art" grammar). The
   * badge is a 32 dp disc in the CENTRE of the plate with the genre's own
   * glyph in the accent colour; the name is UNDERNEATH.
   *
   * The SELECTED tile carries a 2 dp gold ring around the plate and a gold
   * name. That is the one new mark on the board, and it is the sheet's own
   * "this is applied" signal — the text chips it replaces filled the whole
   * pill gold, and a plate cannot be filled.
   */
  function tile(name, o) {
    const x = o.x;
    const y = o.y;
    const out = [];
    if (o.media) {
      out.push(
        k.image(name + ' plate', {
          x,
          y,
          w: TILE.size,
          h: TILE.size,
          radius: radius.md,
          media: o.media,
        }),
      );
    } else {
      out.push(
        k.rect(name + ' plate', {
          x,
          y,
          w: TILE.size,
          h: TILE.size,
          radius: radius.md,
          fill: c.accent.goldSoft,
        }),
      );
    }
    out.push(
      k.ellipse(name + ' badge', {
        x: x + (TILE.size - TILE.disc) / 2,
        y: y + (TILE.size - TILE.disc) / 2,
        w: TILE.disc,
        h: TILE.disc,
        // The app's own scrim token (`background.scrimDim`) — the badge is
        // the same disc in both themes, and the app's value differs
        // between them.
        fill: c.background.scrimDim,
      }),
      k.image(name + ' glyph', {
        x: x + (TILE.size - TILE.glyph) / 2,
        y: y + (TILE.size - TILE.glyph) / 2,
        w: TILE.glyph,
        h: TILE.glyph,
        media: iconKey(o.icon),
      }),
    );
    if (o.selected) {
      out.push(
        k.rect(name + ' ring', {
          // The ring is the PLATE's own border: the app draws it as a
          // 2 dp border ON the plate's bounds, so it sits INSIDE them.
          // The stroke is aligned inward (the build's own `strokesOf`),
          // which is what puts it there.
          x,
          y,
          w: TILE.size,
          h: TILE.size,
          radius: radius.md,
          stroke: c.accent.gold,
          strokeWidth: TILE.ring,
          // The ring is a STROKE around the tile — it must not fill the
          // tile, or it would paint over the plate, the badge and the glyph.
          fill: null,
        }),
      );
    }
    out.push(
      k.text(name + ' label', o.label, {
        x: {center: x + TILE.size / 2},
        y: y + TILE.size + TILE.labelGap,
        family: 'Inter SemiBold',
        weight: 600,
        size: TILE.labelSize,
        lineHeight: TILE.labelLine,
        fill: o.selected ? c.accent.gold : c.text.secondary,
      }),
    );
    return out;
  }

  return {k, c, P, iconKey, field, row, fab, tile, theme: k.theme};
}

/**
 * Cut a label to a width, the way the app's `numberOfLines={1}` does.
 *
 * The width is measured from the app's own font files on Android's pixel
 * grid (`text-metrics.js`), so the cut is the cut the DEVICE makes.
 */
function fit(text, maxW, family, size) {
  const str = String(text);
  if (measure(str, {family, size}) <= maxW) return str;
  const chars = Array.from(str);
  let out = '';
  for (const ch of chars) {
    if (measure(out + ch + '…', {family, size}) > maxW) break;
    out += ch;
  }
  return out.trimEnd() + '…';
}

// ─── the boards ────────────────────────────────────────────────────────────

/** Move a list of shapes down by the status inset. */
function shiftDown(shapes, dy) {
  return shapes.map(s => (typeof s.y === 'number' ? {...s, y: s.y + dy} : s));
}

/**
 * The chrome every browse state carries: the header and the field.
 *
 * Both start `STATUS_INSET` down the canvas, because the app's own window
 * starts below the status bar.
 */
function chrome(S, title, placeholder) {
  const shapes = shiftDown(S.P.header('PodcastsScreen', title), STATUS_INSET);
  const fieldY = HEADER_H + spacing.lg + STATUS_INSET;
  shapes.push(...S.field('PodcastsScreen search field', {y: fieldY, placeholder}));
  return shapes;
}

/** The catalogue's rows, top to bottom. */
function rows(S, o) {
  const shapes = [];
  for (let i = 0; i < o.items.length; i++) {
    const item = o.items[i];
    shapes.push(
      ...S.row('PodcastsScreen row ' + (i + 1), {
        y: LIST_TOP + i * ROW.pitch,
        title: item.title,
        author: item.author,
        artwork: 'ph.podRow' + ((i % 6) + 1),
      }),
    );
  }
  return shapes;
}

/**
 * THE CATALOGUE — the page as it opens.
 *
 * The header, the search field, the list and the filter FAB. There is NO
 * chip strip: nothing is active until the user picks a genre, and "All" —
 * the applied default — does not count as active.
 */
function podcastsScreenBoard(themeName) {
  const S = podcastsKit(themeName);
  const shapes = [...chrome(S, 'Podcasts', 'Search podcasts…')];
  shapes.push(...rows(S, {items: PODCASTS}));
  shapes.push(
    ...S.fab('PodcastsScreen FAB', {
      y: SCREEN_H - FAB.bottomInset - FAB.gap - FAB.size,
    }),
  );
  return {width: SCREEN_W, height: SCREEN_H, shapes};
}

/**
 * THE FILTER — the page with the app's own sheet over it, and the sheet's
 * ONE group is the COVER GRID.
 *
 * The page behind the sheet is drawn only as far as the sheet's top edge:
 * what the sheet covers is not drawn, because Penpot clips a board's
 * children anyway.
 */
function podcastsFilterBoard(themeName) {
  const S = podcastsKit(themeName);
  const content = sheetContent();
  const sheetH = content.height + FAB.bottomInset;
  const sheetTop = SCREEN_H - sheetH;

  const shapes = [...chrome(S, 'Podcasts', 'Search podcasts…')];
  shapes.push(...rows(S, {items: PODCASTS.slice(0, 4)}));

  // The scrim over the page behind the sheet.
  shapes.push(
    S.k.rect('PodcastsScreen filter sheet scrim', {
      x: 0,
      y: 0,
      w: SCREEN_W,
      h: sheetTop,
      fill: S.c.background.scrim,
    }),
  );

  // The sheet's surface — a rounded top, and a square bottom (Penpot's
  // rectangle has one radius for four corners).
  shapes.push(
    S.k.rect('PodcastsScreen filter sheet surface', {
      x: 0,
      y: sheetTop,
      w: SCREEN_W,
      h: sheetH,
      radius: SHEET.radius,
      fill: S.c.background.elevated,
    }),
    S.k.rect('PodcastsScreen filter sheet surface foot', {
      x: 0,
      y: sheetTop + SHEET.radius,
      w: SCREEN_W,
      h: sheetH - SHEET.radius,
      fill: S.c.background.elevated,
    }),
  );

  // true-sheet's native grabber — the 40 dp the first group reserves.
  shapes.push(
    S.k.rect('PodcastsScreen filter sheet grabber', {
      x: {center: SCREEN_W / 2},
      y: sheetTop + 14,
      w: SHEET.grabberW,
      h: SHEET.grabberH,
      radius: SHEET.grabberH / 2,
      fill: S.c.border.emphasis,
    }),
  );

  // The group's title.
  shapes.push(
    S.k.text('PodcastsScreen filter sheet title CATEGORY', 'CATEGORY', {
      x: SHEET.padX,
      y: sheetTop + SHEET.grabberZone,
      family: 'Inter SemiBold',
      weight: 600,
      size: SHEET.titleSize,
      lineHeight: SHEET.titleLine,
      letterSpacing: 1.4,
      fill: S.c.text.secondary,
    }),
  );

  // The grid itself.
  CATEGORIES.forEach((cat, i) => {
    const col = i % TILE.cols;
    const rowIndex = Math.floor(i / TILE.cols);
    const x = SHEET.padX + col * (TILE.size + TILE.gap);
    const y = sheetTop + content.gridTop + rowIndex * TILE_PITCH;
    shapes.push(
      ...S.tile('PodcastsScreen filter sheet tile ' + cat.key, {
        x,
        y,
        label: cat.label,
        icon: cat.icon,
        media: cat.media,
        selected: cat.key === 'all',
      }),
    );
  });

  return {width: SCREEN_W, height: SCREEN_H, shapes};
}

/**
 * The sheet's content, laid out the app's way, from its own top.
 *
 * The only difference from the Movies sheet is the group: a grid of tiles
 * instead of a flow of chips, so there is no "SHOW MORE" toggle and no
 * divider — the sheet holds ONE group.
 */
function sheetContent() {
  let y = SHEET.grabberZone;
  y += SHEET.titleLine;
  y += SHEET.titleGap;
  const gridTop = y;
  const rows = Math.ceil(CATEGORIES.length / TILE.cols);
  y += rows * TILE_PITCH - TILE.rowGap;
  y += SHEET.bottomPadding;
  return {gridTop, height: y};
}

/**
 * THE DETAIL PAGE — one podcast and its episodes.
 *
 * The header carries the PODCAST'S NAME (the app used a constant
 * "Podcast Details"), the hero is the app's own cover + title + author +
 * description + episode-count pill + follow pill, and the episodes are the
 * app's own cards.
 */
function podcastDetailBoard(themeName) {
  const S = podcastsKit(themeName);
  const shapes = [];

  // The header — the podcast's name, and the share action on the right.
  shapes.push(
    ...shiftDown(
      S.P.header('PodcastDetail', PODCAST.title, {rightIcon: 'shareAction'}),
      STATUS_INSET,
    ),
  );

  // ── the hero ───────────────────────────────────────────────────────────
  let y = STATUS_INSET + HEADER_H;
  const heroX = GUTTER;
  const heroW = SCREEN_W - GUTTER * 2;

  y += HERO.padTop;
  shapes.push(
    S.k.image('PodcastDetail hero cover', {
      x: heroX + (heroW - HERO.cover) / 2,
      y,
      w: HERO.cover,
      h: HERO.cover,
      radius: HERO.coverRadius,
      media: 'ph.podRow3',
    }),
  );
  y += HERO.cover + HERO.coverGap;

  // The title — `displaySerif`, two lines, centred.
  const titleLines = ['The Big Story |', 'WIRED'];
  shapes.push(
    S.k.text('PodcastDetail hero title', titleLines.join('\n'), {
      x: {center: SCREEN_W / 2},
      y,
      family: 'Cormorant Garamond',
      weight: 700,
      size: HERO.titleSize,
      lineHeight: HERO.titleLine,
      fill: S.c.text.primary,
    }),
  );
  y += HERO.titleLine * titleLines.length + HERO.titleGap;

  shapes.push(
    S.k.text('PodcastDetail hero author', PODCAST.author, {
      x: {center: SCREEN_W / 2},
      y,
      family: 'Inter',
      weight: 400,
      size: HERO.authorSize,
      lineHeight: HERO.authorLine,
      fill: S.c.text.secondary,
    }),
  );
  y += HERO.authorLine + HERO.authorGap;

  shapes.push(
    S.k.text('PodcastDetail hero description', PODCAST.description, {
      x: {center: SCREEN_W / 2},
      y,
      family: 'Inter',
      weight: 400,
      size: HERO.descSize,
      lineHeight: HERO.descLine,
      fill: S.c.text.tertiary,
    }),
  );
  y += HERO.descLine * 2 + HERO.descGap;

  shapes.push(
    S.k.text('PodcastDetail hero show more', 'Show more', {
      x: {center: SCREEN_W / 2},
      y,
      family: 'Inter',
      weight: 400,
      size: HERO.moreSize,
      lineHeight: HERO.moreLine,
      fill: S.c.accent.gold,
    }),
  );
  y += HERO.moreLine + HERO.moreGap;

  // The episode-count pill — the app's own, with the PODCAST glyph in it
  // (the app drew a music note here).
  const pillLabel = PODCAST.episodes + ' episodes';
  const pillW =
    measure(pillLabel, {family: 'Inter', size: HERO.pillSize}) +
    HERO.pillPadX * 2 +
    HERO.pillGap +
    14;
  shapes.push(
    S.k.rect('PodcastDetail hero episode badge', {
      x: {center: SCREEN_W / 2},
      y,
      w: pillW,
      h: HERO.pillLine + HERO.pillPadY * 2,
      radius: radius.pill,
      fill: S.c.accent.goldDim,
    }),
    S.k.image('PodcastDetail hero episode badge glyph', {
      x: {center: SCREEN_W / 2},
      y: y + (HERO.pillLine - 14) / 2,
      w: 14,
      h: 14,
      media: S.iconKey('podcastRingsSmall'),
    }),
    S.k.text('PodcastDetail hero episode badge text', pillLabel, {
      x: {center: SCREEN_W / 2},
      y: y + HERO.pillPadY,
      family: 'Inter',
      weight: 400,
      size: HERO.pillSize,
      lineHeight: HERO.pillLine,
      fill: S.c.accent.gold,
    }),
  );
  y += HERO.pillLine + HERO.pillPadY * 2;

  // The follow pill — OUTLINED when the user does not follow the show and
  // SOLID GOLD with a tick when they do. The app drew a bookmark glyph here,
  // which is the app's Bookmarks feature's own glyph.
  const followLabel = PODCAST.followed ? 'Following' : 'Follow';
  const followLabelW = measure(followLabel, {family: 'Inter SemiBold', size: HERO.pillSize});
  // The button's CONTENT is the check (when followed) and the label, and
  // the app centres them as a pair (`justifyContent: 'center'`).
  const followContentW =
    (PODCAST.followed ? 16 + HERO.pillGap : 0) + followLabelW;
  const followW = followContentW + HERO.followPadX * 2;
  // The app's touch target: the pill is never shorter than 44 dp, even
  // when its own padding only asks for 28.
  const followH = Math.max(
    HERO.followMinH,
    HERO.pillLine + HERO.followPadY * 2 + 2,
  );
  const followTop = y + HERO.followMarginTop;
  const followLeft = (SCREEN_W - followContentW) / 2;
  shapes.push(
    S.k.rect('PodcastDetail hero follow button', {
      x: {center: SCREEN_W / 2},
      y: followTop,
      w: followW,
      h: followH,
      radius: radius.pill,
      // The app's own state: a solid gold fill with the label in the
      // inverse colour when the show is followed, an outline when it is
      // not.
      fill: PODCAST.followed ? S.c.accent.gold : null,
      stroke: PODCAST.followed ? undefined : S.c.accent.gold,
      strokeWidth: PODCAST.followed ? undefined : 1,
    }),
  );
  if (PODCAST.followed) {
    shapes.push(
      S.k.image('PodcastDetail hero follow check', {
        x: followLeft,
        y: followTop + (followH - 16) / 2,
        w: 16,
        h: 16,
        media: S.iconKey('check'),
      }),
    );
  }
  shapes.push(
    S.k.text('PodcastDetail hero follow label', followLabel, {
      x: PODCAST.followed ? followLeft + 16 + HERO.pillGap : followLeft,
      y: followTop + (followH - HERO.pillLine) / 2,
      family: 'Inter SemiBold',
      weight: 600,
      size: HERO.pillSize,
      lineHeight: HERO.pillLine,
      fill: PODCAST.followed ? S.c.background.primary : S.c.accent.gold,
    }),
  );
  y = followTop + followH + HERO.padBottom;

  // ── the section header ─────────────────────────────────────────────────
  shapes.push(
    S.k.text('PodcastDetail section Episodes', 'Episodes', {
      x: heroX,
      y,
      family: 'Manrope SemiBold',
      weight: 600,
      size: 22,
      lineHeight: 28,
      fill: S.c.text.primary,
    }),
  );
  y += 28 + spacing.md;

  // ── the episode cards ──────────────────────────────────────────────────
  EPISODES.forEach((ep, i) => {
    shapes.push(...episodeCard(S, 'PodcastDetail episode ' + (i + 1), ep, y));
    y += episodeCardHeight(ep) + spacing.sm;
  });

  return {width: SCREEN_W, height: SCREEN_H, shapes};
}

/** The height of one episode card, from the app's own metrics. */
function episodeCardHeight(ep) {
  const infoH =
    EPISODE.titleLine +
    EPISODE.titleGap +
    EPISODE.metaPad * 2 +
    EPISODE.metaLine +
    EPISODE.infoGap +
    EPISODE.descLine * (ep.description ? 2 : 0);
  return infoH + EPISODE.pad * 2 + 2;
}

/** One episode card (`DetailItem.tsx`). */
function episodeCard(S, name, ep, y) {
  const x = GUTTER;
  const w = SCREEN_W - GUTTER * 2;
  const infoX = x + EPISODE.pad + 1;
  const infoW = w - EPISODE.pad * 2 - 2 - EPISODE.actionW - EPISODE.gap;
  const out = [];

  out.push(
    S.k.rect(name + ' card', {
      x,
      y,
      w,
      h: episodeCardHeight(ep),
      radius: EPISODE.radius,
      fill: S.c.background.elevated,
      stroke: S.c.border.subtle,
      strokeWidth: 1,
    }),
  );

  let iy = y + EPISODE.pad + 1;
  out.push(
    S.k.text(name + ' title', ep.title, {
      x: infoX,
      y: iy,
      family: 'Inter',
      weight: 400,
      size: EPISODE.titleSize,
      lineHeight: EPISODE.titleLine,
      fill: S.c.text.primary,
    }),
  );
  iy += EPISODE.titleLine + EPISODE.titleGap;

  const metaY = iy + EPISODE.metaPad;
  const dateW = measure(ep.date, {family: 'Inter', size: EPISODE.metaSize});
  out.push(
    S.k.text(name + ' date', ep.date, {
      x: infoX,
      y: metaY,
      family: 'Inter',
      weight: 400,
      size: EPISODE.metaSize,
      lineHeight: EPISODE.metaLine,
      fill: S.c.text.tertiary,
    }),
    S.k.text(name + ' separator', '•', {
      x: infoX + dateW + 6,
      y: metaY,
      family: 'Inter',
      weight: 400,
      size: EPISODE.metaSize,
      lineHeight: EPISODE.metaLine,
      fill: S.c.text.tertiary,
    }),
    S.k.text(name + ' duration', ep.duration, {
      x: infoX + dateW + 6 + 10,
      y: metaY,
      family: 'Inter',
      weight: 400,
      size: EPISODE.metaSize,
      lineHeight: EPISODE.metaLine,
      fill: S.c.text.tertiary,
    }),
  );
  iy = metaY + EPISODE.metaLine + EPISODE.metaPad;

  if (ep.description) {
    out.push(
      S.k.text(name + ' description', ep.description, {
        x: infoX,
        y: iy + EPISODE.infoGap,
        family: 'Inter',
        weight: 400,
        size: EPISODE.descSize,
        lineHeight: EPISODE.descLine,
        fill: S.c.text.secondary,
      }),
    );
  }

  // The action column — the bookmark above the 44 dp play disc, centred on
  // the card's content height.
  const actionX = x + w - EPISODE.pad - 1 - EPISODE.actionW;
  const contentH = episodeCardHeight(ep) - EPISODE.pad * 2 - 2;
  const columnH = 19 + EPISODE.gap + EPISODE.play;
  const columnTop = y + EPISODE.pad + 1 + (contentH - columnH) / 2;
  out.push(
    S.k.image(name + ' bookmark', {
      x: actionX + (EPISODE.actionW - 19) / 2,
      y: columnTop,
      w: 19,
      h: 19,
      media: S.iconKey('bookmark'),
    }),
    S.k.ellipse(name + ' play disc', {
      x: actionX,
      y: columnTop + 19 + EPISODE.gap,
      w: EPISODE.play,
      h: EPISODE.play,
      fill: S.c.accent.goldDim,
    }),
    S.k.image(name + ' play glyph', {
      x: actionX + (EPISODE.play - 20) / 2,
      y: columnTop + 19 + EPISODE.gap + (EPISODE.play - 20) / 2,
      w: 20,
      h: 20,
      media: S.iconKey('playGold'),
    }),
  );

  return out;
}

/**
 * "MY PODCASTS" — the followed list.
 *
 * The SAME row grammar as the catalogue: a 60 dp square cover, the title and
 * the author. The only difference is the trailing action — the catalogue's
 * chevron says "open this", this page's says "stop following it", so the
 * trailing control is the page's own action rather than a borrowed glyph.
 */
function followedPodcastsBoard(themeName) {
  const S = podcastsKit(themeName);
  const shapes = [];

  shapes.push(...shiftDown(S.P.header('FollowedPodcasts', 'My Podcasts'), STATUS_INSET));

  const items = PODCASTS.slice(0, 3);
  const listTop = STATUS_INSET + HEADER_H;

  items.forEach((item, i) => {
    const rowTop = listTop + FOLLOWED.padTop + i * FOLLOWED.rowH;
    const artTop = rowTop + FOLLOWED.padY;
    const infoX = GUTTER + FOLLOWED.art + FOLLOWED.gap;

    // The artwork — a CIRCLE, the app's own 56 dp with a radius of half
    // its size.
    shapes.push(
      S.k.image('FollowedPodcasts row ' + (i + 1) + ' thumb', {
        x: GUTTER,
        y: artTop,
        w: FOLLOWED.art,
        h: FOLLOWED.art,
        radius: FOLLOWED.art / 2,
        media: 'ph.podRow' + ((i % 6) + 1),
      }),
    );

    // The info column is VERTICALLY CENTRED in the artwork's 56 dp.
    const infoH = FOLLOWED.titleLine + FOLLOWED.authorGap + FOLLOWED.authorLine;
    const infoTop = artTop + (FOLLOWED.art - infoH) / 2;
    const infoW = SCREEN_W - GUTTER * 2 - FOLLOWED.art - FOLLOWED.gap - 120;

    shapes.push(
      S.k.text('FollowedPodcasts row ' + (i + 1) + ' title', fit(item.title, infoW, 'Inter SemiBold', FOLLOWED.titleSize), {
        x: infoX,
        y: infoTop,
        family: 'Inter SemiBold',
        weight: 600,
        size: FOLLOWED.titleSize,
        lineHeight: FOLLOWED.titleLine,
        fill: S.c.text.primary,
      }),
      S.k.text('FollowedPodcasts row ' + (i + 1) + ' author', fit(item.author, infoW, 'Inter', FOLLOWED.authorSize), {
        x: infoX,
        y: infoTop + FOLLOWED.titleLine + FOLLOWED.authorGap,
        family: 'Inter',
        weight: 400,
        size: FOLLOWED.authorSize,
        lineHeight: FOLLOWED.authorLine,
        fill: S.c.text.secondary,
      }),
    );

    // The trailing action — "Unfollow", in the accent colour, on the
    // app's 44 dp touch target, centred in the artwork's 56 dp.
    const label = 'Unfollow';
    const labelW = measure(label, {family: 'Inter', size: FOLLOWED.unfollowSize});
    const targetTop = artTop + (FOLLOWED.art - FOLLOWED.touch) / 2;
    const labelRight = SCREEN_W - GUTTER - FOLLOWED.unfollowPadX;
    shapes.push(
      S.k.text('FollowedPodcasts row ' + (i + 1) + ' unfollow', label, {
        x: {right: labelRight},
        y: targetTop + (FOLLOWED.touch - FOLLOWED.unfollowLine) / 2,
        family: 'Inter',
        weight: 400,
        size: FOLLOWED.unfollowSize,
        lineHeight: FOLLOWED.unfollowLine,
        fill: S.c.accent.gold,
      }),
    );
    // The 44 dp touch target, drawn as an invisible outline so the board
    // carries the affordance the app must have.
    shapes.push(
      S.k.rect('FollowedPodcasts row ' + (i + 1) + ' unfollow target', {
        x: labelRight - labelW - FOLLOWED.unfollowPadX,
        y: targetTop,
        w: labelW + FOLLOWED.unfollowPadX * 2,
        h: FOLLOWED.touch,
        stroke: S.c.border.subtle,
        strokeWidth: 1,
        opacity: 0,
      }),
    );

    // The row's own hairline — the app's `borderBottomWidth`.
    shapes.push(
      S.k.rect('FollowedPodcasts row ' + (i + 1) + ' divider', {
        x: GUTTER,
        y: rowTop + FOLLOWED.rowH - 1,
        w: SCREEN_W - GUTTER * 2,
        h: 1,
        fill: S.c.border.subtle,
      }),
    );
  });

  return {width: SCREEN_W, height: SCREEN_H, shapes};
}

module.exports = {
  podcastsKit,
  podcastsScreenBoard,
  podcastsFilterBoard,
  podcastDetailBoard,
  followedPodcastsBoard,
  CATEGORIES,
  PODCASTS,
};
