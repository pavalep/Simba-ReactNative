'use strict';

/**
 * Rasterises the app's OWN SVG icons (src/assets/svg/*.svg) into themed PNGs
 * that a Penpot design board can use as media.
 *
 * Penpot cannot render SVG paths through the plugin API, so every glyph has to
 * become a raster image. Every app icon paints with `fill="currentColor"` and/or
 * `stroke="currentColor"`, so recolouring is a literal string replacement of
 * `currentColor` with a hex colour — the art itself is never rewritten.
 *
 * Usage:
 *   node designs/penpot/icons.js
 *
 * Exports:
 *   JOBS      - every icon/theme job
 *   OUT_DIR   - designs/.build/icons
 *   renderAll - renders + verifies every job
 *   entries   - media-registry entries for the rendered PNGs
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT = path.resolve(__dirname, '..', '..');
const SVG_DIR = path.join(ROOT, 'src', 'assets', 'svg');
const OUT_DIR = path.join(ROOT, 'designs', '.build', 'icons');

/** Retina factor: every icon is rasterised at 4x its CSS size. */
const SCALE = 4;

/* ------------------------------------------------------------------ colours */

/**
 * Flatten a translucent foreground onto an opaque surface so the exported PNG
 * looks identical to the app, which composites the translucent colour over the
 * same surface at paint time.
 *
 *   composite = alpha * fg + (1 - alpha) * bg   (per channel)
 */
function compositeOver(fgHex, alpha, bgHex) {
  const parse = (hex) => [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
  const fg = parse(fgHex);
  const bg = parse(bgHex);
  const out = fg.map((c, i) => Math.round(alpha * c + (1 - alpha) * bg[i]));
  return '#' + out.map((c) => c.toString(16).padStart(2, '0')).join('').toUpperCase();
}

/**
 * CHEVRON COLOUR DERIVATION
 * -------------------------
 * The app draws the chevrons with `text.tertiary`, which is TRANSLUCENT:
 *   light: rgba(26,26,28,0.30)      dark: rgba(237,237,237,0.30)
 * A translucent PNG dropped onto a Penpot rectangle will NOT composite the way
 * the app does, so the 0.30-alpha colour is flattened onto the theme's opaque
 * `background.elevated` surface (#FFFFFF light / #141416 dark).
 *
 *   light, over #FFFFFF  (255,255,255):
 *     R = 0.30*26  + 0.70*255 = 7.8  + 178.5 = 186.3 -> 186 = 0xBA
 *     G = 0.30*26  + 0.70*255 = 7.8  + 178.5 = 186.3 -> 186 = 0xBA
 *     B = 0.30*28  + 0.70*255 = 8.4  + 178.5 = 186.9 -> 187 = 0xBB   => #BABABB
 *
 *   dark, over #141416  (20,20,22):
 *     R = 0.30*237 + 0.70*20  = 71.1 + 14.0 = 85.1  -> 85 = 0x55
 *     G = 0.30*237 + 0.70*20  = 71.1 + 14.0 = 85.1  -> 85 = 0x55
 *     B = 0.30*237 + 0.70*22  = 71.1 + 15.4 = 86.5  -> 87 = 0x57   => #555557
 */
const CHEVRON_LIGHT = compositeOver('#1A1A1C', 0.3, '#FFFFFF');
const CHEVRON_DARK = compositeOver('#EDEDED', 0.3, '#141416');
if (CHEVRON_LIGHT !== '#BABABB' || CHEVRON_DARK !== '#555557') {
  throw new Error(
    `Chevron composite drifted: light=${CHEVRON_LIGHT} dark=${CHEVRON_DARK}`
  );
}

/**
 * THE SECONDARY TEXT COMPOSITE
 * ---------------------------
 * The Search page's rows draw a BARE download glyph and a clear button in
 * `text.secondary` (rgba(26,26,28,0.55) light / rgba(237,237,237,0.55)
 * dark) — the same flattening the chevron needs, one step stronger.
 *
 *   light, over #FFFFFF  (255,255,255):
 *     R = 0.55*26 + 0.45*255 = 14.3  + 114.75 = 129.05 -> 129 = 0x81
 *     G = 0.55*26 + 0.45*255 = 14.3  + 114.75 = 129.05 -> 129 = 0x81
 *     B = 0.55*28 + 0.45*255 = 15.4  + 114.75 = 130.15 -> 130 = 0x82  => #818182
 *
 *   dark, over #141416  (20,20,22):
 *     R = 0.55*237 + 0.45*20 = 130.35 + 9.0  = 139.35 -> 139 = 0x8B
 *     G = 0.55*237 + 0.45*20 = 130.35 + 9.0  = 139.35 -> 139 = 0x8B
 *     B = 0.55*237 + 0.45*22 = 130.35 + 9.9  = 140.25 -> 140 = 0x8C  => #8B8B8C
 */
const SECONDARY_LIGHT = compositeOver('#1A1A1C', 0.55, '#FFFFFF');
const SECONDARY_DARK = compositeOver('#EDEDED', 0.55, '#141416');
if (SECONDARY_LIGHT !== '#818182' || SECONDARY_DARK !== '#8B8B8C') {
  throw new Error(
    `Secondary composite drifted: light=${SECONDARY_LIGHT} dark=${SECONDARY_DARK}`
  );
}

/** Theme palettes — values taken from src/theme/tokens.ts. */
const PALETTE = {
  light: {
    gold: '#B8922E', // lightColors.accent.gold
    ink: '#1A1A1C', // lightColors.text.primary
    chevron: CHEVRON_LIGHT,
    tertiary: CHEVRON_LIGHT, // lightColors.text.tertiary
    secondary: SECONDARY_LIGHT, // lightColors.text.secondary
    onMedia: '#FFFFFF',
  },
  dark: {
    gold: '#C9A84C', // darkColors.accent.gold
    ink: '#EDEDED', // darkColors.text.primary
    chevron: CHEVRON_DARK,
    tertiary: CHEVRON_DARK, // darkColors.text.tertiary
    secondary: SECONDARY_DARK, // darkColors.text.secondary
    onMedia: '#FFFFFF',
  },
};

/**
 * The icon set, per theme.
 * `file` maps to src/assets/svg/<file>; the mapping is the app's own
 * (src/components/utility/SvgIcon/SvgIcon.tsx).
 */
const ICONS = [
  // The lion mark: the app's own `accent.brandInk`, which flips with the
  // theme because the mark sits on the theme's page. Dark #B27340 on
  // #0A0A0C = 5.1:1; the old fixed #5C3A1E measured 1.96:1 — drawn, and
  // invisible.
  { name: 'lion', file: 'ui_lion.svg', size: 44, light: '#5C3A1E', dark: '#B27340' },
  { name: 'search', file: 'ic_search.svg', size: 20, light: 'ink', dark: 'ink' },
  { name: 'clock', file: 'ic_clock.svg', size: 18, light: 'gold', dark: 'gold' },
  { name: 'listMusic', file: 'ic_list_music.svg', size: 18, light: 'gold', dark: 'gold' },
  { name: 'bookmark', file: 'ic_bookmark.svg', size: 18, light: 'gold', dark: 'gold' },
  { name: 'podcastRings', file: 'ic_podcast_rings.svg', size: 32, light: 'gold', dark: 'gold' },
  { name: 'compass', file: 'ic_compass.svg', size: 18, light: 'gold', dark: 'gold' },
  { name: 'chevronDown', file: 'ic_chevron_down.svg', size: 18, light: 'chevron', dark: 'chevron' },
  { name: 'chevronRight', file: 'ic_chevron_right.svg', size: 14, light: 'chevron', dark: 'chevron' },
  // The UP chevron is the SAME asset rotated 180° (`SectionHeader.tsx:107`
  // rotates the down chevron when a rail is collapsed), and Penpot's plan
  // vocabulary has no rotation, so the app's own up-chevron file is used.
  { name: 'chevronUp', file: 'ic_chevron_up.svg', size: 18, light: 'chevron', dark: 'chevron' },
  // The pin badge the playlist cover draws on the pinned tile
  // (`PlaylistCover.tsx:170-183`).
  { name: 'pinFilled', file: 'ic_pin_filled.svg', size: 14, light: 'gold', dark: 'gold' },
  // The 16 px music glyph inside the genre chip's circle
  // (`GenreChipsShelf.tsx:52-54`) — the SAME file as the 12 px rail type
  // badge, but the chip paints it in gold, not on-media white.
  { name: 'musicChip', file: 'ui_music.svg', size: 16, light: 'gold', dark: 'gold' },
  // The Explore Contents badge glyphs. They are 32 dp because the card's
  // badge is a 40 dp disc with a 32 dp glyph inside it, CENTRED on the
  // poster (`CategoryCard.tsx`). They are rendered at 4x, so the PNG is
  // 128 px and the board stays sharp at the size it draws them.
  { name: 'clapperboard', file: 'ic_clapperboard.svg', size: 32, light: 'gold', dark: 'gold' },
  { name: 'disc3', file: 'ic_disc_3.svg', size: 32, light: 'gold', dark: 'gold' },
  { name: 'radioTower', file: 'ic_radio_tower.svg', size: 32, light: 'gold', dark: 'gold' },
  { name: 'tv', file: 'ic_tv.svg', size: 32, light: 'gold', dark: 'gold' },
  { name: 'bookOpen', file: 'ic_book_open.svg', size: 32, light: 'gold', dark: 'gold' },
  { name: 'videoCamera', file: 'ic_video_camera.svg', size: 32, light: 'gold', dark: 'gold' },
  { name: 'archive', file: 'ic_archive.svg', size: 32, light: 'gold', dark: 'gold' },
  { name: 'folder', file: 'ui_folder.svg', size: 32, light: 'gold', dark: 'gold' },
  { name: 'music', file: 'ui_music.svg', size: 12, light: 'onMedia', dark: 'onMedia' },
  { name: 'video', file: 'ui_video.svg', size: 12, light: 'onMedia', dark: 'onMedia' },
  { name: 'play', file: 'ic_play.svg', size: 24, light: '#1A1A1C', dark: '#0A0A0C' },
  { name: 'headphones', file: 'ic_headphones.svg', size: 36, light: 'gold', dark: 'gold' },

  // ── The RC1 internal-page glyphs (2026-11-11) ─────────────────────────
  //
  // The About page's link list is drawn again on the RC1 boards, and the
  // list it replaces gave THREE rows the same `settings` gear and TWO rows
  // the same `music` note. A row whose glyph says nothing is a row the user
  // has to read to understand — which is the opposite of a glyph's job.
  //
  // Every glyph below is the APP'S OWN file (`src/assets/svg/`), listed in
  // `SvgIcon.tsx`'s icon map. Nothing here is a new drawing.
  //
  // The back chevron: the app's `BackButton.tsx` draws `chevronRight`
  // rotated 180° — Penpot's plan vocabulary has no rotation, so the app's
  // OWN `ic_chevron_left.svg` is used at the BackButton's 20 px.
  { name: 'chevronLeft', file: 'ic_chevron_left.svg', size: 20, light: 'ink', dark: 'ink' },
  { name: 'history', file: 'ic_history.svg', size: 18, light: 'gold', dark: 'gold' },
  { name: 'award', file: 'ic_award.svg', size: 18, light: 'gold', dark: 'gold' },
  { name: 'book', file: 'ic_book.svg', size: 18, light: 'gold', dark: 'gold' },
  { name: 'lock', file: 'ic_lock.svg', size: 18, light: 'gold', dark: 'gold' },
  { name: 'info', file: 'ic_info.svg', size: 18, light: 'gold', dark: 'gold' },
  { name: 'trophy', file: 'ic_trophy.svg', size: 18, light: 'gold', dark: 'gold' },
  { name: 'share', file: 'ic_share.svg', size: 18, light: 'gold', dark: 'gold' },
  { name: 'alertCircle', file: 'ic_alert_circle.svg', size: 18, light: 'gold', dark: 'gold' },
  { name: 'megaphone', file: 'ic_megaphone.svg', size: 18, light: 'gold', dark: 'gold' },
  // The gear in the Profile header — the ONE door to Settings on the
  // account page (`ui_settings.svg`, the app's own settings glyph).
  { name: 'settings', file: 'ui_settings.svg', size: 18, light: 'gold', dark: 'gold' },

  // ── The Search page's glyphs (2026-11-12) ─────────────────────────────
  //
  // The Search page is a list of results, and every control on it is the
  // app's own: the magnifier inside the field, the clear button, the bare
  // download glyph on a downloadable row, the sliders on the FAB that
  // opens the filter sheet, and the folder mark on a folder result.
  //
  // The magnifier comes in TWO tints because the field's focus is the
  // page's one focus cue (`md/SEARCH_PAGE_REDESIGN.md` §3.5): the glyph
  // turns gold when the field has the focus, and the field's own BORDER
  // stays `border.subtle` → `border.emphasis`. The field is 44 dp tall and
  // the glyph is the app's own 18 px (`SearchBar.tsx:109`).
  { name: 'searchField', file: 'ic_search.svg', size: 18, light: 'tertiary', dark: 'tertiary' },
  { name: 'searchFocus', file: 'ic_search.svg', size: 18, light: 'gold', dark: 'gold' },
  // The clear button — 16 px, `text.secondary` (`SearchBar.tsx:133`).
  { name: 'close', file: 'ic_close.svg', size: 16, light: 'secondary', dark: 'secondary' },
  // The BARE download glyph — 20 px, `text.secondary`, with no disc
  // (`DownloadButton.tsx:87`, minus the 40 dp disc the redesign drops).
  { name: 'download', file: 'ic_download.svg', size: 20, light: 'secondary', dark: 'secondary' },
  // The FAB's glyph — 24 px in `text.inverse`, on the gold disc
  // (`Fab.tsx:82,119`). This is the app's ONE floating action button and
  // it is what opens the filter sheet.
  { name: 'sliders', file: 'ic_sliders.svg', size: 24, light: '#1A1A1C', dark: '#0A0A0C' },
];

function resolveColor(spec, theme) {
  if (typeof spec === 'string' && spec.startsWith('#')) return spec.toUpperCase();
  const value = PALETTE[theme][spec];
  if (!value) throw new Error(`Unknown colour "${spec}" for theme "${theme}"`);
  return value;
}

/** Every icon in every theme. */
const JOBS = [];
for (const icon of ICONS) {
  for (const theme of ['light', 'dark']) {
    JOBS.push({
      key: `ico.${icon.name}.${theme}`,
      name: icon.name,
      file: icon.file,
      size: icon.size,
      color: resolveColor(icon[theme], theme),
      theme,
    });
  }
}

/* -------------------------------------------------------------- rasterising */

const CURRENT_COLOR = /currentcolor/gi;

function svgPath(file) {
  return path.join(SVG_DIR, file);
}

function outPath(job) {
  return path.join(OUT_DIR, job.theme, `${job.name}.png`);
}

/** Recolour + render one job, then verify the written PNG. */
async function renderJob(job) {
  const src = svgPath(job.file);
  const svg = fs.readFileSync(src, 'utf8');
  const painted = svg.replace(CURRENT_COLOR, job.color);

  const px = job.size * SCALE;
  const out = outPath(job);
  fs.mkdirSync(path.dirname(out), { recursive: true });

  await sharp(Buffer.from(painted))
    .resize(px, px)
    .png({ compressionLevel: 9 })
    .toFile(out);

  const meta = await sharp(out).metadata();
  const bytes = fs.statSync(out).size;

  if (meta.width !== px || meta.height !== px) {
    throw new Error(
      `${job.key}: expected ${px}x${px} px, got ${meta.width}x${meta.height} (${out})`
    );
  }
  if (meta.hasAlpha !== true) {
    throw new Error(`${job.key}: output has no alpha channel (${out})`);
  }

  // The background must be transparent: the darkest alpha in the image has to
  // be 0, and the four corners must be fully clear.
  const stats = await sharp(out).stats();
  const alphaMin = stats.channels[3] ? stats.channels[3].min : 255;
  if (alphaMin !== 0) {
    throw new Error(`${job.key}: background is not transparent (alpha min ${alphaMin})`);
  }

  const { data, info } = await sharp(out).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const corners = [
    [0, 0],
    [info.width - 1, 0],
    [0, info.height - 1],
    [info.width - 1, info.height - 1],
  ];
  for (const [x, y] of corners) {
    const alpha = data[(y * info.width + x) * 4 + 3];
    if (alpha !== 0) {
      throw new Error(`${job.key}: corner (${x},${y}) is not transparent (alpha ${alpha})`);
    }
  }

  return { key: job.key, path: out, w: meta.width, h: meta.height, bytes };
}

/** Render + verify every job. */
async function renderAll() {
  // Pre-flight: every source SVG must exist before a single PNG is written.
  const missing = JOBS.map((job) => svgPath(job.file)).filter((p) => !fs.existsSync(p));
  if (missing.length) {
    throw new Error(`Missing source SVG(s):\n  ${[...new Set(missing)].join('\n  ')}`);
  }

  const results = [];
  for (const job of JOBS) {
    results.push(await renderJob(job));
  }
  return results;
}

/** Media-registry entries for the rendered PNGs. Throws if a PNG is missing. */
function entries() {
  return JOBS.map((job) => {
    const out = outPath(job);
    if (!fs.existsSync(out)) {
      throw new Error(`${job.key}: rendered PNG is missing at ${out} — run renderAll() first`);
    }
    return {
      key: job.key,
      path: out,
      mime: 'image/png',
      w: job.size * SCALE,
      h: job.size * SCALE,
    };
  });
}

module.exports = { JOBS, OUT_DIR, renderAll, entries };

if (require.main === module) {
  renderAll()
    .then((results) => {
      let total = 0;
      for (const r of results) {
        total += r.bytes;
        console.log(`${r.key.padEnd(28)} ${r.w}x${r.h}  ${r.bytes} B  ${r.path}`);
      }
      console.log(`\n${results.length} icons rendered, ${total} bytes total -> ${OUT_DIR}`);
    })
    .catch((err) => {
      console.error(err && err.stack ? err.stack : err);
      process.exit(1);
    });
}
