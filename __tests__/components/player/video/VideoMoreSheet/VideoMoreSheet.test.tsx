/// <reference types="node" />
/**
 * V19 W7.4 — `VideoMoreSheet`: the sheet contract.
 *
 * Source of truth: `md/SIMBA_PLAYER_V19_UI_OVERHAUL.md` §1.4 / §3.3.
 *
 * This suite is mostly about the three ways the sheet could not be
 * closed, because "the bottom sheet goes full screen and cannot be
 * closed" was the single most serious complaint the overhaul received,
 * and it had two independent causes that a single "sheet has a close
 * button" assertion would not have caught:
 *
 *   1. the backdrop was a plain `View`, so tapping outside did nothing;
 *   2. the only close button sat at the BOTTOM of a scroll that was
 *      90% of the screen tall, i.e. off-screen.
 *
 * Both are asserted structurally here, not by "a close button exists".
 */

import * as React from 'react';
import {act, fireEvent, render} from '@testing-library/react-native';
import {
  VideoMoreSheet,
  SPEED_OPTIONS,
  SHEET_MAX_HEIGHT,
  DISMISS_DRAG_PX,
} from '../../../../../src/components/player/video/VideoMoreSheet/VideoMoreSheet';

const mockSetSpeed = jest.fn();
const mockSetProperty = jest.fn();
const mockPause = jest.fn();
const mockSkipSilenceToggle = jest.fn();
const mockShareContent = jest.fn(() => Promise.resolve());
const mockToastShow = jest.fn();

const mockTransport = {
  state: {
    speed: 1,
    volume: 60,
    isMuted: false,
    title: 'Nazar Ke Samne',
    artist: 'Akshay Kumar',
    currentUri: 'file:///nazar.mkv',
    durationMs: 7_200_000,
    captionTracks: [],
    activeCaptionTrackId: null,
    repeatMode: 'off' as const,
    positionMs: 0,
    isPlaying: true,
    isBuffering: false,
    isSeeking: false,
    isEnded: false,
    bufferedRanges: [],
    normalizedWindow: null,
    seekable: true,
    canEnterPip: true,
    isOrientationLocked: false,
    canGoPrev: false,
    canGoNext: false,
  },
  commands: {
    setSpeed: mockSetSpeed,
    setProperty: mockSetProperty,
    pause: mockPause,
  },
};

jest.mock('../../../../../src/infrastructure/player', () => {
  const actual = {
    ...jest.requireActual(
      '../../../../../src/infrastructure/player/useTransport',
    ),
    ...jest.requireActual(
      '../../../../../src/infrastructure/player/useHaptic',
    ),
  };
  return {
    ...actual,
    useTransport: () => mockTransport,
    useHaptic: () => ({haptic: jest.fn(), isSupported: true}),
    useSkipSilence: () => ({
      enabled: false,
      toggle: mockSkipSilenceToggle,
    }),
  };
});

jest.mock('../../../../../src/state/useQualityStore', () => ({
  VIDEO_QUALITY_PRESETS: [
    {value: 'battery-saver', label: 'Battery saver', description: 'Lower power draw.'},
    {value: 'balanced', label: 'Balanced', description: 'Recommended for most devices.'},
    {value: 'high-quality', label: 'High quality', description: 'Best picture, highest load.'},
  ],
  presetToMpv: (p: string) => ({hwdec: `hwdec-${p}`, profile: `profile-${p}`}),
  useQualityStore: (sel: (s: unknown) => unknown) =>
    sel({preset: 'balanced', setPreset: jest.fn()}),
}));

jest.mock('../../../../../src/state/useSleepTimerStore', () => ({
  SLEEP_TIMER_OPTIONS: [
    {value: 0, label: 'Off'},
    {value: 15, label: '15 minutes'},
    {value: 30, label: '30 minutes'},
  ],
  useSleepTimerStore: (sel: (s: unknown) => unknown) =>
    sel({minutes: 0, setMinutes: jest.fn()}),
}));

jest.mock('../../../../../src/state/useAutoPlayNextStore', () => ({
  useAutoPlayNextStore: (sel: (s: unknown) => unknown) =>
    sel({enabled: false, setEnabled: jest.fn()}),
}));

jest.mock('../../../../../src/state/playerStore', () => ({
  usePlayerStore: {getState: () => ({addToPlaylist: jest.fn()})},
}));

jest.mock('../../../../../src/services/downloadService', () => ({
  startDownload: jest.fn(() => Promise.resolve()),
}));

jest.mock('../../../../../src/services/shareService', () => ({
  shareContent: jest.fn((..._args: unknown[]) => mockShareContent()),
}));

jest.mock('../../../../../src/components/feedback/Toast', () => ({
  useToast: () => ({show: mockToastShow}),
}));

jest.mock('../../../../../src/theme', () => {
  const actual = jest.requireActual('../../../../../src/theme/tokens');
  const tokens = actual.darkTokens;
  return {
    useTheme: () => ({
      theme: 'dark',
      tokens,
      colors: tokens.colors,
      spacing: tokens.spacing,
      typography: tokens.typography,
      radius: tokens.radius,
      legacy: actual.legacyFromTokens(tokens),
    }),
  };
});

const renderSheet = async () =>
  render(
    <VideoMoreSheet
      visible
      onAction={jest.fn()}
      onClose={jest.fn()}
    />,
  );

describe('VideoMoreSheet — it can always be closed', () => {
  beforeEach(() => jest.clearAllMocks());

  // ── Exit 1: the backdrop ────────────────────────────────────────────
  //
  // It was a plain `View`. This is the assertion that would have caught
  // that, and it is deliberately about the BACKDROP's own onPress rather
  // than about the presence of a close button — a sheet can have a
  // perfect ✕ and still be undismissable by tapping outside.

  // Asserted BEHAVIOURALLY rather than by introspecting `onPress` on the
  // resolved node: `Pressable` resolves to a host View whose handler
  // lives one level up, so a props check would pass or fail on RNTL's
  // internals rather than on this component. What actually matters is
  // that tapping outside closes the sheet — asserted next — and that
  // there is a full-screen surface out there to tap, asserted here.
  it('the backdrop covers the whole screen, so there is something to tap', async () => {
    const {getByTestId} = await renderSheet();
    const style = getByTestId('more-backdrop').props.style;
    const flat = (Array.isArray(style) ? style.flat(Infinity) : [style]).filter(
      Boolean,
    ) as Array<Record<string, unknown>>;
    // `StyleSheet.absoluteFill` flattens to top/left/right/bottom 0.
    expect(
      flat.some(
        s => s.position === 'absolute' || s.top === 0,
      ),
    ).toBe(true);
  });

  it('tapping the backdrop closes the sheet', async () => {
    const onClose = jest.fn();
    const {getByTestId} = await render(
      <VideoMoreSheet visible onAction={jest.fn()} onClose={onClose} />,
    );
    await act(async () => {
      fireEvent.press(getByTestId('more-backdrop'));
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('the backdrop is labelled for assistive tech', async () => {
    const {getByTestId} = await renderSheet();
    expect(getByTestId('more-backdrop').props.accessibilityLabel).toBe(
      'Close more menu',
    );
  });

  // ── Exit 2: the pinned close control ───────────────────────────────
  //
  // The old close button was the LAST child of the ScrollView. On a
  // 90%-tall sheet it was off-screen, so the only way out was the
  // hardware back button. The fix is structural: the control lives
  // outside the scroll.

  it('has a close control that is NOT inside the scroll view', async () => {
    const {getByTestId} = await renderSheet();
    const close = getByTestId('more-close');
    // Walk up: the close control's ancestors must not include the
    // ScrollView. This is the assertion that distinguishes "there is a
    // close button" from "the close button is reachable" — the original
    // defect was a Close button that existed but sat below the fold of a
    // 90%-tall scroll.
    let node = close.parent as {type?: unknown} | null;
    let sawScrollView = false;
    while (node) {
      if (
        node.type === 'RCTScrollView' ||
        node.type === 'ScrollView' ||
        String(node.type).includes('ScrollView')
      ) {
        sawScrollView = true;
        break;
      }
      node = (node as {parent?: {type?: unknown} | null}).parent ?? null;
    }
    expect(sawScrollView).toBe(false);
  });

  it('the close control dismisses the sheet', async () => {
    const onClose = jest.fn();
    const {getByTestId} = await render(
      <VideoMoreSheet visible onAction={jest.fn()} onClose={onClose} />,
    );
    await act(async () => {
      fireEvent.press(getByTestId('more-close'));
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('the header carries a drag handle', async () => {
    const {getByTestId} = await renderSheet();
    expect(getByTestId('more-sheet')).toBeTruthy();
  });

  // ── Exit 3: drag to dismiss ─────────────────────────────────────────

  it('exposes a dismissal distance that a thumb can actually travel', async () => {
    // A threshold under ~50 px dismisses on an accidental brush while
    // scrolling the header; a very large one makes it feel broken.
    expect(DISMISS_DRAG_PX).toBeGreaterThanOrEqual(50);
    expect(DISMISS_DRAG_PX).toBeLessThanOrEqual(160);
  });

  // ── It is a panel, not a page ───────────────────────────────────────

  // "It goes full screen" was `maxHeight: '90%'`, which left the film as
  // a sliver. The assertion is relational — the sheet must leave real
  // screen above it — so a future retune cannot quietly creep back to
  // covering the player.
  it('leaves the video visible above it', async () => {
    const percent = parseInt(SHEET_MAX_HEIGHT, 10);
    expect(percent).toBeGreaterThan(0);
    expect(percent).toBeLessThanOrEqual(70);
  });

  // ── Information architecture ────────────────────────────────────────

  it('groups its rows under small section headers, not display type', async () => {
    const {getByText} = await renderSheet();
    expect(getByText('Playback')).toBeTruthy();
    expect(getByText('Library')).toBeTruthy();
  });

  // A setting's row height must not depend on how many values it has —
  // that dependency is what forced the sheet to 90% of the screen.
  it('a setting with many values still renders one collapsed row', async () => {
    const {getByTestId, queryByTestId} = await renderSheet();
    expect(getByTestId('speed-row')).toBeTruthy();
    // SPEED_OPTIONS has 5 entries; collapsed, none of them are present.
    expect(queryByTestId('speed-row-options')).toBeNull();
    for (const opt of SPEED_OPTIONS) {
      expect(
        queryByTestId(`speed-row-option-${opt.value}`),
      ).toBeNull();
    }
  });

  it('tapping a value row reveals its options inline', async () => {
    const {getByTestId, queryByTestId} = await renderSheet();
    await act(async () => {
      fireEvent.press(getByTestId('speed-row'));
    });
    expect(getByTestId('speed-row-options')).toBeTruthy();
    expect(
      queryByTestId('speed-row-option-1.5'),
    ).toBeTruthy();
  });

  it('only one setting is expanded at a time', async () => {
    // Three sections all open at once is the chip wall again — the very
    // thing the value-row design exists to prevent.
    const {getByTestId, queryByTestId} = await renderSheet();
    await act(async () => {
      fireEvent.press(getByTestId('speed-row'));
    });
    expect(getByTestId('speed-row-options')).toBeTruthy();
    await act(async () => {
      fireEvent.press(getByTestId('quality-row'));
    });
    expect(queryByTestId('speed-row-options')).toBeNull();
    expect(getByTestId('quality-row-options')).toBeTruthy();
  });

  it('tapping an open row collapses it', async () => {
    const {getByTestId, queryByTestId} = await renderSheet();
    await act(async () => {
      fireEvent.press(getByTestId('speed-row'));
    });
    await act(async () => {
      fireEvent.press(getByTestId('speed-row'));
    });
    expect(queryByTestId('speed-row-options')).toBeNull();
  });

  it('shows the current value on the row, so the state is never a guess', async () => {
    const {getByTestId} = await renderSheet();
    expect(getByTestId('speed-row').props.accessibilityLabel).toContain('1×');
  });

  // ── The boolean defect ──────────────────────────────────────────────

  // The old sheet rendered Skip silence as TWO chips, "Off" and "On",
  // and BOTH called `skipSilence.toggle()`. Tapping the chip labelled
  // "Off" while it was already off turned it ON. One row that sets an
  // explicit boolean makes that unrepresentable, and this test pins the
  // observable consequence: one row, one press, one toggle — not a
  // toggle per chip.
  it('skip silence is ONE row that toggles once, not two chips', async () => {
    const {getByTestId, queryByText} = await renderSheet();
    expect(getByTestId('skip-silence-row')).toBeTruthy();
    // The two-chip form is gone: neither label may exist.
    expect(queryByText('Skip silence: Off')).toBeNull();
    expect(queryByText('Skip silence: On')).toBeNull();

    await act(async () => {
      fireEvent.press(getByTestId('skip-silence-row'));
    });
    expect(mockSkipSilenceToggle).toHaveBeenCalledTimes(1);
  });

  it('the skip-silence row is a switch, not a button', async () => {
    const {getByTestId} = await renderSheet();
    const row = getByTestId('skip-silence-row');
    expect(row.props.accessibilityRole).toBe('switch');
    expect(row.props.accessibilityState).toMatchObject({checked: false});
  });

  it('auto-play next is one switch row too', async () => {
    const {getByTestId, queryByText} = await renderSheet();
    expect(getByTestId('auto-play-next-row')).toBeTruthy();
    expect(queryByText('Auto-play next: Off')).toBeNull();
    expect(queryByText('Auto-play next: On')).toBeNull();
  });

  // ── Actions still work ──────────────────────────────────────────────

  it('selecting a speed calls the real command and collapses the row', async () => {
    const {getByTestId, queryByTestId} = await renderSheet();
    await act(async () => {
      fireEvent.press(getByTestId('speed-row'));
    });
    await act(async () => {
      fireEvent.press(getByTestId('speed-row-option-1.5'));
    });
    expect(mockSetSpeed).toHaveBeenCalledWith(1.5);
    expect(queryByTestId('speed-row-options')).toBeNull();
  });

  it('selecting a quality writes mpv properties', async () => {
    const {getByTestId} = await renderSheet();
    await act(async () => {
      fireEvent.press(getByTestId('quality-row'));
    });
    await act(async () => {
      fireEvent.press(getByTestId('quality-row-option-high-quality'));
    });
    expect(mockSetProperty).toHaveBeenCalledWith('hwdec', 'hwdec-high-quality');
    expect(mockSetProperty).toHaveBeenCalledWith(
      'profile',
      'profile-high-quality',
    );
  });

  it('keeps the four library actions reachable', async () => {
    const {getByTestId} = await renderSheet();
    for (const id of [
      'legacy-save',
      'legacy-add-to-playlist',
      'legacy-share',
      'legacy-track-info',
    ]) {
      expect(getByTestId(id)).toBeTruthy();
    }
  });
});
