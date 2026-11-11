#!/usr/bin/env node
/**
 * check-board-routes.js — the board registry must cover the app's routes.
 *
 * WHY THIS EXISTS
 * ---------------
 * On 2026-11-11 the RC1 wave added a Profile edge to `FollowedPodcasts` and
 * the connector came back SKIPPED — "missing board". The route exists in the
 * app (`src/navigation/types.ts:88-96`) and the app's own Home rail has
 * pointed at it since the rail was written
 * (`src/screens/Home/index.tsx:71-80`), but the prototype's registry had
 * never heard of it. The registry was written once and never checked against
 * the app again.
 *
 * So the prototype said the app's "See all Followed Podcasts" went to the
 * CATALOGUE — the very page the app's own comment says cannot answer the
 * question. The app was right; the design had drifted.
 *
 * WHAT IT CHECKS
 * --------------
 * Every route in the app's `RootStackParamList` must either have a board or
 * be on the DELIBERATE exclusion list below. A new route that nobody added
 * to the exclusion list fails the check.
 *
 * The exclusion list is not a place to hide a route — it is a list of
 * routes that have no board ON PURPOSE, and each line says why.
 *
 * Usage:
 *   node designs/check-board-routes.js
 */

'use strict';

const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const ROOT = path.resolve(__dirname, '..');
const TYPES = path.join(ROOT, 'src', 'navigation', 'types.ts');

/**
 * The routes that have NO board, and why.
 *
 * These four are deep-link-only: nothing in the app navigates to them from
 * a tap, so a board would be a screen no prototype walk can reach. The
 * registry's own comment (`app-boards.js`) has said so from day one.
 */
const DELIBERATELY_WITHOUT_A_BOARD = {
  SongScreen: 'deep-link only — nothing navigates to it from a tap',
  AllVideosScreen: 'deep-link only — the Library reaches its contents',
  MusicDetail: 'deep-link only — nothing navigates to it from a tap',
  NowPlaying: 'deep-link only, and the screen renders null',
};

/**
 * The boards that have NO app route, and why.
 *
 * The Splash is not a JS route — it is the native `SplashActivity` the
 * launcher starts before the bundle mounts (`src/navigation/types.ts` has no
 * `Splash` key, and the JS splash screen was deleted on 2026-11-11). It is
 * still the first thing the user sees on every cold start, so it has a
 * board.
 */
const BOARDS_WITHOUT_AN_APP_ROUTE = {
  Splash: 'the native SplashActivity — not a JS route',
};

/** Read the route names out of the app's own navigation types. */
function appRoutes() {
  const src = fs.readFileSync(TYPES, 'utf8');
  const sf = ts.createSourceFile(
    'types.ts',
    src,
    ts.ScriptTarget.ESNext,
    /* setParentNodes */ true,
    ts.ScriptKind.TS,
  );
  const routes = [];
  for (const stmt of sf.statements) {
    if (!ts.isTypeAliasDeclaration(stmt)) continue;
    if (stmt.name.text !== 'RootStackParamList') continue;
    if (!ts.isTypeLiteralNode(stmt.type)) continue;
    for (const member of stmt.type.members) {
      if (member.name && member.name.text) routes.push(member.name.text);
    }
  }
  return routes;
}

const {ROUTES} = require('./penpot/app-boards');

const boarded = new Set(ROUTES.map(r => r.route));
const routes = appRoutes();

const missing = [];
const stale = [];
for (const route of routes) {
  if (boarded.has(route)) continue;
  if (route in DELIBERATELY_WITHOUT_A_BOARD) continue;
  missing.push(route);
}
for (const route of boarded) {
  if (routes.includes(route)) continue;
  if (route in BOARDS_WITHOUT_AN_APP_ROUTE) continue;
  stale.push(route);
}

console.log('app routes      :', routes.length);
console.log('boards          :', boarded.size);
console.log('no board, on purpose:', Object.keys(DELIBERATELY_WITHOUT_A_BOARD).length);

if (missing.length) {
  console.error('\nROUTES WITH NO BOARD AND NO REASON:');
  for (const r of missing) console.error('  ' + r);
}
if (stale.length) {
  console.error('\nBOARDS FOR ROUTES THE APP DOES NOT HAVE:');
  for (const r of stale) console.error('  ' + r);
}

if (missing.length || stale.length) {
  console.error(
    '\nThe board registry has drifted from the app.\n' +
      'Add a board for each route above, or add it to\n' +
      'DELIBERATELY_WITHOUT_A_BOARD with the reason it has none.',
  );
  process.exit(1);
}

console.log('\nOK — the board registry covers every app route.');
