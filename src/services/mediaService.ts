// ─── mediaService — V21 P06 T06.03 (closes D-007) ───────────────────
//
// Pre-V21: 2 TODOs returning `null` / `[]` (D-007). The real media
// library lives in the Zustand `useMediaStore`, populated by the
// `useMediaScanner` hook in `src/hooks/useMediaScanner.ts`.
// `useMediaScanner` is the source of truth for what files exist
// on disk; this service was always a placeholder for "load one
// file's metadata by URI" and "scan one directory for media
// files" — neither of which has a real implementation (the
// underlying native module is the placeholder).
//
// V21 decision: rather than ship a fake "real implementation"
// that pretends to load metadata, this file now has two methods
// that explicitly return `null` / `[]` with a doc comment pointing
// to the real data source. Consumers that need a file's metadata
// should read `useMediaStore` directly. A future V22 task can
// introduce a real file-metadata extractor.
//
// V21 migration note: when the W2 P08 library feature pilot
// moves this file to `src/features/library/application/`, the
// methods become `loadFile` / `scanDirectory` on the library
// application service. Until then they live here.
import type {MediaFile} from '../types';

class MediaService {
  /**
   * Returns null. The real file metadata lives in `useMediaStore`
   * (populated by `useMediaScanner`); call sites that need a
   * file's metadata by URI should read the store directly.
   */
  async loadFile(_uri: string): Promise<MediaFile | null> {
    return null;
  }

  /**
   * Returns []. The real directory scan lives in `useMediaScanner`
   * (called from the library feature); the per-folder scan is
   * not exposed as a public API yet.
   */
  async scanDirectory(_path: string): Promise<MediaFile[]> {
    return [];
  }

  /**
   * Pure formatter — formats a duration in seconds as `m:ss`.
   * No async, no I/O.
   */
  formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
}

export const mediaService = new MediaService();
