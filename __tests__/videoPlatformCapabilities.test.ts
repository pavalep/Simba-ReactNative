/**
 * v11 T8.1 — Native bridge setOrientation / setImmersive +
 * platform capabilities detection.
 *
 * Coverage:
 *   T8.1: MpvPlayer.setOrientation('portrait' | 'landscape' | 'sensor')
 *         routes through the TurboModule spec; feature-detects
 *         when the bridge is missing (no throw).
 *   T8.1: MpvPlayer.setImmersive(true|false) routes through the
 *         TurboModule spec; feature-detects when missing.
 *   T8.1: createVideoPlatformCapabilities() reports
 *         canFullscreen / canChangeOrientation based on the
 *         actual presence of the new bridge methods (Android
 *         + both methods present = true; either missing = false).
 *   T8.1: iOS / missing methods reports false for both
 *         canFullscreen and canChangeOrientation.
 *
 * The native Gradle build + device smoke test (Huawei + Pixel)
 * is a separate user task; this jest test covers the JS surface
 * and capability detection.
 */
import {Platform} from 'react-native';
import {createVideoPlatformCapabilities} from '../src/modules/playback/video/infrastructure/VideoPlatformCapabilities';
import MpvPlayer from '../src/native/player.api';
import type {Spec} from '../src/native/NativeMpvPlayer';

// MpvPlayer is a const object literal (not a class), so the
// helper attaches mocks to the literal itself. Reassigning a
// property shadows the arrow function for that test.
function setMpvMock(overrides: Partial<Spec>): void {
  Object.assign(MpvPlayer as unknown as object, overrides);
}

describe('MpvPlayer.setOrientation / setImmersive — T8.1 bridge', () => {
  test('setOrientation("landscape") calls the native bridge', () => {
    const setOrientation = jest.fn();
    setMpvMock({setOrientation} as unknown as Partial<Spec>);
    MpvPlayer.setOrientation('landscape');
    expect(setOrientation).toHaveBeenCalledWith('landscape');
  });

  test('setOrientation("portrait") and ("sensor") route correctly', () => {
    const setOrientation = jest.fn();
    setMpvMock({setOrientation} as unknown as Partial<Spec>);
    MpvPlayer.setOrientation('portrait');
    expect(setOrientation).toHaveBeenLastCalledWith('portrait');
    MpvPlayer.setOrientation('sensor');
    expect(setOrientation).toHaveBeenLastCalledWith('sensor');
  });

  test('setOrientation("portrait") and ("sensor") route correctly', () => {
    const setOrientation = jest.fn();
    setMpvMock({setOrientation} as unknown as Partial<Spec>);
    MpvPlayer.setOrientation('portrait');
    expect(setOrientation).toHaveBeenLastCalledWith('portrait');
    MpvPlayer.setOrientation('sensor');
    expect(setOrientation).toHaveBeenLastCalledWith('sensor');
  });

  test('setImmersive(true) and (false) call the native bridge', () => {
    const setImmersive = jest.fn();
    setMpvMock({setImmersive} as unknown as Partial<Spec>);
    MpvPlayer.setImmersive(true);
    expect(setImmersive).toHaveBeenCalledWith(true);
    MpvPlayer.setImmersive(false);
    expect(setImmersive).toHaveBeenLastCalledWith(false);
  });
});

describe('createVideoPlatformCapabilities — T8.1 capability detection', () => {
  let originalOS: typeof Platform.OS;

  beforeAll(() => {
    originalOS = Platform.OS;
  });

  afterEach(() => {
    Object.defineProperty(Platform, 'OS', {
      value: originalOS,
      configurable: true,
      writable: true,
    });
  });

  function setPlatformOS(os: 'android' | 'ios'): void {
    Object.defineProperty(Platform, 'OS', {
      value: os,
      configurable: true,
      writable: true,
    });
  }

  test('Android with both methods present: canFullscreen and canChangeOrientation are true', () => {
    setPlatformOS('android');
    setMpvMock({
      enterPip: jest.fn(),
      setOrientation: jest.fn(),
      setImmersive: jest.fn(),
    } as unknown as Partial<Spec>);
    const caps = createVideoPlatformCapabilities();
    expect(caps.canFullscreen).toBe(true);
    expect(caps.canChangeOrientation).toBe(true);
    expect(caps.canPictureInPicture).toBe(true);
  });

  test('Android with only setOrientation (setImmersive missing): canFullscreen is false', () => {
    setPlatformOS('android');
    setMpvMock({
      enterPip: jest.fn(),
      setOrientation: jest.fn(),
      setImmersive: undefined,
    } as unknown as Partial<Spec>);
    const caps = createVideoPlatformCapabilities();
    expect(caps.canFullscreen).toBe(false);
    expect(caps.canChangeOrientation).toBe(false);
  });

  test('Android with only setImmersive (setOrientation missing): canFullscreen is false', () => {
    setPlatformOS('android');
    setMpvMock({
      enterPip: jest.fn(),
      setOrientation: undefined,
      setImmersive: jest.fn(),
    } as unknown as Partial<Spec>);
    const caps = createVideoPlatformCapabilities();
    expect(caps.canFullscreen).toBe(false);
  });

  test('Android with neither method: canFullscreen is false (pre-T8.1 build)', () => {
    setPlatformOS('android');
    setMpvMock({
      enterPip: jest.fn(),
      setOrientation: undefined,
      setImmersive: undefined,
    } as unknown as Partial<Spec>);
    const caps = createVideoPlatformCapabilities();
    expect(caps.canFullscreen).toBe(false);
    expect(caps.canChangeOrientation).toBe(false);
  });

  test('iOS (no orientation/immersive bridge): canFullscreen is false', () => {
    setPlatformOS('ios');
    setMpvMock({} as unknown as Partial<Spec>);
    const caps = createVideoPlatformCapabilities();
    expect(caps.canFullscreen).toBe(false);
    expect(caps.canChangeOrientation).toBe(false);
    expect(caps.canPictureInPicture).toBe(false);
  });
});
