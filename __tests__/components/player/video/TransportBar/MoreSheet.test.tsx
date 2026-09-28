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
import {fireEvent, render} from '@testing-library/react-native';
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

jest.mock('@simba-dev/react-native-media-player', () => ({
  usePlayer: () => ({
    state: {title: 'Stairway to Heaven', artist: 'Led Zeppelin'},
    commands: {},
  }),
}));

describe('MoreSheet', () => {
  it('renders nothing when visible=false', async () => {
    const {toJSON} = await render(
      <MoreSheet visible={false} onAction={jest.fn()} onClose={jest.fn()} />,
    );
    expect(toJSON()).toBeNull();
  });

  it('renders all 4 menu items', async () => {
    const {getByLabelText} = await render(
      <MoreSheet visible onAction={jest.fn()} onClose={jest.fn()} />,
    );
    expect(getByLabelText('Save')).toBeTruthy();
    expect(getByLabelText('Add to playlist')).toBeTruthy();
    expect(getByLabelText('Track info')).toBeTruthy();
    expect(getByLabelText('Share')).toBeTruthy();
  });

  it('tapping an item invokes onAction with the right key', async () => {
    const onAction = jest.fn();
    const {getByLabelText} = await render(
      <MoreSheet visible onAction={onAction} onClose={jest.fn()} />,
    );
    fireEvent.press(getByLabelText('Track info'));
    expect(onAction).toHaveBeenCalledWith('trackInfo');
  });

  it('tapping the scrim calls onClose WITHOUT onAction', async () => {
    const onAction = jest.fn();
    const onClose = jest.fn();
    const {getByLabelText} = await render(
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
    const {getByLabelText} = await render(<More />);
    fireEvent.press(getByLabelText('More options'));
    expect(getByLabelText('Save')).toBeTruthy();
    expect(getByLabelText('Share')).toBeTruthy();
  });

  it('Share calls shareContent with the current track title + artist', async () => {
    const {getByLabelText} = await render(<More />);
    fireEvent.press(getByLabelText('More options'));
    fireEvent.press(getByLabelText('Share'));
    expect(shareService.shareContent).toHaveBeenCalledWith({
      route: 'SongScreen',
      params: {},
      title: 'Stairway to Heaven',
      subtitle: 'Led Zeppelin',
    });
  });

  it('Save logs a placeholder warning (documented as deferred)', async () => {
    const warnSpy = jest
      .spyOn(console, 'warn')
      .mockImplementation(() => {});
    const {getByLabelText} = await render(<More />);
    fireEvent.press(getByLabelText('More options'));
    fireEvent.press(getByLabelText('Save'));
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("[More] action 'save'"),
    );
    warnSpy.mockRestore();
  });

  it('Add to playlist logs a placeholder warning', async () => {
    const warnSpy = jest
      .spyOn(console, 'warn')
      .mockImplementation(() => {});
    const {getByLabelText} = await render(<More />);
    fireEvent.press(getByLabelText('More options'));
    fireEvent.press(getByLabelText('Add to playlist'));
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("[More] action 'addToPlaylist'"),
    );
    warnSpy.mockRestore();
  });
});
