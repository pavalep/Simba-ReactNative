#!/usr/bin/env node
/**
 * check-themed-roots.js - every screen owns its themed background.
 *
 * WHY THIS EXISTS
 *
 * A screen that paints no background is transparent, and whatever is
 * behind it shows through: the navigator's card, the screen below it in
 * the stack, or the platform window. The Wave B16-K sweep found screens in
 * `src/screens/**` whose root container borrowed that surface instead of
 * owning one.
 *
 * THE RULE - a screen owns its background when its root:
 *
 *   1. IS `ScreenContainer` or `BrowseLayout` (both paint
 *      `colors.background.primary`), or
 *   2. paints a themed background itself - `backgroundColor:` with a
 *      `colors.background.*` colour, inline or through its style block, or
 *   3. carries a FULL-BLEED themed gradient - a `<LinearGradient>` child
 *      with `StyleSheet.absoluteFill` whose colours are `colors.background.*`.
 *      That gradient IS the screen's surface; it paints over the root, so a
 *      root background under it would be invisible.
 *
 * Anything else fails, and the gate names the file and the line.
 *
 * Run: `node scripts/check-themed-roots.js` (exit 1 on a violation).
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SCREENS = path.join(ROOT, 'src', 'screens');

/** The two components that own a screen's background for the screens that use them. */
const THEME_OWNERS = ['ScreenContainer', 'BrowseLayout'];

/** A themed surface colour: any key of the theme's `background` family. */
const THEMED_BG = /backgroundColor:\s*colors\.background\.[A-Za-z]+/

/** An explicit transparent background is NOT ownership. */
const TRANSPARENT_BG = /backgroundColor:\s*'transparent'/

function walk(dir, out) {
  for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(p, out);
    } else if (/\.tsx$/.test(entry.name) && !/\.styles\.tsx$/.test(entry.name)) {
      out.push(p);
    }
  }
  return out;
}

/** The component BODY: the first `{` after the arrow function's `=>`. */
function bodyOf(src, from) {
  const arrow = src.indexOf('=>', from);
  const start = arrow > 0 && arrow - from < 400 ? arrow : from;
  const i = src.indexOf('{', start);
  if (i < 0) {
    return null;
  }
  let depth = 0;
  for (let j = i; j < src.length; j++) {
    if (src[j] === '{') {
      depth++;
    } else if (src[j] === '}') {
      depth--;
      if (depth === 0) {
        return src.slice(i, j + 1);
      }
    }
  }
  return null;
}

/**
 * The root JSX element of a component body.
 *
 * The SHALLOWEST `return` wins: a component's own render sits at its body's
 * indentation, while a `return` inside a `.map()` callback sits deeper. Taking
 * the first return instead would pick a list ROW and call it the screen's root.
 */
function rootReturnIndex(body) {
  const re = /return\s*(?:\(|<)/g;
  let best = null;
  let m;
  while ((m = re.exec(body))) {
    const lineStart = body.lastIndexOf('\n', m.index) + 1;
    const indent = body.slice(lineStart, m.index).length;
    if (!best || indent < best.indent) {
      best = {indent, index: m.index};
    }
  }
  return best;
}

/** The element that starts at `start` (index of '<'), with its children. */
function elementAt(body, start) {
  const nameMatch = /^<([A-Za-z][A-Za-z0-9_.]*)/.exec(body.slice(start));
  if (!nameMatch) {
    return null;
  }
  const name = nameMatch[1];
  let i = start + 1;
  let depth = 0;
  let quote = null;
  let openEnd = -1;
  let selfClose = false;
  for (; i < body.length; i++) {
    const ch = body[i];
    if (quote) {
      if (ch === quote && body[i - 1] !== '\\') {
        quote = null;
      }
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      quote = ch;
      continue;
    }
    if (ch === '{') {
      depth++;
      continue;
    }
    if (ch === '}') {
      depth--;
      continue;
    }
    if (ch === '>' && depth === 0) {
      openEnd = i + 1;
      selfClose = body[i - 1] === '/';
      break;
    }
  }
  if (openEnd < 0) {
    return null;
  }
  if (selfClose) {
    return {name, openTag: body.slice(start, openEnd), children: '', openEnd};
  }
  const re = new RegExp('<(/?)' + name + '(?=[\\s/>])', 'g');
  re.lastIndex = openEnd;
  let m;
  let d = 1;
  while ((m = re.exec(body))) {
    if (m[1] === '/') {
      d--;
      if (d === 0) {
        return {name, openTag: body.slice(start, openEnd), children: body.slice(openEnd, m.index), openEnd};
      }
    } else {
      const tagEnd = body.indexOf('>', m.index);
      if (tagEnd < 0 || body[tagEnd - 1] !== '/') {
        d++;
      }
    }
  }
  return null;
}

/** The `key: { ... }` block of a StyleSheet. */
function styleBlock(src, key) {
  const m = new RegExp('(?:^|[\\s,{])' + key + ':\\s*\\{', 'm').exec(src);
  if (!m) {
    return null;
  }
  const i = src.indexOf('{', m.index);
  let depth = 0;
  for (let j = i; j < src.length; j++) {
    if (src[j] === '{') {
      depth++;
    } else if (src[j] === '}') {
      depth--;
      if (depth === 0) {
        return src.slice(i, j + 1);
      }
    }
  }
  return null;
}

/**
 * A FULL-BLEED themed gradient among the root's children.
 *
 * `<LinearGradient colors={[colors.background.primary, ...]} style={StyleSheet.absoluteFill}>`
 * paints the screen's whole surface. It is the surface - a root background
 * under it would never be seen, and a root that CONTAINS it already owns one.
 */
function ownsFullBleedGradient(children) {
  if (!children) {
    return false;
  }
  const re = /<LinearGradient\b/g;
  let m;
  while ((m = re.exec(children))) {
    const tagEnd = children.indexOf('>', m.index);
    if (tagEnd < 0) {
      continue;
    }
    const tag = children.slice(m.index, tagEnd + 1);
    const fullBleed = /StyleSheet\.absoluteFill/.test(tag) || /absoluteFillObject/.test(tag);
    const themed = /colors\.background\.[A-Za-z]+/.test(tag);
    if (fullBleed && themed) {
      return true;
    }
  }
  return false;
}

const violations = [];
const files = walk(SCREENS, []).filter(f => /Screen\.tsx$/.test(f) || /index\.tsx$/.test(f));

for (const file of files) {
  const src = fs.readFileSync(file, 'utf8');
  // Scope: a screen that paints with the app's theme. `useTheme()` is the usual
  // source, but Home reads its colours from its own hook - so the test is the
  // theme colour itself, not the hook that produced it.
  if (!/colors\./.test(src)) {
    continue;
  }
  const rel = path.relative(ROOT, file).replace(/\\/g, '/');
  const exported = /export\s+(?:const|function|default\s+function)\s+([A-Za-z0-9_]+)/.exec(src);
  if (!exported) {
    continue;
  }
  const body = bodyOf(src, src.indexOf(exported[0]));
  if (!body) {
    continue;
  }
  const best = rootReturnIndex(body);
  if (!best) {
    continue;
  }
  // A screen that renders nothing owns no background - there is nothing to paint.
  // ONLY the screen's own shallowest return counts: a `return null` inside a
  // nested helper (FolderBrowser's empty state) is not the screen's root, and
  // skipping the whole file for it would leave the real root unchecked.
  if (/^return\s+null\b/.test(body.slice(best.index, best.index + 24))) {
    continue;
  }
  const start = body.indexOf('<', best.index);
  if (start < 0) {
    continue;
  }
  const root = elementAt(body, start);
  if (!root) {
    continue;
  }
  if (THEME_OWNERS.some(o => root.name === o || root.openTag.indexOf('<' + o) === 0)) {
    continue;
  }
  // 2 - the root paints a themed background itself.
  if (THEMED_BG.test(root.openTag)) {
    continue;
  }
  const styleKeys = [
    ...new Set(
      [...root.openTag.matchAll(/([A-Za-z0-9_]*[Ss]tyles?)\.([A-Za-z0-9_]+)/g)].map(m => m[2]),
    ),
  ];
  let themed = false;
  for (const key of styleKeys) {
    const block = styleBlock(src, key);
    if (block && THEMED_BG.test(block) && !TRANSPARENT_BG.test(block)) {
      themed = true;
      break;
    }
  }
  if (themed) {
    continue;
  }
  // 3 - the root carries a full-bleed themed gradient: that gradient is the surface.
  if (ownsFullBleedGradient(root.children)) {
    continue;
  }
  const line = src.slice(0, src.indexOf(root.openTag)).split(/\r\n|\n/).length +
    body.slice(0, start).split(/\r\n|\n/).length;
  violations.push({rel, line, tag: root.name});
}

if (violations.length > 0) {
  console.error('check-themed-roots: ' + violations.length + ' screen(s) do not own a themed background:');
  for (const v of violations) {
    console.error('  ' + v.rel + ':' + v.line + '  <' + v.tag + '> is the root and paints no background');
  }
  console.error('');
  console.error('A screen must paint colors.background.primary (or another themed');
  console.error('background) on its root, carry a full-bleed themed gradient, or use');
  console.error('ScreenContainer / BrowseLayout, which own it.');
  process.exit(1);
}

console.log('check-themed-roots: every screen owns a themed background.');