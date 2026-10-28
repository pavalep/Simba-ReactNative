/**
 * V22 W32 (2026-10-28) — the app's ONE bottom-chrome rule.
 *
 * ## What this pins
 *
 * The mini-player docks are painted at `bottom: 0` of the WINDOW, over
 * whatever screen the user is on. Every floating action button in the app
 * floats one spacing step above the safe area, and nothing knew that a
 * dock might be up — so the dock's top 14 dp sat over the bottom of
 * every button, and the last row of every list sat under the dock.
 *
 * The rule is one line:
 *
 *     bottom offset = max(insets.bottom, mini player band) + spacing.lg
 *
 * Both terms are measured from the window bottom, so they are
 * comparable, and whichever is taller is the one that has to be cleared.
 *
 * ## Why the derivation matters more than the number
 *
 * The rule reads two facts, and the tests below drive the REAL stores
 * rather than a mock, because a mocked setter would pass even if the
 * write were dropped on the way out:
 *
 *   • WHICH lane is up — `nowPlaying.streamType`, the same field the
 *     chrome itself branches on;
 *   • WHETHER that lane is showing its dock — the video lane's
 *     `videoPresentation` (and NOT PiP), the audio lane's `mode`.
 *
 * The dangerous failure is not "the number is wrong". It is "the rule
 * says no mini player is up when one plainly is" — and that is exactly
 * the case a mocked store would hide.
 */

import {renderHook} from '@testing-library/react-native';
import {
  MINI_PLAYER_ART_SIZE,
  MINI_PLAYER_HEIGHT,
  MINI_PLAYER_PROGRESS_HEIGHT,
  MINI_PLAYER_ROW_PADDING,
  useBottomChromeBand,
  useBottomChromeHeight,
  useBottomChromeInset,
  useMiniPlayerUp,
} from '../../../src/infrastructure/player/miniPlayerChrome';
import {useNowPlayingStore} from '../../../src/state/nowPlayingStore';
import {usePresentationStore} from '../../../src/state/usePresentationStore';
import {useAudioPresentationStore} from '../../../src/state/useAudioPresentationStore';
import {spacing} from '../../../src/theme/tokens';

function beginSession(streamType?: 'video' | 'audio') {
  useNowPlayingStore.getState().begin({
    uri: 'file:///media/clip.mkv',
    title: 'Clip',
    startPositionMs: 0,
    ...(streamType ? {streamType} : {}),
  });
}

afterEach(() => {
  useNowPlayingStore.getState().reset();
  useAudioPresentationStore.setState({mode: 'expanded'});
  usePresentationStore.setState({videoPresentation: 'mini', pipActive: false});
});

describe('MINI_PLAYER_HEIGHT', () => {
  it('is the sum of the three numbers the dock is laid out with', () => {
    // The height is DERIVED from the same parts the docks lay themselves
    // out with, so the declared height and the painted height cannot
    // drift apart.
    expect(MINI_PLAYER_HEIGHT).toBe(
      MINI_PLAYER_PROGRESS_HEIGHT +
        MINI_PLAYER_ART_SIZE +
        MINI_PLAYER_ROW_PADDING * 2,
    );
  });

  it('is 54 dp — the dock design, not a free variable', () => {
    expect(MINI_PLAYER_HEIGHT).toBe(54);
  });
});

describe('useMiniPlayerUp', () => {
  it('is false with nothing playing', async () => {
    const {result} = await renderHook(() => useMiniPlayerUp());
    expect(result.current).toBe(false);
  });

  it('is true for a minimised audio session', async () => {
    beginSession('audio');
    useAudioPresentationStore.setState({mode: 'mini'});
    const {result} = await renderHook(() => useMiniPlayerUp());
    expect(result.current).toBe(true);
  });

  it('is false for an EXPANDED audio session — the full player is not a dock', async () => {
    beginSession('audio');
    useAudioPresentationStore.setState({mode: 'expanded'});
    const {result} = await renderHook(() => useMiniPlayerUp());
    expect(result.current).toBe(false);
  });

  it('is true for a minimised video session', async () => {
    beginSession('video');
    usePresentationStore.setState({videoPresentation: 'mini'});
    const {result} = await renderHook(() => useMiniPlayerUp());
    expect(result.current).toBe(true);
  });

  it('is false for an EXPANDED video session', async () => {
    beginSession('video');
    usePresentationStore.setState({videoPresentation: 'expanded'});
    const {result} = await renderHook(() => useMiniPlayerUp());
    expect(result.current).toBe(false);
  });

  it('is false in PiP — the OS owns the window, so there is no dock', async () => {
    beginSession('video');
    usePresentationStore.setState({videoPresentation: 'mini', pipActive: true});
    const {result} = await renderHook(() => useMiniPlayerUp());
    expect(result.current).toBe(false);
  });

  it('treats a session with no stream type as the audio lane', async () => {
    // The chrome does the same: `PlayerChrome` renders the audio lane for
    // every session that is not a video, so an unset `streamType` is
    // audio. Reading it any other way would leave the audio dock
    // unaccounted for.
    beginSession(undefined);
    useAudioPresentationStore.setState({mode: 'mini'});
    const {result} = await renderHook(() => useMiniPlayerUp());
    expect(result.current).toBe(true);
  });
});

describe('the bottom-chrome clearance', () => {
  it('is one spacing step above the safe area when nothing is playing', async () => {
    // The repo's safe-area mock reports zero insets, so the inset the
    // hook adds IS the bottom it lands on.
    const {result} = await renderHook(() => ({
      band: useBottomChromeBand(),
      height: useBottomChromeHeight(),
      inset: useBottomChromeInset(),
    }));

    expect(result.current.height).toBe(0);
    expect(result.current.band).toBe(0);
    expect(result.current.inset).toBe(spacing.lg);
  });

  it('is the height of the dock when a dock is up', async () => {
    beginSession('audio');
    useAudioPresentationStore.setState({mode: 'mini'});

    const {result} = await renderHook(() => ({
      band: useBottomChromeBand(),
      height: useBottomChromeHeight(),
      inset: useBottomChromeInset(),
    }));

    expect(result.current.height).toBe(MINI_PLAYER_HEIGHT);
    expect(result.current.band).toBe(MINI_PLAYER_HEIGHT);
    expect(result.current.inset).toBe(MINI_PLAYER_HEIGHT + spacing.lg);
  });

  it('is NOT the dock height when the dock is not painted', async () => {
    // The video lane's dock is ALWAYS mounted and only its opacity
    // changes, so "mounted" would claim a band nothing is painting in.
    beginSession('video');
    usePresentationStore.setState({videoPresentation: 'expanded'});

    const {result} = await renderHook(() => useBottomChromeHeight());
    expect(result.current).toBe(0);
  });
});
