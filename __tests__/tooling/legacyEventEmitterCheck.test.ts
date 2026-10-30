/// <reference types="node" />
/**
 * The general B-037 guard.
 *
 * `react-native-fast-image` shipped legacy-architecture Android code
 * that called `getJSModule(RCTEventEmitter)` — the one class React
 * Native 0.86 refuses with a warning — and the app used it in 26
 * files, so RN's LogBox kept a toast over the player's transport row
 * for the whole session. The package is gone. The narrow guard that
 * replaced it (`MediaImage.test.tsx`) names ONE package; the rule is a
 * class.
 *
 * `scripts/check-legacy-event-emitter.cjs` is the general guard: it
 * scans the INSTALLED dependency tree's Android sources for the legacy
 * call and fails loudly with the offending file and line.
 *
 * This suite is what keeps it alive. It proves three things:
 *
 *   1. the check passes on the current tree — and reports the one
 *      allow-listed finding (react-native-svg, whose legacy call is
 *      dead code) rather than swallowing it;
 *   2. the check FAILS on a dependency that does the legacy call, with
 *      the file and line — proven by a throwaway package under a temp
 *      dir, which is removed again afterwards;
 *   3. a package that is merely PRESENT in `node_modules` but is not a
 *      dependency of this app is not flagged — the reachability filter
 *      is real, not decorative;
 *   4. every allow-listed package carries a reason, so a bare package
 *      name cannot be added without justifying it.
 */

import {execFileSync} from 'child_process';
import {existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync} from 'fs';
import {tmpdir} from 'os';
import {join} from 'path';

import {ALLOW_LIST} from '../../scripts/check-legacy-event-emitter.cjs';

const SCRIPT = join(__dirname, '..', '..', 'scripts', 'check-legacy-event-emitter.cjs');
const APP_ROOT = join(__dirname, '..', '..');

type RunResult = {status: number; stdout: string};

/**
 * Run the check against `root`, capturing its exit code and output.
 *
 * `execFileSync` throws on a non-zero exit, so the failure path is
 * read off the thrown error — which is exactly the path a real CI
 * failure would take.
 */
function runCheck(root: string): RunResult {
  try {
    const stdout = execFileSync(process.execPath, [SCRIPT, '--root', root], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return {status: 0, stdout};
  } catch (error) {
    const failure = error as {status?: number; stdout?: string};
    return {status: failure.status ?? 1, stdout: failure.stdout ?? ''};
  }
}

/**
 * The legacy call, written the way a legacy library writes it: the
 * class is imported, and the lookup is split across two lines.
 */
const LEGACY_SOURCE = [
  'package com.fake;',
  '',
  'import com.facebook.react.bridge.ReactContext;',
  'import com.facebook.react.uimanager.events.RCTEventEmitter;',
  '',
  'public class LegacyEmitterView {',
  '  void emit(ReactContext context) {',
  '    context',
  '        .getJSModule(RCTEventEmitter.class)',
  '        .receiveEvent(getId(), "topLegacy", payload);',
  '  }',
  '}',
].join('\n');

/**
 * Write a package that ships the legacy call.
 */
function writeOffendingPackage(root: string, name: string) {
  const pkgDir = join(root, 'node_modules', name);
  mkdirSync(join(pkgDir, 'android', 'src', 'main', 'java', 'com', 'fake'), {
    recursive: true,
  });
  writeFileSync(
    join(pkgDir, 'package.json'),
    JSON.stringify({name, version: '1.0.0'}, null, 2),
  );
  writeFileSync(
    join(pkgDir, 'android', 'src', 'main', 'java', 'com', 'fake', 'LegacyEmitterView.java'),
    LEGACY_SOURCE,
  );
}

describe('legacy-event-emitter check', () => {
  it('passes on the current tree and reports the allow-listed finding', () => {
    const result = runCheck(APP_ROOT);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('✓ legacy-event-emitter check passed');
    expect(result.stdout).toContain('0 error(s)');

    // The allow-listed finding is REPORTED, not omitted. react-native-svg
    // really does contain the legacy call (RenderableView.java:108);
    // it is safe only because the method it calls has no caller.
    expect(result.stdout).toContain('react-native-svg');
    expect(result.stdout).toContain('[ALLOWED]');
    expect(result.stdout).toContain('RenderableView.java:108');
    expect(result.stdout).toContain('onReceiveNativeEvent');
  });

  it('fails with the file and the line when a dependency makes the legacy call', () => {
    const root = mkdtempSync(join(tmpdir(), 'simba-legacy-emitter-'));
    try {
      writeFileSync(
        join(root, 'package.json'),
        JSON.stringify(
          {
            name: 'fake-root',
            version: '1.0.0',
            dependencies: {'fake-legacy-emitter': '1.0.0'},
          },
          null,
          2,
        ),
      );
      writeOffendingPackage(root, 'fake-legacy-emitter');

      const result = runCheck(root);

      expect(result.status).toBe(1);
      expect(result.stdout).toContain('[LEGACY-EMITTER]');
      expect(result.stdout).toContain('fake-legacy-emitter');
      // The offending file and line — the point of the whole check.
      expect(result.stdout).toContain('LegacyEmitterView.java:9:10');
      expect(result.stdout).toContain('✗ 1 error(s) found');

      // The proof, printed: this is the exact output the check produced
      // when it met a dependency doing the legacy thing.
      console.log(result.stdout);
    } finally {
      // The throwaway package goes away with its temp root.
      rmSync(root, {recursive: true, force: true});
    }

    expect(existsSync(root)).toBe(false);
  });

  it('does not flag a package that is present but is not a dependency of the app', () => {
    const root = mkdtempSync(join(tmpdir(), 'simba-legacy-leftover-'));
    try {
      // The app depends on nothing, and the offending package is a
      // LEFTOVER: it sits in node_modules but nothing reaches it.
      writeFileSync(
        join(root, 'package.json'),
        JSON.stringify({name: 'fake-root', version: '1.0.0'}, null, 2),
      );
      writeOffendingPackage(root, 'leftover-legacy-emitter');

      const result = runCheck(root);

      expect(result.status).toBe(0);
      expect(result.stdout).not.toContain('leftover-legacy-emitter');
      expect(result.stdout).toContain('✓ legacy-event-emitter check passed');
    } finally {
      rmSync(root, {recursive: true, force: true});
    }

    expect(existsSync(root)).toBe(false);
  });

  it('requires a reason on every allow-listed package', () => {
    const names = Object.keys(ALLOW_LIST);

    // Not empty-forever: the list cannot be emptied to make the check
    // pass, because react-native-svg really does contain the call.
    expect(names.length).toBeGreaterThan(0);
    expect(names).toContain('react-native-svg');

    for (const name of names) {
      const reason = ALLOW_LIST[name];
      expect(typeof reason).toBe('string');
      // A bare package name cannot be added without justifying it.
      expect(reason.trim().length).toBeGreaterThan(0);
    }
  });
});
