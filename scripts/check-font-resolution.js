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

/** The style objects declared by a StyleSheet.create in this file. */
function parseStyles(text) {
  const styles = {};
  const re = /([A-Za-z_][A-Za-z0-9_]*)\s*:\s*\{/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const name = m[1];
    let depth = 0;
    let j = m.index + m[0].length - 1;
    for (; j < text.length; j++) {
      if (text[j] === '{') depth++;
      else if (text[j] === '}') {
        depth--;
        if (depth === 0) break;
      }
    }
    styles[name] = text.slice(m.index + m[0].length, j);
  }
  return styles;
}

function main() {
  const families = parseFontFamilies();
  const tokens = parseTokens();
  const shipped = new Set(fs.readdirSync(ASSETS));

  const problems = [];
  const seen = new Set();
  let usages = 0;

  for (const file of walk(SRC, [])) {
    if (!file.endsWith('.tsx')) continue; // JSX only lives in .tsx
    const raw = fs.readFileSync(file, 'utf8');
    const text = stripComments(raw);
    const rel = path.relative(APP, file);
    const styles = parseStyles(text);

    const tagRe = /<(AppText|Text)\b/g;
    let m;
    while ((m = tagRe.exec(text)) !== null) {
      const tag = readTag(text, m.index);
      // a <Text …> that is really <TextInput …>
      if (/^<TextInput\b/.test(tag)) continue;

      // the style objects referenced by this tag
      const styleText = [];
      const styleRefRe = /style=\{styles\.([A-Za-z0-9_]+)\}/g;
      let sr;
      while ((sr = styleRefRe.exec(tag)) !== null) {
        if (styles[sr[1]]) styleText.push(styles[sr[1]]);
      }
      // inline style objects
      const inlineRe = /style=\{\{([^}]*)\}\}/g;
      let ir;
      while ((ir = inlineRe.exec(tag)) !== null) styleText.push(ir[1]);
      const merged = styleText.join('\n');

      const variantM = /variant=\{?'([A-Za-z0-9_]+)'?\}/.exec(tag);
      const variant = variantM ? variantM[1] : 'body1'; // AppText's default
      const token = tokens[variant];
      if (!token) continue;

      const styleFam = /fontFamily:\s*FONT_FAMILY\.([A-Za-z0-9_.]+)/.exec(merged);
      const styleWt = /fontWeight:\s*'(\d+)'/.exec(merged);
      const styleItalic = /fontStyle:\s*'italic'/.test(merged);

      const familyKey = styleFam ? styleFam[1] : token.familyKey;
      const family = families[familyKey];
      if (!family) {
        problems.push({
          rel,
          line: text.slice(0, m.index).split('\n').length,
          what: `unknown family key ${familyKey}`,
        });
        continue;
      }
      const weight = styleWt ? styleWt[1] : token.weight;
      const style = styleItalic || (token.style === 'italic' && !styleWt) ? 'italic' : 'normal';

      usages++;
      const path_ = assetPath(family, weight, style);
      const key = family + '|' + weight + '|' + style;
      if (!shipped.has(path_.split('/').pop())) {
        const dup = seen.has(key);
        seen.add(key);
        problems.push({
          rel,
          line: text.slice(0, m.index).split('\n').length,
          what: `${family} + weight ${weight}${style === 'italic' ? ' italic' : ''} -> ${path_} MISSING`,
          dup,
        });
      }
    }
  }

  // report
  const byKey = new Map();
  for (const p of problems) {
    if (p.dup) continue;
    if (!byKey.has(p.what)) byKey.set(p.what, []);
    byKey.get(p.what).push(p);
  }

  console.log('font resolution audit — ' + usages + ' text usages in src/');
  console.log('shipped assets: ' + shipped.size + ' files in android/app/src/main/assets/fonts');
  if (byKey.size === 0) {
    console.log('\nOK — every usage resolves to a shipped font file.');
    return;
  }
  console.log('\nFALLBACKS (these render in the system font):');
  for (const [what, list] of byKey) {
    console.log('\n  ' + what);
    for (const p of list.slice(0, 8)) console.log('      ' + p.rel + ':' + p.line);
    if (list.length > 8) console.log('      … and ' + (list.length - 8) + ' more');
  }
  process.exitCode = 1;
}

main();
