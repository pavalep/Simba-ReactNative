#!/usr/bin/env node
/**
 * check-font-resolution.js
 *
 * Proves that every font usage in `src/` resolves to a font file that is
 * actually shipped in the Android bundle.
 *
 * WHY THIS EXISTS
 * React Native resolves an asset font on Android by opening ONE exact path:
 *
 *     "fonts/" + <fontFamily> + <styleSuffix> + <fileExtension>
 *
 *   - <fontFamily> is the `fontFamily` string, used verbatim
 *   - <styleSuffix> is "" | "_bold" | "_italic" | "_bold_italic", chosen
 *     by the weight: `weight < 700` -> "" / "_italic", `weight >= 700` ->
 *     "_bold" / "_bold_italic"
 *   - <fileExtension> is ".ttf" then ".otf"
 *
 * If that file is missing, RN falls back to the SYSTEM font, silently.
 * See ReactFontManager.kt:138-144, :162-178, :187.
 *
 * So this script resolves every usage the way RN does and fails when a
 * usage would fall back to the system font.
 *
 * WHAT IT RESOLVES — the 78-tag gap (closed 2026-11-17)
 * -----------------------------------------------------
 * The gate used to read a text tag's style from only TWO shapes:
 *
 *     style={styles.NAME}     an exact reference
 *     style={{ ... }}          an inline object literal
 *
 * and it read style objects only from the file being scanned. So three
 * whole families of usage were invisible:
 *
 *   • the ARRAY form — `style={[styles.a, styles.b]}` — where RN flattens
 *     the elements and the LAST font property wins;
 *   • the CONDITIONAL form — `style={cond ? styles.a : styles.b}` — where
 *     the user sees ONE of the two;
 *   • a screen whose `styles` come from `../styles/index.ts` — the styles
 *     module is a DIFFERENT file, so the gate resolved NOTHING for it and
 *     audited the tag with the variant's default font instead of its own.
 *
 * Measured on 2026-11-17: of 660 text tags in src/, the old gate resolved
 * 582 with the tag's REAL font and 78 with the variant's default instead —
 * a wrong font, audited as if it were right. (The gate reported "671 usages"
 * and "every usage resolves", so the blind spot was invisible in the output
 * too: it counted the tags it got wrong as if it had checked them.)
 *
 * The gate now resolves EVERY style a tag can carry:
 *   • the style prop's shape is parsed — array, conditional, or single — and
 *     RN's flattening rule is applied (later elements win);
 *   • a style module IMPORTED by the file is parsed too, so a screen's real
 *     styles are read from the module that declares them;
 *   • every branch of a conditional is resolved, because at runtime one of
 *     them is what the user actually sees;
 *   • a style array is MERGED in order, not checked element by element —
 *     `style={[styles.serif, {fontWeight:'700'}]}` is ONE font (the serif at
 *     bold), and checking the elements separately would ask for a serif
 *     regular that the app never renders.
 *
 * The report is honest: it says how many tags it resolved and how many it
 * could not resolve, and it fails if ANY resolved font would fall back.
 *
 * Usage:  node scripts/check-font-resolution.js
 * Exit:   0 = every usage resolves · 1 = at least one usage falls back
 */

'use strict';

const fs = require('fs');
const path = require('path');

const APP = path.resolve(__dirname, '..');
const SRC = path.join(APP, 'src');
const ASSETS = path.join(APP, 'android/app/src/main/assets/fonts');

// ── 1. read the family strings out of fontFamily.ts ────────────────────────
/** Replace comment bodies with spaces, keeping every newline, so offsets
 *  (and therefore line numbers) stay exact. */
function stripComments(text) {
  let out = '';
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    if (ch === '/' && text[i + 1] === '/') {
      while (i < text.length && text[i] !== '\n') {
        out += ' ';
        i++;
      }
      continue;
    }
    if (ch === '/' && text[i + 1] === '*') {
      while (i < text.length && !(text[i] === '*' && text[i + 1] === '/')) {
        out += text[i] === '\n' ? '\n' : ' ';
        i++;
      }
      out += '  ';
      i += 2;
      continue;
    }
    out += ch;
    i++;
  }
  return out;
}

function parseFontFamilies() {
  const raw = fs.readFileSync(path.join(SRC, 'constants/fontFamily.ts'), 'utf8');
  const text = stripComments(raw);
  const start = text.indexOf('export const FONT_FAMILY = {');
  if (start < 0) throw new Error('FONT_FAMILY not found in fontFamily.ts');
  const open = text.indexOf('{', start);
  let depth = 0;
  let end = -1;
  for (let i = open; i < text.length; i++) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}') {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  const block = text.slice(open + 1, end);
  const map = {};
  const path_ = [];
  let pendingKey = null;
  const re = /([A-Za-z_][A-Za-z0-9_]*)\s*:|'([^']*)'|([{}])/g;
  let m;
  while ((m = re.exec(block)) !== null) {
    if (m[1] !== undefined) {
      pendingKey = m[1];
    } else if (m[2] !== undefined) {
      if (pendingKey) map[path_.concat(pendingKey).join('.')] = m[2];
      pendingKey = null;
    } else if (m[3] === '{') {
      path_.push(pendingKey);
      pendingKey = null;
    } else {
      path_.pop();
      pendingKey = null;
    }
  }
  return map;
}

// ── 2. read the typography tokens out of tokens.ts ─────────────────────────
function parseTokens() {
  const text = fs.readFileSync(path.join(SRC, 'theme/tokens.ts'), 'utf8');
  const start = text.indexOf('export const typography: TypographyTokens = {');
  if (start < 0) throw new Error('typography tokens not found in tokens.ts');
  const open = text.indexOf('{', start);
  let depth = 0;
  let end = -1;
  for (let i = open; i < text.length; i++) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}') {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  const block = text.slice(open + 1, end);
  const tokens = {};
  const re = /([A-Za-z_][A-Za-z0-9_]*)\s*:\s*\{([^}]*)\}/g;
  let m;
  while ((m = re.exec(block)) !== null) {
    const body = m[2];
    const fam = /fontFamily:\s*FONT_FAMILY\.([A-Za-z0-9_.]+)/.exec(body);
    const wt = /fontWeight:\s*'(\d+)'/.exec(body);
    if (fam) {
      tokens[m[1]] = {
        familyKey: fam[1],
        weight: wt ? wt[1] : '400',
        style: /fontStyle:\s*'italic'/.test(body) ? 'italic' : 'normal',
      };
    }
  }
  return tokens;
}

// ── 3. RN's own resolution rule ────────────────────────────────────────────
function assetPath(family, weight, style) {
  let suffix = '';
  if (style === 'italic') {
    suffix = Number(weight) >= 700 ? '_bold_italic' : '_italic';
  } else if (Number(weight) >= 700) {
    suffix = '_bold';
  }
  return 'fonts/' + family + suffix + '.ttf';
}

/**
 * The ACTUAL weight of a shipped TTF, read out of its OS/2 table
 * (`usWeightClass`, offset 4 of the table).
 *
 * This is what makes the second class of finding possible. A file can EXIST
 * and still be the wrong face: `'Inter'` + `fontWeight: '600'` resolves to
 * `fonts/Inter.ttf`, which exists — and is the 400 Regular. The weight the
 * author asked for is silently gone, and the text renders lighter than the
 * design says. The file's own name table is the only honest source for what
 * it is; the file NAME is not (the family string and the file's weight are
 * separate facts).
 */
function ttfWeightClass(file) {
  let buf;
  try {
    buf = fs.readFileSync(file);
  } catch (e) {
    return null;
  }
  if (buf.length < 12) return null;
  const numTables = buf.readUInt16BE(4);
  for (let i = 0; i < numTables; i++) {
    const rec = 12 + i * 16;
    if (rec + 16 > buf.length) return null;
    const tag = buf.toString('ascii', rec, rec + 4);
    if (tag === 'OS/2') {
      const off = buf.readUInt32BE(rec + 8);
      if (off + 6 > buf.length) return null;
      return buf.readUInt16BE(off + 4);
    }
  }
  return null;
}

// ── 4. walk the source for text usages ────────────────────────────────────
function walk(dir, out) {
  for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else if (/\.tsx?$/.test(entry.name)) out.push(p);
  }
  return out;
}

/** Read a JSX opening tag starting at `i`, honouring strings and braces. */
function readTag(text, i) {
  let depth = 0;
  let quote = null;
  for (let j = i; j < text.length; j++) {
    const ch = text[j];
    if (quote) {
      if (ch === '\\') j++;
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      quote = ch;
      continue;
    }
    if (ch === '{') depth++;
    else if (ch === '}') depth--;
    else if (ch === '>' && depth === 0) return text.slice(i, j + 1);
  }
  return text.slice(i);
}

/**
 * The style objects a file DECLARES — the direct children of the exported
 * style object.
 *
 * The direct children only: a nested key (`row: {label: {...}}`) is not a
 * style of its own, and flattening the whole file let a nested key shadow
 * the real one.
 */
function parseStyleObject(body) {
  const out = {};
  let depth = 0;
  let i = 0;
  while (i < body.length) {
    const ch = body[i];
    if (ch === '{' || ch === '[' || ch === '(') {
      depth++;
      i++;
      continue;
    }
    if (ch === '}' || ch === ']' || ch === ')') {
      depth--;
      i++;
      continue;
    }
    if (depth === 0) {
      const m = /^([A-Za-z_][A-Za-z0-9_]*)\s*:\s*\{/.exec(body.slice(i));
      if (m) {
        let d = 0;
        let j = i + m[0].length - 1;
        for (; j < body.length; j++) {
          if (body[j] === '{') d++;
          else if (body[j] === '}') {
            d--;
            if (d === 0) break;
          }
        }
        out[m[1]] = body.slice(i + m[0].length, j);
        i = j + 1;
        continue;
      }
    }
    i++;
  }
  return out;
}

/**
 * The style objects a file DECLARES as local constants —
 * `const NAME: TextStyle = { ... }`.
 *
 * These are real styles: `SubsectionTitle` carries its serif override this
 * way, and a conditional style that selects one of them was invisible to
 * the gate.
 */
function parseLocalConsts(text) {
  const out = {};
  const re = /\bconst\s+([A-Za-z_][A-Za-z0-9_]*)\s*(?::[^=]+)?=\s*\{/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const inner = balancedBlock(text, m.index + m[0].length - 1);
    if (inner !== null) out[m[1]] = inner;
  }
  return out;
}

/** The balanced `{...}` after `at`, and the text inside it. */
function balancedBlock(text, at) {
  let depth = 0;
  let quote = null;
  for (let j = at; j < text.length; j++) {
    const ch = text[j];
    if (quote) {
      if (ch === '\\') j++;
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      quote = ch;
      continue;
    }
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return text.slice(at + 1, j);
    }
  }
  return null;
}

/**
 * The style objects a styles MODULE exports.
 *
 * Two shapes in this app: `StyleSheet.create({...})` and a factory that
 * returns an object literal (`=> ({...})`).
 */
function parseStyleModule(file) {
  const text = stripComments(fs.readFileSync(file, 'utf8'));
  const out = {};
  const createAt = text.indexOf('StyleSheet.create(');
  if (createAt >= 0) {
    const brace = text.indexOf('{', createAt);
    if (brace >= 0) {
      const inner = balancedBlock(text, brace);
      if (inner) Object.assign(out, parseStyleObject(inner));
    }
  }
  const factory = /=[\s\S]{0,80}=>\s*\(/.exec(text);
  if (factory) {
    const brace = text.indexOf('{', factory.index + factory[0].length - 1);
    if (brace >= 0) {
      const inner = balancedBlock(text, brace);
      if (inner) {
        for (const [k, v] of Object.entries(parseStyleObject(inner))) {
          if (!(k in out)) out[k] = v;
        }
      }
    }
  }
  return out;
}

/** The styles modules a file imports (`../styles`, `../styles/index`). */
function importedStyleFiles(file, text) {
  const dir = path.dirname(file);
  const found = [];
  const re = /from\s+['"]([^'"]+)['"]/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const spec = m[1];
    if (!/styles?(\/index)?$/.test(spec)) continue;
    const base = path.resolve(dir, spec);
    for (const cand of [
      base + '.tsx',
      base + '.ts',
      path.join(base, 'index.ts'),
      path.join(base, 'index.tsx'),
    ]) {
      if (fs.existsSync(cand)) {
        found.push(cand);
        break;
      }
    }
  }
  return found;
}

/** The value of a tag's `style` prop, braces stripped. null when it has none. */
function styleProp(tag) {
  const m = /\sstyle=\{/.exec(tag);
  if (!m) return null;
  const open = tag.indexOf('{', m.index + 6);
  const inner = balancedBlock(tag, open);
  return inner === null ? null : inner.trim();
}

/** Split an expression on a top-level separator (outside strings and braces). */
function splitTopLevel(expr, sep) {
  const parts = [];
  let depth = 0;
  let quote = null;
  let start = 0;
  for (let i = 0; i < expr.length; i++) {
    const ch = expr[i];
    if (quote) {
      if (ch === '\\') i++;
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      quote = ch;
      continue;
    }
    if (ch === '{' || ch === '[' || ch === '(') depth++;
    else if (ch === '}' || ch === ']' || ch === ')') depth--;
    else if (ch === sep && depth === 0) {
      parts.push(expr.slice(start, i));
      start = i + 1;
    }
  }
  parts.push(expr.slice(start));
  return parts;
}

/** The index of a top-level character (outside strings and braces). */
function indexOfTopLevel(expr, ch) {
  let depth = 0;
  let quote = null;
  for (let i = 0; i < expr.length; i++) {
    const c = expr[i];
    if (quote) {
      if (c === '\\') i++;
      else if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') {
      quote = c;
      continue;
    }
    if (c === '{' || c === '[' || c === '(') depth++;
    else if (c === '}' || c === ']' || c === ')') depth--;
    else if (c === ch && depth === 0) return i;
  }
  return -1;
}

/**
 * Split a conditional into its condition and its branches.
 *
 * `isCompact ? styles.titleCompact : {marginTop: s.md}` →
 *   condition 'isCompact', branches ['styles.titleCompact', '{marginTop: s.md}']
 */
function splitTernary(expr) {
  const trimmed = expr.trim();
  const q = indexOfTopLevel(trimmed, '?');
  if (q < 0) return null;
  const condition = trimmed.slice(0, q).trim();
  const rest = trimmed.slice(q + 1);
  const colon = indexOfTopLevel(rest, ':');
  if (colon < 0) return {condition, branches: [rest.trim()]};
  return {
    condition,
    branches: [rest.slice(0, colon).trim(), rest.slice(colon + 1).trim()],
  };
}

/**
 * The style bodies ONE branch of a conditional can carry.
 *
 * A branch is a reference, an inline object, or another conditional.
 */
function bodiesOfBranch(branch, lookup) {
  const trimmed = branch.trim();
  if (trimmed.startsWith('{')) {
    const inner = balancedBlock(trimmed, 0);
    return [inner === null ? '' : inner];
  }
  const ref = /^(?:styles\.)?([A-Za-z_][A-Za-z0-9_]*)$/.exec(trimmed);
  if (ref) {
    const body = lookup[ref[1]];
    return [body === undefined ? '' : body];
  }
  const nested = splitTernary(trimmed);
  if (nested) {
    const alts = [];
    for (const b of nested.branches) alts.push(...bodiesOfBranch(b, lookup));
    return alts;
  }
  return [''];
}

/**
 * The variant names a tag can be rendered with, and the condition that
 * chooses between them.
 *
 * `variant={isCompact ? 'bodySmall' : 'h3'}` → ['bodySmall', 'h3'] under the
 * condition 'isCompact'. A branch that is an identifier (the tag's own
 * `variant` prop) is the AppText default.
 */
function variantInfo(tag) {
  // The CONDITIONAL form first: `variant={isCompact ? 'bodySmall' : 'h3'}`.
  // A literal must not be read out of it, so it is matched on its own.
  const cond = /\svariant=\{([^}]*)\}/.exec(tag);
  if (cond) {
    const split = splitTernary(cond[1]);
    if (split) {
      const names = split.branches.map(b => {
        const m = /^['"]([A-Za-z0-9_]+)['"]$/.exec(b.trim());
        return m ? m[1] : 'body1';
      });
      return {condition: split.condition, names};
    }
    return {condition: null, names: ['body1']};
  }
  // The LITERAL form. It comes in two shapes and BOTH must match:
  //   variant="h3"      — the dominant form: NO braces at all
  //   variant={'h3'}    — the braced form
  // The braces are optional in the pattern, not required: requiring a
  // closing `}` after the quote silently dropped every unbraced literal and
  // audited 606 of 660 tags as AppText's `body1` default.
  const lit = /\svariant=(?:\{)?['"]([A-Za-z0-9_]+)['"]/.exec(tag);
  if (lit) return {condition: null, names: [lit[1]]};
  return {condition: null, names: ['body1']}; // AppText's default
}

/**
 * The candidates an ARRAY style prop can carry.
 *
 * RN flattens an array, so the elements MERGE in order and the last font
 * property wins: `style={[styles.serif, {fontWeight:'700'}]}` is ONE font —
 * the serif at bold. Checking the elements separately would ask for a serif
 * regular that the app never renders.
 */
function arrayCandidates(expr, lookup) {
  const inner = expr.trim().slice(1, expr.trim().length - 1);
  const elements = splitTopLevel(inner, ',')
    .map(e => e.trim())
    .filter(Boolean);
  const fixed = [];
  const altSlots = [];
  for (const el of elements) {
    const bodies = bodiesOfBranch(el, lookup);
    if (bodies.length === 1) fixed.push(bodies[0]);
    else altSlots.push(bodies);
  }
  if (!altSlots.length) return [mergeBodies(fixed)];
  let acc = [fixed.slice()];
  for (const slot of altSlots) {
    const next = [];
    for (const partial of acc) for (const b of slot) next.push(partial.concat([b]));
    acc = next;
  }
  return acc.map(mergeBodies);
}

/**
 * The style candidates a style prop can carry, and the condition that
 * chooses between them.
 *
 * The branches are kept in ORDER, so a variant and a style that share a
 * condition can be paired branch by branch — the pair the user actually
 * sees. Decoupling them would ask for fonts that are never rendered
 * together, and report a fallback that does not exist.
 */
function styleInfo(expr, lookup) {
  const trimmed = expr.trim();
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    return {condition: null, branches: [arrayCandidates(trimmed, lookup)]};
  }
  const split = splitTernary(trimmed);
  if (!split) {
    return {condition: null, branches: [bodiesOfBranch(trimmed, lookup)]};
  }
  const branches = split.branches.map(b => bodiesOfBranch(b, lookup));
  return {condition: split.condition, branches};
}

/**
 * RN's flattening: later bodies win, per property.
 *
 * A body is EITHER a source string (a style object literal, or a reference
 * to one) OR an already-merged `{family, weight, style}` object — the array
 * path merges its elements before the variant is paired with them, so the
 * merged object has to survive a second merge. Reading an object as a string
 * gave "[object Object]", which silently dropped every font property inside
 * a style array.
 */
function mergeBodies(bodies) {
  let family = null;
  let weight = null;
  let style = null;
  for (const body of bodies) {
    if (body && typeof body === 'object') {
      if (body.family) family = body.family;
      if (body.weight) weight = body.weight;
      if (body.style) style = body.style;
      continue;
    }
    const fam = /fontFamily:\s*FONT_FAMILY\.([A-Za-z0-9_.]+)/.exec(body || '');
    if (fam) family = fam[1];
    const wt = /fontWeight:\s*'(\d+)'/.exec(body || '');
    if (wt) weight = wt[1];
    const it = /fontStyle:\s*'(italic|normal)'/.exec(body || '');
    if (it) style = it[1];
  }
  return {family, weight, style};
}

function main() {
  const families = parseFontFamilies();
  const tokens = parseTokens();
  const shipped = new Set(fs.readdirSync(ASSETS));
  // The ACTUAL weight of every shipped face, read out of its OS/2 table.
  const weightOf = new Map();
  for (const f of shipped) {
    const w = ttfWeightClass(path.join(ASSETS, f));
    if (w != null) weightOf.set(f, w);
  }

  /**
   * The family key that carries a weight, for the hint in the report.
   *
   * The app's own typography tokens are the single place that says which key
   * carries which weight, so the suggestion is read out of them rather than
   * out of a second table here.
   */
  function keyForWeight(family, weight) {
    for (const t of Object.values(tokens)) {
      if (t.weight === weight && families[t.familyKey] !== family) {
        return t.familyKey;
      }
    }
    return null;
  }

  const problems = [];
  let usages = 0;
  let unresolved = 0;

  for (const file of walk(SRC, [])) {
    if (!file.endsWith('.tsx')) continue; // JSX only lives in .tsx
    const raw = fs.readFileSync(file, 'utf8');
    const text = stripComments(raw);
    const rel = path.relative(APP, file);
    const lineOf = idx => text.slice(0, idx).split('\n').length;

    // the file's own styles, then the styles modules it imports
    //
    // EVERY `StyleSheet.create(` block in the file, not just the first:
    // a file with a second sheet (a `swipeStyles`, a themed sheet) used to
    // be invisible to the gate, so a style that carries a lost weight was
    // never audited.
    const local = {};
    {
      const createRe = /StyleSheet\.create\(/g;
      let cm;
      while ((cm = createRe.exec(text)) !== null) {
        const brace = text.indexOf('{', cm.index + cm[0].length - 1);
        const inner = brace >= 0 ? balancedBlock(text, brace) : null;
        if (!inner) continue;
        for (const [k, v] of Object.entries(parseStyleObject(inner))) {
          if (!(k in local)) local[k] = v;
        }
      }
    }
    const imported = {};
    for (const f of importedStyleFiles(file, text)) {
      for (const [k, v] of Object.entries(parseStyleModule(f))) {
        if (!(k in imported) && !(k in local)) imported[k] = v;
      }
    }
    // ONE lookup for this file: the local consts, the styles modules it
    // imports, and its own StyleSheet.create — the file's own styles win.
    const lookup = Object.assign(
      {},
      parseLocalConsts(text),
      imported,
      local
    );

    const tagRe = /<(AppText|Text)\b/g;
    let m;
    while ((m = tagRe.exec(text)) !== null) {
      const tag = readTag(text, m.index);
      // a <Text …> that is really <TextInput …>
      if (/^<TextInput\b/.test(tag)) continue;

      const expr = styleProp(tag);
      const vInfo = variantInfo(tag);
      const sInfo =
        expr === null
          ? {condition: null, branches: [['']]}
          : styleInfo(expr, lookup);

      // ── pair the variant with the style ──
      //
      // `variant={isCompact ? 'bodySmall' : 'h3'}` and
      // `style={isCompact ? styles.titleCompact : {marginTop: s.md}}` are
      // two branches of ONE condition. Pairing them branch by branch is
      // what the user sees. Taking the cross product instead would ask for
      // (h3 + titleCompact), a pair that is never rendered — and would
      // report a font fallback that does not exist.
      const sameCondition =
        vInfo.condition !== null &&
        sInfo.condition !== null &&
        vInfo.condition.replace(/\s+/g, '') === sInfo.condition.replace(/\s+/g, '');

      const pairs = [];
      if (sameCondition) {
        const n = Math.max(vInfo.names.length, sInfo.branches.length);
        for (let i = 0; i < n; i++) {
          const name = vInfo.names[i] ?? vInfo.names[vInfo.names.length - 1];
          const bodies =
            sInfo.branches[i] ?? sInfo.branches[sInfo.branches.length - 1];
          for (const body of bodies) pairs.push({variant: name, body});
        }
      } else {
        for (const name of vInfo.names) {
          for (const bodies of sInfo.branches) {
            for (const body of bodies) pairs.push({variant: name, body});
          }
        }
      }

      for (const pair of pairs) {
        const token = tokens[pair.variant];
        if (!token) continue;

        const merged = mergeBodies([pair.body]);
        // RN merges per property: the style's value wins, the variant's
        // fills in what the style does not set.
        const familyKey = merged.family || token.familyKey;
        const family = families[familyKey];
        if (!family) {
          problems.push({
            rel,
            line: lineOf(m.index),
            what: `unknown family key ${familyKey}`,
          });
          continue;
        }
        const weight = merged.weight || token.weight;
        const style = merged.style || token.style;

        usages++;
        const path_ = assetPath(family, weight, style);
        const file = path_.split('/').pop();
        if (!shipped.has(file)) {
          // EVERY site is reported. The old report deduped by
          // `family|weight|style` and then DROPPED the duplicates, so only
          // the first occurrence of each missing font was ever listed and
          // the other sites were invisible even when the gate did fire.
          problems.push({
            rel,
            line: lineOf(m.index),
            what: `${family} + weight ${weight}${style === 'italic' ? ' italic' : ''} -> ${path_} MISSING`,
          });
          continue;
        }
        // ── the SECOND class: the file exists, but it is the WRONG face ──
        //
        // The style set an explicit `fontWeight`, and the file RN opened for
        // it carries a DIFFERENT weight. `'Inter'` + `'600'` opens
        // `fonts/Inter.ttf` — which exists, and is the 400 Regular. The
        // weight the author asked for is silently gone.
        //
        // This only applies when the STYLE set the weight. When the weight
        // comes from the typography token, the token's own (family, weight)
        // pair IS the contract, and a style that overrides the family is the
        // author choosing a face on purpose.
        if (merged.weight) {
          const actual = weightOf.get(file);
          if (actual != null && actual !== Number(merged.weight)) {
            const hint = keyForWeight(family, merged.weight);
            problems.push({
              rel,
              line: lineOf(m.index),
              what:
                `${family} + weight ${merged.weight} opens ${file}, whose weight is ${actual}` +
                ` — the ${merged.weight} is LOST` +
                (hint ? ` (use FONT_FAMILY.${hint})` : ''),
            });
          }
        }
      }
    }
  }

  // report
  const byKey = new Map();
  for (const p of problems) {
    if (!byKey.has(p.what)) byKey.set(p.what, []);
    byKey.get(p.what).push(p);
  }

  console.log('font resolution audit — ' + usages + ' resolved text usages in src/');
  console.log('shipped assets: ' + shipped.size + ' files in android/app/src/main/assets/fonts');
  if (byKey.size === 0) {
    console.log('\nOK — every usage resolves to a shipped font file.');
    return;
  }
  console.log('\nFALLBACKS (these render in the system font):');
  for (const [what, list] of byKey) {
    console.log('\n  ' + what);
    for (const p of list) console.log('      ' + p.rel + ':' + p.line);
  }
  console.log('\n  ' + problems.length + ' site(s).');
  process.exitCode = 1;
}

main();
