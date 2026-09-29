/// <reference types="node" />
/**
 * V19 W1 Phase 1.3 — `VideoErrorOverlay` tests.
 *
 * **W5 reaudit update.** This suite previously asserted the
 * placeholder behavior that shipped in W1:
 *   - every error rendered as "Connection problem" (the hardcoded
 *     `kind = 'network'` stub),
 *   - Retry launched `openPlayer({uri: ''})` (an empty URI),
 *   - Close was a no-op.
 *
 * Those assertions described a fake control surface, so they were
 * replaced with assertions for the real one: the copy comes from
 * `classifyError()`, Retry is hidden unless a real retry target
 * exists, and Close releases the session.
 */

import * as React from 'react';
import {render, screen} from '@testing-library/react-native';
import {VideoErrorOverlay} from '../../../../src/components/player/video/VideoErrorOverlay/VideoErrorOverlay';

// Mock the transport facade so the overlay sees a controlled
// videoState / error and can assert the commands it calls.
const mockVideoState = {current: 'idle' as string, error: null as unknown};
const mockCommands = {
  close: jest.fn(),
  enterPip: jest.fn(),
  exitPip: jest.fn(),
  stop: jest.fn(),
  clear: jest.fn(),
};
const mockController = {
  getState: jest.fn(() => ({currentItem: null})),
  retry: jest.fn(),
};

jest.mock('../../../../src/infrastructure/player', () => ({
  usePlaybackState: () => ({
    videoState: mockVideoState.current,
    error: mockVideoState.error,
  }),
  useTransport: () => ({state: {}, commands: mockCommands}),
  useVideoController: () => ({controller: mockController}),
  classifyError: jest.requireActual(
    '../../../../src/infrastructure/player/video/errorClassifier',
  ).classifyError,
}));

describe('VideoErrorOverlay', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockVideoState.current = 'idle';
    mockVideoState.error = null;
    mockController.getState.mockReturnValue({currentItem: null} as never);
  });

  it('renders nothing when videoState is not "error"', () => {
    mockVideoState.current = 'playing';
    render(<VideoErrorOverlay />);
    expect(screen.queryByText("Couldn't reach the server")).toBeNull();
    expect(screen.queryByLabelText('Close player')).toBeNull();
  });

  it('renders nothing on the idle screen', () => {
    mockVideoState.current = 'idle';
    render(<VideoErrorOverlay />);
    expect(screen.queryByLabelText('Close player')).toBeNull();
  });

  it('shows the classifier copy for a real network failure', () => {
    mockVideoState.current = 'error';
    mockVideoState.error = new Error('HTTP 503 Service Unavailable');
    render(<VideoErrorOverlay />);
    expect(screen.getByText("Couldn't reach the server")).toBeTruthy();
  });

  it('does NOT hardcode "Connection problem" for a codec failure', () => {
    // W5 reaudit: every error used to render as a connection
    // problem. A codec failure must now show codec copy.
    mockVideoState.current = 'error';
    mockVideoState.error = new Error('no decoder for codec hevc failed');
    render(<VideoErrorOverlay />);
    expect(screen.getByText("Can't play this video")).toBeTruthy();
    expect(screen.queryByText('Connection problem')).toBeNull();
  });

  it('shows a distinct title for an expired session', () => {
    mockVideoState.current = 'error';
    mockVideoState.error = new Error('HTTP 401 Unauthorized');
    render(<VideoErrorOverlay />);
    expect(screen.getByText('Sign in again')).toBeTruthy();
  });

  it('hides Retry when there is no loaded item to retry', () => {
    // No-inert-control rule: a Retry button that cannot retry must
    // not render at all.
    mockVideoState.current = 'error';
    mockVideoState.error = new Error('HTTP 500');
    mockController.getState.mockReturnValue({currentItem: null} as never);
    render(<VideoErrorOverlay />);
    expect(screen.queryByLabelText('Retry loading')).toBeNull();
    expect(screen.getByLabelText('Close player')).toBeTruthy();
  });

  it('renders Retry when a loaded item gives a real retry target', () => {
    mockVideoState.current = 'error';
    mockVideoState.error = new Error('HTTP 500');
    mockController.getState.mockReturnValue({
      currentItem: {uri: 'a.mp4', title: 'A', lane: 'video'},
    } as never);
    render(<VideoErrorOverlay />);
    expect(screen.getByLabelText('Retry loading')).toBeTruthy();
  });

  it('Retry calls controller.retry() — NOT openPlayer with an empty URI', () => {
    mockVideoState.current = 'error';
    mockVideoState.error = new Error('HTTP 500');
    mockController.getState.mockReturnValue({
      currentItem: {uri: 'a.mp4', title: 'A', lane: 'video'},
    } as never);
    render(<VideoErrorOverlay />);
    screen.getByLabelText('Retry loading').props.onPress?.();
    expect(mockController.retry).toHaveBeenCalled();
  });

  it('Close releases the session via commands.close()', () => {
    // W5 reaudit: Close used to be an explicit no-op placeholder.
    mockVideoState.current = 'error';
    mockVideoState.error = new Error('HTTP 500');
    render(<VideoErrorOverlay />);
    screen.getByLabelText('Close player').props.onPress?.();
    expect(mockCommands.close).toHaveBeenCalled();
  });
});
