#!/usr/bin/env node
/**
 * measure-lockup.js — measures the lockup inside the gold orb.
 *
 * The orb is a CIRCLE, so the clearance from the content to the edge is not
 * a margin: it depends on where the ink sits. A two-line tagline can look
 * fine at the top of the circle and crowd the arc at the bottom.
 *
 * This finds every ink band inside the circle and reports, for each one:
 *   - the ink's bounding box
 *   - the minimum clearance from any ink pixel to the arc
 *
 * Ink is "darker than the orb's own wash": the parchment (245,240,232) and
 * the gold tint the orb paints over it are not content, and the circle's
 * antialiased edge blends between the two.
 *
 * The same script measures a FigCraft render and a device screenshot, so the
 * design and the app can be compared with ONE ruler.
 *
 * Usage:
 *   node designs/measure-lockup.js <png> <centreX> <centreY> <radius> [scale]
 *
 *   <png>      the render or the screenshot (device pixels)
 *   <scale>    device pixels per dp — 1 for a FigCraft render, 2.6277 for
 *              the 1080x2400 emulator capture at 420dpi (1080 / 411 dp)
 *
 * The orb's geometry comes from the app:
 *   ORB_SIZE  = min(width * 0.72, 320) = 295.92 dp, drawn at the pulse peak
 *               (scale 1.12) it is 331.43 dp across and is centred on the
 *               logo stack, whose top edge sits at 220.04 dp.
 *   centre = (205.5, 368.0), radius = 165.72 dp at the peak,
 *            147.96 dp at rest.
 */

'use strict';

const path = require('path');
const sharp = require(path.join(__dirname, '..', 'node_modules/sharp'));

const FILE = process.argv[2];
const CX = Number(process.argv[3]);
const CY = Number(process.argv[4]);
const R = Number(process.argv[5]);
const SCALE = Number(process.argv[6] || 1);
const INK_MAX = Number(process.argv[7] || 600); // rgb sum below this = ink

async function main() {
  const {data, info} = await sharp(FILE).ensureAlpha().raw().toBuffer({resolveWithObject: true});
  const at = (xd, yd) => {
    const x = Math.round(xd * SCALE);
    const y = Math.round(yd * SCALE);
    if (x < 0 || y < 0 || x >= info.width || y >= info.height) return null;
    const o = (y * info.width + x) * info.channels;
    return [data[o], data[o + 1], data[o + 2]];
  };

  // collect the ink pixels inside the circle
  const rows = [];
  for (let y = Math.floor(CY - R); y <= Math.ceil(CY + R); y += 0.25) {
    const row = [];
    for (let x = Math.floor(CX - R); x <= Math.ceil(CX + R); x += 0.25) {
      const c = at(x, y);
      if (!c) continue;
      if (c[0] + c[1] + c[2] > INK_MAX) continue;
      row.push(x);
    }
    if (row.length) rows.push({y, minX: row[0], maxX: row[row.length - 1]});
  }
  if (!rows.length) {
    console.log('no ink found in ' + FILE);
    return;
  }

  // group consecutive rows into bands (a gap of 4dp starts a new band)
  const bands = [];
  let cur = null;
  let prevY = null;
  for (const r of rows) {
    if (cur && r.y - prevY <= 4) {
      cur.y1 = r.y;
      cur.minX = Math.min(cur.minX, r.minX);
      cur.maxX = Math.max(cur.maxX, r.maxX);
    } else {
      cur = {y0: r.y, y1: r.y, minX: r.minX, maxX: r.maxX};
      bands.push(cur);
    }
    prevY = r.y;
  }

  console.log('--- lockup: ' + path.basename(FILE) + ' ---');
  console.log('  orb: centre (' + CX + ', ' + CY + ')  r=' + R + '  scale=' + SCALE);
  bands.forEach((b, i) => {
    let minClear = Infinity;
    let at0 = null;
    for (let y = b.y0; y <= b.y1; y += 0.25) {
      for (let x = b.minX; x <= b.maxX; x += 0.25) {
        const c = at(x, y);
        if (!c || c[0] + c[1] + c[2] > INK_MAX) continue;
        const clear = R - Math.hypot(x - CX, y - CY);
        if (clear < minClear) {
          minClear = clear;
          at0 = [x.toFixed(1), y.toFixed(1)];
        }
      }
    }
    console.log(
      '  band ' + i +
        '  y ' + b.y0.toFixed(1).padStart(6) + ' .. ' + b.y1.toFixed(1).padStart(6) +
        '  x ' + b.minX.toFixed(1).padStart(6) + ' .. ' + b.maxX.toFixed(1).padStart(6) +
        '  (w ' + (b.maxX - b.minX).toFixed(1).padStart(6) + ')' +
        '  minClear ' + minClear.toFixed(1).padStart(6) +
        (at0 ? '  at (' + at0[0] + ', ' + at0[1] + ')' : ''),
    );
  });

  // the air above the first ink and below the last, measured against the
  // circle's own top and bottom — this is the lockup's vertical balance
  const first = bands[0];
  const last = bands[bands.length - 1];
  const topAir = first.y0 - (CY - R);
  const bottomAir = CY + R - last.y1;
  console.log(
    '  air: above ' + topAir.toFixed(1) + '  below ' + bottomAir.toFixed(1) +
      '   (difference ' + (bottomAir - topAir).toFixed(1) + ')',
  );
  // the gaps between the elements, in ink
  for (let i = 1; i < bands.length; i++) {
    console.log(
      '  gap ' + (i - 1) + '->' + i + ': ' + (bands[i].y0 - bands[i - 1].y1).toFixed(1) + ' dp',
    );
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
