#!/usr/bin/env node
/**
 * build-penpot-app.js — generates the Penpot MCP payloads for the SIMBA app
 * prototype.
 *
 * WHAT IT BUILDS
 * --------------
 * One page (`SIMBA`) holding every screen the app can actually reach, each
 * screen a board, and the connectors between them — so Penpot's **Play**
 * walks the app.
 *
 *   • Home          — drawn (light and dark), the first page designed
 *   • Splash + 47   — honest placeholders that say "not designed yet" and
 *     others          point at the tracker
 *   • the connectors — every edge read out of the app's own navigation
 *                     calls (`designs/penpot/app-boards.js`)
 *
 * The two Login boards already in the file are NOT rebuilt here: they are
 * the verified lockup, they are referenced by name, and the connector
 * that leaves them ('Sign in with Google' → Home) is attached to the
 * shape the user actually presses.
 *
 * WHY THE BUILD IS TWO CALLS
 * ---------------------------
 * The Penpot MCP endpoint rejects a request body over a few hundred
 * kilobytes (verified: HTTP 413 at 400 KB, and again at 1.1 MB). The
 * artwork alone is bigger than that, so the build is split:
 *
 *   1. the MEDIA call uploads the pictures into the file and reports
 *      their media ids,
 *   2. the BUILD call draws the boards and refers to those pictures by
 *      id.
 *
 * Both halves are generated here; the ids travel through
 * `designs/.build/penpot-media-result-*.json`, which the media call
 * writes.
 *
 * Usage (from the repo root):
 *
 *   node designs/build-penpot-app.js
 *   node <probe> callfile-out execute_code designs/.build/penpot-app-media-1.json designs/.build/penpot-media-result-1.json
 *   node designs/build-penpot-app.js            # again — now with the ids
 *   node <probe> callfile-out execute_code designs/.build/penpot-app-build.json designs/.build/penpot-build-result.json
 */

'use strict';

const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const spec = require('./penpot/app-spec');
const media = require('./penpot/media');
const {ROUTES, EDGES, V2_EDGES, placeholderBoard} = require('./penpot/app-boards');
const {homeBoard} = require('./penpot/home');
const {homeV2Board} = require('./penpot/home-v2');
const {splashBoard} = require('./penpot/splash');
const {SCREEN_W, SCREEN_H} = require('./penpot/kit');

const OUT = path.join(__dirname, '.build');
const PAGE_NAME = 'SIMBA';
const FLOW_NAME = 'SIMBA app';

/** The two boards that already exist in the file (built by the login pass). */
const LOGIN_REST = 'Login / light — orb rest';
const LOGIN_PEAK = 'Login / light — orb peak';

/**
 * How much base64 one media call may carry.
 *
 * The endpoint rejects a body over ~85 KB (measured: HTTP 413), and the
 * body is BIGGER than the base64 it carries — the plan is JSON-encoded into
 * the plugin script, and the script is JSON-encoded again, so the quotes and
 * the escapes add about a tenth on top. 78 KB of base64 was over the line
 * on a batch of the larger pictures, so the limit is 60 KB.
 */
const MEDIA_BATCH_BYTES = 60 * 1024;

/** The board name a route gets in one theme. */
function boardName(route, theme) {
  return route + ' / ' + theme;
}

/**
 * The board a route is really drawn on.
 *
 * `Login` is the exception: the login pass drew it as the two ends of the
 * orb's pulse — `Login / light — orb rest` and `Login / light — orb peak` —
 * and those are the real screen. A placeholder called `Login / light` would
 * be a second, empty copy of a screen that already exists, and every
 * connector that points at Login would point at the copy.
 */
const LOGIN_BOARD = 'Login / light — orb rest';

function boardFor(route, theme) {
  if (route === 'Login') return LOGIN_BOARD;
  return boardName(route, theme);
}

// ── the boards ─────────────────────────────────────────────────────────────
const boards = [];

/** A placeholder board for a route that is not designed yet. */
function addPlaceholder(route, theme) {
  boards.push({
    name: boardName(route, theme),
    w: SCREEN_W,
    h: SCREEN_H,
    fill: (theme === 'dark' ? spec.darkColors : spec.colors).background.primary,
    shapes: placeholderBoard(route, theme),
  });
}

// Home — the drawn boards.
//
// Two boards per theme, and the names say what each one is:
//
//   • "Home / light"          — the WHOLE page (1500 dp). This is the board
//                                the prototype walks: it holds every element
//                                of the screen, including the ones below the
//                                fold, and every connector the user can fire.
//   • "Home / light — viewport" — the 411 × 914 device frame — the first
//                                screenful, for seeing what the phone
//                                actually shows.
//
// The full page is the flow's Home because the rail, the "See All" links and
// the podcast tiles all sit below 914 dp; on the viewport board they would
// have no shape to carry their connector.
for (const theme of ['light', 'dark']) {
  const screen = homeBoard(theme, {full: false});
  boards.push({
    name: boardName('Home', theme) + ' — viewport',
    w: SCREEN_W,
    h: screen.height,
    fill: (theme === 'dark' ? spec.darkColors : spec.colors).background.primary,
    shapes: screen.shapes,
  });
  const page = homeBoard(theme, {full: true});
  boards.push({
    name: boardName('Home', theme),
    // The board is WIDER than the phone: the Explore Contents rail is a
    // horizontal rail of nine cards and a Penpot board clips its children,
    // so a 411-wide board would put six of the nine catalogue sections
    // outside the board — not drawn, not clickable. The 411-wide phone
    // column is the viewport board's content, and the hairline at x = 411
    // marks where the device's screen ends.
    w: page.width,
    h: page.height,
    fill: (theme === 'dark' ? spec.darkColors : spec.colors).background.primary,
    shapes: page.shapes,
  });
}

// Home_V2 — the redesign, on its own boards.
//
// They sit NEXT TO the Home boards, not on top of them: the Home boards are
// the screen the app has today and the walk's Home, and the V2 boards are
// the proposal. Both are on the page so they can be compared side by side.
//
// The V2 boards are not in the flow yet — the design is under review, and a
// connector to a proposal that may change is a connector to a dead end.
for (const theme of ['light', 'dark']) {
  const v2 = homeV2Board(theme);
  boards.push({
    name: 'Home_V2_' + (theme === 'dark' ? 'Dark' : 'Light'),
    w: v2.width,
    h: v2.height,
    fill: (theme === 'dark' ? spec.darkColors : spec.colors).background.primary,
    shapes: v2.shapes,
  });
}

// Home_V2 — the FRESH INSTALL state.
//
// This is the state a new user sees, and it is the state that decides what
// the TOP of the page looks like: no library at all, and no weather yet (no
// location permission, no snapshot — the app's own rule is that the chip is
// drawn only when there is a real snapshot behind it).
//
// It is drawn because "what does the screen look like before the user has
// anything?" is a design question, and the answer is not "the same screen
// with four empty rails" — it is a screen that STARTS WITH DISCOVER.
//
// The light theme only: the dark variant is the same drawing in the other
// palette, and one is enough to settle the question.
{
  const first = homeV2Board('light', {firstRun: true});
  boards.push({
    name: 'Home_V2_Light — first run',
    w: first.width,
    h: first.height,
    fill: spec.colors.background.primary,
    shapes: first.shapes,
  });
}

// Every other route — a placeholder, in the light theme. The dark variants
// of the other screens come with their own page pass.
//
// `Home` is skipped (it is drawn) and `Login` is skipped (the login pass
// drew it as the two orb boards).
for (const route of ROUTES) {
  if (route.route === 'Home') continue;
  if (route.route === 'Login') continue;
  if (route.route === 'Splash') continue;
  addPlaceholder(route.route, 'light');
}

// Splash — the app's entry point, and the board the flow starts on.
//
// It is DRAWN, not a placeholder. The splash is what the user sees first
// on every cold start, so a placeholder there means the walk opens on a
// page that says "not designed yet" — the opposite of what the app shows.
//
// It is the NATIVE splash — the `SplashActivity` the launcher starts. The
// JS splash screen that used to hold this board was removed on 2026-11-11.
//
// Both themes: the dark one is the same drawing in the other palette.
// The geometry comes from `designs/penpot/splash.js`, which reads the
// app's own source.
for (const theme of ['light', 'dark']) {
  const splash = splashBoard(theme);
  boards.push({
    name: boardName('Splash', theme),
    w: SCREEN_W,
    h: SCREEN_H,
    fill: (theme === 'dark' ? spec.darkColors : spec.colors).background.primary,
    shapes: splash.shapes,
  });
}

// ── the connectors ─────────────────────────────────────────────────────────
const links = [];

/**
 * The boards that are actually drawn. A connector can only point at a
 * shape on a board that HAS shapes, so on a placeholder board the whole
 * board is the hit target.
 */
const DESIGNED = new Set([
  boardName('Home', 'light'),
  boardName('Home', 'dark'),
]);

/** A connector from one board to another. */
function link(from, to, trigger, extra = {}) {
  links.push(Object.assign({from, to, trigger}, extra));
}

// The auth flow: Splash → Login → Home.
//
// The delay is the native splash's own hold — `SplashActivity.kt`'s
// `splashDuration = 1500L`.
link(boardName('Splash', 'light'), LOGIN_REST, 'after-delay', {
  delay: 1500,
  label: 'auto → Login',
});
link(LOGIN_REST, boardName('Home', 'light'), 'click', {
  shape: 'Sign in with Google',
  // The button's own text and the Google mark sit ON TOP of the pill, and
  // the Play viewer gives the topmost shape the click with no fall-through
  // — so the label and the mark carry the same connector as the pill.
  also: ['Button label', 'Google mark'],
  label: 'Sign in with Google',
});
link(LOGIN_REST, boardName('Privacy', 'light'), 'click', {
  shape: 'Privacy Policy',
  label: 'Privacy Policy',
});
link(LOGIN_REST, boardName('Terms', 'light'), 'click', {
  shape: 'Terms of Service',
  label: 'Terms of Service',
});
// The same three actions exist on the orb's other state, so the screen
// works whichever state the reviewer lands on.
link(LOGIN_PEAK, boardName('Home', 'light'), 'click', {
  shape: 'Sign in with Google',
  also: ['Button label', 'Google mark'],
  label: 'Sign in with Google',
});
link(LOGIN_PEAK, boardName('Privacy', 'light'), 'click', {
  shape: 'Privacy Policy',
  label: 'Privacy Policy',
});
link(LOGIN_PEAK, boardName('Terms', 'light'), 'click', {
  shape: 'Terms of Service',
  label: 'Terms of Service',
});
// The orb's pulse is an ANIMATION STATE, not a screen. Wiring it as a
// timed board-to-board swap made the walk flicker between two boards
// every three seconds, so the pulse is carried by the orb itself: click
// the orb to see the other state.
link(LOGIN_REST, LOGIN_PEAK, 'click', {
  shape: 'Orb (gold glow) — rest: scale 1, opacity 0.08',
  // The lion, the wordmark and the tagline sit ON TOP of the orb, and the
  // viewer gives the topmost shape the click — so the middle of the orb,
  // which is exactly where a person would tap, needs the connector too.
  also: ['Lion', 'Wordmark', 'Tagline'],
  label: 'the orb pulses up',
});
link(LOGIN_PEAK, LOGIN_REST, 'click', {
  shape: 'Orb (gold glow) — peak: scale 1.12, opacity 0.16',
  also: ['Lion', 'Wordmark', 'Tagline'],
  label: 'the orb pulses down',
});

// Every edge the app itself makes.
for (const edge of EDGES) {
  if (edge.from === 'Login') continue; // already wired above
  if (edge.from === 'Splash') continue; // already wired above
  if (edge.to === 'NowPlaying') continue; // the app renders that screen as null
  for (const theme of ['light', 'dark']) {
    const fromName = boardName(edge.from, theme);
    if (!boards.some(b => b.name === fromName)) continue;
    link(fromName, boardFor(edge.to, 'light'), edge.trigger, {
      // A shape-level connector needs the shape to exist. On a
      // placeholder board it does not, so the whole board is the hit
      // target until that screen is designed. The same goes for the
      // shape's family — a placeholder board has no family.
      shape: DESIGNED.has(fromName) ? edge.shape : undefined,
      family: DESIGNED.has(fromName) ? edge.family : undefined,
      also: DESIGNED.has(fromName) ? edge.also : undefined,
      delay: edge.delay,
      label: edge.label,
    });
  }
}

// The V2 boards carry the SAME app edges, on the V2 shapes. The redesign
// changes how the screen looks, not what it does — and the one edge V1 has
// that V2 does not is the GENRE edge, because the genre shelf is gone.
for (const edge of V2_EDGES) {
  for (const theme of ['light', 'dark']) {
    const fromName = 'Home_V2_' + (theme === 'dark' ? 'Dark' : 'Light');
    link(fromName, boardFor(edge.to, 'light'), edge.trigger, {
      shape: edge.shape,
      family: edge.family,
      label: edge.label,
    });
  }
}

// The way INTO the redesign. This is a PROTOTYPE-ONLY edge, and it is
// disclosed as one: the app has no route from its Home to a redesign of its
// Home. It exists so a reviewer can reach the V2 board from the walk
// instead of hunting for it on the page. The same disclosure as the Queue
// edge (md/UI_UX_PROTOTYPE_REBUILD.md §4.7.1).
link(boardName('Home', 'light'), 'Home_V2_Light', 'click', {
  shape: 'Home header wordmark',
  also: ['Home header lion'],
  label: 'see the redesign',
});

// ── the media ──────────────────────────────────────────────────────────────
// Only the pictures the boards actually use. The pictures are scaled to
// the size they are drawn at before they travel — the build payload has a
// size limit and the app's placeholders are full-size photographs.
const usedMedia = new Set();
for (const b of boards) {
  for (const s of b.shapes) {
    if (s.kind === 'image' && s.media) usedMedia.add(s.media);
  }
}
// The app's own SVG glyphs, rasterised per theme — Penpot cannot render SVG
// paths, so every glyph travels as a PNG — and the playlist cover collages,
// rendered from the app's own placeholder artwork. Both scripts are run as
// child processes so this file can stay synchronous.
cp.execFileSync('node', [path.join(__dirname, 'penpot', 'icons.js')], {stdio: 'inherit'});
cp.execFileSync('node', [path.join(__dirname, 'penpot', 'collage.js')], {stdio: 'inherit'});

media.verify();
fs.mkdirSync(media.BUILD, {recursive: true});
const jobsFile = path.join(media.BUILD, 'media-jobs.json');
fs.writeFileSync(jobsFile, JSON.stringify(media.resizeJobs()));
cp.execFileSync(
  'pwsh',
  ['-NoProfile', '-File', path.join(__dirname, 'penpot', 'resize-media.ps1'), '-Jobs', jobsFile],
  {stdio: 'inherit'},
);
const mediaPayload = media.payloadFor([...usedMedia]);

/**
 * Where the fingerprints of the uploaded pictures are kept.
 *
 * A media id says WHICH picture is in the Penpot file. The fingerprint says
 * whether the file on disk is still that picture — a regenerated asset has
 * the same key and a different fingerprint, and without this check the build
 * would reuse the OLD upload and the board would keep showing the old
 * picture. (It did exactly that once: three black playlist covers.)
 *
 * The fingerprint must be written at UPLOAD time — by the media runner, for
 * the bytes it actually sent — and by the build only for the pictures that
 * are already in the file. A picture that changed on disk and has not been
 * uploaded yet must keep the fingerprint it had, or the build would believe
 * the new picture is already in Penpot and never upload it.
 */
const FINGERPRINT_FILE = path.join(media.BUILD, 'media-fingerprints.json');

/** The media ids the media call reported, if it has already run. */
function readMediaIds() {
  const dir = media.BUILD;
  const out = {};

  // The store the media runner merges into — one file, so a later upload
  // cannot overwrite the ids an earlier one reported.
  const store = path.join(dir, 'penpot-media-ids.json');
  if (fs.existsSync(store)) {
    try {
      const map = JSON.parse(fs.readFileSync(store, 'utf8'));
      for (const [key, v] of Object.entries(map || {})) {
        if (v && v.id) out[key] = {id: v.id, width: v.width, height: v.height, mtype: v.mtype};
      }
    } catch (e) {
      // A store that cannot be read is a store that is not there.
    }
  }

  // The per-call result files the runner also writes. These are LEGACY: the
  // store above is the owner, and a per-call file can be OLDER than the
  // store's entry for the same key — the runner rewrites one file per upload
  // batch, so a stale batch still carries the previous id. A legacy file may
  // only FILL a key the store does not have; it may never override one.
  // (It did exactly that once: the dark lion's fresh id was replaced by the
  // id from an older batch, and the board kept the old ink.)
  if (!fs.existsSync(dir)) return out;
  const files = fs
    .readdirSync(dir)
    .filter(f => /^penpot-media-result-\d+\.json$/.test(f))
    .sort((a, b) => parseInt(a.match(/(\d+)\.json$/)[1], 10) - parseInt(b.match(/(\d+)\.json$/)[1], 10));
  for (const f of files) {
    let parsed;
    try {
      parsed = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    } catch (e) {
      continue;
    }
    const map = parsed && parsed.result ? parsed.result : parsed;
    if (!map || typeof map !== 'object') continue;
    for (const [key, v] of Object.entries(map)) {
      if (v && v.id && !out[key]) out[key] = {id: v.id, width: v.width, height: v.height, mtype: v.mtype};
    }
  }

  // Drop every media whose picture on disk is not the picture that was
  // uploaded, so it is uploaded again.
  let stored = {};
  try {
    stored = JSON.parse(fs.readFileSync(FINGERPRINT_FILE, 'utf8'));
  } catch (e) {
    stored = {};
  }
  for (const key of Object.keys(out)) {
    let current;
    try {
      current = media.fingerprintOf(key);
    } catch (e) {
      continue;
    }
    if (stored[key] !== current) {
      delete out[key];
      console.log('  media changed on disk — will upload again: ' + key);
    }
  }
  return out;
}
const mediaIds = readMediaIds();

// ── the plan ───────────────────────────────────────────────────────────────
// The page grid the boards are laid out on.
//
// The gaps are wide because two boards are bigger than a phone: the Home
// boards are 1500 tall and the full-page ones are 1356 wide. A tight grid
// would overlap them, and an overlapped board hides the one behind it.
const COLS = 8;
const GAP_X = 1000;
const GAP_Y = 700;

/**
 * How much plan one build call may carry.
 *
 * A board is never split across two calls, so this limit decides how many
 * boards share a call. It is kept low on purpose: the endpoint's ceiling is
 * 120 seconds, and the Home boards (250+ shapes each) need a call to
 * themselves.
 */
const BUILD_BATCH_BYTES = 26 * 1024;

/**
 * How many BOARDS one build call may draw.
 *
 * The byte limit alone is not enough. Every board waits for the canvas to lay
 * it out before its texts are measured (`settle`), and a placeholder board
 * costs ~4.6 s that way (measured: 3 placeholder boards in 13.8 s). Twenty-one
 * placeholder boards in one call therefore need ~97 s of waiting alone, and
 * the call died on the endpoint's 120-second ceiling — which also left the
 * page missing the boards the call had already removed.
 *
 * So the batches are capped by board COUNT as well: eight placeholder boards
 * is ~37 s, which leaves room inside the ceiling.
 */
const BUILD_MAX_BOARDS = 8;

/**
 * How many SHAPES one build call may draw.
 *
 * The board count is not the cost — the shapes are. Measured on 2026-11-10:
 * one board of 166 shapes took 28.3 s, so a shape costs ~0.13 s. The second
 * call of the build carried ~700 shapes and died on the 120-second ceiling
 * (the task timed out, and the renderer suspended itself afterwards, which
 * took the rest of the run with it).
 *
 * So the batches are capped by shape COUNT as well: 240 shapes is ~31 s of
 * drawing, which with the page setup and the layout settle leaves the call
 * well inside the ceiling.
 */
const BUILD_MAX_SHAPES = 240;

/**
 * The boards, split into batches that each stay inside the endpoint's
 * body limit. The last batch also carries the flow and the connectors —
 * by then every board exists, so a connector can point at a board that
 * was drawn two calls ago.
 */
const buildBatches = [];
{
  let batch = [];
  let bytes = 0;
  let shapes = 0;
  for (const b of boards) {
    const size = JSON.stringify(b).length;
    const count = (b.shapes || []).length;
    if (
      batch.length &&
      (bytes + size > BUILD_BATCH_BYTES ||
        batch.length >= BUILD_MAX_BOARDS ||
        shapes + count > BUILD_MAX_SHAPES)
    ) {
      buildBatches.push(batch);
      batch = [];
      bytes = 0;
      shapes = 0;
    }
    batch.push(b);
    bytes += size;
    shapes += count;
  }
  if (batch.length) buildBatches.push(batch);
}

const BUILD_PLAN = {
  page: PAGE_NAME,
  layout: {w: SCREEN_W, h: SCREEN_H, cols: COLS, gapX: GAP_X, gapY: GAP_Y},
  media: mediaIds,
};

// ── the plugin scripts ─────────────────────────────────────────────────────
// The helpers are shared by both halves.
const PLUGIN_PRELUDE = `
const PLAN = __PLAN__;

function parseColor(value) {
  if (!value) return null;
  const m = /^rgba?\\(([^)]+)\\)$/.exec(String(value).trim());
  if (!m) return {color: String(value).trim(), opacity: 1};
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

// Find the Penpot font that matches the app's face. When the catalogue has
// no face at exactly that weight, the closest one in the same family and
// style is used — and the weight it settled on is reported, so the report
// never claims a weight the design does not have.
function findFont(spec) {
  const want = Number(spec.weight);
  let best = null;
  for (const f of penpot.fonts.all) {
    if (f.fontFamily !== spec.family) continue;
    for (const v of (f.variants || [])) {
      if (String(v.fontStyle) !== spec.style) continue;
      const w = Number(v.fontWeight);
      if (w === want) {
        return {fontId: f.fontId, fontVariantId: v.fontVariantId, family: f.fontFamily, weight: w, style: v.fontStyle};
      }
      if (!best || Math.abs(w - want) < Math.abs(best.weight - want)) {
        best = {fontId: f.fontId, fontVariantId: v.fontVariantId, family: f.fontFamily, weight: w, style: v.fontStyle};
      }
    }
  }
  if (best) return best;
  throw new Error('no Penpot font for ' + JSON.stringify(spec));
}

// Wait for the canvas to lay the shapes out — but never fail the build
// because of it. A backgrounded canvas stops laying out (the browser
// freezes the tab), and the measurement the build needs — a text run's
// width — is available as soon as the text exists.
async function settle(ms) {
  try {
    await penpot.waitForLayoutUpdate(ms || 3000);
    return true;
  } catch (e) {
    return false;
  }
}
`;

/**
 * The MEDIA call — uploads the pictures into the file.
 *
 * The plugin's sandbox cannot fetch a remote URL, so the app's own
 * artwork travels as bytes. The pictures are scaled first (see
 * `resize-media.ps1`), so this stays inside the endpoint's body limit.
 */
const MEDIA_SCRIPT = PLUGIN_PRELUDE + `
const out = {};
for (const key of Object.keys(PLAN.media || {})) {
  const m = PLAN.media[key];
  const bin = atob(m.b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const data = await penpot.uploadMediaData(key, bytes, m.mime);
  out[key] = {id: data.id, width: data.width, height: data.height, mtype: data.mtype};
}
return out;
`;

/**
 * The BUILD call — the boards, the page, the flow and the connectors.
 *
 * The pictures are referred to by their media id: a plain object that
 * carries the id, the size and the type is enough for Penpot to paint the
 * shape (verified by exporting the shape and measuring the PNG).
 */
const BUILD_SCRIPT = PLUGIN_PRELUDE + `
const report = {page: null, flow: null, boards: [], shapes: [], links: [], media: [], errors: [], removed: []};

// the pictures, by id
const media = {};
for (const key of Object.keys(PLAN.media || {})) {
  const m = PLAN.media[key];
  media[key] = {
    id: m.id,
    width: m.width,
    height: m.height,
    mtype: m.mtype,
    name: key,
    data: async () => new Uint8Array(0),
  };
  report.media.push({key: key, id: m.id, w: m.width, h: m.height});
}

// ── the one page that holds the whole prototype ───────────────────────────
const current = penpot.currentPage;
let page = null;
for (const p of (penpot.currentFile.pages || [])) {
  if (p.name === PLAN.page) { page = p; break; }
}
if (!page) {
  page = (current.root.children || []).length === 0 ? current : penpot.createPage();
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

// ── remove the leftovers of an earlier build ───────────────────────────────
// A board this plan owns is replaced; a stray shape at the page root is
// junk (the first batch sweeps those). The boards this plan does NOT own
// — the two Login boards — are left alone.
const ourNames = PLAN.boards.map(b => b.name);
for (const child of (page.root.children || []).slice()) {
  const ours = ourNames.indexOf(child.name) >= 0;
  const stray = PLAN.cleanStrays && child.type !== 'board';
  const junk = (PLAN.remove || []).indexOf(child.name) >= 0;
  if (ours || stray || junk) {
    report.removed.push({name: child.name, type: child.type});
    child.remove();
  }
}
if (PLAN.flow) {
  for (const f of (page.flows || []).slice()) {
    report.removed.push({flow: f.name});
    f.remove();
  }
}

// ── the boards ─────────────────────────────────────────────────────────────
const boards = {};

for (const plan of PLAN.boards) {
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
    let t;
    try {
      t = penpot.createText(s.text);
    } catch (e) {
      report.errors.push('createText failed for ' + s.name + ' [' + JSON.stringify(s.text) + ']: ' + String(e).slice(0, 200));
      continue;
    }
    if (!t) {
      report.errors.push('createText returned nothing for ' + s.name + ' [' + JSON.stringify(s.text) + ']');
      continue;
    }
    const f = findFont(s.font);
    t.fontId = f.fontId;
    t.fontVariantId = f.fontVariantId;
    t.fontFamily = f.family;
    t.fontWeight = String(f.weight);
    t.fontStyle = f.style;
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
      if (s.stroke) e.strokes = strokesOf(s.stroke, s.strokeWidth);
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
      if (s.opacity !== undefined) r.opacity = s.opacity;
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
    } else if (s.kind === 'image') {
      const md = media[s.media];
      if (!md) throw new Error('no media for ' + s.media + ' (' + s.name + ')');
      const r = penpot.createRectangle();
      r.name = s.name;
      r.resize(s.w, s.h);
      r.fills = [{fillImage: md, fillOpacity: 1}];
      if (s.radius !== undefined) r.borderRadius = s.radius;
      if (s.opacity !== undefined) r.opacity = s.opacity;
      board.appendChild(r);
      shapes[s.name] = r;
    }
    order.push(s);
  }

  await settle(3000);

  // ── the horizontal positions ───────────────────────────────────────────
  //  a) the chains — a shape that hangs off the one before it
  for (let pass = 0; pass < 3; pass++) {
    for (const s of order) {
      if (!s.x || !s.x.chain) continue;
      const prev = shapes[s.x.chain.prev];
      if (!prev) continue;
      shapes[s.name].x = prev.x + prev.width + s.x.chain.gap;
    }
  }

  //  b) the centred rows
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

  //  c) the centred-on-another-shape boxes
  for (const s of order) {
    if (!s.x || !s.x.centerOf) continue;
    const ref = shapes[s.x.centerOf];
    if (!ref) continue;
    const sh = shapes[s.name];
    sh.x = ref.x + ref.width / 2 - sh.width / 2;
  }

  //  d) the plain coordinates
  for (const s of order) {
    if (typeof s.x === 'number') shapes[s.name].x = s.x;
  }

  //  e) the centred boxes
  for (const s of order) {
    if (s.x && typeof s.x === 'object' && s.x.center !== undefined) {
      shapes[s.name].x = s.x.center - shapes[s.name].width / 2;
    }
  }

  //  f) the right-anchored boxes — the shape's RIGHT edge sits at N
  for (const s of order) {
    if (s.x && typeof s.x === 'object' && s.x.right !== undefined) {
      shapes[s.name].x = s.x.right - shapes[s.name].width;
    }
  }

  //  g) the offsets from another shape
  for (let pass = 0; pass < 2; pass++) {
    for (const s of order) {
      if (!s.x || !s.x.after) continue;
      const ref = shapes[s.x.after.name];
      const sh = shapes[s.name];
      const base = s.x.after.edge === 'right' ? ref.x + ref.width : ref.x;
      sh.x = base + s.x.after.pad;
    }
  }

  // ── the vertical positions ──────────────────────────────────────────────
  for (const s of order) {
    shapes[s.name].y = s.y;
  }

  // ── the z-order — the plan's order IS the painting order ───────────────
  const painted = [];
  for (const s of plan.shapes) if (shapes[s.name]) painted.push(shapes[s.name]);
  for (let i = 0; i < painted.length; i++) board.insertChild(i, painted[i]);

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
  report.boards.push({name: plan.name, id: board.id, w: board.width, h: board.height});
}

// ── the board grid on the page ─────────────────────────────────────────────
// The boards are laid out in rows, left to right, so the page reads as a
// map of the app. The batch's own index keeps the grid whole when the
// boards are built in several calls.
const L = PLAN.layout;
const base = PLAN.index || 0;
PLAN.boards.forEach((b, i) => {
  const board = boards[b.name];
  if (!board) return;
  const col = (base + i) % L.cols;
  const row = Math.floor((base + i) / L.cols);
  board.x = col * (L.w + L.gapX);
  board.y = row * (L.h + L.gapY);
});
for (const b of report.boards) {
  const board = boards[b.name];
  if (board) {
    b.x = board.x;
    b.y = board.y;
  }
}

// ── the flow and the connectors ────────────────────────────────────────────
function boardByName(name) {
  if (boards[name]) return boards[name];
  const found = (page.root.children || []).find(c => c.name === name);
  return found || null;
}

// Only the last batch carries the flow and the links: by then every board
// exists, so a connector can point at a board drawn two calls ago.
if (PLAN.flow) {
  const start = boardByName(PLAN.flow.start);
  if (start) {
    const flow = page.createFlow(PLAN.flow.name, start);
    report.flow = {name: flow.name, start: flow.startingBoard.name};
  } else {
    report.errors.push('flow not created: no board named ' + PLAN.flow.start);
  }
}

for (const l of PLAN.links || []) {
  const from = boardByName(l.from);
  const to = boardByName(l.to);
  if (!from || !to) {
    report.errors.push('link skipped: ' + l.from + ' -> ' + l.to + ' (missing board)');
    continue;
  }
  const action = {type: 'navigate-to', destination: to};
  let target = from;
  if (l.shape) {
    const sh = (from.children || []).find(c => c.name === l.shape);
    if (!sh) {
      report.errors.push('link skipped: no shape ' + l.shape + ' on ' + l.from);
      continue;
    }
    target = sh;
  }
  try {
    if (l.delay) target.addInteraction(l.trigger, action, l.delay);
    else target.addInteraction(l.trigger, action);
    report.links.push({from: l.from, to: l.to, shape: l.shape || null, trigger: l.trigger, delay: l.delay || null, label: l.label || null});
  } catch (e) {
    report.errors.push('link failed: ' + l.from + ' -> ' + l.to + ' (' + String(e) + ')');
  }
}

report.page = {name: page.name, id: page.id, children: page.root.children.length, flows: (page.flows || []).map(f => f.name)};
return report;
`;

/**
 * The LINKS call — the connectors, and the flow they live in.
 *
 * It is a separate call from the boards for two reasons:
 *
 *   1. **The endpoint has a 120-second ceiling.** One call that drew the
 *      boards AND wired 109 connectors ran past it (measured: the call
 *      failed with "Task … timed out after 120 seconds"). The connectors
 *      therefore travel in chunks, each on its own.
 *   2. **The connectors survive the boards.** A board that is rebuilt loses
 *      its connectors. Wiring the connectors in their own pass means a later
 *      board rebuild does not silently undo the walk — the pass is
 *      idempotent (it skips a connector that is already there), so it can be
 *      run again at any time.
 *
 * The flow is created by the first chunk: one flow for the whole prototype,
 * starting at Splash, which is the app's entry point.
 */
const LINKS_SCRIPT = `
const PLAN = __PLAN__;

const report = {page: null, flow: null, links: [], skipped: [], errors: []};

// the page the prototype lives on
const current = penpot.currentPage;
let page = null;
for (const p of (penpot.currentFile.pages || [])) {
  if (p.name === PLAN.page) { page = p; break; }
}
if (!page) {
  report.errors.push('no page named ' + PLAN.page);
  return report;
}
if (page !== current) {
  await penpot.openPage(page);
  page = penpot.currentPage;
}

function boardByName(name) {
  return (page.root.children || []).find(c => c.name === name) || null;
}

// ── the flow ───────────────────────────────────────────────────────────
// One flow for the whole prototype. The old flows are dropped first: a
// flow whose starting board was deleted by a rebuild is a dead end.
if (PLAN.createFlow) {
  for (const f of (page.flows || []).slice()) f.remove();
  const start = boardByName(PLAN.createFlow.start);
  if (start) {
    const flow = page.createFlow(PLAN.createFlow.name, start);
    report.flow = {name: flow.name, start: flow.startingBoard.name};
  } else {
    report.errors.push('flow not created: no board named ' + PLAN.createFlow.start);
  }
}

// ── the connectors ────────────────────────────────────────────────────
//
// ONE CONNECTOR, MANY HIT TARGETS.
//
// Penpot's Play viewer gives the click to the TOPMOST shape under the
// pointer and does NOT fall through to the shape below it. A card is drawn
// as several shapes, and its title and description sit ON TOP of the cover
// — so a connector on the cover alone is dead wherever the text is. Every
// shape of the unit therefore carries the same connector:
//
//   • shape   — the shape the connector is named after;
//   • family  — every shape whose name starts with the family name;
//   • also    — individual extra shapes.
//
// The families are the drawing kit's own names, so the rule cannot drift
// from the drawing. (Measured in the viewer: clicking the TEXT of the
// Login button did nothing while clicking the pill beside it navigated —
// and marking the text "blocked" did NOT change that, so "blocked" is not
// a hit-test escape hatch.)
for (const l of PLAN.links || []) {
  const from = boardByName(l.from);
  const to = boardByName(l.to);
  if (!from || !to) {
    report.errors.push('link skipped: missing board ' + l.from + ' -> ' + l.to);
    continue;
  }
  const children = from.children || [];

  // the shapes that carry this connector
  const targets = [];
  const seen = {};
  const add = (sh, how) => {
    if (!sh || seen[sh.id]) return;
    seen[sh.id] = true;
    targets.push({shape: sh, how: how});
  };

  if (l.shape) {
    const sh = children.find(c => c.name === l.shape);
    if (!sh) {
      report.errors.push('link skipped: no shape "' + l.shape + '" on ' + l.from);
      continue;
    }
    add(sh, 'shape');
  }
  if (l.family) {
    const prefix = l.family + ' ';
    const family = children.filter(c => c.name.indexOf(prefix) === 0);
    if (!family.length) {
      report.errors.push('link skipped: no shape in family "' + l.family + '" on ' + l.from);
    }
    for (const sh of family) add(sh, 'family');
  }
  for (const name of l.also || []) {
    const sh = children.find(c => c.name === name);
    if (!sh) {
      report.errors.push('link skipped: no shape "' + name + '" on ' + l.from);
      continue;
    }
    add(sh, 'also');
  }
  if (!targets.length) {
    // No shape was named — the whole board is the hit target. That is what a
    // placeholder board can offer, and what the Splash → Login timer uses.
    add(from, 'board');
  }

  const action = {type: 'navigate-to', destination: to};
  for (const t of targets) {
    const target = t.shape;
    // Idempotence: a connector that is already there is left alone.
    const already = (target.interactions || []).some(function (i) {
      const a = i.action || {};
      const dest = a.destination;
      const sameDest = !!dest && (dest.id === to.id || dest.name === to.name);
      return i.trigger === l.trigger && a.type === 'navigate-to' && sameDest &&
        (i.delay || null) === (l.delay || null);
    });
    if (already) {
      report.skipped.push({from: l.from, to: l.to, shape: target.name});
      continue;
    }
    try {
      if (l.delay) target.addInteraction(l.trigger, action, l.delay);
      else target.addInteraction(l.trigger, action);
      report.links.push({from: l.from, to: l.to, shape: target.name, how: t.how, trigger: l.trigger, delay: l.delay || null, label: l.label || null});
    } catch (e) {
      report.errors.push('link failed: ' + l.from + ' -> ' + l.to + ' on ' + target.name + ' (' + String(e).slice(0, 160) + ')');
    }
  }
}

report.page = {name: page.name, id: page.id, children: page.root.children.length, flows: (page.flows || []).map(f => f.name)};
return report;
`;

/**
 * The FLOW call — the last one, and it only tidies up.
 *
 * Penpot creates a flow of its own for any board that ends up with a
 * connector, so wiring the connectors leaves stray flows behind ("Flow 1",
 * "Flow 2", …) that start wherever a board happened to get its first link.
 * One flow for the prototype is the rule, and it must start at the app's
 * entry point — so this call runs LAST and removes every flow except the
 * prototype's own, re-creating it if it is missing.
 */
const FLOW_SCRIPT = `
const PLAN = __PLAN__;

const current = penpot.currentPage;
let page = null;
for (const p of (penpot.currentFile.pages || [])) {
  if (p.name === PLAN.page) { page = p; break; }
}
if (!page) return {errors: ['no page named ' + PLAN.page], flows: []};
if (page !== current) {
  await penpot.openPage(page);
  page = penpot.currentPage;
}

const removed = [];
for (const f of (page.flows || []).slice()) {
  if (f.name !== PLAN.flow.name) { f.remove(); removed.push(f.name); }
}
let flow = (page.flows || []).find(f => f.name === PLAN.flow.name);
if (!flow) {
  const start = (page.root.children || []).find(c => c.name === PLAN.flow.start);
  if (start) flow = page.createFlow(PLAN.flow.name, start);
}
return {
  removed: removed,
  flows: (page.flows || []).map(f => ({name: f.name, start: f.startingBoard ? f.startingBoard.name : null})),
};
`;

// ── write the payloads ─────────────────────────────────────────────────────
fs.mkdirSync(OUT, {recursive: true});
// The payloads are numbered, and a run that needs FEWER calls than the last
// one would leave the extra files behind — where the runners would pick
// them up and send a stale plan to Penpot. They go first.
for (const f of fs.readdirSync(OUT)) {
  if (/^penpot-app-(media|build|links|flow)-.*\.json$/.test(f)) {
    fs.unlinkSync(path.join(OUT, f));
  }
}
function writePayload(name, code) {
  const file = path.join(OUT, name);
  fs.writeFileSync(file, JSON.stringify({code}, null, 2));
  return {file, kb: Math.round(fs.statSync(file).size / 1024)};
}

// The media calls, split so that each stays inside the endpoint's limit.
const batches = [];
let current = [];
let currentBytes = 0;
for (const [key, m] of Object.entries(mediaPayload)) {
  // A picture that is already in the file is not uploaded again — its
  // media id is known and the build refers to it by id.
  if (mediaIds[key]) continue;
  const size = m.b64.length;
  if (current.length && currentBytes + size > MEDIA_BATCH_BYTES) {
    batches.push(current);    current = [];
    currentBytes = 0;
  }
  current.push(key);
  currentBytes += size;
}
if (current.length) batches.push(current);

// The fingerprints of the pictures this build refers to. A picture that is
// uploaded in this run gets the fingerprint of the file that was uploaded;
// a picture that is already in the Penpot file keeps the one it was
// uploaded with — and if the file on disk has changed since, it was dropped
// from `mediaIds` above and is in one of the batches now.
{
  const fingerprints = {};
  // Start from what is already there. A picture that is still waiting for its
  // upload keeps the fingerprint it was uploaded with, so the next run still
  // sees that the file on disk has changed.
  try {
    Object.assign(fingerprints, JSON.parse(fs.readFileSync(FINGERPRINT_FILE, 'utf8')));
  } catch (e) {
    // No fingerprints yet.
  }
  // Only the pictures that ARE in the Penpot file, and whose picture on disk
  // is the one that was uploaded, are (re)written here. A picture that is
  // still to be uploaded must NOT be given the fingerprint of the file on
  // disk — that is how a changed picture silently kept its old upload once,
  // and the board never caught up.
  for (const key of Object.keys(mediaIds)) {
    try {
      fingerprints[key] = media.fingerprintOf(key);
    } catch (e) {
      // A picture the build does not need a fingerprint for.
    }
  }
  fs.writeFileSync(FINGERPRINT_FILE, JSON.stringify(fingerprints, null, 2));
}

const written = [];
batches.forEach((keys, i) => {
  const plan = {media: {}};
  for (const key of keys) plan.media[key] = mediaPayload[key];
  const code = MEDIA_SCRIPT.replace('__PLAN__', JSON.stringify(plan));
  written.push(writePayload('penpot-app-media-' + (i + 1) + '.json', code));
});

const buildCode = BUILD_SCRIPT;
buildBatches.forEach((group, i) => {
  const plan = Object.assign({}, BUILD_PLAN, {
    index: boards.indexOf(group[0]),
    boards: group,
    cleanStrays: i === 0,
    // The boards left behind by the earlier probes, and the Home boards
    // under their previous names (the full page is now the plain "Home"
    // and the device frame is "Home — viewport").
    remove: [
      'ZZ probe media',
      'ZZ probe fill',
      'Home / light — page',
      'Home / dark — page',
      // The empty copy of the Login screen — the real one is the orb pair.
      'Login / light',
    ],
  });
  written.push(writePayload('penpot-app-build-' + (i + 1) + '.json', buildCode.replace('__PLAN__', JSON.stringify(plan))));
});

// The connectors travel in their own chunks — see LINKS_SCRIPT.
//
// The chunk is small on purpose: one link can now fan out to a whole card
// (six shapes), and the endpoint's ceiling is 120 seconds per call.
const LINKS_PER_CALL = 10;
const linkChunks = [];
for (let i = 0; i < links.length; i += LINKS_PER_CALL) {
  linkChunks.push(links.slice(i, i + LINKS_PER_CALL));
}
linkChunks.forEach((chunk, i) => {
  const plan = {
    page: PAGE_NAME,
    links: chunk,
  };
  if (i === 0) {
    plan.createFlow = {name: FLOW_NAME, start: boardName('Splash', 'light')};
  }
  written.push(writePayload('penpot-app-links-' + (i + 1) + '.json', LINKS_SCRIPT.replace('__PLAN__', JSON.stringify(plan))));
});

// The flow tidy-up runs AFTER the connectors — Penpot creates a flow of its
// own for every board that gets a connector, so the strays only appear once
// the links are in.
written.push(
  writePayload(
    'penpot-app-flow-1.json',
    FLOW_SCRIPT.replace('__PLAN__', JSON.stringify({page: PAGE_NAME, flow: {name: FLOW_NAME, start: boardName('Splash', 'light')}})),
  ),
);

console.log('wrote to ' + OUT);
for (const w of written) console.log('  ' + path.basename(w.file).padEnd(30) + w.kb + ' KB');
console.log('  page: ' + PAGE_NAME + '   flow: ' + FLOW_NAME + '  (starts at ' + boardName('Splash', 'light') + ')');
console.log('  boards: ' + boards.length + '   links: ' + links.length + ' in ' +
  linkChunks.length + ' call' + (linkChunks.length === 1 ? '' : 's') +
  '   media: ' + usedMedia.size + ' (' + batches.length + ' upload batch' + (batches.length === 1 ? '' : 'es') + ')');
console.log('  media ids known: ' + Object.keys(mediaIds).length + '/' + usedMedia.size +
  (Object.keys(mediaIds).length === usedMedia.size ? '  — ready to build' : '  — run the media calls first'));
