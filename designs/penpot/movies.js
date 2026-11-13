#!/usr/bin/env node
/**
 * movies.js — the Movies screen boards, and the Movies filter sheet.
 *
 * TWO BOARDS, SEPARATELY
 * ----------------------
 * The owner asked for the Movies SCREEN and its FILTER as two separate
 * boards, the way the Search page carries its four states. So:
 *
 *   • "MoviesScreen / light — screen" — the page as it opens;
 *   • "MoviesScreen / light — filter" — the page with the app's own filter
 *     sheet over it.
 *
 * Both in both themes, because a family that only exists in the light theme
 * is half a family.
 *
 * WHERE EVERY NUMBER COMES FROM
 * -----------------------------
 * The board's geometry is read out of the app's own components — not
 * eyeballed, not typed in by hand:
 *
 *   • the header is `InternalHeader` (`profile.js`'s `header`);
 *   • the field is `SearchBar` — 44 dp, `radius.pill`, the app's own 18 dp
 *     magnifier and its 15 px Inter;
 *   • the grid is `MovieCard` — a full-bleed 2-column mosaic of 16:9 cards
 *     with a text overlay in the bottom-left corner (`MovieCard.styles.ts`);
 *   • the FAB is `Fab` — a 56 dp gold disc with the app's `sliders` glyph;
 *   • the sheet is `FilterSheet` — a 32 dp chip with a 1.5 dp border and
 *     12 dp of horizontal padding, an 11 px group title, a 40 dp grabber
 *     zone and a divider with 12 dp either side.
 *
 * The chip WIDTHS are the one thing a board cannot measure for itself, so
 * they are measured from the app's own font files (`text-metrics.js`) on
 * Android's pixel grid — which reproduces the device's own chip widths to
 * within 0.8 dp. That is what decides which chips share a row.
 *
 * THE BOTTOM OF THE BOARD
 * -----------------------
 * Every board in this prototype is 914 dp tall — the emulator's own viewport
 * (1080 x 2400 px at 420 dpi = 411.4 x 914.3 dp) — so the board's canvas IS
 * the screen. The app's own content starts 24 dp down it (the status bar is a
 * strip of its own, not an overlay), and the window's bottom IS the screen's
 * bottom (the navigation bar is OVERLAID on the window), so the
 * bottom-anchored furniture — the FAB, the sheet — is anchored to the
 * canvas's bottom exactly where the app puts it.
 *
 * This corrects an earlier note in this file, which claimed the emulator
 * "reports `insets.bottom = 0`" and that the boards were therefore about
 * 24 dp lower than the device. The emulator reports `insets.bottom = 24`,
 * and the 24 dp that was missing was at the TOP: the content was drawn from
 * the canvas's top instead of from below the status bar. See `STATUS_INSET`.
 *
 * THE ARTWORK
 * -----------
 * The app draws a real Internet Archive poster in every card. A Penpot
 * board cannot fetch a remote image, so the cards carry the app's OWN
 * bundled video placeholders (`src/assets/images/placeholders/video/`) —
 * the same pictures the app ships for a video with no artwork of its own.
 * The card TITLES and META lines are the app's own, read off the device on
 * 2026-11-13.
 */

'use strict';

const {kit, SCREEN_W, SCREEN_H, spacing, radius} = require('./kit');
const {profileKit, HEADER_H} = require('./profile');
const {measure} = require('./text-metrics');

// ─── the page's own metrics ────────────────────────────────────────────────

/**
 * THE STATUS BAND — the strip above the app's own content.
 *
 * MEASURED on `emulator-5554` (2026-11-13), not assumed:
 *
 *   • the board's canvas is the SCREEN — 914 dp tall, the emulator's own
 *     viewport (1080 x 2400 px at 420 dpi = 411.4 x 914.3 dp);
 *   • the app's WINDOW starts 24 dp below the screen's top — the status bar
 *     is a strip of its own, not an overlay — so the app's content starts
 *     24 dp down the screen;
 *   • the window's BOTTOM is the screen's bottom: the navigation bar is
 *     OVERLAID on the window, not a strip above it. Measured: the browse
 *     list's viewport is 745.14 dp tall and its top is at screen 169.14 dp,
 *     so its bottom is at screen 914.28 dp — the screen's bottom.
 *
 * So the page's content starts `STATUS_INSET` down the canvas, and the
 * bottom-anchored furniture (the FAB, the sheet) is anchored to the
 * canvas's BOTTOM, which is where the app puts it.
 *
 * What this replaces: the earlier note in this file claimed the emulator
 * "reports `insets.bottom = 0`" and that the boards were therefore 24 dp
 * lower than the device. That was wrong on both counts. The emulator
 * reports `insets.bottom = 24` — the navigation bar's own inset — and the
 * app's FAB clearance is `insets.bottom + spacing.lg` = 24 + 16 = 40 dp,
 * which is exactly what the board draws and exactly what the device draws
 * (measured: the FAB's disc sits 818.3..873.9 dp on a 914.3 dp screen, i.e.
 * 40.4 dp above the bottom). The 24 dp that was missing was at the TOP: the
 * content was drawn from the canvas's top instead of from below the status
 * bar.
 */
const STATUS_INSET = 24;

/** The page's gutter — `spacing.lg` (16), the shell's own gutter. */
const GUTTER = spacing.lg; // 16

/**
 * The field (`SearchBar.tsx:147-155`).
 *
 * 44 dp tall, `radius.pill`, `background.elevated`, a 1 px `border.subtle`
 * hairline, 12 dp of horizontal padding, an 18 dp magnifier, and the app's
 * own Inter 15 px with an 8 dp gap after the glyph.
 */
const FIELD = {
  h: 44,
  padX: spacing.md, // 12
  glyph: 18,
  gap: spacing.sm, // 8
  textSize: 15,
  textLine: 22,
};

/**
 * The grid (`MovieCard.styles.ts:18-30`, `MoviesContent.tsx:250-266`).
 *
 * Two columns, a ZERO gap, a full-bleed mosaic — the cards butt against
 * each other and against the screen edge, so they read as one continuous
 * image grid rather than as cards. Each card is half the screen wide and
 * 16:9, so it is 205.5 x 115.59 dp.
 *
 * THE GRID'S TOP
 * --------------
 * The shell's own stack (`BrowseLayout.tsx:185-221`): the header (60 dp),
 * the search slot (16 above the field, 44 of field, 12 below) and the chip
 * slot (12 below, and NOTHING above — the chip row is only there when a
 * filter is active, and on the Movies screen nothing is active until the
 * user picks one).
 *
 *   60 + 16 + 44 + 12 + 12 = 144
 */
const GRID = {
  top: HEADER_H + spacing.lg + FIELD.h + spacing.md + spacing.md + STATUS_INSET, // 168
  cardW: SCREEN_W / 2, // 205.5
  cardH: (SCREEN_W / 2) * (9 / 16), // 115.59
  padX: spacing.lg, // 16
  padTop: spacing.lg, // 16
  padBottom: spacing.md, // 12
  gap: 4,
  titleSize: 15,
  titleLine: 18,
  metaSize: 12,
  metaLine: 14,
  /** The overlay's gradient covers the bottom 62% of the card. */
  scrim: 0.62,
};

/**
 * The FAB (`Fab.tsx:63,143-159`).
 *
 * A 56 dp gold disc, `spacing.xl` (20) from the right edge, and the app's
 * 24 dp `sliders` glyph in `text.inverse`.
 *
 * `bottomInset + gap` is the app's OWN clearance — `useBottomChromeInset()`
 * is `insets.bottom + spacing.lg`, and the emulator's `insets.bottom` is 24
 * (the navigation bar's inset, which is OVERLAID on the window, so the
 * window's bottom IS the screen's bottom). Measured on the device: the FAB's
 * disc sits 40.4 dp above the screen's bottom.
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
 * padding; the group title is 11 px, weight 600, `letterSpacing 1.4` and
 * `text.secondary`; the first group reserves 40 dp at the top for
 * true-sheet's native grabber; the groups are separated by a hairline with
 * 12 dp either side; the toggle row under a collapsible group is 40 dp
 * (24 dp of line box + 8 dp of padding either side) with a 4 dp margin
 * above it.
 *
 * The group title's LINE HEIGHT is 24, not 16: the title is an `AppText`
 * with no variant, so it keeps the default variant's line height (`body1`
 * = 17/24) and only overrides the size (`FilterSheet.tsx:381`).
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
};

/**
 * The CATEGORY group — the app's own 20 genres
 * (`constants/movieCategories.ts`, minus the `all` entry, which the sheet
 * does not offer because an empty selection already means "All").
 *
 * The group is multi-select and it COLLAPSES to its first six chips
 * (`collapsedRowLimit: 6`, `browseConfig.ts:32`), with a SHOW MORE toggle
 * that also extends the sheet to its full detent.
 */
const CATEGORIES = [
  {key: 'classic-films', label: 'Classic Films'},
  {key: 'public-domain', label: 'Public Domain'},
  {key: 'documentaries', label: 'Documentaries'},
  {key: 'silent-films', label: 'Silent Films'},
  {key: 'comedy', label: 'Comedy'},
  {key: 'sci-fi', label: 'Sci-Fi'},
  {key: 'western', label: 'Westerns'},
  {key: 'film-noir', label: 'Film Noir'},
  {key: 'animation', label: 'Animation'},
  {key: 'horror', label: 'Horror'},
  {key: 'drama', label: 'Drama'},
  {key: 'action', label: 'Action'},
  {key: 'war', label: 'War'},
  {key: 'crime', label: 'Crime'},
  {key: 'mystery', label: 'Mystery'},
  {key: 'romance', label: 'Romance'},
  {key: 'musical', label: 'Musical'},
  {key: 'adventure', label: 'Adventure'},
  {key: 'fantasy', label: 'Fantasy'},
  {key: 'thriller', label: 'Thriller'},
];

/** How many of the category chips the sheet shows before SHOW MORE. */
const COLLAPSED = 6;

/**
 * The SORT BY group (`browseConfig.ts:47-72`).
 *
 * "Most popular" is the group's DEFAULT (`defaultKey: 'popular'`), so it
 * is drawn as the applied state — gold — without counting as an active
 * filter. It is the default because the Internet Archive's own order is
 * RECENCY, and with the archive's natural order the Documentaries
 * category returned 38 television news segments out of its first 40 items
 * (measured 2026-11-12); with `downloads desc` the same query returns 0.
 */
const SORTS = [
  {key: 'popular', label: 'Most popular', selected: true},
  {key: 'newest', label: 'Recently added'},
  {key: 'az', label: 'A–Z'},
];

/**
 * The movies on the grid — the app's own first screenful, read off the
 * device on 2026-11-13 (the default order, "Most popular").
 *
 * `lines` is how many lines the title takes in the card: the app's
 * `numberOfLines={2}` with `ellipsizeMode="tail"`
 * (`MovieCard.tsx:181-186`), so a long title is two lines and the second
 * one ends in an ellipsis. The board draws the same break.
 */
const MOVIES = [
  {title: "CUKESIM's New\nJob! ( Charles Chapli…", lines: 2, meta: null},
  {title: 'Sex Madness', lines: 1, meta: '1938'},
  {title: 'Charlie Chaplin\nFestival', lines: 2, meta: '1938'},
  {title: 'The Fast And The\nFurious', lines: 2, meta: '1955  ·  Roger Corman'},
  {title: 'Dr. Sex.', lines: 1, meta: null},
  {title: 'His Girl Friday', lines: 1, meta: '1940'},
  {title: 'Voyage to the Planet\nof Prehistoric Women', lines: 2, meta: '1967  ·  Norman D. Wells'},
  {title: 'House on Haunted Hill', lines: 1, meta: '1959  ·  William Castle'},
  {title: 'Jungle Book', lines: 1, meta: '1942  ·  Alexander Korda'},
  {title: 'Reefer Madness', lines: 1, meta: '1938  ·  George A. Hirliman'},
  {title: 'Sita Sings the Blues', lines: 1, meta: '2008  ·  Nina Paley'},
  {title: 'Utopia', lines: 1, meta: '1951  ·  Raymond Eger'},
  {title: 'The Pied Piper of Hamelin', lines: 1, meta: '1957  ·  Hal Stanley'},
  {title: 'Escape From Sobibor', lines: 1, meta: '1987  ·  Jack Gold'},
];

/** The card artwork, in the order the cards use it. */
const ARTWORK = [
  'ph.movie1',
  'ph.movie2',
  'ph.movie3',
  'ph.movie4',
  'ph.movie5',
  'ph.movie6',
];

// ─── the drawing kit for one theme ─────────────────────────────────────────

/**
 * Build the drawing helpers for one theme.
 *
 * @param {'light'|'dark'} themeName
 */
function moviesKit(themeName) {
  const k = kit(themeName);
  const c = k.c;
  const P = profileKit(themeName);

  /** The media key of one of the app's own glyphs, in this theme. */
  const iconKey = (name) => `ico.${name}.${themeName}`;

  /**
   * The search field.
   *
   * The app's own field, unfocused: the magnifier is `text.tertiary` and
   * the border stays `border.subtle` — the focus ring is never gold
   * (`md/SEARCH_PAGE_REDESIGN.md` §3.5).
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
   * ONE CARD — the 16:9 hero card (`MovieCard.tsx`).
   *
   * The image IS the card: no surface, no border, no badge, no radius. The
   * app paints a LinearGradient over the bottom 62% of it — Penpot cannot
   * render a gradient, so the board draws the gradient's DARK end as a
   * solid scrim over the same region, which is what the text sits on.
   *
   * The text overlay is anchored to the BOTTOM of the card: 16 dp of
   * horizontal padding, 16 dp above the title, 12 dp below the meta and a
   * 4 dp gap between them. So the meta's line box always ends 12 dp above
   * the card's bottom edge, whatever the title's line count is.
   */
  function card(name, o) {
    const out = [];
    const cardTop = o.y;
    const cardBottom = cardTop + GRID.cardH;

    out.push(
      k.image(name + ' artwork', {
        x: o.x,
        y: cardTop,
        w: GRID.cardW,
        h: GRID.cardH,
        media: o.artwork,
      }),
    );

    // The gradient's dark end — the region the text sits on.
    const scrimH = GRID.cardH * GRID.scrim;
    out.push(
      k.rect(name + ' scrim', {
        x: o.x,
        y: cardBottom - scrimH,
        w: GRID.cardW,
        h: scrimH,
        fill: c.background.scrimStrong,
      }),
    );

    // The text block, measured from the card's bottom edge.
    const contentBottom = cardBottom - GRID.padBottom;
    const metaTop = contentBottom - GRID.metaLine;
    const titleBottom = o.meta ? metaTop - GRID.gap : contentBottom;
    const titleTop = titleBottom - o.lines * GRID.titleLine;

    out.push(
      k.text(name + ' title', o.title, {
        x: o.x + GRID.padX,
        y: titleTop,
        family: 'Inter',
        weight: 700,
        size: GRID.titleSize,
        lineHeight: GRID.titleLine,
        letterSpacing: 0.1,
        fill: c.text.bright,
      }),
    );
    if (o.meta) {
      out.push(
        k.text(name + ' meta', o.meta, {
          x: o.x + GRID.padX,
          y: metaTop,
          family: 'Inter Medium',
          weight: 500,
          size: GRID.metaSize,
          lineHeight: GRID.metaLine,
          letterSpacing: 0.2,
          fill: c.text.onMediaSoft,
        }),
      );
    }
    return out;
  }

  /**
   * The FAB — the app's ONE floating action button, and the door to the
   * filter sheet.
   *
   * It floats OVER the content (`insets.bottom + spacing.lg`): the overlap
   * is the point, and the app's rule is the rule.
   */
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

  return {k, c, P, iconKey, field, card, fab, theme: k.theme};
}

// ─── the chips ──────────────────────────────────────────────────────────────

/**
 * The width of one chip: the label's own width on the device's pixel grid,
 * plus the chip's 12 dp of horizontal padding and its 1.5 dp border on
 * either side.
 */
function chipWidth(label, selected) {
  const labelW = measure(label, {
    family: selected ? 'Inter SemiBold' : 'Inter Medium',
    size: SHEET.chipLabelSize,
  });
  return labelW + SHEET.chipPadX * 2 + SHEET.chipBorder * 2;
}

/**
 * The chip's flow — which chips share a row.
 *
 * The app's `chipWrap` is a `flexWrap: 'row'` flow with an 8 dp row gap
 * and an 8 dp column gap, inside a group that is 16 dp in from either edge
 * (`FilterSheet.tsx:436-460`). So the row a chip lands in is decided by the
 * widths of the chips before it — which is why the widths are measured
 * here and not on the board.
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
 * The sheet's content, laid out the app's way, from its own top.
 *
 * Everything the sheet contains, in the app's order, with the app's own
 * paddings — and the height it comes to, which is what decides where the
 * sheet sits.
 */
function sheetContent() {
  const collapsed = CATEGORIES.slice(0, COLLAPSED);
  const categoryChips = collapsed.map(c => ({
    ...c,
    selected: false,
    width: chipWidth(c.label, false),
  }));
  const sortChips = SORTS.map(s => ({
    ...s,
    width: chipWidth(s.label, s.selected),
  }));

  const categoryRows = flowChips(categoryChips);
  const sortRows = flowChips(sortChips);

  // The group's own stack.
  let y = SHEET.grabberZone; // the first group's 40 dp grabber zone
  y += SHEET.titleLine; // the group title's line box
  y += SHEET.titleGap; // the title's own marginBottom
  const chipsTop = y;
  for (let i = 0; i < categoryRows.length; i++) {
    y += SHEET.chipH;
    if (i < categoryRows.length - 1) y += SHEET.chipGap;
  }
  const toggleTop = y + SHEET.toggleMarginTop;
  const toggleH = SHEET.toggleLine + SHEET.togglePadY * 2;
  y = toggleTop + toggleH;

  // The divider between the two groups: 12 dp either side of a hairline.
  const dividerY = y + SHEET.dividerMargin;
  y = dividerY + 1 + SHEET.dividerMargin;

  const sortTitleY = y;
  y += SHEET.titleLine;
  y += SHEET.titleGap;
  const sortChipsTop = y;
  y += SHEET.chipH;

  // The body's own bottom padding — and the device's bottom inset, which
  // the body carries when the RESET footer is not there to carry it
  // (`FilterSheet.tsx:344-350`). The Movies screen has nothing active when
  // it opens, so there is no footer.
  y += SHEET.bottomPadding;

  return {
    categoryRows,
    sortRows,
    categoryTitleY: SHEET.grabberZone,
    chipsTop,
    toggleTop,
    toggleH,
    dividerY,
    sortTitleY,
    sortChipsTop,
    height: y,
  };
}

// ─── the boards ────────────────────────────────────────────────────────────

/**
 * Move a list of shapes down by the status inset.
 *
 * The header is drawn by the shared profile kit, which draws the app's
 * header at the top of whatever canvas it is handed. The app's own header
 * starts BELOW the status bar, so the shapes are moved down by the band.
 * Every shape in this prototype carries a numeric `y`, so this is a plain
 * offset on each one.
 */
function shiftDown(shapes, dy) {
  return shapes.map(s => (typeof s.y === 'number' ? {...s, y: s.y + dy} : s));
}

/**
 * The chrome every state of the page carries: the header and the field.
 *
 * The field sits 16 dp below the header (the search slot's own padding)
 * and the page's gutter is 16 on both sides.
 *
 * Both start `STATUS_INSET` down the canvas, because the app's own window
 * starts below the status bar.
 */
function chrome(S) {
  const shapes = shiftDown(S.P.header('MoviesScreen', 'Movies'), STATUS_INSET);
  const fieldY = HEADER_H + spacing.lg + STATUS_INSET; // 60 + 16 + 24 = 100
  shapes.push(
    ...S.field('MoviesScreen search field', {y: fieldY, placeholder: 'Search movies…'}),
  );
  return shapes;
}

/**
 * The grid — the cards, row by row.
 *
 * `maxRows` is where the drawing stops: the filter board draws the same
 * page and lets the sheet cover the rest of it.
 */
function grid(S, o) {
  const shapes = [];
  for (let i = 0; i < MOVIES.length; i++) {
    const row = Math.floor(i / 2);
    if (row >= o.maxRows) break;
    const col = i % 2;
    const movie = MOVIES[i];
    const out = S.card('MoviesScreen card ' + (i + 1), {
      x: col * GRID.cardW,
      y: GRID.top + row * GRID.cardH,
      lines: movie.lines,
      title: movie.title,
      meta: movie.meta,
      artwork: ARTWORK[i % ARTWORK.length],
    });
    shapes.push(...out);
  }
  return shapes;
}

/**
 * THE SCREEN — the Movies page as it opens.
 *
 * The header, the search field, the full-bleed mosaic and the filter FAB.
 * There is NO chip strip: nothing is active until the user picks
 * something, and the sort's own default ("Most popular") does not count
 * as active (`FilterSheet.tsx:67-75`).
 */
function moviesScreenBoard(themeName) {
  const S = moviesKit(themeName);
  const shapes = [...chrome(S)];
  shapes.push(...grid(S, {maxRows: MOVIES.length}));

  // The FAB floats over the viewport, not over the content: the app
  // anchors it to the SCREEN's bottom (`useBottomChromeInset` →
  // `insets.bottom + spacing.lg`), so the content scrolls UNDER it.
  shapes.push(...S.fab('MoviesScreen FAB', {y: SCREEN_H - FAB.bottomInset - FAB.gap - FAB.size}));

  return {width: SCREEN_W, height: SCREEN_H, shapes};
}

/**
 * THE FILTER — the page with the app's own filter sheet over it.
 *
 * The sheet is the app's `FilterSheet`: CATEGORY (the 20 genres, collapsed
 * to six with a SHOW MORE toggle) and SORT BY (Most popular · Recently
 * added · A–Z), with "Most popular" drawn as the applied default.
 *
 * The page behind the sheet is drawn only as far as the sheet's top edge:
 * what the sheet covers is not drawn, because Penpot clips a board's
 * children anyway.
 */
function moviesFilterBoard(themeName) {
  const S = moviesKit(themeName);
  const content = sheetContent();

  // The sheet's height is its own content plus the board's bottom inset —
  // the same model every other board in this prototype uses.
  const sheetH = content.height + FAB.bottomInset;
  const sheetTop = SCREEN_H - sheetH;

  const shapes = [...chrome(S)];
  shapes.push(...grid(S, {maxRows: 4}));

  // The scrim over the page behind the sheet.
  shapes.push(
    S.k.rect('MoviesScreen filter sheet scrim', {
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
    S.k.rect('MoviesScreen filter sheet surface', {
      x: 0,
      y: sheetTop,
      w: SCREEN_W,
      h: sheetH,
      radius: SHEET.radius,
      fill: S.c.background.elevated,
    }),
    S.k.rect('MoviesScreen filter sheet surface foot', {
      x: 0,
      y: sheetTop + SHEET.radius,
      w: SCREEN_W,
      h: sheetH - SHEET.radius,
      fill: S.c.background.elevated,
    }),
  );

  // true-sheet's native grabber — the 40 dp the first group reserves.
  // Measured on the device, the handle's pill sits 14 dp below the sheet's
  // top edge.
  shapes.push(
    S.k.rect('MoviesScreen filter sheet grabber', {
      x: {center: SCREEN_W / 2},
      y: sheetTop + 14,
      w: SHEET.grabberW,
      h: SHEET.grabberH,
      radius: SHEET.grabberH / 2,
      fill: S.c.border.emphasis,
    }),
  );

  // ── CATEGORY ────────────────────────────────────────────────────────────
  shapes.push(
    S.k.text('MoviesScreen filter sheet title CATEGORY', 'CATEGORY', {
      x: SHEET.padX,
      y: sheetTop + content.categoryTitleY,
      family: 'Inter SemiBold',
      weight: 600,
      size: SHEET.titleSize,
      lineHeight: SHEET.titleLine,
      letterSpacing: 1.4,
      fill: S.c.text.secondary,
    }),
  );
  shapes.push(...sheetChips(S, content.categoryRows, sheetTop + content.chipsTop));

  // The SHOW MORE toggle — the app's own row, centred, with the app's
  // gold chevron.
  const toggleLabel = 'MoviesScreen filter sheet show more';
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
    S.k.image('MoviesScreen filter sheet show more chevron', {
      x: toggleLeft + toggleLabelW + SHEET.toggleGap,
      y: sheetTop + content.toggleTop + SHEET.togglePadY + (SHEET.toggleLine - SHEET.toggleGlyph) / 2,
      w: SHEET.toggleGlyph,
      h: SHEET.toggleGlyph,
      media: S.iconKey('chevronDown'),
    }),
  );

  // The divider between the two groups.
  shapes.push(
    S.k.rect('MoviesScreen filter sheet divider', {
      x: SHEET.padX,
      y: sheetTop + content.dividerY,
      w: SCREEN_W - SHEET.padX * 2,
      h: 1,
      fill: S.c.border.subtle,
    }),
  );

  // ── SORT BY ─────────────────────────────────────────────────────────────
  shapes.push(
    S.k.text('MoviesScreen filter sheet title SORT BY', 'SORT BY', {
      x: SHEET.padX,
      y: sheetTop + content.sortTitleY,
      family: 'Inter SemiBold',
      weight: 600,
      size: SHEET.titleSize,
      lineHeight: SHEET.titleLine,
      letterSpacing: 1.4,
      fill: S.c.text.secondary,
    }),
  );
  shapes.push(...sheetChips(S, content.sortRows, sheetTop + content.sortChipsTop));

  return {width: SCREEN_W, height: SCREEN_H, shapes};
}

/**
 * The chips of one group, row by row.
 *
 * The chips are CHAINED, not placed: each label sits after the previous
 * one, so the row is measured from the type's own widths and never from a
 * hand-typed x. The pill around a label follows the label's own measured
 * width — the app's chip is exactly as wide as its label plus its 12 dp
 * of padding and its 1.5 dp border.
 *
 * The PILL IS DRAWN FIRST, so the label is painted ON TOP of it — the
 * plan's order is the painting order.
 */
function sheetChips(S, rows, top) {
  const out = [];
  let previousLabel = null;
  rows.forEach((row, rowIndex) => {
    const y = top + rowIndex * (SHEET.chipH + SHEET.chipGap);
    row.forEach(entry => {
      const chip = entry.chip;
      const labelName = 'MoviesScreen filter sheet chip ' + chip.key + ' label';
      const pillName = 'MoviesScreen filter sheet chip ' + chip.key + ' pill';
      const textX = previousLabel
        ? {
            after: {
              name: previousLabel,
              edge: 'right',
              pad: SHEET.chipPadX * 2 + SHEET.chipBorder * 2 + SHEET.chipGap,
            },
          }
        : SHEET.padX + SHEET.chipPadX + SHEET.chipBorder;

      out.push(
        // The pill — behind the label.
        S.k.rect(pillName, {
          x: {after: {name: labelName, pad: -SHEET.chipPadX - SHEET.chipBorder}},
          y,
          // The pill's width is the label's own measured width plus its
          // 12 dp of padding either side and the 1.5 dp border.
          w: {
            text: labelName,
            min: 0,
            extra: SHEET.chipPadX * 2 + SHEET.chipBorder * 2,
            measured: true,
          },
          h: SHEET.chipH,
          radius: radius.full,
          fill: chip.selected ? S.c.accent.gold : S.c.background.primary,
          stroke: chip.selected ? undefined : S.c.border.subtle,
          strokeWidth: chip.selected ? undefined : 1.5,
        }),
        // The label — on top of the pill.
        S.k.text(labelName, chip.label, {
          x: textX,
          y: y + (SHEET.chipH - SHEET.chipLabelLine) / 2,
          family: chip.selected ? 'Inter SemiBold' : 'Inter Medium',
          weight: chip.selected ? 600 : 500,
          size: SHEET.chipLabelSize,
          lineHeight: SHEET.chipLabelLine,
          fill: chip.selected ? S.c.background.primary : S.c.text.primary,
        }),
      );
      previousLabel = labelName;
    });
  });
  return out;
}

module.exports = {
  moviesKit,
  moviesScreenBoard,
  moviesFilterBoard,
  CATEGORIES,
  SORTS,
  MOVIES,
};
