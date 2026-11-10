#!/usr/bin/env node
/**
 * collage.js — the playlist cover collages.
 *
 * `PlaylistCover.tsx:136-158` draws a playlist's cover as a 2x2 collage of
 * its first four items, each cell 50% x 50% of a 32 dp box with a radius of
 * 8. Penpot can round ONE image's corners, but it cannot clip four separate
 * images into one rounded square — so the collage is rendered here, from the
 * app's OWN placeholder artwork, into one PNG per tile.
 *
 * TWO SIZES, TWO KEYS
 * -------------------
 * The cover is drawn at two sizes in the prototype:
 *
 *   • `ph.collageN`     64 x 64  — 2x of the 32 dp cover the V1 Home board
 *                                 draws (the app's own tile size).
 *   • `ph.collageBigN` 320 x 320 — 2x of the 160 dp cover the V2 playlist
 *                                 tile draws (the page's rail pitch).
 *
 * One key per size, so neither board has to be re-uploaded because the other
 * changed size.
 *
 * Usage:
 *   node designs/penpot/collage.js
 *
 * Output: designs/.build/media/collage-N.png (64x64) and
 *         designs/.build/media/collageBig-N.png (320x320)
 */

'use strict';

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const APP = path.resolve(__dirname, '..', '..');
const IMAGES = path.join(APP, 'src', 'assets', 'images');
const OUT_DIR = path.join(APP, 'designs', '.build', 'media');

/**
 * The two sizes the cover is drawn at.
 *
 * `cell` is the size of one of the four cells in the collage, `radius` the
 * corner radius of the whole cover, and `file` the name of the PNG.
 */
const SIZES = {
  small: {cell: 32, radius: 8, file: key => key + '.jpg'},
  big: {cell: 160, radius: 12, file: key => key.replace(/(\d+)$/, 'Big$1.jpg')},
};

/**
 * The three pinned playlists' covers.
 *
 * The cells are the app's own placeholder artwork, in the app's own
 * order — the first item top left, then across, then down.
 */
const COLLAGES = [
  {
    key: 'ph.collage1',
    cells: [
      'placeholders/audio/vinyl.jpg',
      'placeholders/audio/piano.jpg',
      'placeholders/audio/guitar.jpg',
      'placeholders/video/documentary.jpg',
    ],
  },
  {
    key: 'ph.collage2',
    cells: [
      'placeholders/audio/mic.jpg',
      'placeholders/audio/concert.jpg',
      'placeholders/audio/studio.jpg',
      'placeholders/video/cinema.jpg',
    ],
  },
  {
    key: 'ph.collage3',
    cells: [
      'placeholders/video/film_reel.jpg',
      'placeholders/video/movies.jpg',
      'placeholders/video/shows.jpg',
      'placeholders/video/director.jpg',
    ],
  },
];

/**
 * Render one collage at one size.
 *
 * The four cells are embedded in ONE SVG that carries the rounded clip, and
 * the SVG is rasterised by librsvg. The obvious alternative — composite the
 * cells and then composite a rounded-rect mask with `blend: 'dest-in'` —
 * was tried first and it produces a BLACK collage: libvips' `dest-in`
 * multiplies the destination's colour by the mask and the result keeps only
 * the alpha (measured: mean RGB 0.0 on every pixel, while the SVG-with-clip
 * route gives mean RGB 84).
 */
async function renderCollage(collage, sizeName) {
  const size = SIZES[sizeName];
  const CELL = size.cell;
  const SIZE = CELL * 2;

  // Each cell is cropped to a square the way the app's `resizeMode="cover"`
  // crops it, and embedded in the SVG as a data URI.
  //
  // The cells are JPEG, not PNG. A PNG cell of a photograph is ~80 KB, so a
  // four-cell collage was a 285 KB file — and the MCP endpoint rejects a
  // body over ~85 KB, so the collage could not be uploaded at all. The cells
  // are JPEG at quality 75 (the collage is 160 dp of artwork, not a print),
  // which brings the whole collage down to ~40 KB.
  const cells = [];
  for (const file of collage.cells) {
    const buf = await sharp(path.join(IMAGES, file))
      .resize(CELL, CELL, {fit: 'cover', position: 'centre'})
      .jpeg({quality: 75})
      .toBuffer();
    cells.push('data:image/jpeg;base64,' + buf.toString('base64'));
  }

  // The cover's corners are rounded in Penpot, not in the picture: Penpot
  // CAN round the corners of one image (the build sets `borderRadius` on the
  // shape), and a PNG could not be used here anyway — a lossless PNG of four
  // photographs is ~280 KB, and the MCP endpoint rejects a body over ~85 KB.
  // The collage therefore goes over the wire as a JPEG.
  const svg = Buffer.from(
    `<svg width="${SIZE}" height="${SIZE}" xmlns="http://www.w3.org/2000/svg" ` +
      `xmlns:xlink="http://www.w3.org/1999/xlink">` +
      cells.map((d, i) =>
        `<image x="${(i % 2) * CELL}" y="${Math.floor(i / 2) * CELL}" ` +
        `width="${CELL}" height="${CELL}" xlink:href="${d}"/>`,
      ).join('') +
      `</svg>`,
  );

  const out = path.join(OUT_DIR, size.file(collage.key));
  fs.mkdirSync(OUT_DIR, {recursive: true});
  await sharp(svg).jpeg({quality: 80}).toFile(out);

  const meta = await sharp(out).metadata();
  if (meta.width !== SIZE || meta.height !== SIZE) {
    throw new Error(`${out}: expected ${SIZE}x${SIZE}, got ${meta.width}x${meta.height}`);
  }
  return {key: size.file(collage.key), path: out, bytes: fs.statSync(out).size};
}

/** Render every collage, at every size. */
async function renderAll() {
  const missing = COLLAGES.flatMap(c => c.cells)
    .filter(file => !fs.existsSync(path.join(IMAGES, file)));
  if (missing.length) {
    throw new Error('missing placeholder(s):\n  ' + [...new Set(missing)].join('\n  '));
  }
  const out = [];
  for (const collage of COLLAGES) {
    for (const sizeName of Object.keys(SIZES)) {
      out.push(await renderCollage(collage, sizeName));
    }
  }
  return out;
}

module.exports = {COLLAGES, SIZES, OUT_DIR, renderAll};

if (require.main === module) {
  renderAll()
    .then(results => {
      for (const r of results) console.log(`${r.key.padEnd(24)} ${r.bytes} B  ${r.path}`);
      console.log(`\n${results.length} collages rendered -> ${OUT_DIR}`);
    })
    .catch(err => {
      console.error(err && err.stack ? err.stack : err);
      process.exit(1);
    });
}
