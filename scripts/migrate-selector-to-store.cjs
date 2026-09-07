// V17 Phase 79 surgical migration helper.
//
// Strategy: for each consumer file of one of the 4 redux slices,
// apply the 4 transformations in order, then add the zustand store
// import at the end. This avoids the order-dependency bug from the
// earlier "transform selectors first, then check imports" version.

const fs = require('fs');
const path = require('path');

const SRC_ROOT = path.join(__dirname, '..', 'src');

// Files we don't touch.
const FILES_TO_SKIP = new Set([
  // The reducers themselves
  'src/store/rootReducer.ts',
  'src/store/slices/playerSlice.ts',
  'src/store/slices/settingsSlice.ts',
  'src/store/slices/weatherSlice.ts',
  'src/store/slices/liveFavoritesSlice.ts',
  'src/store/slices/downloadsSlice.ts',
  'src/store/slices/mediaSlice.ts',
  'src/store/index.ts',
  'src/features/followedPodcasts/followedPodcastsReducer.ts',
  'src/features/playlists/playlistReducer.ts',
  'src/features/bookmarks/bookmarkReducer.ts',
  'src/features/recentHistory/recentHistoryReducer.ts',
  'src/store/persistConfig.ts',
  // The new zustand stores
  'src/state/settingsStore.ts',
  'src/state/weatherStore.ts',
  'src/state/liveFavoritesStore.ts',
  'src/state/followedPodcastsStore.ts',
  'src/state/sessionStore.ts',
  'src/state/authStore.ts',
  'src/state/index.ts',
  'src/state/persistence.ts',
  'src/state/resetAction.ts',
  // Feature wrapper modules — they re-export redux selectors and
  // take `state` as a parameter; their full migration happens in
  // Phase 85 when the redux store is gone.
  'src/features/followedPodcasts/index.ts',
  'src/features/bookmarks/index.ts',
  'src/features/playlists/index.ts',
  'src/features/recentHistory/index.ts',
  // Migration script
  'scripts/migrate-selector-to-store.cjs',
]);

const SLICES = [
  {redux: 'settings', store: 'useSettingsStore', importPathRe: /settingsSlice/},
  {redux: 'weather', store: 'useWeatherStore', importPathRe: /weatherSlice/},
  {redux: 'liveFavorites', store: 'useLiveFavoritesStore', importPathRe: /liveFavoritesSlice/},
  {
    redux: 'followedPodcasts',
    store: 'useFollowedPodcastsStore',
    importPathRe: /followedPodcastsReducer/,
  },
  {
    redux: 'media',
    store: 'useMediaStore',
    importPathRe: /mediaSlice/,
  },
  {
    redux: 'bookmark',
    store: 'useBookmarksStore',
    importPathRe: /bookmarkReducer/,
  },
  {
    redux: 'playlists',
    store: 'usePlaylistsStore',
    importPathRe: /playlistReducer/,
  },
  {
    redux: 'recentHistory',
    store: 'useRecentHistoryStore',
    importPathRe: /recentHistoryReducer/,
  },
  {
    redux: 'player',
    store: 'usePlayerStore',
    importPathRe: /playerSlice/,
  },
  {
    redux: 'downloads',
    store: 'useDownloadsStore',
    importPathRe: /downloadsSlice/,
  },
];

const ACTION_NAMES = {
  settings: new Set([
    'setThemeMode','setRepeatMode','setPlaybackSpeed','setSleepTimer','toggleShuffle',
    'setRememberPlaybackPosition',
    'setAudioNormalization','setDialogueBoost','setHardwareAcceleration',
    'setAutoLoadSubtitles','setPreferredLanguages','setExternalSubtitleDirectories',
    'setSubtitleFontSize','setSubtitleTextColor','setSubtitleBackgroundOpacity',
    'setSkipSilence',
    'setSampleRate','setReplayGain','setGaplessPlayback','setAudioDelay',
    'setEqEnabled','setEqPreset','setEqGains',
    'addVideoFolder','removeVideoFolder','addAudioFolder','removeAudioFolder',
    'syncLinkedFolders','setLinkedFoldersLastScan',
    'setScanning','setLastScanTimestamp',
    'setMpvOptions',
    'markLaunched',
    'setLargerControls','setHighContrastSubtitles','setScanOnLaunch',
    'setNotificationsEnabled','setAppLanguage',
    'setAutoDeleteDownloads','setHomeCity',
    'resetToDefaults','resetPreferencesToDefaults',
  ]),
  liveFavorites: new Set(['addLiveFavorite','removeLiveFavorite','setLiveFavorites']),
  followedPodcasts: new Set(['addFollowedPodcast','removeFollowedPodcast','setFollowedPodcasts']),
  weather: new Set(),
  media: new Set([
    'setScanning',
    'setScanProgress',
    'setScanHistory',
    'requestCancelScan',
    'clearCancelScan',
    'resetScanState',
    'setTracks',
    'addTracks',
    'removeTrack',
    'clearTracks',
    'rebuildSearchIndex',
  ]),
  bookmark: new Set([
    'addBookmark',
    'updateBookmarkPosition',
    'removeBookmark',
    'updateBookmarkLabel',
    'clearAllBookmarks',
    'setBookmarks',
  ]),
  playlists: new Set([
    'createPlaylist',
    'renamePlaylist',
    'deletePlaylist',
    'addItemToPlaylist',
    'removeItemFromPlaylist',
    'reorderPlaylistItems',
    'clearPlaylist',
    'importPlaylist',
    'updatePlaylistItemPosition',
    'resetPlaylists',
  ]),
  recentHistory: new Set([
    'upsertRecentHistoryEntry',
    'removeRecentHistoryEntry',
    'clearRecentHistory',
  ]),
  player: new Set([
    'loadPlaylistToPlayer',
    'addToPlaylist',
    'removeFromPlaylist',
    'reorderPlaylist',
    'playFromPlaylist',
  ]),
  downloads: new Set([
    'hydrateDownloads',
    'upsertDownload',
    'setDownloadStatus',
    'removeDownload',
  ]),
};

const RESET_ACTIONS = new Set(['resetToDefaults', 'resetPreferencesToDefaults']);

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

function stateImportFor(fromFile) {
  const rel = path.relative(path.join(__dirname, '..'), fromFile).replace(/\\/g, '/');
  const parts = rel.split('/');
  const rest = parts.slice(1);
  const ups = rest.length - 1;
  return '../'.repeat(ups) + 'state';
}

function fileHasSliceImport(content, sliceImportRe) {
  const re = new RegExp(
    `from\\s*['"][^'"]*${sliceImportRe.source}['"]`,
  );
  return re.test(content);
}

/** 1) Selectors: `useAppSelector(s => s.<slice>.<field>)` → `use<Slice>Store(s => s.<field>)`. */
function transformSelectors(content, redux, store) {
  const re = new RegExp(
    `useAppSelector\\(\\s*([a-zA-Z_$][\\w$]*)\\s*=>\\s*\\1\\.${redux}\\.`,
    'g',
  );
  let count = 0;
  const out = content.replace(re, (_m, name) => {
    count++;
    return `${store}(${name} => ${name}.`;
  });
  return {content: out, count};
}

/** 1b) For the media slice, also handle `useAppSelector(selectX)` where
 *      `selectX` is a known imported selector. Maps to either a
 *      direct store read or a derived hook. */
const MEDIA_DIRECT_SELECTORS = {
  selectAllTracks: 's => s.tracks',
  selectScanProgress: 's => s.scanProgress',
  selectScanHistory: 's => s.scanHistory',
  selectCancelRequested: 's => s.cancelRequested',
  selectIsMediaScanning: 's => s.isScanning',
  selectTrackCount: 's => s.tracks.length',
};
const MEDIA_DERIVED_SELECTORS = {
  selectSearchIndex: 'useMediaSearchIndex',
  selectArtists: 'useMediaArtists',
  selectAlbums: 'useMediaAlbums',
};

function transformMediaSelectorRefs(content) {
  let count = 0;
  let out = content;
  for (const [selector, body] of Object.entries(MEDIA_DIRECT_SELECTORS)) {
    const re = new RegExp(`useAppSelector\\(${selector}\\)`, 'g');
    out = out.replace(re, (m) => {
      count++;
      return `useMediaStore(${body})`;
    });
  }
  for (const [selector, hook] of Object.entries(MEDIA_DERIVED_SELECTORS)) {
    const re = new RegExp(`useAppSelector\\(${selector}\\)`, 'g');
    out = out.replace(re, (m) => {
      count++;
      return `${hook}()`;
    });
  }
  return {content: out, count};
}

/** 2) Imports: `import {x, y} from '<...>/<slice-file>'` → removed.
 *    `import type {X} from '<...>/<slice-file>'` → re-pointed to '../state'. */
function transformImports(content, redux, importPathRe) {
  // Match a full import statement (named or default) or type import.
  // The import path can be `./slices/<basename>` or
  // `../../../store/slices/<basename>` — we just look for the
  // basename at the end of the path.
  const re = new RegExp(
    `^import(\\s+type)?\\s*\\{([^}]+)\\}\\s*from\\s*['"][^'"]*${importPathRe.source}['"]\\s*;?\\s*$`,
    'gm',
  );
  let count = 0;
  let typeNames = null;
  let typeWasFound = false;
  const out = content.replace(re, (_m, isType, names) => {
    count++;
    if (isType) {
      typeNames = names;
      typeWasFound = true;
    }
    return '';
  });
  let result = out;
  if (typeWasFound) {
    // Re-insert a type import pointing at '../state' (so the type
    // names keep working). The path depth is computed later; we
    // use a placeholder.
    const placeholder = `__TYPE_REPOINT_${redux}__`;
    result = result + '\n' + placeholder;
  }
  // Collapse 3+ blank lines.
  result = result.replace(/\n{3,}/g, '\n\n');
  return {content: result, count, typeNames, typeWasFound};
}

/** 3) Dispatches: `dispatch(setX(v))` (single or multi-line) → `useStore.getState().setX(v)`. */
function transformDispatches(content, store, actionSet) {
  if (actionSet.size === 0) return {content, count: 0};
  const out = [];
  let i = 0;
  let count = 0;
  while (i < content.length) {
    const idx = content.indexOf('dispatch(', i);
    if (idx === -1) {
      out.push(content.slice(i));
      break;
    }
    // Push up to (but not including) `dispatch(`.
    out.push(content.slice(i, idx));
    let j = idx + 'dispatch('.length;
    while (j < content.length && /\s/.test(content[j])) j++;
    const nameStart = j;
    while (j < content.length && /[a-zA-Z_$0-9]/.test(content[j])) j++;
    const name = content.slice(nameStart, j);
    if (!actionSet.has(name)) {
      // Not a known action — keep the literal `dispatch(` and continue.
      out.push(content.slice(idx, j));
      i = j;
      continue;
    }
    while (j < content.length && /\s/.test(content[j])) j++;
    if (content[j] !== '(') {
      out.push(content.slice(idx, j));
      i = j;
      continue;
    }
    // Find matching close paren for the action call, then for `dispatch`.
    let depth = 1;
    let k = j + 1;
    while (k < content.length && depth > 0) {
      const ch = content[k];
      if (ch === '(') depth++;
      else if (ch === ')') depth--;
      if (depth > 0) k++;
    }
    const args = content.slice(j + 1, k);
    k++;
    // Skip whitespace and an optional trailing comma between the
    // action's `)` and the dispatch's `)`. e.g. `dispatch(setX(v),);`
    while (k < content.length && /\s/.test(content[k])) k++;
    if (content[k] === ',') {
      k++;
      while (k < content.length && /\s/.test(content[k])) k++;
    }
    if (content[k] === ')') k++;
    count++;
    if (RESET_ACTIONS.has(name)) {
      out.push(`${store}.getState().reset()`);
    } else {
      out.push(`${store}.getState().${name}(${args})`);
    }
    i = k;
  }
  return {content: out.join(''), count};
}

/** 4) Add the store import. If type-only re-pointing is needed,
 *    also resolve the placeholder with the new type import. */
function addStoreImport(content, store, fromFile, typeNames) {
  const importPath = stateImportFor(fromFile);
  const storeImport = `import {${store}} from '${importPath}';`;
  if (content.includes(storeImport)) {
    let result = content;
    if (typeNames) {
      const typeImport = `import type {${typeNames}} from '${importPath}';`;
      result = result.replace(/__TYPE_REPOINT_[a-zA-Z]+__\n?/g, typeImport + '\n');
    }
    return result;
  }
  // Find the last line that ENDS a complete import statement.
  // A complete import is `^import ... from '...';?$` — we look for
  // a `from '...';` at the end of a line. This avoids treating the
  // start of a multi-line import (`import {`) as the import itself.
  const lines = content.split('\n');
  let lastCompleteImport = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/^import\s.+\sfrom\s+['"][^'"]+['"]\s*;?\s*$/.test(lines[i])) {
      lastCompleteImport = i;
    }
  }
  const insertIdx = lastCompleteImport >= 0 ? lastCompleteImport + 1 : 0;
  lines.splice(insertIdx, 0, storeImport);
  let result = lines.join('\n');
  if (typeNames) {
    const typeImport = `import type {${typeNames}} from '${importPath}';`;
    result = result.replace(/__TYPE_REPOINT_[a-zA-Z]+__\n?/g, typeImport + '\n');
  }
  return result;
}

/** Special: for rootReducer.ts, remove the `name: nameReducer,` entry. */
function transformRootReducerEntries(content, redux) {
  const re = new RegExp(
    `^\\s*${redux}:\\s*[a-zA-Z_$][\\w$]*Reducer,?\\s*\\n`,
    'gm',
  );
  let count = 0;
  const out = content.replace(re, () => {
    count++;
    return '';
  });
  return {content: out, count};
}

let totalFiles = 0;
let totalReplacements = 0;
const errors = [];

for (const file of walk(SRC_ROOT)) {
  const rel = file.replace(/\\/g, '/').replace(/^.*\/MOBILE_APP_REACT_NATIVE\//, '');
  if (FILES_TO_SKIP.has(rel)) continue;
  let content = fs.readFileSync(file, 'utf8');
  const original = content;
  let fileReplacements = 0;
  let fileChanged = false;

  for (const {redux, store, importPathRe} of SLICES) {
    if (!fileHasSliceImport(content, importPathRe)) continue;
    const sel = transformSelectors(content, redux, store);
    content = sel.content;
    fileReplacements += sel.count;
    if (redux === 'media') {
      // Also transform `useAppSelector(selectX)` where selectX is a
      // known imported media selector.
      const msr = transformMediaSelectorRefs(content);
      content = msr.content;
      fileReplacements += msr.count;
    }
    const imp = transformImports(content, redux, importPathRe);
    content = imp.content;
    fileReplacements += imp.count;
    const disp = transformDispatches(content, store, ACTION_NAMES[redux]);
    content = disp.content;
    fileReplacements += disp.count;
    if (rel === 'src/store/rootReducer.ts') {
      const comb = transformRootReducerEntries(content, redux);
      content = comb.content;
      fileReplacements += comb.count;
    }
    // Add the store import at the end of all transformations, so
    // we know whether the new symbol is already there.
    content = addStoreImport(content, store, file, imp.typeWasFound ? imp.typeNames : null);
    fileChanged = true;
  }

  if (content !== original) {
    for (const {importPathRe} of SLICES) {
      const remainRe = new RegExp(
        `from\\s*['"](?:\\.{1,2}\\/)+${importPathRe.source}['"]`,
      );
      if (remainRe.test(content)) {
        errors.push(`Residual ${importPathRe} import in ${rel}`);
      }
    }
    fs.writeFileSync(file, content, 'utf8');
    totalFiles++;
    totalReplacements += fileReplacements;
    console.log(`${rel}: ${fileReplacements} replacement(s)`);
  }
}

console.log(
  `\nTotal: ${totalReplacements} replacement(s) across ${totalFiles} file(s).`,
);
if (errors.length > 0) {
  console.error(`\n${errors.length} unresolved residual(s):`);
  for (const e of errors) console.error('  ' + e);
  process.exit(1);
}
