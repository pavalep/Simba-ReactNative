/**
 * D-033 — content:// URI shim for the Android-14+ scoped-storage era.
 *
 * `react-native-fs` predates scoped storage and uses `java.io.File`
 * under the hood, which cannot read `content://media/external/audio/...`
 * URIs returned by the MediaStore / SAF folder picker. On Android 14+
 * `RNFS.readDir` and `RNFS.stat` on such URIs throw an IOException
 * that callers usually catch and ignore, leading to a silent "the
 * folder scan returned nothing" failure that looks like an empty
 * library.
 *
 * This shim dispatches by URI scheme:
 *   - `file://` and bare absolute paths → RNFS (unchanged)
 *   - `content://` → throws a clear, typed `UnsupportedContentUriError`
 *     with a remediation hint pointing at the MediaStore API. The
 *     error message is what callers SHOULD propagate to the UI; the
 *     existing try/catch in `metadataService.ts` will surface it
 *     through `onCorrupt` so the user sees "Folder uses Android 14+
 *     scoped storage — please grant All Files Access in Settings".
 *
 * Future scope (post-manager-demo):
 *   - Replace the `content://` branch with a Kotlin `MediaStoreFsModule`
 *     that wraps `ContentResolver` and exposes `listDir`/`stat` to JS
 *     under the same shim interface. Today's shim is the contract
 *     that future native implementation will satisfy.
 *
 * The other RNFS call sites (`logger.ts`, `artCacheService.ts`,
 * `useDownloadsScreen.ts`) operate on internal app dirs
 * (`DocumentDirectoryPath`, `CachesDirectoryPath`, etc.) which are
 * always `file://` on the app's own storage and don't need this
 * shim — they're correctly served by RNFS on all Android versions.
 */

import RNFS from 'react-native-fs';

export class UnsupportedContentUriError extends Error {
  readonly uri: string;
  readonly androidVersion: number;
  constructor(uri: string, androidVersion: number) {
    super(
      `Folder URI "${uri}" uses Android scoped storage (content://). ` +
        `react-native-fs cannot read content:// URIs on Android ${androidVersion}+. ` +
        `Open Settings → Apps → SIMBA → Permissions → Files and media → ` +
        `"Allow all files access", OR use the MediaStore API directly. ` +
        `(D-033 follow-up: native MediaStoreFsModule will replace this shim.)`,
    );
    this.name = 'UnsupportedContentUriError';
    this.uri = uri;
    this.androidVersion = androidVersion;
  }
}

function isContentUri(uri: string): boolean {
  return uri.startsWith('content://');
}

function androidSdkInt(): number {
  // `Platform.Version` is the Android SDK int (33 = Android 13, 34 =
  // Android 14, etc.). Lazily imported to keep the shim loadable from
  // any test harness without forcing RN's Platform polyfill.
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Platform } = require('react-native');
    return typeof Platform.Version === 'number' ? Platform.Version : parseInt(String(Platform.Version), 10);
  } catch {
    return 0;
  }
}

export interface ScannedFsEntry {
  name: string;
  path: string;
  isFile: () => boolean;
  isDirectory: () => boolean;
  size: number;
}

/**
 * Replacement for `RNFS.readDir`. Same shape as RNFS.ReadDirItem so
 * callers can drop in unchanged. For `file://` and bare paths this
 * is a 1:1 wrapper; for `content://` URIs it throws an
 * UnsupportedContentUriError with a remediation hint.
 */
export async function readDir(uri: string): Promise<ScannedFsEntry[]> {
  if (isContentUri(uri)) {
    throw new UnsupportedContentUriError(uri, androidSdkInt());
  }
  const items = await RNFS.readDir(uri);
  return items.map(it => ({
    name: it.name,
    path: it.path,
    isFile: () => it.isFile(),
    isDirectory: () => it.isDirectory(),
    size: it.size,
  }));
}

/**
 * Replacement for `RNFS.stat`. Same shape as RNFS.StatResult for the
 * fields we actually use (`size`).
 */
export async function stat(uri: string): Promise<{ size: number; isFile: () => boolean; isDirectory: () => boolean }> {
  if (isContentUri(uri)) {
    throw new UnsupportedContentUriError(uri, androidSdkInt());
  }
  const s = await RNFS.stat(uri);
  return {
    size: s.size,
    isFile: () => s.isFile(),
    isDirectory: () => s.isDirectory(),
  };
}

/**
 * Replacement for `RNFS.exists`. Same return type.
 */
export async function exists(uri: string): Promise<boolean> {
  if (isContentUri(uri)) {
    // Conservative: assume the content URI is reachable (since the
    // caller likely got it from MediaStore). If you need strict
    // existence, query ContentResolver via the future
    // MediaStoreFsModule.
    return true;
  }
  return RNFS.exists(uri);
}
