// ─── V21 W5 P18 — fileService permission-revoked detection tests ──────
//
// The real `scanFoldersIncremental` / `enumerateMediaFiles` walk a
// folder tree via `react-native-fs`'s `RNFS.readDir`. When a top-level
// folder's persistable permission has been revoked by the user
// (system File Manager → revoke), `RNFS.readDir` throws with a
// permission-style error code.
//
// These tests verify that the fileService surfaces that failure as a
// `permissionRevoked: true` flag on the per-folder result (and
// aggregates into `IncrementalScanResult.permissionRevokedFolders`),
// distinct from a transient subfolder failure.
//
// We mock the whole `react-native-fs` module via jest.mock so the
// `RNFS.readDir` call inside `fileService.ts` is fully under our
// control. The production scanner behavior + the
// `useMediaScanner.startScan` reaction is exercised in the
// `useMediaScanner` integration tests (not in this unit test).

// Mock react-native-fs with a minimal RNFS shape — only the surface
// `fileService.ts` actually uses (RNFS.readDir).
jest.mock('react-native-fs', () => {
  return {
    __esModule: true,
    default: {
      readDir: jest.fn(),
    },
  };
});

import RNFS from 'react-native-fs';
import {scanFoldersIncremental, classifyPickedMedia} from '../../src/services/fileService';

const mockedReadDir = RNFS.readDir as jest.MockedFunction<typeof RNFS.readDir>;

beforeEach(() => {
  mockedReadDir.mockReset();
});

describe('fileService.classifyPickedMedia', () => {
  // A picked file's URI is a `content://` URI and carries NO extension.
  // `getMediaType` reads the extension out of the URI, so it cannot
  // classify one, and it falls through to its 'video' default. These
  // cases are the regression that made every picked AUDIO file open in
  // the VIDEO lane.
  const CONTENT_AUDIO_URI =
    'content://com.android.providers.media.documents/document/audio%3A1000000064';
  const CONTENT_VIDEO_URI =
    'content://com.android.providers.media.documents/document/video%3A1000000123';

  it('uses the MIME type the picker reported', () => {
    expect(
      classifyPickedMedia({uri: CONTENT_AUDIO_URI, title: 'Take 1', type: 'audio/mpeg', size: 1}),
    ).toBe('audio');
    expect(
      classifyPickedMedia({uri: CONTENT_VIDEO_URI, title: 'Clip', type: 'video/mp4', size: 1}),
    ).toBe('video');
  });

  it('reads the MIME type case-insensitively', () => {
    expect(
      classifyPickedMedia({uri: CONTENT_AUDIO_URI, title: 'Take 1', type: 'AUDIO/MPEG', size: 1}),
    ).toBe('audio');
  });

  it('falls back to the display NAME, which is where the extension lives', () => {
    expect(
      classifyPickedMedia({uri: CONTENT_AUDIO_URI, title: 'Field Recording.mp3', type: null, size: 1}),
    ).toBe('audio');
    expect(
      classifyPickedMedia({uri: CONTENT_VIDEO_URI, title: 'Clip.mp4', type: null, size: 1}),
    ).toBe('video');
  });

  it('falls back to the URI when the picker handed back a real path', () => {
    expect(
      classifyPickedMedia({uri: '/storage/emulated/0/Music/song.flac', title: 'song', type: null, size: 1}),
    ).toBe('audio');
    expect(
      classifyPickedMedia({uri: '/storage/emulated/0/Movies/film.mkv', title: 'film', type: null, size: 1}),
    ).toBe('video');
  });

  it('falls back to the video lane for a file it cannot classify at all', () => {
    expect(
      classifyPickedMedia({uri: CONTENT_AUDIO_URI, title: 'Untitled', type: null, size: 1}),
    ).toBe('video');
  });

  it('does not mistake a dot in a content URI for an extension', () => {
    // `document/audio%3A1000000064` has no dot; a provider that
    // reports a dotted document id must not flip the lane on that.
    expect(
      classifyPickedMedia({
        uri: 'content://com.android.providers.media.documents/document/primary%3AAudio%2F1.2',
        title: 'Untitled',
        type: null,
        size: 1,
      }),
    ).toBe('video');
  });
});

describe('fileService.scanFoldersIncremental — V21 W5 P18 (D-027 partly)', () => {
  it('returns an empty `permissionRevokedFolders` when every folder reads OK', async () => {
    mockedReadDir.mockResolvedValue([
      // No items — just confirm the read succeeded.
      {
        name: 'track1.mp3',
        path: '/music/track1.mp3',
        size: 100,
        isFile: () => true,
        isDirectory: () => false,
        mtime: new Date(),
      } as never,
    ]);

    const result = await scanFoldersIncremental(['/music'], null);

    expect(result.permissionRevokedFolders).toEqual([]);
    expect(result.files).toHaveLength(1);
    expect(result.errorsCount).toBe(0);
  });

  it('flags a folder as permission-revoked when its top-level readDir throws EACCES', async () => {
    // Simulate a top-level permission error. The error object has a
    // `code` of 'EACCES' (the typical raw-path failure) or a
    // message containing 'Permission Denial' (the SAF failure).
    mockedReadDir.mockRejectedValue(
      Object.assign(new Error('Permission Denial: opening path'), {
        code: 'EACCES',
      }),
    );

    const result = await scanFoldersIncremental(['/music', '/movies'], null);

    expect(result.permissionRevokedFolders).toEqual(['/music', '/movies']);
    expect(result.files).toEqual([]);
    // The permission-revoked case is NOT counted in errorsCount
    // (the user took an explicit step to revoke it; this is expected,
    // not an error to debug).
    expect(result.errorsCount).toBe(0);
  });

  it('flags via message-text match when no `code` is present (SAF layer)', async () => {
    mockedReadDir.mockRejectedValue(
      new Error('java.lang.SecurityException: Permission Denial'),
    );

    const result = await scanFoldersIncremental(['/music'], null);

    expect(result.permissionRevokedFolders).toEqual(['/music']);
    expect(result.errorsCount).toBe(0);
  });

  it('treats a subfolder ENOENT as a transient error, not permission-revoked', async () => {
    // First call (top-level /music) succeeds with a subdirectory entry.
    // Second call (recursive into /music/bad) fails with ENOENT.
    // We expect: /music's permissionRevoked flag stays false; the
    // subfolder failure is counted in errorsCount, NOT surfaced as
    // permissionRevokedFolders.
    let callCount = 0;
    mockedReadDir.mockImplementation(async (dir: string) => {
      callCount++;
      if (callCount === 1) {
        // Top-level — returns one subdirectory.
        return [
          {
            name: 'bad',
            path: '/music/bad',
            size: 0,
            isFile: () => false,
            isDirectory: () => true,
            mtime: new Date(),
          } as never,
        ];
      }
      // Subdirectory — ENOENT (file not found, NOT permission).
      const err = Object.assign(
        new Error('ENOENT: no such file or directory'),
        {code: 'ENOENT'},
      );
      throw err;
    });

    const result = await scanFoldersIncremental(['/music'], null);

    expect(result.permissionRevokedFolders).toEqual([]);
    expect(result.errorsCount).toBe(1);
    expect(result.files).toEqual([]);
  });

  it('preserves the permission-revoked signal alongside a healthy folder in one batch', async () => {
    // First folder (/music) throws permission; second folder (/movies)
    // succeeds. Verify the partial result still flags /music.
    let callCount = 0;
    mockedReadDir.mockImplementation(async (_dir: string) => {
      callCount++;
      if (callCount === 1) {
        throw Object.assign(new Error('Permission Denial'), {code: 'EACCES'});
      }
      return [
        {
          name: 'ep1.mp4',
          path: '/movies/ep1.mp4',
          size: 200,
          isFile: () => true,
          isDirectory: () => false,
          mtime: new Date(),
        } as never,
      ];
    });

    const result = await scanFoldersIncremental(['/music', '/movies'], null);

    expect(result.permissionRevokedFolders).toEqual(['/music']);
    expect(result.files).toHaveLength(1);
    expect(result.files[0].uri).toBe('/movies/ep1.mp4');
  });

  it('returns an empty result (with permissionRevokedFolders: []) for an empty input', async () => {
    const result = await scanFoldersIncremental([], null);

    expect(result).toEqual({
      files: [],
      skippedCount: 0,
      unsupportedCount: 0,
      errorsCount: 0,
      permissionRevokedFolders: [],
      scanTimestamp: expect.any(Number),
    });
    // RNFS.readDir should not have been called at all.
    expect(mockedReadDir).not.toHaveBeenCalled();
  });
});