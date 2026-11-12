#!/usr/bin/env node
/**
 * search.js — the Search page boards (wave B8).
 *
 * THE SPEC
 * --------
 * `md/SEARCH_PAGE_REDESIGN.md` §3 is the source of truth for every number
 * on this page. The owner rejected the first draft of that document on the
 * device ("unwanted circles", "not simple like home profile"), so this file
 * draws the SECOND version: the Profile's row grammar, the gold Cormorant
 * divider, ONE gutter, and no card, no disc and no chip anywhere.
 *
 * THE GRAMMAR IT USES
 * -------------------
 *   • the header is `InternalHeader.tsx` — a 36 dp back circle, a centred
 *     Manrope SemiBold 22/28 title and a hairline (`profile.js`'s `header`);
 *   • the field is `SearchBar.tsx` — 44 dp tall, `radius.pill`,
 *     `background.elevated`, a `border.subtle` hairline that becomes
 *     `border.emphasis` on focus (NEVER gold), an 18 dp magnifier and the
 *     app's own 15 px Inter;
 *   • the source scope is a TEXT row with a 2 dp gold underline on the
 *     active item — the Library's own segment grammar
 *     (`LibraryScreenContent.tsx:140-152`), minus the icons;
 *   • the rows are the Profile's `SettingsRow` anatomy — full-bleed,
 *     16 dp of gutter, 12 dp of vertical padding, a hairline under the row,
 *     `body2` label, `caption` description, an 18 dp GOLD glyph when the
 *     result has no artwork, and a trailing chevron / bare download glyph /
 *     nothing;
 *   • the section titles are `SubsectionTitle`'s `displaySerif` — Cormorant
 *     Garamond Italic 18/24 at 0.9 gold with `goldGlow` rules;
 *   • the colours, the spacing scale and the radii are `app-spec.js`, which
 *     reads `src/theme/tokens.ts` through the TypeScript AST.
 *
 * THE FOUR STATES
 * ---------------
 * The page has four, and the board carries all four in both themes:
 *
 *   • EMPTY      — the field, the hint, "Recent searches", "Trending now";
 *   • RESULTS    — the field, the source scope, one group per result kind;
 *   • NO RESULTS — the field, the source scope, one quiet caption line;
 *   • FILTERS    — the results page with the app's own filter sheet over it.
 *
 * THE SIX RESULT ROWS
 * -------------------
 * The app's own navigation graph leaves the Search screen through six
 * different destinations (`designs/penpot/app-boards.js`), so the results
 * board carries a row for each of them. The SHAPE names are the graph's
 * names — `Search artist result`, `Search album result`,
 * `Search playlist result`, `Search folder result`,
 * `Search audiobook result`, `Search archive result` — and they are the
 * TITLE shape of the row, so the connector fires on the text the user
 * reads. The rest of the row's shapes carry the same prefix, so the whole
 * row is the target (rule P10: the whole card is the target, not the
 * picture of the card).
 *
 * WHAT IS NOT ON THESE BOARDS
 * ---------------------------
 *   • **No gold disc.** The `EmptyState` circle (D-11) is not drawn: the
 *     no-results state is a quiet caption line.
 *   • **No cards.** Every row is full-bleed with a hairline (D-6).
 *   • **No chip row.** The eight source chips are a segment row of text
 *     (D-12), and the six TYPE / SORT controls live in the filter sheet.
 *   • **No autofocus.** The page opens on its content (§3.5), so the
 *     empty board's field is UNFOCUSED — the magnifier is `text.tertiary`,
 *     not gold.
 */

'use strict';

const {kit, SCREEN_W, SCREEN_H, spacing, radius} = require('./kit');
const {profileKit, HEADER_H} = require('./profile');

// ─── the page's own metrics ────────────────────────────────────────────────

/**
 * The page's gutter — `spacing.lg` (16).
 *
 * 2026-11-12 (`md/SEARCH_PAGE_REDESIGN.md` §3.1): the page had FOUR left
 * edges — 20 (the content), 28 (the header), 32 (the source chips and the
 * remote titles) and 36 (the local section headers). 16 is the app's list
 * gutter — `SettingsRow`, `SectionHeader` and `SubsectionTitle` all use it.
 */
const GUTTER = spacing.lg; // 16

/**
 * The field (`SearchBar.tsx:147-155`).
 *
 * 44 dp tall, `radius.pill`, `background.elevated`, a 1 px border, and
 * 12 dp of horizontal padding. The magnifier is 18 dp (`SearchBar.tsx:109`)
 * and the input is the app's Inter 15 px with an 8 dp gap after the glyph.
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
 * The field's placeholder — the app's own (`SearchScreen.tsx:540` passes
 * `placeholder="Search…"`).
 *
 * The page's informative line is the HINT under the field (§3.6), not the
 * field's placeholder: the placeholder says what to do, the hint says what
 * is searched.
 */
const FIELD_PLACEHOLDER = 'Search…';

/**
 * The source scope row (`md/SEARCH_PAGE_REDESIGN.md` §3.3).
 *
 * The item is `paddingVertical 10`, `paddingHorizontal 8` and a
 * `borderBottomWidth 2` that is transparent until the item is active. The
 * rail is `paddingHorizontal 16` with a 4 dp gap.
 *
 * 2026-11-12 (the board-vs-device check): the item's own padding is 8 dp,
 * NOT 12 — `SegmentRow.tsx:139` uses `paddingHorizontal: spacing.sm`. And
 * the gap between two items is the item's own 8 + the item's 8 + the
 * rail's 4 = 20 dp, which is what the device's own frames say: the first
 * label's text starts at 24 dp (16 + 8) and the second at 60.3 dp.
 *
 * The LABEL is Inter Medium 13 — the size and the weight the app's own
 * segment row uses (`LibraryScreenContent.tsx:149`: `body2` overridden to
 * `fontWeight: '500', fontSize: 13`), so the scope row on this page is the
 * same grammar as the one the Library already ships rather than a third
 * one. The 18 dp line is the app's own 13 px line height (`caption`).
 */
const SCOPE = {
  padX: spacing.sm, // 8
  padY: 10,
  underline: 2,
  railPadX: GUTTER,
  gap: spacing.xs, // 4
  labelSize: 13,
  labelLine: 18,
};

/**
 * The row (`md/SEARCH_PAGE_REDESIGN.md` §3.2).
 *
 * `paddingHorizontal 16`, `paddingVertical 12`, `minHeight 56`, a hairline
 * under the row, a 40x40 artwork at radius 8 (or an 18 dp gold glyph),
 * a `body2` title and a `caption` subtitle.
 *
 * THE LEADING SLOT IS 40 dp, WHATEVER IS IN IT
 * ----------------------------------------------
 * 2026-11-12 (the board-vs-device check): the artwork is 40 dp wide and
 * the GOLD GLYPH sits in a 40 dp slot too (`SearchResultRow.tsx:163` —
 * `glyphSlot` is 40x40 with the 18 dp glyph centred in it), and both
 * carry a 12 dp `marginRight`. So the text column starts at 68 dp in
 * either case. The board used to put the text at 46 dp on a glyph row —
 * 22 dp to the left of where the app draws it.
 *
 * The row's height follows what is IN it: a row with a subtitle is
 * 12 + 22 + 18 + 12 = 64 dp of content, and a row whose leading is a
 * 40 dp slot is 12 + 40 + 12 = 64 dp.
 */
const ROW = {
  padX: GUTTER,
  padY: spacing.md, // 12
  minHeight: 56,
  hairline: 1,
  lead: 40,
  art: 40,
  artRadius: radius.sm, // 8
  glyph: 18,
  titleSize: 15,
  titleLine: 22,
  subtitleSize: 13,
  subtitleLine: 18,
  chevron: 14,
  download: 20,
};

/**
 * The FAB (`Fab.tsx`).
 *
 * A 56 dp gold disc at `spacing.xl` (20) from the right edge and
 * `insets.bottom + spacing.lg` from the bottom. The device's bottom inset
 * is 24 dp (`home.js` places the same button at `SCREEN_H - 24 - 16 - 56`).
 * The glyph is the app's `sliders` at 24 dp in `text.inverse` — this is
 * the button that opens the filter sheet.
 */
const FAB = {
  size: 56,
  right: spacing.xl, // 20
  bottomInset: 24,
  gap: spacing.lg, // 16
  glyph: 24,
};

/**
 * The filter sheet (`FilterSheet.tsx`).
 *
 * The chip is a 32 dp pill with a 1.5 dp border and 12 dp of horizontal
 * padding; the group title is 11 px, weight 600, `letterSpacing 1.4` and
 * `text.secondary`; the first group reserves 40 dp at the top for
 * true-sheet's native grabber; the groups are separated by a hairline with
 * 12 dp either side.
 *
 * The group title's LINE HEIGHT is 24, not 16: the title is an `AppText`
 * with no `variant`, so it keeps the default variant's line height
 * (`body1` = 17/24) and only overrides the size (`FilterSheet.tsx:381`).
 * Measured on the device, the "TYPE" title's box is 24 dp tall and the
 * chip row starts 72 dp into the sheet.
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
};

/**
 * The scope's six live sources.
 *
 * `Podcasts` and `Radio` are GONE: their adapters are not built, so the
 * two chips could only ever draw an empty page (§2.1 D-5).
 */
const SOURCES = ['All', 'Local', 'Music', 'TV', 'Audiobooks', 'Archive'];

/**
 * The result groups, in the app's own order.
 *
 * The local entity groups first (artists, albums, playlists, folders), then
 * the remote ones (music, audiobooks, archive) — the same order
 * `SearchScreen.tsx:291-306` and `RemoteResults.tsx` build them in.
 *
 * The titles are the app's OWN search results, read off the device during
 * the audit (the "music" query returned "Music Soothe", "Free Music
 * Happy" and the artist "StimiBeats"). The entity rows carry the kind as
 * their caption, because a local artist, album, playlist, folder, audiobook
 * and archive item have no artwork of their own — they fall back to the
 * gold glyph (§2.2 B8-3).
 */
const GROUPS = [
  {
    label: 'Artists',
    rows: [
      {
        base: 'Search artist result',
        title: 'StimiBeats',
        subtitle: 'Artist',
        glyph: 'headphones',
        trailing: 'chevron',
      },
    ],
  },
  {
    label: 'Albums',
    rows: [
      {
        base: 'Search album result',
        title: 'Ambient Nights',
        subtitle: 'Album',
        glyph: 'disc3',
        trailing: 'chevron',
      },
    ],
  },
  {
    label: 'Playlists',
    rows: [
      {
        base: 'Search playlist result',
        title: 'Focus Mix',
        subtitle: 'Playlist',
        glyph: 'listMusic',
        trailing: 'chevron',
      },
    ],
  },
  {
    label: 'Folders',
    rows: [
      {
        base: 'Search folder result',
        title: 'Music Videos',
        subtitle: 'Folder',
        glyph: 'folder',
        trailing: 'chevron',
      },
    ],
  },
  {
    label: 'Music',
    rows: [
      {
        base: 'Search music result 1',
        title: 'Free Music Happy',
        subtitle: 'StimiBeats',
        artwork: 'ph.row1',
        trailing: 'download',
      },
      {
        base: 'Search music result 2',
        title: 'Music Soothe - Meditation',
        subtitle: 'StimiBeats',
        artwork: 'ph.row2',
        trailing: 'download',
      },
    ],
  },
  {
    label: 'Audiobooks',
    rows: [
      {
        base: 'Search audiobook result',
        title: 'The Great Gatsby',
        subtitle: 'Audiobook',
        glyph: 'book',
        trailing: 'chevron',
      },
    ],
  },
  {
    label: 'Archive',
    rows: [
      {
        base: 'Search archive result',
        title: 'Public Domain Recording',
        subtitle: 'Archive item',
        glyph: 'archive',
        trailing: 'chevron',
      },
    ],
  },
];

/**
 * The recent searches — the terms the user has run.
 *
 * They are unboxed rows with a hairline, the same grammar as every other
 * row, and they carry the app's own `history` glyph in the row's 40 dp
 * leading slot (`RecentSearches.tsx:61`): a term that has been run before
 * is a thing that happened, and the glyph says so in the app's own
 * vocabulary — the same gold 18 dp mark the About page's rows use.
 */
const RECENT = ['music', 'documentary', 'jazz'];

/**
 * The trending rows — the app's own trending tracks, with their artwork.
 */
const TRENDING = [
  {base: 'Search trending 1', title: 'Free Music Happy', subtitle: 'StimiBeats', artwork: 'ph.row1'},
  {
    base: 'Search trending 2',
    title: 'Music Soothe - Meditation',
    subtitle: 'StimiBeats',
    artwork: 'ph.row2',
  },
];

/**
 * The hint under the field (§3.6).
 *
 * ONE caption line — and it is TRUE: the page searches the library, the
 * music APIs, live TV, the audiobooks and the Internet Archive.
 *
 * The copy is 71 characters, and a Penpot text shape has no width — it is
 * a single line — so the hint is broken into two caption lines by the
 * drawing code (`profile.js`'s `paragraph`). 47 characters is what fits
 * the 379 dp of the field's width at 13 px.
 */
const HINT = 'Search your library, music, live TV, audiobooks and the Internet Archive';
const HINT_MAX_CHARS = 47;

/**
 * The filter sheet's two groups (§3.4).
 *
 * "Date" is GONE: only the recent-history entries carry a date, so on
 * every other result it was a control that did nothing (D-3).
 */
const FILTER_GROUPS = [
  {
    title: 'TYPE',
    rows: [
      {key: 'all', label: 'All', selected: true},
      {key: 'videos', label: 'Videos', selected: false},
      {key: 'audio', label: 'Audio', selected: false},
    ],
  },
  {
    title: 'SORT BY',
    rows: [
      {key: 'relevance', label: 'Relevance', selected: true},
      {key: 'name', label: 'Name', selected: false},
    ],
  },
];

// ─── the drawing kit for one theme ─────────────────────────────────────────

/**
 * Build the drawing helpers for one theme.
 *
 * @param {'light'|'dark'} themeName
 */
function searchKit(themeName) {
  const k = kit(themeName);
  const c = k.c;
  const P = profileKit(themeName);

  /** The media key of one of the app's own glyphs, in this theme. */
  const iconKey = (name) => `ico.${name}.${themeName}`;

  /**
   * The search field.
   *
   * The capsule and the 44 dp height are the app's own (`SearchBar.tsx`),
   * because the field is shared by eight browse screens and a second field
   * shape would be a second grammar. What is NOT the app's own is the
   * focus ring: it goes `border.subtle` → `border.emphasis`, never gold
   * (§3.5). The magnifier still turns gold, because that is the focus cue
   * and it is INSIDE the field.
   */
  function field(name, o) {
    const y = o.y;
    const out = [
      k.rect(name + ' box', {
        x: GUTTER,
        y,
        w: SCREEN_W - GUTTER * 2,
        h: FIELD.h,
        radius: radius.full,
        fill: c.background.elevated,
        stroke: o.focused ? c.border.emphasis : c.border.subtle,
        strokeWidth: 1,
      }),
      k.image(name + ' glyph', {
        x: GUTTER + FIELD.padX,
        y: y + (FIELD.h - FIELD.glyph) / 2,
        w: FIELD.glyph,
        h: FIELD.glyph,
        media: iconKey(o.focused ? 'searchFocus' : 'searchField'),
      }),
      k.text(name + ' text', o.value || o.placeholder, {
        x: GUTTER + FIELD.padX + FIELD.glyph + FIELD.gap,
        y: y + (FIELD.h - FIELD.textLine) / 2,
        family: 'Inter',
        weight: 400,
        size: FIELD.textSize,
        lineHeight: FIELD.textLine,
        fill: o.value ? c.text.primary : c.text.tertiary,
      }),
    ];
    // The clear button only exists when there IS something to clear
    // (`SearchBar.tsx:126`).
    if (o.clear) {
      out.push(
        k.image(name + ' clear', {
          x: SCREEN_W - GUTTER - FIELD.padX - 16,
          y: y + (FIELD.h - 16) / 2,
          w: 16,
          h: 16,
          media: iconKey('close'),
        }),
      );
    }
    return out;
  }

  /**
   * The source scope row.
   *
   * Six text items, a 2 dp gold underline under the active one. The
   * underline is as wide as the ITEM — the item's own 12 dp of horizontal
   * padding either side of the label — so it is the item's bottom border
   * and not a rule under the word.
   *
   * The items are chained, not placed: each label's x is its predecessor's
   * right edge plus the item's own padding and the rail's 4 dp gap, so the
   * row is measured from the type's own widths and never from a hand-typed
   * x.
   */
  function scopeRow(name, o) {
    const out = [];
    const y = o.y;
    let previous = null;
    SOURCES.forEach((label, i) => {
      const active = label === o.active;
      const labelName = name + ' ' + label + ' label';
      const textX = previous
        ? {after: {name: previous, edge: 'right', pad: SCOPE.padX * 2 + SCOPE.gap}}
        : SCOPE.railPadX + SCOPE.padX;
      out.push(
        k.text(labelName, label, {
          x: textX,
          y: y + SCOPE.padY,
          family: 'Inter Medium',
          weight: 500,
          size: SCOPE.labelSize,
          lineHeight: SCOPE.labelLine,
          fill: active ? c.accent.gold : c.text.secondary,
        }),
      );
      if (active) {
        out.push(
          k.rect(name + ' ' + label + ' underline', {
            x: {after: {name: labelName, pad: -SCOPE.padX}},
            y: y + SCOPE.padY + SCOPE.labelLine + SCOPE.padY,
            // The underline is as wide as the ITEM — the label's own
            // measured width plus the item's 12 dp of padding either side.
            // `measured` says the width follows the TEXT, so the pipeline
            // resolves it after the canvas has laid the board out.
            w: {text: labelName, min: 0, extra: SCOPE.padX * 2, measured: true},
            h: SCOPE.underline,
            fill: c.accent.gold,
          }),
        );
      }
      previous = labelName;
    });
    return out;
  }

  /**
   * THE ROW — one row, for every result on the page (§3.2).
   *
   * The Profile's `SettingsRow` anatomy, with artwork where a result has
   * some: full-bleed, 16 dp of gutter, 12 dp of vertical padding, a
   * hairline under the row, a 40x40 artwork at radius 8 (or an 18 dp GOLD
   * glyph), a `body2` title, a `caption` subtitle and a trailing control.
   *
   * NO card. NO border box. NO elevated background. NO circle.
   *
   * The row's height is computed from what is IN it: a row with a subtitle
   * is 12 + 22 + 18 + 12 + 1 = 65 dp, and a row with only a title is the
   * 56 dp minimum.
   */
  function row(name, o) {
    // The leading slot is 40 dp whether it holds artwork or a glyph, so the
    // row is 64 dp tall either way (`SearchResultRow.tsx:156,163`).
    const lead = o.artwork || o.glyph ? ROW.lead : 0;
    const textH = o.subtitle ? ROW.titleLine + ROW.subtitleLine : ROW.titleLine;
    const contentH = Math.max(textH, lead);
    const h = Math.max(ROW.minHeight, ROW.padY * 2 + contentH) + ROW.hairline;
    const centre = o.y + (h - ROW.hairline) / 2;
    const out = [];

    // The leading: the artwork, or the gold glyph in the SAME 40 dp slot.
    if (o.artwork) {
      out.push(
        k.image(name + ' leading', {
          x: ROW.padX,
          y: centre - ROW.art / 2,
          w: ROW.art,
          h: ROW.art,
          media: o.artwork,
          radius: ROW.artRadius,
        }),
      );
    } else if (o.glyph) {
      out.push(
        k.image(name + ' leading', {
          x: ROW.padX + (ROW.lead - ROW.glyph) / 2,
          y: centre - ROW.glyph / 2,
          w: ROW.glyph,
          h: ROW.glyph,
          media: iconKey(o.glyph),
        }),
      );
    }

    // The text column starts after the 40 dp slot and its 12 dp of margin.
    const textX = lead ? ROW.padX + lead + spacing.md : ROW.padX;

    out.push(
      k.text(o.titleName || name + ' title', o.title, {
        x: textX,
        y: o.subtitle ? o.y + ROW.padY : centre - ROW.titleLine / 2,
        family: 'Inter',
        weight: 400,
        size: ROW.titleSize,
        lineHeight: ROW.titleLine,
        fill: c.text.primary,
      }),
    );
    if (o.subtitle) {
      out.push(
        k.text(name + ' subtitle', o.subtitle, {
          x: textX,
          y: o.y + ROW.padY + ROW.titleLine,
          family: 'Inter',
          weight: 400,
          size: ROW.subtitleSize,
          lineHeight: ROW.subtitleLine,
          fill: c.text.tertiary,
        }),
      );
    }

    // The trailing: a chevron when the row navigates, a BARE download
    // glyph when the row can be downloaded, nothing when the row plays.
    if (o.trailing === 'chevron') {
      out.push(
        k.image(name + ' trailing', {
          x: SCREEN_W - ROW.padX - ROW.chevron,
          y: centre - ROW.chevron / 2,
          w: ROW.chevron,
          h: ROW.chevron,
          media: iconKey('chevronRight'),
        }),
      );
    } else if (o.trailing === 'download') {
      out.push(
        k.image(name + ' trailing', {
          x: SCREEN_W - ROW.padX - ROW.download,
          y: centre - ROW.download / 2,
          w: ROW.download,
          h: ROW.download,
          media: iconKey('download'),
        }),
      );
    }

    // The row's own hairline.
    out.push(
      k.rect(name + ' rule', {
        x: 0,
        y: o.y + h - ROW.hairline,
        w: SCREEN_W,
        h: ROW.hairline,
        fill: c.border.subtle,
      }),
    );
    out.rowHeight = h;
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

  /**
   * The filter sheet — the app's own, over the results.
   *
   * The sheet's surface is `background.elevated` with `radius.lg`, and the
   * scrim over the page behind it is the app's `background.scrim` token.
   * The chips are the app's chip: a 32 dp pill, a 1.5 dp border, 12 dp of
   * horizontal padding, and the SELECTED one is a solid gold pill with the
   * label in `background.primary` at weight 700.
   *
   * The sheet's own height is COMPUTED from its content — the grabber
   * zone, the two groups, the divider between them and the scroll's own
   * bottom padding — plus the device's bottom inset.
   */
  function filterSheet(name, o) {
    const out = [];
    const groups = FILTER_GROUPS;
    let contentH = SHEET.grabberZone;
    groups.forEach((group, gi) => {
      contentH += SHEET.titleLine + SHEET.titleGap + SHEET.chipH;
      if (gi > 0) contentH += SHEET.dividerMargin * 2 + 1;
    });
    contentH += SHEET.bottomPadding;
    const sheetH = contentH + FAB.bottomInset;
    const top = o.bottom - sheetH;

    // The scrim over the page behind the sheet.
    out.push(
      k.rect(name + ' scrim', {
        x: 0,
        y: 0,
        w: SCREEN_W,
        h: o.bottom,
        fill: c.background.scrim,
      }),
    );

    // The sheet's surface — a rounded top, and a square bottom (Penpot's
    // rectangle has one radius for four corners).
    out.push(
      k.rect(name + ' surface', {
        x: 0,
        y: top,
        w: SCREEN_W,
        h: sheetH,
        radius: SHEET.radius,
        fill: c.background.elevated,
      }),
      k.rect(name + ' surface foot', {
        x: 0,
        y: top + SHEET.radius,
        w: SCREEN_W,
        h: sheetH - SHEET.radius,
        fill: c.background.elevated,
      }),
    );

    // true-sheet's native grabber — the 40 dp the first group reserves.
    // Measured on the device, the handle's pill sits 15 dp below the
    // sheet's top edge.
    out.push(
      k.rect(name + ' grabber', {
        x: {center: SCREEN_W / 2},
        y: top + 14,
        w: SHEET.grabberW,
        h: SHEET.grabberH,
        radius: SHEET.grabberH / 2,
        fill: c.border.emphasis,
      }),
    );

    let y = top + SHEET.grabberZone;
    groups.forEach((group, gi) => {
      if (gi > 0) {
        out.push(
          k.rect(name + ' divider ' + group.title, {
            x: SHEET.padX,
            y: y + SHEET.dividerMargin,
            w: SCREEN_W - SHEET.padX * 2,
            h: 1,
            fill: c.border.subtle,
          }),
        );
        y += SHEET.dividerMargin * 2 + 1;
      }
      out.push(
        k.text(name + ' title ' + group.title, group.title, {
          x: SHEET.padX,
          y,
          family: 'Inter SemiBold',
          weight: 600,
          size: SHEET.titleSize,
          lineHeight: SHEET.titleLine,
          letterSpacing: 1.4,
          fill: c.text.secondary,
        }),
      );
      y += SHEET.titleLine + SHEET.titleGap;

      // The chips — the label first, then the pill around it, so the pill's
      // width follows the label's own width.
      let previousLabel = null;
      group.rows.forEach((row_) => {
        const labelName = name + ' chip ' + row_.key;
        const textX = previousLabel
          ? {after: {name: previousLabel, edge: 'right', pad: SHEET.chipPadX * 2 + SHEET.chipBorder * 2 + SHEET.chipGap}}
          : SHEET.padX + SHEET.chipPadX + SHEET.chipBorder;
        out.push(
          k.text(labelName, row_.label, {
            x: textX,
            y: y + (SHEET.chipH - SHEET.chipLabelLine) / 2,
            family: row_.selected ? 'Inter SemiBold' : 'Inter Medium',
            weight: row_.selected ? 600 : 500,
            size: SHEET.chipLabelSize,
            lineHeight: SHEET.chipLabelLine,
            fill: row_.selected ? c.background.primary : c.text.primary,
          }),
          k.rect(name + ' chip ' + row_.key + ' pill', {
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
            fill: row_.selected ? c.accent.gold : c.background.primary,
            stroke: row_.selected ? undefined : c.border.subtle,
            strokeWidth: row_.selected ? undefined : 1.5,
          }),
        );
        previousLabel = labelName;
      });
      y += SHEET.chipH;
    });

    return out;
  }

  return {k, c, P, iconKey, field, scopeRow, row, fab, filterSheet, theme: k.theme};
}

// ─── the boards ────────────────────────────────────────────────────────────

/**
 * The header and the field — the chrome every state of the page carries.
 *
 * The field sits 16 dp below the header (the app's own `searchSlot`
 * padding) and the page's gutter is 16 on both sides.
 */
function chrome(S, o) {
  const shapes = [...S.P.header('Search', 'Search')];
  const fieldY = HEADER_H + spacing.lg; // 60 + 16 = 76
  shapes.push(
    ...S.field('Search field', {
      y: fieldY,
      value: o.value,
      placeholder: o.placeholder,
      focused: o.focused,
      clear: o.clear,
    }),
  );
  return {shapes, fieldY, fieldBottom: fieldY + FIELD.h};
}

/**
 * The EMPTY state — the page as it opens.
 *
 * The field, the hint under it, "Recent searches" (the gold divider with
 * its "Clear all" action) and "Trending now". The scope row is NOT here:
 * it appears with the results and disappears when the query is cleared
 * (§3.3).
 */
function searchEmptyBoard(themeName) {
  const S = searchKit(themeName);
  const {k, c, P} = S;
  const shapes = [];
  const chromeOut = chrome(S, {value: null, placeholder: FIELD_PLACEHOLDER, focused: false, clear: false});
  shapes.push(...chromeOut.shapes);

  let y = chromeOut.fieldBottom + spacing.md; // the hint, 12 under the field
  shapes.push(
    ...P.paragraph('Search hint', HINT, {
      x: GUTTER,
      y,
      size: 13,
      lineHeight: 18,
      maxChars: HINT_MAX_CHARS,
      fill: c.text.tertiary,
    }),
  );
  y += 2 * 18; // the hint's two lines
  y += spacing.md; // the search slot's own bottom padding

  // ── Recent searches ────────────────────────────────────────────────────
  //
  // The gold Cormorant divider WITH its action — "Clear all" is a named
  // action, not a destructive chip (§3.6).
  y += spacing.sm; // the divider's own marginTop
  shapes.push(
    ...P.dividerAction('Search Recent searches', 'Recent searches', 'Clear all', y, 'Search Clear all'),
  );
  y += 48;
  for (const term of RECENT) {
    const out = S.row('Search recent ' + term, {y, title: term, glyph: 'history'});
    shapes.push(...out);
    y += out.rowHeight;
  }

  // ── Trending now ───────────────────────────────────────────────────────
  y += spacing.sm; // the divider's own marginTop — and nothing else
  shapes.push(...k.divider('Search Trending now', 'Trending now', y));
  y += 48;
  for (const item of TRENDING) {
    const out = S.row(item.base, {
      y,
      title: item.title,
      subtitle: item.subtitle,
      artwork: item.artwork,
    });
    shapes.push(...out);
    y += out.rowHeight;
  }

  // NO FAB ON THIS BOARD.
  //
  // The filter button opens the sheet, and the sheet filters the RESULTS.
  // With no query there are no results, so there is nothing for the sheet
  // to filter — and the app's own `Fab` is `visible={hasQuery}`, which
  // renders NOTHING (`Fab.tsx:98`). The board used to draw it here, which
  // put a gold disc on the page's quietest state.
  const height = Math.max(SCREEN_H, y);
  return {width: SCREEN_W, height, shapes};
}

/**
 * The RESULTS state — the field, the source scope, and one group per
 * result kind.
 *
 * `maxY` is where the drawing stops: the filter board draws the same page
 * and lets the sheet cover the rest of it.
 */
function resultsContent(S, o) {
  const {k, P} = S;
  const shapes = [];
  const chromeOut = chrome(S, {value: o.query, placeholder: FIELD_PLACEHOLDER, focused: true, clear: true});
  shapes.push(...chromeOut.shapes);

  let y = chromeOut.fieldBottom + spacing.md;
  shapes.push(...S.scopeRow('Search scope', {y, active: o.activeSource}));
  y += SCOPE.padY * 2 + SCOPE.labelLine + SCOPE.underline; // the rail's own height
  y += spacing.sm; // the scope slot's own bottom padding

  for (const group of GROUPS) {
    // The group's own margin — the `SubsectionTitle`'s `marginTop`
    // (8 dp) and NOTHING else. The divider's own 12 dp of vertical
    // padding is inside `k.divider`, so adding `spacing.md` here as well
    // pushed every group 12 dp down from where the app draws it.
    const groupY = y + spacing.sm;
    if (groupY + 48 > o.maxY) break;
    y = groupY;
    shapes.push(...k.divider('Search ' + group.label, group.label, y));
    y += 48;
    for (const item of group.rows) {
      const out = S.row(item.base, {
        y,
        title: item.title,
        subtitle: item.subtitle,
        artwork: item.artwork,
        glyph: item.glyph,
        trailing: item.trailing,
        titleName: item.base,
      });
      if (y + out.rowHeight > o.maxY) break;
      shapes.push(...out);
      y += out.rowHeight;
    }
  }

  return {shapes, y};
}

/**
 * The RESULTS state — the full page.
 *
 * The six rows the app's navigation graph leaves through are all on this
 * board, so the connectors have a shape to point at.
 */
function searchResultsBoard(themeName) {
  const S = searchKit(themeName);
  const out = resultsContent(S, {query: 'music', activeSource: 'All', maxY: Infinity});
  const shapes = out.shapes;
  let y = out.y;

  // The scroll reserves room for the FAB to float in.
  y += FAB.size + spacing.xxl + spacing.xl;

  // THE FAB FLOATS OVER THE VIEWPORT, NOT OVER THE CONTENT
  // --------------------------------------------------------
  // The app's `Fab` is anchored to the SCREEN's bottom
  // (`useBottomChromeInset` → `insets.bottom + spacing.lg`), so it does
  // not travel with the content — the content scrolls UNDER it. This
  // board shows the whole scrollable page, so the button belongs at the
  // viewport's bottom (914 - 24 - 16 - 56 = 818), floating over the rows
  // that are under it, exactly as it does on the device.
  shapes.push(...S.fab('Search FAB', {y: SCREEN_H - FAB.bottomInset - FAB.gap - FAB.size}));
  return {width: SCREEN_W, height: y, shapes};
}

/**
 * The NO RESULTS state.
 *
 * The field, the source scope, and ONE quiet caption line. The
 * `EmptyState` disc (D-11) is NOT drawn, and there is NO divider either:
 * the app draws the caption on its own (`SearchScreen.tsx:562` — an
 * `AppText` in `styles.emptyLine`), so a gold rule above it would be a
 * second title grammar the app does not have.
 */
function searchNoResultsBoard(themeName) {
  const S = searchKit(themeName);
  const {k, c} = S;
  const out = resultsContent(S, {query: 'snowboard', activeSource: 'Music', maxY: 0});
  const shapes = out.shapes;
  let y = out.y;

  // The one quiet line — the app's own copy for this scope.
  y += spacing.md;
  shapes.push(
    k.text('Search No results caption', 'No music matches "snowboard"', {
      x: GUTTER,
      y,
      family: 'Inter',
      weight: 400,
      size: 15,
      lineHeight: 22,
      fill: c.text.secondary,
    }),
  );
  y += 22;

  const height = Math.max(SCREEN_H, y + FAB.size + FAB.gap + FAB.bottomInset);
  shapes.push(...S.fab('Search FAB', {y: SCREEN_H - FAB.bottomInset - FAB.gap - FAB.size}));
  return {width: SCREEN_W, height, shapes};
}

/**
 * The FILTERS state — the results page with the app's own filter sheet
 * over it.
 *
 * The sheet is the app's `FilterSheet`: TYPE (All · Videos · Audio) and
 * SORT BY (Relevance · Name). "Date" is gone — it could not order anything
 * but the recent history (D-3).
 *
 * The page behind the sheet is drawn only as far as the sheet's top edge:
 * what the sheet covers is not drawn, because Penpot clips a board's
 * children anyway.
 */
function searchFiltersBoard(themeName) {
  const S = searchKit(themeName);

  // The sheet's height is its own content plus the device's bottom inset
  // (the same computation the sheet helper makes), so the page behind it
  // can be drawn only as far as the sheet's top edge.
  const sheetContentH =
    SHEET.grabberZone +
    FILTER_GROUPS.reduce(
      (sum, group, gi) =>
        sum + SHEET.titleLine + SHEET.titleGap + SHEET.chipH + (gi > 0 ? SHEET.dividerMargin * 2 + 1 : 0),
      0,
    ) +
    SHEET.bottomPadding;
  const sheetH = sheetContentH + FAB.bottomInset;
  const sheetTop = SCREEN_H - sheetH;

  const page = resultsContent(S, {query: 'music', activeSource: 'All', maxY: sheetTop});
  const shapes = page.shapes;

  // The FAB is still there — the sheet is OVER it.
  shapes.push(...S.fab('Search FAB', {y: SCREEN_H - FAB.bottomInset - FAB.gap - FAB.size}));
  shapes.push(...S.filterSheet('Search Filter sheet', {bottom: SCREEN_H}));
  return {width: SCREEN_W, height: SCREEN_H, shapes};
}

module.exports = {
  searchKit,
  searchEmptyBoard,
  searchResultsBoard,
  searchNoResultsBoard,
  searchFiltersBoard,
  GROUPS,
  SOURCES,
};
