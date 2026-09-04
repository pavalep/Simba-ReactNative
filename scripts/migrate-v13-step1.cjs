/* eslint-disable */
/**
 * V13 Phase 53a migration — mechanical step 1.
 *
 * For each of the 32 screen files that import `usePlaybackCommands`
 * from the doomed `modules/playback` path:
 *
 *   1. Replace the import path with
 *      `@simba-dev/react-native-media-player` and the imported name
 *      with `usePlayerActivity`.
 *   2. Replace `usePlaybackCommands()` with `usePlayerActivity()`.
 *
 * The `openPlayer({...})` call sites are NOT touched by this script —
 * each file has a different arg shape that needs per-file reshaping.
 * After this script runs, the per-file `openPlayer` arg shape still
 * uses the V11 fields (`duration`, `source`, `type: 'movie'`,
 * `mediaType`, etc.) — a manual pass is required to reshape to the
 * V13 signature (`{uri, title, type: 'video' | 'audio',
 * startPositionMs}`).
 *
 * The script is conservative:
 *   - Skips files that don't contain `usePlaybackCommands`.
 *   - Skips if the import is already from the module.
 *   - Reports what it changed so the human can verify.
 *
 * Usage: `node scripts/migrate-v13-step1.cjs`
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..', 'src', 'screens');
const MODULE = '@simba-dev/react-native-media-player';

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name)) out.push(full);
  }
  return out;
}

function migrate(file) {
  const original = fs.readFileSync(file, 'utf8');
  if (!original.includes('usePlaybackCommands')) return null;

  let next = original;

  // 1) Replace the import. The doomed path is always some
  //    `'../*/modules/playback'` form, and the imported name is
  //    always `usePlaybackCommands`. We accept both
  //    `import {usePlaybackCommands}` and
  //    `import {usePlaybackCommands, X}` shapes.
  next = next.replace(
    /import\s*\{([^}]*?)\busePlaybackCommands\b([^}]*?)\}\s*from\s*['"][^'"]*modules\/playback[^'"]*['"]/g,
    (_m, before, after) => {
      const cleanedBefore = before.replace(/,?\s*$/, '').trim();
      const cleanedAfter = after.replace(/^\s*,?/, '').trim();
      const beforePart = cleanedBefore ? `${cleanedBefore}, ` : '';
      const afterPart = cleanedAfter ? `, ${cleanedAfter}` : '';
      return `import {${beforePart}usePlayerActivity${afterPart}} from '${MODULE}'`;
    },
  );

  // 2) Replace `usePlaybackCommands()` with `usePlayerActivity()`.
  //    Only the no-arg form is used in the consumer (the hook is a
  //    simple accessor), so this regex is safe.
  next = next.replace(/\busePlaybackCommands\(\)/g, 'usePlayerActivity()');

  if (next === original) return null;

  fs.writeFileSync(file, next, 'utf8');
  return { file, before: original.length, after: next.length };
}

const files = walk(ROOT);
const results = [];
for (const f of files) {
  const r = migrate(f);
  if (r) results.push(r);
}

console.log(`Migrated ${results.length} files:`);
for (const r of results) {
  console.log(`  ${path.relative(path.join(__dirname, '..'), r.file)} (${r.before} -> ${r.after} bytes)`);
}
