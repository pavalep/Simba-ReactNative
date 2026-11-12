/**
 * The app's version — the constant and the builds it must agree with.
 *
 * 2026-11-12: the About page said "Version 1.0.0" while the Android
 * build was 1.1.0 (2), and the Settings page said "0.0.1 (1)" because
 * it read `package.json` (whose `version` is React Native's template
 * placeholder, never touched). The app showed three numbers for one
 * binary and the true one nowhere.
 *
 * The version now has ONE owner — `src/constants/appVersion.ts` — and
 * this test is what keeps that owner honest: if a build moves and the
 * constant does not, the suite fails.
 */

import fs from 'fs';
import path from 'path';
import {
  APP_VERSION_NAME,
  APP_BUILD_NUMBER,
  APP_VERSION_LABEL,
} from '../../src/constants/appVersion';

const ROOT = path.resolve(__dirname, '../..');

const read = (...parts: string[]) =>
  fs.readFileSync(path.join(ROOT, ...parts), 'utf8');

describe('the app version', () => {
  it('matches the Android build', () => {
    const gradle = read('android', 'app', 'build.gradle');
    const name = gradle.match(/versionName\s+"([^"]+)"/)?.[1];
    const code = gradle.match(/versionCode\s+(\d+)/)?.[1];

    expect(name).toBe(APP_VERSION_NAME);
    expect(Number(code)).toBe(APP_BUILD_NUMBER);
  });

  it('matches the iOS build', () => {
    const pbx = read('ios', 'CinePlayer.xcodeproj', 'project.pbxproj');

    // Both build configurations (Debug and Release).
    expect(pbx).toContain(`MARKETING_VERSION = ${APP_VERSION_NAME};`);
    expect(pbx).toContain(`CURRENT_PROJECT_VERSION = ${APP_BUILD_NUMBER};`);
  });

  it('matches the newest Changelog entry', () => {
    const changelog = read(
      'src',
      'screens',
      'Changelog',
      'components',
      'ChangelogScreen.tsx',
    );
    const newest = changelog.match(/version:\s*'([^']+)'/)?.[1];

    expect(newest).toBe(APP_VERSION_NAME);
  });

  it('labels itself with the version and the build number', () => {
    expect(APP_VERSION_LABEL).toBe(
      `Version ${APP_VERSION_NAME} (${APP_BUILD_NUMBER})`,
    );
  });

  it('matches package.json', () => {
    // `package.json`'s `version` was React Native's template placeholder
    // (`0.0.1`) until 2026-11-12, and no gate read it — so it drifted
    // away from the build and nobody noticed. It is now the version, and
    // this is the gate that reads it.
    const pkg = JSON.parse(read('package.json'));
    expect(pkg.version).toBe(APP_VERSION_NAME);
  });

  it('is not the npm placeholder anywhere', () => {
    const pkg = JSON.parse(read('package.json'));
    expect(pkg.version).not.toBe('0.0.1');
  });
});
