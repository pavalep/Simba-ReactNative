/// <reference types="node" />
/**
 * V19 W3 Phase 3.4 — `MoreSheet` + `More` unit tests.
 *
 * Source of truth: `md/SIMBA_PLAYER_MODULE_V19_TRACKER.md` Phase 3.4.
 *
 * Covers:
 *   - MoreSheet renders nothing when visible=false
 *   - renders all 4 menu items
 *   - tapping an item invokes onAction with the right key
 *   - tapping the scrim calls onClose WITHOUT onAction
 *   - More (the button) opens the sheet on tap
 *   - selecting Share calls shareContent with title + artist
 *   - selecting Save / Track info / Add to playlist logs a placeholder
 *     warning (documented as deferred wiring)
 */

import * as React from 'react';
import {act, fireEvent} from '@testing-library/react-native';
import {renderChrome} from '../../../../helpers/renderChrome';
import {MoreSheet} from '../../../../../src/components/player/video/TransportBar/MoreSheet';
import {More} from '../../../../../src/components/player/video/TransportBar/More';

jest.mock('../../../../../src/theme', () => ({
  useTheme: () => ({
    colors: {
      background: {elevated: '#141416', scrimDim: 'rgba(0,0,0,0.45)'},
      border: {subtle: '#1A1A1C', emphasis: 'rgba(255,255,255,0.12)'},
      accent: {gold: '#C9A84C', goldSoft: 'rgba(201,168,76,0.10)'},
      text: {primary: '#EDEDED', secondary: '#80EDEDED', tertiary: '#4DEDEDED', accent: '#C9A84C', inverse: '#0A0A0C'},
      shadow: '#000000',
      // `Toast` reads `colors.semantic.*` when it renders a toast
      // banner. Save / Add-to-playlist now report through `useToast`,
      // so a test that triggers them mounts a real Toast and the
      // mock theme must carry these tokens.
      semantic: {
        success: '#3DD68C',
        error: '#FF5A5F',
        warning: '#FFB020',
        info: '#5AA9FF',
      },
    },
    spacing: {xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24},
    radius: {lg: 16},
    typography: {
      body2: {fontSize: 15, lineHeight: 22},
      caption: {fontSize: 13, lineHeight: 18},
    },
  }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({top: 0, bottom: 0, left: 0, right: 0}),
}));

jest.mock('../../../../../src/services/shareService', () => ({
  shareContent: jest.fn().mockResolvedValue(undefined),
}));

const shareService = require('../../../../../src/services/shareService');

// W5/W6 reaudit: Save now performs a REAL download, so the service is
// mocked and asserted on rather than letting a filesystem write happen
// in a unit test.
jest.mock('../../../../../src/services/downloadService', () => ({
  startDownload: jest.fn().mockResolvedValue(undefined),
}));
const downloadService = require('../../../../../src/services/downloadService');

// NB: the variable name must start with `mock` — jest's hoisting
// plugin rejects any other out-of-scope reference inside a
// `jest.mock` factory ("The module factory of `jest.mock()` is not
// allowed to reference any out-of-scope variables").
jest.mock('../../../../../src/state/playerStore', () => ({
  usePlayerStore: {
    getState: () => ({addToPlaylist: mockAddToPlaylist}),
  },
}));
const mockAddToPlaylist = jest.fn();
const playerStore = {addToPlaylist: mockAddToPlaylist};

// The facade exposes the current URI structurally, derived from the
// lib's playlist entry. The W5/W6 Save / Add-to-playlist actions act
// on that value, so the mocked lib state must carry it.
jest.mock('@simba-dev/react-native-media-player', () => ({
  usePlayer: () => ({
    state: {
      title: 'Stairway to Heaven',
      artist: 'Led Zeppelin',
      playlist: [{filename: 'https://cdn.test/stairway.mp4', title: 'Stairway to Heaven'}],
      currentIndex: 0,
    },
    commands: {},
  }),
  usePlayerProgress: () => ({positionMs: 0, durationMs: 0, isBuffering: false}),
}));

describe('MoreSheet', () => {
  it('renders nothing when visible=false', async () => {
    const {toJSON} = await renderChrome(
      <MoreSheet visible={false} onAction={jest.fn()} onClose={jest.fn()} />,
    );
    expect(toJSON()).toBeNull();
  });

  it('renders all 4 menu items', async () => {
    const {getByLabelText} = await renderChrome(
      <MoreSheet visible onAction={jest.fn()} onClose={jest.fn()} />,
    );
    expect(getByLabelText('Save')).toBeTruthy();
    expect(getByLabelText('Add to playlist')).toBeTruthy();
    expect(getByLabelText('Track info')).toBeTruthy();
    expect(getByLabelText('Share')).toBeTruthy();
  });

  it('tapping an item invokes onAction with the right key', async () => {
    const onAction = jest.fn();
    const {getByLabelText} = await renderChrome(
      <MoreSheet visible onAction={onAction} onClose={jest.fn()} />,
    );
    fireEvent.press(getByLabelText('Track info'));
    expect(onAction).toHaveBeenCalledWith('trackInfo');
  });

  it('tapping the scrim calls onClose WITHOUT onAction', async () => {
    const onAction = jest.fn();
    const onClose = jest.fn();
    const {getByLabelText} = await renderChrome(
      <MoreSheet visible onAction={onAction} onClose={onClose} />,
    );
    fireEvent.press(getByLabelText('Close more menu'));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onAction).not.toHaveBeenCalled();
  });
});

describe('More (button + sheet integration)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    shareService.shareContent.mockClear();
  });

  it('renders the button + opens the sheet on tap', async () => {
    const {getByTestId, getByLabelText} = await renderChrome(<More />);
    // Awaited act(): the press flips `sheetOpen`, and RNTL 14's async
    // act needs the re-render flushed before the Modal's rows are
    // queryable.
    await act(async () => {
      fireEvent.press(getByLabelText('More options'));
    });
    // `More` renders `VideoMoreSheet` (W3.5.6 replaced `MoreSheet`),
    // whose legacy rows are addressed by testID, not by
    // accessibility label. These assertions were still written
    // against the W3.4 `MoreSheet` labels and never matched.
    expect(getByTestId('legacy-save')).toBeTruthy();
    expect(getByTestId('legacy-share')).toBeTruthy();
  });

  it('Share calls shareContent with the current track title + artist', async () => {
    const {getByTestId, getByLabelText} = await renderChrome(<More />);
    await act(async () => {
      fireEvent.press(getByLabelText('More options'));
    });
    fireEvent.press(getByTestId('legacy-share'));
    expect(shareService.shareContent).toHaveBeenCalledWith({
      route: 'SongScreen',
      params: {},
      title: 'Stairway to Heaven',
      subtitle: 'Led Zeppelin',
    });
  });

  it('Save starts a real download for the current track URI', async () => {
    // W5/W6 reaudit: these tests previously asserted that Save and
    // Add-to-playlist only logged a placeholder warning. A test that
    // pins placeholder behaviour LOCKS the jugaad in, so both were
    // rewritten against the real implementation.
    const {getByTestId, getByLabelText} = await renderChrome(<More />);
    await act(async () => {
      fireEvent.press(getByLabelText('More options'));
    });
    fireEvent.press(getByTestId('legacy-save'));
    expect(downloadService.startDownload).toHaveBeenCalledWith(
      expect.objectContaining({uri: 'https://cdn.test/stairway.mp4'}),
    );
  });

  it('Add to playlist really appends to the player queue', async () => {
    const {getByTestId, getByLabelText} = await renderChrome(<More />);
    await act(async () => {
      fireEvent.press(getByLabelText('More options'));
    });
    fireEvent.press(getByTestId('legacy-add-to-playlist'));
    expect(playerStore.addToPlaylist).toHaveBeenCalledWith(
      expect.objectContaining({uri: 'https://cdn.test/stairway.mp4'}),
    );
  });
});
