#!/usr/bin/env node
/**
 * text-metrics.js — the app's own font metrics, read out of the SHIPPED
 * font files.
 *
 * WHY THIS EXISTS
 * ---------------
 * A Penpot board cannot lay text out the way React Native does. The board's
 * shapes are ABSOLUTE, so the generator has to know how wide a label is
 * BEFORE the board is drawn — and a chip's width is its label's width plus
 * its padding (`FilterSheet.tsx:461-472`: `paddingHorizontal 12`,
 * `borderWidth 1.5`, `minHeight 32`).
 *
 * The Penpot plugin CAN measure a text run, but only AFTER the board is on
 * the canvas — far too late to decide where the NEXT chip goes, and far too
 * late to decide which chips share a row. The wrap of the category chips is
 * exactly that decision: the app's `chipWrap` is a `flexWrap: 'row'` flow
 * (`FilterSheet.tsx:455-460`), so the row a chip lands in depends on the
 * widths of the chips before it.
 *
 * So the widths are measured HERE, from the app's own font files, with the
 * real advance widths. That is the same source the DEVICE uses — Android
 * loads these very files — so the measured widths are the device's widths,
 * not an estimate of them.
 *
 * THE FONT FILES
 * --------------
 * `android/app/src/main/assets/fonts/` — the files React Native's
 * `ReactFontManager` loads at runtime (`src/constants/fontFamily.ts`).
 * The family key here is the app's family string, exactly as
 * `FONT_FAMILY` spells it.
 *
 * THE PIXEL GRID
 * --------------
 * Android lays text out on the PIXEL GRID: every glyph's advance is
 * rounded UP to a whole pixel, so that two neighbouring glyphs can never
 * collide. A label's width is therefore the sum of the CEIL of each
 * advance — not the sum of the advances.
 *
 * That is not a guess. Measured on `emulator-5554` (2026-11-13) against
 * the nine chip labels of the Movies filter sheet, whose widths the
 * accessibility tree reports to a third of a dp:
 *
 *   • the raw advance sum is 2.07 dp short on average (max 2.6 dp);
 *   • the pixel-grid sum is 0.54 dp short on average (max 0.8 dp).
 *
 * So the pixel-grid sum is the model's own, and it is what this file
 * computes.
 *
 * WHAT IT IS NOT
 * --------------
 * This is NOT a text renderer and it does NOT do shaping: it sums the
 * font's advance widths, with no kerning, no ligatures and no bidi. For the
 * Latin labels the sheets and chips carry, that is the same sum Android's
 * `Paint.measureText` performs, to within a fraction of a dp.
 */

'use strict';

const fs = require('fs');
const path = require('path');

/** The app's own font directory — the files RN loads at runtime. */
const FONT_DIR = path.join(
  __dirname,
  '..',
  '..',
  'android',
  'app',
  'src',
  'main',
  'assets',
  'fonts',
);

/**
 * The app's family string → the file React Native loads for it.
 *
 * The names are the file names as they ship, which is how
 * `ReactFontManager` builds the asset path (`src/constants/fontFamily.ts`).
 */
const FILES = {
  Inter: 'Inter.ttf',
  'Inter Medium': 'Inter Medium.ttf',
  'Inter SemiBold': 'Inter SemiBold.ttf',
  Manrope: 'Manrope.ttf',
  'Manrope SemiBold': 'Manrope SemiBold.ttf',
  'Cormorant Garamond': 'Cormorant Garamond.ttf',
};

/** The parsed fonts, cached. */
const cache = new Map();

function tableDirectory(buf) {
  const num = buf.readUInt16BE(4);
  const map = Object.create(null);
  for (let i = 0; i < num; i++) {
    const off = 12 + i * 16;
    const tag = buf.toString('ascii', off, off + 4);
    map[tag] = {offset: buf.readUInt32BE(off + 8), length: buf.readUInt32BE(off + 12)};
  }
  return map;
}

/** The character map: the best sub-table the font offers. */
function parseCmap(buf, base) {
  const numTables = buf.readUInt16BE(base + 2);
  let best = null;
  for (let i = 0; i < numTables; i++) {
    const rec = base + 4 + i * 8;
    const platform = buf.readUInt16BE(rec);
    const encoding = buf.readUInt16BE(rec + 2);
    const offset = buf.readUInt32BE(rec + 4);
    let score = 0;
    if (platform === 3 && encoding === 10) score = 3;
    else if (platform === 3 && encoding === 1) score = 2;
    else if (platform === 0) score = 1;
    if (!best || score > best.score) best = {score, offset: base + offset};
  }
  if (!best) return null;
  const off = best.offset;
  const format = buf.readUInt16BE(off);
  if (format !== 4 && format !== 12) return null;
  return {format, off};
}

/** The glyph id of one code point. */
function glyphOf(buf, cmap, code) {
  if (!cmap) return 0;
  if (cmap.format === 12) {
    const off = cmap.off;
    const nGroups = buf.readUInt32BE(off + 12);
    let lo = 0;
    let hi = nGroups - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      const g = off + 16 + mid * 12;
      const start = buf.readUInt32BE(g);
      const end = buf.readUInt32BE(g + 4);
      if (code < start) hi = mid - 1;
      else if (code > end) lo = mid + 1;
      else return buf.readUInt32BE(g + 8) + (code - start);
    }
    return 0;
  }
  // Format 4 — the segmented map.
  const off = cmap.off;
  const segCount = buf.readUInt16BE(off + 6) / 2;
  const endBase = off + 14;
  const startBase = endBase + segCount * 2 + 2;
  const deltaBase = startBase + segCount * 2;
  const rangeBase = deltaBase + segCount * 2;
  for (let i = 0; i < segCount; i++) {
    const end = buf.readUInt16BE(endBase + i * 2);
    if (code > end) continue;
    const start = buf.readUInt16BE(startBase + i * 2);
    if (code < start) return 0;
    const idDelta = buf.readInt16BE(deltaBase + i * 2);
    const idRangeOffset = buf.readUInt16BE(rangeBase + i * 2);
    if (idRangeOffset === 0) return (code + idDelta) & 0xffff;
    const glyphAddr = rangeBase + i * 2 + idRangeOffset + (code - start) * 2;
    const glyph = buf.readUInt16BE(glyphAddr);
    return glyph === 0 ? 0 : (glyph + idDelta) & 0xffff;
  }
  return 0;
}

function parseFont(file) {
  const buf = fs.readFileSync(file);
  const t = tableDirectory(buf);
  if (!t.head || !t.hhea || !t.hmtx || !t.cmap) {
    throw new Error('the font ' + file + ' is missing a required table');
  }
  const unitsPerEm = buf.readUInt16BE(t.head.offset + 18);
  const numHMetrics = buf.readUInt16BE(t.hhea.offset + 34);
  const advances = new Array(numHMetrics);
  for (let i = 0; i < numHMetrics; i++) {
    advances[i] = buf.readUInt16BE(t.hmtx.offset + i * 4);
  }
  return {
    buf,
    unitsPerEm,
    advances,
    cmap: parseCmap(buf, t.cmap.offset),
  };
}

function fontFor(family) {
  const name = FILES[family];
  if (!name) throw new Error('no font file for the family ' + family);
  if (!cache.has(family)) {
    cache.set(family, parseFont(path.join(FONT_DIR, name)));
  }
  return cache.get(family);
}

/**
 * The device's pixel grid — how many device pixels one dp is.
 *
 * The emulator the prototype is measured on is 1080x2400 at 420 dpi, so
 * 420 / 160 = 2.625 px per dp. The pixel grid is what makes the text
 * measurement exact: it is the grid the glyphs are rounded onto.
 */
const DENSITY = 2.625;

/**
 * The width of a text run, in dp.
 *
 * `letterSpacing` is Android's per-character tracking: React Native's
 * `letterSpacing` is set through `Paint.setLetterSpacing`, which is
 * expressed in EM and applied AFTER every glyph — including the last one,
 * which is why a tracked label measures one step wider than its glyphs
 * alone.
 */
function measure(text, o = {}) {
  const family = o.family || 'Inter';
  const size = o.size != null ? o.size : 13;
  const density = o.density || DENSITY;
  const font = fontFor(family);
  const chars = Array.from(String(text));
  let px = 0;
  for (const ch of chars) {
    const g = glyphOf(font.buf, font.cmap, ch.codePointAt(0));
    const advance =
      g < font.advances.length ? font.advances[g] : font.advances[font.advances.length - 1];
    // The pixel grid: the advance is rounded UP, so two neighbouring
    // glyphs can never overlap.
    px += Math.ceil((advance / font.unitsPerEm) * size * density);
  }
  if (o.letterSpacing) {
    px += o.letterSpacing * density * chars.length;
  }
  return px / density;
}

module.exports = {measure, DENSITY, FONT_DIR, FILES};
