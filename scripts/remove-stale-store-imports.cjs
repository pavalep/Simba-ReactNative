// V17 Phase 86: remove the leftover `import ... from '../store'`
// lines from every consumer file. The redux store was deleted in
// this phase; the imports are now stale and cause tsc errors.

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
]);

// Match the import line for the redux store. The relative depth
// varies (../store, ../../store, etc.) so we use a permissive
// pattern that matches any `from '<depth>/store'` after the
// `import ...` keyword.
const importPatterns = [
  /^import\s+(?:[\w*\s{},]+from\s+)?['"](?:\.\.\/)+\/?store['"];?\s*$\n?/gm,
  /^import\s+type\s+\{[^}]*\}\s+from\s+['"](?:\.\.\/)+\/?store['"];?\s*$\n?/gm,
];

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
  for (const re of importPatterns) {
    content = content.replace(re, () => {
      removed++;
      return '';
    });
  }
  if (content !== before) {
    // Collapse 3+ blank lines from removed imports.
    content = content.replace(/\n{3,}/g, '\n\n');
    fs.writeFileSync(file, content, 'utf8');
    totalFiles++;
    totalRemoved += removed;
    console.log(`${rel}: removed ${removed} import(s)`);
  }
}

console.log(
  `\nTotal: removed ${totalRemoved} import(s) across ${totalFiles} file(s).`,
);
