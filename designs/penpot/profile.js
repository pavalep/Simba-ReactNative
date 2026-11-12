#!/usr/bin/env node
/**
 * profile.js — the RC1 boards for the Profile page and the internal pages.
 *
 * WHY A NEW FILE
 * --------------
 * `kit.js` draws the app as it is TODAY. `kit-v2.js` draws the Home redesign.
 * This file draws the THIRD thing: the account page and the internal pages,
 * rebuilt on the V2 grammar.
 *
 * THE GRAMMAR IT USES
 * -------------------
 * Every number here comes from the app's own source or the app's own tokens:
 *
 *   • the header is `InternalHeader.tsx` — a 36 dp circular back button, a
 *     centred Cormorant title, an optional 36 dp right action;
 *   • the section titles are `SubsectionTitle.tsx`'s `displaySerif` variant —
 *     Cormorant Garamond Italic 18 px at 0.9 gold, with `goldGlow` rules;
 *   • the rows are `SettingsRow.tsx` — Inter 15/22 label, hairline under the
 *     row, 52 dp minimum height, 16 dp page gutter;
 *   • the colours, the spacing scale and the radii are `app-spec.js`, which
 *     reads `src/theme/tokens.ts` through the TypeScript AST.
 *
 * THE FOUR THINGS THIS FILE FIXES
 * --------------------------------
 *
 * 1. **The Profile's stats grid is gone.** Seven tiles, three to a row, the
 *    seventh orphaned and empty, every number read from a different store
 *    than the Stats page's. What is left is ONE quiet line — "124 tracks ·
 *    8 videos · 6 playlists" — the VLC pattern, with the counts as the
 *    trailing text of the rows below it.
 *
 * 2. **The About page's link list is full width.** It used to be a FlatList
 *    inside a `alignItems: 'center'` column, with each row declaring
 *    `width: '100%'` — a circular constraint that collapsed the list to a
 *    32 dp column of unlabelled icons.
 *
 * 3. **The legal pages sit on the theme.** Privacy and Terms painted a
 *    hardcoded `#D4B47A` slab over the whole screen; in the dark theme that
 *    is a gold page with brown text.
 *
 * 4. **The Profile stopped repeating Home** (2026-11-11,
 *    `md/CONTENT_OWNERSHIP.md`). The "Your Library" section and its six
 *    rows went — Home already carries the Recently Played, Pinned
 *    Playlists, Bookmarks and Followed Podcasts rails, each with a "See
 *    All", so the Profile was a second index of the same library under the
 *    same heading. The Profile is now "you": the identity, the one number
 *    only the account has (playback statistics), the account actions, and
 *    the app's own pages. Settings lost its "About" section for the same
 *    reason — it was a second index of the About page's own link list.
 *
 * 5. **The Profile and the Settings page are ONE page** (2026-11-11,
 *    `md/PROFILE_SETTINGS_MERGE.md`). The owner found the Profile "too
 *    less" and asked for the Settings page to be merged into it, so
 *    `profileBoard` now carries the preferences as well: 21 rows in 9
 *    groups. The `Settings` boards are gone, and the Profile's header
 *    lost its gear — the gear used to open the page you are now on.
 *    There is no `settingsBoard` in this file any more.
 */

'use strict';

const {kit, SCREEN_W, spacing, radius} = require('./kit');

/**
 * The InternalHeader's own metrics (`InternalHeader.tsx:102-158`).
 *
 * The header's height is the 36 dp circular back button plus the 12 dp
 * padding either side — the title is an ABSOLUTE overlay, so it does not
 * push the row taller. That is why the title on the About board bleeds
 * over the header's hairline: the app draws it that way.
 *
 * The title is Manrope SemiBold 22 px — ONE title style for every
 * internal page. Seven of them used to draw a 48 px Cormorant Garamond
 * Bold instead; the owner called that "too much big" on 2026-11-12 and
 * the Profile's small title is the reference.
 */
const HEADER = {
  padX: spacing.sm, // 8
  padY: spacing.md, // 12
  button: 36,
  titleSize: 22,
  titleLine: 28,
};
const HEADER_H = HEADER.padY * 2 + HEADER.button; // 60

/** The SettingsRow's own metrics (`SettingsRow.tsx:52-70`). */
const ROW = {
  padX: spacing.lg, // 16
  labelSize: 15,
  labelLine: 22,
  minHeight: 52,
  hairline: 1,
};

/**
 * Build the drawing helpers for one theme.
 *
 * @param {'light'|'dark'} themeName
 */
function profileKit(themeName) {
  const k = kit(themeName);
  const c = k.c;

  /** The media key of one of the app's own glyphs, in this theme. */
  const iconKey = (name) => `ico.${name}.${themeName}`;

  /**
   * The `InternalHeader` — the app's own header, drawn.
   *
   * `rightIcon` is the one thing the app's header allows on the right, and
   * it is an ICON, not a label: the right action is a fixed 36 dp circle
   * (`InternalHeader.tsx:151-157`), so the Profile's old "Sign out" TEXT
   * wrapped onto two lines and was clipped. The gear is 18 dp and fits.
   */
  function header(name, title, opts = {}) {
    const out = [
      // The back button — a 36 dp elevated circle with a left chevron
      // (`BackButton.tsx:52-62`).
      k.ellipse(name + ' back button', {
        x: HEADER.padX,
        y: HEADER.padY,
        w: HEADER.button,
        h: HEADER.button,
        fill: c.background.elevated,
      }),
      k.image(name + ' back chevron', {
        x: HEADER.padX + (HEADER.button - 20) / 2,
        y: HEADER.padY + (HEADER.button - 20) / 2,
        w: 20,
        h: 20,
        media: iconKey('chevronLeft'),
      }),
      // The title — Manrope SemiBold 22/28, centred on the FULL header
      // width (`InternalHeader.tsx:78-88`). The title overlay's
      // `paddingHorizontal: 96` is what truncated "Privacy P…"; the
      // boards draw the title at its natural width and the code wave
      // fixes the overlay (md/PROFILE_RC1_REFACTOR.md, CF-05).
      k.text(name + ' title', title, {
        x: {center: SCREEN_W / 2},
        y: HEADER.padY + (HEADER.button - HEADER.titleLine) / 2,
        family: 'Manrope SemiBold',
        size: HEADER.titleSize,
        lineHeight: HEADER.titleLine,
        letterSpacing: 0.2,
        fill: c.text.primary,
      }),
    ];
    if (opts.rightIcon) {
      out.push(
        k.ellipse(name + ' right button', {
          x: SCREEN_W - HEADER.padX - HEADER.button,
          y: HEADER.padY,
          w: HEADER.button,
          h: HEADER.button,
          fill: c.background.elevated,
        }),
        k.image(name + ' right glyph', {
          x: SCREEN_W - HEADER.padX - HEADER.button + (HEADER.button - 18) / 2,
          y: HEADER.padY + (HEADER.button - 18) / 2,
          w: 18,
          h: 18,
          media: iconKey(opts.rightIcon),
        }),
      );
    }
    // The header's own hairline.
    out.push(
      k.rect(name + ' rule', {
        x: 0,
        y: HEADER_H - 1,
        w: SCREEN_W,
        h: 1,
        fill: c.border.subtle,
      }),
    );
    return out;
  }

  /**
   * A `SettingsRow` — the app's own row, drawn.
   *
   * The row is NOT in a card. The app's Profile wrapped its rows in an
   * elevated, 12 dp-radius group card; the V2 grammar unboxes the greeting
   * and the section headers, and this page follows the same rule. A hairline
   * under the row separates it from the next one, which is what
   * `SettingsRow.tsx:59` draws.
   *
   * `count` is the trailing number in gold — the place the V2 grammar spends
   * its gold when there is no artwork to spend it on (`kit-v2.js`'s `count`
   * role). `chevron` draws the app's own 14 px right chevron.
   */
  function row(name, o) {
    const out = [];
    // The row's own height.
    //
    // A row with a description is 67 dp on the device, not 66: the
    // SettingsRow's own padding (12 + 12), the label's 22 dp line, the
    // 2 dp gap and the description's 18 dp line, plus the hairline under
    // the row. Measured on `emulator-5554` (1080×2400 @ 420 dpi):
    // 175–176 px = 66.7–67.0 dp.
    const h = o.description ? 67 : ROW.minHeight;
    const midY = o.y + h / 2;
    if (o.icon) {
      out.push(
        k.image(name + ' icon', {
          x: ROW.padX,
          y: midY - 9,
          w: 18,
          h: 18,
          media: iconKey(o.icon),
        }),
      );
    }
    const textX = o.icon ? ROW.padX + 18 + spacing.md : ROW.padX;
    out.push(
      k.text(name + ' label', o.label, {
        x: textX,
        y: o.description ? o.y + 12 : midY - ROW.labelLine / 2,
        family: 'Inter',
        weight: 400,
        size: ROW.labelSize,
        lineHeight: ROW.labelLine,
        fill: o.destructive ? c.semantic.error : c.text.primary,
      }),
    );
    if (o.description) {
      out.push(
        k.text(name + ' description', o.description, {
          x: o.descriptionX != null ? o.descriptionX : textX,
          y: o.y + 36,
          family: 'Inter',
          weight: 400,
          size: 13,
          lineHeight: 18,
          fill: o.descriptionFill || c.text.tertiary,
        }),
      );
    }
    // The trailing cluster: the count, then the chevron, 8 dp apart, the
    // chevron flush with the 16 dp gutter.
    const hasChevron = o.chevron !== false;
    const chevronX = SCREEN_W - ROW.padX - 14;
    if (hasChevron) {
      out.push(
        k.image(name + ' chevron', {
          x: chevronX,
          y: midY - 7,
          w: 14,
          h: 14,
          media: iconKey('chevronRight'),
        }),
      );
    }
    if (o.count != null) {
      out.push(
        k.text(name + ' count', o.count, {
          x: {right: hasChevron ? chevronX - spacing.sm : SCREEN_W - ROW.padX},
          y: midY - 9,
          family: 'Inter',
          weight: 500,
          size: 13,
          lineHeight: 18,
          fill: c.accent.gold,
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
   * A switch — the app's own toggle.
   *
   * The track is `border.subtle` off and `accent.goldDim` on, the thumb is
   * `accent.gold` on and `text.tertiary` off.
   *
   * The track is 46 × 27 dp, which is what the app's `Switch` measures on
   * the device (`emulator-5554`, 1080×2400 @ 420 dpi: 122 × 71 px = 46.5 ×
   * 27.0 dp, flush with the 16 dp gutter). The old 44 × 26 was the iOS
   * size and was never measured here.
   */
  function toggle(name, o) {
    const w = 46;
    const h = 27;
    const x = SCREEN_W - ROW.padX - w;
    const y = o.y + (ROW.minHeight - h) / 2;
    return [
      k.rect(name + ' track', {
        x,
        y,
        w,
        h,
        radius: h / 2,
        fill: o.on ? c.accent.goldDim : c.border.subtle,
      }),
      k.ellipse(name + ' thumb', {
        x: o.on ? x + w - h : x,
        y: y + 3,
        w: h - 6,
        h: h - 6,
        fill: o.on ? c.accent.gold : c.text.tertiary,
      }),
    ];
  }

  /** The user's identity — the avatar disc with the initials. */
  function avatar(name, o) {
    const d = o.size || 72;
    return [
      k.ellipse(name + ' disc', {
        x: o.x,
        y: o.y,
        w: d,
        h: d,
        fill: c.border.subtle,
      }),
      k.text(name + ' initials', o.initials, {
        x: {center: o.x + d / 2},
        y: o.y + d / 2 - (d * 0.38 * 1.2) / 2,
        family: 'Inter',
        weight: 600,
        size: Math.round(d * 0.38),
        lineHeight: Math.round(d * 0.38 * 1.2),
        fill: c.text.secondary,
      }),
    ];
  }

  /**
   * A wrapped paragraph.
   *
   * A Penpot text shape here has NO width — it is a single line — so a
   * paragraph has to be broken into lines by the drawing code. The column is
   * 379 dp wide (411 − 16 − 16) and the body is Inter 15/22, which fits
   * about 46 characters a line.
   */  function paragraph(name, str, o = {}) {
    const size = o.size || 15;
    const lineHeight = o.lineHeight || 22;
    const maxChars = o.maxChars || 46;
    const words = str.split(' ');
    const lines = [];
    let line = '';
    for (const word of words) {
      const next = line ? line + ' ' + word : word;
      if (next.length > maxChars && line) {
        lines.push(line);
        line = word;
      } else {
        line = next;
      }
    }
    if (line) lines.push(line);

    const out = [];
    lines.forEach((text, i) => {
      out.push(
        k.text(name + ' line ' + (i + 1), text, {
          x: o.x != null ? o.x : ROW.padX,
          y: o.y + i * lineHeight,
          family: 'Inter',
          weight: 400,
          size,
          lineHeight,
          fill: o.fill || c.text.primary,
        }),
      );
    });
    out.lineCount = lines.length;
    out.height = lines.length * lineHeight;
    return out;
  }

  /**
   * The Cormorant divider WITH a right-hand action.
   *
   * The app's `SectionHeader` carries an optional action ("See All"), and
   * the Stats page's own header action is "Browse Library"
   * (`StatsScreen.tsx:144-145`). The divider's RIGHT rule gives way to the
   * action — one action per row, which is the V2 rule
   * (`SectionHeader.tsx:51-55`).
   */
  function dividerAction(name, label, action, y, actionShapeName) {
    const left = name + ' rule left';
    const lab = name + ' label';
    const order = [left, lab];
    const row = {row: {gap: 20, center: SCREEN_W / 2, order}};
    return [
      k.rect(left, {
        x: row,
        y: y + spacing.md + 11,
        w: 120,
        h: 2,
        fill: k.theme.dividerRule,
      }),
      k.text(lab, label, {
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
        letterSpacing: 0,
        fill: k.theme.dividerGold,
      }),
      k.text(actionShapeName || name + ' action', action, {
        x: {right: SCREEN_W - ROW.padX},
        y: y + spacing.md + 3,
        family: 'Inter',
        weight: 400,
        size: 13,
        lineHeight: 18,
        fill: c.accent.gold,
      }),
    ];
  }

  return {k, c, iconKey, header, row, toggle, avatar, paragraph, dividerAction, theme: k.theme};
}

// ─── the Profile ───────────────────────────────────────────────────────────

/**
 * The Profile page — MERGED with the Settings page (2026-11-11).
 *
 * The identity is UNBOXED — no card around it, the same rule the V2 greeting
 * follows on Home. The section titles are the Cormorant dividers. The rows
 * are the app's own `SettingsRow`s.
 *
 * WHAT IT IS NOW
 * --------------
 * The Profile used to be "you" (identity, activity, the account) and the
 * Settings page was "how the app behaves" (28 rows in 7 groups). The owner
 * found the Profile "too less" and asked for the two to be one page, so
 * this board carries BOTH: 21 rows in 9 groups.
 *
 * The order is the page's argument: who you are → what you have done → how
 * the app looks → how it plays → how the subtitles look → where your files
 * come from → your account → the app's own pages → the one destructive
 * preference action.
 *
 * WHAT IS STILL NOT ON IT
 * -----------------------
 * * **No library index.** Home owns the library. "Your Library" and its six
 *   rows stay gone (md/CONTENT_OWNERSHIP.md).
 * * **No gear in the header.** It would open the page you are already on.
 * * **No "Accent Color" row.** The old Settings row had no `onPress` and
 *   `useSettingsStore` has no accent field — gold is the app's only accent
 *   and it is not a preference. A row that cannot be changed is not a row.
 * * **No Discover section.** All seven of its rows already sit on Home's
 *   Explore Contents rail.
 *
 * @param {'light'|'dark'} themeName
 */
function profileBoard(themeName) {
  const P = profileKit(themeName);
  const {k, c} = P;
  const shapes = [];

  // The header: the back chevron and the serif title, and NOTHING on the
  // right. The gear used to be the one door to the Settings page — which is
  // this page now.
  shapes.push(...P.header('Profile', 'Profile'));

  let y = HEADER_H;

  // ── the identity ──────────────────────────────────────────────────────
  y += spacing.xl; // 20
  shapes.push(
    ...P.avatar('Profile avatar', {
      x: ROW.padX,
      y,
      initials: 'PE',
      size: 72,
    }),
    k.text('Profile name', 'Paval E P', {
      x: ROW.padX + 72 + spacing.lg,
      y: y + 10,
      family: 'Inter',
      weight: 700,
      size: 24,
      lineHeight: 32,
      fill: c.text.primary,
    }),
    k.text('Profile email', 'pavalep@gmail.com', {
      x: ROW.padX + 72 + spacing.lg,
      y: y + 46,
      family: 'Inter',
      weight: 400,
      size: 13,
      lineHeight: 18,
      fill: c.text.secondary,
    }),
  );
  y += 72;

  /**
   * A section: the Cormorant divider, then the rows.
   *
   * The gap before the divider is NOT the same for the first section as
   * for the ones after it, and the difference is the app's own:
   *
   *   • the FIRST divider follows the identity block, and the Profile
   *     gives it 4 dp of its own margin (`dividerFirst`) — so the
   *     divider's label sits 24 dp below the identity;
   *   • the others follow a row, and the Profile gives them 8 dp
   *     (`divider`) — so their labels sit 28 dp below the row.
   *
   * `SubsectionTitle` adds its own 8 dp margin and 12 dp of padding, so
   * the board's own gap is 12 for the first section and 16 for the rest.
   * Measured on `emulator-5554`: 24 dp and 28 dp from the content above
   * to the divider's label.
   */
  const SECTION = (name, label, first) => {
    y += first ? 12 : spacing.lg; // 12, then 16
    shapes.push(...k.divider(name, label, y));
    y += 48; // the divider's own block: 12 + 24 + 12
  };

  /** A row, and the advance past it. */
  const ROW_AT = (name, o) => {
    const out = P.row(name, o);
    shapes.push(...out);
    y += out.rowHeight;
    return out;
  };

  // ── Activity ──────────────────────────────────────────────────────────
  //
  // `Stats` is reachable from nowhere else in the app, so this row is its
  // single door.
  SECTION('Profile Activity', 'Activity', true);
  ROW_AT('Profile Stats', {y, label: 'Playback statistics'});

  // ── Appearance ────────────────────────────────────────────────────────
  SECTION('Profile Appearance', 'Appearance');
  ROW_AT('Profile Theme', {y, label: 'Theme', description: 'System'});

  // ── Playback ──────────────────────────────────────────────────────────
  SECTION('Profile Playback', 'Playback');
  for (const [name, label, on] of [
    ['Profile Hardware acceleration', 'Hardware acceleration', true],
    ['Profile Audio normalization', 'Audio normalization', false],
    ['Profile Dialogue boost', 'Dialogue boost', false],
    ['Profile Skip silence', 'Skip silence', false],
  ]) {
    shapes.push(
      ...P.row(name, {y, label, chevron: false}),
      ...P.toggle(name + ' toggle', {y, on}),
    );
    y += ROW.minHeight;
  }
  ROW_AT('Profile Subtitle language', {
    y,
    label: 'Subtitle language',
    // The row shows the languages as NAMES, not as mpv codes — the same
    // names the picker it opens shows. Measured on the device:
    // "English, Japanese, Default (auto)".
    description: 'English, Japanese, Default (auto)',
  });
  ROW_AT('Profile Audio settings', {
    y,
    label: 'Audio settings',
    description: 'Equalizer and audio tuning',
  });

  // ── Subtitles ─────────────────────────────────────────────────────────
  SECTION('Profile Subtitles', 'Subtitles');
  ROW_AT('Profile Font size', {y, label: 'Font size', description: 'Medium'});
  {
    // The Text color row's description is a SWATCH and the hex — the
    // app shows the colour, not only its name. The swatch is 16 dp at
    // the gutter, the hex sits 6 dp to its right, and the hex is in
    // `text.secondary` (the other descriptions are `text.tertiary`).
    const out = P.row('Profile Text color', {
      y,
      label: 'Text color',
      description: '#FFFFFF',
      descriptionX: ROW.padX + 16 + 6,
      descriptionFill: c.text.secondary,
    });
    shapes.push(
      k.rect('Profile Text color swatch', {
        x: ROW.padX,
        y: y + 37,
        w: 16,
        h: 16,
        radius: 4,
        fill: '#FFFFFF',
        stroke: c.border.subtle,
        strokeWidth: 1,
      }),
      ...out,
    );
    y += out.rowHeight;
  }
  ROW_AT('Profile Background opacity', {
    y,
    label: 'Background opacity',
    description: 'Light',
  });
  shapes.push(
    ...P.row('Profile Auto-load subtitles', {
      y,
      label: 'Auto-load subtitles',
      chevron: false,
    }),
    ...P.toggle('Profile Auto-load subtitles toggle', {y, on: true}),
  );
  y += ROW.minHeight;

  // ── Library ───────────────────────────────────────────────────────────
  //
  // Not a library INDEX — the two rows are where the library comes FROM
  // (the linked folders) and how the player is configured (the MPV
  // options). The media itself is on Home and on the Library page.
  SECTION('Profile Library', 'Library');
  ROW_AT('Profile Linked folders', {y, label: 'Linked folders', description: 'None'});
  ROW_AT('Profile MPV options', {y, label: 'MPV options', description: 'Default'});

  // ── Account ───────────────────────────────────────────────────────────
  //
  // Only ONE red row. Revoke and Clear live behind a confirmation
  // dialog, so the row itself does not have to shout — and three red
  // rows in a row read as an error screen.
  SECTION('Profile Account', 'Account');
  ROW_AT('Profile Sign out', {y, label: 'Sign out', destructive: true});
  ROW_AT('Profile Revoke', {y, label: 'Revoke Google access'});
  ROW_AT('Profile Clear data', {y, label: 'Clear local data'});

  // ── Support ───────────────────────────────────────────────────────────
  //
  // The app's own pages. They used to sit in Settings' "About" section,
  // which was a SECOND INDEX of the About page's own link list. The About
  // page stays the hub; the Profile keeps the one door to it, and to the
  // FAQ.
  SECTION('Profile Support', 'Support');
  ROW_AT('Profile Help', {y, label: 'Help'});
  ROW_AT('Profile About', {y, label: 'About Simba'});

  // ── Reset ─────────────────────────────────────────────────────────────
  //
  // Its own group, because it is the one row that is not a preference but
  // an ACTION on them.
  SECTION('Profile Reset', 'Reset');
  ROW_AT('Profile Reset preferences', {y, label: 'Reset preferences'});

  y += spacing.xl;
  return {width: SCREEN_W, height: y, shapes};
}

// ─── About, rebuilt ────────────────────────────────────────────────────────

/**
 * The About page, rebuilt.
 *
 * The link list is FULL WIDTH — icon, label, chevron — because the old
 * `alignItems: 'center'` column collapsed it to 32 dp of unlabelled icons.
 *
 * The facts are TRUE: the version is the native build's, and "Built with"
 * names the state library the app actually uses.
 *
 * 2026-11-12: the board caught up with the code. The row labels are the
 * TITLES of the pages they open ("Terms of Use", not "Terms of use"), the
 * "Built with" chips are the app's real stack in the app's own order,
 * the chip card's height is computed from the rows the chips make (six
 * chips wrap to two rows, and the old fixed 74 dp card cut the second
 * one off), the two rows that carry a description carry it here too, and
 * the red "Reset all settings" at the foot is GONE — the Profile owns
 * the reset. See `md/ABOUT_PAGE_FIX.md`.
 */
function aboutBoard(themeName) {
  const P = profileKit(themeName);
  const {k, c} = P;
  const shapes = [];
  let y = HEADER_H;

  shapes.push(...P.header('About', 'About'));

  // The lockup.
  y += spacing.lg;
  shapes.push(
    k.ellipse('About lion disc', {
      x: SCREEN_W / 2 - 36,
      y,
      w: 72,
      h: 72,
      fill: c.accent.goldSoft,
    }),
    k.image('About lion', {
      x: SCREEN_W / 2 - 22,
      y: y + 14,
      w: 44,
      h: 44,
      media: P.iconKey('lion'),
    }),
  );
  y += 72 + spacing.md;

  shapes.push(
    k.text('About app name', 'Simba Player', {
      x: {center: SCREEN_W / 2},
      y,
      family: 'Inter SemiBold',
      size: 20,
      lineHeight: 28,
      fill: c.accent.gold,
    }),
  );
  y += 28;
  shapes.push(
    k.text('About tagline', 'Your personal media player', {
      x: {center: SCREEN_W / 2},
      y,
      family: 'Inter',
      weight: 400,
      size: 15,
      lineHeight: 22,
      fill: c.text.tertiary,
    }),
  );
  y += 22;
  shapes.push(
    k.text('About version', 'Version 1.1.0 (2)', {
      x: {center: SCREEN_W / 2},
      y,
      family: 'Inter',
      weight: 400,
      size: 13,
      lineHeight: 18,
      fill: c.text.secondary,
    }),
  );
  y += 18 + spacing.lg;

  // "Built with" — the app's OWN stack. The old list said "Redux
  // Toolkit", which the app has not used since V17. The chips now come
  // from `src/constants/techStack.ts` — the same owner the Credits page
  // reads: React Native, TypeScript, MPV, Zustand, MMKV, React
  // Navigation.
  //
  // The chips WRAP, so the card's height is COMPUTED from the rows they
  // make. The old card was a fixed 74 dp, which was one row of chips;
  // six chips make two rows, and a fixed height would have cut the
  // second one off.
  const CHIPS = [
    'React Native',
    'TypeScript',
    'MPV',
    'Zustand',
    'MMKV',
    'React Navigation',
  ];
  // The chip's own metrics — the app's `techChip` style: 8 dp of
  // horizontal padding around the caption (13/18), 4 dp above and below.
  const CHIP_PAD = spacing.md; // 12 — the card's padding
  const CHIP_GAP = spacing.sm; // 8 — the gap between chips
  const CHIP_H = 26; // 18 (the caption's line) + 4 + 4
  const CHIP_TEXT = 7.2; // Inter 13 px, the average advance per character
  const inner = SCREEN_W - ROW.padX * 2 - CHIP_PAD * 2;
  const chipRows = [];
  let rowChips = [];
  let rowW = 0;
  for (const chip of CHIPS) {
    const w = chip.length * CHIP_TEXT + 16;
    const add = rowChips.length ? CHIP_GAP + w : w;
    if (rowChips.length && rowW + add > inner) {
      chipRows.push({chips: rowChips, width: rowW});
      rowChips = [chip];
      rowW = w;
    } else {
      rowChips.push(chip);
      rowW += add;
    }
  }
  if (rowChips.length) chipRows.push({chips: rowChips, width: rowW});
  // The label, then the chip rows, then the card's padding.
  //
  // The 8 dp between the label and the chips is the card's own FLEX GAP —
  // the label is a flex child of the wrapping row, so the gap applies
  // between it and the first chip as well. It was missing here, and the
  // device measurement (2026-11-12) put the chip row 8 dp lower than
  // this drawing did.
  const cardH =
    CHIP_PAD +
    18 +
    4 +
    CHIP_GAP +
    chipRows.length * CHIP_H +
    (chipRows.length - 1) * CHIP_GAP +
    CHIP_PAD;

  shapes.push(
    k.rect('About built with card', {
      x: ROW.padX,
      y,
      w: SCREEN_W - ROW.padX * 2,
      h: cardH,
      radius: radius.md,
      fill: c.background.elevated,
    }),
    k.text('About built with label', 'Built with', {
      x: {center: SCREEN_W / 2},
      y: y + CHIP_PAD,
      family: 'Inter',
      weight: 400,
      size: 13,
      lineHeight: 18,
      fill: c.text.tertiary,
    }),
  );
  // Each row of chips is centred in the card — the app's
  // `justifyContent: 'center'` on the wrapping row.
  //
  // The FIRST chip row starts one CHIP_GAP below the label: the card is
  // a flex row with `gap: spacing.sm`, and the label is one of its flex
  // children, so the gap applies between it and the first row too.
  // (Measured on the device, 2026-11-12: the chip row's top sits
  // 41.8 dp below the card's top — 12 (padding) + 18 (the label) + 4
  // (the label's marginBottom) + 8 (the flex gap).)
  chipRows.forEach((row, ri) => {
    const cy =
      y + CHIP_PAD + 18 + 4 + CHIP_GAP + ri * (CHIP_H + CHIP_GAP);
    let cx = ROW.padX + CHIP_PAD + (inner - row.width) / 2;
    for (const chip of row.chips) {
      const w = chip.length * CHIP_TEXT + 16;
      shapes.push(
        k.rect('About chip ' + chip, {
          x: cx,
          y: cy,
          w,
          h: CHIP_H,
          radius: radius.sm,
          fill: c.background.primary,
        }),
        k.text('About chip text ' + chip, chip, {
          x: cx + 8,
          y: cy + 4,
          family: 'Inter',
          weight: 400,
          size: 13,
          lineHeight: 18,
          fill: c.accent.gold,
        }),
      );
      cx += w + CHIP_GAP;
    }
  });
  // The gap between the card and the divider is the divider's OWN:
  // `SubsectionTitle`'s root carries `marginTop: spacing.sm` (8) and
  // `paddingVertical: spacing.md` (12) — 20 dp from the card's bottom
  // edge to the label's text box.
  y += cardH + spacing.sm;

  // ── the links, full width ─────────────────────────────────────────────
  shapes.push(...k.divider('About links', 'More', y));
  y += 48;

  // The label of each row is the TITLE of the page it opens — the Terms
  // screen says "Terms of Use", so the row says "Terms of Use" too.
  const LINKS = [
    ['About Changelog', 'Changelog', 'history', null],
    [
      'About Credits',
      'Credits',
      'award',
      'Contributors and libraries used',
    ],
    ['About Licenses', 'Open Source Licenses', 'book', null],
    ['About Privacy', 'Privacy Policy', 'lock', null],
    ['About Terms', 'Terms of Use', 'info', null],
    ['About Rate', 'Rate on Play Store', 'trophy', null],
    ['About Share', 'Share App', 'share', 'Send Simba Player to a friend'],
    ['About Report', 'Report Bug', 'alertCircle', null],
    ['About Contact', 'Contact / Feedback', 'megaphone', null],
  ];
  for (const [name, label, icon, description] of LINKS) {
    const out = P.row(name, {y, label, icon, description});
    shapes.push(...out);
    y += out.rowHeight;
  }

  // There is NO reset at the foot of this page. It used to carry a red
  // "Reset all settings" — a second door to the action the Profile owns
  // as "Reset preferences" (`md/CONTENT_OWNERSHIP.md`). One owner, one
  // row.

  y += spacing.xl;
  return {width: SCREEN_W, height: y, shapes};
}

// ─── Help, rebuilt ─────────────────────────────────────────────────────────

/**
 * The Help page, rebuilt.
 *
 * The structure is the app's own: a search field and collapsible sections.
 * What changes is the COPY — the answers that sent the user to a setting
 * with no UI are gone, and nothing points at a page called "Settings" any
 * more, because there is no such page: the preferences live on the Profile
 * now (md/PROFILE_SETTINGS_MERGE.md).
 *
 * The board draws three sections of two questions. The CODE carries more —
 * six sections — and the two have not been reconciled; the Help page still
 * wants its own pass. The board is the sketch of the shape, not of the
 * whole FAQ.
 */
function helpBoard(themeName) {
  const P = profileKit(themeName);
  const {k, c} = P;
  const shapes = [];
  let y = HEADER_H;

  // The search field.
  y += spacing.lg;
  shapes.push(
    k.rect('Help search field', {
      x: ROW.padX,
      y,
      w: SCREEN_W - ROW.padX * 2,
      h: 44,
      radius: radius.md,
      fill: c.background.elevated,
    }),
    k.image('Help search glyph', {
      x: ROW.padX + 14,
      y: y + 13,
      w: 18,
      h: 18,
      media: P.iconKey('search'),
    }),
    k.text('Help search placeholder', 'Search questions…', {
      x: ROW.padX + 42,
      y: y + 13,
      family: 'Inter',
      weight: 400,
      size: 15,
      lineHeight: 22,
      fill: c.text.tertiary,
    }),
  );
  y += 44 + spacing.xl;

  const SECTIONS = [
    [
      'Getting started',
      ['How do I add my media to the library?', 'Where is my library stored?'],
    ],
    [
      'Playback',
      ['Which formats are supported?', 'How does picture-in-picture work?'],
    ],
    [
      // The page is called "Settings" no longer — the preferences live on
      // the Profile now — so the section is named after what it is about.
      'Appearance',
      ['How do I change the theme?', 'How do I reset my preferences?'],
    ],
  ];
  for (const [section, questions] of SECTIONS) {
    shapes.push(...k.divider('Help ' + section, section, y));
    y += 48;
    for (const q of questions) {
      shapes.push(
        ...P.row('Help question ' + q, {y, label: q}),
      );
      y += ROW.minHeight;
    }
    y += spacing.md;
  }

  y += spacing.lg;
  shapes.push(
    k.text('Help contact', 'Contact support', {
      x: {center: SCREEN_W / 2},
      y,
      family: 'Inter',
      weight: 600,
      size: 15,
      lineHeight: 22,
      fill: c.accent.gold,
    }),
  );
  y += 22 + spacing.xl;

  return {width: SCREEN_W, height: y, shapes};
}

// ─── the legal pages, rebuilt ──────────────────────────────────────────────

/**
 * Privacy and Terms — on the THEME, not on a gold slab.
 *
 * The old pages painted `#D4B47A` over the whole screen, which in the dark
 * theme is a gold page with brown body text. These sit on
 * `background.primary` like every other page.
 */
function legalBoard(themeName, kind) {
  const P = profileKit(themeName);
  const {k, c} = P;
  const shapes = [];
  let y = HEADER_H;

  const isPrivacy = kind === 'privacy';
  const title = isPrivacy ? 'Privacy Policy' : 'Terms of Use';
  const paragraphs = isPrivacy
    ? [
        'Simba Player is a local-first media player. Your library, playlists, bookmarks, playback history and preferences are stored only on this device, and are never transmitted to us or any third party.',
        'Network access is used exclusively for the optional features you explicitly trigger, such as metadata lookups and the streaming sources you add. We do not track, profile or sell your data.',
        'You can erase all app data at any time by clearing the app storage in your system settings, or by uninstalling the application.',
      ]
    : [
        'Simba Player is provided "as is" for playing media files that you have the legal right to access. You are responsible for the content you play, and for ensuring you have the necessary rights or licences.',
        'The software is offered without warranty of any kind. To the maximum extent permitted by law, we are not liable for any damages arising from the use of this application.',
        'By using Simba Player you agree to these terms. If you do not agree, please discontinue use and uninstall the application.',
      ];

  y += spacing.xl;
  for (const p of paragraphs) {
    const out = P.paragraph(isPrivacy ? 'Privacy' : 'Terms', p, {
      x: ROW.padX,
      y,
      size: 15,
      lineHeight: 22,
      maxChars: 46,
    });
    shapes.push(...out);
    y += out.height + spacing.md;
  }

  y += spacing.lg;
  shapes.push(
    k.text((isPrivacy ? 'Privacy' : 'Terms') + ' updated', 'Last updated: November 2026', {
      x: ROW.padX,
      y,
      family: 'Inter',
      weight: 400,
      size: 13,
      lineHeight: 18,
      fill: c.text.secondary,
    }),
  );
  y += 18 + spacing.xxl;

  shapes.unshift(...P.header(isPrivacy ? 'Privacy' : 'Terms', title));
  return {width: SCREEN_W, height: y, shapes};
}

// ─── Credits, rebuilt ──────────────────────────────────────────────────────

/**
 * Credits, rebuilt — with the libraries the app ACTUALLY uses.
 *
 * The old list named Redux Toolkit, redux-persist and AsyncStorage. The app
 * has used Zustand and MMKV since V17.
 */
function creditsBoard(themeName) {
  const P = profileKit(themeName);
  const {k, c} = P;
  const shapes = [];
  let y = HEADER_H;

  const GROUPS = [
    ['Media engine', ['MPV — video and audio playback (LGPL-2.1+)', 'libmpv bindings for React Native', 'FFmpeg — demuxing and decoding']],
    ['Framework', ['React Native 0.86 (MIT)', 'TypeScript', 'React 19']],
    ['State & data', ['Zustand 5 (MIT)', 'react-native-mmkv (MIT)']],
    ['Navigation & UI', ['React Navigation 7 (MIT)', 'react-native-linear-gradient', 'react-native-svg', 'react-native-safe-area-context']],
    ['Tooling', ['Jest + @testing-library/react-native', 'react-native-haptic-feedback']],
  ];

  y += spacing.lg;
  for (const [group, items] of GROUPS) {
    shapes.push(...k.divider('Credits ' + group, group, y));
    y += 48;
    for (const item of items) {
      const out = P.row('Credits item ' + item, {y, label: item, chevron: false});
      shapes.push(...out);
      y += out.rowHeight;
    }
    y += spacing.md;
  }

  y += spacing.lg;
  shapes.push(
    k.text('Credits team', 'Simba Player team', {
      x: ROW.padX,
      y,
      family: 'Inter',
      weight: 400,
      size: 13,
      lineHeight: 18,
      fill: c.text.secondary,
    }),
  );
  y += 18 + spacing.xxl;

  shapes.unshift(...P.header('Credits', 'Credits'));
  return {width: SCREEN_W, height: y, shapes};
}

// ─── Stats, restyled ───────────────────────────────────────────────────────

/**
 * Stats — the ONE place the numbers live.
 *
 * The Profile used to draw six of these numbers itself, from a different
 * store. The Profile now shows one count line and links here; this page owns
 * the rest — days active, the day streak and the top media, which nothing
 * else has.
 */
function statsBoard(themeName) {
  const P = profileKit(themeName);
  const {k, c} = P;
  const shapes = [];
  let y = HEADER_H;

  const STATS = [
    ['Plays', '248'],
    ['Playback time', '18:42:06'],
    ['Tracks', '124'],
    ['Videos', '8'],
    ['Days active', '37'],
    ['Day streak', '6'],
  ];

  y += spacing.lg;
  shapes.push(
    ...P.dividerAction('Stats totals', 'Totals', 'Browse Library', y, 'Stats Browse Library'),
  );
  y += 48;
  for (const [label, value] of STATS) {
    const out = P.row('Stats ' + label, {y, label, count: value, chevron: false});
    shapes.push(...out);
    y += out.rowHeight;
  }

  y += spacing.lg;
  shapes.push(...k.divider('Stats top media', 'Top media', y));
  y += 48;
  for (const [title, plays] of [
    ['Nocturne in E-flat', '14 plays'],
    ['Aria, Op. 2', '11 plays'],
    ['The Blue Hour', '9 plays'],
    ['Field Notes, Vol. 3', '7 plays'],
  ]) {
    const out = P.row('Stats top ' + title, {y, label: title, count: plays, chevron: false});
    shapes.push(...out);
    y += out.rowHeight;
  }

  y += spacing.xl;
  shapes.unshift(...P.header('Stats', 'Stats'));
  return {width: SCREEN_W, height: y, shapes};
}

module.exports = {
  profileKit,
  profileBoard,
  aboutBoard,
  helpBoard,
  legalBoard,
  creditsBoard,
  statsBoard,
  HEADER_H,
  ROW,
};
