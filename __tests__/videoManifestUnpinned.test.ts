/// <reference types="node" />
/**
 * v11 T8.2 — Manifest orientation unpin (structural test).
 *
 * The native side of T8.2 lives in:
 *   - android/app/src/main/AndroidManifest.xml
 *   - android/app/src/main/java/.../MainActivity.kt
 *
 * Neither can be unit-tested with jest. This test asserts the
 * MANIFEST side of the contract by reading the XML file as a
 * string and checking for the absence of the old orientation
 * pin. The MainActivity Kotlin enforcement (USER_PORTRAIT
 * pin in onCreate + onResume) is a device-validation step
 * — run `./gradlew clean assembleDebug` + a Huawei + Pixel
 * smoke test to confirm.
 *
 * The JS-side close path (MpvPlayer.setOrientation('portrait')
 * + MpvPlayer.setImmersive(false) on host unmount) is covered
 * by `__tests__/videoPlatformCapabilities.test.ts` (T8.1).
 *
 * Note: this test uses CommonJS `require('fs')` + `require('path')`
 * to avoid pulling `@types/node` into the project's tsc config
 * (the project's `"types": ["jest"]` keeps node types out).
 * The triple-slash directive at the top pulls in just the
 * node types for THIS file, leaving the rest of the project
 * unaffected.
 */
const fs = require('fs');
const path = require('path');

const MANIFEST_PATH = path.join(
  process.cwd(),
  'android',
  'app',
  'src',
  'main',
  'AndroidManifest.xml',
);

describe('AndroidManifest — T8.2 orientation unpin', () => {
  let manifest: string;

  beforeAll(() => {
    manifest = fs.readFileSync(MANIFEST_PATH, 'utf8');
  });

  test('SplashActivity no longer has the portrait pin', () => {
    const splashMatch = /<activity[^>]*\.SplashActivity[\s\S]*?>/.exec(
      manifest,
    );
    expect(splashMatch).not.toBeNull();
    const splashBlock = splashMatch![0];
    expect(splashBlock).not.toMatch(/android:screenOrientation/);
  });

  test('MainActivity no longer has the portrait pin', () => {
    const mainIdx = manifest.indexOf('.MainActivity');
    expect(mainIdx).toBeGreaterThan(-1);
    const endIdx = manifest.indexOf('</activity>', mainIdx);
    expect(endIdx).toBeGreaterThan(-1);
    const mainBlock = manifest.slice(mainIdx, endIdx);
    expect(mainBlock).not.toMatch(/android:screenOrientation/);
  });

  test('MainActivity still declares `configChanges` for orientation (regression guard)', () => {
    // The orientation configChanges flag prevents Android from
    // destroying + recreating the activity on rotate. We need
    // to keep this even after the unpin; without it the
    // JS state (player session, navigation stack) would
    // re-initialize on every rotation.
    expect(manifest).toMatch(
      /\.MainActivity[\s\S]*?android:configChanges="[^"]*\borientation\b/,
    );
  });

  test('MainActivity still supports PiP', () => {
    // PiP support is required for the V3 player; this is a
    // regression guard against accidental removal during the
    // T8.2 unpin.
    expect(manifest).toMatch(
      /\.MainActivity[\s\S]*?android:supportsPictureInPicture="true"/,
    );
  });
});
