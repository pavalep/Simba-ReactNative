#!/usr/bin/env node
/**
 * media.js — the prototype's artwork, taken from the app itself.
 *
 * WHY THE APP'S OWN PICTURES
 * --------------------------
 * The prototype has to look like the product, not like a wireframe with grey
 * boxes. The app already ships the pictures it uses: the category covers for
 * the Explore Contents rail (`src/assets/images/categories/`) and the
 * placeholders for library media (`src/assets/images/placeholders/`). Those
 * are the SAME files the app renders, so the Penpot board shows the product's
 * own art — free, licensed for use, and impossible to drift from the app.
 *
 * THREE KINDS OF MEDIA
 * --------------------
 *
 *   1. `ASSETS` — the app's own images. Resized to the size the board draws
 *      them at (2x, for a sharp board on a retina screen) by
 *      `resize-media.ps1`, which also does the CENTRE CROP the app's
 *      `resizeMode="cover"` does.
 *   2. `LOCAL` — the files the prototype owns, in `designs/assets/`. Today
 *      there is exactly one: the weather chip, which the app draws as a
 *      Meteocons Lottie over a LinearGradient and which therefore cannot be
 *      reproduced from source (there is no Lottie rasteriser in the toolchain
 *      and Penpot cannot render a gradient) — so it is a crop of the app's
 *      OWN rendering, captured on the device. `designs/assets/README.md`
 *      carries its provenance.
 *   3. The icons — the app's own SVG glyphs, rasterised per theme by
 *      `icons.js`. Penpot cannot render SVG paths, so every glyph travels as
 *      a PNG.
 *
 * THE DRIFT GUARD
 * ---------------
 * Every category cover listed here is checked against the app's own registry
 * (`categories/index.ts`): if the app renames or drops a cover, this file
 * fails loudly instead of quietly drawing a picture the app no longer ships.
 */

'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const icons = require('./icons');

const APP = path.resolve(__dirname, '..', '..');
const DESIGNS = path.join(APP, 'designs');
const IMAGES = path.join(APP, 'src', 'assets', 'images');
const BUILD = path.join(DESIGNS, '.build');
const DERIV = path.join(BUILD, 'media');

/**
 * The artwork the prototype uses, taken from the app's own images.
 *
 * `file` is relative to `src/assets/images/`.
 * `box`   is the size the picture is drawn at, in the board's pixels
 *         (2x the dp size, so the board stays sharp on a retina screen).
 */
const ASSETS = {
  // ── the Explore Contents covers (the app's own category art) ──
  // The card is 140x160 dp (`CategoryCard.tsx:137-145`).
  'cat.movies': {file: 'categories/movies/all.png', box: [280, 320]},
  'cat.podcasts': {file: 'categories/podcasts/all.png', box: [280, 320]},
  'cat.music': {file: 'categories/music/all.png', box: [280, 320]},
  'cat.radio': {file: 'categories/radio/all.png', box: [280, 320]},
  'cat.livetv': {file: 'categories/livetv/all.png', box: [280, 320]},
  'cat.audiobooks': {file: 'categories/audiobooks/all.png', box: [280, 320]},
  'cat.shows': {file: 'categories/shows/all.png', box: [280, 320]},
  'cat.archive': {file: 'categories/archive/all.png', box: [280, 320]},

  // ── the media rail cards (160x90 dp, 16:9) ──
  'ph.rail1': {file: 'placeholders/audio/vinyl.jpg', box: [320, 180]},
  'ph.rail2': {file: 'placeholders/audio/piano.jpg', box: [320, 180]},
  'ph.rail3': {file: 'placeholders/video/documentary.jpg', box: [320, 180]},
  'ph.rail4': {file: 'placeholders/audio/concert.jpg', box: [320, 180]},
  'ph.rail5': {file: 'placeholders/audio/studio.jpg', box: [320, 180]},
  'ph.rail6': {file: 'placeholders/video/cinema.jpg', box: [320, 180]},

  // ── the podcast category plates (88 dp square tiles) ─────────────────
  //
  // The app already ships a cover plate for every podcast genre it can
  // art-direct (`src/assets/images/categories/podcasts/`), and those plates
  // are the surface the FILTER SHEET's genre tiles are drawn from — the
  // same artwork the app draws on its Home rail.
  //
  // The sources are 280x500 portraits; the resizer centre-crops to the
  // tile's box, exactly as the app's `resizeMode="cover"` does.
  'cat.pod.all': {file: 'categories/podcasts/all.png', box: [176, 176]},
  'cat.pod.arts': {file: 'categories/podcasts/arts.png', box: [176, 176]},
  'cat.pod.business': {file: 'categories/podcasts/business.png', box: [176, 176]},
  'cat.pod.comedy': {file: 'categories/podcasts/comedy.png', box: [176, 176]},
  'cat.pod.education': {file: 'categories/podcasts/education.png', box: [176, 176]},
  'cat.pod.health': {file: 'categories/podcasts/health.png', box: [176, 176]},
  'cat.pod.history': {file: 'categories/podcasts/history.png', box: [176, 176]},
  'cat.pod.music': {file: 'categories/podcasts/music.png', box: [176, 176]},
  'cat.pod.news': {file: 'categories/podcasts/news.png', box: [176, 176]},
  'cat.pod.technology': {file: 'categories/podcasts/technology.png', box: [176, 176]},

  // ── the podcast list rows' artwork (60 dp square thumbs) ─────────────
  //
  // The app draws the REAL podcast cover in every row
  // (`PodcastRow.tsx:41-47`). A Penpot board cannot fetch a remote image,
  // so the row carries one of the app's OWN bundled audio placeholders —
  // the same pictures the app ships for a podcast with no artwork of its
  // own (`src/assets/images/placeholders/audio/`).
  'ph.podRow1': {file: 'placeholders/audio/mic.jpg', box: [120, 120]},
  'ph.podRow2': {file: 'placeholders/audio/headphones.jpg', box: [120, 120]},
  'ph.podRow3': {file: 'placeholders/audio/studio.jpg', box: [120, 120]},
  'ph.podRow4': {file: 'placeholders/audio/guitar.jpg', box: [120, 120]},
  'ph.podRow5': {file: 'placeholders/audio/vinyl.jpg', box: [120, 120]},
  'ph.podRow6': {file: 'placeholders/audio/piano.jpg', box: [120, 120]},

  // ── the podcast circles (132 dp, `ARTWORK_SIZE`) ──
  'ph.pod1': {file: 'placeholders/audio/mic.jpg', box: [264, 264]},
  'ph.pod2': {file: 'placeholders/audio/concert.jpg', box: [264, 264]},
  'ph.pod3': {file: 'placeholders/audio/studio.jpg', box: [264, 264]},

  // ── the Movies grid cards (205.5 x 115.6 dp, 16:9) ──
  //
  // The Movies screen is a full-bleed 2-column mosaic of 16:9 cards
  // (`MovieCard.styles.ts:18-30`), and the app draws a REAL Internet
  // Archive poster in each one. A Penpot board cannot fetch a remote
  // image, so the card carries one of the app's OWN bundled video
  // placeholders instead — the same pictures the app ships for a video
  // with no artwork of its own (`src/assets/images/placeholders/video/`).
  //
  // The resizer centre-crops to the box, exactly as the app's
  // `resizeMode="cover"` does, so a 3:2 photograph fills the 16:9 card
  // without being stretched.
  'ph.movie1': {file: 'placeholders/video/movies.jpg', box: [411, 231]},
  'ph.movie2': {file: 'placeholders/video/cinema.jpg', box: [411, 231]},
  'ph.movie3': {file: 'placeholders/video/film_reel.jpg', box: [411, 231]},
  'ph.movie4': {file: 'placeholders/video/documentary.jpg', box: [411, 231]},
  'ph.movie5': {file: 'placeholders/video/camera.jpg', box: [411, 231]},
  'ph.movie6': {file: 'placeholders/video/shows.jpg', box: [411, 231]},

  // ── the search rows' artwork (40x40 dp) ────────────────────────────
  //
  // The Search page's rows are 40x40 (`md/SEARCH_PAGE_REDESIGN.md` §3.2),
  // and the resizer centre-crops to the box, so these are the app's own
  // placeholder photographs cropped square — the same pictures the app
  // draws in a list row.
  'ph.row1': {file: 'placeholders/audio/vinyl.jpg', box: [80, 80]},
  'ph.row2': {file: 'placeholders/audio/piano.jpg', box: [80, 80]},

  // ── the playlist cover collage ──
  // `PlaylistCover` draws the playlist's first four items as a 2x2 collage
  // with a hairline border between the cells (`PlaylistCover.tsx:136-158`).
  // Each cell is 16 dp inside the 32 dp cover.
  'ph.cell1': {file: 'placeholders/audio/vinyl.jpg', box: [32, 32]},
  'ph.cell2': {file: 'placeholders/audio/piano.jpg', box: [32, 32]},
  'ph.cell3': {file: 'placeholders/video/documentary.jpg', box: [32, 32]},
  'ph.cell4': {file: 'placeholders/audio/guitar.jpg', box: [32, 32]},
};

/**
 * The files the prototype owns, relative to `designs/`.
 *
 * The weather chip is the app's OWN rendering, cropped from a device
 * capture — see `designs/assets/README.md` for the full provenance. It is
 * the only piece of the Home screen the app draws as something Penpot
 * cannot reproduce (a Meteocons Lottie over a LinearGradient).
 */
const LOCAL = {
  'weather.chip': {file: 'assets/weather-chip.png'},
};

/**
 * The files the prototype GENERATES into the build directory, keyed by
 * media key. The playlist cover collages are rendered from the app's own
 * placeholder artwork by `collage.js`.
 *
 * Each playlist has TWO collages, one per size the cover is drawn at: the
 * 32 dp cover of the V1 tile and the 160 dp cover of the V2 tile.
 */
const GENERATED = {
  'ph.collage1': 'ph.collage1.jpg',
  'ph.collage2': 'ph.collage2.jpg',
  'ph.collage3': 'ph.collage3.jpg',
  'ph.collageBig1': 'ph.collageBig1.jpg',
  'ph.collageBig2': 'ph.collageBig2.jpg',
  'ph.collageBig3': 'ph.collageBig3.jpg',
};

/**
 * The covers the app registers, read out of `categories/index.ts`.
 *
 * A cover is "registered" when the app's registry requires that exact
 * path. `require('./movies/all.png')` -> `categories/movies/all.png`.
 */
function registeredCovers() {
  const src = fs.readFileSync(path.join(IMAGES, 'categories', 'index.ts'), 'utf8');
  const out = new Set();
  const re = /require\('(\.\/[^']+)'\)/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    out.add('categories/' + m[1].slice(2));
  }
  return out;
}

/** The rendered icons, by media key. */
function iconEntries() {
  const out = new Map();
  for (const entry of icons.entries()) out.set(entry.key, entry);
  return out;
}

/**
 * Check that every asset exists on disk, and that the category covers are
 * still registered by the app.
 *
 * Throws with the offending key — a missing or renamed cover must stop the
 * build, not produce a board with a hole in it.
 */
function verify() {
  const registered = registeredCovers();
  const problems = [];
  for (const [key, a] of Object.entries(ASSETS)) {
    const abs = path.join(IMAGES, a.file);
    if (!fs.existsSync(abs)) {
      problems.push(key + ': missing file ' + a.file);
      continue;
    }
    if (key.startsWith('cat.') && !registered.has(a.file)) {
      problems.push(key + ': ' + a.file + ' is no longer registered by the app');
    }
  }
  for (const [key, a] of Object.entries(LOCAL)) {
    const abs = path.join(DESIGNS, a.file);
    if (!fs.existsSync(abs)) {
      problems.push(key + ': missing file designs/' + a.file);
    }
  }
  for (const [key, file] of Object.entries(GENERATED)) {
    const abs = path.join(DERIV, file);
    if (!fs.existsSync(abs)) {
      problems.push(key + ': missing generated file ' + file + ' (run collage.js)');
    }
  }
  if (problems.length) {
    throw new Error('media registry is out of date:\n  ' + problems.join('\n  '));
  }
  return true;
}

/** The resize job list, for the PowerShell resizer. */
function resizeJobs() {
  const out = [];
  for (const [key, a] of Object.entries(ASSETS)) {
    out.push({
      key,
      src: path.join(IMAGES, a.file),
      dst: path.join(DERIV, key + '.jpg'),
      w: a.box[0],
      h: a.box[1],
    });
  }
  return out;
}

function mimeOf(file) {
  const ext = path.extname(file).toLowerCase();
  if (ext === '.png') return 'image/png';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  return 'application/octet-stream';
}

/** Where a key's picture comes from. */
function sourceOf(key) {
  const local = LOCAL[key];
  if (local) {
    const abs = path.join(DESIGNS, local.file);
    return {path: abs, mime: mimeOf(local.file)};
  }
  if (key.startsWith('ico.')) {
    const entry = iconEntries().get(key);
    if (!entry) throw new Error('unknown icon key ' + key);
    return {path: entry.path, mime: entry.mime};
  }
  const generated = GENERATED[key];
  if (generated) {
    return {path: path.join(DERIV, generated), mime: mimeOf(generated)};
  }
  const a = ASSETS[key];
  if (!a) throw new Error('unknown media key ' + key);
  const derived = path.join(DERIV, key + '.jpg');
  if (fs.existsSync(derived)) return {path: derived, mime: 'image/jpeg'};
  return {path: path.join(IMAGES, a.file), mime: mimeOf(a.file)};
}

/**
 * A short fingerprint of the picture behind a media key.
 *
 * The media id says WHICH picture is in the Penpot file; the fingerprint says
 * whether the file on disk is still that picture. A regenerated asset (a
 * collage rendered at a new size, a re-rasterised icon) has the same key and
 * a different fingerprint — and without this check the build would happily
 * reuse the OLD upload and the board would keep showing the old picture.
 *
 * That is not hypothetical: the first collage renderer produced a black PNG
 * (libvips' `dest-in` mask wipes the colour), and the board drew three
 * black squares until the renderer was fixed.
 */
function fingerprintOf(key) {
  const src = sourceOf(key);
  const bytes = fs.readFileSync(src.path);
  return crypto.createHash('sha1').update(bytes).digest('hex').slice(0, 16);
}

/**
 * The base64 payload for the given keys — only the ones the plan uses.
 *
 * @param {string[]} keys
 * @returns {Object<string, {mime: string, b64: string, bytes: number}>}
 */
function payloadFor(keys) {
  const out = {};
  for (const key of keys) {
    const src = sourceOf(key);
    const bytes = fs.readFileSync(src.path);
    out[key] = {
      mime: src.mime,
      b64: bytes.toString('base64'),
      bytes: bytes.length,
    };
  }
  return out;
}

module.exports = {
  ASSETS,
  LOCAL,
  GENERATED,
  IMAGES,
  DERIV,
  BUILD,
  verify,
  resizeJobs,
  sourceOf,
  fingerprintOf,
  payloadFor,
  registeredCovers,
  icons,
};

if (require.main === module) {
  verify();
  const all = payloadFor([...Object.keys(ASSETS), ...Object.keys(LOCAL)]);
  let total = 0;
  for (const k of Object.keys(all)) total += all[k].bytes;
  console.log(
    'media registry OK — ' + Object.keys(all).length + ' assets, ' +
      Math.round(total / 1024) + ' KB raw, ' +
      Math.round(Object.keys(all).reduce((n, k) => n + all[k].b64.length, 0) / 1024) +
      ' KB as base64',
  );
  for (const k of Object.keys(all)) {
    console.log('  ' + k.padEnd(14) + path.basename(sourceOf(k).path).padEnd(22) + all[k].bytes + ' B');
  }
}
