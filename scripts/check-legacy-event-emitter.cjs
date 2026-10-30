#!/usr/bin/env node
/**
 * V21 W22 — legacy-event-emitter guard (B-037)
 *
 * The rule this file enforces, in one line:
 *
 *   A dependency the app ships must not call
 *   `getJSModule(RCTEventEmitter)`.
 *
 * React Native 0.86 refuses exactly that one class. From
 * `node_modules/react-native/ReactAndroid/src/main/java/com/facebook/react/runtime/BridgelessReactContext.kt:131-140`:
 *
 *   override fun <T : JavaScriptModule> getJSModule(jsInterface: Class<T>): T? {
 *     mInteropModuleRegistry?.getInteropModule(jsInterface)?.let { interopModule ->
 *       if (jsInterface == RCTEventEmitter::class.java) {
 *         logSoftException(TAG, IllegalArgumentException(
 *           "getJSModule(RCTEventEmitter) is not recommended in the new architecture …"))
 *
 * `react-native-fast-image` (unmaintained since 2020) emitted its Android
 * events that way. The app used it in 26 files, so the warning fired on
 * every image load on every screen and RN's LogBox kept a toast over the
 * player's transport row for the whole session (B-024 / B-009).
 * The package is gone (app commit `93d7ce8`); the narrow guard that
 * replaced it names one package, and the rule is a class.
 *
 * This script is the general guard. It scans the INSTALLED dependency
 * tree — not a lockfile guess — for the legacy call, and fails loudly
 * with the offending file and line.
 *
 * ── Scope, and why it is narrow ───────────────────────────────────────
 *
 * Two narrowings, both of which make the check precise rather than
 * merely fast:
 *
 *   1. REACHABILITY. Only packages reachable from the app's own
 *      `dependencies` / `devDependencies` are considered. `node_modules`
 *      holds leftovers and dev-only artifacts that the app does not
 *      ship; flagging those would be a false positive. The walk
 *      follows each installed package's own `dependencies`,
 *      `optionalDependencies` and `peerDependencies`, because a
 *      transitive dependency's native code ships in the app too.
 *
 *   2. THE `android/` DIRECTORY. React Native libraries put their
 *      Android sources under `<package>/android/`. The full tree holds
 *      ~666 packages and ~1 100 Java/Kotlin files if you scan every
 *      `.java`/`.kt` under `node_modules`; narrowing to the packages
 *      that actually ship an `android/` directory takes that to 26
 *      packages. React Native itself is not among them: since 0.7x its
 *      Android sources live in `ReactAndroid/`, not `android/`, so the
 *      framework that DEFINES the API is not scanned, and only its
 *      CONSUMERS are.
 *
 *   3. SHIPPED SOURCE ONLY. Inside `android/`, two kinds of file are
 *      not shipped and are not scanned: `build/` (Gradle build output —
 *      generated locally, gitignored, absent from the published
 *      tarball, and different on every machine) and the `test` /
 *      `androidTest` source sets (a library's test code is never
 *      compiled into the app's APK). Every per-architecture variant IS
 *      scanned — `android/fabric/src/main/**` is gesture-handler's new
 *      -architecture source, and it is exactly what this app compiles
 *      under `newArchEnabled=true`.
 *
 *      Together, 2 and 3 take the scan from 854 candidate files to
 *      660 shipped ones.
 *
 * ── Precision ─────────────────────────────────────────────────────────
 *
 * The bare token `RCTEventEmitter` is NOT the signal. Modern React
 * Native libraries subclass `Event` and implement
 * `dispatch(RCTEventEmitter)`, which React Native's own event
 * dispatcher calls with an emitter argument — that is the supported
 * path and it is not flagged. Only the legacy `getJSModule(...)`
 * lookup is.
 *
 * Comments and string literals are blanked before matching, so a
 * package that merely *mentions* the call (in a comment, or in React
 * Native's own warning text) is not flagged.
 *
 * ── The allow-list ────────────────────────────────────────────────────
 *
 * `ALLOW_LIST` below is keyed by package name and every entry carries
 * the reason it is safe. It is deliberately small: a newly added
 * dependency that does the same thing is flagged, not silently
 * allowed. An allow-listed finding is still REPORTED — it is an
 * allowed finding, not an omitted one.
 *
 * Usage:
 *   node scripts/check-legacy-event-emitter.cjs            # check the app
 *   node scripts/check-legacy-event-emitter.cjs --root DIR # check another root
 *
 * Exit code:
 *   0  — clean (or only allow-listed findings)
 *   1  — a dependency calls getJSModule(RCTEventEmitter)
 *
 * The script is intentionally side-effect free: it does not modify
 * any file. It only reports. A dependency that calls the legacy
 * lookup fails the script with a file:line error.
 *
 * It uses only Node built-ins (`node:fs`, `node:path`) — no extra deps.
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');

// ─── The rule ───────────────────────────────────────────────────────────

/**
 * The legacy lookup. `getJSModule(<something>)` — the argument is
 * captured and checked separately, so the call shape and the class are
 * two independent facts and neither one alone is a finding.
 */
const LEGACY_CALL_RE = /getJSModule\s*\(([^)]*)\)/g;

/**
 * The class React Native 0.86 refuses. Guarded by identifier
 * boundaries so `RCTDeviceEventEmitter` — a different, supported
 * class our own lib uses — can never match.
 */
const EMITTER_TOKEN_RE =
  /(?<![A-Za-z0-9_])RCTEventEmitter(?![A-Za-z0-9_])/;

// ─── The allow-list ─────────────────────────────────────────────────────

/**
 * Packages that contain the legacy call and are nonetheless safe,
 * each with the reason recorded next to the name.
 *
 * A bare package name cannot be added here: every entry must carry a
 * reason string, and the jest guard at
 * `__tests__/tooling/legacyEventEmitterCheck.test.ts` asserts it.
 *
 * @type {Record<string, string>}
 */
const ALLOW_LIST = {
  'react-native-svg':
    '`onReceiveNativeEvent()` (RenderableView.java) has no caller anywhere in ' +
    'node_modules — dead code; upstream, unfixed in the installed 15.15.5',
};

// ─── Helpers ────────────────────────────────────────────────────────────

/**
 * Blank out comments and string literals, preserving every newline and
 * every character offset, so a match keeps its original line and
 * column.
 *
 * A Java/Kotlin source can mention `getJSModule(RCTEventEmitter)` in a
 * comment ("don't do this") or in a warning string (React Native's own
 * message). Neither is a call. Blanking them keeps the check honest.
 *
 * The regions are blanked with one regex pass each and the untouched
 * spans are copied verbatim, so the cost is proportional to the source
 * but without a per-character allocation — the 854 files this script
 * reads are ~17 MB of Java/Kotlin.
 */
function stripCommentsAndStrings(src) {
  const n = src.length;
  const parts = [];
  let copyFrom = 0;
  let i = 0;

  // Same length as the region it replaces: every non-newline character
  // becomes a space, every newline stays a newline.
  const blank = (from, to) => src.slice(from, to).replace(/[^\n]/g, ' ');

  while (i < n) {
    const c = src.charCodeAt(i);

    // Line comment — `// …`
    if (c === 47 && src.charCodeAt(i + 1) === 47) {
      let j = i;
      while (j < n && src.charCodeAt(j) !== 10) j++;
      parts.push(src.slice(copyFrom, i), blank(i, j));
      copyFrom = j;
      i = j;
      continue;
    }

    // Block comment — `/* … */`
    if (c === 47 && src.charCodeAt(i + 1) === 42) {
      let j = i + 2;
      while (j < n && !(src.charCodeAt(j) === 42 && src.charCodeAt(j + 1) === 47)) j++;
      j = Math.min(j + 2, n);
      parts.push(src.slice(copyFrom, i), blank(i, j));
      copyFrom = j;
      i = j;
      continue;
    }

    // Kotlin raw string — `"""…"""`
    if (
      c === 34 &&
      src.charCodeAt(i + 1) === 34 &&
      src.charCodeAt(i + 2) === 34
    ) {
      let j = i + 3;
      while (
        j < n &&
        !(
          src.charCodeAt(j) === 34 &&
          src.charCodeAt(j + 1) === 34 &&
          src.charCodeAt(j + 2) === 34
        )
      ) {
        j++;
      }
      j = Math.min(j + 3, n);
      parts.push(src.slice(copyFrom, i), blank(i, j));
      copyFrom = j;
      i = j;
      continue;
    }

    // String or character literal — `"…"` / `'…'`
    if (c === 34 || c === 39) {
      let j = i + 1;
      while (j < n && src.charCodeAt(j) !== c) {
        if (src.charCodeAt(j) === 92) j++; // backslash escape
        j++;
      }
      j = Math.min(j + 1, n);
      parts.push(src.slice(copyFrom, i), blank(i, j));
      copyFrom = j;
      i = j;
      continue;
    }

    i++;
  }

  parts.push(src.slice(copyFrom));
  return parts.join('');
}

/**
 * Every legacy `getJSModule(RCTEventEmitter)` call in one source file.
 *
 * Returns: array of { line, column, text }
 */
function findLegacyCalls(source) {
  // Cheap pre-filter: the call cannot be there if the lookup itself is
  // not mentioned. This skips the stripper for almost every file.
  if (!source.includes('getJSModule')) return [];

  const stripped = stripCommentsAndStrings(source);
  const hits = [];
  const re = new RegExp(LEGACY_CALL_RE.source, 'g');
  let m;
  while ((m = re.exec(stripped)) !== null) {
    if (!EMITTER_TOKEN_RE.test(m[1])) continue;

    // Line and column, counted without allocating a line array.
    let line = 1;
    let lastBreak = -1;
    for (let k = 0; k < m.index; k++) {
      if (stripped.charCodeAt(k) === 10) {
        line++;
        lastBreak = k;
      }
    }
    const column = m.index - lastBreak;

    hits.push({
      line,
      column,
      text: source
        .slice(m.index, m.index + m[0].length)
        .replace(/\s+/g, ' ')
        .trim(),
    });
  }
  return hits;
}

/**
 * Read a JSON file, or null when it is missing or malformed.
 */
function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

/**
 * Index a `node_modules` directory: package name → absolute path.
 *
 * Returns null when the directory does not exist.
 */
function indexNodeModules(nodeModulesDir) {
  let entries;
  try {
    entries = fs.readdirSync(nodeModulesDir, {withFileTypes: true});
  } catch {
    return null;
  }
  const index = new Map();
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith('.')) continue;
    const full = path.join(nodeModulesDir, entry.name);
    if (entry.name.startsWith('@')) {
      // A scope directory holds the packages, not one itself.
      let scoped;
      try {
        scoped = fs.readdirSync(full, {withFileTypes: true});
      } catch {
        continue;
      }
      for (const sub of scoped) {
        if (!sub.isDirectory()) continue;
        index.set(`${entry.name}/${sub.name}`, path.join(full, sub.name));
      }
    } else {
      index.set(entry.name, full);
    }
  }
  return index;
}

/**
 * Resolve `name` the way Node does: from `fromDir`, look in
 * `fromDir/node_modules` first, then walk up.
 *
 * `root` bounds the walk, and the root's own `node_modules` is
 * `topLevel` — the index built once, so the common resolution costs
 * a map lookup instead of a filesystem stat.
 */
function resolvePackageDir(fromDir, name, root, topLevel, nestedCache) {
  const lookup = (map) => (map ? map.get(name) : undefined);

  if (fromDir === root) {
    const top = lookup(topLevel);
    if (top) return top;
  } else {
    let nested = nestedCache.get(fromDir);
    if (nested === undefined) {
      nested = indexNodeModules(path.join(fromDir, 'node_modules'));
      nestedCache.set(fromDir, nested);
    }
    const own = lookup(nested);
    if (own) return own;
    const top = lookup(topLevel);
    if (top) return top;
  }

  // Fallback for a dependency nested deeper than one level.
  let cur = fromDir;
  for (;;) {
    const parent = path.dirname(cur);
    if (parent === cur) return null;
    cur = parent;
    if (cur === root) return null; // the root's own map already answered
    const candidate = path.join(cur, 'node_modules', ...name.split('/'));
    if (fs.existsSync(path.join(candidate, 'package.json'))) return candidate;
  }
}

/**
 * Every package the app actually ships, resolved against the INSTALLED
 * tree.
 *
 * Seeds: the app's own `dependencies` + `devDependencies`.
 * Then: each installed package's `dependencies`,
 * `optionalDependencies` and `peerDependencies` — a transitive
 * dependency's native code ships in the app too.
 *
 * Returns: array of { name, dir } — `name` is the package's own
 *   declared name, `dir` its absolute path.
 */
function collectReachablePackages(root) {
  const rootPkg = readJson(path.join(root, 'package.json'));
  if (!rootPkg) return [];

  const seeds = [
    ...Object.keys(rootPkg.dependencies || {}),
    ...Object.keys(rootPkg.devDependencies || {}),
  ];

  const topLevel = indexNodeModules(path.join(root, 'node_modules'));
  const nestedCache = new Map();

  const byDir = new Map();
  const queue = seeds.map(name => ({name, fromDir: root}));

  while (queue.length > 0) {
    const {name, fromDir} = queue.shift();
    const dir = resolvePackageDir(fromDir, name, root, topLevel, nestedCache);
    if (!dir) continue;
    if (byDir.has(dir)) continue;

    const pkg = readJson(path.join(dir, 'package.json'));
    if (!pkg) continue; // not a package — a stray directory
    const declaredName = pkg.name || name;
    byDir.set(dir, {name: declaredName, dir});

    const next = [
      ...Object.keys(pkg.dependencies || {}),
      ...Object.keys(pkg.optionalDependencies || {}),
      ...Object.keys(pkg.peerDependencies || {}),
    ];
    for (const dep of next) queue.push({name: dep, fromDir: dir});
  }

  return [...byDir.values()].sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Every `.java` / `.kt` file under `dir` that is SHIPPED SOURCE.
 *
 * Two kinds of file under `<package>/android/` are excluded, and both
 * exclusions are about correctness rather than speed:
 *
 *   - `android/build/**` — Gradle build OUTPUT. It is generated
 *     locally by a previous build, it is gitignored, it is not in the
 *     published tarball, and it is not the same on every machine.
 *     Scanning it would make the check non-reproducible.
 *
 *   - `android/…/src/test/…` and `android/…/src/androidTest/…` —
 *     test sources. A library's test code is never compiled into the
 *     app's APK.
 *
 * Everything else is scanned, INCLUDING the per-architecture source
 * variants a library ships — `android/fabric/src/main/**` (the new
 * architecture), `android/paper/src/main/**` (the old one),
 * `android/noreanimated/src/main/**` and friends. Narrowing to
 * `android/src/**` alone would MISS gesture-handler's Fabric variant,
 * which is exactly the code this app compiles under
 * `newArchEnabled=true`.
 */
function* walkNativeSources(baseDir, dir, relDir) {
  let entries;
  try {
    entries = fs.readdirSync(dir, {withFileTypes: true});
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    const rel = relDir ? `${relDir}/${entry.name}` : entry.name;
    if (isExcludedPath(rel)) continue;
    if (entry.isDirectory()) {
      yield* walkNativeSources(baseDir, full, rel);
    } else if (entry.isFile() && /\.(java|kt)$/.test(entry.name)) {
      yield full;
    }
  }
}

/**
 * Is this path, relative to `<package>/android/`, shipped source?
 *
 * `build/` is excluded (Gradle output) and so is a `test`/`androidTest`
 * source set.
 */
function isExcludedPath(relPosix) {
  const segments = relPosix.split('/');
  if (segments[0] === 'build') return true;
  for (let i = 0; i + 1 < segments.length; i++) {
    if (segments[i] === 'src' && /^(test|androidTest)/.test(segments[i + 1])) {
      return true;
    }
  }
  return false;
}

// ─── The check ──────────────────────────────────────────────────────────

/**
 * Scan the installed dependency tree rooted at `root`.
 *
 * Returns:
 *   {
 *     packagesScanned, filesScanned, elapsedMs,
 *     violations: [{ package, file, line, column, text }],
 *     allowed:    [{ package, file, line, column, text, reason }]
 *   }
 */
function runCheck(root) {
  const startMs = Date.now();
  const violations = [];
  const allowed = [];
  let packagesScanned = 0;
  let filesScanned = 0;

  for (const pkg of collectReachablePackages(root)) {
    // Narrowing (2): only packages that ship an `android/` directory
    // can ship the legacy Android event path.
    const androidDir = path.join(pkg.dir, 'android');
    if (!fs.existsSync(androidDir)) continue;

    packagesScanned++;
    const reason = ALLOW_LIST[pkg.name];

    for (const file of walkNativeSources(androidDir, androidDir, '')) {
      filesScanned++;
      let source;
      try {
        source = fs.readFileSync(file, 'utf8');
      } catch {
        continue;
      }
      const hits = findLegacyCalls(source);
      if (hits.length === 0) continue;

      for (const hit of hits) {
        const finding = {
          package: pkg.name,
          file: path.relative(root, file).split(path.sep).join('/'),
          line: hit.line,
          column: hit.column,
          text: hit.text,
        };
        if (reason) {
          allowed.push({...finding, reason});
        } else {
          violations.push(finding);
        }
      }
    }
  }

  const sortFindings = (a, b) =>
    a.package.localeCompare(b.package) ||
    a.file.localeCompare(b.file) ||
    a.line - b.line ||
    a.column - b.column;

  violations.sort(sortFindings);
  allowed.sort(sortFindings);

  return {
    packagesScanned,
    filesScanned,
    elapsedMs: Date.now() - startMs,
    violations,
    allowed,
  };
}

// ─── Report ─────────────────────────────────────────────────────────────

function report(result) {
  const {packagesScanned, filesScanned, elapsedMs, violations, allowed} = result;

  console.log(
    `scanned ${packagesScanned} package(s) with android/ sources — ` +
      `${filesScanned} file(s) in ${elapsedMs}ms — ` +
      `${violations.length} error(s), ${allowed.length} allowed finding(s)`,
  );

  if (allowed.length > 0) {
    console.log('');
    for (const a of allowed) {
      console.log(
        `  ⚠ ${a.file}:${a.line}:${a.column}  [ALLOWED]  ${a.package} — ` +
          `getJSModule(RCTEventEmitter) is dead code here: ${a.reason}`,
      );
    }
  }

  if (violations.length === 0) {
    console.log('');
    console.log('✓ legacy-event-emitter check passed');
    return 0;
  }

  console.log('');
  for (const v of violations) {
    console.log(
      `  ✗ ${v.file}:${v.line}:${v.column}  [LEGACY-EMITTER]  ${v.package} — ` +
        `calls getJSModule(RCTEventEmitter) (${v.text}); ` +
        `React Native 0.86 refuses this class and warns on every use`,
    );
  }

  console.log('');
  console.log(`✗ ${violations.length} error(s) found`);
  return 1;
}

// ─── CLI ────────────────────────────────────────────────────────────────

function parseArgs(argv) {
  const args = {root: ROOT};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--root' && argv[i + 1]) {
      args.root = path.resolve(argv[i + 1]);
      i++;
    }
  }
  return args;
}

function main(argv) {
  const {root} = parseArgs(argv);
  const result = runCheck(root);
  process.exit(report(result));
}

if (require.main === module) {
  main(process.argv.slice(2));
}

module.exports = {
  ALLOW_LIST,
  LEGACY_CALL_RE,
  EMITTER_TOKEN_RE,
  collectReachablePackages,
  findLegacyCalls,
  runCheck,
  stripCommentsAndStrings,
};
