// V17 Phase 86: remove the leftover `const dispatch = useAppDispatch();`
// lines + their dependencies from useEffect/useCallback dep arrays.
// The redux store was deleted; `dispatch` is no longer needed.

const fs = require('fs');
const path = require('path');

const SRC_ROOT = path.join(__dirname, '..', 'src');

const FILES_TO_SKIP = new Set([
  'src/state/index.ts',
  'src/state/persistence.ts',
  'src/state/resetAction.ts',
  'src/state/sessionStore.ts',
  'src/state/authStore.ts',
  'src/state/settingsStore.ts',
  'src/state/weatherStore.ts',
  'src/state/liveFavoritesStore.ts',
  'src/state/followedPodcastsStore.ts',
  'src/state/mediaStore.ts',
  'src/state/bookmarksStore.ts',
  'src/state/playlistsStore.ts',
  'src/state/recentHistoryStore.ts',
  'src/state/playerStore.ts',
  'src/state/downloadsStore.ts',
  'scripts/migrate-selector-to-store.cjs',
  'scripts/remove-stale-store-imports.cjs',
  'scripts/remove-stale-useappdispatch.cjs',
]);

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, {withFileTypes: true})) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'node_modules' || e.name === '.git') continue;
      walk(p, out);
    } else if (/\.tsx?$/.test(e.name) && !e.name.endsWith('.d.ts')) {
      out.push(p);
    }
  }
  return out;
}

let totalFiles = 0;
let totalRemoved = 0;

for (const file of walk(SRC_ROOT)) {
  const rel = file.replace(/\\/g, '/').replace(/^.*\/MOBILE_APP_REACT_NATIVE\//, '');
  if (FILES_TO_SKIP.has(rel)) continue;
  let content = fs.readFileSync(file, 'utf8');
  const before = content;
  let removed = 0;

  // 1) Remove `const dispatch = useAppDispatch();` (with optional
  //    surrounding whitespace) and the now-empty line.
  content = content.replace(
    /^[ \t]*const\s+dispatch\s*=\s*useAppDispatch\(\);[ \t]*\r?\n?/gm,
    () => { removed++; return ''; },
  );

  // 2) Remove `, dispatch` or `dispatch, ` from useEffect/useCallback/useMemo
  //    dependency arrays. Match `[dispatch]`, `[dispatch, ...]`, `[..., dispatch]`,
  //    `[..., dispatch, ...]`, and `[..., dispatch]` (with `dispatch` as the
  //    last dep).
  content = content.replace(
    /,\s*dispatch(\s*,\s*)/g,
    (m, after) => { removed++; return after; },
  );
  content = content.replace(
    /\[(\s*)dispatch(\s*)\]/g,
    (m, before, after) => { removed++; return '[]'; },
  );
  content = content.replace(
    /,\s*dispatch(\s*\])/g,
    (m, after) => { removed++; return after; },
  );
  // Also handle `dispatch` as the first dep: `[dispatch, ...]`
  content = content.replace(
    /\[(\s*)dispatch(\s*,\s*)/g,
    (m, before, after) => { removed++; return '[' + before + after; },
  );

  if (content !== before) {
    content = content.replace(/\n{3,}/g, '\n\n');
    fs.writeFileSync(file, content, 'utf8');
    totalFiles++;
    totalRemoved += removed;
    console.log(`${rel}: cleaned ${removed} reference(s)`);
  }
}

console.log(
  `\nTotal: cleaned ${totalRemoved} reference(s) across ${totalFiles} file(s).`,
);
