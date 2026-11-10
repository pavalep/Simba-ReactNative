#!/usr/bin/env node
/**
 * build-penpot-design.js — generates the Penpot MCP payload that recreates the
 * SIMBA login screens inside a Penpot file.
 *
 * WHY IT READS THE FIGCRAFT COMMAND LIST
 * --------------------------------------
 * The FigCraft document and the Penpot document must be the SAME design, and
 * they must not be able to drift apart. So this script does not re-read the
 * app and re-derive the values a second time — that would be two owners for
 * one fact. Instead it:
 *
 *   1. runs build-login-design.js, which parses the app's own sources
 *      (LoginScreen.tsx, tokens.ts, fontFamily.ts) and writes the FigCraft
 *      command list (designs/.build/login-intended-light.json),
 *   2. parses that command list,
 *   3. lays the tree out the way React Native's flexbox does, and
 *   4. emits the Penpot plugin payload.
 *
 * The values therefore come from the app once, and both design tools consume
 * the same numbers.
 *
 * LAYOUT
 * ------
 * The layout is computed here (not in Penpot) because Penpot's flex layout is
 * not RN's flexbox, and the design has to be diffable against the device
 * screenshot with designs/measure-lockup.js. The tree is small and columnar:
 *
 *   root 411x914
 *     Content          padding 24/32, column, fills the frame
 *       Logo area      flex 1, centred, 40 bottom padding
 *         Logo stack   295.92 square, centred
 *           Orb        absolute circle behind the lockup
 *           Logo block lion -> wordmark -> tagline
 *       Bottom section padding-bottom 40, column, gap 24
 *         Button wrap  min-height 80
 *           Button     padding 14/24, gap 12, min-width 260
 *         Legal row   gap 8
 *
 * Text is measured by PENPOT itself (the plugin knows the real font metrics),
 * so the generator only supplies the type scale, the gaps and the anchors;
 * the horizontal centring is resolved at build time from the measured widths.
 *
 * OUTPUT
 * ------
 *   designs/.build/penpot-login.json   {code: "<the plugin script>"}
 *
 * Usage (from the repo root):
 *
 *   node designs/build-penpot-design.js
 *   node <probe> callfile execute_code designs/.build/penpot-login.json
 */

'use strict';

const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const APP = path.resolve(__dirname, '..');
const OUT = path.join(__dirname, '.build');

/**
 * The themes the login boards are drawn in.
 *
 * The app's lockup follows the theme — the mark sits on the page, and the
 * page follows the theme — so the design carries a board per theme. Both
 * come out of the SAME generator, with that theme's own colours, so the
 * two cannot drift apart.
 */
const THEMES = ['light', 'dark'];

const figcraftJson = (theme) => path.join(OUT, 'login-intended-' + theme + '.json');

// ── 1. the app's values, via the FigCraft generator ─────────────────────────
// The generator writes the artwork it imports (the lion) to ONE path,
// and each theme's run overwrites it — so the artwork is READ as each
// theme is generated, not after the loop, or both boards would get the
// last theme's lion.
const themePlans = [];
for (const theme of THEMES) {
  cp.execFileSync(
    process.execPath,
    [path.join(__dirname, 'build-login-design.js'), 'intended', theme],
    {stdio: 'inherit', cwd: APP},
  );
  const commands = JSON.parse(fs.readFileSync(figcraftJson(theme), 'utf8'));
  const lionSvg = fs.readFileSync(path.join(OUT, 'assets', 'lion.svg'), 'utf8');
  themePlans.push({theme, screens: parseScreens(commands), lionSvg});
}

// The FigCraft document itself is the LIGHT one (designs/README.md) and it
// imports the lion from that path — so the light run goes last, and the
// file on disk is the light artwork.
cp.execFileSync(
  process.execPath,
  [path.join(__dirname, 'build-login-design.js'), 'intended', 'light'],
  {stdio: 'inherit', cwd: APP},
);

// ── 2. the command list as a tree ──────────────────────────────────────────
//
// Commands are resolved against the same reference names the FigCraft
// document uses, so a shape in Penpot can be traced back to a shape in the
// FigCraft file by name.
function refOf(v) {
  return v && typeof v === 'object' && v.$ref ? v.$ref : null;
}

/** The FigCraft command list as a tree of screens. */
function parseScreens(commands) {
const screens = [];
const byRef = new Map();

for (const cmd of commands) {
  if (cmd.command === 'page.rename' || cmd.command === 'page.add') {
    screens.push({page: cmd.params.name, nodes: [], imports: []});
    continue;
  }
  const screen = screens[screens.length - 1];
  if (!screen) throw new Error('a shape command arrived before any page');

  if (cmd.command === 'file.import') {
    const node = {
      kind: 'import',
      ref: cmd.as,
      path: cmd.params.path,
      name: path.basename(cmd.params.path),
      props: {},
      parent: null,
    };
    screen.imports.push(node);
    byRef.set(cmd.as, node);
    continue;
  }
  if (cmd.command === 'frame.create' || cmd.command === 'node.create') {
    const p = cmd.params;
    const node = {
      kind: p.type || 'frame', // 'frame' | 'text' | 'ellipse'
      ref: cmd.as,
      name: p.name,
      props: p.props || {},
      width: p.width,
      height: p.height,
      text: p.text,
      parent: refOf(p.parent),
      parentRef: refOf(p.parent),
      children: [],
      effects: [],
    };
    byRef.set(cmd.as, node);
    const parent = refOf(p.parent) ? byRef.get(refOf(p.parent)) : null;
    if (parent) parent.children.push(node);
    screen.nodes.push(node);
    continue;
  }
  if (cmd.command === 'node.reparent') {
    const node = byRef.get(refOf(cmd.params.id));
    const parent = byRef.get(refOf(cmd.params.parent));
    if (!node || !parent) throw new Error('reparent with an unknown reference');
    node.parent = parent;
    parent.children.push(node);
    continue;
  }
  if (cmd.command === 'node.set') {
    for (const id of cmd.params.ids || []) {
      const node = byRef.get(refOf(id));
      if (!node) throw new Error('node.set with an unknown reference');
      Object.assign(node.props, cmd.params.props || {});
      // a rename is a property change in the command list, but the tree is
      // looked up by name — so keep the node's own name in step
      if (cmd.params.props && cmd.params.props.name) node.name = cmd.params.props.name;
    }
    continue;
  }
  if (cmd.command === 'effect.add') {
    for (const id of cmd.params.ids || []) {
      const node = byRef.get(refOf(id));
      if (!node) throw new Error('effect.add with an unknown reference');
      node.effects.push(cmd.params.effect);
    }
    continue;
  }
  throw new Error('unknown FigCraft command: ' + cmd.command);
}

return screens;
}

// ── 3. the React Native layout ─────────────────────────────────────────────
//
// Every number below is read out of the command list; none of it is typed in
// here. The comments carry the RN rule that each number comes from.
function layoutOf(screen) {
  const all = screen.nodes.concat(screen.imports);
  const N = {};
  for (const n of all) N[n.name] = n;
  const find = (prefix) => all.find((n) => n.name.startsWith(prefix));

  const root = all.find((n) => n.kind === 'frame' && !n.parent);
  const content = N['Content'];
  const logoArea = N['Logo area'];
  const stack = N['Logo stack'];
  const orb = find('Orb (gold glow)');
  const block = N['Logo block'];
  const brand = N['Brand'];
  const lion = N['Lion'];
  const wordmark = N['Wordmark'];
  const tagline = N['Tagline'];
  const bottom = N['Bottom section'];
  const btnWrap = N['Button wrap'];
  const btn = N['Sign in with Google'];
  const googleMark = N['Google mark'];
  const label = N['Button label'];
  const legal = N['Legal row'];
  const privacy = N['Privacy Policy'];
  const dot = N['Legal dot'];
  const terms = N['Terms of Service'];

  const W = root.width;
  const H = root.height;

  // Content: paddingTop insets.top, paddingHorizontal 32.
  const padT = content.props.padding[0];
  const padR = content.props.padding[1];
  const padB = content.props.padding[2];
  const padL = content.props.padding[3];
  const contentX = padL;
  const contentW = W - padL - padR;
  const contentTop = padT;
  const contentH = H - padT - padB;

  // Bottom section: buttonWrap (min-height) + gap + legal row + paddingBottom.
  const btnPad = btn.props.padding;
  const labelLH = label.props.lineHeight;
  const btnH = btnPad[0] + labelLH + btnPad[2];
  const btnWrapH = Math.max(btnWrap.props.minHeight, btnH);
  const legalH = Math.max(privacy.props.lineHeight, dot.height);
  const bottomGap = bottom.props.gap;
  const bottomH = btnWrapH + bottomGap + legalH + bottom.props.padding[2];
  const bottomTop = H - bottomH;

  // Logo area: flex 1, centred, nudged up by the 40 bottom padding.
  const logoAreaH = contentH - bottomH;
  const innerH = logoAreaH - logoArea.props.padding[2];
  const stackW = stack.props.width;
  const stackH = stack.props.height;
  const stackTop = contentTop + (innerH - stackH) / 2;
  const stackX = contentX + (contentW - stackW) / 2;
  const centreX = stackX + stackW / 2;

  // Logo block: lion -> wordmark -> tagline, centred inside the stack.
  const lionW = svgSize(lion.path).w;
  const lionH = svgSize(lion.path).h;
  const markW = svgSize(googleMark.path).w;
  const markH = svgSize(googleMark.path).h;
  const brandGap = brand.props.gap;
  const brandH = lionH + brandGap + wordmark.props.lineHeight;
  const blockGap = block.props.gap;
  const blockH = brandH + blockGap + tagline.props.lineHeight;
  const blockTop = stackTop + (stackH - blockH) / 2;

  // The orb is centred on the stack and scaled about its own centre.
  const orbW = orb.width;
  const orbH = orb.height;
  const orbX = centreX - orbW / 2;
  const orbY = stackTop + stackH / 2 - orbH / 2;

  // Bottom section children.
  const btnTop = bottomTop;
  const markY = btnTop + (btnH - markH) / 2;
  const labelY = btnTop + (btnH - labelLH) / 2;
  const legalTop = bottomTop + btnWrapH + bottomGap;
  const dotY = legalTop + (legalH - dot.height) / 2;

  return {
    W,
    H,
    rootName: root.name,
    rootFill: root.props.fill,
    contentX,
    contentW,
    centreX,
    lion: {x: stackX + (stackW - lionW) / 2, y: blockTop, w: lionW, h: lionH},
    wordmark: {y: blockTop + lionH + brandGap, h: wordmark.props.lineHeight},
    tagline: {y: blockTop + brandH + blockGap, h: tagline.props.lineHeight},
    orb: {x: orbX, y: orbY, w: orbW, h: orbH},
    btn: {y: btnTop, h: btnH},
    btnPad,
    btnGap: btn.props.gap,
    mark: {y: markY, h: markH, w: markW},
    label: {y: labelY, h: labelLH},
    legal: {y: legalTop, h: legalH, gap: legal.props.gap},
    dot: {y: dotY, h: dot.height, w: dot.width},
    nodes: {block, brand, lion, wordmark, tagline, orb, btn, googleMark, label, legal, privacy, dot, terms},
  };
}

// ── 4. the Penpot plan ─────────────────────────────────────────────────────
//
// The app's font FILES map onto Penpot's Google-Fonts catalogue by weight.
// The app names its SemiBold file 'Inter SemiBold' because that is the file;
// inside the Inter family that face IS weight 600.
const PENPOT_FONTS = {
  'Allura': {family: 'Allura', weight: '400', style: 'normal'},
  'Cormorant Garamond': {family: 'Cormorant Garamond', weight: '400', style: 'normal'},
  'Inter': {family: 'Inter', weight: '400', style: 'normal'},
  'Inter SemiBold': {family: 'Inter', weight: '600', style: 'normal'},
  'Manrope SemiBold': {family: 'Manrope', weight: '600', style: 'normal'},
};

function fontSpec(props) {
  const family = props.fontFamily;
  const base = PENPOT_FONTS[family];
  if (!base) throw new Error('no Penpot font mapping for ' + family);
  const italic = props.fontStyle === 'Italic';
  return {
    family: base.family,
    weight: base.weight,
    style: italic ? 'italic' : base.style,
  };
}

function svgWidthHeight(file) {
  const raw = fs.readFileSync(file, 'utf8');
  const m = /width="([\d.]+)"\s+height="([\d.]+)"/.exec(raw);
  return {svg: raw, w: m ? Number(m[1]) : null, h: m ? Number(m[2]) : null};
}

// An imported SVG carries its size in the FILE, not in the command list —
// so the size has to come from the artwork itself.
const svgSizes = new Map();
function svgSize(file) {
  if (!svgSizes.has(file)) svgSizes.set(file, svgWidthHeight(file));
  return svgSizes.get(file);
}

function planOf(screen, lionSvg) {
  const L = layoutOf(screen);
  const N = L.nodes;

  const shapes = [];

  // the orb — behind everything, drawn first
  shapes.push({
    kind: 'ellipse',
    name: N.orb.name,
    x: L.orb.x,
    y: L.orb.y,
    w: L.orb.w,
    h: L.orb.h,
    fill: N.orb.props.fill,
    opacity: N.orb.props.opacity,
  });

  // the lion emblem
  // The lion emblem — the ARTWORK of this board's theme. The
  // generator writes one artwork file for both themes, so each theme's
  // is read as that theme is generated.
  shapes.push({
    kind: 'svg',
    name: 'Lion',
    x: L.lion.x,
    y: L.lion.y,
    w: L.lion.w,
    h: L.lion.h,
    svg: lionSvg,
  });

  // the wordmark — the hero of the lockup
  shapes.push({
    kind: 'text',
    name: 'Wordmark',
    text: N.wordmark.text,
    font: fontSpec(N.wordmark.props),
    size: N.wordmark.props.fontSize,
    lineHeight: N.wordmark.props.lineHeight,
    letterSpacing: N.wordmark.props.letterSpacing || 0,
    fill: N.wordmark.props.fill,
    y: L.wordmark.y,
    x: {center: L.centreX},
  });

  // the tagline — one quiet line under the name
  shapes.push({
    kind: 'text',
    name: 'Tagline',
    text: N.tagline.text,
    font: fontSpec(N.tagline.props),
    size: N.tagline.props.fontSize,
    lineHeight: N.tagline.props.lineHeight,
    letterSpacing: N.tagline.props.letterSpacing || 0,
    fill: N.tagline.props.fill,
    align: N.tagline.props.textAlign || 'left',
    y: L.tagline.y,
    x: {center: L.centreX},
  });

  // the Google sign-in button
  const btnEffect = (N.btn.effects || [])[0];
  shapes.push({
    kind: 'rect',
    name: N.btn.name,
    x: {center: L.centreX},
    y: L.btn.y,
    w: {min: N.btn.props.minWidth, text: 'Button label', extra: L.btnPad[1] + L.mark.w + L.btnGap + L.btnPad[3]},
    h: L.btn.h,
    radius: N.btn.props.cornerRadius,
    fill: N.btn.props.fill,
    stroke: N.btn.props.stroke,
    strokeWidth: N.btn.props.strokeWeight,
    shadow: btnEffect
      ? {
          color: btnEffect.color,
          offsetX: btnEffect.offset[0],
          offsetY: btnEffect.offset[1],
          blur: btnEffect.radius,
          spread: btnEffect.spread || 0,
        }
      : null,
  });

  const googleArt = svgWidthHeight(N.googleMark.path);
  shapes.push({
    kind: 'svg',
    name: 'Google mark',
    x: {after: {name: N.btn.name, pad: L.btnPad[1], edge: 'left'}},
    y: L.mark.y,
    w: L.mark.w,
    h: L.mark.h,
    svg: googleArt.svg,
  });

  shapes.push({
    kind: 'text',
    name: 'Button label',
    text: N.label.text,
    font: fontSpec(N.label.props),
    size: N.label.props.fontSize,
    lineHeight: N.label.props.lineHeight,
    letterSpacing: N.label.props.letterSpacing || 0,
    fill: N.label.props.fill,
    y: L.label.y,
    x: {after: {name: 'Google mark', pad: N.btn.props.gap, edge: 'right'}},
  });

  // the legal row — centred row of two links and a dot
  const rowOrder = ['Privacy Policy', 'Legal dot', 'Terms of Service'];
  shapes.push({
    kind: 'text',
    name: 'Privacy Policy',
    text: N.privacy.text,
    font: fontSpec(N.privacy.props),
    size: N.privacy.props.fontSize,
    lineHeight: N.privacy.props.lineHeight,
    letterSpacing: N.privacy.props.letterSpacing || 0,
    fill: N.privacy.props.fill,
    decoration: N.privacy.props.textDecoration,
    y: L.legal.y,
    x: {row: {gap: L.legal.gap, center: L.centreX, order: rowOrder}},
  });
  shapes.push({
    kind: 'ellipse',
    name: 'Legal dot',
    x: {row: {gap: L.legal.gap, center: L.centreX, order: rowOrder}},
    y: L.dot.y,
    w: L.dot.w,
    h: L.dot.h,
    fill: N.dot.props.fill,
  });
  shapes.push({
    kind: 'text',
    name: 'Terms of Service',
    text: N.terms.text,
    font: fontSpec(N.terms.props),
    size: N.terms.props.fontSize,
    lineHeight: N.terms.props.lineHeight,
    letterSpacing: N.terms.props.letterSpacing || 0,
    fill: N.terms.props.fill,
    decoration: N.terms.props.textDecoration,
    y: L.legal.y,
    x: {row: {gap: L.legal.gap, center: L.centreX, order: rowOrder}},
  });

  return {
    page: screen.page,
    board: {
      name: L.rootName,
      w: L.W,
      h: L.H,
      fill: L.rootFill,
      x: 0,
      y: 0,
    },
    shapes,
  };
}

// ── 5. the page, the boards and the connectors ──────────────────────────────
//
// The prototype is ONE page holding every screen, with a flow and the
// connectors between the screens — the way a prototype is built in Figma.
// The two orb states are the two ends of the app's pulse loop
// (useLoginScreen.ts: Animated.loop, 3000 ms up + 3000 ms down), so they
// are wired to each other both ways: automatically after 3000 ms (the
// pulse) and on click (so the flow can also be walked by hand).
const BOARD_GAP = 100;
const PULSE_MS = 3000; // the app's own pulse half-cycle (useLoginScreen.ts)

// The login boards sit in the free column to the RIGHT of the app's own
// grid (8 columns of 411 + 1000 gap, so the grid ends at 10288). The
// login pass owns these boards, so it places them itself.
const LOGIN_X0 = 11288;

const plans = [];
for (const tp of themePlans) {
  for (const screen of tp.screens) {
    const p = planOf(screen, tp.lionSvg);
    // The theme travels ON the board, because the board is what the
    // payload carries (and what the per-theme calls are split by).
    p.board.theme = tp.theme;
    plans.push(p);
  }
}
plans.forEach((p, i) => {
  p.board.x = LOGIN_X0 + i * (p.board.w + BOARD_GAP);
});

const restBoard = plans.find((p) => p.board.theme === 'light' && p.board.name.includes('orb rest'));

const PROTOTYPE = {
  page: 'SIMBA',
  flow: {name: 'SIMBA app', start: restBoard ? restBoard.board.name : plans[0].board.name},
  boards: plans.map((p) => Object.assign({}, p.board, {shapes: p.shapes})),
  links: [],
};

// The pulse is wired for EACH theme: the two ends of the orb's
// animation in the light theme, and the same two ends in the dark one.
for (const theme of THEMES) {
  const rest = plans.find((p) => p.board.theme === theme && p.board.name.includes('orb rest'));
  const peak = plans.find((p) => p.board.theme === theme && p.board.name.includes('orb peak'));
  if (!rest || !peak) continue;
  PROTOTYPE.links.push(
    {
      from: rest.board.name,
      to: peak.board.name,
      trigger: 'after-delay',
      delay: PULSE_MS,
      label: 'the orb pulses up',
    },
    {
      from: peak.board.name,
      to: rest.board.name,
      trigger: 'after-delay',
      delay: PULSE_MS,
      label: 'the orb pulses down',
    },
    {
      from: rest.board.name,
      to: peak.board.name,
      trigger: 'click',
      label: 'click the screen (at rest)',
    },
    {
      from: peak.board.name,
      to: rest.board.name,
      trigger: 'click',
      label: 'click the screen (at peak)',
    },
  );
}

// ── 5. the plugin script ───────────────────────────────────────────────────
//
// The script is generic: it takes the plan, creates the shapes, lets PENPOT
// measure the text, resolves the horizontal positions and reports the result
// so the build can be diffed against the computed geometry.
const PLUGIN_SOURCE = `
const PLAN = __PLAN__;

function parseColor(value) {
  if (!value) return null;
  const m = /^rgba?\\(([^)]+)\\)$/.exec(value.trim());
  if (!m) return {color: value.trim(), opacity: 1};
  const parts = m[1].split(',').map(s => parseFloat(s.trim()));
  const rgb = parts.slice(0, 3).map(c => {
    const n = Math.max(0, Math.min(255, Math.round(c)));
    return ('0' + n.toString(16)).slice(-2);
  }).join('').toUpperCase();
  return {color: '#' + rgb, opacity: parts.length > 3 ? parts[3] : 1};
}

function fillsOf(value) {
  const c = parseColor(value);
  if (!c) return [];
  return [{fillColor: c.color, fillOpacity: c.opacity}];
}

function strokesOf(value, width) {
  const c = parseColor(value);
  if (!c) return [];
  return [{
    strokeColor: c.color,
    strokeOpacity: c.opacity,
    strokeWidth: width || 1,
    strokeStyle: 'solid',
    strokeAlignment: 'inner',
  }];
}

// Find the Penpot font that matches the app's face.
function findFont(spec) {
  const all = penpot.fonts.all;
  for (const f of all) {
    if (f.fontFamily !== spec.family) continue;
    for (const v of (f.variants || [])) {
      if (String(v.fontWeight) === spec.weight && String(v.fontStyle) === spec.style) {
        return {fontId: f.fontId, fontVariantId: v.fontVariantId, family: f.fontFamily};
      }
    }
  }
  throw new Error('no Penpot font for ' + JSON.stringify(spec));
}

const report = {pages: [], boards: [], shapes: [], links: [], removed: [], errors: []};

const current = penpot.currentPage;

// ── the one page that holds the whole prototype ────────────────────────────
let page = null;
for (const p of (penpot.currentFile.pages || [])) {
  if (p.name === PLAN.page) { page = p; break; }
}
if (!page) {
  const currentChildren = current.root.children || [];
  page = currentChildren.length === 0 ? current : penpot.createPage();
  if (page.name !== PLAN.page) page.name = PLAN.page;
  if (page !== current) {
    await penpot.openPage(page);
    page = penpot.currentPage;
  }
} else if (page !== current) {
  await penpot.openPage(page);
  page = penpot.currentPage;
}
if (page.name !== PLAN.page) page.name = PLAN.page;

// ── remove the leftovers of an earlier build ────────────────────────────────
// A page that holds only boards of this plan (or nothing) is a leftover and
// is removed; anything the user put there by hand stays.
const boardNames = PLAN.boards.map(b => b.name);
for (const p of (penpot.currentFile.pages || []).slice()) {
  if (p.id === page.id) continue;
  const children = p.root.children || [];
  const onlyOurs = children.every(c => boardNames.indexOf(c.name) >= 0);
  if (children.length === 0 || onlyOurs) {
    report.removed.push({page: p.name});
    p.remove();
  }
}
// the flows of an earlier build
for (const f of (page.flows || []).slice()) {
  report.removed.push({flow: f.name});
  f.remove();
}
// the boards of an earlier build, and any stray shape
for (const child of (page.root.children || []).slice()) {
  if (boardNames.indexOf(child.name) >= 0 || child.type !== 'board') {
    report.removed.push({shape: child.name});
    child.remove();
  }
}

// ── the boards ──────────────────────────────────────────────────────────────
const boards = {};

for (const plan of PLAN.boards) {
  // the board is the screen frame
  const board = penpot.createBoard();
  board.name = plan.name;
  board.resize(plan.w, plan.h);
  board.fills = fillsOf(plan.fill);
  page.root.appendChild(board);
  boards[plan.name] = board;

  const shapes = {};
  const order = [];

  // pass 1 — the texts, so Penpot can measure them
  for (const s of plan.shapes) {
    if (s.kind !== 'text') continue;
    const t = penpot.createText(s.text);
    if (!t) throw new Error('createText failed for ' + s.name);
    const f = findFont(s.font);
    t.fontId = f.fontId;
    t.fontVariantId = f.fontVariantId;
    t.fontFamily = f.family;
    t.fontWeight = s.font.weight;
    t.fontStyle = s.font.style;
    t.fontSize = String(s.size);
    // Penpot stores the line height as a MULTIPLE of the font size, so the
    // app's pixel line height has to be divided by the size.
    t.lineHeight = String(s.lineHeight / s.size);
    t.letterSpacing = String(s.letterSpacing || 0);
    t.growType = 'auto-width';
    if (s.align) t.align = s.align;
    if (s.decoration) t.textDecoration = s.decoration;
    t.fills = fillsOf(s.fill);
    t.name = s.name;
    board.appendChild(t);
    shapes[s.name] = t;
    order.push(s);
  }

  // pass 2 — everything else, with the widths that depend on a measured text
  for (const s of plan.shapes) {
    if (s.kind === 'text') continue;
    if (s.kind === 'ellipse') {
      const e = penpot.createEllipse();
      e.name = s.name;
      e.resize(s.w, s.h);
      e.fills = fillsOf(s.fill);
      if (s.opacity !== undefined) e.opacity = s.opacity;
      board.appendChild(e);
      shapes[s.name] = e;
    } else if (s.kind === 'rect') {
      const r = penpot.createRectangle();
      r.name = s.name;
      let w = s.w;
      if (typeof w === 'object') {
        const t = shapes[w.text];
        w = Math.max(w.min, (t ? t.width : 0) + w.extra);
      }
      r.resize(w, s.h);
      r.fills = fillsOf(s.fill);
      if (s.stroke) r.strokes = strokesOf(s.stroke, s.strokeWidth);
      if (s.radius !== undefined) r.borderRadius = s.radius;
      if (s.shadow) {
        const c = parseColor(s.shadow.color) || {color: '#000000', opacity: 0.25};
        r.shadows = [{
          style: 'drop-shadow',
          offsetX: s.shadow.offsetX,
          offsetY: s.shadow.offsetY,
          blur: s.shadow.blur,
          spread: s.shadow.spread,
          hidden: false,
          color: {r: c.color, alpha: c.opacity},
        }];
      }
      board.appendChild(r);
      shapes[s.name] = r;
    } else if (s.kind === 'svg') {
      const g = penpot.createShapeFromSvg(s.svg);
      if (!g) throw new Error('createShapeFromSvg failed for ' + s.name);
      g.name = s.name;
      g.resize(s.w, s.h);
      board.appendChild(g);
      shapes[s.name] = g;
    }
    order.push(s);
  }

  // Wait for the canvas to lay the texts out. The horizontal
  // positions are resolved from the widths PENPOT measures, so those
  // widths have to exist.
  //
  // The wait is BOUNDED and POLLED. An unbounded waitForLayoutUpdate()
  // never returns on a canvas that is not laying out, and the MCP call
  // then dies at its 120-second ceiling with half the boards drawn and
  // the rest missing.
  const deadline = Date.now() + 25000;
  let measured = false;
  while (Date.now() < deadline) {
    try {
      await penpot.waitForLayoutUpdate(1000);
    } catch (e) {
      // the canvas is not laying out — keep polling until the deadline
    }
    measured = order.every((s) => s.kind !== 'text' || (shapes[s.name] && shapes[s.name].width > 0));
    if (measured) break;
  }
  if (!measured) report.errors.push('the texts were not measured on ' + plan.name);

  // pass 3 — the horizontal positions
  //  a) the centred rows
  const rowSpecs = {};
  for (const s of order) {
    if (s.x && s.x.row) {
      const key = s.x.row.gap + ':' + s.x.row.center + ':' + s.x.row.order.join('|');
      if (!rowSpecs[key]) rowSpecs[key] = {spec: s.x.row, items: []};
      rowSpecs[key].items.push(s.name);
    }
  }
  for (const key of Object.keys(rowSpecs)) {
    const {spec, items} = rowSpecs[key];
    // the row's own order is the design's order, not the creation order
    const names = spec.order.filter(n => items.indexOf(n) >= 0);
    let total = 0;
    for (const name of names) total += shapes[name].width;
    total += spec.gap * (names.length - 1);
    let cursor = spec.center - total / 2;
    for (const name of names) {
      const sh = shapes[name];
      sh.x = cursor;
      cursor += sh.width + spec.gap;
    }
  }

  //  b) the plain coordinates
  for (const s of order) {
    if (typeof s.x === 'number') shapes[s.name].x = s.x;
  }

  //  c) the centred boxes
  for (const s of order) {
    if (s.x && typeof s.x === 'object' && s.x.center !== undefined) {
      shapes[s.name].x = s.x.center - shapes[s.name].width / 2;
    }
  }

  //  d) the offsets from another shape
  for (let pass = 0; pass < 2; pass++) {
    for (const s of order) {
      if (!s.x || !s.x.after) continue;
      const ref = shapes[s.x.after.name];
      const sh = shapes[s.name];
      const base = s.x.after.edge === 'right' ? ref.x + ref.width : ref.x;
      sh.x = base + s.x.after.pad;
    }
  }

  //  e) the vertical positions
  for (const s of order) {
    shapes[s.name].y = s.y;
  }

  //  f) the z-order — the plan's order IS the painting order (the orb is
  //     behind the lockup, the button label is on top of the button). The
  //     texts are created first so that Penpot can measure them, so the
  //     order has to be restored afterwards.
  const painted = [];
  for (const s of plan.shapes) if (shapes[s.name]) painted.push(shapes[s.name]);
  for (let i = 0; i < painted.length; i++) board.insertChild(i, painted[i]);

  //  g) the board's place on the page — moving a board carries its children
  board.x = plan.x;
  board.y = plan.y;

  for (const s of order) {
    const sh = shapes[s.name];
    report.shapes.push({
      board: plan.name,
      name: s.name,
      kind: s.kind,
      x: Math.round(sh.x * 100) / 100,
      y: Math.round(sh.y * 100) / 100,
      w: Math.round(sh.width * 100) / 100,
      h: Math.round(sh.height * 100) / 100,
    });
  }
  report.boards.push({name: plan.name, id: board.id, x: board.x, y: board.y, w: board.width, h: board.height});
}

// ── the flow and the connectors ─────────────────────────────────────────────
if (PLAN.flow && boards[PLAN.flow.start]) {
  const flow = page.createFlow(PLAN.flow.name, boards[PLAN.flow.start]);
  report.flow = {name: flow.name, start: flow.startingBoard.name};
}

for (const link of PLAN.links) {
  const from = boards[link.from];
  const to = boards[link.to];
  if (!from || !to) {
    report.errors.push('link skipped: ' + link.from + ' -> ' + link.to);
    continue;
  }
  const action = {type: 'navigate-to', destination: to};
  try {
    if (link.delay) from.addInteraction(link.trigger, action, link.delay);
    else from.addInteraction(link.trigger, action);
    report.links.push({from: link.from, to: link.to, trigger: link.trigger, delay: link.delay || null, label: link.label});
  } catch (e) {
    report.errors.push('link failed: ' + link.from + ' -> ' + link.to + ' (' + String(e) + ')');
  }
}

report.pages.push({page: page.name, id: page.id, children: page.root.children.length, flows: (page.flows || []).map(f => f.name)});

return report;
`;

// ONE CALL PER THEME.
//
// The MCP endpoint gives a call 120 seconds, and four boards of text to
// measure and lay out do not fit in that — the call was killed half way
// through, with one board drawn and the rest missing. Two boards do.
//
// Each call owns its own theme's boards, so the light call never touches
// the dark boards and the dark call never touches the light ones.
for (const theme of THEMES) {
  const subset = {
    page: PROTOTYPE.page,
    flow: PROTOTYPE.flow,
    boards: PROTOTYPE.boards.filter((b) => b.theme === theme),
    links: PROTOTYPE.links.filter((l) => l.from.indexOf(' / ' + theme + ' ') >= 0),
  };
  const code = PLUGIN_SOURCE.replace('__PLAN__', JSON.stringify(subset));
  const outFile = path.join(OUT, 'penpot-login-' + theme + '.json');
  fs.writeFileSync(outFile, JSON.stringify({code}, null, 2));
  console.log('wrote ' + outFile + '  (' + subset.boards.length + ' boards, ' + subset.links.length + ' links)');
}

const outFile = path.join(OUT, 'penpot-prototype.json');
fs.writeFileSync(outFile, JSON.stringify({code: PLUGIN_SOURCE.replace('__PLAN__', JSON.stringify(PROTOTYPE))}, null, 2));

console.log('wrote ' + outFile + '  (the whole plan, for the record)');
console.log('  page: ' + PROTOTYPE.page + '   flow: ' + PROTOTYPE.flow.name + '  (starts at ' + PROTOTYPE.flow.start + ')');
for (const b of PROTOTYPE.boards) {
  console.log('  board: ' + b.name + '  ' + b.w + 'x' + b.h + '  at ' + b.x + ',' + b.y);
}
for (const l of PROTOTYPE.links) {
  console.log('  link:  ' + l.from + '  --(' + l.trigger + (l.delay ? ' ' + l.delay + 'ms' : '') + ')-->  ' + l.to + '   [' + l.label + ']');
}

