/**
 * W22 (2026-10-21) — `useVideoOwnsWindow()`: who owns the window?
 *
 * ## The blank white screen
 *
 * Measured on device (emulator-5554, API 37, 2026-10-21): launch a film, press
 * the header's back. The native teardown ran and the chrome went away — and
 * the screen stayed WHITE. Two minutes later it was still white. The app was
 * unusable until the process was restarted.
 *
 * ## Why
 *
 * The browsing stack is blanked while a fullscreen video owns the window, so
 * the feed cannot flash behind the picture and cannot swallow the player's
 * touches. That blanking was keyed on `presentation.isExpanded` — the user's
 * REQUEST for a fullscreen video.
 *
 * The request outlives the session, and that is deliberate: the close verb
 * ends the session without rewriting the request, because the request means
 * "what did I ask for the video", and a close is not a request for the NEXT
 * video to start minimised.
 *
 * So the window stayed owned by a video that was gone. The chrome unmounted
 * with the session, the feed stayed blanked, and nothing painted over it.
 *
 * ## The contract this file pins
 *
 * The window is owned by the video when BOTH hold:
 *
 *   1. the user asked for fullscreen, and
 *   2. there is a video session that can honour that request.
 *
 * The regression is case 1 without case 2. That combination used to blank the
 * feed with nothing over it, which is the blank white screen.
 */

import {act, renderHook} from '@testing-library/react-native';
import {useVideoOwnsWindow} from '../../../src/infrastructure/player/useVideoOwnsWindow';
import {usePresentationStore} from '../../../src/state/usePresentationStore';
import {useNowPlayingStore} from '../../../src/state/nowPlayingStore';

const VIDEO_SESSION = {
  uri: 'file:///movies/film.mkv',
  title: 'Film',
  startPositionMs: 0,
  streamType: 'video' as const,
  type: 'movie' as const,
  mediaLane: 'video' as const,
};

const AUDIO_SESSION = {
  uri: 'file:///music/song.flac',
  title: 'Song',
  startPositionMs: 0,
  streamType: 'audio' as const,
  type: 'music' as const,
  mediaLane: 'audio' as const,
};

describe('useVideoOwnsWindow — who owns the window', () => {
  beforeEach(() => {
    usePresentationStore.setState({
      pipActive: false,
      videoPresentation: 'mini',
    });
    useNowPlayingStore.getState().reset();
  });

  it('is true when a fullscreen video is on screen', async () => {
    usePresentationStore.setState({videoPresentation: 'expanded'});
    useNowPlayingStore.getState().begin(VIDEO_SESSION);

    const {result} = await renderHook(() => useVideoOwnsWindow());
    expect(result.current).toBe(true);
  });

  /**
   * THE regression test.
   *
   * The request says "expanded", the session is gone. The video is not on
   * screen, so it does not own the window, so the feed must paint.
   *
   * Before the fix this was `true`, and the app sat on a blank white screen
   * after a close.
   */
  it('is false once the session is gone, even though the request still says expanded', async () => {
    usePresentationStore.setState({videoPresentation: 'expanded'});
    useNowPlayingStore.getState().begin(VIDEO_SESSION);

    const {result} = await renderHook(() => useVideoOwnsWindow());
    expect(result.current).toBe(true);

    // The close verb ends the session and leaves the request alone.
    await act(async () => {
      useNowPlayingStore.getState().end();
    });

    expect(usePresentationStore.getState().videoPresentation).toBe('expanded');
    expect(result.current).toBe(false);
  });

  it('is false for a minimised video — the feed is meant to show beside the dock', async () => {
    usePresentationStore.setState({videoPresentation: 'mini'});
    useNowPlayingStore.getState().begin(VIDEO_SESSION);

    const {result} = await renderHook(() => useVideoOwnsWindow());
    expect(result.current).toBe(false);
  });

  it('is false for an audio session — audio has no window of its own', async () => {
    usePresentationStore.setState({videoPresentation: 'expanded'});
    useNowPlayingStore.getState().begin(AUDIO_SESSION);

    const {result} = await renderHook(() => useVideoOwnsWindow());
    expect(result.current).toBe(false);
  });

  it('is false during PiP — the OS window owns the surface', async () => {
    usePresentationStore.setState({
      videoPresentation: 'expanded',
      pipActive: true,
    });
    useNowPlayingStore.getState().begin(VIDEO_SESSION);

    const {result} = await renderHook(() => useVideoOwnsWindow());
    expect(result.current).toBe(false);
  });

  it('is false with no session at all', async () => {
    usePresentationStore.setState({videoPresentation: 'expanded'});

    const {result} = await renderHook(() => useVideoOwnsWindow());
    expect(result.current).toBe(false);
  });

  /**
   * The wiring, not the derivation.
   *
   * The derivation is only worth anything if the two things that ask the
   * question ask THIS one. They used to ask it in two different ways, which
   * is how they came to disagree: the browsing stack keyed on the request,
   * and the hardware-back handler keyed on the request too — so after a close
   * the feed stayed blanked AND the hardware back kept swallowing presses on
   * the browsing stack, where the user meant "go back".
   *
   * A behavioural test of `AppRoot` would mount the whole app, so this is a
   * source check — the same shape the repo already uses for "must not import
   * X" contracts (`usePresentation.test.tsx`). It fails if either call site
   * stops asking this hook.
   */
  it('is the ONE thing the browsing stack and the hardware back ask', () => {
    const fs = require('fs');
    const path = require('path');
    const src = path.join(__dirname, '../../../src');

    const appRoot = fs.readFileSync(
      path.join(src, 'app/AppRoot.tsx'),
      'utf8',
    );
    // The blanking is bound to the hook's answer.
    expect(appRoot).toMatch(/<BrowsingStack hidden={videoOwnsWindow}>/);
    // And it is not bound to the request any more.
    expect(appRoot).not.toMatch(/<BrowsingStack hidden={isExpanded}>/);

    const videoPlayer = fs.readFileSync(
      path.join(src, 'components/player/video/VideoPlayer/VideoPlayer.tsx'),
      'utf8',
    );
    // The hardware-back gate is the same answer.
    expect(videoPlayer).toMatch(/if \(!videoOwnsWindow\) return undefined;/);
    expect(videoPlayer).not.toMatch(/if \(!isExpanded\) return undefined;/);
  });
});
