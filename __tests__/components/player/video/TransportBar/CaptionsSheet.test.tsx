/// <reference types="node" />
/**
 * V19 W3 Phase 3.2 — `CaptionsSheet` unit tests.
 *
 * Source of truth: `md/SIMBA_PLAYER_MODULE_V19_TRACKER.md` Phase 3.2.
 *
 * Covers:
 *   - renders nothing when visible=false
 *   - "Off" entry always present (sentinel)
 *   - one menu row per track + the "Off" entry
 *   - the active track is gold-highlighted (selected state)
 *   - tapping a track calls onSelect with that trackId
 *   - tapping "Off" calls onSelect(null)
 *   - tapping the scrim calls onClose WITHOUT onSelect
 */

import * as React from 'react';
import {fireEvent, render} from '@testing-library/react-native';
import {CaptionsSheet} from '../../../../../src/components/player/video/TransportBar/CaptionsSheet';
import type {CaptionTrack} from '../../../../../src/infrastructure/player';

jest.mock('../../../../../src/theme', () => ({
  useTheme: () => ({
    colors: {
      background: {
        elevated: '#141416',
        scrimDim: 'rgba(0,0,0,0.45)',
      },
      border: {subtle: '#1A1A1C', emphasis: 'rgba(255,255,255,0.12)'},
      accent: {gold: '#C9A84C', goldSoft: 'rgba(201,168,76,0.10)'},
      text: {primary: '#EDEDED', secondary: '#80EDEDED', tertiary: '#4DEDEDED', accent: '#C9A84C'},
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

const TRACKS: CaptionTrack[] = [
  {id: 100, label: 'English', lang: 'en', active: true},
  {id: 101, label: 'Español', lang: 'es', active: false},
  {id: 102, label: '日本語', lang: 'ja', active: false},
];

describe('CaptionsSheet', () => {
  it('renders nothing when visible=false', async () => {
    const {toJSON} = await render(
      <CaptionsSheet
        visible={false}
        captionTracks={TRACKS}
        activeTrackId={100}
        onSelect={jest.fn()}
        onClose={jest.fn()}
      />,
    );
    expect(toJSON()).toBeNull();
  });

  it('renders "Off" + one menu row per track', async () => {
    const {getByLabelText} = await render(
      <CaptionsSheet
        visible
        captionTracks={TRACKS}
        activeTrackId={100}
        onSelect={jest.fn()}
        onClose={jest.fn()}
      />,
    );
    expect(getByLabelText('Captions off')).toBeTruthy();
    expect(getByLabelText('Captions: English')).toBeTruthy();
    expect(getByLabelText('Captions: Español')).toBeTruthy();
    expect(getByLabelText('Captions: 日本語')).toBeTruthy();
  });

  it('marks the active track as selected', async () => {
    const {getByLabelText} = await render(
      <CaptionsSheet
        visible
        captionTracks={TRACKS}
        activeTrackId={101}
        onSelect={jest.fn()}
        onClose={jest.fn()}
      />,
    );
    expect(getByLabelText('Captions: Español').props.accessibilityState)
      .toEqual({selected: true});
    expect(getByLabelText('Captions: English').props.accessibilityState)
      .toEqual({selected: false});
  });

  it('marks "Off" as selected when activeTrackId is null', async () => {
    const {getByLabelText} = await render(
      <CaptionsSheet
        visible
        captionTracks={TRACKS}
        activeTrackId={null}
        onSelect={jest.fn()}
        onClose={jest.fn()}
      />,
    );
    expect(getByLabelText('Captions off').props.accessibilityState)
      .toEqual({selected: true});
  });

  it('tapping a track calls onSelect with its id', async () => {
    const onSelect = jest.fn();
    const {getByLabelText} = await render(
      <CaptionsSheet
        visible
        captionTracks={TRACKS}
        activeTrackId={100}
        onSelect={onSelect}
        onClose={jest.fn()}
      />,
    );
    fireEvent.press(getByLabelText('Captions: Español'));
    expect(onSelect).toHaveBeenCalledWith(101);
  });

  it('tapping "Off" calls onSelect(null)', async () => {
    const onSelect = jest.fn();
    const {getByLabelText} = await render(
      <CaptionsSheet
        visible
        captionTracks={TRACKS}
        activeTrackId={100}
        onSelect={onSelect}
        onClose={jest.fn()}
      />,
    );
    fireEvent.press(getByLabelText('Captions off'));
    expect(onSelect).toHaveBeenCalledWith(null);
  });

  it('tapping the scrim calls onClose WITHOUT onSelect', async () => {
    const onSelect = jest.fn();
    const onClose = jest.fn();
    const {getByLabelText} = await render(
      <CaptionsSheet
        visible
        captionTracks={TRACKS}
        activeTrackId={100}
        onSelect={onSelect}
        onClose={onClose}
      />,
    );
    fireEvent.press(getByLabelText('Close captions picker'));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('renders ONLY the "Off" entry when no tracks exist', async () => {
    const {getByLabelText, queryByLabelText} = await render(
      <CaptionsSheet
        visible
        captionTracks={[]}
        activeTrackId={null}
        onSelect={jest.fn()}
        onClose={jest.fn()}
      />,
    );
    expect(getByLabelText('Captions off')).toBeTruthy();
    expect(queryByLabelText('Captions: English')).toBeNull();
  });
});
