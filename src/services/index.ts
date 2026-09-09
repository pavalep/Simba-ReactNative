// ─── V21 P06 T06.05 (closes D-008) ────────────────────────────────────
// The V21 audit found that the pre-V21 `libraryScanService.ts`
// was 100% dead code:
//   - `scanFolder` and `scanAllLinkedFolders` returned `[]`
//     (D-008). The real scan is `useMediaScanner` in
//     `src/hooks/useMediaScanner.ts`, which populates the
//     Zustand `useMediaStore`.
//   - The 4 pure utilities (`getVideos`, `getAudio`,
//     `searchMedia`, `sortMedia`) had zero consumers
//     anywhere in `src/`. The screen consumers read
//     `useMediaStore` directly.
//
// V21 decision: delete the file (D-008 / T06.05), and remove
// its 7 exports from this barrel. The dead-code folder at
// `md/_v21_p06_dead_code/libraryScanService.ts` keeps the
// original file as a frozen artifact.
export {mediaService} from './mediaService';
export {playlistService} from './playlistService';
export {
  setThemePreference,
  getThemePreference,
  setRecentSearches,
  getRecentSearches,
  setLinkedFolders,
  getLinkedFolders,
} from './storageService';
export type {ThemeMode} from './storageService';
