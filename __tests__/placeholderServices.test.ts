// ─── V21 P06 T06.06 — round-trip tests for the surviving placeholder services
//
// Pre-V21 these services were 100% TODO (D-005, D-006, D-007, D-008).
// Post-V21 they have real implementations (or, for the genuinely
// unsupportable ones, explicit "this is a placeholder" doc comments
// pointing to the real data source).
//
// V21 W5 P17 update — `storageService` and `playlistService` were
// `git rm`'d in this wave (their D-005/D-006 closures were already
// in place via W2 P06 commits d0abeb4 + 3d7ca68, but the files had
// become orphaned — every persisted piece of state lives in a
// Zustand store backed by `sharedMMKVStorage`). Their tests moved
// to `__tests__/infrastructure/mmkv.test.ts` (the migration tests)
// and the Zustand-store persistence tests at `__tests__/state/*.test.ts`
// (out of scope for the W5 P17 batch).
//
// What survives here is the `mediaService` block — its placeholders
// (loadFile / scanDirectory returning null / []) are still part of
// the public surface and used by FolderBrowserScreen + HomeScreen.
//
// We don't need React or @testing-library/react-native here —
// these are pure-Node tests against the service.

import {mediaService} from '../src/services/mediaService';

describe('mediaService — V21 P06 T06.03 (closes D-007)', () => {
  // The pre-V21 TODOs returned null / []. The post-V21 methods
  // still return null / [] (the real metadata lives in
  // useMediaStore). This test documents the contract.

  it('loadFile returns null', async () => {
    expect(await mediaService.loadFile('file:///anywhere')).toBeNull();
  });

  it('scanDirectory returns []', async () => {
    expect(await mediaService.scanDirectory('/anywhere')).toEqual([]);
  });

  it('formatDuration formats seconds as m:ss', () => {
    expect(mediaService.formatDuration(0)).toBe('0:00');
    expect(mediaService.formatDuration(59)).toBe('0:59');
    expect(mediaService.formatDuration(60)).toBe('1:00');
    expect(mediaService.formatDuration(125)).toBe('2:05');
    expect(mediaService.formatDuration(3599)).toBe('59:59');
  });
});