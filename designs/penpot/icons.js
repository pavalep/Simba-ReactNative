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

/** Theme palettes — values taken from src/theme/tokens.ts. */
const PALETTE = {
  light: {
    gold: '#B8922E', // lightColors.accent.gold
    ink: '#1A1A1C', // lightColors.text.primary
    chevron: CHEVRON_LIGHT,
    onMedia: '#FFFFFF',
  },
  dark: {
    gold: '#C9A84C', // darkColors.accent.gold
    ink: '#EDEDED', // darkColors.text.primary
    chevron: CHEVRON_DARK,
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
