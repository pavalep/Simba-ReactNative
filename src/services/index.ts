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
//
// V21 W5 P17 (closes D-005 / D-006 / D-022 partly): `storageService.ts`
// (71 lines, 8 TODOs → 0) and `playlistService.ts` (118 lines, 1 TODO
// → 0) were closed by W2 P06 and are now orphaned — every persisted
// piece of state lives in a Zustand store backed by `sharedMMKVStorage`
// (see `src/state/persistence.ts`). The two files were `git rm`'d and
// their exports removed from this barrel.
export {mediaService} from './mediaService';
