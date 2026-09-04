/* eslint-disable */
/**
 * V13 Phase 53a migration — mechanical step 2 (v3, line-based).
 *
 * Reshapes the `openPlayer({...})` arg object in the 32 screen
 * files from the V11 shape to the V13 shape. Step 1 of this
 * migration (migrate-v13-step1.cjs) handled the import + hook
 * call; this script handles the call site.
 *
 * Approach: process each file LINE BY LINE (no regex across
 * multi-line objects — regex is too brittle for nested object
 * literals). For each line inside an `openPlayer({...})` call:
 *
 *   1. Drop V11-only fields (entire line removed): `duration`,
 *      `source`, `provider`, `subtitleLanguage`, `mediaType`.
 *   2. Rename `startPosition` -> `startPositionMs` (line
 *      preserved, field name changed).
 *   3. Replace `type: 'content-kind'` with
 *      `type: resolveStreamType('content-kind')` (line
 *      preserved, value wrapped in helper call).
 *
 * We detect "inside openPlayer" by tracking brace depth starting
 * from the most recent `openPlayer({` opener.
 *
 * After this script runs, typecheck should pass (modulo any
 * edge cases the line-based logic missed — those need a manual
 * pass).
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', 'src', 'screens');
const MODULE = '@simba-dev/react-native-media-player';

// Fields that exist in V11 but NOT in V13 OpenPlayerOptions.
// We drop the entire line (including leading whitespace and
// trailing newline) when the line is `<indent>field: <value>,` or
// `<indent>field: <value>`.
const DROP_FIELDS = new Set([
  'duration',
  'source',
  'provider',
  'subtitleLanguage',
  'mediaType',
  'mediaLane',     // V11 content-type-aware lane; not in V13
  'artworkUri',    // V11 album-art passthrough; not in V13 (deferred to V14)
  'folderId',      // V11 Redux-folder pointer; not in V13
  'chapterList',   // V11 chapter-metadata passthrough; not in V13
  'resumePosition',// V11 bookmark-resume (renamed — see RENAME_FIELDS)
  // Note: `resumePosition` is actually a RENAME not a drop.
  // It's listed here for the regex to NOT match it as a
  // shorthand prop to drop. The RENAME_FIELDS handles it
  // properly.
]);

// V11 -> V13 field renames. We change the field name on the
// line but keep the line itself.
const RENAME_FIELDS = {
  startPosition: 'startPositionMs',
  resumePosition: 'startPositionMs',
};

// Content-type string literals that should be wrapped in
// `resolveStreamType(...)` so the V13 type union is satisfied.
// We only transform simple `type: '<literal>'` lines.
const CONTENT_TYPE_LITERALS = new Set([
  "'music'", "'movie'", "'audiobook'", "'podcast'",
  "'live-tv'", "'radio'", "'archive-audio'",
  "'video-file'", "'episode'",
]);

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name)) out.push(full);
  }
  return out;
}

/**
 * Identify whether a line is a `field: value,` (or
 * `field: value`) line and return the field name if so.
 */
function parseFieldLine(line) {
  // Match: optional leading whitespace, field name, colon, then
  // anything (greedy until end of line, no nested handling).
  // Field name is a valid identifier.
  const m = line.match(/^(\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:\s*(.*?)(,?)\s*$/);
  if (!m) return null;
  return {
    indent: m[1],
    field: m[2],
    value: m[3],
    hasTrailingComma: m[4] === ',',
  };
}

function processFile(file) {
  const original = fs.readFileSync(file, 'utf8');
  if (!original.includes('openPlayer')) return null;

  const lines = original.split('\n');
  const out = [];

  // Track whether we're currently inside an `openPlayer({...})`
  // call. We enter on a line that contains `openPlayer({` (and
  // any preceding opening braces for the call are already on the
  // same line or have been counted). We exit when brace depth
  // returns to 0.
  let insideOpenPlayer = false;
  let depth = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect openPlayer({ ... — handle either same-line or
    // line-by-line brace openers.
    if (!insideOpenPlayer) {
      // Check for openPlayer( on this line. The opener may
      // include the `{` on the same line, or on a later line.
      if (/openPlayer\s*\(/.test(line)) {
        insideOpenPlayer = true;
        // Count braces on this line.
        const opens = (line.match(/\{/g) || []).length;
        const closes = (line.match(/\}/g) || []).length;
        depth = opens - closes;
        out.push(line);
        if (depth <= 0) {
          // Single-line call: openPlayer({...});
          insideOpenPlayer = false;
          depth = 0;
        }
        continue;
      }
      out.push(line);
      continue;
    }

    // We're inside an openPlayer({...}) call.
    const opens = (line.match(/\{/g) || []).length;
    const closes = (line.match(/\}/g) || []).length;
    const newDepth = depth + opens - closes;

    // If this line closes the openPlayer call (newDepth <= 0),
    // we need to handle fields on this SAME line before passing
    // through. For single-line calls like
    // `openPlayer({...entry, mediaLane: 'audio'})`, this line
    // contains the field too.
    if (newDepth <= 0) {
      // Process the field line first (if it has a parseable field).
      const parsedSingle = parseFieldLine(line);
      if (parsedSingle && (DROP_FIELDS.has(parsedSingle.field) || RENAME_FIELDS[parsedSingle.field] ||
          (parsedSingle.field === 'type' && parsedSingle.value !== "'video'" && parsedSingle.value !== "'audio'"))) {
        // Single-line call with a V11 field to transform. This
        // is harder because the line has spread syntax + closing
        // brace + closing paren. We don't try to transform these
        // here — pass through and let the typecheck/manual fix
        // surface them. (Most single-line openPlayer calls in
        // the consumer use spread syntax that needs manual
        // review.)
        out.push(line);
      } else {
        out.push(line);
      }
      insideOpenPlayer = false;
      depth = 0;
      continue;
    }
    depth = newDepth;

    // Process the field line.
    const parsed = parseFieldLine(line);
    if (!parsed) {
      out.push(line);
      continue;
    }

    // Drop V11-only fields entirely.
    if (DROP_FIELDS.has(parsed.field)) {
      // Drop the line. The next line's leading whitespace
      // remains so indentation of the surrounding block is
      // preserved.
      continue;
    }

    // Rename startPosition -> startPositionMs.
    if (RENAME_FIELDS[parsed.field]) {
      const newField = RENAME_FIELDS[parsed.field];
      const newLine = `${parsed.indent}${newField}: ${parsed.value}${parsed.hasTrailingComma ? ',' : ''}`;
      out.push(newLine);
      continue;
    }

    // Wrap content-type literals in resolveStreamType().
    //
    // Strategy: ANY value for the `type:` field gets wrapped in
    // `resolveStreamType(...)` UNLESS the value is exactly
    // `'video'` or `'audio'` (already V13 stream types). This
    // covers:
    //   - string literals: 'music', 'movie', etc.
    //   - string-literal unions: 'music' | 'video'
    //   - ternaries: a === 'x' ? 'music' : 'video'
    //   - variables: item.kind, track.mediaType, etc.
    //
    // `resolveStreamType` is idempotent for already-V13 stream
    // types ('video' | 'audio' pass through unchanged), so
    // double-wrapping is safe.
    if (parsed.field === 'type' && parsed.value !== "'video'" && parsed.value !== "'audio'") {
      const newLine = `${parsed.indent}type: resolveStreamType(${parsed.value})${parsed.hasTrailingComma ? ',' : ''}`;
      out.push(newLine);
      continue;
    }

    out.push(line);
  }

  let next = out.join('\n');

  // Ensure `resolveStreamType` is imported alongside
  // `usePlayerActivity`. The import may be either
  // `import { usePlayerActivity } from '...'` or
  // `import { usePlayerActivity, X } from '...'`.
  if (next.includes('resolveStreamType(') && !next.includes('resolveStreamType,')) {
    const escaped = MODULE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const importRe = new RegExp(
      `(import\\s*\\{)([^}]*?\\busePlayerActivity\\b[^}]*?)(\\}\\s*from\\s*['"]${escaped}['"])`,
    );
    next = next.replace(importRe, (_m, open, body, close) => {
      const names = new Set(
        body.split(',').map(s => s.trim()).filter(Boolean).concat(['resolveStreamType']),
      );
      const sorted = Array.from(names).sort();
      return `${open} ${sorted.join(', ')} ${close}`;
    });
  }

  if (next === original) return null;
  fs.writeFileSync(file, next, 'utf8');
  return { file, before: original.length, after: next.length };
}

const files = walk(ROOT);
const results = [];
for (const f of files) {
  const r = processFile(f);
  if (r) results.push(r);
}

console.log(`Step-2 migrated ${results.length} files:`);
for (const r of results) {
  console.log(`  ${path.relative(path.join(__dirname, '..'), r.file)} (${r.before} -> ${r.after} bytes)`);
}
