/// <reference types="node" />
/**
 * The lockup tagline — ONE owner for one brand line.
 *
 * ## Why this is pinned
 *
 * The Splash and the Login draw the same brand lockup: the lion, the
 * wordmark "Simba", and the tagline "Your media, your way". The tagline
 * was the one part of that lockup each screen owned for itself — and the
 * Splash's copy did not fit on the screen.
 *
 * Measured on the real font file — the advance widths Android lays the
 * line out from, not an estimate:
 *
 *   Cormorant Garamond Bold 48/56   ->  414.6 dp wide
 *   usable width on a 411 dp screen  ->  347 dp  (411 - 2 x 32 padding)
 *
 * so the Splash's tagline wrapped onto two lines inside the lockup. The
 * Login's copy — Cormorant Garamond Italic 22/28 — measures 182.8 dp:
 * one line, and quiet enough to sit under the name.
 *
 * The rules these tests pin:
 *
 *   1. the tagline's type has exactly one owner (`LOCKUP_TAGLINE`);
 *   2. it fits on one line on the narrowest phone the app runs on;
 *   3. the face it asks for is a font file that actually ships;
 *   4. no lockup screen may declare its own tagline type again.
 *
 * Point 4 is the interesting one: a per-screen copy of the type looks
 * exactly like a correct one at the call site. That is how the Splash
 * ended up with a 48 px bold serif the Login had never had.
 */

import {existsSync, readFileSync, readdirSync, statSync} from 'fs';
import {join} from 'path';

import {BRAND, LOCKUP_TAGLINE} from '../../src/constants/brand';
import {FONT_FAMILY} from '../../src/constants/fontFamily';

const APP_ROOT = join(__dirname, '..', '..');
const SRC_ROOT = join(APP_ROOT, 'src');
const FONT_DIR = join(APP_ROOT, 'android', 'app', 'src', 'main', 'assets', 'fonts');

/** The narrowest phone width the app runs on, and the lockup's own inset. */
const MIN_SCREEN_DP = 360;
const LOCKUP_PADDING_DP = 32;
/** The width the tagline has to live in, on the narrowest phone. */
const USABLE_DP = MIN_SCREEN_DP - LOCKUP_PADDING_DP * 2;

/**
 * The rendered advance width of a string in a TTF.
 *
 * Android lays text out from the font's own advance widths (the `hmtx`
 * table), scaled by the font size, plus the letter spacing it is given.
 * Reading those numbers out of the shipped file is what turns "the
 * tagline looks too wide" into a measurement.
 */
const textWidth = (file: string, text: string, fontSize: number, letterSpacing = 0): number => {
  const buf = readFileSync(file);
  const numTables = buf.readUInt16BE(4);
  const tables: Record<string, {offset: number}> = {};
  for (let i = 0; i < numTables; i++) {
    const rec = 12 + i * 16;
    tables[buf.toString('ascii', rec, rec + 4)] = {offset: buf.readUInt32BE(rec + 8)};
  }

  const unitsPerEm = buf.readUInt16BE(tables.head.offset + 18);
  const numberOfHMetrics = buf.readUInt16BE(tables.hhea.offset + 34);
  const advances: number[] = [];
  for (let i = 0; i < numberOfHMetrics; i++) {
    advances.push(buf.readUInt16BE(tables.hmtx.offset + i * 4));
  }

  // cmap: prefer (3,10), then (3,1), then any Unicode subtable.
  const cmap = tables.cmap.offset;
  const encoders = buf.readUInt16BE(cmap + 2);
  let sub: {off: number; format: number} | null = null;
  let best = -1;
  for (let i = 0; i < encoders; i++) {
    const rec = cmap + 4 + i * 8;
    const platform = buf.readUInt16BE(rec);
    const encoding = buf.readUInt16BE(rec + 2);
    const off = cmap + buf.readUInt32BE(rec + 4);
    const format = buf.readUInt16BE(off);
    const score =
      platform === 3 && encoding === 10 && format === 12 ? 3 :
      platform === 3 && encoding === 1 && format === 4 ? 2 :
      platform === 0 ? 1 : 0;
    if (score > best) {
      best = score;
      sub = {off, format};
    }
  }
  if (!sub) {
    throw new Error(`no usable cmap subtable in ${file}`);
  }

  /** A 16-bit wrap, without the bitwise operators the linter forbids. */
  const wrap16 = (n: number): number => ((n % 65536) + 65536) % 65536;

  const glyphFor = (codePoint: number): number => {
    if (sub!.format === 12) {
      const groups = buf.readUInt32BE(sub!.off + 12);
      for (let g = 0; g < groups; g++) {
        const rec = sub!.off + 16 + g * 12;
        const start = buf.readUInt32BE(rec);
        const end = buf.readUInt32BE(rec + 4);
        if (codePoint >= start && codePoint <= end) {
          return buf.readUInt32BE(rec + 8) + (codePoint - start);
        }
      }
      return 0;
    }
    const segCountX2 = buf.readUInt16BE(sub!.off + 6);
    const segCount = segCountX2 / 2;
    const endBase = sub!.off + 14;
    const startBase = endBase + segCountX2 + 2;
    const deltaBase = startBase + segCountX2;
    const rangeBase = deltaBase + segCountX2;
    for (let s = 0; s < segCount; s++) {
      const end = buf.readUInt16BE(endBase + s * 2);
      if (codePoint > end) {
        continue;
      }
      const start = buf.readUInt16BE(startBase + s * 2);
      if (codePoint < start) {
        return 0;
      }
      const delta = buf.readInt16BE(deltaBase + s * 2);
      const rangeOffset = buf.readUInt16BE(rangeBase + s * 2);
      if (rangeOffset === 0) {
        return wrap16(codePoint + delta);
      }
      const gi = rangeBase + s * 2 + rangeOffset + (codePoint - start) * 2;
      return wrap16(buf.readUInt16BE(gi) + delta);
    }
    return 0;
  };

  let units = 0;
  let count = 0;
  for (const ch of text) {
    const glyph = glyphFor(ch.codePointAt(0)!);
    units += glyph < advances.length ? advances[glyph] : advances[advances.length - 1];
    count++;
  }
  // Android adds the letter spacing after every character, the last one
  // included.
  return (units / unitsPerEm) * fontSize + letterSpacing * count;
};

/** Every `.ts`/`.tsx` file under `src/`, recursively. */
const sourceFiles = (dir: string = SRC_ROOT): string[] => {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...sourceFiles(full));
    } else if (/\.tsx?$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
};

/** The body of a `name: { … }` style entry, by brace matching. */
const styleBody = (text: string, name: string): string | null => {
  const at = text.indexOf(`${name}: {`);
  if (at < 0) {
    return null;
  }
  let depth = 0;
  for (let i = at + name.length + 1; i < text.length; i++) {
    if (text[i] === '{') {
      depth++;
    } else if (text[i] === '}') {
      depth--;
      if (depth === 0) {
        return text.slice(at + name.length + 2, i);
      }
    }
  }
  return null;
};

describe('the lockup tagline', () => {
  it('has one owner, and that owner is the brand constants', () => {
    expect(LOCKUP_TAGLINE.fontFamily).toBe(FONT_FAMILY.cormorant.italic);
    expect(LOCKUP_TAGLINE.fontStyle).toBe('italic');
    // 400 + italic is the shipped `Cormorant Garamond_italic.ttf`.
    // 700 + italic would ask for a file that does not exist, and RN would
    // fall back to the system font without a word.
    expect(LOCKUP_TAGLINE.fontWeight).toBe('400');
    expect(LOCKUP_TAGLINE.fontSize).toBe(22);
    expect(LOCKUP_TAGLINE.lineHeight).toBe(28);
    expect(LOCKUP_TAGLINE.letterSpacing).toBe(0.4);
    expect(LOCKUP_TAGLINE.textAlign).toBe('center');
  });

  it('keeps the line on one line on the narrowest phone', () => {
    const width = textWidth(
      join(FONT_DIR, 'Cormorant Garamond_italic.ttf'),
      BRAND.tagline,
      LOCKUP_TAGLINE.fontSize as number,
      LOCKUP_TAGLINE.letterSpacing as number,
    );
    // The measured width is 182.8 dp — comfortably inside the 296 dp the
    // narrowest phone leaves between the lockup's own padding.
    expect(width).toBeGreaterThan(150);
    expect(width).toBeLessThanOrEqual(USABLE_DP);
  });

  it('pins the defect it replaced — the bold display face did not fit', () => {
    // The Splash set the tagline in the `displaySerif` token: Cormorant
    // Garamond Bold at 48/56. Measured, that line is 414.6 dp against
    // 347 dp of usable width on a 411 dp screen — two lines.
    const bold = textWidth(
      join(FONT_DIR, 'Cormorant Garamond_bold.ttf'),
      BRAND.tagline,
      48,
    );
    expect(bold).toBeGreaterThan(347);
    expect(bold).toBeGreaterThan(USABLE_DP);
  });

  it('asks for a face that is actually shipped', () => {
    // RN opens ONE exact path: "fonts/" + family + style suffix + ".ttf".
    const family = LOCKUP_TAGLINE.fontFamily as string;
    const weight = Number(LOCKUP_TAGLINE.fontWeight);
    const suffix = LOCKUP_TAGLINE.fontStyle === 'italic' ? (weight >= 700 ? '_bold_italic' : '_italic') : '';
    const file = `${family}${suffix}.ttf`;
    expect(existsSync(join(FONT_DIR, file))).toBe(true);
  });

  it('gives every lockup screen the same tagline, and no screen its own', () => {
    const lockupScreens = sourceFiles().filter(file => readFileSync(file, 'utf8').includes('BRAND.tagline'));
    expect(lockupScreens.length).toBeGreaterThan(0);

    for (const file of lockupScreens) {
      const text = readFileSync(file, 'utf8');
      const rel = file.slice(APP_ROOT.length + 1);
      // The type comes from the shared owner …
      expect(text).toContain('LOCKUP_TAGLINE');
      // … and the screen declares no tagline type of its own.
      const body = styleBody(text, 'tagline');
      if (body !== null) {
        expect(body).not.toMatch(/font(Size|Family|Weight|Style)\s*:/);
      }
    }
  });
});
