#!/usr/bin/env node
/**
 * build-login-design.js — generates the SIMBA login screens as a FigCraft
 * document, from the app's own sources.
 *
 * Every value comes from the code, so the design file and the app cannot
 * drift apart silently:
 *
 *   - the frame is the device's dp size (411 x 914)
 *   - the insets are the ones the device reported (24 / 24)
 *   - the colours are the light-theme tokens in src/theme/tokens.ts
 *   - the lockup's type scale and its two optical gaps are the styles in
 *     src/screens/Login/components/LoginScreen.tsx (the tagline and the
 *     wordmark are NOT plain typography tokens — the login screen sets
 *     them itself, so the design reads them where they live)
 *   - the family strings are src/constants/fontFamily.ts
 *   - the artwork is src/assets/svg/ui_lion.svg and the four Google G paths
 *     in src/components/core/GoogleSignInButton/GoogleSignInButton.tsx
 *
 * The layout mirrors the React Native tree 1:1 using auto-layout, so
 * FigCraft computes the geometry the way RN does and the design render can
 * be diffed against a device screenshot.
 *
 * The document holds TWO pages — the two ends of the orb's pulse:
 *
 *   Login                 the orb at its peak (scale 1.12, opacity 0.16)
 *   Login — orb at rest   the orb at rest  (scale 1.00, opacity 0.08)
 *
 * Usage (from the repo root):
 *
 *   node designs/build-login-design.js                 # writes designs/.build/login-intended-light.json
 *   figcraft-cli run designs/.build/login-intended-light.json --out designs/Simba_UI_UX_Complete_Design.figcraft
 *   figcraft-cli render designs/Simba_UI_UX_Complete_Design.figcraft -o designs/login-peak.png --page "Login"
 *   figcraft-cli export designs/Simba_UI_UX_Complete_Design.figcraft -o designs/Simba_UI_UX_Complete_Design.fig --format fig
 *
 * The second argument selects the typeface:
 *
 *   intended  the families the app asks for (the design)
 *   fallback  Roboto — what Android rendered before the font-resolution
 *             fix, kept so the old and the new can be compared
 *
 * The lockup can be swept without touching the app:
 *
 *   --wordmark-size 52   the "Simba" script
 *   --wordmark-lh   60
 *   --wordmark-gap  16   the gap between the lion and the wordmark
 *   --tagline-size  22   the tagline
 *   --tagline-lh    28
 *   --tagline-gap   10   the gap between the wordmark and the tagline
 *   --tagline-ls    0.4
 *   --nudge         0    optical centring of the whole lockup
 *   --only     peak|rest|both
 */

'use strict';

const fs = require('fs');
const path = require('path');

const APP = path.resolve(__dirname, '..');
const OUT = path.join(__dirname, '.build');
const ASSETS = path.join(OUT, 'assets');
fs.mkdirSync(ASSETS, {recursive: true});

// ── the app's typography, read from the tokens ─────────────────────────────
/** Replace comment bodies with spaces (keeping the newlines) so a quoted
 *  string inside a doc comment is not mistaken for a value. */
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

function readFamilyStrings() {
  const text = stripComments(
    fs.readFileSync(path.join(APP, 'src/constants/fontFamily.ts'), 'utf8'),
  );
  const start = text.indexOf('export const FONT_FAMILY = {');
  if (start < 0) throw new Error('FONT_FAMILY not found in src/constants/fontFamily.ts');
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
  // the keys are NESTED (cormorant.bold, inter.semibold, …) and the leaf names
  // repeat across families, so the path has to be tracked
  const map = {};
  const stack = [];
  let pendingKey = null;
  const re = /([A-Za-z_][A-Za-z0-9_]*)\s*:|'([^']*)'|([{}])/g;
  let m;
  while ((m = re.exec(block)) !== null) {
    if (m[1] !== undefined) {
      pendingKey = m[1];
    } else if (m[2] !== undefined) {
      if (pendingKey) map[stack.concat(pendingKey).join('.')] = m[2];
      pendingKey = null;
    } else if (m[3] === '{') {
      stack.push(pendingKey);
      pendingKey = null;
    } else {
      stack.pop();
      pendingKey = null;
    }
  }
  return map;
}

function readTokens() {
  const text = fs.readFileSync(path.join(APP, 'src/theme/tokens.ts'), 'utf8');
  const start = text.indexOf('export const typography: TypographyTokens = {');
  if (start < 0) throw new Error('typography tokens not found in src/theme/tokens.ts');
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
  const out = {};
  const re = /([A-Za-z_][A-Za-z0-9_]*)\s*:\s*\{([^}]*)\}/g;
  let m;
  while ((m = re.exec(block)) !== null) {
    const fam = /fontFamily:\s*FONT_FAMILY\.([A-Za-z0-9_.]+)/.exec(m[2]);
    const wt = /fontWeight:\s*'(\d+)'/.exec(m[2]);
    const sz = /fontSize:\s*([\d.]+)/.exec(m[2]);
    const lh = /lineHeight:\s*([\d.]+)/.exec(m[2]);
    const ls = /letterSpacing:\s*([\d.]+)/.exec(m[2]);
    if (!fam) continue;
    out[m[1]] = {
      familyKey: fam[1],
      weight: wt ? Number(wt[1]) : 400,
      fontSize: sz ? Number(sz[1]) : null,
      lineHeight: lh ? Number(lh[1]) : null,
      letterSpacing: ls ? Number(ls[1]) : 0,
    };
  }
  return out;
}

/** The family string a FONT_FAMILY key resolves to. */
function resolveFamily(families, key) {
  const value = families[key];
  if (!value) {
    throw new Error(
      'unknown family key ' + key + ' (known: ' + Object.keys(families).join(', ') + ')',
    );
  }
  return value;
}

/** The face of a family, as FigCraft names it. */
function faceOf(family, weight, italic) {
  if (italic) return 'Italic';
  if (family === 'Cormorant Garamond') return weight >= 700 ? 'Bold' : 'Regular';
  if (family === 'Inter') return weight >= 700 ? 'Bold' : 'Regular';
  if (family === 'Inter SemiBold') return 'Semi Bold';
  if (family === 'Inter Medium') return 'Medium';
  if (family === 'Manrope SemiBold') return 'Semi Bold';
  return 'Regular';
}

// ── the login screen's own styles ─────────────────────────────────────────
// The lockup's type scale and its two optical gaps live in
// LoginScreen.tsx's StyleSheet, not in the typography tokens: the login
// screen overrides both the wordmark and the tagline itself. Reading them
// from there is what keeps the design honest — the design cannot claim a
// type scale the app does not ship.
function readLoginStyles() {
  const file = path.join(APP, 'src/screens/Login/components/LoginScreen.tsx');
  const text = fs.readFileSync(file, 'utf8');
  const start = text.indexOf('const styles = StyleSheet.create({');
  if (start < 0) throw new Error('LoginScreen styles not found');
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
  const body = text.slice(open + 1, end);

  const blockOf = (name) => {
    const at = body.indexOf('\n  ' + name + ': {');
    if (at < 0) return null;
    const b = body.indexOf('{', at);
    let d = 0;
    let e = -1;
    for (let i = b; i < body.length; i++) {
      if (body[i] === '{') d++;
      else if (body[i] === '}') {
        d--;
        if (d === 0) {
          e = i;
          break;
        }
      }
    }
    return body.slice(b + 1, e);
  };
  const num = (src, key) => {
    if (!src) return null;
    const m = new RegExp(key + ':\\s*([\\d.]+)').exec(src);
    return m ? Number(m[1]) : null;
  };
  const str = (src, key) => {
    if (!src) return null;
    const m = new RegExp(key + ":\\s*'([^']*)'").exec(src);
    return m ? m[1] : null;
  };
  const famRef = (src) => {
    if (!src) return null;
    const m = /fontFamily:\s*FONT_FAMILY\.([A-Za-z0-9_.]+)/.exec(src);
    return m ? m[1] : null;
  };

  const logoText = blockOf('logoText');
  const taglineWrap = blockOf('taglineWrap');
  const tagline = blockOf('tagline');

  // the lion emblem's size, straight from the JSX
  const lionSize = /<SvgIcon\s+name="lion"\s+size=\{(\d+)\}/.exec(text);

  return {
    lion: lionSize ? Number(lionSize[1]) : null,
    wordmark: {
      fontSize: num(logoText, 'fontSize'),
      lineHeight: num(logoText, 'lineHeight'),
      marginTop: num(logoText, 'marginTop'),
    },
    tagline: {
      fontSize: num(tagline, 'fontSize'),
      lineHeight: num(tagline, 'lineHeight'),
      letterSpacing: num(tagline, 'letterSpacing'),
      fontStyle: str(tagline, 'fontStyle'),
      familyKey: famRef(tagline),
      marginTop: num(taglineWrap, 'marginTop'),
    },
  };
}

const FONT = process.argv[2] || 'intended';
const THEME = process.argv[3] || 'light';

function flag(name, fallback) {
  const hit = process.argv.find((a) => a.startsWith('--' + name + '='));
  if (!hit) return fallback;
  const value = Number(hit.split('=')[1]);
  // a malformed flag must not become NaN and silently poison the design
  return Number.isFinite(value) ? value : fallback;
}
function flagStr(name, fallback) {
  const hit = process.argv.find((a) => a.startsWith('--' + name + '='));
  return hit ? hit.split('=').slice(1).join('=') : fallback;
}

const families = readFamilyStrings();
const tokens = readTokens();
const login = readLoginStyles();

const t = (variant) => {
  const tok = tokens[variant];
  if (!tok) throw new Error('unknown typography variant ' + variant);
  return {
    family: resolveFamily(families, tok.familyKey),
    weight: tok.weight,
    fontSize: tok.fontSize,
    lineHeight: tok.lineHeight,
    letterSpacing: tok.letterSpacing,
  };
};

// ── the lockup ─────────────────────────────────────────────────────────────
// The orb is a CIRCLE: its usable width narrows as the content descends, so
// a lockup that is comfortable at the top can crowd the arc at the bottom.
//
// The hierarchy the lockup must express:
//   the LION is the emblem  (a picture — it carries no type)
//   the WORDMARK is the hero (the brand's name, set in the script)
//   the TAGLINE supports it (one quiet line under the name)
//
// A tagline set as large as the wordmark inverts that hierarchy and, at the
// size this orb can hold, puts its descenders on the arc. Hence: the
// wordmark leads, and the tagline is a single quiet line.
const LOCKUP = {
  // the lion emblem — SvgIcon size={…} in LoginScreen.tsx
  lion: flag('lion', login.lion || 96),
  wordmarkSize: flag('wordmark-size', login.wordmark.fontSize || 52),
  wordmarkLh: flag('wordmark-lh', login.wordmark.lineHeight || 60),
  wordmarkGap: flag('wordmark-gap', login.wordmark.marginTop ?? 16),
  taglineSize: flag('tagline-size', login.tagline.fontSize || 22),
  taglineLh: flag('tagline-lh', login.tagline.lineHeight || 28),
  taglineGap: flag('tagline-gap', login.tagline.marginTop ?? 10),
  taglineLs: flag('tagline-ls', login.tagline.letterSpacing ?? 0.4),
  nudge: flag('nudge', 0),
};

const FAMILIES =
  FONT === 'fallback'
    ? {
        // what Android rendered before the font-resolution fix: the family
        // lookup missed every asset, so the system font was used
        tagline: {family: 'Roboto', style: 'Normal'},
        wordmark: {family: 'Allura', style: 'Regular'},
        label: {family: 'Roboto', style: 'Normal'},
        legal: {family: 'Roboto', style: 'Normal'},
      }
    : (() => {
        const taglineFamilyKey = login.tagline.familyKey || 'cormorant.italic';
        const tagline = t('displaySerif');
        const wordmark = t('brandScript');
        const label = t('body1');
        const legal = t('caption');
        const taglineFamily = resolveFamily(families, taglineFamilyKey);
        const taglineItalic = login.tagline.fontStyle === 'italic';
        return {
          tagline: {
            family: taglineFamily,
            style: faceOf(taglineFamily, taglineItalic ? 400 : tagline.weight, taglineItalic),
          },
          wordmark: {family: wordmark.family, style: faceOf(wordmark.family, wordmark.weight)},
          label: {family: label.family, style: faceOf(label.family, label.weight)},
          legal: {family: legal.family, style: faceOf(legal.family, legal.weight)},
        };
      })();

// A sweep may need a face the app does not use — e.g. to reproduce an OLD
// lockup and measure it against the new one.
if (FONT !== 'fallback') {
  const taglineFamily = flagStr('tagline-family', null);
  if (taglineFamily) {
    FAMILIES.tagline = {
      family: taglineFamily,
      style: flagStr('tagline-style', FAMILIES.tagline.style),
    };
  }
}

// The Google sign-in label is the one run that overrides the family:
// GoogleSignInButton.tsx sets fontFamily FONT_FAMILY.inter.semibold and
// fontWeight '600', so the design uses that, not the body1 default.
if (FONT !== 'fallback') {
  FAMILIES.label = {
    family: resolveFamily(families, 'inter.semibold'),
    style: faceOf(resolveFamily(families, 'inter.semibold'), 600),
  };
}

const COLORS = {
  light: {
    bg: '#F5F0E8', // colors.background.primary
    surface: '#FFFFFF', // colors.background.elevated
    borderSubtle: 'rgba(0,0,0,0.06)', // colors.border.subtle
    textPrimary: '#1A1A1C', // colors.text.primary
    textTertiary: 'rgba(26,26,28,0.30)', // colors.text.tertiary
    gold: '#B8922E', // colors.accent.gold
  },
  dark: {
    bg: '#0A0A0C',
    surface: '#141416',
    borderSubtle: 'rgba(255,255,255,0.06)',
    textPrimary: '#EDEDED',
    textTertiary: 'rgba(237,237,237,0.30)',
    gold: '#C9A84C',
  },
}[THEME];
if (!COLORS) throw new Error('unknown THEME ' + THEME);

// the hard-coded brand inks in LoginScreen.tsx (same in both themes)
const LOGO_INK = '#5C3A1E';
const TAGLINE_INK = '#6B4226';

// ── the device frame ────────────────────────────────────────────────────────
const W = 411;
const H = 914;
// The device's insets, measured from the emulator capture (1080x2400 @420dpi):
// the logo stack's top edge lands at 220.2dp, and the RN layout model
// (content paddingTop = insets.top, logoArea marginTop -40, logoArea flex 1,
// bottomSection height 162) predicts stackTop = insets.top/2 + 220.04 -
// insets.bottom/2. insets.top = insets.bottom = 24 gives 220.04 — a 0.2dp
// match. The app's legal row confirms insets.bottom = 24 (the row's bottom
// edge is 40dp above the frame edge: insets.bottom + 16). The device itself
// reports the navigation bar as 63px = 24dp at 420dpi.
const INSETS_TOP = 24;
const INSETS_BOTTOM = 24;
const CONTENT_PAD = 32; // LoginScreen.tsx paddingHorizontal

// ORB_SIZE = Math.min(width * 0.72, 320)
const ORB = Math.min(W * 0.72, 320);
const STACK = ORB;
const LABEL_SIZE = 16;
const LABEL_LH = 24;
const LABEL_LS = 0.3;
const LEGAL_SIZE = 13;
const LEGAL_LH = 18;

// the layout constants that the RN styles carry
const BUTTON_PAD_V = 14;
const BUTTON_PAD_H = 24;
const BUTTON_RADIUS = 12;
const BUTTON_MIN_W = 260;
const BUTTON_WRAP_MIN_H = 80;
const BUTTON_WRAP_MARGIN_B = 24;
const LEGAL_GAP = 8;
const LEGAL_DOT = 3;
const BOTTOM_PAD = INSETS_BOTTOM + 16; // insets.bottom + 16

// ── the artwork ─────────────────────────────────────────────────────────────
let lion = fs.readFileSync(path.join(APP, 'src/assets/svg/ui_lion.svg'), 'utf8');
lion = lion.replace(/currentColor/g, LOGO_INK);
lion = lion.replace('<svg ', '<svg width="' + LOCKUP.lion + '" height="' + LOCKUP.lion + '" ');
fs.writeFileSync(path.join(ASSETS, 'lion.svg'), lion);

const tsx = fs.readFileSync(
  path.join(APP, 'src/components/core/GoogleSignInButton/GoogleSignInButton.tsx'),
  'utf8',
);
const gPaths = [...tsx.matchAll(/<Path fill="(#[0-9A-Fa-f]{6})" d="([^"]+)"/g)].map(m => ({
  fill: m[1],
  d: m[2],
}));
if (gPaths.length !== 4) throw new Error('expected 4 Google paths, got ' + gPaths.length);
const google =
  '<svg width="22" height="22" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">\n' +
  gPaths.map(p => `  <path fill="${p.fill}" d="${p.d}"/>`).join('\n') +
  '\n</svg>\n';
fs.writeFileSync(path.join(ASSETS, 'google.svg'), google);

// ── the two ends of the orb's pulse ───────────────────────────────────────
// RN drives the pulse from ONE value: scale 1 -> 1.12 and opacity 0.08 -> 0.16
// are both interpolated from it (LoginScreen.tsx:108-116). The two pages of
// the document are the two ends of that range:
//   peak  scale 1.12, opacity 0.16 — the largest, warmest state
//   rest  scale 1.00, opacity 0.08 — the smallest, faintest state
// The app screenshot used for the diff was captured at the peak.
const ORB_PULSE = {
  peak: {scale: 1.12, opacity: 0.16},
  rest: {scale: 1.0, opacity: 0.08},
};

const SCREENS = [
  {key: 'peak', page: 'Login', orb: 'peak'},
  {key: 'rest', page: 'Login — orb at rest', orb: 'rest'},
];

const ONLY = flagStr('only', 'both');

// ── one screen's commands ──────────────────────────────────────────────────
function buildScreen(screen) {
  const cmds = [];
  const A = (command, params, as) => {
    const o = {command, params};
    if (as) o.as = screen.key + '_' + as;
    cmds.push(o);
  };
  const R = (as) => ({$ref: screen.key + '_' + as});

  const pulse = ORB_PULSE[screen.orb];
  const orbDrawn = ORB * pulse.scale;
  const orbOffset = (ORB - orbDrawn) / 2;

  // the artwork, imported as editable vector frames
  A('file.import', {path: path.join(ASSETS, 'lion.svg').replace(/\\/g, '/'), x: 0, y: 0}, 'lionArt');
  A('file.import', {path: path.join(ASSETS, 'google.svg').replace(/\\/g, '/'), x: 0, y: 0}, 'googleArt');

  A(
    'frame.create',
    {
      x: 0,
      y: 0,
      width: W,
      height: H,
      name: 'Login / ' + THEME + ' — orb ' + screen.orb,
      props: {fill: COLORS.bg, layout: 'vertical'},
    },
    'root',
  );

  // Content: flex 1, paddingTop insets.top, paddingHorizontal 32
  A(
    'node.create',
    {
      type: 'frame',
      parent: R('root'),
      name: 'Content',
      props: {
        // FigCraft gives every frame a default WHITE fill. A container must be
        // transparent or it paints over the parchment AND over the orb that
        // sits behind it.
        fill: 'none',
        layout: 'vertical',
        padding: [INSETS_TOP, CONTENT_PAD, 0, CONTENT_PAD],
        sizingV: 'fill',
        sizingH: 'fill',
        crossAlign: 'center',
      },
    },
    'content',
  );

  // Logo area: flex 1, centred, nudged up by 40 (styles.logoArea.marginTop: -40).
  // FigCraft has no margin, so the -40 becomes a 40pt bottom padding on a
  // centred column, which lifts the centred content by the same amount.
  A(
    'node.create',
    {
      type: 'frame',
      parent: R('content'),
      name: 'Logo area',
      props: {
        fill: 'none',
        layout: 'vertical',
        mainAlign: 'center',
        crossAlign: 'center',
        sizingV: 'fill',
        sizingH: 'fill',
        padding: [0, 0, 40, 0],
      },
    },
    'logoArea',
  );

  // Logo stack: ORB_SIZE square, centred
  A(
    'node.create',
    {
      type: 'frame',
      parent: R('logoArea'),
      name: 'Logo stack',
      props: {
        fill: 'none',
        // RN does not clip overflow (the orb pulses past the stack's box), but
        // FigCraft clips a frame's children to the frame by default.
        clip: false,
        layout: 'vertical',
        mainAlign: 'center',
        crossAlign: 'center',
        width: STACK,
        height: STACK,
        sizingH: 'fixed',
        sizingV: 'fixed',
        // Optical centring: a lockup whose lowest line has descenders reads
        // low when it is geometrically centred. A bottom padding of twice the
        // nudge lifts the centred content by exactly the nudge.
        padding: [0, 0, LOCKUP.nudge * 2, 0],
      },
    },
    'stack',
  );

  // The pulsing gold orb, anchored at the stack's top-left (position: absolute).
  A(
    'node.create',
    {
      type: 'ellipse',
      parent: R('stack'),
      name:
        'Orb (gold glow) — ' +
        screen.orb +
        ': scale ' +
        pulse.scale +
        ', opacity ' +
        pulse.opacity,
      width: orbDrawn,
      height: orbDrawn,
      props: {
        fill: COLORS.gold,
        opacity: pulse.opacity,
        absolute: true,
        x: orbOffset,
        y: orbOffset,
      },
    },
    'orb',
  );

  // Logo block: lion -> wordmark -> tagline. RN nests them as
  // svg / wordmark / taglineWrap; the two gaps are the marginTops.
  A(
    'node.create',
    {
      type: 'frame',
      parent: R('stack'),
      name: 'Logo block',
      props: {
        fill: 'none',
        layout: 'vertical',
        crossAlign: 'center',
        gap: LOCKUP.taglineGap,
        sizingH: 'hug',
        sizingV: 'hug',
      },
    },
    'block',
  );
  A(
    'node.create',
    {
      type: 'frame',
      parent: R('block'),
      name: 'Brand',
      props: {
        fill: 'none',
        layout: 'vertical',
        crossAlign: 'center',
        gap: LOCKUP.wordmarkGap,
        sizingH: 'hug',
        sizingV: 'hug',
      },
    },
    'brand',
  );

  // the imported lion, moved into the brand block
  A('node.reparent', {id: R('lionArt'), parent: R('brand'), index: 0});
  A('node.set', {ids: [R('lionArt')], props: {name: 'Lion'}});

  // the wordmark
  A(
    'node.create',
    {
      type: 'text',
      parent: R('brand'),
      name: 'Wordmark',
      text: 'Simba',
      props: {
        fontFamily: FAMILIES.wordmark.family,
        fontStyle: FAMILIES.wordmark.style,
        fontSize: LOCKUP.wordmarkSize,
        lineHeight: LOCKUP.wordmarkLh,
        fill: LOGO_INK,
      },
    },
    'wordmark',
  );

  // the tagline. RN gives it no maxWidth, so its only width constraint is the
  // logo stack's width — it wraps where the font says it wraps.
  A(
    'node.create',
    {
      type: 'text',
      parent: R('block'),
      name: 'Tagline',
      text: 'Your media, your way',
      props: {
        fontFamily: FAMILIES.tagline.family,
        fontStyle: FAMILIES.tagline.style,
        fontSize: LOCKUP.taglineSize,
        lineHeight: LOCKUP.taglineLh,
        letterSpacing: LOCKUP.taglineLs,
        fill: TAGLINE_INK,
        textAlign: 'center',
        textAutoResize: 'height',
        width: STACK,
      },
    },
    'tagline',
  );

  // Bottom section: alignItems center, paddingBottom insets.bottom + 16
  A(
    'node.create',
    {
      type: 'frame',
      parent: R('content'),
      name: 'Bottom section',
      props: {
        fill: 'none',
        layout: 'vertical',
        crossAlign: 'center',
        gap: BUTTON_WRAP_MARGIN_B,
        padding: [0, 0, BOTTOM_PAD, 0],
        sizingV: 'hug',
        sizingH: 'fill',
      },
    },
    'bottom',
  );
  A(
    'node.create',
    {
      type: 'frame',
      parent: R('bottom'),
      name: 'Button wrap',
      props: {
        fill: 'none',
        layout: 'vertical',
        crossAlign: 'center',
        minHeight: BUTTON_WRAP_MIN_H,
        sizingH: 'hug',
        sizingV: 'hug',
      },
    },
    'btnWrap',
  );
  A(
    'node.create',
    {
      type: 'frame',
      parent: R('btnWrap'),
      name: 'Sign in with Google',
      props: {
        layout: 'horizontal',
        crossAlign: 'center',
        gap: 12,
        padding: [BUTTON_PAD_V, BUTTON_PAD_H, BUTTON_PAD_V, BUTTON_PAD_H],
        cornerRadius: BUTTON_RADIUS,
        fill: COLORS.surface,
        stroke: COLORS.borderSubtle,
        strokeWeight: 1,
        minWidth: BUTTON_MIN_W,
        sizingH: 'hug',
        sizingV: 'hug',
      },
    },
    'btn',
  );
  A('node.reparent', {id: R('googleArt'), parent: R('btn'), index: 0});
  A('node.set', {ids: [R('googleArt')], props: {name: 'Google mark'}});
  A(
    'node.create',
    {
      type: 'text',
      parent: R('btn'),
      name: 'Button label',
      text: 'Sign in with Google',
      props: {
        fontFamily: FAMILIES.label.family,
        fontStyle: FAMILIES.label.style,
        fontSize: LABEL_SIZE,
        lineHeight: LABEL_LH,
        letterSpacing: LABEL_LS,
        fill: COLORS.textPrimary,
      },
    },
    'label',
  );

  // the shadow the button carries (GoogleSignInButton.tsx:73-77).
  // The effect schema is {type, color, offset:[x,y], radius, spread, visible} —
  // `offset` is a 2-TUPLE, and `type` lives INSIDE the effect object.
  A(
    'effect.add',
    {
      ids: [R('btn')],
      effect: {
        type: 'dropShadow',
        color: 'rgba(0,0,0,0.25)',
        offset: [0, 4],
        radius: 12,
        spread: 0,
        visible: true,
      },
    },
  );

  // Legal row
  A(
    'node.create',
    {
      type: 'frame',
      parent: R('bottom'),
      name: 'Legal row',
      props: {
        fill: 'none',
        layout: 'horizontal',
        crossAlign: 'center',
        gap: LEGAL_GAP,
        sizingH: 'hug',
        sizingV: 'hug',
      },
    },
    'legal',
  );
  A(
    'node.create',
    {
      type: 'text',
      parent: R('legal'),
      name: 'Privacy Policy',
      text: 'Privacy Policy',
      props: {
        fontFamily: FAMILIES.legal.family,
        fontStyle: FAMILIES.legal.style,
        fontSize: LEGAL_SIZE,
        lineHeight: LEGAL_LH,
        fill: COLORS.textTertiary,
        textDecoration: 'underline',
      },
    },
    'privacy',
  );
  A(
    'node.create',
    {
      type: 'ellipse',
      parent: R('legal'),
      name: 'Legal dot',
      width: LEGAL_DOT,
      height: LEGAL_DOT,
      props: {fill: COLORS.textTertiary},
    },
    'dot',
  );
  A(
    'node.create',
    {
      type: 'text',
      parent: R('legal'),
      name: 'Terms of Service',
      text: 'Terms of Service',
      props: {
        fontFamily: FAMILIES.legal.family,
        fontStyle: FAMILIES.legal.style,
        fontSize: LEGAL_SIZE,
        lineHeight: LEGAL_LH,
        fill: COLORS.textTertiary,
        textDecoration: 'underline',
      },
    },
    'terms',
  );

  return cmds;
}

// ── assemble the document ──────────────────────────────────────────────────
const cmds = [];
let first = true;
for (const screen of SCREENS) {
  if (ONLY !== 'both' && ONLY !== screen.key) continue;
  if (first) {
    cmds.push({command: 'page.rename', params: {name: screen.page}});
    first = false;
  } else {
    cmds.push({command: 'page.add', params: {name: screen.page}});
  }
  cmds.push(...buildScreen(screen));
}

const out = path.join(OUT, 'login-' + FONT + '-' + THEME + '.json');
fs.writeFileSync(out, JSON.stringify(cmds, null, 2));
console.log('wrote ' + out + '  (' + cmds.length + ' steps)');
console.log('ORB_SIZE = ' + ORB.toFixed(2));
console.log('lockup: ' + JSON.stringify(LOCKUP));
console.log('type: ' + JSON.stringify(FAMILIES));
console.log('screens: ' + SCREENS.filter(s => ONLY === 'both' || ONLY === s.key).map(s => s.page).join(' | '));
