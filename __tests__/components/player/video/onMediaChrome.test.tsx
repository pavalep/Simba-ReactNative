/// <reference types="node" />
/**
 * V19 W-DEFECT-1 — "chrome over the media surface must take its ink
 * from the on-media tokens".
 *
 * The video frame is a DARK surface in both themes, but the chrome
 * resolved its colours from the APP theme. In light theme
 * `text.primary` is `#1A1A1C` and `text.tertiary` is
 * `rgba(26,26,28,0.30)` — so every icon, both time labels and the
 * "CC" caption painted near-black on near-black and were invisible.
 * `text.onMediaSoft` / `text.onMediaMuted` (white at 80% / 70%)
 * existed in `tokens.ts` the whole time, unused.
 *
 * WHY THESE ASSERTIONS ARE POSITIVE (name the expected token) RATHER
 * THAN A BLANKET BAN ON THE NEAR-BLACK VALUES
 *
 * A sweep that fails on any use of light theme's `text.primary` /
 * `secondary` / `tertiary` values cannot work, because in light theme
 * `text.inverse` is ALSO `#1A1A1C` — the same string. Several
 * elements legitimately use `text.inverse`: the play/pause glyph and
 * the Retry / Play-now labels sit on the GOLD CTA fill, and the
 * volume / brightness pills sit on `background.floating`, which is a
 * LIGHT surface in light theme. A value-based ban would either flag
 * those correct pairings or have to whitelist the exact value it was
 * supposed to catch, i.e. catch nothing.
 *
 * So each case names the token it EXPECTS. That discriminates
 * cleanly: before the fix every one of these resolved to
 * `#1A1A1C` / `rgba(26,26,28,0.55)` / `rgba(26,26,28,0.30)`, and
 * none of them equals `rgba(255,255,255,0.80)` or
 * `rgba(255,255,255,0.70)`.
 *
 * The theme mock is the REAL light palette from
 * `requireActual('src/theme/tokens')` — a partial colour stub would
 * make a suite whose entire subject is colour test the stub.
 */

import * as React from 'react';
import {Text} from 'react-native';
import type {StyleProp, ViewStyle} from 'react-native';
import {render} from '@testing-library/react-native';
import type {TestInstance} from 'test-renderer';
import {AppText} from '../../../../src/components/core/AppText/AppText';
import {renderChrome} from '../../../helpers/renderChrome';
import {
  makeTransportState,
  makeTransportCommands,
} from '../../../helpers/transportState';
import type {TransportState} from '../../../../src/infrastructure/player';
import {TransportBar} from '../../../../src/components/player/video/TransportBar/TransportBar';
import {TransportRow} from '../../../../src/components/player/video/TransportBar/TransportRow';
import {ModeControl} from '../../../../src/components/player/video/TransportBar/ModeControl';
import {CaptionsToggle} from '../../../../src/components/player/video/TransportBar/CaptionsToggle';
import {PiPToggle} from '../../../../src/components/player/video/TransportBar/PiPToggle';
import {More} from '../../../../src/components/player/video/TransportBar/More';
import {ScrubPreview} from '../../../../src/components/player/video/ScrubPreview/ScrubPreview';
import {VideoLoadingOverlay} from '../../../../src/components/player/video/VideoLoadingOverlay/VideoLoadingOverlay';
import {VideoErrorOverlay} from '../../../../src/components/player/video/VideoErrorOverlay/VideoErrorOverlay';
import {NextUpOverlay} from '../../../../src/components/player/video/NextUp/NextUpOverlay';
import {VideoMoreSheet} from '../../../../src/components/player/video/VideoMoreSheet/VideoMoreSheet';
import {VideoTitleOverlay} from '../../../../src/components/player/video/VideoTitleOverlay/VideoTitleOverlay';
import {
  useQualityStore,
  VIDEO_QUALITY_PRESETS,
} from '../../../../src/state/useQualityStore';

// ── Theme: the REAL light palette ───────────────────────────────────────
jest.mock('../../../../src/theme', () => {
  const actual = jest.requireActual('../../../../src/theme/tokens');
  const tokens = actual.lightTokens;
  return {
    useTheme: () => ({
      theme: 'light',
      tokens,
      colors: tokens.colors,
      legacy: actual.legacyFromTokens(tokens),
      spacing: tokens.spacing,
      typography: tokens.typography,
      shadows: tokens.lightShadows,
      radius: tokens.radius,
      motion: tokens.motion,
      isDark: false,
      setTheme: jest.fn(),
      themeMode: 'light',
    }),
  };
});

// ── Player facade ───────────────────────────────────────────────────────
//
// Submodules are spread rather than the barrel, so the pure helpers
// the chrome imports (`formatMsAsClock`, `clampPosition`,
// `classifyError`, `findClosestKeyframe`) stay REAL and only the
// stateful hooks are stubbed.
let mockTransport: {
  state: TransportState;
  commands: ReturnType<typeof makeTransportCommands>;
} = {
  state: makeTransportState(),
  commands: makeTransportCommands(),
};

const mockPlayback = {
  videoState: 'idle' as string,
  isPlaying: false,
  hasSession: true,
  isBuffering: false,
  positionMs: 0,
  durationMs: 0,
  isAtEnd: false,
  error: null as unknown,
};

jest.mock('../../../../src/infrastructure/player', () => {
  const actual = {
    ...jest.requireActual(
      '../../../../src/infrastructure/player/useTransport',
    ),
    ...jest.requireActual(
      '../../../../src/infrastructure/player/useHaptic',
    ),
    ...jest.requireActual(
      '../../../../src/infrastructure/player/usePresentation',
    ),
    ...jest.requireActual(
      '../../../../src/infrastructure/player/useReduceMotion',
    ),
    ...jest.requireActual(
      '../../../../src/infrastructure/player/usePlaybackState',
    ),
    ...jest.requireActual(
      '../../../../src/infrastructure/player/useKeyframes',
    ),
    ...jest.requireActual(
      '../../../../src/infrastructure/player/useSkipSilence',
    ),
    ...jest.requireActual(
      '../../../../src/infrastructure/player/useChromeAutoHide',
    ),
    ...jest.requireActual(
      '../../../../src/infrastructure/player/position',
    ),
    ...jest.requireActual(
      '../../../../src/infrastructure/player/streamErrors',
    ),
    ...jest.requireActual(
      '../../../../src/infrastructure/player/bridgeErrors',
    ),
    ...jest.requireActual(
      '../../../../src/infrastructure/player/resumePolicy',
    ),
    ...jest.requireActual(
      '../../../../src/infrastructure/player/validateLane',
    ),
    ...jest.requireActual(
      '../../../../src/infrastructure/player/playbackFacade',
    ),
    ...jest.requireActual(
      '../../../../src/infrastructure/player/video',
    ),
  };
  return {
    ...actual,
    useTransport: () => mockTransport,
    usePlaybackState: () => mockPlayback,
    // No native keyframe sampler under jest.
    useKeyframes: () => ({samples: []}),
    useVideoController: () => ({
      controller: {
        getState: () => ({currentItem: {uri: 'file:///video.mp4'}}),
        retry: jest.fn().mockResolvedValue(undefined),
      },
    }),
  };
});

// ── SvgIcon: a colour-preserving stand-in ──────────────────────────────
//
// The global `\\.svg$` jest mapper (`__mocks__/svgMock.js`) forwards only
// `width` / `height` / `style` — it DROPS `color`. So under the stock
// mapper the ink of an icon does not exist anywhere in the rendered
// tree, and every icon assertion in this file would pass vacuously on
// `undefined`.
//
// Mocking the real module path (`components/utility/SvgIcon`, the same
// specifier the chrome imports — not a package barrel) replaces it with
// a host node that KEEPS `color` on a prop, which is where the real
// `SvgIcon` puts it: `<IconComponent color={color} … />`. So what this
// reads is the component's real decision, not a reimplementation.
jest.mock('../../../../src/components/utility/SvgIcon', () => {
  const React = jest.requireActual('react') as typeof import('react');
  const {View} = jest.requireActual('react-native') as typeof import('react-native');
  return {
    SvgIcon: ({
      name,
      size,
      color,
      style,
    }: {
      name: string;
      size?: number;
      color?: string;
      style?: StyleProp<ViewStyle>;
    }) => {
      // `color` is not a `View` prop, hence the cast: the stand-in
      // exists precisely to SURFACE the ink the real `SvgIcon` would
      // hand to the SVG, and jest's stock SVG mock throws it away.
      const props = {
        testID: `icon-${name}`,
        color,
        style: [{width: size, height: size}, style],
      } as unknown as React.ComponentProps<typeof View>;
      return React.createElement(View, props);
    },
  };
});

const {lightColors} = jest.requireActual(
  '../../../../src/theme/tokens',
) as typeof import('../../../../src/theme/tokens');

const ON_MEDIA_SOFT = lightColors.text.onMediaSoft;
const ON_MEDIA_MUTED = lightColors.text.onMediaMuted;

// ── Ink resolution helpers ──────────────────────────────────────────────

/**
 * The colour a `Text` actually paints.
 *
 * `AppText` composes `[{color: resolved}, typography, ...callerStyle]`
 * and the platform applies those in order, so the LAST `color` in the
 * flattened array is the one on screen. Reading the first entry (or
 * the array as a whole) would report the pre-override default and
 * blame the wrong line.
 */
function inkOfText(node: TestInstance | string): string | undefined {
  if (typeof node === 'string') return undefined;
  const flat = (
    Array.isArray(node.props.style)
      ? node.props.style.flat(Infinity)
      : [node.props.style]
  ).filter(Boolean) as Array<{color?: unknown}>;
  for (let i = flat.length - 1; i >= 0; i--) {
    const c = flat[i].color;
    if (typeof c === 'string') return c;
  }
  return undefined;
}

/** `true` for `#rgb`, `rgba(...)`, `rgb(...)` — not a token NAME. */
function looksLikeColour(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    (value.startsWith('#') ||
      value.startsWith('rgba(') ||
      value.startsWith('rgb('))
  );
}

/**
 * The colour an icon paints.
 *
 * `SvgIcon` forwards `color` straight to the SVG component, and the
 * jest SVG mapper turns each asset into a host node that keeps its
 * props — so the ink is on `props.color`. The `looksLikeColour` filter
 * matters: `AppText`'s `color` PROP carries a token NAME
 * (`'tertiary'`), which is not a colour and must not be mistaken for
 * one.
 */
function inkOfIconWithin(node: TestInstance | string): string | undefined {
  if (typeof node === 'string') return undefined;
  if (looksLikeColour(node.props?.color)) return node.props.color;
  for (const child of node.children ?? []) {
    const found = inkOfIconWithin(child);
    if (found) return found;
  }
  return undefined;
}

/** Renders, asserts, tears down. RNTL 14's `unmount` is async. */
async function withChrome(
  ui: React.ReactElement,
  assertion: (result: Awaited<ReturnType<typeof render>>) => void,
): Promise<void> {
  const result = await renderChrome(ui);
  try {
    assertion(result);
  } finally {
    await result.unmount();
  }
}

// ── Suites ──────────────────────────────────────────────────────────────

describe('chrome over the media surface — LIGHT theme ink', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTransport.state = makeTransportState();
    mockTransport.commands = makeTransportCommands();
    Object.assign(mockPlayback, {
      videoState: 'idle',
      isBuffering: false,
      error: null,
    });
  });

  // ── TransportBar ─────────────────────────────────────────────────────

  it('TransportBar: the elapsed label is on-media', async () => {
    await withChrome(<TransportBar />, ({getByText}) => {
      expect(inkOfText(getByText('1:00'))).toBe(ON_MEDIA_MUTED);
    });
  });

  it('TransportBar: the remaining label is on-media', async () => {
    await withChrome(<TransportBar />, ({getByText}) => {
      expect(inkOfText(getByText('-3:00'))).toBe(ON_MEDIA_MUTED);
    });
  });

  it('TransportBar: repeat + caption + PiP chrome are all on-media', async () => {
    // One tree, every row-3 control that can render. Each of these
    // self-collapses when its state flag is false, so all three flags
    // must be set for the assertion to mean anything.
    mockTransport.state = makeTransportState({
      captionTracks: [{id: 1, label: 'English', lang: 'en', active: false}],
      canEnterPip: true,
    });
    await withChrome(<TransportBar />, ({getByText, getByLabelText}) => {
      expect(inkOfText(getByText('Off'))).toBe(ON_MEDIA_MUTED);
      expect(inkOfText(getByText('CC'))).toBe(ON_MEDIA_MUTED);
      expect(
        inkOfIconWithin(getByLabelText('Enter Picture-in-Picture')),
      ).toBe(ON_MEDIA_MUTED);
      expect(inkOfIconWithin(getByLabelText('More options'))).toBe(
        ON_MEDIA_MUTED,
      );
    });
  });

  // ── TransportRow ─────────────────────────────────────────────────────

  it('TransportRow: the four unfilled icons are on-media', async () => {
    mockTransport.state = makeTransportState({canGoPrev: true, canGoNext: true});
    await withChrome(<TransportRow />, ({getByLabelText}) => {
      for (const label of [
        'Rewind 10 seconds',
        'Previous track',
        'Next track',
        'Forward 10 seconds',
      ]) {
        expect(inkOfIconWithin(getByLabelText(label))).toBe(ON_MEDIA_SOFT);
      }
    });
  });

  it('TransportRow: play/pause KEEPS text.inverse on its gold fill', async () => {
    // The deliberate exception, pinned so nobody "fixes" the one
    // control that is already correct: dark ink on the gold CTA is the
    // readable pairing in BOTH themes.
    await withChrome(<TransportRow />, ({getByLabelText}) => {
      expect(inkOfIconWithin(getByLabelText('Pause'))).toBe(
        lightColors.text.inverse,
      );
    });
  });

  // ── Row-3 controls, standalone ───────────────────────────────────────

  it('ModeControl: label + icon are on-media when repeat is off', async () => {
    await withChrome(<ModeControl />, ({getByText, getByLabelText}) => {
      expect(inkOfText(getByText('Off'))).toBe(ON_MEDIA_MUTED);
      expect(
        inkOfIconWithin(
          getByLabelText('Repeat mode: Off. Tap to change.'),
        ),
      ).toBe(ON_MEDIA_MUTED);
    });
  });

  it('ModeControl: the active mode keeps gold', async () => {
    mockTransport.state = makeTransportState({repeatMode: 'all'});
    await withChrome(<ModeControl />, ({getByText}) => {
      expect(inkOfText(getByText('Repeat all'))).toBe(lightColors.accent.gold);
    });
  });

  it('CaptionsToggle: the "CC" caption is on-media when no track is active', async () => {
    mockTransport.state = makeTransportState({
      captionTracks: [{id: 1, label: 'English', lang: 'en', active: false}],
      activeCaptionTrackId: null,
    });
    await withChrome(<CaptionsToggle />, ({getByText, getByLabelText}) => {
      expect(inkOfText(getByText('CC'))).toBe(ON_MEDIA_MUTED);
      expect(
        inkOfIconWithin(
          getByLabelText('Captions off. Tap to choose a caption track.'),
        ),
      ).toBe(ON_MEDIA_MUTED);
    });
  });

  it('CaptionsToggle: an active track keeps gold', async () => {
    mockTransport.state = makeTransportState({
      captionTracks: [{id: 1, label: 'English', lang: 'en', active: false}],
      activeCaptionTrackId: 1,
    });
    await withChrome(<CaptionsToggle />, ({getByText}) => {
      expect(inkOfText(getByText('English'))).toBe(
        lightColors.accent.gold,
      );
    });
  });

  it('PiPToggle: the icon is on-media', async () => {
    mockTransport.state = makeTransportState({canEnterPip: true});
    await withChrome(<PiPToggle />, ({getByLabelText}) => {
      expect(
        inkOfIconWithin(getByLabelText('Enter Picture-in-Picture')),
      ).toBe(ON_MEDIA_MUTED);
    });
  });

  it('More: the glyph is on-media', async () => {
    await withChrome(<More />, ({getByLabelText}) => {
      expect(inkOfIconWithin(getByLabelText('More options'))).toBe(
        ON_MEDIA_MUTED,
      );
    });
  });

  // ── Surfaces that are dark in BOTH themes ────────────────────────────

  it('ScrubPreview: the pill timestamp is on-media', async () => {
    // The pill is filled `background.surfaceDark`, which is
    // `rgba(18,18,22,0.92)` in light AND dark.
    await withChrome(
      <ScrubPreview
        visible
        positionMs={90_000}
        centerX={120}
        barWidth={300}
        keyframes={[]}
      />,
      ({getByText}) => {
        // The preview is `importantForAccessibility="no-hide-descendants"`
        // (it is a redundant visual echo of the time labels), so RNTL
        // hides the whole subtree unless the query opts in.
        expect(
          inkOfText(getByText('1:30', {includeHiddenElements: true})),
        ).toBe(ON_MEDIA_SOFT);
      },
    );
  });

  it('VideoLoadingOverlay: the label is on-media while preparing', async () => {
    mockPlayback.videoState = 'preparing';
    await withChrome(<VideoLoadingOverlay />, ({getByText}) => {
      expect(inkOfText(getByText('Preparing video'))).toBe(ON_MEDIA_MUTED);
    });
  });

  it('VideoLoadingOverlay: the spinner tint is on-media', async () => {
    mockPlayback.isBuffering = true;
    // `ActivityIndicator` carries its tint on a PROP (no style), so it
    // is read through the icon/prop path, not the text path. The
    // overlay's own label sits on a STYLE colour, so the two do not
    // collide.
    await withChrome(<VideoLoadingOverlay />, ({getByLabelText}) => {
      expect(inkOfIconWithin(getByLabelText('Loading'))).toBe(ON_MEDIA_SOFT);
    });
  });

  it('VideoErrorOverlay: the Close label is on-media on its dark scrim', async () => {
    mockPlayback.videoState = 'error';
    mockPlayback.error = {code: 'NETWORK', recoverable: true, message: 'boom'};
    await withChrome(<VideoErrorOverlay />, ({getByText}) => {
      expect(inkOfText(getByText('Close'))).toBe(ON_MEDIA_SOFT);
    });
  });

  it('VideoErrorOverlay: the Retry label KEEPS text.inverse on its gold fill', async () => {
    mockPlayback.videoState = 'error';
    mockPlayback.error = {code: 'NETWORK', recoverable: true, message: 'boom'};
    await withChrome(<VideoErrorOverlay />, ({getByText}) => {
      expect(inkOfText(getByText('Retry'))).toBe(lightColors.text.inverse);
    });
  });

  it('NextUpOverlay: the "Up next" label is on-media on its dark card', async () => {
    mockTransport.state = makeTransportState({
      repeatMode: 'all',
      canGoNext: true,
      positionMs: 235_000,
      durationMs: 240_000,
      nextTrack: {uri: 'file:///next.mp4', title: 'Next one'},
    });
    await withChrome(<NextUpOverlay />, ({getByText}) => {
      expect(inkOfText(getByText('Up next'))).toBe(ON_MEDIA_MUTED);
    });
  });

  it('VideoMoreSheet: the section descriptions are on-media', async () => {
    // Derived from the same store + preset table the sheet reads, so
    // the expectation cannot drift from the component when the
    // default preset changes.
    const description =
      VIDEO_QUALITY_PRESETS.find(
        o => o.value === useQualityStore.getState().preset,
      )?.description ?? '';
    expect(description).not.toBe('');

    await withChrome(
      <VideoMoreSheet visible onAction={jest.fn()} onClose={jest.fn()} />,
      ({getByText}) => {
        expect(inkOfText(getByText(description))).toBe(ON_MEDIA_MUTED);
      },
    );
  });

  it('VideoTitleOverlay: the title is on-media', async () => {
    mockTransport.state = makeTransportState({
      title: 'A Documentary About Concrete',
      artist: 'Some Channel',
    });
    await withChrome(<VideoTitleOverlay />, ({getByText}) => {
      expect(
        inkOfText(getByText('A Documentary About Concrete')),
      ).toBe(ON_MEDIA_SOFT);
      expect(inkOfText(getByText('Some Channel'))).toBe(ON_MEDIA_MUTED);
    });
  });
});

describe('the ink helpers can actually fail', () => {
  // Guards on the guards. If `inkOfText` / `inkOfIconWithin` stopped
  // resolving (a tree-shape change, a renamed prop), every assertion
  // above would pass on `undefined` and pin nothing. These prove the
  // helpers read a real colour — including through a style ARRAY,
  // which is how most of the chrome delivers its ink.
  it('inkOfText reads the LAST colour in a style array', async () => {
    const {getByText, unmount} = await renderChrome(
      <Text style={[{color: '#111111'}, {color: ON_MEDIA_SOFT}]}>
        later wins
      </Text>,
    );
    expect(inkOfText(getByText('later wins'))).toBe(ON_MEDIA_SOFT);
    await unmount();
  });

  it('inkOfIconWithin ignores AppText token NAMES passed as a prop', async () => {
    // `color="tertiary"` is a token NAME, not a colour. Reading it as
    // an ink would make the icon helper report a phantom value — and
    // `AppText` is exactly the component that takes token names, so
    // this is a real shape in the tree, not a hypothetical one.
    const {getByText, unmount} = await renderChrome(
      <AppText color="tertiary">named token</AppText>,
    );
    expect(inkOfIconWithin(getByText('named token'))).toBeUndefined();
    await unmount();
  });

  it('a near-black ink is what the helpers would have reported before the fix', async () => {
    const {getByText, unmount} = await renderChrome(
      <Text style={{color: lightColors.text.primary}}>invisible</Text>,
    );
    const reported = inkOfText(getByText('invisible'));
    expect(reported).toBe(lightColors.text.primary);
    expect(reported).not.toBe(ON_MEDIA_SOFT);
    expect(reported).not.toBe(ON_MEDIA_MUTED);
    await unmount();
  });
});
