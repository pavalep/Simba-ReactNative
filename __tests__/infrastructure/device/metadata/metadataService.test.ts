// ─── V21 W5 P19 — metadataService duplicate + corrupt-file tests ──────
//
// The file is now at src/infrastructure/device/metadata/metadataService.ts
// (moved from src/services/metadataService.ts). Public API:
//   - `scanAudioFolders(folders)` returns `ScanResult`
//     (tracks + duplicates + corruptFiles)
//   - `detectDuplicates(tracks)` is the `(duration|basename)`
//     fingerprint grouper
//   - `scanFolderForAudio(folder, onCorrupt?)` is the per-folder
//     walker; corrupt files surface via the callback
//
// These tests mock `react-native-fs` to control readDir + stat.

import RNFS from 'react-native-fs';
import {
  detectDuplicates,
  scanAudioFolders,
  scanFolderForAudio,
} from '../../../../src/infrastructure/device/metadata/metadataService';

const mockedReadDir = RNFS.readDir as jest.MockedFunction<typeof RNFS.readDir>;
const mockedStat = RNFS.stat as jest.MockedFunction<typeof RNFS.stat>;

// Mock helper: file-as-RNFS-item shape.
const file = ({name, path, size}) => ({
  name,
  path,
  size,
  isFile: () => true,
  isDirectory: () => false,
  mtime: new Date(),
});

// Mock helper: dir-as-RNFS-item shape.
const dir = ({name, path}) => ({
  name,
  path,
  size: 0,
  isFile: () => false,
  isDirectory: () => true,
  mtime: new Date(),
});

// Mock helper: a stat result with the given size.
function statOf(size: number) {
  return {
    size,
    isFile: () => true,
    isDirectory: () => false,
    mtime: new Date(),
  };
}

beforeEach(() => {
  (RNFS as unknown as {__resetForTests: () => void}).__resetForTests();
});

describe('detectDuplicates — V21 W5 P19', () => {
  it('returns an empty array when there are no duplicates', () => {
    const tracks = [
      {
        uri: '/music/track1.mp3',
        duration: 0,
        title: 'Track 1',
        artist: 'A',
        album: 'B',
        year: 0,
        genre: '',
        trackNumber: 0,
        albumArtUri: '',
        folderPath: '/music',
        mediaType: 'audio' as const,
        source: 'local' as const,
        type: 'audio' as const,
        folderId: 'music',
      },
      {
        uri: '/music/track2.mp3',
        duration: 0,
        title: 'Track 2',
        artist: 'A',
        album: 'B',
        year: 0,
        genre: '',
        trackNumber: 0,
        albumArtUri: '',
        folderPath: '/music',
        mediaType: 'audio' as const,
        source: 'local' as const,
        type: 'audio' as const,
        folderId: 'music',
      },
    ];

    expect(detectDuplicates(tracks)).toEqual([]);
  });

  it('groups tracks with matching (basename) into a DuplicateGroup', () => {
    // Same basename, different folder, same duration → duplicate.
    const tracks = [
      {
        uri: '/music/a/track.mp3',
        duration: 100,
        title: 'Track',
        artist: 'A',
        album: 'X',
        year: 0,
        genre: '',
        trackNumber: 0,
        albumArtUri: '',
        folderPath: '/music/a',
        mediaType: 'audio' as const,
        source: 'local' as const,
        type: 'audio' as const,
        folderId: 'music/a',
      },
      {
        uri: '/music/b/track.mp3',
        duration: 100,
        title: 'Track',
        artist: 'A',
        album: 'X',
        year: 0,
        genre: '',
        trackNumber: 0,
        albumArtUri: '',
        folderPath: '/music/b',
        mediaType: 'audio' as const,
        source: 'local' as const,
        type: 'audio' as const,
        folderId: 'music/b',
      },
    ];

    const groups = detectDuplicates(tracks);
    expect(groups).toHaveLength(1);
    expect(groups[0].files).toEqual([
      '/music/a/track.mp3',
      '/music/b/track.mp3',
    ]);
    expect(groups[0].fingerprint).toContain('|track');
  });

  it('is case-insensitive on the basename (windows/mac share copies)', () => {
    const tracks = [
      {
        uri: '/music/A/Track.mp3',
        duration: 100,
        title: 'T',
        artist: '',
        album: '',
        year: 0,
        genre: '',
        trackNumber: 0,
        albumArtUri: '',
        folderPath: '/music/A',
        mediaType: 'audio' as const,
        source: 'local' as const,
        type: 'audio' as const,
        folderId: 'music/A',
      },
      {
        uri: '/music/B/TRACK.mp3',
        duration: 100,
        title: 'T',
        artist: '',
        album: '',
        year: 0,
        genre: '',
        trackNumber: 0,
        albumArtUri: '',
        folderPath: '/music/B',
        mediaType: 'audio' as const,
        source: 'local' as const,
        type: 'audio' as const,
        folderId: 'music/B',
      },
    ];

    const groups = detectDuplicates(tracks);
    expect(groups).toHaveLength(1);
    expect(groups[0].files).toHaveLength(2);
  });

  it('does NOT group tracks with different basenames', () => {
    const tracks = [
      {
        uri: '/music/a/song.mp3',
        duration: 100,
        title: 'A',
        artist: '',
        album: '',
        year: 0,
        genre: '',
        trackNumber: 0,
        albumArtUri: '',
        folderPath: '/music/a',
        mediaType: 'audio' as const,
        source: 'local' as const,
        type: 'audio' as const,
        folderId: 'music/a',
      },
      {
        uri: '/music/b/track.mp3',
        duration: 100,
        title: 'B',
        artist: '',
        album: '',
        year: 0,
        genre: '',
        trackNumber: 0,
        albumArtUri: '',
        folderPath: '/music/b',
        mediaType: 'audio' as const,
        source: 'local' as const,
        type: 'audio' as const,
        folderId: 'music/b',
      },
    ];

    expect(detectDuplicates(tracks)).toEqual([]);
  });
});

describe('scanFolderForAudio + scanAudioFolders — V21 W5 P19 (corrupt handling)', () => {
  it('skips zero-size files (truncated copies)', async () => {
    mockedReadDir.mockResolvedValue([
      file({name: 'good.mp3', path: '/music/good.mp3', size: 1024}),
      file({name: 'broken.mp3', path: '/music/broken.mp3', size: 0}),
    ]);
    mockedStat.mockImplementation(async (uri: string) => {
      if (String(uri).includes('broken')) {
        return statOf(0);
      }
      return statOf(1024);
    });

    const corrupt: Array<{uri: string; reason: string}> = [];
    const tracks = await scanFolderForAudio('/music', c =>
      corrupt.push(c),
    );

    expect(tracks).toHaveLength(1);
    expect(tracks[0].uri).toBe('/music/good.mp3');
    expect(corrupt).toEqual([
      {uri: '/music/broken.mp3', reason: 'zero_size'},
    ]);
  });

  it('surfaces stat failures as corrupt (stat_failed)', async () => {
    mockedReadDir.mockResolvedValue([
      file({name: 'good.mp3', path: '/music/good.mp3', size: 1024}),
      file({name: 'broken.mp3', path: '/music/broken.mp3', size: 1024}),
    ]);
    mockedStat.mockImplementation(async (uri: string) => {
      if (String(uri).includes('broken')) {
        throw new Error('EACCES');
      }
      return statOf(1024);
    });

    const corrupt: Array<{uri: string; reason: string}> = [];
    const tracks = await scanFolderForAudio('/music', c =>
      corrupt.push(c),
    );

    expect(tracks).toHaveLength(1);
    expect(tracks[0].uri).toBe('/music/good.mp3');
    expect(corrupt).toEqual([
      {uri: '/music/broken.mp3', reason: 'stat_failed'},
    ]);
  });

  it('scanAudioFolders aggregates duplicates + corrupt across folders', async () => {
    mockedReadDir.mockImplementation(async (dir: string) => {
      if (String(dir) === '/music/a') {
        return [
          file({name: 'track.mp3', path: '/music/a/track.mp3', size: 1024}),
        ];
      }
      if (String(dir) === '/music/b') {
        return [
          file({name: 'track.mp3', path: '/music/b/track.mp3', size: 1024}),
          file({name: 'broken.mp3', path: '/music/b/broken.mp3', size: 0}),
        ];
      }
      return [];
    });
    mockedStat.mockImplementation(async (uri: string) => {
      if (String(uri).includes('broken')) return statOf(0);
      return statOf(1024);
    });

    const result = await scanAudioFolders(['/music/a', '/music/b']);

    expect(result.tracks).toHaveLength(2);
    expect(result.duplicates).toHaveLength(1);
    expect(result.duplicates[0].files).toContain('/music/a/track.mp3');
    expect(result.duplicates[0].files).toContain('/music/b/track.mp3');
    expect(result.corruptFiles).toEqual([
      {uri: '/music/b/broken.mp3', reason: 'zero_size'},
    ]);
  });

  it('scanAudioFolders returns empty arrays for no folders', async () => {
    const result = await scanAudioFolders([]);
    expect(result).toEqual({
      tracks: [],
      duplicates: [],
      corruptFiles: [],
    });
    expect(mockedReadDir).not.toHaveBeenCalled();
  });

  it('scanFolderForAudio recurses into subdirectories', async () => {
    mockedReadDir.mockResolvedValueOnce([
      dir({name: 'sub', path: '/music/sub'}),
    ]);
    mockedReadDir.mockResolvedValueOnce([
      file({name: 'deep.mp3', path: '/music/sub/deep.mp3', size: 2048}),
    ]);
    mockedStat.mockResolvedValue(statOf(2048));

    const tracks = await scanFolderForAudio('/music');

    expect(tracks).toHaveLength(1);
    expect(tracks[0].uri).toBe('/music/sub/deep.mp3');
  });
});