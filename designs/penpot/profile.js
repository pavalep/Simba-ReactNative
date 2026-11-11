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
 */

'use strict';

const {kit, SCREEN_W, spacing, radius} = require('./kit');

/**
 * The InternalHeader's own metrics (`InternalHeader.tsx:102-158`).
 *
 * The header's height is the 36 dp button plus the 12 dp padding either
 * side — the 48/56 title is an ABSOLUTE overlay, so it does not push the
 * row taller. That is why the title on the About board bleeds over the
 * header's hairline: the app draws it that way.
 */
const HEADER = {
  padX: spacing.sm, // 8
  padY: spacing.md, // 12
  button: 36,
  titleSize: 48,
  titleLine: 56,
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
      // The title — Cormorant Garamond Bold 48/56, centred on the FULL
      // header width (`InternalHeader.tsx:78-88`). The title overlay's
      // `paddingHorizontal: 96` is what truncated "Privacy P…"; the boards
      // draw the title at its natural width and the code wave fixes the
      // overlay (md/PROFILE_RC1_REFACTOR.md, CF-05).
      k.text(name + ' title', title, {
        x: {center: SCREEN_W / 2},
        y: HEADER.padY + (HEADER.button - HEADER.titleLine) / 2,
        family: 'Cormorant Garamond',
        weight: 700,
        size: HEADER.titleSize,
        lineHeight: HEADER.titleLine,
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
    const h = o.description ? 66 : ROW.minHeight;
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
          x: textX,
          y: o.y + 36,
          family: 'Inter',
          weight: 400,
          size: 13,
          lineHeight: 18,
          fill: c.text.tertiary,
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
   * A switch — the app's own toggle (`SettingsScreen.tsx:176-186`).
   *
   * The track is `border.subtle` off and `accent.goldDim` on, the thumb is
   * `accent.gold` on and `text.tertiary` off.
   */
  function toggle(name, o) {
    const w = 44;
    const h = 26;
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
        letterSpacing: 0.3,
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
 * The Profile page.
 *
 * The identity is UNBOXED — no card around it, the same rule the V2 greeting
 * follows on Home. The section titles are the Cormorant dividers. The rows
 * are the app's own `SettingsRow`s, and the counts ride on the rows instead
 * of standing on their own as tiles.
 *
 * @param {'light'|'dark'} themeName
 */
function profileBoard(themeName) {
  const P = profileKit(themeName);
  const {k, c} = P;
  const shapes = [];

  // The header: the back chevron, the serif title, and the GEAR — the one
  // door to Settings on the account page, the way YouTube, Spotify, Apple
  // Music, Plex and Tencent Video all put it there. The old header's right
  // action was the TEXT "Sign out", which wrapped and was clipped inside a
  // 36 dp circle; sign-out lives in the Account section instead.
  shapes.push(...P.header('Profile', 'Profile', {rightIcon: 'settings'}));

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

  // ── Activity ──────────────────────────────────────────────────────────
  //
  // The Profile is "you", not "your library".
  //
  // Home owns the library — it carries the Recently Played, Pinned
  // Playlists, Bookmarks and Followed Podcasts rails, each with a "See
  // All" — so a second index of the same six things here would be the
  // app saying the same thing twice, under the same "Your Library"
  // heading. The "Your Library" section is gone from this page.
  //
  // What is left is what Home cannot show: the account, and the numbers
  // only the account has. `Stats` is reachable from nowhere else in the
  // app, so this row is its single door.
  y += spacing.md; // 12
  shapes.push(...k.divider('Activity', 'Activity', y));
  y += 48; // the divider's own block: 12 + 24 + 12
  {
    const out = P.row('Profile Stats', {y, label: 'Playback statistics'});
    shapes.push(...out);
    y += out.rowHeight;
  }

  // ── Account ───────────────────────────────────────────────────────────
  y += spacing.lg;
  shapes.push(...k.divider('Account', 'Account', y));
  y += 48;
  {
    // Only ONE red row. Revoke and Clear live behind a confirmation
    // dialog, so the row itself does not have to shout — and three red
    // rows in a row read as an error screen.
    const out = P.row('Profile Sign out', {
      y,
      label: 'Sign out',
      destructive: true,
    });
    shapes.push(...out);
    y += out.rowHeight;
  }
  {
    const out = P.row('Profile Revoke', {y, label: 'Revoke Google access'});
    shapes.push(...out);
    y += out.rowHeight;
  }
  {
    const out = P.row('Profile Clear data', {y, label: 'Clear local data'});
    shapes.push(...out);
    y += out.rowHeight;
  }

  // ── Support ───────────────────────────────────────────────────────────
  //
  // The last two rows are the app's own pages. They used to sit in
  // Settings' "About" section, which was a SECOND INDEX of the About
  // page's own link list — the same pages, listed twice, in two places.
  // The About page stays the hub (it owns the version, the credits, the
  // licences, the privacy policy and the terms); the Profile keeps the
  // one door to it, and to the FAQ.
  //
  // YouTube, Spotify, Tencent Video and Huawei Video all put Help and
  // the legal pages on the account screen, for the same reason: that is
  // where a user looks for them.
  y += spacing.lg; // 16
  shapes.push(...k.divider('Support', 'Support', y));
  y += 48;
  {
    const out = P.row('Profile Help', {y, label: 'Help'});
    shapes.push(...out);
    y += out.rowHeight;
  }
  {
    const out = P.row('Profile About', {y, label: 'About Simba'});
    shapes.push(...out);
    y += out.rowHeight;
  }

  y += spacing.xl;
  return {width: SCREEN_W, height: y, shapes};
}

// ─── the Settings page, rebuilt ────────────────────────────────────────────

/**
 * Settings, rebuilt.
 *
 * Two things are GONE: the **Discover** section (seven rows that duplicate
 * Home's Explore Contents rail — decision D-C) and the **account card** (it
 * draws the Profile's identity block again, and tapping it opens the
 * Profile).
 *
 * The section titles are the Cormorant dividers, not the V7 `displaySans`
 * headings, so the page speaks with the same voice as the Profile.
 */
function settingsBoard(themeName) {
  const P = profileKit(themeName);
  const {k, c} = P;
  const shapes = [];
  let y = HEADER_H;

  const SECTION = (name, label) => {
    y += spacing.lg;
    shapes.push(...k.divider(name, label, y));
    y += 48;
  };

  // ── Appearance ────────────────────────────────────────────────────────
  SECTION('Settings Appearance', 'Appearance');
  {
    const out = P.row('Settings Theme', {
      y,
      label: 'Theme',
      description: 'System',
    });
    shapes.push(...out);
    y += out.rowHeight;
  }
  {
    // The old "Accent Color — Gold — Simba brand" row had no onPress: it
    // looked like a setting and did nothing. It is gone rather than kept
    // as a decoration.
    const out = P.row('Settings Accent', {y, label: 'Accent colour', count: 'Gold'});
    shapes.push(...out);
    y += out.rowHeight;
  }

  // ── Playback ──────────────────────────────────────────────────────────
  SECTION('Settings Playback', 'Playback');
  for (const [name, label, on] of [
    ['Settings Hardware acceleration', 'Hardware acceleration', true],
    ['Settings Audio normalization', 'Audio normalisation', false],
    ['Settings Dialogue boost', 'Dialogue boost', false],
    ['Settings Skip silence', 'Skip silence', false],
  ]) {
    shapes.push(
      ...P.row(name, {y, label, chevron: false}),
      ...P.toggle(name + ' toggle', {y, on}),
    );
    y += ROW.minHeight;
  }
  {
    const out = P.row('Settings Subtitle language', {
      y,
      label: 'Subtitle language',
      description: 'English, Japanese',
    });
    shapes.push(...out);
    y += out.rowHeight;
  }
  {
    const out = P.row('Settings Audio Settings', {
      y,
      label: 'Audio settings',
      description: 'Equalizer and audio tuning',
    });
    shapes.push(...out);
    y += out.rowHeight;
  }

  // ── Subtitles ─────────────────────────────────────────────────────────
  SECTION('Settings Subtitles', 'Subtitles');
  for (const [name, label, desc] of [
    ['Settings Font size', 'Font size', 'Medium'],
    ['Settings Text colour', 'Text colour', '#FFFFFF'],
    ['Settings Background opacity', 'Background opacity', 'Light'],
  ]) {
    const out = P.row(name, {y, label, description: desc});
    shapes.push(...out);
    y += out.rowHeight;
  }
  {
    shapes.push(
      ...P.row('Settings Auto-load subtitles', {
        y,
        label: 'Auto-load subtitles',
        chevron: false,
      }),
      ...P.toggle('Settings Auto-load subtitles toggle', {y, on: true}),
    );
    y += ROW.minHeight;
  }

  // ── Library ───────────────────────────────────────────────────────────
  SECTION('Settings Library', 'Library');
  for (const [name, label, desc] of [
    ['Settings Linked Folders', 'Linked folders', 'None'],
    ['Settings MPV options', 'MPV options', 'Default'],
  ]) {
    const out = P.row(name, {y, label, description: desc});
    shapes.push(...out);
    y += out.rowHeight;
  }

  // ── Reset preferences ─────────────────────────────────────────────────
  //
  // Settings is a PREFERENCES page and nothing else. Its "About"
  // section — Version, About Simba, Credits, Changelog, Help, Open
  // source licences — was a second index of the About page's own link
  // list, and those rows now live on the Profile, which is where
  // YouTube, Spotify, Tencent Video and Huawei Video put them.
  //
  // "Reset preferences" STAYS: it acts on the settings themselves, so
  // this is the page that owns it. The About page's footer "Reset all
  // settings" is the duplicate, and it goes.
  //
  // It is drawn as its own group because it is the one row that is not a
  // preference but an ACTION on them.
  SECTION('Settings Reset', 'Reset');
  {
    const out = P.row('Settings Reset preferences', {
      y,
      label: 'Reset preferences',
    });
    shapes.push(...out);
    y += out.rowHeight;
  }

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
      family: 'Inter',
      weight: 700,
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
      size: 13,
      lineHeight: 18,
      fill: c.text.tertiary,
    }),
  );
  y += 18;
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

  // "Built with" — the app's OWN stack. The old list said "Redux Toolkit",
  // which the app has not used since V17.
  shapes.push(
    k.rect('About built with card', {
      x: ROW.padX,
      y,
      w: SCREEN_W - ROW.padX * 2,
      h: 74,
      radius: radius.md,
      fill: c.background.elevated,
    }),
    k.text('About built with label', 'Built with', {
      x: {center: SCREEN_W / 2},
      y: y + 10,
      family: 'Inter',
      weight: 400,
      size: 11,
      lineHeight: 16,
      letterSpacing: 0.5,
      fill: c.text.tertiary,
    }),
  );
  {
    const chips = ['React Native', 'TypeScript', 'MPV', 'Zustand', 'MMKV', 'React Navigation'];
    let cx = ROW.padX + 12;
    let cy = y + 34;
    for (const chip of chips) {
      const w = chip.length * 6.2 + 16;
      if (cx + w > SCREEN_W - ROW.padX - 12) {
        cx = ROW.padX + 12;
        cy += 26;
      }
      shapes.push(
        k.rect('About chip ' + chip, {
          x: cx,
          y: cy,
          w,
          h: 22,
          radius: radius.sm,
          fill: c.background.primary,
        }),
        k.text('About chip text ' + chip, chip, {
          x: cx + 8,
          y: cy + 3,
          family: 'Inter',
          weight: 400,
          size: 11,
          lineHeight: 16,
          fill: c.accent.gold,
        }),
      );
      cx += w + 8;
    }
  }
  y += 74 + spacing.lg;

  // ── the links, full width ─────────────────────────────────────────────
  y += spacing.lg;
  shapes.push(...k.divider('About links', 'More', y));
  y += 48;

  const LINKS = [
    ['About Changelog', 'Changelog', 'history'],
    ['About Credits', 'Credits', 'award'],
    ['About Licenses', 'Open source licences', 'book'],
    ['About Privacy', 'Privacy policy', 'lock'],
    ['About Terms', 'Terms of use', 'info'],
    ['About Rate', 'Rate on Play Store', 'trophy'],
    ['About Share', 'Share app', 'share'],
    ['About Report', 'Report a bug', 'alertCircle'],
    ['About Contact', 'Contact feedback', 'megaphone'],
  ];
  for (const [name, label, icon] of LINKS) {
    const out = P.row(name, {y, label, icon});
    shapes.push(...out);
    y += out.rowHeight;
  }

  y += spacing.lg;
  shapes.push(
    k.text('About reset', 'Reset all settings', {
      x: {center: SCREEN_W / 2},
      y,
      family: 'Inter',
      weight: 400,
      size: 15,
      lineHeight: 22,
      fill: c.semantic.error,
    }),
  );
  y += 22 + spacing.xl;

  return {width: SCREEN_W, height: y, shapes};
}

// ─── Help, rebuilt ─────────────────────────────────────────────────────────

/**
 * The Help page, rebuilt.
 *
 * The structure is the app's own: a search field and three collapsible
 * sections. What changes is the COPY — the six answers that sent the user
 * to a setting with no UI are gone, and the page says "Settings" because
 * that is what the page is called.
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
      'Settings & accessibility',
      ['How do I reset all settings?', 'How do I change the theme?'],
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
  settingsBoard,
  aboutBoard,
  helpBoard,
  legalBoard,
  creditsBoard,
  statsBoard,
  HEADER_H,
  ROW,
};
